// ═══════════════════════════════════════════
//  AREA — 自動保存・一覧・削除・選択・インライン編集
// ═══════════════════════════════════════════

// ─── ウィザードからの確定保存 ───
async function commitSaveArea({ name, memo, soilType }) {
  if (!currentPolygon || !currentAreaData) {
    showToast('保存対象のエリアがありません', 'amber');
    return;
  }

  const geojson = currentPolygon.toGeoJSON();

  // Firestore はネスト配列不可 → climate内の配列フィールドを除去してから landProfile を生成
  const cleanedAreaData = { ...currentAreaData };
  if (cleanedAreaData.climate) {
    const { decadeArr, ...safeClimate } = cleanedAreaData.climate;
    cleanedAreaData.climate = safeClimate;
  }
  const landProfile = buildLandProfile({ ...cleanedAreaData, soilType });

  // GeoJSON座標はネスト配列のためFirestore非対応 → 文字列化して保存
  const geojsonStr = JSON.stringify(geojson);

  // ─── env フィールドを気候データから生成 ───
  // AMeDAS取得済みの場合は buildEnvFromClimate で変換、なければ空スキーマ
  let envPayload = null;
  if (typeof buildEnvFromClimate === 'function') {
    const climateForEnv = currentAreaData.climate || null;
    envPayload = buildEnvFromClimate(climateForEnv);
    // soilType はウィザードで選択したものを優先
    if (soilType) envPayload.soilType = soilType;
  }

  // EFD「圃場の種類」選択（ハウス／加温）で選ばれていれば初期値として反映。
  // 露地の場合はキー自体を付けない（既存の a.cultivationMode || 'openField' という
  // 参照側のフォールバックと整合させるため）。値を使ったら即リセットする
  // （「続けて追加」等で次のエリア作成に誤って引き継がれないようにするため）。
  const _pendingCultMode = (typeof pendingCultivationMode !== 'undefined') ? pendingCultivationMode : null;
  if (typeof pendingCultivationMode !== 'undefined') pendingCultivationMode = null;

  const payload = {
    name,
    memo,
    geojson: geojsonStr,
    landProfile,
    ...(_pendingCultMode ? { cultivationMode: _pendingCultMode } : {}),
    env: envPayload || (typeof createEmptyEnv === 'function' ? createEmptyEnv() : {}),
    meta: {
      areaSqm:         currentAreaData.areaSqm,
      areaHa:          currentAreaData.areaHa,
      perimeter:       currentAreaData.perimeter,
      vertexCount:     currentAreaData.vertexCount,
      lat:             currentAreaData.lat,
      lng:             currentAreaData.lng,
      elev:            currentAreaData.elev,
      climateName:     currentAreaData.climate?.name        || null,
      climateTempMean: currentAreaData.climate?.tempMean    ?? null,
      climateRain:     currentAreaData.climate?.rain        ?? null,
      climateSource:   currentAreaData.climate?.source      || 'table',
      // AMeDAS拡張フィールド（取得できた場合のみ）
      amStationNo:     currentAreaData.climate?.stationNo   || null,
      amStationName:   currentAreaData.climate?.stationName || null,
      amDistKm:        currentAreaData.climate?.distKm      ?? null,
      amTempMaxMean:   currentAreaData.climate?.tempMaxMean ?? null,
      amTempMinMean:   currentAreaData.climate?.tempMinMean ?? null,
      amTempMinJan:    currentAreaData.climate?.tempMinJan  ?? null,
      amSunshineHours: currentAreaData.climate?.sunshineHours ?? null,
      amDaysBelow0:    currentAreaData.climate?.daysBelow0  ?? null,
      amRainDays50:    currentAreaData.climate?.rainDays50  ?? null,
      amSnowDays:      currentAreaData.climate?.snowDays    ?? null,
      soilType:        soilType || null,
      // ridgeBaseDirection（畝方向）はエリア作成ウィザードの時点ではまだ決まらない。
      // 圃場ポリゴン確定後、栽植設計タブを開いてから _adpSelectRidgeDirEdge() /
      // _adpEnsureRidgeDirAutoDetected() 経由で meta.ridgeBaseDirection に設定・保存される
      // （_adpSaveRidgeBaseDirection() 参照）。ここでは常にnullで初期化するだけでよい。
      ridgeBaseDirection: null,
    },
    createdAt: new Date().toISOString(),
    profitOverrides: {},
  };

  try {
    if (db) {
      const ref = await db.collection('areas').add(payload);
      currentSavedAreaId = ref.id;
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      payload.id = 'local_' + Date.now();
      stored.push(payload);
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      currentSavedAreaId = payload.id;
    }
    showWizardDone(name);
    loadAreas();
  } catch(e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
  }
}

// ─── エリア一覧読み込み ───
async function loadAreas() {
  const list = document.getElementById('areas-list');
  list.innerHTML = '<div class="empty"><span class="spinner"></span> 読み込み中...</div>';

  let areas = [];
  try {
    if (db) {
      const snap = await db.collection('areas').orderBy('createdAt', 'desc').get();
      snap.forEach(doc => areas.push({ id: doc.id, ...doc.data() }));
    } else {
      areas = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]').reverse();
    }
  } catch(e) {
    console.error(e);
  }

  document.getElementById('areas-count').textContent = `${areas.length} エリア`;

  // 保存済み全エリアを地図に常時表示（初期表示・保存・編集・削除後すべてここを通る）
  if (typeof renderSavedAreasOnMap === 'function') renderSavedAreasOnMap(areas);

  if (areas.length === 0) {
    list.innerHTML = '<div class="empty"><div class="icon">🗾</div>保存されたエリアはありません。</div>';
    return;
  }

  list.innerHTML = '';
  areas.forEach(area => renderAreaItem(area, list));
}

// ─── エリアアイテム描画（2段構成: サマリー＋展開詳細） ───
function renderAreaItem(area, container) {
  const ha       = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
  const env      = area.env || {};
  const climate  = area.meta?.climateName || '—';
  const soil     = area.meta?.soilType ? soilLabel(area.meta.soilType) : '—';
  const tempMean = env.tempMean    != null ? env.tempMean.toFixed(1)    : (area.meta?.climateTempMean != null ? Number(area.meta.climateTempMean).toFixed(1) : '—');
  const rain     = env.rain        != null ? Math.round(env.rain)       : (area.meta?.climateRain     != null ? Math.round(area.meta.climateRain)            : '—');
  const ph       = env.ph          != null ? env.ph                     : '—';
  const gdd      = env.gdd         != null ? Math.round(env.gdd)        : '—';
  const ffDays   = env.frostFreeDays != null ? Math.round(env.frostFreeDays) : '—';
  const irrigSrc = { well:'井戸', river:'河川', pond:'溜池', none:'なし' }[env.irrigationSource] || '—';
  const roadW    = env.roadWidthM  != null ? env.roadWidthM + 'm'       : '—';
  const power    = env.hasPower === true ? 'あり' : env.hasPower === false ? 'なし' : '—';
  const wildlife = { low:'低', medium:'中', high:'高' }[env.wildlifeRisk] || '—';
  const hasEnv   = Object.keys(env).some(k => env[k] != null && k !== 'monthlyJson' && k !== 'decadeJson');
  const missingCount = typeof countMissingEnvFields === 'function' ? countMissingEnvFields(env) : 0;

  // 詳細フィールド表示ヘルパー
  function envRow(label, value) {
    return value != null && value !== ''
      ? `<div class="env-detail-row"><span class="env-detail-label">${label}</span><span class="env-detail-value">${value}</span></div>`
      : `<div class="env-detail-row env-detail-null"><span class="env-detail-label">${label}</span><span class="env-detail-value">—</span></div>`;
  }
  const lmap = { low:'低', medium:'中', high:'高' };
  const srcLabels = { well:'井戸', river:'河川', pond:'溜池', none:'なし' };

  const div = document.createElement('div');
  div.className = 'area-item';
  div.dataset.id = area.id;
  div.innerHTML = `
    <!-- ▲ サマリー行（常時表示） -->
    <div class="area-item-header">
      <div class="area-item-name" data-field="name">${escHtml(area.name)}</div>
      <div class="area-item-actions">
        <button class="pill-btn edit-btn" onclick="event.stopPropagation();toggleInlineEdit('${area.id}')">編集</button>
        <button class="btn btn-danger"    onclick="event.stopPropagation();deleteArea('${area.id}')">削除</button>
      </div>
    </div>

    <!-- サマリーバッジ行 -->
    <div class="area-summary-badges">
      <span class="area-badge">📐 ${ha}ha</span>
      <span class="area-badge">📍 ${climate}</span>
      <span class="area-badge">🌡️ ${tempMean}°C</span>
      <span class="area-badge">☔ ${rain}mm</span>
      <span class="area-badge">🌱 ${soil}</span>
      ${env.irrigationSource ? `<span class="area-badge">💧 ${irrigSrc}</span>` : ''}
      ${missingCount > 0 ? `<span class="area-badge area-badge-missing">📝 未入力${missingCount}件</span>` : ''}
    </div>
    <div class="area-summary-badges area-summary-badges-2">
      ${env.frostFreeDays != null ? `<span class="area-badge area-badge-sub">❄️ 無霜${ffDays}日</span>` : ''}
      ${env.gdd           != null ? `<span class="area-badge area-badge-sub">🌿 GDD ${gdd}</span>` : ''}
      ${env.ph            != null ? `<span class="area-badge area-badge-sub">🧪 pH ${ph}</span>` : ''}
      ${env.roadWidthM    != null ? `<span class="area-badge area-badge-sub">🚜 農道${roadW}</span>` : ''}
      ${env.hasPower      != null ? `<span class="area-badge area-badge-sub">⚡ 電源${power}</span>` : ''}
      ${env.wildlifeRisk  != null ? `<span class="area-badge area-badge-sub">🐗 獣害${wildlife}</span>` : ''}
    </div>
    ${area.memo ? `<div class="area-memo-display">${escHtml(area.memo)}</div>` : ''}

    <!-- ▼ 詳細展開ボタン -->
    <button class="area-detail-toggle" id="detail-toggle-${area.id}"
      onclick="event.stopPropagation();toggleAreaDetail('${area.id}')">
      <span>▼ 詳細</span>
    </button>

    <!-- ▼ 詳細展開パネル -->
    <div class="area-detail-panel" id="detail-panel-${area.id}" style="display:none;">

      <div class="env-detail-section">
        <div class="env-detail-section-title">🌡️ 気象</div>
        ${envRow('年均気温',       env.tempMean     != null ? env.tempMean.toFixed(1)+'°C' : null)}
        ${envRow('1月最低気温',    env.tempMinJan   != null ? env.tempMinJan.toFixed(1)+'°C' : null)}
        ${envRow('8月最高気温',    env.tempMax8     != null ? env.tempMax8.toFixed(1)+'°C' : null)}
        ${envRow('年降水量',       env.rain         != null ? Math.round(env.rain)+'mm' : null)}
        ${envRow('年日照時間',     env.sunshineHours!= null ? Math.round(env.sunshineHours)+'h' : null)}
        ${envRow('無霜期間',       env.frostFreeDays!= null ? Math.round(env.frostFreeDays)+'日' : null)}
        ${envRow('有効積算温度',   env.gdd          != null ? Math.round(env.gdd)+'GDD' : null)}
        ${envRow('最大積雪深',     env.maxSnowDepth != null ? env.maxSnowDepth+'cm' : null)}
        ${envRow('平均風速',       env.windSpeedMean!= null ? env.windSpeedMean+'m/s' : null)}
        ${envRow('冷気湖リスク',   lmap[env.coldLakeRisk] || null)}
        ${env.stationName ? envRow('観測局', env.stationName + (env.distKm != null ? ` (${env.distKm.toFixed(1)}km)` : '')) : ''}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">🏔️ 地形・土壌</div>
        ${envRow('傾斜',           env.slope        != null ? env.slope+'°' : null)}
        ${envRow('斜面向き',       env.aspect       || null)}
        ${envRow('遮蔽リスク',     lmap[env.shadingRisk] || null)}
        ${envRow('pH',             env.ph           != null ? env.ph : null)}
        ${envRow('有機物含量',     { high:'高', medium:'中', low:'低' }[env.organicMatter] || null)}
        ${envRow('保水性',         { high:'高', medium:'中', low:'低' }[env.waterRetention] || null)}
        ${envRow('塩類リスク',     lmap[env.salinityRisk] || null)}
        ${envRow('作付け履歴',     env.croppingHistory || null)}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">💧 水利</div>
        ${envRow('灌漑水源',       srcLabels[env.irrigationSource] || null)}
        ${envRow('灌漑距離',       env.irrigationDistM != null ? env.irrigationDistM+'m' : null)}
        ${envRow('排水設備',       { good:'良好', moderate:'普通', poor:'不良' }[env.drainageFacility] || null)}
        ${envRow('地下水位',       { deep:'深い', medium:'中程度', shallow:'浅い' }[env.groundwaterLevel] || null)}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">🚜 営農条件</div>
        ${envRow('圃場形状',       { regular:'整形', irregular:'不整形' }[env.fieldShapeScore] || null)}
        ${envRow('農道幅',         env.roadWidthM   != null ? env.roadWidthM+'m' : null)}
        ${envRow('電源',           env.hasPower === true ? 'あり' : env.hasPower === false ? 'なし' : null)}
        ${envRow('集荷場距離',     env.distToCollectionKm != null ? env.distToCollectionKm+'km' : null)}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">🏘️ 地域環境</div>
        ${envRow('農業振興地域',   env.agriculturalZone === true ? 'あり' : env.agriculturalZone === false ? 'なし' : env.agriculturalZone === 'unknown' ? '不明' : null)}
        ${envRow('獣害リスク',     lmap[env.wildlifeRisk] || null)}
        ${envRow('周辺土地利用',   { farmland:'農地', forest:'山林', residential:'住宅地', mixed:'混在' }[env.surroundingLandUse] || null)}
      </div>

      <!-- 輪作履歴表示 -->
      ${_buildRotationDetailHtml(area)}

      <!-- 環境情報編集・再取得ボタン -->
      <div class="env-detail-actions">
        <button class="env-action-btn" onclick="event.stopPropagation();openEnvEditDialog(${JSON.stringify(JSON.stringify(area))})">
          ✏️ 環境情報を編集
        </button>
        <button class="env-action-btn env-action-btn-refresh" onclick="event.stopPropagation();_refreshEnvForArea('${area.id}')">
          🔄 AMeDAS更新
        </button>
      </div>
    </div>

    <!-- インラインエディット（名前・土壌・栽培方式・メモ） -->
    <div class="inline-edit" id="edit-${area.id}" style="display:none;">
      <div class="field">
        <label>エリア名</label>
        <input type="text" class="ie-name" value="${escHtml(area.name)}" placeholder="エリア名">
      </div>
      <div class="field">
        <label>土壌タイプ</label>
        <div class="soil-grid ie-soil-grid">
          ${['sandy','loam','clay','peat','volcanic','unknown'].map(s => `
            <div class="soil-btn${area.meta?.soilType === s ? ' selected' : ''}" data-soil="${s}" onclick="selectIESoil(this)">${soilLabel(s)}</div>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label>栽培方式（実務マスター・分析タブのサマリーバッジはこれとは独立した一時切替です）</label>
        <div class="ie-cult-row" style="display:flex;gap:8px;">
          <button type="button" class="adp-cult-btn${(area.cultivationMode || 'openField') === 'openField' ? ' active' : ''}" data-mode="openField" onclick="selectIECult(this)">露地</button>
          <button type="button" class="adp-cult-btn${area.cultivationMode === 'greenhouse' ? ' active' : ''}" data-mode="greenhouse" onclick="selectIECult(this)">ハウス</button>
          <button type="button" class="adp-cult-btn${area.cultivationMode === 'heatedGreenhouse' ? ' active' : ''}" data-mode="heatedGreenhouse" onclick="selectIECult(this)">加温</button>
        </div>
      </div>
      <div class="field">
        <label>メモ</label>
        <textarea class="ie-memo" placeholder="水はけが悪い、日当たり良好など">${escHtml(area.memo || '')}</textarea>
      </div>
      <div class="ie-row-2col">
        <div class="field">
          <label>土壌pH <span class="ie-hint">0〜14</span></label>
          <input type="number" class="ie-ph" value="${env.ph != null ? env.ph : ''}" step="0.1" min="0" max="14" placeholder="例: 6.5">
        </div>
        <div class="field">
          <label>排水性</label>
          <select class="ie-drainage">
            <option value="" ${!env.drainageFacility ? 'selected' : ''}>未設定</option>
            <option value="good"     ${ env.drainageFacility === 'good'     ? 'selected' : ''}>良好</option>
            <option value="moderate" ${ env.drainageFacility === 'moderate' ? 'selected' : ''}>普通</option>
            <option value="poor"     ${ env.drainageFacility === 'poor'     ? 'selected' : ''}>不良</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="saveInlineEdit('${area.id}')">保存</button>
        <button class="btn btn-ghost"   style="flex:1;" onclick="toggleInlineEdit('${area.id}')">キャンセル</button>
      </div>

      <!-- 輪作履歴 -->
      <div class="ie-rotation-section">
        <div class="ie-rotation-header">
          <span class="ie-rotation-title">🔄 輪作履歴</span>
          <button class="ie-rotation-add-btn" onclick="event.stopPropagation();_rotAddRow('${area.id}')">＋ 追加</button>
        </div>
        <div class="ie-rotation-list" id="rot-list-${area.id}">
          ${_buildRotationRows(area)}
        </div>
      </div>
    </div>
  `;
  div.querySelector('.area-item-header').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    selectArea(area);
  });
  // 未入力件数バッジ：タップで直接env編集ダイアログを開く（▼詳細展開をスキップ）
  if (missingCount > 0) {
    const missingBadge = div.querySelector('.area-badge-missing');
    if (missingBadge) {
      missingBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof openEnvEditDialog === 'function') openEnvEditDialog(area);
      });
    }
  }
  container.appendChild(div);
}

// ─── 詳細パネル開閉 ───
function toggleAreaDetail(id) {
  const panel  = document.getElementById('detail-panel-' + id);
  const toggle = document.getElementById('detail-toggle-' + id);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (toggle) toggle.querySelector('span').textContent = isOpen ? '▼ 詳細' : '▲ 閉じる';
}

// ─── AMeDAS更新（エリアカードから呼び出し） ───
async function _refreshEnvForArea(areaId) {
  const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
  const area   = stored.find(a => a.id === areaId);
  if (!area) { showToast('エリアが見つかりません', 'amber'); return; }
  await refreshEnv(area);
  loadAreas();
}

// ─── インラインエディット開閉 ───
function toggleInlineEdit(id) {
  const el = document.getElementById('edit-' + id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  const btn = el.closest('.area-item').querySelector('.edit-btn');
  if (btn) btn.textContent = isOpen ? '編集' : '閉じる';
}

// ─── 土壌選択（インラインエディット内）───
function selectIESoil(btn) {
  btn.closest('.ie-soil-grid').querySelectorAll('.soil-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ─── 栽培方式選択（インラインエディット内・実務マスター用）───
function selectIECult(btn) {
  btn.closest('.ie-cult-row').querySelectorAll('.adp-cult-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ─── インラインエディット保存 ───
async function saveInlineEdit(id) {
  const el      = document.getElementById('edit-' + id);
  const name    = el.querySelector('.ie-name').value.trim();
  const memo    = el.querySelector('.ie-memo').value.trim();
  const soilBtn = el.querySelector('.soil-btn.selected');
  const soilType = soilBtn ? soilBtn.dataset.soil : null;
  const cultBtn  = el.querySelector('.ie-cult-row .adp-cult-btn.active');
  const cultivationMode = cultBtn ? cultBtn.dataset.mode : 'openField';

  if (!name) { showToast('エリア名を入力してください', 'amber'); return; }

  // pH・排水性
  const phRaw  = el.querySelector('.ie-ph')?.value;
  const phVal  = phRaw !== '' && phRaw != null ? parseFloat(phRaw) : null;
  const drainageVal = el.querySelector('.ie-drainage')?.value || null;

  // 輪作履歴（rot-list から収集）
  const rotList = document.getElementById('rot-list-' + id);
  const rotationHistory = [];
  if (rotList) {
    rotList.querySelectorAll('.rot-row').forEach(row => {
      const year   = parseInt(row.querySelector('.rot-year')?.value, 10);
      const cropId = row.querySelector('.rot-crop')?.value || '';
      if (year && cropId) rotationHistory.push({ year, cropId });
    });
    rotationHistory.sort((a, b) => b.year - a.year);
  }

  const update = { name, memo, cultivationMode, 'meta.soilType': soilType, 'landProfile.soilType': soilType };

  try {
    if (db && !id.startsWith('local_')) {
      await db.collection('areas').doc(id).update({
        ...update,
        'env.ph':               phVal,
        'env.drainageFacility': drainageVal || null,
        'env.rotationHistory':  rotationHistory,
      });
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        stored[idx].name = name;
        stored[idx].memo = memo;
        stored[idx].cultivationMode = cultivationMode;
        stored[idx].meta = stored[idx].meta || {};
        stored[idx].meta.soilType = soilType;
        stored[idx].landProfile = stored[idx].landProfile || buildLandProfile(stored[idx].meta || {});
        stored[idx].landProfile.soilType = soilType;
        stored[idx].env = stored[idx].env || {};
        stored[idx].env.ph               = phVal;
        stored[idx].env.drainageFacility = drainageVal || null;
        stored[idx].env.rotationHistory  = rotationHistory;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
    await loadAreas();
    showToast('更新しました ✓', 'green');
  } catch(e) {
    showToast('更新に失敗しました', 'amber');
    console.error(e);
  }
}

// ─── 削除 ───
async function deleteArea(id) {
  const ok = await showConfirmDialog('このエリアを削除しますか？', '削除する', 'キャンセル', true);
  if (!ok) return;
  try {
    if (db && !id.startsWith('local_')) {
      await db.collection('areas').doc(id).delete();
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored.filter(a => a.id !== id)));
    }
    showToast('削除しました', 'green');
    loadAreas();
  } catch(e) {
    showToast('削除に失敗しました', 'amber');
  }
}

// ─── エリア選択（分析へ）───
function selectArea(area) {
  drawnItems.clearLayers();
  const geojsonData = typeof area.geojson === 'string' ? JSON.parse(area.geojson) : area.geojson;
  const layer = L.geoJSON(geojsonData, {
    style: { color: CONFIG.DRAW_COLOR, weight: 2, fillOpacity: 0.2 },
  });
  layer.addTo(drawnItems);
  map.fitBounds(layer.getBounds());

  // normalizeAreaData が env 含む全フィールドを正規化（areaEnv.js）
  currentAreaData = (typeof normalizeAreaData === 'function')
    ? normalizeAreaData(area)
    : {
        lat:      area.landProfile?.lat       ?? area.meta?.lat      ?? null,
        lng:      area.landProfile?.lng       ?? area.meta?.lng      ?? null,
        elev:     area.landProfile?.elevation ?? area.meta?.elev     ?? null,
        climate:  getClimate(area.landProfile?.lat ?? area.meta?.lat ?? 35),
        soilType: area.landProfile?.soilType  ?? area.meta?.soilType ?? null,
        ph:       area.landProfile?.ph        ?? null,
        slope:    area.landProfile?.slope     ?? 0,
        areaSqm:  area.meta?.areaSqm          || 0,
        areaHa:   area.meta?.areaHa           || 0,
      };

  // landProfile が未保存 or リスク項目が欠損している場合は buildLandProfile() で補完
  // （_adpRenderLandRiskGauges / _adpRenderEnvDonut が参照するため）
  if (!area.landProfile ||
      area.landProfile.floodRisk == null ||
      area.landProfile.droughtRisk == null) {
    area.landProfile = buildLandProfile({
      ...currentAreaData,
      soilType: currentAreaData.soilType,
    });
  }

  // AMeDAS・天気予報をパネルオープン前にプリフェッチ開始
  _adpPrefetch(area);

  // 詳細パネルを開く
  openAreaDetailPanel(area);
}

// ═══════════════════════════════════════════
//  AREA DETAIL PANEL — カレンダー付き詳細パネル
// ═══════════════════════════════════════════

let _adpArea          = null;   // 現在表示中のエリア
let _adpYear          = 0;
let _adpMonth         = 0;
let _adpSelDate       = null;   // 選択中の日付文字列 'YYYY-MM-DD'
let _adpEditId        = null;   // 編集中レコードID
let _adpClimateCache  = null;   // AMeDAS取得済み climate（再オープン用キャッシュ）
let _adpSelectedCropId   = null; // 分析側で選択中の作物ID
let _adpIrrigationRecords = [];  // 灌水記録（エリア全体 or 作物ごと）cropId=nullはエリア全体
// 実務側：複数作物 [{ cropId, ratio }] 形式。ratioは占有率(%)
let _adpPracticecrops    = [];   // 実務側で選択中の作物リスト
let _adpAnalysisCultMode = null; // 分析側で一時的に切り替え中の栽培方式（マスターはarea.cultivationMode・実務側のインライン編集で変更）
let _adpAnalysisPlantingDesign = null; // 分析側の一時的な栽植設計ステート（宣言を使用箇所より前に置く）
// ── 自動設計（Step1・Agri_planting_auto_design_spec.MD）──
let _adpAutoDesignSettings = { zonePriorityMode: 'ratio', objective: 'yield' }; // エリア共通のグローバル設定
let _adpAutoDesignPreview  = null; // AutoDesign.run() の直近プレビュー結果（未適用）。適用 or 再計算で null に戻す
let _crOpenFieldScores   = null;  // 露地スコアキャッシュ（補正比較用）  // 気温グラフで強調表示中の作物ID
let _adpClimateMode   = false;  // true=気候推定モード / false=DBモード
let _adpClimateRanking = null;  // computeClimateRanking キャッシュ
let _adpClimateLoaded  = false; // true=AMeDAS取得試行済み（成功/失敗問わず）
let _adpWeatherCache   = null;  // 天気予報キャッシュ { areaId, fetchedAt, daily: {...} }
// 圃場マージン設定（エリア共通・全cultivationModeで使用。旧ハウスマージン）
// { frameMarginM, entranceEdgeIndex, entranceDepthM, oppositeDepthM } | null
// - entranceDepthM: 入口辺（辺全体幅）から内側への奥行き
// - oppositeDepthM: 反対側（Uターンスペース）の奥行き。null/undefined/''ならentranceDepthMを共通値として使用
// - oppositeEdgeIndex は保存不要（RidgeGeometry.computeHouseGeometryが毎回自動算出）
let _adpHouseMargin    = null;

// 統合作物プレビュー（_adpBuildUnifiedRidgePreviewSVG）の辺ハイライト表示モード。
// 'entrance'（🚪入口辺）／'ridgedir'（📐畝方向辺）／null（非表示）。
// トグルチップ（Step7-3で新設）から _adpSetUnifiedPreviewEdgeMode() 経由で切り替える想定。
// パネル再描画ではリセットされる想定のため保存はしない（DOM上のみで保持する他の開閉状態と同じ扱い）。
let _adpUnifiedPreviewEdgeMode = 'entrance';

// Step8-4a（畝断面図の統合とプレビュー内入力欄コンパクト化 仕様書）：
// パネルB（畝断面図）で選択中の作物ID。作物タブ（_adpBuildRidgeCrossSectionTabs）から
// _adpSetCrossSectionActiveCrop() 経由で切り替える。crops配列からの削除等で無効化された場合は
// _adpResolveCrossSectionActiveCropId() が自動的にフォールバック値へ補正する（保存はしない）。
let _adpCrossSectionActiveCropId = null;

// Step8-7（畝断面図まわり入力UX再設計 仕様書）：
// 新ブロックのヘッダートグル「拡大詳細」⇔「全体」の表示モード。
// 'zoom'（拡大詳細図・デフォルト）／'full'（既存パネルA＝圃場全体表示）。
// パネル再描画ではリセットされる想定のため保存はしない。
let _adpCrossSectionViewMode = 'full';

// Step8-7後半（畝断面図UX再設計・4タブ構成）：
// 実務側・栽植設計ペインのメインタブ（自動設計／調整／描画／作物詳細）。
// 'auto'（自動設計・デフォルト）／'adjust'（調整）／'draw'（描画）／'crops'（作物詳細）。
// パネル再描画ではリセットされる想定のため保存はしない（他の開閉状態と同じ扱い）。
let _adpPlantingUITab = 'auto';

// ─── エリア選択時プリフェッチ（AMeDAS + 天気予報を並列取得） ───
// openAreaDetailPanel より先に呼ぶことでパネル表示時にキャッシュ済み状態にする
function _adpPrefetch(area) {
  const lat    = area.landProfile?.lat ?? area.meta?.lat ?? null;
  const lng    = area.landProfile?.lng ?? area.meta?.lng ?? null;
  if (lat === null || lng === null) return;

  const areaKey = area.id || area.name;

  // AMeDAS：未キャッシュ or 別エリアの場合のみ取得
  if (typeof AmedasLoader !== 'undefined' &&
      (!_adpClimateCache || _adpClimateCache._areaKey !== areaKey)) {
    AmedasLoader.getClimateAt(lat, lng).then(climateData => {
      // 別エリアに切り替わっていたら捨てる（古いキャッシュで上書きしない）
      const currentKey = _adpArea?.id || _adpArea?.name;
      if (currentKey !== areaKey) return;
      _adpClimateCache = { ...climateData, _areaKey: areaKey };
    }).catch(() => {/* 取得失敗は無視 */});
  }

  // 天気予報：未キャッシュ or 1時間超 or 別エリアの場合のみ取得
  const wxAge = _adpWeatherCache
    ? Date.now() - _adpWeatherCache.fetchedAt
    : Infinity;
  if (!_adpWeatherCache || _adpWeatherCache.areaId !== area.id || wxAge > 3600_000) {
    _adpFetchWeather(lat, lng, area.id).catch(() => {/* 取得失敗は無視 */});
  }
}

async function openAreaDetailPanel(area) {
  _adpArea    = area;
  _awArea     = area;   // 条件設定フォームのエリア参照を更新
  const now   = new Date();

  // ── 保存済み条件設定を復元 ──
  if (area.farmingConditions && typeof area.farmingConditions === 'object') {
    _awFarmCond = { ..._awDefaultFarmCond(), ...area.farmingConditions };
  } else {
    _awFarmCond = _awDefaultFarmCond();
  }
  // 栽培方式の復元：マスター値（area.cultivationMode）はここでは控えるだけ。
  // 実際にどちらを使うか（分析一時値 vs マスター）の解決は areaId 確定後、
  // currentAreaDataへの適用は openAreaDetailPanel 末尾で行う。
  // ※この変数は openAreaDetailPanel スコープ内でのみ使うローカル変数。
  //   外部から参照する場合は _adpArea.cultivationMode を直接参照すること。
  const _adpMasterCultMode = area.cultivationMode || 'openField';
  // 評価モードの復元
  if (area.savedEvalMode) {
    _adpClimateMode = (area.savedEvalMode === 'climate');
  } else {
    _adpClimateMode = false;
  }
  _adpYear    = now.getFullYear();
  _adpMonth   = now.getMonth();
  _adpSelDate = null;
  _adpEditId  = null;
  // _adpClimateMode は上の if(area.savedEvalMode) ブロックで設定済みのためここでは上書きしない
  _adpClimateRanking = null;
  _adpClimateLoaded  = false;
  // カレンダー表示モードをリセット（エリア切替時にリスト表示が残らないよう）
  _adpCalView    = 'grid';
  _adpCalSegment = 'visit';

  // 作物選択状態をリセット（エリア再オープン時に前回選択が残らないよう）
  _adpSelectedCropId      = null;
  _adpIrrigationRecords   = [];
  _adpPracticecrops       = [];
  _adpHouseMargin         = null;
  _simSelectedCropId = null;
  _simDirty          = false;
  _simMemory         = {};

  // localStorage から作物選択を復元
  const areaId = area.id || area.name || '';
  const savedAnalysisCrop = localStorage.getItem(`adpCropAnalysis_${areaId}`);
  const savedWorkCropRaw  = localStorage.getItem(`adpCropWork_${areaId}`);
  if (savedAnalysisCrop) _adpSelectedCropId = savedAnalysisCrop;
  if (savedWorkCropRaw) {
    try {
      const parsed = JSON.parse(savedWorkCropRaw);
      if (Array.isArray(parsed)) {
        _adpPracticecrops = parsed;
      } else if (typeof parsed === 'string') {
        _adpPracticecrops = [{ cropId: parsed, ratio: 100 }];
      }
    } catch {
      _adpPracticecrops = [{ cropId: savedWorkCropRaw, ratio: 100 }];
    }
  }

  // 灌水記録を復元
  const savedIrrigation = localStorage.getItem(`adpIrrigation_${areaId}`);
  if (savedIrrigation) {
    try {
      _adpIrrigationRecords = JSON.parse(savedIrrigation) || [];
    } catch {
      _adpIrrigationRecords = [];
    }
  }
  // 圃場マージン設定を復元（全cultivationModeの栽植設計で使用）
  const savedHouseMargin = localStorage.getItem(`adpHouseMargin_${areaId}`);
  if (savedHouseMargin) {
    try {
      _adpHouseMargin = JSON.parse(savedHouseMargin) || null;
    } catch {
      _adpHouseMargin = null;
    }
  }
  // 分析側の栽培方式一時値を復元（保存があれば優先、無ければマスター値にフォールバック）
  const savedAnalysisCult = localStorage.getItem(`adpCultAnalysis_${areaId}`);
  _adpAnalysisCultMode = savedAnalysisCult || _adpMasterCultMode;

  // 自動設計（Step1）のグローバル設定を復元し、プレビュー状態をリセット
  _adpLoadAutoDesignSettings(areaId);
  _adpAutoDesignPreview = null;

  // 実務側の占有率帯・畝セグメントを最新状態に同期（エリア再オープン時に前回の
  // 保存データと畝方向・畝間設定にズレがあっても、開いた時点で必ず正しく揃える）
  if (PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin, _adpAutoDesignSettings.zonePriorityMode)) {
    _adpSavePracticecrops(_adpArea?.id || _adpArea?.name || '');
  }

  _adpEnsureView();

  // ── ヘッダー更新 ──
  const ha       = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
  const climate  = area.meta?.climateName || '—';
  const soil     = area.meta?.soilType ? soilLabel(area.meta.soilType) : '土壌未設定';
  const elev     = area.meta?.elev != null ? `${Math.round(area.meta.elev)}m` : '—';
  document.getElementById('adp-title').textContent = area.name || '無名エリア';
  document.getElementById('adp-meta').textContent  = `${ha} ha　${climate}　${soil}　標高${elev}`;

  // ── fs-page を閉じてフルビューを表示 ──
  const fsPage = document.getElementById('fs-page');
  if (fsPage) {
    fsPage.classList.remove('open');
    fsPage.setAttribute('aria-hidden', 'true');
  }
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.add('hidden');
  const view = document.getElementById('adp-view');
  view.classList.add('open');

  // ── 最初のセグメント・サブタブ（実務＞カレンダー）を表示 ──
  _adpSwitchSeg('practice');
  _adpSwitchSubTab('calendar');
  _adpInitSwipe();

  // 実務側：複数作物リストを描画（復元後に呼ぶ）
  _adpRenderPracticecrops();
  if (savedAnalysisCrop) _adpUpdateCropBar('analysis', _adpCropIdToName(savedAnalysisCrop));

  // ── 復元した栽培方式（分析一時値を優先・なければマスター）を適用（currentAreaDataはこの時点で確定済み） ──
  if (currentAreaData) {
    currentAreaData.cultivationMode = _adpAnalysisCultMode;
    document.querySelectorAll('.adp-cult-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === _adpAnalysisCultMode);
    });
  }
  // ── 保存済み評価モードをUIに反映 ──
  if (area.savedEvalMode) {
    _adpSetClimateMode(_adpClimateMode);
  }

  // 🌿 土地環境系（landProfile依存・AMeDAS不要・常時表示）
  _adpRenderEnvDonut(area);
  _adpRenderLandRiskGauges(area);
  // 🌤️ 気候サマリー（AMeDAS取得前はローディング表示）
  _adpRenderClimateSummary(area);

  _adpRenderCalendar();
  _adpRenderDayRecords();
  _adpRenderSavedCalendarsList();

  // 同一エリアのキャッシュがあれば即スコア計算
  const areaKey = area.id || area.name;
  if (_adpClimateCache && _adpClimateCache._areaKey === areaKey) {
    currentAreaData.climate = { ..._adpClimateCache };
    _adpClimateLoaded = true;
    _adpRenderRanking(area);
    _adpRenderTempChart();
    _adpRenderSunshineChart();
    _adpRenderClimateSummary(area);
    return;
  }

  // AMeDAS旬別データを取得してcurrentAreaDataにマージ
  const lat = area.landProfile?.lat ?? area.meta?.lat ?? null;
  const lng = area.landProfile?.lng ?? area.meta?.lng ?? null;
  if (lat !== null && lng !== null && typeof AmedasLoader !== 'undefined') {
    try {
      const climateData = await AmedasLoader.getClimateAt(lat, lng);
      // getClimateAt() が返す decadeArr は Phenology.buildDecadeArray() 済み
      const merged = {
        ...(currentAreaData.climate || {}),
        ...climateData,
        _areaKey: areaKey,
      };
      currentAreaData.climate = merged;
      _adpClimateCache = merged;
      // AMeDAS取得完了 → 気候推定キャッシュをリセット＆モードがオンなら即再描画
      _adpClimateRanking = null;
      if (_adpClimateMode) _adpSetClimateMode(true);
    } catch(e) {
      console.warn('[ADP] AMeDAS取得失敗（ランキングは年均気温で評価）:', e);
    }
  }

  _adpClimateLoaded = true;
  _adpRenderRanking(area);
  _adpRenderTempChart();
  _adpRenderSunshineChart();
  _adpRenderClimateSummary(area);

  // 🌤️ 天気予報取得（Open-Meteo・16日）
  if (lat !== null && lng !== null) {
    _adpFetchWeather(lat, lng, area.id).then(() => _adpRenderWeatherBar());
  }
}



// ─── フルスクリーンビューを初回だけ生成 ───
function _adpEnsureView() {
  if (document.getElementById('adp-view')) return;

  const view = document.createElement('div');
  view.id        = 'adp-view';
  view.className = 'adp-view';
  view.innerHTML = `
    <!-- ヘッダー -->
    <div class="adp-view-header">
      <button class="adp-back-btn" onclick="closeAreaDetailPanel()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        <span>戻る</span>
      </button>
      <div class="adp-view-title-wrap">
        <div class="adp-title" id="adp-title"></div>
        <div class="adp-meta"  id="adp-meta"></div>
      </div>
    </div>

    <!-- セグメントコントロール（実務 / 分析） -->
    <div class="adp-nav-segment" id="adp-nav-segment">
      <button class="adp-seg-btn active" data-seg="practice"  onclick="_adpSwitchSeg('practice')">実務</button>
      <button class="adp-seg-btn"        data-seg="analysis"  onclick="_adpSwitchSeg('analysis')">分析</button>
    </div>

    <!-- 実務側：複数作物リスト＋追加ボタン（1行レイアウト：縦スペース節約） -->
    <div class="adp-crop-bar adp-practice-crops-bar" id="adp-crop-bar-practice">
      <div class="adp-practice-row">
        <span class="adp-practice-crops-label">栽培作物</span>
        <div id="adp-practice-crops-list" class="adp-practice-crops-list"></div>
        <button class="adp-pcc-add-btn" onclick="_adpOpenCropSelectSheet('practice')" id="adp-crop-bar-btn-practice" title="作物を追加">
          <span id="adp-crop-bar-name-practice">＋ 追加</span>
        </button>
      </div>
    </div>

    <!-- 作物選択バー：分析用（適合度・信頼度バー付き） -->
    <div class="adp-crop-bar adp-crop-bar-analysis" id="adp-crop-bar-analysis" style="display:none;">
      <div class="adp-crop-bar-row">
        <button class="adp-crop-bar-btn" onclick="_adpOpenCropSelectSheet('analysis')" id="adp-crop-bar-btn-analysis">
          <span class="adp-crop-bar-icon">🌱</span>
          <span class="adp-crop-bar-name" id="adp-crop-bar-name-analysis">作物を選ぶ</span>
          <span class="adp-crop-bar-arrow">▼</span>
        </button>
        <button class="adp-sum-badge adp-sum-badge-btn adp-sum-badge-mode" id="adp-summary-mode"
          onclick="_adpOpenCultPopup(event)" title="栽培方式を切り替え"></button>
        <button class="adp-sum-badge adp-sum-badge-btn adp-sum-badge-eval" id="adp-summary-evalmode"
          onclick="_adpToggleEvalMode()" title="評価基準を切り替え"></button>
      </div>
      <!-- 適合度バー（選択済み時のみ表示） -->
      <div class="adp-crop-bar-bars" id="adp-crop-bar-bars" style="display:none;">
        <div class="adp-sum-row adp-sum-row-bar">
          <span class="adp-sum-bar-label">適合度</span>
          <div class="adp-sum-bar-track">
            <div class="adp-sum-bar-fill adp-sum-bar-score" id="adp-sum-score-bar" style="width:0%"></div>
          </div>
          <span class="adp-sum-bar-pct" id="adp-summary-score">—</span>
          <span class="adp-sum-bar-grade" id="adp-sum-score-grade"></span>
        </div>
        <div class="adp-sum-row adp-sum-row-bar">
          <span class="adp-sum-bar-label">信頼度</span>
          <div class="adp-sum-bar-track">
            <div class="adp-sum-bar-fill adp-sum-bar-conf" id="adp-conf-bar" style="width:0%"></div>
          </div>
          <span class="adp-sum-bar-pct" id="adp-conf-pct">—</span>
          <span class="adp-sum-bar-grade" id="adp-conf-label"></span>
        </div>
      </div>
    </div>

    <!-- サブタブバー：実務グループ -->
    <div class="adp-subtabs" id="adp-subtabs-practice">
      <button class="adp-subtab active" data-subtab="calendar"  onclick="_adpSwitchSubTab('calendar')">📅 カレンダー</button>
      <button class="adp-subtab"        data-subtab="fert"      onclick="_adpSwitchSubTab('fert')">🧪 施肥</button>
      <button class="adp-subtab"        data-subtab="risk"      onclick="_adpSwitchSubTab('risk')">⚠️ リスク</button>
      <button class="adp-subtab"        data-subtab="planting"  onclick="_adpSwitchSubTab('planting')">🌱 栽植設計</button>
      <button class="adp-subtab"        data-subtab="cropinfo"  onclick="_adpSwitchSubTab('cropinfo')">🌿 作物情報</button>
      <button class="adp-subtab"        data-subtab="harvest"    onclick="_adpSwitchSubTab('harvest')">🧺 収穫</button>
      <button class="adp-subtab"        data-subtab="pesticide"  onclick="_adpSwitchSubTab('pesticide')">💊 農薬</button>
      <button class="adp-subtab"        data-subtab="irrigation" onclick="_adpSwitchSubTab('irrigation')">🚰 灌水</button>
      <button class="adp-subtab"        data-subtab="weather"    onclick="_adpSwitchSubTab('weather')">🌤️ 天候</button>
      <button class="adp-subtab"        data-subtab="dashboard"  onclick="_adpSwitchSubTab('dashboard')">📊 ダッシュボード</button>
      <button class="adp-subtab"        data-subtab="shipping"   onclick="_adpSwitchSubTab('shipping')">📦 出荷記録</button>
    </div>

    <!-- サブタブバー：分析グループ（初期非表示） -->
    <div class="adp-subtabs" id="adp-subtabs-analysis" style="display:none;">
      <button class="adp-subtab" data-subtab="ranking"   onclick="_adpSwitchSubTab('ranking')">🏆 ランキング</button>
      <button class="adp-subtab" data-subtab="growth"    onclick="_adpSwitchSubTab('growth')">📈 生育期間</button>
      <button class="adp-subtab" data-subtab="tempchart" onclick="_adpSwitchSubTab('tempchart')">🌡️ 適温グラフ</button>
      <button class="adp-subtab" data-subtab="match"     onclick="_adpSwitchSubTab('match')">📊 適合度</button>
    </div>

    <!-- サブサブタブバー：栽植設計（planting）サブタブ選択時のみ表示。
         adp-subtabsの直下＝一段深い階層として、adp-subtabと同一デザイン言語（アンダーライン式）で統一。
         中身はADP_PLANTING_MAIN_TABS定義から動的生成（_adpBuildPlantingSubsubtabsBar）。 -->
    <div class="adp-subsubtabs" id="adp-subsubtabs-planting" style="display:none;"></div>

    <!-- コンテンツ領域 -->
    <div class="adp-view-body">

      <!-- ① 🏆 ランキング（条件設定／適合度ランキング／収益ランキング／収益シミュレーターの4サブタブ） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-ranking">

        <!-- ランキングタブ内ネストサブタブバー -->
        <div class="adp-rk-subtabs" id="adp-rk-subtabs">
          <button class="adp-rk-subtab active" data-rk-pane="cond"   onclick="_adpRkSwitchPane('cond')">条件設定</button>
          <button class="adp-rk-subtab"        data-rk-pane="match"  onclick="_adpRkSwitchPane('match')">適合度ランキング</button>
          <button class="adp-rk-subtab"        data-rk-pane="profit" onclick="_adpRkSwitchPane('profit')">収益ランキング</button>
          <button class="adp-rk-subtab"        data-rk-pane="sim"    onclick="_adpRkSwitchPane('sim')">収益シミュレーター</button>
        </div>

        <!-- 1) 条件設定（枠組みのみ・Step4で常設フォームを実装） -->
        <div class="adp-rk-pane" id="adp-rk-pane-cond">
          <div id="adp-rk-cond-wrap"></div>
        </div>

        <!-- 2) 適合度ランキング（旧adp-ranking-dialogの中身をそのまま移植） -->
        <div class="adp-rk-pane" id="adp-rk-pane-match" style="display:none;">
          <div class="adp-rk-match-controls">
            <div class="cr-tabs-major" id="cr-tabs-major">
              <button class="cr-tab-major active" data-major="all"       onclick="crSwitchMajor('all')">すべて</button>
              <button class="cr-tab-major"        data-major="grain"     onclick="crSwitchMajor('grain')">穀物・豆類</button>
              <button class="cr-tab-major"        data-major="vegetable" onclick="crSwitchMajor('vegetable')">野菜</button>
              <button class="cr-tab-major"        data-major="fruit"     onclick="crSwitchMajor('fruit')">果物</button>
              <button class="cr-tab-major"        data-major="wild"      onclick="crSwitchMajor('wild')">山菜・草</button>
              <button class="cr-tab-major"        data-major="forest"    onclick="crSwitchMajor('forest')">林産</button>
              <button class="cr-tab-major"        data-major="oil"       onclick="crSwitchMajor('oil')">油脂</button>
              <button class="cr-tab-major"        data-major="fiber"     onclick="crSwitchMajor('fiber')">繊維</button>
            </div>
            <div class="cr-tabs-minor" id="cr-tabs-minor" style="display:none;"></div>
            <button class="adp-rk-cond-shortcut" onclick="_adpRkSwitchPane('cond')">⚙️ 条件設定</button>
          </div>
          <div id="crop-ranking"><div class="empty-mini">計算中...</div></div>
        </div>

        <!-- 3) 収益ランキング -->
        <div class="adp-rk-pane" id="adp-rk-pane-profit" style="display:none;">
          <div class="adp-rk-match-controls">
            <div class="cr-tabs-major" id="cr-tabs-major-profit">
              <button class="cr-tab-major active" data-major="all"       onclick="crSwitchMajor('all')">すべて</button>
              <button class="cr-tab-major"        data-major="grain"     onclick="crSwitchMajor('grain')">穀物・豆類</button>
              <button class="cr-tab-major"        data-major="vegetable" onclick="crSwitchMajor('vegetable')">野菜</button>
              <button class="cr-tab-major"        data-major="fruit"     onclick="crSwitchMajor('fruit')">果物</button>
              <button class="cr-tab-major"        data-major="wild"      onclick="crSwitchMajor('wild')">山菜・草</button>
              <button class="cr-tab-major"        data-major="forest"    onclick="crSwitchMajor('forest')">林産</button>
              <button class="cr-tab-major"        data-major="oil"       onclick="crSwitchMajor('oil')">油脂</button>
              <button class="cr-tab-major"        data-major="fiber"     onclick="crSwitchMajor('fiber')">繊維</button>
            </div>
            <div class="cr-tabs-minor" id="cr-tabs-minor-profit" style="display:none;"></div>
            <button class="adp-rk-cond-shortcut" onclick="_adpRkSwitchPane('cond')">⚙️ 条件設定</button>
          </div>
          <div id="crop-ranking-profit"><div class="empty-mini">計算中...</div></div>
        </div>

        <!-- 4) 収益シミュレーター（枠組みのみ・Step5で実装） -->
        <div class="adp-rk-pane" id="adp-rk-pane-sim" style="display:none;">
          <div id="adp-rk-sim-wrap" class="empty-mini">収益シミュレーターは準備中です（Step5で実装）。</div>
        </div>

      </div>


      <!-- ② 生育期間（ネストサブタブ：暦グラフ／ガント／GDD／適期マップ／方式比較） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-growth" style="display:none;">

        <!-- 生育期間タブ内ネストサブタブバー -->
        <div class="adp-growth-subtabs" id="adp-growth-subtabs">
          <button class="adp-growth-subtab active" data-growth-pane="calendar" onclick="_adpGrowthSwitchSubTab('calendar')">📅 暦グラフ</button>
          <button class="adp-growth-subtab"        data-growth-pane="gantt"    onclick="_adpGrowthSwitchSubTab('gantt')">📊 ガント</button>
          <button class="adp-growth-subtab"        data-growth-pane="gdd"      onclick="_adpGrowthSwitchSubTab('gdd')">🌡️ GDD</button>
          <button class="adp-growth-subtab"        data-growth-pane="heatmap"  onclick="_adpGrowthSwitchSubTab('heatmap')">🗺️ 適期マップ</button>
          <button class="adp-growth-subtab"        data-growth-pane="compare"  onclick="_adpGrowthSwitchSubTab('compare')">⚖️ 方式比較</button>
        </div>

        <!-- 1) 暦グラフ（DBカレンダー上段 ＋ 気候推定下段・既存仕様のまま） -->
        <div class="adp-growth-pane" id="adp-growth-pane-calendar">
          <div class="adp-chart-sticky">

            <!-- 上段: DB登録カレンダー -->
            <div class="adp-temp-chart-header">
              <span class="adp-temp-chart-sub" id="adp-growth-db-sub">作物を選択するとDB登録の播種・育苗・定植・収穫を表示</span>
            </div>
            <div class="adp-temp-chart-wrap adp-growth-chart-wrap">
              <canvas id="adp-growth-db-canvas"></canvas>
            </div>
            <div class="adp-temp-legend" id="adp-growth-db-legend"></div>

            <!-- 下段: 気候推定（Phenology/GDD） -->
            <div class="adp-temp-chart-header">
              <span class="adp-temp-chart-sub" id="adp-growth-est-sub">作物を選択すると気候推定（GDD）による播種/定植適期・収穫予測を表示</span>
            </div>
            <div class="adp-temp-chart-wrap adp-growth-chart-wrap">
              <canvas id="adp-growth-est-canvas"></canvas>
            </div>
            <div class="adp-temp-legend" id="adp-growth-est-legend"></div>

          </div>
        </div>

        <!-- 2) 生育ステージ・ガントチャート -->
        <div class="adp-growth-pane" id="adp-growth-pane-gantt" style="display:none;">
          <!-- DB暦 / 気候推定 切替トグル -->
          <div class="adp-gantt-toggle-wrap">
            <button class="adp-gantt-toggle-btn" id="adp-gantt-mode-est"
                    onclick="_adpGanttSetMode('est')" data-gantt-mode="est">🌡️ 気候推定</button>
            <button class="adp-gantt-toggle-btn" id="adp-gantt-mode-db"
                    onclick="_adpGanttSetMode('db')"  data-gantt-mode="db">📋 DB暦</button>
          </div>
          <!-- ガントチャート本体 -->
          <div class="adp-gantt-chart-wrap">
            <canvas id="adp-gantt-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-gantt-legend"></div>
        </div>

        <!-- 3) GDD積算専用グラフ -->
        <div class="adp-growth-pane" id="adp-growth-pane-gdd" style="display:none;">
          <div class="adp-gdd-chart-wrap">
            <canvas id="adp-gdd-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-gdd-legend"></div>
        </div>

        <!-- 4) 旬別適期ヒートマップ -->
        <div class="adp-growth-pane" id="adp-growth-pane-heatmap" style="display:none;">
          <div class="adp-heatmap-wrap">
            <canvas id="adp-heatmap-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-heatmap-legend"></div>
        </div>

        <!-- 5) 栽培方式別 収穫予測比較バー -->
        <div class="adp-growth-pane" id="adp-growth-pane-compare" style="display:none;">
          <div class="adp-compare-chart-wrap">
            <canvas id="adp-compare-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-compare-legend"></div>
        </div>

      </div>

      <!-- ③ 適温グラフ（気候サマリー＋気温チャート＋旬別日照チャート。旧ランキング内ネストタブ「グラフ」から最上位タブへ復帰） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-tempchart" style="display:none;">
        <div class="adp-chart-sticky">
          <!-- 🌤️ 気候サマリー（年均気温・年降水量・年間日照・標高+pH／気候帯） -->
          <div id="adpc-climate-summary" class="adpc-climate-summary-wrap"></div>

          <div class="adp-temp-chart-header">
            <span class="adp-temp-chart-sub" id="adp-temp-chart-sub">作物を選択すると適正温度を重畳表示</span>
          </div>
          <div class="adp-temp-chart-wrap">
            <canvas id="adp-temp-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-temp-legend"></div>

          <!-- ☀️ 旬別日照チャート -->
          <div class="adp-temp-chart-header">
            <span class="adp-temp-chart-sub" id="adp-sun-chart-sub">旬別日照時間</span>
          </div>
          <div class="adp-temp-chart-wrap adp-sun-chart-wrap">
            <canvas id="adp-sun-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-sun-legend"></div>
        </div>
      </div>

      <!-- ④ 施肥（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-fert" style="display:none;">
        <div id="fert-result" class="empty-mini">作物を選択すると施肥概算が表示されます。</div>
      </div>

      <!-- ⑤ リスク（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-risk" style="display:none;">
        <!-- ⚠️ 土地環境リスク（浸水・干ばつ・積雪／作物選択なしでも常時表示） -->
        <div id="adpc-risk-gauges-fixed" class="adpc-fixed-section"></div>
        <div id="risk-result" class="empty-mini">作物を選択するとリスク・注意点が表示されます。</div>
      </div>

      <!-- ⑥ カレンダー（記録カレンダー ↔ 栽培ごよみ セグメント切替） -->
      <div class="adp-pane" id="adp-pane-calendar" style="display:none;">
        <!-- 統合ボタンバー：音声入力／記録カレンダー／リスト／栽培ごよみ -->
        <div class="adp-cal-unified-bar">
          <div class="vm-cal-header" id="vm-cal-header-wrap"></div>
          <button class="adp-cal-uni-btn active" id="adp-cal-seg-visit"
                  onclick="_adpSwitchCalSegment('visit')">📅 記録</button>
          <button class="adp-cal-uni-btn" id="adp-cal-view-list"
                  onclick="_adpSetCalView('list')">📋 リスト</button>
          <button class="adp-cal-uni-btn" id="adp-cal-seg-growth"
                  onclick="_adpSwitchCalSegment('growth')">🌱 ごよみ</button>
        </div>

        <!-- 記録カレンダーセクション -->
        <div class="adp-cal-visit-wrap" id="adp-cal-visit-wrap">
          <!-- まもなくの予定バナー -->
          <div id="adp-cal-upcoming-banner"></div>
          <div id="adp-cal-summary-card"></div>
          <div id="adp-calendar-wrap"></div>
          <div id="adp-day-records-wrap"></div>
        </div>

        <!-- 栽培ごよみセクション -->
        <div class="adp-cal-growth-wrap" id="adp-cal-growth-wrap" style="display:none;">
          <div id="calendar-result" class="empty-mini">作物を選択すると生育カレンダーが表示されます。</div>
          <div id="adp-saved-calendars-wrap"></div>
        </div>
      </div>

      <!-- ⑦ 適合度（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-match" style="display:none;">
        <!-- 🌿 土地環境適合度ドーナツ（作物選択なしでも常時表示） -->
        <div id="adpc-env-donut-fixed" class="adpc-fixed-section"></div>
        <div id="conf-detail" class="empty-mini" style="font-size:11px;color:var(--text2);line-height:1.8;">作物を選択するとエリア適合度の詳細が表示されます。</div>

        <!-- 分析対象作物のプレビュー（実務タブの選択とは独立。分析で選択中の作物／未選択時はランキング1位を表示） -->
        <div class="adp-temp-chart-header">
          <span class="adp-temp-chart-sub">🧪 施肥概算（分析対象作物）</span>
        </div>
        <div id="fert-result-analysis" class="empty-mini">作物を選択すると施肥概算が表示されます。</div>

        <div class="adp-temp-chart-header">
          <span class="adp-temp-chart-sub">⚠️ リスク・注意点（分析対象作物）</span>
        </div>
        <div id="risk-result-analysis" class="empty-mini">作物を選択するとリスク・注意点が表示されます。</div>

        <div class="adp-temp-chart-header">
          <span class="adp-temp-chart-sub">📅 栽培ごよみ（分析対象作物）</span>
        </div>
        <div id="calendar-result-analysis" class="empty-mini">作物を選択すると栽培ごよみが表示されます。</div>
      </div>

      <!-- ⑧ 🌱 栽植設計（実務・分析共用ペイン） -->
      <div class="adp-pane" id="adp-pane-planting" style="display:none;">
        <div id="planting-result"></div>
      </div>

      <!-- ⑨ 🌿 作物情報（実務側ペイン） -->
      <div class="adp-pane" id="adp-pane-cropinfo" style="display:none;">
        <div id="cropinfo-result"></div>
      </div>

      <!-- ⑩ 🧺 収穫管理（実務側ペイン） -->
      <div class="adp-pane" id="adp-pane-harvest" style="display:none;">
        <div id="harvest-result"></div>
      </div>

      <!-- ⑪ 💊 農薬管理（実務側ペイン） -->
      <div class="adp-pane" id="adp-pane-pesticide" style="display:none;">
        <div id="pesticide-result"></div>
      </div>

      <!-- ⑬ 🚰 灌水（実務側ペイン） -->
      <div class="adp-pane" id="adp-pane-irrigation" style="display:none;">
        <div id="irrigation-result"></div>
      </div>

      <!-- 🌤️ 天候（実務側ペイン） -->
      <div class="adp-pane" id="adp-pane-weather" style="display:none;">
        <div id="weather-result"></div>
      </div>

      <!-- ⑫ 📊 ダッシュボード（実務側ペイン） -->
      <div class="adp-pane" id="adp-pane-dashboard" style="display:none;">
        <div id="dashboard-result"></div>
      </div>

      <!-- ⑬ 📦 出荷記録（実務側ペイン） -->
      <div class="adp-pane" id="adp-pane-shipping" style="display:none;">
        <div id="shipping-result"></div>
      </div>

    </div>

    <!-- 栽培方式切替ポップアップ（サマリーバッジタップ用） -->
    <div id="adp-cult-popup" class="adp-cult-popup" style="display:none;" onclick="_adpCloseCultPopup()">
      <div class="adp-cult-popup-inner" onclick="event.stopPropagation()">
        <div class="adp-cult-popup-title">🌡️ 栽培方式を選ぶ</div>
        <button class="adp-cult-popup-btn" data-mode="openField"        onclick="_adpCultPopupSelect('openField')">🌾 露地</button>
        <button class="adp-cult-popup-btn" data-mode="greenhouse"       onclick="_adpCultPopupSelect('greenhouse')">🏠 ハウス</button>
        <button class="adp-cult-popup-btn" data-mode="heatedGreenhouse" onclick="_adpCultPopupSelect('heatedGreenhouse')">🔥 加温ハウス</button>
      </div>
    </div>

  `;
  document.body.appendChild(view);
}

function _adpCloseRankingDialog() {
  const dlg = document.getElementById('adp-ranking-dialog');
  if (!dlg) return;
  dlg.classList.remove('open');
  dlg.setAttribute('aria-hidden', 'true');
  _adpRankingDlgPane = null;
}

// ─── サマリーバッジ：栽培方式ポップアップ ───
function _adpOpenCultPopup(event) {
  const popup = document.getElementById('adp-cult-popup');
  if (!popup) return;
  // 現在の方式を active 反映（分析一時値を表示。マスターではない）
  const cur = _adpAnalysisCultMode || 'openField';
  popup.querySelectorAll('.adp-cult-popup-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === cur);
  });
  popup.style.display = 'flex';
}
function _adpCloseCultPopup() {
  const popup = document.getElementById('adp-cult-popup');
  if (popup) popup.style.display = 'none';
}
function _adpCultPopupSelect(mode) {
  _adpCloseCultPopup();
  _adpSwitchCultivation(mode);
}

// ─── サマリーバッジ：評価基準トグル（DB ↔ 気候）───
function _adpToggleEvalMode() {
  _adpSetClimateMode(!_adpClimateMode);
}

// ─── 評価モード切替（DB ↔ 気候推定） ───
function _adpSetClimateMode(isClimate) {
  _adpClimateMode = isClimate;
  _awSaveFarmCond();              // 評価モードをエリアごとに永続化

  // トグルボタン active 同期（サマリーバー／条件設定タブの両方を含む全インスタンス）
  document.querySelectorAll('.adp-eval-mode-btn').forEach(btn => {
    const isDb = btn.dataset.eval === 'db';
    btn.classList.toggle('active', isDb ? !isClimate : isClimate);
  });

  // 気候ボタンのラベルをエリア名に更新（サマリーバー／条件設定タブの両方に反映）
  const areaName = currentAreaData?.name;
  document.querySelectorAll('.adp-eval-climate-label').forEach(clLabel => {
    clLabel.textContent = areaName ? `${areaName}の気候` : 'エリア気候';
  });

  // 気候推定モード時はランキングキャッシュを生成
  if (isClimate && !_adpClimateRanking) {
    const decadeArr = currentAreaData?.climate?.decadeArr
                   ?? _adpClimateCache?.decadeArr
                   ?? null;
    if (decadeArr && typeof CROP_DB !== 'undefined' && typeof computeClimateRanking === 'function') {
      const _crCultMode = currentAreaData?.cultivationMode || 'openField';
      _adpClimateRanking = computeClimateRanking(decadeArr, CROP_DB, _crCultMode);
    } else if (!decadeArr) {
      console.warn('[ClimateMode] decadeArr未取得 — AMeDASデータ待ち');
    }
  }

  // グラフを独立して再描画（モードに応じたデータで）
  setTimeout(() => {
    _adpRenderTempChart(_adpSelectedCropId);
    _adpRenderGrowthChart(_adpSelectedCropId);
  }, 20);

  // 常時再描画（サマリーバー操作なので常にアクティブ）
  _adpRenderRankingList();
  _adpRenderGrowthRankingList();
  // 選択作物が存在する場合は全タブも更新
  if (_adpSelectedCropId) {
    _adpSelectCropForAnalysis(_adpSelectedCropId);
  }
}

// ─── サブタブ切替（8タブ構成） ───
const ADP_SUBTAB_KEYS = ['ranking', 'growth', 'tempchart', 'fert', 'risk', 'calendar', 'match', 'planting', 'cropinfo', 'harvest', 'pesticide', 'irrigation', 'weather', 'dashboard', 'shipping'];

// セグメント → 所属タブのマッピング
const ADP_SEG_TABS = {
  practice: ['calendar', 'fert', 'risk', 'planting', 'cropinfo', 'harvest', 'pesticide', 'irrigation', 'weather', 'dashboard', 'shipping'],
  analysis: ['ranking', 'growth', 'tempchart', 'match'],
};

let _adpCurrentSeg = 'practice'; // 現在のセグメント（デフォルト実務）

/**
 * _adpSwitchSeg(seg)
 * セグメント（分析/実務）を切り替える。
 * そのセグメントの先頭タブを自動選択する。
 */
function _adpSwitchSeg(seg) {
  _adpCurrentSeg = seg;

  // セグメントボタン active 切り替え
  document.querySelectorAll('.adp-seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.seg === seg);
  });

  // タブバー表示切り替え
  const analysisBar = document.getElementById('adp-subtabs-analysis');
  const practiceBar = document.getElementById('adp-subtabs-practice');
  if (analysisBar) analysisBar.style.display = (seg === 'analysis') ? '' : 'none';
  if (practiceBar) practiceBar.style.display = (seg === 'practice') ? '' : 'none';

  // 作物バー切り替え
  const cropBarPractice = document.getElementById('adp-crop-bar-practice');
  const cropBarAnalysis = document.getElementById('adp-crop-bar-analysis');
  if (cropBarPractice) cropBarPractice.style.display = (seg === 'practice') ? '' : 'none';
  if (cropBarAnalysis) cropBarAnalysis.style.display = (seg === 'analysis') ? '' : 'none';

  // そのセグメントの先頭タブへ切り替え
  const firstTab = (ADP_SEG_TABS[seg] || [])[0];
  if (firstTab) _adpSwitchSubTab(firstTab);
}

let _adpCurrentSubTab = 'ranking'; // 現在のサブタブ

// スワイプアニメーション経由で呼ばれた場合にdisplay操作をスキップするフラグ
let _adpSwipeAnimating = false;

function _adpSwitchSubTab(name) {
  // 5.5（Step3）：栽植設計ペインから他ペインへ切り替わる際、自動設計プレビューが
  // 残っていれば「適用」相当の確定処理を自動実行する（境界確認ダイアログが必要な
  // 場合はそのまま表示される）。セグメント切替経由（_adpSwitchSeg → 先頭タブへ）も
  // 本関数を通るため、この1箇所のフックでカバーできる。
  if (_adpCurrentSubTab === 'planting' && name !== 'planting' && _adpAutoDesignPreview?.ok) {
    _adpAutoDesignApply();
  }

  _adpCurrentSubTab = name;

  // セグメント自動同期：外部から直接タブ名で呼ばれた場合に正しいバーを表示する
  const _seg = Object.keys(ADP_SEG_TABS).find(s => ADP_SEG_TABS[s].includes(name));
  if (_seg && _seg !== _adpCurrentSeg) {
    _adpCurrentSeg = _seg;
    document.querySelectorAll('.adp-seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.seg === _seg);
    });
    const analysisBar = document.getElementById('adp-subtabs-analysis');
    const practiceBar = document.getElementById('adp-subtabs-practice');
    if (analysisBar) analysisBar.style.display = (_seg === 'analysis') ? '' : 'none';
    if (practiceBar) practiceBar.style.display = (_seg === 'practice') ? '' : 'none';
    // 作物バー切り替え
    const cropBarPractice = document.getElementById('adp-crop-bar-practice');
    const cropBarAnalysis = document.getElementById('adp-crop-bar-analysis');
    if (cropBarPractice) cropBarPractice.style.display = (_seg === 'practice') ? '' : 'none';
    if (cropBarAnalysis) cropBarAnalysis.style.display = (_seg === 'analysis') ? '' : 'none';
  }

  // タブボタン
  document.querySelectorAll('.adp-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });

  // サブサブタブバー（🤖自動設計/🔧調整/📐描画/🌾作物詳細）：
  // 栽植設計（planting）サブタブが選択されている時だけ表示する。
  // 表示時は現在の _adpPlantingUITab を反映して内容を同期する。
  const subsubtabsBar = document.getElementById('adp-subsubtabs-planting');
  if (subsubtabsBar) {
    if (name === 'planting') {
      subsubtabsBar.style.display = '';
      subsubtabsBar.innerHTML = _adpBuildPlantingSubsubtabsBar();
    } else {
      subsubtabsBar.style.display = 'none';
    }
  }

  // ペイン（スワイプアニメーション中はdisplay操作をスキップ）
  if (!_adpSwipeAnimating) {
    ADP_SUBTAB_KEYS.forEach(p => {
      const el = document.getElementById('adp-pane-' + p);
      if (!el) return;
      const visible = (p === name);
      if (el.classList.contains('adp-pane-combined')) {
        el.style.display = visible ? 'flex' : 'none';
      } else {
        el.style.display = visible ? '' : 'none';
      }
    });
  }
  // グラフペインを表示したときに再描画（offsetWidth が 0→正常になるため）
  if (name === 'growth') {
    // 栽培方式トグルは条件設定タブが単一管理元のため、active状態のみ同期
    const currentMode = currentAreaData?.cultivationMode || 'openField';
    document.querySelectorAll('.adp-cult-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });
    setTimeout(() => _adpRenderGrowthChart(_adpSelectedCropId), 30);
  }
  // 適温グラフペインを表示したときに再描画（offsetWidth が 0→正常になるため）
  if (name === 'tempchart') {
    setTimeout(() => {
      _adpRenderTempChart(_adpSelectedCropId);
      _adpRenderSunshineChart();
    }, 30);
  }
  if (name === 'calendar') {
    // マイクボタン注入（voiceMemo.js）
    const hdr = document.getElementById('vm-cal-header-wrap');
    if (hdr && typeof vmMicButtonHTML === 'function' && !document.getElementById('vm-mic-btn')) {
      hdr.innerHTML = vmMicButtonHTML();
    }
    // セグメント・ビューモードをリセット（記録カレンダーをデフォルト表示）
    _adpSwitchCalSegment('visit');
    _adpCalView = 'grid';
    _adpRenderCalendar();
    _adpRenderDayRecords();
    _adpRenderSavedCalendarsList();
    // 実務作物リストで栽培ごよみを事前描画（growthセグメントへ切替時に即表示できるよう）
    if (typeof _renderCalendarMulti === 'function') {
      _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
    }
  }
  // ── 作物選択済み時の各ペイン再描画 ──
  if (_adpPracticecrops.length > 0) {
    if (name === 'fert') {
      if (typeof _renderFertResultMulti === 'function') _renderFertResultMulti(_adpPracticecrops);
      _adpRenderFertRecordSection();
    }
    if (name === 'risk') {
      if (typeof _renderRiskResultMulti === 'function') _renderRiskResultMulti(_adpPracticecrops);
    }
  }
  if (name === 'planting') {
    _adpRenderPlantingPane();
  }
  if (name === 'cropinfo') {
    _adpRenderCropInfoPane();
  }
  if (name === 'harvest') {
    _adpRenderHarvestPane();
  }
  if (name === 'pesticide') {
    _adpRenderPesticidePane();
  }
  if (name === 'irrigation') {
    _adpRenderIrrigationPane();
  }
  if (name === 'weather') {
    _adpRenderWeatherPane();
  }
  if (name === 'dashboard') {
    if (typeof DashboardPane !== 'undefined') DashboardPane.render(_adpPracticecrops, _adpArea);
  }
  if (name === 'shipping') {
    _adpRenderShippingPane();
  }

  // アクティブタブをタブバー内で見えるようにスクロール
  const activeBtn = document.querySelector(`.adp-subtab[data-subtab="${name}"]`);
  if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

// ─── ネストタブ定義テーブル（汎用）───
// subtabKey → { keys: string[], getIdx: ()=>number, switchFn: (key)=>void, panePrefix: string }
// 新しいネストタブを追加する場合はここにエントリを足すだけでスワイプが自動対応する。
function _adpGetNestedTabDef() {
  return {
    ranking: {
      keys:      ADP_RK_PANE_KEYS,
      getIdx:    () => ADP_RK_PANE_KEYS.indexOf(_adpRkCurrentPane),
      switchFn:  (k) => _adpRkSwitchPane(k),
      panePrefix: 'adp-rk-pane-',
    },
    growth: {
      keys:      ADP_GROWTH_PANE_KEYS,
      getIdx:    () => ADP_GROWTH_PANE_KEYS.indexOf(_adpGrowthCurrentSubTab),
      switchFn:  (k) => _adpGrowthSwitchSubTab(k),
      panePrefix: 'adp-growth-pane-',
    },
  };
}

// ─── スライドアニメーション付き表示切替ヘルパー ───
// direction: 'left'（次へ）| 'right'（前へ）
function _adpSlideSwitch(panePrefix, keys, fromKey, toKey, direction) {
  const fromEl = document.getElementById(panePrefix + fromKey);
  const toEl   = document.getElementById(panePrefix + toKey);
  if (!fromEl || !toEl) return;

  const outX = direction === 'left' ? '-100%' : '100%';
  const inX  = direction === 'left' ? '100%'  : '-100%';
  const dur  = '280ms';
  const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';

  // アニメーション中フラグON（switchFn内のdisplay操作を抑制）
  _adpSwipeAnimating = true;

  // toEl を画面外に配置して即表示
  toEl.style.transition = 'none';
  toEl.style.transform  = `translateX(${inX})`;
  toEl.style.display    = '';

  // 1フレーム待ってからアニメーション開始
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fromEl.style.transition = `transform ${dur} ${ease}`;
      fromEl.style.transform  = `translateX(${outX})`;
      toEl.style.transition   = `transform ${dur} ${ease}`;
      toEl.style.transform    = 'translateX(0)';

      // アニメーション完了後に fromEl を非表示・スタイルリセット
      const cleanup = () => {
        fromEl.style.display    = 'none';
        fromEl.style.transition = '';
        fromEl.style.transform  = '';
        toEl.style.transition   = '';
        toEl.style.transform    = '';
        _adpSwipeAnimating = false;
        fromEl.removeEventListener('transitionend', cleanup);
      };
      fromEl.addEventListener('transitionend', cleanup, { once: true });
    });
  });
}

// ─── コンテンツ領域スワイプでタブ切替（最下層優先・アニメーション付き） ───
function _adpInitSwipe() {
  const body = document.querySelector('.adp-view-body');
  if (!body || body._swipeInit) return;
  body._swipeInit = true;

  let startX = 0, startY = 0, startT = 0;

  body.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startT = Date.now();
  }, { passive: true });

  body.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startT;

    // 横方向が縦より大きく、50px以上、300ms以内
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) || dt > 300) return;

    const direction = dx < 0 ? 'left' : 'right';
    const nestedDefs = _adpGetNestedTabDef();

    // ── 最下層優先：現在のサブタブにネストタブ定義があればそちらを操作 ──
    const nested = nestedDefs[_adpCurrentSubTab];
    if (nested) {
      const idx  = nested.getIdx();
      const next = direction === 'left' ? nested.keys[idx + 1] : nested.keys[idx - 1];
      if (next) {
        const fromKey = nested.keys[idx];
        _adpSlideSwitch(nested.panePrefix, nested.keys, fromKey, next, direction);
        // switchFnはアニメーション後も状態変数・ボタンactiveを更新するため呼ぶが、
        // display切替はslideSwitch側で行うためswitchFn内のdisplay操作と競合しないよう
        // ラップして呼ぶ
        nested.switchFn(next);
      }
      return;
    }

    // ── 通常：親サブタブをスワイプ移動（アニメーション付き） ──
    const tabs = ADP_SEG_TABS[_adpCurrentSeg] || [];
    const idx  = tabs.indexOf(_adpCurrentSubTab);
    if (idx === -1) return;
    const next = direction === 'left' ? tabs[idx + 1] : tabs[idx - 1];
    if (!next) return;

    const fromKey = tabs[idx];
    _adpSlideSwitch('adp-pane-', tabs, fromKey, next, direction);
    _adpSwitchSubTab(next);
  }, { passive: true });
}

// ─── 🏆ランキングタブ内サブタブ切替（4分割：条件設定/適合度ランキング/収益ランキング/シミュレーター） ───
const ADP_RK_PANE_KEYS = ['cond', 'match', 'profit', 'sim'];
let _adpRkCurrentPane  = 'cond'; // 現在のランキング内サブタブ

// ─── 収益シミュレーター用モジュール変数 ───
let _simSelectedCropId = null;   // シミュレーターで選択中の作物ID
let _simDirty          = false;  // 未保存変更フラグ
let _simMemory         = {};     // 作物ごとの入力キャッシュ（同一セッション内保持）

function _adpRkSwitchPane(paneKey) {
  // 未保存変更がある場合の離脱確認（simペインから離れる際）
  if (_adpRkCurrentPane === 'sim' && paneKey !== 'sim' && _simDirty) {
    showConfirmDialog('未保存の変更があります。破棄してよろしいですか？', '破棄する', 'キャンセル', false).then(ok => {
      if (!ok) return;
      _simDirty = false;
      delete _simMemory[_simSelectedCropId];
      _adpRkCurrentPane = paneKey;
      _adpRkRenderPane(paneKey);
    });
    return;
  }

  _adpRkCurrentPane = paneKey;

  // タブボタン
  document.querySelectorAll('.adp-rk-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.rkPane === paneKey);
  });
  // ペイン（スワイプアニメーション中はdisplay操作をスキップ）
  if (!_adpSwipeAnimating) {
    ADP_RK_PANE_KEYS.forEach(p => {
      const el = document.getElementById('adp-rk-pane-' + p);
      if (!el) return;
      el.style.display = (p === paneKey) ? '' : 'none';
    });
  }

  // 適合度ランキングペイン表示時にリスト再描画
  if (paneKey === 'match') {
    _adpRenderRankingList();
  }
  // 条件設定ペイン表示時に描画
  if (paneKey === 'cond') {
    _awRenderConditions();
  }
  // 収益ランキング描画
  if (paneKey === 'profit') {
    _adpRenderProfitRankingList();
  }
  // 収益シミュレーター描画
  if (paneKey === 'sim') {
    _adpRenderProfitSimulator();
  }

}
// ─── 収益ランキングリスト描画（サブタブ4） ───
/**
 * _adpRenderProfitRankingList()
 *
 * データソース：_crScores（_adpRenderRankingList()で常時更新済み）
 * viable=true の作物を averageProfit 降順で上位20件表示。
 * farmCond.sales === 'self'（自家消費）の除外はStep4で有効化。
 */
function _adpRenderProfitRankingList() {
  const el = document.getElementById('crop-ranking-profit');
  if (!el) return;

  // カテゴリーフィルター適用済みスコアを取得
  const allScores = (typeof _crScores !== 'undefined') ? _crScores : [];
  if (!allScores.length) {
    el.innerHTML = '<div class="empty-mini">エリアを選択するとランキングが表示されます。</div>';
    return;
  }

  // viable のみ・自家消費除外・カテゴリーフィルター適用・averageProfit 降順・上位20件
  const isSelf = (_awFarmCond && _awFarmCond.sales === 'self');
  const filtered = (typeof _crFilteredScores === 'function') ? _crFilteredScores() : allScores;
  const sorted = [...filtered]
    .filter(s => s.viable && s.profitability && !isSelf)
    .sort((a, b) => b.profitability.averageProfit - a.profitability.averageProfit)
    .slice(0, 20);

  if (!sorted.length) {
    el.innerHTML = isSelf
      ? '<div class="empty-mini">販売先が「自家消費」のため収益ランキングは表示されません。<br>条件設定から販売先を変更してください。</div>'
      : '<div class="empty-mini">適合する作物がありません。</div>';
    return;
  }

  const fmt = n => Math.round(n).toLocaleString('ja-JP');
  const fmtKg = n => Math.round(n).toLocaleString('ja-JP');

  // 適合度ランキング順位テーブルを事前生成（全スコア対象）
  const matchRankMap = new Map(
    allScores.filter(x => x.viable)
      .sort((a, b) => b.score - a.score)
      .map((x, i) => [x.crop.id, i + 1])
  );

  el.innerHTML = sorted.map((s, idx) => {
    const p          = s.profitability;
    const profit     = p.averageProfit;
    const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
    const profitSign  = profit >= 0 ? '+' : '';
    const isSelected  = s.crop.id === _adpSelectedCropId;

    const matchRank  = matchRankMap.get(s.crop.id) ?? '–';
    const profitRank = idx + 1;
    const diff       = (typeof matchRank === 'number') ? matchRank - profitRank : null;
    const diffLabel  = diff === null ? '–' : diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : '–';
    const diffClass  = diff === null ? 'rank-same' : diff > 0 ? 'rank-up' : diff < 0 ? 'rank-down' : 'rank-same';

    const detailId = `adp-profit-detail-${idx}`;
    return `
      <div class="adp-rk-profit-card${isSelected ? ' selected' : ''}"
           onclick="adpCropTap(this, '${s.crop.id}')">
        <div class="adp-rk-profit-card-header">
          <span class="adp-rk-profit-rank">#${profitRank}</span>
          <span class="adp-rk-profit-name">${s.crop.name}</span>
          <span class="adp-rk-profit-amount ${profitClass}">${profitSign}${fmt(profit)} 円</span>
          <span class="adp-rk-profit-diff ${diffClass}" title="適合度順位との差">適合#${matchRank} ${diffLabel}</span>
          <span class="adp-rk-toggle" onclick="
            event.stopPropagation();
            const d=document.getElementById('${detailId}');
            d.style.display = d.style.display==='none' ? '' : 'none';
            this.textContent = d.style.display==='' ? '▲' : '▼';
          ">▼</span>
        </div>
        <div class="adp-rk-profit-detail" id="${detailId}" style="display:none;">
          <table class="adp-rk-profit-table">
            <tr class="adp-rk-profit-yield-row"><th>基準収量</th><td>${Math.round(p.baseYield ?? 0).toLocaleString('ja-JP')} kg</td>
                <td class="adp-rk-sub">DB標準値 × ${p.area10a?.toFixed(2)} 10a</td></tr>
            <tr class="adp-rk-profit-yield-row"><th>補正係数</th><td class="${(p.yieldCorrectionFactor ?? 1) >= 1 ? 'profit-positive' : (p.yieldCorrectionFactor ?? 1) >= 0.75 ? '' : 'profit-negative'}">${Math.round((p.yieldCorrectionFactor ?? 1) * 100)}%</td>
                <td class="adp-rk-sub">適合率 × 栽培方式 × 気温乖離</td></tr>
            <tr class="adp-rk-profit-yield-row"><th>予測収量</th><td>${Math.round(p.predictedYield ?? 0).toLocaleString('ja-JP')} kg</td>
                <td class="adp-rk-sub">基準 × 補正係数</td></tr>
            <tr class="adp-rk-profit-yield-row"><th>出荷率</th><td>${Math.round((p.marketableYieldRate ?? 0) * 100)}%</td>
                <td class="adp-rk-sub">→ 出荷量 ${Math.round(p.marketableYield ?? 0).toLocaleString('ja-JP')} kg</td></tr>
            <tr><th>収入</th><td class="profit-positive">+${fmt(p.revenue)} 円</td>
                <td class="adp-rk-sub">出荷量 ${fmtKg(p.marketableYield)} kg × ${fmt(p.averagePrice)} 円/kg</td></tr>
            <tr><th>種苗費</th><td>−${fmt(p.seedCost)} 円</td><td></td></tr>
            <tr><th>資材費</th><td>−${fmt(p.materialCost)} 円</td><td></td></tr>
            <tr><th>機械費</th><td>−${fmt(p.machineCost)} 円</td><td></td></tr>
            <tr><th>労働費</th><td>−${fmt(p.laborCost)} 円</td><td></td></tr>
            <tr><th>初期償却費</th><td>−${fmt(p.amortizedInitialCost)} 円</td>
                <td class="adp-rk-sub">${p.amortYears}年償却</td></tr>
            <tr><th>リスク控除</th><td>−${fmt(p.riskDeduction)} 円</td>
                <td class="adp-rk-sub">${Math.round(p.riskDeductionRate * 100)}%</td></tr>
            <tr class="adp-rk-profit-total">
              <th>純利益</th>
              <td class="${profitClass}">${profitSign}${fmt(profit)} 円</td>
              <td class="adp-rk-sub">${p.area10a.toFixed(2)} 反換算</td>
            </tr>
          </table>
        </div>
      </div>`;
  }).join('');
}

// ─── サマリーバー更新（条件設定タブ先頭の作物名表示も同期） ───
function _adpEvalModeLabel() {
  return _adpClimateMode ? '🌿 気候' : '📊 DB';
}
function _awSelectedCropName() {
  if (!_adpSelectedCropId) return null;
  const scoreEntry = (typeof _crScores !== 'undefined')
    ? _crScores.find(s => s.crop.id === _adpSelectedCropId) : null;
  const crop = scoreEntry?.crop
    ?? (typeof CROP_DB !== 'undefined'
        ? (CROP_DB.find ? CROP_DB.find(c => c.id === _adpSelectedCropId)
          : Object.values(CROP_DB).flat().find(c => c.id === _adpSelectedCropId))
        : null);
  return crop?.name ?? null;
}
function _adpUpdateSummaryBar({ cropName, areaName, score, mode, evalMode, confPct, confLabel } = {}) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.textContent = val; };

  const hasCrop = cropName != null && cropName !== '—' && cropName !== '';

  // 分析用作物バー更新
  _adpUpdateCropBar('analysis', hasCrop ? cropName : null);

  // 適合度・信頼度バーの表示切り替え（分析セグメントのみ）
  const barsEl = document.getElementById('adp-crop-bar-bars');
  if (barsEl) barsEl.style.display = hasCrop ? '' : 'none';

  if (!hasCrop) {
    // 条件設定タブ先頭の作物選択ボタン表示を同期
    set('adp-rk-cond-crop-name', '🌱 作物を選ぶ');
    // バッジボタンは作物未選択でも現在の設定を常時表示する
    const _cultLabels = { openField:'露地', greenhouse:'ハウス', heatedGreenhouse:'加温' };
    const _curMode = currentAreaData?.cultivationMode || 'openField';
    const _mEl = document.getElementById('adp-summary-mode');
    const _eEl = document.getElementById('adp-summary-evalmode');
    if (_mEl) _mEl.textContent = (_cultLabels[_curMode] ?? '露地') + ' ▸';
    if (_eEl) _eEl.textContent = (_adpClimateMode ? '🌿 気候' : '📊 DB') + ' ▸';
    return;
  }

  // バッジボタン：テキスト＋操作可能を示す ▸ 付きで更新
  const setBadge = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null) el.textContent = val + ' ▸';
  };
  setBadge('adp-summary-mode',     mode);
  setBadge('adp-summary-evalmode', evalMode);

  // 適合度バー
  const scoreNum = score != null ? Number(score) : null;
  const scoreBar = document.getElementById('adp-sum-score-bar');
  const scoreEl  = document.getElementById('adp-summary-score');
  const gradeEl  = document.getElementById('adp-sum-score-grade');
  if (scoreNum != null) {
    if (scoreBar) scoreBar.style.width = scoreNum + '%';
    if (scoreEl)  scoreEl.textContent  = scoreNum + '%';
    const gradeColor = scoreNum >= 70 ? 'var(--green)' : scoreNum >= 40 ? 'var(--amber)' : 'var(--red)';
    if (scoreBar) scoreBar.style.background = gradeColor;
    if (scoreEl)  scoreEl.style.color       = gradeColor;
    if (gradeEl) {
      gradeEl.textContent = scoreNum >= 70 ? '適合' : scoreNum >= 40 ? '要検討' : '不適';
      gradeEl.style.color = gradeColor;
    }
  }

  // 信頼度バー
  const confNum = confPct != null ? parseInt(confPct) : null;
  const confBar  = document.getElementById('adp-conf-bar');
  const confPctEl = document.getElementById('adp-conf-pct');
  const confLblEl = document.getElementById('adp-conf-label');
  if (confNum != null) {
    if (confBar)   confBar.style.width    = confNum + '%';
    if (confPctEl) confPctEl.textContent  = confNum + '%';
  }
  const confJa = confNum == null ? '—'
    : confNum >= 75 ? '高い'
    : confNum >= 50 ? '普通'
    : confNum >= 25 ? '低い'
    : 'とても低い';
  if (confLblEl) confLblEl.textContent = confJa;

  // 条件設定タブ先頭の作物選択ボタン表示を同期
  set('adp-rk-cond-crop-name', cropName ?? '🌱 作物を選ぶ');
}

/**
 * 作物選択バーの表示を更新する
 * @param {'analysis'|'practice'} seg
 * @param {string|null} cropName  null = 未選択状態に戻す
 */
function _adpUpdateCropBar(seg, cropName) {
  const nameEl = document.getElementById(`adp-crop-bar-name-${seg}`);
  const iconEl = nameEl?.closest('.adp-crop-bar-btn')?.querySelector('.adp-crop-bar-icon');
  const btnEl  = document.getElementById(`adp-crop-bar-btn-${seg}`);
  if (!nameEl) return;
  if (cropName) {
    nameEl.textContent = cropName;
    if (iconEl) iconEl.textContent = '🌿';
    if (btnEl)  btnEl.classList.add('selected');
  } else {
    nameEl.textContent = '作物を選ぶ';
    if (iconEl) iconEl.textContent = '🌱';
    if (btnEl)  btnEl.classList.remove('selected');
  }
}

// ─── カレンダー表示モード ───
let _adpCalView = 'grid'; // 'grid' | 'list'

// ─── カレンダーセグメント ───
let _adpCalSegment = 'visit'; // 'visit' | 'growth'

// ─── 統合バー：全ボタンのactive状態をリセット ───
function _adpCalBarClearActive() {
  ['adp-cal-seg-visit', 'adp-cal-view-list', 'adp-cal-seg-growth'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
}

function _adpSwitchCalSegment(seg) {
  _adpCalSegment = seg;
  _adpCalBarClearActive();
  if (seg === 'visit') {
    document.getElementById('adp-cal-seg-visit')?.classList.add('active');
    // グリッドビューに戻す
    _adpCalView = 'grid';
  } else {
    document.getElementById('adp-cal-seg-growth')?.classList.add('active');
  }
  const visitWrap  = document.getElementById('adp-cal-visit-wrap');
  const growthWrap = document.getElementById('adp-cal-growth-wrap');
  if (visitWrap)  visitWrap.style.display  = seg === 'visit'  ? '' : 'none';
  if (growthWrap) growthWrap.style.display = seg === 'growth' ? '' : 'none';
  if (seg === 'growth' && typeof _renderCalendarMulti === 'function') {
    _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
  }
  if (seg === 'visit') _adpRenderCalendar();
}

function _adpSetCalView(mode) {
  _adpCalView = mode;
  // リストボタン押下時は記録カレンダーセグメントを表示
  _adpCalSegment = 'visit';
  const visitWrap  = document.getElementById('adp-cal-visit-wrap');
  const growthWrap = document.getElementById('adp-cal-growth-wrap');
  if (visitWrap)  visitWrap.style.display  = '';
  if (growthWrap) growthWrap.style.display = 'none';
  _adpCalBarClearActive();
  if (mode === 'list') {
    document.getElementById('adp-cal-view-list')?.classList.add('active');
  } else {
    document.getElementById('adp-cal-seg-visit')?.classList.add('active');
  }
  _adpRenderCalendar();
}

// ─── カレンダー描画 ───
function _adpRenderCalendar() {
  const wrap = document.getElementById('adp-calendar-wrap');
  if (!wrap) return;

  const areaId  = _adpArea?.id;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  // このエリアの記録を日付ごとにまとめる
  const byDate  = {};
  records.forEach(r => {
    if (r.areaId !== areaId) return;
    const d = r.shipDate || r.harvestDate || r.createdAt?.slice(0, 10);
    if (!d) return;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push({ _type: 'record', ...r });
  });
  // 音声メモを統合
  if (typeof vmLoadByArea === 'function') {
    vmLoadByArea(areaId).forEach(m => {
      const d = m.workDate;
      if (!d) return;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push({ _type: 'voiceMemo', ...m });
    });
  }
  // 施肥・農薬・収穫記録を統合（_adpPracticecrops から）
  (_adpPracticecrops || []).forEach(pc => {
    const cropId   = pc.cropId;
    const cropName = _adpCropIdToName(cropId);
    (pc.fertRecords || []).forEach(r => {
      if (!r.date) return;
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push({ _type: 'fert', cropId, cropName, ...r });
    });
    (pc.pesticideRecords || []).forEach(r => {
      if (!r.date) return;
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push({ _type: 'pesticide', cropId, cropName, ...r });
    });
    (pc.harvestRecords || []).forEach(r => {
      if (!r.date) return;
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push({ _type: 'harvest', cropId, cropName, ...r });
    });
  });
  // 灌水記録を統合（_adpIrrigationRecords から）
  (_adpIrrigationRecords || []).forEach(r => {
    if (!r.date) return;
    if (!byDate[r.date]) byDate[r.date] = [];
    const cropName = r.cropId ? _adpCropIdToName(r.cropId) : 'エリア全体';
    byDate[r.date].push({ _type: 'irrigation', cropName, ...r });
  });

  const y = _adpYear, mo = _adpMonth;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const isCurrentMonth = (y === today.getFullYear() && mo === today.getMonth());

  // ─── まとめカード ───
  _adpRenderSummaryCard(byDate, y, mo, todayStr);
  // ─── 予定バナー ───
  _adpRenderUpcomingBanner(byDate, todayStr);

  if (_adpCalView === 'list') {
    _adpRenderCalendarList(byDate, y, mo, todayStr);
    return;
  }

  // ─── グリッド表示 ───
  const monthLabel  = `${y}年 ${mo + 1}月`;
  const firstDay    = new Date(y, mo, 1).getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const dows = ['日','月','火','水','木','金','土'];
  const dowHTML = dows.map(d => `<div class="adp-cal-dow">${d}</div>`).join('');

  let cellsHTML = '';
  for (let i = 0; i < firstDay; i++) cellsHTML += `<div class="adp-cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const recs    = byDate[dateStr] || [];
    const isToday = dateStr === todayStr;
    const isSel   = dateStr === _adpSelDate;
    let cls = 'adp-cal-day';
    if (isToday) cls += ' today';
    if (isSel)   cls += ' selected';
    if (recs.length) cls += ' has-record';

    // ドット（種別で形・色を変える。最大4個 + 残数）
    const shown = recs.slice(0, 4);
    const extra = recs.length > 4 ? recs.length - 4 : 0;
    const dots = shown.map(r => {
      if (r._type === 'record')    return `<div class="adp-cal-dot dot-record"></div>`;
      if (r._type === 'fert')      return `<div class="adp-cal-dot dot-fert"></div>`;
      if (r._type === 'pesticide') return `<div class="adp-cal-dot dot-pest"></div>`;
      if (r._type === 'irrigation') return `<div class="adp-cal-dot dot-irrig"></div>`;
      if (r._type === 'harvest')   return `<div class="adp-cal-dot dot-harvest"></div>`;
      if (r.isSchedule)            return `<div class="adp-cal-dot dot-schedule"></div>`;
      return                              `<div class="adp-cal-dot dot-memo"></div>`;
    }).join('');
    const extraHTML = extra > 0 ? `<span class="adp-cal-dot-extra">+${extra}</span>` : '';
    const dotsHTML = `<div class="adp-cal-dots">${dots}${extraHTML}</div>`;

    cellsHTML += `
      <div class="${cls}" onclick="_adpSelectDate('${dateStr}')">
        <div class="adp-cal-day-num">${d}</div>
        ${dotsHTML}
      </div>`;
  }

  const weatherBarHTML = isCurrentMonth ? _adpBuildWeatherBarHTML() : '';
  wrap.innerHTML = `
    <div class="adp-cal-nav">
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(-1)">‹ 前の月</button>
      <span class="adp-cal-month-label">${monthLabel}</span>
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(1)">次の月 ›</button>
    </div>
    ${weatherBarHTML}
    ${!isCurrentMonth ? `<button class="adp-cal-today-btn" onclick="_adpGoToday()">今日に戻る</button>` : ''}
    <div class="adp-cal-grid">
      ${dowHTML}
      ${cellsHTML}
    </div>
  `;
}

// ─── まとめカード（件数表示削除済み） ───
function _adpRenderSummaryCard(byDate, y, mo, todayStr) {
  const el = document.getElementById('adp-cal-summary-card');
  if (el) el.innerHTML = '';
}

// ─── 予定バナー ───
function _adpRenderUpcomingBanner(byDate, todayStr) {
  const el = document.getElementById('adp-cal-upcoming-banner');
  if (!el) return;
  const upcoming = [];
  Object.entries(byDate).forEach(([date, recs]) => {
    if (date <= todayStr) return;
    recs.forEach(r => {
      if (r.isSchedule) upcoming.push({ date, label: r.text || r.note || '予定' });
    });
  });
  if (!upcoming.length) { el.innerHTML = ''; return; }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];
  const d = new Date(next.date);
  const dateLabel = `${d.getMonth()+1}月${d.getDate()}日`;
  el.innerHTML = `
    <div class="adp-cal-upcoming-banner">
      📌 もうすぐの予定：<strong>${dateLabel}</strong> — ${next.label}
    </div>`;
}

// ─── リスト表示（前半1〜15日 / 後半16〜末日） ───
function _adpRenderCalendarList(byDate, y, mo, todayStr) {
  const wrap = document.getElementById('adp-calendar-wrap');
  if (!wrap) return;
  const monthStr = `${y}-${String(mo+1).padStart(2,'0')}`;
  const today = new Date();
  const isCurrentMonth = (y === today.getFullYear() && mo === today.getMonth());
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const monthLabel = `${y}年 ${mo + 1}月`;

  // 前半/後半に分ける
  const firstHalf  = [];  // 1〜15日
  const secondHalf = [];  // 16〜末日
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2,'0')}`;
    const recs = byDate[dateStr];
    if (!recs || !recs.length) continue;
    (d <= 15 ? firstHalf : secondHalf).push([dateStr, recs]);
  }

  // 1日分の行HTML生成ヘルパー
  function buildHalfRow(dateStr, recs) {
    const d   = new Date(dateStr + 'T00:00:00');
    const day = d.getDate();
    const dow = '日月火水木金土'[d.getDay()];
    const isToday = dateStr === todayStr;
    const isSel   = dateStr === _adpSelDate;

    // アイコンチップ（種別ごと）
    const chips = recs.map(r => {
      let icon, label;
      switch (r._type) {
        case 'fert':       icon = '🌱'; label = r.cropName || ''; break;
        case 'pesticide':  icon = '💊'; label = r.cropName || ''; break;
        case 'irrigation': icon = '💧'; label = r.cropName || 'エリア全体'; break;
        case 'harvest':    icon = '🧺'; label = r.cropName || ''; break;
        case 'record':     icon = '📦'; label = r.cropName || r.item || ''; break;
        case 'voiceMemo':  icon = '🎤'; label = r.tag || ''; break;
        default:           icon = r.isSchedule ? '📌' : '🎤'; label = r.text || r.note || ''; break;
      }
      const labelHTML = label ? `<span class="cal-chip-label">${escHtml(label)}</span>` : '';
      return `<span class="cal-chip cal-chip-${r._type || 'other'}">${icon}${labelHTML}</span>`;
    }).join('');

    let rowCls = 'adp-cal-list-row';
    if (isToday) rowCls += ' today';
    if (isSel)   rowCls += ' selected';
    return `
      <div class="${rowCls}" onclick="_adpSelectDate('${dateStr}')">
        <div class="adp-cal-list-date">
          <span class="cal-list-day">${day}日</span>
          <span class="cal-list-dow ${isToday ? 'cal-list-dow-today' : ''}">${dow}</span>
          ${isToday ? `<span class="cal-today-badge">今日</span>` : ''}
        </div>
        <div class="cal-chips-wrap">${chips}</div>
      </div>`;
  }

  // 前半/後半セクションHTML
  function buildSection(entries, label, empty) {
    if (!entries.length) return `
      <div class="cal-half-section">
        <div class="cal-half-header">${label}</div>
        <div class="cal-half-empty">${empty}</div>
      </div>`;
    return `
      <div class="cal-half-section">
        <div class="cal-half-header">${label}</div>
        ${entries.map(([d, r]) => buildHalfRow(d, r)).join('')}
      </div>`;
  }

  const weatherBarHTMLList = isCurrentMonth ? _adpBuildWeatherBarHTML() : '';
  const m1 = mo + 1;
  wrap.innerHTML = `
    <div class="adp-cal-nav">
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(-1)">‹ 前の月</button>
      <span class="adp-cal-month-label">${monthLabel}</span>
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(1)">次の月 ›</button>
    </div>
    ${weatherBarHTMLList}
    ${!isCurrentMonth ? `<button class="adp-cal-today-btn" onclick="_adpGoToday()">今日に戻る</button>` : ''}
    ${buildSection(firstHalf,  `${m1}月1日〜15日`, '記録なし')}
    ${buildSection(secondHalf, `${m1}月16日〜${daysInMonth}日`, '記録なし')}
  `;
}

// ─────────────────────────────────────────
//  天気予報（Open-Meteo 16日）
// ─────────────────────────────────────────

// WMOコード → 絵文字
const _WMO_ICON = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'🌨️', 75:'❄️',
  77:'❄️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  85:'🌨️', 86:'❄️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
};

function _adpWmoIcon(code) {
  if (code == null) return '—';
  return _WMO_ICON[code] || '🌡️';
}

// Open-Meteo 取得＋キャッシュ
async function _adpFetchWeather(lat, lng, areaId) {
  // 同エリアかつ1時間以内ならキャッシュを使用
  if (_adpWeatherCache && _adpWeatherCache.areaId === areaId) {
    const age = Date.now() - _adpWeatherCache.fetchedAt;
    if (age < 3600 * 1000) return;
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${lat}&longitude=${lng}`
      + `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,`
      + `precipitation_sum,et0_fao_evapotranspiration,relative_humidity_2m_max,relative_humidity_2m_min,`
      + `wind_speed_10m_max,sunshine_duration,uv_index_max,dew_point_2m_max`
      + `&timezone=Asia%2FTokyo&forecast_days=16&wind_speed_unit=ms`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    _adpWeatherCache = {
      areaId,
      fetchedAt: Date.now(),
      daily: json.daily,  // { time[], weathercode[], temperature_2m_max/min[], precipitation_probability_max[],
                            //   precipitation_sum[], et0_fao_evapotranspiration[], relative_humidity_2m_max/min[],
                            //   wind_speed_10m_max[](m/s), sunshine_duration[](秒), uv_index_max[], dew_point_2m_max[] }
    };
  } catch(e) {
    console.warn('[ADP] 天気予報取得失敗:', e);
  }
}

// 天気予報帯HTML生成
function _adpBuildWeatherBarHTML() {
  const d = _adpWeatherCache?.daily;
  if (!d || !d.time?.length) return '';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // 今日以降16日分
  const items = d.time.map((t, i) => {
    if (t < todayStr) return '';
    const dt   = new Date(t);
    const mo   = dt.getMonth() + 1;
    const day  = dt.getDate();
    const dow  = '日月火水木金土'[dt.getDay()];
    const icon = _adpWmoIcon(d.weathercode?.[i]);
    const hi   = d.temperature_2m_max?.[i] != null ? Math.round(d.temperature_2m_max[i]) : '—';
    const lo   = d.temperature_2m_min?.[i] != null ? Math.round(d.temperature_2m_min[i]) : '—';
    const pop  = d.precipitation_probability_max?.[i] != null ? d.precipitation_probability_max[i] : null;
    const isToday = t === todayStr;
    const popColor = pop != null && pop >= 60 ? 'var(--blue, #60a5fa)' : 'var(--text3)';
    const popHTML  = pop != null ? `<span class="adp-wx-pop" style="color:${popColor}">${pop}%</span>` : '';
    return `
      <div class="adp-wx-card${isToday ? ' adp-wx-today' : ''}">
        <span class="adp-wx-date">${mo}/${day}<span class="adp-wx-dow">${dow}</span></span>
        <span class="adp-wx-icon">${icon}</span>
        <span class="adp-wx-hi">${hi}°</span>
        <span class="adp-wx-lo">${lo}°</span>
        ${popHTML}
      </div>`;
  }).join('');

  if (!items.trim()) return '';
  return `<div class="adp-wx-bar"><div class="adp-wx-scroll">${items}</div></div>`;
}

// 天気予報帯のみ再描画（AMeDAS取得後など）
function _adpRenderWeatherBar() {
  // グリッド・リスト両方で再描画するため _adpRenderCalendar を呼ぶ
  _adpRenderCalendar();
}

// ═══════════════════════════════════════════════════════════════
//  Section 8: 天候タブ  🌤️
//  - _adpRenderWeatherPane()         : メインレンダリング
//  - _adpCalcIrrigationAdvice(d)     : 灌水アドバイス判定（ハイブリッド）
//  - _adpCalcPestRisk(d)             : 病害虫リスク5種判定
//  - _adpCalcBonusAdvisories(d)      : ボーナス表示（散布適否・日照不足）
//  - _adpSeasonalRiskMessages()      : 季節リスク（AMeDAS過去気候ベース）
// ═══════════════════════════════════════════════════════════════

// ── 季節リスクテーブル（月→メッセージ） ─────────────────────────
const WX_SEASONAL_RISK = {
  1:  ['❄️ 凍霜害リスク期間。マルチング・防霜対策を確認してください。'],
  2:  ['❄️ 晩霜に注意。播種・定植は地温確認後に行ってください。'],
  3:  ['🌬️ 春一番・乾燥風による病害虫飛来期。定期観察を強化してください。'],
  4:  ['🌧️ 低温多雨になりやすい時期。灰色かび病・べと病に注意してください。'],
  5:  ['☀️ 高温乾燥日が続くと害虫（アブラムシ・ハダニ）が多発しやすい時期です。'],
  6:  ['💧 梅雨期。過湿によるカビ・軟腐病リスクが高まります。排水管理を徹底してください。'],
  7:  ['🌡️ 高温障害・熱中症リスク期。作業時間帯と灌水量を調整してください。'],
  8:  ['🌡️ 猛暑が続く時期。土壌水分の過不足チェックを毎日行ってください。'],
  9:  ['🍃 台風シーズン。倒伏・冠水対策を事前に確認してください。'],
  10: ['🍂 秋雨・低温により疫病リスクが上昇します。'],
  11: ['❄️ 早霜の可能性があります。防霜資材を準備してください。'],
  12: ['❄️ 凍霜害リスク期間。施設・マルチ管理を確認してください。'],
};

// ── ヘルパー：今日以降の予報インデックスを取得 ──────────────────
function _adpWxStartIdx(d) {
  const today = new Date().toISOString().slice(0, 10);
  const idx = (d.time || []).findIndex(t => t >= today);
  return idx < 0 ? 0 : idx;
}

// ── ヘルパー：N日間のウィンドウで条件を満たす日数を返す ──────────
// pairs: [[array, threshold, op], ...]  op: '>=' | '<=' | '>' | '<'
function _adpWxCountDays(d, startIdx, windowLen, pairs) {
  let count = 0;
  for (let i = startIdx; i < startIdx + windowLen; i++) {
    const allMatch = pairs.every(([arr, thr, op]) => {
      const v = arr?.[i];
      if (v == null) return false;
      if (op === '>=') return v >= thr;
      if (op === '<=') return v <= thr;
      if (op === '>')  return v > thr;
      if (op === '<')  return v < thr;
      return false;
    });
    if (allMatch) count++;
  }
  return count;
}

// ══════════════════════════════════════════════════════════════
//  灌水アドバイス判定（ハイブリッド方式）
//  返値: { level: 'rain'|'recommend'|'ok', score: 0-100,
//           wbText, reasonText }
// ══════════════════════════════════════════════════════════════
function _adpCalcIrrigationAdvice(d) {
  const s = _adpWxStartIdx(d);
  const pop  = d.precipitation_probability_max;
  const tMax = d.temperature_2m_max;
  const prec = d.precipitation_sum;
  const et0  = d.et0_fao_evapotranspiration;

  // 水分収支（3日合計）: ET0 - 降水量  [mm]
  let wb = 0;
  for (let i = s; i < s + 3; i++) {
    wb += (et0?.[i] ?? 0) - (prec?.[i] ?? 0);
  }
  wb = Math.round(wb * 10) / 10;
  const wbText = `水分収支 ${wb >= 0 ? '+' : ''}${wb}mm`;

  // 今日・明日の降水確率
  const pop0 = pop?.[s]   ?? 0;
  const pop1 = pop?.[s+1] ?? 0;

  // 低降水確率（3日平均）
  const popAvg3 = (pop?.[s] ?? 0 + (pop?.[s+1] ?? 0) + (pop?.[s+2] ?? 0)) / 3;

  // リスクスコア計算
  const popScore  = (100 - popAvg3) / 100 * 100;       // 低降水確率ほど高い
  const tempOver  = Math.max(0, (tMax?.[s] ?? 25) - 28);
  const wbScore   = Math.min(Math.max(wb, 0) / 20, 1) * 100;
  const score     = Math.round(popScore * 0.35 + tempOver * 2.5 * 0.25 + wbScore * 0.40);

  // 判定
  let level, reasonText;
  if (pop0 >= 60 || pop1 >= 60) {
    level = 'rain';
    reasonText = `今後2日内に降水確率 ${Math.max(pop0,pop1)}%の雨が見込まれます`;
  } else if (wb >= 15) {
    level = 'recommend';
    reasonText = `${wbText}（蒸発散が降水量を大きく上回っています）`;
  } else if (
    _adpWxCountDays(d, s, 3, [[pop, 30, '<']]) >= 3 && (tMax?.[s] ?? 0) >= 28
  ) {
    level = 'recommend';
    reasonText = `高温かつ3日間の降水確率が低い状態が続いています（${wbText}）`;
  } else {
    level = 'ok';
    reasonText = `${wbText}（水分バランスは概ね適正です）`;
  }

  return { level, score: Math.min(score, 100), wbText, reasonText };
}

// ══════════════════════════════════════════════════════════════
//  病害虫リスク5種判定
//  返値: [ { key, icon, label, level:'warn'|'caution'|'ok', notes:[] } ]
// ══════════════════════════════════════════════════════════════
function _adpCalcPestRisk(d) {
  const s = _adpWxStartIdx(d);
  const tMax  = d.temperature_2m_max;
  const tMin  = d.temperature_2m_min;
  const pop   = d.precipitation_probability_max;
  const rhMax = d.relative_humidity_2m_max;
  const rhMin = d.relative_humidity_2m_min;
  const wind  = d.wind_speed_10m_max;
  const uv    = d.uv_index_max;
  const dew   = d.dew_point_2m_max;
  const W = 7;  // 判定ウィンドウ（7日）

  const results = [];

  // ①高温障害
  {
    const hotDays = _adpWxCountDays(d, s, W, [[tMax, 35, '>=']]);
    const uvHot   = _adpWxCountDays(d, s, W, [[uv, 8, '>='], [tMax, 32, '>=']]);
    const notes = [];
    let level = 'ok';
    if (hotDays >= 1) { notes.push(`最高気温35°C以上が${hotDays}日見込まれます`); level = 'warn'; }
    if (uvHot >= 1)   { notes.push(`UV指数≥8かつ最高気温≥32°Cの日が${uvHot}日（蒸散ストレス注意）`); if (level === 'ok') level = 'caution'; }
    results.push({ key:'heat', icon:'🌡️', label:'高温障害', level, notes });
  }

  // ②低温障害
  {
    const coldDays  = _adpWxCountDays(d, s, W, [[tMin, 5, '<=']]);
    const frostDays = (tMin && dew)
      ? [0,1,2,3,4,5,6].filter(i => {
          const tm = tMin[s+i], dw = dew[s+i];
          return tm != null && dw != null && (tm - dw) <= 2 && tm >= 0 && tm <= 5;
        }).length
      : 0;
    const notes = [];
    let level = 'ok';
    if (coldDays >= 1) { notes.push(`最低気温5°C以下の日が${coldDays}日見込まれます`); level = 'warn'; }
    if (frostDays >= 1){ notes.push(`❄️ 霜害注意：露点と最低気温の差≤2°Cの日が${frostDays}日（結霜リスク）`); level = 'warn'; }
    results.push({ key:'cold', icon:'🥶', label:'低温障害', level, notes });
  }

  // ③過湿/カビ
  {
    const wetDays = _adpWxCountDays(d, s, W, [[pop, 60, '>=']]);
    // 相対湿度が高い無降水日（高湿無降水型）
    let dryHighRh = 0;
    for (let i = s; i < s + W; i++) {
      if ((rhMax?.[i] ?? 0) >= 85 && (pop?.[i] ?? 100) < 30) dryHighRh++;
    }
    const notes = [];
    let level = 'ok';
    if (wetDays >= 2) { notes.push(`降水確率60%以上の日が${wetDays}日連続見込まれます`); level = 'warn'; }
    if (dryHighRh >= 2){ notes.push(`高湿度（無降水型）が${dryHighRh}日：灰色かび病・べと病に注意`); if (level === 'ok') level = 'caution'; }
    results.push({ key:'mold', icon:'💧', label:'過湿/カビ', level, notes });
  }

  // ④乾燥
  {
    const dryDays  = _adpWxCountDays(d, s, W, [[pop, 20, '<'], [tMax, 28, '>=']]);
    const earlyDry = _adpWxCountDays(d, s, 3, [[rhMin, 30, '<=']]);
    const notes = [];
    let level = 'ok';
    if (dryDays >= 5) { notes.push(`高温乾燥（降水確率<20%かつ最高気温≥28°C）が${dryDays}日続く見込みです`); level = 'warn'; }
    if (earlyDry >= 3){ notes.push(`相対湿度最小値30%以下が3日以上（早期乾燥警戒）`); if (level === 'ok') level = 'caution'; }
    results.push({ key:'dry', icon:'🏜️', label:'乾燥', level, notes });
  }

  // ⑤害虫リスク
  {
    const bugBase  = _adpWxCountDays(d, s, W, [[tMax, 28, '>='], [pop, 30, '<']]);
    // 無風＋低湿でエスカレーション
    const bugEsc   = (wind && rhMin)
      ? [0,1,2,3,4,5,6].filter(i => {
          return (tMax?.[s+i] ?? 0) >= 28
            && (pop?.[s+i] ?? 100) < 30
            && (rhMin?.[s+i] ?? 100) <= 40
            && (wind?.[s+i] ?? 10) < 2;
        }).length
      : 0;
    const notes = [];
    let level = 'ok';
    if (bugBase >= 3) { notes.push(`高温乾燥が${bugBase}日続き害虫発生リスクが高まります`); level = 'caution'; }
    if (bugEsc >= 1)  { notes.push(`⚠️ 無風・低湿条件が重なる日${bugEsc}日（飛来・定着リスク：警戒）`); level = 'warn'; }
    results.push({ key:'bug', icon:'🦟', label:'害虫リスク', level, notes });
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
//  ボーナスアドバイス（農薬散布適否・日照不足リスク）
// ══════════════════════════════════════════════════════════════
function _adpCalcBonusAdvisories(d) {
  const s = _adpWxStartIdx(d);
  const wind    = d.wind_speed_10m_max;
  const sun     = d.sunshine_duration;  // 秒単位
  const time    = d.time || [];
  const W = 7;
  const result = [];

  // 農薬散布不適日
  const badSprayDays = [];
  for (let i = s; i < s + 3 && i < time.length; i++) {
    if ((wind?.[i] ?? 0) >= 5) {
      badSprayDays.push(time[i]?.slice(5) ?? '');
    }
  }
  if (badSprayDays.length > 0) {
    result.push({
      icon: '🚿',
      label: '農薬散布',
      level: 'caution',
      text: `⚠️ ${badSprayDays.join('・')}は最大風速5m/s以上のため散布不適`
    });
  }

  // 日照不足リスク（秒→時間換算：2h=7200秒）
  const lowSunDays = _adpWxCountDays(d, s, W, [[sun, 7200, '<']]);
  if (lowSunDays >= 3) {
    result.push({
      icon: '☁️',
      label: '日照不足',
      level: 'caution',
      text: `☁️ 日照2時間未満が${lowSunDays}日続く見込み：徒長・収量低下に注意`
    });
  }

  return result;
}

// ══════════════════════════════════════════════════════════════
//  季節リスクメッセージ（AMeDAS過去気候ベース）
// ══════════════════════════════════════════════════════════════
function _adpSeasonalRiskMessages() {
  const month = new Date().getMonth() + 1;
  return WX_SEASONAL_RISK[month] || [];
}

// ══════════════════════════════════════════════════════════════
//  天候ペインレンダリング（メイン）
// ══════════════════════════════════════════════════════════════
function _adpRenderWeatherPane() {
  const el = document.getElementById('weather-result');
  if (!el) return;

  const cache = _adpWeatherCache;
  if (!cache || !cache.daily) {
    el.innerHTML = `
      <div class="wx-loading">
        <p>🌐 天気予報データを取得中です...</p>
        <p class="wx-hint">エリアを再選択すると取得が開始されます</p>
      </div>`;
    return;
  }

  const d = cache.daily;
  const adv    = _adpCalcIrrigationAdvice(d);
  const risks  = _adpCalcPestRisk(d);
  const bonus  = _adpCalcBonusAdvisories(d);
  const season = _adpSeasonalRiskMessages();

  el.innerHTML = `
    <div class="wx-pane">
      ${_adpBuildIrrigationAdviceHTML(adv)}
      ${_adpBuildPestRiskHTML(risks)}
      ${bonus.length ? _adpBuildBonusHTML(bonus) : ''}
      ${season.length ? _adpBuildSeasonalRiskHTML(season) : ''}
      <p class="wx-updated">更新: ${new Date(cache.fetchedAt).toLocaleString('ja-JP')}</p>
    </div>`;
}

// ── 灌水アドバイス HTML ──────────────────────────────────────
function _adpBuildIrrigationAdviceHTML(a) {
  const map = {
    rain:      { icon:'🌧️', label:'雨待ち',    cls:'wx-advice-rain' },
    recommend: { icon:'💧', label:'灌水推奨',  cls:'wx-advice-recommend' },
    ok:        { icon:'✅', label:'灌水不要',  cls:'wx-advice-ok' },
  };
  const m = map[a.level] || map.ok;
  const barW = Math.round(a.score);
  return `
    <div class="wx-section">
      <div class="wx-section-title">💧 灌水アドバイス</div>
      <div class="wx-advice-card ${m.cls}">
        <span class="wx-advice-icon">${m.icon}</span>
        <span class="wx-advice-label">${m.label}</span>
      </div>
      <div class="wx-score-bar-wrap">
        <div class="wx-score-bar" style="width:${barW}%"></div>
      </div>
      <p class="wx-reason">${a.reasonText}</p>
    </div>`;
}

// ── 病害虫リスク HTML ────────────────────────────────────────
function _adpBuildPestRiskHTML(risks) {
  const rows = risks.map(r => {
    const cls   = r.level === 'warn' ? 'wx-risk-warn' : r.level === 'caution' ? 'wx-risk-caution' : 'wx-risk-ok';
    const badge = r.level === 'warn' ? '⚠️警戒' : r.level === 'caution' ? '⚡注意' : '✅良好';
    const notes = r.notes.map(n => `<li class="wx-risk-note">${n}</li>`).join('');
    return `
      <div class="wx-risk-row ${cls}">
        <div class="wx-risk-head">
          <span class="wx-risk-icon">${r.icon}</span>
          <span class="wx-risk-lbl">${r.label}</span>
          <span class="wx-risk-badge">${badge}</span>
        </div>
        ${r.notes.length ? `<ul class="wx-risk-notes">${notes}</ul>` : ''}
      </div>`;
  }).join('');
  return `
    <div class="wx-section">
      <div class="wx-section-title">⚠️ 病害虫・気象リスク</div>
      <div class="wx-risk-list">${rows}</div>
    </div>`;
}

// ── ボーナスアドバイス HTML ──────────────────────────────────
function _adpBuildBonusHTML(bonus) {
  const items = bonus.map(b => `
    <div class="wx-bonus-item wx-bonus-${b.level}">
      <span class="wx-bonus-icon">${b.icon}</span>
      <span class="wx-bonus-text">${b.text}</span>
    </div>`).join('');
  return `
    <div class="wx-section">
      <div class="wx-section-title">📋 追加アドバイス</div>
      ${items}
    </div>`;
}

// ── 季節リスク HTML ──────────────────────────────────────────
function _adpBuildSeasonalRiskHTML(messages) {
  const items = messages.map(m => `<li class="wx-season-item">${m}</li>`).join('');
  return `
    <div class="wx-section">
      <div class="wx-section-title">📅 今月の季節リスク</div>
      <ul class="wx-season-list">${items}</ul>
    </div>`;
}

function _adpGoToday() {
  const now = new Date();
  _adpYear  = now.getFullYear();
  _adpMonth = now.getMonth();
  _adpSelDate = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

function _adpChangeMonth(delta) {
  _adpMonth += delta;
  if (_adpMonth < 0)  { _adpYear--;  _adpMonth = 11; }
  if (_adpMonth > 11) { _adpYear++;  _adpMonth = 0;  }
  _adpSelDate = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

function _adpSelectDate(dateStr) {
  _adpSelDate = (_adpSelDate === dateStr) ? null : dateStr;
  _adpEditId  = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
  // リスト表示時は記録カードが画面外になりやすいのでスクロール
  if (_adpSelDate && _adpCalView === 'list') {
    requestAnimationFrame(() => {
      const el = document.getElementById('adp-day-records-wrap');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

// ─── 選択日記録リスト ───
function _adpRenderDayRecords() {
  const wrap = document.getElementById('adp-day-records-wrap');
  if (!wrap) return;

  if (!_adpSelDate) {
    wrap.innerHTML = '';
    return;
  }

  const areaId  = _adpArea?.id;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  const dayRecs = records.filter(r => {
    if (r.areaId !== areaId) return false;
    const d = r.shipDate || r.harvestDate || r.createdAt?.slice(0, 10);
    return d === _adpSelDate;
  });

  // 音声メモ取得
  const voiceMemos = (typeof vmLoadByDate === 'function')
    ? vmLoadByDate(areaId, _adpSelDate) : [];

  // 施肥・農薬・収穫記録をその日分だけ抽出
  const fertOnDay = [], pestOnDay = [], harvestOnDay = [], irrigOnDay = [];
  (_adpPracticecrops || []).forEach(pc => {
    const cropName = _adpCropIdToName(pc.cropId);
    (pc.fertRecords || []).filter(r => r.date === _adpSelDate)
      .forEach(r => fertOnDay.push({ ...r, cropName }));
    (pc.pesticideRecords || []).filter(r => r.date === _adpSelDate)
      .forEach(r => pestOnDay.push({ ...r, cropName }));
    (pc.harvestRecords || []).filter(r => r.date === _adpSelDate)
      .forEach(r => harvestOnDay.push({ ...r, cropName }));
  });
  (_adpIrrigationRecords || []).filter(r => r.date === _adpSelDate)
    .forEach(r => irrigOnDay.push({
      ...r,
      cropName: r.cropId ? _adpCropIdToName(r.cropId) : 'エリア全体'
    }));

  const label = `${parseInt(_adpSelDate.slice(5,7))}月${parseInt(_adpSelDate.slice(8,10))}日の記録`;

  if (!dayRecs.length && !voiceMemos.length &&
      !fertOnDay.length && !pestOnDay.length && !harvestOnDay.length && !irrigOnDay.length) {
    wrap.innerHTML = `
      <div class="adp-day-records">
        <div class="adp-day-records-title">${label}</div>
        <div class="empty" style="padding:16px 0;font-size:12px;">この日の記録はありません</div>
      </div>`;
    return;
  }

  // 通常記録カード（出荷記録）
  const recCardsHTML = dayRecs.map(r => {
    const item = r.productName || r.item || '—';
    const dest = r.shippingTypeLabel || r.shippingType || '—';
    const isEditing = r.id === _adpEditId;
    return `
      <div class="adp-rec-card" id="adp-rec-${r.id}">
        <div class="adp-rec-card-top">
          <span class="adp-rec-dest">${escHtml(dest)}</span>
        </div>
        <div class="adp-rec-item">${escHtml(item)}</div>
        <div class="adp-rec-actions">
          <button class="btn btn-ghost adp-rec-btn"
            onclick="_adpToggleEdit('${r.id}')">
            ${isEditing ? '閉じる' : '編集'}
          </button>
          <button class="btn btn-danger adp-rec-btn"
            onclick="_adpDeleteRecord('${r.id}')">削除</button>
        </div>
        ${isEditing ? _adpEditPanelHTML(r) : ''}
      </div>
    `;
  }).join('');

  // 音声メモカード
  const vmCardsHTML = voiceMemos.map(m => {
    const details = [
      m.crop     ? `🌱 ${escHtml(m.crop)}`     : '',
      m.material ? `📦 ${escHtml(m.material)}` : '',
      m.quantity ? `⚖️ ${escHtml(m.quantity)}` : '',
      m.note     ? `📝 ${escHtml(m.note)}`     : '',
    ].filter(Boolean).join('　');
    return `
      <div class="adp-rec-card vm-memo-card" id="adp-rec-${m.id}">
        <div class="adp-rec-card-top">
          <span class="vm-tag-badge">${escHtml(m.tag)}</span>
          <span class="vm-memo-time">${m.createdAt ? m.createdAt.slice(11,16) : ''}</span>
        </div>
        <div class="adp-rec-item">${escHtml(m.rawText || '')}</div>
        ${details ? `<div class="vm-memo-details">${details}</div>` : ''}
        <div class="adp-rec-actions">
          <button class="btn btn-danger adp-rec-btn"
            onclick="vmDeleteAndRefresh('${m.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');

  // 施肥セクション
  const fertSectionHTML = fertOnDay.length ? `
    <div class="day-rec-section">
      <div class="day-rec-section-head">🌱 施肥</div>
      ${fertOnDay.map(r => `
        <div class="day-rec-row">
          <span class="day-rec-crop">${escHtml(r.cropName)}</span>
          <span class="day-rec-detail">${escHtml(r.name || '')}${r.amount ? `　${r.amount}${r.unit || ''}` : ''}</span>
          ${r.memo ? `<span class="day-rec-memo">${escHtml(r.memo)}</span>` : ''}
        </div>`).join('')}
    </div>` : '';

  // 農薬セクション
  const pestSectionHTML = pestOnDay.length ? `
    <div class="day-rec-section">
      <div class="day-rec-section-head">💊 農薬</div>
      ${pestOnDay.map(r => `
        <div class="day-rec-row">
          <span class="day-rec-crop">${escHtml(r.cropName)}</span>
          <span class="day-rec-detail">${escHtml(r.name || '')}${r.amount ? `　${r.amount}${r.unit || ''}` : ''}${r.target ? `　対象：${escHtml(r.target)}` : ''}</span>
          ${r.memo ? `<span class="day-rec-memo">${escHtml(r.memo)}</span>` : ''}
        </div>`).join('')}
    </div>` : '';

  // 灌水セクション
  const irrigSectionHTML = irrigOnDay.length ? `
    <div class="day-rec-section">
      <div class="day-rec-section-head">💧 灌水</div>
      ${irrigOnDay.map(r => {
        const methodLabel = { drip:'点滴', sprinkler:'スプリンクラー', manual:'手動', other:'その他' }[r.method] || r.method || '';
        const timeRange = r.startTime && r.endTime ? `${r.startTime}〜${r.endTime}` : '';
        const water = r.totalWaterL != null ? `${r.totalWaterL}L` : '';
        return `
          <div class="day-rec-row">
            <span class="day-rec-crop">${escHtml(r.cropName)}</span>
            <span class="day-rec-detail">${methodLabel}${timeRange ? `　${timeRange}` : ''}${water ? `　${water}` : ''}</span>
            ${r.memo ? `<span class="day-rec-memo">${escHtml(r.memo)}</span>` : ''}
          </div>`;
      }).join('')}
    </div>` : '';

  // 収穫セクション
  const harvestSectionHTML = harvestOnDay.length ? `
    <div class="day-rec-section">
      <div class="day-rec-section-head">🧺 収穫</div>
      ${harvestOnDay.map(r => {
        const revenue = (r.weight != null && r.price != null)
          ? `　¥${Math.round(r.weight * r.price).toLocaleString()}` : '';
        return `
          <div class="day-rec-row">
            <span class="day-rec-crop">${escHtml(r.cropName)}</span>
            <span class="day-rec-detail">${r.grade || ''}　${r.weight != null ? r.weight : ''}${r.unit || ''}${r.price ? `　¥${r.price}/${r.unit || 'kg'}` : ''}${revenue}</span>
          </div>`;
      }).join('')}
    </div>` : '';

  wrap.innerHTML = `
    <div class="adp-day-records">
      <div class="adp-day-records-title">${label}</div>
      ${recCardsHTML}
      ${vmCardsHTML}
      ${fertSectionHTML}
      ${pestSectionHTML}
      ${irrigSectionHTML}
      ${harvestSectionHTML}
    </div>`;
}

// 音声メモ削除→カレンダー再描画
async function vmDeleteAndRefresh(id) {
  const ok = await showConfirmDialog('この音声メモを削除しますか？', '削除する', 'キャンセル', true);
  if (!ok) return;
  if (typeof vmDelete === 'function') vmDelete(id);
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 生育カレンダーの保存（📌保存した作物）───
/**
 * _adpToggleCalendarCrop(cropId)
 * 作業カレンダーの保存トグル。保存済みなら解除、未保存なら追加。
 * currentAreaData.savedCalendarCrops = { [cropId]: { savedAt } } をFirestore/localStorageへ永続化。
 * （_simSaveProfitOverrides/_simResetCropと同じ永続化パターンを踏襲）
 */
async function _adpToggleCalendarCrop(cropId) {
  if (!cropId || !currentAreaData) return;
  const id = currentAreaData.id || _adpArea?.id;
  if (!id) return;

  currentAreaData.savedCalendarCrops = currentAreaData.savedCalendarCrops || {};
  const alreadySaved = !!currentAreaData.savedCalendarCrops[cropId];

  try {
    if (alreadySaved) {
      // 解除
      delete currentAreaData.savedCalendarCrops[cropId];
      if (typeof db !== 'undefined' && db && !String(id).startsWith('local_')) {
        const del = {};
        del[`savedCalendarCrops.${cropId}`] = firebase.firestore.FieldValue.delete();
        await db.collection('areas').doc(id).update(del);
      } else {
        const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
        const idx = stored.findIndex(a => a.id === id);
        if (idx !== -1 && stored[idx].savedCalendarCrops) {
          delete stored[idx].savedCalendarCrops[cropId];
          localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
        }
      }
      showToast('保存を解除しました', 'green');
    } else {
      // 追加
      const payload = { savedAt: new Date().toISOString() };
      currentAreaData.savedCalendarCrops[cropId] = payload;
      if (typeof db !== 'undefined' && db && !String(id).startsWith('local_')) {
        await db.collection('areas').doc(id).update({ [`savedCalendarCrops.${cropId}`]: payload });
      } else {
        const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
        const idx = stored.findIndex(a => a.id === id);
        if (idx !== -1) {
          stored[idx].savedCalendarCrops = stored[idx].savedCalendarCrops || {};
          stored[idx].savedCalendarCrops[cropId] = payload;
          localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
        }
      }
      showToast('カレンダーを保存しました ✓', 'green');
    }
  } catch (e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
    return;
  }

  // 現在表示中の作物カレンダー（ヘッダーのボタン状態）を再描画
  // 実務側(calendar-result)・分析側(calendar-result-analysis)どちらに表示中でも、
  // 対象cropIdと一致していればそれぞれ再描画する（両方に表示されている場合は両方更新）
  if (typeof renderWorkCalendar === 'function') {
    const crop = _adpGrowthFindCrop(cropId);
    const isPractice = _adpPracticecrops.some(c => c.cropId === cropId);
    if (isPractice && typeof _renderCalendarMulti === 'function') _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
    if (cropId === _adpSelectedCropId) renderWorkCalendar(crop, 'calendar-result-analysis');
  }
  _adpRenderSavedCalendarsList();
}

/**
 * _adpRenderSavedCalendarsList()
 * 「📌 保存した作物」一覧をカレンダータブ内に描画する。
 * 各カードは buildWorkCalendarHTML()（analysis.js）で組み立て、✕削除ボタン付き。
 */
function _adpRenderSavedCalendarsList(showAll = false) {
  const wrap = document.getElementById('adp-saved-calendars-wrap');
  if (!wrap) return;

  const saved = currentAreaData?.savedCalendarCrops || {};
  const cropIds = Object.keys(saved).sort((a, b) => (saved[a]?.savedAt || '').localeCompare(saved[b]?.savedAt || ''));

  if (!cropIds.length) {
    wrap.innerHTML = '';
    return;
  }

  const LIMIT = 3;
  const displayIds = showAll ? cropIds : cropIds.slice(0, LIMIT);
  const hidden = cropIds.length - displayIds.length;

  const cardsHtml = displayIds.map(cropId => {
    const crop = _adpGrowthFindCrop(cropId);
    if (!crop) return '';
    const titleButtonHtml = `
      <button class="wc-save-btn wc-remove-btn" onclick="_adpToggleCalendarCrop('${cropId}')">✕ 削除</button>
    `;
    const bodyHtml = (typeof buildWorkCalendarHTML === 'function')
      ? buildWorkCalendarHTML(crop, { titleButtonHtml })
      : '';
    return `<div class="wc-saved-card">${bodyHtml}</div>`;
  }).join('');

  const toggleBtn = cropIds.length > LIMIT
    ? showAll
      ? `<button class="adp-saved-cal-more-btn" onclick="_adpRenderSavedCalendarsList(false)">折りたたむ ▲</button>`
      : `<button class="adp-saved-cal-more-btn" onclick="_adpRenderSavedCalendarsList(true)">もっと見る（+${hidden}件） ▼</button>`
    : '';

  wrap.innerHTML = `
    <div class="adp-saved-cal-header">📌 保存した作物（${cropIds.length}）</div>
    ${cardsHtml}
    ${toggleBtn}
  `;
}

// ─── 編集パネル HTML ───
function _adpEditPanelHTML(record) {
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};
  const typeGrid = Object.entries(SHIPPING_TYPES_REF).map(([key, def]) => {
    const isSel = key === record.shippingType;
    return `<div class="adp-type-btn${isSel ? ' selected' : ''}"
      data-type="${key}"
      onclick="_adpSelectEditType(this, '${record.id}')">
      ${def.icon} ${def.label}
    </div>`;
  }).join('');

  return `
    <div class="adp-edit-panel" id="adp-edit-panel-${record.id}">
      <div class="adp-edit-title">出荷先タイプを変更</div>
      <div class="adp-type-grid">${typeGrid}</div>
      <div class="adp-edit-form-wrap" id="adp-edit-form-wrap-${record.id}">
        ${_adpBuildEditForm(record, record.shippingType)}
      </div>
      <div class="adp-edit-actions">
        <button class="btn btn-ghost" onclick="_adpToggleEdit('${record.id}')">キャンセル</button>
        <button class="btn btn-primary" onclick="_adpSaveEdit('${record.id}')">保存する</button>
      </div>
    </div>`;
}

// ─── 編集フォーム HTML（既存値埋め込み）───
function _adpBuildEditForm(record, type) {
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};
  const def = SHIPPING_TYPES_REF[type];
  if (!def) return '';

  const fieldsHTML = def.sections.flatMap(s => s.fields).map(f => {
    const val = record[f.id] || '';
    let input = '';
    if (f.type === 'select') {
      const opts = (f.options || []).map(o =>
        `<option value="${o}"${val === o ? ' selected' : ''}>${o}</option>`).join('');
      input = `<select class="rec-input" name="${f.id}"><option value="">—</option>${opts}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="rec-input rec-textarea" name="${f.id}" placeholder="${f.placeholder || ''}">${escHtml(val)}</textarea>`;
    } else {
      const unit = f.unit ? `<span class="rec-unit">${f.unit}</span>` : '';
      const wrap = f.unit ? `<div class="rec-input-with-unit">` : '';
      const wEnd = f.unit ? `</div>` : '';
      input = `${wrap}<input class="rec-input" type="${f.type}" name="${f.id}" placeholder="${f.placeholder || ''}" value="${escHtml(val)}">${unit}${wEnd}`;
    }
    return `<div class="rec-field"><label class="rec-label">${f.label}</label>${input}</div>`;
  }).join('');

  return `<div class="rec-section"><div class="rec-section-title-plain">${def.label}</div>${fieldsHTML}</div>`;
}

// ─── タイプ選択時フォーム更新 ───
function _adpSelectEditType(btn, recordId) {
  const panel = document.getElementById(`adp-edit-panel-${recordId}`);
  if (!panel) return;
  panel.querySelectorAll('.adp-type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const type = btn.dataset.type;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  const record  = records.find(r => r.id === recordId);
  if (!record) return;

  const formWrap = document.getElementById(`adp-edit-form-wrap-${recordId}`);
  if (formWrap) formWrap.innerHTML = _adpBuildEditForm(record, type);
}

// ─── 編集パネル開閉 ───
function _adpToggleEdit(id) {
  _adpEditId = (_adpEditId === id) ? null : id;
  _adpRenderDayRecords();
  // 編集パネルが開いたらスクロール
  if (_adpEditId) {
    setTimeout(() => {
      const el = document.getElementById(`adp-rec-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// ─── 保存 ───
function _adpSaveEdit(id) {
  const panel = document.getElementById(`adp-edit-panel-${id}`);
  if (!panel) return;

  const typeBtn  = panel.querySelector('.adp-type-btn.selected');
  const newType  = typeBtn ? typeBtn.dataset.type : null;
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};

  const inputs = panel.querySelectorAll('[name]');
  const newData = {};
  inputs.forEach(el => { if (el.value.trim()) newData[el.name] = el.value.trim(); });

  if (newType) {
    newData.shippingType      = newType;
    newData.shippingTypeLabel = SHIPPING_TYPES_REF[newType]?.label || newType;
  }

  if (typeof recordsUpdate === 'function') {
    recordsUpdate(id, newData);
    showToast('記録を更新しました ✓', 'green');
  }

  _adpEditId = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 削除 ───
async function _adpDeleteRecord(id) {
  const ok = await showConfirmDialog('この記録を削除しますか？', '削除する', 'キャンセル', true);
  if (!ok) return;
  if (typeof recordsDelete === 'function') recordsDelete(id);
  showToast('記録を削除しました', 'green');
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 土壌ラベル変換 ───
function soilLabel(key) {
  const map = { sandy:'砂質土', loam:'壌土', clay:'粘土質', peat:'泥炭土', volcanic:'火山灰土', unknown:'不明' };
  return map[key] || key;
}

// ═══════════════════════════════════════════
//  ADP RANKING — エリア詳細パネル内ランキング
// ═══════════════════════════════════════════

// ─── ランキング描画（エリア詳細パネルを開いた時に呼ぶ）───
function _adpRenderRanking(area) {
  if (typeof buildAnalysisResult !== 'function' || !currentAreaData) return;

  // 表示に使う栽培方式：openAreaDetailPanelで復元済みの値（分析一時値 優先 / なければマスター）を使う。
  // ここで無条件に'openField'へ固定すると、復元処理の結果がエリアを開くたびに消えてしまうため変更。
  const mode = currentAreaData.cultivationMode || 'openField';

  // 露地スコアのキャッシュ（補正比較用）は、表示モードに関わらず必ず露地基準で計算し直す
  let openFieldResult;
  if (mode === 'openField') {
    openFieldResult = buildAnalysisResult(currentAreaData);
  } else {
    const savedMode = currentAreaData.cultivationMode;
    currentAreaData.cultivationMode = 'openField';
    openFieldResult = buildAnalysisResult(currentAreaData);
    currentAreaData.cultivationMode = savedMode; // 表示モードに戻す
  }
  _crOpenFieldScores = openFieldResult.cropScores.map(s => ({ id: s.crop.id, score: s.score }));

  // 栽培方式ボタンを復元済みモードに同期（サマリーバー／条件設定タブの両方を含む全インスタンス）
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  // DB/気候トグルを初期化（一般データベース側をactive）
  document.querySelectorAll('.adp-eval-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.eval === 'db');
  });
  // 気候ボタンのエリア名ラベルを更新（サマリーバー／条件設定タブの両方に反映）
  if (currentAreaData?.name) {
    document.querySelectorAll('.adp-eval-climate-label').forEach(el => {
      el.textContent = `${currentAreaData.name}の気候`;
    });
  }

  // 表示用スコア：露地モードならキャッシュ済みのopenFieldResultを再利用、それ以外は復元モードで計算
  const result = (mode === 'openField') ? openFieldResult : buildAnalysisResult(currentAreaData);

  // analysis.js のランキング状態を更新
  _crScores = result.cropScores;
  _crMajor  = 'all';
  _crMinor  = null;
}


// ─── 栽培方式切替（気温適性・生育期間ペイン共通）※分析側の一時値のみ変更。マスター(area.cultivationMode)はインライン編集経由でのみ変更 ───
function _adpSwitchCultivation(mode) {
  if (!currentAreaData) return;
  currentAreaData.cultivationMode = mode;
  _adpAnalysisCultMode = mode;

  // 分析一時値としてlocalStorageに保存（マスターへの永続化は行わない）
  const areaId = _adpArea?.id || _adpArea?.name || '';
  if (areaId) {
    try { localStorage.setItem(`adpCultAnalysis_${areaId}`, mode); }
    catch(e) { console.warn('_adpSwitchCultivation localStorage:', e); }
  }

  // 両ペインのトグルUI連動更新（.adp-cult-btn すべて対象）
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // スコア再計算 → 両リスト再描画 → 両グラフ再描画
  const result = buildAnalysisResult(currentAreaData);
  _crScores = result.cropScores;
  // 露地に戻ったらキャッシュも更新
  if (mode === 'openField') {
    _crOpenFieldScores = result.cropScores.map(s => ({ id: s.crop.id, score: s.score }));
  }
  _adpRenderRankingList();
  _adpRenderGrowthRankingList();
  _adpRenderTempChart(_adpSelectedCropId);
  _adpRenderGrowthChart(_adpSelectedCropId);
  // 選択作物が存在する場合は全タブも更新
  if (_adpSelectedCropId) {
    _adpSelectCropForAnalysis(_adpSelectedCropId);
  }
}


// ─── 補正比較ヘルパー ───

// 補正サマリーHTML（露地以外のモード時だけ中身あり）
function _adpBuildCorrectionSummary(mode, filteredScores) {
  if (mode === 'openField' || !_crOpenFieldScores || !_crOpenFieldScores.length) return '';

  const modeLabel = mode === 'greenhouse' ? '🏠 ハウス補正中' : '🔥 加温ハウス補正中';

  // filteredScoresに対して露地スコアとの差を計算
  const diffs = filteredScores.map(s => {
    const base = _crOpenFieldScores.find(b => b.id === s.crop.id);
    return base != null ? s.score - base.score : 0;
  });

  const upCount   = diffs.filter(d => d > 0).length;
  const downCount = diffs.filter(d => d < 0).length;
  const avgDiff   = diffs.length
    ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    : 0;
  const avgSign   = avgDiff >= 0 ? '+' : '';

  return `
    <div class="adp-corr-summary">
      <span class="adp-corr-mode">${modeLabel}</span>
      <span class="adp-corr-stats">
        ${upCount > 0 ? `<span class="adp-corr-up">▲${upCount}件上昇</span>` : ''}
        ${downCount > 0 ? `<span class="adp-corr-down">▼${downCount}件低下</span>` : ''}
        <span class="adp-corr-avg">平均${avgSign}${avgDiff}pt</span>
      </span>
    </div>`;
}

// 各アイテムの補正比較HTML
function _adpBuildScoreCompare(cropId, currentScore, mode) {
  if (mode === 'openField' || !_crOpenFieldScores) return { compareHtml: '', rankDiff: null };

  const base = _crOpenFieldScores.find(b => b.id === cropId);
  if (base == null) return { compareHtml: '', rankDiff: null };

  const diff    = Math.round(currentScore - base.score);
  const diffSign = diff >= 0 ? '+' : '';
  const diffCls  = diff > 0 ? 'adp-diff-up' : diff < 0 ? 'adp-diff-down' : 'adp-diff-zero';

  const compareHtml = `
    <span class="adp-score-base">${Math.round(base.score)}%</span>
    <span class="adp-score-arrow">→</span>
    <span class="adp-diff-badge ${diffCls}">${diffSign}${diff}pt</span>`;

  return { compareHtml };
}

// 順位変動計算（filteredOpenFieldScores: 露地側の同フィルタ済み配列が必要）
function _adpCalcRankDiff(cropId, currentRank, openFieldScores) {
  if (!openFieldScores) return null;
  const baseRank = openFieldScores.findIndex(s => s.crop.id === cropId);
  if (baseRank < 0) return null;
  return baseRank - currentRank; // 正=上昇, 負=低下
}

// ─── 播種・収穫時期ラベル生成（DB値 月→旬変換）───
// months: 数値月の配列（1〜12）
// side: 'start'=月上旬基点, 'end'=月下旬基点
function _buildSeasonLabel(months, side = 'start') {
  if (!Array.isArray(months) || !months.length) return null;
  const MONTH_JP = ['1月','2月','3月','4月','5月','6月',
                    '7月','8月','9月','10月','11月','12月'];
  const sorted = [...months].sort((a, b) => a - b);
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];
  const from = MONTH_JP[first - 1] + '上旬';
  const to   = MONTH_JP[last  - 1] + '下旬';
  return first === last ? MONTH_JP[first - 1] + '上旬〜下旬' : `${from}〜${to}`;
}

// ─── 作物の播種・収穫ラベルをまとめて返す ───
function _buildCropSeasonInfo(crop) {
  const cal = crop.calendar || {};
  const result = {};

  // 播種系（sowing → seedling → transplant の優先順）
  if (cal.sowing?.length)     result.sowingLabel     = _buildSeasonLabel(cal.sowing);
  if (cal.seedling?.length)   result.seedlingLabel   = _buildSeasonLabel(cal.seedling);
  if (cal.transplant?.length) result.transplantLabel = _buildSeasonLabel(cal.transplant);
  if (cal.harvest?.length)    result.harvestLabel    = _buildSeasonLabel(cal.harvest);

  return result;
}

// ─── 気候推定モード：播種・収穫旬ラベル ───
function _buildEstimatedSeasonLabel(r) {
  if (r.startDecade === null || r.startDecade === undefined) return null;
  const sowLabel     = Phenology.decadeLabel(r.startDecade);
  const harvestLabel = (r.harvestDecade != null)
    ? Phenology.decadeLabel(r.harvestDecade)
    : Phenology.decadeLabel(r.endDecade);
  return { sowLabel, harvestLabel };
}

// ─── 播種・収穫ブロックHTML生成（ランキングリスト / matchタブ共通） ───
function _buildSeasonBlockHtml(crop, estimatedSeason) {
  const db  = _buildCropSeasonInfo(crop);
  const est = estimatedSeason; // { sowLabel, harvestLabel } | null

  const dbRows = [];
  if (db.sowingLabel)     dbRows.push(`<span class="season-key">播種</span><span class="season-val">${db.sowingLabel}</span>`);
  if (db.seedlingLabel)   dbRows.push(`<span class="season-key">育苗</span><span class="season-val">${db.seedlingLabel}</span>`);
  if (db.transplantLabel) dbRows.push(`<span class="season-key">定植</span><span class="season-val">${db.transplantLabel}</span>`);
  if (db.harvestLabel)    dbRows.push(`<span class="season-key">収穫</span><span class="season-val">${db.harvestLabel}</span>`);

  const dbHtml = dbRows.length
    ? dbRows.map(r => `<div class="season-row">${r}</div>`).join('')
    : '<div class="season-row season-nodata">データなし</div>';

  const estHtml = est
    ? `<div class="season-row"><span class="season-key">播種/定植</span><span class="season-val season-est">${est.sowLabel}</span></div>
       <div class="season-row"><span class="season-key">収穫</span><span class="season-val season-est">${est.harvestLabel}</span></div>`
    : '<div class="season-row season-nodata">AMeDASデータ取得後に表示</div>';

  return `
    <div class="season-block">
      <div class="season-section">
        <div class="season-section-title">📋 一般的な時期</div>
        ${dbHtml}
      </div>
      <div class="season-section">
        <div class="season-section-title">🌤️ このエリアの推定</div>
        ${estHtml}
      </div>
    </div>`;
}

// ─── 気候推定ランキングリスト描画（chart / growth 共通） ───
// ─── 個別リスク行HTML生成（霜・冷害・日照不足リスク共通） ───
//  label     : 表示ラベル（例：'霜リスク'）
//  riskObj   : calcFrostRisk/calcChillRisk/calcSunDeficitRisk の返却値（null可）
//  countText : 補足テキスト（例：'約20日 (0℃未満)'）。空文字なら非表示。
function _crRiskRowHtml(label, riskObj, countText) {
  if (!riskObj) return '';
  const lvCls = 'risk-' + riskObj.riskLevel; // risk-none / risk-low / risk-mid / risk-high
  return `<div class="cr-risk-row ${lvCls}">
    <span class="risk-label">${label}</span>
    <span class="risk-stars">${riskObj.riskStars}</span>
    ${countText ? `<span class="risk-count">${countText}</span>` : ''}
  </div>`;
}

// ─── 寒暖差「品質ボーナス」行HTML生成（diurnal専用） ───
//  diurnal.riskLevel は「寒暖差のなさ」へのリスクとして定義されているため、
//  ボーナス表示ではスター・配色を反転させる（大きいほど良い指標として見せる）。
function _crBonusRowHtml(diurnal) {
  if (!diurnal) return '';
  const bonusCls = {
    none: 'bonus-best',  // 日較差大 → ボーナス最大
    low:  'bonus-good',
    mid:  'bonus-mid',
    high: 'bonus-low',   // 日較差極小 → ボーナスほぼなし
  }[diurnal.riskLevel] || 'bonus-mid';
  const bonusStars = {
    none: '★★★★', low: '★★★☆', mid: '★★☆☆', high: '★☆☆☆',
  }[diurnal.riskLevel] || '★★☆☆';
  return `<div class="cr-bonus-row ${bonusCls}">
    <span class="bonus-label">寒暖差ボーナス</span>
    <span class="bonus-stars">${bonusStars}</span>
    <span class="bonus-count">平均日較差 ${diurnal.avgRange}℃</span>
  </div>`;
}

function _adpRenderClimateRankingList(el, pane) {
  if (!_adpClimateRanking) {
    el.innerHTML = '<div class="empty-mini">気候データ取得中です。しばらくしてから再度タップしてください。</div>';
    return;
  }

  // カテゴリフィルタ（大タブ × 小タブの掛け合わせ）
  const major = (typeof _crMajor !== 'undefined' && _crMajor) ? _crMajor : 'all';
  const minor = (typeof _crMinor !== 'undefined') ? _crMinor : null;

  // 大タブ → 気候推定モードのcategoryキーへのマッピング
  const MAJOR_MAP = {
    grain:     ['grain'],
    vegetable: ['leafy','fruit_veg','root','vegetable'],
    fruit:     ['fruit'],
    wild:      ['wildveg','herb'],
    forest:    ['forest'],
  };

  // 小タブ（DBモードのcategoryキー）→ 気候推定フィルタ用のcategoryキーへの変換
  const MINOR_TO_CLIMATE_CAT = {
    grain:     'grain',
    legume:    'legume',
    leafy:     'leafy',
    vegetable: 'vegetable',
    fruit_veg: 'fruit_veg',
    root:      'root',
    fruit:     'fruit',
    wildveg:   'wildveg',
    herb:      'herb',
    forest:    'forest',
  };

  let allowedCats = major !== 'all' ? (MAJOR_MAP[major] || []) : null;

  // 小タブが選択されていれば、大タブの範囲内でさらに絞り込む
  if (minor) {
    const climateCat = MINOR_TO_CLIMATE_CAT[minor];
    if (climateCat) {
      // 大タブ範囲との交差（大タブが 'all' なら小タブだけで絞る）
      if (!allowedCats || allowedCats.includes(climateCat)) {
        allowedCats = [climateCat];
      } else {
        // 大タブ範囲に含まれないサブカテゴリ → 結果ゼロ
        allowedCats = [];
      }
    }
  }

  let list = _adpClimateRanking;
  if (allowedCats) {
    list = list.filter(r => allowedCats.includes(r.crop.category));
  }

  if (!list.length) {
    el.innerHTML = '<div class="empty-mini">該当作物なし</div>';
    return;
  }

  const itemsHtml = list.slice(0, 60).map((r, i) => {
    const scoreCls = r.score >= 70 ? 'score-high' : r.score >= 40 ? 'score-mid' : 'score-low';
    const isSelected = r.crop.id === _adpSelectedCropId;

    const gpMin = r.crop.conditions?.growthPeriodMin;
    const gpMax = r.crop.conditions?.growthPeriodMax;
    const gpStr = (gpMin != null || gpMax != null)
      ? `<span class="cr-gp-badge">${gpMin ?? '?'}〜${gpMax ?? '?'}日</span>`
      : '';

    const est = _buildEstimatedSeasonLabel(r);
    const seasonHtml = _buildSeasonBlockHtml(r.crop, est);

    // ── 高温リスク行・詳細リスク行（霜・冷害・日照不足・寒暖差ボーナス） ──
    //  「適合度ランキング」(pane==='ranking')では⚠️リスクタブへ表示を集約するため非表示。
    //  「生育期間」(pane==='growth')のリストでは従来通り表示する。
    let heatHtml = '';
    let detailRisksHtml = '';
    if (pane !== 'ranking') {
      const hr = r.heatRisk;
      heatHtml = hr
        ? (() => {
            const lvCls = hr.riskLevel === 'none' ? 'heat-none'
                        : hr.riskLevel === 'low'  ? 'heat-low'
                        : hr.riskLevel === 'mid'  ? 'heat-mid'
                        : 'heat-high';
            const countTxt = hr.hotDecadeCount > 0
              ? `<span class="heat-count">約${hr.hotDayApprox ?? hr.hotDecadeCount * 10}日以上 (${hr.threshold}℃超)</span>`
              : '';
            return `<div class="cr-heat-row ${lvCls}">
              <span class="heat-label">高温リスク</span>
              <span class="heat-stars">${hr.riskStars}</span>
              ${countTxt}
            </div>`;
          })()
        : '';

      const ar = r.allRisks;
      detailRisksHtml = ar
        ? `<div class="cr-risk-detail-wrap">
            ${_crRiskRowHtml('霜リスク',   ar.frost,
                (ar.frost && ar.frost.frostDecadeCount > 0) ? `約${ar.frost.frostDayApprox}日 (0℃未満)` : '')}
            ${_crRiskRowHtml('冷害リスク', ar.chill,
                (ar.chill && ar.chill.chillDecadeCount > 0) ? `約${ar.chill.chillDecadeCount * 10}日 (${ar.chill.chillThreshold}℃未満)` : '')}
            ${_crRiskRowHtml('日照不足',   ar.sunDeficit,
                ar.sunDeficit ? `充足率${ar.sunDeficit.sufficiencyPct}%` : '')}
            ${_crBonusRowHtml(ar.diurnal)}
          </div>`
        : '';
    }

    const idAttr = pane === 'growth' ? `adp-cr-item` : `cr-item`;
    return `
      <div class="${idAttr}${isSelected ? ' selected' : ''}" onclick="adpCropTap(this, '${r.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}</span>
          <span class="cr-name">${escHtml(r.crop.name)}${gpStr}</span>
          <span class="cr-score ${scoreCls}">${r.score}%</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${scoreCls}" style="width:${r.score}%"></div>
        </div>
        ${heatHtml}
        ${detailRisksHtml}
        <div class="season-block-wrap">${seasonHtml}</div>
      </div>`;
  }).join('');

  el.innerHTML =
    `<div class="adp-climate-mode-note">🌿 ${currentAreaData?.name ?? 'エリア'}の気候：旬別気温・日照から播種適期を算出</div>` +
    itemsHtml;
}

// ─── ADP専用ランキングリスト描画 ───
function _adpRenderRankingList() {
  const el = document.getElementById('crop-ranking');
  if (!el) return;

  // ── 気候推定モード ──
  if (_adpClimateMode) {
    _adpRenderClimateRankingList(el, 'ranking');
    return;
  }

  // ── DBモード（従来） ──
  const scores = _crFilteredScores();
  const mode   = currentAreaData?.cultivationMode || 'openField';

  if (!scores.length) {
    el.innerHTML = '<div class="empty-mini">該当作物なし</div>';
    return;
  }

  // 露地側の同フィルタ済みスコア（順位変動用）
  const ofScores = (mode !== 'openField' && _crOpenFieldScores)
    ? scores.map(s => {
        const base = _crOpenFieldScores.find(b => b.id === s.crop.id);
        return base ? { crop: s.crop, score: base.score } : null;
      }).filter(Boolean).sort((a, b) => b.score - a.score)
    : null;

  const summaryHtml = _adpBuildCorrectionSummary(mode, scores);

  const itemsHtml = scores.slice(0, 20).map((s, i) => {
    const scoreCls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
    const isSelected = s.crop.id === _adpSelectedCropId;
    const gpMin = s.crop.conditions?.growthPeriodMin;
    const gpMax = s.crop.conditions?.growthPeriodMax;
    const gpStr = (gpMin != null || gpMax != null)
      ? `<span class="cr-gp-badge">${gpMin ?? '?'}〜${gpMax ?? '?'}日</span>`
      : '';

    // 順位変動バッジ（栽培方式間のランク変化のみ。詳細な補正比較・気候リスクはStep上、
    // それぞれ「条件設定」「⚠️リスクタブ」へ集約済みのためここでは表示しない）
    const rankDiff = ofScores ? _adpCalcRankDiff(s.crop.id, i, ofScores) : null;
    const rankDiffHtml = rankDiff != null && rankDiff !== 0
      ? `<span class="adp-rank-diff ${rankDiff > 0 ? 'adp-diff-up' : 'adp-diff-down'}">`
        + (rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`) + `</span>`
      : '';

    // 播種収穫ブロック（DBモードでは気候推定なし）／アコーディオンで開閉する唯一の表示内容
    const seasonHtml = _buildSeasonBlockHtml(s.crop, null);

    return `
      <div class="cr-item${isSelected ? ' cr-item-open' : ''}"
        onclick="adpCropTap(this, '${s.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}${rankDiffHtml}</span>
          <span class="cr-name">${escHtml(s.crop.name)}${gpStr}</span>
          <span class="cr-score ${scoreCls}">${s.score}%</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${scoreCls}" style="width:${s.score}%"></div>
        </div>
        <div class="season-block-wrap">${seasonHtml}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = '<div class="adp-db-mode-note">📊 一般データベース：DB平年値ベースの適正スコア</div>' + summaryHtml + itemsHtml;
}

// ═══════════════════════════════════════════
//  Phase6: 固定セクション描画
//  （旧 areaCharts.js のロジックを移植・常時表示化）
// ═══════════════════════════════════════════

// ─── 🌤️ 気候サマリー（ランキング上部固定・4枚カード＋気候帯） ───
// AMeDAS取得前は「データ取得中」、取得後は観測局/推定値バッジを表示
function _adpRenderClimateSummary(area) {
  const el = document.getElementById('adpc-climate-summary');
  if (!el) return;

  if (!_adpClimateLoaded) {
    el.innerHTML = `<div class="adpc-loading"><span class="adpc-spinner"></span><span>気候データ取得中...</span></div>`;
    return;
  }

  const climate = currentAreaData?.climate || {};
  const lp       = area.landProfile || {};
  const elev     = lp.elevation ?? area.meta?.elev ?? null;
  const ph       = lp.ph ?? null;
  const sunshine = climate.sunshineHours ?? lp.sunshineHours ?? null;
  const isStation = climate.stationName != null;

  const cards = [
    {
      icon:  '🌡️',
      label: '年均気温',
      value: climate.tempMean != null ? climate.tempMean.toFixed(1) : '—',
      unit:  '℃',
      color: _adpTempColor(climate.tempMean),
      hint:  climate.tempMean == null ? null
           : climate.tempMean >= 18 ? '温暖'
           : climate.tempMean >= 13 ? '標準的'
           : climate.tempMean >= 8  ? 'やや寒冷'
           : '寒冷',
    },
    {
      icon:  '🌧️',
      label: '年降水量',
      value: climate.rain != null ? Math.round(climate.rain).toLocaleString() : '—',
      unit:  'mm',
      color: '#60a5fa',
      hint:  climate.rain == null ? null
           : climate.rain >= 2000 ? '多雨'
           : climate.rain >= 1200 ? '標準的'
           : climate.rain >= 700  ? '降水少なめ'
           : '乾燥気味',
    },
    {
      icon:  '☀️',
      label: '年間日照',
      value: sunshine != null ? Math.round(sunshine).toLocaleString() : '—',
      unit:  'h',
      color: '#fbbf24',
      hint:  sunshine == null ? null
           : sunshine >= 2000 ? '日照豊富'
           : sunshine >= 1500 ? '標準的'
           : '日照少なめ',
    },
    {
      icon:  '🏔️',
      label: '標高',
      value: elev != null ? Math.round(elev).toLocaleString() : '—',
      unit:  'm',
      color: 'var(--text2)',
      hint:  elev == null ? null
           : elev >= 600 ? '高冷地'
           : elev >= 200 ? '中標高'
           : '平地',
    },
    {
      icon:  '🧪',
      label: '土壌pH',
      value: ph != null ? ph.toFixed(1) : '—',
      unit:  '',
      color: ph == null ? 'var(--text2)' : ph >= 7.5 ? '#f87171' : ph >= 6.0 ? '#4ade80' : '#fbbf24',
      hint:  ph == null ? null
           : ph >= 7.5 ? 'アルカリ性'
           : ph >= 6.0 ? '弱酸性（適正）'
           : '酸性',
    },
  ];

  const badge = isStation
    ? `<span class="adpc-badge-ok">${climate.stationName}${climate.distKm != null ? '&nbsp;' + climate.distKm + 'km' : ''}</span>`
    : `<span class="adpc-badge-warn">📍 推定値（観測局なし）</span>`;

  el.innerHTML = `
    <div class="adpc-mini-summary adpc-mini-summary-5">
      ${cards.map(c => `
        <div class="adpc-mini-stat">
          <span class="adpc-mini-stat-icon">${c.icon}</span>
          <div class="adpc-mini-stat-body">
            <span class="adpc-mini-stat-label">${c.label}</span>
            <span class="adpc-mini-stat-value" style="color:${c.color}">${c.value}<span class="adpc-mini-stat-unit">${c.unit}</span></span>
            ${c.hint ? `<span class="adpc-mini-stat-hint">${c.hint}</span>` : ''}
            ${c.sub  ? `<span class="adpc-mini-stat-sub">${c.sub}</span>`  : ''}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="adpc-mini-zone">
      <span class="adpc-mini-zone-name">${climate.name || lp.climateName || '—'}</span>
      ${badge}
    </div>
  `;
}

function _adpTempColor(t) {
  if (t == null) return 'var(--text2)';
  if (t >= 20) return '#f87171';
  if (t >= 15) return '#fbbf24';
  if (t >= 10) return '#4ade80';
  return '#2dd4bf';
}

// ─── ☀️ 旬別日照チャート（気温グラフの下・Canvas2D） ───
function _adpRenderSunshineChart() {
  const canvas  = document.getElementById('adp-sun-canvas');
  const subEl   = document.getElementById('adp-sun-chart-sub');
  const legendEl = document.getElementById('adp-sun-legend');
  if (!canvas) return;

  const decadeArr = currentAreaData?.climate?.decadeArr; // {..., sun?[36]}

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 70;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 6, right: 6, bottom: 16, left: 28 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;
  const N   = 36;

  if (!decadeArr || !Array.isArray(decadeArr.sun) || decadeArr.sun.length !== N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別日照データなし（AMeDAS未取得）', W / 2, H / 2);
    if (subEl)    subEl.textContent = '日照データ未取得';
    if (legendEl) legendEl.innerHTML = '';
    return;
  }

  const sunArr = decadeArr.sun;
  const maxRaw = Math.max(...sunArr.filter(v => v !== null), 1);
  const yMax   = Math.ceil(maxRaw / 10) * 10 || 10;

  const cellW = gW / N;
  const barW  = cellW * 0.7;
  const toX   = i => PAD.left + i * cellW;
  const toY   = v  => PAD.top + (1 - v / yMax) * gH;

  // ── 横グリッド線（0 / 最大）──
  ctx.strokeStyle = 'rgba(42,61,44,0.10)';
  ctx.lineWidth   = 1;
  [0, yMax].forEach(val => {
    const y = toY(val);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(90,122,92,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${val}h`, PAD.left - 4, y + 3);
  });

  // ── 縦グリッド線（月境界：3旬ごと）──
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(42,61,44,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // ── 棒グラフ ──
  sunArr.forEach((v, i) => {
    if (v === null) return;
    const x = toX(i) + (cellW - barW) / 2;
    const y = toY(v);
    const h = (PAD.top + gH) - y;
    const intensity = v / yMax;
    ctx.fillStyle = intensity >= 0.7 ? 'rgba(251,191,36,0.75)'
                  : intensity >= 0.4 ? 'rgba(251,191,36,0.45)'
                  :                    'rgba(251,191,36,0.2)';
    ctx.fillRect(x, y, barW, h);
  });

  // ── 月ラベル（各月中旬 = 旬インデックス m*3+1）──
  const MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  ctx.fillStyle = 'rgba(90,122,92,0.8)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  MONTH_LABELS.forEach((label, m) => {
    ctx.fillText(label, toX(m * 3 + 1) + cellW / 2, H - 4);
  });

  if (subEl) subEl.textContent = '旬別日照時間';
  if (legendEl) legendEl.innerHTML = `
    <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.6)"></span>日照時間（h/旬）</span>
  `;
}

// ─── 🌿 土地環境適合度ドーナツ（適合度ペイン固定・作物選択なしでも表示） ───
function _adpRenderEnvDonut(area) {
  const wrap = document.getElementById('adpc-env-donut-fixed');
  if (!wrap) return;

  const lp      = area.landProfile || {};
  const climate = currentAreaData?.climate || {};
  const temp = climate.tempMean ?? lp.avgTemp        ?? null;
  const rain = climate.rain     ?? lp.annualRainfall ?? null;
  const elev = lp.elevation     ?? area.meta?.elev   ?? null;
  const ph   = lp.ph                                  ?? null;

  const C_GREEN = '#4ade80', C_AMBER = '#fbbf24', C_RED = '#f87171';

  const rings = [
    _adpCalcEnvRing('年均気温', temp,  '℃',  -5,  40,  12,  22, C_GREEN, C_AMBER, C_RED),
    _adpCalcEnvRing('土壌pH',   ph,    '',   3.5,   9, 5.5,   7, C_GREEN, C_AMBER, C_RED),
    _adpCalcEnvRing('標高',     elev,  'm',    0, 2000,   0, 600, C_GREEN, C_AMBER, C_RED),
    _adpCalcEnvRing('年降水量', rain,  'mm',   0, 3500, 900, 2200, C_GREEN, C_AMBER, C_RED),
  ];

  const SIZE = 160, CX = 80, CY = 80, GAP = 5, THICK = 13, R_BASE = 28;

  function arcPath(cx, cy, r, startDeg, endDeg) {
    const toRad = d => (d - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy + r * Math.sin(toRad(endDeg));
    return `M ${x1} ${y1} A ${r} ${r} 0 ${(endDeg - startDeg) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  }

  let ringsSvg = '';
  rings.forEach((ring, i) => {
    const r   = R_BASE + i * (THICK + GAP);
    const pct = ring.score !== null ? ring.score : 0;
    const deg = pct / 100 * 359.9;

    ringsSvg += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="#2a3d2c" stroke-width="${THICK}" opacity="0.55"/>`;
    if (ring.score !== null && pct > 0) {
      ringsSvg += `
        <path d="${arcPath(CX, CY, r, 0, deg)}" fill="none" stroke="${ring.color}"
          stroke-width="${THICK}" stroke-linecap="round"
          style="filter:drop-shadow(0 0 4px ${ring.color}66)">
          <animate attributeName="stroke-dashoffset" from="${2*Math.PI*r}" to="0"
            dur="0.7s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1"/>
        </path>`;
    }
  });

  const legendHTML = rings.map(ring => `
    <div class="adpc-legend-row">
      <span class="adpc-legend-dot" style="background:${ring.score !== null ? ring.color : '#2a3d2c'}"></span>
      <div class="adpc-legend-info">
        <div class="adpc-legend-top">
          <span class="adpc-legend-label">${ring.name}</span>
          <span class="adpc-legend-val" style="color:${ring.score !== null ? ring.color : 'var(--text3)'}">${ring.displayVal}</span>
        </div>
        <span class="adpc-legend-status" style="color:${ring.score !== null ? ring.color : 'var(--text3)'}">${ring.score !== null ? ring.statusLabel : 'データなし'}</span>
      </div>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="adpc-section-title"><span>🌿 土地環境適合度</span></div>
    <div class="adpc-donut-layout">
      <svg class="adpc-donut-svg" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
        ${ringsSvg}
        <text x="${CX}" y="${CY-5}" text-anchor="middle" fill="#5a7a5c" font-size="8" font-family="'DM Mono',monospace" letter-spacing="0.08em">LAND</text>
        <text x="${CX}" y="${CY+7}" text-anchor="middle" fill="#5a7a5c" font-size="8" font-family="'DM Mono',monospace" letter-spacing="0.08em">ENV</text>
      </svg>
      <div class="adpc-donut-legend">${legendHTML}</div>
    </div>`;
}

function _adpCalcEnvRing(name, value, unit, displayMin, displayMax, optMin, optMax, cGood, cWarn, cBad) {
  const fmt = v => {
    if (v == null) return '—';
    if (unit === '℃' || unit === '') return Number(v).toFixed(1) + unit;
    return Math.round(v) + unit;
  };
  if (value == null || !isFinite(value)) return { name, score: null, color: '#2a3d2c', displayVal: '—', statusLabel: 'データなし', unit };

  let score, color, statusLabel;
  if (value >= optMin && value <= optMax) {
    score = 100; color = cGood; statusLabel = '適合';
  } else {
    const overShoot = value < optMin
      ? (optMin - value) / (optMin - displayMin || 1)
      : (value - optMax) / (displayMax - optMax || 1);
    score = Math.max(0, Math.round((1 - overShoot) * 85));
    color = score >= 50 ? cWarn : cBad;
    statusLabel = score >= 50 ? '近接' : '範囲外';
  }
  return { name, score, color, displayVal: fmt(value), statusLabel, unit };
}

// ─── ⚠️ 環境リスクゲージ（リスクペイン固定・作物選択なしでも表示） ───
function _adpRenderLandRiskGauges(area) {
  const wrap = document.getElementById('adpc-risk-gauges-fixed');
  if (!wrap) return;

  const lp = area.landProfile || {};
  const C_GREEN = '#4ade80', C_AMBER = '#fbbf24', C_RED = '#f87171';

  const gauges = [
    { label: '浸水リスク',   icon: '🌊', value: lp.floodRisk   ?? null, level: lp.floodRiskLevel   ?? null },
    { label: '干ばつリスク', icon: '☀️', value: lp.droughtRisk ?? null, level: lp.droughtRiskLevel ?? null },
    { label: '積雪リスク',   icon: '❄️', value: lp.snowRisk    ?? null, level: lp.snowRiskLevel    ?? null },
  ];

  if (gauges.every(g => g.value === null)) {
    wrap.innerHTML = `
      <div class="adpc-section-title"><span>⚠️ 土地環境リスク</span></div>
      <div class="adpc-nodata">分析実行後にリスクが表示されます</div>`;
    return;
  }

  const rows = gauges.map(g => {
    const pct        = g.value !== null ? Math.min(100, Math.max(0, g.value)) : 0;
    const color      = g.level === 'high' ? C_RED : g.level === 'medium' ? C_AMBER : C_GREEN;
    const levelLabel = g.level === 'high' ? '高' : g.level === 'medium' ? '中' : g.value !== null ? '低' : '—';
    return `
      <div class="adpc-gauge-row">
        <span class="adpc-gauge-label">${g.icon} ${g.label}</span>
        <div class="adpc-gauge-track">
          <div class="adpc-gauge-bar" style="width:${pct}%;background:${color};box-shadow:0 0 6px ${color}55;transition:width 0.6s ease;"></div>
        </div>
        <span class="adpc-gauge-pct" style="color:${g.value !== null ? color : 'var(--text3)'}">${g.value !== null ? pct + '%' : '—'}</span>
        <span class="adpc-gauge-val" style="color:${g.value !== null ? color : 'var(--text3)'}">${g.value !== null ? levelLabel : '—'}</span>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="adpc-section-title"><span>⚠️ 土地環境リスク</span></div>
    <div class="adpc-risk-gauges">${rows}</div>`;
}

// ─── 気温折れ線グラフ描画 ───
// ランキング上部に常時表示。cropId指定時は適正温度帯を重畳。
function _adpRenderTempChart(cropId) {
  const canvas = document.getElementById('adp-temp-canvas');
  if (!canvas) return;

  const decadeArr = currentAreaData?.climate?.decadeArr; // {tMax[36], tMin[36], tMean[36]}

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 160;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 14, right: 40, bottom: 34, left: 32 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;
  const N   = 36; // 旬数

  // ── データがない場合はメッセージだけ ──
  if (!decadeArr || !Array.isArray(decadeArr.tMax) || decadeArr.tMax.length !== N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    document.getElementById('adp-temp-legend').innerHTML = '';
    document.getElementById('adp-temp-chart-sub').textContent = '気候データ未取得';
    return;
  }

  const tMaxArr = decadeArr.tMax; // 36要素
  const tMinArr = decadeArr.tMin; // 36要素

  // ── 作物データ取得 ──
  let crop = null;
  if (cropId && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
         : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  }
  if (!crop && cropId && typeof _crScores !== 'undefined') {
    const hit = _crScores.find(s => s.crop.id === cropId);
    if (hit) crop = hit.crop;
  }

  // ── Y軸範囲決定 ──
  const allTemps = [...tMaxArr, ...tMinArr].filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const rawMin = Math.min(...allTemps);
  const rawMax = Math.max(...allTemps);
  const yMin   = Math.floor((rawMin - 2) / 5) * 5;
  const yMax   = Math.ceil ((rawMax + 2) / 5) * 5;
  const yRange = yMax - yMin || 1;

  const toX = i  => PAD.left + (i / (N - 1)) * gW;
  const toY = v  => PAD.top  + (1 - (v - yMin) / yRange) * gH;

  // ── 月境界ラベル用: 各月の最初の旬インデックス ──
  // 12ヶ月 × 3旬 = 36。月ラベルは各月中旬（旬1）の位置に表示
  const MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

  // ── 横グリッド線 & Y軸ラベル ──
  const ySteps = Math.round(yRange / 5);
  for (let s = 0; s <= ySteps; s++) {
    const val = yMin + s * 5;
    const y   = toY(val);
    ctx.strokeStyle = 'rgba(42,61,44,0.10)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(90,122,92,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val + '°', PAD.left - 4, y + 3);
  }

  // ── 縦グリッド線（月境界：3旬ごと）──
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(42,61,44,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // ── 0℃ライン強調 ──
  if (yMin < 0 && yMax > 0) {
    const y0 = toY(0);
    ctx.strokeStyle = 'rgba(248,113,113,0.35)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y0); ctx.lineTo(PAD.left + gW, y0); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 栽培方式・適正温度帯の計算 ──
  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  const isHouse    = cultivationMode === 'greenhouse' || cultivationMode === 'heatedGreenhouse';
  const isHeated   = cultivationMode === 'heatedGreenhouse';
  // engine.jsと合わせる: greenhouse=4反映、heatedGreenhouse=engineが旬別個別計算のため定数補正線は描画しない
  const tMinCorrected = (isHouse && !isHeated)
    ? tMinArr.map(v => v !== null ? v - 4 : null)
    : null;

  // ── 作物適正温度帯：旬別 decadeMatch カラーバー ──
  if (crop) {
    // engine.js scoreCrop() の decadeMatch を _crScores から取得
    let decadeMatch = null;
    if (typeof _crScores !== 'undefined') {
      const hit = _crScores.find(s => s.crop.id === crop.id);
      if (hit?.details) {
        const tempDetail = hit.details.find(d => d.decadeMatch);
        if (tempDetail) decadeMatch = tempDetail.decadeMatch;
      }
    }

    // 旬幅（ピクセル）
    const decadeW = gW / (N - 1);

    if (decadeMatch && decadeMatch.length === N) {
      // ─ 旬別カラーバー（グラフ底部に帯として描画）─
      // 適合: 緑 / 境界: 黄 / 不適合: 赤 / 加温補填: 紫 / 非生育旬: 透明
      const BAR_H  = 6;  // 底部帯の高さ（px）
      const barY   = PAD.top + gH + 2;

      for (let i = 0; i < N; i++) {
        const m = decadeMatch[i];
        if (m === null) continue; // 非生育旬: 塗らない
        let color;
        if (m === true)         color = 'rgba(74,222,128,0.75)';
        else if (m === 'border') color = 'rgba(251,191,36,0.75)';
        else if (m === false)    color = 'rgba(239,68,68,0.65)';
        else if (m?.heated)      color = 'rgba(167,139,250,0.75)';
        else                     continue;

        const x0   = toX(i) - decadeW / 2;
        const xL   = Math.max(x0, PAD.left);              // 左端クリップ
        const xR   = Math.min(x0 + decadeW, PAD.left + gW); // 右端クリップ
        const bW   = xR - xL;
        if (bW <= 0) continue;
        ctx.fillStyle = color;
        ctx.fillRect(xL, barY, bW, BAR_H);
      }

      // 適正温度帯（tempMeanMin〜Max）を横破線で表示
      if (crop.conditions.tempMeanMin != null && crop.conditions.tempMeanMax != null) {
        ctx.strokeStyle = 'rgba(74,222,128,0.60)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 3]);
        [crop.conditions.tempMeanMin, crop.conditions.tempMeanMax].forEach(v => {
          const y = toY(v);
          ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    } else {
      // decadeMatch が取得できない場合は均一帯フォールバック
      if (crop.conditions.tempMeanMin != null && crop.conditions.tempMeanMax != null) {
        const tCropMin = crop.conditions.tempMeanMin;
        const tCropMax = crop.conditions.tempMeanMax;
        const yTop = toY(tCropMax);
        const yBot = toY(tCropMin);
        ctx.fillStyle = 'rgba(74,222,128,0.22)';
        ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
        ctx.strokeStyle = 'rgba(74,222,128,0.60)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        [tCropMin, tCropMax].forEach(v => {
          const y = toY(v);
          ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    }

    // 絶対最低限界気温（absTempMin）ライン
    const absMin = crop.conditions.absTempMin;
    if (absMin != null) {
      // greenhouse: engineと合わせ-4補正、heatedGreenhouse: engine旬別個別計算のため表示および補正なし
      const absMinEffective = (isHouse && !isHeated) ? absMin - 4 : absMin;
      const yAbsMin = toY(absMinEffective);
      ctx.strokeStyle = 'rgba(239,68,68,0.85)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(PAD.left, yAbsMin); ctx.lineTo(PAD.left + gW, yAbsMin); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(239,68,68,0.9)';
      ctx.font      = '8px DM Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`限界${absMinEffective}°`, PAD.left + gW + 2, yAbsMin + 3);
    }
  }

  // ── 最高・最低の面塗り（fill between） ──
  const validIdx = tMaxArr.map((v, i) => (v !== null && tMinArr[i] !== null ? i : -1)).filter(i => i >= 0);
  if (validIdx.length > 1) {
    ctx.beginPath();
    validIdx.forEach((i, k) => {
      const x = toX(i), y = toY(tMaxArr[i]);
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    [...validIdx].reverse().forEach(i => { ctx.lineTo(toX(i), toY(tMinArr[i])); });
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + gH);
    fillGrad.addColorStop(0, 'rgba(251,191,36,0.12)');
    fillGrad.addColorStop(1, 'rgba(56,189,248,0.12)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  // ── 折れ線描画ヘルパー ──
  const drawLine = (arr, color, dash = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.setLineDash(dash);
    ctx.beginPath();
    let moved = false;
    arr.forEach((v, i) => {
      if (v === null) { moved = false; return; }
      if (!moved) { ctx.moveTo(toX(i), toY(v)); moved = true; }
      else        { ctx.lineTo(toX(i), toY(v)); }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawLine(tMaxArr, '#fbbf24');
  drawLine(tMinArr, '#38bdf8');
  if (isHouse && !isHeated) drawLine(tMinCorrected, '#34d399', [4, 3]);

  // ── 旬ドット（3旬ごとに小さめ）──
  for (let i = 0; i < N; i++) {
    const r = (i % 3 === 1) ? 2.5 : 1.5; // 中旬は少し大きく
    if (tMaxArr[i] !== null) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(toX(i), toY(tMaxArr[i]), r, 0, Math.PI * 2); ctx.fill();
    }
    if (tMinArr[i] !== null) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(toX(i), toY(tMinArr[i]), r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── 月ラベル（各月中旬 = 旬インデックス m*3+1 の位置）──
  ctx.fillStyle = 'rgba(90,122,92,0.8)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  MONTH_LABELS.forEach((label, m) => {
    ctx.fillText(label, toX(m * 3 + 1), H - PAD.bottom + 11);
  });

  // ── 凡例更新 ──
  const subEl    = document.getElementById('adp-temp-chart-sub');
  const legendEl = document.getElementById('adp-temp-legend');
  if (crop) {
    // decadeMatch から旬別集計
    let matchCount = 0, borderCount = 0, missCount = 0, heatedCount = 0, totalGrowth = 0;
    if (typeof _crScores !== 'undefined') {
      const hit = _crScores.find(s => s.crop.id === crop.id);
      if (hit?.details) {
        const td = hit.details.find(d => d.decadeMatch);
        if (td?.decadeMatch) {
          td.decadeMatch.forEach(m => {
            if (m === null) return;
            totalGrowth++;
            if (m === true)          matchCount++;
            else if (m === 'border') borderCount++;
            else if (m === false)    missCount++;
            else if (m?.heated)      heatedCount++;
          });
        }
      }
    }

    if (subEl) subEl.textContent = `${crop.name} の適正温度帯を表示中`;
    const tCMin = crop.conditions.tempMeanMin ?? '—';
    const tCMax = crop.conditions.tempMeanMax ?? '—';
    const _mode    = currentAreaData?.cultivationMode || 'openField';
    const _isHeated = _mode === 'heatedGreenhouse';
    // greenhouse: -4補正を表示、heatedGreenhouse: engineが旬別個別計算のため表示なし
    const houseNote = (_mode === 'greenhouse')
      ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399;border:1px dashed #34d399"></span>最低気温(ハウス-4℃補正)</span>`
      : '';
    const _absMin    = crop.conditions.absTempMin;
    const _absMinEff = (_absMin != null && _mode === 'greenhouse')
      ? _absMin - 4 : _absMin;

    const matchStr  = totalGrowth > 0 ? `適合${matchCount}` + (borderCount ? `・境界${borderCount}` : '') + (missCount ? `・不適${missCount}` : '') + (heatedCount ? `・加温${heatedCount}` : '') + `旬 / ${totalGrowth}旬` : '';

    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬最高気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#38bdf8"></span>旬最低気温</span>
      ${houseNote}
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.75)"></span>適合旬</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.75)"></span>境界旬</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(239,68,68,0.65)"></span>不適旬</span>
      ${heatedCount > 0 ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.75)"></span>加温補填旬</span>` : ''}
      ${_absMinEff != null ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(239,68,68,0.8);border:1px dashed rgba(239,68,68,0.9)"></span>限界最低気温 ${_absMinEff}℃</span>` : ''}
      <span class="adp-tl-item" style="color:var(--text3);font-size:10px;">${crop.name} 適正温度 ${tCMin}–${tCMax}℃</span>
      ${matchStr ? `<span class="adp-tl-item adp-tl-period">${matchStr}</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択すると適正温度を重畳表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬別最高気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#38bdf8"></span>旬別最低気温</span>
    `;
  }
} // ─── end _adpRenderTempChart ───

// ═══════════════════════════════════════════
//  生育期間グラフ — 共通ヘルパー
// ═══════════════════════════════════════════

const _ADP_GROWTH_MONTH_KEYS   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const _ADP_GROWTH_MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const _ADP_GROWTH_N = 36; // 旬数

// canvas初期化＋旬データ取得。データなしの場合は「データなし」表示してnullを返す
const _ADP_MODE_LABELS = { openField:'露地栽培', greenhouse:'ハウス栽培', heatedGreenhouse:'加温ハウス' };
function _adpGrowthSetup(canvasId, legendId, noDataMsg) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 190;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(noDataMsg, W / 2, H / 2);
    const legendEl = document.getElementById(legendId);
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  // tMeanCorrected は廃止（データ側補正をやめて閾値側で-4する方針に統一）
  // グラフ描画・判定ともに生データ tMean を使用し、閾値を緩める形で対応
  return { ctx, W, H, decadeArr, rainMonthly, tMeanArr: decadeArr.tMean, cultivationMode };
}

// cropId → CROP_DBエントリ取得（_crScoresフォールバック付き）
function _adpGrowthFindCrop(cropId) {
  let crop = null;
  if (cropId && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
         : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  }
  if (!crop && cropId && typeof _crScores !== 'undefined') {
    const hit = _crScores.find(s => s.crop.id === cropId);
    if (hit) crop = hit.crop;
  }
  return crop;
}

// レイアウト・軸スケール・座標変換関数を生成
function _adpGrowthAxes(g, crop) {
  const PAD = { top: 14, right: 40, bottom: 34, left: 32 };
  const gW  = g.W - PAD.left - PAD.right;
  const gH  = g.H - PAD.top  - PAD.bottom;

  const allTemps = [...g.tMeanArr].filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const tRawMin = Math.min(...allTemps);
  const tRawMax = Math.max(...allTemps);
  const tYMin   = Math.floor((tRawMin - 2) / 5) * 5;
  const tYMax   = Math.ceil ((tRawMax + 2) / 5) * 5;
  const tRange  = tYMax - tYMin || 1;

  const rainVals = _ADP_GROWTH_MONTH_KEYS.map(m => g.rainMonthly?.[m] ?? 0);
  let rYMax = Math.max(...rainVals, 50);
  if (crop?.conditions.absRainMax) rYMax = Math.max(rYMax, crop.conditions.absRainMax * 0.15);
  rYMax = Math.ceil(rYMax / 50) * 50;
  const rRange = rYMax;

  const toX      = i => PAD.left + (i / (_ADP_GROWTH_N - 1)) * gW;
  const toTY     = v => PAD.top  + (1 - (v - tYMin) / tRange) * gH;
  const toRY     = v => PAD.top  + (1 - v / rRange) * gH;
  const toMonthX = m => toX(m * 3); // 縦グリッドと月境界が一致するよう、上旬位置に統一
  const barW_m   = gW / 12;

  return { PAD, gW, gH, tYMin, tYMax, tRange, rYMax, rRange, toX, toTY, toRY, toMonthX, barW_m };
}

// カレンダーキー配列（月数値 or 月キー文字列）→ 月indexの配列（0-11）に変換
function _adpGrowthCalToIdx(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(v => {
    if (typeof v === 'number') return v - 1;
    const i = _ADP_GROWTH_MONTH_KEYS.indexOf(v);
    return i >= 0 ? i : -1;
  }).filter(i => i >= 0);
}

// ── 降水量適正帯シェード（DB/推定 共通・最背面）──
function _adpGrowthDrawRainShade(g, ax, crop) {
  const { ctx } = g;
  const { PAD, gW, toRY, rYMax } = ax;
  if (!crop || !g.rainMonthly) return;

  const rMin = crop.conditions.rainfallMin;
  const rMax = crop.conditions.rainfallMax;
  const aMin = crop.conditions.absRainMin;
  const aMax = crop.conditions.absRainMax;

  if (aMin != null && rMin != null && aMin < rMin) {
    const yTop = toRY(Math.min(rMin, rYMax));
    const yBot = toRY(Math.max(aMin, 0));
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, 'rgba(251,146,60,0.12)');
    grad.addColorStop(1, 'rgba(251,146,60,0.00)');
    ctx.fillStyle = grad;
    ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
  }
  if (rMin != null && rMax != null) {
    const yTop = toRY(Math.min(rMax, rYMax));
    const yBot = toRY(Math.max(rMin, 0));
    ctx.fillStyle = 'rgba(74,222,128,0.13)';
    ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
  }
  if (rMax != null && aMax != null && aMax > rMax) {
    const yTop = toRY(Math.min(aMax, rYMax));
    const yBot = toRY(Math.min(rMax, rYMax));
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, 'rgba(239,68,68,0.00)');
    grad.addColorStop(1, 'rgba(239,68,68,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
  }
}

// ── グリッド・降水量棒・降水適正破線・気温折れ線（DB/推定 共通の基礎背景）──
function _adpGrowthDrawSeries(g, ax, crop) {
  const { ctx } = g;
  const { PAD, gW, gH, tYMin, tRange, rYMax, toX, toTY, toRY, toMonthX, barW_m } = ax;

  // グリッド線（横：気温5度刻み）
  const tSteps = Math.round(tRange / 5);
  for (let s = 0; s <= tSteps; s++) {
    const tv = tYMin + s * 5;
    const y  = toTY(tv);
    ctx.strokeStyle = 'rgba(42,61,44,0.10)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(tv + '°', PAD.left - 4, y + 3);
  }
  // 縦グリッド（月境界：3旬ごと）
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(42,61,44,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // 右Y軸ラベル（降水量）
  for (let s = 0; s <= 4; s++) {
    const rv = Math.round(rYMax * s / 4);
    const y  = toRY(rv);
    ctx.fillStyle = 'rgba(96,165,250,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(rv + 'mm', PAD.left + gW + 3, y + 3);
  }

  // 降水量棒グラフ（月単位）
  if (g.rainMonthly) {
    const bw = barW_m * 0.7;
    _ADP_GROWTH_MONTH_KEYS.forEach((mk, m) => {
      const rv = g.rainMonthly[mk] ?? 0;
      const x  = toMonthX(m) - bw / 2;
      const y  = toRY(rv);
      const bH = (PAD.top + gH) - y;
      if (bH > 0) {
        const grad = ctx.createLinearGradient(0, y, 0, PAD.top + gH);
        grad.addColorStop(0, 'rgba(96,165,250,0.70)');
        grad.addColorStop(1, 'rgba(96,165,250,0.30)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, bw, bH);
      }
    });
  }

  // 降水量適正ライン（破線）
  if (crop && g.rainMonthly) {
    const drawRainLine = (v, color) => {
      if (v == null || v > rYMax) return;
      const y = toRY(v);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
      ctx.setLineDash([]);
    };
    drawRainLine(crop.conditions.rainfallMin, 'rgba(74,222,128,0.7)');
    drawRainLine(crop.conditions.rainfallMax, 'rgba(74,222,128,0.7)');
    drawRainLine(crop.conditions.absRainMin,  'rgba(251,146,60,0.6)');
    drawRainLine(crop.conditions.absRainMax,  'rgba(239,68,68,0.6)');
  }

  // 気温折れ線（旬平均気温）
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  let moved = false;
  g.tMeanArr.forEach((v, i) => {
    if (v === null) { moved = false; return; }
    if (!moved) { ctx.moveTo(toX(i), toTY(v)); moved = true; }
    else        { ctx.lineTo(toX(i), toTY(v)); }
  });
  ctx.stroke();

  // 気温ドット（中旬のみ少し大きく）
  g.tMeanArr.forEach((v, i) => {
    if (v === null) return;
    const r = (i % 3 === 1) ? 2.5 : 1.5;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(toX(i), toTY(v), r, 0, Math.PI * 2); ctx.fill();
  });

  // ハウス補正気温折れ線: tMeanCorrected 廃止のため削除
  // （グラフは生データを表示、判定は閾値側で-4して緩める方式に統一）
}

// 月ラベル（DB/推定 共通・最前面）
function _adpGrowthDrawMonthLabels(g, ax) {
  const { ctx } = g;
  const { PAD, toMonthX } = ax;
  ctx.fillStyle = 'rgba(90,122,92,0.8)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  _ADP_GROWTH_MONTH_LABELS.forEach((label, m) => {
    ctx.fillText(label, toMonthX(m), g.H - PAD.bottom + 11);
  });
}

// 三角マーカー（▼下向き）
function _adpGrowthDrawTriangleMarker(ctx, x, yTop, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 5, yTop);
  ctx.lineTo(x + 5, yTop);
  ctx.lineTo(x,     yTop + 7);
  ctx.closePath();
  ctx.fill();
}

// ダイヤモンドマーカー（◆）
function _adpGrowthDrawDiamondMarker(ctx, x, yCenter, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x,     yCenter - 5);
  ctx.lineTo(x + 4, yCenter);
  ctx.lineTo(x,     yCenter + 5);
  ctx.lineTo(x - 4, yCenter);
  ctx.closePath();
  ctx.fill();
}

// 丸マーカー（●）
function _adpGrowthDrawCircleMarker(ctx, x, yCenter, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, yCenter, 4, 0, Math.PI * 2);
  ctx.fill();
}

// 四角マーカー（■）
function _adpGrowthDrawSquareMarker(ctx, x, yCenter, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, yCenter - 4, 8, 8);
}

// ═══════════════════════════════════════════
//  ① 生育期間グラフ：DB登録カレンダー（上段）
// ═══════════════════════════════════════════
function _adpRenderGrowthChartDB(cropId) {
  const g = _adpGrowthSetup('adp-growth-db-canvas', 'adp-growth-db-legend', '旬別気温データなし（AMeDAS未取得）');
  if (!g) return;
  const { ctx } = g;

  const crop = _adpGrowthFindCrop(cropId);
  const ax   = _adpGrowthAxes(g, crop);
  const { PAD, gW, gH, toMonthX, barW_m } = ax;

  // DB登録カレンダーの4段階（播種・育苗・定植・収穫）を月indexへ変換
  const STAGES = [
    { key: 'sowing',     label: '播種', shade: 'rgba(56,189,248,0.16)',  mark: 'rgba(56,189,248,0.9)',  draw: 'triangle' },
    { key: 'seedling',   label: '育苗', shade: 'rgba(45,212,191,0.16)',  mark: 'rgba(45,212,191,0.9)',  draw: 'circle'   },
    { key: 'transplant', label: '定植', shade: 'rgba(236,72,153,0.14)', mark: 'rgba(236,72,153,0.9)', draw: 'square'   },
    { key: 'harvest',    label: '収穫', shade: 'rgba(74,222,128,0.20)',  mark: 'rgba(74,222,128,0.9)',  draw: 'diamond'  },
  ];
  const stageIdxs = STAGES.map(s => ({
    ...s,
    idxs: crop ? _adpGrowthCalToIdx(crop.calendar?.[s.key]) : [],
  }));

  // 生育期間全体の起点（4段階のうち最も早い月）・終点（収穫の最も遅い月）
  const allStartIdxs = stageIdxs.filter(s => s.key !== 'harvest').flatMap(s => s.idxs);
  const startIdx     = allStartIdxs.length ? Math.min(...allStartIdxs) : null;
  const harvestIdxs  = stageIdxs.find(s => s.key === 'harvest').idxs;

  // ① 降水量適正帯シェード（最背面）
  _adpGrowthDrawRainShade(g, ax, crop);

  // ② 各段階の縦帯シェード
  stageIdxs.forEach(s => {
    s.idxs.forEach(m => {
      const x0 = toMonthX(m) - barW_m / 2;
      ctx.fillStyle = s.shade;
      ctx.fillRect(x0, PAD.top, barW_m, gH);
    });
  });

  // ③ 生育期間帯（起点→収穫）横グラデーション
  if (startIdx !== null && harvestIdxs.length > 0) {
    const endM = Math.max(...harvestIdxs);
    const x0   = toMonthX(startIdx) - barW_m / 2;
    const x1   = toMonthX(endM)     + barW_m / 2;
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0,   'rgba(56,189,248,0.08)');
    grad.addColorStop(0.5, 'rgba(56,189,248,0.14)');
    grad.addColorStop(1,   'rgba(56,189,248,0.06)');
    ctx.fillStyle = grad;
    if (x1 > x0) ctx.fillRect(x0, PAD.top, x1 - x0, gH);
  }

  // ④ グリッド・降水量棒・気温折れ線
  _adpGrowthDrawSeries(g, ax, crop);

  // ⑤ 各段階マーカー（最前面）
  stageIdxs.forEach(s => {
    s.idxs.forEach(m => {
      const x = toMonthX(m);
      const y = PAD.top + 4;
      if (s.draw === 'triangle') _adpGrowthDrawTriangleMarker(ctx, x, PAD.top + 1, s.mark);
      else if (s.draw === 'circle')  _adpGrowthDrawCircleMarker(ctx, x, y, s.mark);
      else if (s.draw === 'square')  _adpGrowthDrawSquareMarker(ctx, x, y, s.mark);
      else if (s.draw === 'diamond') _adpGrowthDrawDiamondMarker(ctx, x, y, s.mark);
    });
  });

  // ⑥ 月ラベル
  _adpGrowthDrawMonthLabels(g, ax);

  // ⑦ 凡例
  const subEl    = document.getElementById('adp-growth-db-sub');
  const legendEl = document.getElementById('adp-growth-db-legend');

  if (crop) {
    if (subEl) subEl.textContent = `${crop.name} のDB登録暦・降水量を表示中`;

    const gpMin = crop.conditions.growthPeriodMin;
    const gpMax = crop.conditions.growthPeriodMax;
    const gpText = (gpMin != null && gpMax != null)
      ? `播種〜収穫：約${gpMin}〜${gpMax}日`
      : gpMin != null ? `播種〜収穫：約${gpMin}日〜`
      : gpMax != null ? `播種〜収穫：〜約${gpMax}日`
      : null;

    const rMin = crop.conditions.rainfallMin;
    const rMax = crop.conditions.rainfallMax;
    const rText = (rMin != null && rMax != null) ? `${rMin}〜${rMax}mm` : null;

    const stageLabels = stageIdxs
      .filter(s => s.idxs.length > 0)
      .map(s => `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:${s.mark}"></span>${s.label} ${s.idxs.map(i => (i + 1) + '月').join('/')}</span>`)
      .join('');

    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
      ${stageLabels}
      ${rText ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.5)"></span>適正降水 ${rText}</span>` : ''}
      ${gpText ? `<span class="adp-tl-item adp-tl-period">${gpText}</span>` : ''}
      ${g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}（+4℃補正）</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択するとDB登録の播種・育苗・定植・収穫を表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
    `;
  }
}

// ═══════════════════════════════════════════
//  ② 生育期間グラフ：気候推定（Phenology/GDD・下段）
// ═══════════════════════════════════════════
function _adpRenderGrowthChartEst(cropId) {
  const g = _adpGrowthSetup('adp-growth-est-canvas', 'adp-growth-est-legend', '旬別気温データなし（AMeDAS未取得）');
  if (!g) return;
  const { ctx } = g;

  const crop = _adpGrowthFindCrop(cropId);
  const ax   = _adpGrowthAxes(g, crop);
  const { PAD, gW, gH, toX, toTY } = ax;

  // Phenology播種ウィンドウ＋GDD積算（crop+decadeArr両方ある時のみ）
  let sowingWindows = [];
  let gddCurve      = null;
  let gddMax        = 0;
  if (crop && typeof Phenology !== 'undefined') {
    // 生データ(decadeArr)をそのまま渡し、cultivationMode を phenology 側に伝播
    // 閾値の緩和(下限-4)は phenology.sowingWindows 内で処理される
    sowingWindows = Phenology.sowingWindows(g.decadeArr, crop, g.cultivationMode);
    if (sowingWindows.length > 0) {
      const base = crop.conditions?.tempMeanMin ?? 10;
      gddCurve = Phenology.accumulateGDD(g.tMeanArr, base, sowingWindows[0].startDecade);
      gddMax   = Math.max(...gddCurve.filter(v => v !== null), 1);
    }
  }

  // ① 降水量適正帯シェード（最背面）
  _adpGrowthDrawRainShade(g, ax, crop);

  // ② Phenology播種ウィンドウ帯（スコア順上位3件を緑帯でシェード）
  if (sowingWindows.length > 0) {
    const decW = gW / (_ADP_GROWTH_N - 1);
    sowingWindows.slice(0, 3).forEach((win, rank) => {
      const alpha = 0.22 - rank * 0.06;
      const s  = win.startDecade;
      const e  = win.endDecade;
      const x0 = ax.toX(s) - decW / 2;
      const x1 = e >= s ? ax.toX(e) + decW / 2 : ax.toX(e + 36) + decW / 2;
      const rw = Math.min(x1 - x0, gW - (x0 - PAD.left));
      if (rw > 0) {
        ctx.fillStyle = `rgba(34,197,94,${alpha})`;
        ctx.fillRect(Math.max(x0, PAD.left), PAD.top, Math.min(rw, gW), gH);
      }
    });
  }

  // ③ グリッド・降水量棒・気温折れ線
  _adpGrowthDrawSeries(g, ax, crop);

  // ④ GDD積算カーブ（紫破線）
  if (gddCurve && gddMax > 0) {
    const toGY = v => PAD.top + (1 - v / gddMax) * gH;
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.8)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    let gMoved = false;
    gddCurve.forEach((v, i) => {
      if (v === null) { gMoved = false; return; }
      const x = toX(i), y = toGY(v);
      if (!gMoved) { ctx.moveTo(x, y); gMoved = true; }
      else         { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(167,139,250,0.85)';
    ctx.font      = '8px DM Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(gddMax)}GDD`, PAD.left + gW + 3, PAD.top + 16);
    ctx.fillText('0GDD', PAD.left + gW + 3, PAD.top + gH - 4);
    ctx.restore();
  }

  // ⑤ 最適ウィンドウの播種/定植適期マーカー（▼緑）＋収穫予測マーカー（◆紫）
  let bestWin = null;
  if (sowingWindows.length > 0) {
    bestWin = sowingWindows[0];
    const bx = toX(bestWin.startDecade);
    _adpGrowthDrawTriangleMarker(ctx, bx, PAD.top + 1, 'rgba(34,197,94,0.95)');

    if (bestWin.harvestDecade != null) {
      const hx = toX(bestWin.harvestDecade);
      _adpGrowthDrawDiamondMarker(ctx, hx, PAD.top + 4, 'rgba(167,139,250,0.95)');
    }
  }

  // ⑥ 月ラベル
  _adpGrowthDrawMonthLabels(g, ax);

  // ⑦ 凡例
  const subEl    = document.getElementById('adp-growth-est-sub');
  const legendEl = document.getElementById('adp-growth-est-legend');

  if (crop) {
    if (subEl) subEl.textContent = `${crop.name} の気候推定暦（GDD）を表示中`;

    const rMin = crop.conditions.rainfallMin;
    const rMax = crop.conditions.rainfallMax;
    const rText = (rMin != null && rMax != null) ? `${rMin}〜${rMax}mm` : null;

    const sowWinLabel    = bestWin ? Phenology.decadeLabel(bestWin.startDecade) : null;
    const sowWinEndLabel = bestWin ? Phenology.decadeLabel(bestWin.endDecade)   : null;
    const harvestLabel   = (bestWin && bestWin.harvestDecade != null) ? Phenology.decadeLabel(bestWin.harvestDecade) : null;

    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
      ${sowWinLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.6)"></span>播種/定植適期 ${sowWinLabel}〜${sowWinEndLabel}</span>` : ''}
      ${harvestLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.85)"></span>収穫予測 ${harvestLabel}</span>` : ''}
      ${rText ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.5)"></span>適正降水 ${rText}</span>` : ''}
      ${gddCurve ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.8)"></span>GDD積算</span>` : ''}
      ${!bestWin ? `<span class="adp-tl-item adp-tl-period">この気候では適期が見つかりませんでした</span>` : ''}
      ${g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}（+4℃補正）</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択すると気候推定（GDD）による播種/定植適期・収穫予測を表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
    `;
  }
}

// ─── 生育期間グラフ：呼び出し元互換ラッパー（現在のネストサブタブに応じて描画を振り分け） ───
// 既存の呼び出し元（_adpRenderGrowthChart(cropId)）はすべてそのまま動作する。
// どのペインを描くかは _adpGrowthCurrentSubTab（暦グラフ/ガント/GDD/適期マップ/方式比較）で決まる。
function _adpRenderGrowthChart(cropId) {
  const pane = (typeof _adpGrowthCurrentSubTab !== 'undefined') ? _adpGrowthCurrentSubTab : 'calendar';

  if (pane === 'calendar') {
    _adpRenderGrowthChartDB(cropId);
    _adpRenderGrowthChartEst(cropId);
  } else if (pane === 'gantt') {
    if (typeof _adpRenderGrowthGantt === 'function') _adpRenderGrowthGantt(cropId);
  } else if (pane === 'gdd') {
    if (typeof _adpRenderGrowthGDD === 'function') _adpRenderGrowthGDD(cropId);
  } else if (pane === 'heatmap') {
    if (typeof _adpRenderGrowthHeatmap === 'function') _adpRenderGrowthHeatmap(cropId);
  } else if (pane === 'compare') {
    if (typeof _adpRenderGrowthCompare === 'function') _adpRenderGrowthCompare(cropId);
  }
}

// ─── 生育期間タブ内ネストサブタブ切替（📅暦グラフ/📊ガント/🌡️GDD/🗺️適期マップ/⚖️方式比較） ───
const ADP_GROWTH_PANE_KEYS    = ['calendar', 'gantt', 'gdd', 'heatmap', 'compare'];
let   _adpGrowthCurrentSubTab = 'calendar'; // 現在の生育期間内サブタブ（初期値＝暦グラフ）

function _adpGrowthSwitchSubTab(paneKey) {
  _adpGrowthCurrentSubTab = paneKey;

  // タブボタンのactive切替
  document.querySelectorAll('.adp-growth-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.growthPane === paneKey);
  });
  // ペインの表示切替（スワイプアニメーション中はdisplay操作をスキップ）
  if (!_adpSwipeAnimating) {
    ADP_GROWTH_PANE_KEYS.forEach(p => {
      const el = document.getElementById('adp-growth-pane-' + p);
      if (!el) return;
      el.style.display = (p === paneKey) ? '' : 'none';
    });
  }

  // 表示時に再描画（offsetWidthが0→正常値になるタイミングを待つ）
  setTimeout(() => _adpRenderGrowthChart(_adpSelectedCropId), 30);
}

// ─── 生育期間ペイン用ランキングリスト描画 ───
function _adpRenderGrowthRankingList() {
  const el = document.getElementById('crop-ranking-growth');
  if (!el) return;

  // ── 気候推定モード ──
  if (_adpClimateMode) {
    _adpRenderClimateRankingList(el, 'growth');
    return;
  }

  // ── DBモード（従来） ──
  const scores = _crFilteredScores ? _crFilteredScores() : (_crScores || []);
  const mode   = currentAreaData?.cultivationMode || 'openField';
  if (!scores.length) {
    el.innerHTML = '<div class="empty-mini">データなし</div>';
    return;
  }

  // Phenology用: decadeArrをこのスコープで取得
  const decadeArr = currentAreaData?.climate?.decadeArr;

  // 露地側の同フィルタ済みスコア（順位変動用）
  const ofScores = (mode !== 'openField' && _crOpenFieldScores)
    ? scores.map(s => {
        const base = _crOpenFieldScores.find(b => b.id === s.crop.id);
        return base ? { crop: s.crop, score: base.score } : null;
      }).filter(Boolean).sort((a, b) => b.score - a.score)
    : null;

  const summaryHtml = _adpBuildCorrectionSummary(mode, scores);

  const itemsHtml = scores.slice(0, 60).map((s, i) => {
    const isSelected = s.crop.id === _adpSelectedCropId;
    const bar = Math.round((s.score / 100) * 100);
    const gpMin = s.crop.conditions?.growthPeriodMin;
    const gpMax = s.crop.conditions?.growthPeriodMax;
    const gpStr = (gpMin != null || gpMax != null)
      ? `<span class="adp-cr-gp">${gpMin ?? '?'}〜${gpMax ?? '?'}日</span>`
      : '';

    // Phenologyで播種〜収穫旬ラベルを計算
    let phenoStr = '';
    if (typeof Phenology !== 'undefined' && decadeArr) {
      const _cultMode3006 = currentAreaData?.cultivationMode || 'openField';
      const wins = Phenology.sowingWindows(decadeArr, s.crop, _cultMode3006);
      if (wins.length > 0) {
        const sLabel = Phenology.decadeLabel(wins[0].startDecade);
        const eLabel = Phenology.decadeLabel(wins[0].endDecade);
        phenoStr = `<span class="adp-cr-pheno">▼${sLabel} → ◆${eLabel}</span>`;
      }
    }

    // 補正比較
    const { compareHtml } = _adpBuildScoreCompare(s.crop.id, s.score, mode);
    const rankDiff = ofScores ? _adpCalcRankDiff(s.crop.id, i, ofScores) : null;
    const rankDiffHtml = rankDiff != null && rankDiff !== 0
      ? `<span class="adp-rank-diff ${rankDiff > 0 ? 'adp-diff-up' : 'adp-diff-down'}">`
        + (rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`) + `</span>`
      : '';

    return `
      <div class="adp-cr-item${isSelected ? ' selected' : ''}" onclick="adpCropTap(this, '${s.crop.id}')">
        <div class="adp-cr-name">${s.crop.name}${gpStr}${rankDiffHtml}</div>
        ${phenoStr ? `<div class="adp-cr-pheno-wrap">${phenoStr}</div>` : ''}
        <div class="adp-cr-bar-wrap">
          <div class="adp-cr-bar" style="width:${bar}%"></div>
          <span class="adp-cr-score">${Math.round(s.score)}</span>
          ${compareHtml ? `<span class="adp-score-compare-g">${compareHtml}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = summaryHtml + itemsHtml;
}

// ─── crSwitchMajor / crSwitchMinor のADPビュー連携 ───
// Phase3: analysis.js側のcrSwitchMajor/Minorが_adpRenderRankingListを直接呼ぶため
// オーバーライドは不要になった。adp-view開中はarea.jsのDOM（cr-tab-major等）が
// 同じonclick="crSwitchMajor(...)"を持ち、analysis.js側関数が処理する。

// ─── フルビューを閉じてsheetに戻る ───
function closeAreaDetailPanel() {
  // 収益シミュレーターに未保存変更がある場合は確認
  if (_adpRkCurrentPane === 'sim' && _simDirty) {
    showConfirmDialog('未保存の変更があります。破棄してよろしいですか？', '破棄する', 'キャンセル', false).then(ok => {
      if (!ok) return;
      _simDirty = false;
      delete _simMemory[_simSelectedCropId];
      _doCloseAreaDetailPanel();
    });
    return;
  }
  _doCloseAreaDetailPanel();
}

function _doCloseAreaDetailPanel() {
  const view = document.getElementById('adp-view');
  if (view) view.classList.remove('open');

  // bottom-nav を復帰
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.remove('hidden');

  // fs-pageを復帰・エリアタブを表示
  if (typeof openPage === 'function') openPage('areas');

  // 栽培方式トグルを削除（次回オープン時に再生成）
  const toggle = document.getElementById('adp-cultivation-toggle');
  if (toggle) toggle.remove();
  const toggleG = document.getElementById('adp-cultivation-toggle-growth');
  if (toggleG) toggleG.remove();

  // 作物選択状態・canvasをリセット
  _adpSelectedCropId = null;
  
  const canvas = document.getElementById('adp-temp-canvas');
  if (canvas) { canvas.width = 0; canvas.height = 0; }
  const gCanvasDB = document.getElementById('adp-growth-db-canvas');
  if (gCanvasDB) { gCanvasDB.width = 0; gCanvasDB.height = 0; }
  const gCanvasEst = document.getElementById('adp-growth-est-canvas');
  if (gCanvasEst) { gCanvasEst.width = 0; gCanvasEst.height = 0; }

  // 作物未選択時の各結果パネルをデフォルト表示に戻す（前回選択作物の残留表示を防止）
  const fertResult = document.getElementById('fert-result');
  if (fertResult) fertResult.innerHTML = '<div class="empty-mini">作物を選択すると施肥概算が表示されます。</div>';
  const riskResult = document.getElementById('risk-result');
  if (riskResult) riskResult.innerHTML = '<div class="empty-mini">作物を選択するとリスク・注意点が表示されます。</div>';
  const calendarResult = document.getElementById('calendar-result');
  if (calendarResult) calendarResult.innerHTML = '<div class="empty-mini">作物を選択すると生育カレンダーが表示されます。</div>';
}

// ─── 作物タップ → 選択して各タブへ反映 ───
function adpCropTap(el, cropId) {
  if (!el) return;

  // アコーディオン開閉（適合度・生育期間ランキングリスト対象）
  const isOpen = el.classList.contains('cr-item-open') || el.classList.contains('adp-cr-item-open');
  const list = el.closest('#crop-ranking, #crop-ranking-growth');
  if (list) {
    list.querySelectorAll('.cr-item-open, .adp-cr-item-open').forEach(other => {
      other.classList.remove('cr-item-open', 'adp-cr-item-open');
    });
  }
  if (!isOpen) {
    el.classList.add(el.classList.contains('adp-cr-item') ? 'adp-cr-item-open' : 'cr-item-open');
  }

  // 作物選択・各タブ反映（adp-view開中のみ）
  if (document.getElementById('adp-view')?.classList.contains('open')) {
    if (_adpSelectedCropId !== cropId) {
      _adpSelectedCropId = cropId;
      // グラフ・各タブ更新
      _adpRenderTempChart(_adpSelectedCropId);
      _adpRenderGrowthChart(_adpSelectedCropId);
      _adpRenderRankingList();
      _adpRenderGrowthRankingList();
      _adpRenderProfitRankingList();
      // 収益・施肥・リスク・作業カレンダー更新
      const ad = currentAreaData;
      const scoreEntry = (typeof _crScores !== 'undefined')
        ? _crScores.find(s => s.crop.id === cropId) : null;
      let crop = scoreEntry?.crop ?? null;
      if (!crop && typeof CROP_DB !== 'undefined') {
        crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
             : Object.values(CROP_DB).flat().find(c => c.id === cropId);
      }
      const single = (crop && typeof buildSingleCropAnalysis === 'function')
        ? buildSingleCropAnalysis(cropId, ad) : null;
      if (crop) {
        // ランキングタップは分析側の操作なので、matchタブの分析専用枠に描画する
        if (typeof _renderFertResult  === 'function') _renderFertResult(crop, 'fert-result-analysis');
        if (typeof _renderRiskResult  === 'function') _renderRiskResult(crop, 'risk-result-analysis');
        if (typeof renderWorkCalendar === 'function') renderWorkCalendar(crop, 'calendar-result-analysis');
      }
      // 適合度ペイン更新
      const confDetailEl = document.getElementById('conf-detail');
      if (confDetailEl && single) {
        const decadeArr = ad?.climate?.decadeArr;
        let estSeason = null;
        if (decadeArr && typeof Phenology !== 'undefined') {
          const _cultMode3126 = currentAreaData?.cultivationMode || 'openField';
          const wins = Phenology.sowingWindows(decadeArr, single.crop, _cultMode3126);
          if (wins?.length) estSeason = _buildEstimatedSeasonLabel(wins[0]);
        }
        const seasonHtml = _buildSeasonBlockHtml(single.crop, estSeason);
        const confItems  = single.confidence.items.map(i => `- ${i}`).join('<br>');
        confDetailEl.innerHTML = seasonHtml + (confItems ? `<div class="conf-items">${confItems}</div>` : '');
      }
      // サマリーバー・作物バー更新
      const _scoreVal = scoreEntry?.score ?? (single?.scoreResult?.score ?? null);
      const modeLabels = { openField:'露地', greenhouse:'ハウス', heatedGreenhouse:'加温' };
      _adpUpdateSummaryBar({
        cropName: crop?.name ?? null,
        areaName: _adpArea?.name ?? null,
        score:    _scoreVal,
        mode:     modeLabels[ad?.cultivationMode] || '露地栽培',
        evalMode: _adpEvalModeLabel(),
      });
      
    }
  }
}


// ─── 「この作物で各タブを更新」→ 各ペインに反映 ───
function _adpSelectCropForAnalysis(cropId) {
  _adpCloseRankingDialog();

  const ad = currentAreaData;
  if (!_adpArea || !ad) return;

  _adpSelectedCropId = cropId;

  // localStorage に分析用作物を保存
  const areaId = _adpArea?.id || _adpArea?.name || '';
  if (areaId) localStorage.setItem(`adpCropAnalysis_${areaId}`, cropId);

  const scoreEntry = (typeof _crScores !== 'undefined')
    ? _crScores.find(s => s.crop.id === _adpSelectedCropId)
    : null;

  let crop = scoreEntry?.crop ?? null;
  if (!crop && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === _adpSelectedCropId)
         : Object.values(CROP_DB).flat().find(c => c.id === _adpSelectedCropId);
  }

  // _crScoresが未充填でもscoreEntryの代わりに使う。適合度ペインでも共用
  const single = (crop && typeof buildSingleCropAnalysis === 'function')
    ? buildSingleCropAnalysis(_adpSelectedCropId, ad)
    : null;

  // ── グラフ再描画 ──
  _adpRenderTempChart(_adpSelectedCropId);
  _adpRenderGrowthChart(_adpSelectedCropId);

  // 施肥・リスク・作業カレンダー（分析側の選択なので、matchタブの分析専用枠に描画する）
  if (crop) {
    if (typeof _renderFertResult  === 'function') _renderFertResult(crop, 'fert-result-analysis');
    if (typeof _renderRiskResult  === 'function') _renderRiskResult(crop, 'risk-result-analysis');
    if (typeof renderWorkCalendar === 'function') renderWorkCalendar(crop, 'calendar-result-analysis');
  }

  // 適合度ペイン
  {
    const confDetailEl = document.getElementById('conf-detail');
    if (confDetailEl && single) {
      const decadeArr = ad.climate?.decadeArr;
      let estSeason = null;
      if (decadeArr && typeof Phenology !== 'undefined') {
        const _cultMode3337 = ad.cultivationMode || currentAreaData?.cultivationMode || 'openField';
        const wins = Phenology.sowingWindows(decadeArr, single.crop, _cultMode3337);
        if (wins?.length) estSeason = _buildEstimatedSeasonLabel(wins[0]);
      }
      const seasonHtml = _buildSeasonBlockHtml(single.crop, estSeason);
      const confItems  = single.confidence.items.map(i => `- ${i}`).join('<br>');
      confDetailEl.innerHTML = seasonHtml + (confItems ? `<div class="conf-items">${confItems}</div>` : '');
    }
  }

  // スコア値確定
  const _scoreVal = scoreEntry
    ? scoreEntry.score
    : (single?.scoreResult?.score ?? null);

  // サマリーバー・作物バー更新
  const modeLabels = { openField:'露地', greenhouse:'ハウス', heatedGreenhouse:'加温' };
  _adpUpdateSummaryBar({
    cropName: crop?.name ?? null,
    areaName: _adpArea?.name ?? null,
    score:    _scoreVal,
    mode:     modeLabels[ad.cultivationMode] || '露地栽培',
    evalMode: _adpEvalModeLabel(),
  });
  

  // ランキングリストの選択ハイライトを更新（ダイアログが開いている場合のみ）
  _adpRenderRankingList();
  _adpRenderGrowthRankingList();

  // 現在表示中のタブを強制再描画（ranking/growth は canvas 再描画済みのためスキップ）
  const cur = _adpCurrentSubTab;
  if (cur === 'ranking') {
    setTimeout(() => _adpRenderTempChart(_adpSelectedCropId), 30);
  } else if (cur === 'growth') {
    setTimeout(() => _adpRenderGrowthChart(_adpSelectedCropId), 30);
  }
}


// 作物の播種/育苗「始まり月」を返す（calendar.sowing優先、なければseedling。
// 両配列とも昇順ソート済み実データのためarr[0]で開始月として安全に使える）
function _adpCropStartMonth(crop) {
  const arr = crop?.calendar?.sowing || crop?.calendar?.seedling;
  return (Array.isArray(arr) && arr.length) ? arr[0] : null;
}

// 月と月の「循環距離」を返す（1〜12月を環状とみなし、12⇄1月のような年跨ぎも正しく1とする）
// 例: _adpMonthCircularDiff(12, 1) === 1 / _adpMonthCircularDiff(6, 9) === 3
function _adpMonthCircularDiff(a, b) {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

/**
 * _openCropPickerSheet(config)
 * 共通作物選択シート。条件設定・収益シミュレーターの両方から利用する。
 *
 * @param {Object} config
 * @param {function(cropId: string): void} config.onSelect  - 作物確定時コールバック
 * @param {string} [config.title]  - ヘッダータイトル（省略時 '🌱 作物を選ぶ'）
 */
function _openCropPickerSheet(config) {
  const _onSelect = config.onSelect;
  const _title    = config.title || '🌱 作物を選ぶ';

  // CROP_DB取得
  let allCrops = [];
  if (typeof CROP_DB !== 'undefined') {
    allCrops = CROP_DB.find
      ? CROP_DB
      : Object.values(CROP_DB).flat();
  }
  if (!allCrops.length) {
    showToast('作物データを読み込み中です', 'amber');
    return;
  }

  // 大カテゴリ定義
  const CATEGORIES = [
    { key: 'all',       label: 'すべて' },
    { key: 'grain',     label: '穀物・豆類' },
    { key: 'vegetable', label: '野菜' },
    { key: 'fruit',     label: '果物' },
    { key: 'wild',      label: '山菜・草' },
    { key: 'forest',    label: '林産' },
    { key: 'oil',       label: '油脂' },
    { key: 'fiber',     label: '繊維' },
  ];

  // 月絞り込み定義（播種/育苗の「始まり月」。1〜12月の12タブ）
  const MONTHS_FILTER = ['1','2','3','4','5','6','7','8','9','10','11','12'];

  // 大カテゴリ → DB category キーのマッピング
  const CAT_MAP = {
    grain:     ['grain', 'legume'],
    vegetable: ['leafy', 'fruit_veg', 'root', 'vegetable'],
    fruit:     ['fruit'],
    wild:      ['wildveg', 'herb'],
    forest:    ['forest'],
    oil:       ['oil'],
    fiber:     ['fiber'],
  };

  // 大カテゴリ → サブカテゴリ定義（サブなしの場合は空配列）
  const SUBCAT_MAP = {
    grain:     [
      { key: 'grain',  label: '穀物' },
      { key: 'legume', label: '豆類' },
    ],
    vegetable: [
      { key: 'leafy',     label: '葉菜類' },
      { key: 'fruit_veg', label: '果菜類' },
      { key: 'root',      label: '根菜類' },
      { key: 'vegetable', label: 'その他' },
    ],
    wild: [
      { key: 'wildveg', label: '山菜・きのこ' },
      { key: 'herb',    label: 'ハーブ・薬草' },
    ],
    fruit:  [],
    forest: [],
    oil:    [],
    fiber:  [],
  };

  // シート状態
  let _selectedCat    = 'all';
  let _selectedSubcat = null; // null = サブカテゴリ未選択（大カテゴリ全体）
  let _selectedMonth  = null; // null = 月絞り込みなし。1〜12（数値）
  let _searchText     = '';   // テキスト検索文字列

  // 作物リスト HTML 生成（カテゴリ AND 月 AND テキスト のAND結合）
  function buildList(cat, subcat, month, searchText) {
    let catList;
    if (cat === 'all') {
      catList = allCrops;
    } else if (subcat) {
      catList = allCrops.filter(c => c.category === subcat);
    } else {
      catList = allCrops.filter(c => (CAT_MAP[cat] || [cat]).includes(c.category));
    }

    let list;
    if (month != null) {
      // AND結合：カテゴリ絞り込み済みリストの中で、さらに開始月が「選択月の前後1ヶ月以内」
      // （前月・当月・翌月の3ヶ月、12⇄1月の年跨ぎも_adpMonthCircularDiffで正しく扱う）のもののみ
      list = catList.filter(c => {
        const sm = _adpCropStartMonth(c);
        return sm != null && _adpMonthCircularDiff(sm, month) <= 1;
      });
    } else {
      list = catList;
    }

    // テキスト検索（作物名の部分一致、大文字小文字無視）
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    if (!list.length) return '<div class="css-empty">該当作物なし</div>';
    return list.map(c => `
      <div class="css-crop-item" onclick="_adpCropPickerSelect('${c.id}')">
        <span class="css-crop-name">${escHtml(c.name)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`).join('');
  }

  // サブカテゴリタブ HTML 生成（サブカテゴリなしでも月トリガーのため常に行を返す）
  function buildSubcatTabs(cat, currentSubcat, currentMonth) {
    const subs = SUBCAT_MAP[cat] || [];
    const tabsHtml = subs.map(s =>
      `<button class="css-subcat-btn${currentSubcat === s.key ? ' active' : ''}"
        data-subcat="${s.key}"
        onclick="_adpCropSelectSwitchSubcat('${s.key}')">${s.label}</button>`
    ).join('');
    return `<div class="css-subcat-tabs" id="css-subcat-tabs">${tabsHtml}${buildMonthTrigger(currentMonth)}</div>`;
  }

  // 月アコーディオントリガーボタン HTML 生成
  function buildMonthTrigger(currentMonth) {
    const label = currentMonth != null
      ? `${currentMonth}月 <span class="css-month-clear" onclick="event.stopPropagation();_adpCropSelectSwitchMonth(${currentMonth})">✕</span>`
      : '栽培開始月で選ぶ';
    return `<button class="css-month-trigger${currentMonth != null ? ' has-month' : ''}" id="css-month-trigger"
      onclick="_adpCropSelectToggleMonthPanel()">${label} <span class="css-month-arrow">▾</span></button>`;
  }

  // 月グリッドパネル HTML 生成（4列×3行）
  function buildMonthPanel(currentMonth) {
    const btns = MONTHS_FILTER.map(mStr => {
      const m = Number(mStr);
      return `<button class="css-month-btn${currentMonth === m ? ' active' : ''}"
        data-month="${m}"
        onclick="_adpCropSelectSwitchMonth(${m})">${mStr}月</button>`;
    }).join('');
    return `<div class="css-month-panel" id="css-month-panel">${btns}</div>`;
  }

  // シート生成（初回のみDOM追加）
  let sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'adp-crop-select-sheet';
    sheet.className = 'adp-crop-detail-sheet';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => {
      if (e.target === sheet) _adpCloseCropSelectSheet();
    });
  }

  // 大カテゴリタブ HTML 生成
  const catTabsHtml = CATEGORIES.map(c =>
    `<button class="css-cat-btn${c.key === _selectedCat ? ' active' : ''}"
      data-cat="${c.key}"
      onclick="_adpCropSelectSwitchCat('${c.key}')">${c.label}</button>`
  ).join('');

  sheet.innerHTML = `
    <div class="cdp-inner">
      <div class="cdp-handle"></div>
      <div class="cdp-header">
        <div class="cdp-crop-name">${_title}</div>
        <button class="cdp-close" onclick="_adpCloseCropSelectSheet()">✕</button>
      </div>
      <input type="search" class="css-search-input" id="css-search-input"
        placeholder="作物名で検索…" value=""
        oninput="_adpCropSelectSearch(this.value)">
      <div class="css-cat-tabs" id="css-cat-tabs">${catTabsHtml}</div>
      ${buildMonthPanel(null)}
      <div id="css-subcat-wrap">${buildSubcatTabs('all', null, null)}</div>
      <div class="css-list" id="css-list">${buildList('all', null, null, '')}</div>
    </div>`;

  sheet.classList.add('open');

  // タブ切り替え用の関数・状態をシートに保持
  sheet._buildList         = buildList;
  sheet._buildSubcatTabs   = buildSubcatTabs;
  sheet._buildMonthTrigger = buildMonthTrigger;
  sheet._buildMonthPanel   = buildMonthPanel;
  sheet._getState          = () => ({ cat: _selectedCat, subcat: _selectedSubcat, month: _selectedMonth, search: _searchText });
  sheet._setState          = (cat, subcat, month, search) => {
    _selectedCat    = cat;
    _selectedSubcat = subcat;
    _selectedMonth  = month;
    if (search !== undefined) _searchText = search;
  };
  // コールバックをシートに保持（_adpCropPickerSelectから参照）
  sheet._onSelect = _onSelect;
}

/** 後方互換ラッパー：条件設定タブからの既存呼び出しを維持 */
// 現在どのセグメントから作物シートを開いたか
let _adpCropSelectSeg = 'analysis';

function _adpOpenCropSelectSheet(seg) {
  _adpCropSelectSeg = seg || _adpCurrentSeg || 'analysis';
  _openCropPickerSheet({
    onSelect: (cropId) => {
      const areaId = _adpArea?.id || _adpArea?.name || '';
      if (_adpCropSelectSeg === 'practice') {
        if (_adpPracticecrops.some(c => c.cropId === cropId)) {
          showToast('既に追加済みの作物です', 'amber');
          return;
        }
        const newCount = _adpPracticecrops.length + 1;
        const baseRatio = Math.floor(100 / newCount);
        const rem = 100 - baseRatio * newCount;
        _adpPracticecrops = _adpPracticecrops.map((c, i) => ({
          ...c,
          ratio: baseRatio + (i === 0 ? rem : 0),
        }));
        _adpPracticecrops.push({ cropId, ratio: baseRatio, plantingDesign: PlantingLogic.initDesign(cropId), variety: '', sowDate: '', transplantDate: '', harvestStart: '', harvestEnd: '', fertRecords: [], pesticideRecords: [], harvestRecords: [] });
        _adpSavePracticecrops(areaId);
        _adpRenderPracticecrops();
        _adpRefreshPracticeTabs();
      } else {
        localStorage.setItem(`adpCropAnalysis_${areaId}`, cropId);
        _adpSelectCropForAnalysis(cropId);
      }
    },
  });
}

/** cropId → crop名を返すユーティリティ */
function _adpCropIdToName(cropId) {
  if (!cropId || typeof CROP_DB === 'undefined') return cropId;
  const crop = CROP_DB.find
    ? CROP_DB.find(c => c.id === cropId)
    : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  return crop?.name ?? cropId;
}

/** cropId → crop オブジェクトを返すユーティリティ */
function _adpGetCropById(cropId) {
  if (!cropId || typeof CROP_DB === 'undefined') return null;
  return CROP_DB.find
    ? CROP_DB.find(c => c.id === cropId)
    : Object.values(CROP_DB).flat().find(c => c.id === cropId);
}

// ─── 実務側複数作物ヘルパー ───

function _adpSavePracticecrops(areaId) {
  if (!areaId) return;
  localStorage.setItem(`adpCropWork_${areaId}`, JSON.stringify(_adpPracticecrops));
}

/**
 * 自動設計（Step1）のグローバル設定（ゾーン優先度・目的関数）を復元する。
 * 未保存 or 破損データの場合はデフォルト（'ratio'／'yield'）にフォールバック。
 */
function _adpLoadAutoDesignSettings(areaId) {
  _adpAutoDesignSettings = { zonePriorityMode: 'ratio', objective: 'yield' };
  if (!areaId) return;
  const saved = localStorage.getItem(`adpAutoDesignSettings_${areaId}`);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (parsed?.zonePriorityMode === 'ratio' || parsed?.zonePriorityMode === 'fixed') {
      _adpAutoDesignSettings.zonePriorityMode = parsed.zonePriorityMode;
    }
    if (parsed?.objective === 'yield' || parsed?.objective === 'revenue' || parsed?.objective === 'profit') {
      _adpAutoDesignSettings.objective = parsed.objective;
    }
  } catch {
    // 破損データはデフォルトのまま無視
  }
}

function _adpSaveAutoDesignSettings(areaId) {
  if (!areaId) return;
  localStorage.setItem(`adpAutoDesignSettings_${areaId}`, JSON.stringify(_adpAutoDesignSettings));
}

function _adpSaveIrrigationRecords(areaId) {
  if (!areaId) return;
  localStorage.setItem(`adpIrrigation_${areaId}`, JSON.stringify(_adpIrrigationRecords));
}

/**
 * 占有率スライダー ドラッグ中の軽量プレビュー（Step7-x）。
 * データ本体（_adpPracticecrops）・localStorage保存・recalcAllBands（帯状分割／
 * 畝ジオメトリ再計算）・カード全体再描画は一切行わない。見た目の数値表示
 * （自分の%・自動枠(最後の作物)の%・占有率合計バー）だけを即時反映し、
 * ドラッグ中の重い再計算・フォーカス崩れを防ぐ。
 * 本確定（保存・recalcAllBands・全体再描画）はスライダーのonchangeで
 * 呼ばれる _adpUpdatePracticeRatio() が担う。
 */
function _adpPreviewPracticeRatio(cropId, newRatio) {
  const idx = _adpPracticecrops.findIndex(c => c.cropId === cropId);
  const lastIdx = _adpPracticecrops.length - 1;
  if (idx < 0 || idx === lastIdx) return;

  const sumOthers = _adpPracticecrops
    .slice(0, lastIdx)
    .reduce((s, c, i) => s + (i === idx ? newRatio : (c.ratio || 0)), 0);
  const autoRatio  = Math.max(0, 100 - sumOthers);
  const lastCropId = _adpPracticecrops[lastIdx].cropId;

  // 自分自身の%表示（栽植パネル）
  const ownValEl = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"] .plt-ratio-val`);
  if (ownValEl) ownValEl.textContent = `${newRatio}%`;

  // 自動枠（最後の作物）の%表示（栽植パネル）
  const autoValEl = document.querySelector(`#planting-result .plt-card[data-crop-id="${lastCropId}"] .plt-ratio-val`);
  if (autoValEl) autoValEl.innerHTML = `${autoRatio}% <span class="adp-pcc-auto-badge">自動</span>`;

  // サムネ一覧（adp-practice-crops-list）のバッジも同期
  const ownBadgeEl = document.querySelector(`#adp-practice-crops-list .adp-practice-crop-card[data-crop-id="${cropId}"] .adp-pcc-ratio-badge`);
  if (ownBadgeEl) ownBadgeEl.textContent = `${newRatio}%`;
  const autoBadgeEl = document.querySelector(`#adp-practice-crops-list .adp-practice-crop-card[data-crop-id="${lastCropId}"] .adp-pcc-ratio-badge`);
  if (autoBadgeEl) autoBadgeEl.textContent = `${autoRatio}%`;
}

function _adpUpdatePracticeRatio(cropId, newRatio) {
  const areaId = _adpArea?.id || _adpArea?.name || '';
  const idx = _adpPracticecrops.findIndex(c => c.cropId === cropId);
  if (idx < 0) return;
  // 最後の作物は操作不可（自動計算）
  const lastIdx = _adpPracticecrops.length - 1;
  if (idx === lastIdx) return;
  _adpPracticecrops[idx].ratio = newRatio;
  // 最後の作物に残りを全て割り当て
  const sumOthers = _adpPracticecrops
    .slice(0, lastIdx)
    .reduce((s, c) => s + (c.ratio || 0), 0);
  _adpPracticecrops[lastIdx].ratio = Math.max(0, 100 - sumOthers);
  _adpSavePracticecrops(areaId);
  _adpRenderPracticecrops();
  _adpRefreshPracticeTabs();
}

function _adpRemovePracticeCrop(cropId) {
  const areaId = _adpArea?.id || _adpArea?.name || '';
  _adpPracticecrops = _adpPracticecrops.filter(c => c.cropId !== cropId);

  // 削除後、必ず合計が100%になるよう「最後（自動枠）」の占有率を再計算する。
  // ・中間の作物を削除 → 既存の最後の作物が差分を吸収
  // ・自動枠（最後）自体を削除 → 新たに最後になった作物が自動枠に切り替わり再計算
  // ・1作物だけ残る → その作物が100%になる
  if (_adpPracticecrops.length > 0) {
    const lastIdx = _adpPracticecrops.length - 1;
    const sumOthers = _adpPracticecrops
      .slice(0, lastIdx)
      .reduce((s, c) => s + (c.ratio || 0), 0);
    _adpPracticecrops[lastIdx].ratio = Math.max(0, 100 - sumOthers);
  }

  _adpSavePracticecrops(areaId);
  _adpRenderPracticecrops();
  _adpRefreshPracticeTabs();
}

function _adpRefreshPracticeTabs() {
  // 占有率変更・作物追加削除のたびに帯状分割（実面積比例）・畝セグメントを再計算する
  if (PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin, _adpAutoDesignSettings.zonePriorityMode)) {
    _adpSavePracticecrops(_adpArea?.id || _adpArea?.name || '');
  }
  if (typeof _renderFertResultMulti === 'function')  _renderFertResultMulti(_adpPracticecrops);
  if (typeof _renderRiskResultMulti === 'function')  _renderRiskResultMulti(_adpPracticecrops);
  if (typeof _renderCalendarMulti   === 'function')  _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
  if (_adpCurrentSubTab === 'planting') _adpRenderPlantingPane();
  if (_adpCurrentSubTab === 'harvest')    _adpRenderHarvestPane();
  if (_adpCurrentSubTab === 'cropinfo')   _adpRenderCropInfoPane();
  if (_adpCurrentSubTab === 'fert')       _adpRenderFertRecordSection();
  if (_adpCurrentSubTab === 'pesticide')  _adpRenderPesticidePane();
  if (_adpCurrentSubTab === 'irrigation') _adpRenderIrrigationPane();
  if (_adpCurrentSubTab === 'dashboard' && typeof DashboardPane !== 'undefined') DashboardPane.render(_adpPracticecrops, _adpArea);
  if (_adpCurrentSubTab === 'shipping')  _adpRenderShippingPane();
}

function _adpRenderPracticecrops() {
  const listEl   = document.getElementById('adp-practice-crops-list');
  const addBtnEl = document.getElementById('adp-crop-bar-btn-practice');
  if (!listEl) return;

  if (addBtnEl) addBtnEl.classList.toggle('has-crops', _adpPracticecrops.length > 0);

  if (!_adpPracticecrops.length) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = _adpPracticecrops.map(({ cropId, ratio }) => {
    const name = _adpCropIdToName(cropId);
    return `
      <div class="adp-practice-crop-card" data-crop-id="${cropId}">
        <span class="adp-pcc-name">🌿 ${escHtml(name)}</span>
        <span class="adp-pcc-ratio-badge">${ratio}%</span>
        <button class="adp-pcc-mini-remove" onclick="event.stopPropagation();_adpRemovePracticeCrop('${cropId}')" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

function _adpCropSelectSwitchCat(cat) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;

  // 状態更新（サブカテゴリはリセット、月・テキスト検索は維持）
  const { month, search } = sheet._getState();
  sheet._setState(cat, null, month, search);

  // 大タブ active 切り替え
  sheet.querySelectorAll('.css-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  // サブカテゴリタブ 再描画
  const subcatWrap = document.getElementById('css-subcat-wrap');
  if (subcatWrap) {
    subcatWrap.innerHTML = sheet._buildSubcatTabs(cat, null, month);
  }

  // 作物リスト 再描画
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, null, month, search);
}

function _adpCropSelectSwitchSubcat(subcat) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;

  const { cat, subcat: prevSubcat, month, search } = sheet._getState();

  // 同じサブカテゴリをタップ → 解除（トグル）
  const nextSubcat = (prevSubcat === subcat) ? null : subcat;
  sheet._setState(cat, nextSubcat, month, search);

  // サブタブ active 切り替え
  sheet.querySelectorAll('.css-subcat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subcat === nextSubcat);
  });

  // 作物リスト 再描画
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, nextSubcat, month, search);
}

function _adpCropSelectToggleMonthPanel() {
  const panel = document.getElementById('css-month-panel');
  if (!panel) return;
  panel.classList.toggle('open');
  const trigger = document.getElementById('css-month-trigger');
  if (trigger) trigger.classList.toggle('panel-open', panel.classList.contains('open'));
}

function _adpCropSelectSwitchMonth(month) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;

  const { cat, subcat, month: prevMonth, search } = sheet._getState();

  // 同じ月をタップ → 解除（トグル）
  const nextMonth = (prevMonth === month) ? null : month;
  sheet._setState(cat, subcat, nextMonth, search);

  // 月グリッドボタン active 切り替え
  sheet.querySelectorAll('.css-month-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.month) === nextMonth);
  });

  // トリガーボタン表示更新（サブカテゴリ行内のトリガーを差し替え）
  const subcatTabsEl = document.getElementById('css-subcat-tabs');
  if (subcatTabsEl && sheet._buildMonthTrigger) {
    const oldTrigger = subcatTabsEl.querySelector('#css-month-trigger');
    if (oldTrigger) oldTrigger.outerHTML = sheet._buildMonthTrigger(nextMonth);
  }

  // パネルを閉じる（月選択後は自動クローズ）
  const panel = document.getElementById('css-month-panel');
  if (panel) panel.classList.remove('open');

  // 作物リスト 再描画（カテゴリ AND 月 AND テキスト のAND結合）
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, subcat, nextMonth, search);
}

function _adpCloseCropSelectSheet() {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (sheet) sheet.classList.remove('open');
}

/** 作物アイテムタップ → コールバック呼び出し（旧 _adpSelectCropFromSheet を廃止・統合） */
function _adpCropPickerSelect(cropId) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (sheet && typeof sheet._onSelect === 'function') {
    _adpCloseCropSelectSheet();
    sheet._onSelect(cropId);
  }
}

/** テキスト検索 oninput ハンドラ */
function _adpCropSelectSearch(text) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;
  const { cat, subcat, month } = sheet._getState();
  sheet._setState(cat, subcat, month, text);
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, subcat, month, text);
}

// ═══════════════════════════════════════════
//  ANALYSIS WIZARD（analysisWizard.js統合・Phase2）
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
//  ANALYSIS WIZARD — 分析ウィザードダイアログ
//  フロー（1ステップ）:
//    Step1: 営農条件入力（優先軸/設備/栽培期間/販売先/規模/経験）→ 分析実行
// ═══════════════════════════════════════════

// ─── カテゴリラベル（作物検索用） ───
const CATEGORY_LABELS = {
  grain:     { label: '穀物',         icon: '🌾' },
  legume:    { label: '豆類',         icon: '🫘' },
  leafy:     { label: '葉菜類',       icon: '🥬' },
  fruit_veg: { label: '果菜類',       icon: '🍅' },
  root:      { label: '根菜類',       icon: '🥕' },
  vegetable: { label: '野菜（その他）', icon: '🥦' },
  fruit:     { label: '果物',         icon: '🍎' },
  wildveg:   { label: '山菜・きのこ', icon: '🍄' },
  forest:    { label: '林産きのこ',   icon: '🌲' },
  herb:      { label: 'ハーブ・薬草', icon: '🌿' },
  oil:       { label: '油脂作物',     icon: '🫙' },
  fiber:     { label: '繊維作物',     icon: '🧵' },
};

// ─── Step1: 営農条件の選択肢定義（engine.js calcFarmingConditionScoreと対応） ───
const FARM_COND_GROUPS = [
  { key: 'priority', label: '優先軸', icon: '🎯', options: [
      { value: 'profit',   label: '収益重視', icon: '💰' },
      { value: 'easywork', label: '手間最小', icon: '🪶' },
      { value: 'lowrisk',  label: '低リスク', icon: '🛡️' },
  ]},
  { key: 'equipment', label: '設備（好みスコア用）', icon: '🏗️', options: [
      { value: 'openField',  label: '露地のみ',   icon: '☀️' },
      { value: 'greenhouse', label: 'ハウスあり', icon: '🏠' },
      { value: 'paddy',      label: '水田利用可', icon: '💧' },
  ]},
  { key: 'period', label: '栽培期間', icon: '⏳', options: [
      { value: 'short', label: '短期（〜3ヶ月）', icon: '⚡' },
      { value: 'mid',   label: '中期（〜8ヶ月）', icon: '🌱' },
      { value: 'long',  label: '長期・樹木可',     icon: '🌳' },
  ]},
  { key: 'sales', label: '販売先', icon: '🛒', options: [
      { value: 'direct',     label: '直売所',   icon: '🏪' },
      { value: 'roadside',   label: '道の駅',   icon: '🛣️' },
      { value: 'ja',         label: 'JA出荷',   icon: '🚜' },
      { value: 'processing', label: '加工業者', icon: '🏭' },
      { value: 'self',       label: '自家消費', icon: '🍽️' },
  ]},
  { key: 'scale', label: '規模', icon: '👥', options: [
      { value: 'solo',   label: '一人',     icon: '🧑' },
      { value: 'family', label: '家族経営', icon: '👨\u200d👩\u200d👧' },
      { value: 'hired',  label: '雇用あり', icon: '👷' },
  ]},
  { key: 'experience', label: '経験', icon: '🎓', options: [
      { value: 'beginner', label: '初心者', icon: '🌱' },
      { value: 'mid',      label: '中級',   icon: '🌿' },
      { value: 'expert',   label: '上級',   icon: '🌲' },
  ]},
];

// ─── 分析項目定義（an-itab / an-pane のキーと対応） ───
const AW_ITEM_DEFS = [
  { key: 'ranking',  label: 'ランキング',     icon: '🏆' },
  { key: 'growth',   label: '生育期間',       icon: '📈' },
  { key: 'profit',   label: '収益概算',       icon: '💴' },
  { key: 'fert',     label: '施肥概算',       icon: '🧪' },
  { key: 'risk',     label: 'リスク・注意点', icon: '⚠️' },
  { key: 'calendar', label: '生育カレンダー', icon: '📅' },
  { key: 'match',    label: 'エリア適合度',   icon: '📊' },
];

const AW_STEP_TITLES = ['営農条件入力']; // 旧ウィザード互換・参照箇所が残る間は温存

// ─── 条件設定状態 ───
let _awArea           = null;     // 選択中エリアデータ（openAreaDetailPanelで更新）
let _awFarmCond       = null;     // 営農条件（6項目）：アプリ起動時に初期化、デフォルトボタンでリセット
let _awAllScores      = [];       // buildAnalysisResult().cropScores のキャッシュ

/**
 * _awSaveFarmCond()
 * 現在の _awFarmCond・_adpClimateMode を
 * エリアオブジェクト（_adpArea）に書き戻し localStorage / Firestore に永続化する。
 * ※ cultivationMode はここでは扱わない（マスターはインライン編集 saveInlineEdit() 経由のみで変更・保存する）。
 */
function _awSaveFarmCond() {
  const area = _adpArea;
  if (!area || !area.id) return;

  area.farmingConditions = { ..._awFarmCond };
  area.savedEvalMode     = _adpClimateMode ? 'climate' : 'db';

  try {
    const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
    const idx = stored.findIndex(a => a.id === area.id);
    if (idx !== -1) {
      stored[idx].farmingConditions = area.farmingConditions;
      stored[idx].savedEvalMode     = area.savedEvalMode;
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
    }
  } catch(e) { console.warn('_awSaveFarmCond localStorage:', e); }

  if (typeof db !== 'undefined' && db && area.id && !String(area.id).startsWith('local_')) {
    db.collection('areas').doc(area.id).update({
      farmingConditions: area.farmingConditions,
      savedEvalMode:     area.savedEvalMode,
    }).catch(e => console.warn('_awSaveFarmCond Firestore:', e));
  }
}

function _awDefaultFarmCond() {
  return {
    priority:   'profit',
    equipment:  'openField',
    period:     'mid',
    sales:      'self',
    scale:      'solo',
    experience: 'beginner',
  };
}

// アプリ起動時に一度だけ初期化（以降はデフォルトボタンでのみリセット）
_awFarmCond = _awDefaultFarmCond();

// ═══════════════════════════════════════════
//  Step 1: 営農条件入力
// ═══════════════════════════════════════════
function _awRenderConditions() {
  const wrap = document.getElementById('adp-rk-cond-wrap');
  if (!wrap) return;

  const isClimate = _adpClimateMode;
  const areaName  = currentAreaData?.name || _awArea?.name || null;
  const climateLabel = areaName ? `${areaName}の気候` : 'エリア気候';
  const selectedCropName = _awSelectedCropName();

  wrap.innerHTML = `
    <div class="adp-rk-cond-group adp-rk-cond-crop-group">
      <div class="adp-rk-cond-label">🌱 対象作物</div>
      <div class="adp-rk-cond-row">
        <button class="adp-select-crop-btn" onclick="_adpOpenCropSelectSheet()" id="adp-rk-cond-crop-btn">
          <span id="adp-rk-cond-crop-name">${selectedCropName ? escHtml(selectedCropName) : '🌱 作物を選ぶ'}</span>
        </button>
      </div>
    </div>
    <div class="adp-rk-cond-divider"></div>
    <div class="adp-rk-cond-group">
      <div class="adp-rk-cond-label">🧭 評価基準</div>
      <div class="adp-rk-cond-row">
        <button class="adp-eval-mode-btn ${!isClimate ? 'active' : ''}" data-eval="db"
          onclick="_adpSetClimateMode(false)">📊 一般データベース</button>
        <button class="adp-eval-mode-btn ${isClimate ? 'active' : ''}" data-eval="climate"
          onclick="_adpSetClimateMode(true)">🌿 <span class="adp-eval-climate-label">${escHtml(climateLabel)}</span></button>
      </div>
    </div>
    <div class="adp-rk-cond-divider"></div>
    <div class="adp-rk-cond-groups">
      ${FARM_COND_GROUPS.map(g => `
        <div class="adp-rk-cond-group">
          <div class="adp-rk-cond-label">${g.icon} ${g.label}</div>
          <div class="adp-rk-cond-row">
            ${g.options.map(o => `
              <button class="adp-rk-cond-chip ${_awFarmCond[g.key] === o.value ? 'selected' : ''}"
                onclick="_awSetCondition('${g.key}','${o.value}')">
                <span class="adp-rk-cond-chip-icon">${o.icon}</span>
                <span class="adp-rk-cond-chip-label">${o.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="adp-rk-cond-footer">
      <button class="adp-rk-cond-btn-reset" onclick="_awResetConditions()">↩ デフォルトに戻す</button>
      <div class="adp-rk-cond-nav">
        <button class="adp-rk-cond-btn-nav" onclick="_adpRkSwitchPane('match')">📊 適合度ランキングへ</button>
        <button class="adp-rk-cond-btn-nav" onclick="_adpRkSwitchPane('profit')">💴 収益ランキングへ</button>
      </div>
    </div>
  `;
}

function _awSetCondition(key, value) {
  if (_awFarmCond[key] === value) return;
  _awFarmCond[key] = value;
  _awRunAnalysis();               // currentAreaData.farmingConditions更新＋各タブ再計算
  _awRenderConditions();          // チップの選択状態を再描画
  _awSaveFarmCond();              // エリアごとに永続化
  // 2026-06修正: 適合度ランキングペインが表示中の再描画呼び出しが抜けており、
  // 作物選択中（_adpSelectedCropIdあり）に条件を変更すると#crop-rankingが
  // runSingleCropAnalysis()で上書きした単一作物カードのままになり、
  // 一覧の順位変化が画面に反映されないバグがあったため追加。
  if (_adpRkCurrentPane === 'match') {
    _adpRenderRankingList();
  }
  // 収益ランキングペインが表示中なら即時再描画
  if (_adpRkCurrentPane === 'profit') {
    _adpRenderProfitRankingList();
  }
}

// ═══════════════════════════════════════════
//  リアルタイム分析エンジン連携
// ═══════════════════════════════════════════

// ウィザードの選択状態から currentAreaData を再構築
function _awBuildAreaData() {
  const area = _awArea;
  const lp   = area.landProfile || {};
  const meta = area.meta        || {};

  function _pick(...vals) {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  // 実際の栽培方式は「栽培方式」トグル（_adpSwitchCultivation／条件設定タブのミラー）が単一の管理元。
  // _awFarmCond.equipment は営農条件スコア専用の好み軸（水田利用可を含む）であり、ここでは参照しない
  // （以前はここで equipment から再計算しており、条件チップを1つ変更するだけで「加温」設定が
  // 　無条件に消えるバグがあったため修正）。
  const cultivationMode = currentAreaData?.cultivationMode || 'openField';

  let ad;
  if (typeof normalizeAreaData === 'function') {
    ad = normalizeAreaData(area, {
      selectedCropId:    _adpSelectedCropId || null,
      cultivationMode,
      analysisItems:     ['ranking','growth','profit','fert','risk','calendar','match'],
      farmingConditions: { ..._awFarmCond },
    });
  } else {
    // フォールバック（areaEnv.js 未読込時）
    const lat = _pick(lp.lat, meta.lat, area.lat);
    ad = {
      lat,
      lng:             _pick(lp.lng,       meta.lng,      area.lng),
      elev:            _pick(lp.elevation, meta.elev,     area.elev),
      climate:         (typeof getClimate === 'function' && lat != null)
                         ? getClimate(lat) : null,
      soilType:        _pick(lp.soilType,  meta.soilType, area.soilType) || 'unknown',
      ph:              _pick(lp.ph,        meta.ph,       area.ph),
      slope:           _pick(lp.slope,     meta.slope,    area.slope)    ?? 0,
      areaSqm:         _pick(meta.areaSqm, area.areaSqm)                 || 0,
      areaHa:          _pick(meta.areaHa,  area.areaHa)                  || 0,
      selectedCropId:  _adpSelectedCropId || null,
      cultivationMode,
      analysisItems:   ['ranking','growth','profit','fert','risk','calendar','match'],
      landProfile:     Object.keys(lp).length ? lp : null,
      env:             {},
    };
  }

  // 営農条件・栽培方式を確実に反映
  ad.farmingConditions = { ..._awFarmCond };
  ad.cultivationMode   = cultivationMode;

  // profitOverrides を引き継ぐ（シミュレーター上書き値をengine.jsに渡すために必要）
  ad.profitOverrides = _adpArea?.profitOverrides || area.profitOverrides || {};

  // AMeDASキャッシュ（decadeArr等）を復元してから上書き
  // normalizeAreaData() は素のareaから組み立てるため decadeArr が消えてしまう
  if (_adpClimateCache) {
    ad.climate = { ...(ad.climate || {}), ..._adpClimateCache };
  }

  currentAreaData = ad;
  return ad;
}

// 現在の選択状態で分析タブを再計算・再描画する
function _awRunAnalysis() {
  if (!_awArea) return;

  const ad   = _awBuildAreaData();
  const name = _awArea.name || 'エリア';

  // 全作物スコア（営農条件込み）を再計算 → おすすめリスト・ライブプレビューの元データ
  if (typeof buildAnalysisResult === 'function') {
    _awAllScores = buildAnalysisResult(ad).cropScores;
  }

  if (_adpSelectedCropId) {
    // 作物選択中：単一作物詳細
    ad.selectedCropId = _adpSelectedCropId;
    runSingleCropAnalysis(name);
  } else {
    // 未選択：全体ランキング表示
    runAnalysis(name);
  }

  // ── 📈生育期間タブを選択作物に同期 ──
  if (_adpSelectedCropId) {
    _crScores = _awAllScores;
  }
  if (typeof _adpRenderTempChart        === 'function') _adpRenderTempChart(_adpSelectedCropId);
  if (typeof _adpRenderGrowthChart      === 'function') _adpRenderGrowthChart(_adpSelectedCropId);
  if (typeof _adpRenderGrowthRankingList === 'function') _adpRenderGrowthRankingList();

  _awUpdateLivePreview();
}

// モーダル内のライブプレビューバーを更新
function _awUpdateLivePreview() {
  const bar = document.getElementById('aw-live-preview');

  const ad = currentAreaData || {};
  const modeLabels = { openField: '露地', greenhouse: 'ハウス', heatedGreenhouse: '加温' };
  const modeLabel  = modeLabels[ad.cultivationMode] || '露地栽培';

  let cropName = '—';
  let scoreHtml = '<span class="aw-live-score score-mid">—</span>';
  let scoreVal = null;

  if (_adpSelectedCropId) {
    const s = _awAllScores.find(x => x.crop.id === _adpSelectedCropId);
    if (s) {
      cropName  = s.crop.name;
      const cls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
      scoreHtml = `<span class="aw-live-score ${s.viable ? cls : 'score-low'}">${s.viable ? s.score + '%' : 'NG'}</span>`;
      if (s.viable) scoreVal = s.score;
    }
  } else if (_awAllScores.length) {
    const top = _awAllScores[0];
    cropName  = top.crop.name + '（おすすめ）';
    const cls = top.score >= 70 ? 'score-high' : top.score >= 40 ? 'score-mid' : 'score-low';
    scoreHtml = `<span class="aw-live-score ${top.viable ? cls : 'score-low'}">${top.viable ? top.score + '%' : 'NG'}</span>`;
    if (top.viable) scoreVal = top.score;
  }

  if (bar) {
    bar.innerHTML = `
      <span class="aw-live-icon">📡</span>
      <span class="aw-live-crop">${escHtml(cropName)}</span>
      ${scoreHtml}
      <span class="aw-live-mode">${escHtml(modeLabel)}</span>
    `;
  }

  // adp-view サマリーバーも更新
  if (typeof _adpUpdateSummaryBar === 'function') {
    _adpUpdateSummaryBar({
      cropName: cropName === '—' ? null : cropName.replace('（おすすめ）',''),
      areaName: _awArea?.name || null,
      score: scoreVal,
      mode: modeLabel,
      evalMode: _adpEvalModeLabel(),
    });
  }
}

// ─── デフォルト条件にリセット ───
function _awResetConditions() {
  _awFarmCond = _awDefaultFarmCond();
  // エリアオブジェクト・localStorage・Firestoreから条件設定を削除
  const area = _adpArea;
  if (area) {
    delete area.farmingConditions;
    delete area.savedEvalMode;
    // 栽培方式は分析一時値のみデフォルト(openField)に戻す。マスター(area.cultivationMode)はここでは変更しない
    _adpAnalysisCultMode = 'openField';
    if (currentAreaData) currentAreaData.cultivationMode = 'openField';
    document.querySelectorAll('.adp-cult-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === 'openField');
    });
    const areaId = area.id || area.name || '';
    if (areaId) {
      try { localStorage.setItem(`adpCultAnalysis_${areaId}`, 'openField'); }
      catch(e) { console.warn('_awResetConditions analysis cult localStorage:', e); }
    }
    _adpClimateMode = false;
    _adpSetClimateMode(false);
    // 永続化層から削除（farmingConditions・savedEvalModeのみ。cultivationModeはマスターのため触らない）
    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === area.id);
      if (idx !== -1) {
        delete stored[idx].farmingConditions;
        delete stored[idx].savedEvalMode;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    } catch(e) { console.warn('_awResetConditions localStorage:', e); }
    if (typeof db !== 'undefined' && db && area.id && !String(area.id).startsWith('local_')) {
      const { FieldValue } = firebase.firestore;
      db.collection('areas').doc(area.id).update({
        farmingConditions: FieldValue.delete(),
        savedEvalMode:     FieldValue.delete(),
      }).catch(e => console.warn('_awResetConditions Firestore:', e));
    }
  }
  _awRunAnalysis();
  _awRenderConditions();
  // 2026-06修正: _awSetCondition()と同様、matchペイン表示中の再描画漏れを修正
  if (_adpRkCurrentPane === 'match') {
    _adpRenderRankingList();
  }
  if (_adpRkCurrentPane === 'profit') {
    _adpRenderProfitRankingList();
  }
}

// ═══════════════════════════════════════════
//  収益シミュレーター（サブタブ5）
// ═══════════════════════════════════════════

/**
 * _simEnsureOverridesStore()
 * currentAreaData.profitOverrides を返す。未初期化なら {} で初期化してから返す。
 */
function _simEnsureOverridesStore() {
  if (!currentAreaData) return {};
  if (!currentAreaData.profitOverrides) currentAreaData.profitOverrides = {};
  return currentAreaData.profitOverrides;
}

/**
 * _simResolveDefaultCropId()
 * シミュレーターの初期作物IDを決定する。
 * 優先順位:
 *   1. _adpSelectedCropId（適合度タブで選択済み）
 *   2. _crScores の averageProfit 最高作物
 *   3. _crScores の先頭
 *   4. null（登録作物0件）
 */
function _simResolveDefaultCropId() {
  if (_adpSelectedCropId) return _adpSelectedCropId;
  const scores = (typeof _crScores !== 'undefined' && _crScores.length) ? _crScores : [];
  if (!scores.length) return null;
  // averageProfit最高を1位とする
  const top = [...scores]
    .filter(s => s.profitability)
    .sort((a, b) => b.profitability.averageProfit - a.profitability.averageProfit)[0];
  return top ? top.crop.id : scores[0].crop.id;
}

/**
 * _simGetDefaultValues(cropId)
 * COST_TABLE + farmCond補正を反映したデフォルト値を返す。
 * engine.js の COST_TABLE / cropPricePerKg はグローバル参照可能。
 */
function _simGetDefaultValues(cropId) {
  const scores = (typeof _crScores !== 'undefined') ? _crScores : [];
  const entry  = scores.find(s => s.crop.id === cropId);
  const crop   = entry ? entry.crop : null;
  if (!crop) return null;

  const cat     = crop.category || '_default';
  const costRow = (typeof COST_TABLE !== 'undefined')
    ? (COST_TABLE[cat] || COST_TABLE._default)
    : { seed: 10000, material: 22000, machine: 22000, labor: 60000, initial: 40000, amortYears: 3 };

  // farmCond補正
  const fc = (typeof _awFarmCond !== 'undefined' && _awFarmCond) ? _awFarmCond : {};
  const laborMult = fc.scale === 'family' ? 0.85 : fc.scale === 'hired' ? 1.30 : 1.0;
  const priceMult = fc.sales === 'direct' || fc.sales === 'roadside' ? 1.15
    : fc.sales === 'ja' ? 0.90
    : fc.sales === 'processing' ? 0.85 : 1.0;

  const basePrice = (typeof cropPricePerKg === 'function') ? cropPricePerKg(crop) : 0;

  return {
    seedCost10a:     Math.round(costRow.seed),
    materialCost10a: Math.round(costRow.material),
    machineCost10a:  Math.round(costRow.machine),
    laborCost10a:    Math.round(costRow.labor * laborMult),
    initialCost:     Math.round(costRow.initial),
    pricePerKg:      Math.round(basePrice * priceMult),
    amortYears:      costRow.amortYears || 3,
    hasNoPrice:      !crop.price,  // priceがnullなら参考データなし
  };
}

/**
 * _simCalcPreview(cropId, inputs)
 * inputs: { seedCost10a, materialCost10a, machineCost10a, laborCost10a, initialCost, pricePerKg }
 * すべてnullの項目はデフォルト値を使用。
 * 純利益（エリア全体換算）を返す。
 */
function _simCalcPreview(cropId, inputs) {
  const defs = _simGetDefaultValues(cropId);
  if (!defs) return null;

  const areaSqm = (currentAreaData && currentAreaData.areaSqm) ? currentAreaData.areaSqm : 0;
  const area10a = areaSqm / 1000; // 10a=1000㎡

  const seed     = (inputs.seedCost10a     !== null ? inputs.seedCost10a     : defs.seedCost10a)     * area10a;
  const material = (inputs.materialCost10a !== null ? inputs.materialCost10a : defs.materialCost10a) * area10a;
  const machine  = (inputs.machineCost10a  !== null ? inputs.machineCost10a  : defs.machineCost10a)  * area10a;
  const labor    = (inputs.laborCost10a    !== null ? inputs.laborCost10a    : defs.laborCost10a)    * area10a;
  const initial  = (inputs.initialCost     !== null ? inputs.initialCost     : defs.initialCost);
  const amort    = defs.amortYears;
  const price    = (inputs.pricePerKg      !== null ? inputs.pricePerKg      : defs.pricePerKg);

  // _crScoresから収量・収益計算に必要な情報を取得
  const scores  = (typeof _crScores !== 'undefined') ? _crScores : [];
  const entry   = scores.find(s => s.crop.id === cropId);
  const profit  = entry ? entry.profitability : null;

  // 簡易収量推定（profitabilityから逆算 or デフォルト）
  let revenue = 0;
  if (profit && profit.revenue) {
    // 既存収益計算の収入をベースに、単価だけ差し替え
    const origPrice = profit.averagePrice || (price || 1);
    revenue = origPrice > 0 ? profit.revenue / origPrice * price : 0;
  }

  const totalCost   = seed + material + machine + labor + (initial / amort) * area10a;
  const riskRate    = profit ? (profit.riskDeductionRate || 0) : 0;
  const netProfit   = Math.round((revenue - totalCost) * (1 - riskRate));

  return {
    revenue:      Math.round(revenue),
    seedCost:     Math.round(seed),
    materialCost: Math.round(material),
    machineCost:  Math.round(machine),
    laborCost:    Math.round(labor),
    amortCost:    Math.round((initial / amort) * area10a),
    riskRate:     Math.round(riskRate * 100),
    netProfit,
    area10a,
  };
}

/**
 * _simUpdatePreview()
 * フォームの現在値を読み取り、プレビューエリアを更新する。
 */
function _simUpdatePreview() {
  const cropId = _simSelectedCropId;
  if (!cropId) return;

  function readVal(id) {
    const el = document.getElementById(id);
    if (!el || el.value === '') return null;
    return Number(el.value) || null;
  }

  const inputs = {
    seedCost10a:     readVal('sim-seed'),
    materialCost10a: readVal('sim-material'),
    machineCost10a:  readVal('sim-machine'),
    laborCost10a:    readVal('sim-labor'),
    initialCost:     readVal('sim-initial'),
    pricePerKg:      readVal('sim-price'),
  };

  // _simMemoryに保存
  _simMemory[cropId] = inputs;

  const r = _simCalcPreview(cropId, inputs);
  const el = document.getElementById('adp-rk-sim-preview');
  if (!el || !r) return;

  const fmt = v => v == null ? '—' : v.toLocaleString('ja-JP') + '円';
  const profitClass = r.netProfit >= 0 ? 'profit-positive' : 'profit-negative';

  el.innerHTML = `
    <div class="adp-rk-sim-preview-row"><span>収入（推定）</span><span>${fmt(r.revenue)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　種苗費</span><span>−${fmt(r.seedCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　資材費</span><span>−${fmt(r.materialCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　機械費</span><span>−${fmt(r.machineCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　労働費</span><span>−${fmt(r.laborCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　初期費用（年間償却）</span><span>−${fmt(r.amortCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　リスク控除</span><span>−${r.riskRate}%</span></div>
    <div class="adp-rk-sim-total ${profitClass}"><span>推定純利益</span><span>${fmt(r.netProfit)}</span></div>
    <div class="adp-rk-sim-area-note">※ エリア面積 ${r.area10a.toFixed(2)} 10a 換算</div>
  `;
}

/**
 * _simSaveProfitOverrides()
 * 現在のフォーム値を profitOverrides に保存し、Firestore/localStorage に永続化する。
 */
async function _simSaveProfitOverrides() {
  const cropId = _simSelectedCropId;
  if (!cropId || !_adpArea) return;

  function readVal(id) {
    const el = document.getElementById(id);
    if (!el || el.value === '') return null;
    return Number(el.value) || null;
  }

  const payload = {
    seedCost10a:     readVal('sim-seed'),
    materialCost10a: readVal('sim-material'),
    machineCost10a:  readVal('sim-machine'),
    laborCost10a:    readVal('sim-labor'),
    initialCost:     readVal('sim-initial'),
    pricePerKg:      readVal('sim-price'),
    updatedAt:       new Date().toISOString(),
  };

  // メモリ上更新
  const store = _simEnsureOverridesStore();
  store[cropId] = payload;
  _adpArea.profitOverrides = store;

  // Firestore / localStorage 永続化（saveInlineEditパターン踏襲）
  const id = _adpArea.id;
  const update = { [`profitOverrides.${cropId}`]: payload };

  try {
    if (typeof db !== 'undefined' && db && id && !String(id).startsWith('local_')) {
      await db.collection('areas').doc(id).update(update);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        stored[idx].profitOverrides = stored[idx].profitOverrides || {};
        stored[idx].profitOverrides[cropId] = payload;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
    _simDirty = false;
    showToast('保存しました ✓', 'green');
    // 分析を再計算して収益ランキングに反映
    if (typeof _awRunAnalysis === 'function') _awRunAnalysis();
  } catch(e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
  }
}

/**
 * _simResetCrop(cropId)
 * 指定作物の上書き値をクリアし、フォームをデフォルトに戻す。
 */
async function _simResetCrop(cropId) {
  if (!cropId || !_adpArea) return;

  const store = _simEnsureOverridesStore();
  delete store[cropId];
  _adpArea.profitOverrides = store;

  // localStorage更新
  const id = _adpArea.id;
  try {
    if (typeof db !== 'undefined' && db && id && !String(id).startsWith('local_')) {
      // Firestoreはフィールド削除のためFieldValue.deleteを使う
      const del = {};
      del[`profitOverrides.${cropId}`] = firebase.firestore.FieldValue.delete();
      await db.collection('areas').doc(id).update(del);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        if (stored[idx].profitOverrides) delete stored[idx].profitOverrides[cropId];
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
  } catch(e) {
    console.warn('profitOverrides削除:', e);
  }

  delete _simMemory[cropId];
  _simDirty = false;
  // フォームを再描画（デフォルト値で）
  _adpRenderProfitSimulator();
  showToast('リセットしました', 'green');
}

/**
 * _adpRenderProfitSimulator()
 * 収益シミュレーターUI（サブタブ5）を描画する。
 */
function _adpRenderProfitSimulator() {
  const wrap = document.getElementById('adp-rk-sim-wrap');
  if (!wrap) return;

  const scores = (typeof _crScores !== 'undefined') ? _crScores : [];

  // 登録作物が0件の場合
  if (!scores.length) {
    wrap.innerHTML = `<div class="adp-rk-sim-no-data">作物未登録です。エリアに作物を追加してください。</div>`;
    return;
  }

  // 初期作物IDを決定
  if (!_simSelectedCropId) {
    _simSelectedCropId = _simResolveDefaultCropId();
  }
  const cropId = _simSelectedCropId;

  // 選択中作物の表示名を取得
  const selectedScore = scores.find(s => s.crop.id === cropId);
  const selectedCropName = selectedScore ? selectedScore.crop.name : '—';

  // 選択作物のデフォルト値
  const defs = _simGetDefaultValues(cropId);
  if (!defs) {
    wrap.innerHTML = `<div class="adp-rk-sim-no-data">作物データが見つかりません。</div>`;
    return;
  }

  // 保存済みoverrides or セッションキャッシュを優先
  const store   = _simEnsureOverridesStore();
  const saved   = store[cropId] || null;
  const cached  = _simMemory[cropId] || null;
  const vals    = cached || saved || {};

  function fmtVal(key) {
    const v = vals[key];
    return (v !== undefined && v !== null) ? v : '';
  }

  const noPriceNote = defs.hasNoPrice
    ? `<div class="adp-rk-sim-no-data" style="margin-bottom:8px;">⚠️ この作物には参考価格データがありません。実勢価格を入力してください。</div>`
    : '';

  wrap.innerHTML = `
    <div class="adp-rk-sim-form">
      <div class="adp-rk-sim-select-wrap">
        <label>作物</label>
        <div class="sim-crop-picker-row">
          <span class="sim-crop-selected-name" id="sim-crop-selected-name">${escHtml(selectedCropName)}</span>
          <button class="sim-crop-pick-btn" onclick="_simOpenCropPicker()">変更</button>
        </div>
      </div>
      ${noPriceNote}
      <div class="adp-rk-sim-field">
        <label>種苗費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-seed" type="number" min="0" placeholder="${defs.seedCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('seedCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>資材費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-material" type="number" min="0" placeholder="${defs.materialCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('materialCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>機械費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-machine" type="number" min="0" placeholder="${defs.machineCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('machineCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>労働費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-labor" type="number" min="0" placeholder="${defs.laborCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('laborCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>初期費用 <span class="sim-unit">円/10a</span></label>
        <input id="sim-initial" type="number" min="0" placeholder="${defs.initialCost.toLocaleString('ja-JP')}"
          value="${fmtVal('initialCost')}" oninput="_simOnInput()">
        <div class="sim-note">償却年数 ${defs.amortYears}年（変更不可）</div>
      </div>
      <div class="adp-rk-sim-field">
        <label>販売単価 <span class="sim-unit">円/kg</span></label>
        <input id="sim-price" type="number" min="0" placeholder="${defs.pricePerKg.toLocaleString('ja-JP')}"
          value="${fmtVal('pricePerKg')}" oninput="_simOnInput()">
      </div>
      <div id="adp-rk-sim-preview" class="adp-rk-sim-preview"></div>
      <div class="adp-rk-sim-actions">
        <button class="btn btn-ghost" onclick="_simResetCrop('${escHtml(cropId)}')">↩ リセット</button>
        <button class="btn btn-primary" onclick="_simSaveProfitOverrides()">保存</button>
      </div>
    </div>
  `;

  // 初期プレビューを表示
  _simUpdatePreview();
}

/** シミュレーター：作物ピッカーシートを開く */
function _simOpenCropPicker() {
  _openCropPickerSheet({
    title: '🌱 シミュレーター作物を選ぶ',
    onSelect: (cropId) => _simOnCropChange(cropId),
  });
}

/** 作物変更時（ピッカー選択コールバック） */
function _simOnCropChange(newCropId) {
  if (_simDirty) {
    showConfirmDialog('未保存の変更があります。破棄してよろしいですか？', '破棄する', 'キャンセル', false).then(ok => {
      if (!ok) return;
      // 2026-06修正: _simDirtyだけクリアし_simMemoryを消していなかったため、
      // 「破棄」を選んでも同じ作物に戻ると入力値が復元されてしまうバグを修正。
      _simDirty = false;
      delete _simMemory[_simSelectedCropId];
      _simSelectedCropId = newCropId;
      _adpRenderProfitSimulator();
    });
    return;
  }
  _simSelectedCropId = newCropId;
  _adpRenderProfitSimulator();
}

/** 入力変更時 */
function _simOnInput() {
  _simDirty = true;
  _simUpdatePreview();
}

// ═══════════════════════════════════════════
//  📊 ガントチャート（Phase 2）
// ═══════════════════════════════════════════

// ─── モード管理 ───
let _adpGanttMode = 'est'; // 'est' | 'db'

function _adpGanttSetMode(mode) {
  _adpGanttMode = mode;
  // トグルボタンのactive切替
  document.querySelectorAll('.adp-gantt-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ganttMode === mode);
  });
  _adpRenderGrowthGantt(_adpSelectedCropId);
}

// ─── ガントチャート用Canvas初期化 ───
// _adpGrowthSetup は既存Canvasに特化しているため、ガント専用に類似ロジックを展開
function _adpGanttSetup() {
  const canvas = document.getElementById('adp-gantt-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 200;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-gantt-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  return { ctx, W, H, decadeArr, rainMonthly, tMeanArr: decadeArr.tMean, cultivationMode };
}

// ─── 今日の旬index算出（0-35）───
function _adpGanttTodayDecade() {
  const now = new Date();
  const m   = now.getMonth();     // 0-11
  const d   = now.getDate();
  const jun = d <= 10 ? 0 : d <= 20 ? 1 : 2; // 上旬0・中旬1・下旬2
  return m * 3 + jun;
}

// ─── ガントチャート描画ヘルパー ───
// X軸：月12分割（各月幅 = gW/12）。
// Y軸：行ごとに均等分割（行数に応じて自動計算）。
function _adpGanttDrawAxes(ctx, W, H, PAD) {
  const gW = W - PAD.left - PAD.right;
  const gH = H - PAD.top  - PAD.bottom;

  // 月グリッド縦線
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 0.5;
  for (let m = 0; m <= 12; m++) {
    const x = PAD.left + (m / 12) * gW;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + gH);
    ctx.stroke();
  }

  // 月ラベル
  ctx.fillStyle = 'rgba(143,170,145,0.7)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const cx = PAD.left + (m + 0.5) / 12 * gW;
    ctx.fillText(`${m + 1}月`, cx, PAD.top + gH + 10);
  }

  return { gW, gH };
}

// 横バー1本描画（月単位・角丸）
function _adpGanttDrawBar(ctx, PAD, gW, gH, rowCount, rowIdx, monthIdx, color, alpha) {
  const barH  = Math.max(8, Math.floor((gH / rowCount) * 0.55));
  const rowH  = gH / rowCount;
  const y     = PAD.top + rowH * rowIdx + (rowH - barH) / 2;
  const barW  = gW / 12;
  const x     = PAD.left + (monthIdx / 12) * gW + 1;
  const r     = 3;
  const w     = barW - 2;

  ctx.fillStyle = color.replace(')', `,${alpha})`).replace('rgb(', 'rgba(');
  // 角丸矩形（roundRect がない環境対応）
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, barH, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + barH - r);
    ctx.arcTo(x + w, y + barH, x + w - r, y + barH, r);
    ctx.lineTo(x + r, y + barH);
    ctx.arcTo(x, y + barH, x, y + barH - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  ctx.fill();
}

// 収穫予測マーカー（◆点）
function _adpGanttDrawHarvestDot(ctx, PAD, gW, gH, rowCount, rowIdx, decadeIdx, color) {
  const rowH = gH / rowCount;
  const cy   = PAD.top + rowH * rowIdx + rowH / 2;
  const cx   = PAD.left + (decadeIdx / _ADP_GROWTH_N) * gW;
  const size = 5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx,        cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx,        cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
}

// 行ラベル描画
function _adpGanttDrawRowLabels(ctx, PAD, gH, rows) {
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(143,170,145,0.85)';
  ctx.font      = '9px Noto Sans JP, sans-serif';
  const rowH    = gH / rows.length;
  rows.forEach((label, i) => {
    const cy = PAD.top + rowH * i + rowH / 2 + 3;
    ctx.fillText(label, PAD.left - 4, cy);
  });
}

// 本日縦線
function _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade) {
  const x = PAD.left + (todayDecade / _ADP_GROWTH_N) * gW;
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.75)'; // amber
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(x, PAD.top - 2);
  ctx.lineTo(x, PAD.top + gH);
  ctx.stroke();
  // 「今」ラベル
  ctx.setLineDash([]);
  ctx.fillStyle  = 'rgba(251,191,36,0.85)';
  ctx.font       = '8px DM Mono, monospace';
  ctx.textAlign  = 'center';
  ctx.fillText('今', x, PAD.top - 4);
  ctx.restore();
}

// ─── メイン描画関数 ───
function _adpRenderGrowthGantt(cropId) {
  // 初回呼び出し時にトグルボタンのactive状態を初期化
  document.querySelectorAll('.adp-gantt-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ganttMode === _adpGanttMode);
  });

  const g = _adpGanttSetup();
  if (!g) return;

  const { ctx, W, H } = g;
  const crop          = _adpGrowthFindCrop(cropId);
  const todayDecade   = _adpGanttTodayDecade();
  const legendEl      = document.getElementById('adp-gantt-legend');

  // ─── DB暦モード ───
  if (_adpGanttMode === 'db') {
    const STAGES = [
      { key: 'sowing',     label: '播種', color: 'rgba(56,189,248,1)'  },
      { key: 'seedling',   label: '育苗', color: 'rgba(45,212,191,1)'  },
      { key: 'transplant', label: '定植', color: 'rgba(236,72,153,1)'  },
      { key: 'harvest',    label: '収穫', color: 'rgba(74,222,128,1)'  },
    ];
    const rows = STAGES.map(s => s.label);
    const PAD  = { top: 18, right: 8, bottom: 22, left: 34 };
    const { gW, gH } = _adpGanttDrawAxes(ctx, W, H, PAD);

    _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade);
    _adpGanttDrawRowLabels(ctx, PAD, gH, rows);

    if (crop) {
      STAGES.forEach((s, rowIdx) => {
        const idxs = _adpGrowthCalToIdx(crop.calendar?.[s.key] || []);
        idxs.forEach(monthIdx => {
          _adpGanttDrawBar(ctx, PAD, gW, gH, STAGES.length, rowIdx, monthIdx, s.color, 0.80);
        });
      });
    }

    // 凡例
    if (legendEl) {
      if (crop) {
        const items = STAGES
          .map(s => {
            const idxs = _adpGrowthCalToIdx(crop.calendar?.[s.key] || []);
            if (!idxs.length) return '';
            return `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:${s.color}"></span>${s.label} ${idxs.map(i => (i + 1) + '月').join('/')}</span>`;
          }).join('');
        legendEl.innerHTML = items
          + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>`;
      } else {
        legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
      }
    }
    return;
  }

  // ─── 気候推定モード ───
  const rows = ['播種/定植適期', '収穫予測'];
  const PAD  = { top: 18, right: 8, bottom: 22, left: 50 };
  const { gW, gH } = _adpGanttDrawAxes(ctx, W, H, PAD);

  _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade);
  _adpGanttDrawRowLabels(ctx, PAD, gH, rows);

  let sowingWindows = [];
  if (crop && typeof Phenology !== 'undefined') {
    sowingWindows = Phenology.sowingWindows(g.decadeArr, crop, g.cultivationMode);
  }

  if (sowingWindows.length > 0) {
    // 播種/定植適期バー（旬index→月index近似：Math.floor(decade/3)）
    sowingWindows.slice(0, 3).forEach((win, rank) => {
      const alpha = rank === 0 ? 0.82 : 0.35 - rank * 0.05;
      const mStart = Math.floor(win.startDecade / 3);
      const mEnd   = Math.floor(win.endDecade   / 3);
      for (let m = mStart; m <= Math.min(mEnd, 11); m++) {
        _adpGanttDrawBar(ctx, PAD, gW, gH, rows.length, 0, m, 'rgba(34,197,94,1)', alpha);
      }
      // 収穫予測マーカー（1位のみ）
      if (rank === 0 && win.harvestDecade != null) {
        _adpGanttDrawHarvestDot(ctx, PAD, gW, gH, rows.length, 1, win.harvestDecade, 'rgba(167,139,250,0.9)');
      }
    });
  }

  // 凡例
  if (legendEl) {
    if (!crop) {
      legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
      return;
    }
    if (sowingWindows.length === 0) {
      legendEl.innerHTML = '<span class="adp-tl-item adp-tl-period">この気候では播種適期が見つかりませんでした</span>';
      return;
    }
    const bestWin      = sowingWindows[0];
    const sowLabel     = Phenology.decadeLabel(bestWin.startDecade);
    const sowEndLabel  = Phenology.decadeLabel(bestWin.endDecade);
    const harvestLabel = bestWin.harvestDecade != null ? Phenology.decadeLabel(bestWin.harvestDecade) : null;
    const rankCount    = Math.min(sowingWindows.length, 3);
    legendEl.innerHTML =
      `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.85)"></span>播種/定植適期 ${sowLabel}〜${sowEndLabel}（1位）</span>`
      + (rankCount >= 2 ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.35)"></span>適期候補 2〜${rankCount}位</span>` : '')
      + (harvestLabel   ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.9)"></span>収穫予測 ${harvestLabel}</span>` : '')
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>`
      + (g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}</span>` : '');
  }
}
// ═══════════════════════════════════════════
//  🌡️ GDD積算専用グラフ（Phase 3）
//  気候推定専用。GDD積算カーブを主役に、
//  気温折れ線を薄い背景として残す。
//  降水量バーは非表示。
// ═══════════════════════════════════════════

function _adpGDDSetup() {
  const canvas = document.getElementById('adp-gdd-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 240;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-gdd-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  return { ctx, W, H, decadeArr, rainMonthly, tMeanArr: decadeArr.tMean, cultivationMode };
}

function _adpRenderGrowthGDD(cropId) {
  const g = _adpGDDSetup();
  if (!g) return;

  const { ctx, W, H } = g;
  const legendEl = document.getElementById('adp-gdd-legend');
  const crop     = _adpGrowthFindCrop(cropId);

  // ── 軸レイアウト（GDD専用。右Y軸=GDD / 左Y軸=気温） ──
  // 気温の範囲を計算（_adpGrowthAxes と同ロジック）
  const PAD = { top: 18, right: 52, bottom: 28, left: 36 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;

  const allTemps = [...g.tMeanArr].filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const tRawMin = Math.min(...allTemps);
  const tRawMax = Math.max(...allTemps);
  const tYMin   = Math.floor((tRawMin - 2) / 5) * 5;
  const tYMax   = Math.ceil ((tRawMax + 2) / 5) * 5;
  const tRange  = tYMax - tYMin || 1;

  const toX  = i => PAD.left + (i / (_ADP_GROWTH_N - 1)) * gW;
  const toTY = v => PAD.top  + (1 - (v - tYMin) / tRange) * gH;

  // ── GDD積算データ取得 ──
  let sowingWindows = [];
  let gddCurve      = null;
  let gddBase       = 10;
  let gddMax        = 0;
  let bestWin       = null;

  if (crop && typeof Phenology !== 'undefined') {
    sowingWindows = Phenology.sowingWindows(g.decadeArr, crop, g.cultivationMode);
    if (sowingWindows.length > 0) {
      bestWin  = sowingWindows[0];
      gddBase  = crop.conditions?.tempMeanMin ?? 10;
      gddCurve = Phenology.accumulateGDD(g.tMeanArr, gddBase, bestWin.startDecade);
      gddMax   = Math.max(...gddCurve.filter(v => v !== null), 1);
    }
  }

  // GDD Y軸スケール（0〜gddMax を右軸）
  const gddYMax  = Math.ceil(gddMax / 100) * 100 || 1000;
  const toGY     = v => PAD.top + (1 - v / gddYMax) * gH;

  // ── ① 背景グリッド（横：気温5℃刻み） ──
  const tSteps = Math.round(tRange / 5);
  for (let s = 0; s <= tSteps; s++) {
    const tv = tYMin + s * 5;
    const y  = toTY(tv);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
  }
  // 縦グリッド（月境界）
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // ── ② 左Y軸ラベル（気温） ──
  ctx.fillStyle = 'rgba(251,191,36,0.55)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'right';
  for (let s = 0; s <= tSteps; s++) {
    const tv = tYMin + s * 5;
    ctx.fillText(tv + '°', PAD.left - 4, toTY(tv) + 3);
  }

  // ── ③ 右Y軸ラベル（GDD） ──
  ctx.fillStyle = 'rgba(167,139,250,0.85)';
  ctx.textAlign = 'left';
  for (let s = 0; s <= 4; s++) {
    const gv = Math.round(gddYMax * s / 4);
    ctx.fillText(gv + '', PAD.left + gW + 4, toGY(gv) + 3);
  }
  // 右軸の「GDD」単位ラベル
  ctx.font = '8px DM Mono, monospace';
  ctx.fillText('GDD', PAD.left + gW + 4, PAD.top - 4);

  // ── ④ 適正気温帯シェード（薄いアンバー帯） ──
  if (crop) {
    const tMin = crop.conditions.tempMeanMin;
    const tMax = crop.conditions.tempMeanMax;
    if (tMin != null && tMax != null) {
      const yTop = toTY(Math.min(tMax, tYMax));
      const yBot = toTY(Math.max(tMin, tYMin));
      const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
      grad.addColorStop(0, 'rgba(251,191,36,0.08)');
      grad.addColorStop(1, 'rgba(251,191,36,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
      // 適正帯の上下ライン
      [tMin, tMax].forEach(tv => {
        if (tv < tYMin || tv > tYMax) return;
        const y = toTY(tv);
        ctx.strokeStyle = 'rgba(251,191,36,0.25)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }

  // ── ⑤ 播種ウィンドウ帯シェード（薄緑） ──
  if (sowingWindows.length > 0) {
    const decW = gW / (_ADP_GROWTH_N - 1);
    sowingWindows.slice(0, 3).forEach((win, rank) => {
      const alpha = 0.18 - rank * 0.05;
      const s  = win.startDecade;
      const e  = win.endDecade;
      const x0 = toX(s) - decW / 2;
      const x1 = e >= s ? toX(e) + decW / 2 : toX(e + 36) + decW / 2;
      const rw = Math.min(x1 - x0, gW - (x0 - PAD.left));
      if (rw > 0) {
        ctx.fillStyle = `rgba(34,197,94,${alpha})`;
        ctx.fillRect(Math.max(x0, PAD.left), PAD.top, Math.min(rw, gW), gH);
      }
    });
  }

  // ── ⑥ 気温折れ線（薄い背景として参考表示）──
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  let tMoved = false;
  g.tMeanArr.forEach((v, i) => {
    if (v === null) { tMoved = false; return; }
    if (!tMoved) { ctx.moveTo(toX(i), toTY(v)); tMoved = true; }
    else         { ctx.lineTo(toX(i), toTY(v)); }
  });
  ctx.stroke();
  // 気温ドット（薄く）
  g.tMeanArr.forEach((v, i) => {
    if (v === null) return;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(toX(i), toTY(v), 1.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();

  // ── ⑦ GDD積算カーブ（紫・実線・太め）──
  if (gddCurve && gddMax > 0) {
    // カーブ塗りつぶし（グラデーション）
    ctx.save();
    const fillGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + gH);
    fillGrad.addColorStop(0, 'rgba(167,139,250,0.25)');
    fillGrad.addColorStop(1, 'rgba(167,139,250,0.02)');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    let startX = null;
    gddCurve.forEach((v, i) => {
      if (v === null) return;
      const x = toX(i), y = toGY(v);
      if (startX === null) { ctx.moveTo(x, PAD.top + gH); ctx.lineTo(x, y); startX = x; }
      else ctx.lineTo(x, y);
    });
    // 最後の点から底辺へ閉じる
    const lastValid = [...gddCurve].reverse().findIndex(v => v !== null);
    if (lastValid >= 0) {
      const lastIdx = gddCurve.length - 1 - lastValid;
      ctx.lineTo(toX(lastIdx), PAD.top + gH);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // カーブ線
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.90)';
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    let gMoved = false;
    gddCurve.forEach((v, i) => {
      if (v === null) { gMoved = false; return; }
      const x = toX(i), y = toGY(v);
      if (!gMoved) { ctx.moveTo(x, y); gMoved = true; }
      else         { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.restore();

    // ── ⑧ 収穫予測点（◆ 紫・到達GDD値付き）──
    if (bestWin && bestWin.harvestDecade != null) {
      const hi = bestWin.harvestDecade;
      const hv = gddCurve[hi];
      if (hv != null) {
        const hx = toX(hi);
        const hy = toGY(hv);
        const sz = 6;
        ctx.save();
        ctx.fillStyle = 'rgba(167,139,250,0.95)';
        ctx.beginPath();
        ctx.moveTo(hx,      hy - sz);
        ctx.lineTo(hx + sz, hy);
        ctx.lineTo(hx,      hy + sz);
        ctx.lineTo(hx - sz, hy);
        ctx.closePath();
        ctx.fill();
        // GDD到達値ラベル
        ctx.fillStyle = 'rgba(167,139,250,0.85)';
        ctx.font      = '8px DM Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(hv)}GDD`, hx + 8, hy + 3);
        ctx.restore();
      }
    }

    // ── ⑨ 播種適期マーカー（▼ 緑）──
    if (bestWin) {
      const sx = toX(bestWin.startDecade);
      _adpGrowthDrawTriangleMarker(ctx, sx, PAD.top + 1, 'rgba(34,197,94,0.95)');
    }
  }

  // ── ⑩ 月ラベル ──
  ctx.fillStyle = 'rgba(143,170,145,0.7)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.fillText(`${m + 1}`, x, PAD.top + gH + 10);
  }
  ctx.fillStyle = 'rgba(143,170,145,0.4)';
  ctx.font      = '8px DM Mono, monospace';
  ctx.fillText('月', PAD.left + gW + 8, PAD.top + gH + 10);

  // ── 凡例 ──
  if (legendEl) {
    if (!crop) {
      legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
      return;
    }
    const sowLabel     = bestWin ? Phenology.decadeLabel(bestWin.startDecade) : null;
    const harvestLabel = (bestWin && bestWin.harvestDecade != null)
      ? Phenology.decadeLabel(bestWin.harvestDecade) : null;
    const tMin = crop.conditions.tempMeanMin;
    const tMax = crop.conditions.tempMeanMax;

    legendEl.innerHTML =
      `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.85)"></span>GDD積算（基準 ${gddBase}℃）</span>`
      + (sowLabel    ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.7)"></span>播種/定植適期 ${sowLabel}</span>` : '')
      + (harvestLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.9)"></span>収穫予測 ${harvestLabel}（${Math.round(gddMax)}GDD）</span>` : '')
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.35)"></span>旬平均気温（参考）</span>`
      + ((tMin != null && tMax != null) ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.2);border:1px solid rgba(251,191,36,0.4)"></span>適正気温帯 ${tMin}〜${tMax}℃</span>` : '')
      + (!bestWin ? '<span class="adp-tl-item adp-tl-period">この気候では播種適期が見つかりませんでした</span>' : '')
      + (g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}</span>` : '');
  }
}

// ═══════════════════════════════════════════
//  🗺️ 旬別適期ヒートマップ（Phase 4）
//  36旬 × 4行（気温／降水／日照／総合）の
//  マトリクスを色分け表示。気候推定専用。
// ═══════════════════════════════════════════

// ── 3段階スコア定数 ──
const _HM_GREEN  = 2; // 適正（緑）
const _HM_YELLOW = 1; // 要注意・最低限生育可（黄）
const _HM_RED    = 0; // 危険・困難（赤）

// ── セル色定義 ──
const _HM_COLORS = {
  [_HM_GREEN]:  { fill: 'rgba(74,222,128,0.75)',  stroke: 'rgba(74,222,128,0.3)'  },
  [_HM_YELLOW]: { fill: 'rgba(251,191,36,0.70)',  stroke: 'rgba(251,191,36,0.3)'  },
  [_HM_RED]:    { fill: 'rgba(248,113,113,0.75)', stroke: 'rgba(248,113,113,0.3)' },
};
const _HM_NULL_COLOR = { fill: 'rgba(42,61,44,0.35)', stroke: 'rgba(42,61,44,0.2)' };

// ── 気温スコア（旬ごと）: 仕様書 §6.1 ──
function _hmTempScore(i, decadeArr, crop) {
  const tMean = decadeArr.tMean?.[i];
  const tMin  = decadeArr.tMin?.[i];
  const tMax  = decadeArr.tMax?.[i];
  if (tMean == null) return null;

  const cMin     = crop.conditions.tempMeanMin;
  const cMax     = crop.conditions.tempMeanMax;
  const heatType = crop.heatType === 'warm' ? 'warm' : 'cool';
  const heatThre = heatType === 'warm' ? 35 : 33;

  // 赤条件（いずれか1つでも赤）
  if (tMin != null && tMin < 0)           return _HM_RED; // 霜
  if (tMax != null && tMax >= heatThre)   return _HM_RED; // 熱害
  if (cMin != null && tMean < cMin + 3)   return _HM_RED; // 冷害域（chillThreshold未満）

  // 適正（緑）
  if (cMin != null && cMax != null && tMean >= cMin && tMean <= cMax) return _HM_GREEN;
  if (cMin == null && cMax == null) return _HM_GREEN; // 基準なし＝評価不能→緑扱い

  // 要注意（黄）：上記のどちらにも該当しない
  return _HM_YELLOW;
}

// ── 降水スコア（旬ごと）: 仕様書 §6.2 ──
// 月別降水量を旬に均等分配して評価
function _hmRainScore(monthIdx, crop, rainMonthly) {
  if (!rainMonthly) return null;
  const mk  = _ADP_GROWTH_MONTH_KEYS[monthIdx];
  const rv  = rainMonthly[mk];
  if (rv == null) return null;
  const rPerDecade = rv / 3; // 月降水量→旬降水量（均等分配）

  const aMin = crop.conditions.absRainMin;
  const rMin = crop.conditions.rainfallMin;
  const rMax = crop.conditions.rainfallMax;
  const aMax = crop.conditions.absRainMax;

  // 赤：絶対限界を超えている
  if (aMin != null && rPerDecade < aMin / 3) return _HM_RED;
  if (aMax != null && rPerDecade > aMax / 3) return _HM_RED;

  // 緑：適正範囲内
  const inMin = (rMin == null || rPerDecade >= rMin / 3);
  const inMax = (rMax == null || rPerDecade <= rMax / 3);
  if (inMin && inMax) return _HM_GREEN;

  // 黄：それ以外
  return _HM_YELLOW;
}

// ── 日照スコア（旬ごと）: 仕様書 §6.3 ──
// calcSunScoreAllDecades の結果（0〜1）を3段階に変換
function _hmSunScore(continuousScore) {
  if (continuousScore == null) return null;
  if (continuousScore >= 1.0)  return _HM_GREEN;
  if (continuousScore >= 0.5)  return _HM_YELLOW;
  return _HM_RED;
}

// ── 総合スコア（3指標の最悪値）: 仕様書 §6.4 ──
function _hmOverallScore(t, r, s) {
  const valid = [t, r, s].filter(v => v !== null);
  if (valid.length === 0) return null;
  return Math.min(...valid);
}

// ── Canvas初期化 ──
function _adpHeatmapSetup() {
  const canvas = document.getElementById('adp-heatmap-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth || 320;

  // 行数×セル高さから高さを決定（後で確定するためここは仮置き）
  const H = canvas.offsetHeight || 160;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-heatmap-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  return { ctx, W, H, decadeArr, rainMonthly };
}

// ── セル描画 ──
function _hmDrawCell(ctx, x, y, w, h, score) {
  const col = score !== null ? _HM_COLORS[score] : _HM_NULL_COLOR;
  ctx.fillStyle   = col.fill;
  ctx.strokeStyle = col.stroke;
  ctx.lineWidth   = 0.5;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// ── メイン描画 ──
function _adpRenderGrowthHeatmap(cropId) {
  const g = _adpHeatmapSetup();
  if (!g) return;

  const { ctx, W, H, decadeArr, rainMonthly } = g;
  const legendEl = document.getElementById('adp-heatmap-legend');
  const crop     = _adpGrowthFindCrop(cropId);

  const ROWS     = ['気温', '降水', '日照', '総合'];
  const N        = _ADP_GROWTH_N; // 36旬
  const PAD      = { top: 14, right: 6, bottom: 22, left: 30 };
  const gW       = W - PAD.left - PAD.right;
  const gH       = H - PAD.top  - PAD.bottom;
  const cellW    = gW / N;
  const rowH     = gH / ROWS.length;

  // 「今日」旬index（ガントと同じ関数を流用）
  const todayDecade = typeof _adpGanttTodayDecade === 'function'
    ? _adpGanttTodayDecade() : 0;

  // 作物未選択時
  if (!crop) {
    ctx.fillStyle = 'rgba(90,122,92,0.7)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('作物を選択してください', W / 2, H / 2);
    if (legendEl) legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
    return;
  }

  // 日照スコア全旬配列（engine.js の新関数を使用）
  const sunScores = (typeof calcSunScoreAllDecades === 'function')
    ? calcSunScoreAllDecades(crop, decadeArr)
    : null;

  // ── ① 月区切り縦線（背景）──
  for (let m = 0; m <= 12; m++) {
    const x = PAD.left + (m * 3 / N) * gW;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = m % 3 === 0 ? 1.2 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + gH);
    ctx.stroke();
  }

  // ── ② 全セル描画 ──
  for (let i = 0; i < N; i++) {
    const monthIdx = Math.floor(i / 3);
    const x = PAD.left + i * cellW;

    const tScore = _hmTempScore(i, decadeArr, crop);
    const rScore = _hmRainScore(monthIdx, crop, rainMonthly);
    const sScore = sunScores != null ? _hmSunScore(sunScores[i]) : null;
    const oScore = _hmOverallScore(tScore, rScore, sScore);

    const scores = [tScore, rScore, sScore, oScore];
    scores.forEach((sc, rowIdx) => {
      const y = PAD.top + rowIdx * rowH;
      _hmDrawCell(ctx, x, y, cellW, rowH, sc);
    });
  }

  // ── ③ 総合行の区切り線（行ラベルの前に強調線）──
  const totalRowY = PAD.top + 3 * rowH;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD.left, totalRowY);
  ctx.lineTo(PAD.left + gW, totalRowY);
  ctx.stroke();

  // ── ④ 行ラベル ──
  ctx.textAlign = 'right';
  ctx.font      = '9px Noto Sans JP, sans-serif';
  ROWS.forEach((label, rowIdx) => {
    const cy = PAD.top + rowH * rowIdx + rowH / 2 + 3;
    ctx.fillStyle = rowIdx === 3 ? 'rgba(226,237,227,0.9)' : 'rgba(143,170,145,0.8)';
    ctx.fillText(label, PAD.left - 4, cy);
  });

  // ── ⑤ 月ラベル（上部）──
  ctx.fillStyle = 'rgba(143,170,145,0.7)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const cx = PAD.left + (m * 3 + 1.5) / N * gW;
    ctx.fillText(`${m + 1}`, cx, PAD.top - 3);
  }
  // 「月」単位テキスト
  ctx.fillStyle = 'rgba(143,170,145,0.4)';
  ctx.font      = '8px DM Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('月', PAD.left + gW + 2, PAD.top - 3);

  // ── ⑥ 本日縦線 ──
  const todayX = PAD.left + (todayDecade + 0.5) / N * gW;
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.80)';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(todayX, PAD.top);
  ctx.lineTo(todayX, PAD.top + gH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── ⑦ 月ラベル（下部）──
  ctx.fillStyle = 'rgba(143,170,145,0.6)';
  ctx.font      = '8px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const cx = PAD.left + (m * 3 + 1.5) / N * gW;
    ctx.fillText(`${m + 1}月`, cx, PAD.top + gH + 10);
  }

  // ── 凡例 ──
  const hasSun  = sunScores !== null;
  const noSunMsg = hasSun ? '' : '<span class="adp-tl-item adp-tl-period" style="color:var(--text3)">日照データなし（日照行はグレー）</span>';
  if (legendEl) {
    legendEl.innerHTML =
      '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.75)"></span>適正（緑）</span>'
      + '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.70)"></span>要注意（黄）</span>'
      + '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(248,113,113,0.75)"></span>困難（赤）</span>'
      + '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>'
      + noSunMsg;
  }
}

// ═══════════════════════════════════════════
//  ⚖️ 栽培方式別 収穫予測比較バー（Phase 5）
//  露地 / ハウス / 加温ハウス の3方式を
//  横並びガントで比較。気候推定専用。
// ═══════════════════════════════════════════

// ── 方式定義（順序・色・ラベル固定） ──
const _CMP_MODES = [
  { key: 'openField',       label: '🌾 露地',     color: 'rgba(56,189,248,1)'  }, // 水色
  { key: 'greenhouse',      label: '🏠 ハウス',   color: 'rgba(74,222,128,1)'  }, // 緑
  { key: 'heatedGreenhouse',label: '🔥 加温',     color: 'rgba(251,146,60,1)'  }, // オレンジ
];

// ── Canvas初期化（compare専用） ──
function _adpCompareSetup() {
  const canvas = document.getElementById('adp-compare-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 200;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-compare-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  return { ctx, W, H, decadeArr, rainMonthly };
}

// ── メイン描画 ──
function _adpRenderGrowthCompare(cropId) {
  const g = _adpCompareSetup();
  if (!g) return;

  const { ctx, W, H, decadeArr } = g;
  const legendEl    = document.getElementById('adp-compare-legend');
  const crop        = _adpGrowthFindCrop(cropId);
  const currentMode = currentAreaData?.cultivationMode || 'openField';
  const todayDecade = _adpGanttTodayDecade();

  // 作物未選択
  if (!crop) {
    ctx.fillStyle = 'rgba(90,122,92,0.7)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('作物を選択してください', W / 2, H / 2);
    if (legendEl) legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
    return;
  }

  // ── 各方式のPhenology結果を取得 ──
  const modeResults = _CMP_MODES.map(m => {
    if (typeof Phenology === 'undefined') return { ...m, wins: [] };
    const wins = Phenology.sowingWindows(decadeArr, crop, m.key);
    return { ...m, wins };
  });

  // ── レイアウト ──
  // 行数：3方式（播種/定植適期 + 収穫予測で各方式1行 = 計3行）
  const rows = _CMP_MODES.map(m => m.label);
  const PAD  = { top: 18, right: 8, bottom: 22, left: 46 };
  const { gW, gH } = _adpGanttDrawAxes(ctx, W, H, PAD);

  _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade);
  _adpGanttDrawRowLabels(ctx, PAD, gH, rows);

  // ── 各方式を描画 ──
  modeResults.forEach((m, rowIdx) => {
    const isActive = (m.key === currentMode);

    if (m.wins.length === 0) {
      // 適期なし → 「—」テキストを行中央に表示
      const rowH = gH / _CMP_MODES.length;
      const cy   = PAD.top + rowH * rowIdx + rowH / 2 + 3;
      ctx.save();
      ctx.fillStyle = 'rgba(143,170,145,0.4)';
      ctx.font      = '9px Noto Sans JP, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('この方式では適期なし', PAD.left + gW / 2, cy);
      ctx.restore();
      return;
    }

    // 播種/定植適期バー（上位3件：濃→薄）
    m.wins.slice(0, 3).forEach((win, rank) => {
      const alpha  = isActive
        ? (rank === 0 ? 0.88 : 0.38 - rank * 0.05)
        : (rank === 0 ? 0.60 : 0.22 - rank * 0.05);
      const mStart = Math.floor(win.startDecade / 3);
      const mEnd   = Math.floor(win.endDecade   / 3);
      for (let mo = mStart; mo <= Math.min(mEnd, 11); mo++) {
        _adpGanttDrawBar(ctx, PAD, gW, gH, _CMP_MODES.length, rowIdx, mo, m.color, alpha);
      }
    });

    // 収穫予測マーカー（1位のみ）
    const best = m.wins[0];
    if (best.harvestDecade != null) {
      _adpGanttDrawHarvestDot(
        ctx, PAD, gW, gH, _CMP_MODES.length, rowIdx,
        best.harvestDecade,
        isActive ? 'rgba(167,139,250,0.95)' : 'rgba(167,139,250,0.55)'
      );
    }

    // 現在選択中の方式は行全体に強調枠を追加
    if (isActive) {
      const rowH = gH / _CMP_MODES.length;
      const y    = PAD.top + rowH * rowIdx;
      ctx.save();
      ctx.strokeStyle = m.color.replace('1)', '0.6)');
      ctx.lineWidth   = 2;
      ctx.strokeRect(PAD.left + 1, y + 1, gW - 2, rowH - 2);
      ctx.restore();
    }
  });

  // ── 凡例 ──
  if (legendEl) {
    const modeItems = modeResults.map(m => {
      const best = m.wins[0];
      const isActive = m.key === currentMode;
      const sowLabel     = best ? Phenology.decadeLabel(best.startDecade) : null;
      const sowEndLabel  = best ? Phenology.decadeLabel(best.endDecade)   : null;
      const harvestLabel = (best && best.harvestDecade != null)
        ? Phenology.decadeLabel(best.harvestDecade) : null;
      const detail = sowLabel
        ? `${sowLabel}〜${sowEndLabel}` + (harvestLabel ? ` → 収穫 ${harvestLabel}` : '')
        : '適期なし';
      const activeStyle = isActive ? 'font-weight:600;color:var(--text)' : '';
      return `<span class="adp-tl-item" style="${activeStyle}"><span class="adp-tl-dot" style="background:${m.color}"></span>${m.label} ${detail}${isActive ? '（選択中）' : ''}</span>`;
    }).join('');

    legendEl.innerHTML =
      modeItems
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>`
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.8)"></span>収穫予測</span>`;
  }
}
// ═══════════════════════════════════════════
//  🌱 栽植設計ペイン
// ═══════════════════════════════════════════

/**
 * 汎用debounceヘルパー。同一keyの呼び出しは最後の1回だけ、delay[ms]後に実行される。
 * 畝設計関連の数値入力（栽植設計カード・ハウスマージン設定）で、連続入力時の
 * 再計算・DOM更新・保存処理を間引くために使用する（入力値そのものの代入は即時実行し、
 * ここでdebounceするのは「重い処理」のみとする）。
 * @param {string} key - タイマー識別キー（同じkeyの先行タイマーはキャンセルされる）
 * @param {Function} fn - delay後に実行する処理
 * @param {number} [delay=300] - 遅延[ms]
 */
const _adpDebounceTimers = new Map();
function _adpDebounce(key, fn, delay = 300) {
  const existing = _adpDebounceTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    _adpDebounceTimers.delete(key);
    fn();
  }, delay);
  _adpDebounceTimers.set(key, timer);
}

// ═══════════════════════════════════════════
//  栽植設計の計算・ジオメトリ取得ロジックは js/adpPlantingLogic.js（PlantingLogic）に分離済み。
//  initDesign / isProvisional / applyProvisionalDefaults / effectivePitchCm / deriveRidgeWidths /
//  migrateLegacyWidthFields / getFieldPolygon / getEffectiveFieldGeometry / recalcAllBands /
//  recalcAnalysisRidgeSegments / calcPlanting / areaWarn は全て PlantingLogic.xxx(...) を直接呼ぶこと。
// ═══════════════════════════════════════════

/**
 * エリア共通の畝方向（meta.ridgeBaseDirection）を localStorage / Firestore に永続化する。
 * _awSaveFarmCond() と同じ書き込みパターン（該当エリアのmetaサブフィールドのみ更新）。
 * @param {string} areaId
 */
function _adpSaveRidgeBaseDirection(areaId) {
  if (!areaId || !_adpArea) return;
  const dir = _adpArea.meta?.ridgeBaseDirection || null;

  try {
    const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
    const idx = stored.findIndex(a => a.id === areaId);
    if (idx !== -1) {
      if (!stored[idx].meta) stored[idx].meta = {};
      stored[idx].meta.ridgeBaseDirection = dir;
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
    }
  } catch(e) { console.warn('_adpSaveRidgeBaseDirection localStorage:', e); }

  if (typeof db !== 'undefined' && db && !String(areaId).startsWith('local_')) {
    db.collection('areas').doc(areaId).update({
      'meta.ridgeBaseDirection': dir,
    }).catch(e => console.warn('_adpSaveRidgeBaseDirection Firestore:', e));
  }
}

/**
 * ハウスマージン設定を localStorage に保存する。
 * @param {string} areaId
 */
function _adpSaveHouseMargin(areaId) {
  if (!areaId) return;
  if (_adpHouseMargin) {
    localStorage.setItem(`adpHouseMargin_${areaId}`, JSON.stringify(_adpHouseMargin));
  } else {
    localStorage.removeItem(`adpHouseMargin_${areaId}`);
  }
}

/**
 * 指定した圃場の辺を畝方向として確定する。
 * 辺リストの直接タップ、およびローテートボタンの両方から呼ばれる。
 * （旧 _adpStartAreaRidgeDir のコールバック内ロジックを踏襲）
 * @param {number} edgeIndex - 選択する辺のインデックス（polygon[edgeIndex] → polygon[edgeIndex+1]）
 */
function _adpSelectRidgeDirEdge(edgeIndex, silent) {
  if (!_adpArea) return;
  const polygon = PlantingLogic.getFieldPolygon(_adpArea);
  if (!polygon || !Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= polygon.length) return;

  const p1 = polygon[edgeIndex];
  const p2 = polygon[(edgeIndex + 1) % polygon.length];

  if (!_adpArea.meta) _adpArea.meta = {};
  _adpArea.meta.ridgeBaseDirection = { edgeIndex, p1, p2 };
  _adpSaveRidgeBaseDirection(_adpArea.id || _adpArea.name);

  // 畝方向を新規設定・再設定するたび、未入力の実務作物フィールドにcropDB標準値を暫定セット
  // （既存値は上書きしない。設定済みフィールドは対象外なので毎回発火しても無害）
  if (Array.isArray(_adpPracticecrops)) {
    _adpPracticecrops.forEach(entry => {
      if (!entry.plantingDesign) entry.plantingDesign = PlantingLogic.initDesign(entry.cropId);
      PlantingLogic.applyProvisionalDefaults(entry.plantingDesign, entry.cropId);
    });
  }

  if (PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin)) {
    _adpSavePracticecrops(_adpArea?.id || _adpArea?.name || '');
  }
  if (_adpAnalysisPlantingDesign) {
    const pitchCm = PlantingLogic.effectivePitchCm(_adpAnalysisPlantingDesign);
    PlantingLogic.recalcAnalysisRidgeSegments(_adpAnalysisPlantingDesign, pitchCm, _adpArea, _adpHouseMargin);
  }

  if (!silent) {
    _adpRenderPlantingPane();
    showToast(`辺${edgeIndex + 1}を畝方向に設定しました`, 'green');
  }
}

/**
 * 畝方向の辺を次の辺へローテーションする（「↻ 違う辺にする」ボタン）。
 * ハウスマージン側の _adpRotateEntranceEdge と対になる、畝方向側の実装。
 */
function _adpRotateRidgeDirEdge() {
  if (!_adpArea) return;
  const polygon = PlantingLogic.getFieldPolygon(_adpArea);
  if (!polygon || typeof RidgeGeometry === 'undefined') return;
  const edges = RidgeGeometry.getPolygonEdges(polygon);
  if (!edges.length) return;

  const dir = _adpArea.meta?.ridgeBaseDirection;
  const baseIndex = (dir && Number.isInteger(dir.edgeIndex)) ? dir.edgeIndex : -1;
  const nextIndex = _adpNextEdgeIndex(baseIndex, edges.length);
  _adpSelectRidgeDirEdge(nextIndex);
}

/**
 * Step8-7後半（v4仕様5.）：畝方向・常識的自動判定。
 * meta.ridgeBaseDirection が未設定の場合のみ、圃場ポリゴンの最長辺と平行な方向を
 * 畝方向として自動的に確定する（RidgeGeometry.getLongestEdgeIndex を使用）。
 * 完全自動設計ボタン・個別設定ルートの「自動設計」実行の両方から、AutoDesign.run() の
 * 直前に必ず呼び出す（AutoDesign.run は ridgeBaseDirection 未設定だとNO_RIDGE_DIRECTIONで失敗するため）。
 * 既に設定済みの場合は何もしない（ユーザーが手動で選んだ辺を上書きしない）。
 * silent=trueでトースト表示・再描画を抑制するため、呼び出し元の一連の処理の最後で
 * まとめて1回だけ再描画すればよい。
 * @returns {boolean} 自動判定を実行したか（すでに設定済み／判定不能ならfalse）
 */
function _adpEnsureRidgeDirAutoDetected() {
  if (!_adpArea) return false;
  if (_adpArea.meta?.ridgeBaseDirection) return false; // 既に設定済みなら何もしない
  if (typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.getLongestEdgeIndex !== 'function') return false;

  const polygon = PlantingLogic.getFieldPolygon(_adpArea);
  if (!polygon || polygon.length < 3) return false;

  const longestIndex = RidgeGeometry.getLongestEdgeIndex(polygon);
  if (longestIndex < 0) return false;

  _adpSelectRidgeDirEdge(longestIndex, true); // silent：トースト・再描画は呼び出し元でまとめて行う
  return true;
}

// ═══════════════════════════════════════════
//  🌾 圃場マージン設定UI（旧ハウスマージン設定）
//  （圃場マージン再設計・栽植プレビュー統合仕様書 Step2。
//    ridgeGeometry.js の computeHouseGeometry / getPolygonEdges /
//    calcRidges(...,holes) は既存実装済みのため、ここではUIと配線のみを行う）
// ═══════════════════════════════════════════

/**
 * 【Step8-3（畝断面図の統合とプレビュー内入力欄コンパクト化 仕様書）】
 * 入力チップ（<input>/トグルボタン）のfocus/blurに連動し、平面図SVG内の対応要素に
 * plt-highlight-blink クラスを付与/除去する汎用ハイライト関数。
 * - 常時表示要素（marginline/entrance/opposite）：blink付与で明滅「強調」を追加するだけ
 * - 辺ハイライト（edgehighlight）：CSS側でデフォルト非表示のため、blink付与時のみ表示される
 * @param {string} selector - ハイライト対象のCSSセレクタ（例: '.plt-shapesvg-marginline'）
 * @param {boolean} on - true=付与（フォーカス時）, false=除去（フォーカス外れ時）
 */
function _adpHighlightPreviewTarget(selector, on) {
  const root = document.getElementById('planting-result');
  if (!root) return;
  root.querySelectorAll(selector).forEach(el => {
    el.classList.toggle('plt-highlight-blink', on);
  });
}

/**
 * 圃場マージン設定パネルのHTMLを生成する（数値入力のみ）。
 * 表示条件は撤廃済み：全cultivationMode（露地含む）で表示する。
 * 入口辺の選択UI（ミニSVG・ローテート）は Step3→Step7-3を経て辺選択トグルバー（_adpBuildEdgeToggleBar）へ移設済み。
 *
 * 【圃場マージン再設計・栽植プレビュー統合仕様書 Step7-4】
 * 数値入力グリッドを、畝設計UI統合仕様書Step5と同じ `.plt-detail-accordion` 構造
 * （トグルボタン＋body、デフォルト閉、開閉はDOM上のみ保持）でラップする。
 * 開閉ハンドラは既存の汎用関数 `_adpToggleDetailAccordion(btn)`
 * （`btn.closest('.plt-detail-accordion')` で動く汎用実装）をそのまま流用し、新規関数は追加しない。
 */
/**
 * 【Step8-2（畝断面図の統合とプレビュー内入力欄コンパクト化 仕様書）】
 * アコーディオン（.plt-detail-accordion）を廃止し、常時展開の横1行チップ列
 * （ラベル＋数値＋単位を1行に収めた.plt-input-chip）に変更した。
 * 開閉トグル関連（_adpToggleDetailAccordion）はここでは使わなくなったが、
 * 同関数は他のカード内詳細設定（畝幅アコーディオン等）でも使う汎用関数のため削除しない。
 */
function _adpBuildHouseMarginSection() {
  const hm = _adpHouseMargin || {};

  return `
    <div class="plt-housemargin-section">
      <div class="plt-housemargin-title">🌾 圃場マージン設定（外周・入口奥行き・反対側）</div>
      <div class="plt-inputchip-row">
        <div class="plt-input-chip">
          <span class="plt-chip-label">外膜マージン</span>
          <div class="plt-chip-inputwrap">
            <input type="number" class="plt-chip-input" min="0" step="0.1" value="${hm.frameMarginM ?? ''}" placeholder="0.5"
              oninput="_adpUpdateHouseMarginField('frameMarginM', this.value)"
              onfocus="_adpHighlightPreviewTarget('.plt-shapesvg-marginline', true)"
              onblur="_adpHighlightPreviewTarget('.plt-shapesvg-marginline', false)">
            <span class="plt-chip-unit">m</span>
          </div>
        </div>
        <div class="plt-input-chip">
          <span class="plt-chip-label">入口奥行き</span>
          <div class="plt-chip-inputwrap">
            <input type="number" class="plt-chip-input" min="0" step="0.1" value="${hm.entranceDepthM ?? ''}" placeholder="1.0"
              oninput="_adpUpdateHouseMarginField('entranceDepthM', this.value)"
              onfocus="_adpHighlightPreviewTarget('.plt-shapesvg-entrance', true)"
              onblur="_adpHighlightPreviewTarget('.plt-shapesvg-entrance', false)">
            <span class="plt-chip-unit">m</span>
          </div>
        </div>
        <div class="plt-oppositedepth-wrap" data-opposite-depth-block>
          ${_adpBuildOppositeDepthInner()}
        </div>
      </div>
    </div>`;
}

/**
 * 「反対側奥行き（oppositeDepthM）」入力ブロックのHTMLを生成する。
 * チェックボックスON＝「入口と同じ値を使う」＝ oppositeDepthM を null にして
 * ridgeGeometry.js側のフォールバック（entranceDepthMを共通値として使用）に委ねる。
 * チェックボックスOFF＝個別の数値を入力（入力欄は有効化）。
 * このブロックはチェックボックス切替時に data-opposite-depth-block ごと部分再描画される。
 *
 * 【Step8-2】チェックボックスはチップの外・上に小さく残し、チップ自体は数値入力のみにする。
 */
function _adpBuildOppositeDepthInner() {
  const hm = _adpHouseMargin || {};
  const isSame = (hm.oppositeDepthM === undefined || hm.oppositeDepthM === null || hm.oppositeDepthM === '');

  return `
    <label class="plt-checkbox-row plt-checkbox-row-compact">
      <input type="checkbox" ${isSame ? 'checked' : ''} onchange="_adpToggleOppositeSameDepth(this.checked)">
      入口と同じ
    </label>
    <div class="plt-input-chip">
      <span class="plt-chip-label">反対側奥行き</span>
      <div class="plt-chip-inputwrap">
        <input type="number" class="plt-chip-input" min="0" step="0.1"
          value="${isSame ? '' : (hm.oppositeDepthM ?? '')}"
          placeholder="1.0"
          ${isSame ? 'disabled' : ''}
          oninput="_adpUpdateHouseMarginField('oppositeDepthM', this.value)"
          onfocus="_adpHighlightPreviewTarget('.plt-shapesvg-opposite', true)"
          onblur="_adpHighlightPreviewTarget('.plt-shapesvg-opposite', false)">
        <span class="plt-chip-unit">m</span>
      </div>
    </div>`;
}


/**
 * 「入口と同じ値を使う」チェックボックスの切替ハンドラ。
 * ON：oppositeDepthM を null にする（ridgeGeometry.js側でentranceDepthMを自動使用）
 * OFF：入力欄を有効化し、現在のentranceDepthMを初期値としてセット（空欄より親切なため）
 */
function _adpToggleOppositeSameDepth(checked) {
  if (!_adpArea) return;
  if (!_adpHouseMargin) _adpHouseMargin = { entranceEdgeIndex: -1 };
  _adpHouseMargin.oppositeDepthM = checked ? null : (_adpHouseMargin.entranceDepthM ?? 0);

  const areaId = _adpArea?.id || _adpArea?.name || '';
  _adpSaveHouseMargin(areaId);

  if (PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin)) {
    _adpSavePracticecrops(areaId);
  }
  if (_adpAnalysisPlantingDesign) {
    const pitchCm = PlantingLogic.effectivePitchCm(_adpAnalysisPlantingDesign);
    PlantingLogic.recalcAnalysisRidgeSegments(_adpAnalysisPlantingDesign, pitchCm, _adpArea, _adpHouseMargin);
  }

  const block = document.querySelector('#planting-result [data-opposite-depth-block]');
  if (block) block.innerHTML = _adpBuildOppositeDepthInner();

  // 反対側奥行きの実効値は辺選択トグルバー側の実効面積表示にも影響するため、そちらも更新する
  // （Step7-3で入口辺バーがトグルバーに統合された際に更新漏れしていたものをStep7-4で修正）
  _adpRefreshEdgeToggleBar();
  _adpRefreshAllCardsAfterGeometryChange();
}

// ═══════════════════════════════════════════
//  🔀 辺選択トグルバー（入口辺／畝方向を1つに統合）
//  （圃場マージン再設計・栽植プレビュー統合仕様書 Step7-3）
//  Step3の _adpBuildEdgeSelectionPanel は入口辺・畝方向を2本のバー（各々ミニSVG付き）
//  として常時2つ表示していたが、辺のハイライト自体はStep7-1で統合プレビューSVG側に
//  実装済み（_adpUnifiedPreviewEdgeMode読取）のため、ミニSVGの重複表示をやめ、
//  🚪/📐トグルチップで「今どちらの辺を編集しているか」を切り替える1本のバーに統合する。
//  ハイライト表示は実務側の統合プレビュー（_adpBuildUnifiedRidgePreviewSVG）に一本化。
// ═══════════════════════════════════════════

/**
 * 入口辺のステータス文言のみを生成する（ミニSVGなし）。
 * _adpBuildEntranceEdgeBar の表示ロジックからテキスト部分だけを切り出したもの。
 * @param {Array<{lat:number,lng:number}>} polygon
 * @returns {string}
 */
function _adpBuildEntranceEdgeStatusText(polygon) {
  if (!polygon || typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.computeHouseGeometry !== 'function') {
    return '圃場データが取得できません';
  }
  const hm    = _adpHouseMargin || {};
  const geo   = RidgeGeometry.computeHouseGeometry(polygon, hm);
  const edges = RidgeGeometry.getPolygonEdges(polygon);
  const entranceIdx  = geo.entranceEdgeIndex;
  const entranceEdge = edges.find(e => e.index === entranceIdx);

  const statusText = entranceEdge
    ? `入口辺：辺${entranceIdx + 1}（長さ${entranceEdge.lengthM}m）`
    : '入口辺：未計算（外膜マージン等を入力してください）';
  const areaText = (geo.availableAreaSqm != null && geo.availableAreaSqm > 0)
    ? `実効面積：${geo.availableAreaSqm}㎡` : '';
  return `${statusText}${areaText ? '／' + areaText : ''}`;
}

/**
 * 畝方向のステータス文言のみを生成する（ミニSVGなし）。
 * _adpBuildAreaRidgeDirBar の表示ロジックからテキスト部分だけを切り出したもの。
 * Step7-3の確認事項：「クリア」ボタンは廃止（↻ローテートで別の辺に切り替えれば充分なため）。
 * @param {Array<{lat:number,lng:number}>} polygon
 * @returns {string}
 */
function _adpBuildRidgeDirStatusText(polygon) {
  if (!polygon || typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.getPolygonEdges !== 'function') {
    return '圃場データが取得できません';
  }
  const dir   = _adpArea?.meta?.ridgeBaseDirection;
  const edges = RidgeGeometry.getPolygonEdges(polygon);

  const hasValidEdgeIndex = !!dir && Number.isInteger(dir.edgeIndex) && dir.edgeIndex >= 0 && dir.edgeIndex < edges.length;
  const hasLegacyDir = !!dir && !hasValidEdgeIndex && dir.p1 && dir.p2;

  if (hasValidEdgeIndex) return `✓ 辺${dir.edgeIndex + 1}を畝方向に設定中`;
  if (hasLegacyDir) return '✓ 設定済み（旧形式・↻で選び直すと更新されます）';
  return '未設定（畝の自動計算にはエリア共通の畝方向が必要です）';
}

/**
 * 🚪/📐トグルチップ＋↻ローテートボタン＋選択中モードのみのステータス行を
 * 1本のバーとして生成する（Step7-3）。
 * どちらのモードが選択中かは _adpUnifiedPreviewEdgeMode（Step7-1で導入済みの状態変数。
 * 統合プレビューのハイライト対象と共用）で管理する。
 */
function _adpBuildEdgeToggleBar() {
  const polygon = PlantingLogic.getFieldPolygon(_adpArea);
  if (!polygon || typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.getPolygonEdges !== 'function') {
    return `
      <div class="plt-edgetoggle-bar">
        <div class="plt-edgetoggle-chips">
          <button type="button" class="plt-edgetoggle-chip plt-edgetoggle-chip-active" disabled>🚪 入口辺</button>
          <button type="button" class="plt-edgetoggle-chip" disabled>📐 畝方向</button>
        </div>
        <span class="plt-edgetoggle-status">圃場データが取得できません</span>
      </div>`;
  }

  const mode = _adpUnifiedPreviewEdgeMode === 'ridgedir' ? 'ridgedir' : 'entrance';
  const statusText = mode === 'ridgedir'
    ? _adpBuildRidgeDirStatusText(polygon)
    : _adpBuildEntranceEdgeStatusText(polygon);

  return `
    <div class="plt-edgetoggle-bar">
      <div class="plt-edgetoggle-chips">
        <button type="button" class="plt-edgetoggle-chip ${mode === 'entrance' ? 'plt-edgetoggle-chip-active' : ''}" onclick="_adpSetUnifiedPreviewEdgeMode('entrance')"
          onfocus="_adpHighlightPreviewTarget('.plt-shapesvg-edgehighlight', true)"
          onblur="_adpHighlightPreviewTarget('.plt-shapesvg-edgehighlight', false)">🚪 入口辺</button>
        <button type="button" class="plt-edgetoggle-chip ${mode === 'ridgedir' ? 'plt-edgetoggle-chip-active' : ''}" onclick="_adpSetUnifiedPreviewEdgeMode('ridgedir')"
          onfocus="_adpHighlightPreviewTarget('.plt-shapesvg-edgehighlight', true)"
          onblur="_adpHighlightPreviewTarget('.plt-shapesvg-edgehighlight', false)">📐 畝方向</button>
      </div>
      <div class="plt-edgetoggle-footer">
        <button type="button" class="plt-edgetoggle-rotate" onclick="_adpRotateActiveEdge()">↻ 違う辺にする</button>
        <span class="plt-edgetoggle-status">${statusText}</span>
      </div>
    </div>`;
}

/**
 * 統合プレビューのハイライト対象辺モード（'entrance'／'ridgedir'）を切り替える（Step7-3）。
 * トグルチップから呼ばれる。トグルバー自身のステータス表示と、実務側の統合プレビューの
 * ハイライトを両方再描画する（分析側は統合プレビュー自体が無いためトグルバーのみ更新）。
 * @param {string} mode - 'entrance' または 'ridgedir'
 */
function _adpSetUnifiedPreviewEdgeMode(mode) {
  if (mode !== 'entrance' && mode !== 'ridgedir') return;
  if (_adpUnifiedPreviewEdgeMode === mode) return;
  _adpUnifiedPreviewEdgeMode = mode;
  _adpRefreshEdgeToggleBar();
  if (_adpCurrentSeg !== 'analysis') _adpRefreshUnifiedPreview();

  // Step8-3：トグルバーは outerHTML 差し替えでボタンDOMごと作り直されるため、
  // クリックで得たfocusが失われる。新しいアクティブボタンへfocus()を呼び直すことで
  // 辺ハイライト（デフォルト非表示・フォーカス時のみ表示）の継続表示を保つ。
  const activeChip = document.querySelector('#planting-result .plt-edgetoggle-chip-active');
  if (activeChip) activeChip.focus();
}

/** 辺選択トグルバーだけを部分更新する（Step7-3）。 */
function _adpRefreshEdgeToggleBar() {
  const bar = document.querySelector('#planting-result .plt-edgetoggle-bar');
  if (bar) bar.outerHTML = _adpBuildEdgeToggleBar();
}

/**
 * 現在トグルで選択中のモードに応じて、入口辺／畝方向辺のどちらかをローテーションする（Step7-3）。
 * - 畝方向側（_adpRotateRidgeDirEdge）は内部で _adpRenderPlantingPane() を呼び全体再描画するため、
 *   トグルバーも自動的に最新化される。
 * - 入口辺側（_adpRotateEntranceEdge）は部分更新のみのため、トグルバーはここで個別に更新する。
 */
function _adpRotateActiveEdge() {
  if (_adpUnifiedPreviewEdgeMode === 'ridgedir') {
    _adpRotateRidgeDirEdge();
  } else {
    _adpRotateEntranceEdge(); // 内部で _adpRefreshEdgeToggleBar() を呼ぶため、ここでの追加更新は不要
  }
}

/**
 * 圃場マージン入力欄の変更ハンドラ（外膜マージン・入口奥行き・反対側奥行き）。
 * 全帯・分析側の畝を再計算し、プレビュー部分＋各カードの結果表示のみを部分更新する
 * （入力欄自体は再描画しないため、typingにより入力フォーカスを失わない）。
 * 反対側奥行きのチェックボックス切替は _adpToggleOppositeSameDepth 側で処理する。
 */
function _adpUpdateHouseMarginField(field, value) {
  if (!_adpArea) return;
  if (!_adpHouseMargin) _adpHouseMargin = { entranceEdgeIndex: -1 };
  // ①負の値ガード：入力値は即座に0未満を0へ丸める（空文字＝未入力はnullのまま許容）
  _adpHouseMargin[field] = value === '' ? null : Math.max(0, Number(value) || 0);

  const areaId = _adpArea?.id || _adpArea?.name || '';

  // ②連続入力時の保存・全帯再計算・プレビュー/カード再描画を300ms間引き
  _adpDebounce('housemargin', () => {
    _adpSaveHouseMargin(areaId);

    if (PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin)) {
      _adpSavePracticecrops(areaId);
    }
    if (_adpAnalysisPlantingDesign) {
      const pitchCm = PlantingLogic.effectivePitchCm(_adpAnalysisPlantingDesign);
      PlantingLogic.recalcAnalysisRidgeSegments(_adpAnalysisPlantingDesign, pitchCm, _adpArea, _adpHouseMargin);
    }

    // 数値変更は辺選択トグルバー側の実効面積表示にも影響するため、そちらを更新する
    // （Step7-3で入口辺バーがトグルバーに統合された際に更新漏れしていたものをStep7-4で修正）
    _adpRefreshEdgeToggleBar();
    _adpRefreshAllCardsAfterGeometryChange();
  }, 300);
}

/**
 * 【汎用】辺インデックスを次の辺へ進める純粋関数（入口辺・畝方向共通）。
 * baseIndexが未確定（-1やnull等）の場合は0番の辺から開始する。
 * （畝設計UI統合仕様書 セクションA-1：ローテート操作の汎用化）
 * @param {number} baseIndex - 現在の辺インデックス（未選択なら-1等）
 * @param {number} edgeCount - 圃場の辺の総数
 * @returns {number} 次の辺インデックス（edgeCountが0ならそのまま-1を返す）
 */
function _adpNextEdgeIndex(baseIndex, edgeCount) {
  if (!edgeCount) return -1;
  const base = Number.isInteger(baseIndex) && baseIndex >= 0 ? baseIndex : 0;
  return (base + 1) % edgeCount;
}

/** 入口辺を次の辺へローテーションする（「違う辺にする」ボタン）。 */
function _adpRotateEntranceEdge() {
  if (!_adpArea) return;
  const polygon = PlantingLogic.getFieldPolygon(_adpArea);
  if (!polygon || typeof RidgeGeometry === 'undefined') return;
  const edges = RidgeGeometry.getPolygonEdges(polygon);
  if (!edges.length) return;

  if (!_adpHouseMargin) _adpHouseMargin = {};
  let baseIndex = Number.isInteger(_adpHouseMargin.entranceEdgeIndex) ? _adpHouseMargin.entranceEdgeIndex : -1;
  if (baseIndex < 0) {
    const geo = RidgeGeometry.computeHouseGeometry(polygon, _adpHouseMargin);
    baseIndex = geo.entranceEdgeIndex >= 0 ? geo.entranceEdgeIndex : 0;
  }
  _adpHouseMargin.entranceEdgeIndex = _adpNextEdgeIndex(baseIndex, edges.length);

  const areaId = _adpArea?.id || _adpArea?.name || '';
  _adpSaveHouseMargin(areaId);

  if (PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin)) {
    _adpSavePracticecrops(areaId);
  }
  if (_adpAnalysisPlantingDesign) {
    const pitchCm = PlantingLogic.effectivePitchCm(_adpAnalysisPlantingDesign);
    PlantingLogic.recalcAnalysisRidgeSegments(_adpAnalysisPlantingDesign, pitchCm, _adpArea, _adpHouseMargin);
  }

  _adpRefreshEdgeToggleBar();
  _adpRefreshAllCardsAfterGeometryChange();
}

/**
 * ハウスマージン変更後、現在表示中の全カード（実務側は複数、分析側は1枚）の
 * 畝ステータス行・計算結果だけを部分更新する（入力欄は触らない）。
 * 実務側では、帯・畝の実位置が変わり得るため統合プレビュー（Step4）も合わせて更新する。
 */
function _adpRefreshAllCardsAfterGeometryChange() {
  const seg = _adpCurrentSeg === 'analysis' ? 'analysis' : 'practice';
  document.querySelectorAll('#planting-result .plt-card').forEach(card => {
    const cropId = card.dataset.cropId;
    if (!cropId) return;
    const design = _adpGetDesignFor(seg, cropId);
    if (!design) return;
    _adpRefreshRidgeDirRow(card, cropId, seg, design);
    const calc = PlantingLogic.calcPlanting(design);
    const resultEl = card.querySelector('.plt-result');
    if (resultEl) resultEl.innerHTML = _adpBuildPlantingResultHTML(calc, null, cropId);
  });
  if (seg === 'practice') _adpRefreshUnifiedPreview();
}

/**
 * Step7-5（圃場マージン再設計・栽植プレビュー統合仕様書）：
 * 占有率legend／辺選択トグル／統合畝プレビュー（実務側のみ）／圃場マージン設定の4部品を
 * 常に同じ並び順で1つに集約する。空状態（分析側：作物未選択／実務側：作物0件）でも
 * 4部品すべてを統一して表示する（圃場の形・辺選択トグルの効果を空状態でも確認できるようにする）。
 * 並び順：占有率legend → 辺選択トグル → （実務側のみ）統合畝プレビュー → 圃場マージン設定
 *
 * 【Step8-7（畝断面図まわり入力UX再設計 仕様書）／Step8-7後半（4タブ構成）】
 * 実務側（isAnalysis=false）は「自動設計／調整／描画／作物詳細」の4タブ（_adpBuildPlantingMainTabsPanel）
 * に一本化する。分析側は_bandPolygonを持たず本仕様書の対象外のため、従来どおりの並びを維持する（変更なし）。
 */
function _adpBuildUnifiedFieldPanel(isAnalysis) {
  if (isAnalysis) {
    // 分析側：Step8-7対象外。既存の並び・ロジックを変更しない。
    return _adpBuildRatioLegendRow(true)
      + _adpBuildEdgeToggleBar()
      + _adpBuildHouseMarginSection();
  }
  // 実務側：占有率legend（変更なし）＋ 4タブ構成本体
  return _adpBuildRatioLegendRow(false)
    + _adpBuildPlantingMainTabsPanel();
}

/**
 * Step8-1（〜Step8-6までの経緯）：パネルA（圃場平面図）。
 * 占有率legend以外の平面図系3つ（辺選択トグル／統合畝プレビューSVG／圃場マージン設定）。
 * Step8-7では表示トグルが「全体」の時にこの内容をそのまま差し込む
 * （既存の平面図の構造・ロジックは変更しない）。
 */
function _adpBuildFieldPanelA() {
  return `
    <div class="plt-panel plt-panel-a" data-panel="a">
      <div class="plt-panel-title">🌾 圃場平面図（全体）</div>
      ${_adpBuildEdgeToggleBar()}
      ${_adpBuildUnifiedRidgePreviewSVG()}
      ${_adpBuildHouseMarginSection()}
    </div>`;
}

/**
 * Step8-7後半（畝断面図UX再設計・4タブ構成）：
 * 実務側・栽植設計ペインのメインタブ定義（表示順＝タブ順）。
 */
const ADP_PLANTING_MAIN_TABS = [
  { key: 'auto',   label: '🤖 自動設計' },
  { key: 'adjust', label: '🔧 調整' },
  { key: 'draw',   label: '📐 描画' },
  { key: 'crops',  label: '🌾 作物詳細' },
];

/**
 * Step8-7後半（サブサブタブ化）：本体（data-maintabs-body）のみを生成する。
 * タブバー自体は adp-subtabs 直下の外部バー（#adp-subsubtabs-planting、
 * _adpBuildPlantingSubsubtabsBarが生成）に一本化したため、ここでは持たない。
 * 本体は _adpSwitchPlantingUITab() / _adpRefreshRidgeInputBlock() から
 * innerHTML 差し替えで部分更新するため、_adpRenderPlantingPane() のフル再描画時のみ生成する。
 */
function _adpBuildPlantingMainTabsPanel() {
  return `
    <div class="plt-panel plt-maintabs" data-panel="maintabs">
      <div class="plt-maintabs-body" data-maintabs-body>${_adpBuildPlantingTabBody(_adpPlantingUITab)}</div>
    </div>`;
}

/**
 * サブサブタブ化：adp-subtabs直下の外部バー（#adp-subsubtabs-planting）の中身を生成する。
 * adp-subtabと同一デザイン言語（.adp-subsubtabs/.adp-subsubtab、activeクラスで下線表示）。
 * 改善⑤：8個並ぶadp-subtabsの下にさらに1段ネストするため、今どの階層にいるか
 * 見失いやすいという指摘への対処として、先頭に固定の文脈ラベル（🌱栽植設計）を置く。
 * タブボタン側だけを横スクロール対象（.adp-subsubtabs-scroll）にし、ラベルは常時表示する。
 * 栽植設計サブタブへの切替時（_adpSwitchSubTab）にのみ描画され、以後のタブ切替は
 * _adpSwitchPlantingUITab側でactiveクラスのみ更新する（バー自体の再生成はしない）。
 */
function _adpBuildPlantingSubsubtabsBar() {
  const tabsHTML = ADP_PLANTING_MAIN_TABS.map(t => `
    <button type="button" class="adp-subsubtab ${_adpPlantingUITab === t.key ? 'active' : ''}"
      data-tab-key="${t.key}" onclick="_adpSwitchPlantingUITab('${t.key}')">${t.label}</button>`).join('');
  return `
    <span class="adp-subsubtabs-label">🌱 栽植設計</span>
    <div class="adp-subsubtabs-scroll">${tabsHTML}</div>`;
}

/**
 * Step8-7後半：現在選択中のメインタブの中身だけを差し替える。
 * タブボタンのactive表示（外部サブサブタブバー側）も同時に更新する（フル再描画は行わない）。
 */
function _adpSwitchPlantingUITab(tab) {
  if (!ADP_PLANTING_MAIN_TABS.some(t => t.key === tab)) return;
  _adpPlantingUITab = tab;

  document.querySelectorAll('#adp-subsubtabs-planting .adp-subsubtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tabKey === tab);
  });
  const body = document.querySelector('#planting-result [data-maintabs-body]');
  if (body) body.innerHTML = _adpBuildPlantingTabBody(tab);
}

/**
 * Step8-7後半：タブキーに応じた中身のHTMLを返す（新規ロジックは追加せず、
 * 既存の各生成関数を機械的に振り分けるだけ）。
 * - auto  ：既存の自動設計パネルをそのまま独立タブとして表示
 * - adjust：数値入力のみ（作物タブ＋畝上比率スライダー＋入力グリッド。SVG等の表示専用要素は持たない）
 * - draw  ：表示専用（作物タブ＋拡大詳細/全体トグル＋平面図/断面図。数値入力は持たない）
 * - crops ：作物ごとに既存の計算結果カードをアコーディオンで並べるだけ
 */
function _adpBuildPlantingTabBody(tab) {
  switch (tab) {
    case 'adjust': return _adpBuildAdjustTabInner();
    case 'draw':   return _adpBuildDrawTabInner();
    case 'crops':  return _adpBuildCropsDetailTabInner();
    case 'auto':
    default:       return _adpBuildAutoDesignPanel();
  }
}

/**
 * Step8-7後半：「調整」タブの中身。数値入力のみ（畝上比率スライダー＋入力グリッド）。
 * 表示専用のSVG（平面図・断面図）は「描画」タブ側が担当するため、ここには含めない。
 * 自動設計⇔調整タブ再編（2026-07）：自動設計タブから移設した占有比率／最低比率／畝数の
 * 🔒固定・🤖自動計算チップと「残り％」バーを、アクティブ作物ぶんだけ上部に表示する
 * （_adpBuildAutoAllocBlockHTML）。
 */
function _adpBuildAdjustTabInner() {
  const crops = _adpPracticecrops || [];
  if (!crops.length) {
    return `<div class="plt-cross-section-placeholder">作物が未選択です</div>`;
  }

  const activeCropId = _adpResolveCrossSectionActiveCropId();
  const activeIdx = crops.findIndex(c => c.cropId === activeCropId);
  const activeEntry = activeIdx >= 0 ? crops[activeIdx] : crops[0];
  const design = activeEntry.plantingDesign;
  const cropId = activeEntry.cropId;

  return `
    ${_adpBuildRidgeCrossSectionTabs()}
    <div class="plt-quicklink-row">
      <button type="button" class="plt-quicklink-btn" onclick="_adpSwitchPlantingUITab('draw')">📐 断面図で確認</button>
    </div>
    ${_adpBuildAutoAllocBlockHTML(activeEntry)}
    ${design ? _adpBuildRidgeRatioSliderHTML(cropId, design) : ''}
    ${design ? _adpBuildRidgeInputGridHTML(cropId, design) : `<div class="plt-cross-section-placeholder">畝データが未計算です</div>`}`;
}

/**
 * 自動設計⇔調整タブ再編（2026-07）：占有比率／最低比率／畝数の🔒固定・🤖自動計算チップと
 * 「残り％」バーを、アクティブ作物（1件）ぶんだけ表示する。値は既存の
 * _adpAutoDesignSetCropField を経由してそのまま保存され、帯・畝の再計算は行わない
 * （非固定＝自動計算の作物への実配分反映は「🔄 自動配分を再計算・反映」ボタンで一括実行する）。
 * @param {object} entry - _adpPracticecrops の1要素（アクティブ作物）
 * @returns {string}
 */
function _adpBuildAutoAllocBlockHTML(entry) {
  if (!entry) return '';
  const cropId = entry.cropId;
  const design = entry.plantingDesign || {};
  const autoSet = design.autoDesign || { fixedRatio: false, minRatio: 0, fixedRowCount: false };
  const limits = _adpAutoDesignComputeLimits(cropId);
  const remaining = _adpAutoDesignComputeRemaining();
  const allocatedPct = Math.max(0, Math.min(100, 100 - remaining));
  const shownRows = Number(design.targetRowCount) || 0;

  const ratioBadge = autoSet.fixedRatio
    ? '<span class="autoad-value-badge autoad-value-badge-fixed">🔒 固定値</span>'
    : '<span class="autoad-value-badge autoad-value-badge-auto">🤖 自動計算</span>';
  const rowsBadge = autoSet.fixedRowCount
    ? '<span class="autoad-value-badge autoad-value-badge-fixed">🔒 固定値</span>'
    : '<span class="autoad-value-badge autoad-value-badge-auto">🤖 自動計算</span>';

  return `
    <div class="autoad-panel">
      <div class="autoad-remaining${remaining < 0 ? ' autoad-remaining-zero' : ''}">
        <div class="autoad-remaining-labels">
          <span>残り</span>
          <span class="autoad-remaining-pct">${remaining}%</span>
        </div>
        <div class="plt-ratio-bar-track">
          <div class="plt-ratio-bar-fill" style="width:${allocatedPct}%;background:${remaining < 0 ? 'var(--red)' : remaining === 0 ? 'var(--green)' : 'var(--green2)'}"></div>
        </div>
      </div>
      <div class="autoad-badge-legend">
        <span class="autoad-value-badge autoad-value-badge-fixed">🔒 固定値</span><span>＝入力した値をそのまま使用</span>
        <span class="autoad-value-badge autoad-value-badge-auto">🤖 自動計算</span><span>＝残りから自動で算出</span>
      </div>
      <div class="autoad-rows">
        <div class="autoad-row" data-crop-id="${cropId}">
          <div class="autoad-row-field ${autoSet.fixedRatio ? 'autoad-row-field--fixed' : 'autoad-row-field--auto'}">
            <span class="autoad-field-label">比率</span>
            ${_adpAutoRatioChipHTML(cropId, 'ratio', entry.ratio, limits.max, !autoSet.fixedRatio)}
            ${ratioBadge}
            <label class="autoad-fixed-label">
              <input type="checkbox" ${autoSet.fixedRatio ? 'checked' : ''}
                onchange="_adpAutoDesignSetCropField('${cropId}','fixedRatio', this.checked)"> 固定にする
            </label>
          </div>
          <div class="autoad-row-field">
            <span class="autoad-field-label">最低比率</span>
            ${_adpAutoRatioChipHTML(cropId, 'minRatio', autoSet.minRatio, limits.max, autoSet.fixedRatio)}
          </div>
          <div class="autoad-row-field ${autoSet.fixedRowCount ? 'autoad-row-field--fixed' : 'autoad-row-field--auto'}">
            <span class="autoad-field-label">畝数</span>
            ${_adpAutoRowCountChipHTML(cropId, shownRows, !autoSet.fixedRowCount)}
            ${rowsBadge}
            <label class="autoad-fixed-label">
              <input type="checkbox" ${autoSet.fixedRowCount ? 'checked' : ''}
                onchange="_adpAutoDesignSetCropField('${cropId}','fixedRowCount', this.checked)"> 固定にする
            </label>
          </div>
        </div>
      </div>
      <button type="button" class="autoad-full-btn" onclick="_adpAutoDesignFullAuto()">🔄 自動配分を再計算・反映</button>
    </div>`;
}

/**
 * Step8-7後半：「描画」タブの中身。表示専用（作物タブ＋拡大詳細図⇔全体トグル＋
 * 平面図（パネルA）／断面図SVG）。数値入力は一切持たない。
 * 平面図側の寸法線タップは一文説明のポップオーバー表示（_adpShowDimlineExplain）に変更済み。
 * 「調整」タブへの誘導（_adpNavigateToRidgeInput）はポップオーバー内の「編集する」ボタン経由。
 */
function _adpBuildDrawTabInner() {
  const crops = _adpPracticecrops || [];
  const headerHTML = `
    <div class="plt-ridgeblock-header">
      ${_adpBuildRidgeCrossSectionTabs()}
      ${_adpBuildViewToggleHTML()}
    </div>`;

  if (!crops.length) {
    const viewHTML = _adpCrossSectionViewMode === 'full'
      ? _adpBuildFieldPanelA()
      : `<div class="plt-cross-section-placeholder">作物が未選択です</div>`;
    return `
      ${headerHTML}
      <div class="plt-ridgeblock-view" data-ridgeblock-view>${viewHTML}</div>`;
  }

  const activeCropId = _adpResolveCrossSectionActiveCropId();
  const activeIdx = crops.findIndex(c => c.cropId === activeCropId);
  const activeEntry = activeIdx >= 0 ? crops[activeIdx] : crops[0];
  const activeName = _adpCropIdToName(activeEntry.cropId);
  const colorClass = `plt-cropcolor-${Math.max(activeIdx, 0) % 8}`;

  const quicklinkHTML = `
    <div class="plt-quicklink-row">
      <button type="button" class="plt-quicklink-btn" onclick="_adpSwitchPlantingUITab('adjust')">🔧 数値を調整</button>
    </div>`;

  const viewHTML = _adpCrossSectionViewMode === 'full'
    ? _adpBuildFieldPanelA()
    : _adpBuildRidgeZoomDetailSVG(activeEntry, colorClass);

  const sectionResult = _adpBuildRidgeCrossSectionSVG(activeEntry, colorClass);
  const crossSectionHTML = sectionResult.hasData ? `
      <div class="plt-cross-section-title">${activeName}</div>
      ${sectionResult.svg}` : `
      <div class="plt-cross-section-title">${activeName}</div>
      <div class="plt-cross-section-placeholder" data-crosssection-placeholder>
        ピッチ（畝幅）が未設定のため断面図を表示できません
      </div>`;

  return `
    ${headerHTML}
    ${quicklinkHTML}
    <div class="plt-ridgeblock-view" data-ridgeblock-view>${viewHTML}</div>
    <div class="plt-crosssection-body" data-crosssection-body>${crossSectionHTML}</div>`;
}

/**
 * Step8-7後半：「作物詳細」タブの中身。新規の統計計算は追加せず、既存の栽植設計カード
 * （_adpBuildPlantingCard）を作物ごとにそのままアコーディオンで並べるだけ。
 */
function _adpBuildCropsDetailTabInner() {
  const crops = _adpPracticecrops || [];
  if (!crops.length) {
    return `<div class="empty-mini">作物を追加すると栽植設計が入力できます。</div>`;
  }
  return crops.map(({ cropId, ratio, plantingDesign }, idx) => {
    const design   = plantingDesign || PlantingLogic.initDesign(cropId);
    const cropName = _adpCropIdToName(cropId);
    const isLast   = idx === crops.length - 1;
    return _adpBuildPlantingCard({ cropId, cropName, ratio, design, isLast, isAnalysis: false });
  }).join('');
}

/**
 * Step8-7：ヘッダー行右側の表示トグル（「全体」⇔「拡大詳細」）HTML。
 * デフォルトは「全体」（_adpCrossSectionViewMode初期値 'full'）。
 * UX見直し（2026-07）：全体平面図に数値を集約表示する方針のため、
 * 選択肢の並びも「全体→拡大詳細」に変更した。
 */
function _adpBuildViewToggleHTML() {
  const mode = _adpCrossSectionViewMode;
  return `
    <div class="plt-viewtoggle" role="group">
      <button type="button" class="plt-viewtoggle-btn ${mode === 'full' ? 'plt-viewtoggle-btn-active' : ''}"
        onclick="_adpSetCrossSectionViewMode('full')">🗺️ 全体</button>
      <button type="button" class="plt-viewtoggle-btn ${mode === 'zoom' ? 'plt-viewtoggle-btn-active' : ''}"
        onclick="_adpSetCrossSectionViewMode('zoom')">🔍 拡大詳細</button>
    </div>`;
}

/**
 * Step8-7：表示トグル切替ハンドラ。新ブロックのみ部分再描画する。
 */
function _adpSetCrossSectionViewMode(mode) {
  if (_adpCrossSectionViewMode === mode) return;
  _adpCrossSectionViewMode = mode;
  _adpRefreshRidgeInputBlock();
}

/**
 * 断面図・拡大詳細図で共通して使う「実畝数」を解決するヘルパー。
 * ②断面図フォールバック仕様：ridgeSegments（地図自動計算結果）があればその本数を最優先、
 * 無ければ design.targetRowCount（畝数指定方式）、それも無ければ design.rows（手動入力・
 * 後方互換フィールド）を使う。いずれも無ければ null（呼び出し側で1本表示等にフォールバック）。
 * @param {object} design - plantingDesign
 * @returns {number|null}
 */
function _adpResolveRidgeRowCount(design) {
  if (!design) return null;
  if (Array.isArray(design.ridgeSegments) && design.ridgeSegments.length > 0) {
    return design.ridgeSegments.length;
  }
  const target = Number(design.targetRowCount);
  if (target > 0) return target;
  const rows = Number(design.rows);
  if (rows > 0) return rows;
  return null;
}

/**
 * Step8-7：選択中の畝を上から見た拡大詳細図（新設・模式図）。
 * 実ポリゴン座標は使わず、design.rowWidth・ridgeRatioPctから派生した畝上幅／畝間の
 * 比率と、畝長（自動計算 or 手動入力）の値をラベル表示する模式的な平面ズーム表現とする
 * （仕様書9節：既存の平面図描画ロジックからの座標流用は行わず、計算値ベースの模式図で
 * 「選択中の畝を拡大して見ながら調整したい」というニーズに応える）。
 * ③拡大詳細図の追加ラベル（2026-07）：既存の「畝上幅」「畝長」に加え、存在する値だけを
 * 追加描画する――畝間（谷部分に寸法線＋ラベル）、畝数、条数（畝上に模式線を配置）、
 * 株間（1条上にドットを模式配置）、条間（条同士の間に寸法線）、欠株率（数値ラベルのみ）。
 * 新規CSSクラスは追加せず、既存の .plt-zoomview-dim／.plt-zoomview-label／
 * .plt-zoomview-ridge を流用する。
 * @param {object} entry - _adpPracticecrops の1要素
 * @param {string} colorClass
 * @returns {string}
 */
function _adpBuildRidgeZoomDetailSVG(entry, colorClass) {
  const design = entry?.plantingDesign;
  const derived = design ? PlantingLogic.deriveRidgeWidths(design) : null;
  if (!derived) {
    return `<div class="plt-cross-section-placeholder">ピッチ（畝幅）が未設定のため拡大詳細図を表示できません</div>`;
  }
  const calc = PlantingLogic.calcPlanting(design);
  const rowLengthLabel = calc?.rowLength != null
    ? `${calc.rowLength}m`
    : (design.rowLength != null ? `${design.rowLength}m` : '—');

  const topCm  = derived.topCm;
  const pathCm = derived.pathCm;
  const halfPathCm = Math.round(pathCm / 2 * 10) / 10;

  // ③追加ラベル対象の値（存在する値だけ描画するため、先に有無を確定しておく）
  const totalRows    = _adpResolveRidgeRowCount(design);
  const linesPerRow  = Number(design.linesPerRow) > 0 ? Number(design.linesPerRow) : null;
  const plantSpacing = Number(design.plantSpacing) > 0 ? Number(design.plantSpacing) : null;
  const rowSpacing   = Number(design.rowSpacing) > 0 ? Number(design.rowSpacing) : null;
  const missingRate  = (design.missingRate !== null && design.missingRate !== undefined && design.missingRate !== '')
    ? Number(design.missingRate) : null;

  const infoLines = [];
  if (totalRows != null)    infoLines.push(`畝数 ${totalRows}本`);
  if (linesPerRow != null)  infoLines.push(`条数 ${linesPerRow}条`);
  if (plantSpacing != null) infoLines.push(`株間 ${plantSpacing}cm`);
  if (rowSpacing != null)   infoLines.push(`条間 ${rowSpacing}cm`);
  if (missingRate != null)  infoLines.push(`欠株率 ${missingRate}%`);

  const VIEW_W = 300;
  const topY = 26, botY = 124;
  const INFO_LINE_H = 16;
  const infoTopY = botY + 30;
  // 情報ラベル行の有無に応じて下方向に可変拡張する（従来固定150 → 行数ぶん追加）。
  const VIEW_H = infoLines.length ? (infoTopY + infoLines.length * INFO_LINE_H) : 150;

  const totalCm = topCm + pathCm;
  const scale = Math.min(220 / Math.max(totalCm, 1), 6); // px/cm、最大6倍
  const bandWpx = topCm * scale, halfPathWpx = halfPathCm * scale;
  const cx = VIEW_W / 2;
  const bandX1 = cx - bandWpx / 2, bandX2 = cx + bandWpx / 2;
  const outerX1 = bandX1 - halfPathWpx, outerX2 = bandX2 + halfPathWpx;

  let svg = '';
  svg += `<rect x="${outerX1.toFixed(1)}" y="${topY}" width="${(bandX1 - outerX1).toFixed(1)}" height="${botY - topY}" class="plt-zoomview-path" />`;
  svg += `<rect x="${bandX2.toFixed(1)}" y="${topY}" width="${(outerX2 - bandX2).toFixed(1)}" height="${botY - topY}" class="plt-zoomview-path" />`;
  svg += `<rect x="${bandX1.toFixed(1)}" y="${topY}" width="${bandWpx.toFixed(1)}" height="${botY - topY}" class="plt-zoomview-ridge ${colorClass}" data-cross-crop="${entry.cropId}" />`;
  svg += `<line x1="${bandX1.toFixed(1)}" y1="${topY - 10}" x2="${bandX2.toFixed(1)}" y2="${topY - 10}" class="plt-zoomview-dim" />`;
  svg += `<text x="${cx.toFixed(1)}" y="${topY - 14}" text-anchor="middle" class="plt-zoomview-label">畝上幅 ${topCm}cm</text>`;
  svg += `<line x1="${(outerX2 + 14).toFixed(1)}" y1="${topY}" x2="${(outerX2 + 14).toFixed(1)}" y2="${botY}" class="plt-zoomview-dim" />`;
  svg += `<text x="${(outerX2 + 20).toFixed(1)}" y="${((topY + botY) / 2).toFixed(1)}" text-anchor="start" class="plt-zoomview-label">畝長 ${rowLengthLabel}</text>`;

  // 畝間：左の畝間（谷）ゾーンの縦中央に水平寸法線＋ラベルを追加。halfPathCmは片側ぶんの表示、
  // 実際の畝間（両ピッチ分）はpathCmとして併記する。
  if (pathCm > 0 && bandX1 > outerX1) {
    const pathDimY = (topY + botY) / 2;
    svg += `<line x1="${outerX1.toFixed(1)}" y1="${pathDimY.toFixed(1)}" x2="${bandX1.toFixed(1)}" y2="${pathDimY.toFixed(1)}" class="plt-zoomview-dim" />`;
    svg += `<text x="${((outerX1 + bandX1) / 2).toFixed(1)}" y="${(pathDimY - 6).toFixed(1)}" text-anchor="middle" class="plt-zoomview-label">畝間 ${pathCm}cm</text>`;
    svg += `<text x="${((outerX1 + bandX1) / 2).toFixed(1)}" y="${(pathDimY + 14).toFixed(1)}" text-anchor="middle" class="plt-zoomview-label">（片側${halfPathCm}cm）</text>`;
  }

  // 条数：畝上幅の帯の中に、条数ぶんの模式線を等間隔配置する。
  let lineXs = [];
  if (linesPerRow != null && bandWpx > 0) {
    for (let i = 1; i <= linesPerRow; i++) {
      const lx = bandX1 + (bandWpx * i) / (linesPerRow + 1);
      lineXs.push(lx);
      svg += `<line x1="${lx.toFixed(1)}" y1="${topY.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${botY.toFixed(1)}" class="plt-zoomview-dim" />`;
    }
  }

  // 株間：条（畝上の線）のうち1本を選び、その上に模式的に等間隔のドットを配置する。
  if (plantSpacing != null) {
    const dotX = lineXs.length ? lineXs[0] : cx;
    const DOT_COUNT = 5;
    for (let i = 0; i < DOT_COUNT; i++) {
      const dy = topY + ((botY - topY) * i) / (DOT_COUNT - 1);
      svg += `<circle cx="${dotX.toFixed(1)}" cy="${dy.toFixed(1)}" r="2.5" class="plt-zoomview-ridge ${colorClass}" />`;
    }
  }

  // 条間：条が2本以上ある場合、隣り合う条の間に小さな寸法線を追加する。
  if (linesPerRow != null && linesPerRow >= 2 && rowSpacing != null && lineXs.length >= 2) {
    const dimY = topY + 10;
    svg += `<line x1="${lineXs[0].toFixed(1)}" y1="${dimY.toFixed(1)}" x2="${lineXs[1].toFixed(1)}" y2="${dimY.toFixed(1)}" class="plt-zoomview-dim" />`;
  }

  // 畝数／条数／株間／条間／欠株率：存在する値だけ、図の下に数値ラベルとして並べる。
  infoLines.forEach((line, idx) => {
    svg += `<text x="${cx.toFixed(1)}" y="${(infoTopY + idx * INFO_LINE_H).toFixed(1)}" text-anchor="middle" class="plt-zoomview-label">${line}</text>`;
  });

  return `<div class="plt-zoomview-wrap"><svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" class="plt-zoomview-svg">${svg}</svg></div>`;
}

/**
 * Step8-7：畝上比率（ridgeRatioPct）スライダーHTML。ドラッグ中は _adpLiveUpdateRidgeRatio で
 * 断面図・拡大詳細図に即時反映（軽量：帯再計算なし）し、指を離した時点（change）で
 * _adpCommitRidgeRatio により保存・帯再計算（境界ギャップ）まで確定させる。
 */
function _adpBuildRidgeRatioSliderHTML(cropId, design) {
  const seg = 'practice';
  const ratio = design.ridgeRatioPct ?? 50;
  const isProv = PlantingLogic.isProvisional(design, 'ridgeRatioPct');
  const derived = PlantingLogic.deriveRidgeWidths(design);
  const topCm  = derived ? derived.topCm  : '—';
  const pathCm = derived ? derived.pathCm : '—';

  return `
    <div class="plt-ridgeratio-row" data-ridgeratio-key="${cropId}">
      <label class="plt-label">畝上比率${isProv ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
      <input type="range" class="plt-ridgeratio-slider" min="10" max="90" step="1" value="${ratio}"
        oninput="_adpLiveUpdateRidgeRatio('${seg}','${cropId}', this.value)"
        onchange="_adpCommitRidgeRatio('${seg}','${cropId}', this.value)">
      <span class="plt-ridgeratio-val">${ratio}%（畝上${topCm}cm・畝間${pathCm}cm）</span>
    </div>`;
}

/**
 * Step8-7：畝上比率スライダーのドラッグ中ハンドラ（軽量・帯再計算なし）。
 * design.ridgeRatioPct をその場で更新し、新ブロック全体（断面図・拡大詳細図・数値表示）を
 * 再描画するだけに留める（recalcAllBands呼び出しはしない＝ドラッグ中の重い再計算を避ける）。
 */
function _adpLiveUpdateRidgeRatio(seg, cropId, value) {
  const design = _adpGetDesignFor(seg, cropId);
  if (!design) return;
  design.ridgeRatioPct = Math.max(0, Math.min(100, Number(value) || 50));
  _adpUnmarkProvisional(design, 'ridgeRatioPct');

  if (seg !== 'analysis') {
    _adpRefreshRidgeInputBlock();
    return;
  }
  // 分析側：新ブロックを持たないため、比率表示テキストのみ軽量に更新する
  // （帯再計算・断面図はここでは行わず、onchange側の_adpRefreshDetailPitchDisplayに委ねる）。
  const card = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"]`);
  const valEl = card?.querySelector(`.plt-ridgeratio-row[data-ridgeratio-key="${cropId}"] .plt-ridgeratio-val`);
  if (valEl) {
    const derived = PlantingLogic.deriveRidgeWidths(design);
    valEl.textContent = `${design.ridgeRatioPct}%（畝上${derived ? derived.topCm : '—'}cm・畝間${derived ? derived.pathCm : '—'}cm）`;
  }
}

/**
 * Step8-7：畝上比率スライダーの確定ハンドラ（change＝ドラッグ終了時）。
 * 通常の入力フィールド更新経路（_adpUpdatePlantingField）に合流させ、保存・帯再計算
 * （境界ギャップはridgeRatioPctに依存するため）・統合プレビュー再描画までを行う。
 */
function _adpCommitRidgeRatio(seg, cropId, value) {
  _adpUpdatePlantingField(cropId, 'ridgeRatioPct', value, seg);
}

/**
 * Step8-7：入力グリッド（畝数・畝長・ピッチ・条数・株間・条間・欠株率）HTML。
 * 数値入力の唯一の入口（仕様書2節）。畝数・畝長は地図自動計算済みの場合は読み取り専用表示にする。
 */
function _adpBuildRidgeInputGridHTML(cropId, design) {
  const seg = 'practice';
  const mode = design.ridgeInputMode === 'count' ? 'count' : 'pitch';
  const hasAutoCalc = Array.isArray(design.ridgeSegments) && design.ridgeSegments.length > 0;
  const calc = PlantingLogic.calcPlanting(design);

  // ── 畝配置の入力方式トグル（ピッチ指定 ⇔ 畝数指定）──
  // ピッチ指定：ピッチを入力し、敷地に何本詰め込めるかを自動計算（従来方式）
  // 畝数指定：畝数を入力し、敷地幅を均等N分割してピッチを逆算（新設・偶奇問わず狙った本数を作れる）
  const modeToggleHTML = `
    <div class="plt-ridgemode-toggle" data-ridgemode-key="${cropId}">
      <button type="button" class="plt-ridgemode-btn ${mode === 'pitch' ? 'plt-ridgemode-btn-active' : ''}"
        onclick="_adpSetRidgeInputMode('${cropId}','pitch','${seg}')">📏 ピッチ指定</button>
      <button type="button" class="plt-ridgemode-btn ${mode === 'count' ? 'plt-ridgemode-btn-active' : ''}"
        onclick="_adpSetRidgeInputMode('${cropId}','count','${seg}')">🔢 畝数指定</button>
    </div>`;

  let rowsHTML, pitchHTML;
  if (mode === 'count') {
    // 畝数指定モード：畝数が入力、ピッチは逆算された自動値（読み取り専用表示）
    rowsHTML = `
        <div class="plt-input-item" data-field="targetRowCount">
          <label class="plt-label">畝数</label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" step="1" value="${design.targetRowCount ?? ''}" placeholder="例: 2"
            oninput="_adpUpdatePlantingField('${cropId}','targetRowCount',this.value,'${seg}')"><span class="plt-unit">畝</span></div>
        </div>`;
    pitchHTML = `
        <div class="plt-input-item plt-input-auto">
          <label class="plt-label">ピッチ <span class="plt-auto-badge">🔢 逆算</span></label>
          <div class="plt-auto-val">${design.rowWidth ?? '—'} cm</div>
        </div>`;
  } else {
    // ピッチ指定モード（従来）：畝数は自動計算済みなら読み取り専用、未計算なら手入力フォールバック
    rowsHTML = hasAutoCalc ? `
        <div class="plt-input-item plt-input-auto">
          <label class="plt-label">畝数 <span class="plt-auto-badge">🗺️ 自動</span></label>
          <div class="plt-auto-val">${calc?.rows ?? '—'} 畝</div>
        </div>` : `
        <div class="plt-input-item" data-field="rows">
          <label class="plt-label">畝数</label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.rows ?? ''}" placeholder="例: 10"
            oninput="_adpUpdatePlantingField('${cropId}','rows',this.value,'${seg}')"><span class="plt-unit">畝</span></div>
        </div>`;
    pitchHTML = `
        <div class="plt-input-item" data-field="rowWidth">
          <label class="plt-label">ピッチ${PlantingLogic.isProvisional(design, 'rowWidth') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.rowWidth ?? ''}" placeholder="例: 90"
            oninput="_adpUpdatePlantingField('${cropId}','rowWidth',this.value,'${seg}')"><span class="plt-unit">cm</span></div>
        </div>`;
  }

  const rowLengthHTML = hasAutoCalc ? `
        <div class="plt-input-item plt-input-auto">
          <label class="plt-label">畝長 <span class="plt-auto-badge">🗺️ 自動</span></label>
          <div class="plt-auto-val">${calc?.rowLength ?? '—'} m</div>
        </div>` : `
        <div class="plt-input-item" data-field="rowLength">
          <label class="plt-label">畝長</label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="0.1" step="0.1" value="${design.rowLength ?? ''}" placeholder="例: 20"
            oninput="_adpUpdatePlantingField('${cropId}','rowLength',this.value,'${seg}')"><span class="plt-unit">m</span></div>
        </div>`;

  const linesPerRowHTML = `
        <div class="plt-input-item" data-field="linesPerRow">
          <label class="plt-label">条数${PlantingLogic.isProvisional(design, 'linesPerRow') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.linesPerRow ?? ''}" placeholder="例: 2"
            oninput="_adpUpdatePlantingField('${cropId}','linesPerRow',this.value,'${seg}')"><span class="plt-unit">条</span></div>
        </div>`;

  const plantSpacingHTML = `
        <div class="plt-input-item" data-field="plantSpacing">
          <label class="plt-label">株間${PlantingLogic.isProvisional(design, 'plantSpacing') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.plantSpacing ?? ''}" placeholder="例: 30"
            oninput="_adpUpdatePlantingField('${cropId}','plantSpacing',this.value,'${seg}')"><span class="plt-unit">cm</span></div>
        </div>`;

  const rowSpacingHTML = `
        <div class="plt-input-item" data-field="rowSpacing">
          <label class="plt-label">条間${PlantingLogic.isProvisional(design, 'rowSpacing') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.rowSpacing ?? ''}" placeholder="例: 40"
            oninput="_adpUpdatePlantingField('${cropId}','rowSpacing',this.value,'${seg}')"><span class="plt-unit">cm</span></div>
        </div>`;

  const missingRateHTML = `
        <div class="plt-input-item" data-field="missingRate">
          <label class="plt-label">欠株率 <span class="plt-label-opt">任意</span></label>
          <div class="plt-input-wrap"><input type="number" class="plt-input" min="0" max="100" value="${design.missingRate ?? ''}" placeholder="例: 5"
            oninput="_adpUpdatePlantingField('${cropId}','missingRate',this.value,'${seg}')"><span class="plt-unit">%</span></div>
        </div>`;

  // 畝数指定モードで、敷地形状の都合により目標畝数どおりに配置できなかった場合の説明表示
  const mismatch = design._rowCountMismatch;
  const mismatchHTML = (mode === 'count' && mismatch) ? `
      <div class="plt-rowcount-mismatch">⚠️ 指定した${mismatch.target}畝は敷地の形状上そのままでは作れませんでした。実際は${mismatch.actual}畝で配置しています。</div>` : '';

  return `
    <div class="plt-ridge-inputgrid">
      ${modeToggleHTML}
      <div class="plt-input-grid plt-input-grid-4col">
        ${rowsHTML}${rowLengthHTML}${pitchHTML}${linesPerRowHTML}${plantSpacingHTML}${rowSpacingHTML}${missingRateHTML}
      </div>
      ${mismatchHTML}
    </div>`;
}

/**
 * 畝断面図SVG本体を生成する（山型シルエット最大3本・谷、表示専用）。
 * Step8-7：畝上幅・畝間は design.rowWidth・ridgeRatioPct から PlantingLogic.deriveRidgeWidths()
 * で派生算出する（旧・design.ridgeTopWidth／pathWidthの直接参照は撤去）。
 * 数値の編集は入力グリッド（_adpBuildRidgeInputGridHTML）・畝上比率スライダー
 * （_adpBuildRidgeRatioSliderHTML）に一本化されており、SVG側は表示とハイライト連動
 * （.plt-crosssection-ridge-mid／.plt-crosssection-valley-highlight）のみを担う。
 * 縦は大幅圧縮（Step8-7）。畝数が多い場合は「他◯畝 同条件」表記で省略する。
 * ②実畝数未計算時のフォールバック（2026-07）：ridgeSegments（地図自動計算結果）が空でも
 * _adpResolveRidgeRowCount() で targetRowCount／rows があればその本数（最大3本）を描画し、
 * どちらも無ければ1本のみ（単一畝の模式として）表示する。4本以上は従来通り3本＋
 * 「他◯畝 同条件」表記。
 *
 * @param {object} entry - _adpPracticecrops の1要素（{cropId, ratio, plantingDesign}）
 * @param {string} colorClass - 平面図・タブと共通の plt-cropcolor-N クラス名
 * @returns {{svg: string, hasData: boolean}}
 */
function _adpBuildRidgeCrossSectionSVG(entry, colorClass) {
  const empty = { svg: '', hasData: false };
  const design = entry?.plantingDesign;
  if (!design) return empty;
  const cropId = entry?.cropId || '';

  const derived = PlantingLogic.deriveRidgeWidths(design);
  if (!derived) return empty;
  const topCm  = derived.topCm;
  const pathCm = derived.pathCm;
  if (!(topCm > 0)) return empty;

  // ②フォールバック：実畝数（totalRows）が無ければ1本、あれば最大3本まで表示する。
  const totalRows = _adpResolveRidgeRowCount(design) || 0;
  const displayCount = totalRows > 0 ? Math.min(totalRows, 3) : 1;

  // 斜面は畝間側にのみ食い込ませる：畝間の半分（片側25%ずつ）を斜面用に、残りを谷底の平坦部に充てる。
  const SLOPE_RATIO = 0.5; // 畝間のうち斜面に使う割合（左右合計）
  const slopeCm = pathCm * SLOPE_RATIO / 2; // 片側の斜面幅
  const flatValleyCm = Math.max(0, pathCm - slopeCm * 2);

  // Step8-7：縦を大幅圧縮（170→110、高さ約35%減）。横幅・パディングは維持。
  const VIEW_W = 340, VIEW_H = 110;
  const PAD_X  = 14;
  const BASE_Y = 90;  // 地面のベースラインY座標
  const PEAK_Y = 30;  // 山頂Y座標（固定比率：cm値に関係なく常に同じ高さで描画）

  // --- 各山の頂点をcm単位で左から順に計算（本数は displayCount 本に可変） ---
  let cursor = 0; // 現在位置（cm、左端からの距離）
  const mountains = []; // {baseL, topL, topR, baseR}（すべてcm）
  for (let i = 0; i < displayCount; i++) {
    const baseL = cursor;                  // 左裾の付け根（地面）
    const topL  = baseL + slopeCm;         // 左肩（山頂の左端）
    const topR  = topL + topCm;            // 右肩（山頂の右端）
    const baseR = topR + slopeCm;          // 右裾の付け根（地面）
    mountains.push({ baseL, topL, topR, baseR });
    cursor = baseR + flatValleyCm;         // 次の山の左裾開始位置（谷底ぶん進める）
  }
  // 山n本・谷(n-1)本ぶんの水平距離（cm）。外側（左端・右端）にも同じ斜面幅ぶんの余白を確保し、
  // 端の山も地面から立ち上がって見えるようにする。
  const totalCm = mountains[mountains.length - 1].baseR;

  const scale = (VIEW_W - PAD_X * 2) / totalCm;
  const cmToPx = (cm) => PAD_X + cm * scale;

  // --- 地面のベースライン（全幅） ---
  const baseX1 = cmToPx(0), baseX2 = cmToPx(totalCm);
  let svg = `<line x1="${baseX1.toFixed(1)}" y1="${BASE_Y}" x2="${baseX2.toFixed(1)}" y2="${BASE_Y}" class="plt-crosssection-baseline" />`;

  // --- 各山を台形ポリゴンとして描画 ---
  // 中央の山にのみ plt-crosssection-ridge-mid クラス＋data-cross-crop属性を付与し、
  // 畝上比率スライダーのfocus時にこの1本だけをハイライト対象にできるようにする。
  // 中央インデックス：1本なら0本目、2本なら0本目（右隣に唯一の谷）、3本なら1本目（中央）。
  const midIdx = Math.floor((displayCount - 1) / 2);
  mountains.forEach((m, idx) => {
    const pts = [
      [cmToPx(m.baseL), BASE_Y],
      [cmToPx(m.topL),  PEAK_Y],
      [cmToPx(m.topR),  PEAK_Y],
      [cmToPx(m.baseR), BASE_Y],
    ].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    const isMid = idx === midIdx;
    const midClass = isMid ? ' plt-crosssection-ridge-mid' : '';
    const midAttr  = isMid ? ` data-cross-crop="${cropId}"` : '';
    svg += `<polygon points="${pts}" class="plt-crosssection-ridge ${colorClass}${midClass}"${midAttr} />`;
  });

  // --- 寸法ラベル位置計算（表示専用。数値の編集は入力グリッド・畝上比率スライダーに一本化） ---
  // 畝上幅：中央の山の頂上に表示。畝間：中央の山のすぐ左の谷に表示（谷が無い＝1本のみの場合は省略）。
  const midMountain = mountains[midIdx];
  const topLabelX = (cmToPx(midMountain.topL) + cmToPx(midMountain.topR)) / 2;
  const valleyIdx = Math.max(midIdx - 1, 0);
  const hasValley = mountains.length >= 2;

  let valleyLabelHTML = '';
  if (hasValley) {
    const valleyL = mountains[valleyIdx].baseR, valleyR = mountains[valleyIdx + 1].baseL;
    const valleyLabelX = (cmToPx(valleyL) + cmToPx(valleyR)) / 2;

    // 畝間ハイライト用の可視マーカー（通常モードでは谷が潰れて見た目に区間が無いため、
    // 中心を基準に最低幅（左右12pxぶん＝計24px）を確保した帯を用意しておく。デフォルト非表示、
    // 入力フォーカス時に .plt-highlight-blink が付与されて明滅表示される）。
    const MIN_HIT_HALF_PX = 12;
    const valleyCenterPx = (cmToPx(valleyL) + cmToPx(valleyR)) / 2;
    const valleyHitX1 = Math.min(cmToPx(valleyL), valleyCenterPx - MIN_HIT_HALF_PX);
    const valleyHitX2 = Math.max(cmToPx(valleyR), valleyCenterPx + MIN_HIT_HALF_PX);
    svg += `<rect x="${valleyHitX1.toFixed(1)}" y="${PEAK_Y.toFixed(1)}" width="${(valleyHitX2 - valleyHitX1).toFixed(1)}" height="${(BASE_Y - PEAK_Y).toFixed(1)}" class="plt-crosssection-valley-highlight" data-cross-crop="${cropId}" />`;

    valleyLabelHTML = `<text x="${valleyLabelX.toFixed(1)}" y="${BASE_Y - 6}" class="plt-crosssection-label plt-crosssection-label-path" text-anchor="middle">畝間 ${pathCm}cm</text>`;
  }

  svg += `<text x="${topLabelX.toFixed(1)}" y="${PEAK_Y - 6}" class="plt-crosssection-label plt-crosssection-label-top" text-anchor="middle">畝上幅 ${topCm}cm</text>`;
  svg += valleyLabelHTML;

  // 同条件省略表示：実際の畝数（totalRows）が3本を超える場合、「他◯畝 同条件」を下部に注記する。
  const omittedLabel = totalRows > 3
    ? `<text x="${(VIEW_W / 2).toFixed(1)}" y="${VIEW_H - 4}" class="plt-crosssection-label plt-crosssection-label-omitted" text-anchor="middle">他${totalRows - 3}畝 同条件</text>`
    : '';

  return {
    svg: `<div class="plt-crosssection-wrap"><svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" class="plt-crosssection-svg">${svg}${omittedLabel}</svg></div>`,
    hasData: true,
  };
}

/**
 * 作物タブ行のHTML生成。
 * 作物が1件のみの場合は空文字を返し、タブ行自体を表示しない。
 * 各タブは平面図の凡例・帯色と同じ plt-cropcolor-N を反映し、同一作物であることが
 * 視覚的に一致するようにする（作物色との混同を避けたい寸法線の配色とは別軸）。
 */
function _adpBuildRidgeCrossSectionTabs() {
  const crops = _adpPracticecrops || [];
  if (crops.length < 2) return '';

  const activeCropId = _adpResolveCrossSectionActiveCropId();

  const chips = crops.map((entry, idx) => {
    const colorClass = `plt-cropcolor-${idx % 8}`;
    const isActive = entry.cropId === activeCropId;
    const name = _adpCropIdToName(entry.cropId);
    return `<button type="button" class="plt-crosstab-chip ${colorClass} ${isActive ? 'plt-crosstab-chip-active' : ''}"
      onclick="_adpSetCrossSectionActiveCrop('${entry.cropId}')">${name}</button>`;
  }).join('');

  return `<div class="plt-crosstab-bar">${chips}</div>`;
}

/**
 * 新ブロックで選択中の作物IDを検証・補正して返す。
 * - 現在値が有効（crops内に存在）ならそのまま使う。
 * - 無効／未設定の場合：畝計算(ridgeSegments)が既にある最初の作物を優先し、
 *   該当が無ければ配列の先頭（idx=0）にフォールバックする
 *   （「選択したのに断面データが無い」状態を避けるため）。
 * @returns {string|null} 有効なcropId、または作物が0件ならnull
 */
function _adpResolveCrossSectionActiveCropId() {
  const crops = _adpPracticecrops || [];
  if (!crops.length) {
    _adpCrossSectionActiveCropId = null;
    return null;
  }

  const stillValid = crops.some(c => c.cropId === _adpCrossSectionActiveCropId);
  if (stillValid) return _adpCrossSectionActiveCropId;

  const withRidges = crops.find(c => Array.isArray(c?.plantingDesign?.ridgeSegments) && c.plantingDesign.ridgeSegments.length > 0);
  _adpCrossSectionActiveCropId = (withRidges || crops[0]).cropId;
  return _adpCrossSectionActiveCropId;
}

/**
 * 作物タブタップ時のハンドラ。
 * stateを更新し、新ブロック（タブ＋トグル＋断面図＋比率＋入力グリッド）のみ部分再描画する
 * （全体再描画 _adpRenderPlantingPane() は呼ばない）。
 * @param {string} cropId
 */
function _adpSetCrossSectionActiveCrop(cropId) {
  if (_adpCrossSectionActiveCropId === cropId) return;
  _adpCrossSectionActiveCropId = cropId;
  _adpRefreshRidgeInputBlock();
}

/**
/**
 * UX見直し（2026-07）：差分フラッシュ用ヘルパー。
 * 「描画」タブの平面図（#unified-ridge-preview）に現在表示中の
 * ①畝の実ライン（.plt-shapesvg-cropridge：帯の実位置が動く変更で移動）
 * ②寸法線オーバーレイの可視部分（.plt-dimline-top/.plt-dimline-path/.plt-dimline-single：
 *    畝比率（ridgeRatioPct）変更で分割点Cが移動する模式的な線）
 * の座標・見た目種別を、再描画で失われる前に捕捉する。
 * 「調整」タブ表示中など平面図が存在しない場合は空配列を返す（＝差分フラッシュなし）。
 * @param {Element} blockEl - #planting-result [data-maintabs-body] 相当のコンテナ
 * @returns {{ridge: Array<{x1:number,y1:number,x2:number,y2:number,colorClass:string}>,
 *            dim: Array<{x1:number,y1:number,x2:number,y2:number,kind:string}>}}
 */
function _adpCaptureRidgeGhostLines(blockEl) {
  const empty = { ridge: [], dim: [] };
  if (!blockEl) return empty;
  const svg = blockEl.querySelector('#unified-ridge-preview svg.plt-shapesvg');
  if (!svg) return empty;

  const ridge = Array.from(svg.querySelectorAll('.plt-shapesvg-cropridge')).map(line => {
    const colorClass = Array.from(line.classList).find(c => c.startsWith('plt-cropcolor-')) || 'plt-cropcolor-0';
    return {
      x1: parseFloat(line.getAttribute('x1')), y1: parseFloat(line.getAttribute('y1')),
      x2: parseFloat(line.getAttribute('x2')), y2: parseFloat(line.getAttribute('y2')),
      colorClass,
    };
  }).filter(l => Number.isFinite(l.x1) && Number.isFinite(l.y1) && Number.isFinite(l.x2) && Number.isFinite(l.y2));

  const dim = Array.from(svg.querySelectorAll('.plt-dimline-top, .plt-dimline-path, .plt-dimline-single')).map(line => {
    const kind = line.classList.contains('plt-dimline-top') ? 'top'
      : line.classList.contains('plt-dimline-path') ? 'path' : 'single';
    return {
      x1: parseFloat(line.getAttribute('x1')), y1: parseFloat(line.getAttribute('y1')),
      x2: parseFloat(line.getAttribute('x2')), y2: parseFloat(line.getAttribute('y2')),
      kind,
    };
  }).filter(l => Number.isFinite(l.x1) && Number.isFinite(l.y1) && Number.isFinite(l.x2) && Number.isFinite(l.y2));

  return { ridge, dim };
}

/**
 * 再描画後の平面図に、再描画前の畝位置・寸法線分割点を点線の残像（.plt-diffghost）として
 * 一瞬重ね、CSSアニメーション（plt-diffghost-fade）でフェードアウトさせる。
 * 座標が完全一致するライン（＝実質変化なし）は残像を出さない（畝ライン・寸法線それぞれ独立判定）。
 * アニメーション終了後は要素を確実に除去する（CSSだけに任せず、要素残留を防ぐ）。
 * @param {Element} blockEl
 * @param {{ridge: Array, dim: Array}} oldLines - _adpCaptureRidgeGhostLines の戻り値
 */
function _adpInjectRidgeGhostLines(blockEl, oldLines) {
  if (!blockEl || !oldLines) return;
  const svg = blockEl.querySelector('#unified-ridge-preview svg.plt-shapesvg');
  if (!svg) return;

  const ns = 'http://www.w3.org/2000/svg';
  const linesDiffer = (a, b) => !b || Math.abs(a.x1 - b.x1) > 0.5 || Math.abs(a.y1 - b.y1) > 0.5 ||
    Math.abs(a.x2 - b.x2) > 0.5 || Math.abs(a.y2 - b.y2) > 0.5;

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'plt-diffghost');
  let any = false;

  const oldRidge = Array.isArray(oldLines.ridge) ? oldLines.ridge : [];
  if (oldRidge.length) {
    const newRidge = Array.from(svg.querySelectorAll('.plt-shapesvg-cropridge')).map(line => ({
      x1: parseFloat(line.getAttribute('x1')), y1: parseFloat(line.getAttribute('y1')),
      x2: parseFloat(line.getAttribute('x2')), y2: parseFloat(line.getAttribute('y2')),
    }));
    if (oldRidge.some((old, i) => linesDiffer(old, newRidge[i]))) {
      oldRidge.forEach(l => {
        const el = document.createElementNS(ns, 'line');
        el.setAttribute('x1', l.x1); el.setAttribute('y1', l.y1);
        el.setAttribute('x2', l.x2); el.setAttribute('y2', l.y2);
        el.setAttribute('class', `plt-diffghost-line ${l.colorClass}`);
        g.appendChild(el);
      });
      any = true;
    }
  }

  const oldDim = Array.isArray(oldLines.dim) ? oldLines.dim : [];
  if (oldDim.length) {
    const newDim = Array.from(svg.querySelectorAll('.plt-dimline-top, .plt-dimline-path, .plt-dimline-single')).map(line => ({
      x1: parseFloat(line.getAttribute('x1')), y1: parseFloat(line.getAttribute('y1')),
      x2: parseFloat(line.getAttribute('x2')), y2: parseFloat(line.getAttribute('y2')),
    }));
    if (oldDim.some((old, i) => linesDiffer(old, newDim[i]))) {
      oldDim.forEach(l => {
        const el = document.createElementNS(ns, 'line');
        el.setAttribute('x1', l.x1); el.setAttribute('y1', l.y1);
        el.setAttribute('x2', l.x2); el.setAttribute('y2', l.y2);
        el.setAttribute('class', `plt-diffghost-line plt-diffghost-dim-${l.kind}`);
        g.appendChild(el);
      });
      any = true;
    }
  }

  if (!any) return; // 実質変化なしなら残像は出さない（無駄な明滅を避ける）
  svg.appendChild(g);
  setTimeout(() => g.remove(), 900);
}


/**
 * Step8-7後半：メインタブ本体（data-maintabs-body）の中身だけを部分再描画する。
 * 「調整」「描画」タブ以外（自動設計・作物詳細）は畝の断面図・入力グリッドを持たないため
 * 何もしない（無関係なタブ表示中に呼ばれても誤って上書きしないための安全策）。
 * 入力フィールドにフォーカスがある状態で呼ばれた場合、再描画（innerHTML差し替え）で
 * フォーカス・カーソル位置が失われるため、対象フィールドと選択範囲を保存しておき、
 * 再描画後に同じ入力欄へフォーカス・カーソル位置を復元する。
 * UX見直し（2026-07）：「描画」タブの平面図が対象の場合、再描画前後の畝位置・寸法線分割点を比較し、
 * 変化があれば旧位置を点線残像として一瞬重ねる差分フラッシュを行う
 * （_adpCaptureRidgeGhostLines / _adpInjectRidgeGhostLines）。
 */
function _adpRefreshRidgeInputBlock() {
  if (_adpPlantingUITab !== 'adjust' && _adpPlantingUITab !== 'draw') return;
  const blockEl = document.querySelector('#planting-result [data-maintabs-body]');
  if (!blockEl) return;

  const active = document.activeElement;
  let focusField = null, selStart = null, selEnd = null;
  if (active && active.tagName === 'INPUT' && blockEl.contains(active)) {
    focusField = active.closest('[data-field]')?.dataset.field || null;
    selStart = active.selectionStart;
    selEnd = active.selectionEnd;
  }

  const ghostLines = _adpCaptureRidgeGhostLines(blockEl);

  blockEl.innerHTML = _adpBuildPlantingTabBody(_adpPlantingUITab);

  if (ghostLines.ridge.length || ghostLines.dim.length) _adpInjectRidgeGhostLines(blockEl, ghostLines);

  if (focusField) {
    const restored = blockEl.querySelector(`.plt-input-item[data-field="${focusField}"] input`);
    if (restored) {
      restored.focus();
      if (selStart != null && selEnd != null) {
        try { restored.setSelectionRange(selStart, selEnd); } catch (_) { /* type=numberではブラウザにより非対応の場合があるため無視 */ }
      }
    }
  }
}


/**
 * カード側の削除・占有率変更や平面図側の寸法線タップ誘導など、新ブロック以外の経路で
 * rowWidth/ridgeRatioPct等が変更された際に呼ぶ。変更されたcropIdが現在ブロックに表示中
 * （アクティブ）の作物と一致する場合のみブロックを再描画する
 * （無関係な作物の編集のたびに毎回再描画しないための最適化）。
 */
function _adpRefreshCrossSectionIfActive(cropId) {
  if (_adpResolveCrossSectionActiveCropId() === cropId) {
    _adpRefreshRidgeInputBlock();
  }
}

/**
 * Step8-7後半：「描画」タブの平面図の寸法線タップなど、数値入力を持たない場所から
 * 「この作物の畝上比率・ピッチを編集したい」という誘導を受けた際に呼ぶ。
 * 対象作物のタブを自動切替した上で「調整」タブへ切り替え、畝上比率スライダーを明滅ハイライトする。
 * @param {string} cropId
 */
function _adpNavigateToRidgeInput(cropId) {
  if (_adpResolveCrossSectionActiveCropId() !== cropId) {
    _adpCrossSectionActiveCropId = cropId;
  }
  _adpSwitchPlantingUITab('adjust');

  const block = document.querySelector('#planting-result [data-maintabs-body]');
  if (!block) return;
  block.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const target = block.querySelector(`.plt-ridgeratio-row[data-ridgeratio-key="${cropId}"] .plt-ridgeratio-slider`);
  if (target) {
    target.classList.add('plt-highlight-blink');
    setTimeout(() => target.classList.remove('plt-highlight-blink'), 1500);
  }
}

/**
 * UX見直し（2026-07）：平面図の寸法線タップ挙動を「調整タブへ直接遷移」から
 * 「その場で一文説明をポップオーバー表示」に変更。調整タブへの遷移は
 * ポップオーバー内の「編集する」ボタン（_adpNavigateToRidgeInput呼び出し）に分離した。
 * 説明文は各寸法線側で data-explain 属性として埋め込み済みのものをそのまま表示する。
 * @param {SVGElement} el - クリックされた寸法線/ラベル要素（data-explain属性を持つ）
 * @param {string} [cropId] - 「編集する」ボタンから_adpNavigateToRidgeInputへ渡す対象作物ID。
 *   省略時（圃場マージン系の説明など、特定作物に紐づかない場合）は編集ボタンを表示しない。
 */
function _adpShowDimlineExplain(el, cropId) {
  const wrap = el && el.closest ? el.closest('.plt-shapesvg-wrap') : document.getElementById('unified-ridge-preview');
  if (!wrap) return;
  const text = (el && el.dataset && el.dataset.explain) || '';
  if (!text) return;

  let pop = wrap.querySelector('.plt-dimline-explain');
  if (!pop) {
    pop = document.createElement('div');
    pop.className = 'plt-dimline-explain';
    wrap.appendChild(pop);
  }

  const editBtnHTML = cropId
    ? `<button type="button" class="plt-dimline-explain-editbtn" onclick="_adpCloseDimlineExplain();_adpNavigateToRidgeInput('${cropId}')">編集する</button>`
    : '';

  pop.innerHTML = `
    <div class="plt-dimline-explain-text">${text}</div>
    <div class="plt-dimline-explain-actions">
      ${editBtnHTML}
      <button type="button" class="plt-dimline-explain-closebtn" onclick="_adpCloseDimlineExplain()" aria-label="閉じる">✕</button>
    </div>`;
  pop.classList.add('open');
}

/** 表示中の寸法線説明ポップオーバーをすべて閉じる。 */
function _adpCloseDimlineExplain() {
  document.querySelectorAll('.plt-dimline-explain.open').forEach(p => p.classList.remove('open'));
}

function _adpRenderPlantingPane() {
  const el = document.getElementById('planting-result');
  if (!el) return;

  const areaId = _adpArea?.id || _adpArea?.name || '';

  // ── 分析側 ──
  if (_adpCurrentSeg === 'analysis') {
    const cropId = _adpSelectedCropId;
    if (!cropId) {
      el.innerHTML = _adpBuildUnifiedFieldPanel(true) + '<div class="empty-mini">作物を選択すると栽植設計の試算ができます。</div>';
      return;
    }
    const cropName = _adpCropIdToName(cropId);
    // 分析側は一時ステートをクロージャ外に持つ（ペイン再描画でリセットされる）
    // _adpAnalysisPlantingDesign をモジュール変数として管理
    if (!_adpAnalysisPlantingDesign || _adpAnalysisPlantingDesign._cropId !== cropId) {
      _adpAnalysisPlantingDesign = { ...PlantingLogic.initDesign(cropId), _cropId: cropId };
    }
    // エリア共通の畝方向が設定済みなら、圃場全体基準で畝セグメントを自動計算
    const pitchCm = PlantingLogic.effectivePitchCm(_adpAnalysisPlantingDesign);
    PlantingLogic.recalcAnalysisRidgeSegments(_adpAnalysisPlantingDesign, pitchCm, _adpArea, _adpHouseMargin);
    el.innerHTML = _adpBuildUnifiedFieldPanel(true) + _adpBuildPlantingCard({
      cropId,
      cropName,
      ratio: null,
      design: _adpAnalysisPlantingDesign,
      isAnalysis: true,
    });
    return;
  }

  // ── 実務側（Step8-7後半：自動設計／調整／描画／作物詳細の4タブに一本化）──
  // 作物0件時の案内（畝方向チェックリスト／プレースホルダー）は各タブ内で個別に処理するため、
  // ここでの分岐は不要（_adpBuildUnifiedFieldPanel(false) が4タブ構成一式を返す）。
  // UX見直し（2026-07 ②対応）：占有率変更・作物追加削除・自動設計適用など、この全体再描画
  // （innerHTML差し替え）を経由する操作は _adpRefreshRidgeInputBlock を通らないため、
  // 従来は差分フラッシュの対象外だった（他作物操作で自分の帯が動いても無音だった）。
  // ここでも同じcapture→差し替え→injectを行うことで、経路によらず一貫して差分フラッシュが効くようにする。
  // 平面図が存在しない状態（調整タブのみ表示中・初回描画等）からの遷移や、位置に実質変化が
  // 無い場合は _adpCaptureRidgeGhostLines / _adpInjectRidgeGhostLines 側の判定により
  // 自動的に無反応となるため、呼び出し側で個別に経路を区別する必要はない。
  const ghostLines = _adpCaptureRidgeGhostLines(el);
  el.innerHTML = _adpBuildUnifiedFieldPanel(false);
  if (ghostLines.ridge.length || ghostLines.dim.length) _adpInjectRidgeGhostLines(el, ghostLines);
}

// ═══════════════════════════════════════════
//  自動設計（Step1・Agri_planting_auto_design_spec.MD）
//  設定サブパネルUI：作物ごとの比率／最低比率／畝数プルダウン＋固定チェック、
//  ゾーン優先度・目的関数の選択、自動設計／適用ボタン。
//  計算本体は js/adpAutoDesign.js（AutoDesign）に分離。
// ═══════════════════════════════════════════

/**
 * 5%刻みの比率プルダウン用オプションHTML（0〜100%）を生成する。
 * 5.6.2：maxAllowed を指定すると、それを超える選択肢は生成しない（選択不可能にする）。
 * ただし現在選択中の値（selected）は、動的上限の再計算により一時的にmaxAllowedを超えて
 * いても選択肢から消さない（プルダウンの表示が壊れる＝選択不能状態になるのを防ぐ安全策）。
 */
/**
 * v4仕様4.：比率／最低比率の入力UIを、5%刻みプルダウンから「タップ編集チップ＋±10%ステッパー」に刷新。
 * チップ本体（number input）は直接タップして数値入力も可能（キーボード入力に対応）。
 * @param {string} cropId
 * @param {'ratio'|'minRatio'} field
 * @param {number} value
 * @param {number} maxAllowed - 動的上限（_adpAutoDesignComputeLimits().max）
 * @param {boolean} disabled
 */
function _adpAutoRatioChipHTML(cropId, field, value, maxAllowed, disabled) {
  const upper = (typeof maxAllowed === 'number' && isFinite(maxAllowed)) ? maxAllowed : 100;
  const v = Math.max(0, Math.min(upper, Number(value) || 0));
  return `
    <div class="autoad-chip-group">
      <button type="button" class="autoad-stepper-btn" ${disabled ? 'disabled' : ''}
        onclick="_adpAutoDesignStepRatio('${cropId}','${field}',-10,${upper})">−10%</button>
      <div class="autoad-chip-inputwrap">
        <input type="number" class="autoad-chip-input" inputmode="numeric" min="0" max="${upper}" step="1"
          value="${v}" ${disabled ? 'disabled' : ''}
          onchange="_adpAutoDesignSetCropField('${cropId}','${field}', this.value)">
        <span class="autoad-chip-unit">%</span>
      </div>
      <button type="button" class="autoad-stepper-btn" ${disabled ? 'disabled' : ''}
        onclick="_adpAutoDesignStepRatio('${cropId}','${field}',10,${upper})">+10%</button>
    </div>`;
}

/** 比率／最低比率チップの±10%ステッパーボタンのハンドラ（0〜動的上限でクランプ）。 */
function _adpAutoDesignStepRatio(cropId, field, delta, maxAllowed) {
  const crop = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!crop) return;
  const autoSet = crop.plantingDesign?.autoDesign || {};
  const current = field === 'ratio' ? (Number(crop.ratio) || 0) : (Number(autoSet.minRatio) || 0);
  const upper = (typeof maxAllowed === 'number' && isFinite(maxAllowed)) ? maxAllowed : 100;
  const next = Math.max(0, Math.min(upper, current + delta));
  _adpAutoDesignSetCropField(cropId, field, next);
}

/**
 * 5.6.2：指定作物（cropId）の比率／最低比率プルダウンの動的上限を計算する。
 * 上限 = 100 − (自分以外の固定済み作物の比率合計) − (自分以外の非固定作物の最低比率合計)
 * 比率プルダウン（固定作物のみ編集可）・最低比率プルダウン（非固定作物のみ編集可）の
 * どちらも「自分以外」を除外する点は共通のため、同一ロジックで算出できる
 * （固定作物にとっての「他の固定作物の比率合計」＝非固定作物にとっての「固定作物の比率合計」、
 * 　どちらも自分自身は該当グループに含まれないため）。
 */
function _adpAutoDesignComputeLimits(cropId) {
  let fixedSum = 0, minSum = 0;
  _adpPracticecrops.forEach(c => {
    if (c.cropId === cropId) return;
    const as = c.plantingDesign?.autoDesign || {};
    if (as.fixedRatio) {
      fixedSum += Number(c.ratio) || 0;
    } else {
      minSum += Number(as.minRatio) || 0;
    }
  });
  return { max: Math.max(0, 100 - fixedSum - minSum), fixedSum, minSum };
}

/**
 * 5.6.2：「残り〇%」表示用。全作物を対象に
 * 100 − (固定済み作物の比率合計) − (非固定作物の最低比率合計) を算出する
 * （まだどの作物にも割り当てられていない、自動設計エンジンが自由に配分できる余地）。
 */
function _adpAutoDesignComputeRemaining() {
  let fixedSum = 0, minSum = 0;
  _adpPracticecrops.forEach(c => {
    const as = c.plantingDesign?.autoDesign || {};
    if (as.fixedRatio) fixedSum += Number(c.ratio) || 0;
    else minSum += Number(as.minRatio) || 0;
  });
  return 100 - fixedSum - minSum;
}

/**
 * 5.6.1：事前条件（作物1件以上）の充足状況を返す。
 * v4仕様5.：畝方向は未設定でも自動計算（最長辺）して確定に含められるため、
 * ブロッカーではなくなった（allOkはhasCropsのみで判定）。hasRidgeDirは表示文言の
 * 出し分け（「設定済み」／「自動判定」）にのみ使用する。
 */
function _adpAutoDesignPrereqStatus() {
  const hasRidgeDir = !!_adpArea?.meta?.ridgeBaseDirection;
  const hasCrops = _adpPracticecrops.length > 0;
  return { hasRidgeDir, hasCrops, allOk: hasCrops };
}

/**
 * 5.6.1：事前条件表示HTML。
 * 作物0件時のみブロッカーとして誘導ボタン付きで表示。作物が1件以上あれば
 * 畝方向の有無に関わらず1行サマリー表示とし、畝方向は「設定済み」または「自動判定」の
 * 文言で状態を伝える（未設定でも自動計算されるためブロックしない）。
 * 誘導ボタン（畝方向を手動で変えたい人向け）はサマリー行に残す。
 */
function _adpBuildAutoDesignPrereqHTML(hasRidgeDir, hasCrops) {
  if (!hasCrops) {
    return `
      <div class="autoad-prereq">
        <div class="autoad-prereq-item">
          <span class="autoad-prereq-icon">🌱</span>
          <span class="autoad-prereq-label">作物</span>
          <span class="autoad-prereq-badge">未設定</span>
          <button type="button" class="autoad-prereq-btn" onclick="_adpOpenCropSelectSheet('practice')">＋作物を追加</button>
        </div>
      </div>`;
  }
  const ridgeText = hasRidgeDir ? '設定済み' : '自動判定';
  return `
    <div class="autoad-prereq autoad-prereq-clear">
      <span>✓ 畝方向：${ridgeText}／作物${_adpPracticecrops.length}件登録済み</span>
      <button type="button" class="autoad-prereq-btn autoad-prereq-btn-inline" onclick="_adpAutoDesignGuideToRidgeDir()">📐 畝方向を変更</button>
    </div>`;
}

/**
 * 5.6.1（Step8-7後半：4タブ構成対応）：「📐 畝方向を設定」誘導ボタンのハンドラ。
 * ①「描画」タブへ切替＋表示モードを「全体」に設定 → ②辺選択トグルを畝方向モードに切替 →
 * ③該当UIへスクロール。辺選択トグル（.plt-edgetoggle-bar）は「描画」タブの「全体」表示
 * （パネルA）内にのみ存在するため、タブ切替を先に行う必要がある。
 */
function _adpAutoDesignGuideToRidgeDir() {
  _adpCrossSectionViewMode = 'full';
  _adpSwitchPlantingUITab('draw');
  _adpSetUnifiedPreviewEdgeMode('ridgedir');
  requestAnimationFrame(() => {
    const bar = document.querySelector('#planting-result .plt-edgetoggle-bar');
    if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/**
 * v4仕様4.：畝数の入力UI。+1／+10ステッパーはそのまま活かしつつ、プルダウン部分だけ
 * タップ編集チップ（number input）に置き換える（本数入力の一貫性を比率チップと揃える）。
 */
function _adpAutoRowCountChipHTML(cropId, value, disabled) {
  const n = Math.max(1, Number(value) || 0);
  return `
    <div class="autoad-chip-group">
      <div class="autoad-chip-inputwrap">
        <input type="number" class="autoad-chip-input" inputmode="numeric" min="1" step="1"
          value="${n}" ${disabled ? 'disabled' : ''}
          onchange="_adpAutoDesignSetCropField('${cropId}','targetRowCount', this.value)">
        <span class="autoad-chip-unit">本</span>
      </div>
      <button type="button" class="autoad-incr-btn" ${disabled ? 'disabled' : ''} onclick="_adpAutoDesignIncrRowCount('${cropId}', 1)">+1</button>
      <button type="button" class="autoad-incr-btn" ${disabled ? 'disabled' : ''} onclick="_adpAutoDesignIncrRowCount('${cropId}', 10)">+10</button>
    </div>`;
}

/**
 * 自動設計の設定パネルを生成する。
 * 作物別「比率／最低比率／畝数」の固定・自動計算チップと「残り％」バーは「調整」タブへ
 * 移設済み（_adpBuildAutoAllocBlockHTML）。ここはゾーン優先度／目的関数の選択と
 * 🪄完全自動設計ボタンのみに簡素化し、「プレビュー」→「適用」の2段階概念は廃止した
 * （実行→境界ギリギリ時のみ確認モーダル→即確定、の1操作にまとめている）。
 */
function _adpBuildAutoDesignPanel() {
  const { hasRidgeDir, hasCrops } = _adpAutoDesignPrereqStatus();
  const prereqHTML = _adpBuildAutoDesignPrereqHTML(hasRidgeDir, hasCrops);

  const globalHTML = !hasCrops ? '' : `
        <div class="autoad-global-row">
          <label class="autoad-global-field">
            ゾーン優先度
            <select class="autoad-select" onchange="_adpAutoDesignSetGlobalOption('zonePriorityMode', this.value)">
              <option value="ratio"${_adpAutoDesignSettings.zonePriorityMode === 'ratio' ? ' selected' : ''}>比率順</option>
              <option value="fixed"${_adpAutoDesignSettings.zonePriorityMode === 'fixed' ? ' selected' : ''}>固定作物優先</option>
            </select>
          </label>
          <label class="autoad-global-field">
            目的関数
            <select class="autoad-select" onchange="_adpAutoDesignSetGlobalOption('objective', this.value)">
              <option value="yield"${_adpAutoDesignSettings.objective === 'yield' ? ' selected' : ''}>収量(kg)最大化</option>
              <option value="revenue"${_adpAutoDesignSettings.objective === 'revenue' ? ' selected' : ''}>収益(円)最大化</option>
              <option value="profit"${_adpAutoDesignSettings.objective === 'profit' ? ' selected' : ''}>利益(円)最大化（肥料費差引）</option>
            </select>
          </label>
        </div>`;

  return `
    <div class="autoad-panel" id="autoad-panel">
      <button type="button" class="autoad-full-btn" ${hasCrops ? '' : 'disabled'} onclick="_adpAutoDesignFullAuto()">
        🪄 完全自動設計（タップで計算→確定）
      </button>
      <div class="autoad-full-help">畝方向が未設定でも自動計算します。実行すると比率・畝数を自動配分してそのまま確定します。個別に比率・畝数を固定指定したい場合は「調整」タブで作物ごとに設定してください。</div>
      ${prereqHTML}
      ${globalHTML}
    </div>`;
}

/**
 * 自動設計パネルの1フィールド変更を反映する。
 * ratio/minRatio/targetRowCount は入力欄の値（文字列）を数値化して保存。
 * fixedRatio/fixedRowCount はチェックボックスの真偽値。
 * 自動設計⇔調整タブ再編：このチップ群は「調整」タブに移設済み（_adpBuildAutoAllocBlockHTML）。
 * 設定変更のみで、帯・畝の再計算（recalcAllBands）は行わない。非固定（自動計算）作物への
 * 実際の配分反映は「🔄 自動配分を再計算・反映」ボタン（_adpAutoDesignFullAuto）で行う。
 */
function _adpAutoDesignSetCropField(cropId, field, rawValue) {
  const crop = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!crop) return;
  if (!crop.plantingDesign) crop.plantingDesign = PlantingLogic.initDesign(cropId);
  if (!crop.plantingDesign.autoDesign) crop.plantingDesign.autoDesign = { fixedRatio: false, minRatio: 0, fixedRowCount: false };

  if (field === 'fixedRatio' || field === 'fixedRowCount') {
    crop.plantingDesign.autoDesign[field] = !!rawValue;
  } else if (field === 'minRatio') {
    // 改善③：直接入力（キーボード）時もステッパーと同じ動的上限でクランプする
    // （従来は上限チェックが抜けており、100%超の値を入力できてしまっていた）。
    const limits = _adpAutoDesignComputeLimits(cropId);
    crop.plantingDesign.autoDesign.minRatio = Math.max(0, Math.min(limits.max, Number(rawValue) || 0));
  } else if (field === 'ratio') {
    // 固定チェック済み作物の「固定時の比率」。他作物の比率とは自動連動しない
    // （自動設計専用の値。実務側の通常の占有率スライダーとは別系統として扱う）。
    // 改善③：直接入力時もステッパーと同じ動的上限でクランプする。
    const limits = _adpAutoDesignComputeLimits(cropId);
    crop.ratio = Math.max(0, Math.min(limits.max, Number(rawValue) || 0));
  } else if (field === 'targetRowCount') {
    crop.plantingDesign.targetRowCount = Number(rawValue) || 0;
  }

  _adpSavePracticecrops(_adpArea?.id || _adpArea?.name || '');
  _adpRefreshRidgeInputBlock();
}

/** 畝数チップの増分ボタン（+1／+10）。固定チェックが入っている作物のみ操作可能。 */
function _adpAutoDesignIncrRowCount(cropId, delta) {
  const crop = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!crop?.plantingDesign?.autoDesign?.fixedRowCount) return;
  const current = Number(crop.plantingDesign.targetRowCount) || 0;
  _adpAutoDesignSetCropField(cropId, 'targetRowCount', Math.max(1, current + delta));
}

/** グローバル設定（ゾーン優先度・目的関数）の変更を保存する。 */
function _adpAutoDesignSetGlobalOption(key, value) {
  _adpAutoDesignSettings[key] = value;
  _adpSaveAutoDesignSettings(_adpArea?.id || _adpArea?.name || '');
  _adpRenderPlantingPane();
}

/**
 * 🪄「完全自動設計」ボタン（自動設計タブ）／🔄「自動配分を再計算・反映」ボタン（調整タブ）の
 * 共通ハンドラ。AutoDesign.run() を実行し、そのまま _adpAutoDesignApply() で確定まで行う
 * （UX見直し：旧「🔍プレビュー」→「✓適用」の2段階、および完全自動設計側の確認ダイアログを
 * 廃止し、実行＝即確定の1操作に統一した。畝ピッチ境界ギリギリの作物（nearBoundary）が
 * ある場合のみ、従来通り専用の確認モーダルを挟む）。
 * 畝方向が未設定の場合は実行前に自動判定して確定する（未設定のままではAutoDesign.runが
 * NO_RIDGE_DIRECTIONで失敗するため）。
 */
function _adpAutoDesignFullAuto() {
  if (typeof AutoDesign === 'undefined') return;
  if (!_adpAutoDesignPrereqStatus().allOk) return; // 作物0件ならフェイルセーフで何もしない

  _adpEnsureRidgeDirAutoDetected(); // 畝方向未設定でも自動計算して確定に含める

  const result = AutoDesign.run({
    practicecrops: _adpPracticecrops,
    area: _adpArea,
    houseMargin: _adpHouseMargin,
    zonePriorityMode: _adpAutoDesignSettings.zonePriorityMode,
    objective: _adpAutoDesignSettings.objective,
  });

  if (!result.ok) {
    showToast(`⚠ ${result.message}`, 'red');
    return;
  }

  _adpAutoDesignPreview = result;
  _adpAutoDesignApply(); // 境界ギリギリが無ければここで即確定（_adpAutoDesignPreviewはnullに戻る）

  if (_adpAutoDesignPreview === null) {
    showToast('🪄 自動配分を反映しました', 'green');
  }
}

/**
 * 「適用」ボタン：直近のプレビュー結果を _adpPracticecrops へ書き込み確定する。
 * 5.5：確定処理は practicecrops書き込み → recalcAllBands呼び出しの順で行う。
 * 5.4（Step2）：プレビュー結果に畝ピッチfloor()境界の「僅差」作物（nearBoundary）が
 * 1件以上ある場合は、即座に確定せず確認ダイアログを表示する（対象0件なら従来通り即時確定）。
 */
function _adpAutoDesignApply() {
  const preview = _adpAutoDesignPreview;
  if (!preview?.ok) return;

  const boundaryCrops = preview.results.filter(r => r.nearBoundary);
  if (boundaryCrops.length > 0) {
    _adpShowBoundaryConfirmModal(boundaryCrops);
    return;
  }
  _adpAutoDesignCommit([]);
}

/**
 * 自動設計プレビューの確定処理本体（practicecrops書き込み → 呼び出し元でrecalcAllBands相当へ）。
 * 5.4（Step2）：increaseCropIds に含まれる作物IDは、境界確認ダイアログで「畝を増やす」が
 * 選択されたものとして targetRowCount を nearBoundary.increasedRowCount に差し替える。
 * @param {string[]} increaseCropIds - 畝数を+1確定する作物IDの配列（境界対象外なら空配列でよい）
 */
function _adpAutoDesignCommit(increaseCropIds) {
  const preview = _adpAutoDesignPreview;
  if (!preview?.ok) return;
  const increaseSet = new Set(increaseCropIds || []);

  preview.results.forEach(r => {
    const crop = _adpPracticecrops.find(c => c.cropId === r.cropId);
    if (!crop) return;
    crop.ratio = r.ratio;
    if (!crop.plantingDesign) crop.plantingDesign = PlantingLogic.initDesign(r.cropId);
    crop.plantingDesign.ridgeInputMode = 'count';
    crop.plantingDesign.targetRowCount = (r.nearBoundary && increaseSet.has(r.cropId))
      ? r.nearBoundary.increasedRowCount
      : r.targetRowCount;
  });

  // 丸め誤差対策：合計が100%からズレていた場合は最後の作物で吸収する
  const lastIdx = _adpPracticecrops.length - 1;
  if (lastIdx >= 0) {
    const sumOthers = _adpPracticecrops.slice(0, lastIdx).reduce((s, c) => s + (Number(c.ratio) || 0), 0);
    _adpPracticecrops[lastIdx].ratio = Math.max(0, 100 - sumOthers);
  }

  _adpAutoDesignPreview = null;
  _adpCloseBoundaryConfirmModal();
  _adpRefreshPracticeTabs();
}

// ═══════════════════════════════════════════
//  5.4（Step2）：畝ピッチ floor()境界の確認ダイアログ
//  「適用」時、境界ギリギリ（nearBoundary）の作物をまとめて一覧表示し、
//  作物ごとにチェックボックス（デフォルトON）で畝を+1するか個別選択させる。
//  DOM（オーバーレイ）は初回表示時に動的生成する（index.html側の追記は不要）。
// ═══════════════════════════════════════════

/** 境界確認モーダルのDOMを初回のみ生成し、以後は使い回す。 */
function _adpEnsureBoundaryModalDOM() {
  if (document.getElementById('autoad-boundary-overlay')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="autoad-boundary-overlay" class="autoad-boundary-overlay">
      <div class="autoad-boundary-modal">
        <div class="autoad-boundary-header">
          <span>畝を1本増やせる作物があります</span>
          <button type="button" class="autoad-boundary-close" onclick="_adpCloseBoundaryConfirmModal()">×</button>
        </div>
        <div class="autoad-boundary-body" id="autoad-boundary-body"></div>
        <div class="autoad-boundary-footer">
          <button type="button" class="autoad-boundary-cancel" onclick="_adpCloseBoundaryConfirmModal()">キャンセル</button>
          <button type="button" class="autoad-boundary-ok" onclick="_adpConfirmBoundaryModal()">OK</button>
        </div>
      </div>
    </div>`);
}

/**
 * 境界ギリギリの作物一覧を表示する。
 * @param {Array<{cropId:string, nearBoundary:{gapCm:number, rowWidthCm:number, currentRowCount:number, increasedRowCount:number}}>} boundaryCrops
 */
function _adpShowBoundaryConfirmModal(boundaryCrops) {
  _adpEnsureBoundaryModalDOM();
  const bodyEl = document.getElementById('autoad-boundary-body');
  if (bodyEl) {
    bodyEl.innerHTML = boundaryCrops.map(r => {
      const cropName = _adpCropIdToName(r.cropId);
      const nb = r.nearBoundary;
      return `
        <label class="autoad-boundary-item">
          <input type="checkbox" class="autoad-boundary-check" data-crop-id="${r.cropId}" checked>
          <span class="autoad-boundary-item-text">
            <strong>${cropName}</strong>：あと${nb.gapCm}cmで畝を${nb.currentRowCount}本→${nb.increasedRowCount}本に増やせます（標準ピッチ${nb.rowWidthCm}cmをわずかに詰めます）
          </span>
        </label>`;
    }).join('');
  }
  const overlay = document.getElementById('autoad-boundary-overlay');
  if (overlay) overlay.classList.add('open');
}

/** キャンセル／×ボタン／オーバーレイクリック：モーダルを閉じるだけで確定処理は行わない。 */
function _adpCloseBoundaryConfirmModal() {
  const overlay = document.getElementById('autoad-boundary-overlay');
  if (overlay) overlay.classList.remove('open');
}

/** OKボタン：チェック済みの作物IDのみ収集し、確定処理へ渡す。 */
function _adpConfirmBoundaryModal() {
  const checks = document.querySelectorAll('.autoad-boundary-check:checked');
  const increaseCropIds = Array.from(checks).map(el => el.dataset.cropId);
  _adpAutoDesignCommit(increaseCropIds);
}

/**
 * 「📐 畝方向を指定」ボタン／プレビューボタン／ステータス文言の行HTMLを生成。
 * カード新規描画（_adpBuildPlantingCard）と部分更新（_adpUpdatePlantingField）の
 * 両方から呼ぶことで、畝幅変更などによる ridgeSegments 再計算後の表示ズレを防ぐ。
 *
 * Step4（圃場マージン再設計・栽植プレビュー統合仕様書）：
 * - 実務側（seg !== 'analysis'）のカードごとインラインSVG（旧・_adpBuildRidgeShapePreviewSVG）は
 *   撤去済み。エリア全体で1つだけの統合プレビュー（_adpBuildUnifiedRidgePreviewSVG）に一本化した。
 * - 分析側（seg === 'analysis'）は帯（_bandPolygon）を持たずStep4対象外のため、
 *   従来どおりモーダル方式（_adpShowPlantingPreview）を維持する。
 * - 戻り値は .plt-ridgedir-block で1要素にラップし、_adpRefreshRidgeDirRow の
 *   outerHTML差し替え時に重複追加されないようにしている。
 */
function _adpBuildRidgeDirRowHTML(cropId, seg, design, hasAutoCalc, hasRidgeDir) {
  const isAnalysis = seg === 'analysis';

  // プレビューボタン（分析側のみ・モーダル表示。実務側は統合プレビューに一本化したため不要）
  const previewBtnHTML = (hasAutoCalc && isAnalysis) ? `
      <button class="plt-preview-btn" onclick="_adpShowPlantingPreview('${cropId}','${seg}')">
        👁️ プレビュー
      </button>` : '';

  let statusHTML;
  if (hasAutoCalc) {
    const bandInfo = (seg !== 'analysis' && design._bandAreaSqm > 0)
      ? `／帯面積 ${design._bandAreaSqm.toFixed(1)}㎡` : '';
    statusHTML = `<span class="plt-ridgedir-status plt-ridgedir-status-ok">✓ 計算済み（${(design.ridgeSegments?.length ?? 0)}畝${bandInfo}）</span>`;
  } else if (hasRidgeDir) {
    statusHTML = '<span class="plt-ridgedir-status">畝幅・条数・株間を入力すると自動計算されます</span>';
  } else {
    statusHTML = '<span class="plt-ridgedir-status">↑ エリア共通バーから畝方向を設定してください</span>';
  }

  return `
    <div class="plt-ridgedir-block">
      <div class="plt-ridgedir-row">
        ${previewBtnHTML}
        ${statusHTML}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════
//  ⚙️ 畝上比率（分析側専用アコーディオン）
//  Step8-7：rowWidth（ピッチ）＋ridgeRatioPct（畝上比率%）の1組モデルに一本化。
//  実務側は新ブロック（_adpBuildRidgeRatioSliderHTML）へ移設済みのため、
//  この関数群は分析側（パネルB・断面図を持たない）専用として残す。
// ═══════════════════════════════════════════

/** seg・cropIdからplantingDesignを取得する共通ヘルパー */
function _adpGetDesignFor(seg, cropId) {
  if (seg === 'analysis') return _adpAnalysisPlantingDesign || null;
  return _adpPracticecrops.find(c => c.cropId === cropId)?.plantingDesign || null;
}

/**
 * 畝配置の入力方式（'pitch'：ピッチ指定→畝数自動 / 'count'：畝数指定→ピッチ自動）を切り替える。
 * 'count'へ初めて切り替える際、既存のridgeSegments本数があればそれを目標畝数の初期値として
 * 引き継ぐ（切替直後に空欄で計算不能になるのを避けるため）。
 * 切替後は即座に全帯再計算・保存・関連UI再描画まで行う（デバウンス不要な単発操作のため）。
 * @param {string} cropId
 * @param {'pitch'|'count'} mode
 * @param {string} seg - 'practice'（現状は実務側のみUIを持つ）
 */
function _adpSetRidgeInputMode(cropId, mode, seg) {
  if (mode !== 'pitch' && mode !== 'count') return;
  const design = _adpGetDesignFor(seg, cropId);
  if (!design || design.ridgeInputMode === mode) return;

  design.ridgeInputMode = mode;
  if (mode === 'count' && !(design.targetRowCount > 0)) {
    design.targetRowCount = Array.isArray(design.ridgeSegments) && design.ridgeSegments.length > 0
      ? design.ridgeSegments.length : 1;
  }

  if (seg === 'analysis') {
    if (!_adpAnalysisPlantingDesign) return;
    PlantingLogic.recalcAnalysisRidgeSegments(_adpAnalysisPlantingDesign, PlantingLogic.effectivePitchCm(_adpAnalysisPlantingDesign), _adpArea, _adpHouseMargin);
  } else {
    PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin);
    const calcForSave = PlantingLogic.calcPlanting(design);
    design.purchase = calcForSave ? calcForSave.purchase : null;
    _adpSavePracticecrops(_adpArea?.id || _adpArea?.name || '');
  }

  _adpRefreshRidgeInputBlock();
  _adpRefreshUnifiedPreview();

  const card = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"]`);
  if (card) {
    _adpRefreshRidgeDirRow(card, cropId, seg, design);
    const calc = PlantingLogic.calcPlanting(design);
    const warn = PlantingLogic.areaWarn(design._bandAreaSqm ?? null, calc?.rowAreaSqm ?? null);
    const resultEl = card.querySelector('.plt-result');
    const warnContainer = card.querySelector('.plt-warn-wrap');
    if (resultEl) resultEl.innerHTML = _adpBuildPlantingResultHTML(calc, null, cropId);
    if (warnContainer) warnContainer.innerHTML = warn
      ? `<div class="plt-warn">⚠️ 畝面積（${warn.rowAreaSqm}㎡）と帯面積（${warn.bandAreaSqm}㎡）が${warn.diffPct}%乖離しています</div>`
      : '';
  }
}

/**
 * 畝上比率（ridgeRatioPct）スライダーHTMLを生成（分析側専用・常時表示）。
 * 実務側は新ブロックの _adpBuildRidgeRatioSliderHTML に一本化したため、
 * この関数はパネルBを持たない分析側専用として残す。
 * @param {string} seg - 'analysis'（実務側からは呼ばれなくなった）
 * @param {string} cropId
 * @param {object} design - plantingDesign
 */
function _adpBuildDetailWidthSection(seg, cropId, design) {
  const key = `${seg}:${cropId}`;
  const pitchCm = PlantingLogic.effectivePitchCm(design);
  const ratio = design.ridgeRatioPct ?? 50;
  const isProvisionalRatio = PlantingLogic.isProvisional(design, 'ridgeRatioPct');
  const derived = PlantingLogic.deriveRidgeWidths(design);
  const topCm  = derived ? derived.topCm  : '—';
  const pathCm = derived ? derived.pathCm : '—';

  const hintHTML = isProvisionalRatio
    ? `<div class="plt-detailwidth-hint">💡 均等配分（50%）を仮設定しています。作物に合わせて調整してください。</div>`
    : '';

  return `
    <div class="plt-detailwidth-row" data-detailwidth-key="${key}">
      <div class="plt-detailwidth-heading">畝上比率</div>
      ${hintHTML}
      <div class="plt-ridgeratio-row" data-ridgeratio-key="${cropId}">
        <label class="plt-label">畝上比率${isProvisionalRatio ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
        <input type="range" class="plt-ridgeratio-slider" min="10" max="90" step="1" value="${ratio}"
          oninput="_adpLiveUpdateRidgeRatio('${seg}', '${cropId}', this.value)"
          onchange="_adpUpdatePlantingField('${cropId}','ridgeRatioPct',this.value,'${seg}');_adpRefreshDetailPitchDisplay('${seg}','${cropId}')">
        <span class="plt-ridgeratio-val">${ratio}%（畝上${topCm}cm・畝間${pathCm}cm）</span>
      </div>
      <div class="plt-detailwidth-pitch">
        実効ピッチ：<span class="plt-detailwidth-pitch-val">${pitchCm ?? '—'}</span> cm
      </div>
    </div>`;
}

/**
 * 畝上比率の入力変更時に呼ぶ。実効ピッチ表示・畝セグメント・計算結果を更新する。
 * _adpUpdatePlantingField による design 更新の「後」に呼ぶこと（oninputで連結）。
 */
function _adpRefreshDetailPitchDisplay(seg, cropId) {
  // 畝上比率の連続入力時、帯再計算・DOM更新を300ms間引く
  _adpDebounce(`pitchdisplay:${seg}:${cropId}`, () => {
    const design = _adpGetDesignFor(seg, cropId);
    if (!design) return;

    const pitchCm = PlantingLogic.effectivePitchCm(design);
    if (seg === 'analysis') {
      PlantingLogic.recalcAnalysisRidgeSegments(design, pitchCm, _adpArea, _adpHouseMargin);
    } else {
      if (PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin)) {
        _adpSavePracticecrops(_adpArea?.id || _adpArea?.name || '');
      }
    }

    const card = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"]`);
    if (!card) return;

    const pitchValEl = card.querySelector('.plt-detailwidth-pitch-val');
    if (pitchValEl) pitchValEl.textContent = pitchCm ?? '—';

    // 暫定ヒント（畝上比率が編集されると不要になる）は編集後に消しておく。
    if (!PlantingLogic.isProvisional(design, 'ridgeRatioPct')) {
      const hintEl = card.querySelector('.plt-detailwidth-hint');
      if (hintEl) hintEl.remove();
    }

    _adpRefreshRidgeDirRow(card, cropId, seg, design);

    const calc = PlantingLogic.calcPlanting(design);
    const resultEl = card.querySelector('.plt-result');
    if (resultEl) resultEl.innerHTML = _adpBuildPlantingResultHTML(calc, null, cropId);

    if (seg !== 'analysis') {
      _adpRefreshUnifiedPreview();
      _adpRefreshCrossSectionIfActive(cropId);
    }
  }, 300);
}

/**
 * 1作物分の栽植設計カードHTMLを生成。
 */
/**
 * Step7-2（圃場マージン再設計・栽植プレビュー統合仕様書）：
 * 占有率合計バーと固定／暫定／自動の凡例を1行に統合したHTMLを生成する。
 * 旧 _adpBuildProvisionalLegendHTML（凡例のみ）と、_adpRenderPlantingPane内に

/**
 * 1作物分の栽植設計カードHTMLを生成。
 */
/**
 * Step7-2（圃場マージン再設計・栽植プレビュー統合仕様書）：
 * 占有率合計バーと固定／暫定／自動の凡例を1行に統合したHTMLを生成する。
 * 旧 _adpBuildProvisionalLegendHTML（凡例のみ）と、_adpRenderPlantingPane内に
 * 直接書かれていた占有率合計バー生成ロジック（total/over計算含む）を統合し、
 * 呼び出し側は isAnalysis を渡すだけで良い形に一本化した。
 *
 * - 凡例（🔒固定／🟡暫定／🗺️自動）は実務・分析どちらでも常に表示する説明文。
 *   🗺️自動＝占有率スライダーで最後の作物が残り%を自動的に受け取る既存機能
 *   （adp-pcc-auto-badgeと同じ意味。バー操作だけで計算が完結することを示す）。
 * - 占有率合計バーは実務側（isAnalysis=false）かつ作物が2件以上の場合のみ表示する
 *   （従来のratioBarHTML表示条件をそのまま踏襲）。分析側は凡例のみ表示する。
 *
 * @param {boolean} isAnalysis
 * @returns {string}
 */
function _adpBuildRatioLegendRow(isAnalysis) {
  const legendHTML = `
    <div class="plt-provisional-legend">
      <span class="plt-provisional-legend-item plt-provisional-legend-fixed">🔒 固定＝入力済み</span>
      <span class="plt-provisional-legend-item plt-provisional-legend-tentative">🟡 暫定＝自動計算中（未入力）</span>
      <span class="plt-provisional-legend-item plt-provisional-legend-auto">🗺️ 自動＝残り%を自動計算</span>
    </div>`;

  if (isAnalysis) {
    return `<div class="plt-ratiolegend-row plt-ratiolegend-row-analysis">${legendHTML}</div>`;
  }

  // 占有ゲージ整理：共通legend行の合計バーは撤去し、凡例テキストのみ残す。
  // 占有率の合計比率は「🤖自動設計」タブ内の残り%バー（_adpBuildAutoDesignPanel）側で
  // 視覚的に確認できるため、ここでは重複表示しない。
  return `<div class="plt-ratiolegend-row">${legendHTML}</div>`;
}

function _adpBuildPlantingCard({ cropId, cropName, ratio, design, isLast = false, isAnalysis = false }) {
  const calc = PlantingLogic.calcPlanting(design);
  const warn = isAnalysis ? null : PlantingLogic.areaWarn(design._bandAreaSqm ?? null, calc?.rowAreaSqm ?? null);
  const areaId = _adpArea?.id || _adpArea?.name || '';

  // 地図自動計算済みかどうか
  const hasAutoCalc = Array.isArray(design.ridgeSegments) && design.ridgeSegments.length > 0;

  // 畝方向の有無（エリア基準方向またはカード個別）
  const hasRidgeDir = !!_adpArea?.meta?.ridgeBaseDirection;

  // 占有率スライダー（実務側のみ）
  const sliderHTML = isAnalysis ? '' : `
    <div class="plt-slider-row">
      <label class="plt-label">占有率</label>
      <input type="range" min="0" max="100" value="${ratio}"
        class="adp-pcc-slider${isLast ? ' adp-pcc-slider-auto' : ''}"
        ${isLast ? 'disabled' : `oninput="_adpPreviewPracticeRatio('${cropId}', Number(this.value))" onchange="_adpUpdatePracticeRatio('${cropId}', Number(this.value))"`}>
      <span class="plt-ratio-val">${ratio}%${isLast ? ' <span class="adp-pcc-auto-badge">自動</span>' : ''}</span>
    </div>`;

  // 削除ボタン（実務側のみ）。Step8-7後半：「作物詳細」タブでカード全体がアコーディオンの
  // タップ対象になったため、削除ボタン自体のクリックが開閉トグルへ伝播しないようにする。
  const removeBtn = isAnalysis ? '' : `
    <button class="adp-pcc-remove" onclick="event.stopPropagation();_adpRemovePracticeCrop('${cropId}')" title="削除">✕</button>`;

  // 不一致警告（plt-warn-wrap でラップ → 部分更新時に querySelector で確実に取得できる）
  const warnHTML = `<div class="plt-warn-wrap">${warn ? `
    <div class="plt-warn">
      ⚠️ 畝面積（${warn.rowAreaSqm}㎡）と帯面積（${warn.bandAreaSqm}㎡）が${warn.diffPct}%乖離しています
    </div>` : ''}</div>`;

  // 収量見込み（cropDB.yieldPerPlant × purchase）
  let yieldHTMLInit = '';
  if (calc && calc.purchase > 0) {
    const _initCrop = _adpGetCropById(cropId);
    const _initYpp  = _initCrop?.yieldPerPlant;
    if (_initYpp != null) {
      const _initExpected = Math.round(calc.purchase * _initYpp * 10) / 10;
      yieldHTMLInit = `
      <div class="plt-result-item plt-result-item--yield">
        <span class="plt-result-label">収量見込み</span>
        <span class="plt-result-val">約 ${_initExpected.toLocaleString()} kg</span>
      </div>`;
    }
  }

  // 計算結果
  const calcHTML = calc ? `
    <div class="plt-result-grid">
      <div class="plt-result-item"><span class="plt-result-label">苗数</span><span class="plt-result-val">${calc.seedlings.toLocaleString()} 本</span></div>
      <div class="plt-result-item"><span class="plt-result-label">必要購入苗数</span><span class="plt-result-val">${calc.purchase.toLocaleString()} 本</span></div>
      <div class="plt-result-item"><span class="plt-result-label">畝面積</span><span class="plt-result-val">${calc.rowAreaSqm} ㎡</span></div>
      <div class="plt-result-item"><span class="plt-result-label">植栽密度</span><span class="plt-result-val">${calc.density ?? '—'} 株/㎡</span></div>
      <div class="plt-result-item"><span class="plt-result-label">総植栽距離</span><span class="plt-result-val">${calc.totalLine} m</span></div>
      ${yieldHTMLInit}
    </div>` : `<div class="plt-result-empty">必須項目（畝数・畝長・畝幅・条数・株間）を入力すると計算されます</div>`;

  const seg = isAnalysis ? 'analysis' : 'practice';

  // 地図で指定ボタン＋プレビューボタン＋ステータス（独立関数化・部分更新でも再利用するため）
  const ridgeDirBtnHTML = _adpBuildRidgeDirRowHTML(cropId, seg, design, hasAutoCalc, hasRidgeDir);

  // ── Step8-7：実務側（isAnalysis=false）はカードの入力フォームを全廃し、
  // 一覧・管理（ヘッダー・占有率スライダー・畝方向ボタン・警告・計算結果）のみ残す。
  // 数値入力は「調整」タブ（_adpBuildAdjustTabInner）に一本化済み。
  // Step8-7後半：「作物詳細」タブへの移行に伴い、ヘッダータップで開閉するアコーディオンにする
  // （新規の統計計算ロジックは追加せず、既存の中身をそのまま開閉できるようにするだけ）。
  if (!isAnalysis) {
    return `
    <div class="plt-card plt-cropdetail-card" data-crop-id="${cropId}">
      <div class="plt-card-header" onclick="_adpToggleCropDetailCard(this.closest('.plt-cropdetail-card'))" role="button" tabindex="0" aria-expanded="false">
        <span class="plt-crop-name-wrap">
          <span class="plt-crop-name">🌿 ${escHtml(cropName)}</span>
          <span class="plt-cropdetail-arrow">▼</span>
        </span>
        ${removeBtn}
      </div>
      <div class="plt-cropdetail-body">
        ${sliderHTML}
        ${ridgeDirBtnHTML}
        ${warnHTML}
        <div class="plt-result">
          <div class="plt-result-title">計算結果</div>
          ${calcHTML}
        </div>
      </div>
    </div>`;
  }

  // ── 分析側（isAnalysis=true）：パネルBを持たないためStep8-7対象外。従来どおりの構成を維持する。
  // 畝数・畝長の表示分岐
  // 自動計算済み → 読み取り専用表示（🗺️ アイコン付き）
  // 未設定 → 手動入力欄
  const rowsRowLengthHTML = hasAutoCalc ? `
    <div class="plt-input-item plt-input-auto">
      <label class="plt-label">畝数 <span class="plt-auto-badge">🗺️ 自動</span></label>
      <div class="plt-auto-val">${calc?.rows ?? '—'} 畝</div>
    </div>
    <div class="plt-input-item plt-input-auto">
      <label class="plt-label">平均畝長 <span class="plt-auto-badge">🗺️ 自動</span></label>
      <div class="plt-auto-val">${calc?.rowLength ?? '—'} m</div>
    </div>` : `
    <div class="plt-input-item">
      <label class="plt-label">畝数</label>
      <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.rows ?? ''}" placeholder="例: 10"
        oninput="_adpUpdatePlantingField('${cropId}','rows',this.value,'${seg}')"><span class="plt-unit">畝</span></div>
    </div>
    <div class="plt-input-item">
      <label class="plt-label">畝長</label>
      <div class="plt-input-wrap"><input type="number" class="plt-input" min="0.1" step="0.1" value="${design.rowLength ?? ''}" placeholder="例: 20"
        oninput="_adpUpdatePlantingField('${cropId}','rowLength',this.value,'${seg}')"><span class="plt-unit">m</span></div>
    </div>`;

  // 畝幅（ピッチ）：分析側はStep8-7の新ブロックを持たないため、カード側に単独表示のまま残す。
  const rowWidthHTML = `
    <div class="plt-rowwidth-row">
      <div class="plt-input-item" data-field="rowWidth">
        <label class="plt-label">畝幅${PlantingLogic.isProvisional(design, 'rowWidth') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
        <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.rowWidth ?? ''}" placeholder="例: 90"
          oninput="_adpUpdatePlantingField('${cropId}','rowWidth',this.value,'${seg}')"><span class="plt-unit">cm</span></div>
      </div>
    </div>`;

  // 畝上幅・畝間（詳細）セクション：分析側専用（ridgeRatioPct方式）。
  const detailWidthHTML = _adpBuildDetailWidthSection(seg, cropId, design);

  return `
    <div class="plt-card" data-crop-id="${cropId}">
      <div class="plt-card-header">
        <span class="plt-crop-name">🌿 ${escHtml(cropName)}</span>
        ${removeBtn}
      </div>
      ${sliderHTML}
      ${ridgeDirBtnHTML}
      ${rowWidthHTML}
      <div class="plt-inputs">
        <div class="plt-input-grid">
          ${rowsRowLengthHTML}
        </div>
        <div class="plt-detail-accordion" data-detail-key="${seg}:${cropId}">
          <button type="button" class="plt-detail-toggle" onclick="_adpToggleDetailAccordion(this)" aria-expanded="false">
            <span class="plt-detail-toggle-label">🔧 詳細設定（条数・株間・条間・欠株率・畝上幅畝間）</span>
            <span class="plt-detail-toggle-arrow">▼</span>
          </button>
          <div class="plt-detail-accordion-body">
            <div class="plt-input-grid">
              <div class="plt-input-item" data-field="linesPerRow">
                <label class="plt-label">条数${PlantingLogic.isProvisional(design, 'linesPerRow') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
                <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.linesPerRow ?? ''}" placeholder="例: 2"
                  oninput="_adpUpdatePlantingField('${cropId}','linesPerRow',this.value,'${seg}')"><span class="plt-unit">条</span></div>
              </div>
              <div class="plt-input-item" data-field="plantSpacing">
                <label class="plt-label">株間${PlantingLogic.isProvisional(design, 'plantSpacing') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
                <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.plantSpacing ?? ''}" placeholder="例: 30"
                  oninput="_adpUpdatePlantingField('${cropId}','plantSpacing',this.value,'${seg}')"><span class="plt-unit">cm</span></div>
              </div>
              <div class="plt-input-item" data-field="rowSpacing">
                <label class="plt-label">条間${PlantingLogic.isProvisional(design, 'rowSpacing') ? ' <span class="plt-badge-provisional">暫定</span>' : ''}</label>
                <div class="plt-input-wrap"><input type="number" class="plt-input" min="1" value="${design.rowSpacing ?? ''}" placeholder="例: 40"
                  oninput="_adpUpdatePlantingField('${cropId}','rowSpacing',this.value,'${seg}')"><span class="plt-unit">cm</span></div>
              </div>
              <div class="plt-input-item plt-input-item-wide">
                <label class="plt-label">欠株率 <span class="plt-label-opt">任意</span></label>
                <div class="plt-input-wrap"><input type="number" class="plt-input" min="0" max="100" value="${design.missingRate ?? ''}" placeholder="例: 5"
                  oninput="_adpUpdatePlantingField('${cropId}','missingRate',this.value,'${seg}')"><span class="plt-unit">%</span></div>
              </div>
            </div>
            ${detailWidthHTML}
          </div>
        </div>
      </div>
      ${warnHTML}
      <div class="plt-result">
        <div class="plt-result-title">計算結果</div>
        ${calcHTML}
      </div>
    </div>`;
}

/**
 * 詳細設定アコーディオン（条数・株間・条間・欠株率・畝上幅畝間）の開閉トグル。
 * 畝設計UI統合仕様書 Step5：開閉状態はDOM上のみで保持し、保存はしない
 * （カード再描画（rowWidth変更等）が起きると閉じた状態にリセットされる想定）。
 */
function _adpToggleDetailAccordion(btn) {
  const wrap = btn.closest('.plt-detail-accordion');
  if (!wrap) return;
  const isOpen = wrap.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

/**
 * Step8-7後半（畝断面図UX再設計・4タブ構成）：
 * 「作物詳細」タブの1作物ぶんのカード（.plt-cropdetail-card）の開閉トグル。
 * 開閉状態はDOM上のみで保持し保存はしない（_adpToggleDetailAccordionと同じ扱い。
 * カード再描画（作物追加・削除・占有率変更等）が起きると閉じた状態にリセットされる想定）。
 */
function _adpToggleCropDetailCard(cardEl) {
  if (!cardEl) return;
  const isOpen = cardEl.classList.toggle('open');
  const headerEl = cardEl.querySelector('.plt-card-header');
  if (headerEl) headerEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

/**
 * 入力フィールド変更時のハンドラ。
 * seg = 'practice' | 'analysis'
 */
/**
 * 手動編集されたフィールドを provisionalFields から除外する（暫定→確定扱いへ）。
 */
function _adpUnmarkProvisional(design, field) {
  if (Array.isArray(design?.provisionalFields)) {
    const i = design.provisionalFields.indexOf(field);
    if (i >= 0) design.provisionalFields.splice(i, 1);
  }
}


/**
 * .plt-ridgedir-block（畝方向ボタン／プレビューボタン／ステータス／実形状SVG）を
 * DOM上で再描画する共通処理。rowWidth変更でridgeSegmentsが変わった際、表示ズレを防ぐために呼ぶ。
 * ブロック単位（1ルート要素）で差し替えることで、インラインSVG部分が重複追加されないようにしている。
 */
function _adpRefreshRidgeDirRow(card, cropId, seg, design) {
  const ridgeDirBlock = card?.querySelector('.plt-ridgedir-block');
  if (!ridgeDirBlock) return;
  const hasAutoCalc = Array.isArray(design.ridgeSegments) && design.ridgeSegments.length > 0;
  const hasRidgeDir = !!_adpArea?.meta?.ridgeBaseDirection;
  ridgeDirBlock.outerHTML = _adpBuildRidgeDirRowHTML(cropId, seg, design, hasAutoCalc, hasRidgeDir);
}

function _adpUpdatePlantingField(cropId, field, value, seg) {
  const areaId = _adpArea?.id || _adpArea?.name || '';
  // ①負の値ガード：入力値は即座に0未満を0へ丸める（空文字＝未入力はnullのまま許容）
  const parsed = value === '' ? null : Math.max(0, Number(value) || 0);

  if (seg === 'analysis') {
    if (!_adpAnalysisPlantingDesign) return;
    _adpAnalysisPlantingDesign[field] = parsed;
    _adpUnmarkProvisional(_adpAnalysisPlantingDesign, field);

    // 「暫定」バッジは体感速度優先で即座に除去（重い再計算・再描画のみdebounce）
    const cardImmediate = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"]`);
    const badgeElImmediate = cardImmediate?.querySelector(`.plt-input-item[data-field="${field}"] .plt-badge-provisional`);
    if (badgeElImmediate) badgeElImmediate.remove();

    // ②連続入力時の再計算・DOM更新を300ms間引き
    _adpDebounce(`pltfield:analysis:${cropId}:${field}`, () => {
      if (!_adpAnalysisPlantingDesign) return;
      if (field === 'rowWidth' || field === 'ridgeRatioPct') {
        PlantingLogic.recalcAnalysisRidgeSegments(_adpAnalysisPlantingDesign, PlantingLogic.effectivePitchCm(_adpAnalysisPlantingDesign), _adpArea, _adpHouseMargin);
      }
      // 結果部分のみ再描画（入力フォーカスを失わないよう result div のみ更新）
      const card = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"]`);
      if (!card) return;
      const calc    = PlantingLogic.calcPlanting(_adpAnalysisPlantingDesign);
      const resultEl = card.querySelector('.plt-result');
      if (resultEl) resultEl.innerHTML = _adpBuildPlantingResultHTML(calc, null, cropId);
      if (field === 'rowWidth' || field === 'ridgeRatioPct') {
        _adpRefreshRidgeDirRow(card, cropId, seg, _adpAnalysisPlantingDesign);
      }
    }, 300);
    return;
  }

  // 実務側：値の代入は即時（保存・再計算はdebounce後にcropIdで改めて検索する＝
  // debounce待機中に配列の並び替え・削除が起きてもindexのズレで誤動作しないようにする）
  const idxNow = _adpPracticecrops.findIndex(c => c.cropId === cropId);
  if (idxNow < 0) return;
  if (!_adpPracticecrops[idxNow].plantingDesign) {
    _adpPracticecrops[idxNow].plantingDesign = PlantingLogic.initDesign(cropId);
  }
  _adpPracticecrops[idxNow].plantingDesign[field] = parsed;
  _adpUnmarkProvisional(_adpPracticecrops[idxNow].plantingDesign, field);

  // 「暫定」バッジは即座に除去
  const cardImmediate2 = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"]`);
  const badgeElImmediate2 = cardImmediate2?.querySelector(`.plt-input-item[data-field="${field}"] .plt-badge-provisional`);
  if (badgeElImmediate2) badgeElImmediate2.remove();

  _adpDebounce(`pltfield:practice:${cropId}:${field}`, () => {
    const idx = _adpPracticecrops.findIndex(c => c.cropId === cropId);
    if (idx < 0) return;
    const design = _adpPracticecrops[idx].plantingDesign;
    if (!design) return;

    // rowWidth・ridgeRatioPct・targetRowCountが変わった場合、エリア共通の畝方向が設定済みなら
    // 全帯を再計算（境界ギャップは隣接畝のridgeRatioPctにも依存するため、ratio変更時も再計算が必要。
    // targetRowCountは畝数指定方式でのピッチ逆算のトリガー）
    if (field === 'rowWidth' || field === 'ridgeRatioPct' || field === 'targetRowCount') {
      PlantingLogic.recalcAllBands(_adpPracticecrops, _adpArea, _adpHouseMargin);
    }

    // purchase を先に計算して書き戻してから保存（施肥タブの株数基準に必要）
    const calcForSave = PlantingLogic.calcPlanting(design);
    design.purchase = calcForSave ? calcForSave.purchase : null;
    _adpSavePracticecrops(areaId);

    // 結果部分のみ再描画
    const card = document.querySelector(`#planting-result .plt-card[data-crop-id="${cropId}"]`);
    if (!card) return;
    const calc    = calcForSave; // 再計算不要・上で取得済み
    const warn    = PlantingLogic.areaWarn(design._bandAreaSqm ?? null, calc?.rowAreaSqm ?? null);
    const resultEl      = card.querySelector('.plt-result');
    const warnContainer = card.querySelector('.plt-warn-wrap');
    if (resultEl)      resultEl.innerHTML      = _adpBuildPlantingResultHTML(calc, null, cropId);
    if (warnContainer) warnContainer.innerHTML = warn
      ? `<div class="plt-warn">⚠️ 畝面積（${warn.rowAreaSqm}㎡）と帯面積（${warn.bandAreaSqm}㎡）が${warn.diffPct}%乖離しています</div>`
      : '';

    // rowWidth・ridgeRatioPct・targetRowCount変更時はridgeSegmentsが再計算され得るため、
    // プレビューボタン／ステータス行（plt-ridgedir-row）・統合プレビュー（Step4）も再描画してズレを防ぐ
    if (field === 'rowWidth' || field === 'ridgeRatioPct' || field === 'targetRowCount') {
      _adpRefreshRidgeDirRow(card, cropId, seg, design);
      _adpRefreshUnifiedPreview();
      // Step8-7：rowWidth・ridgeRatioPct・targetRowCountは断面図・拡大詳細図・入力グリッドの
      // 畝上幅／畝間／ピッチ表示に使われるため同期する
      _adpRefreshCrossSectionIfActive(cropId);
    }
  }, 300);
}

/** 計算結果HTMLだけ生成するヘルパー（部分更新用） */
function _adpBuildPlantingResultHTML(calc, _warn, cropId) {
  // 警告は呼び出し元（plt-warn-wrap）で管理するため、ここでは計算結果のみ出力する

  // 収量見込み（cropDB.yieldPerPlant × purchase）
  let yieldHTML = '';
  if (calc && calc.purchase > 0 && cropId) {
    const crop = _adpGetCropById(cropId);
    const ypp  = crop?.yieldPerPlant;
    if (ypp != null) {
      const expected = Math.round(calc.purchase * ypp * 10) / 10;
      yieldHTML = `
      <div class="plt-result-item plt-result-item--yield">
        <span class="plt-result-label">収量見込み</span>
        <span class="plt-result-val">約 ${expected.toLocaleString()} kg</span>
      </div>`;
    }
  }

  const calcHTML = calc ? `
    <div class="plt-result-grid">
      <div class="plt-result-item"><span class="plt-result-label">苗数</span><span class="plt-result-val">${calc.seedlings.toLocaleString()} 本</span></div>
      <div class="plt-result-item"><span class="plt-result-label">必要購入苗数</span><span class="plt-result-val">${calc.purchase.toLocaleString()} 本</span></div>
      <div class="plt-result-item"><span class="plt-result-label">畝面積</span><span class="plt-result-val">${calc.rowAreaSqm} ㎡</span></div>
      <div class="plt-result-item"><span class="plt-result-label">植栽密度</span><span class="plt-result-val">${calc.density ?? '—'} 株/㎡</span></div>
      <div class="plt-result-item"><span class="plt-result-label">総植栽距離</span><span class="plt-result-val">${calc.totalLine} m</span></div>
      ${yieldHTML}
    </div>` : `<div class="plt-result-empty">必須項目（畝数・畝長・畝幅・条数・株間）を入力すると計算されます</div>`;
  return `<div class="plt-result-title">計算結果</div>${calcHTML}`;
}

// ═══════════════════════════════════════════
//  👁️ 畝プレビュー（モーダル・分析側専用）
//  Step3で実務側は実形状SVGをカード内に常時インライン表示するようになったため、
//  このモーダルは帯（_bandPolygon）を持たない分析側（セクション4対象外）専用として維持する。
//  「👁️ プレビュー」ボタンから起動し、畝ごとの長さ比例SVG簡易図解＋集計サマリーを表示する。
// ═══════════════════════════════════════════

/**
 * プレビューモーダルを開く（分析側専用）。
 * seg: 'analysis'
 */
function _adpShowPlantingPreview(cropId, seg) {
  const design = (seg === 'analysis')
    ? _adpAnalysisPlantingDesign
    : (_adpPracticecrops.find(c => c.cropId === cropId)?.plantingDesign || null);

  if (!design || !Array.isArray(design.ridgeSegments) || design.ridgeSegments.length === 0) {
    showToast('畝が自動計算されていません', 'amber');
    return;
  }

  const calc     = PlantingLogic.calcPlanting(design);
  const cropName = _adpCropIdToName(cropId);

  // 分析側は帯を持たないため横バー一覧のみ表示
  const mainHTML    = _adpBuildRidgeBarListSVG(design);
  const summaryHTML = _adpBuildPlantingResultHTML(calc, null, cropId);

  const titleEl = document.getElementById('preview-modal-title');
  const bodyEl  = document.getElementById('preview-modal-body');
  if (titleEl) titleEl.textContent = `🌿 ${cropName} — 畝プレビュー`;
  if (bodyEl)  bodyEl.innerHTML = mainHTML + `<div class="preview-summary">${summaryHTML}</div>`;

  const overlay = document.getElementById('preview-modal-overlay');
  if (overlay) overlay.classList.add('open');
}

/**
 * 圃場マージン再設計・栽植プレビュー統合仕様書 Step4：
 * 栽植設計エリア全体の統合作物プレビューSVGを生成する（実務側専用・エリア全体で1つだけ表示）。
 * 従来カードごとに重複表示していた実形状SVG（旧・_adpBuildRidgeShapePreviewSVG、
 * 「選択中＝緑／他作物＝薄グレー」方式）を撤去し、全作物を同時・色分けして描画する。
 * - 圃場ポリゴンの実外周線
 * - 全作物の帯（_bandPolygon）を、_adpPracticecrops内の並び順インデックスに応じた
 *   固有色（plt-cropcolor-0〜7を巡回）で塗り分け表示
 * - 各作物の畝（ridgeSegments の p1/p2 実座標）を帯と同色で実際の位置・向き・長さに描画
 * - 圃場マージン設定済みの場合（全cultivationMode共通）：
 *   外膜マージンの実効境界（グレー破線）・入口帯（オレンジ＋🚪ラベル）・
 *   反対側帯（青＋🔄ラベル）を重ねて表示
 * - 畝幅寸法線オーバーレイ（タップで編集可）は作物ごとに描画するが、視認性を優先し
 *   従来通り種別（畝上幅＝violet／畝間＝blue）で色分け（作物色との混同を避けるため意図的に維持）
 * - 凡例：作物ごとの色チップ＋作物名＋占有率%、＋圃場マージン系（実効境界／入口／反対側）＋寸法線
 * 座標変換は RidgeGeometry.toLocalCoords / toLocalPoint（重心原点のローカルXY）を
 * 一貫して使うことで、帯・畝・ハウスマージンすべてが同一座標系で正しく重なる。
 *
 * Step7-1（圃場マージン再設計・栽植プレビュー統合仕様書）：
 * - 圃場外周は作物・畝の計算有無に関わらず常に描画する（辺選択トグルの置き場所を確保するため）。
 * - _adpUnifiedPreviewEdgeMode（'entrance'／'ridgedir'）で選択中の辺を1本だけハイライト表示する
 *   （トグルUI自体はStep7-3で新設。ここでは状態変数を読んで描くだけ）。
 *
 * @returns {string} HTML文字列（圃場データ取得不可時のみ空文字を返す＝非表示）
 */
function _adpBuildUnifiedRidgePreviewSVG() {
  const rawPolygon = PlantingLogic.getFieldPolygon(_adpArea);
  if (!rawPolygon || typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.toLocalCoords !== 'function') {
    return '';
  }

  const crops = _adpPracticecrops || [];
  // Step7-1（圃場マージン再設計・栽植プレビュー統合仕様書）：
  // 従来は畝計算が1つも無いと空文字を返し非表示にしていたが、これだと畝方向を
  // 最初に設定する前段階で辺選択トグル（Step7-3）の置き場所が無くなってしまう。
  // → 圃場外周だけは常に描画し、作物帯・畝・寸法線は計算済みのものだけ重ねる形に変更する。

  const { origin, points: fieldLocalPts } = RidgeGeometry.toLocalCoords(rawPolygon);
  if (!fieldLocalPts.length) return '';

  const toLocal = (pt) => RidgeGeometry.toLocalPoint(pt, origin);

  // --- viewBox 計算（圃場外周のbounding boxを基準にアスペクト比維持でフィット） ---
  const xs = fieldLocalPts.map(p => p.x);
  const ys = fieldLocalPts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 0.1);
  const h = Math.max(maxY - minY, 0.1);

  const VIEW  = 320; // 正方形viewBox（余白はレターボックス的に生じる想定）
  const PAD   = 34;  // 入口・反対側帯ラベルがはみ出さないよう余裕を持たせる
  const scale = Math.min((VIEW - PAD * 2) / w, (VIEW - PAD * 2) / h);
  const offX  = (VIEW - w * scale) / 2;
  const offY  = (VIEW - h * scale) / 2;

  // ローカル座標は北=+Yのため、SVG（Y下向き）に合わせて上下反転
  const toSvg = (p) => ({
    x: offX + (p.x - minX) * scale,
    y: offY + (maxY - p.y) * scale,
  });
  const ptsStr = (pts) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  let svgBody = '';
  const labelDescriptors = []; // Step6：入口/反対側ラベル＋各作物の畝寸法ラベルをここに集約し、最後に一括で衝突解決する

  // --- 1. 圃場外周線 ---
  const fieldSvgPts = fieldLocalPts.map(toSvg);
  svgBody += `<polygon points="${ptsStr(fieldSvgPts)}" class="plt-shapesvg-field" />`;

  // --- 1.5 辺ハイライト（Step7-1：トグル選択中の辺を1本だけハイライト） ---
  // トグルUI自体はStep7-3で新設。ここでは _adpUnifiedPreviewEdgeMode を読んで描画するだけ。
  // 辺の端点は fieldSvgPts（圃場外周のSVG座標。rawPolygonと同じ頂点順）をそのまま使い、
  // 座標変換・辺情報の再取得は増やさない。
  const highlightEdgeIdx = _adpGetUnifiedPreviewHighlightEdgeIndex(rawPolygon, fieldSvgPts.length);
  if (highlightEdgeIdx != null) {
    const n = fieldSvgPts.length;
    const ha = fieldSvgPts[highlightEdgeIdx];
    const hb = fieldSvgPts[(highlightEdgeIdx + 1) % n];
    const highlightClass = _adpUnifiedPreviewEdgeMode === 'ridgedir'
      ? 'plt-shapesvg-edgehighlight-ridgedir'
      : 'plt-shapesvg-edgehighlight-entrance';
    svgBody += `<line x1="${ha.x.toFixed(1)}" y1="${ha.y.toFixed(1)}" x2="${hb.x.toFixed(1)}" y2="${hb.y.toFixed(1)}" class="plt-shapesvg-edgehighlight ${highlightClass}" />`;
  }

  // --- 2. 圃場マージン（外膜オフセット境界・入口帯・反対側帯） ---
  // 表示条件は撤廃済み：全cultivationMode（露地含む）で圃場マージンを反映する。
  const hm = _adpHouseMargin || null;
  let marginNoteHTML = '';
  let hasMarginLine = false, hasEntrance = false, hasOpposite = false;
  let entranceDepthLabel = '', oppositeDepthLabel = '';

  if (hm && typeof RidgeGeometry.computeHouseGeometry === 'function') {
    const geo = RidgeGeometry.computeHouseGeometry(rawPolygon, hm);

    if (Array.isArray(geo.outerPolygon) && geo.outerPolygon.length >= 3 && Number(hm.frameMarginM) > 0) {
      const marginSvgPts = geo.outerPolygon.map(p => toSvg(toLocal(p)));
      svgBody += `<polygon points="${ptsStr(marginSvgPts)}" class="plt-shapesvg-marginline" />`;
      hasMarginLine = true;
      marginNoteHTML = `<div class="plt-shapesvg-note">📏 外膜マージン ${hm.frameMarginM}m を内側に反映した実効境界（グレー破線）です。畝・苗数はこの内側だけで計算されます。</div>`;
    }

    // computeHouseGeometry の穴の並び順（entrance→opposite、それぞれ条件を満たす場合のみ）に合わせてラベルを対応させる。
    // oppositeDepthM は未指定（null/undefined/''）ならentranceDepthMを共通値として使うフォールバックをridgeGeometry.js側と同じ条件で再現する。
    const entranceDepthM = Number(hm.entranceDepthM) || 0;
    const oppositeDepthM = (hm.oppositeDepthM === undefined || hm.oppositeDepthM === null || hm.oppositeDepthM === '')
      ? entranceDepthM
      : (Number(hm.oppositeDepthM) || 0);
    const holeKinds = [];
    if (entranceDepthM > 0) holeKinds.push('entrance');
    if (oppositeDepthM > 0 && geo.oppositeEdgeIndex >= 0) holeKinds.push('opposite');

    (geo.holes || []).forEach((holeLatLngs, i) => {
      const kind = holeKinds[i];
      if (!kind || !Array.isArray(holeLatLngs) || holeLatLngs.length < 3) return;

      const holeLocal = holeLatLngs.map(toLocal);
      const holeSvgPts = holeLocal.map(toSvg);
      const cx = holeLocal.reduce((s, p) => s + p.x, 0) / holeLocal.length;
      const cy = holeLocal.reduce((s, p) => s + p.y, 0) / holeLocal.length;
      const dirLen = Math.sqrt(cx * cx + cy * cy) || 1;
      // 圃場重心（ローカル原点）から穴の中心へ向かう方向に、さらに1.8mラベルを押し出す
      const labelLocal = { x: cx + (cx / dirLen) * 1.8, y: cy + (cy / dirLen) * 1.8 };
      const labelSvg = toSvg(labelLocal);

      // UX見直し（2026-07）：入口/反対側の帯もタップで一文説明を表示する（作物に紐づかないため編集ボタンは出さない＝cropId省略）。
      const escAttrHole = (s) => String(s).replace(/"/g, '&quot;');
      const holeExplainAttr = (text) => `data-explain="${escAttrHole(text)}" onclick="_adpShowDimlineExplain(this)"`;

      if (kind === 'entrance') {
        const entranceAttr = holeExplainAttr(`入口奥行き${entranceDepthM}mの分、この辺からの利用可能幅が圧縮されています。`);
        svgBody += `<polygon points="${ptsStr(holeSvgPts)}" class="plt-shapesvg-entrance" ${entranceAttr} />`;
        labelDescriptors.push({ x: labelSvg.x, y: labelSvg.y, text: `🚪入口 奥行き${entranceDepthM}m`, cssClass: 'plt-shapesvg-entrance-label', onclick: entranceAttr });
        hasEntrance = true;
        entranceDepthLabel = `${entranceDepthM}m`;
      } else if (kind === 'opposite') {
        const isFallback = (hm.oppositeDepthM === undefined || hm.oppositeDepthM === null || hm.oppositeDepthM === '');
        const oppositeAttr = holeExplainAttr(
          isFallback
            ? `反対側奥行き${oppositeDepthM}mは「入口と同じ値を使う」設定により、入口奥行きと同じ値を使用しています。`
            : `反対側奥行き${oppositeDepthM}mの分、この辺からの利用可能幅が圧縮されています。`
        );
        svgBody += `<polygon points="${ptsStr(holeSvgPts)}" class="plt-shapesvg-opposite" ${oppositeAttr} />`;
        labelDescriptors.push({ x: labelSvg.x, y: labelSvg.y, text: `🔄反対側 奥行き${oppositeDepthM}m`, cssClass: 'plt-shapesvg-opposite-label', onclick: oppositeAttr });
        hasOpposite = true;
        oppositeDepthLabel = `${oppositeDepthM}m`;
      }
    });
  }

  // --- 3. 全作物の帯・畝・寸法線（作物ごとに固有色で描画） ---
  const cropLegendItems = [];
  let anyDim = false, anyDimSchematic = false;

  crops.forEach((entry, idx) => {
    const band = entry?.plantingDesign?._bandPolygon;
    const colorClass = `plt-cropcolor-${idx % 8}`;
    const cropName = _adpCropIdToName(entry.cropId);

    if (Array.isArray(band) && band.length >= 3) {
      const bandSvgPts = band.map(p => toSvg(toLocal(p)));
      svgBody += `<polygon points="${ptsStr(bandSvgPts)}" class="plt-shapesvg-cropband ${colorClass}" />`;
      cropLegendItems.push(`<span class="plt-shapesvg-legend-item"><i class="plt-shapesvg-swatch ${colorClass}"></i>${cropName}（${entry.ratio}%）</span>`);
    }

    const segments = entry?.plantingDesign?.ridgeSegments || [];
    segments.forEach((seg, i) => {
      if (!seg?.p1 || !seg?.p2) return;
      const a = toSvg(toLocal(seg.p1));
      const b = toSvg(toLocal(seg.p2));
      const lenLabel = (seg.length != null) ? `：${seg.length}m` : '';
      svgBody += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="plt-shapesvg-cropridge ${colorClass}"><title>${cropName} 畝${i + 1}${lenLabel}</title></line>`;
    });

    // 畝幅寸法線オーバーレイ（UX見直し・2026-07：タップでその場に一文説明を表示）を作物ごとに重ねる
    const dimResult = _adpBuildRidgeDimensionSVG(entry.cropId, entry.plantingDesign || null, toLocal, toSvg, fieldLocalPts);
    if (dimResult.hasDim) {
      svgBody += dimResult.svg;
      if (Array.isArray(dimResult.labels)) labelDescriptors.push(...dimResult.labels);
      anyDim = true;
      if (dimResult.isSchematic) anyDimSchematic = true;
    }
  });

  // --- 3.5 ラベル一括衝突解決（Step6）---
  // 入口/反対側ラベル・各作物の畝寸法ラベルをまとめて解決し、帯・線・寸法線本体より後（最前面）に追加する。
  svgBody += _adpRenderLabelsSVG(_adpResolveLabelCollisions(labelDescriptors));

  // --- 4. 凡例 ---
  const legendItems = [...cropLegendItems];
  if (hasMarginLine) {
    legendItems.push(`<span class="plt-shapesvg-legend-item"><i class="plt-shapesvg-swatch plt-shapesvg-swatch-margin"></i>外膜マージン実効境界</span>`);
  }
  if (hasEntrance) {
    legendItems.push(`<span class="plt-shapesvg-legend-item"><i class="plt-shapesvg-swatch plt-shapesvg-swatch-entrance"></i>🚪 入口（奥行き${entranceDepthLabel}）</span>`);
  }
  if (hasOpposite) {
    legendItems.push(`<span class="plt-shapesvg-legend-item"><i class="plt-shapesvg-swatch plt-shapesvg-swatch-opposite"></i>🔄 反対側（奥行き${oppositeDepthLabel}）</span>`);
  }
  if (anyDim) {
    legendItems.push(`<span class="plt-shapesvg-legend-item"><i class="plt-shapesvg-swatch plt-shapesvg-swatch-dim"></i>📏 畝幅寸法線（タップで説明）</span>`);
  }

  const dimNoteHTML = anyDimSchematic
    ? `<div class="plt-dimline-schematic-note">📏 寸法線は模式図です（畝上幅・畝間の内訳は実際のポリゴン形状には反映されません）。</div>`
    : '';

  // UX見直し（2026-07）：ゾーン判定バッジ。矩形ゾーンは従来どおり無表示（正常時は静かに）、
  // 余剰形状ゾーンが成立している場合のみ警告として表示し、タップで一文説明を出す。
  const zoneInfo = (typeof PlantingLogic.getLastZoneInfo === 'function') ? PlantingLogic.getLastZoneInfo() : { valid: false };
  const escAttrZone = (s) => String(s).replace(/"/g, '&quot;');
  const zoneBadgeHTML = (zoneInfo.valid && zoneInfo.leftoverAreaSqm > 0.5)
    ? `<button type="button" class="plt-zonebadge plt-zonebadge-surplus"
        data-explain="${escAttrZone(`この圃場は入口辺と畝方向から作れる矩形（${zoneInfo.rectAreaSqm}m²）に収まりきらないため、残り${zoneInfo.leftoverAreaSqm}m²を余剰形状ゾーンとして別枠で計算しています。占有率の高い作物から矩形側に優先配置されます。`)}"
        onclick="_adpShowDimlineExplain(this)">⚠️ 余剰形状ゾーンあり</button>`
    : '';

  return `
    <div class="plt-shapesvg-wrap" id="unified-ridge-preview">
      ${zoneBadgeHTML}
      <svg viewBox="0 0 ${VIEW} ${VIEW}" class="plt-shapesvg" xmlns="http://www.w3.org/2000/svg">
        ${svgBody}
      </svg>
      ${marginNoteHTML}
      ${dimNoteHTML}
      <div class="plt-shapesvg-legend">${legendItems.join('')}</div>
    </div>`;
}

/**
 * Step7-1：統合プレビューSVG上でハイライトすべき辺のインデックスを返す。
 * _adpUnifiedPreviewEdgeMode の現在値に応じて、対応する辺インデックスを
 * 既存の状態（圃場マージンの入口辺／エリア共通の畝方向辺）から取得する。
 * インデックスが辺総数の範囲外・未確定の場合は null を返し、ハイライトなしとする。
 *
 * @param {Array<{lat:number,lng:number}>} rawPolygon - 圃場ポリゴン
 * @param {number} edgeCount - 圃場の辺の総数（＝頂点数）
 * @returns {number|null}
 */
function _adpGetUnifiedPreviewHighlightEdgeIndex(rawPolygon, edgeCount) {
  const mode = _adpUnifiedPreviewEdgeMode;
  if (!mode || !edgeCount) return null;

  if (mode === 'entrance') {
    const hm = _adpHouseMargin || {};
    let idx = Number.isInteger(hm.entranceEdgeIndex) ? hm.entranceEdgeIndex : -1;
    if (idx < 0 && rawPolygon && typeof RidgeGeometry !== 'undefined' && typeof RidgeGeometry.computeHouseGeometry === 'function') {
      const geo = RidgeGeometry.computeHouseGeometry(rawPolygon, hm);
      idx = Number.isInteger(geo.entranceEdgeIndex) ? geo.entranceEdgeIndex : -1;
    }
    return (idx >= 0 && idx < edgeCount) ? idx : null;
  }

  if (mode === 'ridgedir') {
    const dir = _adpArea?.meta?.ridgeBaseDirection;
    const idx = (dir && Number.isInteger(dir.edgeIndex)) ? dir.edgeIndex : -1;
    return (idx >= 0 && idx < edgeCount) ? idx : null;
  }

  return null;
}

/**
 * 統合作物プレビュー（Step4）をDOM上で部分更新する。
 * 圃場マージン変更・畝方向変更・畝幅寸法編集など、bandやridgeSegmentsが変わり得る操作の後に呼ぶ。
 * - 既に表示中（#unified-ridge-preview が存在）：内容を再生成して outerHTML 差し替え。
 *   再生成結果が空文字（＝計算対象が無くなった）場合は要素そのものを削除する。
 * - 未表示（要素が無い）：再生成結果があれば .plt-edgetoggle-bar の直後に挿入する
 *   （Step7-5の並び順：占有率legend→辺選択トグル→統合プレビュー→圃場マージン設定 に一致する位置）。
 */
function _adpRefreshUnifiedPreview() {
  const container = document.getElementById('planting-result');
  if (!container) return;

  const wrap = document.getElementById('unified-ridge-preview');
  const html = _adpBuildUnifiedRidgePreviewSVG();

  if (wrap) {
    if (html) wrap.outerHTML = html;
    else wrap.remove();
    return;
  }
  if (!html) return;

  const edgeBar = container.querySelector('.plt-edgetoggle-bar');
  if (edgeBar) edgeBar.insertAdjacentHTML('afterend', html);
}

/**
 * Step8-7：畝幅寸法線オーバーレイ（表示専用）を生成する。
 * 代表1組（design.ridgeSegments[0]・[1]）の中心点間に、畝方向の法線ベクトル
 * （RidgeGeometry.calcRidgesと同じ90°回転規則）方向へピッチ全長分の寸法線を描画する。
 * - design.ridgeRatioPctから派生したpathCmが0以下：ピッチ全体を1本
 * - pathCmが正の値：ピッチをridgeRatioPctで按分した畝上幅／畝間の2区間（模式図・色分け）
 * - 畝が1列のみの場合：エリア共通の畝方向（法線）を使い、破線で模式的に延長表示
 * 直接編集UIは持たない。各線本体（当たり判定込み）・数値ラベルのタップは
 * _adpShowDimlineExplain でその場に一文説明をポップオーバー表示し、
 * ポップオーバー内の「編集する」ボタンから _adpNavigateToRidgeInput で
 * 断面図まわりの新ブロック（入力群）へスクロール＋ハイライト誘導する。
 *
 * @param {string} cropId
 * @param {object|null} design - plantingDesign（実務側のみ対象）
 * @param {function} toLocal - latlng → ローカルXY[m]変換（呼び出し元と同一originを使うこと）
 * @param {function} toSvg   - ローカルXY[m] → SVG座標変換（呼び出し元と同一スケールを使うこと）
 * @param {Array<{x:number,y:number}>} [fieldLocalPts] - 圃場外周のローカル座標点列。
 *   隣接畝（seg1）が無い「畝1列のみ」の場合の符号補正に使用する（省略時は補正なし＝従来挙動）。
 * @returns {{svg: string, hasDim: boolean, isSchematic: boolean}}
 */
/**
 * Step6（畝設計UI統合・ラベル衝突回避）：
 * テキストの内容から、SVGラベルのバウンディングボックス半幅・半高を簡易推定する。
 * 絵文字混在テキストの厳密なDOM計測は行わない簡易ヒューリスティック（多少のズレは残る前提）。
 * - 全角相当（絵文字・漢字・かな等、コードポイントが0x3000以上）：1文字1.0em幅として概算
 * - それ以外（半角英数字・記号・スペース等）：1文字0.55em幅として概算
 * @param {string} text
 * @returns {{halfW: number, halfH: number}}
 */
function _adpEstimateLabelBox(text) {
  const FONT_SIZE = 11; // entrance/opposite=11px, dimline=10.5px の代表値として概算に使用
  let widthUnits = 0;
  for (const ch of String(text || '')) {
    const code = ch.codePointAt(0) || 0;
    widthUnits += (code < 0x3000) ? 0.55 : 1.0;
  }
  const halfW = Math.max((widthUnits * FONT_SIZE) / 2, FONT_SIZE / 2);
  const halfH = FONT_SIZE * 0.6; // 上下の見た目の余白を含めた概算半高
  return { halfW, halfH };
}

/**
 * Step6：複数のSVGラベル記述子を受け取り、矩形（AABB）が重ならないよう座標を解決する。
 * y昇順に処理し、既に確定済みの他ラベルと重なっていればy方向下に押し出す。
 * 3つ以上のラベルが連続して重なる場合も、順次下にずれていく汎用ロジック（無限ループ防止のガード付き）。
 * @param {Array<{x:number, y:number, text:string, cssClass:string, onclick?:string}>} labels
 * @returns {Array<{x:number, y:number, text:string, cssClass:string, onclick?:string}>}
 */
function _adpResolveLabelCollisions(labels) {
  if (!Array.isArray(labels) || labels.length === 0) return [];

  const GAP = 2;        // ラベル間に残す最小余白[px]
  const MAX_ITER = 50;  // 無限ループ防止ガード（1ラベルあたりの最大押し出し回数）

  const boxes = labels.map(l => {
    const { halfW, halfH } = _adpEstimateLabelBox(l.text);
    return {
      ...l, halfW, halfH,
      top: l.y - halfH, bottom: l.y + halfH,
      left: l.x - halfW, right: l.x + halfW,
    };
  });

  // y昇順（画面上から下）に処理することで、上のラベルを基準に下のラベルを押し出す
  boxes.sort((a, b) => a.y - b.y);

  const resolved = [];
  boxes.forEach(box => {
    let moved = true;
    let iter = 0;
    while (moved && iter < MAX_ITER) {
      moved = false;
      for (const r of resolved) {
        const overlapX = box.left < r.right && box.right > r.left;
        const overlapY = box.top < r.bottom && box.bottom > r.top;
        if (overlapX && overlapY) {
          const shift = (r.bottom - box.top) + GAP;
          box.y += shift;
          box.top += shift;
          box.bottom += shift;
          moved = true;
        }
      }
      iter++;
    }
    resolved.push(box);
  });

  return resolved.map(({ x, y, text, cssClass, onclick }) => ({ x, y, text, cssClass, onclick }));
}

/**
 * Step6：衝突解決済みのラベル記述子配列から、まとめて<text>のSVG文字列を生成する。
 * 帯・線・寸法線本体などより後（＝最前面）に追加することを想定。
 * @param {Array<{x:number, y:number, text:string, cssClass:string, onclick?:string}>} labels
 * @returns {string}
 */
function _adpRenderLabelsSVG(labels) {
  if (!Array.isArray(labels) || labels.length === 0) return '';
  return labels.map(l => {
    const onclickAttr = l.onclick ? ` ${l.onclick}` : '';
    return `<text x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="middle" class="${l.cssClass}"${onclickAttr}>${l.text}</text>`;
  }).join('');
}

function _adpBuildRidgeDimensionSVG(cropId, design, toLocal, toSvg, fieldLocalPts) {
  const empty = { svg: '', hasDim: false, isSchematic: false, labels: [] };
  if (!design) return empty;

  const segments = design.ridgeSegments;
  if (!Array.isArray(segments) || segments.length === 0) return empty;

  const dir = _adpArea?.meta?.ridgeBaseDirection;
  if (!dir?.p1 || !dir?.p2) return empty;

  const pitchCm = PlantingLogic.effectivePitchCm(design);
  if (!(pitchCm > 0)) return empty;
  const pitchM = pitchCm / 100;

  // 畝方向の法線ベクトル（RidgeGeometry.calcRidgesのnormalDirと同一の90°回転規則）
  const lp1 = toLocal(dir.p1);
  const lp2 = toLocal(dir.p2);
  const rdx = lp2.x - lp1.x, rdy = lp2.y - lp1.y;
  const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
  const ridgeDirLocal = { x: rdx / rlen, y: rdy / rlen };
  let normalDir = { x: -ridgeDirLocal.y, y: ridgeDirLocal.x };

  const seg0 = segments[0];
  if (!seg0?.p1 || !seg0?.p2) return empty;
  const seg0p1 = toLocal(seg0.p1), seg0p2 = toLocal(seg0.p2);
  const m0 = { x: (seg0p1.x + seg0p2.x) / 2, y: (seg0p1.y + seg0p2.y) / 2 };

  const isSingleRow = segments.length < 2;
  if (!isSingleRow) {
    // 隣接畝（seg1）側へ向かう符号に補正し、視覚的に対応する位置へ寸法線を描く
    const seg1 = segments[1];
    if (seg1?.p1 && seg1?.p2) {
      const seg1p1 = toLocal(seg1.p1), seg1p2 = toLocal(seg1.p2);
      const m1 = { x: (seg1p1.x + seg1p2.x) / 2, y: (seg1p1.y + seg1p2.y) / 2 };
      const toward = { x: m1.x - m0.x, y: m1.y - m0.y };
      if (toward.x * normalDir.x + toward.y * normalDir.y < 0) {
        normalDir = { x: -normalDir.x, y: -normalDir.y };
      }
    }
  } else if (Array.isArray(fieldLocalPts) && fieldLocalPts.length >= 3) {
    // 畝1列のみ＝隣接畝で符号補正できないため、圃場重心へ向かう側（＝境界内側）を選ぶ。
    // 模式的な延長線であり厳密な内外判定ではないが、圃場外側へ飛び出す見え方は抑制できる。
    const fcx = fieldLocalPts.reduce((s, p) => s + p.x, 0) / fieldLocalPts.length;
    const fcy = fieldLocalPts.reduce((s, p) => s + p.y, 0) / fieldLocalPts.length;
    const toward = { x: fcx - m0.x, y: fcy - m0.y };
    if (toward.x * normalDir.x + toward.y * normalDir.y < 0) {
      normalDir = { x: -normalDir.x, y: -normalDir.y };
    }
  }

  const derived = PlantingLogic.deriveRidgeWidths(design);
  const isDetail = !!derived && derived.pathCm > 0;

  const A = m0;
  const B = { x: A.x + normalDir.x * pitchM, y: A.y + normalDir.y * pitchM };
  const svgA = toSvg(A);
  const svgB = toSvg(B);

  // ティック（寸法線であることを示す短い直交マーク）用：SVG空間上のridgeDir単位ベクトル
  const svgOriginRef = toSvg(A);
  const svgTickRef    = toSvg({ x: A.x + ridgeDirLocal.x * 0.01, y: A.y + ridgeDirLocal.y * 0.01 });
  let tdx = svgTickRef.x - svgOriginRef.x, tdy = svgTickRef.y - svgOriginRef.y;
  const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
  tdx /= tlen; tdy /= tlen;
  const TICK = 5;
  function tickLine(svgP, cls) {
    return `<line x1="${(svgP.x - tdx * TICK).toFixed(1)}" y1="${(svgP.y - tdy * TICK).toFixed(1)}" x2="${(svgP.x + tdx * TICK).toFixed(1)}" y2="${(svgP.y + tdy * TICK).toFixed(1)}" class="${cls}" />`;
  }

  const dashAttr = isSingleRow ? ' stroke-dasharray="5 4"' : '';
  const midOf = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

  let svg = '<g class="plt-dimline-group">';
  const labels = []; // Step6：<text>は直接埋め込まず記述子として集約し、呼び出し元で一括衝突解決する

  // UX見直し（2026-07）：平面図の寸法線タップは、まずその場で一文説明を表示する
  // （_adpShowDimlineExplain）。「調整」タブへの遷移は説明ポップオーバー内の
  // 「編集する」ボタン（_adpNavigateToRidgeInput）に分離した。
  const escAttr = (s) => String(s).replace(/"/g, '&quot;');
  function explainAttr(text) {
    return `data-explain="${escAttr(text)}" onclick="_adpShowDimlineExplain(this,'${cropId}')"`;
  }

  if (!isDetail) {
    // pathCmが0以下（畝間なし）の場合はピッチ全体を1本表示
    const curVal = design.rowWidth ?? pitchCm;
    const singleAttr = explainAttr(`畝幅 ${curVal}cm がこの畝のピッチ全体です（畝間の内訳なし）。`);
    svg += `<line x1="${svgA.x.toFixed(1)}" y1="${svgA.y.toFixed(1)}" x2="${svgB.x.toFixed(1)}" y2="${svgB.y.toFixed(1)}" class="plt-dimline-hit" ${singleAttr} />`;
    svg += `<line x1="${svgA.x.toFixed(1)}" y1="${svgA.y.toFixed(1)}" x2="${svgB.x.toFixed(1)}" y2="${svgB.y.toFixed(1)}" class="plt-dimline plt-dimline-single"${dashAttr} ${singleAttr} />`;
    svg += tickLine(svgA, 'plt-dimline-tick-single');
    svg += tickLine(svgB, 'plt-dimline-tick-single');
    const mid = midOf(svgA, svgB);
    labels.push({ x: mid.x, y: mid.y - 6, text: `畝幅 ${curVal}cm`, cssClass: 'plt-dimline-label', onclick: singleAttr });
  } else {
    // 畝上幅／畝間の按分2区間（ridgeRatioPctから派生。実際のポリゴンには内訳が無いため模式図）
    const topCm  = derived.topCm;
    const pathCm = derived.pathCm;
    const ratioPct = design.ridgeRatioPct ?? 50;
    const topRatio = ratioPct / 100;
    const C = { x: A.x + normalDir.x * pitchM * topRatio, y: A.y + normalDir.y * pitchM * topRatio };
    const svgC = toSvg(C);

    const topAttr  = explainAttr(`畝上幅 ${topCm}cm は、畝比率${ratioPct}%（畝間 ${pathCm}cmとの按分）から算出されています。`);
    const pathAttr = explainAttr(`畝間 ${pathCm}cm は、畝比率${ratioPct}%（畝上幅 ${topCm}cmとの按分）から算出されています。`);

    svg += `<line x1="${svgA.x.toFixed(1)}" y1="${svgA.y.toFixed(1)}" x2="${svgC.x.toFixed(1)}" y2="${svgC.y.toFixed(1)}" class="plt-dimline-hit" ${topAttr} />`;
    svg += `<line x1="${svgC.x.toFixed(1)}" y1="${svgC.y.toFixed(1)}" x2="${svgB.x.toFixed(1)}" y2="${svgB.y.toFixed(1)}" class="plt-dimline-hit" ${pathAttr} />`;
    svg += `<line x1="${svgA.x.toFixed(1)}" y1="${svgA.y.toFixed(1)}" x2="${svgC.x.toFixed(1)}" y2="${svgC.y.toFixed(1)}" class="plt-dimline plt-dimline-top"${dashAttr} ${topAttr} />`;
    svg += `<line x1="${svgC.x.toFixed(1)}" y1="${svgC.y.toFixed(1)}" x2="${svgB.x.toFixed(1)}" y2="${svgB.y.toFixed(1)}" class="plt-dimline plt-dimline-path"${dashAttr} ${pathAttr} />`;
    svg += tickLine(svgA, 'plt-dimline-tick-top');
    svg += tickLine(svgC, 'plt-dimline-tick-path');
    svg += tickLine(svgB, 'plt-dimline-tick-path');

    const midTop  = midOf(svgA, svgC);
    const midPath = midOf(svgC, svgB);
    labels.push({ x: midTop.x, y: midTop.y - 6, text: `畝上幅 ${topCm}cm`, cssClass: 'plt-dimline-label', onclick: topAttr });
    labels.push({ x: midPath.x, y: midPath.y - 6, text: `畝間 ${pathCm}cm`, cssClass: 'plt-dimline-label plt-dimline-label-path', onclick: pathAttr });
  }

  svg += '</g>';

  return { svg, hasDim: true, isSchematic: isDetail || isSingleRow, labels };
}

/** プレビューモーダルを閉じる */
function _adpClosePreviewModal() {
  const overlay = document.getElementById('preview-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

/**
 * 畝の長さ比例SVG簡易図解（詳細一覧）を生成する。
 * - 各畝を横バーとして並べ、実長(m)をラベル表示
 * - 畝幅(rowWidth)を寸法線として表示（全畝共通のため代表1箇所のみ）
 * - 条数(linesPerRow)は各バー内の目盛り線として表示
 * - 株間は表示しない（畝ごとに描くと過密になるため）
 * 実務側では実形状プレビュー（_adpBuildRidgeShapePreviewSVG）の下部に
 * 折りたたみ表示される「畝の詳細一覧（数値）」として使う。
 * 分析側（今回のセクション4対象外）では引き続きこれ単体を表示する。
 */
function _adpBuildRidgeBarListSVG(design) {
  const segments     = design.ridgeSegments || [];
  const rowWidthCm   = Number(design.rowWidth)    || 0;
  const linesPerRow  = Number(design.linesPerRow) || 0;

  const maxLen = Math.max(...segments.map(s => s.length), 0.1);

  const CHART_W   = 520;
  const PAD_L     = 64;   // 「畝N」ラベル分
  const PAD_R     = 84;   // 「◯◯m」ラベル分
  const PAD_TOP   = 30;   // 条数注記分
  const BAR_H     = 16;
  const GAP       = 7;
  const barAreaW  = CHART_W - PAD_L - PAD_R;

  const MAX_SHOW    = 40; // 表示しすぎを防ぐ上限
  const shown       = segments.slice(0, MAX_SHOW);
  const hiddenCount = segments.length - shown.length;

  const listH  = shown.length * (BAR_H + GAP);
  const totalH = PAD_TOP + listH + (hiddenCount > 0 ? 22 : 0) + 16;

  let bars = '';
  shown.forEach((seg, i) => {
    const y = PAD_TOP + i * (BAR_H + GAP);
    const w = Math.max((seg.length / maxLen) * barAreaW, 2);

    // 条数の目盛り線（linesPerRow本ぶん、バー内に均等配置）
    let ticks = '';
    if (linesPerRow > 0 && w > 4) {
      for (let t = 0; t < linesPerRow; t++) {
        const tx = PAD_L + (w * (t + 0.5) / linesPerRow);
        ticks += `<line x1="${tx.toFixed(1)}" y1="${y + 2}" x2="${tx.toFixed(1)}" y2="${y + BAR_H - 2}" class="ridge-prev-tick"/>`;
      }
    }

    bars += `
      <text x="${PAD_L - 8}" y="${y + BAR_H / 2 + 4}" text-anchor="end" class="ridge-prev-idx">畝${i + 1}</text>
      <rect x="${PAD_L}" y="${y}" width="${w.toFixed(1)}" height="${BAR_H}" rx="2" class="ridge-prev-bar"/>
      ${ticks}
      <text x="${(PAD_L + w + 8).toFixed(1)}" y="${y + BAR_H / 2 + 4}" class="ridge-prev-len">${seg.length}m</text>`;

    // 畝幅の寸法線（1本目と2本目の間にのみ表示。畝幅は全畝共通の値）
    if (i === 0 && shown.length > 1 && rowWidthCm > 0) {
      const dy1   = y + BAR_H;
      const dy2   = y + BAR_H + GAP + BAR_H;
      const dimX  = PAD_L - 30;
      bars += `
        <line x1="${dimX}" y1="${dy1}" x2="${dimX}" y2="${dy2}" class="ridge-prev-dim"/>
        <line x1="${dimX - 4}" y1="${dy1}" x2="${dimX + 4}" y2="${dy1}" class="ridge-prev-dim"/>
        <line x1="${dimX - 4}" y1="${dy2}" x2="${dimX + 4}" y2="${dy2}" class="ridge-prev-dim"/>
        <text x="${dimX - 7}" y="${(dy1 + dy2) / 2 + 3}" text-anchor="end" class="ridge-prev-dimlabel">畝幅${rowWidthCm}cm</text>`;
    }
  });

  const headerNote = linesPerRow > 0
    ? `<text x="${PAD_L}" y="16" class="ridge-prev-header">条数 ${linesPerRow}条（バー内の縦線は条の目安位置）</text>`
    : '';

  const hiddenNote = hiddenCount > 0
    ? `<text x="${PAD_L}" y="${PAD_TOP + listH + 16}" class="ridge-prev-hidden">…ほか${hiddenCount}畝（合計${segments.length}畝）</text>`
    : '';

  return `
    <div class="preview-svg-wrap">
      <svg viewBox="0 0 ${CHART_W} ${totalH}" class="preview-svg" xmlns="http://www.w3.org/2000/svg">
        ${headerNote}
        ${bars}
        ${hiddenNote}
      </svg>
    </div>`;
}

// ═══════════════════════════════════════════
//  🧺 収穫管理ペイン
// ═══════════════════════════════════════════

const HRV_GRADES    = ['A品', 'B品', 'C品', '規格外'];
const HRV_UNITS     = ['kg', '個', '箱', '束', '袋'];
const HRV_PRICE_UNITS = ['円/kg', '円/個', '円/箱', '円/束', '円/袋'];

/**
 * 収穫ペインを描画する。
 * 実務側専用。作物ごとにカードを生成し #harvest-result に挿入。
 */
function _adpRenderHarvestPane() {
  const el = document.getElementById('harvest-result');
  if (!el) return;

  if (!_adpPracticecrops.length) {
    el.innerHTML = '<div class="empty-mini">作物を選択すると収穫記録を入力できます。</div>';
    return;
  }

  el.innerHTML = _adpPracticecrops.map(pc => _adpBuildHarvestCard(pc)).join('');
}

/**
 * 1作物分の収穫カード HTML を生成する。
 */
function _adpBuildHarvestCard(pc) {
  const crop    = _adpGetCropById(pc.cropId);
  const label   = crop?.name || pc.cropId;
  const records = pc.harvestRecords || [];
  const areaId  = _adpArea?.id || _adpArea?.name || '';

  // 集計
  const summary = _adpCalcHarvestSummary(records, pc);

  // 記録行 HTML
  const rowsHTML = records.length
    ? `<table class="hrv-table">
        <thead><tr>
          <th>日付</th><th>収穫量</th><th>等級</th><th>単価</th><th>収益</th><th></th>
        </tr></thead>
        <tbody>
          ${records.map(r => _adpBuildHarvestRow(r, pc.cropId, areaId)).join('')}
        </tbody>
      </table>`
    : '<div class="hrv-empty">まだ収穫記録がありません。</div>';

  // 単価単位オプション
  const puOpts = HRV_PRICE_UNITS.map(u => `<option value="${u}">${u}</option>`).join('');
  const grOpts = HRV_GRADES.map(g => `<option value="${g}">${g}</option>`).join('');
  const unOpts = HRV_UNITS.map(u => `<option value="${u}">${u}</option>`).join('');

  // 収量見込み（cropDB.yieldPerPlant × purchase）
  const ypp      = crop?.yieldPerPlant;
  const purchase = pc.plantingDesign?.purchase ?? null;
  const expectedYieldHTML = (ypp != null && purchase > 0)
    ? `<span class="hrv-expected-yield">見込み：約 ${(Math.round(purchase * ypp * 10) / 10).toLocaleString()} kg</span>`
    : '';

  return `
    <div class="hrv-card" data-crop-id="${pc.cropId}">
      <div class="hrv-card-header">
        <span class="hrv-crop-label">🌿 ${label}</span>
        ${expectedYieldHTML}
      </div>

      <!-- 入力フォーム -->
      <div class="hrv-form">
        <div class="hrv-form-row">
          <div class="hrv-form-field">
            <label class="hrv-label">日付</label>
            <input class="hrv-input" type="date" id="hrv-date-${pc.cropId}" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="hrv-form-field">
            <label class="hrv-label">収穫量</label>
            <div class="hrv-input-unit-wrap">
              <input class="hrv-input hrv-input-num" type="number" min="0" step="0.1" id="hrv-weight-${pc.cropId}" placeholder="0">
              <select class="hrv-select hrv-unit-sel" id="hrv-unit-${pc.cropId}">${unOpts}</select>
            </div>
          </div>
          <div class="hrv-form-field">
            <label class="hrv-label">等級</label>
            <select class="hrv-select" id="hrv-grade-${pc.cropId}">${grOpts}</select>
          </div>
        </div>
        <div class="hrv-form-row">
          <div class="hrv-form-field">
            <label class="hrv-label">単価</label>
            <div class="hrv-input-unit-wrap">
              <input class="hrv-input hrv-input-num" type="number" min="0" step="1" id="hrv-price-${pc.cropId}" placeholder="0">
              <select class="hrv-select hrv-unit-sel" id="hrv-priceunit-${pc.cropId}">${puOpts}</select>
            </div>
          </div>
          <div class="hrv-form-field hrv-form-field-btn">
            <button class="btn btn-primary hrv-add-btn" onclick="_adpAddHarvestRecord('${pc.cropId}','${areaId}')">＋ 記録</button>
          </div>
        </div>
      </div>

      <!-- 記録一覧 -->
      <div class="hrv-records" id="hrv-records-${pc.cropId}">
        ${rowsHTML}
      </div>

      <!-- 集計 -->
      ${_adpBuildHarvestSummaryHTML(summary)}
    </div>
  `;
}

/**
 * 収穫記録1行のHTMLを生成する。
 */
function _adpBuildHarvestRow(r, cropId, areaId) {
  const revenue = (r.weight != null && r.price != null)
    ? Math.round(r.weight * r.price).toLocaleString()
    : '—';
  return `
    <tr class="hrv-row">
      <td>${r.date || '—'}</td>
      <td>${r.weight != null ? r.weight : '—'} ${r.unit || ''}</td>
      <td>${r.grade || '—'}</td>
      <td>${r.price != null ? r.price.toLocaleString() : '—'} ${r.priceUnit || ''}</td>
      <td>¥${revenue}</td>
      <td><button class="hrv-del-btn" onclick="_adpDeleteHarvestRecord('${cropId}','${r.id}','${areaId}')">✕</button></td>
    </tr>
  `;
}

/**
 * 収穫集計を計算する。
 * @param {Array} records
 * @param {Object} pc - _adpPracticecrops の要素（ratio・plantingDesign含む）
 * @returns {Object} summary
 */
function _adpCalcHarvestSummary(records, pc) {
  if (!records.length) return null;

  // 収益集計（全記録）
  let totalRevenue = 0;
  let revenueCount = 0;

  // 単位別収量集計
  const unitTotals = {};
  records.forEach(r => {
    if (r.weight != null) {
      unitTotals[r.unit || 'kg'] = (unitTotals[r.unit || 'kg'] || 0) + r.weight;
    }
    if (r.weight != null && r.price != null) {
      totalRevenue += r.weight * r.price;
      revenueCount++;
    }
  });

  // kg記録のみで反収・坪収量を計算
  const totalKg = unitTotals['kg'] || 0;

  // 占有面積（㎡）
  const areaSqm  = _adpArea?.area ? Number(_adpArea.area) * (pc.ratio / 100) : null;
  const tsubo    = areaSqm ? areaSqm / 3.306 : null;

  // 平均単価（kg記録のみ）
  const kgRecords = records.filter(r => r.unit === 'kg' && r.weight && r.price);
  const avgPrice  = kgRecords.length
    ? Math.round(kgRecords.reduce((s, r) => s + r.price, 0) / kgRecords.length)
    : null;

  // 反収: kg/10a = totalKg / areaSqm * 1000
  const per10a  = (totalKg && areaSqm) ? (totalKg / areaSqm * 1000).toFixed(1) : null;
  // 坪収量: kg/坪
  const perTsubo = (totalKg && tsubo) ? (totalKg / tsubo).toFixed(2) : null;

  return {
    unitTotals,
    totalRevenue: Math.round(totalRevenue),
    avgPrice,
    per10a,
    perTsubo,
    areaSqm: areaSqm ? areaSqm.toFixed(1) : null,
  };
}

/**
 * 集計表示のHTMLを生成する。
 */
function _adpBuildHarvestSummaryHTML(summary) {
  if (!summary) return '';

  // 単位別収量リスト
  const unitRows = Object.entries(summary.unitTotals)
    .map(([unit, total]) => `
      <div class="hrv-sum-item">
        <span class="hrv-sum-label">累計収量（${unit}）</span>
        <span class="hrv-sum-val">${total.toLocaleString()} ${unit}</span>
      </div>`)
    .join('');

  const revenueRow = `
    <div class="hrv-sum-item">
      <span class="hrv-sum-label">累計収益</span>
      <span class="hrv-sum-val">¥${summary.totalRevenue.toLocaleString()}</span>
    </div>`;

  const avgRow = summary.avgPrice != null ? `
    <div class="hrv-sum-item">
      <span class="hrv-sum-label">平均単価（kg）</span>
      <span class="hrv-sum-val">¥${summary.avgPrice.toLocaleString()}/kg</span>
    </div>` : '';

  const per10aRow = summary.per10a != null ? `
    <div class="hrv-sum-item">
      <span class="hrv-sum-label">反収</span>
      <span class="hrv-sum-val">${summary.per10a} kg/10a</span>
    </div>` : '';

  const perTsuboRow = summary.perTsubo != null ? `
    <div class="hrv-sum-item">
      <span class="hrv-sum-label">坪収量</span>
      <span class="hrv-sum-val">${summary.perTsubo} kg/坪</span>
    </div>` : '';

  const areaNote = summary.areaSqm ? `<div class="hrv-sum-note">占有面積 ${summary.areaSqm} ㎡ をもとに計算</div>` : '';

  return `
    <div class="hrv-summary">
      <div class="hrv-sum-title">集計</div>
      ${unitRows}
      ${revenueRow}
      ${avgRow}
      ${per10aRow}
      ${perTsuboRow}
      ${areaNote}
    </div>
  `;
}

/**
 * 収穫記録を追加する。
 */
function _adpAddHarvestRecord(cropId, areaId) {
  const dateEl      = document.getElementById(`hrv-date-${cropId}`);
  const weightEl    = document.getElementById(`hrv-weight-${cropId}`);
  const unitEl      = document.getElementById(`hrv-unit-${cropId}`);
  const gradeEl     = document.getElementById(`hrv-grade-${cropId}`);
  const priceEl     = document.getElementById(`hrv-price-${cropId}`);
  const priceUnitEl = document.getElementById(`hrv-priceunit-${cropId}`);

  const weight = parseFloat(weightEl?.value);
  if (!dateEl?.value || isNaN(weight) || weight <= 0) {
    if (typeof showToast === 'function') showToast('日付と収穫量は必須です', 'warn');
    return;
  }

  const record = {
    id:        Date.now().toString(),
    date:      dateEl.value,
    weight,
    unit:      unitEl?.value  || 'kg',
    grade:     gradeEl?.value || 'A品',
    price:     priceEl?.value ? parseFloat(priceEl.value) : null,
    priceUnit: priceUnitEl?.value || '円/kg',
  };

  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc) return;
  if (!pc.harvestRecords) pc.harvestRecords = [];
  pc.harvestRecords.unshift(record);
  _adpSavePracticecrops(areaId);

  // 入力欄リセット（日付と単位は維持）
  if (weightEl) weightEl.value = '';
  if (priceEl)  priceEl.value  = '';

  _adpRenderHarvestPane();
  if (typeof showToast === 'function') showToast('収穫記録を追加しました');
}

/**
 * 収穫記録を削除する。
 */
function _adpDeleteHarvestRecord(cropId, recordId, areaId) {
  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc?.harvestRecords) return;
  pc.harvestRecords = pc.harvestRecords.filter(r => r.id !== recordId);
  _adpSavePracticecrops(areaId);
  _adpRenderHarvestPane();
  if (typeof showToast === 'function') showToast('記録を削除しました');
}

// ═══════════════════════════════════════════
//  🌿 作物情報ペイン（セクション2）
//  実務側サブタブ「🌿 作物情報」の描画・保存ロジック
// ═══════════════════════════════════════════

/**
 * cropinfo-result div を全描画。
 * 作物ごとにアコーディオンカードを生成する。
 */
function _adpRenderCropInfoPane() {
  const el = document.getElementById('cropinfo-result');
  if (!el) return;

  const areaId = _adpArea?.id;
  if (!_adpPracticecrops.length) {
    el.innerHTML = `
      <div class="ci-empty">
        <div class="ci-empty-icon">🌱</div>
        作物が登録されていません。<br>作物を追加してから利用してください。
      </div>`;
    return;
  }

  el.innerHTML = _adpPracticecrops
    .map((pc, idx) => _adpBuildCropInfoCard(pc, areaId, idx))
    .join('');
}

/**
 * 1作物分の作物情報カードHTMLを生成。
 * @param {Object} pc      _adpPracticecropsの1要素
 * @param {string} areaId
 * @param {number} idx     インデックス（最初のカードを展開状態にする）
 */
function _adpBuildCropInfoCard(pc, areaId, idx) {
  const cropId  = pc.cropId;
  const name    = _adpCropIdToName(cropId);
  const isOpen  = idx === 0;

  const v  = (key) => pc[key] ? String(pc[key]) : '';

  return `
    <div class="ci-card${isOpen ? ' open' : ''}" id="ci-card-${cropId}">
      <div class="ci-card-header" onclick="_adpToggleCropInfoCard('${cropId}')">
        <span class="ci-crop-name">🌿 ${name}</span>
        <span class="ci-card-arrow">${isOpen ? '▼' : '▶'}</span>
      </div>
      <div class="ci-card-body">
        <div class="ci-field-grid">
          <div class="ci-field">
            <label class="ci-label">品種</label>
            <input class="ci-input" type="text" id="ci-variety-${cropId}"
              placeholder="例：麗夏、千両2号" maxlength="50"
              value="${v('variety')}">
          </div>
          <div class="ci-field">
            <label class="ci-label">播種日</label>
            <input class="ci-input" type="date" id="ci-sowDate-${cropId}"
              value="${v('sowDate')}">
          </div>
          <div class="ci-field">
            <label class="ci-label">定植日</label>
            <input class="ci-input" type="date" id="ci-transplantDate-${cropId}"
              value="${v('transplantDate')}">
          </div>
          <div class="ci-field">
            <label class="ci-label">収穫開始</label>
            <input class="ci-input" type="date" id="ci-harvestStart-${cropId}"
              value="${v('harvestStart')}">
          </div>
          <div class="ci-field">
            <label class="ci-label">収穫終了</label>
            <input class="ci-input" type="date" id="ci-harvestEnd-${cropId}"
              value="${v('harvestEnd')}">
          </div>
        </div>
        <div class="ci-card-footer">
          <button class="ci-save-btn" onclick="_adpSaveCropInfo('${cropId}', '${areaId}')">✓ 保存</button>
        </div>
      </div>
    </div>`;
}

/**
 * アコーディオン開閉トグル。
 * @param {string} cropId
 */
function _adpToggleCropInfoCard(cropId) {
  const card  = document.getElementById(`ci-card-${cropId}`);
  if (!card) return;
  const isOpen = card.classList.toggle('open');
  const arrow  = card.querySelector('.ci-card-arrow');
  if (arrow) arrow.textContent = isOpen ? '▼' : '▶';
}

/**
 * 入力値を _adpPracticecrops に反映して保存する。
 * @param {string} cropId
 * @param {string} areaId
 */
function _adpSaveCropInfo(cropId, areaId) {
  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc) return;

  pc.variety        = document.getElementById(`ci-variety-${cropId}`)?.value.trim()        || '';
  pc.sowDate        = document.getElementById(`ci-sowDate-${cropId}`)?.value                || '';
  pc.transplantDate = document.getElementById(`ci-transplantDate-${cropId}`)?.value         || '';
  pc.harvestStart   = document.getElementById(`ci-harvestStart-${cropId}`)?.value           || '';
  pc.harvestEnd     = document.getElementById(`ci-harvestEnd-${cropId}`)?.value             || '';

  _adpSavePracticecrops(areaId);
  if (typeof showToast === 'function') showToast(`${_adpCropIdToName(cropId)} の作物情報を保存しました`);
}

// ═══════════════════════════════════════════
//  🧪 施肥記録台帳（セクション4）
//  施肥タブ内・施肥概算の下に描画する記録UI
// ═══════════════════════════════════════════

// プリセット肥料リスト
const FERT_PRESET_LIST = [
  '苦土石灰', '過リン酸石灰', '有機石灰',
  '化成肥料(8-8-8)', '化成肥料(14-14-14)', '尿素', '硫安', '塩化カリ',
  '鶏糞', '堆肥', 'ボカシ肥', '米ぬか', '魚粉', '草木灰',
  'その他（直接入力）',
];

/**
 * fert-result div の下に施肥記録台帳セクションを描画。
 * _renderFertResultMulti 実行後に呼ぶ。
 */
function _adpRenderFertRecordSection() {
  const fertEl = document.getElementById('fert-result');
  if (!fertEl) return;

  const areaId = _adpArea?.id;

  if (!_adpPracticecrops.length) return;

  // 既存の台帳セクションを除去（重複防止）
  const existing = document.getElementById('fert-record-section');
  if (existing) existing.remove();

  const section = document.createElement('div');
  section.id = 'fert-record-section';
  section.className = 'fr-section';
  section.innerHTML = `
    <div class="fr-section-title">📋 施肥記録</div>
    ${_adpPracticecrops.map(pc => _adpBuildFertRecordCard(pc, areaId)).join('')}
  `;

  fertEl.parentElement.insertBefore(section, fertEl.nextSibling);
}

/**
 * 1作物分の施肥記録カードHTMLを生成。
 */
function _adpBuildFertRecordCard(pc, areaId) {
  const cropId   = pc.cropId;
  const name     = _adpCropIdToName(cropId);
  const records  = pc.fertRecords || [];

  const presetOptions = FERT_PRESET_LIST.map(p =>
    `<option value="${p}">${p}</option>`
  ).join('');

  const rowsHTML = records.length
    ? records.map(r => `
        <tr class="fr-row">
          <td class="fr-td">${r.date || '—'}</td>
          <td class="fr-td">${r.name || '—'}</td>
          <td class="fr-td fr-td-amount">${r.amount != null ? r.amount : '—'} ${r.unit || ''}</td>
          <td class="fr-td fr-td-memo">${r.memo || ''}</td>
          <td class="fr-td fr-td-del">
            <button class="fr-del-btn" onclick="_adpDeleteFertRecord('${cropId}','${r.id}','${areaId}')">×</button>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="fr-td-empty">記録がありません</td></tr>`;

  return `
    <div class="fr-card" id="fr-card-${cropId}">
      <div class="fr-card-header" onclick="_adpToggleFertCard('${cropId}')">
        <span class="fr-crop-name">🌿 ${name}</span>
        <span class="fr-record-count">${records.length}件</span>
        <span class="fr-card-arrow">▶</span>
      </div>
      <div class="fr-card-body" id="fr-body-${cropId}" style="display:none;">

        <!-- 入力フォーム（折りたたみ） -->
        <div class="fr-form-wrap" id="fr-form-${cropId}" style="display:none;">
          <div class="fr-form-grid">
            <div class="fr-field">
              <label class="fr-label">日付</label>
              <input class="fr-input" type="date" id="fr-date-${cropId}" value="${new Date().toISOString().slice(0,10)}">
            </div>
            <div class="fr-field">
              <label class="fr-label">肥料名</label>
              <select class="fr-input fr-select" id="fr-name-sel-${cropId}"
                      onchange="_adpFertPresetChange('${cropId}')">
                ${presetOptions}
              </select>
            </div>
            <div class="fr-field" id="fr-name-free-wrap-${cropId}" style="display:none;">
              <label class="fr-label">肥料名（直接入力）</label>
              <input class="fr-input" type="text" id="fr-name-free-${cropId}"
                     placeholder="肥料名を入力" maxlength="50">
            </div>
            <div class="fr-field fr-field-inline">
              <div>
                <label class="fr-label">施用量</label>
                <input class="fr-input fr-input-amount" type="number" id="fr-amount-${cropId}"
                       placeholder="0.0" min="0" step="0.1">
              </div>
              <div>
                <label class="fr-label">単位</label>
                <select class="fr-input fr-select-unit" id="fr-unit-${cropId}">
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="袋">袋</option>
                </select>
              </div>
            </div>
            <div class="fr-field">
              <label class="fr-label">メモ（任意）</label>
              <input class="fr-input" type="text" id="fr-memo-${cropId}"
                     placeholder="元肥・追肥など" maxlength="100">
            </div>
          </div>
          <div class="fr-form-footer">
            <button class="fr-cancel-btn" onclick="_adpToggleFertForm('${cropId}')">キャンセル</button>
            <button class="fr-add-btn" onclick="_adpAddFertRecord('${cropId}','${areaId}')">＋ 追加</button>
          </div>
        </div>

        <!-- 追加ボタン -->
        <button class="fr-open-form-btn" id="fr-open-btn-${cropId}"
                onclick="_adpToggleFertForm('${cropId}')">＋ 施肥を記録</button>

        <!-- 一覧テーブル -->
        <table class="fr-table">
          <thead>
            <tr>
              <th class="fr-th">日付</th>
              <th class="fr-th">肥料名</th>
              <th class="fr-th">施用量</th>
              <th class="fr-th">メモ</th>
              <th class="fr-th"></th>
            </tr>
          </thead>
          <tbody id="fr-tbody-${cropId}">
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    </div>`;
}

/** アコーディオン開閉 */
function _adpToggleFertCard(cropId) {
  const body  = document.getElementById(`fr-body-${cropId}`);
  const arrow = document.querySelector(`#fr-card-${cropId} .fr-card-arrow`);
  if (!body) return;
  const isOpen = body.style.display === 'none';
  body.style.display = isOpen ? 'block' : 'none';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▶';
}

/** 入力フォームの表示/非表示トグル */
function _adpToggleFertForm(cropId) {
  const form    = document.getElementById(`fr-form-${cropId}`);
  const openBtn = document.getElementById(`fr-open-btn-${cropId}`);
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display    = isHidden ? 'block' : 'none';
  if (openBtn) openBtn.style.display = isHidden ? 'none' : 'inline-flex';
}

/** プリセット選択 → 「その他」の時フリーテキスト欄を表示 */
function _adpFertPresetChange(cropId) {
  const sel      = document.getElementById(`fr-name-sel-${cropId}`);
  const freeWrap = document.getElementById(`fr-name-free-wrap-${cropId}`);
  if (!sel || !freeWrap) return;
  freeWrap.style.display = sel.value === 'その他（直接入力）' ? 'block' : 'none';
}

/** フォーム値を取得してレコードを追加・保存・再描画 */
function _adpAddFertRecord(cropId, areaId) {
  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc) return;

  const date   = document.getElementById(`fr-date-${cropId}`)?.value || '';
  const selVal = document.getElementById(`fr-name-sel-${cropId}`)?.value || '';
  const name   = selVal === 'その他（直接入力）'
    ? (document.getElementById(`fr-name-free-${cropId}`)?.value.trim() || '')
    : selVal;
  const amount = parseFloat(document.getElementById(`fr-amount-${cropId}`)?.value) || null;
  const unit   = document.getElementById(`fr-unit-${cropId}`)?.value || 'kg';
  const memo   = document.getElementById(`fr-memo-${cropId}`)?.value.trim() || '';

  if (!date)   { if (typeof showToast === 'function') showToast('日付を入力してください', 'amber'); return; }
  if (!name)   { if (typeof showToast === 'function') showToast('肥料名を入力してください', 'amber'); return; }
  if (!amount) { if (typeof showToast === 'function') showToast('施用量を入力してください', 'amber'); return; }

  if (!pc.fertRecords) pc.fertRecords = [];
  pc.fertRecords.unshift({ id: Date.now().toString(), date, name, amount, unit, memo });

  _adpSavePracticecrops(areaId);
  _adpRenderFertRecordSection();
  if (typeof showToast === 'function') showToast('施肥記録を追加しました');
}

/** 指定IDのレコードを削除・保存・再描画 */
function _adpDeleteFertRecord(cropId, recordId, areaId) {
  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc || !pc.fertRecords) return;
  pc.fertRecords = pc.fertRecords.filter(r => r.id !== recordId);
  _adpSavePracticecrops(areaId);
  _adpRenderFertRecordSection();
  if (typeof showToast === 'function') showToast('記録を削除しました');
}

// ═══════════════════════════════════════════
//  💊 農薬管理（セクション5）
//  実務側サブタブ「💊 農薬」の描画・保存ロジック
// ═══════════════════════════════════════════

// プリセット農薬リスト { name, dilution }
const PESTICIDE_PRESET_LIST = [
  { name: 'アグロスリン乳剤',     dilution: 1000 },
  { name: 'スミチオン乳剤',       dilution: 1000 },
  { name: 'マラソン乳剤',         dilution: 1000 },
  { name: 'モスピラン水溶剤',     dilution: 2000 },
  { name: 'アドマイヤー水和剤',   dilution: 2000 },
  { name: 'ダコニール1000',       dilution: 1000 },
  { name: 'ベンレート水和剤',     dilution: 2000 },
  { name: 'トップジンM水和剤',    dilution: 1500 },
  { name: 'オーソサイド水和剤',   dilution:  800 },
  { name: 'Zボルドー',           dilution:  500 },
  { name: '石灰硫黄合剤',         dilution:   20 },
  { name: 'その他（直接入力）',   dilution: null },
];

/**
 * pesticide-result div を全描画。
 */
function _adpRenderPesticidePane() {
  const el = document.getElementById('pesticide-result');
  if (!el) return;

  const areaId = _adpArea?.id;

  if (!_adpPracticecrops.length) {
    el.innerHTML = `
      <div class="ps-empty">
        <div class="ps-empty-icon">💊</div>
        作物が登録されていません。<br>作物を追加してから利用してください。
      </div>`;
    return;
  }

  el.innerHTML = _adpPracticecrops
    .map(pc => _adpBuildPesticideCard(pc, areaId))
    .join('');
}

/**
 * 1作物分の農薬記録カードHTMLを生成。
 */
function _adpBuildPesticideCard(pc, areaId) {
  const cropId  = pc.cropId;
  const name    = _adpCropIdToName(cropId);
  const records = pc.pesticideRecords || [];

  const presetOptions = PESTICIDE_PRESET_LIST.map(p =>
    `<option value="${p.name}" data-dilution="${p.dilution ?? ''}">${p.name}${p.dilution ? '（' + p.dilution + '倍）' : ''}</option>`
  ).join('');

  // 希釈のみモード用プリセット（「その他」除く）
  const dilutionPresetOptions = PESTICIDE_PRESET_LIST
    .filter(p => p.dilution != null)
    .map(p => `<option value="${p.name}" data-dilution="${p.dilution}">${p.name}（標準 ${p.dilution}倍）</option>`)
    .join('');

  const rowsHTML = records.length
    ? records.map(r => `
        <tr class="ps-row">
          <td class="ps-td">${r.date || '—'}</td>
          <td class="ps-td">${r.name || '—'}</td>
          <td class="ps-td ps-td-target">${r.target || '—'}</td>
          <td class="ps-td ps-td-dilution">${r.dilution != null ? r.dilution + '倍' : '—'}</td>
          <td class="ps-td ps-td-amount">${r.amount != null ? r.amount : '—'} ${r.unit || ''}</td>
          <td class="ps-td ps-td-del">
            <button class="ps-del-btn" onclick="_adpDeletePesticideRecord('${cropId}','${r.id}','${areaId}')">×</button>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="6" class="ps-td-empty">記録がありません</td></tr>`;

  return `
    <div class="ps-card" id="ps-card-${cropId}">
      <div class="ps-card-header" onclick="_adpTogglePesticideCard('${cropId}')">
        <span class="ps-crop-name">🌿 ${name}</span>
        <span class="ps-record-count">${records.length}件</span>
        <span class="ps-card-arrow">▶</span>
      </div>
      <div class="ps-card-body" id="ps-body-${cropId}" style="display:none;">

        <!-- 通常入力フォーム（折りたたみ） -->
        <div class="ps-form-wrap" id="ps-form-${cropId}" style="display:none;">
          <div class="ps-form-grid">
            <div class="ps-field">
              <label class="ps-label">日付</label>
              <input class="ps-input" type="date" id="ps-date-${cropId}"
                     value="${new Date().toISOString().slice(0,10)}">
            </div>
            <div class="ps-field">
              <label class="ps-label">農薬名</label>
              <select class="ps-input ps-select" id="ps-name-sel-${cropId}"
                      onchange="_adpPesticidePresetChange('${cropId}')">
                ${presetOptions}
              </select>
            </div>
            <div class="ps-field" id="ps-name-free-wrap-${cropId}" style="display:none;">
              <label class="ps-label">農薬名（直接入力）</label>
              <input class="ps-input" type="text" id="ps-name-free-${cropId}"
                     placeholder="農薬名を入力" maxlength="50">
            </div>
            <div class="ps-field">
              <label class="ps-label">参考希釈倍数</label>
              <div class="ps-dilution-hint" id="ps-dilution-${cropId}">—</div>
            </div>
            <div class="ps-field">
              <label class="ps-label">対象病害虫（任意）</label>
              <input class="ps-input" type="text" id="ps-target-${cropId}"
                     placeholder="例：灰色かび病、アブラムシ" maxlength="50">
            </div>
            <div class="ps-field ps-field-inline">
              <div>
                <label class="ps-label">使用量</label>
                <input class="ps-input ps-input-amount" type="number" id="ps-amount-${cropId}"
                       placeholder="0" min="0" step="0.1">
              </div>
              <div>
                <label class="ps-label">単位</label>
                <select class="ps-input ps-select-unit" id="ps-unit-${cropId}">
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div class="ps-field">
              <label class="ps-label">メモ（任意）</label>
              <input class="ps-input" type="text" id="ps-memo-${cropId}"
                     placeholder="散布方法など" maxlength="100">
            </div>
          </div>
          <div class="ps-form-footer">
            <button class="ps-cancel-btn" onclick="_adpTogglePesticideForm('${cropId}')">キャンセル</button>
            <button class="ps-add-btn" onclick="_adpAddPesticideRecord('${cropId}','${areaId}')">＋ 追加</button>
          </div>
        </div>

        <!-- 希釈のみフォーム（折りたたみ） -->
        <div class="ps-dil-form-wrap" id="ps-dil-form-${cropId}" style="display:none;">
          <div class="ps-dil-form-title">💧 希釈倍率だけ記録</div>
          <div class="ps-form-grid">
            <div class="ps-field">
              <label class="ps-label">日付</label>
              <input class="ps-input" type="date" id="ps-dil-date-${cropId}"
                     value="${new Date().toISOString().slice(0,10)}">
            </div>
            <div class="ps-field">
              <label class="ps-label">農薬名（プリセットから選択）</label>
              <select class="ps-input ps-select" id="ps-dil-name-${cropId}"
                      onchange="_adpPesticideDilPresetChange('${cropId}')">
                <option value="">選択してください</option>
                ${dilutionPresetOptions}
              </select>
            </div>
            <div class="ps-field">
              <label class="ps-label">今回の希釈倍率</label>
              <div class="ps-dil-input-row">
                <input class="ps-input ps-dil-input" type="number" id="ps-dil-val-${cropId}"
                       placeholder="倍率を入力" min="1" step="1">
                <span class="ps-dil-unit">倍</span>
              </div>
            </div>
            <div class="ps-field">
              <label class="ps-label">対象病害虫（任意）</label>
              <input class="ps-input" type="text" id="ps-dil-target-${cropId}"
                     placeholder="例：うどんこ病" maxlength="50">
            </div>
          </div>
          <div class="ps-form-footer">
            <button class="ps-cancel-btn" onclick="_adpTogglePesticideDilForm('${cropId}')">キャンセル</button>
            <button class="ps-add-btn" onclick="_adpAddPesticideDilRecord('${cropId}','${areaId}')">＋ 追加</button>
          </div>
        </div>

        <!-- ボタン群 -->
        <div class="ps-btn-row">
          <button class="ps-open-form-btn" id="ps-open-btn-${cropId}"
                  onclick="_adpTogglePesticideForm('${cropId}')">＋ 農薬散布を記録</button>
          <button class="ps-open-dil-btn" id="ps-open-dil-btn-${cropId}"
                  onclick="_adpTogglePesticideDilForm('${cropId}')">💧 希釈倍率だけ記録</button>
        </div>

        <!-- 一覧テーブル -->
        <table class="ps-table">
          <thead>
            <tr>
              <th class="ps-th">日付</th>
              <th class="ps-th">農薬名</th>
              <th class="ps-th ps-th-target">対象</th>
              <th class="ps-th ps-th-dilution">希釈</th>
              <th class="ps-th">使用量</th>
              <th class="ps-th"></th>
            </tr>
          </thead>
          <tbody id="ps-tbody-${cropId}">
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    </div>`;
}

/** アコーディオン開閉 */
function _adpTogglePesticideCard(cropId) {
  const body  = document.getElementById(`ps-body-${cropId}`);
  const arrow = document.querySelector(`#ps-card-${cropId} .ps-card-arrow`);
  if (!body) return;
  const isOpen = body.style.display === 'none';
  body.style.display = isOpen ? 'block' : 'none';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▶';
}

/** 希釈のみフォームの表示/非表示トグル */
function _adpTogglePesticideDilForm(cropId) {
  const form    = document.getElementById(`ps-dil-form-${cropId}`);
  const openBtn = document.getElementById(`ps-open-dil-btn-${cropId}`);
  const mainBtn = document.getElementById(`ps-open-btn-${cropId}`);
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? 'block' : 'none';
  if (openBtn) openBtn.style.display = isHidden ? 'none' : 'inline-flex';
  if (mainBtn) mainBtn.style.display = isHidden ? 'none' : 'inline-flex';
  // 通常フォームは閉じる
  const mainForm = document.getElementById(`ps-form-${cropId}`);
  if (mainForm && isHidden) mainForm.style.display = 'none';
}

/** 希釈のみプリセット選択 → 標準倍率を自動入力 */
function _adpPesticideDilPresetChange(cropId) {
  const sel = document.getElementById(`ps-dil-name-${cropId}`);
  const inp = document.getElementById(`ps-dil-val-${cropId}`);
  if (!sel || !inp) return;
  const opt = sel.options[sel.selectedIndex];
  const dilution = opt?.dataset.dilution;
  if (dilution) inp.value = dilution;
}

/** 希釈のみレコードを追加 */
function _adpAddPesticideDilRecord(cropId, areaId) {
  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc) return;

  const date     = document.getElementById(`ps-dil-date-${cropId}`)?.value || '';
  const name     = document.getElementById(`ps-dil-name-${cropId}`)?.value || '';
  const dilution = parseFloat(document.getElementById(`ps-dil-val-${cropId}`)?.value) || null;
  const target   = document.getElementById(`ps-dil-target-${cropId}`)?.value.trim() || '';

  if (!date)     { if (typeof showToast === 'function') showToast('日付を入力してください', 'amber'); return; }
  if (!name)     { if (typeof showToast === 'function') showToast('農薬名を選択してください', 'amber'); return; }
  if (!dilution) { if (typeof showToast === 'function') showToast('希釈倍率を入力してください', 'amber'); return; }

  if (!pc.pesticideRecords) pc.pesticideRecords = [];
  pc.pesticideRecords.unshift({
    id: Date.now().toString(),
    date, name, target, dilution,
    amount: null, unit: '', memo: '',
  });

  _adpSavePracticecrops(areaId);
  _adpRenderPesticidePane();
  if (typeof showToast === 'function') showToast('農薬記録を追加しました');
}

/** 入力フォームの表示/非表示トグル */
function _adpTogglePesticideForm(cropId) {
  const form    = document.getElementById(`ps-form-${cropId}`);
  const openBtn = document.getElementById(`ps-open-btn-${cropId}`);
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display    = isHidden ? 'block' : 'none';
  if (openBtn) openBtn.style.display = isHidden ? 'none' : 'inline-flex';
  // 希釈のみフォームは閉じる
  const dilForm    = document.getElementById(`ps-dil-form-${cropId}`);
  const dilOpenBtn = document.getElementById(`ps-open-dil-btn-${cropId}`);
  if (isHidden && dilForm) { dilForm.style.display = 'none'; if (dilOpenBtn) dilOpenBtn.style.display = 'inline-flex'; }
  // フォームを開いたときに希釈倍数を初期表示
  if (isHidden) _adpPesticidePresetChange(cropId);
}

/** プリセット選択 → 希釈倍数表示・フリーテキスト欄切替 */
function _adpPesticidePresetChange(cropId) {
  const sel      = document.getElementById(`ps-name-sel-${cropId}`);
  const freeWrap = document.getElementById(`ps-name-free-wrap-${cropId}`);
  const hint     = document.getElementById(`ps-dilution-${cropId}`);
  if (!sel) return;

  const isFree   = sel.value === 'その他（直接入力）';
  if (freeWrap) freeWrap.style.display = isFree ? 'block' : 'none';

  const opt      = sel.options[sel.selectedIndex];
  const dilution = opt?.dataset.dilution;
  if (hint) hint.textContent = dilution ? `参考: ${dilution}倍` : '—';
}

/** フォーム値を取得してレコードを追加・保存・再描画 */
function _adpAddPesticideRecord(cropId, areaId) {
  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc) return;

  const date   = document.getElementById(`ps-date-${cropId}`)?.value || '';
  const selVal = document.getElementById(`ps-name-sel-${cropId}`)?.value || '';
  const name   = selVal === 'その他（直接入力）'
    ? (document.getElementById(`ps-name-free-${cropId}`)?.value.trim() || '')
    : selVal;
  const target = document.getElementById(`ps-target-${cropId}`)?.value.trim() || '';
  const amount = parseFloat(document.getElementById(`ps-amount-${cropId}`)?.value) || null;
  const unit   = document.getElementById(`ps-unit-${cropId}`)?.value || 'ml';
  const memo   = document.getElementById(`ps-memo-${cropId}`)?.value.trim() || '';

  if (!date)   { if (typeof showToast === 'function') showToast('日付を入力してください', 'amber'); return; }
  if (!name)   { if (typeof showToast === 'function') showToast('農薬名を入力してください', 'amber'); return; }
  if (!amount) { if (typeof showToast === 'function') showToast('使用量を入力してください', 'amber'); return; }

  if (!pc.pesticideRecords) pc.pesticideRecords = [];
  pc.pesticideRecords.unshift({ id: Date.now().toString(), date, name, target, amount, unit, memo });

  _adpSavePracticecrops(areaId);
  _adpRenderPesticidePane();
  if (typeof showToast === 'function') showToast('農薬散布記録を追加しました');
}

/** 指定IDのレコードを削除・保存・再描画 */
function _adpDeletePesticideRecord(cropId, recordId, areaId) {
  const pc = _adpPracticecrops.find(c => c.cropId === cropId);
  if (!pc || !pc.pesticideRecords) return;
  pc.pesticideRecords = pc.pesticideRecords.filter(r => r.id !== recordId);
  _adpSavePracticecrops(areaId);
  _adpRenderPesticidePane();
  if (typeof showToast === 'function') showToast('記録を削除しました');
}

// ═══════════════════════════════════════════
//  🚰 灌水管理（セクション6）
//  実務側サブタブ「🚰 灌水」の描画・保存ロジック
//  データ: _adpIrrigationRecords[]
//    cropId=null → エリア全体への灌水
//    cropId=xxx  → 特定作物への灌水
//  保存先: localStorage adpIrrigation_${areaId}
// ═══════════════════════════════════════════

const IRRIGATION_METHOD_PRESETS = [
  { key: 'drip',       label: '点滴',           defaultFlow: 2,    unitLabel: '点滴本数',           hasUnitCount: true  },
  { key: 'sprinkler',  label: 'スプリンクラー', defaultFlow: 500,  unitLabel: 'スプリンクラー個数', hasUnitCount: true  },
  { key: 'manual',     label: '散水（手動）',   defaultFlow: null, unitLabel: '個数',               hasUnitCount: false },
  { key: 'other',      label: 'その他',         defaultFlow: null, unitLabel: '個数',               hasUnitCount: true  },
];

function _adpRenderIrrigationPane() {
  const el = document.getElementById('irrigation-result');
  if (!el) return;
  const areaId = _adpArea?.id || _adpArea?.name || '';

  const areaWideRecords = _adpIrrigationRecords.filter(r => !r.cropId);
  const areaCardHTML = _adpBuildIrrigationCard(
    { key: 'area', name: 'エリア全体', icon: '🌍', records: areaWideRecords },
    areaId
  );

  const cropCardsHTML = _adpPracticecrops.map(pc => {
    const records = _adpIrrigationRecords.filter(r => r.cropId === pc.cropId);
    return _adpBuildIrrigationCard(
      { key: pc.cropId, name: _adpCropIdToName(pc.cropId), icon: '🌱', records, plantingDesign: pc.plantingDesign || null },
      areaId
    );
  }).join('');

  const hintHTML = _adpPracticecrops.length
    ? ''
    : `<div class="ir-hint">作物ごとの灌水記録を行うには、作物を追加してください。</div>`;

  el.innerHTML = `<div class="ir-section">${areaCardHTML}${hintHTML}${cropCardsHTML}</div>`;
}

function _adpIrrigationWeeklyRows(records) {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key   = d.toISOString().slice(0, 10);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const total = records
      .filter(r => r.date === key)
      .reduce((s, r) => s + (r.totalWaterL || 0), 0);
    days.push({ key, label, total: Math.round(total * 10) / 10 });
  }
  return days;
}

function _adpBuildIrrigationWeekTable(records) {
  const rows      = _adpIrrigationWeeklyRows(records);
  const weekTotal = Math.round(rows.reduce((s, r) => s + r.total, 0) * 10) / 10;
  return `
    <div class="ir-week-wrap">
      <div class="ir-week-title">📆 直近7日間の使用水量（合計 ${weekTotal}L）</div>
      <table class="ir-week-table">
        <tbody>
          <tr>${rows.map(r => `<td class="ir-week-day">${r.label}</td>`).join('')}</tr>
          <tr>${rows.map(r => `<td class="ir-week-val">${r.total || 0}L</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>`;
}

function _adpBuildIrrigationCard(opts, areaId) {
  const { key, name, icon, records, plantingDesign } = opts;
  const presetOptions = IRRIGATION_METHOD_PRESETS.map(p =>
    `<option value="${p.key}">${p.label}</option>`
  ).join('');

  // ── 自動計算セクション（ridgeSegments がある作物のみ）──
  let autoCalcHTML = '';
  if (plantingDesign?.ridgeSegments?.length) {
    const segs     = plantingDesign.ridgeSegments;
    const rowWidth = parseFloat(plantingDesign.rowWidth) || 0;
    const totalLen = Math.round(segs.reduce((s, sg) => s + sg.length, 0) * 10) / 10;
    const sqm      = rowWidth > 0 ? Math.round(totalLen * rowWidth * 10) / 10 : null;

    // cropDB から waterNeedLperSqmPerDay を取得
    const crop       = (typeof CROP_DB !== 'undefined') ? CROP_DB.find(c => c.id === key) : null;
    const waterRate  = crop?.waterNeedLperSqmPerDay ?? null;
    const dailyWater = (sqm != null && waterRate != null)
      ? Math.round(sqm * waterRate * 10) / 10
      : null;

    autoCalcHTML = `
      <div class="ir-auto-calc">
        <div class="ir-auto-calc-title">📐 畝設計から自動計算</div>
        <div class="ir-auto-calc-grid">
          <div class="ir-auto-item">
            <span class="ir-auto-label">配管チューブ必要長</span>
            <span class="ir-auto-val">${totalLen} m</span>
          </div>
          ${sqm != null ? `
          <div class="ir-auto-item">
            <span class="ir-auto-label">管理面積</span>
            <span class="ir-auto-val">${sqm} m²</span>
          </div>` : ''}
          ${dailyWater != null ? `
          <div class="ir-auto-item">
            <span class="ir-auto-label">推奨灌水量（1日）</span>
            <span class="ir-auto-val ir-auto-val-highlight">${dailyWater} L/日</span>
          </div>` : ''}
        </div>
        ${waterRate != null ? `<div class="ir-auto-note">※ 作物標準値 ${waterRate} L/m²/日 をもとに算出</div>` : ''}
      </div>`;
  }

  const today = new Date().toISOString().slice(0, 10);

  const rowsHTML = records.length
    ? records.map(r => {
        const methodLabel = IRRIGATION_METHOD_PRESETS.find(p => p.key === r.method)?.label || r.method || '—';
        return `
        <tr class="ir-row">
          <td class="ir-td">${r.date || '—'}</td>
          <td class="ir-td ir-td-method">${methodLabel}</td>
          <td class="ir-td ir-td-time">${r.startTime || '—'}–${r.endTime || '—'}</td>
          <td class="ir-td ir-td-amount">${r.totalWaterL != null ? r.totalWaterL : '—'}L</td>
          <td class="ir-td ir-td-memo">${r.memo || ''}</td>
          <td class="ir-td ir-td-del">
            <button class="ir-del-btn" onclick="_adpDeleteIrrigationRecord('${r.id}','${areaId}')">×</button>
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="6" class="ir-td-empty">記録がありません</td></tr>`;

  return `
    <div class="ir-card" id="ir-card-${key}">
      <div class="ir-card-header" onclick="_adpToggleIrrigationCard('${key}')">
        <span class="ir-crop-name">${icon} ${name}</span>
        <span class="ir-record-count">${records.length}件</span>
        <span class="ir-card-arrow">▶</span>
      </div>
      <div class="ir-card-body" id="ir-body-${key}" style="display:none;">
        ${autoCalcHTML}
        ${_adpBuildIrrigationWeekTable(records)}
        <div class="ir-form-wrap" id="ir-form-${key}" style="display:none;">
          <div class="ir-form-grid">
            <div class="ir-field">
              <label class="ir-label">日付</label>
              <input class="ir-input" type="date" id="ir-date-${key}" value="${today}">
            </div>
            <div class="ir-field">
              <label class="ir-label">灌水方法</label>
              <select class="ir-input ir-select" id="ir-method-${key}"
                      onchange="_adpIrrigationMethodChange('${key}')">
                ${presetOptions}
              </select>
            </div>
            <div class="ir-field ir-field-inline">
              <div>
                <label class="ir-label">開始時刻</label>
                <input class="ir-input" type="time" id="ir-start-${key}">
              </div>
              <div>
                <label class="ir-label">終了時刻</label>
                <input class="ir-input" type="time" id="ir-end-${key}">
              </div>
            </div>
            <div class="ir-field ir-field-inline">
              <div>
                <label class="ir-label">流量（L/時・1個あたり）</label>
                <input class="ir-input" type="number" id="ir-flow-${key}"
                       placeholder="0" min="0" step="0.1">
              </div>
              <div id="ir-unitcount-wrap-${key}">
                <label class="ir-label" id="ir-unitcount-label-${key}">点滴本数</label>
                <input class="ir-input" type="number" id="ir-unitcount-${key}"
                       placeholder="0" min="0" step="1">
              </div>
            </div>
            <div class="ir-field">
              <label class="ir-label">メモ（任意）</label>
              <input class="ir-input" type="text" id="ir-memo-${key}"
                     placeholder="栽培棟Aなど" maxlength="100">
            </div>
          </div>
          <div class="ir-form-footer">
            <button class="ir-cancel-btn" onclick="_adpToggleIrrigationForm('${key}')">キャンセル</button>
            <button class="ir-add-btn" onclick="_adpAddIrrigationRecord('${key}','${areaId}')">＋ 追加</button>
          </div>
        </div>
        <button class="ir-open-form-btn" id="ir-open-btn-${key}"
                onclick="_adpToggleIrrigationForm('${key}')">＋ 灌水を記録</button>
        <table class="ir-table">
          <thead>
            <tr>
              <th class="ir-th">日付</th>
              <th class="ir-th ir-th-method">方法</th>
              <th class="ir-th ir-th-time">時間</th>
              <th class="ir-th">使用水量</th>
              <th class="ir-th ir-th-memo">メモ</th>
              <th class="ir-th"></th>
            </tr>
          </thead>
          <tbody id="ir-tbody-${key}">
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    </div>`;
}

function _adpToggleIrrigationCard(key) {
  const body  = document.getElementById(`ir-body-${key}`);
  const arrow = document.querySelector(`#ir-card-${key} .ir-card-arrow`);
  if (!body) return;
  const isOpen = body.style.display === 'none';
  body.style.display = isOpen ? 'block' : 'none';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▶';
}

function _adpToggleIrrigationForm(key) {
  const form    = document.getElementById(`ir-form-${key}`);
  const openBtn = document.getElementById(`ir-open-btn-${key}`);
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display    = isHidden ? 'block' : 'none';
  if (openBtn) openBtn.style.display = isHidden ? 'none' : 'inline-flex';
  if (isHidden) _adpIrrigationMethodChange(key);
}

function _adpIrrigationMethodChange(key) {
  const sel       = document.getElementById(`ir-method-${key}`);
  const flowInput = document.getElementById(`ir-flow-${key}`);
  const unitWrap  = document.getElementById(`ir-unitcount-wrap-${key}`);
  const unitLabel = document.getElementById(`ir-unitcount-label-${key}`);
  if (!sel) return;
  const preset = IRRIGATION_METHOD_PRESETS.find(p => p.key === sel.value) || IRRIGATION_METHOD_PRESETS[0];
  if (flowInput && preset.defaultFlow != null) flowInput.value = preset.defaultFlow;
  if (unitWrap)  unitWrap.style.display  = preset.hasUnitCount ? '' : 'none';
  if (unitLabel) unitLabel.textContent   = preset.unitLabel;
}

function _adpAddIrrigationRecord(key, areaId) {
  const cropId    = (key === 'area') ? null : key;
  const date      = document.getElementById(`ir-date-${key}`)?.value || '';
  const method    = document.getElementById(`ir-method-${key}`)?.value || 'drip';
  const startTime = document.getElementById(`ir-start-${key}`)?.value || '';
  const endTime   = document.getElementById(`ir-end-${key}`)?.value || '';
  const flowRate  = parseFloat(document.getElementById(`ir-flow-${key}`)?.value) || null;
  const memo      = (document.getElementById(`ir-memo-${key}`)?.value || '').trim();

  const preset    = IRRIGATION_METHOD_PRESETS.find(p => p.key === method);
  const unitCount = preset?.hasUnitCount
    ? (parseFloat(document.getElementById(`ir-unitcount-${key}`)?.value) || null)
    : 1;

  if (!date) { if (typeof showToast === 'function') showToast('日付を入力してください', 'amber'); return; }
  if (!startTime || !endTime) { if (typeof showToast === 'function') showToast('開始・終了時刻を入力してください', 'amber'); return; }
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const durationMin = (eh * 60 + em) - (sh * 60 + sm);
  if (!(durationMin > 0)) { if (typeof showToast === 'function') showToast('終了時刻は開始時刻より後にしてください', 'amber'); return; }
  if (!flowRate) { if (typeof showToast === 'function') showToast('流量を入力してください', 'amber'); return; }
  if (preset?.hasUnitCount && !unitCount) { if (typeof showToast === 'function') showToast('個数を入力してください', 'amber'); return; }

  const totalWaterL = Math.round(flowRate * unitCount * (durationMin / 60) * 10) / 10;
  _adpIrrigationRecords.unshift({
    id: Date.now().toString(),
    date, cropId, method, startTime, endTime, durationMin, flowRate, unitCount, totalWaterL, memo,
  });
  _adpSaveIrrigationRecords(areaId);
  _adpRenderIrrigationPane();
  if (typeof showToast === 'function') showToast('灌水記録を追加しました');
}

function _adpDeleteIrrigationRecord(recordId, areaId) {
  _adpIrrigationRecords = _adpIrrigationRecords.filter(r => r.id !== recordId);
  _adpSaveIrrigationRecords(areaId);
  _adpRenderIrrigationPane();
  if (typeof showToast === 'function') showToast('記録を削除しました');
}

// ═══════════════════════════════════════════════════════
//  実務側サブタブ「📦 出荷記録」の描画・連携ロジック
// ═══════════════════════════════════════════════════════

/**
 * _adpRenderShippingPane()
 * shipping-result div を全描画。
 * records.js の renderShippingForm() に現在エリア・作物情報を渡す。
 */
function _adpRenderShippingPane() {
  const el = document.getElementById('shipping-result');
  if (!el) return;

  if (typeof renderShippingForm === 'function') {
    el.innerHTML = renderShippingForm({
      area:         _adpArea,
      practicecrops: _adpPracticecrops,
    });
  } else {
    el.innerHTML = '<div class="sh-empty">records.js が読み込まれていません</div>';
  }
}

// ═════════════════════════════════════════════════════════════════
//  輪作履歴 — ヘルパー関数習
// ═════════════════════════════════════════════════════════════════

// ─── cropDB から使える作物リストを取得 ───
function _rotGetCrops() {
  if (typeof cropDB !== 'undefined' && Array.isArray(cropDB)) return cropDB;
  if (typeof window.cropDB !== 'undefined' && Array.isArray(window.cropDB)) return window.cropDB;
  return [];
}

// ─── 輪作履歴 <select> オプションHTML ───
function _rotCropOptions(selectedId) {
  const crops = _rotGetCrops();
  const opts = crops.map(c =>
    `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  return `<option value="">作物を選択</option>${opts}`;
}

// ─── 輪作履歴行 HTML（インライン編集内リスト） ───
function _buildRotationRows(area) {
  const history = area.env?.rotationHistory || [];
  if (history.length === 0) {
    return '<div class="rot-empty">記録なし（＋追加 で入力）</div>';
  }
  const currentYear = new Date().getFullYear();
  return history
    .slice()
    .sort((a, b) => b.year - a.year)
    .map(r => _rotRowHtml(r.year, r.cropId, currentYear))
    .join('');
}

// ─── 1行分の HTML ───
function _rotRowHtml(year, cropId, currentYear) {
  const yearOpts = Array.from({ length: 20 }, (_, i) => currentYear - i)
    .map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}年</option>`)
    .join('');
  return `
    <div class="rot-row">
      <select class="rot-year">${yearOpts}</select>
      <select class="rot-crop">${_rotCropOptions(cropId)}</select>
      <button class="rot-del-btn" onclick="event.stopPropagation();this.closest('.rot-row').remove()">×</button>
    </div>`;
}

// ─── ＋追加ボタン ───
function _rotAddRow(areaId) {
  const list = document.getElementById('rot-list-' + areaId);
  if (!list) return;
  const empty = list.querySelector('.rot-empty');
  if (empty) empty.remove();
  const currentYear = new Date().getFullYear();
  const div = document.createElement('div');
  div.innerHTML = _rotRowHtml(currentYear, '', currentYear);
  list.appendChild(div.firstElementChild);
}

// ─── 詳細パネル用：輪作履歴の閲覧 HTML ───
function _buildRotationDetailHtml(area) {
  const history = area.env?.rotationHistory || [];
  if (history.length === 0) return '';

  const crops = _rotGetCrops();
  const cropName = id => crops.find(c => c.id === id)?.name || id;

  const rows = history
    .slice()
    .sort((a, b) => b.year - a.year)
    .map(r => `
      <div class="env-detail-row">
        <span class="env-detail-label">${r.year}年</span>
        <span class="env-detail-value">${escHtml(cropName(r.cropId))}</span>
      </div>`)
    .join('');

  return `
    <div class="env-detail-section">
      <div class="env-detail-section-title">🔄 輪作履歴</div>
      ${rows}
    </div>`;
}