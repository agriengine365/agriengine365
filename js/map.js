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