// ═══════════════════════════════════════════
//  AMEDAS — AMeDAS平年値ローダー
//  - 起動時: data/stations.json を1回だけ fetch
//  - 地点指定時: data/monthly/{stationNo}.json を必要時のみ fetch
//  - キャッシュ: 同一局の2回目以降はメモリから返す
// ═══════════════════════════════════════════

const AmedasLoader = (() => {
  // ── 内部状態 ──────────────────────────────
  let _stations = null;          // 全局リスト（起動時1回ロード）
  let _loadingStations = null;   // 重複fetch防止用Promise
  const _cache = {};             // { stationNo: monthlyData }

  // ── 定数 ──────────────────────────────────
  const BASE_URL = 'data/';      // index.htmlからの相対パス

  // ─────────────────────────────────────────
  //  stations.json をロード（1回だけ）
  // ─────────────────────────────────────────
  async function loadStations() {
    if (_stations) return _stations;
    if (_loadingStations) return _loadingStations;

    _loadingStations = fetch(BASE_URL + 'stations.json')
      .then(r => {
        if (!r.ok) throw new Error(`stations.json fetch failed: ${r.status}`);
        return r.json();
      })
      .then(data => {
        _stations = data;
        _loadingStations = null;
        return data;
      });

    return _loadingStations;
  }

  // ─────────────────────────────────────────
  //  Haversine距離 [km]
  // ─────────────────────────────────────────
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─────────────────────────────────────────
  //  最寄り局を探す
  //  温度・降水・日照が揃っている局を優先
  // ─────────────────────────────────────────
  function findNearestStation(lat, lon, stations) {
    let best = null;
    let bestDist = Infinity;

    for (const s of stations) {
      if (!s.lat || !s.lon) continue;
      // 気温データがない局はスキップ
      if (!s.observations.temperature) continue;

      const dist = haversine(lat, lon, s.lat, s.lon);
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
    return best;
  }

  // ─────────────────────────────────────────
  //  月別データをfetch（キャッシュあり）
  // ─────────────────────────────────────────
  async function fetchMonthly(stationNo) {
    if (_cache[stationNo]) return _cache[stationNo];

    const res = await fetch(`${BASE_URL}monthly/${stationNo}.json`);
    if (!res.ok) throw new Error(`monthly/${stationNo}.json fetch failed: ${res.status}`);
    const data = await res.json();
    _cache[stationNo] = data;
    return data;
  }

  // ─────────────────────────────────────────
  //  値取得ヘルパー（単位変換込み）
  //  q=0(観測なし) のときは null を返す
  // ─────────────────────────────────────────
  function val(data, key, period, divisor = 1) {
    const elem = data[key];
    if (!elem) return null;
    const entry = elem.data[period];
    if (!entry || entry.q === 0) return null;
    return entry.v / divisor;
  }

  // 月配列の平均（nullは除外）
  function monthlyAvg(data, key, divisor = 1) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const vals = months.map(m => val(data, key, m, divisor)).filter(v => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // 月配列の合計（nullは0扱い）
  function monthlySum(data, key, divisor = 1) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const vals = months.map(m => val(data, key, m, divisor)).filter(v => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0);
  }

  // ─────────────────────────────────────────
  //  気候データ取得（engine.js から呼ばれる公開API）
  //
  //  返却値:
  //  {
  //    stationNo, stationName, distKm,
  //    tempMean,        // 年平均気温 [°C]  = (最高平均+最低平均)/2 月平均
  //    tempMaxMean,     // 年平均日最高気温 [°C]
  //    tempMinMean,     // 年平均日最低気温 [°C]
  //    tempMinAnnual,   // 冬季最低気温の指標（1月最低気温平均）[°C]
  //    rain,            // 年降水量合計 [mm]
  //    rainMonthly,     // 月別降水量 [mm] {jan:..., feb:..., ...}
  //    sunshineHours,   // 年間日照時間 [h]
  //    daysBelow0,      // 冬日日数（最低気温0℃未満）[日]
  //    rainDays50,      // 日降水量50mm以上日数 [日]
  //    snowDepthMax,    // 最大積雪深の代替: 真冬日日数 [日]
  //    name,            // 気候帯名（engine互換用）
  //  }
  // ─────────────────────────────────────────
  async function getClimateAt(lat, lon) {
    const stations = await loadStations();
    const nearest  = findNearestStation(lat, lon, stations);
    if (!nearest) throw new Error('最寄り局が見つかりません');

    const monthly = await fetchMonthly(nearest.station_no);
    const dist    = haversine(lat, lon, nearest.lat, nearest.lon);

    const months  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const parts   = ['early','mid','late'];

    // ── 旬キーで月平均を計算するヘルパー ──
    // 各月3旬の平均を返す（nullは除外、全nullなら null）
    const monthAvgByDecade = (key, divisor = 10) => {
      return months.map(m => {
        const vs = parts.map(p => {
          const e = monthly[key]?.data[`${m}_${p}`];
          return (e && e.q !== 0) ? e.v / divisor : null;
        }).filter(v => v !== null);
        return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
      });
    };

    // 旬キーで月合計を計算するヘルパー（降水量など）
    const monthSumByDecade = (key, divisor = 10) => {
      return months.map(m => {
        const vs = parts.map(p => {
          const e = monthly[key]?.data[`${m}_${p}`];
          return (e && e.q !== 0) ? e.v / divisor : null;
        }).filter(v => v !== null);
        return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
      });
    };

    // 気温: temp_max_mean=日最高気温平均, temp_min_mean=日最低気温平均, temp_mean=旬平均気温
    const tMaxMonthly = monthAvgByDecade('temp_max_mean', 10); // 12要素（月平均日最高気温）
    const tMinMonthly = monthAvgByDecade('temp_min_mean', 10); // 12要素（月平均日最低気温）
    const tMeanMonthly = monthAvgByDecade('temp_mean',    10); // 12要素（月旬平均気温の平均）

    // 年平均気温 = temp_mean の月平均から12ヶ月平均
    const tMeanValid = tMeanMonthly.filter(v => v !== null);
    const tempMean = tMeanValid.length
      ? tMeanValid.reduce((a, b) => a + b, 0) / tMeanValid.length
      : null;

    // tempMaxMean / tempMinMean（年平均値）
    const tMaxValid = tMaxMonthly.filter(v => v !== null);
    const tMinValid = tMinMonthly.filter(v => v !== null);

    // 月別降水量: rain_total（旬合計 0.1mm → mm）
    const rainByDecadeSum = monthSumByDecade('rain_total', 10); // 月合計mm
    const rainMonthly = {};
    let rainSum = null;
    if (rainByDecadeSum.some(v => v !== null)) {
      months.forEach((m, i) => { rainMonthly[m] = rainByDecadeSum[i] ?? 0; });
      rainSum = rainByDecadeSum.reduce((a, b) => a + (b ?? 0), 0);
    }

    // 日照時間: sunshine_hours（旬合計 0.1h → h）
    const sunByDecadeSum = monthSumByDecade('sunshine_hours', 10);
    const sunshine = sunByDecadeSum.some(v => v !== null)
      ? sunByDecadeSum.reduce((a, b) => a + (b ?? 0), 0)
      : null;

    // 冬日日数・真冬日（annual キーがあれば使用、なければ null）
    const daysBelow0 = val(monthly, 'days_temp_lt0',  'annual', 1);
    const rainDays50 = val(monthly, 'rain_days_50',   'annual', 1);
    const snowDays   = val(monthly, 'days_tmax_lt0',  'annual', 1);

    // 1月最低気温（3旬平均）
    const tempMinJanVals = parts.map(p => {
      const e = monthly['temp_min_mean']?.data[`jan_${p}`];
      return (e && e.q !== 0) ? e.v / 10 : null;
    }).filter(v => v !== null);
    const tempMinJan = tempMinJanVals.length
      ? tempMinJanVals.reduce((a, b) => a + b, 0) / tempMinJanVals.length
      : null;

    // 気候帯名（engine互換用: tempMeanから推定）
    const name = _climateName(tempMean);

    // 旬配列（phenology.js が必要）
    const decadeArr = (typeof Phenology !== 'undefined')
      ? Phenology.buildDecadeArray(monthly)
      : null;

    return {
      stationNo:     nearest.station_no,
      stationName:   nearest.name_kanji,
      distKm:        Math.round(dist * 10) / 10,
      tempMean:      tempMean !== null ? Math.round(tempMean * 10) / 10 : null,
      tempMaxMean:   tMaxValid.length ? Math.round(tMaxValid.reduce((a,b)=>a+b,0)/tMaxValid.length*10)/10 : null,
      tempMinMean:   tMinValid.length ? Math.round(tMinValid.reduce((a,b)=>a+b,0)/tMinValid.length*10)/10 : null,
      tempMinJan:    tempMinJan !== null ? Math.round(tempMinJan * 10) / 10 : null,
      rain:          rainSum,
      rainMonthly,
      sunshineHours: sunshine !== null ? Math.round(sunshine) : null,
      daysBelow0:    daysBelow0,
      rainDays50:    rainDays50,
      snowDays:      snowDays,
      name,
      decadeArr,     // 旬36点データ {tMax, tMin, tMean, sun, keys}
    };
  }

  // engine.js CLIMATE_TABLE 互換の気候帯名
  function _climateName(tempMean) {
    if (tempMean === null) return '不明';
    if (tempMean >= 21) return '亜熱帯';
    if (tempMean >= 17) return '温暖帯南部';
    if (tempMean >= 15) return '温暖帯';
    if (tempMean >= 12) return '温帯';
    if (tempMean >= 9)  return '冷温帯';
    if (tempMean >= 7)  return '亜寒帯南部';
    return '亜寒帯';
  }

  // ─────────────────────────────────────────
  //  公開API
  // ─────────────────────────────────────────
  return {
    init:             loadStations,    // 起動時に呼ぶ（任意・先読みしたい場合）
    getClimateAt,                      // engine.js から使う主API
    findNearestStation,                // テスト・デバッグ用
  };
})();