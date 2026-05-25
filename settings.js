// ===== Shared Settings =====
// Dùng chung cho tất cả các trang (index.html, mapping.html, ...)
// Lưu trữ tập trung trong localStorage

const SETTINGS_KEYS = {
    SID: 'wms_sid',
    TOKEN: 'wms_token',
    SCRIPT_URL: 'wms_script_url',
    PROXY_URL: 'wms_proxy_url',
    THEME: 'wms_theme',
    INVENTORY: 'wms_inventory',
};

const SETTINGS_DEFAULTS = {
    PROXY_URL: 'http://localhost:8081',
};

// ---- Read ----
function getSetting(key) {
    return localStorage.getItem(key);
}

function getSettings() {
    return {
        sid: getSetting(SETTINGS_KEYS.SID) || '',
        token: getSetting(SETTINGS_KEYS.TOKEN) || '',
        scriptUrl: getSetting(SETTINGS_KEYS.SCRIPT_URL) || '',
        proxyUrl: getSetting(SETTINGS_KEYS.PROXY_URL) || SETTINGS_DEFAULTS.PROXY_URL,
        theme: getSetting(SETTINGS_KEYS.THEME) || 'light',
    };
}

// ---- Write ----
function saveSettings({ sid, token, scriptUrl, proxyUrl }) {
    if (sid !== undefined) localStorage.setItem(SETTINGS_KEYS.SID, sid);
    if (token !== undefined) localStorage.setItem(SETTINGS_KEYS.TOKEN, token);
    if (scriptUrl !== undefined) localStorage.setItem(SETTINGS_KEYS.SCRIPT_URL, scriptUrl);
    if (proxyUrl !== undefined) localStorage.setItem(SETTINGS_KEYS.PROXY_URL, proxyUrl);
}

// ---- Theme ----
function getTheme() {
    return getSetting(SETTINGS_KEYS.THEME) || 'light';
}

function setTheme(theme) {
    localStorage.setItem(SETTINGS_KEYS.THEME, theme);
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const next = isDark ? 'dark' : 'light';
    setTheme(next);
    return next;
}

function initTheme() {
    const theme = getTheme();
    setTheme(theme);
    return theme;
}

// ---- Settings Modal ----
function createSettingsModal() {
    // Check if modal already exists
    if (document.getElementById('sharedSettingsModal')) return;

    const modal = document.createElement('div');
    modal.id = 'sharedSettingsModal';
    modal.className = 'fixed inset-0 modal-overlay z-[200] hidden items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 md:p-8 shadow-2xl modal-content border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <i data-lucide="settings" class="w-5 h-5"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">Cài Đặt Chung</h3>
                </div>
                <button id="sharedSettingsClose" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Proxy URL</label>
                    <input id="sharedProxyUrl" type="text" class="w-full input-field text-xs font-mono" placeholder="http://localhost:8081">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">SID Token</label>
                    <textarea id="sharedSid" rows="2" class="w-full input-field font-mono text-[10px] resize-none" placeholder="Nhập SID..."></textarea>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Session Token</label>
                    <textarea id="sharedToken" rows="2" class="w-full input-field font-mono text-[10px] resize-none" placeholder="Nhập Session Token..."></textarea>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Google Script Web App URL</label>
                    <input id="sharedScriptUrl" type="text" class="w-full input-field text-xs" placeholder="https://script.google.com/macros/s/.../exec">
                </div>
                <button id="sharedSettingsSave" class="w-full btn-primary mt-3">
                    <i data-lucide="save" class="w-5 h-5"></i>
                    Lưu Cài Đặt
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Bind events
    document.getElementById('sharedSettingsClose').onclick = () => closeSettingsModal();
    document.getElementById('sharedSettingsSave').onclick = () => saveSettingsModal();

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSettingsModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSettingsModal();
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openSettingsModal() {
    createSettingsModal();
    const s = getSettings();
    document.getElementById('sharedProxyUrl').value = s.proxyUrl;
    document.getElementById('sharedSid').value = s.sid;
    document.getElementById('sharedToken').value = s.token;
    document.getElementById('sharedScriptUrl').value = s.scriptUrl;
    document.getElementById('sharedSettingsModal').classList.replace('hidden', 'flex');
}

function closeSettingsModal() {
    const el = document.getElementById('sharedSettingsModal');
    if (el) el.classList.replace('flex', 'hidden');
}

function saveSettingsModal() {
    const sid = document.getElementById('sharedSid').value.trim();
    const token = document.getElementById('sharedToken').value.trim();
    const scriptUrl = document.getElementById('sharedScriptUrl').value.trim();
    const proxyUrl = document.getElementById('sharedProxyUrl').value.trim() || SETTINGS_DEFAULTS.PROXY_URL;

    saveSettings({ sid, token, scriptUrl, proxyUrl });

    // Update proxy if the endpoint exists
    if (sid && token) {
        fetch(`${proxyUrl}/update-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid, token })
        }).catch(() => {});
    }

    closeSettingsModal();
    showSettingsToast('Đã lưu cài đặt thành công!');
}

function showSettingsToast(msg) {
    let toast = document.getElementById('settingsToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'settingsToast';
        toast.className = 'fixed bottom-6 right-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl px-5 py-3.5 translate-y-20 opacity-0 transition-all duration-300 rounded-xl flex items-center gap-3 z-[100] backdrop-blur-md';
        toast.innerHTML = `<div class="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400"><i data-lucide="check-circle" class="w-4 h-4"></i></div><span class="text-slate-700 dark:text-slate-300 font-semibold text-sm"></span>`;
        document.body.appendChild(toast);
    }
    toast.querySelector('span').textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 2500);
}

// ---- Proxy URL helper ----
function getProxyUrl() {
    return getSetting(SETTINGS_KEYS.PROXY_URL) || SETTINGS_DEFAULTS.PROXY_URL;
}
