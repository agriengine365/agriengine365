// ═══════════════════════════════════════════
//  AREA — 自動保存・一覧・削除・選択・インライン編集
// ═══════════════════════════════════════════

// ─── ウィザードからの確定保存 ───
async function commitSaveArea({ name, memo, soilType }) {
  if (!currentPolygon || !currentAreaData) {
    showToast('保存対象のエリアがありません', 'amber');
    return;
  }

  const geojson = currentPolygon.toGeoJSON();

  // Firestore はネスト配列不可 → climate内の配列フィールドを除去してから landProfile を生成
  const cleanedAreaData = { ...currentAreaData };
  if (cleanedAreaData.climate) {
    const { _tMaxArr, _tMinArr, _sunArr, ...safeClimate } = cleanedAreaData.climate;
    cleanedAreaData.climate = safeClimate;
  }
  const landProfile = buildLandProfile({ ...cleanedAreaData, soilType });

  // GeoJSON座標はネスト配列のためFirestore非対応 → 文字列化して保存
  const geojsonStr = JSON.stringify(geojson);

  const payload = {
    name,
    memo,
    geojson: geojsonStr,
    landProfile,
    meta: {
      areaSqm:         currentAreaData.areaSqm,
      areaHa:          currentAreaData.areaHa,
      perimeter:       currentAreaData.perimeter,
      vertexCount:     currentAreaData.vertexCount,
      lat:             currentAreaData.lat,
      lng:             currentAreaData.lng,
      elev:            currentAreaData.elev,
      climateName:     currentAreaData.climate?.name        || null,
      climateTempMean: currentAreaData.climate?.tempMean    ?? null,
      climateRain:     currentAreaData.climate?.rain        ?? null,
      climateSource:   currentAreaData.climate?.source      || 'table',
      // AMeDAS拡張フィールド（取得できた場合のみ）
      amStationNo:     currentAreaData.climate?.stationNo   || null,
      amStationName:   currentAreaData.climate?.stationName || null,
      amDistKm:        currentAreaData.climate?.distKm      ?? null,
      amTempMaxMean:   currentAreaData.climate?.tempMaxMean ?? null,
      amTempMinMean:   currentAreaData.climate?.tempMinMean ?? null,
      amTempMinJan:    currentAreaData.climate?.tempMinJan  ?? null,
      amSunshineHours: currentAreaData.climate?.sunshineHours ?? null,
      amDaysBelow0:    currentAreaData.climate?.daysBelow0  ?? null,
      amRainDays50:    currentAreaData.climate?.rainDays50  ?? null,
      amSnowDays:      currentAreaData.climate?.snowDays    ?? null,
      soilType:        soilType || null,
    },
    createdAt: new Date().toISOString(),
  };

  try {
    if (db) {
      const ref = await db.collection('areas').add(payload);
      currentSavedAreaId = ref.id;
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      payload.id = 'local_' + Date.now();
      stored.push(payload);
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      currentSavedAreaId = payload.id;
    }
    showWizardDone(name);
    loadAreas();
  } catch(e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
  }
}

// ─── 旧 autoSaveArea (互換用・現在は未使用) ───
async function autoSaveArea() {
  // ウィザードフローに移行したため、map.js の CREATED イベントから
  // showWizard() を呼ぶようになっています。
}

// ─── エリア一覧読み込み ───
async function loadAreas() {
  const list = document.getElementById('areas-list');
  list.innerHTML = '<div class="empty"><span class="spinner"></span> 読み込み中...</div>';

  let areas = [];
  try {
    if (db) {
      const snap = await db.collection('areas').orderBy('createdAt', 'desc').get();
      snap.forEach(doc => areas.push({ id: doc.id, ...doc.data() }));
    } else {
      areas = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]').reverse();
    }
  } catch(e) {
    console.error(e);
  }

  document.getElementById('areas-count').textContent = `${areas.length} エリア`;

  if (areas.length === 0) {
    list.innerHTML = '<div class="empty"><div class="icon">🗾</div>保存されたエリアはありません。</div>';
    return;
  }

  list.innerHTML = '';
  areas.forEach(area => renderAreaItem(area, list));
}

// ─── エリアアイテム描画 ───
function renderAreaItem(area, container) {
  const ha  = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
  const div = document.createElement('div');
  div.className = 'area-item';
  div.dataset.id = area.id;
  div.innerHTML = `
    <div class="area-item-header">
      <div class="area-item-name" data-field="name">${escHtml(area.name)}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <button class="pill-btn edit-btn" onclick="event.stopPropagation();toggleInlineEdit('${area.id}')">編集</button>
        <button class="btn btn-danger" onclick="event.stopPropagation();deleteArea('${area.id}')">削除</button>
      </div>
    </div>
    <div class="area-item-meta">
      <span>${ha} ha</span>
      <span>${area.meta?.climateName || '—'}</span>
      <span class="soil-meta">${area.meta?.soilType ? soilLabel(area.meta.soilType) : '土壌未設定'}</span>
    </div>
    ${area.memo ? `<div class="area-memo-display">${escHtml(area.memo)}</div>` : ''}

    <!-- インラインエディット -->
    <div class="inline-edit" id="edit-${area.id}" style="display:none;">
      <div class="field">
        <label>エリア名</label>
        <input type="text" class="ie-name" value="${escHtml(area.name)}" placeholder="エリア名">
      </div>
      <div class="field">
        <label>土壌タイプ</label>
        <div class="soil-grid ie-soil-grid">
          ${['sandy','loam','clay','peat','volcanic','unknown'].map(s => `
            <div class="soil-btn${area.meta?.soilType === s ? ' selected' : ''}" data-soil="${s}" onclick="selectIESoil(this)">${soilLabel(s)}</div>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label>メモ</label>
        <textarea class="ie-memo" placeholder="水はけが悪い、日当たり良好など">${escHtml(area.memo || '')}</textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="saveInlineEdit('${area.id}')">保存</button>
        <button class="btn btn-ghost" style="flex:1;" onclick="toggleInlineEdit('${area.id}')">キャンセル</button>
      </div>
    </div>
  `;
  div.querySelector('.area-item-header').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    selectArea(area);
  });
  container.appendChild(div);
}

// ─── インラインエディット開閉 ───
function toggleInlineEdit(id) {
  const el = document.getElementById('edit-' + id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  const btn = el.closest('.area-item').querySelector('.edit-btn');
  if (btn) btn.textContent = isOpen ? '編集' : '閉じる';
}

// ─── 土壌選択（インラインエディット内）───
function selectIESoil(btn) {
  btn.closest('.ie-soil-grid').querySelectorAll('.soil-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ─── インラインエディット保存 ───
async function saveInlineEdit(id) {
  const el      = document.getElementById('edit-' + id);
  const name    = el.querySelector('.ie-name').value.trim();
  const memo    = el.querySelector('.ie-memo').value.trim();
  const soilBtn = el.querySelector('.soil-btn.selected');
  const soilType = soilBtn ? soilBtn.dataset.soil : null;

  if (!name) { showToast('エリア名を入力してください', 'amber'); return; }

  const update = { name, memo, 'meta.soilType': soilType, 'landProfile.soilType': soilType };

  try {
    if (db && !id.startsWith('local_')) {
      await db.collection('areas').doc(id).update(update);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        stored[idx].name = name;
        stored[idx].memo = memo;
        stored[idx].meta = stored[idx].meta || {};
        stored[idx].meta.soilType = soilType;
        stored[idx].landProfile = stored[idx].landProfile || buildLandProfile(stored[idx].meta || {});
        stored[idx].landProfile.soilType = soilType;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
    showToast('更新しました ✓', 'green');
    loadAreas();
  } catch(e) {
    showToast('更新に失敗しました', 'amber');
    console.error(e);
  }
}

// ─── 削除 ───
async function deleteArea(id) {
  if (!confirm('このエリアを削除しますか？')) return;
  try {
    if (db && !id.startsWith('local_')) {
      await db.collection('areas').doc(id).delete();
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored.filter(a => a.id !== id)));
    }
    showToast('削除しました', 'green');
    loadAreas();
  } catch(e) {
    showToast('削除に失敗しました', 'amber');
  }
}

// ─── エリア選択（分析へ）───
function selectArea(area) {
  drawnItems.clearLayers();
  const geojsonData = typeof area.geojson === 'string' ? JSON.parse(area.geojson) : area.geojson;
  const layer = L.geoJSON(geojsonData, {
    style: { color: CONFIG.DRAW_COLOR, weight: 2, fillOpacity: 0.2 },
  });
  layer.addTo(drawnItems);
  map.fitBounds(layer.getBounds());

  currentAreaData = {
    lat:      area.landProfile?.lat       ?? area.meta?.lat      ?? null,
    lng:      area.landProfile?.lng       ?? area.meta?.lng      ?? null,
    elev:     area.landProfile?.elevation ?? area.meta?.elev     ?? null,
    climate:  getClimate(area.landProfile?.lat ?? area.meta?.lat ?? 35),
    soilType: area.landProfile?.soilType  ?? area.meta?.soilType ?? null,
    ph:       area.landProfile?.ph        ?? null,
    slope:    area.landProfile?.slope     ?? 0,
    areaSqm:  area.meta?.areaSqm          || 0,
    areaHa:   area.meta?.areaHa           || 0,
  };

  // landProfile が未保存 or リスク項目が欠損している場合は buildLandProfile() で補完
  // （AreaCharts のリスクゲージ・サマリーグリッドが参照するため）
  if (!area.landProfile ||
      area.landProfile.floodRisk == null ||
      area.landProfile.droughtRisk == null) {
    area.landProfile = buildLandProfile({
      ...currentAreaData,
      soilType: currentAreaData.soilType,
    });
  }

  // 詳細パネルを開く
  openAreaDetailPanel(area);
}

// ═══════════════════════════════════════════
//  AREA DETAIL PANEL — カレンダー付き詳細パネル
// ═══════════════════════════════════════════

let _adpArea          = null;   // 現在表示中のエリア
let _adpYear          = 0;
let _adpMonth         = 0;
let _adpSelDate       = null;   // 選択中の日付文字列 'YYYY-MM-DD'
let _adpEditId        = null;   // 編集中レコードID
let _adpClimateCache  = null;   // AMeDAS取得済み climate（再オープン用キャッシュ）
let _adpSelectedCropId = null;  // 気温グラフで強調表示中の作物ID

async function openAreaDetailPanel(area) {
  _adpArea    = area;
  const now   = new Date();
  _adpYear    = now.getFullYear();
  _adpMonth   = now.getMonth();
  _adpSelDate = null;
  _adpEditId  = null;

  _adpEnsureView();

  // ── ヘッダー更新 ──
  const ha = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
  document.getElementById('adp-title').textContent = area.name || '無名エリア';
  document.getElementById('adp-meta').textContent  = `${ha} ha　${area.meta?.climateName || ''}`;

  // ── sheet を非表示にしてフルビューを表示 ──
  const sheet = document.getElementById('sheet');
  if (sheet) sheet.style.display = 'none';
  const view = document.getElementById('adp-view');
  view.classList.add('open');

  // ── 最初のサブタブ（気温グラフ）を表示 ──
  _adpSwitchSubTab('chart');

  AreaCharts.render(area);
  _adpRenderCalendar();
  _adpRenderDayRecords();

  // ── ランキング: まずプレースホルダー ──
  const rankEl = document.getElementById('crop-ranking');

  // 同一エリアのキャッシュがあれば即描画
  const areaKey = area.id || area.name;
  if (_adpClimateCache && _adpClimateCache._areaKey === areaKey) {
    currentAreaData.climate = _adpClimateCache;
    _adpRenderRanking(area);
    _adpRenderTempChart();
    return;
  }

  if (rankEl) rankEl.innerHTML = '<div class="empty-mini"><span class="spinner"></span> 気候データ取得中...</div>';

  // AMeDAS月別データを取得してcurrentAreaDataにマージ
  const lat = area.landProfile?.lat ?? area.meta?.lat ?? null;
  const lng = area.landProfile?.lng ?? area.meta?.lng ?? null;
  if (lat !== null && lng !== null && typeof AmedasLoader !== 'undefined') {
    try {
      const climateData = await AmedasLoader.getClimateAt(lat, lng);
      const res = await fetch(`data/monthly/${climateData.stationNo}.json`);
      if (res.ok) {
        const monthly = await res.json();
        const MK = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const tMaxArr = MK.map(m => {
          const e = monthly['temp_mean']?.data?.[m];
          return (e && e.q !== 0) ? Math.round(e.v / 10 * 10) / 10 : null;
        });
        const tMinArr = MK.map(m => {
          const e = monthly['temp_min_mean']?.data?.[m];
          return (e && e.q !== 0) ? Math.round(e.v / 10 * 10) / 10 : null;
        });
        const merged = {
          ...(currentAreaData.climate || {}),
          ...climateData,
          _tMaxArr: tMaxArr.some(v => v !== null) ? tMaxArr : null,
          _tMinArr: tMinArr.some(v => v !== null) ? tMinArr : null,
          _areaKey: areaKey,
        };
        currentAreaData.climate = merged;
        _adpClimateCache = merged;
      }
    } catch(e) {
      console.warn('[ADP] AMeDAS取得失敗（ランキングは年均気温で評価）:', e);
    }
  }

  _adpRenderRanking(area);
  _adpRenderTempChart();
}



// ─── フルスクリーンビューを初回だけ生成 ───
function _adpEnsureView() {
  if (document.getElementById('adp-view')) return;

  const view = document.createElement('div');
  view.id        = 'adp-view';
  view.className = 'adp-view';
  view.innerHTML = `
    <!-- ヘッダー -->
    <div class="adp-view-header">
      <button class="adp-back-btn" onclick="closeAreaDetailPanel()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        戻る
      </button>
      <div class="adp-view-title-wrap">
        <div class="adp-title" id="adp-title"></div>
        <div class="adp-meta"  id="adp-meta"></div>
      </div>
      <button class="btn btn-primary adp-analyze-btn"
        onclick="if(_adpArea){openAnalysisWizard(_adpArea);}">分析 →</button>
    </div>

    <!-- サブタブバー（2タブ） -->
    <div class="adp-subtabs">
      <button class="adp-subtab active" data-subtab="chart"    onclick="_adpSwitchSubTab('chart')">🌡️ 気温適性</button>
      <button class="adp-subtab"        data-subtab="calendar" onclick="_adpSwitchSubTab('calendar')">📅 カレンダー</button>
    </div>

    <!-- コンテンツ領域 -->
    <div class="adp-view-body">

      <!-- ペイン: 気温適性（グラフ固定上部 ＋ ランキングリスト下部） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-chart">

        <!-- ▼ 上部固定: グラフブロック -->
        <div class="adp-chart-sticky">
          <div class="adp-temp-chart-header">
            <span class="adp-temp-chart-sub" id="adp-temp-chart-sub">作物を選択すると適正温度を重畳表示</span>
          </div>
          <div class="adp-temp-chart-wrap">
            <canvas id="adp-temp-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-temp-legend"></div>
        </div>

        <!-- ▼ 下部スクロール: 栽培方式トグル ＋ タブ ＋ ランキングリスト -->
        <div class="adp-ranking-scroll">
          <!-- 栽培方式トグル（_adpEnsureCultivationToggle が挿入） -->
          <div class="cr-tabs-major" id="cr-tabs-major">
            <button class="cr-tab-major active" data-major="all"       onclick="crSwitchMajor('all')">すべて</button>
            <button class="cr-tab-major"        data-major="grain"     onclick="crSwitchMajor('grain')">穀物・豆類</button>
            <button class="cr-tab-major"        data-major="vegetable" onclick="crSwitchMajor('vegetable')">野菜</button>
            <button class="cr-tab-major"        data-major="fruit"     onclick="crSwitchMajor('fruit')">果物</button>
            <button class="cr-tab-major"        data-major="wild"      onclick="crSwitchMajor('wild')">山菜・草</button>
            <button class="cr-tab-major"        data-major="forest"    onclick="crSwitchMajor('forest')">林産</button>
          </div>
          <div class="cr-tabs-minor" id="cr-tabs-minor" style="display:none;"></div>
          <div id="crop-ranking"><div class="empty-mini">計算中...</div></div>
        </div>

      </div>

      <!-- ペイン: カレンダー -->
      <div class="adp-pane" id="adp-pane-calendar" style="display:none;">
        <div id="adp-calendar-wrap"></div>
        <div id="adp-day-records-wrap"></div>
      </div>

    </div>

    <!-- areaCharts用（非表示） -->
    <div id="adp-charts-wrap" style="display:none;"></div>
  `;
  document.body.appendChild(view);
}

// ─── サブタブ切替（2タブ構成） ───
function _adpSwitchSubTab(name) {
  // タブボタン
  document.querySelectorAll('.adp-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  // ペイン（chart / calendar の2つ）
  ['chart', 'calendar'].forEach(p => {
    const el = document.getElementById('adp-pane-' + p);
    if (el) el.style.display = (p === name) ? 'flex' : 'none';
  });
  // グラフペインを表示したときに再描画（offsetWidth が 0→正常になるため）
  if (name === 'chart') {
    setTimeout(() => _adpRenderTempChart(_adpSelectedCropId), 30);
  }
}

// ─── カレンダー描画 ───
function _adpRenderCalendar() {
  const wrap = document.getElementById('adp-calendar-wrap');
  if (!wrap) return;

  const areaId  = _adpArea?.id;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  // このエリアの記録を日付ごとにまとめる
  const byDate  = {};
  records.forEach(r => {
    if (r.areaId !== areaId) return;
    const d = r.shipDate || r.harvestDate || r.createdAt?.slice(0, 10);
    if (!d) return;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  });

  const y = _adpYear, m = _adpMonth;
  const monthLabel = `${y}年 ${m + 1}月`;
  const firstDay   = new Date(y, m, 1).getDay();  // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // DOW header
  const dows = ['日','月','火','水','木','金','土'];
  const dowHTML = dows.map(d => `<div class="adp-cal-dow">${d}</div>`).join('');

  // cells
  let cellsHTML = '';
  // 空セル
  for (let i = 0; i < firstDay; i++) {
    cellsHTML += `<div class="adp-cal-day empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const recs    = byDate[dateStr] || [];
    const isToday = dateStr === todayStr;
    const isSel   = dateStr === _adpSelDate;
    let cls = 'adp-cal-day';
    if (isToday)     cls += ' today';
    if (isSel)       cls += ' selected';
    if (recs.length) cls += ' has-record';

    // ドット（最大3個）
    const dots = recs.slice(0, 3).map(() => `<div class="adp-cal-dot"></div>`).join('');
    const dotsHTML = recs.length ? `<div class="adp-cal-dots">${dots}</div>` : `<div class="adp-cal-dots"></div>`;

    cellsHTML += `
      <div class="${cls}" onclick="_adpSelectDate('${dateStr}')">
        <div class="adp-cal-day-num">${d}</div>
        ${dotsHTML}
      </div>`;
  }

  wrap.innerHTML = `
    <div class="adp-cal-nav">
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(-1)">‹</button>
      <span class="adp-cal-month-label">${monthLabel}</span>
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(1)">›</button>
    </div>
    <div class="adp-cal-grid">
      ${dowHTML}
      ${cellsHTML}
    </div>
  `;
}

function _adpChangeMonth(delta) {
  _adpMonth += delta;
  if (_adpMonth < 0)  { _adpYear--;  _adpMonth = 11; }
  if (_adpMonth > 11) { _adpYear++;  _adpMonth = 0;  }
  _adpSelDate = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

function _adpSelectDate(dateStr) {
  _adpSelDate = (_adpSelDate === dateStr) ? null : dateStr;
  _adpEditId  = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 選択日記録リスト ───
function _adpRenderDayRecords() {
  const wrap = document.getElementById('adp-day-records-wrap');
  if (!wrap) return;

  if (!_adpSelDate) {
    wrap.innerHTML = '';
    return;
  }

  const areaId  = _adpArea?.id;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  const dayRecs = records.filter(r => {
    if (r.areaId !== areaId) return false;
    const d = r.shipDate || r.harvestDate || r.createdAt?.slice(0, 10);
    return d === _adpSelDate;
  });

  const label = `${parseInt(_adpSelDate.slice(5,7))}月${parseInt(_adpSelDate.slice(8,10))}日の記録`;

  if (!dayRecs.length) {
    wrap.innerHTML = `
      <div class="adp-day-records">
        <div class="adp-day-records-title">${label}</div>
        <div class="empty" style="padding:16px 0;font-size:12px;">この日の記録はありません</div>
      </div>`;
    return;
  }

  const cardsHTML = dayRecs.map(r => {
    const item = r.productName || r.item || '—';
    const dest = r.shippingTypeLabel || r.shippingType || '—';
    const isEditing = r.id === _adpEditId;
    return `
      <div class="adp-rec-card" id="adp-rec-${r.id}">
        <div class="adp-rec-card-top">
          <span class="adp-rec-dest">${escHtml(dest)}</span>
        </div>
        <div class="adp-rec-item">${escHtml(item)}</div>
        <div class="adp-rec-actions">
          <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;"
            onclick="_adpToggleEdit('${r.id}')">
            ${isEditing ? '閉じる' : '編集'}
          </button>
          <button class="btn btn-danger" style="font-size:11px;padding:5px 10px;"
            onclick="_adpDeleteRecord('${r.id}')">削除</button>
        </div>
        ${isEditing ? _adpEditPanelHTML(r) : ''}
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="adp-day-records">
      <div class="adp-day-records-title">${label}</div>
      ${cardsHTML}
    </div>`;
}

// ─── 編集パネル HTML ───
function _adpEditPanelHTML(record) {
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};
  const typeGrid = Object.entries(SHIPPING_TYPES_REF).map(([key, def]) => {
    const isSel = key === record.shippingType;
    return `<div class="adp-type-btn${isSel ? ' selected' : ''}"
      data-type="${key}"
      onclick="_adpSelectEditType(this, '${record.id}')">
      ${def.icon} ${def.label}
    </div>`;
  }).join('');

  return `
    <div class="adp-edit-panel" id="adp-edit-panel-${record.id}">
      <div class="adp-edit-title">出荷先タイプを変更</div>
      <div class="adp-type-grid">${typeGrid}</div>
      <div class="adp-edit-form-wrap" id="adp-edit-form-wrap-${record.id}">
        ${_adpBuildEditForm(record, record.shippingType)}
      </div>
      <div class="adp-edit-actions">
        <button class="btn btn-ghost" onclick="_adpToggleEdit('${record.id}')">キャンセル</button>
        <button class="btn btn-primary" onclick="_adpSaveEdit('${record.id}')">保存する</button>
      </div>
    </div>`;
}

// ─── 編集フォーム HTML（既存値埋め込み）───
function _adpBuildEditForm(record, type) {
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};
  const def = SHIPPING_TYPES_REF[type];
  if (!def) return '';

  const fieldsHTML = def.sections.flatMap(s => s.fields).map(f => {
    const val = record[f.id] || '';
    let input = '';
    if (f.type === 'select') {
      const opts = (f.options || []).map(o =>
        `<option value="${o}"${val === o ? ' selected' : ''}>${o}</option>`).join('');
      input = `<select class="rec-input" name="${f.id}"><option value="">—</option>${opts}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="rec-input rec-textarea" name="${f.id}" placeholder="${f.placeholder || ''}">${escHtml(val)}</textarea>`;
    } else {
      const unit = f.unit ? `<span class="rec-unit">${f.unit}</span>` : '';
      const wrap = f.unit ? `<div class="rec-input-with-unit">` : '';
      const wEnd = f.unit ? `</div>` : '';
      input = `${wrap}<input class="rec-input" type="${f.type}" name="${f.id}" placeholder="${f.placeholder || ''}" value="${escHtml(val)}">${unit}${wEnd}`;
    }
    return `<div class="rec-field"><label class="rec-label">${f.label}</label>${input}</div>`;
  }).join('');

  return `<div class="rec-section"><div class="rec-section-title-plain">${def.label}</div>${fieldsHTML}</div>`;
}

// ─── タイプ選択時フォーム更新 ───
function _adpSelectEditType(btn, recordId) {
  const panel = document.getElementById(`adp-edit-panel-${recordId}`);
  if (!panel) return;
  panel.querySelectorAll('.adp-type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const type = btn.dataset.type;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  const record  = records.find(r => r.id === recordId);
  if (!record) return;

  const formWrap = document.getElementById(`adp-edit-form-wrap-${recordId}`);
  if (formWrap) formWrap.innerHTML = _adpBuildEditForm(record, type);
}

// ─── 編集パネル開閉 ───
function _adpToggleEdit(id) {
  _adpEditId = (_adpEditId === id) ? null : id;
  _adpRenderDayRecords();
  // 編集パネルが開いたらスクロール
  if (_adpEditId) {
    setTimeout(() => {
      const el = document.getElementById(`adp-rec-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// ─── 保存 ───
function _adpSaveEdit(id) {
  const panel = document.getElementById(`adp-edit-panel-${id}`);
  if (!panel) return;

  const typeBtn  = panel.querySelector('.adp-type-btn.selected');
  const newType  = typeBtn ? typeBtn.dataset.type : null;
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};

  const inputs = panel.querySelectorAll('[name]');
  const newData = {};
  inputs.forEach(el => { if (el.value.trim()) newData[el.name] = el.value.trim(); });

  if (newType) {
    newData.shippingType      = newType;
    newData.shippingTypeLabel = SHIPPING_TYPES_REF[newType]?.label || newType;
  }

  if (typeof recordsUpdate === 'function') {
    recordsUpdate(id, newData);
    showToast('記録を更新しました ✓', 'green');
  }

  _adpEditId = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 削除 ───
function _adpDeleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  if (typeof recordsDelete === 'function') recordsDelete(id);
  showToast('記録を削除しました', 'green');
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 土壌ラベル変換 ───
function soilLabel(key) {
  const map = { sandy:'砂質土', loam:'壌土', clay:'粘土質', peat:'泥炭土', volcanic:'火山灰土', unknown:'不明' };
  return map[key] || key;
}

// ═══════════════════════════════════════════
//  ADP RANKING — エリア詳細パネル内ランキング
// ═══════════════════════════════════════════

// ─── ランキング描画（エリア詳細パネルを開いた時に呼ぶ）───
function _adpRenderRanking(area) {
  const el = document.getElementById('crop-ranking');
  if (!el) return;

  if (typeof buildAnalysisResult !== 'function' || !currentAreaData) {
    el.innerHTML = '<div class="empty-mini">データ不足のためランキングを表示できません</div>';
    return;
  }

  // 栽培方式トグルを描画（初回のみ）
  _adpEnsureCultivationToggle();

  const result = buildAnalysisResult(currentAreaData);

  // analysis.js のランキング状態を更新
  _crScores         = result.cropScores;
  _crProfile        = result.landProfile;
  _crMajor          = 'all';
  _crMinor          = null;
  _crSelectedCropId = null;

  // 大タブをリセット
  document.querySelectorAll('.cr-tab-major').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.major === 'all');
  });
  _crRenderMinorTabs();
  _adpRenderRankingList();
}

// ─── 栽培方式トグル（ランキング上部、初回だけ生成）───
function _adpEnsureCultivationToggle() {
  if (document.getElementById('adp-cultivation-toggle')) return;

  // ランキングペインの先頭に挿入
  const rankPane = document.getElementById('adp-ranking-scroll');
  if (!rankPane) return;

  const modes = [
    { id: 'openField',        label: '露地' },
    { id: 'greenhouse',       label: 'ハウス' },
    { id: 'heatedGreenhouse', label: '加温ハウス' },
  ];

  const current = currentAreaData?.cultivationMode || 'openField';

  const wrap = document.createElement('div');
  wrap.id        = 'adp-cultivation-toggle';
  wrap.className = 'adp-cult-toggle';
  wrap.innerHTML = modes.map(m => `
    <button class="adp-cult-btn${m.id === current ? ' active' : ''}"
      data-mode="${m.id}"
      onclick="_adpSwitchCultivation('${m.id}')">
      ${m.label}
    </button>
  `).join('');

  // adp-ranking-scrollの先頭（cr-tabs-majorより前）に挿入
  rankPane.insertBefore(wrap, rankPane.firstChild);
}

// ─── 栽培方式切替 ───
function _adpSwitchCultivation(mode) {
  if (!currentAreaData) return;
  currentAreaData.cultivationMode = mode;

  // トグルUI更新
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // スコア再計算 → リスト再描画 → グラフ再描画
  const result = buildAnalysisResult(currentAreaData);
  _crScores = result.cropScores;
  _adpRenderRankingList();
  _adpRenderTempChart(_adpSelectedCropId);
}

// ─── ADP専用ランキングリスト描画 ───
function _adpRenderRankingList() {
  const el = document.getElementById('crop-ranking');
  if (!el) return;

  const scores = _crFilteredScores();

  if (!scores.length) {
    el.innerHTML = '<div class="empty-mini">該当作物なし</div>';
    return;
  }

  el.innerHTML = scores.slice(0, 20).map((s, i) => {
    const scoreCls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
    const isSelected = s.crop.id === _adpSelectedCropId;
    return `
      <div class="cr-item${isSelected ? ' cr-item-open' : ''}"
        onclick="adpCropTap('${s.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}</span>
          <span class="cr-name">${escHtml(s.crop.name)}</span>
          <span class="cr-score ${scoreCls}">${s.score}%</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${scoreCls}" style="width:${s.score}%"></div>
        </div>
        ${s.alert ? `<div class="cr-alert">${escHtml(s.alert)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ─── 気温折れ線グラフ描画 ───
// ランキング上部に常時表示。cropId指定時は適正温度帯を重畳。
function _adpRenderTempChart(cropId) {
  const canvas = document.getElementById('adp-temp-canvas');
  if (!canvas) return;

  const tMaxArr = currentAreaData?.climate?._tMaxArr;
  const tMinArr = currentAreaData?.climate?._tMinArr;

  const ctx    = canvas.getContext('2d');
  const W      = canvas.offsetWidth  || 320;
  const H      = canvas.offsetHeight || 160;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 14, right: 12, bottom: 28, left: 32 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;

  const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

  // ── データがない場合はメッセージだけ ──
  if (!tMaxArr || !tMinArr) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('月別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    document.getElementById('adp-temp-legend').innerHTML = '';
    document.getElementById('adp-temp-chart-sub').textContent = '気候データ未取得';
    return;
  }

  // ── 作物データ取得 ──
  let crop = null;
  if (cropId && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
         : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  }
  if (!crop && cropId && typeof _crScores !== 'undefined') {
    const hit = _crScores.find(s => s.crop.id === cropId);
    if (hit) crop = hit.crop;
  }

  // ── Y軸範囲決定 ──
  const allTemps = [...tMaxArr, ...tMinArr].filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const rawMin = Math.min(...allTemps);
  const rawMax = Math.max(...allTemps);
  const yMin   = Math.floor((rawMin - 2) / 5) * 5;
  const yMax   = Math.ceil ((rawMax + 2) / 5) * 5;
  const yRange = yMax - yMin || 1;

  const toX = i  => PAD.left + (i / 11) * gW;
  const toY = v  => PAD.top  + (1 - (v - yMin) / yRange) * gH;

  // ── 横グリッド線（極薄）& Y軸ラベル ──
  const ySteps = Math.round(yRange / 5);
  for (let s = 0; s <= ySteps; s++) {
    const val = yMin + s * 5;
    const y   = toY(val);
    ctx.strokeStyle = 'rgba(42,61,44,0.10)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + gW, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90,122,92,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val + '°', PAD.left - 4, y + 3);
  }

  // ── 縦グリッド線（月ごと、薄め）──
  for (let i = 0; i < 12; i++) {
    const x = toX(i);
    ctx.strokeStyle = 'rgba(42,61,44,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + gH);
    ctx.stroke();
  }

  // ── 0℃ラインを強調 ──
  if (yMin < 0 && yMax > 0) {
    const y0 = toY(0);
    ctx.strokeStyle = 'rgba(248,113,113,0.35)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y0);
    ctx.lineTo(PAD.left + gW, y0);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 栽培方式・適正温度帯の計算 ──
  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  const isHouse = cultivationMode === 'greenhouse' || cultivationMode === 'heatedGreenhouse';
  // ハウス補正値: greenhouse→+4, heatedGreenhouse→+8（冬の加温想定）
  const houseOffset = cultivationMode === 'heatedGreenhouse' ? 8 : 4;
  const tMinCorrected = isHouse ? tMinArr.map(v => v !== null ? v + houseOffset : null) : null;

  // ── 作物適正温度帯（帯シェーディング + 境界線）──
  if (crop && crop.conditions.tempMeanMin != null && crop.conditions.tempMeanMax != null) {
    const tCropMin = crop.conditions.tempMeanMin;
    const tCropMax = crop.conditions.tempMeanMax;

    // 生育月を取得
    const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const growthSet = new Set();
    ['manage','harvest'].forEach(phase => {
      if (!Array.isArray(crop.calendar?.[phase])) return;
      crop.calendar[phase].forEach(mk => {
        const idx = monthKeys.indexOf(mk);
        if (idx >= 0) growthSet.add(idx);
      });
    });
    const growthMonths = growthSet.size > 0 ? [...growthSet].sort((a,b)=>a-b) : null;

    // ── 適正温度帯の基本シェード（濃めに）──
    const yTop = toY(tCropMax);
    const yBot = toY(tCropMin);
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, 'rgba(74,222,128,0.38)');
    grad.addColorStop(1, 'rgba(74,222,128,0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);

    // 境界線 (tempMeanMin / tempMeanMax)
    ctx.strokeStyle = 'rgba(74,222,128,0.75)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 3]);
    [tCropMin, tCropMax].forEach(v => {
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + gW, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  // ── 最高気温と最低気温の面塗り（fill between） ──
  const validIdx = tMaxArr.map((v, i) => (v !== null && tMinArr[i] !== null ? i : -1)).filter(i => i >= 0);
  if (validIdx.length > 1) {
    ctx.beginPath();
    validIdx.forEach((i, k) => {
      const x = toX(i), y = toY(tMaxArr[i]);
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    [...validIdx].reverse().forEach(i => {
      ctx.lineTo(toX(i), toY(tMinArr[i]));
    });
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + gH);
    fillGrad.addColorStop(0, 'rgba(251,191,36,0.12)');
    fillGrad.addColorStop(1, 'rgba(56,189,248,0.12)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  // ── 折れ線（最高・最低） ──
  const drawLine = (arr, color, dash = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.setLineDash(dash);
    ctx.beginPath();
    let moved = false;
    arr.forEach((v, i) => {
      if (v === null) { moved = false; return; }
      if (!moved) { ctx.moveTo(toX(i), toY(v)); moved = true; }
      else        { ctx.lineTo(toX(i), toY(v)); }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawLine(tMaxArr, '#fbbf24');       // 最高: 黄
  drawLine(tMinArr, '#38bdf8', []);   // 最低: 水色

  // ハウスモード時: 補正後気温（+offset）を実線で追加表示
  if (isHouse) {
    drawLine(tMinCorrected, '#34d399', [4, 3]); // ハウス補正後: 緑破線
  }

  // ── 月ラベル & 目盛り点 ──
  ctx.fillStyle  = 'rgba(90,122,92,0.8)';
  ctx.font       = '9px DM Mono, monospace';
  ctx.textAlign  = 'center';
  MONTHS.forEach((label, i) => {
    const x = toX(i);
    ctx.fillText(label, x, H - PAD.bottom + 11);
    // 最高気温の点
    if (tMaxArr[i] !== null) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, toY(tMaxArr[i]), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // 最低気温の点
    if (tMinArr[i] !== null) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, toY(tMinArr[i]), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
  });

  // ── 凡例更新 ──
  const subEl    = document.getElementById('adp-temp-chart-sub');
  const legendEl = document.getElementById('adp-temp-legend');
  if (crop) {
    if (subEl) subEl.textContent = `${crop.name} の適正温度帯を表示中`;
    const tMin = crop.conditions.tempMeanMin ?? '—';
    const tMax = crop.conditions.tempMeanMax ?? '—';
    const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const growthLabels = ['manage','harvest'].flatMap(ph =>
      Array.isArray(crop.calendar?.[ph]) ? crop.calendar[ph].map(mk => {
        const idx = monthKeys.indexOf(mk);
        return idx >= 0 ? (idx + 1) + '月' : mk;
      }) : []
    );
    const uniqMonths = [...new Set(growthLabels)].sort((a,b) => parseInt(a)-parseInt(b));
    const _mode = currentAreaData?.cultivationMode || 'openField';
    const _offset = _mode === 'heatedGreenhouse' ? 8 : 4;
    const houseNote = (_mode === 'greenhouse' || _mode === 'heatedGreenhouse')
      ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399;border:1px dashed #34d399"></span>最低気温(ハウス+${_offset}℃補正)</span>`
      : '';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>最高気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#38bdf8"></span>最低気温</span>
      ${houseNote}
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.5)"></span>適正温度 ${tMin}–${tMax}℃</span>
      ${uniqMonths.length ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.4)"></span>生育期間 ${uniqMonths.join('/')}</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択すると適正温度を重畳表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>月別最高気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#38bdf8"></span>月別最低気温</span>
    `;
  }
}

// ─── _crRenderList をADPビュー開中に差し替え ───
// analysis.js の crSwitchMajor / crSwitchMinor が _crRenderList() を呼ぶ。
// ADPビューが開いている間はADP専用描画に委譲する。
const _orig_crRenderList = (typeof _crRenderList === 'function') ? _crRenderList : null;
window._crRenderList = function() {
  if (document.getElementById('adp-view')?.classList.contains('open')) {
    _adpRenderRankingList();
  } else if (_orig_crRenderList) {
    _orig_crRenderList();
  }
};

// ─── フルビューを閉じてsheetに戻る ───
function closeAreaDetailPanel() {
  const view = document.getElementById('adp-view');
  if (view) view.classList.remove('open');

  // sheet を復帰
  const sheet = document.getElementById('sheet');
  if (sheet) sheet.style.display = '';

  // エリア一覧タブをアクティブに戻す
  if (typeof switchTab === 'function') switchTab('areas');

  // 栽培方式トグルを削除（次回オープン時に再生成）
  const toggle = document.getElementById('adp-cultivation-toggle');
  if (toggle) toggle.remove();

  // 作物選択状態・canvasをリセット
  _adpSelectedCropId = null;
  const canvas = document.getElementById('adp-temp-canvas');
  if (canvas) { canvas.width = 0; canvas.height = 0; }
}

// ─── 作物タップ → グラフ即更新（ペイン切替なし・同一ペイン内） ───
function adpCropTap(cropId) {
  if (!_adpArea) return;

  // 同じ作物を再タップしたら選択解除（トグル）
  _adpSelectedCropId = (_adpSelectedCropId === cropId) ? null : cropId;

  // グラフ再描画 ＋ リストハイライト更新（ペイン移動なし）
  _adpRenderTempChart(_adpSelectedCropId);
  _adpRenderRankingList();
}