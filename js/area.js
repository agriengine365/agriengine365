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
  const landProfile = buildLandProfile({ ...currentAreaData, soilType });

  const payload = {
    name,
    memo,
    geojson,
    landProfile,
    meta: {
      areaSqm:      currentAreaData.areaSqm,
      areaHa:       currentAreaData.areaHa,
      perimeter:    currentAreaData.perimeter,
      vertexCount:  currentAreaData.vertexCount,
      lat:          currentAreaData.lat,
      lng:          currentAreaData.lng,
      elev:         currentAreaData.elev,
      climateName:  currentAreaData.climate?.name  || null,
      climateTempMean: currentAreaData.climate?.tempMean ?? null,
      climateRain:  currentAreaData.climate?.rain  ?? null,
      soilType:     soilType || null,
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
  const layer = L.geoJSON(area.geojson, {
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

function openAreaDetailPanel(area) {
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

  _adpRenderCalendar();
  _adpRenderDayRecords();

  overlay.classList.add('open');
  panel.classList.add('open');
}

function closeAreaDetailPanel() {
  const panel   = document.getElementById('adp-panel');
  const overlay = document.getElementById('adp-overlay');
  if (!panel) return;
  panel.classList.remove('open');
  overlay.classList.remove('open');
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
      <div id="adp-calendar-wrap"></div>
      <div id="adp-day-records-wrap"></div>
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
