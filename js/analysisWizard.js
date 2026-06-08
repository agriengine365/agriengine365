// ═══════════════════════════════════════════
//  ANALYSIS WIZARD — 分析ウィザードダイアログ
//  フロー: カテゴリ → 作物 → 栽培方式 → 分析内容 → 実行
// ═══════════════════════════════════════════

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

const CULTIVATION_MODES = [
  { value: 'openField',        label: '露地栽培',     icon: '☀️' },
  { value: 'greenhouse',       label: 'ハウス栽培',   icon: '🏠' },
  { value: 'heatedGreenhouse', label: '加温ハウス栽培', icon: '🔥' },
];

const ANALYSIS_ITEMS = [
  { key: 'landProfile',   label: '土地プロフィール', icon: '📍' },
  { key: 'matchRange',    label: '適合レンジ',       icon: '📊' },
  { key: 'cropRanking',   label: '作物ランキング',   icon: '🏆' },
  { key: 'profitability', label: '収益概算',         icon: '💴' },
  { key: 'fertilizer',   label: '施肥概算',         icon: '🧪' },
  { key: 'risk',          label: 'リスク・注意点',   icon: '⚠️' },
];

// ─── CROP_DB ヘルパー ───
function getCropsByCategory(category) {
  return (typeof CROP_DB !== 'undefined')
    ? CROP_DB.filter(c => c.category === category)
    : [];
}
function getCropById(id) {
  return (typeof CROP_DB !== 'undefined')
    ? CROP_DB.find(c => c.id === id) || null
    : null;
}

// ─── ウィザード状態 ───
let _awStep       = 0;      // 現在ステップ (0〜3)
let _awArea       = null;   // 選択中エリアデータ
let _awCategory   = null;   // 選択カテゴリ
let _awCropId     = null;   // 選択作物ID
let _awMode       = 'openField'; // 栽培方式
let _awItems      = new Set(['landProfile','matchRange','cropRanking','profitability','fertilizer','risk']); // 全選択がデフォルト

// ─── ダイアログを開く ───
function openAnalysisWizard(area) {
  _awArea     = area;
  _awStep     = 0;
  _awCategory = null;
  _awCropId   = null;
  _awMode     = 'openField';
  _awItems    = new Set(['landProfile','matchRange','cropRanking','profitability','fertilizer','risk']);

  _awRenderStep(0);
  const overlay = document.getElementById('aw-overlay');
  const nameEl  = document.getElementById('aw-area-name');
  if (nameEl) nameEl.textContent = area.name || '';
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
    case 0: _awRenderCategory(); break;
    case 1: _awRenderCrop();     break;
    case 2: _awRenderMode();     break;
    case 3: _awRenderItems();    break;
  }
}

// ─── プログレスバー更新 ───
function _awUpdateProgress(step) {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('awdot-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < step)   dot.classList.add('done');
    if (i === step) dot.classList.add('active');
  }
  const titles = ['カテゴリ選択', '作物選択', '栽培方式', '分析内容'];
  const el = document.getElementById('aw-step-title');
  if (el) el.textContent = titles[step];
}

// ─── Step 0: カテゴリ選択 ───
function _awRenderCategory() {
  const body = document.getElementById('aw-body');
  body.innerHTML = `
    <div class="aw-grid-2">
      ${Object.entries(CATEGORY_LABELS).map(([key, v]) => `
        <button class="aw-card ${_awCategory === key ? 'selected' : ''}"
          onclick="_awSelectCategory('${key}')">
          <span class="aw-card-icon">${v.icon}</span>
          <span class="aw-card-label">${v.label}</span>
        </button>
      `).join('')}
    </div>
  `;
  _awRenderFooter({ back: false, next: !!_awCategory, nextLabel: '次へ →', onNext: () => _awRenderStep(1) });
}

function _awSelectCategory(key) {
  _awCategory = key;
  _awCropId   = null; // カテゴリ変更時は作物リセット
  _awRenderCategory();
}

// ─── Step 1: 作物選択 ───
function _awRenderCrop() {
  const crops = getCropsByCategory(_awCategory);
  const body  = document.getElementById('aw-body');
  body.innerHTML = `
    <div class="aw-crop-list">
      ${crops.map(c => `
        <button class="aw-crop-item ${_awCropId === c.id ? 'selected' : ''}"
          onclick="_awSelectCrop('${c.id}')">
          <span class="aw-crop-name">${c.name}</span>
          ${_awCropId === c.id ? '<span class="aw-crop-check">✓</span>' : ''}
        </button>
      `).join('')}
    </div>
  `;
  _awRenderFooter({
    back: true,     onBack: () => _awRenderStep(0),
    next: !!_awCropId, nextLabel: '次へ →', onNext: () => _awRenderStep(2),
  });
}

function _awSelectCrop(id) {
  _awCropId = id;
  _awRenderCrop();
}

// ─── Step 2: 栽培方式選択 ───
function _awRenderMode() {
  const body = document.getElementById('aw-body');
  body.innerHTML = `
    <div class="aw-grid-1">
      ${CULTIVATION_MODES.map(m => `
        <button class="aw-card aw-card-row ${_awMode === m.value ? 'selected' : ''}"
          onclick="_awSelectMode('${m.value}')">
          <span class="aw-card-icon">${m.icon}</span>
          <span class="aw-card-label">${m.label}</span>
          ${_awMode === m.value ? '<span class="aw-card-check">✓</span>' : ''}
        </button>
      `).join('')}
    </div>
  `;
  _awRenderFooter({
    back: true,  onBack: () => _awRenderStep(1),
    next: true,  nextLabel: '次へ →', onNext: () => _awRenderStep(3),
  });
}

function _awSelectMode(value) {
  _awMode = value;
  _awRenderMode();
}

// ─── Step 3: 分析内容選択 ───
function _awRenderItems() {
  const body = document.getElementById('aw-body');
  body.innerHTML = `
    <div class="aw-items-header">
      <button class="aw-select-all-btn" onclick="_awToggleAll()">すべて選択／解除</button>
    </div>
    <div class="aw-check-list">
      ${ANALYSIS_ITEMS.map(item => `
        <label class="aw-check-item ${_awItems.has(item.key) ? 'checked' : ''}" data-key="${item.key}">
          <input type="checkbox" class="aw-hidden-check" data-key="${item.key}"
            ${_awItems.has(item.key) ? 'checked' : ''}
            onchange="_awToggleItem('${item.key}', this.checked)">
          <span class="aw-check-icon">${item.icon}</span>
          <span class="aw-check-label">${item.label}</span>
          <span class="aw-check-mark">${_awItems.has(item.key) ? '✓' : ''}</span>
        </label>
      `).join('')}
    </div>
  `;
  _awRenderFooter({
    back: true,  onBack: () => _awRenderStep(2),
    next: _awItems.size > 0, nextLabel: '分析実行',
    nextClass: 'aw-btn-run',
    onNext: _awExecute,
  });
}

function _awToggleItem(key, checked) {
  if (checked) _awItems.add(key);
  else         _awItems.delete(key);
  document.querySelectorAll('.aw-check-item').forEach(lbl => {
    const k = lbl.dataset.key;
    if (!k) return;
    lbl.classList.toggle('checked', _awItems.has(k));
    const mark = lbl.querySelector('.aw-check-mark');
    if (mark) mark.textContent = _awItems.has(k) ? '✓' : '';
  });
  const runBtn = document.getElementById('aw-btn-next');
  if (runBtn) runBtn.disabled = _awItems.size === 0;
}

function _awToggleAll() {
  if (_awItems.size === ANALYSIS_ITEMS.length) {
    _awItems.clear();
  } else {
    ANALYSIS_ITEMS.forEach(i => _awItems.add(i.key));
  }
  _awRenderItems(); // 全体再描画
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

// ─── 分析実行 ───
function _awExecute() {
  if (!_awArea) return;

  closeAnalysisWizard();

  const area = _awArea;
  const lp   = area.landProfile  || {};
  const meta = area.meta         || {};

  function _pick(...vals) {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  const lat = _pick(lp.lat, meta.lat, area.lat);

  currentAreaData = {
    lat,
    lng:             _pick(lp.lng,       meta.lng,      area.lng),
    elev:            _pick(lp.elevation, meta.elev,     area.elev),
    // ★ climate を必ず補完（scoreCrop が参照するため必須）
    climate:         (typeof getClimate === 'function' && lat != null)
                       ? getClimate(lat) : null,
    soilType:        _pick(lp.soilType,  meta.soilType, area.soilType) || 'unknown',
    ph:              _pick(lp.ph,        meta.ph,       area.ph),
    slope:           _pick(lp.slope,     meta.slope,    area.slope)    ?? 0,
    areaSqm:         _pick(meta.areaSqm, area.areaSqm)                 || 0,
    areaHa:          _pick(meta.areaHa,  area.areaHa)                  || 0,
    selectedCropId:  _awCropId  || null,
    cultivationMode: _awMode    || 'openField',
    analysisItems:   Array.from(_awItems),
    landProfile:     Object.keys(lp).length ? lp : null,
  };

  // ─ 地図にポリゴンを表示 ─
  if (area.geojson && typeof drawnItems !== 'undefined' && typeof map !== 'undefined') {
    try {
      drawnItems.clearLayers();
      // ★ geojsonはFirestoreではJSON文字列で保存されているためパースが必要
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

  // ─ 分析実行 ─
  if (_awCropId) {
    runSingleCropAnalysis(area.name || 'エリア');
  } else {
    runAnalysis(area.name || 'エリア');
  }
}