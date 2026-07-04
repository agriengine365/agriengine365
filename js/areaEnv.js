// ═══════════════════════════════════════════
//  AREA ENV — 環境情報スキーマ・計算・保存・編集ダイアログ
//  担当: env フィールドの全ライフサイクル
// ═══════════════════════════════════════════

// ─── ENV スキーマ（全フィールド定義・デフォルトnull） ───
// このオブジェクトがエリアの env フィールドの「型定義」を兼ねる。
// 新フィールドを追加する場合はここにのみ追記すればよい。
const ENV_SCHEMA = {
  // 【気象】AMeDAS or 手入力
  source:          null,   // 'ameidas' | 'table' | 'manual'
  stationNo:       null,
  stationName:     null,
  distKm:          null,
  tempMean:        null,   // 年均気温(°C)
  tempMaxMean:     null,   // 年均最高気温
  tempMinMean:     null,   // 年均最低気温
  tempMinJan:      null,   // 1月最低気温
  tempMax8:        null,   // 8月最高気温平均
  rain:            null,   // 年降水量(mm)
  sunshineHours:   null,   // 年日照時間(h)
  daysBelow0:      null,   // 氷点下日数
  frostFreeDays:   null,   // 無霜期間(日) ← 自動計算可
  rainDays50:      null,   // 大雨日数
  snowDays:        null,   // 積雪日数
  maxSnowDepth:    null,   // 最大積雪深(cm)
  windSpeedMean:   null,   // 平均風速(m/s)
  strongWindDays:  null,   // 強風日数
  gdd:             null,   // 有効積算温度(GDD) ← 自動計算可
  coldLakeRisk:    null,   // 冷気湖リスク: 'low'|'medium'|'high'

  // 【地形】
  slope:           null,   // 傾斜(°)
  aspect:          null,   // 斜面向き: 'N'|'NE'|'E'|'SE'|'S'|'SW'|'W'|'NW'|'flat'
  shadingRisk:     null,   // 遮蔽リスク: 'low'|'medium'|'high'

  // 【土壌】
  soilType:        null,   // 'sandy'|'loam'|'clay'|'peat'|'volcanic'|'unknown'
  ph:              null,   // pH(0〜14)
  organicMatter:   null,   // 有機物: 'high'|'medium'|'low'
  waterRetention:  null,   // 保水性: 'high'|'medium'|'low'
  salinityRisk:    null,   // 塩類リスク: 'low'|'medium'|'high'
  croppingHistory: null,   // 作付け履歴(自由記述)

  // 【水利】
  irrigationSource:  null, // 'well'|'river'|'pond'|'none'
  irrigationDistM:   null, // 灌漑距離(m)
  drainageFacility:  null, // 'good'|'moderate'|'poor'
  groundwaterLevel:  null, // 'deep'|'medium'|'shallow'

  // 【営農条件】
  fieldShapeScore:     null, // 'regular'|'irregular'
  roadWidthM:          null, // 農道幅(m)
  hasPower:            null, // true|false
  distToCollectionKm:  null, // 集荷場距離(km)

  // 【地域環境】
  agriculturalZone:    null, // true|false|'unknown'
  wildlifeRisk:        null, // 'low'|'medium'|'high'
  surroundingLandUse:  null, // 'farmland'|'forest'|'residential'|'mixed'

  // 【配列データ（JSON文字列でFirestore保存）】
  monthlyJson: null,  // 月別12件: [{month,tempMax,tempMin,tempMean,rain,sunshine},...]
  decadeJson:  null,  // 旬別36件: [{decade,tempMean,rain,sunshine},...]
};

// ─── ENV を空スキーマで生成 ───
function createEmptyEnv() {
  return { ...ENV_SCHEMA };
}

// ─── 編集ダイアログで実際に入力可能な32項目（未入力件数バッジ用） ───
// _envWeatherHtml/_envTerrainHtml/_envWaterHtml/_envFarmingHtml/_envRegionHtml
// の data-env-key と完全一致させること。新フィールドをダイアログに追加した
// 場合はここにも追記する。stationNo/stationName/distKm（読み取り専用表示）と
// monthlyJson/decadeJson（配列データ）はユーザー入力項目ではないため含めない。
const ENV_EDITABLE_KEYS = [
  // 🌡️ 気象（12）
  'tempMean', 'tempMinJan', 'tempMax8', 'rain', 'sunshineHours',
  'frostFreeDays', 'gdd', 'daysBelow0', 'maxSnowDepth', 'windSpeedMean',
  'strongWindDays', 'coldLakeRisk',
  // 🏔️ 地形・土壌（9）
  'slope', 'aspect', 'shadingRisk', 'soilType', 'ph',
  'organicMatter', 'waterRetention', 'salinityRisk', 'croppingHistory',
  // 💧 水利（4）
  'irrigationSource', 'irrigationDistM', 'drainageFacility', 'groundwaterLevel',
  // 🚜 営農条件（4）
  'fieldShapeScore', 'roadWidthM', 'hasPower', 'distToCollectionKm',
  // 🏘️ 地域環境（3）
  'agriculturalZone', 'wildlifeRisk', 'surroundingLandUse',
];

// ─── 未入力（null/空文字）件数をカウント ───
function countMissingEnvFields(env) {
  if (!env) return ENV_EDITABLE_KEYS.length;
  return ENV_EDITABLE_KEYS.reduce((n, key) => {
    const v = env[key];
    return n + (v == null || v === '' ? 1 : 0);
  }, 0);
}

// ─── AMeDASデータ → env オブジェクト生成 ───
// AmedasLoader.getClimateAt() の返却値を env に変換する
function buildEnvFromClimate(climateData, existingEnv = {}) {
  if (!climateData) return createEmptyEnv();

  const env = { ...createEmptyEnv(), ...existingEnv };

  // スカラー値のマッピング
  const MAP = {
    source:         'source',
    stationNo:      'stationNo',
    stationName:    'stationName',
    distKm:         'distKm',
    tempMean:       'tempMean',
    tempMaxMean:    'tempMaxMean',
    tempMinMean:    'tempMinMean',
    tempMinJan:     'tempMinJan',
    rain:           'rain',
    sunshineHours:  'sunshineHours',
    daysBelow0:     'daysBelow0',
    rainDays50:     'rainDays50',
    snowDays:       'snowDays',
  };

  for (const [src, dst] of Object.entries(MAP)) {
    if (climateData[src] != null) env[dst] = climateData[src];
  }

  // 月別・旬別配列 → JSON文字列化
  if (Array.isArray(climateData.monthly) && climateData.monthly.length > 0) {
    env.monthlyJson = JSON.stringify(climateData.monthly);
  }
  // NOTE: decadeArrは { tMax[36], tMin[36], tMean[36], sun[36], rain[36], keys[36] } という
  // 「配列を値に持つオブジェクト」であり、それ自体は配列ではない。
  // 以前は Array.isArray(climateData.decadeArr) で判定していたため常にfalseとなり、
  // decadeJsonが一度も保存されないバグになっていた。
  if (climateData.decadeArr && Array.isArray(climateData.decadeArr.tMean) && climateData.decadeArr.tMean.length > 0) {
    env.decadeJson = JSON.stringify(climateData.decadeArr);
  }

  // 自動計算
  // NOTE: AmedasLoader.getClimateAt() は climateData.monthly を返さない
  //（返却されるのは decadeArr＝旬36点データのみ）ため、climateData.monthly は常に undefined。
  // 以前はここで monthly.length が常に0になり、GDD・無霜期間・8月最高気温が
  // 一度も計算されないバグになっていた。decadeArr から月別平均を組み立てて代用する。
  const monthly = (Array.isArray(climateData.monthly) && climateData.monthly.length > 0)
    ? climateData.monthly
    : (climateData.decadeArr
        ? _buildMonthlyFromDecadeArr(climateData.decadeArr)
        : parseEnvArrays(env).monthly);

  // decadeArrから組み立てた月別配列も、次回参照用にmonthlyJsonへ保存しておく
  // （climateData.monthly由来の場合は既に上で保存済みのため、ここでは二重保存を避ける）
  if (!(Array.isArray(climateData.monthly) && climateData.monthly.length > 0) && monthly.length > 0) {
    env.monthlyJson = JSON.stringify(monthly);
  }

  if (monthly.length > 0) {
    env.gdd          = calcGDD(monthly);
    env.frostFreeDays = calcFrostFreeDays(monthly);
    const aug = monthly.find(m => m.month === 8);
    if (aug && aug.tempMax != null) env.tempMax8 = aug.tempMax;
  }

  return env;
}

// ─── decadeArr（旬36点：tMax[36]/tMin[36]/tMean[36]）→ 月別配列12件へ変換 ───
// AmedasLoader.buildDecadeArr()と同じ並び（各月 early/mid/late の3旬）を前提に、
// 3旬の単純平均（欠測=nullは除外）で月平均を出す。
// calcGDD/calcFrostFreeDaysは配列インデックス基準（0=1月）で日数を加算するため、
// 1月始まり12件・欠月なしの配列で返す（値が取れない月はtempMax/tempMin/tempMean=null）。
function _buildMonthlyFromDecadeArr(decadeArr) {
  if (!decadeArr || !Array.isArray(decadeArr.tMean)) return [];

  function avg3(arr, monthIndex) {
    if (!Array.isArray(arr)) return null;
    const vals = [arr[monthIndex * 3], arr[monthIndex * 3 + 1], arr[monthIndex * 3 + 2]]
      .filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const monthly = [];
  for (let mi = 0; mi < 12; mi++) {
    monthly.push({
      month:    mi + 1,
      tempMax:  avg3(decadeArr.tMax,  mi),
      tempMin:  avg3(decadeArr.tMin,  mi),
      tempMean: avg3(decadeArr.tMean, mi),
    });
  }
  return monthly;
}

// ─── 配列フィールドをパース（参照時に使う） ───
function parseEnvArrays(env) {
  if (!env) return { monthly: [], decade: [] };
  let monthly = [];
  let decade  = [];
  try { if (env.monthlyJson) monthly = JSON.parse(env.monthlyJson); } catch(e) {}
  try { if (env.decadeJson)  decade  = JSON.parse(env.decadeJson);  } catch(e) {}
  return { monthly, decade };
}

// ─── GDD（有効積算温度）計算 ───
// 基準温度 5°C、月別データから日数加重で計算
function calcGDD(monthly, baseTemp = 5) {
  if (!Array.isArray(monthly) || monthly.length === 0) return null;
  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
  let gdd = 0;
  for (let i = 0; i < monthly.length && i < 12; i++) {
    const m = monthly[i];
    const t = m.tempMean ?? ((m.tempMax + m.tempMin) / 2);
    const effective = Math.max(0, t - baseTemp);
    gdd += effective * (daysInMonth[i] || 30);
  }
  return Math.round(gdd);
}

// ─── 無霜期間（日数）計算 ───
// 月平均最低気温が 0°C 以上の月の日数合計
function calcFrostFreeDays(monthly) {
  if (!Array.isArray(monthly) || monthly.length === 0) return null;
  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
  let days = 0;
  for (let i = 0; i < monthly.length && i < 12; i++) {
    const m = monthly[i];
    const tMin = m.tempMin ?? m.tempMean ?? null;
    if (tMin !== null && tMin >= 0) {
      days += daysInMonth[i] || 30;
    }
  }
  return days;
}

// ─── normalizeAreaData: area オブジェクト → currentAreaData 用に正規化 ───
// 既存フィールド（lat/lng/elev/climate等）は現状維持し、
// env を独立キーとして追加する。
function normalizeAreaData(area, options = {}) {
  const lp   = area.landProfile || {};
  const meta = area.meta        || {};
  const env  = area.env         || {};

  function _pick(...vals) {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  const lat = _pick(lp.lat, meta.lat, area.lat);

  // ─ 既存フィールド（エンジン・analysis.js が参照する共通キー） ─
  const base = {
    lat,
    lng:             _pick(lp.lng,       meta.lng,      area.lng),
    elev:            _pick(lp.elevation, meta.elev,     area.elev),
    climate:         (typeof getClimate === 'function' && lat != null)
                       ? getClimate(lat) : null,
    soilType:        _pick(env.soilType, lp.soilType, meta.soilType, area.soilType) || 'unknown',
    ph:              _pick(env.ph,       lp.ph,       meta.ph,       area.ph),
    slope:           _pick(env.slope,    lp.slope,    meta.slope,    area.slope) ?? 0,
    areaSqm:         _pick(meta.areaSqm, area.areaSqm)  || 0,
    areaHa:          _pick(meta.areaHa,  area.areaHa)   || 0,
    landProfile:     Object.keys(lp).length ? lp : null,
    // ウィザードから渡される場合に上書き
    selectedCropId:  options.selectedCropId  || null,
    cultivationMode: options.cultivationMode || 'openField',
    analysisItems:   options.analysisItems   || [],
  };

  // ─ env キー（新規追加・null含む全フィールド + パース済み配列） ─
  const { monthly, decade } = parseEnvArrays(env);
  base.env = {
    ...createEmptyEnv(),
    ...env,
    monthly,  // パース済み配列（monthlyJson の展開）
    decade,   // パース済み配列（decadeJson の展開）
  };

  // ─ AMeDAS旬別データを climate.decadeArr に引き継ぐ（既存グラフ互換） ─
  if (base.climate && decade.length > 0) {
    base.climate = { ...base.climate, decadeArr: decade };
  }

  return base;
}

// ─── env を Firestore/LS に保存 ───
async function saveEnv(areaId, envData) {
  // monthlyJson / decadeJson は文字列のみ保存（配列はFirestore非対応）
  const payload = { ...envData };
  delete payload.monthly;
  delete payload.decade;

  try {
    if (typeof db !== 'undefined' && db && !areaId.startsWith('local_')) {
      await db.collection('areas').doc(areaId).update({ env: payload });
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === areaId);
      if (idx !== -1) {
        stored[idx].env = payload;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
    return true;
  } catch(e) {
    console.error('[saveEnv]', e);
    return false;
  }
}

// ─── 既存エリアの AMeDAS 再取得・env 更新 ───
async function refreshEnv(area) {
  const lat = area.landProfile?.lat ?? area.meta?.lat ?? null;
  const lng = area.landProfile?.lng ?? area.meta?.lng ?? null;
  if (lat === null || lng === null) {
    showToast('座標情報がありません', 'amber');
    return null;
  }
  if (typeof AmedasLoader === 'undefined') {
    showToast('AMeDASローダーが見つかりません', 'amber');
    return null;
  }
  try {
    showToast('AMeDASデータを取得中...', '', 5000);
    const climateData = await AmedasLoader.getClimateAt(lat, lng);
    const existingEnv = area.env || {};
    const newEnv = buildEnvFromClimate(climateData, existingEnv);
    const ok = await saveEnv(area.id, newEnv);
    if (ok) {
      showToast(`${newEnv.stationName || ''}のデータを更新しました ✓`, 'green');
    }
    return newEnv;
  } catch(e) {
    console.error('[refreshEnv]', e);
    showToast('AMeDAS取得に失敗しました', 'amber');
    return null;
  }
}

// ═══════════════════════════════════════════
//  ENV EDIT DIALOG — 環境情報手入力ダイアログ
// ═══════════════════════════════════════════

let _envEditAreaId  = null;
let _envEditData    = null;  // 編集中の env の作業コピー

// ─── ダイアログを開く ───
function openEnvEditDialog(area) {
  _envEditAreaId = area.id;
  _envEditData   = { ...createEmptyEnv(), ...(area.env || {}) };

  _envEnsureDialog();

  // タブを最初のタブにリセット
  _envSwitchTab('weather');

  document.getElementById('env-edit-overlay').classList.add('open');
}

// ─── ダイアログを閉じる ───
function closeEnvEditDialog() {
  const overlay = document.getElementById('env-edit-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ─── ダイアログを初回だけ生成 ───
function _envEnsureDialog() {
  if (document.getElementById('env-edit-overlay')) {
    _envFillForm(); // 既存ならデータだけ更新
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'env-edit-overlay';
  overlay.className = 'env-edit-overlay';
  overlay.innerHTML = `
    <div class="env-edit-dialog">
      <div class="env-edit-header">
        <span class="env-edit-title">🌍 環境情報を編集</span>
        <button class="env-edit-close" onclick="closeEnvEditDialog()">✕</button>
      </div>

      <!-- タブ -->
      <div class="env-edit-tabs">
        <button class="env-tab active" data-tab="weather"  onclick="_envSwitchTab('weather')">🌡️ 気象</button>
        <button class="env-tab"        data-tab="terrain"  onclick="_envSwitchTab('terrain')">🏔️ 地形・土壌</button>
        <button class="env-tab"        data-tab="water"    onclick="_envSwitchTab('water')">💧 水利</button>
        <button class="env-tab"        data-tab="farming"  onclick="_envSwitchTab('farming')">🚜 営農</button>
        <button class="env-tab"        data-tab="region"   onclick="_envSwitchTab('region')">🏘️ 地域</button>
      </div>

      <!-- コンテンツ -->
      <div class="env-edit-body" id="env-edit-body"></div>

      <!-- フッター -->
      <div class="env-edit-footer">
        <button class="env-btn env-btn-refresh" onclick="_envRefreshAmeidas()">
          🔄 AMeDAS再取得
        </button>
        <div class="env-footer-right">
          <button class="env-btn env-btn-cancel" onclick="closeEnvEditDialog()">キャンセル</button>
          <button class="env-btn env-btn-save"   onclick="_envCommitSave()">保存</button>
        </div>
      </div>
    </div>
  `;

  // オーバーレイ外クリックで閉じる
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeEnvEditDialog();
  });

  document.body.appendChild(overlay);
  _envFillForm();
}

// ─── タブ切替 ───
function _envSwitchTab(tab) {
  document.querySelectorAll('.env-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const body = document.getElementById('env-edit-body');
  if (!body) return;

  switch (tab) {
    case 'weather': body.innerHTML = _envWeatherHtml(); break;
    case 'terrain': body.innerHTML = _envTerrainHtml(); break;
    case 'water':   body.innerHTML = _envWaterHtml();   break;
    case 'farming': body.innerHTML = _envFarmingHtml(); break;
    case 'region':  body.innerHTML = _envRegionHtml();  break;
  }
  _envBindInputs();
}

// ─── フォーム全体再充填（タブ切替時にデータを引き継ぐため入力値を保存） ───
function _envFillForm() {
  _envSwitchTab('weather');
}

// ─── 現在タブの入力値を _envEditData に保存 ───
function _envCollectCurrentTab() {
  const body = document.getElementById('env-edit-body');
  if (!body) return;
  body.querySelectorAll('[data-env-key]').forEach(el => {
    const key = el.dataset.envKey;
    const raw = el.type === 'checkbox' ? el.checked : el.value;
    if (raw === '' || raw === null || raw === undefined) {
      _envEditData[key] = null;
    } else if (el.type === 'number') {
      const n = parseFloat(raw);
      _envEditData[key] = isNaN(n) ? null : n;
    } else if (el.dataset.type === 'bool') {
      _envEditData[key] = raw === 'true' ? true : raw === 'false' ? false : null;
    } else {
      _envEditData[key] = raw || null;
    }
  });
}

// ─── input/select に change リスナーをバインド ───
function _envBindInputs() {
  const body = document.getElementById('env-edit-body');
  if (!body) return;
  body.querySelectorAll('[data-env-key]').forEach(el => {
    el.addEventListener('change', () => _envCollectCurrentTab());
    el.addEventListener('input',  () => _envCollectCurrentTab());
  });
}

// ─── 数値 input ヘルパー ───
function _envNumInput(key, label, unit = '', step = '0.1', min = null, max = null) {
  const val = _envEditData[key] != null ? _envEditData[key] : '';
  const minAttr = min != null ? `min="${min}"` : '';
  const maxAttr = max != null ? `max="${max}"` : '';
  return `
    <div class="env-field">
      <label class="env-label">${label}${unit ? `<span class="env-unit">${unit}</span>` : ''}</label>
      <input type="number" class="env-input" data-env-key="${key}"
        value="${val}" step="${step}" ${minAttr} ${maxAttr} placeholder="未入力">
    </div>`;
}

// ─── select ヘルパー ───
function _envSelect(key, label, options) {
  const val = _envEditData[key] != null ? _envEditData[key] : '';
  const opts = [{ value: '', label: '未設定' }, ...options];
  return `
    <div class="env-field">
      <label class="env-label">${label}</label>
      <select class="env-select" data-env-key="${key}">
        ${opts.map(o => `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>`;
}

// ─── text input ヘルパー ───
function _envTextInput(key, label, placeholder = '') {
  const val = _envEditData[key] != null ? _envEditData[key] : '';
  return `
    <div class="env-field env-field-full">
      <label class="env-label">${label}</label>
      <input type="text" class="env-input" data-env-key="${key}"
        value="${escHtml(String(val))}" placeholder="${placeholder}">
    </div>`;
}

// ─── 気象タブ HTML ───
function _envWeatherHtml() {
  return `
    <div class="env-section-title">📡 気象観測局</div>
    <div class="env-field-readonly">
      観測局: ${_envEditData.stationName || '未取得'}
      ${_envEditData.distKm != null ? `（${_envEditData.distKm.toFixed(1)}km）` : ''}
    </div>
    <div class="env-grid">
      ${_envNumInput('tempMean',      '年均気温',       '°C')}
      ${_envNumInput('tempMinJan',    '1月最低気温',    '°C')}
      ${_envNumInput('tempMax8',      '8月最高気温',    '°C')}
      ${_envNumInput('rain',          '年降水量',       'mm', '1')}
      ${_envNumInput('sunshineHours', '年日照時間',     'h',  '1')}
      ${_envNumInput('frostFreeDays', '無霜期間',       '日', '1', 0, 365)}
      ${_envNumInput('gdd',           '有効積算温度',   'GDD','1', 0)}
      ${_envNumInput('daysBelow0',    '氷点下日数',     '日', '1', 0, 365)}
      ${_envNumInput('maxSnowDepth',  '最大積雪深',     'cm', '1', 0)}
      ${_envNumInput('windSpeedMean', '平均風速',       'm/s')}
      ${_envNumInput('strongWindDays','強風日数',       '日', '1', 0)}
      ${_envSelect('coldLakeRisk', '冷気湖リスク', [
          { value: 'low',    label: '低' },
          { value: 'medium', label: '中' },
          { value: 'high',   label: '高' },
        ])}
    </div>`;
}

// ─── 地形・土壌タブ HTML ───
function _envTerrainHtml() {
  return `
    <div class="env-section-title">🏔️ 地形</div>
    <div class="env-grid">
      ${_envNumInput('slope', '傾斜', '°', '0.5', 0, 90)}
      ${_envSelect('aspect', '斜面向き', [
          { value: 'flat', label: '平坦' },
          { value: 'N',  label: '北' }, { value: 'NE', label: '北東' },
          { value: 'E',  label: '東' }, { value: 'SE', label: '南東' },
          { value: 'S',  label: '南' }, { value: 'SW', label: '南西' },
          { value: 'W',  label: '西' }, { value: 'NW', label: '北西' },
        ])}
      ${_envSelect('shadingRisk', '遮蔽リスク', [
          { value: 'low', label: '低（遮蔽なし）' },
          { value: 'medium', label: '中（一部遮蔽）' },
          { value: 'high',   label: '高（遮蔽大）' },
        ])}
    </div>
    <div class="env-section-title">🌱 土壌</div>
    <div class="env-grid">
      ${_envSelect('soilType', '土壌タイプ', [
          { value: 'sandy',    label: '砂質土' },
          { value: 'loam',     label: '壌土' },
          { value: 'clay',     label: '粘土質' },
          { value: 'peat',     label: '泥炭土' },
          { value: 'volcanic', label: '火山灰土' },
          { value: 'unknown',  label: '不明' },
        ])}
      ${_envNumInput('ph', 'pH', '', '0.1', 0, 14)}
      ${_envSelect('organicMatter', '有機物含量', [
          { value: 'high',   label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low',    label: '低' },
        ])}
      ${_envSelect('waterRetention', '保水性', [
          { value: 'high',   label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low',    label: '低' },
        ])}
      ${_envSelect('salinityRisk', '塩類集積リスク', [
          { value: 'low',    label: '低' },
          { value: 'medium', label: '中' },
          { value: 'high',   label: '高' },
        ])}
    </div>
    ${_envTextInput('croppingHistory', '作付け履歴', '例: 水稲→大豆→小麦')}`;
}

// ─── 水利タブ HTML ───
function _envWaterHtml() {
  return `
    <div class="env-section-title">💧 水利</div>
    <div class="env-grid">
      ${_envSelect('irrigationSource', '灌漑水源', [
          { value: 'well',  label: '井戸' },
          { value: 'river', label: '河川' },
          { value: 'pond',  label: '溜池' },
          { value: 'none',  label: 'なし' },
        ])}
      ${_envNumInput('irrigationDistM', '灌漑距離', 'm', '1', 0)}
      ${_envSelect('drainageFacility', '排水設備', [
          { value: 'good',     label: '良好' },
          { value: 'moderate', label: '普通' },
          { value: 'poor',     label: '不良' },
        ])}
      ${_envSelect('groundwaterLevel', '地下水位', [
          { value: 'deep',    label: '深い' },
          { value: 'medium',  label: '中程度' },
          { value: 'shallow', label: '浅い（湿害リスク）' },
        ])}
    </div>`;
}

// ─── 営農条件タブ HTML ───
function _envFarmingHtml() {
  return `
    <div class="env-section-title">🚜 営農条件</div>
    <div class="env-grid">
      ${_envSelect('fieldShapeScore', '圃場形状', [
          { value: 'regular',   label: '整形（機械作業しやすい）' },
          { value: 'irregular', label: '不整形（作業効率低下）' },
        ])}
      ${_envNumInput('roadWidthM', '農道幅', 'm', '0.5', 0)}
      ${_envSelect('hasPower', '電源', [
          { value: 'true',  label: 'あり' },
          { value: 'false', label: 'なし' },
        ])}
      ${_envNumInput('distToCollectionKm', '最寄り集荷場', 'km', '0.1', 0)}
    </div>`;
}

// ─── 地域環境タブ HTML ───
function _envRegionHtml() {
  return `
    <div class="env-section-title">🏘️ 地域環境</div>
    <div class="env-grid">
      ${_envSelect('agriculturalZone', '農業振興地域指定', [
          { value: 'true',    label: 'あり（農振農用地）' },
          { value: 'false',   label: 'なし' },
          { value: 'unknown', label: '不明' },
        ])}
      ${_envSelect('wildlifeRisk', '獣害リスク', [
          { value: 'low',    label: '低' },
          { value: 'medium', label: '中' },
          { value: 'high',   label: '高' },
        ])}
      ${_envSelect('surroundingLandUse', '周辺土地利用', [
          { value: 'farmland',    label: '農地' },
          { value: 'forest',      label: '山林' },
          { value: 'residential', label: '住宅地' },
          { value: 'mixed',       label: '混在' },
        ])}
    </div>`;
}

// ─── AMeDAS 再取得ボタン ───
async function _envRefreshAmeidas() {
  const stored = _getAreaById(_envEditAreaId);
  if (!stored) return;
  const newEnv = await refreshEnv(stored);
  if (newEnv) {
    _envEditData = { ...newEnv };
    _envFillForm();
  }
}

// ─── 保存確定 ───
async function _envCommitSave() {
  _envCollectCurrentTab();

  // GDD・無霜期間が空で monthlyJson があれば自動計算
  const { monthly } = parseEnvArrays(_envEditData);
  if (monthly.length > 0) {
    if (_envEditData.gdd == null)          _envEditData.gdd          = calcGDD(monthly);
    if (_envEditData.frostFreeDays == null) _envEditData.frostFreeDays = calcFrostFreeDays(monthly);
  }

  const btn = document.querySelector('.env-btn-save');
  if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }

  const ok = await saveEnv(_envEditAreaId, _envEditData);

  if (btn) { btn.disabled = false; btn.textContent = '保存'; }

  if (ok) {
    closeEnvEditDialog();
    showToast('環境情報を保存しました ✓', 'green');
    loadAreas();  // エリア一覧を再描画
  } else {
    showToast('保存に失敗しました', 'amber');
  }
}

// ─── LS/Firestore から単一エリアを取得 ───
function _getAreaById(id) {
  const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
  return stored.find(a => a.id === id) || null;
}