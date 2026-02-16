/**
 * ═══════════════════════════════════════════════════════════
 *  NotebookLM 5-Step Strategy Engine (Precise Implementation)
 * ═══════════════════════════════════════════════════════════
 *  Step 1: 기준봉 (Base Candle) - 5~10일 평균 거래량의 2~3배 장대양봉
 *  Step 2: 기준마디 & 허리라인 - 지지/저항 겹침 구간 자동 계산
 *  Step 3: 매수 타점 - AF 패턴, 이평선 카운팅, 눌림목 돌파
 *  Step 4: 손절 - 허리라인 이탈(트랩 방지 2차 이탈 확인)
 *  Step 5: 익절 - N자형/E자형 목표가, 거래량 급증 분할 익절
 * ═══════════════════════════════════════════════════════════
 */

// ─── Utility Functions ───────────────────────────────────

export const calculateSMA = (data, period) => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { sma.push(NaN); continue; }
        const slice = data.slice(i - period + 1, i + 1);
        sma.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return sma;
};

export const calculateEMA = (data, period) => {
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
};

export const calculateATR = (data, period = 14) => {
    const atr = [];
    const tr = [0];
    for (let i = 1; i < data.length; i++) {
        const h = data[i].high, l = data[i].low, pc = data[i - 1].close;
        tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    for (let i = 0; i < data.length; i++) {
        if (i < period) { atr.push(NaN); continue; }
        const slice = tr.slice(i - period + 1, i + 1);
        atr.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return atr;
};

export const calculateBollingerBands = (prices, period = 20, stdDev = 2) => {
    const sma = calculateSMA(prices, period);
    const upper = [], lower = [], bbw = [];
    for (let i = 0; i < prices.length; i++) {
        if (isNaN(sma[i])) { upper.push(NaN); lower.push(NaN); bbw.push(NaN); continue; }
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
        const sd = Math.sqrt(variance);
        upper.push(mean + stdDev * sd);
        lower.push(mean - stdDev * sd);
        bbw.push(((upper[i] - lower[i]) / mean) * 100);
    }
    return { upper, lower, bbw };
};

export const calculateKeltnerChannels = (data, emaPeriod = 20, atrPeriod = 10, multiplier = 1.5) => {
    const prices = data.map(d => d.close);
    const ema = calculateEMA(prices, emaPeriod);
    const atr = calculateATR(data, atrPeriod);
    const upper = [], lower = [];

    for (let i = 0; i < data.length; i++) {
        if (isNaN(ema[i]) || isNaN(atr[i])) { upper.push(NaN); lower.push(NaN); continue; }
        upper.push(ema[i] + multiplier * atr[i]);
        lower.push(ema[i] - multiplier * atr[i]);
    }
    return { upper, lower };
};

export const calculateMFI = (data, period = 14) => {
    const mfi = [];
    const tp = data.map(d => (d.high + d.low + d.close) / 3);
    const rmf = tp.map((p, i) => p * data[i].volume);

    for (let i = 0; i < data.length; i++) {
        if (i < period) { mfi.push(50); continue; }
        let pos = 0, neg = 0;
        for (let j = i - period + 1; j <= i; j++) {
            if (tp[j] > tp[j - 1]) pos += rmf[j];
            else if (tp[j] < tp[j - 1]) neg += rmf[j];
        }
        const mfr = neg === 0 ? 100 : pos / neg;
        mfi.push(100 - (100 / (1 + mfr)));
    }
    return mfi;
};

export const calculateRSI = (prices, period = 14) => {
    const rsi = [];
    if (prices.length < period) return Array(prices.length).fill(null);
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = 0; i < period; i++) rsi.push(null);
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
        rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
    }
    return rsi;
};

export const calculateMACD = (prices) => {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = calculateEMA(macdLine, 9);
    const histogram = macdLine.map((val, i) => val - signalLine[i]);
    return { macdLine, signalLine, histogram };
};

export const calculateVolumeOscillator = (volumes, short = 5, long = 20) => {
    const shortSMA = calculateSMA(volumes, short);
    const longSMA = calculateSMA(volumes, long);
    return shortSMA.map((val, i) => {
        if (isNaN(val) || isNaN(longSMA[i]) || longSMA[i] === 0) return 0;
        return ((val - longSMA[i]) / longSMA[i]) * 100;
    });
};

export const calculateSAR = (data, step = 0.02, max = 0.2) => {
    if (data.length < 2) return Array(data.length).fill(null);
    const sar = [data[0].low];
    let isBull = true;
    let ep = data[0].high;
    let af = step;

    for (let i = 1; i < data.length; i++) {
        let nextSar = sar[i - 1] + af * (ep - sar[i - 1]);

        if (isBull) {
            if (data[i].low < nextSar) {
                isBull = false;
                nextSar = ep;
                ep = data[i].low;
                af = step;
            } else {
                if (data[i].high > ep) {
                    ep = data[i].high;
                    af = Math.min(af + step, max);
                }
                const prevLow = data[i - 1].low;
                const prevPrevLow = i > 1 ? data[i - 2].low : prevLow;
                nextSar = Math.min(nextSar, prevLow, prevPrevLow);
            }
        } else {
            if (data[i].high > nextSar) {
                isBull = true;
                nextSar = ep;
                ep = data[i].high;
                af = step;
            } else {
                if (data[i].low < ep) {
                    ep = data[i].low;
                    af = Math.min(af + step, max);
                }
                const prevHigh = data[i - 1].high;
                const prevPrevHigh = i > 1 ? data[i - 2].high : prevHigh;
                nextSar = Math.max(nextSar, prevHigh, prevPrevHigh);
            }
        }
        sar.push(nextSar);
    }
    return sar;
};

export const calculateIchimokuCloud = (data) => {
    const tenkanPeriod = 9, kijunPeriod = 26, spanBPeriod = 52;
    const high = data.map(d => d.high);
    const low = data.map(d => d.low);

    const getHHPLLAvg = (slice) => {
        if (slice.length === 0) return NaN;
        return (Math.max(...slice) + Math.min(...slice)) / 2;
    };

    const tenkan = [], kijun = [], spanA = [], spanB = [];
    for (let i = 0; i < data.length; i++) {
        tenkan.push(i >= tenkanPeriod - 1 ? getHHPLLAvg(high.slice(i - tenkanPeriod + 1, i + 1).concat(low.slice(i - tenkanPeriod + 1, i + 1))) : NaN);
        kijun.push(i >= kijunPeriod - 1 ? getHHPLLAvg(high.slice(i - kijunPeriod + 1, i + 1).concat(low.slice(i - kijunPeriod + 1, i + 1))) : NaN);

        const sa = (isNaN(tenkan[i]) || isNaN(kijun[i])) ? NaN : (tenkan[i] + kijun[i]) / 2;
        spanA.push(sa);

        spanB.push(i >= spanBPeriod - 1 ? getHHPLLAvg(high.slice(i - spanBPeriod + 1, i + 1).concat(low.slice(i - spanBPeriod + 1, i + 1))) : NaN);
    }

    return { tenkan, kijun, spanA, spanB };
};

export const calculateWilliamsVixFix = (data, period = 22) => {
    const prices = data.map(d => d.close);
    const vixFix = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period) { vixFix.push(0); continue; }
        const highestClose = Math.max(...prices.slice(i - period + 1, i + 1));
        const val = ((highestClose - data[i].low) / highestClose) * 100;
        vixFix.push(val);
    }

    const sma = calculateSMA(vixFix, 20);
    const stdDevs = [];
    for (let i = 0; i < vixFix.length; i++) {
        if (isNaN(sma[i])) { stdDevs.push(NaN); continue; }
        const slice = vixFix.slice(Math.max(0, i - 19), i + 1);
        const mean = sma[i];
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
        const sd = Math.sqrt(variance);
        stdDevs.push(mean + 2 * sd);
    }

    return vixFix.map((v, i) => ({ value: v, isBottom: v > stdDevs[i] }));
};

export const calculateChandelierStop = (data, atr, multiplier = 3) => {
    const stops = [];
    for (let i = 0; i < data.length; i++) {
        if (isNaN(atr[i])) { stops.push(NaN); continue; }
        const highestHigh = Math.max(...data.slice(Math.max(0, i - 22), i + 1).map(d => d.high));
        stops.push(highestHigh - atr[i] * multiplier);
    }
    return stops;
};

// ─── Step 0: Market Analysis ─────────────────────────────

export const analyzeMarket = (prices, volumes, smas) => {
    const i = prices.length - 1;
    if (i < 120) return { perfectOrder: false, volumeTrend: 'neutral', convergence: false, sma5Turning: false };

    const s5 = smas.sma5[i], s10 = smas.sma10?.[i], s20 = smas.sma20[i], s60 = smas.sma60[i], s120 = smas.sma120[i];
    const s240 = smas.sma240?.[i];

    // 정배열: 5 > 10 > 20 > 60 > 120 (> 240)
    let perfectOrder = s5 > s20 && s20 > s60 && s60 > s120 && (s240 ? s120 > s240 : true);
    if (s10) perfectOrder = perfectOrder && s5 > s10 && s10 > s20;

    // 단기 이평선 턴(Turn) 감지: 5일선이 어제보다 오늘 더 높으면 "우상향 턴"
    const sma5Turning = smas.sma5[i] > smas.sma5[i - 1] && smas.sma5[i - 1] <= smas.sma5[i - 2];

    // Volume trend
    let volumeTrend = 'neutral';
    if (i >= 10) {
        const avgVol10 = volumes.slice(i - 10, i).reduce((s, v) => s + v, 0) / 10;
        if (volumes[i] > avgVol10 * 3.0) volumeTrend = 'volume_climax'; // 300% 이상
        else if (volumes[i] > avgVol10 * 1.5) volumeTrend = 'bullish_confirmed';
    }

    // Convergence: 5/20/60/120/240 이평선 수렴 (간격이 매우 좁은 상태)
    const vals = s240 ? [s5, s20, s60, s120, s240] : [s5, s20, s60, s120];
    const spread = (Math.max(...vals) - Math.min(...vals)) / Math.min(...vals);
    const convergence = spread < 0.03;

    // 장기 이평선 기울기
    const longMAFlattening = smas.sma120[i] >= smas.sma120[i - 5] && (s240 ? smas.sma240[i] >= smas.sma240[i - 5] : true);

    return { perfectOrder, volumeTrend, convergence, sma5Turning, longMAFlattening };
};

// ─── Step 1: 기준봉 찾기 (1차/2차 구분) ─────────────────
// 조건: 이전 5~10개 캔들 평균 거래량의 2~3배 이상 터진 장대양봉
// 필터: 정배열이거나 최소 단기 이평선(5일)이 우상향 턴
// 2차 기준봉: 1차 이후 조정 → 전고점 재돌파 & 거래량 증가 = 더 안전

const _findBaseCandleAt = (data, smas, i) => {
    const candle = data[i];
    if (!candle || candle.close <= candle.open) return null;

    const prevCandle = i > 0 ? data[i - 1] : null;
    const isGapUp = prevCandle ? candle.open > prevCandle.high : false;

    // 조건 1: 거래량 2~3배 이상
    const volWindow = data.slice(Math.max(0, i - 10), i);
    if (volWindow.length === 0) return null;
    const avgVol = volWindow.reduce((sum, c) => sum + c.volume, 0) / volWindow.length;
    const volMultiplier = candle.volume / avgVol;
    if (volMultiplier < 2.5 && !isGapUp) return null; // 갭상승이면 2배도 인정, 아니면 2.5배

    // 조건 2: 이평 정배열 or 초기 턴
    if (smas && smas.sma5 && smas.sma20 && i < smas.sma5.length) {
        const s5 = smas.sma5[i], s10 = smas.sma10?.[i], s20 = smas.sma20[i], s60 = smas.sma60[i];
        const isBullish = s5 > s20 && (s10 ? s5 > s10 : true);
        const isTurning = i > 0 && smas.sma5[i] > smas.sma5[i - 1];
        if (!isBullish && !isTurning) return null;
    }

    // 조건 3: 이전 고점 돌파 (resistance breakout) - findReferenceLines 등과 연계 가능하지만 간소화하여 전일 고점 대비
    const isBreakout = prevCandle ? candle.close > prevCandle.high : true;
    if (!isBreakout && !isGapUp) return null;

    return {
        ...candle, index: i, volMultiplier: volMultiplier.toFixed(1),
        top: candle.high, bottom: candle.low,
        waistline: (candle.high + candle.low) / 2,
        isGapUp
    };
};

export const findStandardBar = (data, smas) => {
    if (data.length < 20) return null;

    const lookback = Math.min(data.length, 90);
    const startIdx = data.length - lookback;
    const baseCandles = [];

    // 모든 기준봉 후보 수집
    for (let i = data.length - 1; i >= startIdx; i--) {
        const bc = _findBaseCandleAt(data, smas, i);
        if (bc) baseCandles.push(bc);
    }

    if (baseCandles.length === 0) return null;

    // 2차 기준봉 찾기: 1차 기준봉 이후 조정 → 전고점 재돌파 & 거래량 증가
    if (baseCandles.length >= 2) {
        for (let j = 0; j < baseCandles.length - 1; j++) {
            const second = baseCandles[j]; // 더 최근
            const first = baseCandles[j + 1]; // 더 과거

            // 1차와 2차 사이에 거래량 감소(조정) 구간이 있는지 확인
            const gapStart = first.index + 1;
            const gapEnd = second.index;
            if (gapEnd - gapStart < 2) continue; // 조정 구간이 최소 2캔들

            const gapCandles = data.slice(gapStart, gapEnd);
            const gapAvgVol = gapCandles.reduce((s, c) => s + c.volume, 0) / gapCandles.length;
            const volDecayInGap = gapAvgVol < first.volume * 0.5; // 거래량 50% 이하 감소

            if (volDecayInGap && second.high >= first.high) {
                // ✅ 2차 기준봉 발견! (더 안전한 매수)
                return { ...second, isSecondBase: true, firstBase: first };
            }
        }
    }

    // 1차 기준봉만 있는 경우
    return { ...baseCandles[0], isSecondBase: false };
};

// ─── 기준가(세력가) 자동 수평선 ──────────────────────────
// 대량 거래(2x+) 캔들의 고가/저가/시가/종가를 기준선으로 반환
// 최근 데이터에 더 높은 가중치

export const findReferenceLines = (data) => {
    if (data.length < 20) return [];

    const lines = [];
    const lookback = Math.min(data.length, 90);

    for (let i = data.length - 1; i >= data.length - lookback; i--) {
        const candle = data[i];
        if (!candle) continue;

        const volWindow = data.slice(Math.max(0, i - 10), i);
        if (volWindow.length === 0) continue;
        const avgVol = volWindow.reduce((s, c) => s + c.volume, 0) / volWindow.length;

        if (candle.volume < avgVol * 2.0) continue; // 2배 이상만

        // 최근일수록 가중치 높음 (0.5 ~ 1.0)
        const recency = 0.5 + 0.5 * ((i - (data.length - lookback)) / lookback);

        // 고가, 저가, 종가를 기준선으로
        lines.push(
            { price: candle.high, type: 'resistance', weight: recency, label: `High(Vol ${(candle.volume / avgVol).toFixed(1)}x)`, index: i },
            { price: candle.low, type: 'support', weight: recency, label: `Low(Vol ${(candle.volume / avgVol).toFixed(1)}x)`, index: i },
            { price: candle.close, type: candle.close > candle.open ? 'support' : 'resistance', weight: recency * 0.8, label: `Close`, index: i }
        );
    }

    // 겹치는 가격대 병합 (3% 이내 = 같은 기준선)
    const merged = [];
    const sorted = lines.sort((a, b) => a.price - b.price);
    for (const line of sorted) {
        const existing = merged.find(m => Math.abs(m.price - line.price) / line.price < 0.03);
        if (existing) {
            existing.weight += line.weight; // 겹침 → 가중치 합산
            existing.hits = (existing.hits || 1) + 1;
        } else {
            merged.push({ ...line, hits: 1 });
        }
    }

    // 가중치 상위 5개만 반환 (너무 많으면 차트가 지저분)
    return merged.sort((a, b) => b.weight - a.weight).slice(0, 5);
};

// ─── Step 2: 기준마디 & 허리라인 계산 ────────────────────
// 기준봉 ~ 조정 직전 고점까지를 '기준마디'로 묶고
// 지지/저항이 가장 많이 겹치는 구간을 '허리라인(세력가)'으로 설정

export const calculateReferenceNode = (data, standardBar) => {
    if (!standardBar) return null;

    const startIdx = standardBar.index;
    let peakIdx = startIdx;
    let peakHigh = data[startIdx].high;

    // 기준마디 정의: 상승 시작점부터 조정 직전 고점까지
    for (let i = startIdx + 1; i < data.length; i++) {
        if (data[i].high > peakHigh) {
            peakHigh = data[i].high;
            peakIdx = i;
        }
        // 고점에서 ATR의 일정 비율 이상 하락하거나 3캔들 연속 하향 시 마디 종료
        if (i >= peakIdx + 3) {
            const isDownward = data[i].close < data[i - 1].close && data[i - 1].close < data[i - 2].close;
            if (isDownward) break;
        }
    }

    const nodeData = data.slice(startIdx, peakIdx + 1);
    const nodeHigh = peakHigh;
    const nodeLow = Math.min(...nodeData.map(c => c.low));
    const priceRange = nodeHigh - nodeLow;
    if (priceRange === 0) return null;

    // 허리라인 계산 (Volume-Weighted Price Clustering)
    const bins = 20;
    const binSize = priceRange / bins;
    const density = new Array(bins).fill(0);

    nodeData.forEach(candle => {
        // OHLC 밀집도 + 거래량 가중치
        [candle.open, candle.close, candle.high, candle.low].forEach(p => {
            const b = Math.min(bins - 1, Math.floor((p - nodeLow) / binSize));
            density[b] += 1;
        });
        const cBin = Math.min(bins - 1, Math.floor((candle.close - nodeLow) / binSize));
        density[cBin] += (candle.volume / standardBar.volume) * 5; // 기준봉 대비 거래량 가중
    });

    const maxDensityIdx = density.indexOf(Math.max(...density));
    const waistline = nodeLow + (maxDensityIdx + 0.5) * binSize;

    return {
        startIdx, endIdx: peakIdx,
        nodeHigh, nodeLow, waistline,
        nodeHeight: nodeHigh - nodeLow
    };
};

// ─── Step 3: 패턴 감지 (Global SMC + Korean Strategy) ──

export const detectPattern = (data, prices, volumes, smas, standardBar, refNode, additionalData = {}) => {
    if (prices.length < 5) return null;
    const i = prices.length - 1;
    const { atr14, bb, mfi, ema200, volOsc, mtfStatus } = additionalData;

    // ── 0. 200 EMA 필터 (장기 추세) + MTF 필터 ──
    const isBullishTrend = ema200 ? prices[i] > ema200[i] : true;
    const passesMTF = mtfStatus ? mtfStatus === 'bullish' : true; // 4시간봉 필터

    // ── 1. 3바 패턴 (3 Bar Pattern) ──
    const threeBar = detect3BarPattern(data, i, atr14);
    if (threeBar && isBullishTrend && passesMTF) return threeBar;

    // ── 2. 고가놀이 (High Play) ──
    if (standardBar && refNode) {
        const highPlay = detectHighPlay(data, i, standardBar, refNode, volOsc);
        if (highPlay && passesMTF) return highPlay;
    }

    // ── 3. AF 패턴 ──
    if (standardBar && refNode) {
        const af = detectAFPattern(data, i, standardBar, refNode, volOsc);
        if (af && passesMTF) return af;
    }

    // ── 4. FVG (Fair Value Gap) 눌림목 ──
    const fvg = detectFVG(data, i, atr14);
    if (fvg && isBullishTrend && passesMTF) return fvg;

    // ── 5. 유동성 스윕 (Liquidity Sweep) ──
    const sweep = detectLiquiditySweep(data, i);
    if (sweep && isBullishTrend) return sweep;

    // ── 6. 볼린저 스퀴즈 ──
    if (bb && mfi) {
        const squeeze = detectBBSqueeze(bb, mfi, i);
        if (squeeze) return squeeze;
    }

    // ── 7. Trap (속임수) ──
    const trap = detectTrap(prices, i, refNode || standardBar);
    if (trap) return trap;

    // ── 8. MA Counting ──
    const maCount = detectMACounting(prices, smas, i);
    if (maCount) return maCount;

    return null;
};

// ── 상세 패턴 검출 함수들 ──────────────────────────────

const detect3BarPattern = (data, i, atr14) => {
    if (i < 2 || !atr14) return null;
    const c1 = data[i - 2], c2 = data[i - 1], c3 = data[i];
    const atr = atr14[i - 2];

    // 점화봉 (Igniting): 몸통 > ATR * 1.5
    const body1 = Math.abs(c1.close - c1.open);
    const isIgniting = body1 > atr * 1.5 && c1.close > c1.open;

    // 풀백봉 (Pullback): 반대색, 크기 < 점화봉 몸통 * 0.5
    const isPullback = c2.close < c2.open && (c2.high - c2.low) < body1 * 0.5;

    // 확인봉 (Confirmation): 풀백봉 고가 돌파
    const isConfirmed = c3.close > c2.high;

    if (isIgniting && isPullback && isConfirmed) return 'THREE_BAR_BUY';
    return null;
};

const detectHighPlay = (data, i, standardBar, refNode, volOsc) => {
    if (!refNode) return null;
    const upperBoundary = refNode.nodeLow + refNode.nodeHeight * (2 / 3);
    const recent = data.slice(Math.max(0, i - 10), i); // 최근 10봉 확인

    // 조건 1: 주가가 상단 1/3 지점 위에서 '시간 조정(횡보)'
    const inUpperZone = recent.filter(c => c.close > upperBoundary).length >= 5;

    // 조건 2: 거래량이 마름 (드라이업)
    const avgVol = recent.reduce((s, c) => s + c.volume, 0) / recent.length;
    const volDrying = avgVol < standardBar.volume * 0.4;

    // 가짜 돌파 필터: 거래량 오실레이터가 양수(+)이고, 현재 캔들이 모멘텀 몸통을 가져야 함
    const vo = volOsc ? volOsc[i] : 0;
    const isMom = isMomentumCandle(data, i);

    // 조건 3: 박스권 상단(nodeHigh) 돌파
    const isBreakingOut = data[i].close > refNode.nodeHigh && (vo > 0 || isMom);

    if (inUpperZone && volDrying && isBreakingOut) return 'HIGH_PLAY_BREAKOUT';
    if (inUpperZone && volDrying) return 'HIGH_PLAY_CONSOLIDATION';
    return null;
};

const detectAFPattern = (data, i, standardBar, refNode, volOsc) => {
    if (!refNode) return null;
    const waist = refNode.waistline;
    const recent = data.slice(Math.max(0, i - 8), i);

    // A구간 (Momentum): 이미 기준봉으로 확인됨
    // F구간 (Float): 허리라인 위에서 낮은 변동성과 거래량으로 횡보
    const aboveWaist = recent.filter(c => c.close > waist).length >= 5;
    const avgVol = recent.reduce((s, c) => s + c.volume, 0) / (recent.length || 1);
    const volDecay = avgVol < standardBar.volume * 0.5;

    // 가짜 돌파 필터
    const vo = volOsc ? volOsc[i] : 0;
    const isMom = isMomentumCandle(data, i);

    // 진입 시점: F구간 상단(nodeHigh)을 모멘텀과 함께 돌파
    const isBreakingOut = data[i].close > refNode.nodeHigh && data[i - 1].close <= refNode.nodeHigh && (vo > 0 || isMom);

    if (aboveWaist && volDecay && isBreakingOut) return 'AF_BREAKOUT';
    if (aboveWaist && volDecay) return 'AF_FLOAT_ZONE';
    return null;
};

const detectSMCStructures = (data, i) => {
    if (i < 60) return null; // Safety for long-term recent
    const recent = data.slice(i - 20, i);
    const highs = recent.map(d => d.high);
    const swingHigh = Math.max(...highs);

    // BOS (Break of Structure): Only trigger on the INITIAL crossover
    // Current close > swingHigh AND previous close <= swingHigh
    const isBOS = data[i].close > swingHigh && data[i - 1].close <= swingHigh;

    // CHoCH (Change of Character): Only trigger on the INITIAL crossover of 60-bar high
    const longTermRecent = data.slice(Math.max(0, i - 60), i);
    const majorHigh = Math.max(...longTermRecent.map(d => d.high));
    const isCHoCH = data[i].close > majorHigh && data[i - 1].close <= majorHigh;

    if (isCHoCH) return 'SMC_CHOCH';
    if (isBOS) return 'SMC_BOS';
    return null;
};

const detectMACD_SAR = (data, i, macd, sar, ema200) => {
    if (!macd || !sar || !ema200 || i < 1) return null;
    if (!macd.macdLine || !macd.signalLine || i >= macd.macdLine.length) return null;

    const isBull = data[i].close > ema200[i];
    const sarBelow = sar[i] < data[i].low;
    const macdCross = macd.macdLine[i] > macd.signalLine[i] && macd.macdLine[i - 1] <= macd.signalLine[i - 1];

    if (isBull && sarBelow && macdCross) return 'MACD_SAR_BUY';
    return null;
};

// momentumCandle: 몸통이 최근 10봉 평균의 2배 이상인 경우
const isMomentumCandle = (data, i) => {
    if (i < 10) return true;
    const recent = data.slice(i - 10, i);
    const avgBody = recent.reduce((s, c) => s + Math.abs(c.close - c.open), 0) / 10;
    const currentBody = Math.abs(data[i].close - data[i].open);
    return currentBody > avgBody * 1.8; // 1.8배 이상
};

const detectFVG = (data, i, atr14) => {
    if (i < 5 || !atr14) return null;

    // 1. 단순 발생(Creation)이 아닌, 과거에 발생한 갭으로의 '회귀(Revisit)'를 포착
    // 최근 20개 캔들 내에서 가장 강력한 미결제 FVG를 찾음
    for (let j = i - 1; j > i - 20; j--) {
        if (j < 2) break;
        const c1 = data[j - 2], c2 = data[j - 1], c3 = data[j];

        // 강세 FVG 조건 (Imbalance Candle: c2)
        // c3.low > c1.high 가 성립해야 함
        const gapSize = c3.low - c1.high;
        const atr = atr14[j];

        // 필터 1: 갭 크기가 의미 있어야 함 (최소 ATR의 30%)
        if (gapSize < atr * 0.3) continue;

        // 필터 2: 갭을 만든 캔들(c2)의 거래량이 평균보다 높아야 함 (신뢰도)
        const avgVol = data.slice(Math.max(0, j - 10), j).reduce((s, v) => s + v.volume, 0) / 10;
        if (c2.volume < avgVol * 1.2) continue;

        // 현재 가격(i)이 이 갭 구간(c1.high ~ c3.low)에 진입하여 지지받는지 확인
        const currentPrice = data[i].close;
        const isTestingGap = currentPrice > c1.high && currentPrice < c3.low;
        const isRebounding = data[i].close > data[i].open; // 양봉 마감 시 지지 신뢰도 상승

        if (isTestingGap && isRebounding) {
            // 이미 갭이 완전히 메워졌는지 확인 (c1.high를 하향 돌파한 적이 없어야 함)
            const wasFilled = data.slice(j + 1, i).some(c => c.low < c1.high);
            if (!wasFilled) return 'FVG_REBALANCE_SUPPORT';
        }
    }

    return null;
};

const detectLiquiditySweep = (data, i) => {
    if (i < 10) return null;
    const recent = data.slice(i - 10, i);
    const lows = recent.map(d => d.low);
    const minLow = Math.min(...lows);
    // 더블 바텀 인근 스윕: 직전 최저가 살짝 깼다가 바로 복귀
    if (data[i].low < minLow && data[i].close > minLow) return 'LIQUIDITY_SWEEP';
    return null;
};

const detectBBSqueeze = (bb, mfi, i) => {
    if (i < 20) return null;
    const recentBBW = bb.bbw.slice(i - 10, i + 1);
    const minBBW = Math.min(...bb.bbw.slice(i - 20, i + 1));
    const isSqueezed = bb.bbw[i] < minBBW * 1.2; // 횡보 응축
    const isExpanding = bb.bbw[i] > bb.bbw[i - 1]; // 확장 시작
    const momentum = mfi[i] > 50;

    if (isSqueezed && isExpanding && momentum) return 'BB_SQUEEZE_BREAKOUT';
    return null;
};

const detectTrap = (prices, i, ref) => {
    if (!ref) return null;
    const waitline = ref.waistline;
    const prevClose = prices[i - 1];
    const prevClose2 = i >= 2 ? prices[i - 2] : prevClose;

    if (prevClose < waitline && prices[i] > waitline) return 'TRAP_RECOVERY';
    if (prevClose2 > waitline && prevClose < waitline && prices[i] < waitline) return 'TRAP_CONFIRMED';
    return null;
};

const detectMACounting = (prices, smas, i) => {
    if (!smas || !smas.sma5 || i < 5) return null;
    const priceAbove5Ago = prices[i] > prices[i - 5];
    const sma5Rising = smas.sma5[i] > smas.sma5[i - 1] && smas.sma5[i - 1] <= smas.sma5[i - 2];
    const nearSMA20 = Math.abs(prices[i] - smas.sma20[i]) / smas.sma20[i] < 0.02;

    if (sma5Rising && priceAbove5Ago && nearSMA20) return 'MA_COUNTING';
    return null;
};

// ─── Step 5: N자형 / E자형 목표가 계산 + 겹침 감지 ──────

export const calculateNWaveTarget = (refNode, currentLow) => {
    if (!refNode) return null;
    // N자형: 1차 상승 폭(고점-저점)을 조정 저점에 더함
    return (currentLow + refNode.nodeHeight).toFixed(2);
};

export const calculateEWaveTarget = (refNode) => {
    if (!refNode) return null;
    // E자형: 박스 상단 + 박스 폭
    return (refNode.nodeHigh + refNode.nodeHeight).toFixed(2);
};

// N/E 목표가 겹침 감지: 두 목표가 차이가 3% 이내면 "강력 저항"
export const checkTargetOverlap = (nTarget, eTarget) => {
    if (!nTarget || !eTarget) return { overlap: false };
    const n = parseFloat(nTarget);
    const e = parseFloat(eTarget);
    const diff = Math.abs(n - e) / Math.min(n, e);
    return {
        overlap: diff < 0.03,
        convergencePrice: ((n + e) / 2).toFixed(2),
        strength: diff < 0.01 ? 'VERY_STRONG' : diff < 0.03 ? 'STRONG' : 'WEAK'
    };
};

// ─── Dynamic Report Generator ────────────────────────────

const generateDynamicReport = (currentPrice, smas, perfectOrder, standardBar, refNode, distTo20MA, volumeTrend, prices, volumes, rsi) => {
    const i = smas.sma20.length - 1;
    const sma20 = smas.sma20[i];
    const sma5 = smas.sma5[i];
    const currentRSI = rsi ? rsi[i] : null;
    const smaGap = ((sma5 - sma20) / sma20 * 100).toFixed(2);

    // MA Report
    let maReport = { ko: '', en: '' };
    if (perfectOrder) {
        maReport.ko = `현재 5 > 20 > 60 > 120 완벽한 '정배열' 상태입니다. 이평간 간격 ${smaGap}%. 20일선($${sma20.toFixed(2)}) 위에서 건강한 상승 추세가 진행 중입니다.`;
        maReport.en = `Perfect Order: 5 > 20 > 60 > 120. MA gap: ${smaGap}%. Healthy uptrend above the 20-day MA ($${sma20.toFixed(2)}).`;
    } else if (sma5 > sma20) {
        maReport.ko = `5일선이 20일선 위로 올라온 '골든크로스' 구간입니다. 추세 전환 초입일 가능성이 높습니다.`;
        maReport.en = `'Golden Cross' zone: 5-day MA above 20-day MA. Possible early trend reversal.`;
    } else {
        maReport.ko = `주가가 주요 이평선 아래에 위치하여 하락 압력을 받고 있습니다. 반등 시 $${sma20.toFixed(2)}이 저항벽이 됩니다.`;
        maReport.en = `Price below key MAs under downward pressure. $${sma20.toFixed(2)} will act as resistance on bounces.`;
    }

    // Volume Report
    const recentVols = volumes.slice(-10);
    const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
    const volRatio = ((volumes[i] / avgVol) * 100).toFixed(0);

    let volReport = { ko: '', en: '' };
    if (volRatio > 200) {
        volReport.ko = `거래량이 10일 평균 대비 ${volRatio}%로 폭증! 세력의 강력한 개입이 감지됩니다.`;
        volReport.en = `Volume surged to ${volRatio}% of 10-day average! Strong institutional activity detected.`;
    } else if (volRatio > 130) {
        volReport.ko = `거래량이 평균보다 ${volRatio - 100}% 증가하며 매수/매도세가 활발합니다.`;
        volReport.en = `Volume up ${volRatio - 100}% vs average, showing active buying/selling.`;
    } else {
        volReport.ko = `거래량이 평균 대비 ${volRatio}%로 잠잠한 '관망 구간'입니다.`;
        volReport.en = `Volume quiet at ${volRatio}% of average. Wait-and-see zone.`;
    }

    // RSI Report
    let rsiReport = { ko: '', en: '' };
    if (currentRSI > 75) {
        rsiReport.ko = `RSI ${currentRSI.toFixed(1)}: 과매수 영역. 차익 실현 매물 주의!`;
        rsiReport.en = `RSI ${currentRSI.toFixed(1)}: Overbought. Watch for profit-taking!`;
    } else if (currentRSI < 25) {
        rsiReport.ko = `RSI ${currentRSI.toFixed(1)}: 과매도권. 기술적 반등 임박 가능성.`;
        rsiReport.en = `RSI ${currentRSI.toFixed(1)}: Oversold. Bounce likely imminent.`;
    } else {
        rsiReport.ko = `RSI ${currentRSI?.toFixed(1)}: 중립 영역. 과열 없이 추세 형성 중.`;
        rsiReport.en = `RSI ${currentRSI?.toFixed(1)}: Neutral. Trend forming without overextension.`;
    }

    // Base Candle & Waistline Report
    let barReport = { ko: '기준봉(세력 장대양봉)을 아직 발견하지 못했습니다.', en: 'No Base Candle found yet.' };
    let supportLevel = sma20.toFixed(2);
    let resistanceLevel = (currentPrice * 1.05).toFixed(2);

    if (standardBar && refNode) {
        supportLevel = refNode.waistline.toFixed(2);
        resistanceLevel = refNode.nodeHigh.toFixed(2);
        const distToWaist = (currentPrice - refNode.waistline) / refNode.waistline;

        if (Math.abs(distToWaist) < 0.02) {
            barReport.ko = `허리라인(세력가 $${supportLevel})에서 정확하게 지지를 받고 있습니다. 세력이 이 가격을 지키겠다는 의지!`;
            barReport.en = `Price is holding at the Waistline ($${supportLevel}). Institutions are defending this level!`;
        } else if (currentPrice > refNode.nodeHigh) {
            barReport.ko = `기준마디 고점($${resistanceLevel}) 돌파! 신고가 영역에서 매물을 소화 중입니다.`;
            barReport.en = `Broke above reference node high ($${resistanceLevel})! Absorbing supply at new highs.`;
        } else if (currentPrice < refNode.waistline) {
            barReport.ko = `허리라인($${supportLevel}) 아래로 이탈! 트랩(속임수)인지 진짜 하락인지 확인이 필요합니다.`;
            barReport.en = `Below Waistline ($${supportLevel})! Need to verify if this is a Trap or real breakdown.`;
        } else {
            barReport.ko = `기준마디 내부에서 눌림목 진행 중. 허리라인($${supportLevel})이 지지되면 안전.`;
            barReport.en = `Pullback within reference node. Safe as long as Waistline ($${supportLevel}) holds.`;
        }
    }

    return { maReport, volReport, rsiReport, barReport, supportLevel, resistanceLevel };
};

// ─── V21 Helper: Detect Bullish Factors (Return Array of Strings) ───
const detectBullishFactors = (data, i, smas, additionalData, marketAnalysis, refNode, pattern, smc, standardBar) => {
    const factors = [];
    const currentPrice = data[i].close;
    const { ema200, atr14, rsi, macd, stoch, keltner, bb, ichimoku } = additionalData;
    const sma20 = smas.sma20[i];
    const sma20Prev = smas.sma20[i - 1];

    // 1. Trend & MA
    if (ema200 && currentPrice > ema200[i]) factors.push("Uptrend (Above 200 EMA)");
    if (sma20 > sma20Prev) factors.push("SMA20 Rising");
    if (marketAnalysis && marketAnalysis.perfectOrder) factors.push("Perfect Order (MA Alignment)");

    // 2. Momentum
    if (rsi && rsi[i] > 50 && rsi[i] < 70) factors.push("RSI Bullish (>50)");
    if (macd && macd.histogram[i] > 0) factors.push("MACD Bullish");
    if (stoch && stoch.k[i] > stoch.d[i] && stoch.k[i] < 80) factors.push("Stochastic Golden Cross");

    // 3. Volatility (Squeeze)
    if (bb && keltner) {
        const bbUpper = bb.upper[i];
        const kcUpper = keltner.upper[i];
        if (currentPrice > bbUpper && currentPrice > kcUpper) factors.push("Power Squeeze Breakout");
    }

    // 4. SMC / Structure
    if (smc === 'SMC_CHOCH') factors.push("SMC CHoCH (Trend Reversal)");
    if (smc === 'SMC_BOS') factors.push("SMC BOS (Trend Continuation)");
    // Liquidity Sweep checked separately or passed in Pattern?
    // We can re-check sweep here if needed, or rely on 'pattern' arg if it covers it.
    // For now, let's check sweep usage in creating the signal.

    // 5. Patterns
    if (pattern === 'THREE_BAR_BUY') factors.push("3-Bar Play Pattern");
    if (pattern === 'ENGULFING_BULLISH') factors.push("Bullish Engulfing");
    if (additionalData.rsiDiv === 'BULLISH_DIV') factors.push("RSI Divergence");

    // 6. Ichimoku
    if (ichimoku && currentPrice > ichimoku.spanA[i] && currentPrice > ichimoku.spanB[i]) factors.push("Above Ichimoku Cloud");

    // 7. Support
    if (refNode && currentPrice > refNode.waistline && data[i].low <= refNode.waistline * 1.01) factors.push("Waistline Support Bounce");

    return factors;
};

// ─── V21 Helper: Detect Bearish Factors (Return Array of Strings) ───
const detectBearishFactors = (data, i, smas, additionalData, refNode) => {
    const factors = [];
    const currentPrice = data[i].close;
    const prevPrice = data[i - 1].close;
    const sma20 = smas.sma20[i];
    const { rsi, volume } = additionalData;

    // 1. Trend Break
    if (currentPrice < sma20 && currentPrice < prevPrice) factors.push("SMA20 Breakdown");

    // 2. Support Trap
    if (refNode && currentPrice < refNode.waistline) factors.push("Waistline Support Broken");

    // 3. Momentum Loss
    if (rsi && rsi[i] < 40) factors.push("RSI Bearish (<40)");
    // Dead Cross? (Check SMA5 crossing SMA20)
    if (smas.sma5[i] < smas.sma20[i] && smas.sma5[i - 1] >= smas.sma20[i - 1]) factors.push("Dead Cross (5/20)");

    // 4. Volume Climax (Buying Exhaustion)
    // Passed differently, usually check relative volume.
    // We'll handle Climax in main logic or add here if we pass volume data.

    return factors;
};

// ─── Main Strategy Engine ────────────────────────────────

export const recommendStrategy = (currentPrice, smas, perfectOrder, standardBar, prevPrice, prices, volumes, marketAnalysis, rsi, refNode, additionalData = {}, timeframe = '15m') => {
    const i = smas.sma20.length - 1;
    const { ema200, atr14, keltner, bb, stoch, sar } = additionalData;

    const sma20 = smas.sma20[i];
    const prevSMA20 = smas.sma20[i - 3] || smas.sma20[0];
    const sma20Slope = (sma20 - prevSMA20) / prevSMA20;
    const volumeTrend = marketAnalysis?.volumeTrend || 'neutral';
    const distTo20MA = (currentPrice - sma20) / sma20;

    // ── V11 High-Timeframe Multipliers ──
    let tpMult = 4.5;
    let slMult = 3.0;
    if (timeframe === '1wk') {
        tpMult = 7.0;
        slMult = 4.0;
    }

    const currentVol = volumes[i];

    // Step 2: 허리라인
    const waistline = refNode ? refNode.waistline : (standardBar ? standardBar.waistline : null);

    // Step 3: 패턴 감지
    const data_slice = prices.map((p, idx) => ({ close: p, open: p, high: p, low: p, volume: volumes[idx] }));
    let pattern = detectPattern(data_slice, prices, volumes, smas, standardBar, refNode, additionalData);
    if (additionalData.rsiDiv === 'BULLISH_DIV') pattern = 'RSI_DIVERGENCE';
    const smc = detectSMCStructures(data_slice, i);

    // ── V21 Confluence Logic ──
    const bullishFactors = detectBullishFactors(data_slice, i, smas, additionalData, marketAnalysis, refNode, pattern, smc, standardBar);
    const bearishFactors = detectBearishFactors(data_slice, i, smas, additionalData, refNode);

    // Check Volume Climax (Bearish) explicitly
    const avgVol10 = volumes.slice(Math.max(0, i - 10), i).reduce((s, v) => s + v, 0) / Math.min(10, i);
    const volumeClimax = currentVol > avgVol10 * 3.0; // 300% 이상
    if (volumeClimax && currentPrice > prevPrice) bearishFactors.push("Volume Climax (Buying Exhaustion)");

    // 3. Confirm Liquidity Sweep (V20 Feature)
    // If not currently sweeping but swept recently + MSB, add to factors if MSB confirmed
    const liquiditySweep = detectLiquiditySweep(data_slice, i);
    let sweepIdx = -1;
    if (!liquiditySweep) {
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            if (detectLiquiditySweep(data_slice, j)) {
                sweepIdx = j;
                break;
            }
        }
    }
    if (sweepIdx !== -1) {
        const sweepCandleHigh = data_slice[sweepIdx].high;
        if (currentPrice > sweepCandleHigh) {
            if (!bullishFactors.includes("Liquidity Reversal (Confirmed)")) bullishFactors.push("Liquidity Reversal (Confirmed)");
        }
    }

    const calculateConfluenceScore = () => {
        // Base score 50. Each factor +15.
        // 2 factors = 80 (Buy Threshold)
        let score = 50 + (bullishFactors.length * 15);
        if (bearishFactors.length > 0) score = 10; // Bearish override
        return Math.min(score, 99);
    };

    const confluenceScore = calculateConfluenceScore();
    const atr = atr14 ? atr14[i] : (currentPrice * 0.03);
    const chandelierStop = additionalData.chandelier?.[i]?.stop;

    let result = {
        action: { ko: 'WAIT', en: 'WAIT' },
        reason: { ko: '분석 대기 중...', en: 'Analyzing...' },
        targetPrice: null, stopLoss: null, pattern: 'N/A',
        score: confluenceScore,
        bullishFactors: bullishFactors,
        bearishFactors: bearishFactors
    };

    // ── V23 Bullish Dominance Check ──
    const bullishDominance = bullishFactors.length >= 3 && currentPrice > ema200?.[i];

    // ── Priority 1: SELL (Sensitivity: 1 Factor, but context-aware in V23) ──
    if (bearishFactors.length >= 1) {
        const primaryReason = bearishFactors[0];

        // V23 Logic: If strong bullish dominance, downgrade minor sells to caution
        if (bullishDominance && bearishFactors.length < 2 && !primaryReason.includes('Dead Cross') && !primaryReason.includes('Broken')) {
            result = {
                action: { ko: 'HOLD (눌림목 주의)', en: 'HOLD (BULLISH PULLBACK)' },
                reason: {
                    ko: `강력한 상승 추세 속에 일시적 리스크(${primaryReason})가 감지되었습니다. 추세 지배력이 높으므로 즉시 매도보다는 주요 지지선($${waistline?.toFixed(2)}) 이탈 여부를 관망하십시오.`,
                    en: `Minor risk (${primaryReason}) detected within strong uptrend. High bullish dominance found; watch the support at $${waistline?.toFixed(2)} before exiting.`
                },
                targetPrice: (currentPrice * 1.05).toFixed(2),
                stopLoss: waistline?.toFixed(2) || currentPrice.toFixed(2),
                pattern: 'Bullish Pullback'
            };
        } else {
            result = {
                action: { ko: 'SELL (위험 감지)', en: 'SELL (RISK DETECTED)' },
                reason: {
                    ko: `1. 매도/청산 시그널 발생: ${primaryReason}.\n2. 리스크 관리가 최우선입니다. (감지된 악재: ${bearishFactors.join(', ')})`,
                    en: `1. Sell signal detected: ${primaryReason}.\n2. Prioritize risk management. (Factors: ${bearishFactors.join(', ')})`
                },
                targetPrice: null, stopLoss: waistline?.toFixed(2) || currentPrice.toFixed(2),
                pattern: primaryReason
            };
        }
    }
    // ── Priority 2: BUY (Strict Confluence: 2+ Factors) ──
    else if (bullishFactors.length >= 2) {
        // Construct detailed reason
        const factorsListKo = bullishFactors.map((f, idx) => `${idx + 1}. ${f}`).join('\n');
        const factorsListEn = bullishFactors.join(', ');

        let primaryPattern = "Confluence Buy";
        if (bullishFactors.some(f => f.includes('Squeeze'))) primaryPattern = "Power Squeeze";
        else if (bullishFactors.some(f => f.includes('Liquidity'))) primaryPattern = "Liquidity Reversal";
        else if (bullishFactors.some(f => f.includes('CHoCH'))) primaryPattern = "SMC Reversal";

        result = {
            action: { ko: 'BUY (강력 매수)', en: 'BUY (STRONG CONFLUENCE)' },
            reason: {
                ko: `엄격한 멀티 팩터 기준 충족 (${bullishFactors.length}가지).\n${factorsListKo}\n확률 높은 정석 타점입니다.`,
                en: `Strict Multi-Factor Criteria Met (${bullishFactors.length} factors).\n${factorsListEn}\nHigh probability institutional entry.`
            },
            targetPrice: (currentPrice + (atr * tpMult)).toFixed(2),
            targetPrice2: (currentPrice + (atr * tpMult * 2.0)).toFixed(2),
            stopLoss: (chandelierStop || (currentPrice - (atr * slMult))).toFixed(2),
            pattern: primaryPattern
        };
    }
    // ── Default: HOLD / WAIT ──
    else {
        result = {
            action: { ko: perfectOrder ? 'HOLD' : 'WAIT', en: perfectOrder ? 'HOLD' : 'WAIT' },
            reason: {
                ko: perfectOrder ? '주요 이평선이 정배열로 추세를 견고하게 따르고 있습니다. 기관의 보유 흐름이 지속 중이니 기준 이탈 전까지 홀딩하십시오.' : '현재 기관의 명확한 매수/매도 의도가 포착되지 않은 관망 구간입니다. 섣부른 진입보다는 다음 기준봉을 기다리십시오.',
                en: perfectOrder ? 'Trend intact with solid institutional order. Maintain position.' : 'No clear institutional bias. Staying on the sidelines to protect capital until next major catalyst.'
            },
            targetPrice: perfectOrder ? (currentPrice * 1.12).toFixed(2) : null,
            stopLoss: perfectOrder ? (additionalData.chandelier?.[i]?.stop || sma20.toFixed(2)) : null,
            pattern: perfectOrder ? 'Trending' : 'Sideways'
        };
    }

    // Educational Detail (Simplified for V21)
    if (result.action.en.includes('BUY')) {
        result.educationalDetail = {
            ko: "V21 멀티 팩터 전략: 2개 이상의 강력한 기술적 요인이 중첩될 때만 진입하여 승률을 극대화합니다.",
            en: "V21 Multi-Factor Strategy: Enters only when 2+ strong technical factors align to maximize win rate."
        };
    } else if (result.action.en.includes('SELL')) {
        result.educationalDetail = {
            ko: "리스크 관리 우선: 단 하나의 매도 신호라도 감지되면 즉시 대응하여 손실을 방어합니다.",
            en: "Risk First: Immediate response to any single sell signal to protect capital."
        };
    }

    result.dynamicReport = generateDynamicReport(currentPrice, smas, perfectOrder, standardBar, refNode, distTo20MA, volumeTrend, prices, volumes, rsi);

    return result;
};
const calculateStochastic = (data, kPeriod = 14, dPeriod = 3) => {
    const kValues = [];
    for (let i = 0; i < data.length; i++) {
        if (i < kPeriod - 1) {
            kValues.push(50);
            continue;
        }
        const slice = data.slice(i - kPeriod + 1, i + 1);
        const low = Math.min(...slice.map(d => d.low));
        const high = Math.max(...slice.map(d => d.high));
        const k = ((data[i].close - low) / (high - low)) * 100;
        kValues.push(k);
    }
    const dValues = calculateSMA(kValues, dPeriod);
    return { k: kValues, d: dValues };
};

const detectRSIDivergence = (prices, rsi, i) => {
    if (i < 20 || !rsi) return null;

    // Bullish Divergence: Price Lower Low, RSI Higher Low
    const priceCurrentLow = prices[i];
    const pricePrevLowIdx = prices.slice(i - 20, i - 5).indexOf(Math.min(...prices.slice(i - 20, i - 5))) + (i - 20);
    const pricePrevLow = prices[pricePrevLowIdx];

    const rsiCurrentLow = rsi[i];
    const rsiPrevLow = rsi[pricePrevLowIdx];

    if (priceCurrentLow < pricePrevLow && rsiCurrentLow > rsiPrevLow && rsiCurrentLow < 40) {
        return 'BULLISH_DIV';
    }

    // Bearish Divergence: Price Higher High, RSI Lower High
    const priceCurrentHigh = prices[i];
    const pricePrevHighIdx = prices.slice(i - 20, i - 5).indexOf(Math.max(...prices.slice(i - 20, i - 5))) + (i - 20);
    const pricePrevHigh = prices[pricePrevHighIdx];

    const rsiCurrentHigh = rsi[i];
    const rsiPrevHigh = rsi[pricePrevHighIdx];

    if (priceCurrentHigh > pricePrevHigh && rsiCurrentHigh < rsiPrevHigh && rsiCurrentHigh > 60) {
        return 'BEARISH_DIV';
    }

    return null;
};

// ─── Market Analysis ──────────────────────────────────────

export const performBacktest = (data, markers, timeframe = '15m') => {
    if (!markers || markers.length === 0) return { winRate: 0, total: 0 };

    const validMarkers = markers.filter(m => m.shape === 'arrowUp' && m.targetPrice && m.stopLoss);
    const testSet = validMarkers.slice(-50); // 최근 50개 정석 타점 검증
    if (testSet.length === 0) return { winRate: 0, total: 0 };

    let wins = 0;
    // 타임프레임별 검증 기간 (일봉/주봉 스윙에 최적화)
    let lookahead = 60;
    if (timeframe === '1wk') lookahead = 52;

    testSet.forEach(m => {
        const startIdx = data.findIndex(d => d.time === m.time);
        if (startIdx === -1) return;

        const target = parseFloat(m.targetPrice);
        const sl = parseFloat(m.stopLoss);
        const isBuy = true; // V12: Institutional Buy Focus
        const entryPrice = data[startIdx].close;

        // 현실적인 익절 임계값 (T1)
        let t1Threshold = 0.070; // 일봉 기본 7%
        if (timeframe === '1wk') t1Threshold = 0.15; // 주봉은 15% 이상

        const t1Target = isBuy ? (entryPrice * (1 + t1Threshold)) : (entryPrice * (1 - t1Threshold));

        for (let j = startIdx + 1; j < Math.min(startIdx + lookahead, data.length); j++) {
            const candle = data[j];
            if (isBuy) {
                if (candle.high >= target || candle.high >= t1Target) { wins++; break; }
                if (candle.low <= sl) break;
            } else {
                if (candle.low <= target || candle.low <= t1Target) { wins++; break; }
                if (candle.high >= sl) break;
            }
        }
    });

    return {
        winRate: ((wins / testSet.length) * 100).toFixed(1),
        total: testSet.length,
        wins,
        losses: testSet.length - wins,
        t1SuccessRate: ((wins / testSet.length) * 100).toFixed(1)
    };
};

// ─── Signal Generator (Historical) ──────────────────────

export const generateAllSignals = (data, mtfData = null, timeframe = '15m') => {
    if (!data || data.length < 50) return { markers: [], backtest: null };

    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const sma5 = calculateSMA(prices, 5);
    const sma10 = calculateSMA(prices, 10);
    const sma20 = calculateSMA(prices, 20);
    const sma60 = calculateSMA(prices, 60);
    const sma120 = calculateSMA(prices, 120);
    const sma240 = calculateSMA(prices, 240);
    const ema200 = calculateEMA(prices, 200);
    const atr14 = calculateATR(data, 14);
    const rsi = calculateRSI(prices, 14);
    const { upper, lower, bbw } = calculateBollingerBands(prices, 20, 2);
    const mfi = calculateMFI(data, 14);
    const macd = calculateMACD(prices);
    const volOsc = calculateVolumeOscillator(volumes);
    const ichimoku = calculateIchimokuCloud(data);
    const vixFix = calculateWilliamsVixFix(data);
    const chandelier = calculateChandelierStop(data, atr14);
    const stoch = calculateStochastic(data);
    const sar = calculateSAR(data);
    const keltner = calculateKeltnerChannels(data, 20, 10, 1.5); // V20: Power Squeeze

    // MTF Status (Weekly trend for Daily, etc.)
    let mtfStatus = null;
    if (mtfData && mtfData.length > 50) {
        const mtfPrices = mtfData.map(d => d.close);
        const mtfEma200 = calculateEMA(mtfPrices, 200);
        const lastMtfPrice = mtfPrices[mtfPrices.length - 1];
        const lastMtfEma = mtfEma200[mtfEma200.length - 1];
        mtfStatus = lastMtfPrice > lastMtfEma ? 'bullish' : 'bearish';
    }

    const smas = { sma5, sma10, sma20, sma60, sma120, sma240 };
    const markers = [];
    let lastBuyTick = -100;
    let lastSellTick = -100;

    // Step 1 & 2: 최신 기준봉 및 마디 찾기 (매 캔들마다 업데이트 되지만 시각화를 위해 순회)
    for (let i = 20; i < data.length; i++) {
        // ... (existing slice and safety checks) ...
        if (!prices[i] || !prices[i - 1]) continue;

        const slice = data.slice(0, i + 1);
        const smaSlice = {
            sma5: sma5.slice(0, i + 1),
            sma10: sma10.slice(0, i + 1),
            sma20: sma20.slice(0, i + 1),
            sma60: sma60.slice(0, i + 1),
            sma120: sma120.slice(0, i + 1),
            sma240: sma240 ? sma240.slice(0, i + 1) : null
        };
        const standardBar = findStandardBar(slice, smaSlice);
        const refNode = calculateReferenceNode(slice, standardBar);

        const marketAnalysis = analyzeMarket(prices.slice(0, i + 1), volumes.slice(0, i + 1), smaSlice);

        // Safety for additional indicators
        const additionalData = {
            ema200: ema200 ? ema200.slice(0, i + 1) : null,
            atr14: atr14 ? atr14.slice(0, i + 1) : null,
            bb: upper ? { upper: upper.slice(0, i + 1), lower: lower.slice(0, i + 1), bbw: bbw.slice(0, i + 1) } : null,
            mfi: mfi ? mfi.slice(0, i + 1) : null,
            macd: macd && macd.macdLine ? {
                macdLine: macd.macdLine.slice(0, i + 1),
                signalLine: macd.signalLine.slice(0, i + 1),
                histogram: macd.histogram.slice(0, i + 1)
            } : null,
            sar: sar ? sar.slice(0, i + 1) : null,
            volOsc: volOsc,
            mtfStatus: mtfStatus,
            ichimoku: {
                tenkan: ichimoku.tenkan.slice(0, i + 1),
                kijun: ichimoku.kijun.slice(0, i + 1),
                spanA: ichimoku.spanA.slice(0, i + 1),
                spanB: ichimoku.spanB.slice(0, i + 1)
            },
            vixFix: vixFix.slice(0, i + 1),
            chandelier: chandelier.slice(0, i + 1),
            stoch: { k: stoch.k.slice(0, i + 1), d: stoch.d.slice(0, i + 1) },
            keltner: { upper: keltner.upper.slice(0, i + 1), lower: keltner.lower.slice(0, i + 1) }
        };

        const rsiDiv = detectRSIDivergence(prices.slice(0, i + 1), rsi ? rsi.slice(0, i + 1) : null, i);
        additionalData.rsiDiv = rsiDiv;

        const result = recommendStrategy(
            prices[i],
            smaSlice,
            marketAnalysis.perfectOrder,
            standardBar,
            prices[i - 1],
            prices.slice(0, i + 1),
            volumes.slice(0, i + 1),
            marketAnalysis,
            rsi ? rsi.slice(0, i + 1) : null,
            refNode,
            additionalData
        );

        const actionStr = result.action.en;
        const cooldown = 10; // 10 bars cooldown for identical signal types

        if (actionStr.includes('BUY') && (i - lastBuyTick >= cooldown)) {
            markers.push({
                time: data[i].time,
                position: 'belowBar',
                color: '#26a69a',
                shape: 'arrowUp',
                text: `${result.action.ko}`,
                reason: result.reason,
                educationalDetail: result.educationalDetail,
                targetPrice: result.targetPrice,
                stopLoss: result.stopLoss,
                bullishFactors: result.bullishFactors,
                bearishFactors: result.bearishFactors
            });
            lastBuyTick = i;
        } else if (actionStr.includes('SELL') && (i - lastSellTick >= cooldown)) {
            markers.push({
                time: data[i].time,
                position: 'aboveBar',
                color: '#ef5350',
                shape: 'arrowDown',
                text: `${result.action.ko}`,
                reason: result.reason,
                educationalDetail: result.educationalDetail,
                targetPrice: result.targetPrice,
                stopLoss: result.stopLoss,
                bullishFactors: result.bullishFactors,
                bearishFactors: result.bearishFactors
            });
            lastSellTick = i;
        }
    }

    const backtest = performBacktest(data, markers, timeframe);
    const referenceLines = findReferenceLines(data);
    return { markers, backtest, referenceLines };
};
