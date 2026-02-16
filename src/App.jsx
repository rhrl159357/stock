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
                setData(stockData);

                if (stockData.length === 0) return;

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
                const prevPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice;

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
