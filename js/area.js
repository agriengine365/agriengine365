// ═══════════════════════════════════════════
//  AREA — 保存・一覧・削除・選択
// ═══════════════════════════════════════════

async function saveArea() {
  if (!currentPolygon || !currentAreaData) return;

  const name    = document.getElementById('area-name').value.trim() || `エリア ${Date.now()}`;
  const memo    = document.getElementById('area-memo').value.trim();
  const geojson = currentPolygon.toGeoJSON();

  const payload = {
    name,
    memo,
    geojson,
    meta: {
      areaSqm:     currentAreaData.areaSqm,
      lat:         currentAreaData.lat,
      lng:         currentAreaData.lng,
      elev:        currentAreaData.elev,
      climateName: currentAreaData.climate?.name || null,
      soilType:    currentAreaData.soilType || null,
    },
    createdAt: new Date().toISOString(),
  };

  const btn = document.getElementById('save-btn');
  btn.innerHTML = '<span class="spinner"></span>保存中...';
  btn.disabled  = true;

  try {
    if (db) {
      await db.collection('areas').add(payload);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      payload.id = 'local_' + Date.now();
      stored.push(payload);
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
    }
    showToast('保存しました ✓', 'green');
    loadAreas();
    switchTab('areas');
  } catch(e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
  }

  btn.innerHTML = 'エリアを保存する';
  btn.disabled  = false;
}

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
  areas.forEach(area => {
    const ha  = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
    const div = document.createElement('div');
    div.className = 'area-item';
    div.innerHTML = `
      <div class="area-item-header">
        <div class="area-item-name">${escHtml(area.name)}</div>
        <button class="btn btn-danger" onclick="event.stopPropagation();deleteArea('${area.id}')">削除</button>
      </div>
      <div class="area-item-meta">
        <span>${ha} ha</span>
        <span>${area.meta?.climateName || '—'}</span>
        <span>${area.meta?.soilType || '土壌不明'}</span>
      </div>
      ${area.memo ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;">${escHtml(area.memo)}</div>` : ''}
    `;
    div.onclick = () => selectArea(area);
    list.appendChild(div);
  });
}

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

function selectArea(area) {
  drawnItems.clearLayers();
  const layer = L.geoJSON(area.geojson, {
    style: { color: CONFIG.DRAW_COLOR, weight: 2, fillOpacity: 0.2 },
  });
  layer.addTo(drawnItems);
  map.fitBounds(layer.getBounds());

  currentAreaData = {
    lat:     area.meta?.lat     || null,
    lng:     area.meta?.lng     || null,
    elev:    area.meta?.elev    || null,
    climate: getClimate(area.meta?.lat || 35),
    soilType:area.meta?.soilType || null,
    areaSqm: area.meta?.areaSqm  || 0,
  };

  runAnalysis(area.name);
  switchTab('analysis');
}
