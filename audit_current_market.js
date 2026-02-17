import { generateAllSignals } from './src/utils/indicators.js';
import { apiKeys } from './src/config/apiKeys.js';

async function fetchHistory(symbol, apiKey) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) return null;

        return Object.entries(timeSeries).map(([time, stats]) => ({
            time,
            open: parseFloat(stats['1. open']),
            high: parseFloat(stats['2. high']),
            low: parseFloat(stats['3. low']),
            close: parseFloat(stats['4. close']),
            volume: parseFloat(stats['5. volume'])
        })).reverse();
    } catch (e) {
        console.error(`Error fetching ${symbol}:`, e);
        return null;
    }
}

async function runDefinitiveAudit() {
    console.log('--- DEFINITIVE MARKET BIAS AUDIT (FEB 17) ---');
    const key = apiKeys[0];
    const symbol = 'NVDA';

    const data = await fetchHistory(symbol, key);
    if (!data) return;

    const result = generateAllSignals(data, null, '1d');
    const latest = data[data.length - 1];

    // Manual analysis of the last 10 days for definitive guidance
    console.log(`\nSymbol: ${symbol}`);
    console.log(`Current Price: ${latest.close.toFixed(2)} (${latest.time})`);

    console.log('\n--- SYSTEM OUTPUT ---');
    const lastMarker = result.markers[result.markers.length - 1];
    if (lastMarker && lastMarker.time === latest.time) {
        console.log(`TODAY'S SIGNAL: ${lastMarker.text}`);
    } else {
        console.log(`NO NEW SIGNAL TODAY. LAST SIGNAL WAS: ${lastMarker ? lastMarker.text : 'NONE'} on ${lastMarker ? lastMarker.time : 'N/A'}`);
    }

    // Logic Check: Why no signal?
    console.log('\n--- TREND HEALTH CHECK ---');
    const prices = data.map(d => d.close);
    const avgPrice5 = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const avgPrice20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;

    console.log(`5-Day Average: ${avgPrice5.toFixed(2)}`);
    console.log(`20-Day Average: ${avgPrice20.toFixed(2)}`);
    console.log(`Price vs 20MA: ${latest.close > avgPrice20 ? 'ABOVE (Bullish)' : 'BELOW (Bearish)'}`);
    console.log(`Recent Momentum (5 vs 20): ${avgPrice5 > avgPrice20 ? 'UP (Bullish)' : 'DOWN (Bearish)'}`);
}

runDefinitiveAudit();
