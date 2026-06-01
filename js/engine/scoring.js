// ═══════════════════════════════════════════
//  SCORING ENGINE — 欠損込みで動く
// ═══════════════════════════════════════════

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
