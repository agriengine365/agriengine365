// ═══════════════════════════════════════════
//  FIELD DETECT ALGORITHMS — 圃場検出アルゴリズム（純粋関数群）
//
//  「圃場追加フロー刷新 仕様書」8章・9章に基づく新規ファイル。
//  DOM/Leaflet/UIに一切依存しない純粋関数のみで構成する
//  （imageData・mask・座標配列を受け取り、同様のデータを返すだけ）。
//  ユニットテスト・単体console検証をこのファイル単体で行えることを狙いとする。
//
//  内訳：
//   - 既存移設（ロジック無改修）: traceContourMsqr / douglasPeucker /
//                                convexHull / minAreaRect
//     旧 js/easyFieldDetect.js の _traceContourMsqr() 等から、
//     ロジックを一切変更せずそのまま移設（呼び出し元での結果差異なし）。
//   - 新規（精度改善、仕様書4章）: computeGradientMap / computeSeedColor /
//     floodFillMaskEdgeAware / morphologyClose / scoreMaskPlausibility /
//     autoTuneTolerance / snapNearRightAngles
//   - 新規（検出精度改善セッション、クロップ高解像度化に伴う追加）:
//     morphologyOpen / keepSeedComponentMask / computeAdaptiveEdgeThreshold /
//     snapRectEdgesToGradient
//
//  依存：輪郭抽出（traceContourMsqr）のみ msqr（js/vendor/msqr.min.js）に依存。
//  それ以外の関数は外部ライブラリ非依存。
// ═══════════════════════════════════════════

const FieldDetectAlgorithms = (() => {

  // ═══════════════════════════════════════════
  //  既存移設（ロジック無改修）
  //  旧 easyFieldDetect.js の _traceContourMsqr / _douglasPeucker /
  //  _convexHull / _minAreaRect と完全に同一ロジック。
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

  function traceContourMsqr(mask, w, h, tolerance) {
    if (typeof MSQR === 'undefined') {
      console.error('[FieldDetectAlgorithms] msqrライブラリが読み込まれていません（js/vendor/msqr.min.js）。');
      return [];
    }
    try {
      const canvas = _maskToAlphaCanvas(mask, w, h);
      const shapes = MSQR(canvas, {
        tolerance: tolerance, // 点削減（RDP）の距離許容値（px）
        align:     true,      // 輪郭のガタつきをならす補正
      });
      // MSQRは「複数形状」に対応するため、戻り値は形状(輪郭点列)の配列。
      // maxShapes未指定（デフォルト1）なので shapes.length は 0 か 1 のいずれかで、
      // 実際の輪郭点列は shapes[0] に入っている（shapesそのものではない）。
      if (!shapes || shapes.length === 0) return [];
      return shapes[0] || [];
    } catch (e) {
      console.error('[FieldDetectAlgorithms] msqrによる輪郭抽出でエラー:', e);
      return [];
    }
  }

  // ─── Douglas-Peucker 単純化 ───
  function douglasPeucker(points, epsilon) {
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

  // ─── 凸包（Andrew's Monotone Chain） ───
  function convexHull(points) {
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

  // ─── 最小外接矩形（Rotating Calipers） ───
  // 凸包の各辺に沿う向きを順に試し、面積最小の矩形を採用
  function minAreaRect(hull) {
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

  // ═══════════════════════════════════════════
  //  新規：精度改善（仕様書4章）
  // ═══════════════════════════════════════════

  // ─── 中央値ヘルパー ───
  function _median(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // ─── シード色：中央値ベース（外れ値・影の筋に頑健。旧実装のmean平均から変更） ───
  function computeSeedColor(imageData, seedX, seedY, radius = 2) {
    const w = imageData.width, h = imageData.height;
    const data = imageData.data;
    const rs = [], gs = [], bs = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = seedX + dx, y = seedY + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = (y * w + x) * 4;
        rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
      }
    }
    if (rs.length === 0) return null;
    return { r: _median(rs), g: _median(gs), b: _median(bs) };
  }

  // ─── 勾配マップ（Sobel、輝度ベース） ───
  // 戻り値: Float32Array(w*h)。値が大きいほど強いエッジ（陰影境界・隣接農地境界など）。
  function computeGradientMap(imageData) {
    const w = imageData.width, h = imageData.height;
    const data = imageData.data;

    // グレースケール化（輝度、ITU-R BT.601相当の係数）
    const gray = new Float32Array(w * h);
    for (let i = 0, n = w * h; i < n; i++) {
      const di = i * 4;
      gray[i] = data[di] * 0.299 + data[di + 1] * 0.587 + data[di + 2] * 0.114;
    }

    // 範囲外は端のピクセルを複製して参照（クランプ）
    const at = (x, y) => {
      const cx = x < 0 ? 0 : (x >= w ? w - 1 : x);
      const cy = y < 0 ? 0 : (y >= h ? h - 1 : y);
      return gray[cy * w + cx];
    };

    const gradient = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx =
          -at(x - 1, y - 1) + at(x + 1, y - 1) +
          -2 * at(x - 1, y) + 2 * at(x + 1, y) +
          -at(x - 1, y + 1) + at(x + 1, y + 1);
        const gy =
          -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
          at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
        gradient[y * w + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return gradient;
  }

  // ─── Flood Fill（エッジ考慮版）：色距離 AND 勾配が閾値以下、の条件で領域拡張 ───
  // シード色は中央値ベース（computeSeedColor）。
  // gradientMapを渡すことで、陰影の変化があっても「強いエッジを跨がない」制約が働き、
  // 隣接農地との色類似による誤拡張を抑える。
  // 戻り値: Uint8Array（1=領域内）または null（範囲異常・シード無効時）
  function floodFillMaskEdgeAware(imageData, gradientMap, seedX, seedY, colorTolerance, edgeThreshold) {
    const w = imageData.width, h = imageData.height;
    const data = imageData.data;

    const seedColor = computeSeedColor(imageData, seedX, seedY, 2);
    if (!seedColor) return null;
    const tol2 = colorTolerance * colorTolerance;

    const mask = new Uint8Array(w * h);
    const startIdx = seedY * w + seedX;
    if (startIdx < 0 || startIdx >= mask.length) return null;
    mask[startIdx] = 1;
    const stack = [startIdx];

    let count = 0;
    const maxCount = Math.floor(w * h * 0.65); // 全体の65%超過は誤検出扱い（旧実装踏襲）

    while (stack.length) {
      const idx = stack.pop();
      count++;
      if (count > maxCount) return null;

      const x = idx % w, y = (idx / w) | 0;
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (mask[nIdx]) continue;

        // エッジ判定：強い勾配（隣接農地の境界線・畦道の影など）を跨ぐ拡張は行わない
        if (gradientMap && gradientMap[nIdx] > edgeThreshold) continue;

        const di = nIdx * 4;
        const dr = data[di] - seedColor.r, dg = data[di + 1] - seedColor.g, db = data[di + 2] - seedColor.b;
        const dist2 = dr * dr + dg * dg + db * db;
        if (dist2 <= tol2) {
          mask[nIdx] = 1;
          stack.push(nIdx);
        }
      }
    }

    if (count < 25) return null; // 小さすぎる（誤検出扱い、旧実装踏襲）
    return mask;
  }

  // ─── モルフォロジー・クロージング（3x3膨張→収縮）：ノイズ・小さな穴を除去 ───
  // 境界はクランプ（端のピクセルを複製）して扱うため、canvas端に接する領域が
  // 不当に浸食されることはない。
  function _clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  function _getClamped(mask, w, h, x, y) {
    const cx = _clamp(x, 0, w - 1);
    const cy = _clamp(y, 0, h - 1);
    return mask[cy * w + cx];
  }

  function _dilateOnce(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = 0;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (_getClamped(mask, w, h, x + dx, y + dy)) { hit = 1; break; }
          }
        }
        out[y * w + x] = hit;
      }
    }
    return out;
  }

  function _erodeOnce(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let allSet = 1;
        for (let dy = -1; dy <= 1 && allSet; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!_getClamped(mask, w, h, x + dx, y + dy)) { allSet = 0; break; }
          }
        }
        out[y * w + x] = allSet;
      }
    }
    return out;
  }

  function morphologyClose(mask, w, h, iterations = 1) {
    let cur = mask;
    for (let i = 0; i < iterations; i++) {
      cur = _dilateOnce(cur, w, h);
      cur = _erodeOnce(cur, w, h);
    }
    return cur;
  }

  // ─── モルフォロジー・オープニング（3x3収縮→膨張）：隣接農地へのリーク橋を切断 ───
  // 検出精度改善セッションで追加。closeの前段に挟むことで、色類似による
  // 細い「橋」（隣接畑・畦道への漏れ）を切断してから、closeで小さな穴を埋める。
  function morphologyOpen(mask, w, h, iterations = 1) {
    let cur = mask;
    for (let i = 0; i < iterations; i++) {
      cur = _erodeOnce(cur, w, h);
      cur = _dilateOnce(cur, w, h);
    }
    return cur;
  }

  // ─── シード連結成分のみ抽出（4連結。floodFillMaskEdgeAwareと同じ隣接定義） ───
  // open/close適用後、万一シードと繋がっていない別成分（分離した葉・再結合した
  // 別ブロブ等）が紛れ込んでいた場合に、シードを含む一塊だけへ絞り込む保険。
  function keepSeedComponentMask(mask, w, h, seedX, seedY) {
    const startIdx = seedY * w + seedX;
    if (startIdx < 0 || startIdx >= mask.length || !mask[startIdx]) return mask;

    const out = new Uint8Array(w * h);
    const stack = [startIdx];
    out[startIdx] = 1;

    while (stack.length) {
      const idx = stack.pop();
      const x = idx % w, y = (idx / w) | 0;
      const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (out[nIdx] || !mask[nIdx]) continue;
        out[nIdx] = 1;
        stack.push(nIdx);
      }
    }
    return out;
  }

  // ─── 妥当性スコア（0〜1）：充填率0.7 + 凸性0.3（仕様書4章・確定配分） ───
  function _trapezoidScore(v, x0, x1, x2, x3) {
    if (v <= x0 || v >= x3) return 0;
    if (v < x1) return (v - x0) / (x1 - x0);
    if (v <= x2) return 1;
    return (x3 - v) / (x3 - x2);
  }

  function _sampledForegroundPoints(mask, w, h, stride) {
    const pts = [];
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        if (mask[y * w + x]) pts.push({ x, y });
      }
    }
    return pts;
  }

  function _polygonArea(points) {
    if (points.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      sum += a.x * b.y - b.x * a.y;
    }
    return Math.abs(sum) / 2;
  }

  function scoreMaskPlausibility(mask, w, h) {
    let count = 0;
    for (let i = 0, n = mask.length; i < n; i++) if (mask[i]) count++;
    const total = w * h;
    const fillRatio = total > 0 ? count / total : 0;

    // fillScore：充填率が妥当レンジ(目安0.05〜0.6)で満点、
    // maxCountガード(0.65)に近づくにつれ自然に減点される台形関数
    const fillScore = _trapezoidScore(fillRatio, 0.02, 0.05, 0.6, 0.7);

    // convexityScore：サンプリングした前景点の凸包面積比。
    // 0.3未満（棒状に伸びた明らかな誤検出）のみ大きくペナルティ。
    // 6章の方針（矩形化廃止・いびつな形を尊重）に合わせ、通常のいびつな畑は減点しない。
    let convexityScore = 1;
    const points = _sampledForegroundPoints(mask, w, h, 3);
    if (points.length >= 3) {
      const hull = convexHull(points);
      const hullArea = _polygonArea(hull);
      if (hullArea > 0) {
        const ratio = Math.min(1, count / hullArea);
        convexityScore = ratio < 0.3 ? (ratio / 0.3) * 0.5 : 1;
      }
    }

    return fillScore * 0.7 + convexityScore * 0.3;
  }

  // ─── 1フレーム分だけイベントループへ制御を返す ───
  // ブラウザではrequestAnimationFrame、それが無い環境（Node等でのテスト実行時）は
  // setTimeout(0)にフォールバックする。
  function _yieldFrame() {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  // ─── シード点中心性ファクター（検出感度改善セッションで追加） ───
  // 「タップした場所と違う範囲・違う圃場が検出される」対策。
  // scoreMaskPlausibility()（仕様書4章・充填率0.7＋凸性0.3の確定配分）自体は
  // 変更せず、autoTuneToleranceの候補比較時にだけ、シード点(タップ位置)が
  // マスクの重心からどれだけ離れているかを掛け算のペナルティとして加味する。
  // タップ位置は必ずシード連結成分内（floodFillの起点）なので通常は重心付近に
  // なるはずで、大きくズレる＝隣接する別の圃場側へリークして採用された可能性が高い。
  // 戻り値は0〜1（1=シード点が重心にほぼ一致、0に近いほど大きくズレている）。
  function _seedLocalityFactor(mask, w, h, seedX, seedY, stride = 3) {
    let count = 0, sumX = 0, sumY = 0;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        if (mask[y * w + x]) { count++; sumX += x; sumY += y; }
      }
    }
    if (count === 0) return 0;

    const cx = sumX / count, cy = sumY / count;
    const dist = Math.hypot(seedX - cx, seedY - cy);

    // サンプリング間引き分を補正した実面積相当から等価半径を算出
    const area = count * stride * stride;
    const equivRadius = Math.sqrt(area / Math.PI);
    if (equivRadius < 1e-6) return 1;

    // 半径の1.5倍離れるまでは緩やかに減点、それ以上ズレていたら別領域とみなし0近くまで落とす
    const ratio = dist / (equivRadius * 1.5);
    return _clamp(1 - ratio, 0, 1);
  }

  // ─── 自動チューニング：複数のtoleranceを内部で試し、最良のmask/toleranceを選択 ───
  // 戻り値: { mask, tolerance, score } | null（全候補失敗） | 'cancelled'（途中キャンセル）
  // candidatesは呼び出し側（easyFieldDetect.js）で決定する
  // （仕様書確定値: [6, 15, 30, 50, 70]、スライダー実運用レンジ6〜70をフルカバー）。
  //
  // 検出感度改善セッション（第2弾）：easyFieldDetect.js側は単純な色距離flood fill＋
  // 固定初期感度値による単一検出に戻したため、現時点ではこの関数は呼び出されていない
  // （公開APIとしては残置。複数候補からの自動選択を再度使いたくなった場合のために
  // ロジック自体は保持し、_seedLocalityFactor()もこの関数専用のため未使用のまま）。
  //
  // 非同期化：候補を1つ処理するごとに_yieldFrame()でイベントループへ制御を返す。
  // 同期のままだと検出中キャンセルボタンのクリックイベント自体がループ終了まで
  // 処理されず、キャンセルが実質効かないため（呼び出し側でcancelToken.cancelled=true
  // をセットしてもここでチェックする機会が来ない）。
  //
  // 検出感度改善セッション：候補選定の比較にのみ_seedLocalityFactor()を掛けた
  // combinedScoreを使う（scoreMaskPlausibility自体の返り値・配分は不変のまま）。
  async function autoTuneTolerance(imageData, gradientMap, seedX, seedY, candidates, edgeThreshold, cancelToken) {
    const w = imageData.width, h = imageData.height;
    let best = null;

    for (const tolerance of candidates) {
      if (cancelToken && cancelToken.cancelled) return 'cancelled';

      const rawMask = floodFillMaskEdgeAware(imageData, gradientMap, seedX, seedY, tolerance, edgeThreshold);

      if (rawMask) {
        const closedMask = morphologyClose(rawMask, w, h, 1);
        const score = scoreMaskPlausibility(closedMask, w, h);
        const localityFactor = _seedLocalityFactor(closedMask, w, h, seedX, seedY);
        const combinedScore = score * (0.7 + 0.3 * localityFactor);

        if (!best || combinedScore > best.combinedScore) {
          best = { mask: closedMask, tolerance, score, combinedScore };
        }
      }

      if (cancelToken && cancelToken.cancelled) return 'cancelled';
      await _yieldFrame();
    }

    if (cancelToken && cancelToken.cancelled) return 'cancelled';
    return best; // 全候補が失敗した場合は null
  }

  // ─── 直角に近い頂点だけをピタッと合わせる（軽微な角度補正、形状全体は差し替えない） ───
  // 6章決定：完全な矩形化（形状差し替え）は廃止。90度に近い頂点のみ局所補正する。
  // 各頂点について、隣接2辺のなす角が90度±angleToleranceDeg以内なら、
  // 次の頂点をそのぶんだけ回転させてちょうど90度に合わせる（他の頂点は動かさない）。
  function snapNearRightAngles(points, angleToleranceDeg = 5) {
    const n = points.length;
    if (n < 3) return points.map(p => ({ x: p.x, y: p.y }));

    const result = points.map(p => ({ x: p.x, y: p.y }));

    for (let i = 0; i < n; i++) {
      const prev = result[(i - 1 + n) % n];
      const curr = result[i];
      const nextIdx = (i + 1) % n;
      const next = result[nextIdx];

      const v1x = prev.x - curr.x, v1y = prev.y - curr.y;
      const v2x = next.x - curr.x, v2y = next.y - curr.y;
      const len1 = Math.hypot(v1x, v1y), len2 = Math.hypot(v2x, v2y);
      if (len1 === 0 || len2 === 0) continue;

      const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
      const angleDeg = Math.acos(_clamp(dot, -1, 1)) * 180 / Math.PI;
      const diff = angleDeg - 90;
      if (Math.abs(diff) > angleToleranceDeg || Math.abs(diff) < 0.01) continue;

      // v1の向きを基準に、v2を「ちょうど90度」の位置まで回転補正する
      const baseAngle = Math.atan2(v1y, v1x);
      const v2Angle = Math.atan2(v2y, v2x);
      let currentDiffRad = v2Angle - baseAngle;
      while (currentDiffRad > Math.PI) currentDiffRad -= 2 * Math.PI;
      while (currentDiffRad < -Math.PI) currentDiffRad += 2 * Math.PI;

      const targetDiffRad = (currentDiffRad >= 0 ? 1 : -1) * (Math.PI / 2);
      const rotate = targetDiffRad - currentDiffRad;
      const cos = Math.cos(rotate), sin = Math.sin(rotate);
      const newV2x = v2x * cos - v2y * sin;
      const newV2y = v2x * sin + v2y * cos;

      result[nextIdx] = { x: curr.x + newV2x, y: curr.y + newV2y };
    }

    return result;
  }

  // ═══════════════════════════════════════════
  //  新規：検出精度改善（クロップ高解像度化に伴う追加分）
  //  - computeAdaptiveEdgeThreshold：floodFillMaskEdgeAwareのedgeThresholdを、
  //    固定値ではなく解析範囲の勾配ヒストグラムからパーセンタイル基準で動的算出。
  //    タイルの撮影条件（天候・季節・影の濃さ）によるコントラスト差に対応する。
  //  - snapRectEdgesToGradient：矩形モードでminAreaRect()が返した4隅を、
  //    色ベースのマスク外形だけでなく実際の勾配（エッジ）に局所的に再フィット
  //    させる。色の滲みやリークで丸まった／ズレた角を、実エッジ位置へ寄せる。
  // ═══════════════════════════════════════════

  // ─── 適応的edge threshold：勾配ヒストグラムのパーセンタイル値 ───
  // ヒストグラム方式（O(n)）を採用し、大きなcrop画像でもソート(O(n log n))より軽くする。
  function computeAdaptiveEdgeThreshold(gradientMap, percentile = 80, minVal = 20, maxVal = 140) {
    const n = gradientMap ? gradientMap.length : 0;
    if (n === 0) return minVal;

    let maxG = 0;
    for (let i = 0; i < n; i++) if (gradientMap[i] > maxG) maxG = gradientMap[i];
    if (maxG <= 0) return minVal;

    const BINS = 256;
    const hist = new Uint32Array(BINS);
    const binScale = BINS / (maxG + 1e-6);
    for (let i = 0; i < n; i++) {
      let b = (gradientMap[i] * binScale) | 0;
      if (b >= BINS) b = BINS - 1;
      hist[b]++;
    }

    const target = Math.floor(n * (percentile / 100));
    let cum = 0, bin = 0;
    for (; bin < BINS; bin++) {
      cum += hist[bin];
      if (cum >= target) break;
    }
    const value = (bin + 0.5) / binScale;
    return _clamp(value, minVal, maxVal);
  }

  // ─── 矩形の4辺を勾配マップへ局所的にスナップ ───
  // corners: minAreaRect()が返す4隅（[p0,p1,p2,p3]、隣接順）。
  // 各辺を10〜90%区間でsampleCount点サンプリングし、法線方向±searchRadiusPxの
  // 範囲で勾配が最大になるオフセットを探索、全サンプルの中央値（外れ値に頑健）
  // だけ辺を平行移動してから、隣接する辺同士を再交差させて新しい4隅を得る。
  // 勾配が見つからない（全域0など）場合はその辺は動かさない。
  function snapRectEdgesToGradient(corners, gradientMap, w, h, options = {}) {
    if (!corners || corners.length !== 4 || !gradientMap) return corners;
    const sampleCount    = options.sampleCount    || 15;
    const searchRadiusPx = options.searchRadiusPx || 6;

    const _at = (x, y) => {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= w || yi >= h) return -1;
      return gradientMap[yi * w + xi];
    };

    function _refineEdge(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) return { a, b };
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux; // 法線方向（符号は探索が±両方向のため任意）

      const offsets = [];
      for (let i = 0; i < sampleCount; i++) {
        const t = 0.1 + (0.8 * i) / Math.max(1, sampleCount - 1);
        const px = a.x + ux * len * t, py = a.y + uy * len * t;

        let bestOffset = 0, bestVal = -1;
        for (let s = -searchRadiusPx; s <= searchRadiusPx; s++) {
          const g = _at(px + nx * s, py + ny * s);
          if (g > bestVal) { bestVal = g; bestOffset = s; }
        }
        if (bestVal > 0) offsets.push(bestOffset);
      }

      if (offsets.length === 0) return { a, b };
      offsets.sort((p, q) => p - q);
      const mid = offsets.length >> 1;
      const median = offsets.length % 2 !== 0 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2;

      return {
        a: { x: a.x + nx * median, y: a.y + ny * median },
        b: { x: b.x + nx * median, y: b.y + ny * median },
      };
    }

    const edges = [
      _refineEdge(corners[0], corners[1]),
      _refineEdge(corners[1], corners[2]),
      _refineEdge(corners[2], corners[3]),
      _refineEdge(corners[3], corners[0]),
    ];

    // 隣接2辺（直線）の交点を新しい頂点にする（平行でほぼ交わらない場合は元の頂点を維持）
    function _lineIntersect(p1, p2, p3, p4) {
      const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
      const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
      const denom = d1x * d2y - d1y * d2x;
      if (Math.abs(denom) < 1e-9) return null;
      const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
      return { x: p1.x + d1x * t, y: p1.y + d1y * t };
    }

    const newCorners = [];
    for (let i = 0; i < 4; i++) {
      const prevEdge = edges[(i + 3) % 4];
      const currEdge = edges[i];
      const pt = _lineIntersect(prevEdge.a, prevEdge.b, currEdge.a, currEdge.b);
      newCorners.push(pt || corners[i]);
    }
    return newCorners;
  }

  // ═══════════════════════════════════════════
  //  新規：ハウス規格スナップ（仕様書7章の再検討により追加）
  //  検出した矩形の短辺（間口）を、パイプハウスの規格幅に近ければスナップし、
  //  長辺（奥行き）はキリのいい1m単位に丸める。DOM/Leaflet非依存の純粋関数のみ
  //  （実距離(m)を計算してlatlngへ変換する処理は呼び出し元のeasyFieldDetect.js側）。
  //
  //  規格値の根拠：パイプハウスメーカー各社の間口ラインナップ（3.6/4.5/5.4/6.0/
  //  6.3/7.0/7.2/8.0/9.0/10.0m前後に集中）をWeb検索で確認（圃場追加フロー刷新
  //  仕様書7章参照）。奥行きはパイプピッチ単位の自由設計のため規格リストは持たず、
  //  検出ノイズをならす目的で最寄りの1m単位に丸めるだけに留める。
  // ═══════════════════════════════════════════

  const HOUSE_STANDARD_WIDTHS_M     = [3.6, 4.5, 5.4, 6.0, 6.3, 7.0, 7.2, 8.0, 9.0, 10.0];
  const HOUSE_WIDTH_SNAP_TOLERANCE_M = 0.4; // これより離れていたら無理にスナップしない

  // shortEdgeM: 検出した矩形の短辺（間口とみなす）実距離[m]
  // longEdgeM : 検出した矩形の長辺（奥行きとみなす）実距離[m]
  // 戻り値: { width, depth, widthSnapped, widthOriginal, depthOriginal }
  function snapHouseDimensions(shortEdgeM, longEdgeM) {
    let nearest = null, nearestDiff = Infinity;
    for (const w of HOUSE_STANDARD_WIDTHS_M) {
      const diff = Math.abs(shortEdgeM - w);
      if (diff < nearestDiff) { nearestDiff = diff; nearest = w; }
    }
    const widthSnapped = nearest !== null && nearestDiff <= HOUSE_WIDTH_SNAP_TOLERANCE_M;

    return {
      width:         widthSnapped ? nearest : shortEdgeM,
      depth:         Math.max(1, Math.round(longEdgeM)),
      widthSnapped,
      widthOriginal: shortEdgeM,
      depthOriginal: longEdgeM,
    };
  }

  // ─── マスクがcanvas端に接しているか判定（検出感度改善セッション：クロップ拡張用に追加） ───
  // ハウス/加温・露地とも、解析対象は「タップ地点中心のcropSizeM四方」に限られるため、
  // 実際の対象がcrop範囲より大きい場合、maskはcrop端で機械的に打ち切られる。
  // 端（最外周1px）に前景ピクセルが存在する＝crop範囲内に収まりきっていない可能性が高い、
  // という判定に使う（呼び出し側でcropSizeMを広げて再検出するかどうかの判断材料）。
  function maskTouchesBoundary(mask, w, h) {
    for (let x = 0; x < w; x++) {
      if (mask[x] || mask[(h - 1) * w + x]) return true;
    }
    for (let y = 0; y < h; y++) {
      if (mask[y * w] || mask[y * w + (w - 1)]) return true;
    }
    return false;
  }

  // ─── 公開API ───
  return {
    // 既存移設（ロジック無改修）
    traceContourMsqr,
    douglasPeucker,
    convexHull,
    minAreaRect,
    // 新規（精度改善）
    computeGradientMap,
    computeSeedColor,
    floodFillMaskEdgeAware,
    morphologyClose,
    scoreMaskPlausibility,
    autoTuneTolerance,
    snapNearRightAngles,
    // 新規（検出精度改善セッション：クロップ高解像度化に伴う追加分）
    morphologyOpen,
    keepSeedComponentMask,
    computeAdaptiveEdgeThreshold,
    snapRectEdgesToGradient,
    // 新規（ハウス規格スナップ）
    HOUSE_STANDARD_WIDTHS_M,
    snapHouseDimensions,
    // 新規（検出感度改善セッション：クロップ拡張の判定用）
    maskTouchesBoundary,
  };
})();