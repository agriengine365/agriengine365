// ═══════════════════════════════════════════
//  MAIN — グローバル状態・イベントバインド・初期化
// ═══════════════════════════════════════════

// グローバル状態（複数モジュールから参照）
let currentPolygon  = null;
let currentAreaData = null;
let selectedSoil    = null;

// ─── タブ切り替え ───
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    switchTab(t.dataset.tab);
    if (t.dataset.tab === 'areas') loadAreas();
  });
});

// ─── 土壌セレクター ───
document.querySelectorAll('.soil-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.soil-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedSoil = btn.dataset.soil;
    if (currentAreaData) currentAreaData.soilType = selectedSoil;
  });
});

// ─── 描画リセット ───
function clearDraw() {
  drawnItems.clearLayers();
  currentPolygon  = null;
  currentAreaData = null;
  document.getElementById('save-btn').disabled = true;
  resetStats();
}

// ─── 初期ロード ───
loadAreas();
