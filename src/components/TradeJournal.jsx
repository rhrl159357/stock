import React, { useState } from 'react';

const TradeJournal = ({ onAddTrade, trades, currentSymbol }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('BUY');
    const [price, setPrice] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!price) return;

        onAddTrade({
            time: date,
            symbol: currentSymbol,
            type,
            price: parseFloat(price)
        });
        setPrice('');
    };

    const currentTrades = trades.filter(t => t.symbol === currentSymbol);

    return (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#222', borderRadius: '12px', color: '#FFF' }}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                📓 나의 매매 기록 (Trade Journal)
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>날짜</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#FFF' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>매수/매도</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#FFF' }}
                    >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>가격</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#FFF' }}
                    />
                </div>

                <button type="submit" style={{ padding: '10px 20px', background: '#4CAF50', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    기록 추가
                </button>
            </form>

            {currentTrades.length > 0 && (
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: '#888', borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '5px' }}>날짜</th>
                                <th style={{ padding: '5px' }}>구분</th>
                                <th style={{ padding: '5px' }}>가격</th>
                                <th style={{ padding: '5px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTrades.map((trade, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '5px' }}>{trade.time}</td>
                                    <td style={{ padding: '5px', color: trade.type === 'BUY' ? '#4CAF50' : '#FF5252' }}>{trade.type}</td>
                                    <td style={{ padding: '5px' }}>${trade.price}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TradeJournal;
