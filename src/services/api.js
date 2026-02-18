// Yahoo Finance API 엔드포인트 목록 (query1 차단 시 query2 자동 시도)
const API_ENDPOINTS = ['/api/yahoo', '/api/yahoo2'];
let currentEndpointIdx = 0; // 한 번 성공한 엔드포인트를 기억

export const fetchStockData = async (symbol, timeframe = '1d') => {
    const sym = symbol.toUpperCase();

    const configMap = {
        '1m': { interval: '1m', range: '1d' },
        '3m': { interval: '2m', range: '5d' },
        '5m': { interval: '5m', range: '5d' },
        '15m': { interval: '15m', range: '1mo' },
        '30m': { interval: '30m', range: '1mo' },
        '60m': { interval: '60m', range: '3mo' },
        '90m': { interval: '90m', range: '3mo' },
        '1d': { interval: '1d', range: '1y' },
        '1wk': { interval: '1wk', range: '2y' },
    };

    const { interval, range } = configMap[timeframe] || configMap['1d'];

    // 모든 엔드포인트에 대해 시도 (현재 성공한 것부터 시작)
    for (let ep = 0; ep < API_ENDPOINTS.length; ep++) {
        const endpointIdx = (currentEndpointIdx + ep) % API_ENDPOINTS.length;
        const baseUrl = API_ENDPOINTS[endpointIdx];

        const maxRetries = 2;
        let delay = 1000;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const url = `${baseUrl}/v8/finance/chart/${sym}?interval=${interval}&range=${range}`;
                console.log(`[Yahoo API] Fetching ${sym} via ${baseUrl} (Attempt ${attempt + 1})`);

                const response = await fetch(url);

                if (response.status === 429) {
                    console.warn(`[Yahoo API] Rate limit (429). Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (!data || !data.chart || !data.chart.result) {
                    console.warn(`[Yahoo API] Unexpected response format for ${sym}`);
                    throw new Error('Invalid response format');
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

                // ★ 이 엔드포인트가 성공했으므로 기억
                currentEndpointIdx = endpointIdx;
                console.log(`[Yahoo API] ✅ Success via ${baseUrl} for ${sym} (${formattedData.length} candles)`);
                return formattedData;

            } catch (err) {
                console.warn(`[Yahoo API] ${baseUrl} attempt ${attempt + 1} failed: ${err.message}`);
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                }
            }
        }
        console.warn(`[Yahoo API] ⚠️ Endpoint ${baseUrl} failed, trying next...`);
    }

    console.error(`[Yahoo API] ❌ All endpoints failed for ${sym}`);
    return [];
};

// Mock function to satisfy App.jsx until fully cleaned up
export const getCurrentKeyStatus = () => ({ index: 0, total: 0 });
