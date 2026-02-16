import React from 'react';

const Sidebar = ({ companies, onSelect, selectedSymbol, t }) => {
    return (
        <div style={{
            width: '250px',
            height: '100vh',
            overflowY: 'auto',
            background: '#1e1e1e',
            borderRight: '1px solid #333',
            color: '#eee',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#2196F3' }}>{t.top300Title}</h3>
                <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#888' }}>{t.marketCapNotice}</p>
                <div style={{ fontSize: '0.7em', color: '#FF5252', marginTop: '5px' }}>
                    ⚠ {t.dailyLimitNotice}
                </div>
            </div>

            <div style={{ flex: 1 }}>
                {companies.map((company) => (
                    <div
                        key={company.symbol}
                        onClick={() => onSelect(company.symbol)}
                        style={{
                            padding: '10px 15px',
                            cursor: 'pointer',
                            background: selectedSymbol === company.symbol ? '#2c3e50' : 'transparent',
                            borderBottom: '1px solid #2a2a2a',
                            transition: 'background 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedSymbol !== company.symbol) e.currentTarget.style.background = '#333';
                        }}
                        onMouseLeave={(e) => {
                            if (selectedSymbol !== company.symbol) e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#fff' }}>{company.symbol}</div>
                            <div style={{ fontSize: '0.8em', color: '#aaa' }}>
                                {company.name.length > 20 ? company.name.substring(0, 20) + '...' : company.name}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
