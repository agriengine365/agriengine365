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

  const payload = {
    name,
    memo,
    geojson: geojsonStr,
    landProfile,
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
    },
    createdAt: new Date().toISOString(),
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

// ─── 旧 autoSaveArea (互換用・現在は未使用) ───
async function autoSaveArea() {
  // ウィザードフローに移行したため、map.js の CREATED イベントから
  // showWizard() を呼ぶようになっています。
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

    <!-- インラインエディット（名前・土壌・メモ） -->
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
        <label>メモ</label>
        <textarea class="ie-memo" placeholder="水はけが悪い、日当たり良好など">${escHtml(area.memo || '')}</textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="saveInlineEdit('${area.id}')">保存</button>
        <button class="btn btn-ghost"   style="flex:1;" onclick="toggleInlineEdit('${area.id}')">キャンセル</button>
      </div>
    </div>
  `;
  div.querySelector('.area-item-header').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    selectArea(area);
  });
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

// ─── インラインエディット保存 ───
async function saveInlineEdit(id) {
  const el      = document.getElementById('edit-' + id);
  const name    = el.querySelector('.ie-name').value.trim();
  const memo    = el.querySelector('.ie-memo').value.trim();
  const soilBtn = el.querySelector('.soil-btn.selected');
  const soilType = soilBtn ? soilBtn.dataset.soil : null;

  if (!name) { showToast('エリア名を入力してください', 'amber'); return; }

  const update = { name, memo, 'meta.soilType': soilType, 'landProfile.soilType': soilType };

  try {
    if (db && !id.startsWith('local_')) {
      await db.collection('areas').doc(id).update(update);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        stored[idx].name = name;
        stored[idx].memo = memo;
        stored[idx].meta = stored[idx].meta || {};
        stored[idx].meta.soilType = soilType;
        stored[idx].landProfile = stored[idx].landProfile || buildLandProfile(stored[idx].meta || {});
        stored[idx].landProfile.soilType = soilType;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
    showToast('更新しました ✓', 'green');
    loadAreas();
  } catch(e) {
    showToast('更新に失敗しました', 'amber');
    console.error(e);
  }
}

// ─── 削除 ───
async function deleteArea(id) {
  if (!confirm('このエリアを削除しますか？')) return;
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
let _adpSelectedCropId   = null;
let _crOpenFieldScores   = null;  // 露地スコアキャッシュ（補正比較用）  // 気温グラフで強調表示中の作物ID
let _adpClimateMode   = false;  // true=気候推定モード / false=DBモード
let _adpClimateRanking = null;  // computeClimateRanking キャッシュ
let _adpClimateLoaded  = false; // true=AMeDAS取得試行済み（成功/失敗問わず）

async function openAreaDetailPanel(area) {
  _adpArea    = area;
  const now   = new Date();
  _adpYear    = now.getFullYear();
  _adpMonth   = now.getMonth();
  _adpSelDate = null;
  _adpEditId  = null;
  _adpClimateMode    = false;
  _adpClimateRanking = null;
  _adpClimateLoaded  = false;

  // 作物選択状態をリセット（エリア再オープン時に前回選択が残らないよう）
  _adpSelectedCropId = null;
  

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

  // ── 最初のサブタブ（気温グラフ）を表示 ──
  _adpSwitchSubTab('ranking');

  // 🌿 土地環境系（landProfile依存・AMeDAS不要・常時表示）
  _adpRenderEnvDonut(area);
  _adpRenderLandRiskGauges(area);
  // 🌤️ 気候サマリー（AMeDAS取得前はローディング表示）
  _adpRenderClimateSummary(area);

  _adpRenderCalendar();
  _adpRenderDayRecords();

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
      <button class="adp-analyze-btn" onclick="_adpToggleWizardPanel()">
        <span>条件設定</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <!-- サマリーバー（常時表示） -->
    <div class="adp-summary-bar" id="adp-summary-bar">

      <!-- 行1: 操作トグル -->
      <div class="adp-summary-controls">
        <button class="adp-select-crop-btn" onclick="adpOpenCropSelectFromSummary()" title="作物を選ぶ">🌱 作物を選ぶ</button>
        <div class="adp-sb-cult-toggle">
          <button class="adp-cult-btn active" data-mode="openField"        onclick="_adpSwitchCultivation('openField')">露地</button>
          <button class="adp-cult-btn"        data-mode="greenhouse"       onclick="_adpSwitchCultivation('greenhouse')">ハウス</button>
          <button class="adp-cult-btn"        data-mode="heatedGreenhouse" onclick="_adpSwitchCultivation('heatedGreenhouse')">加温</button>
        </div>
        <div class="adp-sb-eval-toggle">
          <button class="adp-eval-mode-btn active" id="adp-eval-btn-db"
            onclick="_adpSetClimateMode(false)">📊 基本DB</button>
          <button class="adp-eval-mode-btn" id="adp-eval-btn-climate"
            onclick="_adpSetClimateMode(true)">🌿 <span id="adp-eval-climate-label">エリア気候</span></button>
        </div>
      </div>

      <!-- 行2: 結果表示 -->
      <div class="adp-summary-info">
        <div class="adp-summary-left">
          <span class="adp-summary-crop" id="adp-summary-crop">—</span>
          <span class="adp-summary-area" id="adp-summary-area">—</span>
        </div>
        <div class="adp-summary-right">
          <div class="adp-summary-score-wrap">
            <span class="adp-summary-score" id="adp-summary-score">—</span>
            <span class="adp-summary-score-label">総合スコア</span>
          </div>
          <div class="adp-summary-mode" id="adp-summary-mode">露地</div>
          <div class="adp-summary-conf-wrap">
            <div class="conf-bar-track adp-summary-conf-track">
              <div class="conf-bar-fill" id="adp-conf-bar" style="width:0%"></div>
            </div>
            <span id="adp-conf-pct" class="adp-summary-conf-pct">0%</span>
            <span id="adp-conf-label" class="adp-summary-conf-label">—</span>
          </div>
        </div>
      </div>

    </div>

    <!-- 分析ウィザード（インラインアコーディオン） -->
    <div class="adp-wizard-panel" id="adp-wizard-panel" hidden>
      <div class="adp-wizard-progress">
        <div class="aw-prog-dot active" id="awdot-0"></div>
      </div>
      <div class="aw-step-title" id="aw-step-title">営農条件入力</div>
      <div class="aw-body" id="aw-body"></div>
      <div class="aw-footer" id="aw-footer"></div>
    </div>

    <!-- サブタブバー（8タブ＋比較は条件付き） -->
    <div class="adp-subtabs" id="adp-subtabs">
      <button class="adp-subtab active" data-subtab="ranking"  onclick="_adpSwitchSubTab('ranking')">📊 グラフ</button>
      <button class="adp-subtab"        data-subtab="growth"   onclick="_adpSwitchSubTab('growth')">📈 生育期間</button>
      <button class="adp-subtab"        data-subtab="profit"   onclick="_adpSwitchSubTab('profit')">💴 収益</button>
      <button class="adp-subtab"        data-subtab="fert"     onclick="_adpSwitchSubTab('fert')">🧪 施肥</button>
      <button class="adp-subtab"        data-subtab="risk"     onclick="_adpSwitchSubTab('risk')">⚠️ リスク</button>
      <button class="adp-subtab"        data-subtab="calendar" onclick="_adpSwitchSubTab('calendar')">📅 カレンダー</button>
      <button class="adp-subtab"        data-subtab="match"    onclick="_adpSwitchSubTab('match')">📊 適合度</button>
      <button class="adp-subtab adp-subtab-compare" data-subtab="compare" onclick="_adpSwitchSubTab('compare')" style="display:none;">⚖️ 比較</button>
    </div>

    <!-- コンテンツ領域 -->
    <div class="adp-view-body">

      <!-- ① ランキング（旧chart流用：気温適性チャート固定上部 ＋ ランキングリスト下部） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-ranking">

        <!-- ▼ 上部固定: グラフブロック -->
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


      <!-- ② 生育期間（旧growth流用：チャート固定上部 ＋ ランキングリスト下部） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-growth" style="display:none;">

        <!-- ▼ 上部固定: 生育期間グラフ -->
        <div class="adp-chart-sticky">
          <div class="adp-temp-chart-header">
            <span class="adp-temp-chart-sub" id="adp-growth-chart-sub">作物を選択すると生育期間・降水量適性を重畳表示</span>
          </div>
          <div class="adp-temp-chart-wrap adp-growth-chart-wrap">
            <canvas id="adp-growth-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-growth-legend"></div>
        </div>

      </div>

      <!-- ③ 収益（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-profit" style="display:none;">
        <div id="profit-waterfall" class="empty-mini">作物を選択すると収益概算が表示されます。</div>
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

      <!-- ⑥ カレンダー（訪問記録カレンダー＋生育カレンダーを1コンテナ内に上下併記） -->
      <div class="adp-pane" id="adp-pane-calendar" style="display:none;">
        <div class="adp-cal-visit-wrap" id="adp-cal-visit-wrap">
          <div class="vm-cal-header" id="vm-cal-header-wrap"></div>
          <div id="adp-calendar-wrap"></div>
          <div id="adp-day-records-wrap"></div>
        </div>
        <div class="adp-cal-growth-wrap" id="adp-cal-growth-wrap">
          <div id="calendar-result" class="empty-mini">作物を選択すると生育カレンダーが表示されます。</div>
        </div>
      </div>

      <!-- ⑦ 適合度（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-match" style="display:none;">
        <!-- 🌿 土地環境適合度ドーナツ（作物選択なしでも常時表示） -->
        <div id="adpc-env-donut-fixed" class="adpc-fixed-section"></div>
        <div id="conf-detail" class="empty-mini" style="font-size:11px;color:var(--text2);line-height:1.8;">作物を選択するとエリア適合度の詳細が表示されます。</div>
      </div>

      <!-- ⑧ 比較（複数作物選択時のみ表示・Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-compare" style="display:none;">
        <div id="compare-result" class="empty-mini">複数の作物を選択すると比較テーブルが表示されます。</div>
      </div>

    </div>
  `;
  document.body.appendChild(view);

  // ─── ランキングダイアログ ───
  if (!document.getElementById('adp-ranking-dialog')) {
    const dlg = document.createElement('div');
    dlg.id = 'adp-ranking-dialog';
    dlg.className = 'adp-ranking-dialog';
    dlg.setAttribute('aria-hidden', 'true');
    dlg.innerHTML = `
      <div class="adp-ranking-dlg-inner">
        <div class="adp-ranking-dlg-header">
          <span class="adp-ranking-dlg-title" id="adp-ranking-dlg-title">ランキング</span>
          <button class="adp-ranking-dlg-close" onclick="_adpCloseRankingDialog()">✕</button>
        </div>
        <div class="adp-ranking-dlg-controls">
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
        </div>
        <div class="adp-ranking-dlg-body">
          <div id="crop-ranking"><div class="empty-mini">計算中...</div></div>
          <div id="crop-ranking-growth" style="display:none;"><div class="empty-mini">計算中...</div></div>
        </div>
      </div>
    `;
    document.body.appendChild(dlg);
  }
}

// ─── ランキングダイアログ 開閉 ───
let _adpRankingDlgPane = null; // 現在開いているペイン ('ranking' | 'growth')

function _adpOpenRankingDialog(pane) {
  const dlg = document.getElementById('adp-ranking-dialog');
  if (!dlg) return;
  _adpRankingDlgPane = pane;

  // タイトル更新
  const title = document.getElementById('adp-ranking-dlg-title');
  if (title) title.textContent = pane === 'growth' ? '📈 生育ランキング' : '🏆 ランキング';

  // 表示切替
  const elRanking = document.getElementById('crop-ranking');
  const elGrowth  = document.getElementById('crop-ranking-growth');
  if (elRanking) elRanking.style.display = pane === 'ranking' ? '' : 'none';
  if (elGrowth)  elGrowth.style.display  = pane === 'growth'  ? '' : 'none';

  // 栽培方式トグル挿入
  _adpEnsureCultivationToggle();

  // 栽培方式をUIに反映
  const currentMode = currentAreaData?.cultivationMode || 'openField';
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });

  // カテゴリタブをリセット
  document.querySelectorAll('.cr-tab-major').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.major === 'all');
  });
  _crRenderMinorTabs();

  // ランキング描画
  if (pane === 'growth') {
    _adpRenderGrowthRankingList();
  } else {
    _adpRenderRankingList();
  }

  dlg.classList.add('open');
  dlg.removeAttribute('aria-hidden');
}

function _adpCloseRankingDialog() {
  const dlg = document.getElementById('adp-ranking-dialog');
  if (!dlg) return;
  dlg.classList.remove('open');
  dlg.setAttribute('aria-hidden', 'true');
  _adpRankingDlgPane = null;
}

// ─── 評価モード切替（DB ↔ 気候推定） ───
function _adpSetClimateMode(isClimate) {
  _adpClimateMode = isClimate;

  // トグルボタン active 同期（サマリーバー）
  document.querySelectorAll('.adp-eval-mode-btn').forEach(btn => {
    const isDb = btn.id === 'adp-eval-btn-db';
    btn.classList.toggle('active', isDb ? !isClimate : isClimate);
  });

  // 気候ボタンのラベルをエリア名に更新
  const clLabel = document.getElementById('adp-eval-climate-label');
  if (clLabel) {
    const areaName = currentAreaData?.name;
    clLabel.textContent = areaName ? `${areaName}気候` : 'エリア気候';
  }

  // 気候推定モード時はランキングキャッシュを生成
  if (isClimate && !_adpClimateRanking) {
    const decadeArr = currentAreaData?.climate?.decadeArr
                   ?? _adpClimateCache?.decadeArr
                   ?? null;
    if (decadeArr && typeof CROP_DB !== 'undefined' && typeof computeClimateRanking === 'function') {
      _adpClimateRanking = computeClimateRanking(decadeArr, CROP_DB);
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
const ADP_SUBTAB_KEYS = ['ranking', 'growth', 'profit', 'fert', 'risk', 'calendar', 'match', 'compare'];
let _adpCurrentSubTab = 'ranking'; // 現在のサブタブ

function _adpSwitchSubTab(name) {
  _adpCurrentSubTab = name;

  // タブボタン
  document.querySelectorAll('.adp-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  // ペイン
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
  // グラフペインを表示したときに再描画（offsetWidth が 0→正常になるため）
  if (name === 'ranking') {
    setTimeout(() => _adpRenderTempChart(_adpSelectedCropId), 30);
  }
  if (name === 'growth') {
    // 生育期間ペイン用トグルを確実に生成してからモードを同期
    _adpEnsureCultivationToggle();
    const currentMode = currentAreaData?.cultivationMode || 'openField';
    document.querySelectorAll('.adp-cult-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });
    setTimeout(() => _adpRenderGrowthChart(_adpSelectedCropId), 30);
  }
  if (name === 'calendar') {
    // マイクボタン注入（voiceMemo.js）
    const hdr = document.getElementById('vm-cal-header-wrap');
    if (hdr && typeof vmMicButtonHTML === 'function' && !document.getElementById('vm-mic-btn')) {
      hdr.innerHTML = vmMicButtonHTML();
    }
    _adpRenderCalendar();
    _adpRenderDayRecords();
  }
  // ── 作物選択済み時の各ペイン再描画 ──
  if (_adpSelectedCropId) {
    const ad = currentAreaData;
    const scoreEntry = (typeof _crScores !== 'undefined')
      ? _crScores.find(s => s.crop.id === _adpSelectedCropId) : null;
    const crop = scoreEntry?.crop
      ?? (typeof CROP_DB !== 'undefined'
          ? (CROP_DB.find ? CROP_DB.find(c => c.id === _adpSelectedCropId)
            : Object.values(CROP_DB).flat().find(c => c.id === _adpSelectedCropId))
          : null);

    if (name === 'profit') {
      if (typeof renderProfitWaterfall === 'function') {
        if (scoreEntry) {
          renderProfitWaterfall(scoreEntry);
        } else if (crop && typeof buildSingleCropAnalysis === 'function') {
          const single = buildSingleCropAnalysis(_adpSelectedCropId, ad);
          renderProfitWaterfall(single ? { crop: single.crop, profitability: single.profitability } : null);
        }
      }
    }
    if (name === 'fert') {
      if (crop && typeof _renderFertResult === 'function') _renderFertResult(crop);
    }
    if (name === 'risk') {
      if (crop && typeof _renderRiskResult === 'function') _renderRiskResult(crop);
    }
    // match（適合度）ペインは _adpSelectCropForAnalysis で描画済みのためここでは再計算しない
  }
}

// ─── ウィザードパネルの開閉 ───
function _adpToggleWizardPanel() {
  const panel = document.getElementById('adp-wizard-panel');
  if (!panel) return;
  const willOpen = panel.hasAttribute('hidden');
  if (willOpen) {
    // AMeDAS未取得時は精度低下を通知
    if (!_adpClimateLoaded) {
      showToast('気候データ取得中です。精度が低い可能性があります', 'amber');
    }
    panel.removeAttribute('hidden');
    if (typeof _awInitPanel === 'function') _awInitPanel(_adpArea);
  } else {
    panel.setAttribute('hidden', '');
  }
}

// ─── サマリーバー更新 ───
function _adpUpdateSummaryBar({ cropName, areaName, score, mode, confPct, confLabel } = {}) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.textContent = val; };
  set('adp-summary-crop',  cropName  ?? '—');
  set('adp-summary-area',  areaName  ?? '—');
  set('adp-summary-score', score != null ? score + '%' : '—');
  set('adp-summary-mode',  mode      ?? '');
  set('adp-conf-pct',      confPct   ?? '0%');
  set('adp-conf-label',    confLabel ?? '—');
  const bar = document.getElementById('adp-conf-bar');
  if (bar && confPct != null) bar.style.width = confPct;
  const scoreEl = document.getElementById('adp-summary-score');
  if (scoreEl && score != null) {
    scoreEl.style.color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)';
  }
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

  const y = _adpYear, m = _adpMonth;
  const monthLabel = `${y}年 ${m + 1}月`;
  const firstDay   = new Date(y, m, 1).getDay();  // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // DOW header
  const dows = ['日','月','火','水','木','金','土'];
  const dowHTML = dows.map(d => `<div class="adp-cal-dow">${d}</div>`).join('');

  // cells
  let cellsHTML = '';
  // 空セル
  for (let i = 0; i < firstDay; i++) {
    cellsHTML += `<div class="adp-cal-day empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const recs    = byDate[dateStr] || [];
    const isToday = dateStr === todayStr;
    const isSel   = dateStr === _adpSelDate;
    let cls = 'adp-cal-day';
    if (isToday)     cls += ' today';
    if (isSel)       cls += ' selected';
    if (recs.length) cls += ' has-record';

    // ドット（最大3個）
    const dots = recs.slice(0, 3).map(() => `<div class="adp-cal-dot"></div>`).join('');
    const dotsHTML = recs.length ? `<div class="adp-cal-dots">${dots}</div>` : `<div class="adp-cal-dots"></div>`;

    cellsHTML += `
      <div class="${cls}" onclick="_adpSelectDate('${dateStr}')">
        <div class="adp-cal-day-num">${d}</div>
        ${dotsHTML}
      </div>`;
  }

  wrap.innerHTML = `
    <div class="adp-cal-nav">
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(-1)">‹</button>
      <span class="adp-cal-month-label">${monthLabel}</span>
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(1)">›</button>
    </div>
    <div class="adp-cal-grid">
      ${dowHTML}
      ${cellsHTML}
    </div>
  `;
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

  const label = `${parseInt(_adpSelDate.slice(5,7))}月${parseInt(_adpSelDate.slice(8,10))}日の記録`;

  if (!dayRecs.length && !voiceMemos.length) {
    wrap.innerHTML = `
      <div class="adp-day-records">
        <div class="adp-day-records-title">${label}</div>
        <div class="empty" style="padding:16px 0;font-size:12px;">この日の記録はありません</div>
      </div>`;
    return;
  }

  // 通常記録カード
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
          <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;"
            onclick="_adpToggleEdit('${r.id}')">
            ${isEditing ? '閉じる' : '編集'}
          </button>
          <button class="btn btn-danger" style="font-size:11px;padding:5px 10px;"
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
          <button class="btn btn-danger" style="font-size:11px;padding:5px 10px;"
            onclick="vmDeleteAndRefresh('${m.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="adp-day-records">
      <div class="adp-day-records-title">${label}</div>
      ${recCardsHTML}
      ${vmCardsHTML}
    </div>`;
}

// 音声メモ削除→カレンダー再描画
function vmDeleteAndRefresh(id) {
  if (typeof vmDelete === 'function') vmDelete(id);
  _adpRenderCalendar();
  _adpRenderDayRecords();
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
function _adpDeleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
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

  // スコア計算のみ（DOM描画はダイアログを開いた時に行う）
  currentAreaData.cultivationMode = 'openField';

  // サマリーバーの栽培方式ボタンを初期化状態に同期
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === 'openField');
  });
  // DB/気候トグルを初期化（DB側をactive）
  document.querySelectorAll('.adp-eval-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === 'adp-eval-btn-db');
  });
  // 気候ボタンのエリア名ラベルを更新
  const _clLabelInit = document.getElementById('adp-eval-climate-label');
  if (_clLabelInit && currentAreaData?.name) {
    _clLabelInit.textContent = `${currentAreaData.name}気候`;
  }

  const result = buildAnalysisResult(currentAreaData);

  // 露地スコアをキャッシュ（補正比較用）
  _crOpenFieldScores = result.cropScores.map(s => ({ id: s.crop.id, score: s.score }));

  // analysis.js のランキング状態を更新
  _crScores = result.cropScores;
  _crMajor  = 'all';
  _crMinor  = null;
}

// ─── 栽培方式トグル（サマリーバーに移動済み・ダイアログへの挿入は不要） ───
function _adpEnsureCultivationToggle() {
  // サマリーバーのトグルで一元管理するためダイアログへの挿入は行わない
}

function _adpInsertCultivationToggle(paneId, toggleId) {
  if (document.getElementById(toggleId)) return;
  const rankPane = document.getElementById(paneId);
  if (!rankPane) return;

  const modes = [
    { id: 'openField',        label: '露地' },
    { id: 'greenhouse',       label: 'ハウス' },
    { id: 'heatedGreenhouse', label: '加温ハウス' },
  ];

  const current = currentAreaData?.cultivationMode || 'openField';

  const wrap = document.createElement('div');
  wrap.id        = toggleId;
  wrap.className = 'adp-cult-toggle';
  wrap.innerHTML = modes.map(m => `
    <button class="adp-cult-btn${m.id === current ? ' active' : ''}"
      data-mode="${m.id}"
      onclick="_adpSwitchCultivation('${m.id}')">
      ${m.label}
    </button>
  `).join('');

  rankPane.prepend(wrap);
}

// ─── 栽培方式切替（気温適性・生育期間ペイン共通） ───
function _adpSwitchCultivation(mode) {
  if (!currentAreaData) return;
  currentAreaData.cultivationMode = mode;

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

    // ── 高温リスク行 ──
    const hr = r.heatRisk;
    const heatHtml = hr
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
        <div class="season-block-wrap">${seasonHtml}</div>
      </div>`;
  }).join('');

  el.innerHTML =
    `<div class="adp-climate-mode-note">🌿 ${currentAreaData?.name ?? 'エリア'}気候：旬別気温・日照から播種適期を算出</div>` +
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

    // 補正比較
    const { compareHtml } = _adpBuildScoreCompare(s.crop.id, s.score, mode);
    const rankDiff = ofScores ? _adpCalcRankDiff(s.crop.id, i, ofScores) : null;
    const rankDiffHtml = rankDiff != null && rankDiff !== 0
      ? `<span class="adp-rank-diff ${rankDiff > 0 ? 'adp-diff-up' : 'adp-diff-down'}">`
        + (rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`) + `</span>`
      : '';

    // 播種収穫ブロック（DBモードでは気候推定なし）
    const seasonHtml = _buildSeasonBlockHtml(s.crop, null);

    // ── 高温リスク（DBモード：decadeArrがあれば算出） ──
    const decadeArr = currentAreaData?.climate?.decadeArr ?? null;
    let heatHtml = '';
    if (decadeArr && typeof calcHeatRisk === 'function') {
      // DB側では播種・収穫旬が未定のため生育期間全体を概算
      const gpMin = s.crop.conditions?.growthPeriodMin ?? 60;
      const gpMax = s.crop.conditions?.growthPeriodMax ?? gpMin + 30;
      const gpDecades = Math.round(((gpMin + gpMax) / 2) / 10);
      // 最も温暖な旬を播種起点として仮算出（簡易）
      const tMean = decadeArr.tMean || decadeArr.tMax;
      let startD = 0;
      if (tMean) {
        let best = -Infinity;
        tMean.forEach((t, idx) => { if (t != null && t > best) { best = t; startD = idx; } });
        startD = (startD - Math.round(gpDecades / 2) + 36) % 36;
      }
      const endD = (startD + gpDecades - 1) % 36;
      const hr = calcHeatRisk(s.crop, decadeArr, startD, endD);
      if (hr) {
        const lvCls = hr.riskLevel === 'none' ? 'heat-none'
                    : hr.riskLevel === 'low'  ? 'heat-low'
                    : hr.riskLevel === 'mid'  ? 'heat-mid'
                    : 'heat-high';
        const countTxt = hr.hotDecadeCount > 0
          ? `<span class="heat-count">約${hr.hotDayApprox ?? hr.hotDecadeCount * 10}日以上 (${hr.threshold}℃超)</span>`
          : '';
        heatHtml = `<div class="cr-heat-row ${lvCls}">
          <span class="heat-label">高温リスク</span>
          <span class="heat-stars">${hr.riskStars}</span>
          ${countTxt}
        </div>`;
      }
    }

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
        ${compareHtml ? `<div class="adp-score-compare">${compareHtml}</div>` : ''}
        ${heatHtml}
        ${s.alert ? `<div class="cr-alert">${escHtml(s.alert)}</div>` : ''}
        <div class="season-block-wrap">${seasonHtml}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = '<div class="adp-db-mode-note">📊 基本DB：DB平年値ベースの適正スコア</div>' + summaryHtml + itemsHtml;
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
    },
    {
      icon:  '🌧️',
      label: '年降水量',
      value: climate.rain != null ? Math.round(climate.rain).toLocaleString() : '—',
      unit:  'mm',
      color: '#60a5fa',
    },
    {
      icon:  '☀️',
      label: '年間日照',
      value: sunshine != null ? Math.round(sunshine).toLocaleString() : '—',
      unit:  'h',
      color: '#fbbf24',
    },
    {
      icon:  '🏔️',
      label: '標高/pH',
      value: elev != null ? Math.round(elev).toLocaleString() : '—',
      unit:  'm',
      sub:   ph != null ? `pH ${ph.toFixed(1)}` : null,
      color: 'var(--text2)',
    },
  ];

  const badge = isStation
    ? `<span class="adpc-badge-ok">${climate.stationName}${climate.distKm != null ? '&nbsp;' + climate.distKm + 'km' : ''}</span>`
    : `<span class="adpc-badge-warn">推定値</span>`;

  el.innerHTML = `
    <div class="adpc-mini-summary">
      ${cards.map(c => `
        <div class="adpc-mini-stat">
          <span class="adpc-mini-stat-icon">${c.icon}</span>
          <div class="adpc-mini-stat-body">
            <span class="adpc-mini-stat-label">${c.label}</span>
            <span class="adpc-mini-stat-value" style="color:${c.color}">${c.value}<span class="adpc-mini-stat-unit">${c.unit}</span></span>
            ${c.sub ? `<span class="adpc-mini-stat-sub">${c.sub}</span>` : ''}
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

// ─── 生育期間グラフ描画 ───
function _adpRenderGrowthChart(cropId) {
  const canvas = document.getElementById('adp-growth-canvas');
  if (!canvas) return;

  const MONTH_KEYS   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  const N = 36; // 旬数

  // 旬データ
  const decadeArr  = currentAreaData?.climate?.decadeArr;
  // 降水量データ（月別）
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 190;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  // データなし
  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    document.getElementById('adp-growth-legend').innerHTML = '';
    return;
  }

  const tMeanArr = decadeArr.tMean; // 36要素（旬平均気温）

  // 作物データ取得
  let crop = null;
  if (cropId && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
         : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  }
  if (!crop && cropId && typeof _crScores !== 'undefined') {
    const hit = _crScores.find(s => s.crop.id === cropId);
    if (hit) crop = hit.crop;
  }

  // レイアウト
  const PAD = { top: 14, right: 40, bottom: 34, left: 32 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;

  // ── 左Y軸（気温）範囲 ──
  const allTemps = tMeanArr.filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const tRawMin = Math.min(...allTemps);
  const tRawMax = Math.max(...allTemps);
  const tYMin   = Math.floor((tRawMin - 2) / 5) * 5;
  const tYMax   = Math.ceil ((tRawMax + 2) / 5) * 5;
  const tRange  = tYMax - tYMin || 1;

  // ── 右Y軸（降水量）範囲 ──
  const rainVals = MONTH_KEYS.map(m => rainMonthly?.[m] ?? 0);
  let rYMax = Math.max(...rainVals, 50);
  if (crop?.conditions.absRainMax) rYMax = Math.max(rYMax, crop.conditions.absRainMax * 0.15);
  rYMax = Math.ceil(rYMax / 50) * 50;
  const rRange = rYMax;

  // 座標変換
  const toX  = i => PAD.left + (i / (N - 1)) * gW;
  const toTY = v => PAD.top  + (1 - (v - tYMin) / tRange) * gH;
  const toRY = v => PAD.top  + (1 - v / rRange) * gH;
  // 月別→旬X: 月ラベルは各月中旬（旬1）の位置
  const toMonthX = m => toX(m * 3); // 縦グリッドと月境界が一致するよう、上旬位置に統一

  // ── カレンダーキー→月index変換 ──
  const calToIdx = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(v => {
      if (typeof v === 'number') return v - 1;
      const i = MONTH_KEYS.indexOf(v);
      return i >= 0 ? i : -1;
    }).filter(i => i >= 0);
  };

  // ── 起点月（播種起点）──
  let sowingIdx = null;
  if (crop?.calendar) {
    const cal = crop.calendar;
    for (const key of ['sowing','seedling','transplant','planting','manage']) {
      const idxs = calToIdx(cal[key]);
      if (idxs.length > 0) { sowingIdx = Math.min(...idxs); break; }
    }
  }
  const harvestIdxs = crop ? calToIdx(crop.calendar?.harvest) : [];
  const manageIdxs  = crop ? calToIdx(crop.calendar?.manage)  : [];

  // 月幅（旬換算で3旬分）
  const barW_m = gW / 12; // 月1つ分の幅（12ヶ月）

  // ── Phenology播種ウィンドウ計算（crop+decadeArr両方ある時のみ）──
  let sowingWindows = [];
  let gddCurve      = null; // 36要素 GDD積算（右2軸）
  let gddMax        = 0;
  if (crop && typeof Phenology !== 'undefined') {
    sowingWindows = Phenology.sowingWindows(decadeArr, crop);
    // 最優先播種ウィンドウのGDD積算カーブ
    if (sowingWindows.length > 0) {
      const base = crop.conditions?.tempMeanMin ?? 10;
      gddCurve = Phenology.accumulateGDD(tMeanArr, base, sowingWindows[0].startDecade);
      gddMax   = Math.max(...gddCurve.filter(v => v !== null), 1);
    }
  }

  // ── ① 降水量適正帯シェード ──
  if (crop && rainMonthly) {
    const rMin = crop.conditions.rainfallMin;
    const rMax = crop.conditions.rainfallMax;
    const aMin = crop.conditions.absRainMin;
    const aMax = crop.conditions.absRainMax;

    if (aMin != null && rMin != null && aMin < rMin) {
      const yTop = toRY(Math.min(rMin, rYMax));
      const yBot = toRY(Math.max(aMin, 0));
      const g = ctx.createLinearGradient(0, yTop, 0, yBot);
      g.addColorStop(0, 'rgba(251,146,60,0.12)');
      g.addColorStop(1, 'rgba(251,146,60,0.00)');
      ctx.fillStyle = g;
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
      const g = ctx.createLinearGradient(0, yTop, 0, yBot);
      g.addColorStop(0, 'rgba(239,68,68,0.00)');
      g.addColorStop(1, 'rgba(239,68,68,0.10)');
      ctx.fillStyle = g;
      ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
    }
  }

  // ── ①-b Phenology播種ウィンドウ帯（スコア順上位3件を緑帯でシェード）──
  if (sowingWindows.length > 0) {
    const decW = gW / (N - 1); // 旬1つ分の幅
    sowingWindows.slice(0, 3).forEach((win, rank) => {
      const alpha = 0.22 - rank * 0.06; // スコアが高いほど濃く
      const s  = win.startDecade;
      const e  = win.endDecade;
      const x0 = toX(s) - decW / 2;
      const x1 = e >= s ? toX(e) + decW / 2 : toX(e + 36) + decW / 2; // 年またぎ考慮省略版
      const rw = Math.min(x1 - x0, gW - (x0 - PAD.left));
      if (rw > 0) {
        ctx.fillStyle = `rgba(34,197,94,${alpha})`;
        ctx.fillRect(Math.max(x0, PAD.left), PAD.top, Math.min(rw, gW), gH);
      }
    });
    // 最適播種旬（1位）の開始旬に▼マーカー
    const bestS = sowingWindows[0].startDecade;
    const bx    = toX(bestS);
    ctx.fillStyle = 'rgba(34,197,94,0.95)';
    ctx.beginPath();
    ctx.moveTo(bx - 5, PAD.top + 1);
    ctx.lineTo(bx + 5, PAD.top + 1);
    ctx.lineTo(bx,     PAD.top + 8);
    ctx.closePath();
    ctx.fill();
  }

  // ── ② manage月 縦帯 ──
  manageIdxs.forEach(m => {
    const x0 = toMonthX(m) - barW_m / 2;
    ctx.fillStyle = 'rgba(251,146,60,0.18)';
    ctx.fillRect(x0, PAD.top, barW_m, gH);
  });

  // ── ③ harvest月 縦帯 ──
  harvestIdxs.forEach(m => {
    const x0 = toMonthX(m) - barW_m / 2;
    ctx.fillStyle = 'rgba(74,222,128,0.22)';
    ctx.fillRect(x0, PAD.top, barW_m, gH);
  });

  // ── ④ 生育期間帯（播種→収穫）横シェード ──
  if (sowingIdx !== null && harvestIdxs.length > 0) {
    const endM = Math.max(...harvestIdxs);
    const x0   = toMonthX(sowingIdx) - barW_m / 2;
    const x1   = toMonthX(endM)      + barW_m / 2;
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0,   'rgba(56,189,248,0.08)');
    grad.addColorStop(0.5, 'rgba(56,189,248,0.14)');
    grad.addColorStop(1,   'rgba(56,189,248,0.06)');
    ctx.fillStyle = grad;
    if (x1 > x0) ctx.fillRect(x0, PAD.top, x1 - x0, gH);
  }

  // ── ⑤ グリッド線 ──
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

  // ── ⑥ 右Y軸ラベル（降水量）──
  for (let s = 0; s <= 4; s++) {
    const rv = Math.round(rYMax * s / 4);
    const y  = toRY(rv);
    ctx.fillStyle = 'rgba(96,165,250,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(rv + 'mm', PAD.left + gW + 3, y + 3);
  }

  // ── ⑦ 降水量棒グラフ（月単位）──
  if (rainMonthly) {
    const bw = barW_m * 0.7;
    MONTH_KEYS.forEach((mk, m) => {
      const rv = rainMonthly[mk] ?? 0;
      const x  = toMonthX(m) - bw / 2;
      const y  = toRY(rv);
      const bH = (PAD.top + gH) - y;
      if (bH > 0) {
        const g = ctx.createLinearGradient(0, y, 0, PAD.top + gH);
        g.addColorStop(0, 'rgba(96,165,250,0.70)');
        g.addColorStop(1, 'rgba(96,165,250,0.30)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, bw, bH);
      }
    });
  }

  // ── ⑧ 降水量適正ライン（破線）──
  if (crop && rainMonthly) {
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

  // ── ⑨ 気温折れ線（旬平均気温）──
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  let moved = false;
  tMeanArr.forEach((v, i) => {
    if (v === null) { moved = false; return; }
    if (!moved) { ctx.moveTo(toX(i), toTY(v)); moved = true; }
    else        { ctx.lineTo(toX(i), toTY(v)); }
  });
  ctx.stroke();

  // 気温ドット（中旬のみ少し大きく）
  tMeanArr.forEach((v, i) => {
    if (v === null) return;
    const r = (i % 3 === 1) ? 2.5 : 1.5;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(toX(i), toTY(v), r, 0, Math.PI * 2); ctx.fill();
  });

  // ── ⑩ GDD積算カーブ（Phenology結果がある場合のみ・右3軸）──
  if (gddCurve && gddMax > 0) {
    // GDD軸は温度軸（左）に重ねてスケーリング（右端にラベルだけ別付け）
    const toGY = v => PAD.top + (1 - v / gddMax) * gH;
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.8)'; // 紫
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
    // GDD右軸ラベル（右端外側に "GDD"文字とmax値）
    ctx.fillStyle = 'rgba(167,139,250,0.85)';
    ctx.font      = '8px DM Mono, monospace';
    ctx.textAlign = 'left';
    // GDDラベル: 降水量ラベル(PAD.top+3, PAD.top+gH+3)と重ならないよう13pxずらす
    ctx.fillText(`${Math.round(gddMax)}GDD`, PAD.left + gW + 3, PAD.top + 16);
    ctx.fillText('0GDD', PAD.left + gW + 3, PAD.top + gH - 4);
    ctx.restore();
  }

  // ── ⑪ 播種マーカー（▼）calendarベース ──
  if (sowingIdx !== null) {
    const x = toMonthX(sowingIdx);
    ctx.fillStyle = 'rgba(56,189,248,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 5, PAD.top + 1);
    ctx.lineTo(x + 5, PAD.top + 1);
    ctx.lineTo(x,     PAD.top + 8);
    ctx.closePath();
    ctx.fill();
  }
  // 収穫月マーカー（◆）calendarベース
  harvestIdxs.forEach(m => {
    const x = toMonthX(m);
    const y = PAD.top + 3;
    ctx.fillStyle = 'rgba(74,222,128,0.9)';
    ctx.beginPath();
    ctx.moveTo(x,     y - 5);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x,     y + 5);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fill();
  });

  // ── ⑫ 月ラベル ──
  ctx.fillStyle = 'rgba(90,122,92,0.8)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  MONTH_LABELS.forEach((label, m) => {
    ctx.fillText(label, toMonthX(m), H - PAD.bottom + 11);
  });

  // ── ⑬ 凡例更新 ──
  const subEl    = document.getElementById('adp-growth-chart-sub');
  const legendEl = document.getElementById('adp-growth-legend');

  if (crop) {
    if (subEl) subEl.textContent = `${crop.name} の生育期間・降水量を表示中`;

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

    const harvestLabel = harvestIdxs.length
      ? harvestIdxs.map(i => (i + 1) + '月').join('/')
      : null;

    // Phenology播種ウィンドウ表示（旬ラベル）
    const sowWinLabel = sowingWindows.length > 0
      ? (typeof Phenology !== 'undefined'
          ? Phenology.decadeLabel(sowingWindows[0].startDecade)
          : null)
      : null;
    const sowWinEndLabel = sowingWindows.length > 0
      ? (typeof Phenology !== 'undefined'
          ? Phenology.decadeLabel(sowingWindows[0].endDecade)
          : null)
      : null;

    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
      ${sowWinLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.6)"></span>播種適期 ${sowWinLabel}〜${sowWinEndLabel}</span>` : ''}
      ${rText ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.5)"></span>適正降水 ${rText}</span>` : ''}
      ${sowingIdx !== null ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(56,189,248,0.85);clip-path:polygon(50% 100%,0 0,100% 0)"></span>播種起点 ${sowingIdx + 1}月</span>` : ''}
      ${harvestLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.85);clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)"></span>収穫 ${harvestLabel}</span>` : ''}
      ${gddCurve ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.8)"></span>GDD積算</span>` : ''}
      ${gpText ? `<span class="adp-tl-item adp-tl-period">${gpText}</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択すると生育期間・降水量適性を重畳表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
    `;
  }
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
      const wins = Phenology.sowingWindows(decadeArr, s.crop);
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
  const gCanvas = document.getElementById('adp-growth-canvas');
  if (gCanvas) { gCanvas.width = 0; gCanvas.height = 0; }
}

// ─── 作物タップ → 選択して各タブへ反映 ───
function adpCropTap(el, cropId) {
  if (!el) return;

  // アコーディオン開閉
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
      if (typeof renderProfitWaterfall === 'function') {
        renderProfitWaterfall(scoreEntry ?? (single ? { crop: single.crop, profitability: single.profitability } : null));
      }
      if (crop) {
        if (typeof _renderFertResult  === 'function') _renderFertResult(crop);
        if (typeof _renderRiskResult  === 'function') _renderRiskResult(crop);
        if (typeof renderWorkCalendar === 'function') renderWorkCalendar(crop);
      }
      // 適合度ペイン更新
      const confDetailEl = document.getElementById('conf-detail');
      if (confDetailEl && single) {
        const decadeArr = ad?.climate?.decadeArr;
        let estSeason = null;
        if (decadeArr && typeof Phenology !== 'undefined') {
          const wins = Phenology.sowingWindows(decadeArr, single.crop);
          if (wins?.length) estSeason = _buildEstimatedSeasonLabel(wins[0]);
        }
        const seasonHtml = _buildSeasonBlockHtml(single.crop, estSeason);
        const confItems  = single.confidence.items.map(i => `- ${i}`).join('<br>');
        confDetailEl.innerHTML = seasonHtml + (confItems ? `<div class="conf-items">${confItems}</div>` : '');
      }
      // サマリーバー・作物バー更新
      const _scoreVal = scoreEntry?.score ?? (single?.scoreResult?.score ?? null);
      const modeLabels = { openField:'露地栽培', greenhouse:'ハウス栽培', heatedGreenhouse:'加温ハウス' };
      _adpUpdateSummaryBar({
        cropName: crop?.name ?? null,
        areaName: _adpArea?.name ?? null,
        score:    _scoreVal,
        mode:     modeLabels[ad?.cultivationMode] || '露地栽培',
      });
      
    }
  }
}

// ─── 作物詳細シート（下から出るポップアップ） ───
function _adpOpenCropDetailSheet(cropId) {
  const ad = currentAreaData;
  if (!ad) return;

  // scoreEntry取得
  const scoreEntry = (typeof _crScores !== 'undefined')
    ? _crScores.find(s => s.crop.id === cropId)
    : null;

  // cropオブジェクト取得
  let crop = scoreEntry?.crop ?? null;
  if (!crop && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
         : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  }
  if (!crop) return;

  // スコア根拠（details配列から各軸を抽出）
  const details = scoreEntry?.details ?? [];
  const detailRows = details.map(d => {
    if (!d.label && !d.key) return '';
    const label = d.label ?? d.key;
    const pts   = d.score != null ? `${d.score}点` : '';
    const note  = d.note  ? `<span class="cdp-detail-note">${escHtml(d.note)}</span>` : '';
    const bar   = d.score != null
      ? `<div class="cdp-detail-bar"><div class="cdp-detail-bar-fill" style="width:${Math.min(d.score,100)}%"></div></div>`
      : '';
    return `<div class="cdp-detail-row">`
      + `<span class="cdp-detail-label">${escHtml(label)}</span>`
      + `<span class="cdp-detail-pts">${pts}</span>`
      + `${bar}${note}`
      + `</div>`;
  }).join('');

  // 生育期間
  const gpMin = crop.conditions?.growthPeriodMin;
  const gpMax = crop.conditions?.growthPeriodMax;
  const gpHtml = (gpMin != null || gpMax != null)
    ? `<div class="cdp-section"><div class="cdp-section-title">🕐 生育期間</div>`
      + `<div class="cdp-gp">${gpMin ?? '?'}〜${gpMax ?? '?'}日</div></div>`
    : '';

  // 播種・収穫時期
  const decadeArr = ad.climate?.decadeArr;
  let estSeason = null;
  if (decadeArr && typeof Phenology !== 'undefined') {
    const wins = Phenology.sowingWindows(decadeArr, crop);
    if (wins?.length) estSeason = _buildEstimatedSeasonLabel(wins[0]);
  }
  const seasonHtml = _buildSeasonBlockHtml(crop, estSeason);

  // リスク一覧（crop.risksまたはbuildSingleCropAnalysis）
  let risksHtml = '';
  const single = (typeof buildSingleCropAnalysis === 'function')
    ? buildSingleCropAnalysis(cropId, ad) : null;
  const riskItems = crop.risks ?? single?.risks ?? [];
  if (riskItems.length) {
    risksHtml = `<div class="cdp-section"><div class="cdp-section-title">⚠️ リスク</div>`
      + riskItems.map(r => `<div class="cdp-risk-row">・${escHtml(typeof r === 'string' ? r : r.label ?? r.name ?? JSON.stringify(r))}</div>`).join('')
      + `</div>`;
  } else if (scoreEntry?.alert) {
    risksHtml = `<div class="cdp-section"><div class="cdp-section-title">⚠️ リスク</div>`
      + `<div class="cdp-risk-row">・${escHtml(scoreEntry.alert)}</div></div>`;
  }

  // 収益概算（profitability）
  let profitHtml = '';
  const prof = scoreEntry?.profitability ?? single?.profitability ?? null;
  if (prof) {
    const rows = [];
    if (prof.revenueMin != null && prof.revenueMax != null)
      rows.push(`売上：${_fmtMoney(prof.revenueMin)}〜${_fmtMoney(prof.revenueMax)}`);
    if (prof.costMin != null && prof.costMax != null)
      rows.push(`コスト：${_fmtMoney(prof.costMin)}〜${_fmtMoney(prof.costMax)}`);
    if (prof.profitMin != null && prof.profitMax != null)
      rows.push(`利益：${_fmtMoney(prof.profitMin)}〜${_fmtMoney(prof.profitMax)}`);
    if (rows.length) {
      profitHtml = `<div class="cdp-section"><div class="cdp-section-title">💴 収益概算（10a）</div>`
        + rows.map(r => `<div class="cdp-profit-row">${r}</div>`).join('')
        + `</div>`;
    }
  }

  // スコア表示クラス
  const score = scoreEntry?.score ?? null;
  const scoreCls = score == null ? '' : score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';
  const viableTag = scoreEntry
    ? (scoreEntry.viable
        ? '<span class="cdp-viable cdp-viable-ok">✓ 栽培可</span>'
        : '<span class="cdp-viable cdp-viable-ng">✗ 条件厳しい</span>')
    : '';

  // シート生成（既存を使いまわし）
  let sheet = document.getElementById('adp-crop-detail-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'adp-crop-detail-sheet';
    sheet.className = 'adp-crop-detail-sheet';
    document.body.appendChild(sheet);
    // 背景タップで閉じる
    sheet.addEventListener('click', e => {
      if (e.target === sheet) _adpCloseCropDetailSheet();
    });
  }

  sheet.innerHTML = `
    <div class="cdp-inner">
      <div class="cdp-handle"></div>
      <div class="cdp-header">
        <div class="cdp-crop-name">${escHtml(crop.name)}</div>
        <div class="cdp-header-right">
          ${score != null ? `<span class="cdp-score ${scoreCls}">${score}%</span>` : ''}
          ${viableTag}
        </div>
        <button class="cdp-close" onclick="_adpCloseCropDetailSheet()">✕</button>
      </div>
      <div class="cdp-body">
        ${detailRows ? `<div class="cdp-section"><div class="cdp-section-title">📊 スコア根拠</div>${detailRows}</div>` : ''}
        <div class="cdp-section"><div class="cdp-section-title">📅 播種・収穫時期</div>${seasonHtml}</div>
        ${gpHtml}
        ${risksHtml}
        ${profitHtml}
        <div class="cdp-select-wrap">
          <button class="cdp-select-btn" onclick="_adpSelectCropForAnalysis('${cropId}')">
            ✅ この作物で各タブを更新
          </button>
        </div>
      </div>
    </div>`;

  sheet.classList.add('open');
}

function _adpCloseCropDetailSheet() {
  const sheet = document.getElementById('adp-crop-detail-sheet');
  if (sheet) sheet.classList.remove('open');
}

// ─── 収益表示用フォーマット ───
function _fmtMoney(val) {
  if (val == null) return '—';
  return val >= 10000
    ? `${Math.round(val / 1000)}千円`
    : `${val}円`;
}

// ─── 「この作物で各タブを更新」→ 各ペインに反映 ───
function _adpSelectCropForAnalysis(cropId) {
  _adpCloseCropDetailSheet();
  _adpCloseRankingDialog();

  const ad = currentAreaData;
  console.log('[SELECT] cropId:', cropId, '_adpArea:', !!_adpArea, 'ad:', !!ad);
  if (!_adpArea || !ad) { console.warn('[SELECT] 早期return: _adpArea or ad がない'); return; }

  _adpSelectedCropId = cropId;

  const scoreEntry = (typeof _crScores !== 'undefined')
    ? _crScores.find(s => s.crop.id === _adpSelectedCropId)
    : null;
  console.log('[SELECT] _crScores.length:', _crScores?.length, 'scoreEntry:', !!scoreEntry);

  let crop = scoreEntry?.crop ?? null;
  if (!crop && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === _adpSelectedCropId)
         : Object.values(CROP_DB).flat().find(c => c.id === _adpSelectedCropId);
  }
  console.log('[SELECT] crop:', crop?.name ?? 'NOT FOUND');

  // _crScoresが未充填でもscoreEntryの代わりに使う。適合度ペインでも共用
  const single = (crop && typeof buildSingleCropAnalysis === 'function')
    ? buildSingleCropAnalysis(_adpSelectedCropId, ad)
    : null;
  console.log('[SELECT] single:', !!single, 'scoreVal:', single?.scoreResult?.score);

  // ── グラフ再描画 ──
  _adpRenderTempChart(_adpSelectedCropId);
  _adpRenderGrowthChart(_adpSelectedCropId);

  // 収益
  if (typeof renderProfitWaterfall === 'function') {
    if (scoreEntry) {
      renderProfitWaterfall(scoreEntry);
    } else if (single) {
      renderProfitWaterfall({ crop: single.crop, profitability: single.profitability });
    } else {
      renderProfitWaterfall(null);
    }
  }

  // 施肥・リスク・作業カレンダー
  if (crop) {
    if (typeof _renderFertResult  === 'function') _renderFertResult(crop);
    if (typeof _renderRiskResult  === 'function') _renderRiskResult(crop);
    if (typeof renderWorkCalendar === 'function') renderWorkCalendar(crop);
  }

  // 適合度ペイン
  {
    const confDetailEl = document.getElementById('conf-detail');
    if (confDetailEl && single) {
      const decadeArr = ad.climate?.decadeArr;
      let estSeason = null;
      if (decadeArr && typeof Phenology !== 'undefined') {
        const wins = Phenology.sowingWindows(decadeArr, single.crop);
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
  const modeLabels = { openField:'露地栽培', greenhouse:'ハウス栽培', heatedGreenhouse:'加温ハウス' };
  _adpUpdateSummaryBar({
    cropName: crop?.name ?? null,
    areaName: _adpArea?.name ?? null,
    score:    _scoreVal,
    mode:     modeLabels[ad.cultivationMode] || '露地栽培',
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

// ─── タブ連動ランキングダイアログ ───
function _adpOpenRankingByTab() {
  const pane = _adpCurrentSubTab === 'growth' ? 'growth' : 'ranking';
  _adpOpenRankingDialog(pane);
}

// ─── サマリーバー「作物を選ぶ」→ カテゴリ一覧シート ───
function adpOpenCropSelectFromSummary() {
  _adpOpenCropSelectSheet();
}

function _adpOpenCropSelectSheet() {
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

  const CATEGORIES = [
    { key: 'all',     label: 'すべて' },
    { key: 'grain',   label: '穀物・豆類' },
    { key: 'vegetable', label: '野菜' },
    { key: 'fruit',   label: '果物' },
    { key: 'wild',    label: '山菜・草' },
    { key: 'forest',  label: '林産' },
    { key: 'oil',     label: '油脂' },
    { key: 'fiber',   label: '繊維' },
  ];

  // カテゴリ→DB key マッピング（analysis.jsのCR_MAJOR_TO_CATEGORIESと揃える）
  const CAT_MAP = {
    grain:     ['grain','legume'],
    vegetable: ['leafy','fruit_veg','root','vegetable'],
    fruit:     ['fruit'],
    wild:      ['wildveg','herb'],
    forest:    ['forest'],
    oil:       ['oil'],
    fiber:     ['fiber'],
  };

  let _selectedCat = 'all';

  function buildList(cat) {
    const list = cat === 'all'
      ? allCrops
      : allCrops.filter(c => (CAT_MAP[cat] || [cat]).includes(c.category));

    if (!list.length) return '<div class="css-empty">該当作物なし</div>';
    return list.map(c => `
      <div class="css-crop-item" onclick="_adpSelectCropFromSheet('${c.id}')">
        <span class="css-crop-name">${escHtml(c.name)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`).join('');
  }

  // シート生成
  let sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'adp-crop-select-sheet';
    sheet.className = 'adp-crop-detail-sheet'; // 同じオーバーレイスタイル流用
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => {
      if (e.target === sheet) _adpCloseCropSelectSheet();
    });
  }

  const catTabsHtml = CATEGORIES.map(c =>
    `<button class="css-cat-btn${c.key === _selectedCat ? ' active' : ''}"
      data-cat="${c.key}"
      onclick="_adpCropSelectSwitchCat('${c.key}')">${c.label}</button>`
  ).join('');

  sheet.innerHTML = `
    <div class="cdp-inner">
      <div class="cdp-handle"></div>
      <div class="cdp-header">
        <div class="cdp-crop-name">🌱 作物を選ぶ</div>
        <button class="cdp-close" onclick="_adpCloseCropSelectSheet()">✕</button>
      </div>
      <div class="css-cat-tabs" id="css-cat-tabs">${catTabsHtml}</div>
      <div class="css-list" id="css-list">${buildList('all')}</div>
    </div>`;

  sheet.classList.add('open');

  // グローバルにbuildListを保持（タブ切り替えで使用）
  sheet._buildList = buildList;
}

function _adpCropSelectSwitchCat(cat) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;
  // タブactive切り替え
  sheet.querySelectorAll('.css-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
  const listEl = document.getElementById('css-list');
  if (listEl && sheet._buildList) listEl.innerHTML = sheet._buildList(cat);
}

function _adpCloseCropSelectSheet() {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (sheet) sheet.classList.remove('open');
}

function _adpSelectCropFromSheet(cropId) {
  _adpCloseCropSelectSheet();
  _adpSelectCropForAnalysis(cropId);
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
  { key: 'equipment', label: '設備', icon: '🏗️', options: [
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
  { key: 'compare',  label: '比較',           icon: '⚖️' },
];

const AW_STEP_TITLES = ['営農条件入力'];

// ─── ウィザード状態 ───
let _awStep           = 0;        // 現在ステップ (0のみ)
let _awArea           = null;     // 選択中エリアデータ
let _awFarmCond       = null;     // 営農条件（6項目）
let _awAnalysisItems  = new Set(['ranking','growth','profit','fert','risk','calendar','match']); // 分析項目
let _awAllScores      = [];       // buildAnalysisResult().cropScores のキャッシュ

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

// ─── ウィザードパネル初期化（adp-wizard-panel内・トグルで開閉） ───
function _awInitPanel(area) {
  _awArea            = area;
  _awStep            = 0;
  _awFarmCond        = _awDefaultFarmCond();
  _awAnalysisItems   = new Set(['ranking','growth','profit','fert','risk','calendar','match']);
  _awAllScores       = [];

  _awRenderStep(0);
  _awRunAnalysis(); // 初期状態（デフォルト条件）でサマリーバー・各ペインを即時更新
}

// ─── パネルを閉じる ───
function closeAnalysisWizard() {
  const panel = document.getElementById('adp-wizard-panel');
  if (panel) panel.setAttribute('hidden', '');
}

// ─── ステップ描画ディスパッチャ ───
function _awRenderStep(step) {
  _awStep = step;
  _awUpdateProgress(step);
  _awRenderConditions();
}

// ─── プログレスバー更新 ───
function _awUpdateProgress(step) {
  const dot = document.getElementById('awdot-0');
  if (dot) {
    dot.classList.remove('active', 'done');
    dot.classList.add('active');
  }
  const el = document.getElementById('aw-step-title');
  if (el) el.textContent = AW_STEP_TITLES[0];
}

// ═══════════════════════════════════════════
//  Step 1: 営農条件入力
// ═══════════════════════════════════════════
function _awRenderConditions() {
  const body = document.getElementById('aw-body');
  body.innerHTML = `
    <div class="aw-live-preview" id="aw-live-preview"></div>
    <div class="aw-cond-groups">
      ${FARM_COND_GROUPS.map(g => `
        <div class="aw-cond-group">
          <div class="aw-cond-label">${g.icon} ${g.label}</div>
          <div class="aw-cond-row">
            ${g.options.map(o => `
              <button class="aw-cond-chip ${_awFarmCond[g.key] === o.value ? 'selected' : ''}"
                onclick="_awSetCondition('${g.key}','${o.value}')">
                <span class="aw-cond-chip-icon">${o.icon}</span>
                <span class="aw-cond-chip-label">${o.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  _awUpdateLivePreview();
  _awRenderFooter({
    back: false,
    next: true, nextLabel: '分析実行', nextClass: 'aw-btn-run',
    onNext: _awExecute,
  });
}

function _awSetCondition(key, value) {
  if (_awFarmCond[key] === value) return;
  _awFarmCond[key] = value;
  _awRunAnalysis();      // 裏の分析タブをリアルタイム更新
  _awRenderConditions(); // チップの選択状態を再描画
}

// ═══════════════════════════════════════════
//  リアルタイム分析エンジン連携
function _awRenderFooter({ back, onBack, next, nextLabel, nextClass = '', onNext }) {
  const footer = document.getElementById('aw-footer');
  footer.innerHTML = `
    ${back ? `<button class="aw-btn aw-btn-back" id="aw-btn-back">← 戻る</button>` : '<div></div>'}
    <button class="aw-btn aw-btn-next ${nextClass}" id="aw-btn-next" ${!next ? 'disabled' : ''}>
      ${nextLabel}
    </button>
  `;
  if (back && onBack) {
    const backEl = document.getElementById('aw-btn-back');
    if (backEl) backEl.addEventListener('click', onBack);
  }
  const nextEl = document.getElementById('aw-btn-next');
  if (nextEl && onNext) nextEl.addEventListener('click', onNext);
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

  // 設備条件 → 栽培方式（ハウスありならhouse補正、それ以外は露地として計算）
  const cultivationMode = _awFarmCond.equipment === 'greenhouse' ? 'greenhouse' : 'openField';

  let ad;
  if (typeof normalizeAreaData === 'function') {
    ad = normalizeAreaData(area, {
      selectedCropId:    _adpSelectedCropId || null,
      cultivationMode,
      analysisItems:     Array.from(_awAnalysisItems),
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
      analysisItems:   Array.from(_awAnalysisItems),
      landProfile:     Object.keys(lp).length ? lp : null,
      env:             {},
    };
  }

  // 営農条件・栽培方式を確実に反映
  ad.farmingConditions = { ..._awFarmCond };
  ad.cultivationMode   = cultivationMode;

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

  // 比較タブは常に非表示（比較機能廃止）
  const compareTab = document.querySelector('.adp-subtab-compare');
  if (compareTab) compareTab.style.display = 'none';

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
  const modeLabels = { openField: '露地栽培', greenhouse: 'ハウス栽培', heatedGreenhouse: '加温ハウス' };
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
    });
  }
}

// ─── 分析実行（Step3「分析実行」ボタン） ───
function _awExecute() {
  if (!_awArea) return;

  _awRunAnalysis();
  closeAnalysisWizard();

  const area = _awArea;

  // ─ 地図にポリゴンを表示 ─
  if (area.geojson && typeof drawnItems !== 'undefined' && typeof map !== 'undefined') {
    try {
      drawnItems.clearLayers();
      // geojsonはFirestoreではJSON文字列で保存されているためパースが必要
      const geojsonData = typeof area.geojson === 'string'
        ? JSON.parse(area.geojson) : area.geojson;
      const drawColor = (typeof CONFIG !== 'undefined' && CONFIG.DRAW_COLOR)
        ? CONFIG.DRAW_COLOR : '#4ade80';
      const layer = L.geoJSON(geojsonData, {
        style: { color: drawColor, weight: 2, fillOpacity: 0.2 },
      });
      layer.addTo(drawnItems);
      map.fitBounds(layer.getBounds());
    } catch(e) {
      console.warn('[_awExecute] geojson parse error:', e);
    }
  }

  // ─ Step3で選択した項目のうち先頭のサブタブへ切替 ─
  const focusKey = AW_ITEM_DEFS.find(i => _awAnalysisItems.has(i.key))?.key || 'ranking';
  _adpSwitchSubTab(focusKey);
}