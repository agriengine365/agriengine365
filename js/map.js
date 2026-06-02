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

// Leaflet Draw インスタンス（UIは非表示、ハンドラのみ利用）
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

// Leaflet Draw のデフォルトUIを完全非表示
const _hideDrawUI = () => {
  const el = document.querySelector('.leaflet-draw');
  if (el) { el.style.display = 'none'; }
  else { requestAnimationFrame(_hideDrawUI); }
};
_hideDrawUI();

// ─── カスタム「圃場を描く」ボタン（右上） ───
const DrawStartControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-draw-start');
    const btn = L.DomUtil.create('a', 'draw-start-btn', container);
    btn.href = '#';
    btn.title = '圃場を描く';
    btn.setAttribute('aria-label', '圃場を描く');
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
      <span>圃場を描く</span>
    `;

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.preventDefault(e);
      startPolygonDraw();
    });
    return container;
  },
});

map.addControl(new DrawStartControl());

// ─── 右側フロート操作群トグル ───
const ICON_MENU = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`;
const ICON_CLOSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const FloatToggleControl = L.Control.extend({
  options: { position: 'bottomright' },
  onAdd() {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-float-toggle');
    const btn = L.DomUtil.create('a', 'float-toggle-btn', container);
    btn.href = '#';
    btn.title = '操作パネルを開閉';
    btn.setAttribute('aria-label', '操作パネルを開閉');
    btn.innerHTML = ICON_MENU;

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.preventDefault(e);
      const mapEl = map.getContainer();
      const isClosed = mapEl.classList.toggle('float-controls-collapsed');
      btn.innerHTML = isClosed ? ICON_MENU : ICON_CLOSE;
    });
    return container;
  },
});

map.addControl(new FloatToggleControl());
// 初期状態：表示済み（collapsed付与なし）

// ─── カスタム描画完了 ───
async function onDrawPolygonComplete(layer) {
  await updateAreaStats(layer);
  showWizard();
}

// ─── Leaflet Draw（編集・削除のみ）───
map.on(L.Draw.Event.EDITSTART, () => {
  if (typeof PolygonDraw !== 'undefined' && PolygonDraw.isActive()) {
    PolygonDraw.cancel();
    showToast('描画を中断して頂点編集を開始しました', 'amber');
  }
});

map.on(L.Draw.Event.EDITSTOP, async () => {
  if (!currentPolygon) return;
  await updateAreaStats(currentPolygon);
});

map.on(L.Draw.Event.DELETED, () => {
  currentPolygon  = null;
  currentAreaData = null;
  resetStats();
});

// ─── エリア統計（データのみ保持・画面表示なし） ───
async function updateAreaStats(layer) {
  const latlngs  = layer.getLatLngs()[0];
  const areaSqm  = calcPolygonArea(latlngs);
  const centroid = calcCentroid(latlngs);
  const { lat, lng } = centroid;
  const climate = getClimate(lat);

  let elev = null;
  try {
    const res  = await fetch(`${CONFIG.ELEV_API}?lon=${lng}&lat=${lat}&outtype=JSON`);
    const json = await res.json();
    elev = json.elevation ?? null;
  } catch(e) { /* offline ok */ }

  const perimeter   = calcPerimeter(latlngs);
  const vertexCount = latlngs.length;
  const areaHa      = areaSqm / 10000;

  currentAreaData = {
    lat,
    lng,
    elev,
    climate,
    soilType:    null,        // ウィザードで上書きされる
    areaSqm,
    areaHa,
    perimeter,
    vertexCount,
  };
}

function resetStats() {
  currentAreaData = null;
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
