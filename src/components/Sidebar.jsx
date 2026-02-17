import React from 'react';

const Sidebar = ({ companies, onSelect, selectedSymbol, t, scanResults, scanProgress, onStartScan }) => {
    const [filterMode, setFilterMode] = React.useState('none'); // 'none', 'today', 'yesterday'
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

        // 2. 분리된 필터링 로직
        if (filterMode === 'today') {
            list = list.filter(c => scanResults[c.symbol]?.isBuyToday);
        } else if (filterMode === 'yesterday') {
            list = list.filter(c => scanResults[c.symbol]?.isBuyYesterday);
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

                {/* 분리된 필터 버튼 섹션 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        onClick={() => setFilterMode(filterMode === 'today' ? 'none' : 'today')}
                        style={{
                            padding: '8px 12px',
                            fontSize: '11px',
                            borderRadius: '8px',
                            border: filterMode === 'today' ? 'none' : '1px solid #4CAF50',
                            background: filterMode === 'today' ? '#4CAF50' : 'transparent',
                            color: filterMode === 'today' ? '#FFF' : '#4CAF50',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            width: '100%',
                            transition: 'all 0.3s'
                        }}
                    >
                        {filterMode === 'today' ? `✓ ${t.filterTodayBuy}` : `🟢 ${t.filterTodayBuy}`}
                    </button>
                    <button
                        onClick={() => setFilterMode(filterMode === 'yesterday' ? 'none' : 'yesterday')}
                        style={{
                            padding: '8px 12px',
                            fontSize: '11px',
                            borderRadius: '8px',
                            border: filterMode === 'yesterday' ? 'none' : '1px solid #f1c40f',
                            background: filterMode === 'yesterday' ? '#f1c40f' : 'transparent',
                            color: filterMode === 'yesterday' ? '#000' : '#f1c40f',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            width: '100%',
                            transition: 'all 0.3s'
                        }}
                    >
                        {filterMode === 'yesterday' ? `✓ ${t.filterYesterdayBuy}` : `🟡 ${t.filterYesterdayBuy}`}
                    </button>
                </div>

                <p style={{ margin: '10px 0 0', fontSize: '0.8em', color: '#888', textAlign: 'center' }}>{t.marketCapNotice}</p>
            </div>

            <div style={{ flex: 1 }}>
                {displayCompanies.map((company) => {
                    const res = scanResults[company.symbol];
                    const isToday = res?.isBuyToday;
                    const isYesterday = res?.isBuyYesterday;
                    const isTarget = isToday || isYesterday;

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
                                borderLeft: isToday ? '4px solid #4CAF50' : (isYesterday ? '4px solid #f1c40f' : 'none')
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
                                    <div style={{ fontWeight: 'bold', color: isToday ? '#69F0AE' : (isYesterday ? '#f1c40f' : '#fff') }}>
                                        {company.symbol} {isToday && '🟢'} {isYesterday && '🟡'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {isToday && (
                                            <div style={{ fontSize: '0.6em', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                                {t.badgeToday}
                                            </div>
                                        )}
                                        {isYesterday && (
                                            <div style={{ fontSize: '0.6em', color: '#f1c40f', background: 'rgba(241, 196, 15, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                                {t.badgeYesterday}
                                            </div>
                                        )}
                                    </div>
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
                        {filterMode !== 'none' ? t.noEntriesFound : t.noScanDataNotice || "검색 결과가 없습니다."}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
