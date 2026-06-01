// ═══════════════════════════════════════════
//  FERTILIZER ENGINE — 施肥計算
// ═══════════════════════════════════════════

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
