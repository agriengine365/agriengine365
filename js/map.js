// ═══════════════════════════════════════════
//  MAP — Leaflet初期化・描画・ジオメトリ
// ═══════════════════════════════════════════

// ─── 前回終了時の地図位置（中心座標＋ズーム）を復元 ───
// 保存は beforeunload 時のみ（_saveLastMapView）。ここでは起動時の読み込みのみ行う。
const MAP_LAST_VIEW_KEY = 'agriMapLastView';

function _loadLastMapView() {
  try {
    const raw = localStorage.getItem(MAP_LAST_VIEW_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.lat !== 'number' || typeof v?.lng !== 'number' || typeof v?.zoom !== 'number') return null;
    return { center: [v.lat, v.lng], zoom: v.zoom };
  } catch(e) {
    console.warn('[MAP] 前回位置の復元に失敗:', e);
    return null;
  }
}

const _lastMapView = _loadLastMapView();

const map = L.map('map', {
  center:  _lastMapView ? _lastMapView.center : CONFIG.MAP_CENTER,
  zoom:    _lastMapView ? _lastMapView.zoom   : CONFIG.MAP_ZOOM,
  maxZoom: 20,
  zoomControl: false,
});

// ─── 終了時（タブを閉じる／離脱）に現在の地図位置を保存 ───
window.addEventListener('beforeunload', () => {
  try {
    const c = map.getCenter();
    localStorage.setItem(MAP_LAST_VIEW_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
  } catch(e) { /* 保存できなくても致命的ではないため無視 */ }
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer(CONFIG.TILE_URL, {
  attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
  maxNativeZoom: 18,
  maxZoom: 20,
}).addTo(map);

const drawnItems = new L.FeatureGroup().addTo(map);

// ─── 保存済みエリア常時表示レイヤー ───
// drawnItems（描画中／分析選択中の1件専用）とは別系統。
// loadAreas() 実行時（初期表示・保存・編集・削除後）に全件を描き直す。
const SAVED_AREA_COLOR = '#5b7c99'; // 控えめなグレーブルー（CONFIG.DRAW_COLORとは区別）
const savedAreasLayer  = new L.FeatureGroup().addTo(map);

// ─── 保存済み全エリアを地図に描画（area.js の loadAreas() から呼ばれる） ───
function renderSavedAreasOnMap(areas) {
  savedAreasLayer.clearLayers();

  (areas || []).forEach(area => {
    if (!area.geojson) return;
    let geojsonData;
    try {
      geojsonData = typeof area.geojson === 'string' ? JSON.parse(area.geojson) : area.geojson;
    } catch(e) { return; }

    const layer = L.geoJSON(geojsonData, {
      style: {
        color:       SAVED_AREA_COLOR,
        weight:      1.5,
        fillOpacity: 0.06,
        opacity:     0.55,
        interactive: true,
      },
    });

    layer.eachLayer(l => {
      // 重心に常時表示ラベル（Leafletのpermanent tooltipがポリゴン重心を自動算出）
      l.bindTooltip(escHtml(area.name || '無名エリア'), {
        permanent:  true,
        direction:  'center',
        className:  'saved-area-label',
        interactive: true, // ラベル自体のクリックも拾えるようにする
      });
      // ポリゴンタップ → 分析画面を開く
      l.on('click', () => selectArea(area));
      // ラベルタップ → 同じく分析画面を開く（ポリゴンが薄くてヒットしにくい場合の保険）
      l.on('tooltipopen', (e) => {
        const tipEl = e.tooltip.getElement();
        if (tipEl && !tipEl._savedAreaClickBound) {
          tipEl._savedAreaClickBound = true;
          tipEl.addEventListener('click', (ev) => {
            ev.stopPropagation();
            selectArea(area);
          });
        }
      });
    });

    layer.addTo(savedAreasLayer);
  });

  // 選択中エリア（drawnItems）の強調表示が常に最前面に来るようにする
  if (typeof drawnItems !== 'undefined' && drawnItems.bringToFront) {
    drawnItems.bringToFront();
  }
}

// ─── カスタム描画完了（polygonDraw.js から呼ばれる）───
// ポリゴン確定後 → ウィザード の順に進む
// Step6（畝方向2点指定フェーズ廃止）：畝方向は辺選択パネル方式（area.js _adpSelectRidgeDirEdge）に
// 一本化済みのため、ここでは統計計算のみ行い、そのままウィザードを開く。
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