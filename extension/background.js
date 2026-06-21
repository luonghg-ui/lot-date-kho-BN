const COOKIE_DOMAIN = 'internal.thuocsi.vn';
const SYNC_INTERVAL_MS = 120000;

async function readCookies() {
    try {
        const [sid, token] = await Promise.all([
            chrome.cookies.get({ url: `https://${COOKIE_DOMAIN}/`, name: 'SID' }),
            chrome.cookies.get({ url: `https://${COOKIE_DOMAIN}/`, name: 'session_token' })
        ]);
        return { sid: sid?.value || '', token: token?.value || '' };
    } catch { return { sid: '', token: '' }; }
}

async function sendToProxy(sid, token) {
    if (!sid || !token) return false;
    const { proxyUrl } = await chrome.storage.local.get('proxyUrl');
    const url = proxyUrl || 'http://localhost:8081';
    try {
        const res = await fetch(`${url}/update-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid, token })
        });
        if (res.ok) {
            console.log('[WMS Token Sync] Token synced successfully');
            return true;
        }
    } catch (err) {
        console.warn('[WMS Token Sync] Cannot reach proxy:', err.message);
    }
    return false;
}

async function forceSync() {
    const { autoSync } = await chrome.storage.local.get('autoSync');
    if (autoSync === false) return;
    const { sid, token } = await readCookies();
    if (sid && token) {
        await sendToProxy(sid, token);
    }
}

chrome.cookies.onChanged.addListener(({ cookie, cause }) => {
    if (cookie.domain !== COOKIE_DOMAIN) return;
    if (cookie.name !== 'SID' && cookie.name !== 'session_token') return;
    if (cause !== 'inserted' && cause !== 'changed') return;
    forceSync();
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ autoSync: true, proxyUrl: 'http://localhost:8081' });
    forceSync();
});

setInterval(forceSync, SYNC_INTERVAL_MS);
