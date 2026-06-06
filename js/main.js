// ═══════════════════════════════════════════
//  MAIN — グローバル状態・イベントバインド・初期化
// ═══════════════════════════════════════════

// グローバル状態（複数モジュールから参照）
let currentPolygon    = null;
let currentAreaData   = null;
let selectedSoil      = null;
let currentSavedAreaId = null;

// ─── 描画リセット ───
function clearDraw() {
  if (typeof PolygonDraw !== 'undefined' && PolygonDraw.isActive()) {
    PolygonDraw.cancel();
  }
  drawnItems.clearLayers();
  currentPolygon     = null;
  currentAreaData    = null;
  currentSavedAreaId = null;
  selectedSoil       = null;
  resetStats();
  setDrawStep('idle');
  showToast('描画をリセットしました');
}

// ─── UI初期化 ───
initSheet();   // スワイプ閉じ初期化（ui.js）
setDrawStep('idle');

// ─── 初期ロード ───
loadAreas();

// ═══════════════════════════════════════════
//  FAB — ボタン挙動
// ═══════════════════════════════════════════

function mfbAddField() {
  if (typeof PolygonDraw !== 'undefined' && typeof PolygonDraw.start === 'function') {
    PolygonDraw.start();
  } else if (typeof startPolygonDraw === 'function') {
    startPolygonDraw();
  } else if (typeof setDrawStep === 'function') {
    setDrawStep('drawing');
  } else {
    showToast('描画機能を読み込み中です', 'amber');
  }
}
