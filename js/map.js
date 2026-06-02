// ═══════════════════════════════════════════
//  MAP — Leaflet初期化・描画・ジオメトリ
// ═══════════════════════════════════════════

// ─── Leaflet Draw 日本語化 ───
L.drawLocal.draw.toolbar.buttons.polygon     = '圃場を描く';
L.drawLocal.draw.toolbar.finish.text         = '完成';
L.drawLocal.draw.toolbar.finish.title        = '描画を完成させる';
L.drawLocal.draw.toolbar.undo.text           = '頂点を戻す';
L.drawLocal.draw.toolbar.undo.title          = '最後の頂点を削除';
L.drawLocal.draw.toolbar.actions.text        = 'キャンセル';
L.drawLocal.draw.toolbar.actions.title       = '描画をキャンセル';
L.drawLocal.draw.handlers.polygon.tooltip.start  = 'クリックして圃場の頂点を打ってください';
L.drawLocal.draw.handlers.polygon.tooltip.cont   = 'クリックで頂点を追加します';
L.drawLocal.draw.handlers.polygon.tooltip.end    = '最初の点をクリックして圃場を完成させてください';
L.drawLocal.edit.toolbar.buttons.edit        = '頂点を編集';
L.drawLocal.edit.toolbar.buttons.editDisabled= '編集できるエリアがありません';
L.drawLocal.edit.toolbar.buttons.remove      = 'エリアを削除';
L.drawLocal.edit.toolbar.buttons.removeDisabled = '削除できるエリアがありません';
L.drawLocal.edit.toolbar.actions.save.text   = '編集を保存';
L.drawLocal.edit.toolbar.actions.save.title  = '編集内容を保存する';
L.drawLocal.edit.toolbar.actions.cancel.text = 'キャンセル';
L.drawLocal.edit.toolbar.actions.cancel.title= '編集をキャンセルして元に戻す';
L.drawLocal.edit.toolbar.actions.clearAll.text  = '全て削除';
L.drawLocal.edit.toolbar.actions.clearAll.title = '全てのレイヤーを削除する';
L.drawLocal.edit.handlers.edit.tooltip.text  = '頂点をドラッグして位置を微調整できます';
L.drawLocal.edit.handlers.remove.tooltip.text= '削除するエリアをクリックしてください';

const map = L.map('map', {
  center: CONFIG.MAP_CENTER,
  zoom:   CONFIG.MAP_ZOOM,
  zoomControl: false,
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer(CONFIG.TILE_URL, {
  attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
  maxZoom: 18,
}).addTo(map);

const drawnItems = new L.FeatureGroup().addTo(map);

const drawControl = new L.Control.Draw({
  position: 'topright',
  edit: { featureGroup: drawnItems },
  draw: {
    polygon: {
      allowIntersection: false,
      shapeOptions: { color: CONFIG.DRAW_COLOR, weight: 2, fillOpacity: 0.15 },
    },
    polyline:     false,
    rectangle:    false,
    circle:       false,
    marker:       false,
    circlemarker: false,
  },
});
map.addControl(drawControl);

// ─── Draw イベント ───
map.on(L.Draw.Event.DRAWSTART, () => {
  setDrawStep('drawing');
});

map.on(L.Draw.Event.DRAWSTOP, () => {
  // 描画キャンセル時（CREATEDが発火しなかった場合）
  if (!currentPolygon) setDrawStep('idle');
});

map.on(L.Draw.Event.CREATED, async (e) => {
  drawnItems.clearLayers();
  drawnItems.addLayer(e.layer);
  currentPolygon = e.layer;

  setDrawStep('saving');
  await updateAreaStats(e.layer);

  // 自動保存
  await autoSaveArea();
  setDrawStep('done');
  switchTab('draw');
});

map.on(L.Draw.Event.EDITSTART, () => {
  setDrawStep('editing');
});

map.on(L.Draw.Event.EDITSTOP, async () => {
  if (!currentPolygon) return;
  // 編集確定後に統計再計算
  await updateAreaStats(currentPolygon);
  setDrawStep('done');
});

map.on(L.Draw.Event.DELETED, () => {
  currentPolygon  = null;
  currentAreaData = null;
  resetStats();
  setDrawStep('idle');
});

// ─── エリア統計 ───
async function updateAreaStats(layer) {
  const latlngs  = layer.getLatLngs()[0];
  const areaSqm  = calcPolygonArea(latlngs);
  const perim    = calcPerimeter(latlngs);
  const centroid = calcCentroid(latlngs);
  const { lat, lng } = centroid;
  const climate = getClimate(lat);

  let elev = null;
  try {
    const res  = await fetch(`${CONFIG.ELEV_API}?lon=${lng}&lat=${lat}&outtype=JSON`);
    const json = await res.json();
    elev = json.elevation ?? null;
  } catch(e) { /* offline ok */ }

  currentAreaData = { lat, lng, elev, climate, soilType: selectedSoil, areaSqm };

  setText('stat-area',    `${(areaSqm / 10000).toFixed(4)}<span class="unit">ha</span>`);
  setText('stat-perim',   `${Math.round(perim)}<span class="unit">m</span>`);
  setText('stat-lat',     lat.toFixed(5));
  setText('stat-lng',     lng.toFixed(5));
  setText('stat-elev',    elev !== null ? `${Math.round(elev)}<span class="unit">m</span>` : '—');
  setText('stat-climate', climate ? climate.name : '—');
}

function resetStats() {
  ['stat-area','stat-perim','stat-lat','stat-lng','stat-elev','stat-climate']
    .forEach(id => setText(id, '—'));
}

// ─── ジオメトリヘルパー ───
function calcPolygonArea(latlngs) {
  const R = 6371000;
  let area = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const j  = (i + 1) % n;
    const xi = latlngs[i].lng * Math.PI / 180 * R * Math.cos(latlngs[i].lat * Math.PI / 180);
    const yi = latlngs[i].lat * Math.PI / 180 * R;
    const xj = latlngs[j].lng * Math.PI / 180 * R * Math.cos(latlngs[j].lat * Math.PI / 180);
    const yj = latlngs[j].lat * Math.PI / 180 * R;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area / 2);
}

function calcPerimeter(latlngs) {
  let d = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    d += latlngs[i].distanceTo(latlngs[(i + 1) % n]);
  }
  return d;
}

function calcCentroid(latlngs) {
  const lat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length;
  const lng = latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length;
  return { lat, lng };
}
