// ═══════════════════════════════════════════
//  ANALYSIS — 作物ランキング・収益・施肥・リスク
//  土地評価・土地プロフィール・適合レンジはADPパネル側へ移動済み
// ═══════════════════════════════════════════

// ─── escHtml ガード（ui.js未ロード時のフォールバック） ───
if (typeof escHtml === 'undefined') {
  window.escHtml = function(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };
}

// ─── フォーマットヘルパー ───
function fmtNum(value, digits = 1, empty = '-') {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : empty;
}
function fmtInt(value, empty = '-') {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)).toLocaleString() : empty;
}
function fmtYen(value) {
  if (!Number.isFinite(Number(value))) return '-';
  return Math.round(Number(value)).toLocaleString() + '円';
}

// ─── スコア表示ヘルパー（2026-07: 「%」表記→「点」表記＋4段階アイコンに変更） ───
// 「%」だと確率・成功率のように誤解されやすいため、点数表記＋◎○△×の4段階アイコンで
// 直感的に良し悪しが伝わるようにする。色分け（scoreCls）は既存3クラスをそのまま流用。
function scoreCls(score) {
  return score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';
}
function scoreIcon(score) {
  return score >= 70 ? '◎' : score >= 45 ? '○' : score >= 20 ? '△' : '×';
}
function scoreBadgeText(score) {
  return `${scoreIcon(score)} ${Math.round(score)}点`;
}

// ─── カテゴリー定義 ───
// 大カテゴリー → 小カテゴリーのマッピング
const CR_MAJOR = {
  all:       null,                                        // 全件（小タブなし）
  grain:     ['grain', 'legume'],                         // 穀物・豆類（小タブあり）
  vegetable: ['leafy', 'root', 'fruit_veg', 'vegetable'], // 野菜（小タブあり）
  fruit:     null,                                        // 果物（小タブなし）
  wild:      ['wildveg', 'herb'],                         // 山菜・草（小タブあり）
  forest:    null,                                        // 林産（小タブなし）
  oil:       null,                                        // 油脂作物（小タブなし）
  fiber:     null,                                        // 繊維作物（小タブなし）
};

const CR_MINOR_LABELS = {
  grain:     '穀物',
  legume:    '豆類',
  leafy:     '葉菜',
  root:      '根菜',
  fruit_veg: '果菜',
  vegetable: '野菜',
  wildveg:   '山菜・野草',
  herb:      'ハーブ',
};

// 大カテゴリーに対応するCROP_DBのcategoryキー一覧
const CR_MAJOR_TO_CATEGORIES = {
  all:       null,
  grain:     ['grain', 'legume'],
  vegetable: ['leafy', 'root', 'fruit_veg', 'vegetable'],
  fruit:     ['fruit'],
  wild:      ['wildveg', 'herb'],
  forest:    ['forest'],
  oil:       ['oil'],
  fiber:     ['fiber'],
};

// ─── ランキング状態 ───
let _crMajor = 'all';
let _crMinor = null;       // nullは全小カテゴリー表示
let _crScores = [];        // buildAnalysisResult後のscores全件

// ─── 大タブ切り替え ───
function crSwitchMajor(major) {
  _crMajor = major;
  _crMinor = null;

  // 大タブUI更新（適合度・収益の両タブバーに反映）
  document.querySelectorAll('.cr-tab-major').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.major === major);
  });

  _crRenderMinorTabs();

  // adp-view開中は両ランキングを直接再描画
  if (document.getElementById('adp-view')?.classList.contains('open')) {
    if (typeof _adpRenderRankingList       === 'function') _adpRenderRankingList();
    if (typeof _adpRenderGrowthRankingList === 'function') _adpRenderGrowthRankingList();
    if (typeof _adpRenderProfitRankingList === 'function') _adpRenderProfitRankingList();
  } else {
    _crRenderList();
  }
}

function _crRenderMinorTabs() {
  const minors = CR_MAJOR[_crMajor];
  const html = (!minors || minors.length <= 1) ? '' : `
    <button class="cr-tab-minor ${_crMinor === null ? 'active' : ''}" onclick="crSwitchMinor(null)">すべて</button>
    ${minors.map(key => `
      <button class="cr-tab-minor ${_crMinor === key ? 'active' : ''}"
        onclick="crSwitchMinor('${key}')">
        ${CR_MINOR_LABELS[key] || key}
      </button>
    `).join('')}
  `;
  const show = !!html;

  // 適合度用と収益用の両タブバーを同時更新
  ['cr-tabs-minor', 'cr-tabs-minor-profit'].forEach(id => {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    wrap.style.display = show ? 'flex' : 'none';
    wrap.innerHTML = html;
  });
}

// ─── 小タブ切り替え ───
function crSwitchMinor(minor) {
  _crMinor = minor;
  document.querySelectorAll('.cr-tab-minor').forEach(btn => {
    const val = btn.getAttribute('onclick').match(/'([^']*)'/) ?
      btn.getAttribute('onclick').match(/'([^']*)'/)[1] : null;
    btn.classList.toggle('active', val === minor);
  });

  // adp-view開中は両ランキングを直接再描画
  if (document.getElementById('adp-view')?.classList.contains('open')) {
    if (typeof _adpRenderRankingList       === 'function') _adpRenderRankingList();
    if (typeof _adpRenderGrowthRankingList === 'function') _adpRenderGrowthRankingList();
    if (typeof _adpRenderProfitRankingList === 'function') _adpRenderProfitRankingList();
  } else {
    _crRenderList();
  }
}

// ─── フィルタリングされたスコアを返す ───
function _crFilteredScores() {
  if (!_crScores.length) return [];

  // 大カテゴリーフィルター
  const majorCats = CR_MAJOR_TO_CATEGORIES[_crMajor];
  let scores = majorCats
    ? _crScores.filter(s => majorCats.includes(s.crop.category))
    : _crScores;

  // 小カテゴリーフィルター
  if (_crMinor) {
    scores = scores.filter(s => s.crop.category === _crMinor);
  }

  return scores;
}

// ─── 簡易フィルター（2026-07追加）: 総合 / 収益重視 / 手間少なめ ───
// 初心者が「なぜこの20件なのか」を自分で絞り込めるよう、並び替え軸を追加する。
// スコアそのものは変更せず、表示順だけを変える軽量な仕組み。
let _crSortMode = 'score'; // 'score' | 'profit' | 'effort'

const CR_SORT_LABELS = {
  score:  '総合スコア順',
  profit: '収益重視',
  effort: '手間少なめ',
};

// 収益プロキシ：DBの収量×単価の中央値で概算（10a換算の粗収入目安）
function _crRevenueProxy(crop) {
  const y = crop.yield || {};
  const p = crop.price || {};
  const yieldVal = Number(y.max ?? y.min ?? 0) || 0;
  const priceMin = Number(p.min);
  const priceMax = Number(p.max);
  const priceVal = (Number.isFinite(priceMin) && Number.isFinite(priceMax))
    ? (priceMin + priceMax) / 2
    : (Number.isFinite(priceMin) ? priceMin : (Number.isFinite(priceMax) ? priceMax : 0));
  return yieldVal * priceVal;
}

// 手間プロキシ：リスク件数（栽培管理上の注意点の多さ）を簡易的な手間の目安とする
function _crEffortProxy(crop) {
  return Array.isArray(crop.risks) ? crop.risks.length : 0;
}

function _crApplySortMode(scores) {
  if (_crSortMode === 'profit') {
    return [...scores].sort((a, b) => _crRevenueProxy(b.crop) - _crRevenueProxy(a.crop));
  }
  if (_crSortMode === 'effort') {
    return [...scores].sort((a, b) => {
      const diff = _crEffortProxy(a.crop) - _crEffortProxy(b.crop);
      return diff !== 0 ? diff : (b.score - a.score);
    });
  }
  return scores; // 'score': 既にスコア降順で渡ってくる想定
}

function _crSetSortMode(mode) {
  _crSortMode = mode;
  if (document.getElementById('adp-view')?.classList.contains('open')) {
    if (typeof _adpRenderRankingList === 'function') _adpRenderRankingList();
  } else {
    _crRenderList();
  }
}

function _crSortBarHtml() {
  return `
    <div class="cr-sort-bar">
      ${Object.entries(CR_SORT_LABELS).map(([key, label]) => `
        <button type="button" class="cr-sort-btn ${_crSortMode === key ? 'active' : ''}"
          onclick="_crSetSortMode('${key}')">${label}</button>
      `).join('')}
    </div>
  `;
}

// ─── ランキングリスト描画 ───
// Phase3以降: adp-view開中はcrSwitchMajor/crSwitchMinor/runAnalysis内の分岐により
// _adpRenderRankingList() / _adpRenderGrowthRankingList()（area.js）が直接呼ばれ、
// この_crRenderList()自体は呼び出されない（adp-view非展開時のみ使われる経路）。
//
// ※ s.viable について（2026-06）:
//   engine.js の scoreCrop() は viable を常時 true で返す設計のため、
//   このファイル内の `s.viable ? ... : 'NG'` 分岐は現状到達しない。
//   下限気温による完全除外は将来的な再導入の余地を残すため、
//   表示ロジックはあえて削除せずフォールバックとして残している。
//   現行版での「深刻な不適合」の伝達は s.alert（cr-alert）が担う。
function _crRenderList() {
  const el = document.getElementById('crop-ranking');
  if (!el) return;
  const scoresRaw = _crFilteredScores();
  if (!scoresRaw.length) {
    el.innerHTML = _crSortBarHtml() + '<div class="empty-mini">該当作物なし</div>';
    return;
  }
  const scores = _crApplySortMode(scoresRaw);
  el.innerHTML = _crSortBarHtml() + scores.slice(0, 20).map((s, i) => {
    const cls = scoreCls(s.score);
    return `
      <div class="cr-item ${s.viable ? '' : 'cr-item-ng'}"
        onclick="adpCropTap('${s.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}</span>
          <span class="cr-name">${escHtml(s.crop.name)}</span>
          <span class="cr-score ${s.viable ? cls : 'score-low'}">${s.viable ? scoreBadgeText(s.score) : '× NG'}</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${s.viable ? cls : 'score-low'}" style="width:${s.viable ? s.score : 0}%"></div>
        </div>
        ${_crAlertHtml(s.alert)}
      </div>
    `;
  }).join('');
}

// ─── 警告表示ヘルパー（2026-07: NGで弾く代わりに、理由をしっかり伝える強調表示） ───
function _crAlertHtml(alert) {
  if (!alert) return '';
  return `<div class="cr-alert cr-alert-strong">⚠️ ${escHtml(alert)}</div>`;
}

// ─── 「今月やること」ヘルパー（2026-07追加） ───
// 診断結果の直下で「今この瞬間、何をすればいいか」が一目でわかるよう、
// crop.calendar（sowing/manage/harvest/prep, memo）から当月の作業を抽出して表示する。
// buildWorkCalendarHTML()の詳細版とは別に、常時1目で分かる要約として置く。
function _crThisMonthTaskHtml(crop) {
  const cal = crop?.calendar;
  if (!cal) return '';
  const month = new Date().getMonth() + 1;
  const acts = [];
  if (Array.isArray(cal.sowing)  && cal.sowing.includes(month))  acts.push({ label: '🌱 種まき・植え付けの時期', memo: cal.memo?.sowing });
  if (Array.isArray(cal.manage)  && cal.manage.includes(month))  acts.push({ label: '🌿 管理・生育中', memo: cal.memo?.manage });
  if (Array.isArray(cal.harvest) && cal.harvest.includes(month)) acts.push({ label: '🌾 収穫の時期', memo: cal.memo?.harvest });
  if (!acts.length && Array.isArray(cal.prep) && cal.prep.includes(month)) {
    acts.push({ label: '🧑\u200d🌾 準備・休閑期', memo: cal.memo?.prep || '次の作付けに向けた土づくりの時期です。' });
  }
  if (!acts.length) return '';

  return `
    <div class="cr-thismonth">
      <div class="cr-thismonth-title">📅 今月(${month}月)やること</div>
      ${acts.map(a => `
        <div class="cr-thismonth-item">
          <div class="cr-thismonth-label">${a.label}</div>
          ${a.memo ? `<div class="cr-thismonth-memo">${escHtml(a.memo)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ─── 作物×土地プロフィールのゲージ生成 ───
// 2026-07: cultivationMode(露地/ハウス/加温)を受け取り、年均気温ゲージの表示に反映する。
// これまでスコア計算（engine.js）はハウス/加温を考慮していたが、ゲージ表示は露地基準の
// ままだったため「スコアは高いのにゲージは範囲外」という食い違いが起きていた。
function _crBuildGauges(crop, profile, cultivationMode = 'openField') {
  if (!profile) return '<div class="empty-mini">プロフィールデータなし</div>';

  const c = crop.conditions || {};
  const gauges = [];
  const isGreenhouse = cultivationMode === 'greenhouse';
  const isHeated      = cultivationMode === 'heatedGreenhouse';

  // 年均気温
  if (c.tempMeanMin != null && c.tempMeanMax != null) {
    const survivalTempMin = c.survivalTempMin ?? (c.tempMeanMin - 3);
    // engine.js scoreCrop()と合わせ、ハウス時のみ下限を-4℃緩和して表示する
    // （上限・加温ハウスの旬別判定はここでは近似しない。加温時は注記で補足する）
    const houseOffset       = isGreenhouse ? 4 : 0;
    const effOptimalMin     = c.tempMeanMin   - houseOffset;
    const effSurvivalMin    = survivalTempMin - houseOffset;
    const tempNote = isGreenhouse
      ? '🏠 ハウス補正を適用（下限-4℃）して表示中'
      : isHeated
        ? '🔥 加温ハウスは暖房で下限を補うため、実際の適合判定は旬（10日）ごとの気温差で個別に行われます'
        : null;
    gauges.push(rangeGauge({
      label: '年均気温',
      value: profile.avgTemp,
      unit: '℃',
      min: effSurvivalMin,
      max: c.tempMeanMax,
      displayMin: effSurvivalMin - 4,
      displayMax: c.tempMeanMax + 4,
      optimalMin: effOptimalMin,
      optimalMax: c.tempMeanMax,
      survivalMin: effSurvivalMin,
      note: tempNote,
      // 加温ハウスは下限を暖房で補える前提のため、下限側の「範囲外」表示は出さない
      softenLowStatus: isHeated,
    }));
  }

  // 土壌pH
  if (c.phMin != null || c.phMax != null) {
    const phMin = c.phMin ?? 5.0;
    const phMax = c.phMax ?? 7.5;
    gauges.push(rangeGauge({
      label: '土壌pH',
      value: profile.ph,
      unit: '',
      min: 3.5,
      max: 9.0,
      displayMin: 3.5,
      displayMax: 9.0,
      optimalMin: phMin,
      optimalMax: phMax,
    }));
  }

  // 標高
  if (c.elevMax != null) {
    gauges.push(rangeGauge({
      label: '標高',
      value: profile.elevation,
      unit: 'm',
      min: 0,
      max: c.elevMax,
      displayMin: 0,
      displayMax: Math.max(c.elevMax * 1.35, 300),
      optimalMin: 0,
      optimalMax: c.elevMax,
    }));
  }

  // 年降水量
  if (c.rainfallMin != null || c.rainfallMax != null) {
    const rainMin = c.rainfallMin ?? 900;
    const rainMax = c.rainfallMax ?? 2200;
    gauges.push(rangeGauge({
      label: '年降水量',
      value: profile.annualRainfall,
      unit: 'mm',
      min: rainMin,
      max: rainMax,
      displayMin: Math.max(0, rainMin - 500),
      displayMax: rainMax + 500,
      optimalMin: rainMin,
      optimalMax: rainMax,
    }));
  }

  // 緯度
  if (c.latMin != null && c.latMax != null) {
    gauges.push(rangeGauge({
      label: '緯度',
      value: profile.lat,
      unit: '°',
      min: c.latMin,
      max: c.latMax,
      displayMin: Math.max(0, c.latMin - 5),
      displayMax: c.latMax + 5,
      optimalMin: c.latMin,
      optimalMax: c.latMax,
    }));
  }

  if (!gauges.length) {
    return '<div class="empty-mini">条件データなし</div>';
  }

  return `<div class="cr-gauge-list">${gauges.join('')}</div>`;
}

// ─── rangeGauge（共通） ───
// 2026-06: clamp() は engine.js 側の定義に一本化（index.htmlでengine.jsが
// 先に読み込まれるため、ここでの再定義は不要だった）

function rangeStatus(value, min, max) {
  if (!Number.isFinite(Number(value))) return 'missing';
  if (value < min || value > max) return 'out';
  return 'in';
}

function rangeGauge({ label, value, unit = '', min, max, displayMin, displayMax, optimalMin, optimalMax, survivalMin = null, note = null, softenLowStatus = false }) {
  const hasValue = Number.isFinite(Number(value));
  const lo = Number.isFinite(Number(displayMin)) ? displayMin : min;
  const hi = Number.isFinite(Number(displayMax)) ? displayMax : max;
  const span = Math.max(hi - lo, 0.0001);
  const pos = hasValue ? clamp((value - lo) / span * 100, 0, 100) : null;
  const optLeft  = clamp((optimalMin - lo) / span * 100, 0, 100);
  const optRight = clamp((optimalMax - lo) / span * 100, 0, 100);
  const optWidth = Math.max(2, optRight - optLeft);
  let status = rangeStatus(value, optimalMin, optimalMax);
  // 2026-07: 加温ハウスは下限気温を暖房で補う前提のため、下限側だけの「範囲外」は
  // 過度な警告にならないよう別ステータス（heated）に緩和する（上限超過はそのまま「範囲外」）。
  if (softenLowStatus && status === 'out' && hasValue && Number(value) < optimalMin) {
    status = 'heated';
  }
  const statusLabel = status === 'missing' ? 'データなし'
    : status === 'out'    ? '範囲外'
    : status === 'heated' ? '加温対応可'
    : '適合';
  const statusClass = status === 'in' ? 'rg-status-in'
    : status === 'out'    ? 'rg-status-out'
    : status === 'heated' ? 'rg-status-heated'
    : 'rg-status-missing';
  const valueText = hasValue ? `${fmtNum(value, value % 1 === 0 ? 0 : 1)}${unit}` : '-';
  const minText = `${fmtNum(optimalMin, optimalMin % 1 === 0 ? 0 : 1)}${unit}`;
  const maxText = `${fmtNum(optimalMax, optimalMax % 1 === 0 ? 0 : 1)}${unit}`;
  const survivalPos = (survivalMin !== null && Number.isFinite(Number(survivalMin)))
    ? clamp((survivalMin - lo) / span * 100, 0, 100)
    : null;
  const markerLabelAlign = pos !== null && pos > 70 ? 'right' : 'left';

  return `
    <div class="rg-wrap rg-${status}">
      <div class="rg-head">
        <span class="rg-label">${label}</span>
        <span class="${statusClass}">${statusLabel}</span>
      </div>
      <div class="rg-track-wrap">
        <div class="rg-track">
          <div class="rg-optimal" style="left:${optLeft}%;width:${optWidth}%"></div>
          ${survivalPos !== null ? `<div class="rg-survival-line" style="left:${survivalPos}%"></div>` : ''}
          ${pos !== null ? `
            <div class="rg-marker-wrap" style="left:${pos}%">
              <div class="rg-marker-label rg-marker-label-${markerLabelAlign}">${valueText}</div>
              <div class="rg-marker">▼</div>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="rg-scale">
        <span>${fmtNum(lo, lo % 1 === 0 ? 0 : 1)}${unit}</span>
        <span>適正 ${minText}〜${maxText}</span>
        <span>${fmtNum(hi, hi % 1 === 0 ? 0 : 1)}${unit}</span>
      </div>
      ${survivalPos !== null ? `
        <div class="rg-survival-note">
          <span class="rg-survival-dot"></span>耐寒限界 ${fmtNum(survivalMin, 1)}${unit}
        </div>
      ` : ''}
      ${note ? `<div class="rg-mode-note">${escHtml(note)}</div>` : ''}
    </div>
  `;
}

// ─── 施肥結果描画 ───
// targetId: 描画先要素ID。実務タブ既定値は 'fert-result'、分析側からは 'fert-result-analysis' を渡す。
function _renderFertResult(crop, targetId = 'fert-result') {
  const el = document.getElementById(targetId);
  if (!el || !currentAreaData) return;

  if (!crop) {
    el.innerHTML = '<div class="empty-mini">作物未選択</div>';
    return;
  }

  if (currentAreaData.areaSqm > 0) {
    const fert = calcFertilizer(crop, currentAreaData.areaSqm);
    if (fert) {
      el.innerHTML = `
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">対象：${crop.name} / ${fert.area10a} 10a</div>
        <div class="area-stat"><span class="label">N</span><span class="value">${fert.N}<span class="unit">kg</span></span></div>
        <div class="area-stat"><span class="label">P</span><span class="value">${fert.P}<span class="unit">kg</span></span></div>
        <div class="area-stat"><span class="label">K</span><span class="value">${fert.K}<span class="unit">kg</span></span></div>
        <div class="notice notice-info" style="margin-top:8px;">${fert.notes}</div>
      `;
    } else {
      el.innerHTML = '<div style="color:var(--text3);font-size:11px;">施肥データなし（この作物は施肥情報未登録）</div>';
    }
  } else {
    el.innerHTML = '<div style="color:var(--text3);font-size:11px;">面積データなし</div>';
  }
}

// ─── リスク結果描画 ───
// targetId: 描画先要素ID。実務タブ既定値は 'risk-result'、分析側からは 'risk-result-analysis' を渡す。
function _renderRiskResult(crop, targetId = 'risk-result') {
  const el = document.getElementById(targetId);
  if (!el) return;

  if (!crop) {
    el.innerHTML = '<div class="empty-mini">リスクデータなし</div>';
    return;
  }

  // ─ 🌡️ 気候リスク（霜・冷害・高温・日照不足・寒暖差ボーナス） ─
  //  旧：area.jsの適合度ランキングカード内に表示していたものをこちらへ集約。
  const climateRiskHtml = _buildClimateRiskHtml(crop);

  // ─ 輪作セクション（family + continuousCropYears ベース） ─
  const rotationHtml = _buildRotationSection(crop);

  // ─ 既存リスク一覧 ─
  let risksHtml = '';
  if (crop.risks?.length) {
    risksHtml = crop.risks.map(r => {
      const color = r.level === 'high' ? 'var(--red)' : r.level === 'medium' ? 'var(--amber)' : 'var(--green2)';
      return `
        <div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border);">
          <span style="color:${color};font-size:10px;font-family:var(--mono);padding-top:2px;flex-shrink:0;">${r.level.toUpperCase()}</span>
          <div>
            <div style="font-size:12px;font-weight:500;">${r.name}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px;">${r.note}</div>
          </div>
        </div>
      `;
    }).join('');
  } else if (!rotationHtml && !climateRiskHtml) {
    risksHtml = '<div class="empty-mini">リスクデータなし</div>';
  }

  el.innerHTML = climateRiskHtml + rotationHtml + risksHtml;
}

// ─── 🌡️ 気候リスクセクション（霜・冷害・高温・日照不足・寒暖差ボーナス） ───
/**
 * _buildClimateRiskHtml(crop)
 *
 * area.js の適合度ランキングカードに表示していた5種気候リスクを
 * ⚠️リスクタブ側へ集約するためのセクションHTMLを生成する。
 *
 * ① 気候推定モード時：area.js が保持する _adpClimateRanking キャッシュ
 *    （Phenologyベースの播種適期ウィンドウで算出済み・最も精度が高い）を再利用。
 * ② DBモード時（または①で対象作物が見つからない場合）：
 *    currentAreaData.climate.decadeArr から「生育期間の平均日数」を用いて
 *    最も温暖な旬を中心とした簡易ウィンドウを仮算出し、calcAllRisks で算出する
 *    （旧 _adpRenderRankingList の算出ロジックと同一）。
 * 気候データが一切ない場合は空文字を返す（セクション自体を非表示にする）。
 */
function _buildClimateRiskHtml(crop) {
  if (!crop) return '';

  let hr = null; // 高温リスク（calcHeatRisk の返却値）
  let ar = null; // 5種リスク一式（calcAllRisks の返却値）

  // ① 気候推定モード：computeClimateRanking 済みキャッシュを再利用
  if (typeof _adpClimateMode !== 'undefined' && _adpClimateMode
      && typeof _adpClimateRanking !== 'undefined' && _adpClimateRanking) {
    const entry = _adpClimateRanking.find(r => r.crop.id === crop.id);
    if (entry?.allRisks) {
      hr = entry.heatRisk;
      ar = entry.allRisks;
    }
  }

  // ② DBモード（または①で未取得）：decadeArrから簡易ウィンドウを仮算出
  if (!ar) {
    const decadeArr = currentAreaData?.climate?.decadeArr ?? null;
    if (decadeArr && typeof calcAllRisks === 'function') {
      const gpMin = crop.conditions?.growthPeriodMin ?? 60;
      const gpMax = crop.conditions?.growthPeriodMax ?? gpMin + 30;
      const gpDecades = Math.round(((gpMin + gpMax) / 2) / 10);
      // 最も温暖な旬を播種起点として仮算出（簡易）
      const tMean = decadeArr.tMean || decadeArr.tMax;
      let startD = 0;
      if (tMean) {
        let best = -Infinity;
        tMean.forEach((t, idx) => { if (t != null && t > best) { best = t; startD = idx; } });
        startD = (startD - Math.round(gpDecades / 2) + 36) % 36;
      }
      const endD = (startD + gpDecades - 1) % 36;
      ar = calcAllRisks(crop, decadeArr, startD, endD);
      hr = ar.heat;
    }
  }

  if (!ar) return '';

  const heatHtml = hr
    ? (() => {
        const lvCls = hr.riskLevel === 'none' ? 'heat-none'
                    : hr.riskLevel === 'low'  ? 'heat-low'
                    : hr.riskLevel === 'mid'  ? 'heat-mid'
                    : 'heat-high';
        const countTxt = hr.hotDecadeCount > 0
          ? `<span class="heat-count">約${hr.hotDayApprox ?? hr.hotDecadeCount * 10}日以上 (${hr.threshold}℃超)</span>`
          : '';
        return `<div class="cr-heat-row ${lvCls}">
          <span class="heat-label">高温リスク</span>
          <span class="heat-stars">${hr.riskStars}</span>
          ${countTxt}
        </div>`;
      })()
    : '';

  const detailRisksHtml = `<div class="cr-risk-detail-wrap">
      ${_crRiskRowHtml('霜リスク',   ar.frost,
          (ar.frost && ar.frost.frostDecadeCount > 0) ? `約${ar.frost.frostDayApprox}日 (0℃未満)` : '')}
      ${_crRiskRowHtml('冷害リスク', ar.chill,
          (ar.chill && ar.chill.chillDecadeCount > 0) ? `約${ar.chill.chillDecadeCount * 10}日 (${ar.chill.chillThreshold}℃未満)` : '')}
      ${_crRiskRowHtml('日照不足',   ar.sunDeficit,
          ar.sunDeficit ? `充足率${ar.sunDeficit.sufficiencyPct}%` : '')}
      ${_crBonusRowHtml(ar.diurnal)}
    </div>`;

  return `
    <div class="adpc-section-title"><span>🌡️ 気候リスク（栽培期間中）</span></div>
    <div style="padding:2px 0 10px;border-bottom:1px solid var(--border);margin-bottom:4px;">
      ${heatHtml}
      ${detailRisksHtml}
    </div>`;
}

// ─── 輪作セクション（科名 + 連作可能年数） ───
/**
 * _buildRotationSection(crop)
 *
 * crop.conditions.family（ラテン語学名）と
 * crop.conditions.continuousCropYears（連作可能年数）から、
 * 単発の輪作アドバイス（履歴非依存・選択中作物の科のみを見た注意喚起）を生成する。
 * familyが存在しない場合は空文字を返す（セクション自体を表示しない）。
 */
function _buildRotationSection(crop) {
  const family = crop?.conditions?.family;
  if (!family) return '';

  const familyJa = FAMILY_NAME_JA[family] || family;
  const years = crop?.conditions?.continuousCropYears;

  let level, color, label, note;
  if (years === undefined || years === null) {
    level = 'unknown';
    color = 'var(--text2)';
    label = '不明';
    note = '連作間隔の目安データがありません。';
  } else if (years <= 1) {
    level = 'high';
    color = 'var(--red)';
    label = '高';
    note = '同じ場所での連続栽培は避けてください（毎年）。';
  } else if (years <= 4) {
    level = 'medium';
    color = 'var(--amber)';
    label = '中';
    note = `同じ科の作物は${years}年は間隔をあけてください。`;
  } else {
    level = 'low';
    color = 'var(--green2)';
    label = '低';
    note = '長期間／永年、同じ場所での栽培が可能です。';
  }

  return `
    <div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0 10px;border-bottom:1px solid var(--border);margin-bottom:4px;">
      <span style="color:${color};font-size:10px;font-family:var(--mono);padding-top:2px;flex-shrink:0;">${label === '不明' ? '−' : label.toUpperCase()}</span>
      <div>
        <div style="font-size:12px;font-weight:500;">🔬 ${escHtml(familyJa)} (${escHtml(family)})</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">連作障害リスク：${label} — ${note}</div>
      </div>
    </div>
  `;
}

// ─── 単一作物 分析実行（ウィザード経由） ───
/**
 * runSingleCropAnalysis(areaName)
 *
 * currentAreaData.selectedCropId が指定されているときに
 * ウィザードから呼ばれる。既存UIをそのまま流用し、
 * 選択作物1件の詳細結果をランキング欄に展開済みで表示する。
 */
function runSingleCropAnalysis(areaName) {
  if (!currentAreaData?.selectedCropId) {
    // フォールバック: selectedCropId がなければ全件ランキングへ
    return runAnalysis(areaName);
  }

  const ad     = currentAreaData;
  const result = buildSingleCropAnalysis(ad.selectedCropId, ad);
  if (!result) return runAnalysis(areaName);

  // ─ 信頼度 ─
  const conf    = result.confidence;
  const confPct = conf.pct;
  // 適合度ペイン(conf-detail)を更新
  const confDetailEl = document.getElementById('conf-detail');
  if (confDetailEl) confDetailEl.innerHTML = conf.items.map(i => `- ${i}`).join('<br>');
  // サマリーバー信頼度はanUpdateSummary経由で更新

  // ─ ランキング欄に選択作物1件を展開済みで描画 ─
  const s           = result.scoreResult;
  const lp          = result.landProfile;
  const cls         = scoreCls(s.score);
  const modeLabels  = {
    openField: '露地栽培', greenhouse: 'ハウス栽培', heatedGreenhouse: '加温ハウス栽培',
  };
  const modeLabel   = modeLabels[result.cultivationMode] || '露地栽培';

  // ランキング状態をリセット（タブ切替等で全件表示に戻れるように）
  _crScores  = [];
  _crMajor   = 'all';
  _crMinor   = null;

  // 大タブUIをリセット
  document.querySelectorAll('.cr-tab-major').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.major === 'all');
  });
  _crRenderMinorTabs();

  // ランキング欄を単一作物の詳細カードで上書き
  const rankingEl = document.getElementById('crop-ranking');
  rankingEl.innerHTML = `
    <div class="sc-selected-badge">
      📌 選択作物：${escHtml(result.crop.name)}　／　${escHtml(modeLabel)}
    </div>
    <div class="cr-item cr-item-open ${s.viable ? '' : 'cr-item-ng'}"
      style="cursor:default;">
      <div class="cr-item-header">
        <span class="cr-name" style="font-size:14px;font-weight:600;">${escHtml(result.crop.name)}</span>
        <span class="cr-score ${s.viable ? cls : 'score-low'}" style="font-size:14px;">
          ${s.viable ? scoreBadgeText(s.score) : '× NG'}
        </span>
      </div>
      <div class="cr-bar-track">
        <div class="cr-bar-fill ${s.viable ? cls : 'score-low'}"
          style="width:${s.viable ? s.score : 0}%"></div>
      </div>
      ${_crAlertHtml(s.alert)}
      ${_crThisMonthTaskHtml(result.crop)}
      <div class="cr-gauge-wrap">
        ${_crBuildGauges(result.crop, lp, result.cultivationMode)}
      </div>
    </div>
    <div class="sc-detail-section">
      <div class="sc-detail-title">スコア詳細</div>
      <div class="sc-detail-grid">
        ${s.details.map(d => {
          const icon = d.ok === true ? '✓' : d.ok === false ? '✗' : '–';
          const cls  = d.ok === true ? 'det-ok' : d.ok === false ? 'det-ng' : 'det-na';
          const axisIcon = _scAxisIcon(d.text);
          return `<div class="sc-detail-cell ${cls}">
            <div class="sc-detail-cell-head">
              <span class="sc-detail-axis-icon">${axisIcon}</span>
              <span class="det-icon ${cls}">${icon}</span>
            </div>
            <div class="det-text">${escHtml(d.text)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;

  // ─ 収益・施肥・リスク・カレンダー描画（分析側プレビュー：matchタブの専用枠に表示） ─
  _renderFertResultFromData(result.crop, result.fertilizer, 'fert-result-analysis');
  _renderRiskResult(result.crop, 'risk-result-analysis');
  renderWorkCalendar(result.crop, 'calendar-result-analysis');

  // ─ サマリーバー更新（adp-view統合後は_adpUpdateSummaryBar経由） ─
  const modeLabels2 = { openField:'露地栽培', greenhouse:'ハウス', heatedGreenhouse:'加温ハウス' };
  if (typeof _adpUpdateSummaryBar === 'function') {
    _adpUpdateSummaryBar({
      cropName:  result.crop.name,
      areaName:  _adpArea?.name || null,
      score:     s.viable ? s.score : 0,
      mode:      modeLabels2[result.cultivationMode] || '露地栽培',
      confPct:   conf.pct + '%',
      confLabel: conf.pct >= 70 ? '高精度' : conf.pct >= 40 ? '中精度' : '低精度',
    });
  }
}

// ─── スコア詳細セクション用: 項目名から軸アイコンを判定（2026-07追加） ───
// 「気温・土壌・pH・降水量・緯度・標高・日照」がひと目でわかるよう、
// テキストの先頭キーワードからアイコンを割り当てる（文言自体は変更しない＝正確性は維持）。
function _scAxisIcon(text) {
  const t = String(text || '');
  if (t.includes('気温'))       return '🌡️';
  if (t.includes('緯度'))       return '🌐';
  if (t.includes('標高'))       return '⛰️';
  if (t.includes('土壌タイプ')) return '🪨';
  if (t.includes('降水量'))     return '🌧️';
  if (t.includes('日照'))       return '☀️';
  if (t.includes('pH'))         return '🧪';
  return '📋';
}
// ─── 施肥結果描画（計算済みデータ受取版） ───
// targetId: 描画先要素ID。実務タブ既定値は 'fert-result'、分析側からは 'fert-result-analysis' を渡す。
function _renderFertResultFromData(crop, fert, targetId = 'fert-result') {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (!fert) {
    el.innerHTML = '<div style="color:var(--text3);font-size:11px;">施肥データなし（この作物は施肥情報未登録）</div>';
    return;
  }

  // 株数基準があれば優先表示、面積基準は補足
  const perPlantHtml = fert.perPlant ? `
    <div style="margin-bottom:8px;">
      <div style="font-size:10px;font-weight:600;color:var(--green2);margin-bottom:4px;">
        📌 株数基準（${fert.perPlant.purchaseCount.toLocaleString()}株）
      </div>
      <div class="area-stat"><span class="label">N</span><span class="value">${fert.perPlant.N}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">P</span><span class="value">${fert.perPlant.P}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">K</span><span class="value">${fert.perPlant.K}<span class="unit">kg</span></span></div>
    </div>
    <details>
      <summary style="font-size:10px;color:var(--text3);cursor:pointer;margin-bottom:4px;">面積基準も見る（${fert.area10a} 10a）</summary>
      <div class="area-stat" style="opacity:0.7;"><span class="label">N</span><span class="value">${fert.N}<span class="unit">kg</span></span></div>
      <div class="area-stat" style="opacity:0.7;"><span class="label">P</span><span class="value">${fert.P}<span class="unit">kg</span></span></div>
      <div class="area-stat" style="opacity:0.7;"><span class="label">K</span><span class="value">${fert.K}<span class="unit">kg</span></span></div>
    </details>
  ` : `
    <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">対象：${escHtml(crop.name)} / ${fert.area10a} 10a</div>
    <div class="area-stat"><span class="label">N</span><span class="value">${fert.N}<span class="unit">kg</span></span></div>
    <div class="area-stat"><span class="label">P</span><span class="value">${fert.P}<span class="unit">kg</span></span></div>
    <div class="area-stat"><span class="label">K</span><span class="value">${fert.K}<span class="unit">kg</span></span></div>
  `;

  el.innerHTML = perPlantHtml + `<div class="notice notice-info" style="margin-top:8px;">${fert.notes}</div>`;
}

// ─── 分析実行メイン ───
function runAnalysis(areaName) {
  if (!currentAreaData) return;

  const ad = currentAreaData;
  const result = buildAnalysisResult(ad);
  const profile = result.landProfile;
  ad.landProfile = profile;
  ad.analysisSnapshot = {
    areaName,
    topCropId:  result.topCrop?.crop?.id || null,
    topScore:   result.topCrop?.score || null,
    topProfit:  result.topCrop?.profitability?.averageProfit || null,
  };

  // ─ 信頼度計算 ─
  const conf = calcConfidence(areaDataFromLandProfile(ad, profile));
  const confPct = conf.pct;
  // 適合度ペイン(adp-pane-match内のconf-detail)を更新
  const confDetailEl = document.getElementById('conf-detail');
  if (confDetailEl) confDetailEl.innerHTML = conf.items.map(i => `- ${i}`).join('<br>');

  // ─ ランキング状態を初期化 ─
  _crScores  = result.cropScores;
  _crMajor   = 'all';
  _crMinor   = null;

  // 大タブUIをリセット
  document.querySelectorAll('.cr-tab-major').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.major === 'all');
  });
  _crRenderMinorTabs();
  // adp-view内では_adpRenderRankingList()(area.js)が担当
  if (typeof _adpRenderRankingList === 'function') {
    _adpRenderRankingList();
    if (typeof _adpRenderGrowthRankingList === 'function') _adpRenderGrowthRankingList();
  } else {
    _crRenderList();
  }

  // ─ 初期選択（トップ1作物）で収益・施肥・リスクを描画（分析側プレビュー：matchタブの専用枠に表示） ─
  const top = result.topCrop;
  if (top) {
    _renderFertResult(top.crop, 'fert-result-analysis');
    _renderRiskResult(top.crop, 'risk-result-analysis');
    renderWorkCalendar(top.crop, 'calendar-result-analysis');
  } else {
    _renderFertResult(null, 'fert-result-analysis');
    _renderRiskResult(null, 'risk-result-analysis');
    renderWorkCalendar(null, 'calendar-result-analysis');
  }

  // ─ サマリーバー更新（adp-view統合後は_adpUpdateSummaryBar経由） ─
  const modeLabels = { openField:'露地栽培', greenhouse:'ハウス', heatedGreenhouse:'加温ハウス' };
  if (typeof _adpUpdateSummaryBar === 'function') {
    _adpUpdateSummaryBar({
      cropName:  top?.crop?.name ?? null,
      areaName:  areaName,
      score:     top?.score ?? null,
      mode:      modeLabels[ad.cultivationMode] || '露地栽培',
      confPct:   confPct + '%',
      confLabel: confPct >= 70 ? '高精度' : confPct >= 40 ? '中精度' : '低精度',
    });
  }
}

// ─── 月別作業カレンダー ───
// ══════════════════════════════════════════════════════════════
// 栽培ごよみ：旬グリッド（36マス）対応ビルダー
// ══════════════════════════════════════════════════════════════

/**
 * _calMonthToDecadeIdxs(arr)
 * calendar の月配列（数値1-12 または文字列キー）を旬インデックス（0-35）に変換。
 * 月 n → 上旬(n-1)*3, 中旬(n-1)*3+1, 下旬(n-1)*3+2 の3旬をすべてONにする。
 */
function _calMonthToDecadeIdxs(arr) {
  if (!Array.isArray(arr)) return new Set();
  const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const idxs = new Set();
  arr.forEach(v => {
    let m = -1;
    if (typeof v === 'number') m = v - 1;
    else { const i = MONTH_KEYS.indexOf(v); if (i >= 0) m = i; }
    if (m >= 0 && m <= 11) { idxs.add(m*3); idxs.add(m*3+1); idxs.add(m*3+2); }
  });
  return idxs;
}

/**
 * buildWorkCalendarHTML(crop, opts)
 * 旬グリッド（36マス：上旬/中旬/下旬）版の作業カレンダーHTML文字列を返す。
 * opts.titleButtonHtml : タイトル行右側ボタンHTML
 * opts.color           : カードのアクセントカラー（複数作物カード時に使用）
 */
function buildWorkCalendarHTML(crop, opts = {}) {
  if (!crop || !crop.calendar) return '<div class="empty-mini">カレンダーデータなし</div>';

  const cal    = crop.calendar;
  const color  = opts.color || null;
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const JUNS   = ['上','中','下'];

  const phases = [
    { key: 'sowing',     label: '播種',     color: 'var(--green3)', icon: '🌱' },
    { key: 'sow',        label: '採集準備', color: 'var(--green3)', icon: '🌾' },
    { key: 'seedling',   label: '育苗',     color: 'var(--green2)', icon: '🌿' },
    { key: 'transplant', label: '定植',     color: 'var(--amber)',  icon: '🪴' },
    { key: 'manage',     label: '管理',     color: 'var(--amber)',  icon: '🛠️' },
    { key: 'harvest',    label: '収穫',     color: 'var(--green)',  icon: '🌟' },
  ];

  const phaseSets = phases.map(p => ({
    ...p,
    decadeIdxs: _calMonthToDecadeIdxs(cal[p.key]),
    memo: cal.memo?.[p.key] || null,
  }));

  const activePhases = phaseSets.filter(p => p.decadeIdxs.size > 0);
  if (!activePhases.length) return '<div class="empty-mini">カレンダーデータなし</div>';

  // 旬ヘッダー：月名は3セル分のセル結合風ラベル
  const monthHeaders = MONTHS.map(m =>
    `<div class="wc-month-group"><span class="wc-month-name">${m}</span><div class="wc-jun-labels"><span>上</span><span>中</span><span>下</span></div></div>`
  ).join('');

  // フェーズ行
  const phaseRows = activePhases.map(p => {
    const cells = Array.from({ length: 36 }, (_, i) => {
      const on = p.decadeIdxs.has(i);
      return `<div class="wc-cell wc-dec-cell ${on ? 'wc-cell-on' : ''}" style="${on ? `background:${p.color};opacity:0.88` : ''}"></div>`;
    }).join('');
    const memoHtml = p.memo
      ? `<div class="wc-phase-memo"><span class="wc-memo-icon">💡</span>${escHtml(p.memo)}</div>`
      : '';
    return `
      <div class="wc-phase-block">
        <div class="wc-row">
          <div class="wc-phase-label">
            <span class="wc-phase-icon">${p.icon}</span><span>${p.label}</span>
          </div>
          <div class="wc-cells wc-cells-36">${cells}</div>
        </div>
        ${memoHtml}
      </div>
    `;
  }).join('');

  const borderStyle = color ? `border-left:3px solid ${color};` : '';
  return `
    <div class="wc-wrap" style="${borderStyle}">
      <div class="wc-title-row">
        <div class="wc-title">${escHtml(crop.name)} — 作業カレンダー</div>
        ${opts.titleButtonHtml || ''}
      </div>
      <div class="wc-dec-header">
        <div class="wc-phase-label"></div>
        <div class="wc-month-headers">${monthHeaders}</div>
      </div>
      ${phaseRows}
      <div class="wc-legend">
        ${activePhases.map(p =>
          `<span class="wc-legend-item">
            <span class="wc-legend-dot" style="background:${p.color}"></span>${p.label}
          </span>`
        ).join('')}
      </div>
    </div>
  `;
}


/**
 * renderWorkCalendar(crop, targetId)
 * targetId（既定 'calendar-result'）に「現在選択中の作物」の作業カレンダーを描画する。
 * 分析側からは 'calendar-result-analysis' を渡す。
 * ヘッダーに保存（💾保存／✓保存済み）トグルボタンを付ける。
 */
function renderWorkCalendar(crop, targetId = 'calendar-result') {
  const el = document.getElementById(targetId);
  if (!el) return;

  if (!crop || !crop.calendar) {
    el.innerHTML = '<div class="empty-mini">カレンダーデータなし</div>';
    return;
  }

  const isSaved = !!(currentAreaData?.savedCalendarCrops && currentAreaData.savedCalendarCrops[crop.id]);
  const titleButtonHtml = `
    <button class="wc-save-btn ${isSaved ? 'wc-save-btn-saved' : ''}"
      onclick="_adpToggleCalendarCrop('${crop.id}')">${isSaved ? '✓ 保存済み' : '💾 保存'}</button>
  `;

  el.innerHTML = buildWorkCalendarHTML(crop, { titleButtonHtml });
}

// ─── JSON エクスポート ───
function exportJSON() {
  if (!currentAreaData) return;
  const result = buildAnalysisResult(currentAreaData);
  const data = {
    exportedAt: new Date().toISOString(),
    areaData: currentAreaData,
    landProfile: result.landProfile,
    analysis: {
      cropScores: result.cropScores.map(s => ({
        crop: s.crop.id,
        name: s.crop.name,
        score: s.score,
        viable: s.viable,
        averageProfit: s.profitability.averageProfit,
      })),
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agrisim_${Date.now()}.json`;
  a.click();
}

// ─── 科名（ラテン語学名 → 日本語）変換テーブル ───
// cropDB.js conditions.family の69種類をすべてカバー。
// 輪作セクション（_buildRotationSection）で使用。
const FAMILY_NAME_JA = {
  Actinidiaceae: 'マタタビ科',
  Agaricaceae: 'ハラタケ科',
  Amaranthaceae: 'ヒユ科',
  Amaryllidaceae: 'ヒガンバナ科',
  Anacardiaceae: 'ウルシ科',
  Apiaceae: 'セリ科',
  Araceae: 'サトイモ科',
  Araliaceae: 'ウコギ科',
  Arecaceae: 'ヤシ科',
  Asparagaceae: 'キジカクシ科',
  Asphodelaceae: 'ツルボラン科',
  Asteraceae: 'キク科',
  Auriculariaceae: 'キクラゲ科',
  Bankeraceae: 'ケロウジ科',
  Betulaceae: 'カバノキ科',
  Brassicaceae: 'アブラナ科',
  Bromeliaceae: 'パイナップル科',
  Cannabaceae: 'アサ科',
  Caricaceae: 'パパイア科',
  Chenopodiaceae: 'アカザ科',
  Convolvulaceae: 'ヒルガオ科',
  Cucurbitaceae: 'ウリ科',
  Dennstaedtiaceae: 'コバノイシカグマ科',
  Dioscoreaceae: 'ヤマノイモ科',
  Ebenaceae: 'カキノキ科',
  Equisetaceae: 'トクサ科',
  Ericaceae: 'ツツジ科',
  Fabaceae: 'マメ科',
  Fagaceae: 'ブナ科',
  Gentianaceae: 'リンドウ科',
  Geraniaceae: 'フウロソウ科',
  Ginkgoaceae: 'イチョウ科',
  Hericiaceae: 'サンゴハリタケ科',
  Juglandaceae: 'クルミ科',
  Lamiaceae: 'シソ科',
  Lardizabalaceae: 'アケビ科',
  Lauraceae: 'クスノキ科',
  Liliaceae: 'ユリ科',
  Linaceae: 'アマ科',
  Lyophyllaceae: 'シメジ科',
  Malvaceae: 'アオイ科',
  Marasmiaceae: 'シメジ科（ホウライタケ科）',
  Meripilaceae: 'トンビマイタケ科',
  Moraceae: 'クワ科',
  Nelumbonaceae: 'ハス科',
  Oleaceae: 'モクセイ科',
  Onocleaceae: 'コウヤワラビ科',
  Osmundaceae: 'ゼンマイ科',
  Paeoniaceae: 'ボタン科',
  Passifloraceae: 'トケイソウ科',
  Pedaliaceae: 'ゴマ科',
  Physalacriaceae: 'タマバリタケ科',
  Pleurotaceae: 'ヒラタケ科',
  Poaceae: 'イネ科',
  Polygonaceae: 'タデ科',
  Punicaceae: 'ザクロ科',
  Rosaceae: 'バラ科',
  Rutaceae: 'ミカン科',
  Saururaceae: 'ドクダミ科',
  Smilacaceae: 'サルトリイバラ科',
  Solanaceae: 'ナス科',
  Sparassidaceae: 'ハナビラタケ科',
  Strophariaceae: 'モエギタケ科',
  Tiliaceae: 'シナノキ科',
  Tricholomataceae: 'キシメジ科',
  Tuberaceae: 'セイヨウショウロ科',
  Urticaceae: 'イラクサ科',
  Vitaceae: 'ブドウ科',
  Zingiberaceae: 'ショウガ科',
};
// ═══════════════════════════════════════════════════════════════════
// ─── 実務側：複数作物対応描画関数 ───
// ═══════════════════════════════════════════════════════════════════

// 作物ごとの色パレット（カレンダー重ね表示用）
const PRACTICE_CROP_COLORS = [
  'var(--green)',  'var(--amber)',  '#5b9bd5', '#e07b54',
  '#8e6bbf',       '#3aada8',      '#c94f7c', '#7a9e3e',
];

/**
 * _renderFertResultMulti(practicecrops, targetId?)
 * 複数作物の施肥量を合算サマリー＋各作物カードで表示。
 * practicecrops: [{cropId, ratio}, ...]
 */
function _renderFertResultMulti(practicecrops, targetId = 'fert-result') {
  const el = document.getElementById(targetId);
  if (!el || !currentAreaData) return;

  if (!practicecrops?.length) {
    el.innerHTML = '<div class="empty-mini">作物を追加すると施肥概算が表示されます。</div>';
    return;
  }

  const totalSqm = currentAreaData.areaSqm || 0;

  // 合計集計: 株数基準があればその値を優先、なければ面積基準を使う
  let sumN = 0, sumP = 0, sumK = 0;
  let summaryMode = 'area'; // 'plant' | 'area' | 'mixed'
  let plantCount = 0; // 株数基準で集計された作物数

  const cardHtmls = practicecrops.map(({ cropId, ratio, plantingDesign }, i) => {
    const crop = (typeof _adpGetCropById === 'function') ? _adpGetCropById(cropId) : null;
    if (!crop) return '';
    const sqm = Math.round(totalSqm * ratio / 100);

    // plantingDesign.purchase（欠株率反映済み購入株数）を取得
    const purchase = (plantingDesign?.purchase != null && plantingDesign.purchase > 0)
      ? plantingDesign.purchase : null;

    const fert = (typeof calcFertilizer === 'function')
      ? calcFertilizer(crop, sqm, purchase)
      : null;

    // 合計集計: 株数基準があれば優先
    if (fert) {
      const pp = fert.perPlant;
      if (pp) {
        sumN += parseFloat(pp.N) || 0;
        sumP += parseFloat(pp.P) || 0;
        sumK += parseFloat(pp.K) || 0;
        plantCount++;
      } else {
        sumN += parseFloat(fert.N) || 0;
        sumP += parseFloat(fert.P) || 0;
        sumK += parseFloat(fert.K) || 0;
      }
    }

    const haDisp = sqm >= 10000 ? `${(sqm / 10000).toFixed(2)} ha` : `${sqm} ㎡`;
    const color  = PRACTICE_CROP_COLORS[i % PRACTICE_CROP_COLORS.length];

    // 株数基準表示HTML（優先表示）
    const perPlantHtml = fert?.perPlant ? `
      <div style="margin-bottom:4px;">
        <div style="font-size:10px;font-weight:600;color:var(--green2);margin-bottom:3px;">
          📌 株数基準（${fert.perPlant.purchaseCount.toLocaleString()}株）
        </div>
        <div class="adp-mfc-npk">
          <span class="adp-mfc-item"><span class="label">N</span>${fert.perPlant.N}<span class="unit">kg</span></span>
          <span class="adp-mfc-item"><span class="label">P</span>${fert.perPlant.P}<span class="unit">kg</span></span>
          <span class="adp-mfc-item"><span class="label">K</span>${fert.perPlant.K}<span class="unit">kg</span></span>
        </div>
      </div>
      <details style="margin-top:2px;">
        <summary style="font-size:10px;color:var(--text3);cursor:pointer;">面積基準も見る（${haDisp}）</summary>
        <div class="adp-mfc-npk" style="margin-top:3px;opacity:0.7;">
          <span class="adp-mfc-item"><span class="label">N</span>${fert.N}<span class="unit">kg</span></span>
          <span class="adp-mfc-item"><span class="label">P</span>${fert.P}<span class="unit">kg</span></span>
          <span class="adp-mfc-item"><span class="label">K</span>${fert.K}<span class="unit">kg</span></span>
        </div>
      </details>
    ` : fert ? `
      <div style="font-size:10px;color:var(--text3);margin-bottom:3px;">面積基準（${haDisp}）</div>
      <div class="adp-mfc-npk">
        <span class="adp-mfc-item"><span class="label">N</span>${fert.N}<span class="unit">kg</span></span>
        <span class="adp-mfc-item"><span class="label">P</span>${fert.P}<span class="unit">kg</span></span>
        <span class="adp-mfc-item"><span class="label">K</span>${fert.K}<span class="unit">kg</span></span>
      </div>
    ` : '';

    return `
      <div class="adp-multi-fert-card">
        <div class="adp-mfc-title" style="border-left:3px solid ${color};padding-left:6px;">
          ${escHtml(crop.name)} <span style="color:var(--text3);font-size:10px;">${ratio}%</span>
        </div>
        ${fert ? `
          ${perPlantHtml}
          <div class="notice notice-info" style="margin-top:4px;font-size:10px;">${fert.notes || ''}</div>
        ` : '<div style="color:var(--text3);font-size:11px;">施肥データなし</div>'}
      </div>
    `;
  }).join('');

  // 合計サマリーのモード表示
  if (plantCount > 0 && plantCount < practicecrops.length) {
    summaryMode = 'mixed';
  } else if (plantCount === practicecrops.length && plantCount > 0) {
    summaryMode = 'plant';
  }
  const summaryLabel = summaryMode === 'plant'
    ? '合計施肥量（株数基準）'
    : summaryMode === 'mixed'
    ? '合計施肥量（株数基準＋面積基準の混合）'
    : '合計施肥量（面積基準）';

  const summaryHtml = practicecrops.length >= 2 ? `
    <div class="adp-multi-fert-summary">
      <div style="font-size:11px;font-weight:600;margin-bottom:6px;">${summaryLabel}</div>
      <div class="adp-mfc-npk">
        <span class="adp-mfc-item"><span class="label">N</span>${sumN.toFixed(1)}<span class="unit">kg</span></span>
        <span class="adp-mfc-item"><span class="label">P</span>${sumP.toFixed(1)}<span class="unit">kg</span></span>
        <span class="adp-mfc-item"><span class="label">K</span>${sumK.toFixed(1)}<span class="unit">kg</span></span>
      </div>
    </div>
  ` : '';

  el.innerHTML = summaryHtml + cardHtmls;
}

/**
 * _renderRiskResultMulti(practicecrops, targetId?)
 * 複数作物のリスクを作物カードで並列表示＋同科チェック。
 */
function _renderRiskResultMulti(practicecrops, targetId = 'risk-result') {
  const el = document.getElementById(targetId);
  if (!el) return;

  if (!practicecrops?.length) {
    el.innerHTML = '<div class="empty-mini">作物を追加するとリスク・注意点が表示されます。</div>';
    return;
  }

  // 同科チェック
  const crops = practicecrops.map(({ cropId }) =>
    (typeof _adpGetCropById === 'function') ? _adpGetCropById(cropId) : null
  ).filter(Boolean);

  const familyMap = {};
  crops.forEach(c => {
    const fam = c.conditions?.family;
    if (fam) (familyMap[fam] = familyMap[fam] || []).push(c.name);
  });
  const sameFamily = Object.entries(familyMap)
    .filter(([, names]) => names.length >= 2)
    .map(([fam, names]) => {
      const famJa = (typeof FAMILY_NAME_JA !== 'undefined' && FAMILY_NAME_JA[fam]) ? FAMILY_NAME_JA[fam] : fam;
      return `${names.join('・')} は同じ ${famJa} です（連作・病害リスクに注意）`;
    });

  const warningHtml = sameFamily.length ? `
    <div class="notice notice-warn" style="margin-bottom:8px;">
      ⚠️ 同科作物の組み合わせ<br>
      ${sameFamily.map(s => `<div style="font-size:11px;margin-top:4px;">${escHtml(s)}</div>`).join('')}
    </div>
  ` : '';

  const cardHtmls = practicecrops.map(({ cropId, ratio }, i) => {
    const crop  = (typeof _adpGetCropById === 'function') ? _adpGetCropById(cropId) : null;
    if (!crop) return '';
    const color = PRACTICE_CROP_COLORS[i % PRACTICE_CROP_COLORS.length];

    // 既存関数でHTML断片を組む（targetIdに直接描画せずHTML文字列を取得）
    const climateRiskHtml  = (typeof _buildClimateRiskHtml  === 'function') ? _buildClimateRiskHtml(crop)  : '';
    const rotationHtml     = (typeof _buildRotationSection  === 'function') ? _buildRotationSection(crop)  : '';
    let risksHtml = '';
    if (crop.risks?.length) {
      risksHtml = crop.risks.map(r => {
        const rc = r.level === 'high' ? 'var(--red)' : r.level === 'medium' ? 'var(--amber)' : 'var(--green2)';
        return `<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="color:${rc};font-size:10px;font-family:var(--mono);padding-top:2px;flex-shrink:0;">${r.level.toUpperCase()}</span>
          <div><div style="font-size:12px;font-weight:500;">${escHtml(r.name)}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;">${escHtml(r.note || '')}</div></div>
        </div>`;
      }).join('');
    }
    return `
      <div class="adp-multi-risk-card">
        <div class="adp-mrc-title" style="border-left:3px solid ${color};padding-left:6px;">
          ${escHtml(crop.name)} <span style="color:var(--text3);font-size:10px;">${ratio}%</span>
        </div>
        ${climateRiskHtml}${rotationHtml}${risksHtml ||
          (!climateRiskHtml && !rotationHtml ? '<div class="empty-mini">リスクデータなし</div>' : '')}
      </div>
    `;
  }).join('');

  el.innerHTML = warningHtml + cardHtmls;
}

// ══════════════════════════════════════════════════════════════
// 実務側：複数作物カレンダー描画（個別カード / 重ね表示 切替）
// ══════════════════════════════════════════════════════════════

// 表示モード状態 ('card' | 'overlay')
let _calMultiMode = 'card';

/**
 * _renderCalendarMulti(practicecrops, targetId?)
 * 個別カード表示 / 重ね表示 を切り替えボタン付きで描画。
 */
function _renderCalendarMulti(practicecrops, targetId = 'calendar-result') {
  const el = document.getElementById(targetId);
  if (!el) return;

  if (!practicecrops?.length) {
    el.innerHTML = '<div class="empty-mini">作物を追加すると生育カレンダーが表示されます。</div>';
    return;
  }

  // 切替ボタンバー
  const toggleBar = `
    <div class="wc-mode-toggle">
      <button class="wc-mode-btn ${_calMultiMode === 'card' ? 'active' : ''}"
        onclick="_calMultiMode='card'; _renderCalendarMulti(window.__adpPracticecropsRef||[], '${targetId}')">
        🗂️ 個別カード
      </button>
      <button class="wc-mode-btn ${_calMultiMode === 'overlay' ? 'active' : ''}"
        onclick="_calMultiMode='overlay'; _renderCalendarMulti(window.__adpPracticecropsRef||[], '${targetId}')">
        🔲 重ね表示
      </button>
    </div>
  `;

  // practicecropsへの参照をグローバルに保持（ボタンのonclickから参照するため）
  window.__adpPracticecropsRef = practicecrops;

  if (_calMultiMode === 'card') {
    _renderCalendarCards(practicecrops, targetId, toggleBar);
  } else {
    _renderCalendarOverlay(practicecrops, targetId, toggleBar);
  }
}

/**
 * _renderCalendarCards — 作物ごとに個別カードで並べる
 */
function _renderCalendarCards(practicecrops, targetId, toggleBar) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const cards = practicecrops.map(({ cropId, ratio }, ci) => {
    const crop  = (typeof _adpGetCropById === 'function') ? _adpGetCropById(cropId) : null;
    if (!crop || !crop.calendar) return '';
    const color = PRACTICE_CROP_COLORS[ci % PRACTICE_CROP_COLORS.length];
    const ratioHtml = `<span class="wc-crop-ratio">${ratio}%</span>`;
    const titleButtonHtml = ratioHtml;
    return `<div class="wc-crop-card">${buildWorkCalendarHTML(crop, { titleButtonHtml, color })}</div>`;
  }).join('');

  el.innerHTML = toggleBar + (cards || '<div class="empty-mini">カレンダーデータなし</div>');
}

/**
 * _renderCalendarOverlay — 全作物を1枚の旬グリッドに色分け重ね表示
 */
function _renderCalendarOverlay(practicecrops, targetId, toggleBar) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const phases = [
    { key: 'sowing',     label: '播種',     icon: '🌱' },
    { key: 'sow',        label: '採集準備', icon: '🌾' },
    { key: 'seedling',   label: '育苗',     icon: '🌿' },
    { key: 'transplant', label: '定植',     icon: '🪴' },
    { key: 'manage',     label: '管理',     icon: '🛠️' },
    { key: 'harvest',    label: '収穫',     icon: '🌟' },
  ];

  const cropEntries = practicecrops.map(({ cropId }, ci) => {
    const crop = (typeof _adpGetCropById === 'function') ? _adpGetCropById(cropId) : null;
    if (!crop || !crop.calendar) return null;
    const color = PRACTICE_CROP_COLORS[ci % PRACTICE_CROP_COLORS.length];
    const phaseSets = phases.map(p => ({
      ...p,
      decadeIdxs: _calMonthToDecadeIdxs(crop.calendar[p.key]),
    }));
    return { crop, color, phaseSets };
  }).filter(Boolean);

  if (!cropEntries.length) {
    el.innerHTML = toggleBar + '<div class="empty-mini">カレンダーデータなし</div>';
    return;
  }

  const activePhases = phases.filter(p =>
    cropEntries.some(e => e.phaseSets.find(ps => ps.key === p.key)?.decadeIdxs.size > 0)
  );

  // 凡例
  const legendHtml = cropEntries.map(({ crop, color }) => `
    <span class="wc-legend-item">
      <span class="wc-legend-dot" style="background:${color}"></span>${escHtml(crop.name)}
    </span>
  `).join('');

  // 旬ヘッダー
  const monthHeaders = MONTHS.map(m =>
    `<div class="wc-month-group"><span class="wc-month-name">${m}</span><div class="wc-jun-labels"><span>上</span><span>中</span><span>下</span></div></div>`
  ).join('');

  // フェーズ行
  const phaseRows = activePhases.map(phase => {
    const cells = Array.from({ length: 36 }, (_, i) => {
      const matching = cropEntries.filter(e =>
        e.phaseSets.find(ps => ps.key === phase.key)?.decadeIdxs.has(i)
      );
      if (!matching.length) return `<div class="wc-cell wc-dec-cell"></div>`;
      if (matching.length === 1) {
        return `<div class="wc-cell wc-dec-cell wc-cell-on" style="background:${matching[0].color};opacity:0.85;"></div>`;
      }
      const pct   = 100 / matching.length;
      const stops = matching.map((e, k) =>
        `${e.color} ${k*pct}%, ${e.color} ${(k+1)*pct}%`
      ).join(', ');
      return `<div class="wc-cell wc-dec-cell wc-cell-on" style="background:linear-gradient(to bottom,${stops});opacity:0.85;"></div>`;
    }).join('');
    return `
      <div class="wc-row">
        <div class="wc-phase-label">
          <span class="wc-phase-icon">${phase.icon}</span><span>${phase.label}</span>
        </div>
        <div class="wc-cells wc-cells-36">${cells}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    ${toggleBar}
    <div class="wc-wrap">
      <div class="wc-title-row">
        <div class="wc-title">生育カレンダー（重合表示）</div>
      </div>
      <div class="wc-legend" style="margin-bottom:8px;">${legendHtml}</div>
      <div class="wc-dec-header">
        <div class="wc-phase-label"></div>
        <div class="wc-month-headers">${monthHeaders}</div>
      </div>
      ${phaseRows}
    </div>
  `;
}
