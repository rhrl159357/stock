export const fetchStockData = async (symbol, timeframe = '1d') => {
    const sym = symbol.toUpperCase();

    // Mapping timeframe to Yahoo intervals and ranges
    const configMap = {
        '1m': { interval: '1m', range: '1d' },
        '3m': { interval: '2m', range: '5d' }, // Yahoo has 2m, not 3m
        '5m': { interval: '5m', range: '5d' },
        '15m': { interval: '15m', range: '1mo' },
        '30m': { interval: '30m', range: '1mo' },
        '60m': { interval: '60m', range: '3mo' },
        '90m': { interval: '90m', range: '3mo' },
        '1d': { interval: '1d', range: '1y' },
        '1wk': { interval: '1wk', range: '2y' },
    };

    const { interval, range } = configMap[timeframe] || configMap['1d'];

    const maxRetries = 3;
    let delay = 1000; // Start with 1s delay

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const url = `/api/yahoo/v8/finance/chart/${sym}?interval=${interval}&range=${range}`;
            console.log(`[Yahoo API] Fetching ${sym} (${timeframe}) - Attempt ${attempt + 1}`);

            const response = await fetch(url);

            if (response.status === 429) {
                console.warn(`[Yahoo API] Rate limit hit (429) for ${sym}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                continue;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch data for ${sym} (Status: ${response.status})`);
            }

            const data = await response.json();

            // 방어적 파싱: data 구조가 예상과 다를 경우 안전하게 빈 배열 반환
            if (!data || !data.chart || !data.chart.result) {
                console.warn(`[Yahoo API] Unexpected response format for ${sym}`);
                return [];
            }

            const result = data.chart.result[0];
            if (!result) {
                console.warn(`[Yahoo API] No result data for ${sym}`);
                return [];
            }

            const timestamps = result.timestamp;
            const quote = result.indicators?.quote?.[0];
            const adjuncts = result.indicators?.adjclose?.[0]?.adjclose || null;

            if (!timestamps || !quote) {
                console.warn(`[Yahoo API] Missing timestamps or quote data for ${sym}`);
                return [];
            }

            const formattedData = timestamps.map((timestamp, index) => {
                if (quote.open?.[index] == null || quote.close?.[index] == null) return null;

                let timeValue;
                if (interval === '1d' || interval === '1wk') {
                    const d = new Date(timestamp * 1000);
                    timeValue = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                } else {
                    timeValue = timestamp;
                }

                return {
                    time: timeValue,
                    open: quote.open[index],
                    high: quote.high[index],
                    low: quote.low[index],
                    close: adjuncts && (interval === '1d' || interval === '1wk') ? adjuncts[index] : quote.close[index],
                    volume: quote.volume?.[index] || 0,
                };
            }).filter(item => item !== null);

            return formattedData;

        } catch (err) {
            if (attempt === maxRetries - 1) {
                console.error('[Yahoo API Error]:', err.message);
                return []; // ★ 핵심 수정: throw 대신 빈 배열 반환 → 앱 크래시 방지
            }
            console.warn(`[Yahoo API] Attempt ${attempt + 1} failed for ${sym}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    return []; // ★ 핵심 수정: 루프 종료 후에도 안전하게 빈 배열 반환
};

// Mock function to satisfy App.jsx until fully cleaned up
export const getCurrentKeyStatus = () => ({ index: 0, total: 0 });
