// ═══════════════════════════════════════════
//  RIDGE GEOMETRY — 畝設計 座標計算ライブラリ
//  依存なし（純粋関数のみ）
//  使用方法:
//    RidgeGeometry.calcRidges(latLngs, dirP1, dirP2, rowWidth, holesLatLngs?)
//    RidgeGeometry.splitPolygonByRatio(latLngs, dirP1, dirP2, ratios)
//    RidgeGeometry.computeHouseGeometry(latLngs, opts)
//    RidgeGeometry.computeZonedFieldGeometry(latLngs, dirP1, dirP2, entranceEdgeIndex)
//    RidgeGeometry.getPolygonEdges(latLngs)
// ═══════════════════════════════════════════

const RidgeGeometry = (() => {

  // ────────────────────────────────────────
  //  定数
  // ────────────────────────────────────────
  const MIN_RIDGE_LENGTH = 1.0; // m未満の畝は除外
  const EARTH_R = 6371000;      // 地球半径 [m]（等距離近似に使用）

  // ────────────────────────────────────────
  //  緯度経度 ⇄ ローカル平面座標（メートル）
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
    const lat0rad = origin.lat * Math.PI / 180;
    const x = (pt.lng - origin.lng) * Math.PI / 180 * EARTH_R * Math.cos(lat0rad);
    const y = (pt.lat - origin.lat) * Math.PI / 180 * EARTH_R;
    return { x, y };
  }

  /**
   * ローカル XY [m] → LatLng（_toLocal の逆変換）
   * @param {{x:number,y:number}} xy
   * @param {{lat:number,lng:number}} origin
   * @returns {{lat:number,lng:number}}
   */
  function _fromLocal(xy, origin) {
    const lat0rad = origin.lat * Math.PI / 180;
    const lng = origin.lng + (xy.x / (EARTH_R * Math.cos(lat0rad))) * 180 / Math.PI;
    const lat = origin.lat + (xy.y / EARTH_R) * 180 / Math.PI;
    return { lat, lng };
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
  //  多角形演算（面積・符号付き面積・半平面クリップ）
  // ────────────────────────────────────────

  /**
   * 符号付き面積（CCWなら正、CWなら負）
   * @param {{x:number,y:number}[]} poly
   */
  function _signedArea(poly) {
    let area = 0;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      area += a.x * b.y - b.x * a.y;
    }
    return area / 2;
  }

  /**
   * 多角形の面積（絶対値）[m²]
   * @param {{x:number,y:number}[]} poly
   */
  function _polygonArea(poly) {
    if (!poly || poly.length < 3) return 0;
    return Math.abs(_signedArea(poly));
  }

  /**
   * 多角形を半平面でクリップする（Sutherland–Hodgman法）。
   * keepSide > 0 : dot(p, normal) >= threshold の側を残す
   * keepSide < 0 : dot(p, normal) <= threshold の側を残す
   * @param {{x:number,y:number}[]} poly
   * @param {{x:number,y:number}} normal
   * @param {number} threshold
   * @param {number} keepSide
   * @returns {{x:number,y:number}[]}
   */
  function _clipHalfPlane(poly, normal, threshold, keepSide) {
    if (!poly || poly.length === 0) return [];
    const out = [];
    const n = poly.length;
    const eps = 1e-9;
    for (let i = 0; i < n; i++) {
      const curr = poly[i];
      const next = poly[(i + 1) % n];
      const dCurr = _dot(curr, normal) - threshold;
      const dNext = _dot(next, normal) - threshold;
      const currIn = keepSide > 0 ? dCurr >= -eps : dCurr <= eps;
      const nextIn = keepSide > 0 ? dNext >= -eps : dNext <= eps;
      if (currIn) out.push(curr);
      if (currIn !== nextIn) {
        const denom = dCurr - dNext;
        if (Math.abs(denom) > 1e-12) {
          const t = dCurr / denom;
          out.push({
            x: curr.x + (next.x - curr.x) * t,
            y: curr.y + (next.y - curr.y) * t,
          });
        }
      }
    }
    return out;
  }

  /**
   * 無限直線同士の交点（線分ではなく直線として交差判定）
   * @param {{x:number,y:number}} p 直線1の通過点
   * @param {{x:number,y:number}} dirP 直線1の方向ベクトル
   * @param {{x:number,y:number}} q 直線2の通過点
   * @param {{x:number,y:number}} dirQ 直線2の方向ベクトル
   * @returns {{x:number,y:number}|null}
   */
  function _lineLineIntersect(p, dirP, q, dirQ) {
    const denom = dirP.x * dirQ.y - dirP.y * dirQ.x;
    if (Math.abs(denom) < 1e-10) return null; // 平行
    const t = ((q.x - p.x) * dirQ.y - (q.y - p.y) * dirQ.x) / denom;
    return { x: p.x + dirP.x * t, y: p.y + dirP.y * t };
  }

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
  //  無限線と複数リング（外周＋穴）の交差点を収集
  //  line: origin + dir（有限長の線分として渡す）
  //  rings: [ [{x,y},...], ... ] — 1リング目が外周、以降は穴
  //  戻り値: 全リング分の t 値リスト（dirに沿った距離の比率）
  // ────────────────────────────────────────
  function _linePolyIntersectionsMulti(lineOrigin, lineDir, rings) {
    const tValues = [];
    rings.forEach(ring => {
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        const edgeDir = { x: b.x - a.x, y: b.y - a.y };
        const t = _segIntersectT(lineOrigin, lineDir, a, edgeDir);
        if (t !== null) tValues.push(t);
      }
    });
    return tValues;
  }

  // ────────────────────────────────────────
  //  オフセット線ごとの有効区間を計算（偶奇ルール）
  //  外周＋穴を1つのtValuesリストとして渡せば、
  //  穴の部分は自動的に「外」として除外される
  //  （偶奇ルールは向き・リング数に依存しないため）
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
  //  メイン計算：畝配置
  // ────────────────────────────────────────

  /**
   * 畝配置を計算する
   *
   * @param {Array<{lat:number,lng:number}>} polygonLatLngs
   *   圃場（またはその一部＝比率帯）ポリゴンの頂点配列（Leaflet LatLng 互換）
   * @param {{lat:number,lng:number}} dirP1 — 畝方向線の1点目
   * @param {{lat:number,lng:number}} dirP2 — 畝方向線の2点目
   * @param {number} rowWidth — 畝幅 [m]（うねの中心間距離＝ピッチ）
   * @param {Array<Array<{lat:number,lng:number}>>} [holesLatLngs] —
   *   除外領域（ハウスの入口・設備通路など）のポリゴン配列（各要素が1つの穴）。
   *   省略時は穴なし（従来どおりの挙動、後方互換）。
   *
   * @returns {{
   *   rows: number,
   *   rowLength: number,
   *   ridgeSegments: Array<{length:number, p1:{lat:number,lng:number}, p2:{lat:number,lng:number}}>,
   *   totalArea: number
   * }}
   *   ridgeSegments[].p1 / p2 は畝セグメントの始点・終点（緯度経度）。
   *   実形状プレビュー描画用（後方互換：length は従来どおり必ず存在する）。
   */
  /**
   * calcRidges / calcRidgesByCount 共通の下準備：
   * 重心原点でのローカル座標変換・畝方向ベクトル／法線・投影範囲(projMin/projMax)・
   * スキャン線分長(scanLen) をまとめて算出する。
   * @returns {object|null} 準備データ（不正入力時はnull）
   */
  function _prepareRidgeScan(polygonLatLngs, dirP1, dirP2, holesLatLngs) {
    if (!polygonLatLngs || polygonLatLngs.length < 3) return null;
    if (!dirP1 || !dirP2) return null;

    const origin = _centroid(polygonLatLngs);
    const poly   = polygonLatLngs.map(p => _toLocal(p, origin));
    const lp1    = _toLocal(dirP1, origin);
    const lp2    = _toLocal(dirP2, origin);
    const holes  = Array.isArray(holesLatLngs)
      ? holesLatLngs.map(hole => hole.map(p => _toLocal(p, origin)))
      : [];
    const rings  = [poly, ...holes];

    const ridgeDir  = _normalize({ x: lp2.x - lp1.x, y: lp2.y - lp1.y });
    const normalDir = { x: -ridgeDir.y, y: ridgeDir.x };

    const projections = poly.map(p => _dot(p, normalDir));
    const projMin = Math.min(...projections);
    const projMax = Math.max(...projections);

    const xs = poly.map(p => p.x);
    const ys = poly.map(p => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const diag  = Math.sqrt(spanX * spanX + spanY * spanY);
    const scanLen = diag * 2 + 10;

    return { origin, poly, holes, rings, ridgeDir, normalDir, projMin, projMax, scanLen };
  }

  /**
   * 指定オフセット群それぞれについて、畝方向にスキャン線を通してポリゴン（穴含む）との
   * 交差セグメントを求め、実座標付きの畝セグメント配列にまとめる（calcRidges本体の
   * 5〜346行目に相当していた処理を共通化）。
   */
  function _scanOffsetsForSegments(offsets, ctx) {
    const { origin, ridgeDir, normalDir, scanLen, rings } = ctx;
    const allSegments = [];

    offsets.forEach(offset => {
      const baseOrigin = { x: normalDir.x * offset, y: normalDir.y * offset };
      const lineOrigin = {
        x: baseOrigin.x - ridgeDir.x * (scanLen / 2),
        y: baseOrigin.y - ridgeDir.y * (scanLen / 2),
      };
      const lineDir = { x: ridgeDir.x * scanLen, y: ridgeDir.y * scanLen };

      const tValues = _linePolyIntersectionsMulti(lineOrigin, lineDir, rings)
        .map(t => t * scanLen);
      const segs = _validSegments(tValues);

      segs.forEach(seg => {
        const p1Local = { x: lineOrigin.x + ridgeDir.x * seg.tStart, y: lineOrigin.y + ridgeDir.y * seg.tStart };
        const p2Local = { x: lineOrigin.x + ridgeDir.x * seg.tEnd,   y: lineOrigin.y + ridgeDir.y * seg.tEnd };
        allSegments.push({
          length: Math.round(seg.length * 100) / 100,
          p1: _fromLocal(p1Local, origin),
          p2: _fromLocal(p2Local, origin),
        });
      });
    });

    return allSegments;
  }

  function calcRidges(polygonLatLngs, dirP1, dirP2, rowWidth, holesLatLngs) {
    if (!polygonLatLngs || polygonLatLngs.length < 3) {
      return { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0 };
    }
    if (!dirP1 || !dirP2) {
      return { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0 };
    }
    if (!rowWidth || rowWidth <= 0) {
      return { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0 };
    }

    const prep = _prepareRidgeScan(polygonLatLngs, dirP1, dirP2, holesLatLngs);
    if (!prep) return { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0 };
    const { origin, ridgeDir, normalDir, projMin, projMax, scanLen, rings } = prep;

    // 4. オフセット位置の一覧を「帯の中心」基準・両側展開で生成する。
    //    【圃場マージン再設計】従来は projMin + 半畝幅 から畝幅ずつ進む片側走査だったが、
    //    帯（band）の中心に必ず1本目の畝が来るよう、中心から左右対称に rowWidth ずつ
    //    展開する方式に変更。帯そのものが各作物の band.polygon であるため、
    //    この変更だけで「各作物の帯ごとに中心基準で配置」の要件を満たす。
    const bandWidth = projMax - projMin;
    const offsets = [];
    if (bandWidth >= rowWidth - 1e-6) {
      const center = (projMin + projMax) / 2;
      offsets.push(center);
      let k = 1;
      while (true) {
        const oPlus  = center + k * rowWidth;
        const oMinus = center - k * rowWidth;
        let added = false;
        if (oPlus <= projMax - rowWidth / 2 + 1e-6) { offsets.push(oPlus); added = true; }
        if (oMinus >= projMin + rowWidth / 2 - 1e-6) { offsets.push(oMinus); added = true; }
        if (!added) break;
        k++;
      }
      offsets.sort((a, b) => a - b);
    }

    const allSegments = _scanOffsetsForSegments(offsets, { origin, ridgeDir, normalDir, scanLen, rings });

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

  /**
   * 畝数指定方式：ピッチではなく「目標畝数」から、敷地の実効幅（畝方向に垂直な投影幅）を
   * 均等N分割し、各ストライプの中心に畝を1本ずつ置く。calcRidges（ピッチ起点・中心対称
   * 展開）とは配置方式が異なる別系統の関数であり、既存のcalcRidgesの挙動には一切影響しない。
   *
   * 均等分割のため、奇数・偶数を問わずどんな畝数でも構造的に配置できる
   * （calcRidgesの中心対称展開は奇数畝しか生成できないという制約を持つが、
   * この関数はその制約を持たない）。
   *
   * ただし、いびつな形状の圃場（凹み・穴など）では、均等分割した一部のストライプが
   * 実際の境界と交差しない／極端に短くなるケースがあり、その場合は
   * 返り値の rows が targetRows を下回る（matched: false）。呼び出し側で
   * 「指定畝数を実現できなかった」ことを検知してユーザーに説明する想定。
   *
   * @param {{lat:number,lng:number}[]} polygonLatLngs
   * @param {{lat:number,lng:number}} dirP1
   * @param {{lat:number,lng:number}} dirP2
   * @param {number} targetRows - 目標畝数（1以上の整数）
   * @param {{lat:number,lng:number}[][]} [holesLatLngs]
   * @returns {{rows:number, rowLength:number, ridgeSegments:Array, totalArea:number,
   *            pitchM:number, targetRows:number, matched:boolean}}
   */
  function calcRidgesByCount(polygonLatLngs, dirP1, dirP2, targetRows, holesLatLngs) {
    const n = Math.round(Number(targetRows));
    const empty = { rows: 0, rowLength: 0, ridgeSegments: [], totalArea: 0, pitchM: 0, targetRows: n || 0, matched: false };
    if (!(n >= 1)) return empty;

    const prep = _prepareRidgeScan(polygonLatLngs, dirP1, dirP2, holesLatLngs);
    if (!prep) return empty;
    const { origin, ridgeDir, normalDir, projMin, projMax, scanLen, rings } = prep;

    const bandWidth = projMax - projMin;
    if (!(bandWidth > 0)) return empty;

    const stripWidth = bandWidth / n;
    const offsets = [];
    for (let i = 0; i < n; i++) offsets.push(projMin + stripWidth * (i + 0.5));

    const allSegments = _scanOffsetsForSegments(offsets, { origin, ridgeDir, normalDir, scanLen, rings });

    const rows      = allSegments.length;
    const totalLen  = allSegments.reduce((s, seg) => s + seg.length, 0);
    const rowLength = rows > 0 ? Math.round((totalLen / rows) * 10) / 10 : 0;
    const totalArea = Math.round(totalLen * stripWidth * 10) / 10;

    return {
      rows,
      rowLength,
      ridgeSegments: allSegments,
      totalArea,
      pitchM: Math.round(stripWidth * 1000) / 1000,
      targetRows: n,
      matched: rows === n,
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
  //  作物比率に応じた帯状ポリゴン分割
  // ────────────────────────────────────────

  /**
   * [offsetStart, offsetEnd] 区間の帯面積を、穴（holesLocal）との重なりを
   * 差し引いた「実面積」として計算する。
   * 【圃場マージン再設計】穴（入口・反対側帯）は栽植不可のため、占有率ベースの
   * 面積計算から常に除外する。
   *
   * @param {{x:number,y:number}[]} polyLocal — ローカル座標の外周ポリゴン
   * @param {{x:number,y:number}} normalDir — 法線方向（帯を切る軸）
   * @param {number} offsetStart
   * @param {number} offsetEnd
   * @param {{x:number,y:number}[][]} holesLocal — 穴（ローカル座標）の配列
   * @returns {number} 穴除外後の帯面積 [m²]
   */
  function _bandAreaWithHoles(polyLocal, normalDir, offsetStart, offsetEnd, holesLocal) {
    const bandLocal = _clipHalfPlane(
      _clipHalfPlane(polyLocal, normalDir, offsetStart, 1),
      normalDir, offsetEnd, -1
    );
    let area = _polygonArea(bandLocal);
    if (Array.isArray(holesLocal) && holesLocal.length) {
      holesLocal.forEach(hole => {
        const clippedHole = _clipHalfPlane(
          _clipHalfPlane(hole, normalDir, offsetStart, 1),
          normalDir, offsetEnd, -1
        );
        area -= _polygonArea(clippedHole);
      });
    }
    return Math.max(area, 0);
  }

  /**
   * 指定オフセット範囲 [offsetStart, projMax] の中で、offsetStart から
   * 実面積（穴除外後）が targetArea になる offsetEnd を二分探索で求める。
   * 面積は offsetEnd に対して単調非減少なので二分探索が成立する。
   *
   * @param {{x:number,y:number}[]} polyLocal — ローカル座標の外周ポリゴン
   * @param {{x:number,y:number}} normalDir — 法線方向（帯を切る軸）
   * @param {number} offsetStart
   * @param {number} projMax
   * @param {number} targetArea
   * @param {{x:number,y:number}[][]} [holesLocal] — 穴（ローカル座標）の配列
   * @returns {number} offsetEnd
   */
  function _findOffsetForArea(polyLocal, normalDir, offsetStart, projMax, targetArea, holesLocal) {
    const MAX_ITER = 40;
    const AREA_TOL = 0.05; // m²単位の許容誤差

    // まず offsetStart 以降（穴除外後）の最大面積を確認。targetAreaに届かない場合は projMax を返す
    const fullArea = _bandAreaWithHoles(polyLocal, normalDir, offsetStart, projMax, holesLocal);
    if (targetArea >= fullArea) return projMax;
    if (targetArea <= 0) return offsetStart;

    let lo = offsetStart, hi = projMax;
    let mid = hi;
    for (let i = 0; i < MAX_ITER; i++) {
      mid = (lo + hi) / 2;
      const area = _bandAreaWithHoles(polyLocal, normalDir, offsetStart, mid, holesLocal);
      if (Math.abs(area - targetArea) < AREA_TOL) break;
      if (area < targetArea) lo = mid; else hi = mid;
    }
    return mid;
  }

  /**
   * ratios に従って [projMin, projMax] を順に帯分割する共通コア処理。
   * gapWidthsM を渡すと、各帯の終端と次の帯の開始点の間に指定幅の
   * 隙間（境界の畝間確保用）を空けて次の帯を開始する。
   *
   * @param {{x:number,y:number}[]} poly — ローカル座標の外周ポリゴン
   * @param {{x:number,y:number}} normalDir
   * @param {number} projMin
   * @param {number} projMax
   * @param {number[]} ratios
   * @param {number} totalAreaForRatios — 比率の基準となる面積（100%に対応する値）
   * @param {{x:number,y:number}[][]} holesLocal
   * @param {number[]|null} gapWidthsM — 帯 i と i+1 の間に確保する隙間幅 [m]（i = 0..ratios.length-2）
   * @returns {Array<{ratio:number, polygonLocal:{x:number,y:number}[], boundaryStart:number, boundaryEnd:number, areaSqm:number}>}
   */
  function _splitBandsCore(poly, normalDir, projMin, projMax, ratios, totalAreaForRatios, holesLocal, gapWidthsM) {
    const results = [];
    let offsetCursor = projMin;

    for (let i = 0; i < ratios.length; i++) {
      const ratio = Number(ratios[i]) || 0;
      const targetArea = totalAreaForRatios * (ratio / 100);
      const offsetEnd = _findOffsetForArea(poly, normalDir, offsetCursor, projMax, targetArea, holesLocal);

      const bandLocal = _clipHalfPlane(
        _clipHalfPlane(poly, normalDir, offsetCursor, 1),
        normalDir, offsetEnd, -1
      );

      results.push({
        ratio,
        polygonLocal: bandLocal,
        boundaryStart: offsetCursor,
        boundaryEnd: offsetEnd,
        areaSqm: _bandAreaWithHoles(poly, normalDir, offsetCursor, offsetEnd, holesLocal),
      });

      const gap = (Array.isArray(gapWidthsM) && Number(gapWidthsM[i]) > 0) ? Number(gapWidthsM[i]) : 0;
      offsetCursor = Math.min(offsetEnd + gap, projMax);
    }

    return results;
  }

  /**
   * 圃場ポリゴンを畝方向に垂直な軸で、指定した比率どおりの「実面積」になるよう
   * 帯状に分割する（占有率ベースの栽植設計・自動帯分割用）。
   *
   * 分割順序は ratios 配列の順（圃場の projMin 側から順に割り当て）。
   * ratios の合計が100%未満でも構わない（残りは未割当のまま返さない＝
   * 呼び出し側で「最後の帯より先」は何も描画しなければよい）。
   *
   * 【圃場マージン再設計】
   * - holesLatLngs（入口・反対側帯など）は面積計算から常に除外される
   *   （占有率100%は「穴を除いた実面積」を基準とする）。
   * - gapWidthsM を渡すと、隣接する2作物の境界に必ず指定幅の畝間（パス）を
   *   確保する。面積の基準（比率の正確性）を優先するため、以下の2段階で計算する：
   *   1) パス1：ギャップ無視で通常どおり比率分割し、各境界の暫定位置を得る
   *   2) パス1の境界位置をもとに各ギャップ帯の実面積を見積もり、
   *      圃場の実面積からギャップ合計面積を差し引いた「実効面積」に対して
   *      比率を再適用し、帯と帯の間に実際にギャップ幅ぶんの隙間を空けて
   *      最終的な帯を確定する（矩形圃場では誤差なし、変形圃場でも近似精度は高い）。
   *
   * @param {Array<{lat:number,lng:number}>} polygonLatLngs — 圃場ポリゴン全体
   * @param {{lat:number,lng:number}} dirP1 — 畝方向線の1点目（エリア共通）
   * @param {{lat:number,lng:number}} dirP2 — 畝方向線の2点目（エリア共通）
   * @param {number[]} ratios — 各作物の占有率 [%]（0〜100、合計100以下を推奨）
   * @param {Array<Array<{lat:number,lng:number}>>} [holesLatLngs] — 除外領域（入口・反対側帯など）。省略時は穴なし（後方互換）
   * @param {number[]} [gapWidthsM] — 境界iとi+1の間に確保する畝間幅 [m]（長さ ratios.length-1）。省略時は境界ギャップなし（後方互換）
   *
   * @returns {Array<{
   *   ratio: number,
   *   polygon: Array<{lat:number,lng:number}>,
   *   areaSqm: number
   * }>} ratios と同じ順番・同じ長さの配列
   */
  function splitPolygonByRatio(polygonLatLngs, dirP1, dirP2, ratios, holesLatLngs, gapWidthsM) {
    if (!polygonLatLngs || polygonLatLngs.length < 3) return [];
    if (!dirP1 || !dirP2) return [];
    if (!Array.isArray(ratios) || ratios.length === 0) return [];

    const origin = _centroid(polygonLatLngs);
    const poly   = polygonLatLngs.map(p => _toLocal(p, origin));
    const lp1    = _toLocal(dirP1, origin);
    const lp2    = _toLocal(dirP2, origin);
    const holesLocal = Array.isArray(holesLatLngs)
      ? holesLatLngs.map(hole => hole.map(p => _toLocal(p, origin)))
      : [];

    const ridgeDir  = _normalize({ x: lp2.x - lp1.x, y: lp2.y - lp1.y });
    const normalDir = { x: -ridgeDir.y, y: ridgeDir.x };

    const projections = poly.map(p => _dot(p, normalDir));
    const projMin = Math.min(...projections);
    const projMax = Math.max(...projections);

    // 穴を除いた圃場全体の実面積（占有率100%に対応する基準面積）
    const totalArea = _bandAreaWithHoles(poly, normalDir, projMin, projMax, holesLocal);

    const hasGaps = Array.isArray(gapWidthsM) && gapWidthsM.some(g => Number(g) > 0);

    let finalBands;
    if (!hasGaps) {
      // ギャップなし：従来どおり単純な比率分割（穴のみ考慮）
      finalBands = _splitBandsCore(poly, normalDir, projMin, projMax, ratios, totalArea, holesLocal, null);
    } else {
      // gapWidthsM[i] は帯iと帯i+1の間の隙間。最終帯の後ろには隙間を作らない。
      const gaps = ratios.map((_, i) => (i < ratios.length - 1 ? (Number(gapWidthsM[i]) || 0) : 0));

      // パス1：ギャップ無視の暫定分割で境界の暫定位置を得る
      const provisional = _splitBandsCore(poly, normalDir, projMin, projMax, ratios, totalArea, holesLocal, null);

      // パス1の境界位置に基づき、各ギャップ帯の実面積（穴除外後）を見積もる
      let totalGapArea = 0;
      for (let i = 0; i < gaps.length; i++) {
        if (gaps[i] <= 0) continue;
        const gStart = provisional[i].boundaryEnd;
        const gEnd   = Math.min(gStart + gaps[i], projMax);
        totalGapArea += _bandAreaWithHoles(poly, normalDir, gStart, gEnd, holesLocal);
      }

      const effectiveArea = Math.max(totalArea - totalGapArea, 0);

      // パス2：実効面積に対して比率を再適用し、帯と帯の間にギャップを確保して確定
      finalBands = _splitBandsCore(poly, normalDir, projMin, projMax, ratios, effectiveArea, holesLocal, gaps);
    }

    return finalBands.map(b => ({
      ratio: b.ratio,
      polygon: b.polygonLocal.map(p => _fromLocal(p, origin)),
      areaSqm: Math.round(b.areaSqm * 10) / 10,
    }));
  }

  // ────────────────────────────────────────
  //  ハウス用ジオメトリ（外膜マージン・入口・設備通路）
  // ────────────────────────────────────────

  /**
   * 圃場ポリゴンの各辺の情報を返す（入口辺の手動選択UI等に使用）。
   *
   * @param {Array<{lat:number,lng:number}>} polygonLatLngs
   * @returns {Array<{index:number, lengthM:number, midpoint:{lat:number,lng:number}}>}
   */
  function getPolygonEdges(polygonLatLngs) {
    if (!polygonLatLngs || polygonLatLngs.length < 3) return [];
    const origin = _centroid(polygonLatLngs);
    const poly   = polygonLatLngs.map(p => _toLocal(p, origin));
    const n = poly.length;
    const edges = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const lengthM = _len({ x: b.x - a.x, y: b.y - a.y });
      const midLocal = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      edges.push({
        index: i,
        lengthM: Math.round(lengthM * 100) / 100,
        midpoint: _fromLocal(midLocal, origin),
      });
    }
    return edges;
  }

  /**
   * 【Step7-6：圃場マージン計算方式の刷新】
   * 旧実装は全辺を一律オフセットし隣接辺同士の交点（マイター結合）で角を作り直していたため、
   * 入口辺が鋭角に隣接する非矩形圃場でマイタースパイク（交点が本来の辺から大きく飛び出す）が発生し、
   * 入口/反対側帯が傾いて実際の辺と噛み合わない描画バグの原因になっていた。
   *
   * 新方式：
   * - 入口辺・反対側辺は「原辺（動かさない）」を基準に奥行きを測る（外膜マージンの影響を受けない）。
   * - それ以外の辺（畝辺＝畝方向に平行な側辺。四角形なら2本、五角形以上でも本数に依存せず動作）だけを
   *   frameMarginM ぶん内側に半平面クリップ（Sutherland–Hodgman）する。
   * - 半平面クリップは「動かない基準線」に対して「動く側だけ」を削るため、鋭角があっても暴れない。
   *
   * @param {{x:number,y:number}[]} poly — ローカル座標のポリゴン（原辺のまま）
   * @param {number} marginM
   * @param {number} excludeEdgeIndexA — マージンを適用しない辺（入口辺）
   * @param {number} excludeEdgeIndexB — マージンを適用しない辺（反対側辺。-1なら対象なし）
   * @returns {{x:number,y:number}[]} 畝辺だけ内側に削られた実効境界ポリゴン
   */
  function _clipSideEdgesInward(poly, marginM, excludeEdgeIndexA, excludeEdgeIndexB) {
    const n = poly.length;
    if (!marginM || marginM <= 0 || n < 3) return poly;

    const sign = _signedArea(poly) >= 0 ? 1 : -1; // CCW: 1, CW: -1

    let result = poly;
    for (let i = 0; i < n; i++) {
      if (i === excludeEdgeIndexA || i === excludeEdgeIndexB) continue; // 入口辺・反対側辺は原辺のまま
      const a = poly[i], b = poly[(i + 1) % n];
      const edgeDir = _normalize({ x: b.x - a.x, y: b.y - a.y });
      const inwardNormal = sign > 0
        ? { x: -edgeDir.y, y: edgeDir.x }
        : { x: edgeDir.y, y: -edgeDir.x };
      const threshold = _dot(a, inwardNormal) + marginM;
      result = _clipHalfPlane(result, inwardNormal, threshold, 1);
      if (result.length < 3) return []; // マージンが大きすぎて圃場が消滅
    }
    return result;
  }

  /**
   * 凸多角形 clipPoly に対して poly（帯など任意の多角形）を交差クリップする
   * （Sutherland–Hodgman法。clipPoly の各辺を半平面として順次クリップする）。
   * 入口帯・反対側帯を「畝辺のマージンオフセット線まで」に自動的に収めるために使う
   * （clipPoly = _clipSideEdgesInward 済みの実効境界）。
   *
   * @param {{x:number,y:number}[]} poly
   * @param {{x:number,y:number}[]} clipPoly — 凸多角形前提
   * @returns {{x:number,y:number}[]}
   */
  function _clipPolygonToConvex(poly, clipPoly) {
    if (!poly.length || clipPoly.length < 3) return [];
    const cn = clipPoly.length;
    const clipSign = _signedArea(clipPoly) >= 0 ? 1 : -1;

    let result = poly;
    for (let i = 0; i < cn; i++) {
      const a = clipPoly[i], b = clipPoly[(i + 1) % cn];
      const edgeDir = _normalize({ x: b.x - a.x, y: b.y - a.y });
      const inwardNormal = clipSign > 0
        ? { x: -edgeDir.y, y: edgeDir.x }
        : { x: edgeDir.y, y: -edgeDir.x };
      const threshold = _dot(a, inwardNormal);
      result = _clipHalfPlane(result, inwardNormal, threshold, 1);
      if (result.length < 3) return [];
    }
    return result;
  }

  /**
   * 指定辺（poly上のedgeIndex＝原辺）の全長ぶんを幅とする帯（穴）を、
   * 指定奥行きでローカル座標に生成する。
   * 【圃場マージン再設計・Step7-6】入口辺・反対側辺は外膜マージンの影響を受けないため、
   * 常に「原辺（poly）」を基準にする（旧実装のoffsetPolyではない）。
   * 帯の左右の実際の幅は、この後 _clipPolygonToConvex で実効境界に交差クリップすることで
   * 「畝辺のマージンオフセット線まで」に自動的に収まる。
   *
   * @param {{x:number,y:number}[]} poly — 原辺のポリゴン
   * @param {number} edgeIndex
   * @param {number} depthM — 辺から内側への奥行き
   * @returns {{x:number,y:number}[]} 帯（穴）のローカル座標4点
   */
  function _buildEdgeBand(poly, edgeIndex, depthM) {
    const n = poly.length;
    const a = poly[edgeIndex % n];
    const b = poly[(edgeIndex + 1) % n];
    const edgeDir = _normalize({ x: b.x - a.x, y: b.y - a.y });

    const sign = _signedArea(poly) >= 0 ? 1 : -1;
    const inward = sign > 0
      ? { x: -edgeDir.y, y: edgeDir.x }
      : { x: edgeDir.y, y: -edgeDir.x };

    const c1 = a;
    const c2 = b;
    const c3 = { x: c2.x + inward.x * depthM, y: c2.y + inward.y * depthM };
    const c4 = { x: c1.x + inward.x * depthM, y: c1.y + inward.y * depthM };

    return [c1, c2, c3, c4];
  }

  /**
   * 圃場の実効ジオメトリ（外周マージン内側オフセット＋入口帯・反対側（Uターン）帯の穴）を計算する。
   * 全栽培タイプ（露地・ハウス問わず）共通で使用する。
   * 入口辺は省略時、元ポリゴンの最短辺を自動選択する。
   * 反対側（Uターンスペース）帯の辺は、矩形圃場を前提に入口辺の対辺を自動特定する
   * （辺総数の半分だけインデックスをずらす簡易近似。変形圃場では厳密な対辺にならない場合がある）。
   *
   * 【圃場マージン再設計】
   * - entranceWidthM は廃止。入口帯は「辺全体を幅とする帯」になった（_buildEdgeBand）。
   * - equipWidthM（設備通路幅）は廃止。入口帯に統合された。
   * - oppositeDepthM（反対側帯の奥行き）を新設。未指定時は entranceDepthM を共通値として使う。
   *
   * @param {Array<{lat:number,lng:number}>} polygonLatLngs — 圃場ポリゴン全体
   * @param {Object} opts
   * @param {number} opts.frameMarginM — 外周マージン（外周一律内側オフセット）[m]
   * @param {number} [opts.entranceDepthM] — 入口帯の奥行き [m]（未指定/0なら入口帯の穴は作らない）
   * @param {number} [opts.oppositeDepthM] — 反対側（Uターン）帯の奥行き [m]（未指定時は entranceDepthM を使用。明示的に0にすると反対側帯なし）
   * @param {number} [opts.entranceEdgeIndex] — 入口辺のインデックス（省略時は最短辺を自動選択）
   *
   * @returns {{
   *   outerPolygon: Array<{lat:number,lng:number}>,
   *   holes: Array<Array<{lat:number,lng:number}>>,
   *   entranceEdgeIndex: number,
   *   oppositeEdgeIndex: number,
   *   availableAreaSqm: number
   * }}
   */
  function computeHouseGeometry(polygonLatLngs, opts) {
    const empty = { outerPolygon: [], holes: [], entranceEdgeIndex: -1, oppositeEdgeIndex: -1, availableAreaSqm: 0 };
    if (!polygonLatLngs || polygonLatLngs.length < 3) return empty;

    const o = opts || {};
    const frameMarginM   = Number(o.frameMarginM)   || 0;
    const entranceDepthM = Number(o.entranceDepthM) || 0;
    // oppositeDepthM未指定（null/undefined/空文字）ならentranceDepthMを共通値として使う。
    // 明示的に0が指定された場合は「反対側帯なし」の意図として尊重する。
    const oppositeDepthM = (o.oppositeDepthM === undefined || o.oppositeDepthM === null || o.oppositeDepthM === '')
      ? entranceDepthM
      : (Number(o.oppositeDepthM) || 0);

    const origin = _centroid(polygonLatLngs);
    const poly   = polygonLatLngs.map(p => _toLocal(p, origin));
    const n = poly.length;

    // 1. 入口辺の決定（指定が無ければ元ポリゴンの最短辺を自動選択）
    let entranceEdgeIndex = Number.isInteger(o.entranceEdgeIndex) ? o.entranceEdgeIndex : -1;
    if (entranceEdgeIndex < 0 || entranceEdgeIndex >= n) {
      let minLen = Infinity;
      for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n];
        const len = _len({ x: b.x - a.x, y: b.y - a.y });
        if (len < minLen) { minLen = len; entranceEdgeIndex = i; }
      }
    }

    // 2. 反対側（Uターン）辺の決定：矩形圃場前提で対辺を自動特定
    let oppositeEdgeIndex = -1;
    if (n >= 3) {
      oppositeEdgeIndex = (entranceEdgeIndex + Math.round(n / 2)) % n;
      if (oppositeEdgeIndex === entranceEdgeIndex) oppositeEdgeIndex = -1; // 三角形等、対辺が定義できない場合
    }

    // 3. 【Step7-6】畝辺（入口辺・反対側辺以外）だけを外周マージンぶん内側にクリップする。
    //    入口辺・反対側辺は原辺のまま動かさない（外膜マージンの影響を受けない）。
    const outerPoly = frameMarginM > 0
      ? _clipSideEdgesInward(poly, frameMarginM, entranceEdgeIndex, oppositeEdgeIndex)
      : poly;
    if (outerPoly.length < 3) return empty; // マージンが大きすぎて圃場が消滅した

    // 4. 入口帯・反対側帯の穴を生成（原辺基準の帯を、実効境界＝outerPolyに交差クリップする）
    //    交差クリップにより、帯の左右の幅は自動的に「畝辺のマージンオフセット線まで」に収まる。
    const holesLocal = [];
    if (entranceDepthM > 0) {
      const band = _buildEdgeBand(poly, entranceEdgeIndex, entranceDepthM);
      const clipped = _clipPolygonToConvex(band, outerPoly);
      if (clipped.length >= 3) holesLocal.push(clipped);
    }
    if (oppositeDepthM > 0 && oppositeEdgeIndex >= 0) {
      const band = _buildEdgeBand(poly, oppositeEdgeIndex, oppositeDepthM);
      const clipped = _clipPolygonToConvex(band, outerPoly);
      if (clipped.length >= 3) holesLocal.push(clipped);
    }

    // 5. 面積集計（実効境界 − 各穴）
    let availableArea = _polygonArea(outerPoly);
    holesLocal.forEach(hole => { availableArea -= _polygonArea(hole); });

    return {
      outerPolygon: outerPoly.map(p => _fromLocal(p, origin)),
      holes: holesLocal.map(hole => hole.map(p => _fromLocal(p, origin))),
      entranceEdgeIndex,
      oppositeEdgeIndex,
      availableAreaSqm: Math.round(Math.max(availableArea, 0) * 10) / 10,
    };
  }

  // ────────────────────────────────────────
  //  矩形補正ゾーン分割（畝設計UI統合・矩形補正拡張）
  // ────────────────────────────────────────

  /**
   * 圃場ポリゴンを「矩形ゾーン」と「余剰形状（複雑形状）ゾーン」の2つに分割する。
   *
   * 【設計方針】
   * - 入口辺（entranceEdgeIndex）と畝方向（dirP1/dirP2）の2つを基準に、
   *   入口辺を手前側の境界として畝方向（ridgeDir）へ奥行きを伸ばした
   *   軸整列の矩形を作る。矩形の幅（normalDir方向）は圃場の全幅
   *   （projMin〜projMax）を使う＝矩形は常に圃場の帯積み重ね方向いっぱいに広がる。
   * - 矩形の奥行きは、以下の点から畝方向（内側向き）にレイを飛ばし、
   *   圃場境界に最初にぶつかるまでの距離のうち最小のものを採用する：
   *   入口辺の両端点、および圃場のnormalDir方向の両端（projMin側・projMax側）の頂点。
   *   これにより矩形は（凸形状の圃場であれば）必ず圃場ポリゴン内に収まることが保証される。
   * - 余剰形状（leftover）は、矩形より奥（畝方向にさらに進んだ側）の部分を
   *   単純な半平面クリップで取り出したもの。「畝の延長」として扱う想定。
   * - 凹形状の圃場や、入口辺が畝方向とほぼ平行など極端なケースでは
   *   矩形が成立しない（奥行きが極端に浅い等）ことがあり、その場合は
   *   valid:false を返す。呼び出し側は従来の単一ポリゴン分割にフォールバックすること。
   *
   * @param {Array<{lat:number,lng:number}>} polygonLatLngs — 圃場ポリゴン（実効ポリゴン＝マージン適用後を想定）
   * @param {{lat:number,lng:number}} dirP1 — 畝方向線の1点目
   * @param {{lat:number,lng:number}} dirP2 — 畝方向線の2点目
   * @param {number} entranceEdgeIndex — 入口辺のインデックス（polygonLatLngs上の辺番号）
   *
   * @returns {{
   *   valid: boolean,
   *   rectPolygon: Array<{lat:number,lng:number}>|null,
   *   rectAreaSqm: number,
   *   leftoverPolygon: Array<{lat:number,lng:number}>|null,
   *   leftoverAreaSqm: number
   * }}
   */
  function computeZonedFieldGeometry(polygonLatLngs, dirP1, dirP2, entranceEdgeIndex) {
    const empty = { valid: false, rectPolygon: null, rectAreaSqm: 0, leftoverPolygon: null, leftoverAreaSqm: 0 };
    if (!polygonLatLngs || polygonLatLngs.length < 3) return empty;
    if (!dirP1 || !dirP2) return empty;
    const n = polygonLatLngs.length;
    if (!Number.isInteger(entranceEdgeIndex) || entranceEdgeIndex < 0 || entranceEdgeIndex >= n) return empty;

    const origin = _centroid(polygonLatLngs);
    const poly   = polygonLatLngs.map(p => _toLocal(p, origin));
    const lp1    = _toLocal(dirP1, origin);
    const lp2    = _toLocal(dirP2, origin);

    const ridgeDir  = _normalize({ x: lp2.x - lp1.x, y: lp2.y - lp1.y });
    const normalDir = { x: -ridgeDir.y, y: ridgeDir.x };

    const ea = poly[entranceEdgeIndex];
    const eb = poly[(entranceEdgeIndex + 1) % n];

    // 入口辺のridgeDir投影の平均値＝矩形の手前側境界線の位置
    const entranceRidgeProj = (_dot(ea, ridgeDir) + _dot(eb, ridgeDir)) / 2;

    // 圃場中心（ローカル原点＝重心）が入口辺よりridgeDirのどちら側にあるかで内側向きを判定
    const inward = (0 - entranceRidgeProj) >= 0 ? 1 : -1;

    // レイキャスト用のスキャン長（対角線基準。calcRidgesと同様の手法）
    const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const diag  = Math.sqrt(spanX * spanX + spanY * spanY);
    const scanLen = diag * 2 + 10;

    // 指定点から畝方向（内側向き）にレイを飛ばし、圃場境界までの距離を返す（当たらなければnull）
    function _rayDepth(pt) {
      const lineDir = { x: ridgeDir.x * scanLen * inward, y: ridgeDir.y * scanLen * inward };
      const tValues = _linePolyIntersectionsMulti(pt, lineDir, [poly])
        .filter(t => t > 1e-6) // pt自身（始点）での自己交差を除外
        .map(t => t * scanLen);
      return tValues.length ? Math.min(...tValues) : null;
    }

    // 矩形の幅は圃場の全幅（normalDir方向）を使うため、入口辺の両端点に加え、
    // 圃場のnormalDir方向の最遠2頂点でも矩形が破綻しないことを確認する
    const normalProjs = poly.map(p => _dot(p, normalDir));
    const projMin = Math.min(...normalProjs);
    const projMax = Math.max(...normalProjs);
    let idxAtMin = 0, idxAtMax = 0;
    normalProjs.forEach((p, i) => {
      if (p === projMin) idxAtMin = i;
      if (p === projMax) idxAtMax = i;
    });

    const checkPoints = [ea, eb, poly[idxAtMin], poly[idxAtMax]];
    const depths = checkPoints.map(_rayDepth).filter(d => d !== null && d > 0);
    if (!depths.length) return empty;
    const rectDepth = Math.min(...depths);
    if (rectDepth < 0.5) return empty; // 矩形として成立しないほど浅い場合は不成立扱い

    const farRidgeProj = entranceRidgeProj + inward * rectDepth;

    // (normalDir方向オフセット, ridgeDir方向オフセット) → ローカルXY
    const corner = (nProj, rProj) => ({
      x: normalDir.x * nProj + ridgeDir.x * rProj,
      y: normalDir.y * nProj + ridgeDir.y * rProj,
    });
    const rectLocal = [
      corner(projMin, entranceRidgeProj),
      corner(projMax, entranceRidgeProj),
      corner(projMax, farRidgeProj),
      corner(projMin, farRidgeProj),
    ];

    // 余剰形状＝矩形より奥（畝方向にさらに進んだ側）の部分
    const leftoverLocal = _clipHalfPlane(poly, ridgeDir, farRidgeProj, inward);

    const rectAreaSqm     = _polygonArea(rectLocal);
    const leftoverAreaSqm = _polygonArea(leftoverLocal);

    return {
      valid: true,
      rectPolygon:     rectLocal.map(p => _fromLocal(p, origin)),
      rectAreaSqm:     Math.round(rectAreaSqm * 10) / 10,
      leftoverPolygon: leftoverLocal.length >= 3 ? leftoverLocal.map(p => _fromLocal(p, origin)) : null,
      leftoverAreaSqm: Math.round(leftoverAreaSqm * 10) / 10,
    };
  }

  // ────────────────────────────────────────
  //  座標変換ヘルパーの公開（プレビュー描画等での再利用向け）
  // ────────────────────────────────────────

  /**
   * 圃場ポリゴンをローカルXY座標（重心原点、メートル単位）に変換する。
   * SVGプレビュー等での実形状描画に使用する。
   *
   * @param {Array<{lat:number,lng:number}>} polygonLatLngs
   * @returns {{origin:{lat:number,lng:number}, points:Array<{x:number,y:number}>}}
   */
  function toLocalCoords(polygonLatLngs) {
    if (!polygonLatLngs || polygonLatLngs.length === 0) {
      return { origin: { lat: 0, lng: 0 }, points: [] };
    }
    const origin = _centroid(polygonLatLngs);
    const points = polygonLatLngs.map(p => _toLocal(p, origin));
    return { origin, points };
  }

  /**
   * 既知の origin を使って単一のLatLng点をローカルXYに変換する
   * （splitPolygonByRatio 等で得た複数ポリゴンを同一座標系に揃える場合に使用）。
   *
   * @param {{lat:number,lng:number}} pt
   * @param {{lat:number,lng:number}} origin
   * @returns {{x:number,y:number}}
   */
  function toLocalPoint(pt, origin) {
    return _toLocal(pt, origin);
  }

  // ────────────────────────────────────────
  //  公開API
  // ────────────────────────────────────────
  return {
    calcRidges,
    calcRidgesByCount,
    totalPlants,
    splitPolygonByRatio,
    computeHouseGeometry,
    computeZonedFieldGeometry,
    getPolygonEdges,
    toLocalCoords,
    toLocalPoint,
  };

})();