// ANALYSIS - land profile, crop matching, profitability, export

function fmtNum(value, digits = 1, empty = '-') {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : empty;
}

function fmtInt(value, empty = '-') {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)).toLocaleString() : empty;
}

function fmtYen(value) {
  if (!Number.isFinite(Number(value))) return '-';
  return 'JPY ' + Math.round(Number(value)).toLocaleString();
}

function riskBadge(level) {
  const label = level === 'high' ? 'HIGH' : level === 'medium' ? 'MID' : 'LOW';
  return `<span class="risk-badge risk-${level}">${label}</span>`;
}

function renderLandProfile(profile) {
  const el = document.getElementById('land-profile');
  if (!el) return;
  el.innerHTML = `
    <div class="profile-grid">
      <div class="profile-cell"><span>lat / lng</span><strong>${fmtNum(profile.lat, 5)} / ${fmtNum(profile.lng, 5)}</strong></div>
      <div class="profile-cell"><span>elevation</span><strong>${fmtInt(profile.elevation)} m</strong></div>
      <div class="profile-cell"><span>slope</span><strong>${fmtNum(profile.slope, 1)} deg</strong></div>
      <div class="profile-cell"><span>soilType</span><strong>${profile.soilType || 'unknown'}</strong></div>
      <div class="profile-cell"><span>avgTemp</span><strong>${fmtNum(profile.avgTemp, 1)} C</strong></div>
      <div class="profile-cell"><span>annualRainfall</span><strong>${fmtInt(profile.annualRainfall)} mm</strong></div>
      <div class="profile-cell"><span>sunshineHours</span><strong>${fmtInt(profile.sunshineHours)} h</strong></div>
      <div class="profile-cell"><span>pH</span><strong>${fmtNum(profile.ph, 1)}</strong></div>
    </div>
    <div class="risk-strip">
      <div>Flood ${riskBadge(profile.floodRiskLevel)} <strong>${profile.floodRisk}%</strong></div>
      <div>Drought ${riskBadge(profile.droughtRiskLevel)} <strong>${profile.droughtRisk}%</strong></div>
      <div>Snow ${riskBadge(profile.snowRiskLevel)} <strong>${profile.snowRisk}%</strong></div>
    </div>
  `;
}

function renderCropRanking(scores) {
  const rankEl = document.getElementById('crop-ranking');
  if (!rankEl) return;
  rankEl.innerHTML = scores.slice(0, 8).map((s, i) => `
    <div class="crop-item ${s.viable ? '' : 'crop-item-blocked'}">
      <div class="crop-rank">#${i + 1}</div>
      <div style="flex:1;min-width:0;">
        <div class="crop-name">${s.crop.name}</div>
        <div class="crop-score-bar">
          <div class="crop-score-bar-fill" style="width:${s.viable ? s.score : 0}%"></div>
        </div>
        ${s.alert ? `<div class="crop-alert-mini">${s.alert}</div>` : ''}
      </div>
      <div class="crop-score">${s.viable ? s.score + '%' : 'NG'}</div>
    </div>
  `).join('');
}

function renderProfitWaterfall(result) {
  const el = document.getElementById('profit-waterfall');
  if (!el) return;
  if (!result) {
    el.innerHTML = '<div class="empty-mini">No crop result.</div>';
    return;
  }

  const p = result.profitability;
  const maxAbs = Math.max(
    Math.abs(p.revenue),
    Math.abs(p.initialCost),
    Math.abs(p.annualCost + p.laborCost),
    Math.abs(p.riskDeduction),
    Math.abs(p.averageProfit),
    1
  );
  const row = (label, value, type) => {
    const width = Math.max(8, Math.min(100, Math.abs(value) / maxAbs * 100));
    return `
      <div class="waterfall-row">
        <div class="waterfall-label">${label}</div>
        <div class="waterfall-track">
          <div class="waterfall-bar ${type}" style="width:${width}%"></div>
        </div>
        <div class="waterfall-value">${fmtYen(value)}</div>
      </div>
    `;
  };

  el.innerHTML = `
    <div class="profit-summary">
      <div><span>target</span><strong>${result.crop.name}</strong></div>
      <div><span>yield</span><strong>${fmtInt(p.predictedYield)} kg</strong></div>
      <div><span>marketable</span><strong>${Math.round(p.marketableYieldRate * 100)}%</strong></div>
      <div><span>profit</span><strong class="${p.averageProfit >= 0 ? 'profit-plus' : 'profit-minus'}">${fmtYen(p.averageProfit)}</strong></div>
    </div>
    ${row('[+] yield revenue', p.revenue, 'plus')}
    ${row('[-] initial cost', -p.initialCost, 'minus')}
    ${row('[-] annual + labor', -(p.annualCost + p.laborCost), 'minus')}
    ${row('[-] risk deduction', -p.riskDeduction, 'minus')}
    ${row('[=] average profit', p.averageProfit, p.averageProfit >= 0 ? 'plus' : 'minus')}
  `;
}

function runAnalysis(areaName) {
  if (!currentAreaData) return;

  document.getElementById('analysis-empty').style.display  = 'none';
  document.getElementById('analysis-result').style.display = 'flex';

  const ad = currentAreaData;
  const result = buildAnalysisResult(ad);
  const profile = result.landProfile;
  ad.landProfile = profile;
  ad.analysisSnapshot = {
    areaName,
    topCropId: result.topCrop?.crop?.id || null,
    topScore: result.topCrop?.score || null,
    topProfit: result.topCrop?.profitability?.averageProfit || null,
  };

  const conf = calcConfidence(areaDataFromLandProfile(ad, profile));
  const confPct = conf.pct;
  const bar = document.getElementById('conf-bar');
  bar.style.width = confPct + '%';
  bar.className = 'conf-bar-fill' + (confPct < 40 ? ' vlow' : confPct < 70 ? ' low' : '');
  document.getElementById('conf-pct').textContent = confPct + '%';
  document.getElementById('conf-label').textContent =
    confPct >= 70 ? 'High confidence' : confPct >= 40 ? 'Medium confidence' : 'Low confidence';
  document.getElementById('conf-detail').innerHTML = conf.items.map(i => `- ${i}`).join('<br>');

  document.getElementById('land-eval').innerHTML = `
    <div class="area-stat"><span class="label">Climate</span><span class="value" style="font-size:12px;">${profile.climateName || '-'}</span></div>
    <div class="area-stat"><span class="label">Avg temp</span><span class="value">${fmtNum(profile.avgTemp, 1)}<span class="unit">C</span></span></div>
    <div class="area-stat"><span class="label">Rainfall</span><span class="value">${fmtInt(profile.annualRainfall)}<span class="unit">mm</span></span></div>
    <div class="area-stat"><span class="label">Elevation</span><span class="value">${fmtInt(profile.elevation)}<span class="unit">m</span></span></div>
    <div class="area-stat"><span class="label">Soil</span><span class="value" style="font-size:11px;">${profile.soilType || 'unknown'}</span></div>
  `;

  renderLandProfile(profile);
  renderCropRanking(result.cropScores);
  renderProfitWaterfall(result.topCrop);

  const top = result.topCrop;
  const topCrop = top?.crop;
  if (topCrop && ad.areaSqm > 0) {
    const fert = calcFertilizer(topCrop, ad.areaSqm);
    document.getElementById('fert-result').innerHTML = `
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">Target: ${topCrop.name} / ${fert.area10a} 10a</div>
      <div class="area-stat"><span class="label">N</span><span class="value">${fert.N}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">P</span><span class="value">${fert.P}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">K</span><span class="value">${fert.K}<span class="unit">kg</span></span></div>
      <div class="notice notice-info" style="margin-top:8px;">${fert.notes}</div>
    `;
  } else {
    document.getElementById('fert-result').innerHTML =
      '<div style="color:var(--text3);font-size:11px;">Area is unavailable.</div>';
  }

  const riskEl = document.getElementById('risk-result');
  riskEl.innerHTML = topCrop ? topCrop.risks.map(r => {
    const color = r.level === 'high' ? 'var(--red)' : r.level === 'medium' ? 'var(--amber)' : 'var(--green2)';
    return `
      <div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border);">
        <span style="color:${color};font-size:10px;font-family:var(--mono);padding-top:2px;flex-shrink:0;">${r.level.toUpperCase()}</span>
        <div>
          <div style="font-size:12px;font-weight:500;">${r.name}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;">${r.note}</div>
        </div>
      </div>
    `;
  }).join('') : '';
}

function exportJSON() {
  if (!currentAreaData) return;
  const result = buildAnalysisResult(currentAreaData);
  const data = {
    exportedAt: new Date().toISOString(),
    areaData: currentAreaData,
    landProfile: result.landProfile,
    analysis: {
      cropScores: result.cropScores.map(s => ({
        crop: s.crop.id,
        name: s.crop.name,
        score: s.score,
        viable: s.viable,
        averageProfit: s.profitability.averageProfit,
      })),
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agrisim_${Date.now()}.json`;
  a.click();
}
