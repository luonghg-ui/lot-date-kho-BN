const proxyUrlInput = document.getElementById('proxyUrl');
const saveUrlBtn = document.getElementById('saveUrl');
const syncBtn = document.getElementById('syncBtn');
const statusBadge = document.getElementById('statusBadge');
const statusMsg = document.getElementById('statusMsg');
const sidDisplay = document.getElementById('sidDisplay');
const tokenDisplay = document.getElementById('tokenDisplay');
const autoSyncToggle = document.getElementById('autoSync');

const COOKIE_DOMAIN = 'internal.thuocsi.vn';

function setStatus(text, type) {
    statusMsg.textContent = text;
    statusMsg.className = 'status' + (type ? ' ' + type : '');
}

function setBadge(state) {
    statusBadge.className = 'badge ' + state;
    if (state === 'on') statusBadge.textContent = 'Đã đồng bộ';
    else if (state === 'off') statusBadge.textContent = 'Chưa kết nối';
    else statusBadge.textContent = 'Đang chờ...';
}

function truncate(str, len = 48) {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

async function readCookies() {
    try {
        const [sid, token] = await Promise.all([
            chrome.cookies.get({ url: `https://${COOKIE_DOMAIN}/`, name: 'SID' }),
            chrome.cookies.get({ url: `https://${COOKIE_DOMAIN}/`, name: 'session_token' })
        ]);
        return { sid: sid?.value || '', token: token?.value || '' };
    } catch (err) {
        console.error('readCookies error:', err);
        return { sid: '', token: '' };
    }
}

async function sendToProxy(sid, token) {
    const proxyUrl = (await chrome.storage.local.get('proxyUrl')).proxyUrl || 'http://localhost:8081';
    if (!sid || !token) { setStatus('SID hoặc token trống', 'err'); return false; }

    try {
        const res = await fetch(`${proxyUrl}/update-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid, token })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.ok) {
            setStatus('Đã đồng bộ token thành công!', 'ok');
            setBadge('on');
            return true;
        }
        throw new Error(data.message || 'Unknown error');
    } catch (err) {
        setStatus(`Lỗi gửi đến proxy: ${err.message}`, 'err');
        setBadge('off');
        return false;
    }
}

async function syncToken() {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Đang đồng bộ...';
    setStatus('Đang đọc cookie từ internal.thuocsi.vn...', '');
    setBadge('wait');

    const { sid, token } = await readCookies();

    if (!sid && !token) {
        setStatus('Không tìm thấy cookie. Hãy đăng nhập internal.thuocsi.vn trước.', 'err');
        setBadge('off');
        sidDisplay.textContent = '-';
        tokenDisplay.textContent = '-';
        syncBtn.disabled = false;
        syncBtn.textContent = '↻ Đồng bộ Token ngay';
        return;
    }

    sidDisplay.textContent = truncate(sid, 60);
    tokenDisplay.textContent = truncate(token, 60);

    await sendToProxy(sid, token);

    syncBtn.disabled = false;
    syncBtn.textContent = '↻ Đồng bộ Token ngay';
}

async function loadSettings() {
    const data = await chrome.storage.local.get(['proxyUrl', 'autoSync']);
    if (data.proxyUrl) proxyUrlInput.value = data.proxyUrl;
    if (data.autoSync !== undefined) autoSyncToggle.checked = data.autoSync;
}

async function saveProxyUrl() {
    const url = proxyUrlInput.value.trim() || 'http://localhost:8081';
    await chrome.storage.local.set({ proxyUrl: url });
    setStatus('Đã lưu proxy URL', 'ok');
    setTimeout(() => setStatus('Nhấn "Đồng bộ" để lấy token từ internal.thuocsi.vn', ''), 1500);
}

saveUrlBtn.addEventListener('click', saveProxyUrl);
proxyUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveProxyUrl(); });

syncBtn.addEventListener('click', syncToken);

autoSyncToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ autoSync: autoSyncToggle.checked });
});

loadSettings();

(async () => {
    const { sid, token } = await readCookies();
    sidDisplay.textContent = truncate(sid, 60) || '-';
    tokenDisplay.textContent = truncate(token, 60) || '-';
    if (sid && token) setBadge('on');
    // Kiểm tra proxy availability
    const { proxyUrl } = await chrome.storage.local.get('proxyUrl');
    const url = proxyUrl || 'http://localhost:8081';
    try {
        const res = await fetch(`${url}/ping`, { method: 'GET', signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch {
        setStatus('Không thể kết nối proxy. Đã chạy proxy.ps1 chưa?', 'err');
    }
})();
