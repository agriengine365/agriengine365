// ═══════════════════════════════════════════
//  AREA CHARTS — ADPパネル 気候ビジュアライゼーション
//  依存: Chart.js (CDN), AmedasLoader (amedas.js), engine.js
// ═══════════════════════════════════════════

const AreaCharts = (() => {

  // ── Chart.jsインスタンス管理（再生成時に destroy） ──
  let _chartInstance = null;

  // ── カラーパレット（style.css CSS変数と対応） ──
  const C = {
    green:  '#4ade80',
    amber:  '#fbbf24',
    red:    '#f87171',
    blue:   '#60a5fa',
    teal:   '#2dd4bf',
    text:   '#e2ede3',
    text2:  '#8faa91',
    text3:  '#5a7a5c',
    border: '#2a3d2c',
  };

  const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const MONTH_KEYS   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  // ─────────────────────────────────────────
  //  公開: ADPパネルへのチャートセクション描画
  // ─────────────────────────────────────────
  async function render(area) {
    const wrap = document.getElementById('adp-charts-wrap');
    if (!wrap) return;

    const lat = area.landProfile?.lat ?? area.meta?.lat ?? null;
    const lng = area.landProfile?.lng ?? area.meta?.lng ?? null;

    // 座標なし
    if (lat === null || lng === null) {
      wrap.innerHTML = `
        <div class="adpc-section">
          <div class="adpc-section-title">気候データ</div>
          <div class="adpc-nodata">座標データがないため気候チャートを表示できません</div>
        </div>`;
      return;
    }

    // ローディング
    wrap.innerHTML = `
      <div class="adpc-section">
        <div class="adpc-section-title">気候データ</div>
        <div class="adpc-loading">
          <span class="adpc-spinner"></span>
          <span>AMeDAS平年値を取得中...</span>
        </div>
      </div>`;

    // AMeDASから月別データを直接fetchして月別配列を得る
    let climate = null;
    let isFallback = false;

    try {
      // AmedasLoader.getClimateAt は stationNo を返すので
      // 内部 monthly データを別途取得するため、
      // カスタムfetch関数で月別配列を付与する
      climate = await _getClimateWithMonthly(lat, lng);
    } catch (e) {
      console.warn('[AreaCharts] AMeDAS取得失敗:', e);
      isFallback = true;
      climate    = _buildFallbackClimate(lat, area);
    }

    _renderAll(wrap, area, climate, isFallback);
  }

  // ─────────────────────────────────────────
  //  AMeDASから月別配列付きのclimateオブジェクトを返す
  //  amedas.jsの getClimateAt を呼んだ後、
  //  同じ局の monthly JSON を再fetch（キャッシュ済みのため実質2重fetchなし）
  // ─────────────────────────────────────────
  async function _getClimateWithMonthly(lat, lng) {
    const base = await AmedasLoader.getClimateAt(lat, lng);

    // 月別JSONを再取得（amedas.js側でキャッシュ済みのため高速）
    const res = await fetch(`data/monthly/${base.stationNo}.json`);
    if (!res.ok) throw new Error(`monthly fetch failed: ${res.status}`);
    const monthly = await res.json();

    // 月別最高・最低気温配列を組み立て
    const _tMaxArr = MONTH_KEYS.map(m => {
      const e = monthly['temp_mean']?.data?.[m];
      return (e && e.q !== 0) ? Math.round(e.v / 10 * 10) / 10 : null;
    });
    const _tMinArr = MONTH_KEYS.map(m => {
      const e = monthly['temp_min_mean']?.data?.[m];
      return (e && e.q !== 0) ? Math.round(e.v / 10 * 10) / 10 : null;
    });

    return {
      ...base,
      _tMaxArr: _tMaxArr.some(v => v !== null) ? _tMaxArr : null,
      _tMinArr: _tMinArr.some(v => v !== null) ? _tMinArr : null,
    };
  }

  // ─────────────────────────────────────────
  //  フォールバック気候データ（engine.js テーブル値）
  // ─────────────────────────────────────────
  function _buildFallbackClimate(lat, area) {
    const cl = (typeof getClimate === 'function') ? getClimate(lat) : null;
    const lp = area.landProfile || {};
    return {
      stationName:  null,
      distKm:       null,
      tempMean:     lp.avgTemp         ?? cl?.tempMean ?? null,
      rain:         lp.annualRainfall  ?? cl?.rain     ?? null,
      rainMonthly:  null,
      sunshineHours: lp.sunshineHours  ?? null,
      name:         lp.climateName     ?? cl?.name     ?? '—',
      _tMaxArr:     null,
      _tMinArr:     null,
      _isFallback:  true,
    };
  }

  // ─────────────────────────────────────────
  //  全セクション描画
  // ─────────────────────────────────────────
  function _renderAll(wrap, area, climate, isFallback) {
    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }

    const stationBadge = isFallback
      ? '<span class="adpc-badge-warn">推定値</span>'
      : `<span class="adpc-badge-ok">${climate.stationName ?? ''}${climate.distKm != null ? '&nbsp;' + climate.distKm + 'km' : ''}</span>`;

    const hasMonthlyChart = !!(climate._tMaxArr || climate._tMinArr || climate.rainMonthly);

    wrap.innerHTML = `
      <div class="adpc-section">
        <div class="adpc-section-title">気候サマリー ${stationBadge}</div>
        <div id="adpc-summary-grid" class="adpc-summary-grid"></div>
      </div>

      <div class="adpc-section">
        <div class="adpc-section-title">月別気温 / 降水量</div>
        ${hasMonthlyChart
          ? '<div class="adpc-chart-wrap"><canvas id="adpc-climate-chart"></canvas></div>'
          : '<div class="adpc-nodata">月別データなし（AMeDAS未取得）</div>'
        }
      </div>

      <div class="adpc-section">
        <div class="adpc-section-title">環境リスク</div>
        <div id="adpc-risk-gauges" class="adpc-risk-gauges"></div>
      </div>
    `;

    _renderSummaryGrid(climate, area);
    if (hasMonthlyChart) _renderClimateChart(climate);
    _renderRiskGauges(area);
  }

  // ─────────────────────────────────────────
  //  気候サマリーグリッド（2列テキスト）
  // ─────────────────────────────────────────
  function _renderSummaryGrid(climate, area) {
    const grid = document.getElementById('adpc-summary-grid');
    if (!grid) return;

    const lp   = area.landProfile || {};
    const elev = lp.elevation ?? area.meta?.elev ?? null;
    const ph   = lp.ph ?? null;
    const slope = lp.slope ?? null;

    const rows = [
      { label: '気候帯',     value: climate.name || lp.climateName || '—' },
      { label: '年均気温',   value: climate.tempMean != null ? `${climate.tempMean.toFixed(1)} ℃` : '—' },
      { label: '年降水量',   value: climate.rain     != null ? `${Math.round(climate.rain)} mm`   : '—' },
      { label: '日照時間',   value: (climate.sunshineHours ?? lp.sunshineHours) != null
                                    ? `${Math.round(climate.sunshineHours ?? lp.sunshineHours)} h` : '—' },
      { label: '標高',       value: elev  != null ? `${Math.round(elev)} m`  : '—' },
      { label: '土壌pH',     value: ph    != null ? ph.toFixed(1)            : '—' },
      { label: '傾斜',       value: slope != null ? `${slope}°`              : '—' },
      { label: '最寄局距離', value: climate.distKm != null ? `${climate.distKm} km` : '—' },
    ];

    grid.innerHTML = rows.map(r => `
      <div class="adpc-summary-item">
        <span class="adpc-summary-label">${r.label}</span>
        <span class="adpc-summary-value">${r.value}</span>
      </div>`).join('');
  }

  // ─────────────────────────────────────────
  //  月別気温＋降水量 複合チャート（Chart.js）
  //  棒: 降水量(左軸) / 折れ線: 最高・最低気温(右軸)
  // ─────────────────────────────────────────
  function _renderClimateChart(climate) {
    const canvas = document.getElementById('adpc-climate-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const rainData = MONTH_KEYS.map(m => climate.rainMonthly?.[m] ?? null);
    const hasRain  = rainData.some(v => v !== null);
    const hasTemp  = !!(climate._tMaxArr || climate._tMinArr);

    const datasets = [];

    // 降水量 — 棒グラフ（左軸）
    if (hasRain) {
      datasets.push({
        type:            'bar',
        label:           '降水量 (mm)',
        data:            rainData,
        backgroundColor: 'rgba(96,165,250,0.30)',
        borderColor:     C.blue,
        borderWidth:     1,
        borderRadius:    3,
        yAxisID:         'yRain',
        order:           2,
      });
    }

    // 月別最高気温 — 折れ線（右軸）
    if (climate._tMaxArr) {
      datasets.push({
        type:            'line',
        label:           '日最高気温 (℃)',
        data:            climate._tMaxArr,
        borderColor:     C.amber,
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderWidth:     2,
        pointRadius:     3,
        pointHoverRadius: 5,
        tension:         0.4,
        fill:            false,
        yAxisID:         'yTemp',
        order:           1,
      });
    }

    // 月別最低気温 — 折れ線（右軸）
    if (climate._tMinArr) {
      datasets.push({
        type:            'line',
        label:           '日最低気温 (℃)',
        data:            climate._tMinArr,
        borderColor:     C.teal,
        backgroundColor: 'rgba(45,212,191,0.08)',
        borderWidth:     2,
        pointRadius:     3,
        pointHoverRadius: 5,
        tension:         0.4,
        fill:            false,
        yAxisID:         'yTemp',
        order:           1,
      });
    }

    // 月別データなし・年平均のみ → 破線でプロット
    if (!hasTemp && climate.tempMean != null) {
      datasets.push({
        type:        'line',
        label:       '年均気温（推定）',
        data:        Array(12).fill(climate.tempMean),
        borderColor: C.green,
        borderWidth: 1.5,
        borderDash:  [5, 5],
        pointRadius: 0,
        tension:     0,
        fill:        false,
        yAxisID:     'yTemp',
        order:       1,
      });
    }

    if (datasets.length === 0) return;

    // ─ スケール定義 ─
    const scales = {
      x: {
        ticks: { color: C.text2, font: { size: 10 }, maxRotation: 0 },
        grid:  { color: 'rgba(42,61,44,0.6)' },
      },
      yTemp: {
        type:     'linear',
        position: 'right',
        title: { display: true, text: '℃', color: C.text3, font: { size: 10 } },
        ticks: { color: C.amber, font: { size: 10 }, callback: v => `${v}℃` },
        grid:  { color: hasRain ? 'transparent' : 'rgba(42,61,44,0.6)' },
      },
    };

    if (hasRain) {
      scales.yRain = {
        type:     'linear',
        position: 'left',
        title: { display: true, text: 'mm', color: C.text3, font: { size: 10 } },
        ticks: { color: C.blue, font: { size: 10 }, callback: v => `${v}` },
        grid:  { color: 'rgba(42,61,44,0.6)' },
        min:   0,
      };
    }

    const ctx = canvas.getContext('2d');
    _chartInstance = new Chart(ctx, {
      data: { labels: MONTH_LABELS, datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display:  true,
            position: 'bottom',
            labels: {
              color:    C.text2,
              font:     { size: 10 },
              boxWidth: 12,
              padding:  8,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(14,26,18,0.95)',
            borderColor:     C.border,
            borderWidth:     1,
            titleColor:      C.text,
            bodyColor:       C.text2,
            padding:         10,
          },
        },
        scales,
      },
    });
  }

  // ─────────────────────────────────────────
  //  環境リスクゲージ（横バー3本）
  // ─────────────────────────────────────────
  function _renderRiskGauges(area) {
    const wrap = document.getElementById('adpc-risk-gauges');
    if (!wrap) return;

    const lp = area.landProfile || {};
    const gauges = [
      { label: '浸水リスク',   icon: '🌊', value: lp.floodRisk   ?? null, level: lp.floodRiskLevel   ?? null },
      { label: '干ばつリスク', icon: '☀️', value: lp.droughtRisk ?? null, level: lp.droughtRiskLevel ?? null },
      { label: '積雪リスク',   icon: '❄️', value: lp.snowRisk    ?? null, level: lp.snowRiskLevel    ?? null },
    ];

    if (gauges.every(g => g.value === null)) {
      wrap.innerHTML = '<div class="adpc-nodata">分析実行後にリスクが表示されます</div>';
      return;
    }

    wrap.innerHTML = gauges.map(g => {
      const pct   = g.value !== null ? Math.min(100, Math.max(0, g.value)) : 0;
      const color = g.level === 'high' ? C.red : g.level === 'medium' ? C.amber : C.green;
      const levelLabel = g.level === 'high' ? '高' : g.level === 'medium' ? '中' : g.value !== null ? '低' : '—';
      return `
        <div class="adpc-gauge-row">
          <span class="adpc-gauge-label">${g.icon} ${g.label}</span>
          <div class="adpc-gauge-track">
            <div class="adpc-gauge-bar" style="width:${pct}%;background:${color};box-shadow:0 0 6px ${color}55;transition:width 0.6s ease;"></div>
          </div>
          <span class="adpc-gauge-val" style="color:${g.value !== null ? color : C.text3}">${g.value !== null ? levelLabel : '—'}</span>
        </div>`;
    }).join('');
  }

  // ─────────────────────────────────────────
  //  公開API
  // ─────────────────────────────────────────
  return { render };
})();
