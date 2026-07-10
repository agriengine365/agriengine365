// ═══════════════════════════════════════════
//  POLYGON DRAW — スコープ（画面中央）方式
//  地図をドラッグして中央スコープに合わせ、「確定」で頂点追加
//
//  Step4（圃場追加フロー刷新 仕様書）で以下を変更：
//  - js/ から js/fieldAdd/ へ移設（描画ロジック自体は無改修）
//  - complete()：従来は頂点確定後に直接ポリゴンを地図へ確定し
//    onDrawPolygonComplete()へ渡していたが、確認・微調整画面
//    （js/fieldAdd/fieldConfirmAdjust.js）へ引き渡すだけに変更。
//    実際の保存フローへの接続はFieldConfirmAdjust.confirm()側で行う。
// ═══════════════════════════════════════════

// ─── aria-hidden 適用前にフォーカスを外す共通ヘルパー ───
function _blurIfInside(container) {
  const ae = document.activeElement;
  if (ae && container && container.contains(ae)) ae.blur();
}

const PolygonDraw = (() => {
  let active = false;
  /** @type {L.LatLng[]} */
  let confirmed = [];
  let previewLine = null;
  let previewFill = null;
  let liveLayer  = null;   // スコープ中心→最終確定点のライブライン
  /** @type {L.Marker[]} */
  let vertexMarkers = [];

  // ─── 確定頂点：小さい点マーカー ───
  function makeConfirmedIcon() {
    return L.divIcon({
      className: 'vertex-marker vertex-confirmed',
      iconSize:  [8, 8],
      iconAnchor:[4, 4],
    });
  }

  // ─── スコープ表示/非表示 ───
  function setScopeVisible(visible) {
    const el = document.getElementById('draw-scope');
    if (el) el.classList.toggle('active', visible);
  }

  // ─── スコープ中心の LatLng を取得（ダイアログ表示時のズレを補正）───
  function getCenter() {
    const scope = document.getElementById('draw-scope');
    if (!scope) return map.getCenter();
    const sr = scope.getBoundingClientRect();
    const mr = map.getContainer().getBoundingClientRect();
    const cx = sr.left + sr.width  / 2 - mr.left;
    const cy = sr.top  + sr.height / 2 - mr.top;
    return map.containerPointToLatLng(L.point(cx, cy));
  }

  // ─── ライブライン（スコープ中心 ↔ 最終確定点）を更新 ───
  function updateLiveLine() {
    if (liveLayer) { map.removeLayer(liveLayer); liveLayer = null; }
    if (!active || confirmed.length === 0) return;

    const center = getCenter();
    const last   = confirmed[confirmed.length - 1];

    // 2点以上確定済みなら閉じた薄いプレビューも描く
    const pts = [...confirmed, center];

    if (confirmed.length >= 2) {
      // 閉じたポリゴンプレビュー（薄い塗り）
      const closed = [...confirmed, center];
      liveLayer = L.polygon(closed, {
        color:       CONFIG.DRAW_COLOR,
        weight:      1.5,
        dashArray:   '5 7',
        fillOpacity: 0.07,
        opacity:     0.5,
        interactive: false,
      }).addTo(map);
    } else {
      // 1点だけならライン
      liveLayer = L.polyline([last, center], {
        color:       CONFIG.DRAW_COLOR,
        weight:      2,
        dashArray:   '5 7',
        opacity:     0.7,
        interactive: false,
      }).addTo(map);
    }
  }

  // ─── 確定済みポリゴンプレビュー（確定点だけで構成） ───
  function updateConfirmedPreview() {
    if (previewLine) { map.removeLayer(previewLine); previewLine = null; }
    if (previewFill) { map.removeLayer(previewFill); previewFill = null; }

    const n = confirmed.length;
    if (n < 2) return;

    if (n >= 3) {
      previewFill = L.polygon(confirmed, {
        color:       CONFIG.DRAW_COLOR,
        weight:      2,
        fillOpacity: 0.12,
        opacity:     0.85,
        interactive: false,
      }).addTo(map);
    } else {
      previewLine = L.polyline(confirmed, {
        color:       CONFIG.DRAW_COLOR,
        weight:      2,
        opacity:     0.85,
        interactive: false,
      }).addTo(map);
    }
  }

  // ─── 確定頂点マーカー再描画 ───
  function renderConfirmedMarkers() {
    vertexMarkers.forEach(m => map.removeLayer(m));
    vertexMarkers = [];
    confirmed.forEach(ll => {
      const m = L.marker(ll, {
        icon:        makeConfirmedIcon(),
        draggable:   false,
        interactive: false,
      }).addTo(map);
      vertexMarkers.push(m);
    });
  }

  // ─── 地図移動時にライブライン更新 ───
  function onMapMove() {
    if (!active) return;
    updateLiveLine();
  }

  // ─── ボタン有効/無効 ───
  function updateControls() {
    const n = confirmed.length;
    const btnConfirm  = document.getElementById('btn-draw-confirm');
    const btnBack     = document.getElementById('btn-draw-back');
    const btnComplete = document.getElementById('btn-draw-complete');
    const btnReset    = document.getElementById('btn-draw-reset');

    // 確定：常に押せる（スコープ中心を即追加）
    if (btnConfirm)  btnConfirm.disabled  = !active;
    if (btnBack)     btnBack.disabled     = !active || n === 0;
    if (btnComplete) btnComplete.disabled = !active || n < 3;
    if (btnReset)    btnReset.disabled    = !active || n === 0;
  }

  function setControlsVisible(visible) {
    const dlg = document.getElementById('map-draw-dialog');
    if (dlg) {
      if (!visible) _blurIfInside(dlg);
      dlg.hidden = !visible;
      dlg.setAttribute('aria-hidden', String(!visible));
    }
    document.documentElement.classList.toggle('draw-dialog-active', visible);

    const sheet = document.getElementById('sheet');
    if (sheet) sheet.style.display = visible ? 'none' : '';
  }

  // ─── 開始 ───
  function start() {
    if (active) return;
    active    = true;
    confirmed = [];

    vertexMarkers.forEach(m => map.removeLayer(m));
    vertexMarkers = [];
    if (previewLine) { map.removeLayer(previewLine); previewLine = null; }
    if (previewFill) { map.removeLayer(previewFill); previewFill = null; }
    if (liveLayer)   { map.removeLayer(liveLayer);   liveLayer   = null; }

    drawnItems.clearLayers();
    currentPolygon  = null;
    currentAreaData = null;
    resetStats();

    map.on('move',    onMapMove);
    map.on('moveend', onMapMove);
    map.getContainer().classList.add('polygon-draw-active');

    setScopeVisible(true);
    setControlsVisible(true);
    updateControls();
    updateMapDrawHint('地図を動かして中央を頂点に合わせて「確定」');
    showDrawToast('地図をドラッグして1点目を中央に合わせてください');
  }

  // ─── 停止（内部用） ───
  function stop() {
    if (!active) return;
    active = false;
    map.off('move',    onMapMove);
    map.off('moveend', onMapMove);
    map.getContainer().classList.remove('polygon-draw-active');

    vertexMarkers.forEach(m => map.removeLayer(m));
    vertexMarkers = [];
    if (previewLine) { map.removeLayer(previewLine); previewLine = null; }
    if (previewFill) { map.removeLayer(previewFill); previewFill = null; }
    if (liveLayer)   { map.removeLayer(liveLayer);   liveLayer   = null; }

    setScopeVisible(false);
    setControlsVisible(false);
    updateControls();
    if (typeof setSheet === 'function') setSheet('half');
  }

  // ─── 頂点確定（スコープ中心を追加） ───
  function confirmVertex() {
    if (!active) return;
    const ll = getCenter();
    confirmed.push(L.latLng(ll.lat, ll.lng));

    renderConfirmedMarkers();
    updateConfirmedPreview();
    updateLiveLine();
    updateControls();

    const n = confirmed.length;
    if (n < 3) {
      updateMapDrawHint(`${n}点確定 — あと${3 - n}点以上`);
      showDrawToast(`${n}点目を確定。地図を動かして次の頂点を合わせてください`);
    } else {
      updateMapDrawHint(`${n}点確定 — 「完了」で閉じる`);
      showDrawToast(`${n}点目を確定。「完了」で圃場を閉じられます`);
    }
  }

  // ─── 1つ戻る ───
  function goBack() {
    if (!active || confirmed.length === 0) return;
    confirmed.pop();
    renderConfirmedMarkers();
    updateConfirmedPreview();
    updateLiveLine();
    updateControls();
    const n = confirmed.length;
    updateMapDrawHint(n ? `${n}点確定 — 次の頂点を合わせて確定` : '地図を動かして中央を頂点に合わせて「確定」');
    showDrawToast('1つ前の頂点に戻しました');
  }

  // ─── 完了 ───
  function complete() {
    if (!active) return;
    if (confirmed.length < 3) {
      showDrawToast('完了には頂点を3つ以上確定してください', 'amber');
      return;
    }

    const latlngs = confirmed.slice(); // L.LatLng[]（Step4：確認・微調整画面へそのまま渡す）

    stop();
    FieldConfirmAdjust.open(latlngs, { source: 'manual' });
  }

  // ─── リセット ───
  function reset() {
    if (!active) return;
    confirmed = [];
    renderConfirmedMarkers();
    updateConfirmedPreview();
    if (liveLayer) { map.removeLayer(liveLayer); liveLayer = null; }
    updateControls();
    updateMapDrawHint('地図を動かして中央を頂点に合わせて「確定」');
    showDrawToast('リセットしました');
  }

  // ─── キャンセル ───
  function cancel() { stop(); }

  return { isActive: () => active, start, stop, confirmVertex, goBack, complete, reset, cancel };
})();

// ─── グローバル関数 ───
function startPolygonDraw()  { PolygonDraw.start(); }
function polygonDrawConfirm()  { PolygonDraw.confirmVertex(); }
function polygonDrawBack()     { PolygonDraw.goBack(); }
function polygonDrawComplete() { PolygonDraw.complete(); }
function polygonDrawReset()    { PolygonDraw.reset(); }

// ═══════════════════════════════════════════
//  RIDGE DIR DRAW（畝方向2点指定モード）は廃止済み
//  畝方向は辺選択パネル方式（area.js の _adpSelectRidgeDirEdge）に一本化されたため、
//  圃場ポリゴン確定後に自由な2点タップで畝方向を指定する旧フローは不要になった。
//  旧実装は git履歴を参照（RidgeDirDraw / onRidgeDirComplete / draw-phase-ridgedir 一式）。
// ═══════════════════════════════════════════