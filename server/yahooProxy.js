/**
 * Yahoo Finance Crumb+Cookie 자동 인증 프록시 미들웨어
 * 
 * Yahoo Finance v8 API가 429(Rate Limit)를 반환할 때,
 * 브라우저처럼 쿠키와 crumb을 자동으로 받아와서 인증된 요청을 보냅니다.
 * 
 * Node.js 18+ 호환 (built-in fetch 사용)
 */

import https from 'https';

let cachedCrumb = null;
let cachedCookie = null;
let lastFetchTime = 0;
const CRUMB_TTL = 10 * 60 * 1000; // 10분마다 갱신

// Node.js 호환 HTTPS 요청 헬퍼
function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                });
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}

async function fetchCrumbAndCookie() {
    const now = Date.now();
    if (cachedCrumb && cachedCookie && (now - lastFetchTime < CRUMB_TTL)) {
        return { crumb: cachedCrumb, cookie: cachedCookie };
    }

    console.log('[YahooProxy] 🔑 Fetching fresh crumb+cookie...');

    try {
        // Step 1: fc.yahoo.com 에서 쿠키 받기
        const initRes = await httpsGet('https://fc.yahoo.com');

        // set-cookie 헤더에서 쿠키 추출
        let rawCookies = initRes.headers['set-cookie'];
        if (!rawCookies) {
            console.warn('[YahooProxy] No cookies from fc.yahoo.com');
            return null;
        }

        // set-cookie는 배열이거나 문자열일 수 있음
        if (typeof rawCookies === 'string') rawCookies = [rawCookies];
        const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ');

        if (!cookieStr) {
            console.warn('[YahooProxy] Empty cookie string');
            return null;
        }

        console.log(`[YahooProxy] 🍪 Got cookies: ${cookieStr.substring(0, 50)}...`);

        // Step 2: crumb 가져오기
        const crumbRes = await httpsGet('https://query2.finance.yahoo.com/v1/test/getcrumb', {
            'Cookie': cookieStr,
        });

        if (crumbRes.status !== 200) {
            console.warn(`[YahooProxy] Crumb fetch failed: ${crumbRes.status}`);
            return null;
        }

        const crumb = crumbRes.body.trim();
        if (!crumb || crumb.includes('<') || crumb.length > 50) {
            console.warn(`[YahooProxy] Invalid crumb: "${crumb.substring(0, 30)}"`);
            return null;
        }

        cachedCrumb = crumb;
        cachedCookie = cookieStr;
        lastFetchTime = now;

        console.log(`[YahooProxy] ✅ Crumb obtained: ${crumb.substring(0, 11)}...`);
        return { crumb, cookie: cookieStr };

    } catch (err) {
        console.error('[YahooProxy] ❌ Failed to get crumb:', err.message);
        return null;
    }
}

export default function yahooProxyPlugin() {
    return {
        name: 'yahoo-finance-proxy',
        configureServer(server) {
            // /api/yahoo-auth/v8/finance/chart/AAPL?... 형태의 요청 처리
            server.middlewares.use('/api/yahoo-auth', async (req, res) => {
                try {
                    const urlPath = req.url; // e.g., /v8/finance/chart/AAPL?interval=1d&range=1y

                    // Crumb + Cookie 가져오기
                    const auth = await fetchCrumbAndCookie();

                    let targetUrl;
                    if (auth) {
                        const separator = urlPath.includes('?') ? '&' : '?';
                        targetUrl = `https://query2.finance.yahoo.com${urlPath}${separator}crumb=${encodeURIComponent(auth.crumb)}`;
                    } else {
                        targetUrl = `https://query2.finance.yahoo.com${urlPath}`;
                    }

                    console.log(`[YahooProxy] → ${targetUrl.substring(0, 100)}...`);

                    const headers = {
                        'Accept': 'application/json',
                        'Referer': 'https://finance.yahoo.com/',
                        'Origin': 'https://finance.yahoo.com',
                    };

                    if (auth?.cookie) {
                        headers['Cookie'] = auth.cookie;
                    }

                    const response = await httpsGet(targetUrl, headers);

                    // 401/403 → crumb 갱신 후 재시도
                    if (response.status === 401 || response.status === 403) {
                        console.warn('[YahooProxy] Auth expired, refreshing crumb...');
                        cachedCrumb = null;
                        cachedCookie = null;
                        lastFetchTime = 0;

                        const newAuth = await fetchCrumbAndCookie();
                        if (newAuth) {
                            const sep = urlPath.includes('?') ? '&' : '?';
                            const retryUrl = `https://query2.finance.yahoo.com${urlPath}${sep}crumb=${encodeURIComponent(newAuth.crumb)}`;
                            const retryRes = await httpsGet(retryUrl, {
                                ...headers,
                                'Cookie': newAuth.cookie,
                            });

                            res.writeHead(retryRes.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                            res.end(retryRes.body);
                            return;
                        }
                    }

                    res.writeHead(response.status, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    });
                    res.end(response.body);

                } catch (err) {
                    console.error('[YahooProxy] Error:', err.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        },
    };
}
