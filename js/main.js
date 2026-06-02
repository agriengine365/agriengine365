// ═══════════════════════════════════════════
//  MAIN — グローバル状態・イベントバインド・初期化
// ═══════════════════════════════════════════

// グローバル状態（複数モジュールから参照）
let currentPolygon    = null;
let currentAreaData   = null;
let selectedSoil      = null;
let currentSavedAreaId = null;

// ─── タブ切り替え ───
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    switchTab(t.dataset.tab);
    if (t.dataset.tab === 'areas') loadAreas();
  });
});

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

// ─── ボトムシート初期化 ───
initSheet();

// ─── ステップ初期化 ───
setDrawStep('idle');

// ─── 初期ロード ───
loadAreas();
