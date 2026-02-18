import { useState, useEffect } from 'react'
import { fetchStockData } from './services/api'
import ChartComponent from './components/ChartComponent'
import { StrategyHeader, AnalysisReport } from './components/SignalDisplay'
import Sidebar from './components/Sidebar'
import TradeJournal from './components/TradeJournal'
import SignalDecoder from './components/SignalDecoder'
import { companies } from './data/companies'
import { calculateSMA, calculateEMA, calculateATR, calculateBollingerBands, calculateMFI, analyzeMarket, recommendStrategy, findStandardBar, calculateReferenceNode, findReferenceLines, generateAllSignals, calculateRSI, calculateMACD, calculateSAR } from './utils/indicators'
import { translations } from './utils/translations'

function App() {
    const [symbol, setSymbol] = useState('AAPL');
    const [searchInput, setSearchInput] = useState('AAPL');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [standardBar, setStandardBar] = useState(null);
    const [selectedSignal, setSelectedSignal] = useState(null);
    const [language, setLanguage] = useState('ko'); // 'ko' or 'en'
    const [timeframe, setTimeframe] = useState('1d'); // Default: Daily
    const [scanResults, setScanResults] = useState({}); // { SYMBOL: { action: 'BUY', currentPrice: 150, targetBuyPrice: 155 } }
    const [scanProgress, setScanProgress] = useState({ current: 0, total: (companies || []).length, isScanning: false });

    const t = translations[language];

    const [personalTrades, setPersonalTrades] = useState(() => {
        const saved = localStorage.getItem('personalTrades');
        return saved ? JSON.parse(saved) : [];
    });

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'ko' ? 'en' : 'ko');
    };

    const handleAddTrade = (trade) => {
        const newTrades = [...personalTrades, trade];
        setPersonalTrades(newTrades);
        localStorage.setItem('personalTrades', JSON.stringify(newTrades));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSymbol(searchInput.toUpperCase());
        setSelectedSignal(null);
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const stockData = await fetchStockData(symbol, timeframe);

                // ★ 방어적 처리: API가 데이터를 못 가져온 경우
                if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
                    setData([]);
                    setError(`데이터를 불러올 수 없습니다 (${symbol}). 잠시 후 다시 시도해주세요.`);
                    return;
                }
                setData(stockData);

                const prices = stockData.map(d => d.close);
                const volumes = stockData.map(d => d.volume);
                const smas = {
                    sma5: calculateSMA(prices, 5),
                    sma20: calculateSMA(prices, 20),
                    sma60: calculateSMA(prices, 60),
                    sma120: calculateSMA(prices, 120),
                    sma240: calculateSMA(prices, 240),
                };
                const marketAnalysis = analyzeMarket(prices, volumes, smas);
                const rsi = calculateRSI(prices, 14);

                // 전역 지표 추가 계산 (Global SMC + Trend System)
                const ema200 = calculateEMA(prices, 200);
                const atr14 = calculateATR(stockData, 14);
                const bb = calculateBollingerBands(prices, 20, 2);
                const mfi = calculateMFI(stockData, 14);
                const macd = calculateMACD(prices);
                const sar = calculateSAR(stockData);

                const additionalData = { ema200, atr14, bb, mfi, macd, sar };

                // Step 1: 기준봉 (이평선 필터 포함)
                const foundStandardBar = findStandardBar(stockData, smas);
                setStandardBar(foundStandardBar);

                // Step 2: 기준마디 & 허리라인
                const refNode = calculateReferenceNode(stockData, foundStandardBar);

                // 기준가(세력가) 자동 수평선
                const referenceLines = findReferenceLines(stockData);

                const currentPrice = prices[prices.length - 1];
                const prevPrice = prices && prices.length > 1 ? prices[prices.length - 2] : currentPrice;

                // Strategy with refNode & SMC data
                const strategy = recommendStrategy(currentPrice, smas, marketAnalysis.perfectOrder, foundStandardBar, prevPrice, prices, volumes, marketAnalysis, rsi, refNode, additionalData);

                // Multi-Timeframe Check (Major Trend Filter)
                let mtfData = null;
                const mtfMap = {
                    '1d': '1wk'
                };
                const majorTimeframe = mtfMap[timeframe];

                if (majorTimeframe) {
                    try {
                        mtfData = await fetchStockData(symbol, majorTimeframe);
                    } catch (e) {
                        console.warn(`MTF (${majorTimeframe}) fetch failed`, e);
                    }
                }

                const { markers: systemSignals, backtest, referenceLines: historyRefLines } = generateAllSignals(stockData, mtfData, timeframe);

                const symbolPersonalSignals = personalTrades
                    .filter(t => t.symbol === symbol)
                    .map(trade => ({
                        time: trade.time,
                        position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: trade.type === 'BUY' ? '#FFD700' : '#1E90FF',
                        shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: trade.type,
                        size: 2,
                        reason: {
                            ko: '사용자가 직접 기록한 매매 내역입니다.',
                            en: 'Manually recorded trade history.'
                        },
                        educationalDetail: {
                            ko: '사용자님이 직접 기록하신 타점입니다. AI 분석과 비교해보세요.',
                            en: 'Your manual entry. Compare this with AI analysis results.'
                        }
                    }));

                strategy.allSignals = [...systemSignals, ...symbolPersonalSignals];
                strategy.backtest = backtest; // 백테스트 데이터 저장
                strategy.mtfStatus = mtfData ? `ACTIVE (${majorTimeframe} Filtered)` : "INACTIVE";

                setAnalysis({ ...marketAnalysis, strategy, standardBar: foundStandardBar, refNode, referenceLines });

                // 필터용 데이터 누적 (사이드바 리스트 유지용 - 스캐너와 동일하게 MTF 없이 체크)
                const { markers: lenientSignals } = generateAllSignals(stockData, null, timeframe);

                // 오늘/최근 타점 확인 (최근 2개 봉 검사로 유지력 강화)
                const todayMarkerLenient = lenientSignals.find(m =>
                    m.shape === 'arrowUp' &&
                    (m.time === stockData[stockData.length - 1].time || (stockData.length > 1 && m.time === stockData[stockData.length - 2].time))
                );

                let yesterdayMarkerLenient = null;
                const yIdx = stockData.length - 2;
                if (yIdx >= 0) {
                    const yTime = stockData[yIdx].time;
                    yesterdayMarkerLenient = lenientSignals.find(m => m.shape === 'arrowUp' && m.time === yTime);
                }

                setScanResults(prev => ({
                    ...prev,
                    [symbol]: {
                        isBuyToday: !!todayMarkerLenient,
                        isBuyYesterday: !!yesterdayMarkerLenient,
                        currentPrice: currentPrice,
                        targetBuyPrice: parseFloat(strategy.targetBuyPrice) || 0
                    }
                }));


            } catch (err) {
                console.error(err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [symbol, personalTrades, timeframe]);

    // 자동 스캐너 로직 (Background Sequential Scanner)
    const startScanner = async () => {
        if (scanProgress.isScanning) return;
        setScanProgress(prev => ({ ...prev, isScanning: true, current: 0 }));

        if (!companies || companies.length === 0) return;
        for (let i = 0; i < companies.length; i++) {
            const currentCompany = companies[i];

            // 현재 보고 있는 종목은 이미 loadData에서 처리되므로 스킵하거나 최신화
            try {
                const stockData = await fetchStockData(currentCompany.symbol, timeframe);
                if (stockData && stockData.length > 0) {
                    const prices = stockData.map(d => d.close);
                    const volumes = stockData.map(d => d.volume);
                    const smas = {
                        sma5: calculateSMA(prices, 5),
                        sma20: calculateSMA(prices, 20),
                        sma60: calculateSMA(prices, 60),
                        sma120: calculateSMA(prices, 120),
                        sma240: calculateSMA(prices, 240),
                    };
                    const marketAnalysis = analyzeMarket(prices, volumes, smas);
                    const rsi = calculateRSI(prices, 14);
                    const ema200 = calculateEMA(prices, 200);
                    const atr14 = calculateATR(stockData, 14);
                    const bb = calculateBollingerBands(prices, 20, 2);
                    const mfi = calculateMFI(stockData, 14);
                    const macd = calculateMACD(prices);
                    const sar = calculateSAR(stockData);
                    const additionalData = { ema200, atr14, bb, mfi, macd, sar };

                    const foundStandardBar = findStandardBar(stockData, smas);
                    const refNode = calculateReferenceNode(stockData, foundStandardBar);
                    const currentPrice = prices[prices.length - 1];
                    const prevPrice = prices && prices.length > 1 ? prices[prices.length - 2] : currentPrice;

                    const strategyDay = recommendStrategy(currentPrice, smas, marketAnalysis.perfectOrder, foundStandardBar, prevPrice, prices, volumes, marketAnalysis, rsi, refNode, additionalData);

                    let strategyPrev = { action: { en: 'WAIT' } };
                    if (prices.length > 2) {
                        const prevPrices = prices.slice(0, -1);
                        const prevVolumes = volumes.slice(0, -1);
                        const prevStockData = stockData.slice(0, -1);
                        // 어제 분석 생략 (복잡도 감소를 위해) - 필요시 나중에 추가
                        // 여기서는 간단히 흉내만 내거나, 어제의 결과를 가정한 필터링 로직 준비만 함
                    }

                    // 전체 신호 생성 (과거 복기용)
                    // MTF는 속도를 위해 null로 전달 (필요시 데이터 추가 가능)
                    const { markers: allSignals } = generateAllSignals(stockData, null, timeframe);

                    // 1. 오늘/최근 타점 확인 (데이터 업데이트 오차 고려하여 최근 2개 봉 검사)
                    const todayMarker = allSignals.find(m =>
                        m.shape === 'arrowUp' &&
                        (m.time === stockData[stockData.length - 1].time || (stockData.length > 1 && m.time === stockData[stockData.length - 2].time))
                    );

                    // 2. 어제 타점 확인 (정확히 어제 고정)
                    const yesterdayIdx = stockData.length - 2;
                    let yesterdayMarker = null;
                    if (yesterdayIdx >= 0) {
                        const yesterdayTime = stockData[yesterdayIdx].time;
                        yesterdayMarker = allSignals.find(m => m.shape === 'arrowUp' && m.time === yesterdayTime);
                    }

                    setScanResults(prev => ({
                        ...prev,
                        [currentCompany.symbol]: {
                            isBuyToday: !!todayMarker,
                            isBuyYesterday: !!yesterdayMarker,
                            currentPrice: currentPrice,
                            targetBuyPrice: parseFloat(strategyDay.targetBuyPrice) || 0
                        }
                    }));
                }
            } catch (err) {
                console.warn(`Scanner failed for ${currentCompany.symbol}:`, err);
            }

            setScanProgress(prev => ({ ...prev, current: i + 1 }));
            // API 과부하 방지를 위한 충분한 딜레이 (429 방어)
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        setScanProgress(prev => ({ ...prev, isScanning: false }));
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <Sidebar
                companies={companies}
                selectedSymbol={symbol}
                onSelect={(newSymbol) => {
                    setSymbol(newSymbol);
                    setSearchInput(newSymbol);
                    setSelectedSignal(null);
                }}
                t={t}
                scanResults={scanResults}
                scanProgress={scanProgress}
                onStartScan={startScanner}
            />

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#121212' }}>
                <header style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '350px' }}>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t.searchPlaceholder}
                            style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#FFF', width: '250px' }}
                        />
                        <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', background: '#2196F3', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            {t.searchButton}
                        </button>
                    </form>

                    <div className="timeframe-selector" style={{ display: 'flex', gap: '5px', background: '#222', padding: '5px', borderRadius: '8px', border: '1px solid #444' }}>
                        {Object.keys(t.timeframes).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => {
                                    setTimeframe(tf);
                                    setSelectedSignal(null);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    background: timeframe === tf ? '#4CAF50' : 'transparent',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: timeframe === tf ? 'bold' : 'normal'
                                }}
                            >
                                {t.timeframes[tf]}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={toggleLanguage}
                        style={{ padding: '8px 15px', background: '#444', color: '#FFF', border: '1px solid #666', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {language === 'ko' ? '🇺🇸 English' : '🇰🇷 한국어'}
                    </button>

                    <span style={{ color: '#4CAF50', fontSize: '14px', fontWeight: 'bold' }}>
                        ● {t.liveData}
                    </span>
                </header>

                <div className="card">
                    {loading && <p>{t.loading} {symbol}...</p>}
                    {error && <p style={{ color: 'red' }}>{t.error} {error}</p>}

                    {!loading && !error && data.length > 0 && (
                        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                                <p style={{ marginBottom: '15px', color: '#888' }}>
                                    {t.currentSymbol} <strong style={{ color: '#FFF' }}>{symbol}</strong>
                                </p>

                                {analysis && <StrategyHeader analysis={analysis} t={t} lang={language} />}

                                <div style={{ marginBottom: '20px' }}>
                                    <TradeJournal
                                        currentSymbol={symbol}
                                        trades={personalTrades}
                                        onAddTrade={handleAddTrade}
                                        t={t}
                                    />
                                </div>

                                <ChartComponent
                                    data={data}
                                    standardBar={standardBar}
                                    strategy={analysis?.strategy}
                                    referenceLines={analysis?.referenceLines}
                                    onSignalClick={(signal) => {
                                        setSelectedSignal(signal);
                                        document.getElementById('signal-decoder-anchor')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    lang={language}
                                />

                                <div id="signal-decoder-anchor">
                                    <SignalDecoder signal={selectedSignal} t={t} lang={language} />
                                </div>

                                {analysis && <AnalysisReport analysis={analysis} t={t} lang={language} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default App
