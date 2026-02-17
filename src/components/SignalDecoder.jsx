import React from 'react';

const SignalDecoder = ({ signal, t, lang }) => {
    if (!signal) {
        return (
            <div style={{
                marginTop: '30px',
                padding: '40px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                border: '1px dashed #444',
                textAlign: 'center',
                color: '#888',
                fontSize: '1.1em'
            }}>
                <p>💡 <strong>{t.clickSignalHint}</strong></p>
                <p style={{ fontSize: '0.9em' }}>{t.clickSignalSubHint}</p>
            </div>
        );
    }

    // Use a key based on signal time and type to force re-render and prevent stale text from browser translators
    const decoderKey = `${signal.time}-${signal.type || 'unknown'}`;

    const isBuy = signal.type === 'BUY' || (typeof signal.text === 'string' ? signal.text.includes('BUY') : signal.text.en.includes('BUY'));
    const isSell = signal.type === 'SELL' || (typeof signal.text === 'string' ? (signal.text.includes('SELL') || signal.text.includes('STOP')) : (signal.text.en.includes('SELL') || signal.text.en.includes('STOP')));
    const color = isBuy ? '#4CAF50' : (isSell ? '#FF5252' : '#FF9800');

    // Robust text extraction from multi-language objects
    const extractText = (field) => {
        if (!field) return '';
        if (typeof field === 'object') return field[lang] || field['en'] || '';
        return field;
    };

    const signalText = extractText(signal.text);
    const signalReason = extractText(signal.reason);
    const signalDetail = extractText(signal.educationalDetail);

    return (
        <div key={decoderKey} style={{
            marginTop: '30px',
            padding: '30px',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            border: `2px solid ${color}`,
            boxShadow: `0 0 20px ${color}33`,
            color: '#fff',
            animation: 'fadeIn 0.5s ease-in-out'
        }}>
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <div style={{
                    fontSize: '2em',
                    padding: '10px',
                    background: `${color}22`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '60px',
                    height: '60px'
                }}>
                    {isBuy ? '🚀' : '⚠️'}
                </div>
                <div>
                    <h3 style={{ margin: 0, color: color, fontSize: '1.5em' }} translate="no">
                        [{signal.time}] {t.signalReviewTitle} {signalText}
                    </h3>
                    <p style={{ margin: '5px 0 0 0', color: '#aaa', fontWeight: 'bold' }}>
                        {signalReason}
                    </p>
                </div>
            </div>

            <div style={{
                backgroundColor: '#252525',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: `5px solid ${color}`,
                lineHeight: '1.6',
                fontSize: '1.1em',
                color: '#e0e0e0'
            }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {signalDetail || t.educationDataMissing}
                </p>

                {/* Detected Factors Checklist */}
                {(signal.bullishFactors || signal.bearishFactors) && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '15px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#888', textTransform: 'uppercase' }}>
                            🔍 {t.confluenceFactors}
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(isBuy ? signal.bullishFactors : signal.bearishFactors)?.map((f, idx) => (
                                <span key={idx} style={{
                                    padding: '4px 10px',
                                    fontSize: '0.85em',
                                    borderRadius: '4px',
                                    background: isBuy ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 82, 82, 0.15)',
                                    color: isBuy ? '#4CAF50' : '#FF5252',
                                    border: `1px solid ${isBuy ? '#4CAF50' : '#FF5252'}`
                                }} translate="no">
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', fontSize: '0.9em', color: '#666' }}>
                {t.investmentNotice}
            </div>
        </div>
    );
};

export default SignalDecoder;
