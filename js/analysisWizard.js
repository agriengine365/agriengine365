// ═══════════════════════════════════════════
//  ANALYSIS WIZARD — 分析ウィザードダイアログ
//  フロー（3ステップ・リアルタイム更新）:
//    Step1: 営農条件入力（優先軸/設備/栽培期間/販売先/規模/経験）
//    Step2: 作物選択（①作りたい作物を探す ／ ②おすすめから選ぶ・複数選択可）
//    Step3: 見たい分析項目を選択 → 分析実行
//  各ステップの操作は即座に裏の分析タブへ反映される。
// ═══════════════════════════════════════════

// ─── カテゴリラベル（作物検索用） ───
const CATEGORY_LABELS = {
  grain:     { label: '穀物',         icon: '🌾' },
  legume:    { label: '豆類',         icon: '🫘' },
  leafy:     { label: '葉菜類',       icon: '🥬' },
  fruit_veg: { label: '果菜類',       icon: '🍅' },
  root:      { label: '根菜類',       icon: '🥕' },
  vegetable: { label: '野菜（その他）', icon: '🥦' },
  fruit:     { label: '果物',         icon: '🍎' },
  wildveg:   { label: '山菜・きのこ', icon: '🍄' },
  forest:    { label: '林産きのこ',   icon: '🌲' },
  herb:      { label: 'ハーブ・薬草', icon: '🌿' },
  oil:       { label: '油脂作物',     icon: '🫙' },
  fiber:     { label: '繊維作物',     icon: '🧵' },
};

// ─── Step1: 営農条件の選択肢定義（engine.js calcFarmingConditionScoreと対応） ───
const FARM_COND_GROUPS = [
  { key: 'priority', label: '優先軸', icon: '🎯', options: [
      { value: 'profit',   label: '収益重視', icon: '💰' },
      { value: 'easywork', label: '手間最小', icon: '🪶' },
      { value: 'lowrisk',  label: '低リスク', icon: '🛡️' },
  ]},
  { key: 'equipment', label: '設備', icon: '🏗️', options: [
      { value: 'openField',  label: '露地のみ',   icon: '☀️' },
      { value: 'greenhouse', label: 'ハウスあり', icon: '🏠' },
      { value: 'paddy',      label: '水田利用可', icon: '💧' },
  ]},
  { key: 'period', label: '栽培期間', icon: '⏳', options: [
      { value: 'short', label: '短期（〜3ヶ月）', icon: '⚡' },
      { value: 'mid',   label: '中期（〜8ヶ月）', icon: '🌱' },
      { value: 'long',  label: '長期・樹木可',     icon: '🌳' },
  ]},
  { key: 'sales', label: '販売先', icon: '🛒', options: [
      { value: 'direct',     label: '直売所',   icon: '🏪' },
      { value: 'roadside',   label: '道の駅',   icon: '🛣️' },
      { value: 'ja',         label: 'JA出荷',   icon: '🚜' },
      { value: 'processing', label: '加工業者', icon: '🏭' },
      { value: 'self',       label: '自家消費', icon: '🍽️' },
  ]},
  { key: 'scale', label: '規模', icon: '👥', options: [
      { value: 'solo',   label: '一人',     icon: '🧑' },
      { value: 'family', label: '家族経営', icon: '👨\u200d👩\u200d👧' },
      { value: 'hired',  label: '雇用あり', icon: '👷' },
  ]},
  { key: 'experience', label: '経験', icon: '🎓', options: [
      { value: 'beginner', label: '初心者', icon: '🌱' },
      { value: 'mid',      label: '中級',   icon: '🌿' },
      { value: 'expert',   label: '上級',   icon: '🌲' },
  ]},
];

// ─── Step3: 分析項目定義（an-itab / an-pane のキーと対応） ───
const AW_ITEM_DEFS = [
  { key: 'ranking',  label: 'ランキング',     icon: '🏆' },
  { key: 'profit',   label: '収益概算',       icon: '💴' },
  { key: 'fert',     label: '施肥概算',       icon: '🧪' },
  { key: 'risk',     label: 'リスク・注意点', icon: '⚠️' },
  { key: 'calendar', label: '生育カレンダー', icon: '📅' },
  { key: 'match',    label: 'エリア適合度',   icon: '📊' },
  { key: 'compare',  label: '比較',           icon: '⚖️' },
];

const AW_STEP_TITLES = ['営農条件入力', '作物選択', '分析項目を選択'];

// ─── ウィザード状態 ───
let _awStep           = 0;        // 現在ステップ (0〜2)
let _awArea           = null;     // 選択中エリアデータ
let _awFarmCond       = null;     // 営農条件（6項目）
let _awSearchMode     = 'recommend'; // 'recommend' | 'search'
let _awSearchCategory = null;     // 検索モードのカテゴリ絞り
let _awSearchText     = '';       // 検索モードのテキスト
let _awSelectedCropIds = [];      // 選択中の作物ID（複数=比較）
let _awAnalysisItems  = new Set(['ranking','profit','fert','risk','calendar','match']); // Step3選択
let _awAllScores      = [];       // buildAnalysisResult().cropScores のキャッシュ

const AW_MAX_COMPARE = 5; // 比較できる作物の最大数

function _awDefaultFarmCond() {
  return {
    priority:   'profit',
    equipment:  'openField',
    period:     'mid',
    sales:      'self',
    scale:      'solo',
    experience: 'beginner',
  };
}

// ─── ダイアログを開く ───
function openAnalysisWizard(area) {
  _awArea            = area;
  _awStep            = 0;
  _awFarmCond        = _awDefaultFarmCond();
  _awSearchMode      = 'recommend';
  _awSearchCategory  = null;
  _awSearchText      = '';
  _awSelectedCropIds = [];
  _awAnalysisItems   = new Set(['ranking','profit','fert','risk','calendar','match']);
  _awAllScores       = [];

  const overlay = document.getElementById('aw-overlay');
  const nameEl  = document.getElementById('aw-area-name');
  if (nameEl) nameEl.textContent = area.name || '';

  _awRenderStep(0);
  _awRunAnalysis(); // 初期状態（デフォルト条件）で裏の分析タブを即時更新

  overlay.classList.add('open');
}

// ─── ダイアログを閉じる ───
function closeAnalysisWizard() {
  document.getElementById('aw-overlay').classList.remove('open');
}

// ─── ステップ描画ディスパッチャ ───
function _awRenderStep(step) {
  _awStep = step;
  _awUpdateProgress(step);

  switch (step) {
    case 0: _awRenderConditions(); break;
    case 1: _awRenderCropSelect(); break;
    case 2: _awRenderItems();      break;
  }
}

// ─── プログレスバー更新 ───
function _awUpdateProgress(step) {
  for (let i = 0; i < 3; i++) {
    const dot = document.getElementById('awdot-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < step)   dot.classList.add('done');
    if (i === step) dot.classList.add('active');
  }
  const el = document.getElementById('aw-step-title');
  if (el) el.textContent = AW_STEP_TITLES[step];
}

// ═══════════════════════════════════════════
//  Step 1: 営農条件入力
// ═══════════════════════════════════════════
function _awRenderConditions() {
  const body = document.getElementById('aw-body');
  body.innerHTML = `
    <div class="aw-live-preview" id="aw-live-preview"></div>
    <div class="aw-cond-groups">
      ${FARM_COND_GROUPS.map(g => `
        <div class="aw-cond-group">
          <div class="aw-cond-label">${g.icon} ${g.label}</div>
          <div class="aw-cond-row">
            ${g.options.map(o => `
              <button class="aw-cond-chip ${_awFarmCond[g.key] === o.value ? 'selected' : ''}"
                onclick="_awSetCondition('${g.key}','${o.value}')">
                <span class="aw-cond-chip-icon">${o.icon}</span>
                <span class="aw-cond-chip-label">${o.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  _awUpdateLivePreview();
  _awRenderFooter({
    back: false,
    next: true, nextLabel: '次へ →',
    onNext: () => _awRenderStep(1),
  });
}

function _awSetCondition(key, value) {
  if (_awFarmCond[key] === value) return;
  _awFarmCond[key] = value;
  _awRunAnalysis();      // 裏の分析タブをリアルタイム更新
  _awRenderConditions(); // チップの選択状態を再描画
}

// ═══════════════════════════════════════════
//  Step 2: 作物選択（複数選択可）
// ═══════════════════════════════════════════
function _awRenderCropSelect() {
  const body = document.getElementById('aw-body');

  const chips = _awSelectedCropIds.map(id => {
    const s    = _awAllScores.find(s => s.crop.id === id);
    const name = s ? s.crop.name : id;
    return `
      <span class="aw-crop-chip">
        ${escHtml(name)}
        <button class="aw-chip-remove" onclick="_awToggleCropSelect('${id}')">✕</button>
      </span>
    `;
  }).join('');

  body.innerHTML = `
    <div class="aw-live-preview" id="aw-live-preview"></div>
    ${_awSelectedCropIds.length ? `<div class="aw-crop-chips">${chips}</div>` : ''}
    <div class="aw-mode-toggle">
      <button class="aw-mode-btn ${_awSearchMode === 'recommend' ? 'active' : ''}"
        onclick="_awSetSearchMode('recommend')">⭐ おすすめから選ぶ</button>
      <button class="aw-mode-btn ${_awSearchMode === 'search' ? 'active' : ''}"
        onclick="_awSetSearchMode('search')">🔍 作物を探す</button>
    </div>
    ${_awSearchMode === 'search' ? `
      <div class="aw-search-row">
        <select class="aw-search-category" onchange="_awSetSearchCategory(this.value)">
          <option value="">全カテゴリ</option>
          ${Object.entries(CATEGORY_LABELS).map(([key, v]) => `
            <option value="${key}" ${_awSearchCategory === key ? 'selected' : ''}>${v.icon} ${v.label}</option>
          `).join('')}
        </select>
        <input type="text" class="aw-search-text" placeholder="作物名で検索"
          value="${escHtml(_awSearchText)}" oninput="_awSetSearchText(this.value)">
      </div>
    ` : ''}
    <div class="aw-crop-list">${_awBuildCropListHtml()}</div>
  `;
  _awUpdateLivePreview();
  _awRenderFooter({
    back: true,  onBack: () => _awRenderStep(0),
    next: true,  nextLabel: '次へ →', onNext: () => _awRenderStep(2),
  });
}

// 作物リストHTML（おすすめ Top10 ／ 検索結果）
function _awBuildCropListHtml() {
  let scores = _awAllScores;

  if (_awSearchMode === 'recommend') {
    scores = scores.slice(0, 10);
    if (!scores.length) return '<div class="empty-mini">エリアデータを読み込み中…</div>';
    return scores.map((s, i) => _awCropItemHtml(s, i + 1)).join('');
  }

  if (_awSearchCategory) scores = scores.filter(s => s.crop.category === _awSearchCategory);
  if (_awSearchText.trim()) {
    const q = _awSearchText.trim();
    scores = scores.filter(s => s.crop.name.includes(q));
  }
  if (!scores.length) return '<div class="empty-mini">該当する作物がありません</div>';
  return scores.slice(0, 30).map(s => _awCropItemHtml(s, null)).join('');
}

function _awCropItemHtml(s, rank) {
  const selected = _awSelectedCropIds.includes(s.crop.id);
  const scoreCls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
  return `
    <button class="aw-crop-item ${selected ? 'selected' : ''}" onclick="_awToggleCropSelect('${s.crop.id}')">
      ${rank != null ? `<span class="aw-crop-rank">#${rank}</span>` : ''}
      <span class="aw-crop-name">${escHtml(s.crop.name)}</span>
      <span class="aw-crop-score ${s.viable ? scoreCls : 'score-low'}">${s.viable ? s.score + '%' : 'NG'}</span>
      ${selected ? '<span class="aw-crop-check">✓</span>' : ''}
    </button>
  `;
}

function _awSetSearchMode(mode) {
  if (_awSearchMode === mode) return;
  _awSearchMode = mode;
  _awRenderCropSelect();
}

function _awSetSearchCategory(cat) {
  _awSearchCategory = cat || null;
  _awRenderCropSelect();
}

let _awSearchDebounce = null;
function _awSetSearchText(text) {
  _awSearchText = text;
  // 入力中はリストだけ差し替え（input要素のフォーカスを保持）
  clearTimeout(_awSearchDebounce);
  _awSearchDebounce = setTimeout(() => {
    const listEl = document.querySelector('#aw-body .aw-crop-list');
    if (listEl) listEl.innerHTML = _awBuildCropListHtml();
  }, 150);
}

// 作物の選択/解除（最大 AW_MAX_COMPARE 件）
function _awToggleCropSelect(id) {
  const idx = _awSelectedCropIds.indexOf(id);
  if (idx >= 0) {
    _awSelectedCropIds.splice(idx, 1);
  } else {
    if (_awSelectedCropIds.length >= AW_MAX_COMPARE) {
      if (typeof showToast === 'function') {
        showToast(`比較できる作物は最大${AW_MAX_COMPARE}件までです`);
      }
      return;
    }
    _awSelectedCropIds.push(id);
  }
  _awRunAnalysis();      // 裏の分析タブをリアルタイム更新
  _awRenderCropSelect();
}

// ═══════════════════════════════════════════
//  Step 3: 分析項目選択 → 実行
// ═══════════════════════════════════════════
function _awRenderItems() {
  const body  = document.getElementById('aw-body');
  const items = AW_ITEM_DEFS.filter(i => i.key !== 'compare' || _awSelectedCropIds.length >= 2);

  body.innerHTML = `
    <div class="aw-live-preview" id="aw-live-preview"></div>
    <div class="aw-items-header">
      <div class="aw-items-hint">タップした項目は分析タブにすぐ反映されます</div>
    </div>
    <div class="aw-check-list">
      ${items.map(item => `
        <label class="aw-check-item ${_awAnalysisItems.has(item.key) ? 'checked' : ''}" data-key="${item.key}">
          <input type="checkbox" class="aw-hidden-check" data-key="${item.key}"
            ${_awAnalysisItems.has(item.key) ? 'checked' : ''}
            onchange="_awToggleAnalysisItem('${item.key}', this.checked)">
          <span class="aw-check-icon">${item.icon}</span>
          <span class="aw-check-label">${item.label}</span>
          <span class="aw-check-mark">${_awAnalysisItems.has(item.key) ? '✓' : ''}</span>
        </label>
      `).join('')}
    </div>
  `;
  _awUpdateLivePreview();
  _awRenderFooter({
    back: true, onBack: () => _awRenderStep(1),
    next: true, nextLabel: '分析実行',
    nextClass: 'aw-btn-run',
    onNext: _awExecute,
  });
}

function _awToggleAnalysisItem(key, checked) {
  if (checked) _awAnalysisItems.add(key);
  else         _awAnalysisItems.delete(key);

  document.querySelectorAll('#aw-body .aw-check-item').forEach(lbl => {
    const k = lbl.dataset.key;
    if (!k) return;
    lbl.classList.toggle('checked', _awAnalysisItems.has(k));
    const mark = lbl.querySelector('.aw-check-mark');
    if (mark) mark.textContent = _awAnalysisItems.has(k) ? '✓' : '';
  });

  // チェックした項目を裏の分析タブで即時表示（リアルタイム切替）
  if (checked && typeof anSwitchTab === 'function') {
    anSwitchTab(key);
  }
}

// ─── フッター（戻る／次へ）描画 ───
function _awRenderFooter({ back, onBack, next, nextLabel, nextClass = '', onNext }) {
  const footer = document.getElementById('aw-footer');
  footer.innerHTML = `
    ${back ? `<button class="aw-btn aw-btn-back" id="aw-btn-back">← 戻る</button>` : '<div></div>'}
    <button class="aw-btn aw-btn-next ${nextClass}" id="aw-btn-next" ${!next ? 'disabled' : ''}>
      ${nextLabel}
    </button>
  `;
  if (back && onBack) {
    const backEl = document.getElementById('aw-btn-back');
    if (backEl) backEl.addEventListener('click', onBack);
  }
  const nextEl = document.getElementById('aw-btn-next');
  if (nextEl && onNext) nextEl.addEventListener('click', onNext);
}

// ═══════════════════════════════════════════
//  リアルタイム分析エンジン連携
// ═══════════════════════════════════════════

// ウィザードの選択状態から currentAreaData を再構築
function _awBuildAreaData() {
  const area = _awArea;
  const lp   = area.landProfile || {};
  const meta = area.meta        || {};

  function _pick(...vals) {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  // 設備条件 → 栽培方式（ハウスありならhouse補正、それ以外は露地として計算）
  const cultivationMode = _awFarmCond.equipment === 'greenhouse' ? 'greenhouse' : 'openField';

  let ad;
  if (typeof normalizeAreaData === 'function') {
    ad = normalizeAreaData(area, {
      selectedCropId:    _awSelectedCropIds[0] || null,
      cultivationMode,
      analysisItems:     Array.from(_awAnalysisItems),
      farmingConditions: { ..._awFarmCond },
    });
  } else {
    // フォールバック（areaEnv.js 未読込時）
    const lat = _pick(lp.lat, meta.lat, area.lat);
    ad = {
      lat,
      lng:             _pick(lp.lng,       meta.lng,      area.lng),
      elev:            _pick(lp.elevation, meta.elev,     area.elev),
      climate:         (typeof getClimate === 'function' && lat != null)
                         ? getClimate(lat) : null,
      soilType:        _pick(lp.soilType,  meta.soilType, area.soilType) || 'unknown',
      ph:              _pick(lp.ph,        meta.ph,       area.ph),
      slope:           _pick(lp.slope,     meta.slope,    area.slope)    ?? 0,
      areaSqm:         _pick(meta.areaSqm, area.areaSqm)                 || 0,
      areaHa:          _pick(meta.areaHa,  area.areaHa)                  || 0,
      selectedCropId:  _awSelectedCropIds[0] || null,
      cultivationMode,
      analysisItems:   Array.from(_awAnalysisItems),
      landProfile:     Object.keys(lp).length ? lp : null,
      env:             {},
    };
  }

  // 営農条件・栽培方式を確実に反映
  ad.farmingConditions = { ..._awFarmCond };
  ad.cultivationMode   = cultivationMode;

  currentAreaData = ad;
  return ad;
}

// 現在の選択状態で分析タブを再計算・再描画する
function _awRunAnalysis() {
  if (!_awArea) return;

  const ad   = _awBuildAreaData();
  const name = _awArea.name || 'エリア';

  // 全作物スコア（営農条件込み）を再計算 → おすすめリスト・ライブプレビューの元データ
  if (typeof buildAnalysisResult === 'function') {
    _awAllScores = buildAnalysisResult(ad).cropScores;
  }

  if (_awSelectedCropIds.length === 0) {
    // 0件選択：全体ランキング表示
    runAnalysis(name);
    if (typeof renderCompareTable === 'function') renderCompareTable([]);
  } else if (_awSelectedCropIds.length === 1) {
    // 1件選択：単一作物詳細
    ad.selectedCropId = _awSelectedCropIds[0];
    runSingleCropAnalysis(name);
    if (typeof renderCompareTable === 'function') renderCompareTable([]);
  } else {
    // 2件以上：先頭作物を詳細表示 + 比較テーブル
    ad.selectedCropId = _awSelectedCropIds[0];
    runSingleCropAnalysis(name);

    if (typeof buildSingleCropAnalysis === 'function' && typeof renderCompareTable === 'function') {
      const results = _awSelectedCropIds
        .map(id => buildSingleCropAnalysis(id, ad)?.scoreResult)
        .filter(Boolean);
      renderCompareTable(results);
    }
  }

  _awUpdateLivePreview();
}

// モーダル内のライブプレビューバーを更新
function _awUpdateLivePreview() {
  const bar = document.getElementById('aw-live-preview');
  if (!bar) return;

  const ad = window.currentAreaData || {};
  const modeLabels = { openField: '露地栽培', greenhouse: 'ハウス栽培', heatedGreenhouse: '加温ハウス' };
  const modeLabel  = modeLabels[ad.cultivationMode] || '露地栽培';

  let cropName = '—';
  let scoreHtml = '<span class="aw-live-score score-mid">—</span>';
  let extra = '';

  if (_awSelectedCropIds.length >= 1) {
    const s = _awAllScores.find(x => x.crop.id === _awSelectedCropIds[0]);
    if (s) {
      cropName  = s.crop.name;
      const cls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
      scoreHtml = `<span class="aw-live-score ${s.viable ? cls : 'score-low'}">${s.viable ? s.score + '%' : 'NG'}</span>`;
    }
    if (_awSelectedCropIds.length > 1) {
      extra = `<span class="aw-live-extra">他${_awSelectedCropIds.length - 1}件と比較中</span>`;
    }
  } else if (_awAllScores.length) {
    const top = _awAllScores[0];
    cropName  = top.crop.name + '（おすすめ）';
    const cls = top.score >= 70 ? 'score-high' : top.score >= 40 ? 'score-mid' : 'score-low';
    scoreHtml = `<span class="aw-live-score ${top.viable ? cls : 'score-low'}">${top.viable ? top.score + '%' : 'NG'}</span>`;
  }

  bar.innerHTML = `
    <span class="aw-live-icon">📡</span>
    <span class="aw-live-crop">${escHtml(cropName)}</span>
    ${scoreHtml}
    <span class="aw-live-mode">${escHtml(modeLabel)}</span>
    ${extra}
  `;
}

// ─── 分析実行（Step3「分析実行」ボタン） ───
function _awExecute() {
  if (!_awArea) return;

  _awRunAnalysis();
  closeAnalysisWizard();

  const area = _awArea;

  // ─ 地図にポリゴンを表示 ─
  if (area.geojson && typeof drawnItems !== 'undefined' && typeof map !== 'undefined') {
    try {
      drawnItems.clearLayers();
      // geojsonはFirestoreではJSON文字列で保存されているためパースが必要
      const geojsonData = typeof area.geojson === 'string'
        ? JSON.parse(area.geojson) : area.geojson;
      const drawColor = (typeof CONFIG !== 'undefined' && CONFIG.DRAW_COLOR)
        ? CONFIG.DRAW_COLOR : '#4ade80';
      const layer = L.geoJSON(geojsonData, {
        style: { color: drawColor, weight: 2, fillOpacity: 0.2 },
      });
      layer.addTo(drawnItems);
      map.fitBounds(layer.getBounds());
    } catch(e) {
      console.warn('[_awExecute] geojson parse error:', e);
    }
  }

  // ─ 分析タブへ切替 ─
  if (typeof switchTab === 'function') {
    switchTab('analysis');
  } else {
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === 'analysis')
    );
    document.querySelectorAll('.tab-content').forEach(c =>
      c.classList.toggle('active', c.id === 'tab-analysis')
    );
  }

  // ─ Step3で選択した項目のうち先頭をフォーカス ─
  const focusKey = AW_ITEM_DEFS.find(i => _awAnalysisItems.has(i.key))?.key || 'ranking';
  if (typeof anSwitchTab === 'function') {
    anSwitchTab(focusKey);
  }
}
