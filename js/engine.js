// ═══════════════════════════════════════════
//  ENGINE — 気候推定 / スコアリング / 施肥計算
// ═══════════════════════════════════════════

// ─── CLIMATE ───
const CLIMATE_TABLE = [
  { latMin:24, latMax:27, name:'亜熱帯',      tempMean:23, rain:2100 },
  { latMin:27, latMax:31, name:'温暖帯南部',   tempMean:19, rain:1800 },
  { latMin:31, latMax:34, name:'温暖帯',       tempMean:17, rain:1600 },
  { latMin:34, latMax:37, name:'温帯',         tempMean:14, rain:1300 },
  { latMin:37, latMax:40, name:'冷温帯',       tempMean:11, rain:1200 },
  { latMin:40, latMax:43, name:'亜寒帯南部',   tempMean:8,  rain:1100 },
  { latMin:43, latMax:46, name:'亜寒帯',       tempMean:6,  rain:1000 },
];

function getClimate(lat) {
  return CLIMATE_TABLE.find(c => lat >= c.latMin && lat < c.latMax)
    || CLIMATE_TABLE[CLIMATE_TABLE.length - 1];
}

// 標高補正: 100mごとに約0.6℃低下
function elevCorrect(tempMean, elev) {
  return tempMean - (elev / 100) * 0.6;
}

// ─── SCORING ───
function scoreCrop(crop, areaData) {
  const { lat, elev, soilType, climate } = areaData;
  let score = 0;
  let maxScore = 0;
  const details = [];

  // 1. 緯度スコア (30点)
  maxScore += 30;
  if (lat !== null) {
    const c = crop.conditions;
    if (lat >= c.latMin && lat <= c.latMax) {
      score += 30;
      details.push({ ok: true, text: `緯度 ${lat.toFixed(2)}° — 適正範囲内` });
    } else {
      const dist = Math.min(Math.abs(lat - c.latMin), Math.abs(lat - c.latMax));
      const s = Math.max(0, 30 - dist * 10);
      score += s;
      details.push({ ok: s > 0, text: `緯度 ${lat.toFixed(2)}° — 適正外 (${c.latMin}–${c.latMax}°)` });
    }
  }

  // 2. 標高スコア (20点)
  maxScore += 20;
  if (elev !== null) {
    if (elev <= crop.conditions.elevMax) {
      score += 20;
      details.push({ ok: true, text: `標高 ${Math.round(elev)}m — 適正範囲内` });
    } else {
      const over = elev - crop.conditions.elevMax;
      const s = Math.max(0, 20 - over / 20);
      score += s;
      details.push({ ok: false, text: `標高 ${Math.round(elev)}m — 上限(${crop.conditions.elevMax}m)超過` });
    }
  }

  // 3. 気温スコア (25点)
  maxScore += 25;
  if (climate) {
    const corrTemp = elev ? elevCorrect(climate.tempMean, elev) : climate.tempMean;
    const c = crop.conditions;
    if (corrTemp >= c.tempMeanMin && corrTemp <= c.tempMeanMax) {
      score += 25;
      details.push({ ok: true, text: `推定年均気温 ${corrTemp.toFixed(1)}℃ — 適正` });
    } else {
      details.push({ ok: false, text: `推定年均気温 ${corrTemp.toFixed(1)}℃ — 適正外(${c.tempMeanMin}–${c.tempMeanMax}℃)` });
    }
  }

  // 4. 土壌スコア (25点)
  maxScore += 25;
  if (soilType && soilType !== 'unknown') {
    if (crop.conditions.soilTypes.includes(soilType)) {
      score += 25;
      details.push({ ok: true, text: '土壌タイプ — 適合' });
    } else {
      details.push({ ok: false, text: '土壌タイプ — 非推奨（土壌改良を要検討）' });
    }
  } else {
    score += 12;
    details.push({ ok: null, text: '土壌タイプ未入力 — 推定値使用' });
  }

  const pct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
  return { crop, score: pct, details };
}

function calcConfidence(areaData) {
  let pts = 0;
  const items = [];
  if (areaData.lat)     { pts += 30; items.push('緯度情報 ✓'); }
  if (areaData.elev)    { pts += 25; items.push('標高情報 ✓'); }
  if (areaData.climate) { pts += 20; items.push('気候推定 ✓'); }
  if (areaData.soilType && areaData.soilType !== 'unknown') {
    pts += 25; items.push('土壌タイプ ✓');
  } else {
    items.push('土壌タイプ 未入力（精度↓）');
  }
  return { pct: pts, items };
}

// ─── FERTILIZER ───
function calcFertilizer(crop, areaSqm) {
  const per10a = crop.fertilizer;
  const area10a = areaSqm / 1000; // 1000㎡ = 10a
  return {
    N:       (per10a.N * area10a).toFixed(1),
    P:       (per10a.P * area10a).toFixed(1),
    K:       (per10a.K * area10a).toFixed(1),
    area10a: area10a.toFixed(2),
    notes:   per10a.notes,
  };
}
