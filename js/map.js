// ═══════════════════════════════════════════
//  MAP — Leaflet初期化・描画・ジオメトリ
// ═══════════════════════════════════════════

const map = L.map('map', {
  center:  CONFIG.MAP_CENTER,
  zoom:    CONFIG.MAP_ZOOM,
  maxZoom: 20,
  zoomControl: false,
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer(CONFIG.TILE_URL, {
  attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
  maxNativeZoom: 18,
  maxZoom: 20,
}).addTo(map);

const drawnItems = new L.FeatureGroup().addTo(map);

// ─── カスタム描画完了（polygonDraw.js から呼ばれる）───
async function onDrawPolygonComplete(layer) {
  await updateAreaStats(layer);
  showWizard();
}

// ─── エリア統計（データのみ保持・画面表示なし） ───
async function updateAreaStats(layer) {
  const latlngs  = layer.getLatLngs()[0];
  const areaSqm  = calcPolygonArea(latlngs);
  const centroid = calcCentroid(latlngs);
  const { lat, lng } = centroid;

  // まず緯度テーブルで初期値をセット（AMeDAS失敗時のフォールバック）
  let climate = getClimate(lat);

  let elev = null;
  try {
    const res  = await fetch(`${CONFIG.ELEV_API}?lon=${lng}&lat=${lat}&outtype=JSON`);
    const json = await res.json();
    elev = json.elevation ?? null;
  } catch(e) { /* offline ok */ }

  // AMeDAS実データ取得（失敗してもフォールバックのclimateを使い続ける）
  let amData = null;
  try {
    amData = await AmedasLoader.getClimateAt(lat, lng);
    if (amData) {
      // engine.js の getClimate() 互換形式に変換しつつ実値で上書き
      climate = {
        name:          amData.name,
        tempMean:      amData.tempMean      ?? climate.tempMean,
        rain:          amData.rain          ?? climate.rain,
        // AMeDAS拡張フィールド（エリアパネル表示・保存用）
        stationNo:     amData.stationNo,
        stationName:   amData.stationName,
        distKm:        amData.distKm,
        tempMaxMean:   amData.tempMaxMean,
        tempMinMean:   amData.tempMinMean,
        tempMinJan:    amData.tempMinJan,
        sunshineHours: amData.sunshineHours,
        daysBelow0:    amData.daysBelow0,
        rainDays50:    amData.rainDays50,
        snowDays:      amData.snowDays,
        rainMonthly:   amData.rainMonthly,
        source:        'amedas',
      };
    }
  } catch(e) {
    console.warn('AMeDAS取得失敗、緯度テーブルで代替:', e);
  }

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
  currentAreaData.landProfile = buildLandProfile(currentAreaData);
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