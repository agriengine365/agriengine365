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

let _adpArea     = null;   // 現在表示中のエリア
let _adpYear     = 0;
let _adpMonth    = 0;
let _adpSelDate  = null;   // 選択中の日付文字列 'YYYY-MM-DD'
let _adpEditId   = null;   // 編集中レコードID

async function openAreaDetailPanel(area) {
  _adpArea    = area;
  const now   = new Date();
  _adpYear    = now.getFullYear();
  _adpMonth   = now.getMonth();
  _adpSelDate = null;
  _adpEditId  = null;

  _adpEnsureDOM();

  const panel   = document.getElementById('adp-panel');
  const overlay = document.getElementById('adp-overlay');
  const title   = document.getElementById('adp-title');
  const meta    = document.getElementById('adp-meta');

  const ha = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
  title.textContent = area.name || '無名エリア';
  meta.textContent  = `${ha} ha　${area.meta?.climateName || ''}`;

  overlay.classList.add('open');
  panel.classList.add('open');

  AreaCharts.render(area);
  _adpRenderCalendar();
  _adpRenderDayRecords();

  // ランキング: まずプレースホルダー表示
  const rankEl = document.getElementById('crop-ranking');
  if (rankEl) rankEl.innerHTML = '<div class="empty-mini"><span class="spinner"></span> 気候データ取得中...</div>';

  // AMeDAS月別データを取得してcurrentAreaDataにマージ
  const lat = area.landProfile?.lat ?? area.meta?.lat ?? null;
  const lng = area.landProfile?.lng ?? area.meta?.lng ?? null;
  if (lat !== null && lng !== null && typeof AmedasLoader !== 'undefined') {
    try {
      const climateData = await AmedasLoader.getClimateAt(lat, lng);
      // _tMaxArr / _tMinArr を月別JSONから再構築
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
        currentAreaData.climate = {
          ...(currentAreaData.climate || {}),
          ...climateData,
          _tMaxArr: tMaxArr.some(v => v !== null) ? tMaxArr : null,
          _tMinArr: tMinArr.some(v => v !== null) ? tMinArr : null,
        };
      }
    } catch(e) {
      console.warn('[ADP] AMeDAS取得失敗（ランキングは年均気温で評価）:', e);
    }
  }

  _adpRenderRanking(area);
}



// ─── DOM を初回だけ生成 ───
function _adpEnsureDOM() {
  if (document.getElementById('adp-panel')) return;

  // overlay
  const ov = document.createElement('div');
  ov.className = 'area-detail-overlay';
  ov.id = 'adp-overlay';
  ov.addEventListener('click', closeAreaDetailPanel);
  document.body.appendChild(ov);

  // panel
  const panel = document.createElement('div');
  panel.className = 'area-detail-panel';
  panel.id = 'adp-panel';
  panel.innerHTML = `
    <div class="adp-handle-area"><div class="adp-handle"></div></div>
    <div class="adp-header">
      <div>
        <div class="adp-title" id="adp-title"></div>
        <div class="adp-meta"  id="adp-meta"></div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;"
          onclick="if(_adpArea){openAnalysisWizard(_adpArea);}">分析 →</button>
        <button class="adp-close-btn" onclick="closeAreaDetailPanel()">✕</button>
      </div>
    </div>
    <div class="adp-body" id="adp-body">

      <!-- ─── カレンダー（アコーディオン）─── -->
      <div class="card accordion" id="adp-calendar-accordion">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <div class="card-title" style="margin:0">📅 作業カレンダー</div>
          <svg class="acc-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="accordion-body">
          <div id="adp-calendar-wrap"></div>
          <div id="adp-day-records-wrap"></div>
        </div>
      </div>

      <!-- ─── 適正作物ランキング（アコーディオン）─── -->
      <div class="card accordion" id="adp-ranking-accordion">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <div class="card-title" style="margin:0">🏆 適正作物ランキング</div>
          <svg class="acc-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="accordion-body">
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

      <div id="adp-charts-wrap"></div>
    </div>
  `;
  document.body.appendChild(panel);
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

  const accordion = document.getElementById('adp-ranking-accordion');
  if (!accordion) return;

  const body = accordion.querySelector('.accordion-body');
  if (!body) return;

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

  // accordion-body の先頭に挿入（タブより前）
  body.insertBefore(wrap, body.firstChild);
}

// ─── 栽培方式切替 ───
function _adpSwitchCultivation(mode) {
  if (!currentAreaData) return;
  currentAreaData.cultivationMode = mode;

  // トグルUI更新
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // スコア再計算 → リスト再描画
  const result = buildAnalysisResult(currentAreaData);
  _crScores = result.cropScores;
  _adpRenderRankingList();
}

// ─── ADP専用ランキングリスト描画 ───
// crSwitchMajor/Minor から呼ばれる _crRenderList を
// ADPパネルが開いている間だけこちらに切り替える
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
    const barClass = s.viable ? scoreCls : 'score-low';
    const barWidth = s.viable ? s.score : 0;
    const monthBar = s.monthlyMatch ? _adpBuildMonthBar(s.monthlyMatch) : '';
    return `
      <div class="cr-item ${s.viable ? '' : 'cr-item-ng'}"
        onclick="adpCropTap('${s.crop.id}', '${escHtml(s.crop.name)}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}</span>
          <span class="cr-name">${escHtml(s.crop.name)}</span>
          <span class="cr-score ${s.viable ? scoreCls : 'score-low'}">${s.viable ? s.score + '%' : 'NG'}</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${barClass}" style="width:${barWidth}%"></div>
        </div>
        ${s.alert ? `<div class="cr-alert">${escHtml(s.alert)}</div>` : ''}
        ${monthBar}
      </div>
    `;
  }).join('');
}

// ─── 月別カラーバー HTML生成 ───
// monthlyMatch: 12要素配列
//   null              = 非生育月
//   true              = 適合
//   'border'          = 境界
//   false             = 不適合
//   { heated, diff }  = 加温ハウスで補填中
function _adpBuildMonthBar(monthlyMatch) {
  if (!monthlyMatch || monthlyMatch.every(v => v === null)) return '';
  const labels = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  const cells = monthlyMatch.map((v, i) => {
    let cls, title;
    if (v === null) {
      cls = 'mmb-none';
      title = `${i+1}月: 非生育月`;
    } else if (v === true) {
      cls = 'mmb-ok';
      title = `${i+1}月: 適合`;
    } else if (v === 'border') {
      cls = 'mmb-border';
      title = `${i+1}月: 境界`;
    } else if (v === false) {
      cls = 'mmb-ng';
      title = `${i+1}月: 不適合`;
    } else if (v?.heated) {
      // 加温ハウス: diffに応じて色を変化
      if (v.diff === 0) {
        cls = 'mmb-ok';
        title = `${i+1}月: 適合（加温不要）`;
      } else if (v.diff <= 5) {
        cls = 'mmb-heated-low';
        title = `${i+1}月: 加温 ${v.diff}℃補填`;
      } else if (v.diff <= 10) {
        cls = 'mmb-heated-mid';
        title = `${i+1}月: 加温 ${v.diff}℃補填`;
      } else {
        cls = 'mmb-heated-high';
        title = `${i+1}月: 加温 ${v.diff}℃補填（高コスト）`;
      }
    } else {
      cls = 'mmb-none';
      title = `${i+1}月`;
    }
    return `<div class="mmb-cell ${cls}" title="${title}"><span class="mmb-label">${labels[i]}</span></div>`;
  }).join('');
  return `<div class="month-match-bar">${cells}</div>`;
}

// ─── _crRenderList をADPパネル開中に差し替え ───
// analysis.js の crSwitchMajor / crSwitchMinor が _crRenderList() を呼ぶ。
// ADPパネルが開いている間はADP専用描画に委譲する。
const _orig_crRenderList = (typeof _crRenderList === 'function') ? _crRenderList : null;
window._crRenderList = function() {
  if (document.getElementById('adp-panel')?.classList.contains('open')) {
    _adpRenderRankingList();
  } else if (_orig_crRenderList) {
    _orig_crRenderList();
  }
};

// ─── パネルを閉じたとき栽培方式トグルをリセット ───
function closeAreaDetailPanel() {
  const panel   = document.getElementById('adp-panel');
  const overlay = document.getElementById('adp-overlay');
  if (!panel) return;
  panel.classList.remove('open');
  overlay.classList.remove('open');
  // トグルを削除（次回パネル開時に再生成）
  const toggle = document.getElementById('adp-cultivation-toggle');
  if (toggle) toggle.remove();
}

// ─── 作物タップ → 確認 → 分析実行 ───
function adpCropTap(cropId, cropName) {
  if (!_adpArea) return;
  const areaName = _adpArea.name || 'このエリア';
  if (!confirm(`「${cropName}」を「${areaName}」で分析しますか？`)) return;

  // currentAreaData に選択作物をセット
  currentAreaData.selectedCropId  = cropId;
  currentAreaData.cultivationMode = currentAreaData.cultivationMode || 'openField';
  currentAreaData.analysisItems   = [
    'landProfile', 'matchRange', 'cropRanking', 'profitability', 'fertilizer', 'risk',
  ];

  closeAreaDetailPanel();
  if (typeof switchTab === 'function') switchTab('analysis');
  if (typeof runSingleCropAnalysis === 'function') {
    runSingleCropAnalysis(areaName);
  }
}