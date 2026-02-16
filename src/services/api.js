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

    try {
        const url = `/api/yahoo/v8/finance/chart/${sym}?interval=${interval}&range=${range}`;

        console.log(`[Yahoo API] Fetching ${sym} (${timeframe})`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data for ${sym} (Status: ${response.status})`);
        }

        const data = await response.json();
        const result = data.chart.result?.[0];
        if (!result) throw new Error(`No data found for symbol: ${sym}`);

        const timestamps = result.timestamp;
        const indicators = result.indicators.quote[0];
        const adjuncts = result.indicators.adjclose ? result.indicators.adjclose[0].adjclose : null;

        if (!timestamps || !indicators) throw new Error(`Invalid data format for ${sym}`);

        const formattedData = timestamps.map((timestamp, index) => {
            if (indicators.open[index] === null || indicators.close[index] === null) return null;

            // For lightweight-charts:
            // Daily/Weekly: 'YYYY-MM-DD'
            // Intraday: UTCTimestamp (number in seconds)
            let timeValue;
            if (interval === '1d' || interval === '1wk') {
                const d = new Date(timestamp * 1000);
                timeValue = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            } else {
                timeValue = timestamp; // Unix timestamp for intraday
            }

            return {
                time: timeValue,
                open: indicators.open[index],
                high: indicators.high[index],
                low: indicators.low[index],
                close: adjuncts && (interval === '1d' || interval === '1wk') ? adjuncts[index] : indicators.close[index],
                volume: indicators.volume[index],
            };
        }).filter(item => item !== null);

        return formattedData;

    } catch (err) {
        console.error('[Yahoo API Error]:', err.message);
        throw err;
    }
};

// Mock function to satisfy App.jsx until fully cleaned up
export const getCurrentKeyStatus = () => ({ index: 0, total: 0 });
