// ═══════════════════════════════════════════
//  RIDGE GEOMETRY — 畝設計 座標計算ライブラリ
//  依存なし（純粋関数のみ）
//  使用方法: RidgeGeometry.calcRidges(latLngs, dirP1, dirP2, rowWidth)
// ═══════════════════════════════════════════

const RidgeGeometry = (() => {

  // ────────────────────────────────────────
  //  定数
  // ────────────────────────────────────────
  const MIN_RIDGE_LENGTH = 1.0; // m未満の畝は除外

  // ────────────────────────────────────────
  //  緯度経度 → ローカル平面座標（メートル）
  //  原点は polygonLatLngs の重心
  // ────────────────────────────────────────

  /**
   * 重心を計算
   * @param {{lat:number,lng:number}[]} pts
   * @returns {{lat:number,lng:number}}
   */
  function _centroid(pts) {
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat, lng };
  }

  /**
   * LatLng → ローカル XY [m]（等距離近似）
   * @param {{lat:number,lng:number}} pt
   * @param {{lat:number,lng:number}} origin
   * @returns {{x:number,y:number}}
   */
  function _toLocal(pt, origin) {
    const R = 6371000;
    const lat0rad = origin.lat * Math.PI / 180;
    const x = (pt.lng - origin.lng) * Math.PI / 180 * R * Math.cos(lat0rad);
    const y = (pt.lat - origin.lat) * Math.PI / 180 * R;
    return { x, y };
  }

  // ────────────────────────────────────────
  //  ベクトル演算
  // ────────────────────────────────────────

  function _len(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }

  function _normalize(v) {
    const l = _len(v);
    if (l < 1e-10) return { x: 1, y: 0 };
    return { x: v.x / l, y: v.y / l };
  }

  function _dot(a, b) { return a.x * b.x + a.y * b.y; }

  // ────────────────────────────────────────
  //  線分交差判定
  //  p + t*r  と  q + u*s の交点
  //  戻り値: t (0〜1) or null
  // ────────────────────────────────────────
  function _segIntersectT(p, r, q, s) {
    const rxs = r.x * s.y - r.y * s.x;
    if (Math.abs(rxs) < 1e-10) return null; // 平行
    const qp = { x: q.x - p.x, y: q.y - p.y };
    const t = (qp.x * s.y - qp.y * s.x) / rxs;
    const u = (qp.x * r.y - qp.y * r.x) / rxs;
    if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
      return t;
    }
    return null;
  }

  // ────────────────────────────────────────
  //  無限線とポリゴン全エッジの交差点を収集
  //  line: { origin:{x,y}, dir:{x,y} }
  //  戻り値: ポリゴン内部の t 値リスト（dirに沿った距離）
  // ────────────────────────────────────────
  function _linePolyIntersections(lineOrigin, lineDir, poly) {
    const tValues = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const edgeDir = { x: b.x - a.x, y: b.y - a.y };
      const t = _segIntersectT(lineOrigin, lineDir, a, edgeDir);
      if (t !== null) {
        tValues.push(t);
      }
    }
    return tValues;
  }

  // ────────────────────────────────────────
  //  オフセット線ごとの有効区間を計算（偶奇ルール）
  //  tValues: 交差点の t 値リスト
  //  戻り値: [{tStart, tEnd, length}] — 内部区間のみ
  // ────────────────────────────────────────
  function _validSegments(tValues) {
    if (tValues.length < 2) return [];
    const sorted = [...tValues].sort((a, b) => a - b);
    const segs = [];
    // 偶奇ルール: 0番と1番がペア、2番と3番がペア…
    for (let i = 0; i + 1 < sorted.length; i += 2) {
      const length = sorted[i + 1] - sorted[i];
      if (length >= MIN_RIDGE_LENGTH) {
        segs.push({ tStart: sorted[i], tEnd: sorted[i + 1], length });
      }
    }
    return segs;
  }

  // ────────────────────────────────────────
  //  メイン計算
  // ────────────────────────────────────────

  /**
   * 畝配置を計算する
   *
   * @param {Array<{lat:number,lng:number}>} polygonLatLngs
   *   圃場ポリゴンの頂点配列（Leaflet LatLng 互換）
   * @param {{lat:number,lng:number}} dirP1 — 畝方向線の1点目
   * @param {{lat:number,lng:number}} dirP2 — 畝方向線の2点目
   * @param {number} rowWidth — 畝幅 [m]（うねの中心間距離）
   *
   * @returns {{
   *   rows: number,
   *   rowLength: number,
   *   ridgeSegments: Array<{length:number}>,
   *   totalArea: number
   * }}
   */
  function calcRidges(polygonLatLngs, dirP1, dirP2, rowWidth) {
    if (!polygonLatLngs || polygonLatLngs.length < 3) {
      return { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0 };
    }
    if (!dirP1 || !dirP2) {
      return { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0 };
    }
    if (!rowWidth || rowWidth <= 0) {
      return { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0 };
    }

    // 1. 重心を原点としてローカル座標へ変換
    const origin = _centroid(polygonLatLngs);
    const poly   = polygonLatLngs.map(p => _toLocal(p, origin));
    const lp1    = _toLocal(dirP1, origin);
    const lp2    = _toLocal(dirP2, origin);

    // 2. 畝方向ベクトルと法線（投影方向）
    const ridgeDir  = _normalize({ x: lp2.x - lp1.x, y: lp2.y - lp1.y });
    const normalDir = { x: -ridgeDir.y, y: ridgeDir.x }; // 90°回転

    // 3. ポリゴン全頂点を法線方向へ投影し、走査範囲を決定
    const projections = poly.map(p => _dot(p, normalDir));
    const projMin = Math.min(...projections);
    const projMax = Math.max(...projections);

    // 3b. 畝方向（ridgeDir）側の走査に使う線分の長さを決定。
    //     _linePolyIntersections は有限長の線分として交差判定するため、
    //     ridgeDir（単位ベクトル＝長さ1）をそのまま渡すと畝方向1mしか
    //     判定できず、実際の圃場（数十m規模）では交点がほぼ見つからない。
    //     ポリゴンの対角線長を基準に、確実に圃場全体をまたぐ長さを用意する。
    const xs = poly.map(p => p.x);
    const ys = poly.map(p => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const diag  = Math.sqrt(spanX * spanX + spanY * spanY);
    const scanLen = diag * 2 + 10; // 余裕を持たせる（対角線の2倍＋10m）

    // 4. 最初のオフセット位置（projMin + 半畝幅 から始めて畝幅ずつ進む）
    const allSegments = [];
    let offset = projMin + rowWidth / 2;

    while (offset <= projMax - rowWidth / 2 + 1e-6) {
      // オフセット線上の基準点（法線方向にoffsetだけ進んだ点）
      const baseOrigin = {
        x: normalDir.x * offset,
        y: normalDir.y * offset,
      };

      // 畝方向へ scanLen 分の有限線分を、基準点を中心に前後に伸ばして構築する
      const lineOrigin = {
        x: baseOrigin.x - ridgeDir.x * (scanLen / 2),
        y: baseOrigin.y - ridgeDir.y * (scanLen / 2),
      };
      const lineDir = {
        x: ridgeDir.x * scanLen,
        y: ridgeDir.y * scanLen,
      };

      // ポリゴンとの交差 t 値（0〜1、lineOriginからの比率）を収集し、
      // 実距離 [m] に変換する
      const tValues = _linePolyIntersections(lineOrigin, lineDir, poly)
        .map(t => t * scanLen);
      const segs    = _validSegments(tValues);

      segs.forEach(seg => {
        allSegments.push({ length: Math.round(seg.length * 100) / 100 });
      });

      offset += rowWidth;
    }

    // 5. 集計
    const rows      = allSegments.length;
    const totalLen  = allSegments.reduce((s, seg) => s + seg.length, 0);
    const rowLength = rows > 0 ? Math.round((totalLen / rows) * 10) / 10 : 0;
    const totalArea = Math.round(totalLen * rowWidth * 10) / 10;

    return {
      rows,
      rowLength,
      ridgeSegments: allSegments,
      totalArea,
    };
  }

  // ────────────────────────────────────────
  //  苗数積算計算
  // ────────────────────────────────────────

  /**
   * 畝セグメントから総苗数を積算方式で計算
   *
   * @param {Array<{length:number}>} ridgeSegments
   * @param {number} linesPerRow  — 条数
   * @param {number} plantSpacing — 株間 [cm]
   * @returns {number} 総苗数（端数切り捨て）
   */
  function totalPlants(ridgeSegments, linesPerRow, plantSpacing) {
    if (!ridgeSegments || ridgeSegments.length === 0) return 0;
    if (!linesPerRow  || linesPerRow  <= 0) return 0;
    if (!plantSpacing || plantSpacing <= 0) return 0;

    let total = 0;
    ridgeSegments.forEach(seg => {
      // 株間はcm単位なので /100 してメートルに変換
      total += Math.floor(seg.length / (plantSpacing / 100)) * linesPerRow;
    });
    return total;
  }

  // ────────────────────────────────────────
  //  公開API
  // ────────────────────────────────────────
  return { calcRidges, totalPlants };

})();