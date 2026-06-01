// ═══════════════════════════════════════════
//  MAP — Leaflet初期化・描画・ジオメトリ
// ═══════════════════════════════════════════

const map = L.map('map', {
  center: CONFIG.MAP_CENTER,
  zoom:   CONFIG.MAP_ZOOM,
  zoomControl: true,
});

L.tileLayer(CONFIG.TILE_URL, {
  attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
  maxZoom: 18,
}).addTo(map);

const drawnItems = new L.FeatureGroup().addTo(map);

const drawControl = new L.Control.Draw({
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
map.on(L.Draw.Event.CREATED, async (e) => {
  drawnItems.clearLayers();
  drawnItems.addLayer(e.layer);
  currentPolygon = e.layer;
  await updateAreaStats(e.layer);
  document.getElementById('save-btn').disabled = false;
  switchTab('draw');
});

map.on(L.Draw.Event.DELETED, () => {
  currentPolygon = null;
  currentAreaData = null;
  document.getElementById('save-btn').disabled = true;
  resetStats();
});

// ─── エリア統計 ───
async function updateAreaStats(layer) {
  const latlngs = layer.getLatLngs()[0];
  const areaSqm = calcPolygonArea(latlngs);
  const perim   = calcPerimeter(latlngs);
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
