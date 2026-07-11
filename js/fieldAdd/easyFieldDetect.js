// ═══════════════════════════════════════════
//  EASY FIELD DETECT — 「かんたん圃場追加」
//  タップ地点を起点に、地図タイル（航空写真）をcanvas上で解析し、
//  エッジ考慮flood-fill（色距離 AND 勾配）で圃場らしき輪郭を自動検出する。
//
//  検出結果はあくまで「たたき台」。Leaflet.Editableで頂点をドラッグ
//  微調整してから、既存の保存フロー（onDrawPolygonComplete → showWizard）
//  にそのまま接続する。
//
//  Step2（圃場追加フロー刷新 仕様書）で以下を実装：
//  - flood-fill / モルフォロジー / 自動チューニング / 輪郭抽出 / 凸包 /
//    矩形計算などの純粋関数は js/fieldAdd/fieldDetectAlgorithms.js に
//    移設済みのため、ここではそれを呼び出すだけ（ロジックの重複実装をしない）
//  - waitForTilesLoaded()：タイル未読込のままラスタライズしてしまい、
//    フォールバック色 #7f9a72 との誤境界が生まれるバグを修正
//  - ensureMinZoomForDetect()：低ズーム時の非ブロッキング警告
//  - rasterizeMapToCanvas(480px cap)：自動チューニングの複数回flood-fillでも
//    実用速度を維持するための解像度キャップ（スケール係数を保持し座標変換に使用）
//  - 検出中キャンセル：cancelToken方式。専用キャンセルボタン（index.html側に追加）
//    から cancelDetect() を呼ぶと、autoTuneTolerance()の候補ループを抜ける
//  - 感度スライダーは「自動チューニング後の微調整用」。ラスタライズ結果・勾配マップは
//    キャッシュを再利用し、floodFillMaskEdgeAware()のみ150ms debounceで再実行する
//    （autoTuneToleranceの全候補再試行はしない）
//
//  Step3（確認・微調整画面の統合）で以下を変更：
//  - プレビューレイヤーの所有権・確認画面（旧efd-phase-preview）を
//    js/fieldAdd/fieldConfirmAdjust.js（FieldConfirmAdjust）へ完全移管。
//    検出成功時・感度スライダー再検出成功時は _buildAndShowPreviewFromMask() から
//    FieldConfirmAdjust.open(latlngs, {source:'auto', sensitivityValue}) を呼ぶだけになる
//  - confirm() / 旧efd-phase-preview関連のDOM操作（_showPreviewLayer 等）は削除。
//    「この形で確定」「やり直す」「手動に切替」はFieldConfirmAdjust側に統合済み
//  - onSensitivityChange()の150ms debounceはこのファイルに残す（仕様書5.3の
//    デバウンス責務の置き場所。FieldConfirmAdjust.onSensitivityChange()から呼ばれる）
//
//  Step5（入口統合）で以下を変更：
//  - start() → beginDetectFlow() にリネーム。「圃場を追加」の真の入口は
//    js/fieldAdd/fieldAddController.js（FieldAddController.start()）になり、
//    ここは「地図を合わせる」画面で「自動で検出」を選んだ後に呼ばれる
//    （FieldAddController.chooseAuto()から委譲）。
//  - フェーズ管理（ALL_PHASE_IDS／_showPhase等）をFieldAddControllerに一本化。
//    このファイルからは削除し、FieldAddController.showPhase() 等を呼ぶだけにした。
//  - 6章決定を今回のみ覆し、EFD-1「四角形」選択を復活。selectShape('rect')の
//    場合のみ、検出成功時にconvexHull()→minAreaRect()で矩形フィットする
//    （_buildAndShowPreviewFromMask()参照）。'complex'は従来通り
//    snapNearRightAnglesによる軽微な角度補正のみ（実際の輪郭形状を尊重）。
//
//  技術メモ：
//  - map.js側でタイルレイヤーに crossOrigin:true を指定しているため、
//    地理院タイル（Originヘッダー送信時のみCORS許可される仕様）を
//    canvas上でピクセル解析できる。
//  - タイル画像は既存の<img class="leaflet-tile-loaded">要素の
//    getBoundingClientRect()から実際の描画位置を取得してcanvasに
//    描き写す（Leaflet内部のタイル座標計算を再実装しない、DOM基準の
//    ラスタライズ方式）。
//  - 輪郭抽出は msqr（js/vendor/msqr.min.js, MIT License）を使用。
//    FieldDetectAlgorithms.traceContourMsqr() 経由で呼ぶ。
// ═══════════════════════════════════════════

const EasyFieldDetect = (() => {

  // ─── 定数（仕様書4章・確定値） ───
  const MIN_DETECT_ZOOM        = 17;   // 地理院タイルmaxNativeZoom=18を踏まえた暫定値。要現地調整
  const RASTER_MAX_DIMENSION   = 480;  // 解析用キャンバスの最大解像度キャップ
  const TOLERANCE_CANDIDATES   = [6, 15, 30, 50, 70]; // スライダー実運用レンジ6〜70をフルカバー
  const EDGE_THRESHOLD         = 60;   // 勾配がこれを超える画素は領域拡張を止める
  const TILE_WAIT_TIMEOUT_MS   = 1500; // タイル読み込み待ちの基本タイムアウト
  const TILE_WAIT_EXTRA_MS     = 1000; // 基本タイムアウト超過時の延長待機
  const SENSITIVITY_DEBOUNCE_MS = 150; // 感度スライダーのデバウンス（仕様書5.3）
  const RIGHT_ANGLE_TOLERANCE_DEG = 5; // snapNearRightAnglesの角度許容値
  const DEFAULT_SENSITIVITY    = 28;   // 手動調整時の初期表示・フォールバック値

  // ─── 内部状態 ───
  const state = {
    cultivationHint: null, // null(露地) | 'greenhouse' | 'heatedGreenhouse'。EFD-0で選択。
    shapeMode:    null,   // 'rect' | 'complex'（UI遷移用のみ。検出ロジックの分岐には未使用）
    tapLatLng:    null,   // L.LatLng（検出対象地点）
    canvas:       null,   // ラスタライズ済みcanvas（感度変更時の再利用用）
    imageData:    null,   // canvasから取得したImageData（同上）
    gradientMap:  null,   // computeGradientMap()の結果（同上）
    rasterScale:  1,      // ラスタライズ時のキャップによる縮小率（座標変換に使用）
    seedX:        0,
    seedY:        0,
    sensitivity:  DEFAULT_SENSITIVITY, // 現在のtolerance値（自動チューニング結果 or 手動調整値）
    detecting:    false,
    cancelToken:  null,   // { cancelled: boolean }。detect()実行中のみセットされる
    sensitivityDebounceTimer: null,
  };

  // ═══════════════════════════════════════════
  //  フェーズ切替（map-draw-dialog内の他フェーズと排他）
  //  Step5：ALL_PHASE_IDS／_showPhase／_hideAllPhases／_openDialog／
  //  _closeDialogはfieldConfirmAdjust.js・polygonDraw.jsと3ファイルで
  //  ほぼ同じ実装が重複していたため、js/fieldAdd/fieldAddController.js
  //  に一本化した。ここではFieldAddController.showPhase() 等を呼ぶだけ。
  // ═══════════════════════════════════════════

  function _setScopeVisible(visible) {
    const el = document.getElementById('draw-scope');
    if (el) el.classList.toggle('active', visible);
  }

  // ─── 検出中／待機中のボタン表示切替（専用キャンセルボタン方式） ───
  // 検出中は既存3ボタン（キャンセル／検出／手動描画へ）を隠し、
  // 「検出中...（キャンセル）」ボタンのみを表示する。
  function _setDetectingUI(active) {
    const idle = document.getElementById('efd-tap-actions-idle');
    const busy = document.getElementById('efd-tap-actions-detecting');
    if (idle) idle.hidden = active;
    if (busy) busy.hidden = !active;
  }

  // ─── スコープ中心のLatLngを取得（PolygonDraw内のgetCenter()と同等ロジック） ───
  function _getScopeLatLng() {
    const scope = document.getElementById('draw-scope');
    if (!scope) return map.getCenter();
    const sr = scope.getBoundingClientRect();
    const mr = map.getContainer().getBoundingClientRect();
    const cx = sr.left + sr.width  / 2 - mr.left;
    const cy = sr.top  + sr.height / 2 - mr.top;
    return map.containerPointToLatLng(L.point(cx, cy));
  }

  // ─── 1フレーム分だけ制御を返す（描画直後の座標ズレ対策・キャンセル割込み用） ───
  function _yieldFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  function _clearSensitivityDebounce() {
    clearTimeout(state.sensitivityDebounceTimer);
    state.sensitivityDebounceTimer = null;
  }

  // ═══════════════════════════════════════════
  //  公開フロー：開始 → 形状選択 → タップ検出 → プレビュー確定
  //  Step5：旧start()はFieldAddController.chooseAuto()から呼ばれる
  //  beginDetectFlow()にリネーム（「地図を合わせる」画面が真の入口になった
  //  ため、ここはその次のステップという位置づけに変更）。
  // ═══════════════════════════════════════════

  function beginDetectFlow() {
    if (typeof PolygonDraw !== 'undefined' && PolygonDraw.isActive()) {
      PolygonDraw.cancel();
    }
    if (state.cancelToken) state.cancelToken.cancelled = true;
    if (typeof FieldConfirmAdjust !== 'undefined') FieldConfirmAdjust.close();
    _clearSensitivityDebounce();
    state.cultivationHint = null;
    state.shapeMode    = null;
    state.tapLatLng    = null;
    state.canvas       = null;
    state.imageData    = null;
    state.gradientMap  = null;
    state.rasterScale  = 1;
    state.sensitivity  = DEFAULT_SENSITIVITY;
    state.detecting    = false;
    state.cancelToken  = null;

    drawnItems.clearLayers();
    currentPolygon  = null;
    currentAreaData = null;
    if (typeof resetStats === 'function') resetStats();

    FieldAddController.openDialog();
    FieldAddController.showPhase('efd-phase-cultivation');
    showToast('圃場の種類を選んでください', '', 2400);
  }

  // ─── EFD-0：圃場の種類選択（露地／ハウス／加温） ───
  // 露地 → 従来通り「四角形／複雑な形」選択画面（efd-phase-shape）へ。
  // ハウス／加温 → パイプハウスは構造上ほぼ矩形になるため、形状選択はスキップし
  // 矩形固定（shapeMode='rect'）でそのまま検出画面（efd-phase-tap）へ進む。
  // 検出後の矩形フィット結果には _applyHouseSnap() で規格スナップを適用する
  // （_buildAndShowPreviewFromMask()参照）。
  function selectCultivation(mode) {
    state.cultivationHint = (mode === 'greenhouse' || mode === 'heatedGreenhouse') ? mode : null;

    if (!state.cultivationHint) {
      // 露地：従来通りの形状選択画面へ
      FieldAddController.showPhase('efd-phase-shape');
      updateMapDrawHint('検出したい圃場の形を選んでください');
      showDrawToast('形を選んでください');
      return;
    }

    // ハウス／加温：形状は矩形固定、選択画面をスキップして直接タップ検出へ
    state.shapeMode = 'rect';
    FieldAddController.showPhase('efd-phase-tap');
    _setDetectingUI(false);
    _setScopeVisible(true);
    updateMapDrawHint('地図を動かして中央をハウスに合わせてください');
    showDrawToast('地図をドラッグして検出したいハウスの中央にスコープを合わせ、「この地点で検出」をタップしてください');
  }

  function selectShape(mode) {
    // Step5決定（仕様書6章の矩形化廃止を今回のみ覆す）：
    // 「四角形」選択時のみ、検出成功時に矩形フィット（convexHull→minAreaRect）
    // を適用する。「複雑な形」は従来通りdouglasPeucker→snapNearRightAngles。
    // 分岐は_buildAndShowPreviewFromMask()内でstate.shapeModeを見て行う。
    state.shapeMode = mode;
    FieldAddController.showPhase('efd-phase-tap');
    _setDetectingUI(false);
    _setScopeVisible(true);
    updateMapDrawHint('地図を動かして中央を圃場に合わせてください');
    showDrawToast('地図をドラッグして検出したい圃場の中央にスコープを合わせ、「この地点で検出」をタップしてください');
  }

  function backToTap() {
    _clearSensitivityDebounce();
    // 「やり直す」＝新しい地点での再検出を前提とするため、キャッシュ済みの
    // ラスタライズ結果・勾配マップは破棄する（古い地点のデータの使い回しを防ぐ）。
    state.canvas       = null;
    state.imageData    = null;
    state.gradientMap  = null;
    state.rasterScale  = 1;
    state.sensitivity  = DEFAULT_SENSITIVITY;
    FieldAddController.showPhase('efd-phase-tap');
    _setDetectingUI(false);
    _setScopeVisible(true);
    showDrawToast('地図を動かして再度合わせ、「この地点で検出」をタップしてください');
  }

  // ─── キャンセル（B案：即終了。「地図を合わせる」へは戻さない） ───
  function cancel() {
    if (state.cancelToken) state.cancelToken.cancelled = true;
    _clearSensitivityDebounce();
    _setScopeVisible(false);
    FieldAddController.hideAllPhases();
    FieldAddController.closeDialog();
    if (typeof setSheet === 'function') setSheet('half');
    showToast('かんたん追加をキャンセルしました');
  }

  // ─── 手動描画へ退避（EFD-2の緊急退避ボタン。screen1経由せず直接手動描画へ） ───
  // FieldAddController.chooseManual()経由にすることで、PolygonDraw.start()内の
  // showPhase('draw-phase-drawing')呼び出しが効き、draw-phase-drawingのhidden
  // 解除漏れ（旧実装のバグ：手動描画に切り替えると描画UIが空白になる）を回避する。
  function fallbackManual() {
    if (state.cancelToken) state.cancelToken.cancelled = true;
    _clearSensitivityDebounce();
    _setScopeVisible(false);
    showToast('手動描画に切り替えました', 'amber');
    if (typeof FieldAddController !== 'undefined' && typeof FieldAddController.chooseManual === 'function') {
      FieldAddController.chooseManual();
    } else if (typeof PolygonDraw !== 'undefined') {
      PolygonDraw.start();
    }
  }

  // ─── 低ズーム警告（非ブロッキング・テキストのみ、仕様書4章） ───
  function ensureMinZoomForDetect() {
    if (map.getZoom() < MIN_DETECT_ZOOM) {
      showDrawToast('もう少し拡大すると精度が上がります', 'amber');
    }
  }

  // ─── タイル読み込み完了待ち（新規・バグ修正、仕様書4章） ───
  // 未読込タイルが残ったままラスタライズすると、フォールバック色#7f9a72が
  // シード色と一致しない偽の境界線を生む（旧実装のバグ）ため、これを待つ。
  function _tilesStillLoading() {
    return !!document.querySelector('.leaflet-tile-pane .leaflet-tile-loading');
  }

  async function waitForTilesLoaded(timeoutMs = TILE_WAIT_TIMEOUT_MS) {
    const pollInterval = 100;

    let waited = 0;
    while (_tilesStillLoading() && waited < timeoutMs) {
      await new Promise(r => setTimeout(r, pollInterval));
      waited += pollInterval;
    }
    if (!_tilesStillLoading()) return true;

    // タイムアウト時点でまだ残っていれば+1000msだけ延長再待機
    let extraWaited = 0;
    while (_tilesStillLoading() && extraWaited < TILE_WAIT_EXTRA_MS) {
      await new Promise(r => setTimeout(r, pollInterval));
      extraWaited += pollInterval;
    }
    return !_tilesStillLoading();
  }

  // ─── 検出実行 ───
  async function detect() {
    if (state.detecting) return;
    state.detecting = true;
    state.cancelToken = { cancelled: false };
    _setDetectingUI(true);

    try {
      ensureMinZoomForDetect();

      state.tapLatLng = _getScopeLatLng();

      // レイアウト確定を1フレーム待ってから処理開始（描画直後の座標ズレ対策）
      await _yieldFrame();
      if (state.cancelToken.cancelled) { _onDetectCancelled(); return; }

      const tilesReady = await waitForTilesLoaded(TILE_WAIT_TIMEOUT_MS);
      if (state.cancelToken.cancelled) { _onDetectCancelled(); return; }
      if (!tilesReady) {
        _onDetectFailure('地図の読み込みが完了していません。少し待ってからもう一度お試しください。');
        return;
      }

      const { canvas, scale } = _rasterizeMapToCanvas(RASTER_MAX_DIMENSION);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (secErr) {
        console.warn('[EasyFieldDetect] getImageData失敗（CORS制限の可能性）:', secErr);
        _onDetectFailure('タイル画像を解析できませんでした（ブラウザのセキュリティ制限）。ページを再読み込みしてから、もう一度お試しください。');
        return;
      }

      const seedPt = map.latLngToContainerPoint(state.tapLatLng);
      const seedX = Math.round(seedPt.x * scale);
      const seedY = Math.round(seedPt.y * scale);
      if (seedX < 0 || seedY < 0 || seedX >= canvas.width || seedY >= canvas.height) {
        _onDetectFailure('検出地点が画面外です。地図を動かしてやり直してください。');
        return;
      }

      const gradientMap = FieldDetectAlgorithms.computeGradientMap(imageData);

      state.canvas      = canvas;
      state.imageData   = imageData;
      state.gradientMap = gradientMap;
      state.rasterScale = scale;
      state.seedX       = seedX;
      state.seedY       = seedY;

      if (state.cancelToken.cancelled) { _onDetectCancelled(); return; }

      const result = await FieldDetectAlgorithms.autoTuneTolerance(
        imageData, gradientMap, seedX, seedY, TOLERANCE_CANDIDATES, EDGE_THRESHOLD, state.cancelToken
      );

      if (result === 'cancelled' || state.cancelToken.cancelled) { _onDetectCancelled(); return; }

      if (!result) {
        _onDetectFailure('検出範囲を特定できませんでした。地図を動かして別の地点でお試しください。');
        return;
      }

      state.sensitivity = result.tolerance;

      _buildAndShowPreviewFromMask(result.mask, canvas.width, canvas.height);

    } catch (e) {
      console.error('[EasyFieldDetect] 検出エラー:', e);
      _onDetectFailure('検出中にエラーが発生しました。手動描画をご利用ください。');
    } finally {
      state.detecting = false;
      _setDetectingUI(false);
    }
  }

  // ─── 検出中キャンセル（新規） ───
  function cancelDetect() {
    if (state.cancelToken) state.cancelToken.cancelled = true;
  }

  function _onDetectCancelled() {
    showToast('検出をキャンセルしました');
    // efd-phase-tapに留まる（既にそのフェーズのため画面遷移は不要）。
    // ボタン表示の復帰はdetect()のfinallyで行う。
  }

  function _onDetectFailure(message) {
    showDrawToast(message, 'amber');
  }

  // ─── 感度スライダー変更時：キャッシュ済みimageData/gradientMapを使い回して再検出 ───
  // 5.3節：150ms debounce（このファイルが責務を持つ。呼び出し元の
  // FieldConfirmAdjust.onSensitivityChange()側では二重にデバウンスしない）。
  // autoTuneToleranceは再実行せず、floodFillMaskEdgeAware（単一tolerance）→
  // 輪郭抽出のみ再実行する。表示値の同期はFieldConfirmAdjust側が担当するため
  // ここではDOMを直接触らず、内部状態(state.sensitivity)の更新のみ行う。
  function onSensitivityChange(value) {
    const val = Number(value) || DEFAULT_SENSITIVITY;
    state.sensitivity = val;

    if (!state.imageData || !state.gradientMap) return;

    _clearSensitivityDebounce();
    state.sensitivityDebounceTimer = setTimeout(() => {
      _reRunFromCache(val);
    }, SENSITIVITY_DEBOUNCE_MS);
  }

  function _reRunFromCache(tolerance) {
    const { imageData, gradientMap, seedX, seedY } = state;
    const w = imageData.width, h = imageData.height;

    const rawMask = FieldDetectAlgorithms.floodFillMaskEdgeAware(imageData, gradientMap, seedX, seedY, tolerance, EDGE_THRESHOLD);
    if (!rawMask) {
      // 確認・微調整画面は既に開いたまま（直前の有効な形を維持）。
      // スライダー操作中に毎回showDrawToastだと煩わしいため短めのtoastに留める。
      showToast('検出範囲が小さすぎるか大きすぎます。感度を調整してください。', 'amber');
      return;
    }
    const closedMask = FieldDetectAlgorithms.morphologyClose(rawMask, w, h, 1);
    _buildAndShowPreviewFromMask(closedMask, w, h);
  }

  // ─── mask → 輪郭抽出 → 単純化・矩形フィット → FieldConfirmAdjustへ引き渡し ───
  // Step5決定：EFD-1「四角形」選択（state.shapeMode === 'rect'）の場合のみ、
  // 検出結果を凸包→最小外接矩形（convexHull→minAreaRect）でフィットする。
  // 「複雑な形」（'complex'）は従来通りdouglasPeucker→snapNearRightAnglesで
  // 実際の輪郭の形を尊重する（6章の軽微な角度補正のみ、という方針を維持）。
  // Step3：プレビュー表示・確認画面フェーズの所有権はFieldConfirmAdjustに移管済み。
  // 初回検出成功時／感度スライダー再検出成功時のいずれもここに集約される。
  function _buildAndShowPreviewFromMask(mask, w, h) {
    const diag = Math.sqrt(w * w + h * h);
    // msqr内蔵の点削減（RDP）許容値
    const msqrTolerance = Math.max(1.5, diag * 0.0015);
    const contour = FieldDetectAlgorithms.traceContourMsqr(mask, w, h, msqrTolerance);
    if (contour.length < 3) {
      _onDetectFailure('輪郭を検出できませんでした。感度を調整してください。');
      return;
    }

    let snapped;
    let houseSnapInfo = null;

    if (state.shapeMode === 'rect') {
      // ─ 四角形選択時のみ：矩形フィット（形状全体を回転矩形へ差し替え） ─
      const hull = FieldDetectAlgorithms.convexHull(contour);
      snapped = hull.length >= 3 ? FieldDetectAlgorithms.minAreaRect(hull) : null;
      if (!snapped || snapped.length < 3) {
        _onDetectFailure('矩形を検出できませんでした。感度を調整するか、「複雑な形」をお試しください。');
        return;
      }

      // ハウス／加温選択時のみ：短辺(間口)を規格値に、長辺(奥行き)を1m単位に調整
      if (state.cultivationHint) {
        houseSnapInfo = _applyHouseSnap(snapped);
        if (houseSnapInfo) snapped = houseSnapInfo.corners;
      }
    } else {
      let eps = Math.max(2, diag * 0.003);
      let simplified = FieldDetectAlgorithms.douglasPeucker(contour, eps);
      // 頂点が多すぎる場合は簡略度を上げて再調整（最大4回）
      let guard = 0;
      while (simplified.length > 40 && guard < 4) {
        eps *= 1.8;
        simplified = FieldDetectAlgorithms.douglasPeucker(contour, eps);
        guard++;
      }
      if (simplified.length < 3) simplified = FieldDetectAlgorithms.convexHull(contour);

      snapped = FieldDetectAlgorithms.snapNearRightAngles(simplified, RIGHT_ANGLE_TOLERANCE_DEG);
      if (!snapped || snapped.length < 3) {
        _onDetectFailure('有効な形になりませんでした。感度を調整するか、手動描画をご利用ください。');
        return;
      }
    }

    // ラスタライズ時の縮小スケールを戻してから地図座標へ変換
    const scale = state.rasterScale || 1;
    const latlngs = snapped.map(p => map.containerPointToLatLng(L.point(p.x / scale, p.y / scale)));

    _setScopeVisible(false);
    FieldConfirmAdjust.open(latlngs, {
      source:           'auto',
      sensitivityValue: state.sensitivity,
      isRect:            state.shapeMode === 'rect',
      cultivationHint:   state.cultivationHint,
      houseSnapInfo:     houseSnapInfo,
    });
  }

  // ─── ハウス規格スナップ：矩形の短辺(間口)を規格幅に、長辺(奥行き)を1m単位に調整 ───
  // pixelCorners: minAreaRect()が返す4隅（ラスタキャンバスpixel座標、[p0,p1,p2,p3]の順で
  // p0→p1がU方向の辺、p1→p2がV方向の辺）。実距離(m)の計測にはlatlng変換とLeafletの
  // distanceTo()を使う（本ファイルはLeaflet依存が前提のため、ここで行う。
  // fieldDetectAlgorithms.js側はDOM/Leaflet非依存の純粋関数のみに留める）。
  // 戻り値: { corners: [新4隅(pixel座標)], widthM, depthM, widthSnapped } | null
  function _applyHouseSnap(pixelCorners) {
    const scale = state.rasterScale || 1;
    const toLatLng = (p) => map.containerPointToLatLng(L.point(p.x / scale, p.y / scale));

    const p0 = pixelCorners[0], p1 = pixelCorners[1], p2 = pixelCorners[2];
    const ll0 = toLatLng(p0), ll1 = toLatLng(p1), ll2 = toLatLng(p2);

    const edgeULenM = ll0.distanceTo(ll1); // p0→p1（U方向の辺）の実距離
    const edgeVLenM = ll1.distanceTo(ll2); // p1→p2（V方向の辺）の実距離
    if (!(edgeULenM > 0) || !(edgeVLenM > 0)) return null;

    const shortIsU = edgeULenM <= edgeVLenM;
    const dims = FieldDetectAlgorithms.snapHouseDimensions(
      shortIsU ? edgeULenM : edgeVLenM,
      shortIsU ? edgeVLenM : edgeULenM
    );

    const newULenM = shortIsU ? dims.width : dims.depth;
    const newVLenM = shortIsU ? dims.depth : dims.width;
    const scaleU = newULenM / edgeULenM;
    const scaleV = newVLenM / edgeVLenM;

    // pixel空間でp0を固定アンカーとし、U/V方向の辺の長さだけをスケールして再構成
    const uVec = { x: p1.x - p0.x, y: p1.y - p0.y };
    const uLenPx = Math.hypot(uVec.x, uVec.y);
    const uUnit = { x: uVec.x / uLenPx, y: uVec.y / uLenPx };
    const vVec = { x: p2.x - p1.x, y: p2.y - p1.y };
    const vLenPx = Math.hypot(vVec.x, vVec.y);
    const vUnit = { x: vVec.x / vLenPx, y: vVec.y / vLenPx };

    const newULenPx = uLenPx * scaleU;
    const newVLenPx = vLenPx * scaleV;

    const newP0 = { x: p0.x, y: p0.y };
    const newP1 = { x: newP0.x + uUnit.x * newULenPx, y: newP0.y + uUnit.y * newULenPx };
    const newP2 = { x: newP1.x + vUnit.x * newVLenPx, y: newP1.y + vUnit.y * newVLenPx };
    const newP3 = { x: newP0.x + vUnit.x * newVLenPx, y: newP0.y + vUnit.y * newVLenPx };

    return {
      corners:      [newP0, newP1, newP2, newP3],
      widthM:       dims.width,
      depthM:       dims.depth,
      widthSnapped: dims.widthSnapped,
    };
  }

  // ═══════════════════════════════════════════
  //  ラスタライズ：現在表示中のタイル画像をcanvasへ描き写す
  //  （Leaflet内部のタイル座標を再実装せず、DOM上の実描画位置＝
  //   getBoundingClientRect()を基準にすることで常に正しい位置になる）
  //
  //  仕様書4章：解析用キャンバスの最大解像度をmaxDimensionにキャップする
  //  （自動チューニングが複数回flood-fillを回しても実用速度を維持するため）。
  //  戻り値のscaleは「フル解像度→キャンバス解像度」への縮小率。
  //  シード座標・輪郭座標をlatlngに変換する際は、この逆数で元の解像度に戻す。
  // ═══════════════════════════════════════════

  function _rasterizeMapToCanvas(maxDimension = RASTER_MAX_DIMENSION) {
    const mapContainer = map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();
    const fullW = Math.max(1, Math.round(mapRect.width));
    const fullH = Math.max(1, Math.round(mapRect.height));

    const scale = Math.min(1, maxDimension / Math.max(fullW, fullH));
    const w = Math.max(1, Math.round(fullW * scale));
    const h = Math.max(1, Math.round(fullH * scale));

    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 透過タイルや未読込タイルがある場合の保険（自然な地表色に近い緑系）。
    // waitForTilesLoaded()により通常は未読込タイルは残っていないはずだが、
    // 画面端のタイルなど取りこぼしがあった場合の保険として維持する。
    ctx.fillStyle = '#7f9a72';
    ctx.fillRect(0, 0, w, h);

    const tileImgs = mapContainer.querySelectorAll('.leaflet-tile-pane img.leaflet-tile-loaded');
    tileImgs.forEach(img => {
      const r = img.getBoundingClientRect();
      const x = (r.left - mapRect.left) * scale;
      const y = (r.top  - mapRect.top)  * scale;
      const dw = r.width  * scale;
      const dh = r.height * scale;
      // 画面に一部でもかかっているタイルのみ描画（無駄な描画を避ける）
      if (x + dw < 0 || y + dh < 0 || x > w || y > h) return;
      try {
        ctx.drawImage(img, x, y, dw, dh);
      } catch (e) {
        // CORS未対応タイルが混ざっていた場合はスキップ（getImageData時に検知される）
      }
    });

    return { canvas, scale };
  }

  // ─── 公開API（Step5：start → beginDetectFlow にリネーム） ───
  return {
    beginDetectFlow,
    selectCultivation,
    selectShape,
    detect,
    cancelDetect,
    waitForTilesLoaded,
    ensureMinZoomForDetect,
    onSensitivityChange,
    backToTap,
    cancel,
    fallbackManual,
  };
})();