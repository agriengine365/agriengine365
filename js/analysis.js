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
  const scores = _crFilteredScores();
  if (!scores.length) {
    el.innerHTML = '<div class="empty-mini">該当作物なし</div>';
    return;
  }
  el.innerHTML = scores.slice(0, 20).map((s, i) => {
    const scoreCls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
    return `
      <div class="cr-item ${s.viable ? '' : 'cr-item-ng'}"
        onclick="adpCropTap('${s.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}</span>
          <span class="cr-name">${escHtml(s.crop.name)}</span>
          <span class="cr-score ${s.viable ? scoreCls : 'score-low'}">${s.viable ? s.score + '%' : 'NG'}</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${s.viable ? scoreCls : 'score-low'}" style="width:${s.viable ? s.score : 0}%"></div>
        </div>
        ${s.alert ? `<div class="cr-alert">${escHtml(s.alert)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ─── 作物×土地プロフィールのゲージ生成 ───
function _crBuildGauges(crop, profile) {
  if (!profile) return '<div class="empty-mini">プロフィールデータなし</div>';

  const c = crop.conditions || {};
  const gauges = [];

  // 年均気温
  if (c.tempMeanMin != null && c.tempMeanMax != null) {
    const survivalTempMin = c.survivalTempMin ?? (c.tempMeanMin - 3);
    gauges.push(rangeGauge({
      label: '年均気温',
      value: profile.avgTemp,
      unit: '℃',
      min: survivalTempMin,
      max: c.tempMeanMax,
      displayMin: survivalTempMin - 4,
      displayMax: c.tempMeanMax + 4,
      optimalMin: c.tempMeanMin,
      optimalMax: c.tempMeanMax,
      survivalMin: survivalTempMin,
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

function rangeGauge({ label, value, unit = '', min, max, displayMin, displayMax, optimalMin, optimalMax, survivalMin = null }) {
  const hasValue = Number.isFinite(Number(value));
  const lo = Number.isFinite(Number(displayMin)) ? displayMin : min;
  const hi = Number.isFinite(Number(displayMax)) ? displayMax : max;
  const span = Math.max(hi - lo, 0.0001);
  const pos = hasValue ? clamp((value - lo) / span * 100, 0, 100) : null;
  const optLeft  = clamp((optimalMin - lo) / span * 100, 0, 100);
  const optRight = clamp((optimalMax - lo) / span * 100, 0, 100);
  const optWidth = Math.max(2, optRight - optLeft);
  const status = rangeStatus(value, optimalMin, optimalMax);
  const statusLabel = status === 'missing' ? 'データなし' : status === 'out' ? '範囲外' : '適合';
  const statusClass = status === 'in' ? 'rg-status-in' : status === 'out' ? 'rg-status-out' : 'rg-status-missing';
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
  const scoreCls    = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
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
        <span class="cr-score ${s.viable ? scoreCls : 'score-low'}" style="font-size:14px;">
          ${s.viable ? s.score + '%' : 'NG'}
        </span>
      </div>
      <div class="cr-bar-track">
        <div class="cr-bar-fill ${s.viable ? scoreCls : 'score-low'}"
          style="width:${s.viable ? s.score : 0}%"></div>
      </div>
      ${s.alert ? `<div class="cr-alert">${escHtml(s.alert)}</div>` : ''}
      <div class="cr-gauge-wrap">
        ${_crBuildGauges(result.crop, lp)}
      </div>
    </div>
    <div class="sc-detail-section">
      <div class="sc-detail-title">スコア詳細</div>
      ${s.details.map(d => {
        const icon = d.ok === true ? '✓' : d.ok === false ? '✗' : '–';
        const cls  = d.ok === true ? 'det-ok' : d.ok === false ? 'det-ng' : 'det-na';
        return `<div class="crop-detail-row">
          <span class="det-icon ${cls}">${icon}</span>
          <span class="det-text">${escHtml(d.text)}</span>
        </div>`;
      }).join('')}
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

// ─── 施肥結果描画（計算済みデータ受取版） ───
// targetId: 描画先要素ID。実務タブ既定値は 'fert-result'、分析側からは 'fert-result-analysis' を渡す。
function _renderFertResultFromData(crop, fert, targetId = 'fert-result') {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (!fert) {
    el.innerHTML = '<div style="color:var(--text3);font-size:11px;">施肥データなし（この作物は施肥情報未登録）</div>';
    return;
  }
  el.innerHTML = `
    <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">
      対象：${escHtml(crop.name)} / ${fert.area10a} 10a
    </div>
    <div class="area-stat"><span class="label">N</span><span class="value">${fert.N}<span class="unit">kg</span></span></div>
    <div class="area-stat"><span class="label">P</span><span class="value">${fert.P}<span class="unit">kg</span></span></div>
    <div class="area-stat"><span class="label">K</span><span class="value">${fert.K}<span class="unit">kg</span></span></div>
    <div class="notice notice-info" style="margin-top:8px;">${fert.notes}</div>
  `;
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
/**
 * buildWorkCalendarHTML(crop, opts)
 * crop.calendar の sowing / sow / seedling / transplant / manage / harvest を月グリッドで可視化するHTML文字列を返す。
 * 単独の作物カレンダー表示（renderWorkCalendar）と、保存済み作物一覧（_adpRenderSavedCalendarsList）の
 * 両方から呼ばれる共通ビルダー。DOM書き込みは行わない（呼び出し側の責務）。
 * 注：prep（休眠・準備期間）とorder（未実装・cropDB実データなし）は対象外
 *
 * opts.titleButtonHtml: タイトル行右側に差し込むボタンHTML（保存/保存済み/削除など。呼び出し側で組み立てる）
 */
function buildWorkCalendarHTML(crop, opts = {}) {
  if (!crop || !crop.calendar) return '<div class="empty-mini">カレンダーデータなし</div>';

  const cal   = crop.calendar;
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  // フェーズ定義（sowingとsowは別行＝通常農法の播種 と 採集系の採集準備）
  const phases = [
    { key: 'sowing',     label: '播種',     color: 'var(--green3)', icon: '🌱' },
    { key: 'sow',        label: '採集準備', color: 'var(--green3)', icon: '🌾' },
    { key: 'seedling',   label: '育苗',     color: 'var(--green2)', icon: '🌿' },
    { key: 'transplant', label: '定植',     color: 'var(--amber)',  icon: '🪴' },
    { key: 'manage',     label: '管理',     color: 'var(--amber)',  icon: '🛠️' },
    { key: 'harvest',    label: '収穫',     color: 'var(--green)',  icon: '🌟' },
  ];

  // 各フェーズの月indexセット（0-11）を作成。_adpGrowthCalToIdxが数値月／文字列キー両対応で正規化する
  const phaseSets = phases.map(p => ({
    ...p,
    months: new Set(
      typeof _adpGrowthCalToIdx === 'function'
        ? _adpGrowthCalToIdx(cal[p.key])
        : []
    ),
  }));

  const activePhases = phaseSets.filter(p => p.months.size > 0);

  if (!activePhases.length) return '<div class="empty-mini">カレンダーデータなし</div>';

  // ヘッダー行（月名）
  const headerCells = MONTHS.map((m, i) => {
    const isActive = activePhases.some(p => p.months.has(i));
    return `<div class="wc-head-cell ${isActive ? 'wc-head-active' : ''}">${m}</div>`;
  }).join('');

  // 各フェーズ行
  const phaseRows = activePhases.map(p => {
    const cells = MONTHS.map((_, i) => {
      const on = p.months.has(i);
      return `<div class="wc-cell ${on ? 'wc-cell-on' : ''}"
        style="${on ? `background:${p.color};opacity:0.85` : ''}"></div>`;
    }).join('');
    return `
      <div class="wc-row">
        <div class="wc-phase-label">
          <span class="wc-phase-icon">${p.icon}</span>
          <span>${p.label}</span>
        </div>
        <div class="wc-cells">${cells}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="wc-wrap">
      <div class="wc-title-row">
        <div class="wc-title">${escHtml(crop.name)} — 作業カレンダー</div>
        ${opts.titleButtonHtml || ''}
      </div>
      <div class="wc-header">
        <div class="wc-phase-label"></div>
        <div class="wc-cells">${headerCells}</div>
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