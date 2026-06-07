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
  // 道の駅（直売所より先に判定）
  '道の駅': 'roadside',
  // 直売
  '直売': 'farmstand', '直売所': 'farmstand',
  '産直': 'farmstand', '朝市': 'farmstand', 'マルシェ': 'farmstand',
  // その他
  'レストラン': 'wholesale', '飲食店': 'wholesale', '給食': 'wholesale',
  'ネット': 'farmstand', '通販': 'farmstand',
};

// タグスコアリング：出荷系タグのボーナスウェイト
const VM_TAG_BONUS = {
  '出荷':     3,
  '出荷調整': 3,
  '収穫':     1,
};

// 出荷系ワード（確認ダイアログに「出荷記録にも保存」ボタンを出す判定用）
const VM_SHIPPING_WORDS = ['出荷','荷造り','梱包','JA','農協','市場','配送','出した','道の駅','直売','伝票','選果','選別','等級','規格','袋詰め','箱詰め'];

// 数量・単位パターン（重い単位から順に判定）
const VM_UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(トン|t(?:on)?|ｔ|kg|ｋｇ|キログラム|キロ|g|ｇ|グラム|kl|ｋｌ|キロリットル|L|ℓ|リットル|ml|ｍｌ|cc|俵|袋|本|株|粒|個|玉|房|束|枚|枚組|箱|ケース|コンテナ|パック|トレー|反|畝|坪|平米|㎡|アール|ha|ヘクタール|倍|回|時間|日)/;

// ─────────────────────────────────────────
//  日付解析
// ─────────────────────────────────────────

// ─── 単一日付フラグメントを解析 ───
// 戻り値: { date: 'YYYY-MM-DD', monthUnknown: bool }
function _vmParseDateFragment(text) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  if (/今日|本日|きょう/.test(text)) return { date: fmt(now), monthUnknown: false };
  if (/昨日|きのう/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { date: fmt(d), monthUnknown: false };
  }
  if (/明後日|あさって/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 2);
    return { date: fmt(d), monthUnknown: false };
  }
  if (/明日|あした|あす/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return { date: fmt(d), monthUnknown: false };
  }
  // 来週〇曜
  const weekMatch = text.match(/来週\s*(月|火|水|木|金|土|日)/);
  if (weekMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const d = new Date(now);
    const diff = ((dowMap[weekMatch[1]] - d.getDay() + 7) % 7) || 7;
    d.setDate(d.getDate() + diff + 7);
    return { date: fmt(d), monthUnknown: false };
  }
  // 今週〇曜 / 〇曜日
  const thiswMatch = text.match(/(今週\s*)?(月|火|水|木|金|土|日)曜/);
  if (thiswMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const d = new Date(now);
    let diff = (dowMap[thiswMatch[2]] - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    return { date: fmt(d), monthUnknown: false };
  }
  // 〇月〇日（月が明示されている）
  const mdMatch = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (mdMatch) {
    const d = new Date(now.getFullYear(), parseInt(mdMatch[1])-1, parseInt(mdMatch[2]));
    if (d < now && (now - d) > 86400000) d.setFullYear(d.getFullYear() + 1);
    return { date: fmt(d), monthUnknown: false };
  }
  // 〇日のみ（月が不明）→ monthUnknown フラグを立てて今月の日付を仮置き
  const dayMatch = text.match(/(?<![月\d])(\d{1,2})日/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    // 今月の日付として仮置き（ダイアログで月を確認する）
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    return { date: fmt(d), monthUnknown: true };
  }
  return { date: fmt(now), monthUnknown: false };
}

// ─── テキスト全体から作業日・出荷日を分離して解析 ───
// 戻り値: { workDate, shipDate, workMonthUnknown, shipMonthUnknown }
function vmParseDate(text) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  // 出荷日コンテキスト：「出荷は〇日」「〇日に出荷」パターン
  const shipCtxPatterns = [
    /出荷(?:は|が|を|日)?[はがをに]?\s*([今昨明あ来今週\d〇].{0,10}?(?:日|曜))/,
    /([今昨明あ来今週\d〇].{0,10}?(?:日|曜))[にはがを]?出荷/,
  ];
  // 作業日コンテキスト：「収穫は〇日」「〇日に定植」など
  const workCtxPatterns = [
    /(?:収穫|定植|播種|作業|耕起|施肥|防除|除草|灌水|乾燥|籾摺り)(?:は|が|を|日)?[はがをに]?\s*([今昨明あ来今週\d〇].{0,10}?(?:日|曜))/,
    /([今昨明あ来今週\d〇].{0,10}?(?:日|曜))[にはがを]?(?:収穫|定植|播種|作業|耕起|施肥|防除|除草|灌水)/,
  ];

  let shipRaw = null, workRaw = null;
  for (const p of shipCtxPatterns) {
    const m = text.match(p);
    if (m) { shipRaw = m[1]; break; }
  }
  for (const p of workCtxPatterns) {
    const m = text.match(p);
    if (m) { workRaw = m[1]; break; }
  }

  const shipResult = shipRaw ? _vmParseDateFragment(shipRaw) : null;
  const workResult = workRaw ? _vmParseDateFragment(workRaw) : null;

  // どちらも取れなかった場合はテキスト全体から1つ取得
  const fallback = _vmParseDateFragment(text);

  return {
    workDate:         workResult ? workResult.date  : fallback.date,
    shipDate:         shipResult ? shipResult.date  : null,
    workMonthUnknown: workResult ? workResult.monthUnknown : fallback.monthUnknown,
    shipMonthUnknown: shipResult ? shipResult.monthUnknown : false,
  };
}

// ─────────────────────────────────────────
//  テキスト解析
// ─────────────────────────────────────────

function vmParseText(rawText) {
  const text = rawText;

  // 日付（作業日・出荷日を分離）
  const dateResult = vmParseDate(text);
  const workDate         = dateResult.workDate;
  const shipDate         = dateResult.shipDate;
  const workMonthUnknown = dateResult.workMonthUnknown;
  const shipMonthUnknown = dateResult.shipMonthUnknown;

  // ─── タグ：スコアリング方式 ───
  const scores = VM_TAG_DICT
    .filter(e => e.keywords.length > 0)
    .map(e => {
      const hits = e.keywords.filter(kw => text.includes(kw)).length;
      const bonus = VM_TAG_BONUS[e.tag] || 0;
      return { tag: e.tag, score: hits + (hits > 0 ? bonus : 0) };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // 上位3件を候補に
  const tagCandidates = scores.slice(0, 3).map(s => s.tag);
  // 1位と2位のスコア差が1以下なら「曖昧」フラグ
  const tagAmbiguous = scores.length >= 2 && (scores[0].score - scores[1].score) <= 1;
  const tag = tagCandidates[0] || 'その他';

  // 作物（cropDBから動的取得）
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

  // 出荷系ワード検出
  const hasShippingWord = VM_SHIPPING_WORDS.some(w => text.includes(w));

  return {
    workDate, shipDate,
    workMonthUnknown, shipMonthUnknown,
    tag, tagCandidates, tagAmbiguous,
    crop, material, quantity, shipping, hasShippingWord,
    areaId,
  };
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
//  continuous=true + 自前2.5秒無音タイマーで余裕を確保
// ─────────────────────────────────────────

let _vmRecognition  = null;
let _vmListening    = false;
let _vmSilenceTimer = null;   // 無音タイムアウトタイマー
let _vmFinalText    = '';     // 確定テキスト蓄積
let _vmInterimText  = '';     // 途中テキスト
let _vmCallback     = null;   // 認識完了コールバック（通常 or ダイアログ内）

const VM_SILENCE_MS = 2500;   // 無音検出閾値（ms）

// ─── 無音タイマーリセット ───
function _vmResetSilenceTimer() {
  clearTimeout(_vmSilenceTimer);
  _vmSilenceTimer = setTimeout(() => {
    // 無音2.5秒 → 認識確定
    if (_vmRecognition) _vmRecognition.stop();
  }, VM_SILENCE_MS);
}

// ─── メイン録音開始 ───
// areaId: 通常呼び出し時のエリアID
// onDone: (finalText) => void  省略時は vmShowConfirmDialog を呼ぶ
function vmStartListening(areaId, onDone) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('このブラウザは音声認識に対応していません', 'amber');
    return;
  }
  if (_vmListening) { vmStopListening(); return; }

  _vmFinalText   = '';
  _vmInterimText = '';
  _vmCallback    = onDone || null;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _vmRecognition = new SR();
  _vmRecognition.lang            = 'ja-JP';
  _vmRecognition.interimResults  = true;
  _vmRecognition.maxAlternatives = 1;
  _vmRecognition.continuous      = true;   // ← 連続認識でマイクを切らさない

  _vmListening = true;
  _vmSetRecordingUI(true, 'ready');        // 「準備中…」表示

  // 準備アニメ後に「話してください」表示
  setTimeout(() => _vmSetRecordingUI(true, 'listening'), 800);

  _vmRecognition.onstart = () => {
    _vmResetSilenceTimer();                // 開始時点からタイマー開始
  };

  _vmRecognition.onresult = (e) => {
    _vmResetSilenceTimer();                // 発話があるたびリセット

    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        _vmFinalText += t;
      } else {
        interim += t;
      }
    }
    _vmInterimText = interim;

    // リアルタイム表示（途中 or 確定済み+途中）
    const display = (_vmFinalText + interim).trim();
    const el = document.getElementById('vm-interim-text');
    if (el) el.textContent = display || '話してください…';

    // ダイアログが開いている場合はリアルタイムでフィールドにも反映
    if (document.getElementById('vm-confirm-overlay') && _vmFinalText) {
      _vmApplyParsedToDialog(_vmFinalText + interim);
    }
  };

  _vmRecognition.onerror = (e) => {
    if (e.error === 'no-speech') {
      // no-speech はタイマー側で制御するので無視
      return;
    }
    clearTimeout(_vmSilenceTimer);
    _vmListening = false;
    _vmSetRecordingUI(false);
    const msgs = {
      'not-allowed':   'マイクの使用を許可してください',
      'network':       'ネットワークエラーが発生しました',
      'audio-capture': 'マイクが使用できません',
    };
    showToast(msgs[e.error] || `音声認識エラー: ${e.error}`, 'amber');
  };

  _vmRecognition.onend = () => {
    clearTimeout(_vmSilenceTimer);
    _vmListening = false;
    _vmSetRecordingUI(false);

    const result = (_vmFinalText + _vmInterimText).trim();
    if (!result) {
      showToast('音声が取得できませんでした', 'amber');
      return;
    }

    if (_vmCallback) {
      // ダイアログ内追加録音コールバック
      _vmCallback(result);
      _vmCallback = null;
    } else {
      // 通常フロー → 確認ダイアログ
      vmShowConfirmDialog(result, areaId);
    }
  };

  _vmRecognition.start();
}

function vmStopListening() {
  clearTimeout(_vmSilenceTimer);
  if (_vmRecognition) _vmRecognition.stop();
  _vmListening = false;
  _vmSetRecordingUI(false);
}

// ─────────────────────────────────────────
//  録音中UI切替
//  phase: 'ready' | 'listening' | false
// ─────────────────────────────────────────

function _vmSetRecordingUI(on, phase) {
  const btn     = document.getElementById('vm-mic-btn');
  const overlay = document.getElementById('vm-recording-overlay');
  const el      = document.getElementById('vm-interim-text');

  if (btn) {
    btn.classList.toggle('recording', on);
    btn.title = on ? '停止' : '音声メモを録音';
  }
  if (overlay) overlay.style.display = on ? 'flex' : 'none';

  if (on && el) {
    if (phase === 'ready') {
      el.textContent = '準備中…';
      el.style.opacity = '0.6';
    } else if (phase === 'listening') {
      el.textContent = '話してください…';
      el.style.opacity = '1';
    }
  } else if (el) {
    el.textContent = '';
    el.style.opacity = '1';
  }

  // ダイアログ内マイクボタンの状態も同期
  const dlgBtn = document.getElementById('vm-dlg-mic-btn');
  if (dlgBtn) {
    dlgBtn.classList.toggle('recording', on);
    dlgBtn.textContent = on ? '⏹ 停止' : '🎤 追加録音';
  }
}

// ─────────────────────────────────────────
//  確認ダイアログ
// ─────────────────────────────────────────

// ダイアログの現在タブ状態
let _vmDlgTab = 'work'; // 'work' | 'ship'

function vmShowConfirmDialog(rawText, areaId) {
  _vmDlgTab = 'work';
  const parsed = vmParseText(rawText);
  if (areaId) parsed.areaId = areaId;

  document.getElementById('vm-confirm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'vm-confirm-overlay';
  overlay.className = 'vm-confirm-overlay';
  overlay.innerHTML = _vmBuildDialogHTML(parsed, rawText, areaId);
  document.body.appendChild(overlay);

  _vmBindMonthPickers(parsed);
  _vmCheckScheduleBanner(parsed.workDate);
}

// ─── ダイアログHTML組み立て ───
function _vmBuildDialogHTML(parsed, rawText, areaId) {
  const tagOptions = VM_TAG_DICT.map(e =>
    `<option value="${e.tag}"${e.tag === parsed.tag ? ' selected' : ''}>${e.tag}</option>`
  ).join('');

  // タグ曖昧時：候補ボタン（最大3件）
  const tagCandidateHTML = (parsed.tagAmbiguous && parsed.tagCandidates.length > 1)
    ? `<div class="vm-tag-candidates">
        <span class="vm-tag-hint">⚠️ 判定が曖昧です。候補を選んでください：</span>
        ${parsed.tagCandidates.map(t =>
          `<button type="button" class="vm-tag-cand-btn${t === parsed.tag ? ' active' : ''}"
            onclick="vmSelectTagCandidate('${t}')">${t}</button>`
        ).join('')}
      </div>`
    : '';

  // 月選択UI
  const now = new Date();
  const monthOpts = Array.from({length: 12}, (_, i) => {
    const m = i + 1;
    return `<option value="${m}"${m === now.getMonth()+1 ? ' selected' : ''}>${m}月</option>`;
  }).join('');

  const workMonthPickerHTML = parsed.workMonthUnknown
    ? `<div class="vm-month-picker">
        <span class="vm-tag-hint">📅 何月の作業ですか？</span>
        <select class="vm-select vm-month-sel" id="vm-work-month">${monthOpts}</select>
      </div>` : '';

  const shipMonthPickerHTML = parsed.shipMonthUnknown
    ? `<div class="vm-month-picker">
        <span class="vm-tag-hint">📅 何月の出荷ですか？</span>
        <select class="vm-select vm-month-sel" id="vm-ship-month">${monthOpts}</select>
      </div>` : '';

  // 出荷先タイプ
  const shippingTypes = [
    { key: 'ja',          label: '🌾 JA' },
    { key: 'market',      label: '🏪 卸売市場' },
    { key: 'supermarket', label: '🛒 スーパー' },
    { key: 'farmstand',   label: '🏡 直売所' },
    { key: 'roadside',    label: '🚗 道の駅' },
  ];
  const shippingTypeOpts = shippingTypes.map(t =>
    `<button type="button" class="vm-ship-type-btn${parsed.shipping === t.key ? ' active' : ''}"
      data-type="${t.key}" onclick="vmSelectShipType('${t.key}')">${t.label}</button>`
  ).join('');

  return `
    <div class="vm-confirm-dialog">

      <!-- ヘッダー -->
      <div class="vm-confirm-header">
        <span class="vm-confirm-title">🎤 音声メモ確認</span>
        <button class="vm-confirm-close" onclick="vmCloseConfirmDialog()">✕</button>
      </div>

      <!-- タブ -->
      <div class="vm-dlg-tabs">
        <button class="vm-dlg-tab active" id="vm-tab-work"
          onclick="vmSwitchDlgTab('work')">📋 作業メモ</button>
        <button class="vm-dlg-tab" id="vm-tab-ship"
          onclick="vmSwitchDlgTab('ship')">📦 出荷記録</button>
      </div>

      <!-- 予定バナー（未来日付検出時に表示） -->
      <div class="vm-schedule-banner" id="vm-schedule-banner" style="display:none;">
        <span>📅 これは<strong>予定</strong>ですか？</span>
        <button type="button" class="vm-banner-yes" onclick="vmSetSchedule(true)">はい・予定</button>
        <button type="button" class="vm-banner-no"  onclick="vmSetSchedule(false)">いいえ・実績</button>
      </div>
      <input type="hidden" id="vm-is-schedule" value="0">

      <!-- ボディ -->
      <div class="vm-confirm-body">

        <!-- 認識テキスト + 追加録音 -->
        <div class="vm-field vm-field-mic-row">
          <label class="vm-label">認識テキスト</label>
          <div class="vm-raw-row">
            <textarea class="vm-textarea" id="vm-raw-text" rows="2">${escHtml(rawText)}</textarea>
            <button type="button" class="vm-dlg-mic-btn" id="vm-dlg-mic-btn"
              onclick="vmDlgAddRecording('${areaId || ''}')">🎤 追加録音</button>
          </div>
        </div>

        <!-- 作業メモタブ -->
        <div id="vm-panel-work">
          <div class="vm-field-row">
            <div class="vm-field">
              <label class="vm-label">作業日</label>
              <input class="vm-input" type="date" id="vm-work-date" value="${parsed.workDate}">
              ${workMonthPickerHTML}
            </div>
            <div class="vm-field">
              <label class="vm-label">出荷日</label>
              <input class="vm-input" type="date" id="vm-ship-date" value="${parsed.shipDate || ''}">
              ${shipMonthPickerHTML}
            </div>
          </div>
          <div class="vm-field">
            <label class="vm-label">作業タグ</label>
            <select class="vm-select" id="vm-tag">${tagOptions}</select>
            ${tagCandidateHTML}
          </div>
          <div class="vm-field-row">
            <div class="vm-field">
              <label class="vm-label">作物</label>
              <input class="vm-input" type="text" id="vm-crop"
                value="${escHtml(parsed.crop || '')}" placeholder="例：トマト">
            </div>
            <div class="vm-field">
              <label class="vm-label">資材</label>
              <input class="vm-input" type="text" id="vm-material"
                value="${escHtml(parsed.material || '')}" placeholder="例：液肥">
            </div>
          </div>
          <div class="vm-field-row">
            <div class="vm-field">
              <label class="vm-label">数量・単位</label>
              <input class="vm-input" type="text" id="vm-quantity"
                value="${escHtml(parsed.quantity || '')}" placeholder="例：200kg">
            </div>
            <div class="vm-field">
              <label class="vm-label">メモ（任意）</label>
              <input class="vm-input" type="text" id="vm-note" placeholder="補足など">
            </div>
          </div>
        </div>

        <!-- 出荷記録タブ -->
        <div id="vm-panel-ship" style="display:none;">
          <div class="vm-field">
            <label class="vm-label">出荷先</label>
            <div class="vm-ship-type-grid">${shippingTypeOpts}</div>
            <input type="hidden" id="vm-ship-type" value="${parsed.shipping || 'ja'}">
          </div>
          <div class="vm-field-row">
            <div class="vm-field">
              <label class="vm-label">出荷日</label>
              <input class="vm-input" type="date" id="vm-ship-date2"
                value="${parsed.shipDate || parsed.workDate || ''}">
            </div>
            <div class="vm-field">
              <label class="vm-label">品目</label>
              <input class="vm-input" type="text" id="vm-ship-item"
                value="${escHtml(parsed.crop || '')}" placeholder="例：トマト">
            </div>
          </div>
          <div class="vm-field-row">
            <div class="vm-field">
              <label class="vm-label">数量</label>
              <input class="vm-input" type="text" id="vm-ship-qty"
                value="${escHtml(parsed.quantity || '')}" placeholder="例：20kg">
            </div>
            <div class="vm-field">
              <label class="vm-label">メモ</label>
              <input class="vm-input" type="text" id="vm-ship-note" placeholder="補足など">
            </div>
          </div>
        </div>

      </div><!-- /body -->

      <!-- フッター -->
      <div class="vm-confirm-footer">
        <button class="btn btn-ghost" onclick="vmCloseConfirmDialog()">キャンセル</button>
        <button class="btn btn-primary" onclick="vmCommit('${areaId || ''}')">保存する</button>
      </div>

    </div>
  `;
}

// ─── タブ切替（データ保持） ───
function vmSwitchDlgTab(tab) {
  _vmDlgTab = tab;
  document.getElementById('vm-panel-work').style.display = tab === 'work' ? '' : 'none';
  document.getElementById('vm-panel-ship').style.display = tab === 'ship' ? '' : 'none';
  document.getElementById('vm-tab-work').classList.toggle('active', tab === 'work');
  document.getElementById('vm-tab-ship').classList.toggle('active', tab === 'ship');
}

// ─── 予定バナー制御 ───
function _vmCheckScheduleBanner(workDate) {
  if (!workDate) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(workDate);
  if (target > today) {
    const banner = document.getElementById('vm-schedule-banner');
    if (banner) banner.style.display = 'flex';
  }
}

function vmSetSchedule(isSchedule) {
  document.getElementById('vm-is-schedule').value = isSchedule ? '1' : '0';
  const banner = document.getElementById('vm-schedule-banner');
  if (banner) {
    banner.innerHTML = isSchedule
      ? `<span class="vm-schedule-confirmed">📅 予定として保存します</span>`
      : `<span class="vm-schedule-confirmed">✅ 実績として保存します</span>`;
  }
}

// ─── ダイアログ内追加録音 ───
function vmDlgAddRecording(areaId) {
  if (_vmListening) { vmStopListening(); return; }
  vmStartListening(areaId, (addedText) => {
    // 認識テキストに追記
    const ta = document.getElementById('vm-raw-text');
    if (ta) {
      ta.value = (ta.value ? ta.value + '　' : '') + addedText;
    }
    // 追加テキストを解析してフィールドに反映
    _vmApplyParsedToDialog(addedText, true);
    showToast('🎤 テキストを追加しました', 'green');
  });
}

// ─── 解析結果をダイアログフィールドに反映 ───
// additive=true のとき空フィールドのみ補完（既存値は保持）
function _vmApplyParsedToDialog(text, additive) {
  const p = vmParseText(text);
  const fill = (id, val) => {
    if (!val) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (additive && el.value.trim()) return; // 入力済みは保持
    el.value = val;
    // 反映アニメーション
    el.classList.add('vm-field-updated');
    setTimeout(() => el.classList.remove('vm-field-updated'), 1500);
  };

  fill('vm-work-date', p.workDate);
  fill('vm-ship-date',  p.shipDate);
  fill('vm-ship-date2', p.shipDate || p.workDate);
  fill('vm-crop',      p.crop);
  fill('vm-material',  p.material);
  fill('vm-quantity',  p.quantity);
  fill('vm-ship-item', p.crop);
  fill('vm-ship-qty',  p.quantity);

  if (p.tag && p.tag !== 'その他') {
    const sel = document.getElementById('vm-tag');
    if (sel && (!additive || !sel.value || sel.value === 'その他')) {
      sel.value = p.tag;
    }
  }
  if (p.shipping) {
    const hidden = document.getElementById('vm-ship-type');
    if (hidden && (!additive || !hidden.value)) vmSelectShipType(p.shipping);
  }

  // 予定バナー再チェック
  const wd = document.getElementById('vm-work-date')?.value;
  if (wd) _vmCheckScheduleBanner(wd);
}

function vmCloseConfirmDialog() {
  document.getElementById('vm-confirm-overlay')?.remove();
}

// ─── タグ候補ボタン選択 ───
function vmSelectTagCandidate(tag) {
  const sel = document.getElementById('vm-tag');
  if (sel) sel.value = tag;
  document.querySelectorAll('.vm-tag-cand-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === tag);
  });
}

// ─── 出荷先タイプ選択 ───
function vmSelectShipType(type) {
  const hidden = document.getElementById('vm-ship-type');
  if (hidden) hidden.value = type;
  document.querySelectorAll('.vm-ship-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

// ─── 「出荷記録にも保存」セクション開閉 ───
// ─── 月選択UIのバインド（月変更 → date input を更新） ───
function _vmBindMonthPickers(parsed) {
  const workMonthSel = document.getElementById('vm-work-month');
  const workDateInput = document.getElementById('vm-work-date');
  if (workMonthSel && workDateInput && parsed.workMonthUnknown) {
    workMonthSel.addEventListener('change', () => {
      const d = new Date(workDateInput.value);
      d.setMonth(parseInt(workMonthSel.value) - 1);
      const pad = n => String(n).padStart(2,'0');
      workDateInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    });
  }
  const shipMonthSel = document.getElementById('vm-ship-month');
  const shipDateInput = document.getElementById('vm-ship-date');
  if (shipMonthSel && shipDateInput && parsed.shipMonthUnknown) {
    shipMonthSel.addEventListener('change', () => {
      const d = new Date(shipDateInput.value || new Date());
      d.setMonth(parseInt(shipMonthSel.value) - 1);
      const pad = n => String(n).padStart(2,'0');
      shipDateInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    });
  }
}

function vmCommit(areaId) {
  const rawText    = document.getElementById('vm-raw-text')?.value.trim() || '';
  const workDate   = document.getElementById('vm-work-date')?.value || '';
  const shipDate   = document.getElementById('vm-ship-date')?.value || null;
  const tag        = document.getElementById('vm-tag')?.value || 'その他';
  const crop       = document.getElementById('vm-crop')?.value.trim() || null;
  const material   = document.getElementById('vm-material')?.value.trim() || null;
  const quantity   = document.getElementById('vm-quantity')?.value.trim() || null;
  const note       = document.getElementById('vm-note')?.value.trim() || null;
  const isSchedule = document.getElementById('vm-is-schedule')?.value === '1';

  // 作業メモ保存（作業タブが対象）
  if (_vmDlgTab === 'work' || true) {
    const memo = {
      id:         'vm_' + Date.now(),
      areaId:     areaId || null,
      workDate,
      shipDate:   shipDate || null,
      isSchedule,
      createdAt:  new Date().toISOString(),
      tag,
      crop:       crop || null,
      material:   material || null,
      quantity:   quantity || null,
      note:       note || null,
      rawText,
    };
    vmAdd(memo);
  }

  // 出荷記録タブが選択されている場合 → records に連携
  if (_vmDlgTab === 'ship') {
    const shipType  = document.getElementById('vm-ship-type')?.value || 'ja';
    const shipItem  = document.getElementById('vm-ship-item')?.value.trim() || crop;
    const shipQty   = document.getElementById('vm-ship-qty')?.value.trim() || quantity;
    const shipDate2 = document.getElementById('vm-ship-date2')?.value || shipDate || workDate;
    const shipNote  = document.getElementById('vm-ship-note')?.value.trim() || null;
    if (typeof recordsFillFromVoice === 'function') {
      recordsFillFromVoice({
        shipDate: shipDate2,
        item:     shipItem,
        quantity: shipQty,
        note:     shipNote,
        rawText,
      }, shipType);
    }
  }

  vmCloseConfirmDialog();
  const label = isSchedule ? '予定' : '実績';
  showToast(`📝 音声メモを保存しました（${workDate} / ${tag} / ${label}）`);

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