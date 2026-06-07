// ═══════════════════════════════════════════
//  VOICE MEMO — 音声メモ（Web Speech API）
//  ルールベース解析 → localStorage保存
//  保存キー: agrisim_voice_memos
// ═══════════════════════════════════════════

const VM_KEY = 'agrisim_voice_memos';

// ─────────────────────────────────────────
//  辞書定義
// ─────────────────────────────────────────

// 作業タグ辞書（先に長いキーワードを並べること）
const VM_TAG_DICT = [
  // ─── 土づくり・整地 ───
  { tag: '耕起',     keywords: ['耕起','耕した','耕す','プラウ','ロータリー'] },
  { tag: '耕耘',     keywords: ['耕耘','耕うん','トラクター','ハロー'] },
  { tag: '代掻き',   keywords: ['代掻き','代かき','しろかき'] },
  { tag: 'マルチ',   keywords: ['マルチ','マルチング','マルチを張','マルチ敷'] },
  // ─── 種子処理 ───
  { tag: '塩水選',   keywords: ['塩水選','えんすいせん','塩水'] },
  { tag: '種子消毒', keywords: ['種子消毒','種消毒','消毒'] },
  { tag: '浸種',     keywords: ['浸種','しんしゅ','浸水','種を浸'] },
  { tag: '催芽',     keywords: ['催芽','さいが','芽出し'] },
  // ─── 育苗・定植 ───
  { tag: '播種',     keywords: ['播種','種まき','種をまい','タネ','たね','は種','直播'] },
  { tag: '仮植',     keywords: ['仮植','かりうえ'] },
  { tag: '鉢上げ',   keywords: ['鉢上げ','はちあげ','鉢へ移'] },
  { tag: '定植',     keywords: ['定植','移殖','移植','植え付け','植えた','苗を植','田植え','田植'] },
  // ─── 施肥 ───
  { tag: '基肥',     keywords: ['基肥','もとごえ','元肥'] },
  { tag: '施肥',     keywords: ['施肥','追肥','穂肥','肥料','液肥','堆肥','撒いた','まいた','施用'] },
  // ─── 水管理（水田） ───
  { tag: '水管理',   keywords: ['水管理','入水','水入れ','水位','湛水'] },
  { tag: '中干',     keywords: ['中干','なかぼし','中干し'] },
  { tag: '溝切',     keywords: ['溝切','溝切り','みぞきり'] },
  { tag: '落水',     keywords: ['落水','水を落','排水','水抜き'] },
  // ─── 灌水 ───
  { tag: '灌水',     keywords: ['灌水','潅水','水やり','散水','点滴','スプリンクラー'] },
  // ─── 防除 ───
  { tag: '防除',     keywords: ['防除','種子消毒','農薬散布','スプレー','噴霧','散布','消毒'] },
  // ─── 除草 ───
  { tag: '除草',     keywords: ['除草','草取り','草刈り','雑草','草を','中耕'] },
  // ─── 整枝・誘引 ───
  { tag: '誘引',     keywords: ['誘引','ゆういん','紐で','テープで留','固定'] },
  { tag: '整枝',     keywords: ['整枝','せいし','側枝','わき芽'] },
  { tag: '剪定',     keywords: ['剪定','せん定','枝切り','芽かき','摘果','摘花','摘蕾','摘心','芽欠き'] },
  // ─── 収穫・収量確認 ───
  { tag: '収穫',     keywords: ['収穫','採った','もいだ','刈った','刈り取り','穫れた','収量','取り込み'] },
  // ─── 収穫後処理 ───
  { tag: '乾燥',     keywords: ['乾燥','乾燥機','かんそう','干した'] },
  { tag: '籾摺り',   keywords: ['籾摺り','もみすり','籾摺','脱穀','もみがら'] },
  { tag: '出荷調整', keywords: ['出荷調整','選果','選別','等級','規格','袋詰め','箱詰め'] },
  { tag: '出荷',     keywords: ['出荷','荷造り','梱包','JA','農協','市場','配送','出した'] },
  // ─── 後処理・管理 ───
  { tag: '運搬',     keywords: ['運搬','運んだ','積み込み','搬入','搬出'] },
  { tag: '片付け',   keywords: ['片付け','かたづけ','撤去','残渣','ビニール回収','後片付け'] },
  // ─── 記録・点検 ───
  { tag: '生育確認', keywords: ['生育確認','生育観察','草丈','葉色','生長','ようすを見'] },
  { tag: '病害確認', keywords: ['病害','病気','虫害','被害','異常','黄化','萎れ','食害'] },
  { tag: '機械点検', keywords: ['機械点検','点検','メンテ','整備','オイル','修理'] },
  { tag: 'その他',   keywords: [] },
];

// 資材辞書（補完用・cropDB優先）
const VM_MATERIAL_DICT = [
  // ── 窒素系肥料 ──
  '液肥','尿素','硫安','塩化アンモニウム','硝酸アンモニウム','石灰窒素',
  // ── リン酸系 ──
  '過リン酸石灰','重過リン酸石灰','ようりん','熔成リン肥',
  // ── カリ系 ──
  '塩化カリ','硫酸カリ','草木灰',
  // ── 複合肥料 ──
  '化成肥料','有機肥料','NK化成','有機888','BB肥料','緩効性肥料','被覆肥料','LP肥料',
  // ── 有機・特殊 ──
  '堆肥','牛糞堆肥','鶏糞','豚糞','魚粉','骨粉','米ぬか','ボカシ肥','緑肥','木酢液','竹酢液','腐植酸','フルボ酸',
  // ── 土壌改良材 ──
  '苦土石灰','炭酸石灰','消石灰','ドロマイト','珪酸カルシウム','珪酸塩白土','ゼオライト',
  'バーミキュライト','パーライト','ピートモス','ヤシ殻','もみ殻','もみ殻くん炭','炭',
  // ── 農薬（殺虫）──
  '殺虫剤','アブラムシ剤','ダニ剤','コナジラミ剤','アザミウマ剤','ネマトーダ剤',
  'スピノサド','アセタミプリド','イミダクロプリド','クロチアニジン',
  // ── 農薬（殺菌）──
  '殺菌剤','うどんこ病剤','灰色かび病剤','疫病剤','炭疽病剤','銅水和剤','石灰硫黄合剤',
  // ── 農薬（除草）──
  '除草剤','茎葉処理剤','土壌処理剤','グリホサート','プリグロックス',
  // ── 農薬（共通）──
  '農薬','展着剤','殺虫殺菌剤','フェロモントラップ','粘着シート','天敵',
  // ── 育苗資材 ──
  '培土','育苗培土','種まき培土','育苗トレー','セルトレー','育苗箱','ポット','ジフィーポット',
  '播種機','育苗器','温床マット',
  // ── 栽培資材 ──
  'マルチ','黒マルチ','白マルチ','シルバーマルチ','穴あきマルチ','生分解マルチ',
  'トンネル','不織布','寒冷紗','防虫ネット','防鳥ネット','防霜シート','遮光ネット',
  '支柱','誘引テープ','クリップ','麻紐','ビニール','ハウスフィルム',
  // ── 機械・道具 ──
  '管理機','乗用トラクター','田植え機','コンバイン','防除機','動噴','乾燥機','籾摺り機',
  'スプレー','噴霧器','ハサミ','剪定ばさみ','刈払機',
];

// 出荷先辞書（SHIPPING_TYPESから補完）
const VM_SHIPPING_DICT = {
  // JA・農協
  'JA': 'ja', '農協': 'ja', 'ＪＡ': 'ja',
  // 卸・市場
  '卸': 'wholesale', '市場': 'wholesale', '卸売': 'wholesale',
  '中央卸売市場': 'wholesale', '地方市場': 'wholesale', '産地市場': 'wholesale',
  // スーパー・量販
  'スーパー': 'supermarket', '量販店': 'supermarket', 'イオン': 'supermarket',
  'コープ': 'supermarket', '生協': 'supermarket',
  // 直売
  '直売': 'farmstand', '直売所': 'farmstand', '道の駅': 'farmstand',
  '産直': 'farmstand', '朝市': 'farmstand', 'マルシェ': 'farmstand',
  // その他
  'レストラン': 'wholesale', '飲食店': 'wholesale', '給食': 'wholesale',
  'ネット': 'farmstand', '通販': 'farmstand',
};

// 数量・単位パターン（重い単位から順に判定）
const VM_UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(トン|t(?:on)?|ｔ|kg|ｋｇ|キログラム|キロ|g|ｇ|グラム|kl|ｋｌ|キロリットル|L|ℓ|リットル|ml|ｍｌ|cc|俵|袋|本|株|粒|個|玉|房|束|枚|枚組|箱|ケース|コンテナ|パック|トレー|反|畝|坪|平米|㎡|アール|ha|ヘクタール|倍|回|時間|日)/;

// ─────────────────────────────────────────
//  日付解析
// ─────────────────────────────────────────

function vmParseDate(text) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  // 今日・本日
  if (/今日|本日|きょう/.test(text)) return fmt(now);
  // 昨日
  if (/昨日|きのう/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return fmt(d);
  }
  // 明後日（明日より先に判定）
  if (/明後日|あさって/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 2); return fmt(d);
  }
  // 明日
  if (/明日|あした|あす/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); return fmt(d);
  }
  // 来週〇曜
  const weekMatch = text.match(/来週\s*(月|火|水|木|金|土|日)/);
  if (weekMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const target = dowMap[weekMatch[1]];
    const d = new Date(now);
    const diff = ((target - d.getDay() + 7) % 7) || 7; // 同じ曜日なら来週
    d.setDate(d.getDate() + diff + 7);
    return fmt(d);
  }
  // 今週〇曜 / 〇曜日
  const thiswMatch = text.match(/(今週\s*)?(月|火|水|木|金|土|日)曜/);
  if (thiswMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const target = dowMap[thiswMatch[2]];
    const d = new Date(now);
    let diff = (target - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // 当日同曜日は来週扱い
    d.setDate(d.getDate() + diff);
    return fmt(d);
  }
  // 〇月〇日
  const mdMatch = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (mdMatch) {
    const d = new Date(now.getFullYear(), parseInt(mdMatch[1])-1, parseInt(mdMatch[2]));
    // 過去日付なら翌年
    if (d < now && (now - d) > 86400000) d.setFullYear(d.getFullYear() + 1);
    return fmt(d);
  }
  // 〇日
  const dayMatch = text.match(/(\d{1,2})日/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    if (d < now && now.getDate() > day) d.setMonth(d.getMonth() + 1);
    return fmt(d);
  }
  // 日付なし → 当日
  return fmt(now);
}

// ─────────────────────────────────────────
//  テキスト解析
// ─────────────────────────────────────────

function vmParseText(rawText) {
  const text = rawText;

  // 日付
  const workDate = vmParseDate(text);

  // 作業タグ
  let tag = 'その他';
  for (const entry of VM_TAG_DICT) {
    if (entry.keywords.some(kw => text.includes(kw))) {
      tag = entry.tag;
      break;
    }
  }

  // 作物（cropDBから動的取得 → なければ辞書）
  let crop = null;
  if (typeof cropDB !== 'undefined' && Array.isArray(cropDB)) {
    for (const c of cropDB) {
      const names = [c.name, c.nameEn, ...(c.aliases || [])].filter(Boolean);
      if (names.some(n => text.includes(n))) { crop = c.name; break; }
    }
  }

  // 圃場名（savedAreasから動的取得）
  let areaId = null;
  if (typeof savedAreas !== 'undefined' && Array.isArray(savedAreas)) {
    for (const a of savedAreas) {
      if (a.name && text.includes(a.name)) { areaId = a.id; break; }
    }
  }

  // 資材
  let material = null;
  for (const m of VM_MATERIAL_DICT) {
    if (text.includes(m)) { material = m; break; }
  }

  // 数量・単位
  let quantity = null;
  const unitMatch = text.match(VM_UNIT_PATTERN);
  if (unitMatch) quantity = unitMatch[0];

  // 出荷先
  let shipping = null;
  for (const [kw, type] of Object.entries(VM_SHIPPING_DICT)) {
    if (text.includes(kw)) { shipping = type; break; }
  }

  return { workDate, tag, crop, material, quantity, shipping };
}

// ─────────────────────────────────────────
//  localStorage 操作
// ─────────────────────────────────────────

function vmLoad() {
  try { return JSON.parse(localStorage.getItem(VM_KEY) || '[]'); }
  catch { return []; }
}

function vmSave(memos) {
  localStorage.setItem(VM_KEY, JSON.stringify(memos));
}

function vmAdd(memo) {
  const memos = vmLoad();
  memos.push(memo);
  vmSave(memos);
}

function vmDelete(id) {
  vmSave(vmLoad().filter(m => m.id !== id));
}

// ─────────────────────────────────────────
//  Web Speech API
// ─────────────────────────────────────────

let _vmRecognition = null;
let _vmListening   = false;

function vmStartListening(areaId) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('このブラウザは音声認識に対応していません', 'amber');
    return;
  }
  if (_vmListening) { vmStopListening(); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _vmRecognition = new SR();
  _vmRecognition.lang           = 'ja-JP';
  _vmRecognition.interimResults = true;
  _vmRecognition.maxAlternatives = 1;
  _vmRecognition.continuous     = false;

  // 録音中UI
  _vmSetRecordingUI(true);
  _vmListening = true;

  _vmRecognition.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (final += t) : (interim += t);
    }
    // 途中結果をオーバーレイに表示
    const el = document.getElementById('vm-interim-text');
    if (el) el.textContent = interim || final;

    if (final) {
      _vmListening = false;
      _vmSetRecordingUI(false);
      vmShowConfirmDialog(final, areaId);
    }
  };

  _vmRecognition.onerror = (e) => {
    _vmListening = false;
    _vmSetRecordingUI(false);
    const msgs = {
      'no-speech':        '音声を検出できませんでした',
      'not-allowed':      'マイクの使用を許可してください',
      'network':          'ネットワークエラーが発生しました',
      'audio-capture':    'マイクが使用できません',
    };
    showToast(msgs[e.error] || `音声認識エラー: ${e.error}`, 'amber');
  };

  _vmRecognition.onend = () => {
    if (_vmListening) {
      _vmListening = false;
      _vmSetRecordingUI(false);
    }
  };

  _vmRecognition.start();
}

function vmStopListening() {
  if (_vmRecognition) { _vmRecognition.stop(); }
  _vmListening = false;
  _vmSetRecordingUI(false);
}

// ─────────────────────────────────────────
//  録音中UI切替
// ─────────────────────────────────────────

function _vmSetRecordingUI(on) {
  const btn     = document.getElementById('vm-mic-btn');
  const overlay = document.getElementById('vm-recording-overlay');
  if (btn) {
    btn.classList.toggle('recording', on);
    btn.title = on ? '停止' : '音声メモを録音';
  }
  if (overlay) overlay.style.display = on ? 'flex' : 'none';
  const el = document.getElementById('vm-interim-text');
  if (el) el.textContent = '';
}

// ─────────────────────────────────────────
//  確認ダイアログ
// ─────────────────────────────────────────

function vmShowConfirmDialog(rawText, areaId) {
  const parsed = vmParseText(rawText);
  // areaIdは呼び出し元から渡す（エリア詳細パネル）
  if (areaId) parsed.areaId = areaId;

  const tagOptions = VM_TAG_DICT.map(e =>
    `<option value="${e.tag}"${e.tag === parsed.tag ? ' selected' : ''}>${e.tag}</option>`
  ).join('');

  // 既存overlay削除
  document.getElementById('vm-confirm-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'vm-confirm-overlay';
  overlay.className = 'vm-confirm-overlay';
  overlay.innerHTML = `
    <div class="vm-confirm-dialog">
      <div class="vm-confirm-header">
        <span class="vm-confirm-title">🎤 音声メモ確認</span>
        <button class="vm-confirm-close" onclick="vmCloseConfirmDialog()">✕</button>
      </div>
      <div class="vm-confirm-body">
        <div class="vm-field">
          <label class="vm-label">認識テキスト</label>
          <textarea class="vm-textarea" id="vm-raw-text" rows="2">${escHtml(rawText)}</textarea>
        </div>
        <div class="vm-field-row">
          <div class="vm-field">
            <label class="vm-label">作業日</label>
            <input class="vm-input" type="date" id="vm-work-date" value="${parsed.workDate}">
          </div>
          <div class="vm-field">
            <label class="vm-label">作業タグ</label>
            <select class="vm-select" id="vm-tag">${tagOptions}</select>
          </div>
        </div>
        <div class="vm-field-row">
          <div class="vm-field">
            <label class="vm-label">作物</label>
            <input class="vm-input" type="text" id="vm-crop" value="${escHtml(parsed.crop || '')}" placeholder="例：トマト">
          </div>
          <div class="vm-field">
            <label class="vm-label">資材</label>
            <input class="vm-input" type="text" id="vm-material" value="${escHtml(parsed.material || '')}" placeholder="例：液肥">
          </div>
        </div>
        <div class="vm-field-row">
          <div class="vm-field">
            <label class="vm-label">数量・単位</label>
            <input class="vm-input" type="text" id="vm-quantity" value="${escHtml(parsed.quantity || '')}" placeholder="例：200倍">
          </div>
          <div class="vm-field">
            <label class="vm-label">メモ（任意）</label>
            <input class="vm-input" type="text" id="vm-note" placeholder="補足など">
          </div>
        </div>
      </div>
      <div class="vm-confirm-footer">
        <button class="btn btn-ghost" onclick="vmCloseConfirmDialog()">キャンセル</button>
        <button class="btn btn-primary" onclick="vmCommit('${areaId || ''}')">保存する</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function vmCloseConfirmDialog() {
  document.getElementById('vm-confirm-overlay')?.remove();
}

function vmCommit(areaId) {
  const rawText  = document.getElementById('vm-raw-text')?.value.trim() || '';
  const workDate = document.getElementById('vm-work-date')?.value || '';
  const tag      = document.getElementById('vm-tag')?.value || 'その他';
  const crop     = document.getElementById('vm-crop')?.value.trim() || null;
  const material = document.getElementById('vm-material')?.value.trim() || null;
  const quantity = document.getElementById('vm-quantity')?.value.trim() || null;
  const note     = document.getElementById('vm-note')?.value.trim() || null;

  const memo = {
    id:        'vm_' + Date.now(),
    areaId:    areaId || null,
    workDate,
    createdAt: new Date().toISOString(),
    tag,
    crop:      crop || null,
    material:  material || null,
    quantity:  quantity || null,
    note:      note || null,
    rawText,
  };

  vmAdd(memo);
  vmCloseConfirmDialog();
  showToast(`📝 音声メモを保存しました（${workDate} / ${tag}）`);

  // カレンダー再描画
  if (typeof _adpRenderCalendar === 'function')    _adpRenderCalendar();
  if (typeof _adpRenderDayRecords === 'function')  _adpRenderDayRecords();
}

// ─────────────────────────────────────────
//  カレンダー用：音声メモ取得
// ─────────────────────────────────────────

/** area.jsのカレンダー描画から呼ぶ */
function vmLoadByArea(areaId) {
  return vmLoad().filter(m => m.areaId === areaId);
}

/** 日付→音声メモ一覧 */
function vmLoadByDate(areaId, dateStr) {
  return vmLoadByArea(areaId).filter(m => m.workDate === dateStr);
}

// ─────────────────────────────────────────
//  マイクボタン HTML生成（area.jsから呼ぶ）
// ─────────────────────────────────────────

function vmMicButtonHTML() {
  return `
    <button id="vm-mic-btn" class="vm-mic-btn"
      onclick="vmStartListening(_adpArea?.id)"
      title="音声メモを録音">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
      </svg>
      <span>音声メモ</span>
    </button>
    <div id="vm-recording-overlay" class="vm-recording-overlay" style="display:none;">
      <span class="vm-rec-dot"></span>
      <span id="vm-interim-text" class="vm-interim-text">録音中...</span>
      <button class="vm-stop-btn" onclick="vmStopListening()">停止</button>
    </div>
  `;
}