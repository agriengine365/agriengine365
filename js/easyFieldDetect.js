// ═══════════════════════════════════════════
//  EASY FIELD DETECT — 「かんたん圃場追加」
//  タップ地点を起点に、地図タイル（航空写真）をcanvas上で解析し、
//  flood-fill（色の近似領域拡張）で圃場らしき輪郭を自動検出する。
//
//  検出結果はあくまで「たたき台」。Leaflet.Editableで頂点をドラッグ
//  微調整してから、既存の保存フロー（onDrawPolygonComplete → showWizard）
//  にそのまま接続する。
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
//    flood-fillで作ったmask（Uint8Array）をアルファチャンネル画像に
//    変換してcanvasへ焼き込み、それをmsqrに渡して輪郭点列を得る
//    （自作Moore-Neighbor実装 _traceContour は精度検証用に末尾へ
//    dead codeとして残してあるが、現在は未使用）。
//    色の許容範囲（感度スライダー, state.sensitivity）は_floodFillMask
//    側のパラメータであり、msqr側のtolerance（点削減用の距離許容値）
//    とは別物なので、感度スライダーの挙動はこの変更による影響を受けない。
// ═══════════════════════════════════════════

const EasyFieldDetect = (() => {

  // ─── 内部状態 ───
  const state = {
    shapeMode:    null,   // 'rect' | 'complex'
    tapLatLng:    null,   // L.LatLng（検出対象地点）
    canvas:       null,   // ラスタライズ済みcanvas（感度変更時の再利用用）
    imageData:    null,   // canvasから取得したImageData（同上）
    seedX:        0,
    seedY:        0,
    sensitivity:  28,     // 色の許容範囲（デフォルト）
    previewLayer: null,   // L.Polygon（Editable編集対象）
    detecting:    false,
  };

  const DEFAULT_SENSITIVITY = 28;

  // ═══════════════════════════════════════════
  //  フェーズ切替（map-draw-dialog内の他フェーズと排他）
  // ═══════════════════════════════════════════

  const ALL_PHASE_IDS = [
    'draw-phase-drawing',
    'draw-phase-wizard',
    'efd-phase-shape',
    'efd-phase-tap',
    'efd-phase-preview',
  ];

  function _showPhase(targetId) {
    ALL_PHASE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = (id !== targetId);
    });
  }

  function _hideAllPhases() {
    ALL_PHASE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function _openDialog() {
    const dlg = document.getElementById('map-draw-dialog');
    if (dlg) {
      dlg.hidden = false;
      dlg.removeAttribute('aria-hidden');
    }
    if (typeof closePage === 'function') closePage();
    document.documentElement.classList.add('draw-dialog-active');
  }

  function _closeDialog() {
    const dlg = document.getElementById('map-draw-dialog');
    if (dlg) {
      if (typeof _blurIfInside === 'function') _blurIfInside(dlg);
      dlg.hidden = true;
      dlg.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('draw-dialog-active');
  }

  function _setScopeVisible(visible) {
    const el = document.getElementById('draw-scope');
    if (el) el.classList.toggle('active', visible);
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

  // ═══════════════════════════════════════════
  //  公開フロー：開始 → 形状選択 → タップ検出 → プレビュー確定
  // ═══════════════════════════════════════════

  function start() {
    if (typeof PolygonDraw !== 'undefined' && PolygonDraw.isActive()) {
      PolygonDraw.cancel();
    }
    _cleanupPreviewLayer();
    state.shapeMode   = null;
    state.tapLatLng   = null;
    state.canvas      = null;
    state.imageData   = null;
    state.sensitivity = DEFAULT_SENSITIVITY;
    state.detecting   = false;

    drawnItems.clearLayers();
    currentPolygon  = null;
    currentAreaData = null;
    if (typeof resetStats === 'function') resetStats();

    _openDialog();
    _showPhase('efd-phase-shape');
    showToast('形を選んでください', '', 2400);
  }

  function selectShape(mode) {
    state.shapeMode = mode;
    _showPhase('efd-phase-tap');
    _setScopeVisible(true);
    updateMapDrawHint('地図を動かして中央を圃場に合わせてください');
    showDrawToast('地図をドラッグして検出したい圃場の中央にスコープを合わせ、「この地点で検出」をタップしてください');
  }

  function backToTap() {
    _cleanupPreviewLayer();
    _showPhase('efd-phase-tap');
    _setScopeVisible(true);
    state.sensitivity = DEFAULT_SENSITIVITY;
    showDrawToast('地図を動かして再度合わせ、「この地点で検出」をタップしてください');
  }

  function cancel() {
    _cleanupPreviewLayer();
    _setScopeVisible(false);
    _hideAllPhases();
    _closeDialog();
    if (typeof setSheet === 'function') setSheet('half');
    showToast('かんたん追加をキャンセルしました');
  }

  function fallbackManual() {
    _cleanupPreviewLayer();
    _setScopeVisible(false);
    _hideAllPhases();
    _closeDialog();
    showToast('手動描画に切り替えました', 'amber');
    if (typeof PolygonDraw !== 'undefined') PolygonDraw.start();
  }

  // ─── 検出実行 ───
  function detect() {
    if (state.detecting) return;
    state.detecting = true;
    console.log('[EFD-DEBUG] detect() 開始');

    const btn = document.getElementById('efd-detect-btn');
    if (btn) { btn.disabled = true; btn.textContent = '検出中...'; }

    // ─── ここから関数全体をtry/finallyで包み、state.detectingのリセット漏れを防ぐ ───
    // （以前は_getScopeLatLng()やrequestAnimationFrameの登録がtryの外にあり、
    //   そこで例外が出るとstate.detectingがtrueのまま固まってしまう不具合があった）
    try {
      state.tapLatLng = _getScopeLatLng();
      console.log('[EFD-DEBUG] tapLatLng取得完了', state.tapLatLng);

      // レイアウト確定を1フレーム待ってからラスタライズ（描画直後の座標ズレ対策）
      requestAnimationFrame(() => {
        try {
          console.log('[EFD-DEBUG] rAF発火');
          const canvas = _rasterizeMapToCanvas();
          console.log('[EFD-DEBUG] ラスタライズ完了 canvas=', canvas.width, canvas.height);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          let imageData;
          try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            console.log('[EFD-DEBUG] getImageData完了');
          } catch (secErr) {
            console.warn('[EasyFieldDetect] getImageData失敗（CORS制限の可能性）:', secErr);
            _onDetectFailure('タイル画像を解析できませんでした（ブラウザのセキュリティ制限）。ページを再読み込みしてから、もう一度お試しください。');
            return;
          }

          const seedPt = map.latLngToContainerPoint(state.tapLatLng);
          const seedX = Math.round(seedPt.x);
          const seedY = Math.round(seedPt.y);
          if (seedX < 0 || seedY < 0 || seedX >= canvas.width || seedY >= canvas.height) {
            _onDetectFailure('検出地点が画面外です。地図を動かしてやり直してください。');
            return;
          }

          state.canvas    = canvas;
          state.imageData = imageData;
          state.seedX     = seedX;
          state.seedY     = seedY;

          _runDetectionAndPreview(state.sensitivity);
        } catch (e) {
          console.error('[EasyFieldDetect] 検出エラー（rAF内）:', e);
          _onDetectFailure('検出中にエラーが発生しました。手動描画をご利用ください。');
        } finally {
          state.detecting = false;
          const btn2 = document.getElementById('efd-detect-btn');
          if (btn2) { btn2.disabled = false; btn2.textContent = 'この地点で検出'; }
          console.log('[EFD-DEBUG] state.detecting をリセット（rAFコールバック終了）');
        }
      });
    } catch (e) {
      // _getScopeLatLng() などrAF登録前の同期エラーをここで確実に捕捉し、
      // state.detectingが固まったままにならないようにする
      console.error('[EasyFieldDetect] 検出エラー（rAF登録前・同期処理）:', e);
      _onDetectFailure('検出中にエラーが発生しました。手動描画をご利用ください。');
      state.detecting = false;
      const btn3 = document.getElementById('efd-detect-btn');
      if (btn3) { btn3.disabled = false; btn3.textContent = 'この地点で検出'; }
      console.log('[EFD-DEBUG] state.detecting をリセット（同期エラー時）');
    }
  }

  function _onDetectFailure(message) {
    showDrawToast(message, 'amber');
  }

  // ─── 感度スライダー変更時：ラスタライズ済みデータを使い回して再検出 ───
  function onSensitivityChange(value) {
    state.sensitivity = Number(value) || DEFAULT_SENSITIVITY;
    const valEl = document.getElementById('efd-sensitivity-val');
    if (valEl) valEl.textContent = String(state.sensitivity);
    if (!state.imageData) return;
    _runDetectionAndPreview(state.sensitivity);
  }

  // ─── flood-fill→輪郭抽出→（矩形フィット or 単純化）→プレビュー表示 ───
  function _runDetectionAndPreview(tolerance) {
    const { imageData, seedX, seedY } = state;
    const w = imageData.width, h = imageData.height;

    const mask = _floodFillMask(imageData, seedX, seedY, tolerance);
    console.log('[EFD-DEBUG] floodFillMask完了 mask=', mask ? `${mask.length}px中${mask.reduce((a,b)=>a+b,0)}px検出` : 'null(失敗)');
    if (!mask) {
      _setPreviewStatus('検出範囲が小さすぎるか大きすぎます。検出感度を調整してください。', true);
      return;
    }

    const diag = Math.sqrt(w * w + h * h);
    // msqr内蔵の点削減（RDP）許容値。自作_douglasPeuckerのepsより小さめにして
    // 輪郭の精度を優先し、頂点数の最終調整は後段のcomplexモード側ロジックに任せる。
    const msqrTolerance = Math.max(1.5, diag * 0.0015);
    const contour = _traceContourMsqr(mask, w, h, msqrTolerance);
    console.log('[EFD-DEBUG] msqr輪郭抽出完了 contour.length=', contour.length);
    if (contour.length < 3) {
      _setPreviewStatus('輪郭を検出できませんでした。感度を上げてみてください。', true);
      return;
    }

    let pixelPoints;
    if (state.shapeMode === 'rect') {
      const hull = _convexHull(contour);
      pixelPoints = hull.length >= 3 ? _minAreaRect(hull) : null;
      if (!pixelPoints) {
        _setPreviewStatus('矩形をフィットできませんでした。感度を調整してください。', true);
        return;
      }
    } else {
      let eps = Math.max(2, diag * 0.003);
      let simplified = _douglasPeucker(contour, eps);
      // 頂点が多すぎる場合は簡略度を上げて再調整（最大4回）
      let guard = 0;
      while (simplified.length > 40 && guard < 4) {
        eps *= 1.8;
        simplified = _douglasPeucker(contour, eps);
        guard++;
      }
      if (simplified.length < 3) simplified = _convexHull(contour);
      pixelPoints = simplified;
    }

    if (!pixelPoints || pixelPoints.length < 3) {
      _setPreviewStatus('有効な形になりませんでした。感度を調整するか、手動描画をご利用ください。', true);
      return;
    }

    const latlngs = pixelPoints.map(p => map.containerPointToLatLng(L.point(p.x, p.y)));
    _showPreviewLayer(latlngs);
    _setScopeVisible(false);
    _showPhase('efd-phase-preview');

    // 面積の目安を表示（map.js のcalcPolygonAreaを再利用）
    try {
      const areaSqm = calcPolygonArea(latlngs);
      const ha = (areaSqm / 10000).toFixed(3);
      _setPreviewStatus(`検出面積の目安: 約 ${ha} ha（${latlngs.length}頂点）`, false);
    } catch (e) {
      _setPreviewStatus(`頂点数: ${latlngs.length}`, false);
    }
  }

  function _setPreviewStatus(text, isWarning) {
    const el = document.getElementById('efd-preview-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('efd-preview-status-warn', !!isWarning);
  }

  // ─── プレビューレイヤー生成／更新（Leaflet.Editableで頂点編集可能に） ───
  function _showPreviewLayer(latlngs) {
    _cleanupPreviewLayer();

    const poly = L.polygon(latlngs, {
      color:       (typeof CONFIG !== 'undefined' && CONFIG.DRAW_COLOR) || '#4ade80',
      weight:      2,
      fillOpacity: 0.15,
      interactive: true,
    }).addTo(map);

    if (typeof L.Editable !== 'undefined') {
      if (!map.editTools) map.editTools = new L.Editable(map);
      poly.enableEdit();
    } else {
      console.warn('[EasyFieldDetect] Leaflet.Editableが読み込まれていません。頂点の手動微調整はできません。');
    }

    state.previewLayer = poly;
  }

  function _cleanupPreviewLayer() {
    if (state.previewLayer) {
      try {
        if (state.previewLayer.editEnabled && state.previewLayer.editEnabled()) {
          state.previewLayer.disableEdit();
        }
      } catch (e) { /* noop */ }
      map.removeLayer(state.previewLayer);
      state.previewLayer = null;
    }
  }

  // ─── 確定：既存の保存フロー（onDrawPolygonComplete）に接続 ───
  function confirm() {
    if (!state.previewLayer) return;

    const rawLatLngs = state.previewLayer.getLatLngs()[0];
    if (!rawLatLngs || rawLatLngs.length < 3) {
      showDrawToast('頂点が足りません（3点以上必要）', 'amber');
      return;
    }

    const poly = L.polygon(rawLatLngs.map(ll => [ll.lat, ll.lng]), {
      color:       (typeof CONFIG !== 'undefined' && CONFIG.DRAW_COLOR) || '#4ade80',
      weight:      2,
      fillOpacity: 0.15,
      interactive: true,
    });

    _cleanupPreviewLayer();
    _setScopeVisible(false);
    _hideAllPhases();

    drawnItems.clearLayers();
    drawnItems.addLayer(poly);
    currentPolygon = poly;

    showDrawToast('圃場の形を確定しました', 'green');
    onDrawPolygonComplete(poly); // map.js: 統計計算 → showWizard()
  }

  // ═══════════════════════════════════════════
  //  ラスタライズ：現在表示中のタイル画像をcanvasへ描き写す
  //  （Leaflet内部のタイル座標を再実装せず、DOM上の実描画位置＝
  //   getBoundingClientRect()を基準にすることで常に正しい位置になる）
  // ═══════════════════════════════════════════

  function _rasterizeMapToCanvas() {
    const mapContainer = map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();
    const w = Math.max(1, Math.round(mapRect.width));
    const h = Math.max(1, Math.round(mapRect.height));

    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 透過タイルや未読込タイルがある場合の保険（自然な地表色に近い緑系）
    ctx.fillStyle = '#7f9a72';
    ctx.fillRect(0, 0, w, h);

    const tileImgs = mapContainer.querySelectorAll('.leaflet-tile-pane img.leaflet-tile-loaded');
    tileImgs.forEach(img => {
      const r = img.getBoundingClientRect();
      const x = r.left - mapRect.left;
      const y = r.top  - mapRect.top;
      // 画面に一部でもかかっているタイルのみ描画（無駄な描画を避ける）
      if (x + r.width < 0 || y + r.height < 0 || x > w || y > h) return;
      try {
        ctx.drawImage(img, x, y, r.width, r.height);
      } catch (e) {
        // CORS未対応タイルが混ざっていた場合はスキップ（getImageData時に検知される）
      }
    });

    return canvas;
  }

  // ═══════════════════════════════════════════
  //  Flood Fill（4連結・色距離ベース）
  //  戻り値: Uint8Array（1=領域内）または null（範囲異常時）
  // ═══════════════════════════════════════════

  function _floodFillMask(imageData, seedX, seedY, tolerance) {
    const w = imageData.width, h = imageData.height;
    const data = imageData.data;

    // シード色：タップ地点周辺5x5の平均色（ノイズ対策）
    let sr = 0, sg = 0, sb = 0, sc = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = seedX + dx, y = seedY + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = (y * w + x) * 4;
        sr += data[i]; sg += data[i + 1]; sb += data[i + 2];
        sc++;
      }
    }
    if (sc === 0) return null;
    const seedR = sr / sc, seedG = sg / sc, seedB = sb / sc;
    const tol2 = tolerance * tolerance;

    const mask = new Uint8Array(w * h);
    const stack = [seedY * w + seedX];
    mask[seedY * w + seedX] = 1;

    let count = 0;
    const maxCount = Math.floor(w * h * 0.65); // 許容範囲が広すぎる（空全体に拡散等）場合のガード

    while (stack.length) {
      const idx = stack.pop();
      count++;
      if (count > maxCount) return null;

      const x = idx % w, y = (idx / w) | 0;
      // 4方向
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (mask[nIdx]) continue;
        const di = nIdx * 4;
        const dr = data[di] - seedR, dg = data[di + 1] - seedG, db = data[di + 2] - seedB;
        const dist2 = dr * dr + dg * dg + db * db;
        if (dist2 <= tol2) {
          mask[nIdx] = 1;
          stack.push(nIdx);
        }
      }
    }

    if (count < 25) return null; // 小さすぎる（誤検出扱い）
    return mask;
  }

  // ═══════════════════════════════════════════
  //  輪郭抽出（msqr / Marching Squares）
  //  flood-fillのmask（Uint8Array, 1=領域内）をアルファチャンネル画像に
  //  変換し、msqr（js/vendor/msqr.min.js）に渡して輪郭点列を得る。
  // ═══════════════════════════════════════════

  // ─── mask（Uint8Array）→ アルファチャンネルのみのcanvas ───
  // msqrは「アルファが閾値を超えるピクセル＝形状の内側」として輪郭を追跡するため、
  // 色情報は不要（RGBは0固定でよく、mask=1の画素だけalpha=255にする）。
  function _maskToAlphaCanvas(mask, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0, n = mask.length; i < n; i++) {
      data[i * 4 + 3] = mask[i] ? 255 : 0; // alphaのみ設定（RGBは初期値0のまま）
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  function _traceContourMsqr(mask, w, h, tolerance) {
    if (typeof MSQR === 'undefined') {
      console.error('[EasyFieldDetect] msqrライブラリが読み込まれていません（js/vendor/msqr.min.js）。');
      return [];
    }
    try {
      const canvas = _maskToAlphaCanvas(mask, w, h);
      const points = MSQR(canvas, {
        tolerance: tolerance, // 点削減（RDP）の距離許容値（px）
        align:     true,      // 輪郭のガタつきをならす補正
      });
      return points || [];
    } catch (e) {
      console.error('[EasyFieldDetect] msqrによる輪郭抽出でエラー:', e);
      return [];
    }
  }

  // ═══════════════════════════════════════════
  //  輪郭抽出（Moore-Neighbor Tracing）─ 旧実装（現在未使用）
  //  上記msqr版に置き換え済み。ロールバック用に残置。
  //  4連結マスクの外周を8連結でトレースし、ピクセル座標列を返す
  // ═══════════════════════════════════════════

  const _DIRS = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1],
  ]; // N, NE, E, SE, S, SW, W, NW（時計回り）

  function _traceContour(mask, w, h) {
    const get = (x, y) => (x >= 0 && x < w && y >= 0 && y < h) ? mask[y * w + x] : 0;

    let sx = -1, sy = -1;
    for (let y = 0; y < h && sx < 0; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x]) { sx = x; sy = y; break; }
      }
    }
    if (sx < 0) return [];

    const contour = [{ x: sx, y: sy }];
    let cx = sx, cy = sy;
    let backtrackIdx = 6; // W（開始点はラスタスキャンで見つかるため、西側は必ず背景）
    const maxIter = w * h * 4 + 16;

    for (let iter = 0; iter < maxIter; iter++) {
      let found = false;
      for (let k = 1; k <= 8; k++) {
        const idx = (backtrackIdx + k) % 8;
        const nx = cx + _DIRS[idx][0];
        const ny = cy + _DIRS[idx][1];
        if (get(nx, ny)) {
          cx = nx; cy = ny;
          backtrackIdx = (idx + 6) % 8;
          contour.push({ x: cx, y: cy });
          found = true;
          break;
        }
      }
      if (!found) break; // 孤立ピクセル
      if (cx === sx && cy === sy) break; // 開始点に帰還
    }

    return contour;
  }

  // ═══════════════════════════════════════════
  //  Douglas-Peucker 単純化
  // ═══════════════════════════════════════════

  function _douglasPeucker(points, epsilon) {
    if (points.length < 3) return points.slice();

    function perpDist(p, a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
      const projX = a.x + t * dx, projY = a.y + t * dy;
      return Math.hypot(p.x - projX, p.y - projY);
    }

    function rdp(pts) {
      if (pts.length < 3) return pts;
      let maxDist = -1, maxIdx = 0;
      const a = pts[0], b = pts[pts.length - 1];
      for (let i = 1; i < pts.length - 1; i++) {
        const d = perpDist(pts[i], a, b);
        if (d > maxDist) { maxDist = d; maxIdx = i; }
      }
      if (maxDist > epsilon) {
        const left  = rdp(pts.slice(0, maxIdx + 1));
        const right = rdp(pts.slice(maxIdx));
        return left.slice(0, -1).concat(right);
      }
      return [a, b];
    }

    const closed = points.length > 2 &&
      points[0].x === points[points.length - 1].x &&
      points[0].y === points[points.length - 1].y;
    const src = closed ? points.slice(0, -1) : points;

    // 閉曲線をそのまま端点2つでDPすると始点=終点になり潰れるため、
    // 最も離れた2点で分割して両半分を単純化してから結合する。
    let farA = 0, farB = 1, maxD = -1;
    for (let i = 0; i < src.length; i++) {
      for (let j = i + 1; j < src.length; j++) {
        const dx = src[i].x - src[j].x, dy = src[i].y - src[j].y;
        const d = dx * dx + dy * dy;
        if (d > maxD) { maxD = d; farA = i; farB = j; }
      }
      // 大きな輪郭での全探索は重いため間引きサンプリング
      if (src.length > 300 && i > 300) break;
    }
    if (farA > farB) { const t = farA; farA = farB; farB = t; }

    const half1 = src.slice(farA, farB + 1);
    const half2 = src.slice(farB).concat(src.slice(0, farA + 1));

    const s1 = rdp(half1);
    const s2 = rdp(half2);

    const result = s1.slice(0, -1).concat(s2.slice(0, -1));
    return result.length >= 3 ? result : src;
  }

  // ═══════════════════════════════════════════
  //  凸包（Andrew's Monotone Chain）
  // ═══════════════════════════════════════════

  function _convexHull(points) {
    const pts = points.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
    // 重複点を除去
    const uniq = [];
    for (const p of pts) {
      if (uniq.length === 0 || uniq[uniq.length - 1].x !== p.x || uniq[uniq.length - 1].y !== p.y) {
        uniq.push(p);
      }
    }
    if (uniq.length < 3) return uniq;

    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower = [];
    for (const p of uniq) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = uniq.length - 1; i >= 0; i--) {
      const p = uniq[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  // ═══════════════════════════════════════════
  //  最小外接矩形（Rotating Calipers）
  //  凸包の各辺に沿う向きを順に試し、面積最小の矩形を採用
  // ═══════════════════════════════════════════

  function _minAreaRect(hull) {
    if (hull.length < 3) return null;
    let best = null;

    for (let i = 0; i < hull.length; i++) {
      const a = hull[i];
      const b = hull[(i + 1) % hull.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      // この辺の方向を基準に全点を回転座標系へ投影
      const ux = dx / len, uy = dy / len; // 辺方向
      const vx = -uy, vy = ux;            // 法線方向

      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
      for (const p of hull) {
        const u = p.x * ux + p.y * uy;
        const v = p.x * vx + p.y * vy;
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      const area = (maxU - minU) * (maxV - minV);
      if (!best || area < best.area) {
        best = { area, minU, maxU, minV, maxV, ux, uy, vx, vy };
      }
    }
    if (!best) return null;

    // (u,v) → (x,y) へ戻して4隅を復元
    const corner = (u, v) => ({
      x: u * best.ux + v * best.vx,
      y: u * best.uy + v * best.vy,
    });
    return [
      corner(best.minU, best.minV),
      corner(best.maxU, best.minV),
      corner(best.maxU, best.maxV),
      corner(best.minU, best.maxV),
    ];
  }

  // ─── 公開API ───
  return {
    start,
    selectShape,
    detect,
    onSensitivityChange,
    backToTap,
    confirm,
    cancel,
    fallbackManual,
  };
})();