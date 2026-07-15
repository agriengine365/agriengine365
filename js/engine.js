// ═══════════════════════════════════════════
//  ENGINE — 気候推定 / スコアリング / 施肥計算
// ═══════════════════════════════════════════

// ─── CLIMATE ───
const CLIMATE_TABLE = [
  { latMin:24, latMax:27, name:'亜熱帯',      tempMean:23, rain:2100 },
  { latMin:27, latMax:31, name:'温暖帯南部',   tempMean:19, rain:1800 },
  { latMin:31, latMax:34, name:'温暖帯',       tempMean:17, rain:1600 },
  { latMin:34, latMax:37, name:'温帯',         tempMean:14, rain:1300 },
  { latMin:37, latMax:40, name:'冷温帯',       tempMean:11, rain:1200 },
  { latMin:40, latMax:43, name:'亜寒帯南部',   tempMean:8,  rain:1100 },
  { latMin:43, latMax:46, name:'亜寒帯',       tempMean:6,  rain:1000 },
];

function getClimate(lat) {
  return CLIMATE_TABLE.find(c => lat >= c.latMin && lat < c.latMax)
    || CLIMATE_TABLE[CLIMATE_TABLE.length - 1];
}

// 標高補正: 100mごとに約0.6℃低下
function elevCorrect(tempMean, elev) {
  return tempMean - (elev / 100) * 0.6;
}

// ─── SCORING ───

// カテゴリ別 旬あたり日照時間デフォルト（時間）
// phenology.js の SUNSHINE_DEFAULT と同値を維持すること
const SUNSHINE_DEFAULT_ENGINE = {
  grain:      { min: 4.5, opt: 6.5 },
  fruit:      { min: 5.5, opt: 7.5 },
  leafy:      { min: 3.0, opt: 5.0 },
  herb:       { min: 3.0, opt: 5.0 },
  root:       { min: 4.0, opt: 6.0 },
  legume:     { min: 4.5, opt: 6.5 },
  vegetable:  { min: 4.0, opt: 6.0 },
  mushroom:   { min: 1.0, opt: 2.0 },
  specialty:  { min: 3.5, opt: 5.5 },
  _default:   { min: 3.5, opt: 5.5 },
};

/**
 * scoreCrop(crop, areaData)
 *
 * areaData shape:
 *   { lat, elev, soilType, climate, ph, cultivationMode }
 *   - ph              : number | null   (null = 評価不能)
 *   - cultivationMode : 'openField' | 'greenhouse' | 'heatedGreenhouse'
 *                       未指定は 'openField' として扱う
 *
 * 配点:  緯度25 + 標高20 + 気温25 + 土壌15 + 降水量15 + 日照10 + pH15
 *        満点125点 → score/maxScore*100 でパーセント換算
 *
 * 欠損データの扱い（2026-06 再見直し）:
 *   - エリア側データ欠損（pH未入力・標高未取得等）            : 軸ごと除外（maxScoreから外す）
 *   - 作物DB側データ欠損（latMin/elevMax/soilTypes/phMin等）  : 軸ごと除外（maxScoreから外す）
 *     ※ 以前は緯度・標高・土壌のみ「中間点50%」を付与していたが、
 *       herb等の特定カテゴリ（120/223件）に欠損が集中しており、
 *       常に60点分（緯度25+標高20+土壌15、満点125点の48%）が固定値となって
 *       土地適性に関わらずスコアの底上げ／頭打ちが起きる（=他カテゴリと
 *       公平に比較できない）ことが判明したため廃止。
 *       全軸「除外」に統一し、評価できる軸だけで％換算する方式とした。
 *       （トレードオフ：評価軸が少ない作物はスコアの振れ幅が大きくなる）
 *     ※ pHはこれまでドキュメント上は除外と記載しつつ実装ではデフォルト
 *       範囲(5.0-7.5)で採点されてしまっていたため、本見直しで実装を修正。
 *
 * 返却:  { crop, score, details, viable, alert, cultivationMode }
 */
function scoreCrop(crop, areaData) {
  const {
    lat,
    elev,
    soilType,
    climate,
    ph   = null,
    cultivationMode = 'openField',
  } = areaData;

  let score    = 0;
  let maxScore = 0;
  const details = [];

  // ── 栽培方式ラベル ──
  const modeLabel = {
    openField:       '露地栽培',
    greenhouse:      'ハウス栽培',
    heatedGreenhouse:'加温ハウス栽培',
  }[cultivationMode] || '露地栽培';

  // ── 年均気温ベース（フォールバック用） ──
  // 下限比較: tempMeanMin - 4（ハウス時）、上限比較: rawBase のまま
  let rawBase = null;  // 補正なしの年均気温（上限判定・加温ハウス差分計算に使用）
  const isHouseMode = cultivationMode === 'greenhouse' || cultivationMode === 'heatedGreenhouse';
  if (climate) {
    rawBase = elev ? elevCorrect(climate.tempMean, elev) : climate.tempMean;
  }

  // ════════════════════════════════════════
  //  viable は常に true（スコアのみで評価）
  //  ※ 最低下限気温による除外は廃止
  //  ※ 2026-06見直し: 下限除外の復活は見送り、代わりに各軸で
  //     「深刻な不適合（スコアが実質0に到達）」を検知して
  //     alert メッセージに集約する方式に変更。
  //     viable=false への分岐（analysis.js / area.js のNG表示）は
  //     現状到達しない設計上のフォールバックとして意図的に残している。
  // ════════════════════════════════════════
  const viable = true;
  let alert    = null;

  // 深刻な不適合を軸ごとに記録 → 最後に優先度順で alert に集約
  let severeTemp = null;
  let severeLat  = null;
  let severeElev = null;
  let severeSoil = null;
  let severeRain = null;
  let severePh   = null;

  // ════════════════════════════════════════
  //  1. 緯度スコア (25点)
  //     latMin/latMax が作物DBに未定義の場合 → 軸を除外（maxScoreから外す）
  // ════════════════════════════════════════
  const c0 = crop.conditions;
  if (c0.latMin == null || c0.latMax == null) {
    details.push({ ok: null, text: '緯度範囲データなし（作物DB未整備）— 緯度軸は評価対象外' });
  } else if (lat !== null) {
    maxScore += 25;
    if (lat >= c0.latMin && lat <= c0.latMax) {
      score += 25;
      details.push({ ok: true, text: `緯度 ${lat.toFixed(2)}° — 適正範囲内` });
    } else {
      const dist = Math.min(Math.abs(lat - c0.latMin), Math.abs(lat - c0.latMax));
      const s    = Math.max(0, 25 - dist * 10);
      score += s;
      details.push({ ok: s > 0, text: `緯度 ${lat.toFixed(2)}° — 適正外 (${c0.latMin}–${c0.latMax}°)` });
      if (s <= 0) severeLat = `緯度がこの作物の適正範囲から大きく外れています（${c0.latMin}〜${c0.latMax}°、現在地${lat.toFixed(1)}°）`;
    }
  }

  // ════════════════════════════════════════
  //  2. 標高スコア (20点)
  //     elevMax が作物DBに未定義の場合 → 軸を除外（maxScoreから外す）
  // ════════════════════════════════════════
  if (crop.conditions.elevMax == null) {
    details.push({ ok: null, text: '標高制限データなし（作物DB未整備）— 標高軸は評価対象外' });
  } else {
    maxScore += 20;
    if (elev !== null) {
      if (elev <= crop.conditions.elevMax) {
        score += 20;
        details.push({ ok: true, text: `標高 ${Math.round(elev)}m — 適正範囲内` });
      } else {
        const over = elev - crop.conditions.elevMax;
        const s    = Math.max(0, 20 - over / 20);
        score += s;
        details.push({ ok: false, text: `標高 ${Math.round(elev)}m — 上限(${crop.conditions.elevMax}m)超過` });
        if (s <= 0) severeElev = `標高がこの作物の上限を大幅に超過しています（上限${crop.conditions.elevMax}m、現在地${Math.round(elev)}m）`;
      }
    }
  }

  // ════════════════════════════════════════
  //  3. 気温スコア (25点)
  //     月別データがあれば生育期間と突合せ、なければ年均気温フォールバック
  // ════════════════════════════════════════
  maxScore += 25;

  // 旬配列（areaData.climate.decadeArr から取得）
  const _decadeArr = climate?.decadeArr ?? null; // { tMax[36], tMin[36], tMean[36], sun[36] }
  const hasDecadeCols = _decadeArr &&
    Array.isArray(_decadeArr.tMean) && _decadeArr.tMean.length === 36;

  // ハウス補正:
  //   greenhouse      → 最低気温閾値(tempMeanMin)を-4℃して判定を緩める（下限）
  //   heatedGreenhouse → 旬別に個別計算するためここでは定義しない（下限）
  //   2026-07追加: 遮光・換気を想定し、上限(tempMeanMax)はハウス・加温共通で+2℃緩和する。
  //   実測データ(tMean等)自体は一切補正しない（閾値側のみ調整）。
  const houseMinOffset = cultivationMode === 'greenhouse' ? 4 : 0; // 閾値から引く量（正値）
  const isHeated       = cultivationMode === 'heatedGreenhouse';
  const houseMaxOffset = (cultivationMode === 'greenhouse' || isHeated) ? 2 : 0; // 上限に足す量（正値）

  // ── 生育旬を特定（0-indexed: 0=1月上旬 … 35=12月下旬）──
  let growthDecades = null; // null = 特定不能
  const cal = crop.calendar;
  if (cal && hasDecadeCols) {
    // calendar の生育系フェーズ（manage/harvest/sowing/sow/planting/seedling/transplant）から
    // 旬インデックスへ変換（月×3旬）。
    // 'prep'（休眠・準備期間）は生育旬に含めない。
    // 値は cropDB.js では月番号(1-12)で格納されているのが基本だが、
    // 'jan'-'dec' 形式の文字列が来ても解釈できるようにフォールバックも残す。
    const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const growthPhases = ['seedling','transplant','manage','harvest','sowing','planting','sow'];
    const flagged = new Set();
    growthPhases.forEach(phase => {
      if (!Array.isArray(cal[phase])) return;
      cal[phase].forEach(mk => {
        let mi = null;
        if (typeof mk === 'number' && mk >= 1 && mk <= 12) {
          mi = mk - 1; // 月番号(1-12) → 0-indexed
        } else if (typeof mk === 'string') {
          mi = monthKeys.indexOf(mk.toLowerCase());
        }
        if (mi !== null && mi >= 0) { flagged.add(mi*3); flagged.add(mi*3+1); flagged.add(mi*3+2); }
      });
    });
    if (flagged.size > 0) growthDecades = [...flagged].sort((a,b) => a-b);
  }

  if (!growthDecades && hasDecadeCols) {
    // growthPeriodMin/Max から生育可能旬を推定
    const c = crop.conditions;
    if (c.tempMeanMin != null && c.tempMeanMax != null) {
      const candidates = [];
      for (let i = 0; i < 36; i++) {
        const tMean = _decadeArr.tMean[i];
        if (tMean === null) continue;
        const tMin = _decadeArr.tMin[i];
        // 下限閾値を緩める（データ側は触らない）
        const effectiveTMin = c.tempMeanMin - houseMinOffset; // greenhouse: -4緩和
        const effectiveTMax = c.tempMeanMax + houseMaxOffset; // greenhouse/加温: +2緩和
        const tAdjusted = isHeated
          ? Math.max(tMean, c.tempMeanMin)
          : tMean;
        if (isHeated || (tAdjusted >= effectiveTMin && tAdjusted <= effectiveTMax)) {
          candidates.push({ idx: i, tMean: tMean }); // tMean は実測値のまま格納
        }
      }
      const gpMin = c.growthPeriodMin ?? 0;
      const gpMax = c.growthPeriodMax ?? 120;
      const targetDecades = Math.round((gpMin + gpMax) / 2 / 10);
      if (candidates.length > 0) {
        const sorted = [...candidates].sort((a,b) => b.tMean - a.tMean);
        const picked = sorted.slice(0, targetDecades);
        growthDecades = picked.map(p => p.idx).sort((a,b) => a-b);
      }
    }
  }

  // 加温ハウス: 特定不能なら全旬を生育旬とみなす
  if (isHeated && !growthDecades) {
    growthDecades = Array.from({length: 36}, (_, i) => i);
  }

  // decadeMatch: 36要素
  //   null        = 非生育旬
  //   true        = 適合
  //   'border'    = 境界（±2℃以内）
  //   false       = 不適合
  //   { heated, diff } = 加温ハウスで補填中
  let decadeMatch = null;
  // monthlyMatch: area.js の既存カラーバー互換（12要素）
  let monthlyMatch = null;

  if (hasDecadeCols && growthDecades && growthDecades.length > 0) {
    const c = crop.conditions;
    decadeMatch  = new Array(36).fill(null);
    monthlyMatch = new Array(12).fill(null);
    let totalPts = 0;

    growthDecades.forEach(i => {
      const tMean = _decadeArr.tMean[i];
      const tMin  = _decadeArr.tMin[i];
      const tMax  = _decadeArr.tMax[i];
      if (tMean === null) { decadeMatch[i] = null; return; }
      const tMin2 = c.tempMeanMin ?? -Infinity;
      const tMax2 = (c.tempMeanMax ?? Infinity) + houseMaxOffset; // 2026-07: ハウス/加温+2℃緩和

      if (isHeated) {
        if (tMean > tMax2 + 2) {
          decadeMatch[i] = false;
          totalPts += 0;
        } else {
          const diff = Math.max(0, tMin2 - tMean);
          const monthScore = diff === 0 ? 1.0
            : diff <= 5  ? 1.0 - diff * 0.06
            : diff <= 10 ? 0.7 - (diff - 5) * 0.06
            : Math.max(0.1, 0.4 - (diff - 10) * 0.06);
          decadeMatch[i] = { heated: true, diff: Math.round(diff * 10) / 10, score: monthScore };
          totalPts += monthScore;
        }
      } else {
        // 下限閾値を-houseMinOffset緩める（上限・データは無補正）
        const effectiveTMin = tMin2 - houseMinOffset; // greenhouse: tMin2-4
        if (tMean >= effectiveTMin && tMean <= tMax2) {
          decadeMatch[i] = true;
          totalPts += 1.0;
        } else if (tMean >= effectiveTMin - 2 && tMean <= tMax2 + 2) {
          decadeMatch[i] = 'border';
          totalPts += 0.5;
        } else {
          decadeMatch[i] = false;
          totalPts += 0;
        }
      }
    });

    // monthlyMatch: 各月3旬の多数決で月判定を生成（既存カラーバー互換）
    for (let m = 0; m < 12; m++) {
      const trio = [decadeMatch[m*3], decadeMatch[m*3+1], decadeMatch[m*3+2]];
      const nonNull = trio.filter(v => v !== null);
      if (nonNull.length === 0) { monthlyMatch[m] = null; continue; }
      if (nonNull.every(v => v === true))   { monthlyMatch[m] = true; continue; }
      if (nonNull.every(v => v === false))  { monthlyMatch[m] = false; continue; }
      if (nonNull.some(v => v?.heated))     { monthlyMatch[m] = nonNull.find(v => v?.heated); continue; }
      monthlyMatch[m] = 'border';
    }

    const total = growthDecades.length;
    score += Math.round(25 * (totalPts / total));

    if (isHeated) {
      const heatingDecades = decadeMatch.filter(v => v?.heated && v.diff > 0);
      const maxDiff = heatingDecades.length
        ? Math.max(...heatingDecades.map(v => v.diff))
        : 0;
      const label = heatingDecades.length === 0
        ? '加温不要（外気温で適合）'
        : `最大${maxDiff}℃補填が必要`;
      details.push({
        ok:   maxDiff < 10,
        text: `生育期気温（加温ハウス）— ${label}`,
        monthlyMatch,
        decadeMatch,
      });
      if (maxDiff >= 10) severeTemp = `加温が必要な期間の気温差が非常に大きく（最大${maxDiff}℃）、現実的な加温コストを超える可能性があります`;
    } else {
      const matchCount = decadeMatch.filter(v => v === true).length;
      const matchLabel = `${matchCount}/${total}旬適合`;
      details.push({
        ok:   matchCount >= total * 0.6,
        text: `生育期気温 — ${matchLabel}（${modeLabel}）`,
        monthlyMatch,
        decadeMatch,
      });
      if (total > 0 && matchCount < total * 0.3) severeTemp = `生育期間の気温適合度が低く（${matchLabel}）、生育不良のリスクが高い組み合わせです`;
    }
  } else if (rawBase !== null) {
    // フォールバック: 年均気温（旬別データなし）
    // 下限比較のみハウス補正（閾値を-4）、上限比較は生データそのまま
    const c = crop.conditions;
    if (isHeated) {
      // 加温ハウスは年均フォールバック時も viable=true・気温差でスコア
      const diff = Math.max(0, (c.tempMeanMin ?? 0) - rawBase);
      const pts  = diff === 0 ? 1.0
        : diff <= 5  ? 1.0 - diff * 0.06
        : diff <= 10 ? 0.7 - (diff - 5) * 0.06
        : Math.max(0.1, 0.4 - (diff - 10) * 0.06);
      score += Math.round(25 * pts);
      details.push({ ok: diff < 10, text: `加温ハウス — 年均気温差 ${diff.toFixed(1)}℃補填` });
      if (diff >= 10) severeTemp = `加温が必要な気温差が非常に大きく（${diff.toFixed(1)}℃）、現実的な加温コストを超える可能性があります`;
    } else {
      // 下限: ハウス時は閾値を-4緩和 / 上限: ハウス・加温時は+2緩和（2026-07: 遮光・換気想定）
      const effectiveTMin = (c.tempMeanMin ?? -Infinity) - (isHouseMode ? 4 : 0);
      const effectiveTMax = (c.tempMeanMax ??  Infinity) + houseMaxOffset;
      const ok = rawBase >= effectiveTMin && rawBase <= effectiveTMax;
      if (ok) {
        score += 25;
        const label = isHouseMode ? `${modeLabel}（下限-4℃/上限+2℃緩和）` : modeLabel;
        details.push({ ok: true,  text: `推定年均気温 ${rawBase.toFixed(1)}℃ — 適正（${label}）` });
      } else {
        const effMinLabel = isHouseMode ? `${c.tempMeanMin}-4` : c.tempMeanMin;
        const effMaxLabel = isHouseMode ? `${c.tempMeanMax}+2` : c.tempMeanMax;
        details.push({ ok: false, text: `推定年均気温 ${rawBase.toFixed(1)}℃ — 適正外(${effMinLabel}–${effMaxLabel}℃)` });
        const tempDist = rawBase < effectiveTMin ? (effectiveTMin - rawBase) : (rawBase - effectiveTMax);
        if (tempDist >= 3) severeTemp = `推定年均気温が適正範囲から大きく外れています（${effMinLabel}〜${effMaxLabel}℃、推定${rawBase.toFixed(1)}℃）`;
      }
    }
  }

  // ════════════════════════════════════════
  //  4. 土壌スコア (15点)
  //     soilTypes が作物DBに未定義の場合 → 軸を除外（maxScoreから外す）
  // ════════════════════════════════════════
  {
    // soilTypes が未定義の場合は [] でフォールバック
    const soilTypes = Array.isArray(crop.conditions.soilTypes) ? crop.conditions.soilTypes : [];
    if (soilTypes.length === 0) {
      details.push({ ok: null, text: '土壌タイプデータなし（作物DB未整備）— 土壌軸は評価対象外' });
    } else {
      maxScore += 15;
      if (soilType && soilType !== 'unknown') {
        if (soilTypes.includes(soilType)) {
          score += 15;
          details.push({ ok: true, text: '土壌タイプ — 適合' });
        } else {
          details.push({ ok: false, text: '土壌タイプ — 非推奨（土壌改良を要検討）' });
          severeSoil = `エリアの土壌タイプ（${soilType}）はこの作物には非推奨です。土壌改良を要検討してください`;
        }
      } else {
        // エリア側 未入力: 中間値 7点（従来どおり）
        score += 7;
        details.push({ ok: null, text: '土壌タイプ未入力 — 推定値使用' });
      }
    }
  }

  // ════════════════════════════════════════
  //  5. 降水量スコア (15点)
  //     2026-06 再設計: pH・標高と同系統の「適正範囲からの逸脱距離に
  //     対する線形減衰」に統一。750mm乖離で配点0になる傾斜
  //     （pHは3.0pH幅で0点、標高は400m超過で0点と同程度の厳しさ）。
  //     rainfallMin/Max が作物DBにない場合（12/223件）は引き続き除外。
  //     エリア側rainは緯度推定または実測AMeDASでほぼ常に値があるため対象外。
  // ════════════════════════════════════════
  const RAIN_FALLOFF_DISTANCE = 750; // mm: この距離乖離で配点が0になる
  {
    const rain    = climate?.rain ?? null;
    const rMin    = crop.conditions.rainfallMin ?? null;
    const rMax    = crop.conditions.rainfallMax ?? null;
    if (rain !== null && rMin !== null && rMax !== null) {
      maxScore += 15;
      if (rain >= rMin && rain <= rMax) {
        score += 15;
        details.push({ ok: true,  text: `年間降水量 ${rain}mm — 適正範囲(${rMin}–${rMax}mm)` });
      } else {
        const dist = Math.min(Math.abs(rain - rMin), Math.abs(rain - rMax));
        const s    = Math.max(0, 15 - (dist / RAIN_FALLOFF_DISTANCE) * 15);
        score += s;
        details.push({ ok: s > 0, text: `年間降水量 ${rain}mm — 適正外(${rMin}–${rMax}mm)` });
        if (s <= 0) severeRain = `年間降水量がこの作物の適正範囲から大きく外れています（${rMin}〜${rMax}mm、推定${rain}mm）`;
      }
    } else {
      details.push({ ok: null, text: '降水量データなし（作物DB未整備）— 降水量軸は評価対象外' });
    }
  }

  // ════════════════════════════════════════
  //  6. 日照スコア (10点)
  //     旬別 sun[36] があれば生育旬の積算で評価
  //     なければ estimateSunshineHours(lat) フォールバック
  // ════════════════════════════════════════
  {
    // 2026-07修正: crop.conditions.category はDBに存在しないため常にundefinedとなり、
    // 常に_defaultへフォールバックしていた。calculateProfitability(879行目)と
    // 同じパターンで crop.category へのフォールバックを追加し、カテゴリ別の
    // 日照デフォルト（葉物3.0h/果樹5.5h等）が実際に機能するよう修正。
    const sunDef = SUNSHINE_DEFAULT_ENGINE[crop.conditions?.category || crop.category]
      || SUNSHINE_DEFAULT_ENGINE._default;
    const sunDecadeMin = crop.conditions.sunDecadeMin ?? sunDef.min;
    const sunDecadeOpt = crop.conditions.sunDecadeOpt ?? sunDef.opt;

    const hasSunDecade = hasDecadeCols &&
      Array.isArray(_decadeArr.sun) && _decadeArr.sun.length === 36;

    if (hasSunDecade && growthDecades && growthDecades.length > 0) {
      // 生育旬の日照を積算評価
      let sunScore = 0;
      let sunN = 0;
      growthDecades.forEach(i => {
        const s = _decadeArr.sun[i];
        if (s === null || s === undefined) return;
        if (s >= sunDecadeOpt) {
          sunScore += 1.0;
        } else if (s >= sunDecadeMin) {
          sunScore += (s - sunDecadeMin) / (sunDecadeOpt - sunDecadeMin);
        } else {
          sunScore += Math.max(0, s / sunDecadeMin * 0.5);
        }
        sunN++;
      });

      if (sunN > 0) {
        maxScore += 10;
        const pts  = Math.round(10 * (sunScore / sunN));
        score += pts;
        const pctStr = Math.round((sunScore / sunN) * 100);
        details.push({
          ok: pctStr >= 60,
          text: `生育期日照 — 充足度${pctStr}%（旬別実測値）`,
        });
      } else {
        details.push({ ok: null, text: '生育期日照データなし — 日照軸は評価対象外' });
      }
    } else if (lat !== null) {
      // フォールバック: 緯度推定年間日照時間
      const estSun = estimateSunshineHours(lat);
      // 年間日照 → 旬平均に換算（36旬）
      const estPerDecade = estSun / 36;
      maxScore += 10;
      if (estPerDecade >= sunDecadeOpt) {
        score += 10;
        details.push({ ok: true,  text: `推定年間日照 ${Math.round(estSun)}h — 十分（緯度推定値）` });
      } else if (estPerDecade >= sunDecadeMin) {
        const pts = Math.round(10 * (estPerDecade - sunDecadeMin) / (sunDecadeOpt - sunDecadeMin));
        score += pts;
        details.push({ ok: pts >= 5, text: `推定年間日照 ${Math.round(estSun)}h — やや不足（緯度推定値）` });
      } else {
        details.push({ ok: false, text: `推定年間日照 ${Math.round(estSun)}h — 不足（緯度推定値）` });
      }
    } else {
      details.push({ ok: null, text: '日照データなし — 日照軸は評価対象外' });
    }
  }

  // ════════════════════════════════════════
  //  7. pH スコア (15点)
  //     エリア側(ph)・作物DB側(phMin/phMax)のどちらかが欠損 → 軸を除外
  //     2026-06修正: 旧実装はcrop側phMin/phMax欠損時にデフォルト値
  //     (5.0-7.5)で採点してしまっており、ドキュメントの「除外」と
  //     実装が不一致だったため修正（対象12/223件）。
  // ════════════════════════════════════════
  if (c0.phMin == null || c0.phMax == null) {
    details.push({ ok: null, text: 'pH範囲データなし（作物DB未整備）— pH軸は評価対象外' });
  } else if (ph !== null) {
    maxScore += 15;
    const phMin = c0.phMin;
    const phMax = c0.phMax;

    if (ph >= phMin && ph <= phMax) {
      score += 15;
      details.push({ ok: true, text: `土壌pH ${ph.toFixed(1)} — 適正範囲(${phMin}–${phMax})` });
    } else {
      // 範囲外: 0.5pt / 0.1pH 単位で線形減点、最低0
      const dist = Math.min(Math.abs(ph - phMin), Math.abs(ph - phMax));
      const s    = Math.max(0, 15 - Math.round(dist / 0.1) * 0.5);
      score += s;
      details.push({ ok: false, text: `土壌pH ${ph.toFixed(1)} — 適正外(${phMin}–${phMax})、矯正推奨` });
      if (s <= 0) severePh = `土壌pHがこの作物の適正範囲から大きく外れています（${phMin}〜${phMax}、現在${ph.toFixed(1)}）。矯正が必須です`;
    }
  } else {
    // pH 情報なし(エリア側): maxScore に加算せず評価不能扱い
    details.push({ ok: null, text: 'pH未入力 — pH軸は評価対象外' });
  }

  // ════════════════════════════════════════
  //  深刻な不適合を優先度順に集約してalertへ
  //  優先度: 気温 > 緯度/標高（地理的制約） > 土壌 > 降水量 > pH
  //  最大2件まで表示（banner/cr-alertが長くなりすぎないよう制限）
  // ════════════════════════════════════════
  {
    const severeIssues = [severeTemp, severeLat, severeElev, severeSoil, severeRain, severePh]
      .filter(Boolean);
    if (severeIssues.length > 0) {
      alert = severeIssues.slice(0, 2).join('／');
    }
  }

  // ════════════════════════════════════════
  //  最終スコア (パーセント換算)
  // ════════════════════════════════════════
  const pct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;

  // decadeMatch / monthlyMatch を details から抽出してトップレベルに昇格
  const _mmDetail      = details.find(d => d.monthlyMatch || d.decadeMatch);
  const _monthlyMatch  = _mmDetail?.monthlyMatch  ?? monthlyMatch  ?? null;
  const _decadeMatch   = _mmDetail?.decadeMatch   ?? decadeMatch   ?? null;

  return {
    crop, score: pct, details, viable, alert, cultivationMode,
    monthlyMatch: _monthlyMatch,
    decadeMatch:  _decadeMatch,
  };
}

function calcConfidence(areaData) {
  let pts = 0;
  const items = [];
  if (areaData.lat)     { pts += 30; items.push('緯度情報 ✓'); }
  if (areaData.elev)    { pts += 25; items.push('標高情報 ✓'); }
  if (areaData.climate) { pts += 20; items.push('気候推定 ✓'); }
  if (areaData.soilType && areaData.soilType !== 'unknown') {
    pts += 25; items.push('土壌タイプ ✓');
  } else {
    items.push('土壌タイプ 未入力（精度↓）');
  }
  return { pct: pts, items };
}

// 2026-06削除: renderCropRanking()/scoreClass() は #crop-ranking への描画用に
// 開発初期に実装されたが、現在は area.js の _adpRenderRankingList() が実際の
// 描画を担っており、どこからも呼ばれていないデッドコードだったため削除した。

// ─── FERTILIZER ───
/**
 * calcFertilizer(crop, areaSqm, purchaseCount?)
 *
 * 施肥量を計算する。
 *   - 面積基準: 既存の N/P/K kg/10a × areaSqm（常に計算）
 *   - 株数基準: fertilizer.perPlant(g/株) × purchaseCount（データと株数が揃った場合のみ）
 *
 * @param {object} crop          - cropDB作物オブジェクト
 * @param {number} areaSqm       - 対象面積(㎡)
 * @param {number|null} purchaseCount - 欠株率反映済み購入予定株数。null=株数基準スキップ
 * @returns {object|null}
 *   {
 *     N, P, K      : string  // 面積基準 kg
 *     area10a      : string  // 対象面積 (10a)
 *     notes        : string
 *     perPlant     : {       // 株数基準。データ未整備またはpurchaseCount未指定時はnull
 *       N, P, K    : string  // 株数基準 kg（g/株 × 株数 ÷ 1000）
 *       purchaseCount: number
 *     } | null
 *   }
 */
function calcFertilizer(crop, areaSqm, purchaseCount = null) {
  // fertilizer が null の作物（CSV由来データ等）はスキップ
  if (!crop.fertilizer) return null;
  const per10a  = crop.fertilizer;
  const area10a = areaSqm / 1000; // 1000㎡ = 10a

  // 株数基準: perPlant があり、有効な購入株数が渡された場合のみ計算
  let perPlantResult = null;
  const pp = per10a.perPlant;
  if (pp && purchaseCount != null && purchaseCount > 0) {
    perPlantResult = {
      N: (pp.N * purchaseCount / 1000).toFixed(2),
      P: (pp.P * purchaseCount / 1000).toFixed(2),
      K: (pp.K * purchaseCount / 1000).toFixed(2),
      purchaseCount,
    };
  }

  return {
    N:       (per10a.N * area10a).toFixed(1),
    P:       (per10a.P * area10a).toFixed(1),
    K:       (per10a.K * area10a).toFixed(1),
    area10a: area10a.toFixed(2),
    notes:   per10a.notes,
    perPlant: perPlantResult,
  };
}
// Core land-profile and profitability model.
function toNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function riskLevelFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function estimateSunshineHours(lat) {
  const n = toNum(lat, 35);
  if (n < 31) return 1850;
  if (n < 34) return 1900;
  if (n < 37) return 2050;
  if (n < 40) return 1800;
  if (n < 43) return 1700;
  return 1600;
}

function estimateEnvironmentalRisk(areaData, correctedTemp) {
  const rain      = areaData.climate?.rain ?? areaData.annualRainfall ?? null;
  const slope     = toNum(areaData.slope, 0);
  const elev      = toNum(areaData.elev ?? areaData.elevation, 0);
  const temp      = toNum(correctedTemp, null);
  // AMeDAS実データがあれば真冬日日数でsnowRiskを補正
  const snowDays  = toNum(areaData.climate?.snowDays ?? areaData.meta?.amSnowDays, null);

  const floodRisk   = rain == null ? 25 : clamp((rain - 1100) / 9 + Math.max(0, 4 - slope) * 5, 0, 100);
  const droughtRisk = rain == null ? 25 : clamp((1150 - rain) / 8 + Math.max(0, slope - 8) * 3, 0, 100);
  // 推定値: 気温・標高ベース。AMeDAS真冬日日数があれば重み付きで補正
  const snowEstimate = temp == null ? 20 : clamp((10 - temp) * 8 + elev / 25, 0, 100);
  const snowRisk     = snowDays != null
    ? clamp(snowEstimate * 0.5 + clamp(snowDays / 60 * 100, 0, 100) * 0.5, 0, 100)
    : snowEstimate;

  return {
    floodRisk: Math.round(floodRisk),
    droughtRisk: Math.round(droughtRisk),
    snowRisk: Math.round(snowRisk),
    floodRiskLevel: riskLevelFromScore(floodRisk),
    droughtRiskLevel: riskLevelFromScore(droughtRisk),
    snowRiskLevel: riskLevelFromScore(snowRisk),
  };
}

function buildLandProfile(areaData = {}, soilInput = {}) {
  const lat = toNum(areaData.lat);
  const lng = toNum(areaData.lng);
  const elevation = toNum(areaData.elev ?? areaData.elevation);
  const climate = areaData.climate || (lat != null ? getClimate(lat) : null);
  const avgTemp = climate
    ? (elevation != null ? elevCorrect(climate.tempMean, elevation) : climate.tempMean)
    : toNum(areaData.avgTemp);
  const annualRainfall = climate?.rain ?? toNum(areaData.annualRainfall);
  const sunshineHours = toNum(areaData.sunshineHours, estimateSunshineHours(lat));
  const slope = toNum(areaData.slope, 0);
  const soilType = soilInput.soilType || areaData.soilType || areaData.meta?.soilType || 'unknown';
  const ph = toNum(soilInput.ph ?? areaData.ph);
  const risk = estimateEnvironmentalRisk({ ...areaData, climate }, avgTemp);

  return {
    lat,
    lng,
    elevation,
    slope,
    soilType,
    ph,
    avgTemp,
    annualRainfall,
    sunshineHours,
    floodRisk: risk.floodRisk,
    droughtRisk: risk.droughtRisk,
    snowRisk: risk.snowRisk,
    floodRiskLevel: risk.floodRiskLevel,
    droughtRiskLevel: risk.droughtRiskLevel,
    snowRiskLevel: risk.snowRiskLevel,
    climateName: climate?.name || null,
    source: {
      elevation: elevation == null ? 'missing' : 'gsi',
      climate: climate ? 'local-climate-table' : 'missing',
      sunshineHours: 'estimated',
      risks: 'estimated',
    },
  };
}

function areaDataFromLandProfile(areaData, landProfile) {
  const baseClimate = landProfile.lat != null ? getClimate(landProfile.lat) : areaData.climate;
  // AMeDAS実測値を元のclimateから引き継ぐ
  // (getClimate()の静的テーブルで上書きすると decadeArr 等が消えるため)
  const mergedClimate = {
    ...baseClimate,
    ...(areaData.climate ? {
      tempMean:      areaData.climate.tempMean      ?? baseClimate?.tempMean,
      rain:          areaData.climate.rain          ?? baseClimate?.rain,
      rainMonthly:   areaData.climate.rainMonthly   ?? null,
      sunshineHours: areaData.climate.sunshineHours ?? null,
      stationNo:     areaData.climate.stationNo     ?? null,
      stationName:   areaData.climate.stationName   ?? null,
      distKm:        areaData.climate.distKm        ?? null,
      decadeArr:     areaData.climate.decadeArr      ?? null, // 旬36点 {tMax,tMin,tMean,sun,keys}
    } : {}),
  };
  return {
    ...areaData,
    lat:      landProfile.lat,
    lng:      landProfile.lng,
    elev:     landProfile.elevation,
    soilType: landProfile.soilType,
    ph:       landProfile.ph,
    climate:  mergedClimate,
  };
}

function cropPricePerKg(crop) {
  // price が null の作物は 0 返却
  if (!crop.price) return 0;
  const avg = ((crop.price.min || 0) + (crop.price.max || 0)) / 2;
  const unit = crop.price.unit || '';
  if (unit.includes('60kg'))  return avg / 60;
  if (unit.includes('45kg'))  return avg / 45;
  if (unit.includes('30kg'))  return avg / 30;
  if (unit.includes('100kg')) return avg / 100;
  return avg || 0;
}

function cropYieldPer10aKg(crop) {
  // yield が null の作物は 0 返却
  if (!crop.yield) return 0;
  return ((crop.yield.min || 0) + (crop.yield.max || 0)) / 2;
}

// ═══════════════════════════════════════════════════════════════
//  収益計算エンジン（強化版）
//
//  設計方針:
//   - コストを種苗/資材/機械/労働/初期償却の5項目に分解
//   - 収量補正を標高・栽培方式・気温乖離の3軸で多段補正
//   - 出荷率をカテゴリ別ベース × 適合率 × 栽培方式で算出
//   - 初期費用は作物寿命年数で均等償却（果樹=10年、多年草=5年、一年草=3年）
//   - リスク控除はenv/作物/連作の3成分を重み付きで合算
// ═══════════════════════════════════════════════════════════════

// ── カテゴリ別コスト単価テーブル（円/10a・年） ─────────────────
// 種苗費: 種・苗・球根等の購入費
// 資材費: 農薬・肥料（化成）・マルチ・ネット等の消耗品
// 機械費: トラクター・管理機等の燃料・修繕の按分
// 労働費: 播種〜収穫の作業時間 × 地域最低賃金相当（≈1,000円/h）
// 初期費用: 苗木・整枝棚・灌漑設備等の初期投資（年数償却で使用）
// 償却年数: 初期費用を何年に分割するか
const COST_TABLE = {
  fruit:     { seed: 15000, material: 42000, machine: 28000, labor: 110000, initial: 350000, amortYears: 10 },
  grain:     { seed:  8000, material: 18000, machine: 35000, labor:  38000, initial:  40000, amortYears:  3 },
  legume:    { seed:  9000, material: 15000, machine: 28000, labor:  42000, initial:  35000, amortYears:  3 },
  leafy:     { seed: 12000, material: 25000, machine: 18000, labor:  80000, initial:  30000, amortYears:  3 },
  root:      { seed: 10000, material: 22000, machine: 25000, labor:  65000, initial:  32000, amortYears:  3 },
  fruit_veg: { seed: 14000, material: 30000, machine: 20000, labor:  90000, initial:  45000, amortYears:  3 },
  vegetable: { seed: 11000, material: 22000, machine: 20000, labor:  72000, initial:  30000, amortYears:  3 },
  wildveg:   { seed:  8000, material: 15000, machine: 15000, labor:  60000, initial:  80000, amortYears:  5 },
  herb:      { seed: 10000, material: 18000, machine: 12000, labor:  55000, initial:  35000, amortYears:  4 },
  mushroom:  { seed: 20000, material: 30000, machine: 15000, labor:  70000, initial: 120000, amortYears:  5 },
  forest:    { seed:  5000, material: 10000, machine: 20000, labor:  40000, initial: 100000, amortYears: 10 },
  oil:       { seed:  8000, material: 18000, machine: 30000, labor:  45000, initial:  50000, amortYears:  4 },
  fiber:     { seed:  7000, material: 16000, machine: 28000, labor:  50000, initial:  45000, amortYears:  4 },
  specialty: { seed: 12000, material: 25000, machine: 18000, labor:  60000, initial:  60000, amortYears:  5 },
  _default:  { seed: 10000, material: 22000, machine: 22000, labor:  60000, initial:  40000, amortYears:  3 },
};

// ── カテゴリ別 出荷率ベース ────────────────────────────────────
// 露地・標準適合率（suitabilityRate=1.0）での基準値
// ハウス・高適合率では上側に補正される
const MARKETABLE_BASE = {
  fruit:     0.78,
  grain:     0.92,
  legume:    0.88,
  leafy:     0.70,
  root:      0.80,
  fruit_veg: 0.75,
  vegetable: 0.78,
  wildveg:   0.82,
  herb:      0.80,
  mushroom:  0.88,
  forest:    0.85,
  oil:       0.90,
  fiber:     0.88,
  specialty: 0.80,
  _default:  0.78,
};

/**
 * calculateRiskDeductionRate(crop, landProfile)
 *
 * リスク控除率を3成分の重み付き合算で算出する。
 *
 * 成分:
 *   envRate    : 圃場環境リスク（洪水・干ばつ・積雪の平均）× 0.20
 *   cropRate   : 作物固有リスク（リスク項目のレベル別加算）
 *                risks未記載（空配列）の場合はDEFAULT_CROP_RISK_RATEを適用
 *   continuousRate: 連作障害リスク（continuousCropYears=1 → 5%、それ以外 → 2%）
 *
 * 上限: 45%（過大な控除を防ぐ）
 */
// risksが未記載(空配列)の作物に適用するデフォルト控除率。
// 「リスクがゼロ」ではなく「データ未確認」を意味する値として扱う。
// 2026-06導入: risks記載済み73作物(223件中)の実測cropRate平均値
// （16.3%、中央値16.0%）に基づく。
// 導入理由: risks=0件→控除0%のままだと、米・麦・大豆等のデータを
// 丁寧に整備した主要作物(cropRate16〜28%)ほど収益で不利になり、
// herb/oil/fiber(全件risks=0件)等のデータが薄いカテゴリが常に
// 有利になる逆転現象が起きていたため。
const DEFAULT_CROP_RISK_RATE = 0.16;

function calculateRiskDeductionRate(crop, landProfile) {
  // 環境リスク: 3指標の平均（0〜100）を 0〜1 に正規化し 0.20 を乗じる
  const envAvg = (
    (landProfile.floodRisk   || 0) +
    (landProfile.droughtRisk || 0) +
    (landProfile.snowRisk    || 0)
  ) / 3;
  const envRate = (envAvg / 100) * 0.20;

  // 作物固有リスク: high=8% / medium=4% / low=1.5%
  // risks未記載(空配列)の場合はデータ未確認とみなしデフォルト値を適用
  const cropRate = (crop.risks && crop.risks.length > 0)
    ? crop.risks.reduce((sum, r) => {
        return sum + (r.level === 'high' ? 0.08 : r.level === 'medium' ? 0.04 : 0.015);
      }, 0)
    : DEFAULT_CROP_RISK_RATE;

  // 連作障害リスク
  const continuousRate = crop.conditions?.continuousCropYears <= 1 ? 0.05 : 0.02;

  return clamp(envRate + cropRate + continuousRate, 0, 0.45);
}

/**
 * calculateProfitability(crop, areaData, scoreResult, landProfile)
 *
 * 収益性を多軸モデルで算出する。
 *
 * 収量補正3軸:
 *   1. 適合率補正     : suitabilityRate（スコア/100）をそのまま乗算
 *   2. 栽培方式補正   : greenhouse=+15%, heatedGreenhouse=+25%, openField=±0%
 *   3. 標高・気温補正 : DB最適気温からの乖離が大きいほど収量ペナルティ
 *
 * コスト5項目:
 *   seedCost / materialCost / machineCost / laborCost / amortizedInitialCost
 *
 * 返却フィールド（後方互換のため旧フィールドも維持）:
 *   area10a, baseYield, yieldCorrectionFactor, predictedYield,
 *   marketableYieldRate, marketableYield, averagePrice,
 *   revenue, seedCost, materialCost, machineCost, laborCost,
 *   amortizedInitialCost, annualCost (旧互換: seed+material+machine),
 *   riskDeduction, riskDeductionRate, averageProfit
 */
function calculateProfitability(crop, areaData, scoreResult, landProfile, farmCond = null, overrides = null) {
  const area10a         = Math.max(0, (areaData.areaSqm || 0) / 1000);
  const suitabilityRate = clamp((scoreResult?.score || 0) / 100, 0, 1);
  const cultivationMode = areaData.cultivationMode || 'openField';
  const cat             = crop.conditions?.category || crop.category || '_default';
  const costRow         = COST_TABLE[cat] || COST_TABLE._default;

  // ── ① 収量補正係数 ──────────────────────────────────────────
  // 適合率補正
  const suitFactor = suitabilityRate;

  // 栽培方式補正
  const modeFactor = cultivationMode === 'heatedGreenhouse' ? 1.25
                   : cultivationMode === 'greenhouse'       ? 1.15
                   : 1.0;

  // 気温乖離補正: 年均気温と作物最適気温の差に基づくペナルティ
  // 最適気温 = (tempMeanMin + tempMeanMax) / 2
  // 2026-06修正: scoreCrop()側で旬別データによる精密判定(気温25点)が
  // 既に行われている場合(scoreResult.decadeMatchが非null)、ここで年平均
  // ベースの粗い基準により再度ペナルティをかけると二重評価になるため適用しない。
  // 旬別データがない場合(年平均フォールバック判定)のみ、このtempFactorで補正する。
  const cond    = crop.conditions || {};
  const hasDecadeJudgment = !!(scoreResult && scoreResult.decadeMatch);
  let tempFactor = 1.0;
  if (!hasDecadeJudgment &&
      cond.tempMeanMin != null && cond.tempMeanMax != null && landProfile.avgTemp != null) {
    const tOpt = (cond.tempMeanMin + cond.tempMeanMax) / 2;
    const diff  = Math.abs(landProfile.avgTemp - tOpt);
    // 2℃以内: ペナルティなし / 2〜8℃: 線形減少 / 8℃超: 最大20%減
    tempFactor = diff <= 2 ? 1.0
               : diff <= 8 ? 1.0 - (diff - 2) / 6 * 0.20
               : 0.80;
  }

  const yieldCorrectionFactor = Math.round(suitFactor * modeFactor * tempFactor * 1000) / 1000;

  // ── ② 収量計算 ───────────────────────────────────────────────
  const baseYield      = cropYieldPer10aKg(crop) * area10a;
  const predictedYield = baseYield * yieldCorrectionFactor;

  // ── ③ 出荷率 ─────────────────────────────────────────────────
  // カテゴリ別ベース × 適合率補正（±8%）× 栽培方式補正（ハウス+5%）
  const marketableBase     = MARKETABLE_BASE[cat] || MARKETABLE_BASE._default;
  const marketableAdj      = clamp(marketableBase + (suitabilityRate - 0.7) * 0.08, 0.45, 0.96);
  const marketableYieldRate = cultivationMode !== 'openField'
    ? clamp(marketableAdj + 0.05, 0.45, 0.97)
    : marketableAdj;
  const marketableYield    = predictedYield * marketableYieldRate;

  // ── farmCond / overrides 補正係数 ────────────────────────────────
  const ov = overrides?.[crop.id] || null;
  let priceMult = 1.0;
  let laborMult = 1.0;
  if (farmCond) {
    if (farmCond.sales === 'direct' || farmCond.sales === 'roadside') priceMult = 1.15;
    else if (farmCond.sales === 'ja')         priceMult = 0.90;
    else if (farmCond.sales === 'processing') priceMult = 0.85;
    if      (farmCond.scale === 'family') laborMult = 0.85;
    else if (farmCond.scale === 'hired')  laborMult = 1.30;
  }

  // ── ④ 販売収入 ───────────────────────────────────────────────
  const averagePrice = ov?.pricePerKg ?? (cropPricePerKg(crop) * priceMult);
  const revenue      = marketableYield * averagePrice;

  // ── ⑤ コスト5項目（円/10a × 面積） ─────────────────────────
  // ハウス栽培: 資材費+15%、機械費+10%（暖房・設備費を資材費に含む近似）
  const modeMatMult = cultivationMode !== 'openField' ? 1.15 : 1.0;
  const modeMacMult = cultivationMode !== 'openField' ? 1.10 : 1.0;

  // 肥料費補正: fertilizer.N/P/K 合計量 × 単価（DBにある場合のみ加算）
  const fert         = crop.fertilizer || { N: 0, P: 0, K: 0 };
  const fertAdj      = ((fert.N || 0) + (fert.P || 0) + (fert.K || 0)) * 800; // 800円/kg

  const seedCost             = (ov?.seedCost10a      ?? costRow.seed)                               * area10a;
  const materialCost         = (ov?.materialCost10a  ?? (costRow.material * modeMatMult + fertAdj))  * area10a;
  const machineCost          = (ov?.machineCost10a   ?? (costRow.machine  * modeMacMult))            * area10a;
  const laborCost            = (ov?.laborCost10a     ?? (costRow.labor    * laborMult))              * area10a;
  const amortizedInitialCost = ((ov?.initialCost     ?? costRow.initial) / costRow.amortYears)       * area10a;

  // 後方互換: annualCost = 種苗+資材+機械（旧: 資材+肥料の扱い）
  const annualCost = seedCost + materialCost + machineCost;

  // ── ⑥ リスク控除 ─────────────────────────────────────────────
  const riskDeductionRate = calculateRiskDeductionRate(crop, landProfile);
  const riskDeduction     = revenue * riskDeductionRate;

  // ── ⑦ 純利益 ─────────────────────────────────────────────────
  const averageProfit = revenue
    - seedCost
    - materialCost
    - machineCost
    - laborCost
    - amortizedInitialCost
    - riskDeduction;

  return {
    // 面積
    area10a,
    // 収量
    baseYield,
    yieldCorrectionFactor,
    predictedYield,
    marketableYieldRate,
    marketableYield,
    // 収入
    averagePrice,
    revenue,
    // コスト（5項目）
    seedCost,
    materialCost,
    machineCost,
    laborCost,
    amortizedInitialCost,
    amortYears: costRow.amortYears,
    // 後方互換フィールド
    annualCost,
    initialCost: costRow.initial * area10a,   // 旧フィールド（未償却の総額）
    // リスク控除
    riskDeductionRate,
    riskDeduction,
    // 利益
    averageProfit,
  };
}

// ─── 営農条件スコア（最大20点） ───
/**
 * calcFarmingConditionScore(crop, conditions)
 *
 * ウィザードで入力した営農条件と作物特性の一致度を0〜20点で返す。
 * areaData.farmingConditions に格納された条件オブジェクトを受け取る。
 *
 * conditions shape:
 *   {
 *     priority:   'profit' | 'easywork' | 'lowrisk'   // 優先軸
 *     equipment:  'openField' | 'greenhouse' | 'paddy' // 設備
 *     period:     'short' | 'mid' | 'long'             // 栽培期間
 *     sales:      'direct' | 'ja' | 'roadside' | 'processing' | 'self' // 販売先
 *     scale:      'solo' | 'family' | 'hired'          // 規模
 *     experience: 'beginner' | 'mid' | 'expert'        // 経験
 *   }
 *
 * 返却: { score(0-20), details[{text,pts}] }
 */
function calcFarmingConditionScore(crop, conditions) {
  if (!conditions) return { score: 0, details: [] };

  const c   = crop.conditions || {};
  const cat = crop.category   || '';
  let pts   = 0;
  const details = [];

  // ── 1. 優先軸（最大5点） ──
  const priority = conditions.priority;
  if (priority === 'profit') {
    // 収益重視：価格レンジが広い・収量が多い作物を優遇
    const priceRange = crop.price ? (crop.price.max || 0) - (crop.price.min || 0) : 0;
    const yieldMid   = crop.yield ? ((crop.yield.min || 0) + (crop.yield.max || 0)) / 2 : 0;
    const p = priceRange > 200 || yieldMid > 3000 ? 5 : priceRange > 80 || yieldMid > 1000 ? 3 : 1;
    pts += p;
    details.push({ text: `優先軸(収益)`, pts: p });
  } else if (priority === 'easywork') {
    // 手間最小：管理期間が短い・リスクが少ない作物を優遇
    const riskCount = (crop.risks || []).length;
    const gpMid = c.growthPeriodMax ? ((c.growthPeriodMin || 0) + c.growthPeriodMax) / 2 : 180;
    const p = riskCount <= 1 && gpMid <= 120 ? 5 : riskCount <= 2 ? 3 : 1;
    pts += p;
    details.push({ text: `優先軸(手間最小)`, pts: p });
  } else if (priority === 'lowrisk') {
    // リスク分散：high リスクが少ない作物を優遇
    const highRisks = (crop.risks || []).filter(r => r.level === 'high').length;
    const p = highRisks === 0 ? 5 : highRisks === 1 ? 2 : 0;
    pts += p;
    details.push({ text: `優先軸(低リスク)`, pts: p });
  }

  // ── 2. 設備（最大4点） ──
  const equipment = conditions.equipment;
  if (equipment === 'paddy') {
    // 水田可：水稲・蓮根など水田系を優遇
    const p = ['grain', 'root'].includes(cat) ? 4 : 1;
    pts += p;
    details.push({ text: `設備(水田)`, pts: p });
  } else if (equipment === 'greenhouse') {
    // ハウスあり：果菜・ハーブ・葉菜を優遇
    const p = ['fruit_veg', 'herb', 'leafy', 'fruit'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `設備(ハウス)`, pts: p });
  } else {
    // 露地のみ：露地向き作物を優遇
    const p = ['grain', 'legume', 'root', 'wildveg', 'oil', 'fiber'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `設備(露地)`, pts: p });
  }

  // ── 3. 栽培期間（最大4点） ──
  const period  = conditions.period;
  const gpMin   = c.growthPeriodMin ?? 60;
  const gpMax   = c.growthPeriodMax ?? 180;
  const gpMid   = (gpMin + gpMax) / 2;
  if (period === 'short') {
    const p = gpMid <= 90 ? 4 : gpMid <= 150 ? 2 : 0;
    pts += p;
    details.push({ text: `栽培期間(短期)`, pts: p });
  } else if (period === 'mid') {
    const p = gpMid > 90 && gpMid <= 240 ? 4 : 2;
    pts += p;
    details.push({ text: `栽培期間(中期)`, pts: p });
  } else if (period === 'long') {
    // 長期・樹木可：果樹・林産を優遇
    const p = ['fruit', 'forest'].includes(cat) || gpMid > 240 ? 4 : 2;
    pts += p;
    details.push({ text: `栽培期間(長期)`, pts: p });
  }

  // ── 4. 販売先（最大4点） ──
  const sales = conditions.sales;
  if (sales === 'direct' || sales === 'roadside') {
    // 直売・道の駅：付加価値の高い野菜・果物・ハーブ向き
    const p = ['fruit', 'herb', 'leafy', 'fruit_veg', 'wildveg'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `販売先(直売)`, pts: p });
  } else if (sales === 'ja') {
    // JA出荷：大量生産向き穀物・根菜
    const p = ['grain', 'legume', 'root', 'oil', 'fiber'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `販売先(JA)`, pts: p });
  } else if (sales === 'processing') {
    // 加工業者：油脂・繊維・豆類向き
    const p = ['oil', 'fiber', 'legume', 'grain'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `販売先(加工)`, pts: p });
  } else {
    // 自家消費：何でも2点
    pts += 2;
    details.push({ text: `販売先(自家消費)`, pts: 2 });
  }

  // ── 5. 規模・経験（最大3点、合算） ──
  const scale      = conditions.scale;
  const experience = conditions.experience;
  const riskCount  = (crop.risks || []).length;
  const gpMid2     = (gpMin + gpMax) / 2;

  // 規模：一人なら手間が少ない作物を優遇
  if (scale === 'solo') {
    const p = riskCount <= 1 && gpMid2 <= 150 ? 2 : 1;
    pts += p;
    details.push({ text: `規模(一人)`, pts: p });
  } else if (scale === 'family') {
    pts += 1;
    details.push({ text: `規模(家族)`, pts: 1 });
  } else {
    // 雇用あり：手間のかかる果樹・野菜を優遇
    const p = ['fruit', 'fruit_veg', 'leafy'].includes(cat) ? 2 : 1;
    pts += p;
    details.push({ text: `規模(雇用)`, pts: p });
  }

  // 経験：初心者はリスクが少ない作物を優遇
  if (experience === 'beginner') {
    const highRisks = (crop.risks || []).filter(r => r.level === 'high').length;
    const p = highRisks === 0 ? 1 : 0;
    pts += p;
    details.push({ text: `経験(初心者)`, pts: p });
  } else {
    pts += 1;
    details.push({ text: `経験(中〜上級)`, pts: 1 });
  }

  return { score: Math.min(20, Math.round(pts)), details };
}

// ─── 環境適性スコアと営農条件スコアの合成 ───
// 環境適性(0-100) : 営農条件(0-20、合成時0.5倍で実質10点相当) ≒ 100:10 の加重平均。
// 2026-06修正: 営農条件側の影響が強すぎる(理論上±16.7点)との判断により、
// 重みを100:20→100:10相当に縮小。calcFarmingConditionScore()自体の内訳採点
// (優先軸5/設備4/期間4/販売先4/規模経験3 = 20点満点)は変更せず、
// 合成時にfarmingScoreを0.5倍してから正規化する方式で実装する。
const ENV_SCORE_MAX     = 100;
const FARMING_SCORE_MAX = 20;            // calcFarmingConditionScore()の内訳満点（変更なし）
const FARMING_WEIGHT    = 0.5;           // 合成時の重み係数（20点 × 0.5 = 実質10点相当）
function combineWithFarmingScore(baseScore, farmingScore) {
  const combinedMax = ENV_SCORE_MAX + FARMING_SCORE_MAX * FARMING_WEIGHT; // 100 + 10 = 110
  return Math.min(100, Math.round((baseScore + farmingScore * FARMING_WEIGHT) * 100 / combinedMax));
}

function buildAnalysisResult(areaData) {
  const landProfile     = buildLandProfile(areaData);
  const scoringAreaData = areaDataFromLandProfile(areaData, landProfile);
  const farmCond        = areaData.farmingConditions || null;

  const cropScores = CROP_DB
    .map(crop => {
      const scoreResult = scoreCrop(crop, scoringAreaData);

      // 営農条件スコアを合算（条件がある場合のみ）
      let totalScore      = scoreResult.score;
      let farmingScore    = null;
      let farmingDetails  = [];
      if (farmCond) {
        const fs        = calcFarmingConditionScore(crop, farmCond);
        farmingScore    = fs.score;
        farmingDetails  = fs.details;
        // 環境適性(0-100)と営農条件(0-20)を100点満点に正規化して合成
        totalScore = combineWithFarmingScore(scoreResult.score, farmingScore);
      }

      return {
        ...scoreResult,
        score:          totalScore,
        baseScore:      scoreResult.score,  // 元の気候・土壌スコア
        farmingScore,                        // 営農条件スコア（null=未入力）
        farmingDetails,
        profitability:  calculateProfitability(crop, areaData, scoreResult, landProfile, farmCond, areaData.profitOverrides || null),
      };
    })
    .sort((a, b) => {
      if (a.viable !== b.viable) return a.viable ? -1 : 1;
      if (b.score  !== a.score)  return b.score - a.score;
      return b.profitability.averageProfit - a.profitability.averageProfit;
    });

  return {
    landProfile,
    cropScores,
    topCrop: cropScores[0] || null,
  };
}

// ─── 単一作物×エリア 詳細分析エンジン ───
/**
 * buildSingleCropAnalysis(cropId, areaData)
 *
 * ウィザードで選択した1作物とエリアデータの突合せ結果を返す。
 * buildAnalysisResult() と同じlandProfile/scoringAreaDataを使いつつ、
 * 対象作物1件のみをスコアリング・収益計算・施肥計算する。
 *
 * @param {string} cropId   - CROP_DB の id
 * @param {object} areaData - currentAreaData（cultivationMode含む）
 * @returns {{
 *   crop, landProfile, scoreResult, profitability,
 *   fertilizer, confidence, cultivationMode
 * } | null}
 */
function buildSingleCropAnalysis(cropId, areaData) {
  const crop = (typeof CROP_DB !== 'undefined')
    ? CROP_DB.find(c => c.id === cropId)
    : null;
  if (!crop) return null;

  const landProfile     = buildLandProfile(areaData);
  const scoringAreaData = areaDataFromLandProfile(areaData, landProfile);

  // cultivationMode を scoringAreaData に確実に反映
  scoringAreaData.cultivationMode = areaData.cultivationMode || 'openField';

  const scoreResult   = scoreCrop(crop, scoringAreaData);

  // 営農条件スコア合算
  const farmCond = areaData.farmingConditions || null;
  let totalScore     = scoreResult.score;
  let farmingScore   = null;
  let farmingDetails = [];
  if (farmCond) {
    const fs       = calcFarmingConditionScore(crop, farmCond);
    farmingScore   = fs.score;
    farmingDetails = fs.details;
    totalScore     = combineWithFarmingScore(scoreResult.score, farmingScore);
  }

  const adjustedScoreResult = {
    ...scoreResult,
    score:         totalScore,
    baseScore:     scoreResult.score,
    farmingScore,
    farmingDetails,
  };

  // 収益計算の適合率(suitabilityRate)は環境スコア(baseScore)のみを使用する。
  // 営農条件(farmingScore)は priceMult/laborMult で別途反映済みのため、
  // ここで totalScore(adjustedScoreResult.score) を渡すと二重に効いてしまう。
  // buildAnalysisResult()（ランキング一覧）側は元々 scoreResult を渡しており、
  // 本行はそれと整合させるための修正（2026-06）。
  const profitability = calculateProfitability(crop, areaData, scoreResult, landProfile, farmCond, areaData.profitOverrides || null);
  const fertilizer    = calcFertilizer(crop, areaData.areaSqm || 0);
  const confidence    = calcConfidence(scoringAreaData);

  return {
    crop,
    landProfile,
    scoreResult:    adjustedScoreResult,
    profitability,
    fertilizer,
    confidence,
    cultivationMode: scoringAreaData.cultivationMode,
  };
}

// ═══════════════════════════════════════════════════════════════
//  リスク計算エンジン群
//
//  共通ユーティリティ: _buildGrowDecades(startDecade, endDecade)
//    生育期間の旬インデックス配列を生成（年跨ぎ対応）
//    startDecade〜endDecade が null の場合は空配列を返す
// ═══════════════════════════════════════════════════════════════

function _buildGrowDecades(startDecade, endDecade) {
  if (startDecade == null || endDecade == null) return [];
  const arr = [];
  if (endDecade >= startDecade) {
    for (let i = startDecade; i <= endDecade; i++) arr.push(i % 36);
  } else {
    // 年跨ぎ（例: 11月上旬播種 → 翌4月収穫）
    for (let i = startDecade; i < 36; i++) arr.push(i);
    for (let i = 0; i <= endDecade; i++) arr.push(i);
  }
  return arr;
}

// ── リスクレベル共通マッピング ──────────────────────────────────
// count / threshold 比率（0〜1）からレベルを返す
function _riskLevelByRatio(ratio) {
  if (ratio === 0)       return { riskLevel: 'none', riskStars: '☆☆☆☆' };
  if (ratio <= 0.15)     return { riskLevel: 'low',  riskStars: '★☆☆☆' };
  if (ratio <= 0.35)     return { riskLevel: 'mid',  riskStars: '★★★☆' };
  return                        { riskLevel: 'high', riskStars: '★★★★' };
}

// ─── ① 高温リスク計算（強化版）───────────────────────────────
/**
 * calcHeatRisk(crop, decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別最高気温(tMax)が高温閾値以上となる旬を検出し、
 * 旬数カウント・超過温度積算・連続高温旬数を返す。
 *
 * 閾値は作物の heatType で決定:
 *   'warm' → 35℃（高温性：トマト・スイカ等）
 *   'cool' → 33℃（冷涼性：レタス・コムギ等、デフォルト）
 *
 * 返却:
 *   {
 *     hotDecadeCount      : number,  // 閾値超過旬数
 *     hotDayApprox        : number,  // 旬×10日換算（参考値）
 *     heatSeverityScore   : number,  // 超過℃の積算（生育期間全体）
 *     maxConsecutiveHot   : number,  // 最大連続高温旬数
 *     threshold           : number,  // 使用した閾値(℃)
 *     heatType            : string,  // 'warm' | 'cool'
 *     riskLevel           : string,  // 'none'|'low'|'mid'|'high'
 *     riskStars           : string,  // '★☆☆☆' 等（4段階）
 *     riskLabel           : string,  // 表示用テキスト
 *   }
 *   生育期間が未定・tMax配列なし の場合は null を返す
 */
function calcHeatRisk(crop, decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMax || !Array.isArray(decadeArr.tMax)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const heatType  = crop.heatType === 'warm' ? 'warm' : 'cool';
  const threshold = heatType === 'warm' ? 35 : 33;

  let hotDecadeCount    = 0;
  let heatSeverityScore = 0;
  let maxConsecutiveHot = 0;
  let curConsec         = 0;

  growDecades.forEach(i => {
    const t = decadeArr.tMax[i];
    if (t != null && t >= threshold) {
      hotDecadeCount++;
      heatSeverityScore += (t - threshold);
      curConsec++;
      if (curConsec > maxConsecutiveHot) maxConsecutiveHot = curConsec;
    } else {
      curConsec = 0;
    }
  });

  heatSeverityScore = Math.round(heatSeverityScore * 10) / 10;

  const ratio = growDecades.length > 0 ? hotDecadeCount / growDecades.length : 0;
  const { riskLevel, riskStars } = _riskLevelByRatio(ratio);

  const riskLabel = {
    none: 'リスクなし',
    low:  '低リスク',
    mid:  '中リスク',
    high: '高リスク',
  }[riskLevel];

  const hotDayApprox = hotDecadeCount * 10;
  return {
    hotDecadeCount, hotDayApprox, heatSeverityScore, maxConsecutiveHot,
    threshold, heatType, riskLevel, riskStars, riskLabel,
  };
}

// ─── ② 霜リスク計算 ────────────────────────────────────────────
/**
 * calcFrostRisk(decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別最低気温(tMin)が 0℃未満となる旬を検出し、
 * 霜の発生リスクレベルを返す。
 *
 * 返却:
 *   {
 *     frostDecadeCount : number,    // 0℃未満旬数
 *     frostDecades     : number[],  // 0℃未満旬インデックスリスト
 *     frostDayApprox   : number,    // 旬×10日換算（参考値）
 *     lowestTMin       : number,    // 最低気温（生育期間中の最小値）
 *     riskLevel        : string,    // 'none'|'low'|'mid'|'high'
 *     riskStars        : string,
 *     riskLabel        : string,
 *   }
 *   tMin配列なし の場合は null
 */
function calcFrostRisk(decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMin || !Array.isArray(decadeArr.tMin)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const frostDecades = growDecades.filter(i => {
    const t = decadeArr.tMin[i];
    return t != null && t < 0;
  });

  const frostDecadeCount = frostDecades.length;
  const frostDayApprox   = frostDecadeCount * 10;

  // 最低気温（null は除外）
  const tMinVals  = growDecades.map(i => decadeArr.tMin[i]).filter(v => v != null);
  const lowestTMin = tMinVals.length > 0 ? Math.round(Math.min(...tMinVals) * 10) / 10 : null;

  const ratio = growDecades.length > 0 ? frostDecadeCount / growDecades.length : 0;
  const { riskLevel, riskStars } = _riskLevelByRatio(ratio);

  const riskLabel = {
    none: '霜リスクなし',
    low:  '霜リスク低（局所対策で回避可）',
    mid:  '霜リスク中（防霜対策が必要）',
    high: '霜リスク高（栽培時期の再検討推奨）',
  }[riskLevel];

  return {
    frostDecadeCount, frostDecades, frostDayApprox, lowestTMin,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ③ 冷害リスク計算 ──────────────────────────────────────────
/**
 * calcChillRisk(crop, decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別平均気温(tMean)が「作物最低必要温度 + 3℃」を下回る旬を
 * 冷害リスク旬として検出する（生育鈍化・障害の前兆も捕捉するため+3℃マージン）。
 *
 * 返却:
 *   {
 *     chillDecadeCount : number,   // 低温旬数
 *     chillDecades     : number[], // 低温旬インデックスリスト
 *     worstDiff        : number,   // 最大乖離℃（cropTMin+3 との差、正値）
 *     chillThreshold   : number,   // 使用した閾値（cropTMin + 3）
 *     riskLevel        : string,
 *     riskStars        : string,
 *     riskLabel        : string,
 *   }
 *   tMean配列なし の場合は null
 */
function calcChillRisk(crop, decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMean || !Array.isArray(decadeArr.tMean)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const cropTMin     = crop.conditions?.tempMeanMin ?? null;
  // cropTMin 未定義の場合はリスク計算不可
  if (cropTMin === null) return null;

  const chillThreshold = cropTMin + 3; // B案マージン

  const chillDecades = growDecades.filter(i => {
    const t = decadeArr.tMean[i];
    return t != null && t < chillThreshold;
  });

  const chillDecadeCount = chillDecades.length;

  // 最大乖離（最も寒い旬と閾値の差）
  const diffs = chillDecades.map(i => chillThreshold - (decadeArr.tMean[i] ?? chillThreshold));
  const worstDiff = diffs.length > 0 ? Math.round(Math.max(...diffs) * 10) / 10 : 0;

  const ratio = growDecades.length > 0 ? chillDecadeCount / growDecades.length : 0;
  const { riskLevel, riskStars } = _riskLevelByRatio(ratio);

  const riskLabel = {
    none: '冷害リスクなし',
    low:  '冷害リスク低（生育が一時的に鈍化する可能性）',
    mid:  '冷害リスク中（品質低下・収量減の可能性あり）',
    high: '冷害リスク高（栽培適期の再検討を推奨）',
  }[riskLevel];

  return {
    chillDecadeCount, chillDecades, worstDiff, chillThreshold,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ④ 日照不足リスク計算 ──────────────────────────────────────
/**
 * calcSunDeficitRisk(crop, decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別日照時間(sun)が作物の最低必要日照（sunDecadeMin）を
 * 下回る旬を検出し、日照充足率とリスクレベルを返す。
 *
 * 返却:
 *   {
 *     sufficiencyPct   : number,   // 日照充足率（0〜100%）
 *     deficitDecades   : number[], // 日照不足旬インデックスリスト
 *     deficitDecadeCount: number,
 *     sunDecadeMin     : number,   // 使用した最低基準（h/旬）
 *     riskLevel        : string,
 *     riskStars        : string,
 *     riskLabel        : string,
 *   }
 *   sun配列なし・生育期間データなし の場合は null
 */
function calcSunDeficitRisk(crop, decadeArr, startDecade, endDecade) {
  if (!decadeArr?.sun || !Array.isArray(decadeArr.sun)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const cond   = crop.conditions || {};
  const sunDef = SUNSHINE_DEFAULT_ENGINE[cond.category] || SUNSHINE_DEFAULT_ENGINE._default;
  const sunDecadeMin = cond.sunDecadeMin ?? sunDef.min;
  const sunDecadeOpt = cond.sunDecadeOpt ?? sunDef.opt;

  // データがある旬のみ評価
  const validDecades = growDecades.filter(i => decadeArr.sun[i] != null);
  if (validDecades.length === 0) return null;

  const deficitDecades = validDecades.filter(i => decadeArr.sun[i] < sunDecadeMin);

  // 充足率: 各旬のスコア（0〜1）の平均
  let scoreSum = 0;
  validDecades.forEach(i => {
    const s = decadeArr.sun[i];
    if (s >= sunDecadeOpt) {
      scoreSum += 1.0;
    } else if (s >= sunDecadeMin) {
      scoreSum += (s - sunDecadeMin) / (sunDecadeOpt - sunDecadeMin);
    } else {
      scoreSum += Math.max(0, s / sunDecadeMin * 0.5);
    }
  });
  const sufficiencyPct = Math.round((scoreSum / validDecades.length) * 100);

  // 不足率からリスクレベル
  const deficitRatio = deficitDecades.length / validDecades.length;
  const { riskLevel, riskStars } = _riskLevelByRatio(deficitRatio);

  const riskLabel = {
    none: '日照リスクなし',
    low:  '日照やや不足（影響は軽微）',
    mid:  '日照不足（徒長・品質低下に注意）',
    high: '日照大幅不足（施設補光または作期変更を検討）',
  }[riskLevel];

  return {
    sufficiencyPct,
    deficitDecades,
    deficitDecadeCount: deficitDecades.length,
    sunDecadeMin,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ④-b 日照スコア全旬計算（ヒートマップ用）─────────────────────
/**
 * calcSunScoreAllDecades(crop, decadeArr)
 *
 * 36旬全体に対して旬別日照スコア（0.0〜1.0）を計算して返す。
 * calcSunDeficitRisk の内部ロジックを startDecade/endDecade の
 * 制限なしに全旬へ適用したもの（適期ヒートマップ専用）。
 *
 * 返却: number[] (length=36)
 *   各要素は 0.0〜1.0 のスコア。sun データがない旬は null。
 *   decadeArr.sun が存在しない場合は null を返す。
 */
function calcSunScoreAllDecades(crop, decadeArr) {
  if (!decadeArr?.sun || !Array.isArray(decadeArr.sun)) return null;

  const cond   = crop.conditions || {};
  const sunDef = SUNSHINE_DEFAULT_ENGINE[cond.category] || SUNSHINE_DEFAULT_ENGINE._default;
  const sunDecadeMin = cond.sunDecadeMin ?? sunDef.min;
  const sunDecadeOpt = cond.sunDecadeOpt ?? sunDef.opt;

  return decadeArr.sun.map(s => {
    if (s == null) return null;
    if (s >= sunDecadeOpt)  return 1.0;
    if (s >= sunDecadeMin)  return (s - sunDecadeMin) / (sunDecadeOpt - sunDecadeMin);
    return Math.max(0, s / sunDecadeMin * 0.5);
  });
}

// ─── ⑤ 寒暖差指数 ──────────────────────────────────────────────
/**
 * calcDiurnalIndex(decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別日較差（tMax - tMin）を集計し、
 * 寒暖差の特性を返す。
 *
 * 日較差は糖度・色付き・香気など品質形成に正の影響を与えるため、
 * 大きいほど品質向上に有利な指数として扱う。
 *
 * riskLevel は「寒暖差のなさ」に対するリスクとして定義:
 *   none → 日較差大（品質形成に有利、平均10℃超）
 *   low  → 日較差やや大（7〜10℃）
 *   mid  → 日較差小（4〜7℃）
 *   high → 日較差極小（4℃未満、品質形成に不利）
 *
 * 返却:
 *   {
 *     avgRange   : number,  // 平均日較差（℃）
 *     maxRange   : number,  // 最大日較差
 *     minRange   : number,  // 最小日較差
 *     decadeCount: number,  // 評価旬数（nullを除く）
 *     riskLevel  : string,  // 'none'|'low'|'mid'|'high'（日較差不足リスク）
 *     riskStars  : string,
 *     riskLabel  : string,
 *   }
 *   tMax/tMin 配列なし の場合は null
 */
function calcDiurnalIndex(decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMax || !decadeArr?.tMin) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const ranges = growDecades
    .map(i => {
      const hi = decadeArr.tMax[i];
      const lo = decadeArr.tMin[i];
      return (hi != null && lo != null) ? hi - lo : null;
    })
    .filter(v => v !== null);

  if (ranges.length === 0) return null;

  const avgRange = Math.round((ranges.reduce((s, v) => s + v, 0) / ranges.length) * 10) / 10;
  const maxRange = Math.round(Math.max(...ranges) * 10) / 10;
  const minRange = Math.round(Math.min(...ranges) * 10) / 10;

  // 日較差不足リスク（小さいほど高リスク）
  let riskLevel, riskStars, riskLabel;
  if (avgRange >= 10) {
    riskLevel = 'none'; riskStars = '☆☆☆☆'; riskLabel = '寒暖差大（品質形成に有利）';
  } else if (avgRange >= 7) {
    riskLevel = 'low';  riskStars = '★☆☆☆'; riskLabel = '寒暖差やや大（品質向上が期待できる）';
  } else if (avgRange >= 4) {
    riskLevel = 'mid';  riskStars = '★★★☆'; riskLabel = '寒暖差小（品質形成効果は限定的）';
  } else {
    riskLevel = 'high'; riskStars = '★★★★'; riskLabel = '寒暖差極小（品質向上効果は期待しにくい）';
  }

  return {
    avgRange, maxRange, minRange,
    decadeCount: ranges.length,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ラッパー: 全リスクをまとめて計算 ──────────────────────────
/**
 * calcAllRisks(crop, decadeArr, startDecade, endDecade)
 *
 * 5種のリスク関数を一括呼び出しし、まとめて返す。
 * 各関数が null を返した場合もそのまま格納する（呼び出し元でnullチェックを）。
 *
 * 返却:
 *   {
 *     heat      : calcHeatRisk の結果
 *     frost     : calcFrostRisk の結果
 *     chill     : calcChillRisk の結果
 *     sunDeficit: calcSunDeficitRisk の結果
 *     diurnal   : calcDiurnalIndex の結果
 *   }
 */
function calcAllRisks(crop, decadeArr, startDecade, endDecade) {
  return {
    heat:       calcHeatRisk(crop, decadeArr, startDecade, endDecade),
    frost:      calcFrostRisk(decadeArr, startDecade, endDecade),
    chill:      calcChillRisk(crop, decadeArr, startDecade, endDecade),
    sunDeficit: calcSunDeficitRisk(crop, decadeArr, startDecade, endDecade),
    diurnal:    calcDiurnalIndex(decadeArr, startDecade, endDecade),
  };
}

// ─── 気候推定ランキング（Phenologyベース・DBスコアと独立） ───
//  decadeArr : Phenology.buildDecadeArray() の返却値
//  crops     : cropDB の全作物配列
//  返却: [{ crop, score(0-100), startDecade, endDecade, harvestDecade, heatRisk, allRisks }] スコア降順
function computeClimateRanking(decadeArr, crops, cultivationMode = 'openField') {
  if (!decadeArr || !crops?.length) return [];

  return crops
    .map(crop => {
      const wins = Phenology.sowingWindows(decadeArr, crop, cultivationMode);
      if (!wins.length) {
        return {
          crop, score: 0,
          startDecade: null, endDecade: null, harvestDecade: null,
          heatRisk: null, allRisks: null,
        };
      }
      const best    = wins[0];
      const endIdx  = best.harvestDecade ?? best.endDecade;
      const allRisks = calcAllRisks(crop, decadeArr, best.startDecade, endIdx);
      return {
        crop,
        score:         Math.round(best.score * 100),
        startDecade:   best.startDecade,
        endDecade:     best.endDecade,
        harvestDecade: best.harvestDecade,
        heatRisk:      allRisks.heat,   // 後方互換: 単独アクセス用
        allRisks,
      };
    })
    .sort((a, b) => b.score - a.score);
}