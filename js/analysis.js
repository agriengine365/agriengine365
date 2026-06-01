// ═══════════════════════════════════════════
//  ANALYSIS — 分析実行・結果表示・エクスポート
// ═══════════════════════════════════════════

function runAnalysis(areaName) {
  if (!currentAreaData) return;

  document.getElementById('analysis-empty').style.display  = 'none';
  document.getElementById('analysis-result').style.display = 'flex';

  const ad = currentAreaData;

  // 信頼度
  const conf    = calcConfidence(ad);
  const confPct = conf.pct;
  const bar     = document.getElementById('conf-bar');
  bar.style.width = confPct + '%';
  bar.className   = 'conf-bar-fill' + (confPct < 40 ? ' vlow' : confPct < 70 ? ' low' : '');
  document.getElementById('conf-pct').textContent   = confPct + '%';
  document.getElementById('conf-label').textContent =
    confPct >= 70 ? '高精度' : confPct >= 40 ? '中精度' : '低精度（推定値ベース）';
  document.getElementById('conf-detail').innerHTML  = conf.items.map(i => `・${i}`).join('<br>');

  // 土地評価
  const climate  = ad.climate;
  const corrTemp = climate && ad.elev ? elevCorrect(climate.tempMean, ad.elev) : climate?.tempMean;
  document.getElementById('land-eval').innerHTML = `
    <div class="area-stat"><span class="label">気候帯</span><span class="value" style="font-size:12px;">${climate?.name || '—'}</span></div>
    <div class="area-stat"><span class="label">推定年均気温</span><span class="value">${corrTemp != null ? corrTemp.toFixed(1) : '—'}<span class="unit">℃</span></span></div>
    <div class="area-stat"><span class="label">推定年間降水量</span><span class="value">${climate?.rain || '—'}<span class="unit">mm</span></span></div>
    <div class="area-stat"><span class="label">標高</span><span class="value">${ad.elev != null ? Math.round(ad.elev) : '—'}<span class="unit">m</span></span></div>
    <div class="area-stat"><span class="label">土壌タイプ</span><span class="value" style="font-size:11px;">${ad.soilType || '未入力'}</span></div>
  `;

  // 作物ランキング
  const scores  = CROP_DB.map(c => scoreCrop(c, ad)).sort((a, b) => b.score - a.score);
  const rankEl  = document.getElementById('crop-ranking');
  rankEl.innerHTML = scores.map((s, i) => `
    <div class="crop-item">
      <div class="crop-rank">#${i+1}</div>
      <div style="flex:1;">
        <div class="crop-name">${s.crop.name}</div>
        <div class="crop-score-bar"><div class="crop-score-bar-fill" style="width:${s.score}%"></div></div>
      </div>
      <div class="crop-score">${s.score}%</div>
    </div>
  `).join('');

  // 施肥概算（1位作物）
  const topCrop = scores[0].crop;
  if (ad.areaSqm > 0) {
    const fert = calcFertilizer(topCrop, ad.areaSqm);
    document.getElementById('fert-result').innerHTML = `
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">対象：${topCrop.name}　面積：${(ad.areaSqm/1000).toFixed(2)}a（${fert.area10a} 10a）</div>
      <div class="area-stat"><span class="label">窒素 (N)</span><span class="value">${fert.N}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">リン酸 (P)</span><span class="value">${fert.P}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">カリ (K)</span><span class="value">${fert.K}<span class="unit">kg</span></span></div>
      <div class="notice notice-info" style="margin-top:8px;">${fert.notes}</div>
    `;
  } else {
    document.getElementById('fert-result').innerHTML =
      '<div style="color:var(--text3);font-size:11px;">面積が取得できていません</div>';
  }

  // リスク
  const riskEl = document.getElementById('risk-result');
  riskEl.innerHTML = topCrop.risks.map(r => {
    const color = r.level === 'high' ? 'var(--red)' : r.level === 'medium' ? 'var(--amber)' : 'var(--green2)';
    return `
      <div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border);">
        <span style="color:${color};font-size:10px;font-family:var(--mono);padding-top:2px;flex-shrink:0;">
          ${r.level === 'high' ? '高' : r.level === 'medium' ? '中' : '低'}
        </span>
        <div>
          <div style="font-size:12px;font-weight:500;">${r.name}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;">${r.note}</div>
        </div>
      </div>
    `;
  }).join('');
}

function exportJSON() {
  if (!currentAreaData) return;
  const scores = CROP_DB.map(c => scoreCrop(c, currentAreaData));
  const data   = {
    exportedAt: new Date().toISOString(),
    areaData:   currentAreaData,
    analysis: {
      cropScores: scores.map(s => ({ crop: s.crop.id, name: s.crop.name, score: s.score })),
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `agrisim_${Date.now()}.json`;
  a.click();
}
