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

// ─────────────────────────────────────────
//  農業・農業ビジネス 登録語リスト
//  未登録語フィルタリングの照合対象。
//  VM_TAG_DICT / VM_MATERIAL_DICT / VM_SHIPPING_DICT の語は
//  vmBuildAllowedWords() で自動収集するため重複登録不要。
// ─────────────────────────────────────────
const VM_AGRI_WORDS = [
  // ── 作物・野菜 ──
  'トマト','ミニトマト','ナス','ピーマン','パプリカ','キュウリ','ズッキーニ',
  'カボチャ','スイカ','メロン','イチゴ','ブドウ','モモ','ナシ','リンゴ','カキ',
  'ミカン','レモン','ユズ','スダチ','カボス','ライム','オレンジ','グレープフルーツ',
  'キャベツ','ハクサイ','レタス','サニーレタス','リーフレタス','チンゲンサイ',
  'コマツナ','ホウレンソウ','シュンギク','ミズナ','ルッコラ','バジル','パセリ',
  'セロリ','フェンネル','ディル','コリアンダー','タラゴン','チャービル','チャイブ',
  'ネギ','タマネギ','ニンニク','ラッキョウ','ニラ','アサツキ','リーキ',
  'ダイコン','カブ','ニンジン','ゴボウ','レンコン','サトイモ','ヤマイモ',
  'ジャガイモ','サツマイモ','ショウガ','ミョウガ','ワサビ','ウコン',
  'インゲン','エダマメ','エンドウ','スナップエンドウ','ソラマメ','ラッカセイ',
  'トウモロコシ','オクラ','ゴーヤ','ヘチマ','フキ','タケノコ','アスパラガス',
  'ブロッコリー','カリフラワー','コールラビ','芽キャベツ','ロマネスコ',
  '水菜','壬生菜','のらぼう菜','菜の花','セリ','モロヘイヤ','ツルムラサキ',
  'イチジク','ブルーベリー','ラズベリー','ブラックベリー','キウイ','バナナ',
  'スモモ','アンズ','サクランボ','ウメ','ビワ','クリ','クルミ','ギンナン',
  // ── 穀物・豆類 ──
  'コメ','水稲','陸稲','もち米','うるち米','コシヒカリ','あきたこまち','ひとめぼれ',
  'ハルノアカリ','ゆめぴりか','にこまる','つや姫','さがびより',
  'ムギ','コムギ','オオムギ','ライムギ','エンバク','ハダカムギ',
  'ダイズ','小豆','インゲン豆','金時豆','黒豆','緑豆','レンズ豆','ヒヨコ豆',
  'トウモロコシ','ソルガム','キビ','アワ','ヒエ','モロコシ','ソバ','アマランサス',
  // ── 工芸作物・飼料作物 ──
  '茶','緑茶','紅茶','抹茶','ほうじ茶','煎茶','玉露',
  'ワタ','アサ','イグサ','コウゾ','ミツマタ','サトウキビ','テンサイ',
  'ヒマワリ','ナタネ','ゴマ','エゴマ','アマニ','ベニバナ',
  'イネ科牧草','チモシー','オーチャードグラス','バミューダグラス','クローバー',
  'アルファルファ','スーダングラス','ソルゴー','飼料用トウモロコシ',
  // ── 花卉・観葉 ──
  'キク','バラ','カーネーション','ユリ','チューリップ','スイセン',
  'ガーベラ','ひまわり','コスモス','アジサイ','ラベンダー','ポインセチア',
  'パンジー','ビオラ','ペチュニア','マリーゴールド','インパチェンス',
  // ── 土づくり・圃場 ──
  '圃場','水田','畑','ハウス','温室','露地','ビニールハウス','ガラス温室',
  '田んぼ','あぜ','畦道','農道','用水路','暗渠','明渠','排水路',
  '作土','心土','客土','覆土','床土','畦立て','うね','うね間',
  '土壌','地力','有機物','腐植','EC','pH','土壌診断','塩類集積',
  '連作','連作障害','輪作','輪作体系','作付け','作付体系','作型',
  // ── 気象・環境 ──
  '気温','最高気温','最低気温','平均気温','地温','水温','積算温度','有効積算温度',
  '降水量','雨量','湿度','日照時間','日射量','風速','霜','霜害','凍霜害',
  '台風','大雨','干ばつ','高温障害','低温障害','冷害','雪害','風害',
  // ── 生育・栽培管理 ──
  '発芽','出芽','展葉','分げつ','茎立ち','出穂','開花','結実','肥大','登熟','成熟',
  '草丈','茎数','葉数','葉面積','着果数','果重','粒重','千粒重',
  '生育ステージ','栄養成長','生殖成長','株間','条間','畝幅','畝高','栽植密度',
  'わき芽','側枝','主枝','子づる','孫づる','摘芯','摘果','着果',
  'ランナー','塊茎','球根','根茎','株分け','挿し木','接ぎ木','高接ぎ',
  // ── 病害虫・防除 ──
  'うどんこ病','べと病','灰色かび病','疫病','炭疽病','萎凋病','立枯病',
  '黒斑病','斑点病','輪紋病','すす病','白斑病','さび病','黒腐病',
  'アブラムシ','ハダニ','コナジラミ','アザミウマ','スリップス','ハモグリバエ',
  'ネコブセンチュウ','シストセンチュウ','ネダニ','ケダニ','ハスモンヨトウ',
  'オオタバコガ','モンシロチョウ','アオムシ','コナガ','ヨトウムシ',
  'カメムシ','カブラヤガ','ドウガネブイブイ','コガネムシ','ヒメコガネ',
  'ナメクジ','カタツムリ','ネキリムシ','タネバエ','タマネギバエ',
  '天敵利用','IPM','総合防除','農薬ローテーション','抵抗性','薬剤耐性',
  '防除暦','農薬登録','適用作物','希釈倍数','散布量','安全使用基準',
  // ── 収穫・品質・規格 ──
  '糖度','酸度','食味','食感','外観','光沢','着色','色づき','熟度',
  '大きさ','重量','形状','傷','病斑','裂果','空洞果','日焼け果',
  '秀品','優品','良品','等外','規格外','ロス','廃棄','減農薬','無農薬','有機',
  // ── 機械・設備 ──
  'トラクター','田植え機','コンバイン','乾燥機','籾摺り機','色彩選別機',
  'スプレーヤー','動力噴霧器','ドローン','無人ヘリ','GPS','自動操舵',
  '管理機','移植機','収穫機','調製機','包装機','冷蔵庫','保冷庫','予冷庫',
  'ポンプ','揚水ポンプ','潅水チューブ','点滴チューブ','スプリンクラー',
  // ── 農業ビジネス・経営 ──
  '売上','収益','利益','所得','農業所得','経費','生産コスト','固定費','変動費',
  '損益','損益計算','収支','資金繰り','補助金','交付金','助成金','融資','借入',
  '農業共済','NOSAI','収入保険','価格補填','生産調整','面積払い',
  '販売計画','出荷計画','販路','契約栽培','契約出荷','産直契約',
  '農家台帳','栽培記録','作業日誌','農薬散布記録','肥料使用記録',
  '認証','GAP','JGAP','ASIAGAP','有機JAS','特別栽培','エコファーマー',
  'GI','地理的表示','ブランド','産地','産地ブランド',
  '農業法人','農業生産法人','農事組合法人','株式会社','合同会社',
  '集落営農','農地中間管理機構','農地バンク','農地賃借','小作料',
  '農業委員会','市町村農政','普及センター','農業試験場','JA営農指導',
  // ── 数値・単位（日付除外のため補強） ──
  'キロ','kg','トン','リットル','ml','アール','ヘクタール','ha','反','畝','坪',
  '本','株','粒','個','袋','箱','ケース','パック','束',
  // ── 時制・頻度（日本語口語） ──
  '今日','昨日','明日','明後日','来週','今週','先週','来月','先月','今月',
  '毎日','毎週','毎月','定期的に','週一','週二','隔週',
  '朝','午前','午後','昼','夕方','夜',
  // ── 口語・作業表現 ──
  'やった','した','行った','終わった','完了','済んだ','見た','確認した',
  'する予定','やる予定','行う予定','終わる予定','計画','予定',
  '少し','少量','たくさん','大量','全部','一部','半分',
  '問題なし','異常なし','良好','順調','不良','気になる','要確認',
];

// ─── 全登録語を一括収集（フィルタ照合用）───
// VM_TAG_DICT・VM_MATERIAL_DICT・VM_SHIPPING_DICT からも自動収集
function _vmBuildAllowedWords() {
  const set = new Set();
  // タグ辞書のキーワード
  VM_TAG_DICT.forEach(e => e.keywords.forEach(k => set.add(k)));
  // 資材辞書
  VM_MATERIAL_DICT.forEach(m => set.add(m));
  // 出荷先辞書のキー
  Object.keys(VM_SHIPPING_DICT).forEach(k => set.add(k));
  // 農業語リスト
  VM_AGRI_WORDS.forEach(w => set.add(w));
  // 長い語から順に並べ替え（部分マッチで短い語が先に当たるのを防ぐ）
  return [...set].sort((a, b) => b.length - a.length);
}

// キャッシュ（初回呼出時に生成）
let _vmAllowedWords = null;

/**
 * 音声認識テキストから未登録語を除去して返す。
 * 登録語の出現位置を [start, end] で収集し、マッチ間の未登録部分のみ削除。
 * 結果が空（または記号・空白のみ）なら「（解析済み）」を返す。
 *
 * @param {string} rawText  生の音声認識テキスト
 * @returns {string}        フィルタ済みテキスト
 */
function vmFilterText(rawText) {
  if (!rawText) return '';
  if (!_vmAllowedWords) _vmAllowedWords = _vmBuildAllowedWords();

  // 各登録語が出現する全区間を収集
  const spans = []; // { start, end }
  for (const word of _vmAllowedWords) {
    let idx = 0;
    while (true) {
      const pos = rawText.indexOf(word, idx);
      if (pos === -1) break;
      spans.push({ start: pos, end: pos + word.length });
      idx = pos + 1;
    }
  }
  if (spans.length === 0) return '（解析済み）';

  // 区間を start 昇順→ end 降順でソートしてマージ
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [spans[0]];
  for (let i = 1; i < spans.length; i++) {
    const last = merged[merged.length - 1];
    if (spans[i].start <= last.end) {
      // 重複または隣接 → 拡張
      last.end = Math.max(last.end, spans[i].end);
    } else {
      merged.push(spans[i]);
    }
  }

  // マージ済み区間を結合（間の未登録部分は除去、スペースで繋ぐ）
  const parts = merged.map(s => rawText.slice(s.start, s.end));
  const result = parts.join('').trim();

  // 記号・数字のみ残った場合も「解析済み」扱い
  if (!result || /^[\s\u3000\-・。、！？!?0-9０-９]+$/.test(result)) {
    return '（解析済み）';
  }

  // ── 1-A：結果内の単語重複を除去 ──
  return _vmDeduplicateWords(result);
}

/**
 * テキスト内の重複単語を除去する（1-A）
 * 例：「施肥施肥10kg」→「施肥10kg」
 */
function _vmDeduplicateWords(text) {
  if (!text || !_vmAllowedWords) return text;
  const words = [..._vmAllowedWords].sort((a, b) => b.length - a.length);
  let result = text;
  for (const word of words) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = result.match(re);
    if (matches && matches.length > 1) {
      let first = true;
      result = result.replace(re, () => {
        if (first) { first = false; return word; }
        return '';
      });
    }
  }
  return result.replace(/[\s\u3000]{2,}/g, '　').trim();
}

/**
 * 既存テキストに追加テキストをマージする（1-B）
 * 追加側にある単語は追加側で上書き、ない単語は既存を保持
 * 例：既存「トマト施肥10kg」＋追加「施肥15kg」→「トマト　施肥15kg」
 */
function _vmMergeTexts(existing, added) {
  if (!existing) return added;
  if (!added)    return existing;
  if (!_vmAllowedWords) _vmAllowedWords = _vmBuildAllowedWords();

  const words = [..._vmAllowedWords].sort((a, b) => b.length - a.length);

  // 追加テキストに含まれる単語セットを収集
  const addedWords = new Set();
  for (const word of words) {
    if (added.includes(word)) addedWords.add(word);
  }

  // 既存テキストから追加側に含まれる単語を除去
  let cleanedExisting = existing;
  for (const word of addedWords) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    cleanedExisting = cleanedExisting.replace(re, '');
  }
  cleanedExisting = cleanedExisting.replace(/[\s\u3000]{2,}/g, '　').trim();

  return cleanedExisting ? cleanedExisting + '　' + added : added;
}

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
// 戻り値: { date: 'YYYY-MM-DD', monthUnknown: bool, dateUnresolved: bool, matchedText: string|null }
// monthUnknown: 日は分かるが月が不明（月選択 UIで補完）
// dateUnresolved: 手がかりが一切見つからず「今日」を仮置きした（手動修正必須）
// matchedText: 日付として消費した生文字列（数量・単位抽出から除外するために使う）
function _vmParseDateFragment(text) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const lastDayOfMonth = (year, month0) => new Date(year, month0 + 1, 0).getDate();

  let m;
  if ((m = text.match(/今日|本日|きょう/))) return { date: fmt(now), monthUnknown: false, dateUnresolved: false, matchedText: m[0] };
  if ((m = text.match(/明後日|あさって/))) {
    const d = new Date(now); d.setDate(d.getDate() + 2);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: m[0] };
  }
  if ((m = text.match(/明日|あした|あす/))) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: m[0] };
  }
  if ((m = text.match(/昨日|きのう/))) {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: m[0] };
  }
  // （N）日後 ─ 「3日後」など。「〇日」単体より先に判定して誤認を防ぐ
  const daysAfterMatch = text.match(/(\d{1,3})\s*日後/);
  if (daysAfterMatch) {
    const d = new Date(now); d.setDate(d.getDate() + parseInt(daysAfterMatch[1]));
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: daysAfterMatch[0] };
  }
  // 再来週〇曜（来週より先に判定）── 「今週の月曜」を基準に+14してから対象曜日へ
  const reweekMatch = text.match(/再来週\s*(?:の\s*)?(月|火|水|木|金|土|日)?/);
  if (reweekMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const d = new Date(now);
    const daysSinceMonday = (d.getDay() - 1 + 7) % 7;
    d.setDate(d.getDate() - daysSinceMonday + 14); // 再来週の月曜
    if (reweekMatch[1]) {
      const targetOffset = (dowMap[reweekMatch[1]] - 1 + 7) % 7;
      d.setDate(d.getDate() + targetOffset);
    }
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: reweekMatch[0] };
  }
  // 来週〇曜 ── 「今週の月曜」を基準に+7してから対象曜日へ
  const weekMatch = text.match(/来週\s*(?:の\s*)?(月|火|水|木|金|土|日)/);
  if (weekMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const d = new Date(now);
    const daysSinceMonday = (d.getDay() - 1 + 7) % 7;
    d.setDate(d.getDate() - daysSinceMonday + 7); // 来週の月曜
    const targetOffset = (dowMap[weekMatch[1]] - 1 + 7) % 7;
    d.setDate(d.getDate() + targetOffset);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: weekMatch[0] };
  }
  // 今週〇曜 / 〇曜日（次に来るその曜日。指定なしの「〇曜日」もここでカバー）
  const thiswMatch = text.match(/(今週\s*)?(月|火|水|木|金|土|日)曜/);
  if (thiswMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const d = new Date(now);
    let diff = (dowMap[thiswMatch[2]] - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: thiswMatch[0] };
  }
  // 〇月〇日（月が明示されている）── 年補正は行わず常に今年として扱う（作業メモは過去記録が多いため）
  const mdMatch = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (mdMatch) {
    const d = new Date(now.getFullYear(), parseInt(mdMatch[1])-1, parseInt(mdMatch[2]));
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: mdMatch[0] };
  }
  // 今月末 / 月末
  const monthEndMatch = text.match(/(今月末|月末)/);
  if (monthEndMatch) {
    const day = lastDayOfMonth(now.getFullYear(), now.getMonth());
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: monthEndMatch[0] };
  }
  // 来月（の〇日）
  const nextMonthMatch = text.match(/来月\s*(?:の)?\s*(\d{1,2})?日?/);
  if (nextMonthMatch && text.includes('来月')) {
    const day = nextMonthMatch[1] ? parseInt(nextMonthMatch[1]) : 1;
    const d = new Date(now.getFullYear(), now.getMonth() + 1, day);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: nextMonthMatch[0] };
  }
  // 先月（の〇日）
  const lastMonthMatch = text.match(/先月\s*(?:の)?\s*(\d{1,2})?日?/);
  if (lastMonthMatch && text.includes('先月')) {
    const day = lastMonthMatch[1] ? parseInt(lastMonthMatch[1]) : 1;
    const d = new Date(now.getFullYear(), now.getMonth() - 1, day);
    return { date: fmt(d), monthUnknown: false, dateUnresolved: false, matchedText: lastMonthMatch[0] };
  }
  // 〇日のみ（月が不明）→ monthUnknown フラグを立てて今月の日付を仮置き
  const dayMatch = text.match(/(?<![月\d])(\d{1,2})日(?!後)(?!間)/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    // 今月の日付として仮置き（ダイアログで月を確認する）
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    return { date: fmt(d), monthUnknown: true, dateUnresolved: false, matchedText: dayMatch[0] };
  }
  // どのパターンにも一致しない ── 「今日」として黙説しに確定せず、手動確認を促す
  return { date: fmt(now), monthUnknown: false, dateUnresolved: true, matchedText: null };
}

// ─── テキスト全体から作業日・出荷日を分離して解析 ───
// 戻り値: { workDate, shipDate, workMonthUnknown, shipMonthUnknown, workDateUnresolved, shipDateUnresolved }
function vmParseDate(text) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  // 日付手がかり文字クラス（新表現：先月・今月末・月末・再来週・N日後 にも対応）
  const DC = '今昨明あ来先今週月末再\\d〇';

  // 出荷日コンテキスト：「出荷は〇日」「〇日に出荷」パターン
  const shipCtxPatterns = [
    new RegExp(`出荷(?:は|が|を|日)?[はがをに]?\\s*([${DC}].{0,12}?(?:日|曜|後))`),
    new RegExp(`([${DC}].{0,12}?(?:日|曜|後))[にはがを]?出荷`),
  ];
  // 作業日コンテキスト：「収穫は〇日」「〇日に定植」など
  const workCtxPatterns = [
    new RegExp(`(?:収穫|定植|播種|作業|耕起|施肥|防除|除草|灌水|乾燥|籾摺り)(?:は|が|を|日)?[はがをに]?\\s*([${DC}].{0,12}?(?:日|曜|後))`),
    new RegExp(`([${DC}].{0,12}?(?:日|曜|後))[にはがを]?(?:収穫|定植|播種|作業|耕起|施肥|防除|除草|灌水)`),
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

  // 日付として消費された生文字列（数量・単位抽出から除外するために使う）
  const dateMatchedTexts = [
    workResult ? workResult.matchedText : (workRaw ? null : fallback.matchedText),
    shipResult ? shipResult.matchedText : null,
  ].filter(Boolean);

  return {
    workDate:           workResult ? workResult.date  : fallback.date,
    shipDate:           shipResult ? shipResult.date  : null,
    workMonthUnknown:   workResult ? workResult.monthUnknown : fallback.monthUnknown,
    shipMonthUnknown:   shipResult ? shipResult.monthUnknown : false,
    workDateUnresolved: workResult ? workResult.dateUnresolved : fallback.dateUnresolved,
    shipDateUnresolved: shipResult ? shipResult.dateUnresolved : false,
    dateMatchedTexts,
  };
}

// ─────────────────────────────────────────
//  テキスト解析
// ─────────────────────────────────────────

function vmParseText(rawText) {
  const text = rawText;

  // 日付（作業日・出荷日を分離）
  const dateResult = vmParseDate(text);
  const workDate           = dateResult.workDate;
  const shipDate           = dateResult.shipDate;
  const workMonthUnknown   = dateResult.workMonthUnknown;
  const shipMonthUnknown   = dateResult.shipMonthUnknown;
  const workDateUnresolved = dateResult.workDateUnresolved;
  const shipDateUnresolved = dateResult.shipDateUnresolved;

  // 日付として消費済みの文字列をテキストから除去（数量・単位抽出が「15日」「3日後」等を
  // 誤って数量として拾わないようにするため。タグ・作物・資材の判定には影響させない）
  let textForUnit = text;
  for (const mt of dateResult.dateMatchedTexts) {
    if (mt) textForUnit = textForUnit.split(mt).join('');
  }

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

  // 数量・単位（日付除去済みテキストから抽出。「3日間作業」のような期間表現の「日」は
  // 日付として消費されていなければそのまま拾える）
  let quantity = null;
  const unitMatch = textForUnit.match(VM_UNIT_PATTERN);
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
    workDateUnresolved, shipDateUnresolved,
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

// ─── 登録語キャッシュを強制リセット（cropDB遅延ロード後に呼ぶ） ───
function vmResetAllowedWordsCache() {
  _vmAllowedWords = null;
}

// ─────────────────────────────────────────
//  Web Speech API
//  continuous=true + 自前5秒無音タイマーで余裕を確保
// ─────────────────────────────────────────

let _vmRecognition  = null;
let _vmListening    = false;
let _vmSilenceTimer = null;   // 無音タイムアウトタイマー
let _vmFinalText    = '';     // 確定テキスト蓄積
let _vmInterimText  = '';     // 途中テキスト
let _vmCallback     = null;   // 認識完了コールバック（通常 or ダイアログ内）

const VM_SILENCE_MS = 5000;   // 無音検出閾値（ms）

// ─── 無音タイマーリセット ───
function _vmResetSilenceTimer() {
  clearTimeout(_vmSilenceTimer);
  _vmSilenceTimer = setTimeout(() => {
    // 無音5秒 → 認識確定
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
    btn.title = on ? '停止' : '音声入力で記録';
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

  // ダイアログ内マイクボタンの状態も同期（シンプルビュー／詳細ビュー両方）
  document.querySelectorAll('.vm-dlg-mic-btn').forEach(dlgBtn => {
    if (!dlgBtn.dataset.origText) dlgBtn.dataset.origText = dlgBtn.textContent;
    dlgBtn.classList.toggle('recording', on);
    dlgBtn.textContent = on ? '⏹ 停止' : dlgBtn.dataset.origText;
  });
}

// ─────────────────────────────────────────
//  確認ダイアログ
// ─────────────────────────────────────────

// ダイアログの現在タブ状態
let _vmDlgTab = 'work'; // 'work' | 'ship'

// シンプルビューに表示する項目のうち「未解決・要確認」フラグの現在状態
// （詳細ビューでの修正・追加録音・タグ候補選択・月選択のたびに更新される）
let _vmDlgWarnState = {
  workDateUnresolved: false,
  workMonthUnknown:   false,
  tagAmbiguous:        false,
};

// 予定／実績トグルをユーザーが手動操作したか（trueなら自動再判定で上書きしない）
let _vmDlgScheduleTouched = false;

// 補完質問フローの残りキュー
let _vmQuestionQueue = [];

function vmShowConfirmDialog(rawText, areaId) {
  _vmDlgTab = 'work';
  const parsed = vmParseText(rawText);
  if (areaId) parsed.areaId = areaId;

  _vmDlgWarnState = {
    workDateUnresolved: !!parsed.workDateUnresolved,
    workMonthUnknown:   !!parsed.workMonthUnknown,
    tagAmbiguous:        !!(parsed.tagAmbiguous && parsed.tagCandidates && parsed.tagCandidates.length > 1),
  };
  _vmDlgScheduleTouched = false;

  document.getElementById('vm-confirm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'vm-confirm-overlay';
  overlay.className = 'vm-confirm-overlay';
  overlay.innerHTML = _vmBuildDialogHTML(parsed, rawText, areaId);
  document.body.appendChild(overlay);

  vmSwitchView('simple');
  _vmBindMonthPickers(parsed);
  _vmBindSimpleSync();
  _vmCheckScheduleBanner(parsed.workDate);
}

// ─── 日付を「6月15日」形式に整形 ───
function _vmFormatDateJP(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!m || !d) return dateStr;
  return `${m}月${d}日`;
}

// ─── シンプルビュー：要約5行のHTML組み立て ───
// data = { workDate, tag, crop, quantity, note }
function _vmBuildSimpleRowsHTML(data) {
  let dateLabel = _vmFormatDateJP(data.workDate) || '未確認';
  let dateWarn = false;
  if (_vmDlgWarnState.workDateUnresolved) {
    dateLabel += '（未確認）';
    dateWarn = true;
  } else if (_vmDlgWarnState.workMonthUnknown) {
    dateLabel += '（月を確認）';
    dateWarn = true;
  }

  const tagLabel = data.tag && data.tag !== 'その他' ? data.tag : (data.tag || '未設定');
  const tagWarn = _vmDlgWarnState.tagAmbiguous || !data.tag || data.tag === 'その他';

  const cropLabel = data.crop ? data.crop : '（未入力）';
  const qtyLabel  = data.quantity ? data.quantity : '（未入力）';
  const noteLabel = data.note ? data.note : '（なし）';

  const rows = [
    { field: 'vm-work-date', label: '日付', value: dateLabel, warn: dateWarn },
    { field: 'vm-tag',       label: '作業', value: tagLabel,  warn: tagWarn },
    { field: 'vm-crop',      label: '作物', value: cropLabel, warn: false },
    { field: 'vm-quantity',  label: '量',   value: qtyLabel,  warn: false },
    { field: 'vm-note',      label: '📝 メモ', value: noteLabel, warn: false },
  ];

  return rows.map(r => `
    <div class="vm-simple-row${r.warn ? ' vm-simple-row-warn' : ''}" onclick="vmFocusDetailField('${r.field}')">
      <span class="vm-simple-row-label">${r.label}</span>
      <span class="vm-simple-row-value">${escHtml(r.value)}</span>
      <span class="vm-simple-row-arrow">›</span>
    </div>`).join('');
}

// ─── シンプルビューの要約表示を現在のDOM値で再描画 ───
function _vmRefreshSimpleRows() {
  const rowsEl = document.getElementById('vm-simple-rows');
  if (!rowsEl) return;
  const data = {
    workDate: document.getElementById('vm-work-date')?.value || '',
    tag:      document.getElementById('vm-tag')?.value || '',
    crop:     document.getElementById('vm-crop')?.value.trim() || '',
    quantity: document.getElementById('vm-quantity')?.value.trim() || '',
    note:     document.getElementById('vm-note')?.value.trim() || '',
  };
  rowsEl.innerHTML = _vmBuildSimpleRowsHTML(data);
}

// ─── シンプル行タップ → 詳細ビューに切替＋該当inputへフォーカス ───
function vmFocusDetailField(fieldId) {
  vmSwitchView('detail');
  setTimeout(() => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.focus();
      if (typeof el.select === 'function' && el.type !== 'date') el.select();
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, 0);
}

// ─── シンプル／詳細ビュー切替 ───
function vmSwitchView(view) {
  const simple = document.getElementById('vm-simple-view');
  const detail = document.getElementById('vm-detail-view');
  if (simple) simple.style.display = view === 'simple' ? '' : 'none';
  if (detail) detail.style.display = view === 'detail' ? '' : 'none';
}

// ─── 詳細ビュー側の主要項目を編集 → シンプルビューへ同期するバインド ───
function _vmBindSimpleSync() {
  const dateEl = document.getElementById('vm-work-date');
  if (dateEl) {
    dateEl.addEventListener('input', () => {
      dateEl.classList.remove('vm-input-unresolved');
      _vmDlgWarnState.workDateUnresolved = false;
      _vmRefreshSimpleRows();
    });
  }
  ['vm-tag', 'vm-crop', 'vm-quantity'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', _vmRefreshSimpleRows);
    el.addEventListener('change', _vmRefreshSimpleRows);
  });
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

  // 日付が一切特定できなかった場合の警告（月選択UIとは別。手動で日付inputを直接修正させる）
  const workDateUnresolvedHTML = parsed.workDateUnresolved
    ? `<div class="vm-date-unresolved-hint">⚠️ 日付が特定できませんでした。手動で選んでください</div>`
    : '';
  const shipDateUnresolvedHTML = parsed.shipDateUnresolved
    ? `<div class="vm-date-unresolved-hint">⚠️ 日付が特定できませんでした。手動で選んでください</div>`
    : '';

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

  const simpleRowsHTML = _vmBuildSimpleRowsHTML({
    workDate: parsed.workDate,
    tag:      parsed.tag,
    crop:     parsed.crop,
    quantity: parsed.quantity,
  });

  return `
    <div class="vm-confirm-dialog">

      <!-- ヘッダー（共通） -->
      <div class="vm-confirm-header">
        <span class="vm-confirm-title">🎤 音声入力 確認</span>
        <button class="vm-confirm-close" onclick="vmCloseConfirmDialog()">✕</button>
      </div>

      <!-- ═══ シンプルビュー（既定表示） ═══ -->
      <div class="vm-simple-view" id="vm-simple-view">

        <!-- 予定／実績トグル -->
        <div class="vm-schedule-banner" id="vm-schedule-banner">
          <span class="vm-schedule-label">📅 これは<strong>予定</strong>ですか？<strong>実績</strong>ですか？</span>
          <div class="vm-schedule-btn-row">
            <button type="button" class="vm-banner-yes" id="vm-banner-yes" onclick="vmSetSchedule(true)">📅 予定</button>
            <button type="button" class="vm-banner-no"  id="vm-banner-no"  onclick="vmSetSchedule(false)">✅ 実績</button>
          </div>
        </div>
        <input type="hidden" id="vm-is-schedule" value="0">

        <!-- 補完質問フロー（不十分な項目がある時のみ表示） -->
        <div class="vm-question-flow" id="vm-question-flow" style="display:none;"></div>

        <!-- 要約表示 -->
        <div class="vm-simple-rows" id="vm-simple-rows">${simpleRowsHTML}</div>

        <!-- アクション -->
        <div class="vm-simple-actions">
          <button type="button" class="vm-simple-mic-btn vm-dlg-mic-btn"
            onclick="vmDlgAddRecording('${areaId || ''}')">🎤 もう一度話す</button>
          <button type="button" class="vm-simple-detail-btn" onclick="vmSwitchView('detail')">詳しく入力する</button>
          <button type="button" class="btn btn-primary" onclick="vmCheckAndCommit('${areaId || ''}')">この内容で保存</button>
        </div>

      </div><!-- /vm-simple-view -->

      <!-- ═══ 詳細ビュー（既存フォーム・初期非表示） ═══ -->
      <div class="vm-detail-view" id="vm-detail-view" style="display:none;">

        <button type="button" class="vm-back-to-simple" onclick="vmSwitchView('simple')">← かんたん表示に戻る</button>

        <!-- タブ -->
        <div class="vm-dlg-tabs">
          <button class="vm-dlg-tab active" id="vm-tab-work"
            onclick="vmSwitchDlgTab('work')">📋 作業メモ</button>
          <button class="vm-dlg-tab" id="vm-tab-ship"
            onclick="vmSwitchDlgTab('ship')">📦 出荷記録</button>
        </div>

        <!-- ボディ -->
        <div class="vm-confirm-body">

          <!-- 認識テキスト + 追加録音 -->
          <div class="vm-field vm-field-mic-row">
            <label class="vm-label">認識テキスト</label>
            <div class="vm-raw-row">
              <textarea class="vm-textarea" id="vm-raw-text" rows="2">${escHtml(vmFilterText(rawText))}</textarea>
              <button type="button" class="vm-dlg-mic-btn"
                onclick="vmDlgAddRecording('${areaId || ''}')">🎤 追加録音</button>
            </div>
          </div>

          <!-- 作業メモタブ -->
          <div id="vm-panel-work">
            <div class="vm-field-row">
              <div class="vm-field">
                <label class="vm-label">作業日</label>
                <input class="vm-input${parsed.workDateUnresolved ? ' vm-input-unresolved' : ''}" type="date" id="vm-work-date" value="${parsed.workDate}">
                ${workDateUnresolvedHTML}
                ${workMonthPickerHTML}
              </div>
              <div class="vm-field">
                <label class="vm-label">出荷日</label>
                <input class="vm-input${parsed.shipDateUnresolved ? ' vm-input-unresolved' : ''}" type="date" id="vm-ship-date" value="${parsed.shipDate || ''}">
                ${shipDateUnresolvedHTML}
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
              <div class="vm-field vm-field-note">
                <label class="vm-label">📝 メモ（任意）</label>
                <textarea class="vm-input vm-textarea-note" id="vm-note" rows="3" placeholder="補足・気づき・状況など自由に記入"></textarea>
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
          <button class="btn btn-primary" onclick="vmCheckAndCommit('${areaId || ''}')">保存する</button>
        </div>

      </div><!-- /vm-detail-view -->

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

// ─── 予定／実績トグル：未来日付ならデフォルトで「予定」をハイライト（自動判定・上書き不可） ───
function _vmCheckScheduleBanner(workDate) {
  if (!workDate) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(workDate);
  vmSetSchedule(target > today, false);
}

// ─── 予定／実績を選択（選び直し可能）。isManual=trueの場合は自動再判定で上書きされなくなる ───
function vmSetSchedule(isSchedule, isManual = true) {
  if (isManual) _vmDlgScheduleTouched = true;
  document.getElementById('vm-is-schedule').value = isSchedule ? '1' : '0';
  document.getElementById('vm-banner-yes')?.classList.toggle('active', isSchedule);
  document.getElementById('vm-banner-no')?.classList.toggle('active', !isSchedule);
}

// ─── ダイアログ内追加録音 ───
function vmDlgAddRecording(areaId) {
  if (_vmListening) { vmStopListening(); return; }
  vmStartListening(areaId, (addedText) => {
    const filteredAdded = vmFilterText(addedText);
    const isUnparsed = filteredAdded === '（解析済み）';

    const ta = document.getElementById('vm-raw-text');
    if (ta && !isUnparsed) {
      // 1-B：既存テキストと単語レベルでマージ（追加側上書き）
      ta.value = _vmMergeTexts(ta.value || '', filteredAdded);
    }
    // フィールド補完は常に実行（解析不明でも日付・タグが取れる場合がある）
    _vmApplyParsedToDialog(addedText, true);

    showToast(isUnparsed ? '🎤 フィールドを補完しました' : '🎤 テキストを追加しました', 'green');
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

  // 日付未解決の強調表示を更新（追加録音で日付が新たに確定した場合は警告を外す）
  const workDateEl = document.getElementById('vm-work-date');
  if (workDateEl && !p.workDateUnresolved) {
    workDateEl.classList.remove('vm-input-unresolved');
    _vmDlgWarnState.workDateUnresolved = false;
  }
  const shipDateEl = document.getElementById('vm-ship-date');
  if (shipDateEl && !p.shipDateUnresolved) shipDateEl.classList.remove('vm-input-unresolved');

  if (p.tag && p.tag !== 'その他') {
    const sel = document.getElementById('vm-tag');
    if (sel && (!additive || !sel.value || sel.value === 'その他')) {
      sel.value = p.tag;
      _vmDlgWarnState.tagAmbiguous = false;
    }
  }
  if (p.shipping) {
    const hidden = document.getElementById('vm-ship-type');
    if (hidden && (!additive || !hidden.value)) vmSelectShipType(p.shipping);
  }

  // 予定トグル再チェック（ユーザーが手動で選択済みの場合は上書きしない）
  const wd = document.getElementById('vm-work-date')?.value;
  if (wd && !_vmDlgScheduleTouched) _vmCheckScheduleBanner(wd);

  // シンプルビューの要約表示を最新状態に同期
  _vmRefreshSimpleRows();
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
  _vmDlgWarnState.tagAmbiguous = false;
  _vmRefreshSimpleRows();
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
      _vmDlgWarnState.workMonthUnknown = false;
      _vmRefreshSimpleRows();
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

// ─── 日誌文の自動生成 ───
function _vmBuildDiaryText({ workDate, tag, crop, material, quantity, isSchedule, areaId }) {
  const parts = [];

  // 日付
  if (workDate) {
    const d = new Date(workDate);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    parts.push(`${m}月${day}日`);
  }

  // エリア名
  if (areaId && typeof savedAreas !== 'undefined' && Array.isArray(savedAreas)) {
    const area = savedAreas.find(a => a.id === areaId);
    if (area?.name) parts.push(`${area.name}にて`);
  }

  // 作物＋タグ
  const cropStr    = crop     ? `${crop}の` : '';
  const tagStr     = tag && tag !== 'その他' ? tag : '作業';
  const materialStr = material ? `（${material}` : '';
  const qtyStr     = quantity  ? (materialStr ? ` ${quantity}）` : `（${quantity}）`) : (materialStr ? '）' : '');
  parts.push(`${cropStr}${tagStr}${materialStr}${qtyStr}`);

  // 予定／実績
  parts.push(isSchedule ? 'を予定。' : 'を実施。');

  return parts.join('、').replace('、を', 'を').replace('、て、', 'て');
}

// ─── 保存前チェック：不十分なら質問フローを起動 ───
function vmCheckAndCommit(areaId) {
  const tag  = document.getElementById('vm-tag')?.value || 'その他';
  const dateUnresolved = _vmDlgWarnState.workDateUnresolved || _vmDlgWarnState.workMonthUnknown;
  const tagInsufficient = !tag || tag === 'その他' || _vmDlgWarnState.tagAmbiguous;

  // 不十分な項目をキューに積む（日付 → タグ の順）
  _vmQuestionQueue = [];
  if (dateUnresolved)   _vmQuestionQueue.push('date');
  if (tagInsufficient)  _vmQuestionQueue.push('tag');

  if (_vmQuestionQueue.length > 0) {
    _vmShowNextQuestion(areaId);
  } else {
    vmCommit(areaId);
  }
}

// ─── 次の質問を表示 ───
function _vmShowNextQuestion(areaId) {
  const qType = _vmQuestionQueue.shift();
  if (!qType) { vmCommit(areaId); return; }

  const container = document.getElementById('vm-question-flow');
  if (!container) { vmCommit(areaId); return; }

  let html = '';

  if (qType === 'date') {
    const today     = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const twoDays   = new Date(today); twoDays.setDate(today.getDate() - 2);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lbl = d => `${d.getMonth()+1}/${d.getDate()}`;
    html = `
      <div class="vm-question-banner">
        <span class="vm-question-label">📅 いつの作業ですか？</span>
        <div class="vm-question-btn-row">
          <button class="vm-question-btn" onclick="_vmAnswerDate('${fmt(today)}','${areaId}')">今日（${lbl(today)}）</button>
          <button class="vm-question-btn" onclick="_vmAnswerDate('${fmt(yesterday)}','${areaId}')">昨日（${lbl(yesterday)}）</button>
          <button class="vm-question-btn" onclick="_vmAnswerDate('${fmt(twoDays)}','${areaId}')">一昨日（${lbl(twoDays)}）</button>
          <button class="vm-question-btn vm-question-btn-other" onclick="vmFocusDetailField('vm-work-date')">その他の日付 →</button>
        </div>
      </div>`;
  } else if (qType === 'tag') {
    // スコア上位5タグ＋手動選択
    const rawText = document.getElementById('vm-raw-text')?.value || '';
    const parsed  = vmParseText(rawText);
    const candidates = (parsed.tagCandidates || []).slice(0, 5);
    // 候補がなければ頻出タグを提示
    const defaults = ['施肥','除草','収穫','定植','防除'];
    const tags = candidates.length > 0 ? candidates : defaults;
    const btnHtml = tags.map(t =>
      `<button class="vm-question-btn" onclick="_vmAnswerTag('${t}','${areaId}')">${t}</button>`
    ).join('');
    html = `
      <div class="vm-question-banner">
        <span class="vm-question-label">🌱 何をしましたか？</span>
        <div class="vm-question-btn-row">
          ${btnHtml}
          <button class="vm-question-btn vm-question-btn-other" onclick="vmFocusDetailField('vm-tag')">他の作業 →</button>
        </div>
      </div>`;
  }

  container.innerHTML = html;
  container.style.display = '';
  // アニメーション
  container.classList.remove('vm-question-in');
  requestAnimationFrame(() => container.classList.add('vm-question-in'));
}

// ─── 日付回答 ───
function _vmAnswerDate(dateStr, areaId) {
  const el = document.getElementById('vm-work-date');
  if (el) {
    el.value = dateStr;
    _vmDlgWarnState.workDateUnresolved = false;
    _vmDlgWarnState.workMonthUnknown   = false;
    el.classList.remove('vm-input-unresolved');
  }
  _vmRefreshSimpleRows();
  _vmShowNextQuestion(areaId);
}

// ─── タグ回答 ───
function _vmAnswerTag(tag, areaId) {
  const sel = document.getElementById('vm-tag');
  if (sel) sel.value = tag;
  _vmDlgWarnState.tagAmbiguous = false;
  _vmRefreshSimpleRows();
  // 質問フロー非表示
  const container = document.getElementById('vm-question-flow');
  if (container) container.style.display = 'none';
  _vmShowNextQuestion(areaId);
}

function vmCommit(areaId) {
  const rawTextRaw  = document.getElementById('vm-raw-text')?.value.trim() || '';
  const rawText     = rawTextRaw;
  const workDate   = document.getElementById('vm-work-date')?.value || '';
  const shipDate   = document.getElementById('vm-ship-date')?.value || null;
  const tag        = document.getElementById('vm-tag')?.value || 'その他';
  const crop       = document.getElementById('vm-crop')?.value.trim() || null;
  const material   = document.getElementById('vm-material')?.value.trim() || null;
  const quantity   = document.getElementById('vm-quantity')?.value.trim() || null;
  const isSchedule = document.getElementById('vm-is-schedule')?.value === '1';

  // C. メモが空なら日誌文を自動生成して補完
  let note = document.getElementById('vm-note')?.value.trim() || null;
  if (!note) {
    note = _vmBuildDiaryText({ workDate, tag, crop, material, quantity, isSchedule, areaId });
    const noteEl = document.getElementById('vm-note');
    if (noteEl) noteEl.value = note;
  }

  // 作業メモ保存
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
  showToast(`📝 音声入力を保存しました（${workDate} / ${tag} / ${label}）`);

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
      title="音声入力で記録">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
      </svg>
      <span>音声入力</span>
    </button>
    <div id="vm-recording-overlay" class="vm-recording-overlay" style="display:none;">
      <span class="vm-rec-dot"></span>
      <span id="vm-interim-text" class="vm-interim-text">音声認識中...</span>
      <button class="vm-stop-btn" onclick="vmStopListening()">停止</button>
    </div>
  `;
}