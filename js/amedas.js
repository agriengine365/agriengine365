// ═══════════════════════════════════════════
//  AMEDAS — AMeDAS旬別平年値ローダー
//  - 起動時: data/stations.json を1回だけ fetch
//  - 地点指定時: data/10day/{stationNo}.json を必要時のみ fetch
//  - キャッシュ: 同一局の2回目以降はメモリから返す
//  - decadeArr: Phenology非依存で内部構築（36旬 × {tMax,tMin,tMean,sun,rain}）
// ═══════════════════════════════════════════

const AmedasLoader = (() => {
  // ── 内部状態 ──────────────────────────────
  let _stations       = null;   // 全局リスト（起動時1回ロード）
  let _loadingStations = null;  // 重複fetch防止用Promise
  const _cache        = {};     // { stationNo: decadeData }

  // ── 定数 ──────────────────────────────────
  const BASE_URL = 'data/';
  const MONTHS   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const PARTS    = ['early','mid','late'];

  // ─────────────────────────────────────────
  //  stations.json をロード（1回だけ）
  // ─────────────────────────────────────────
  async function loadStations() {
    if (_stations)        return _stations;
    if (_loadingStations) return _loadingStations;

    _loadingStations = fetch(BASE_URL + 'stations.json')
      .then(r => {
        if (!r.ok) throw new Error(`stations.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then(data => {
        _stations        = data;
        _loadingStations = null;
        return data;
      });

    return _loadingStations;
  }

  // ─────────────────────────────────────────
  //  Haversine距離 [km]
  // ─────────────────────────────────────────
  function haversine(lat1, lon1, lat2, lon2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─────────────────────────────────────────
  //  最寄り局を探す（気温データがある局に限定）
  // ─────────────────────────────────────────
  function findNearestStation(lat, lon, stations) {
    let best     = null;
    let bestDist = Infinity;

    for (const s of stations) {
      if (!s.lat || !s.lon)              continue;
      if (!s.observations.temperature)   continue;

      const dist = haversine(lat, lon, s.lat, s.lon);
      if (dist < bestDist) {
        bestDist = dist;
        best     = s;
      }
    }
    return best;
  }

  // ─────────────────────────────────────────
  //  10day/{stationNo}.json を fetch（キャッシュあり）
  // ─────────────────────────────────────────
  async function fetchDecade(stationNo) {
    if (_cache[stationNo]) return _cache[stationNo];

    const res = await fetch(`${BASE_URL}10day/${stationNo}.json`);
    if (!res.ok) throw new Error(`10day/${stationNo}.json fetch failed: ${res.status}`);
    const data = await res.json();
    _cache[stationNo] = data;
    return data;
  }

  // ─────────────────────────────────────────
  //  値取得ヘルパー（0.1単位 → 実値変換）
  //  q=0（観測なし）は null を返す
  // ─────────────────────────────────────────
  function decVal(data, key, decadeKey, divisor = 10) {
    const elem  = data[key];
    if (!elem)  return null;
    const entry = elem.data[decadeKey];
    if (!entry || entry.q === 0) return null;
    return entry.v / divisor;
  }

  // ─────────────────────────────────────────
  //  decadeArr 構築
  //  36旬（12ヶ月 × 3旬）の配列を返す
  //  各要素: { tMax, tMin, tMean, sun, rain, key }
  //    tMax/tMin/tMean : °C
  //    sun             : h
  //    rain            : mm
  //    key             : 'jan_early' 等
  // ─────────────────────────────────────────
  function buildDecadeArr(data) {
    const tMax = [];
    const tMin = [];
    const tMean = [];
    const sun  = [];
    const rain = [];
    const keys = [];

    for (const m of MONTHS) {
      for (const p of PARTS) {
        const k = `${m}_${p}`;
        tMax.push( decVal(data, 'temp_max_mean',  k, 10) );
        tMin.push( decVal(data, 'temp_min_mean',  k, 10) );
        tMean.push(decVal(data, 'temp_mean',       k, 10) );
        sun.push(  decVal(data, 'sunshine_hours',  k, 10) );
        rain.push( decVal(data, 'rain_total',      k, 10) );
        keys.push(k);
      }
    }

    return { tMax, tMin, tMean, sun, rain, keys };
  }

  // ─────────────────────────────────────────
  //  月別集計ヘルパー（decadeArrから月平均・月合計を作る）
  // ─────────────────────────────────────────
  function monthlyAvgFromDecade(arr36) {
    // 12ヶ月 × 3旬の平均 → 12要素配列
    return MONTHS.map((_, mi) => {
      const vals = [arr36[mi * 3], arr36[mi * 3 + 1], arr36[mi * 3 + 2]]
        .filter(v => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
  }

  function monthlySumFromDecade(arr36) {
    return MONTHS.map((_, mi) => {
      const vals = [arr36[mi * 3], arr36[mi * 3 + 1], arr36[mi * 3 + 2]]
        .filter(v => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    });
  }

  // ─────────────────────────────────────────
  //  気候帯名（engine.js CLIMATE_TABLE 互換）
  // ─────────────────────────────────────────
  function _climateName(tempMean) {
    if (tempMean === null) return '不明';
    if (tempMean >= 21)   return '亜熱帯';
    if (tempMean >= 17)   return '温暖帯南部';
    if (tempMean >= 15)   return '温暖帯';
    if (tempMean >= 12)   return '温帯';
    if (tempMean >= 9)    return '冷温帯';
    if (tempMean >= 7)    return '亜寒帯南部';
    return '亜寒帯';
  }

  // ─────────────────────────────────────────
  //  気候データ取得（area.js / engine.js から呼ぶ主API）
  //
  //  返却値:
  //  {
  //    stationNo, stationName, distKm,
  //    tempMean,        // 年平均気温 [°C]
  //    tempMaxMean,     // 年平均日最高気温 [°C]
  //    tempMinMean,     // 年平均日最低気温 [°C]
  //    tempMinJan,      // 1月平均最低気温 [°C]
  //    rain,            // 年降水量合計 [mm]
  //    rainMonthly,     // 月別降水量 {jan:mm, ...}
  //    sunshineHours,   // 年間日照時間 [h]
  //    daysBelow0,      // null（10dayファイルには含まれない）
  //    rainDays50,      // null（同上）
  //    snowDays,        // null（同上）
  //    name,            // 気候帯名
  //    decadeArr,       // 旬36点 {tMax[36], tMin[36], tMean[36], sun[36], rain[36], keys[36]}
  //  }
  // ─────────────────────────────────────────
  async function getClimateAt(lat, lon) {
    const stations = await loadStations();
    const nearest  = findNearestStation(lat, lon, stations);
    if (!nearest) throw new Error('最寄り局が見つかりません');

    const data = await fetchDecade(nearest.station_no);
    const dist = haversine(lat, lon, nearest.lat, nearest.lon);

    // ── 旬36点配列を構築 ──
    const decadeArr = buildDecadeArr(data);

    // ── 月別集計 ──
    const tMeanMonthly = monthlyAvgFromDecade(decadeArr.tMean);
    const tMaxMonthly  = monthlyAvgFromDecade(decadeArr.tMax);
    const tMinMonthly  = monthlyAvgFromDecade(decadeArr.tMin);
    const rainMonthlyArr = monthlySumFromDecade(decadeArr.rain);
    const sunMonthlyArr  = monthlySumFromDecade(decadeArr.sun);

    // ── 年平均・年合計 ──
    const tMeanValid = tMeanMonthly.filter(v => v !== null);
    const tMaxValid  = tMaxMonthly.filter(v => v !== null);
    const tMinValid  = tMinMonthly.filter(v => v !== null);

    const tempMean    = tMeanValid.length
      ? Math.round(tMeanValid.reduce((a, b) => a + b, 0) / tMeanValid.length * 10) / 10
      : null;
    const tempMaxMean = tMaxValid.length
      ? Math.round(tMaxValid.reduce((a, b) => a + b, 0) / tMaxValid.length * 10) / 10
      : null;
    const tempMinMean = tMinValid.length
      ? Math.round(tMinValid.reduce((a, b) => a + b, 0) / tMinValid.length * 10) / 10
      : null;

    // 1月最低気温（3旬平均）
    const tMinJanVals = [decadeArr.tMin[0], decadeArr.tMin[1], decadeArr.tMin[2]]
      .filter(v => v !== null);
    const tempMinJan = tMinJanVals.length
      ? Math.round(tMinJanVals.reduce((a, b) => a + b, 0) / tMinJanVals.length * 10) / 10
      : null;

    // 月別降水量オブジェクト
    const rainMonthly = {};
    let rainSum = null;
    if (rainMonthlyArr.some(v => v !== null)) {
      MONTHS.forEach((m, i) => { rainMonthly[m] = rainMonthlyArr[i] ?? 0; });
      rainSum = rainMonthlyArr.reduce((a, b) => a + (b ?? 0), 0);
    }

    // 年間日照時間
    const sunshineHours = sunMonthlyArr.some(v => v !== null)
      ? Math.round(sunMonthlyArr.reduce((a, b) => a + (b ?? 0), 0))
      : null;

    return {
      stationNo:     nearest.station_no,
      stationName:   nearest.name_kanji,
      distKm:        Math.round(dist * 10) / 10,
      tempMean,
      tempMaxMean,
      tempMinMean,
      tempMinJan,
      rain:          rainSum,
      rainMonthly,
      sunshineHours,
      daysBelow0:    null,  // 10dayファイルには含まれない
      rainDays50:    null,
      snowDays:      null,
      name:          _climateName(tempMean),
      decadeArr,            // {tMax[36], tMin[36], tMean[36], sun[36], rain[36], keys[36]}
    };
  }

  // ─────────────────────────────────────────
  //  公開API
  // ─────────────────────────────────────────
  return {
    init:              loadStations,      // 起動時に呼ぶ（任意・先読み用）
    getClimateAt,                         // area.js / engine.js から使う主API
    findNearestStation,                   // テスト・デバッグ用
  };
})();
