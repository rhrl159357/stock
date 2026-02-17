import React from 'react';

const Sidebar = ({ companies, onSelect, selectedSymbol, t, scanResults, scanProgress, onStartScan }) => {
    const [filterOnlyEntry, setFilterOnlyEntry] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');

    const getFilteredCompanies = () => {
        let list = [...companies];

        // 1. 검색어 필터링
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            list = list.filter(c =>
                c.symbol.toLowerCase().includes(lowerTerm) ||
                c.name.toLowerCase().includes(lowerTerm)
            );
        }

        // 2. BUY 타점 필터링
        if (filterOnlyEntry) {
            list = list.filter(c => {
                const res = scanResults[c.symbol];
                if (!res) return false;
                const isBuy = res.action && res.action.includes('BUY');
                const isGoodPrice = res.currentPrice <= res.targetBuyPrice;
                return isBuy && isGoodPrice;
            });
        }
        return list;
    };

    const displayCompanies = getFilteredCompanies();

    return (
        <div style={{
            width: '280px',
            height: '100vh',
            overflowY: 'auto',
            background: '#1e1e1e',
            borderRight: '1px solid #333',
            color: '#eee',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 15px', color: '#2196F3', textAlign: 'center' }}>{t.top300Title}</h3>

                {/* 통합 검색창 */}
                <input
                    type="text"
                    placeholder={t.sidebarSearchPlaceholder || "Search..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                    }}
                />

                {/* 자동 스캐너 컨트롤 */}
                <div style={{ marginBottom: '15px' }}>
                    <button
                        onClick={onStartScan}
                        disabled={scanProgress?.isScanning}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: scanProgress?.isScanning ? '#333' : '#2196F3',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: scanProgress?.isScanning ? 'default' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s'
                        }}
                    >
                        {scanProgress?.isScanning ? `${t.scanningProgress} (${scanProgress.current}/${scanProgress.total})` : t.startScanner}
                    </button>
                    {scanProgress?.isScanning && (
                        <div style={{ width: '100%', height: '4px', background: '#333', marginTop: '5px', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%`, height: '100%', background: '#4CAF50', transition: 'width 0.3s' }} />
                        </div>
                    )}
                </div>

                {/* 타점 필터 버튼 */}
                <button
                    onClick={() => setFilterOnlyEntry(!filterOnlyEntry)}
                    style={{
                        padding: '10px 12px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        border: filterOnlyEntry ? 'none' : '1px solid #4CAF50',
                        background: filterOnlyEntry ? '#4CAF50' : 'transparent',
                        color: filterOnlyEntry ? '#FFF' : '#4CAF50',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%',
                        transition: 'all 0.3s'
                    }}
                >
                    {filterOnlyEntry ? `✓ ${t.filterBuyEntry}` : `🔍 ${t.filterBuyEntry}`}
                </button>

                <p style={{ margin: '10px 0 0', fontSize: '0.8em', color: '#888', textAlign: 'center' }}>{t.marketCapNotice}</p>
            </div>

            <div style={{ flex: 1 }}>
                {displayCompanies.map((company) => {
                    const res = scanResults[company.symbol];
                    const isTarget = res && res.action && res.action.includes('BUY') && res.currentPrice <= res.targetBuyPrice;

                    return (
                        <div
                            key={company.symbol}
                            onClick={() => onSelect(company.symbol)}
                            style={{
                                padding: '12px 15px',
                                cursor: 'pointer',
                                background: selectedSymbol === company.symbol ? '#2c3e50' : 'transparent',
                                borderBottom: '1px solid #2a2a2a',
                                transition: 'background 0.2s',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderLeft: isTarget ? '4px solid #4CAF50' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedSymbol !== company.symbol) e.currentTarget.style.background = '#333';
                            }}
                            onMouseLeave={(e) => {
                                if (selectedSymbol !== company.symbol) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 'bold', color: isTarget ? '#69F0AE' : '#fff' }}>
                                        {company.symbol} {isTarget && '💎'}
                                    </div>
                                    {isTarget && (
                                        <div style={{ fontSize: '0.65em', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>
                                            ENTRY
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.8em', color: '#aaa' }}>
                                    {company.name.length > 25 ? company.name.substring(0, 25) + '...' : company.name}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {displayCompanies.length === 0 && (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: '#666', fontSize: '0.9em' }}>
                        {filterOnlyEntry ? t.noEntriesFound : t.noScanDataNotice || "검색 결과가 없습니다."}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
