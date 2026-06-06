// ═══════════════════════════════════════════
//  ANALYSIS — 作物ランキング・収益・施肥・リスク
//  土地評価・土地プロフィール・適合レンジはADPパネル側へ移動済み
// ═══════════════════════════════════════════

// ─── scoreClass ガード（engine.js未ロード時のフォールバック） ───
if (typeof scoreClass === 'undefined') {
  window.scoreClass = function(score) {
    if (score >= 80) return 'score-high';
    if (score >= 55) return 'score-mid';
    return 'score-low';
  };
}

// ─── escHtml ガード（ui.js未ロード時のフォールバック） ───
if (typeof escHtml === 'undefined') {
  window.escHtml = function(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
  all:       null, // 全件（小タブなし）
  vegetable: ['leafy', 'root', 'fruit_veg', 'vegetable'],
  fruit:     null, // fruitのみ（小タブなし）
  wild:      ['wildveg', 'herb'],
  grain:     ['grain', 'forest'],
};

const CR_MINOR_LABELS = {
  leafy:     '葉菜',
  root:      '根菜',
  fruit_veg: '果菜',
  vegetable: '野菜',
  wildveg:   '山菜・野草',
  herb:      'ハーブ',
  grain:     '穀物',
  forest:    '林産',
};

// 大カテゴリーに対応するCROP_DBのcategoryキー一覧
const CR_MAJOR_TO_CATEGORIES = {
  all:       null,
  vegetable: ['leafy', 'root', 'fruit_veg', 'vegetable'],
  fruit:     ['fruit'],
  wild:      ['wildveg', 'herb'],
  grain:     ['grain', 'forest'],
};

// ─── ランキング状態 ───
let _crMajor = 'all';
let _crMinor = null;       // nullは全小カテゴリー表示
let _crScores = [];        // buildAnalysisResult後のscores全件
let _crSelectedCropId = null; // アコーディオン展開中のcropId
let _crProfile = null;     // 現在のlandProfile（ゲージ描画用）

// ─── 大タブ切り替え ───
function crSwitchMajor(major) {
  _crMajor = major;
  _crMinor = null;

  // 大タブUI更新
  document.querySelectorAll('.cr-tab-major').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.major === major);
  });

  _crRenderMinorTabs();
  _crRenderList();
}

// ─── 小タブ描画 ───
function _crRenderMinorTabs() {
  const wrap = document.getElementById('cr-tabs-minor');
  if (!wrap) return;

  const minors = CR_MAJOR[_crMajor];
  if (!minors || minors.length <= 1) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }

  wrap.style.display = 'flex';
  wrap.innerHTML = `
    <button class="cr-tab-minor ${_crMinor === null ? 'active' : ''}" onclick="crSwitchMinor(null)">すべて</button>
    ${minors.map(key => `
      <button class="cr-tab-minor ${_crMinor === key ? 'active' : ''}"
        onclick="crSwitchMinor('${key}')">
        ${CR_MINOR_LABELS[key] || key}
      </button>
    `).join('')}
  `;
}

// ─── 小タブ切り替え ───
function crSwitchMinor(minor) {
  _crMinor = minor;
  document.querySelectorAll('.cr-tab-minor').forEach(btn => {
    const val = btn.getAttribute('onclick').match(/'([^']*)'/) ?
      btn.getAttribute('onclick').match(/'([^']*)'/)[1] : null;
    btn.classList.toggle('active', val === minor);
  });
  _crRenderList();
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
function _crRenderList() {
  const el = document.getElementById('crop-ranking');
  if (!el) return;

  const scores = _crFilteredScores();

  if (!scores.length) {
    el.innerHTML = '<div class="empty-mini">該当作物なし</div>';
    return;
  }

  // 上位20件に絞る
  el.innerHTML = scores.slice(0, 20).map((s, i) => {
    const isExpanded = _crSelectedCropId === s.crop.id;
    const scoreCls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
    const barClass = s.viable ? scoreCls : 'score-low';
    const barWidth = s.viable ? s.score : 0;

    return `
      <div class="cr-item ${s.viable ? '' : 'cr-item-ng'} ${isExpanded ? 'cr-item-open' : ''}"
        onclick="crToggleItem('${s.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}</span>
          <span class="cr-name">${s.crop.name}</span>
          <span class="cr-score ${s.viable ? scoreCls : 'score-low'}">${s.viable ? s.score + '%' : 'NG'}</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${barClass}" style="width:${barWidth}%"></div>
        </div>
        ${s.alert ? `<div class="cr-alert">${s.alert}</div>` : ''}
        ${isExpanded ? `<div class="cr-gauge-wrap">${_crBuildGauges(s.crop, _crProfile)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ─── 作物行タップ：アコーディオン展開 ───
function crToggleItem(cropId) {
  _crSelectedCropId = (_crSelectedCropId === cropId) ? null : cropId;

  // 選択作物が変わったら収益・施肥・リスクも更新
  if (_crSelectedCropId) {
    const s = _crScores.find(s => s.crop.id === _crSelectedCropId);
    if (s) {
      renderProfitWaterfall(s);
      _renderFertResult(s.crop);
      _renderRiskResult(s.crop);
    }
  }

  _crRenderList();
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
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

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

// ─── 収益ウォーターフォール ───
function renderProfitWaterfall(result) {
  const el = document.getElementById('profit-waterfall');
  if (!el) return;
  if (!result) {
    el.innerHTML = '<div class="empty-mini">作物データなし</div>';
    return;
  }

  const p = result.profitability;
  const maxAbs = Math.max(
    Math.abs(p.revenue),
    Math.abs(p.initialCost),
    Math.abs(p.annualCost + p.laborCost),
    Math.abs(p.riskDeduction),
    Math.abs(p.averageProfit),
    1
  );
  const row = (label, value, type) => {
    const width = Math.max(8, Math.min(100, Math.abs(value) / maxAbs * 100));
    return `
      <div class="waterfall-row">
        <div class="waterfall-label">${label}</div>
        <div class="waterfall-track">
          <div class="waterfall-bar ${type}" style="width:${width}%"></div>
        </div>
        <div class="waterfall-value">${fmtYen(value)}</div>
      </div>
    `;
  };

  el.innerHTML = `
    <div class="profit-summary">
      <div><span>対象作物</span><strong>${result.crop.name}</strong></div>
      <div><span>収量</span><strong>${fmtInt(p.predictedYield)} kg</strong></div>
      <div><span>出荷率</span><strong>${Math.round(p.marketableYieldRate * 100)}%</strong></div>
      <div><span>利益</span><strong class="${p.averageProfit >= 0 ? 'profit-plus' : 'profit-minus'}">${fmtYen(p.averageProfit)}</strong></div>
    </div>
    ${row('[+] 販売収入', p.revenue, 'plus')}
    ${row('[-] 初期費用', -p.initialCost, 'minus')}
    ${row('[-] 管理費＋人件費', -(p.annualCost + p.laborCost), 'minus')}
    ${row('[-] リスク控除', -p.riskDeduction, 'minus')}
    ${row('[=] 平均利益', p.averageProfit, p.averageProfit >= 0 ? 'plus' : 'minus')}
  `;
}

// ─── 施肥結果描画 ───
function _renderFertResult(crop) {
  const el = document.getElementById('fert-result');
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
function _renderRiskResult(crop) {
  const el = document.getElementById('risk-result');
  if (!el) return;

  if (!crop || !crop.risks?.length) {
    el.innerHTML = '<div class="empty-mini">リスクデータなし</div>';
    return;
  }

  el.innerHTML = crop.risks.map(r => {
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

  // ─ 共通UI表示切替 ─
  document.getElementById('analysis-empty').style.display  = 'none';
  document.getElementById('analysis-result').style.display = 'flex';

  // ─ 信頼度バー ─
  const conf    = result.confidence;
  const confPct = conf.pct;
  const bar = document.getElementById('conf-bar');
  bar.style.width = confPct + '%';
  bar.className = 'conf-bar-fill' + (confPct < 40 ? ' vlow' : confPct < 70 ? ' low' : '');
  document.getElementById('conf-pct').textContent   = confPct + '%';
  document.getElementById('conf-label').textContent =
    confPct >= 70 ? '高精度' : confPct >= 40 ? '中精度' : '低精度';
  document.getElementById('conf-detail').innerHTML  = conf.items.map(i => `- ${i}`).join('<br>');

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
  _crProfile = lp;
  _crMajor   = 'all';
  _crMinor   = null;
  _crSelectedCropId = null;

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

  // ─ 収益・施肥・リスク描画 ─
  renderProfitWaterfall({ crop: result.crop, profitability: result.profitability });
  _renderFertResultFromData(result.crop, result.fertilizer);
  _renderRiskResult(result.crop);
}

// ─── 施肥結果描画（計算済みデータ受取版） ───
function _renderFertResultFromData(crop, fert) {
  const el = document.getElementById('fert-result');
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
  console.group('[runAnalysis] called');
  console.log('currentAreaData:', JSON.stringify(currentAreaData, null, 2));
  if (!currentAreaData) { console.warn('currentAreaData is null/undefined'); console.groupEnd(); return; }

  const emptyEl  = document.getElementById('analysis-empty');
  const resultEl = document.getElementById('analysis-result');
  console.log('analysis-empty el:', emptyEl);
  console.log('analysis-result el:', resultEl);
  if (!emptyEl || !resultEl) { console.error('DOM要素が見つかりません'); console.groupEnd(); return; }

  emptyEl.style.display  = 'none';
  resultEl.style.display = 'flex';

  const ad = currentAreaData;
  let result;
  try {
    result = buildAnalysisResult(ad);
    console.log('buildAnalysisResult OK, topCrop:', result.topCrop?.crop?.name);
  } catch(e) {
    console.error('buildAnalysisResult error:', e);
    console.groupEnd();
    return;
  }
  console.groupEnd();
  const profile = result.landProfile;
  ad.landProfile = profile;
  ad.analysisSnapshot = {
    areaName,
    topCropId:  result.topCrop?.crop?.id || null,
    topScore:   result.topCrop?.score || null,
    topProfit:  result.topCrop?.profitability?.averageProfit || null,
  };

  // ─ 信頼度バー ─
  const conf = calcConfidence(areaDataFromLandProfile(ad, profile));
  const confPct = conf.pct;
  const bar = document.getElementById('conf-bar');
  bar.style.width = confPct + '%';
  bar.className = 'conf-bar-fill' + (confPct < 40 ? ' vlow' : confPct < 70 ? ' low' : '');
  document.getElementById('conf-pct').textContent = confPct + '%';
  document.getElementById('conf-label').textContent =
    confPct >= 70 ? '高精度' : confPct >= 40 ? '中精度' : '低精度';
  document.getElementById('conf-detail').innerHTML = conf.items.map(i => `- ${i}`).join('<br>');

  // ─ ランキング状態を初期化 ─
  _crScores  = result.cropScores;
  _crProfile = profile;
  _crMajor   = 'all';
  _crMinor   = null;
  _crSelectedCropId = result.topCrop?.crop?.id || null;

  // 大タブUIをリセット
  document.querySelectorAll('.cr-tab-major').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.major === 'all');
  });
  _crRenderMinorTabs();
  _crRenderList();

  // ─ 初期選択（トップ1作物）で収益・施肥・リスクを描画 ─
  const top = result.topCrop;
  if (top) {
    renderProfitWaterfall(top);
    _renderFertResult(top.crop);
    _renderRiskResult(top.crop);
  } else {
    renderProfitWaterfall(null);
    _renderFertResult(null);
    _renderRiskResult(null);
  }
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
