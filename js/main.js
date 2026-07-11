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
  showToast('描画をリセットしました');
}

// ─── UI初期化 ───
initSheet();   // スワイプ閉じ初期化（ui.js）

// ─── 初期ロード ───
loadAreas();

// ═══════════════════════════════════════════
//  FAB — ボタン挙動
// ═══════════════════════════════════════════
//
//  Step5（入口統合）：旧mfbAddField()は廃止。ボトムナビ「圃場追加」ボタンの
//  onclickは index.html 側で直接 FieldAddController.start() を呼ぶよう変更した
//  （このファイル内に他の呼び出し元がないことを確認済み）。
//  「地図を合わせる」画面（自動検出／手動で描く の選択）を経由するようになる。