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
    if (t.dataset.tab === 'areas')   loadAreas();
    if (t.dataset.tab === 'records') renderRecordTab();
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

// ═══════════════════════════════════════════
//  MAP FLOAT BAR — ボタン挙動
// ═══════════════════════════════════════════

function mfbRecords() {
  switchTab('records');
  setSheet('half');
  renderRecordTab();
}

function mfbAddField() {
  // polygonDraw.js の開始関数を呼ぶ
  // polygonDraw.js が PolygonDraw オブジェクトを公開している場合
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

function mfbMenu() {
  // 将来的に設定メニュー展開予定
  showToast('メニューは準備中です');
}
