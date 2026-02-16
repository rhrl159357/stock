import React from 'react';

export const StrategyHeader = ({ analysis, t, lang }) => {
    if (!analysis) return null;
    const { perfectOrder, volumeTrend, convergence, strategy } = analysis;

    const getActionColor = (action) => {
        const act = typeof action === 'string' ? action : action.en;
        if (act.includes('BUY')) return '#4CAF50';
        if (act.includes('WAIT') || act.includes('HOLD')) return '#FF9800';
        if (act.includes('WATCH') || act.includes('STOP') || act.includes('SELL')) return '#FF5252';
        return '#BBB';
    };

    const getVolTrendLabel = (trend) => {
        if (trend.includes('confirmed')) return t.bullishConfirmed;
        if (trend.includes('weak')) return t.bullishWeak;
        return t.neutral;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
            <div style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333'
            }}>
                <div style={{ color: perfectOrder ? '#4CAF50' : '#888' }}>
                    <strong>{t.maAlignment}</strong> {perfectOrder ? `✅ ${t.perfectOrderKR}` : `❌ ${t.notPerfectOrderKR}`}
                </div>
                <div style={{ color: volumeTrend.includes('confirmed') ? '#4CAF50' : '#DDD' }}>
                    <strong>{t.volumeTrend}</strong> {getVolTrendLabel(volumeTrend)}
                </div>
                <div style={{ color: convergence ? '#FFEB3B' : '#888' }}>
                    <strong>{t.maConvergence}</strong> {convergence ? `🔥 ${t.convergenceTrue}` : `❄️ ${t.convergenceFalse}`}
                </div>
                {strategy?.mtfStatus && (
                    <div style={{ color: strategy.mtfStatus.includes('ACTIVE') ? '#00e5ff' : '#888' }}>
                        <strong>{t.mtfStatus}</strong> {strategy.mtfStatus}
                    </div>
                )}
            </div>

            {strategy && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    border: `2px solid ${getActionColor(strategy.action)}`,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    textAlign: 'center'
                }}>
                    <h2 style={{ margin: '0 0 8px 0', color: getActionColor(strategy.action), fontSize: '1.6em' }}>
                        {t.strategyTitle} {strategy.action[lang]}
                    </h2>
                    <p style={{ margin: '8px 0', fontSize: '1.2em', fontWeight: 'bold', color: '#FFF', background: '#333', padding: '10px', borderRadius: '6px' }}>
                        {strategy.reason[lang]}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {strategy.targetPrice && (
                            <div style={{ fontSize: '1.05em', color: '#FFEB3B' }}>
                                🎯 <strong>{t.targetPriceTarget}</strong> ${strategy.targetPrice}
                            </div>
                        )}
                        {strategy.targetPrice2 && (
                            <div style={{ fontSize: '1.05em', color: '#fdd835' }}>
                                🚀 <strong>{t.targetPriceTarget2}</strong> ${strategy.targetPrice2}
                            </div>
                        )}
                        {strategy.stopLoss && (
                            <div style={{ fontSize: '1.05em', color: '#FF5252' }}>
                                🛑 <strong>{t.stopLossTarget}</strong> ${parseFloat(strategy.stopLoss).toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ConfluenceChecklist = ({ factors, type, t }) => {
    if (!factors || factors.length === 0) return null;
    return (
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #333' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🔍 {t.confluenceFactors}
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {factors.map((f, idx) => (
                    <span key={idx} style={{
                        padding: '4px 10px',
                        fontSize: '0.85em',
                        borderRadius: '4px',
                        background: type === 'bullish' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 82, 82, 0.15)',
                        color: type === 'bullish' ? '#4CAF50' : '#FF5252',
                        border: `1px solid ${type === 'bullish' ? '#4CAF50' : '#FF5252'}`
                    }}>
                        {f}
                    </span>
                ))}
            </div>
        </div>
    );
};

export const AnalysisReport = ({ analysis, t, lang }) => {
    if (!analysis || !analysis.strategy?.dynamicReport) return null;
    const { strategy } = analysis;
    const { dynamicReport } = strategy;

    return (
        <div style={{
            padding: '30px',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            border: '1px solid #333',
            lineHeight: '1.8',
            color: '#ddd',
            marginTop: '20px'
        }}>
            <h3 style={{ borderBottom: '2px solid #2196F3', paddingBottom: '12px', color: '#2196F3', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                <span>📊 {t.analysisReportHeader}</span>
                {strategy?.backtest && (
                    <span style={{ fontSize: '0.8em', color: parseFloat(strategy.backtest.winRate) > 60 ? '#4CAF50' : '#FF9800', background: '#222', padding: '4px 12px', borderRadius: '20px', border: '1px solid #444' }}>
                        🎯 {t.winRate} {strategy.backtest.winRate}% ({strategy.backtest.wins}/{strategy.backtest.total})
                    </span>
                )}
            </h3>

            {/* V22 Confluence Checklist */}
            <div style={{ marginBottom: '25px' }}>
                <ConfluenceChecklist
                    factors={strategy.action.en.includes('BUY') ? strategy.bullishFactors : strategy.bearishFactors}
                    type={strategy.action.en.includes('BUY') ? 'bullish' : 'bearish'}
                    t={t}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '15px' }}>
                <section>
                    <h4 style={{ color: '#FFEB3B', marginBottom: '8px' }}>{t.maAnalysisTitle}</h4>
                    <p style={{ margin: 0, fontSize: '0.95em' }}>{dynamicReport.maReport[lang]}</p>
                </section>

                <section>
                    <h4 style={{ color: '#FFEB3B', marginBottom: '8px' }}>{t.volAnalysisTitle}</h4>
                    <p style={{ margin: 0, fontSize: '0.95em' }}>{dynamicReport.volReport[lang]}</p>
                </section>

                <section>
                    <h4 style={{ color: '#FFEB3B', marginBottom: '8px' }}>{t.rsiAnalysisTitle}</h4>
                    <p style={{ margin: 0, fontSize: '0.95em' }}>{dynamicReport.rsiReport[lang]}</p>
                </section>

                <section>
                    <h4 style={{ color: '#FFEB3B', marginBottom: '8px' }}>{t.barAnalysisTitle}</h4>
                    <p style={{ margin: 0, fontSize: '0.95em' }}>{dynamicReport.barReport[lang]}</p>
                </section>

                <section style={{ padding: '15px', background: '#222', borderRadius: '8px', border: '1px solid #444' }}>
                    <h4 style={{ color: '#00BCD4', marginBottom: '8px', marginTop: 0 }}>{t.keyLevelsTitle}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ color: '#FF5252' }}>⚠️ {t.resistanceLine} <strong>${dynamicReport.resistanceLevel}</strong></div>
                        <div style={{ color: '#4CAF50' }}>🛡️ {t.supportLine} <strong>${dynamicReport.supportLevel}</strong></div>
                    </div>
                </section>

                {/* V22 Liquidity Summary Area */}
                <section style={{ padding: '15px', background: '#222', borderRadius: '8px', border: '1px solid #444' }}>
                    <h4 style={{ color: '#E91E63', marginBottom: '8px', marginTop: 0 }}>💎 {t.liquidityZones}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.85em' }}>
                        {analysis.referenceLines?.slice(0, 3).map((l, idx) => (
                            <div key={idx} style={{ color: l.type === 'support' ? '#4CAF50' : '#FF5252' }}>
                                {l.type === 'support' ? '📈' : '📉'} {l.label}: <strong>${l.price.toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div style={{
                marginTop: '25px',
                padding: '15px',
                background: 'linear-gradient(90deg, #1e3a8a 0%, #172554 100%)',
                borderRadius: '8px',
                borderLeft: '5px solid #3b82f6'
            }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#60a5fa' }}>💡 {t.mentoringHeader}</h4>
                <div style={{ margin: 0, fontSize: '1em', color: '#bfdbfe', whiteSpace: 'pre-line' }}>
                    {strategy.action.en.includes('BUY') ?
                        (lang === 'ko' ? `데이터상 매수세가 우위에 있습니다. 현재 ${strategy.bullishFactors?.length}개의 상승 요인이 중첩되어 신뢰도가 높습니다. 지지선을 이탈하지 않는다면 적극적인 대응이 가능한 구간입니다.` : `Data suggests dominant buying power. With ${strategy.bullishFactors?.length} bullish factors aligned, conviction is high. Stay focused as long as support holds.`) :
                        (lang === 'ko' ? `현재 리스크 관리가 필요한 구간입니다. ${strategy.bearishFactors?.length}개의 하락 압력 요인이 감지되었습니다. 무리한 진입보다는 관망하며 세력의 다음 기준봉 출현을 기다리는 것이 현명합니다.` : `Risk management is required. ${strategy.bearishFactors?.length} bearish pressure factors detected. It is wiser to wait and watch for the next institutional base candle.`)}
                </div>
            </div>
        </div>
    );
};

export default AnalysisReport; 
