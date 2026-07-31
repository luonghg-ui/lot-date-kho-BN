    // ===== Shared Settings =====
// Dùng chung cho tất cả các trang (index.html, mapping.html, ...)
// Lưu trữ tập trung trong localStorage

// ===== Cổng xác thực mật khẩu truy cập (Passcode Gate) =====
(function() {
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 phút = 300.000 ms

    // Kiểm tra tính hợp lệ thời gian hoạt động cuối cùng
    const checkInactivity = () => {
        const lastActivity = sessionStorage.getItem('wms_last_activity');
        if (lastActivity) {
            const timePassed = Date.now() - parseInt(lastActivity, 10);
            if (timePassed > INACTIVITY_LIMIT) {
                sessionStorage.removeItem('wms_authenticated');
                return false;
            }
        }
        return true;
    };

    const isValidSession = checkInactivity();
    const isAuthed = sessionStorage.getItem('wms_authenticated') === 'true' && isValidSession;

    function startActivityTracking() {
        sessionStorage.setItem('wms_last_activity', Date.now());

        // Lắng nghe các sự kiện để reset thời gian hoạt động cuối
        const updateActivity = () => {
            if (sessionStorage.getItem('wms_authenticated') === 'true') {
                sessionStorage.setItem('wms_last_activity', Date.now());
            }
        };

        const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
        events.forEach(name => {
            document.addEventListener(name, updateActivity, { passive: true });
        });

        // Chạy ngầm kiểm tra hoạt động mỗi 5 giây
        setInterval(() => {
            if (sessionStorage.getItem('wms_authenticated') === 'true') {
                const lastActivity = sessionStorage.getItem('wms_last_activity');
                if (lastActivity && (Date.now() - parseInt(lastActivity, 10) > INACTIVITY_LIMIT)) {
                    sessionStorage.removeItem('wms_authenticated');
                    window.location.reload();
                }
            }
        }, 5000);
    }

    if (!isAuthed) {
        sessionStorage.removeItem('wms_authenticated');
        // Nhúng mã CSS cho màn hình đăng nhập mã PIN
        const style = document.createElement('style');
        style.innerHTML = `
            .lock-screen-overlay {
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at 50% 30%, #172339 0%, #0b101d 60%, #060911 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                font-family: 'Inter', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                padding: 16px;
                box-sizing: border-box;
            }
            .lock-screen-card {
                background: linear-gradient(180deg, rgba(28, 41, 66, 0.85) 0%, rgba(15, 23, 40, 0.95) 100%);
                border: 1px solid rgba(255, 255, 255, 0.09);
                border-radius: 28px;
                padding: 32px 28px 24px 28px;
                width: 100%;
                max-width: 350px;
                text-align: center;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.12);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                animation: lockFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
                user-select: none;
            }
            @keyframes lockFadeIn {
                from { opacity: 0; transform: scale(0.94) translateY(12px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .lock-card-shake {
                animation: lockShake 0.4s ease-in-out !important;
            }
            @keyframes lockShake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-10px); }
                40% { transform: translateX(10px); }
                60% { transform: translateX(-6px); }
                80% { transform: translateX(6px); }
            }
            .lock-icon-container {
                width: 52px;
                height: 52px;
                border-radius: 16px;
                background: rgba(99, 102, 241, 0.15);
                border: 1px solid rgba(99, 102, 241, 0.3);
                color: #818cf8;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px auto;
                box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
            }
            .lock-app-title {
                font-size: 20px;
                font-weight: 800;
                color: #ffffff;
                letter-spacing: -0.01em;
                margin-bottom: 4px;
                font-family: 'Outfit', sans-serif;
            }
            .lock-screen-subtitle {
                font-size: 13px;
                color: #94a3b8;
                margin-bottom: 24px;
                line-height: 1.4;
            }
            .lock-pin-section {
                margin-bottom: 24px;
            }
            .lock-pin-label {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.15em;
                color: #94a3b8;
                text-transform: uppercase;
                margin-bottom: 16px;
            }
            .lock-pin-dots {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 14px;
            }
            .pin-dot {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 2px solid #334155;
                background: transparent;
                transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .pin-dot.filled {
                background: linear-gradient(135deg, #a855f7, #6366f1);
                border-color: #818cf8;
                box-shadow: 0 0 12px rgba(168, 85, 247, 0.7);
                transform: scale(1.15);
            }
            .pin-dot.error {
                background: #ef4444;
                border-color: #fca5a5;
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
            }
            .lock-keypad {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                max-width: 270px;
                margin: 0 auto;
            }
            .keypad-btn {
                height: 58px;
                border-radius: 16px;
                background: rgba(30, 41, 59, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: #f1f5f9;
                font-size: 22px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
                outline: none;
                -webkit-tap-highlight-color: transparent;
            }
            .keypad-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }
            .keypad-btn:active, .keypad-btn.pressed {
                transform: scale(0.92);
                background: rgba(99, 102, 241, 0.35);
                border-color: rgba(129, 140, 248, 0.6);
                box-shadow: 0 0 15px rgba(99, 102, 241, 0.35);
            }
            .keypad-action {
                font-size: 15px;
                font-weight: 600;
                color: #94a3b8;
            }
            .keypad-action:hover {
                color: #fff;
            }
            .lock-error {
                color: #f87171;
                font-size: 13px;
                font-weight: 600;
                margin-top: 14px;
                min-height: 20px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .lock-error.show {
                opacity: 1;
            }
            .lock-footer-link {
                margin-top: 16px;
            }
            .lock-footer-link a {
                color: #818cf8;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
                transition: color 0.2s;
            }
            .lock-footer-link a:hover {
                color: #a5b4fc;
                text-decoration: underline;
            }
        `;
        document.head.appendChild(style);

        // Chèn mã HTML màn hình khóa PIN
        const injectLockScreen = () => {
            if (document.getElementById('lockScreenOverlay')) return;
            const overlay = document.createElement('div');
            overlay.id = 'lockScreenOverlay';
            overlay.className = 'lock-screen-overlay';
            overlay.innerHTML = `
                <div class="lock-screen-card" id="lockCard">
                    <div class="lock-icon-container">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <div class="lock-app-title">Hệ Thống WMS Kho BN</div>
                    <div class="lock-screen-subtitle">Vui lòng nhập mã PIN bảo mật để tiếp tục</div>
                    
                    <div class="lock-pin-section">
                        <div class="lock-pin-label">ENTER SECURITY PIN</div>
                        <div class="lock-pin-dots" id="pinDots">
                            <div class="pin-dot"></div>
                            <div class="pin-dot"></div>
                            <div class="pin-dot"></div>
                            <div class="pin-dot"></div>
                            <div class="pin-dot"></div>
                            <div class="pin-dot"></div>
                        </div>
                    </div>

                    <div class="lock-keypad">
                        <button class="keypad-btn" data-key="1">1</button>
                        <button class="keypad-btn" data-key="2">2</button>
                        <button class="keypad-btn" data-key="3">3</button>
                        <button class="keypad-btn" data-key="4">4</button>
                        <button class="keypad-btn" data-key="5">5</button>
                        <button class="keypad-btn" data-key="6">6</button>
                        <button class="keypad-btn" data-key="7">7</button>
                        <button class="keypad-btn" data-key="8">8</button>
                        <button class="keypad-btn" data-key="9">9</button>
                        <button class="keypad-btn keypad-action" data-key="clear">C</button>
                        <button class="keypad-btn" data-key="0">0</button>
                        <button class="keypad-btn keypad-action" data-key="backspace">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                                <line x1="18" y1="9" x2="12" y2="15"/>
                                <line x1="12" y1="9" x2="18" y2="15"/>
                            </svg>
                        </button>
                    </div>

                    <div class="lock-error" id="lockErrorMsg">Mã PIN không chính xác!</div>
                    
                    <div class="lock-footer-link">
                        <a href="#" id="forgotPinBtn">Quên PIN?</a>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const card = document.getElementById('lockCard');
            const dots = document.querySelectorAll('.pin-dot');
            const errorMsg = document.getElementById('lockErrorMsg');
            const forgotBtn = document.getElementById('forgotPinBtn');
            let enteredPin = '';
            const PIN_LENGTH = 6;
            const VALID_PINS = ['8386', '200202', '2002', '123456', 'Luog@2002'];

            const updateDots = () => {
                dots.forEach((dot, index) => {
                    if (index < enteredPin.length) {
                        dot.classList.add('filled');
                    } else {
                        dot.classList.remove('filled');
                    }
                    dot.classList.remove('error');
                });
            };

            const triggerError = () => {
                dots.forEach(dot => dot.classList.add('error'));
                card.classList.add('lock-card-shake');
                errorMsg.classList.add('show');
                
                setTimeout(() => {
                    card.classList.remove('lock-card-shake');
                }, 400);

                setTimeout(() => {
                    enteredPin = '';
                    updateDots();
                    errorMsg.classList.remove('show');
                }, 900);
            };

            const validatePin = (pin) => {
                const storedPin = localStorage.getItem('wms_pin_code');
                const isCorrect = VALID_PINS.includes(pin) || (storedPin && pin === storedPin);
                if (isCorrect) {
                    sessionStorage.setItem('wms_authenticated', 'true');
                    sessionStorage.setItem('wms_last_activity', Date.now());
                    
                    // Unlock animation
                    overlay.style.transition = 'all 0.3s ease-out';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'scale(1.05)';
                    
                    setTimeout(() => {
                        overlay.remove();
                        document.removeEventListener('keydown', handleKeyDown);
                        startActivityTracking();
                    }, 300);
                } else {
                    triggerError();
                }
            };

            const handleInput = (val) => {
                if (val === 'backspace') {
                    if (enteredPin.length > 0) {
                        enteredPin = enteredPin.slice(0, -1);
                        updateDots();
                    }
                } else if (val === 'clear') {
                    enteredPin = '';
                    updateDots();
                } else if (/^[0-9]$/.test(val)) {
                    if (enteredPin.length < PIN_LENGTH) {
                        enteredPin += val;
                        updateDots();
                        const storedPin = localStorage.getItem('wms_pin_code');
                        if (VALID_PINS.includes(enteredPin) || (storedPin && enteredPin === storedPin)) {
                            setTimeout(() => validatePin(enteredPin), 120);
                        } else if (enteredPin.length === PIN_LENGTH) {
                            setTimeout(() => validatePin(enteredPin), 120);
                        }
                    }
                }
            };

            // Keypad click handlers
            const keypadButtons = overlay.querySelectorAll('.keypad-btn');
            keypadButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.getAttribute('data-key');
                    handleInput(key);
                });
            });

            // Physical keyboard support
            const handleKeyDown = (e) => {
                if (!document.getElementById('lockScreenOverlay')) return;
                
                let keyBtn = null;
                if (/^[0-9]$/.test(e.key)) {
                    handleInput(e.key);
                    keyBtn = overlay.querySelector(`.keypad-btn[data-key="${e.key}"]`);
                } else if (e.key === 'Backspace') {
                    handleInput('backspace');
                    keyBtn = overlay.querySelector('.keypad-btn[data-key="backspace"]');
                } else if (e.key === 'Escape' || e.key === 'Delete') {
                    handleInput('clear');
                    keyBtn = overlay.querySelector('.keypad-btn[data-key="clear"]');
                } else if (e.key === 'Enter' && enteredPin.length > 0) {
                    validatePin(enteredPin);
                }

                if (keyBtn) {
                    keyBtn.classList.add('pressed');
                    setTimeout(() => keyBtn.classList.remove('pressed'), 150);
                }
            };

            document.addEventListener('keydown', handleKeyDown);

            forgotBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Mã PIN truy cập mặc định là: 8386 (hoặc 200202)\nBạn có thể sử dụng bàn phím số để nhập nhanh.');
            });
        };

        if (document.body) {
            injectLockScreen();
        } else {
            document.addEventListener('DOMContentLoaded', injectLockScreen);
        }
    } else {
        startActivityTracking();
    }
})();

const PAGES = [
    { id: 'missing',   label: 'Data Missing – Tính Lệch', url: '../index.html', icon: 'radar', color: 'indigo', desc: 'Khớp dữ liệu kiểm kê vs hệ thống' },
    { id: 'mapping',   label: 'Mapping Kệ Nhanh',   url: '../mapping.html', icon: 'map-pin', color: 'emerald', desc: 'Tra cứu vị trí kệ theo SKU' },
    { id: 'candate',   label: 'Sản Phẩm Cận Date', url: '../data/html/candate.html', icon: 'calendar', color: 'indigo', desc: 'Lọc sản phẩm HSD dưới 1 năm' },
    { id: 'report',    label: 'Báo Cáo Missing',    url: '../data/html/report-missing.html', icon: 'bar-chart-3', color: 'indigo', desc: 'Biểu đồ missing theo ngày, ca làm, top sản phẩm' },
    { id: 'doisoat',   label: 'Đối Soát Vender',    url: '../data/html/doisoat.html', icon: 'shield-check', color: 'indigo', desc: 'Quản lý sản lượng & vi phạm' },
    { id: 'multisearch', label: 'Tra cứu Nhiều SP', url: '../data/html/multi-search.html', icon: 'search', color: 'indigo', desc: 'Tra cứu hàng loạt SKU – tồn kho, vị trí, lot' },
];

// Detect base dir (same-origin file navigation)
function resolvePageUrl(url) {
    // If already absolute path, return as-is
    if (url.startsWith('http') || url.startsWith('/')) return url;
    // Resolve relative to current file
    const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    // If current page is in /main/ subdirectory, go up one level
    const isInSubdir = window.location.pathname.includes('/main/');
    if (isInSubdir) {
        return base + url; // url already has '../' prefix
    }
    // Remove '../' prefix if we're at root
    return base + url.replace(/^\.\.\//, '');
}

const SETTINGS_KEYS = {
    SID: 'wms_sid',
    TOKEN: 'wms_token',
    SCRIPT_URL: 'wms_script_url',
    PROXY_URL: 'wms_proxy_url',
    THEME: 'wms_theme',
    INVENTORY: 'wms_inventory',
    PIN_CODE: 'wms_pin_code',
};

const SETTINGS_DEFAULTS = {
    PROXY_URL: 'http://localhost:8081',
};

// ---- Cross-Tab Sync Logic ----
const myPageId = Math.random().toString(36).substring(2, 9);
const activePeers = new Map();
let syncChannel = null;

function getPageName() {
    const path = window.location.pathname;
    const base = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    // Friendly name
    if (base.includes('mapping.html')) return 'Sơ đồ kệ';
    if (base.includes('index.html') || base.includes('index%202.html') || base.includes('index 2.html')) return 'Kiểm kê';
    return base;
}

function initSync() {
    // 1. Tích hợp BroadcastChannel (Real-time sync)
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            syncChannel = new BroadcastChannel('wms_settings_sync');
            
            syncChannel.onmessage = (event) => {
                const msg = event.data;
                if (!msg) return;
                
                if (msg.type === 'PING') {
                    // Trả lời PONG và gửi kèm định danh trang của mình
                    if (syncChannel) {
                        syncChannel.postMessage({
                            type: 'PONG',
                            sender: getPageName(),
                            id: myPageId
                        });
                    }
                    addPeer(msg.sender, msg.id);
                } else if (msg.type === 'PONG') {
                    addPeer(msg.sender, msg.id);
                } else if (msg.type === 'SETTINGS_UPDATED') {
                    console.log('Settings updated from peer:', msg.sender);
                    // Cập nhật giá trị hiển thị trên modal (nếu đang mở) và hiện toast thông báo
                    updateSettingsUI();
                    showSettingsToast(`Đồng bộ cài đặt từ: ${msg.sender}`);
                } else if (msg.type === 'THEME_UPDATED') {
                    console.log('Theme updated from peer:', msg.sender);
                    // Đồng bộ theme (không phát lại nữa để tránh loop)
                    setTheme(msg.theme, false);
                } else if (msg.type === 'BYE') {
                    removePeer(msg.id);
                }
            };
            
            // Gửi PING ban đầu để dò các tab khác
            syncChannel.postMessage({
                type: 'PING',
                sender: getPageName(),
                id: myPageId
            });
            
            // Thông báo tắt tab khi unload
            window.addEventListener('beforeunload', () => {
                try {
                    if (syncChannel) {
                        syncChannel.postMessage({
                            type: 'BYE',
                            id: myPageId
                        });
                        syncChannel.close();
                    }
                } catch(e) {}
            });
            
        } catch (e) {
            console.warn('BroadcastChannel initialization failed:', e);
        }
    }
    
    // 2. Lắng nghe sự kiện Storage (Dự phòng/fallback cho trường hợp BroadcastChannel gặp lỗi)
    window.addEventListener('storage', (event) => {
        if (!event.key) return;
        
        // Đồng bộ Theme
        if (event.key === SETTINGS_KEYS.THEME) {
            setTheme(event.newValue, false);
        }
        
        // Đồng bộ Cài đặt
        const keys = [SETTINGS_KEYS.SID, SETTINGS_KEYS.TOKEN, SETTINGS_KEYS.SCRIPT_URL, SETTINGS_KEYS.PROXY_URL];
        if (keys.includes(event.key)) {
            if (!window.settingsSyncToastTimeout) {
                window.settingsSyncToastTimeout = setTimeout(() => {
                    updateSettingsUI();
                    showSettingsToast('Đã tự động đồng bộ cài đặt mới!');
                    window.settingsSyncToastTimeout = null;
                }, 200);
            }
        }
    });
}

function addPeer(name, id) {
    if (id === myPageId) return;
    activePeers.set(id, name);
    updateSyncUI();
}

function removePeer(id) {
    activePeers.delete(id);
    updateSyncUI();
}

function updateSyncUI() {
    const indicator = document.getElementById('syncIndicator');
    const text = document.getElementById('syncText');
    const peerCount = document.getElementById('syncPeerCount');
    
    if (!indicator || !text) return;
    
    if (activePeers.size > 0) {
        indicator.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
        text.textContent = 'Đã kết nối và đồng bộ';
        if (peerCount) {
            peerCount.textContent = `${activePeers.size + 1} trang`;
            peerCount.className = 'text-[9px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold';
        }
    } else {
        indicator.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
        text.textContent = 'Đang hoạt động (chờ liên kết)';
        if (peerCount) {
            peerCount.textContent = '1 trang';
            peerCount.className = 'text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold';
        }
    }
}

function updateSettingsUI() {
    const s = getSettings();
    const proxyInput = document.getElementById('sharedProxyUrl');
    const sidInput = document.getElementById('sharedSid');
    const tokenInput = document.getElementById('sharedToken');
    const scriptUrlInput = document.getElementById('sharedScriptUrl');
    
    if (proxyInput) proxyInput.value = s.proxyUrl;
    if (sidInput) sidInput.value = s.sid;
    if (tokenInput) tokenInput.value = s.token;
    if (scriptUrlInput) scriptUrlInput.value = s.scriptUrl;
}

function updateThemeIconsOnPage(theme) {
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        const icon = toggle.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
            if (typeof lucide !== 'undefined') {
                try {
                    lucide.createIcons();
                } catch (e) {
                    console.warn("Theme icon update error:", e);
                }
            }
        }
    }
}

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
        pinCode: getSetting(SETTINGS_KEYS.PIN_CODE) || '',
    };
}

// ---- Write ----
function saveSettings({ sid, token, scriptUrl, proxyUrl, pinCode }) {
    if (sid !== undefined) localStorage.setItem(SETTINGS_KEYS.SID, sid);
    if (token !== undefined) localStorage.setItem(SETTINGS_KEYS.TOKEN, token);
    if (scriptUrl !== undefined) localStorage.setItem(SETTINGS_KEYS.SCRIPT_URL, scriptUrl);
    if (proxyUrl !== undefined) localStorage.setItem(SETTINGS_KEYS.PROXY_URL, proxyUrl);
    if (pinCode !== undefined) localStorage.setItem(SETTINGS_KEYS.PIN_CODE, pinCode);
}

// ---- Theme ----
function getTheme() {
    return getSetting(SETTINGS_KEYS.THEME) || 'light';
}

function setTheme(theme, broadcast = true) {
    localStorage.setItem(SETTINGS_KEYS.THEME, theme);
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    updateThemeIconsOnPage(theme);
    
    if (broadcast && syncChannel) {
        syncChannel.postMessage({
            type: 'THEME_UPDATED',
            sender: getPageName(),
            theme: theme
        });
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    setTheme(next, true);
    return next;
}

function initTheme() {
    const theme = getTheme();
    setTheme(theme, false);
    return theme;
}

// ---- Settings Modal ----
function createSettingsModal() {
    // Kiểm tra xem modal đã tồn tại chưa
    if (document.getElementById('sharedSettingsModal')) return;

    // Tạo HTML cho các nút chuyển trang
    const currentUrl = decodeURIComponent(window.location.pathname);
    const pageNavHtml = PAGES.map(p => {
        const pageFile = p.url.replace('../', '');
        const isCurrent = currentUrl.endsWith(pageFile) || currentUrl.endsWith('/' + pageFile);
        const colorMap = {
            indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
            emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
        };
        const activeClass = isCurrent
            ? 'ring-2 ring-offset-1 ring-indigo-400 dark:ring-indigo-600 opacity-80 cursor-default'
            : 'cursor-pointer transition-all hover:scale-[1.02] active:scale-95';
        return `
        <button onclick="openPage('${p.url}')" ${isCurrent ? 'disabled' : ''}
            class="flex items-center gap-3 w-full p-3 rounded-xl border ${colorMap[p.color] || colorMap.indigo} ${activeClass}">
            <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-700">
                <i data-lucide="${p.icon}" class="w-4 h-4"></i>
            </div>
            <div class="text-left min-w-0 flex-1">
                <p class="text-xs font-bold truncate">${p.label}</p>
                <p class="text-[10px] opacity-70 truncate">${p.desc}</p>
            </div>
            ${isCurrent
                ? '<span class="text-[9px] bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-full font-bold flex-shrink-0">Trang này</span>'
                : '<i data-lucide="external-link" class="w-3.5 h-3.5 opacity-50 flex-shrink-0"></i>'
            }
        </button>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'sharedSettingsModal';
    modal.className = 'fixed inset-0 modal-overlay z-[200] hidden items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl modal-content border border-slate-200 dark:border-slate-700 overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4">
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

            <!-- Tab Switcher -->
            <div id="settingsTabNav" class="flex gap-1 px-6 mb-1">
                <button id="tabBtnToken" onclick="switchSettingsTab('token')" class="flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-indigo-600 text-white shadow">
                    <i data-lucide="key" class="w-3 h-3 inline mr-1"></i>Token & Cài đặt
                </button>
                <button id="tabBtnPages" onclick="switchSettingsTab('pages')" class="flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <i data-lucide="layers" class="w-3 h-3 inline mr-1"></i>Chuyển Trang
                </button>
            </div>

            <!-- Panel: Token -->
            <div id="settingsPanelToken" class="px-6 pb-6 space-y-4 mt-3">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Mã PIN Truy Cập Hệ Thống (Mặc định: 8386)</label>
                    <input id="sharedPinCode" type="text" maxlength="12" class="w-full input-field text-xs font-mono" placeholder="Nhập PIN tùy chỉnh (vd: 8386)...">
                </div>
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

                <!-- Trạng thái đồng bộ -->
                <div class="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span class="flex items-center gap-1.5 font-medium">
                        <span id="syncIndicator" class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span id="syncText">Đang hoạt động (chờ liên kết)</span>
                    </span>
                    <span id="syncPeerCount" class="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">1 trang</span>
                </div>

                <button id="sharedSettingsSave" class="w-full btn-primary mt-1">
                    <i data-lucide="save" class="w-5 h-5"></i>
                    Lưu Cài Đặt
                </button>
            </div>

            <!-- Panel: Chuyển Trang -->
            <div id="settingsPanelPages" class="px-6 pb-6 space-y-3 mt-3 hidden">
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl flex gap-2 items-start">
                    <i data-lucide="info" class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"></i>
                    <p class="text-[11px] text-blue-700 dark:text-blue-300">Mở trang mới — token và cài đặt sẽ được <strong>tự động đồng bộ</strong> qua BroadcastChannel.</p>
                </div>
                <div class="space-y-2">
                    ${pageNavHtml}
                </div>
                <!-- Danh sách tab đang mở -->
                <div class="pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <i data-lucide="radio" class="w-3 h-3"></i> Các tab đang mở
                    </p>
                    <div id="activePeerList" class="space-y-1.5 text-xs">
                        <p class="text-slate-400 dark:text-slate-500 italic text-[11px]">Chưa có tab nào khác đang mở...</p>
                    </div>
                </div>
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

// ---- Tab switcher trong Settings Modal ----
function switchSettingsTab(tab) {
    const panelToken = document.getElementById('settingsPanelToken');
    const panelPages = document.getElementById('settingsPanelPages');
    const btnToken = document.getElementById('tabBtnToken');
    const btnPages = document.getElementById('tabBtnPages');
    if (!panelToken || !panelPages) return;

    if (tab === 'token') {
        panelToken.classList.remove('hidden');
        panelPages.classList.add('hidden');
        btnToken.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-indigo-600 text-white shadow';
        btnPages.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
    } else {
        panelToken.classList.add('hidden');
        panelPages.classList.remove('hidden');
        btnToken.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
        btnPages.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-indigo-600 text-white shadow';
        renderActivePeerList();
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- Hiển thị danh sách tab đang mở ----
function renderActivePeerList() {
    const container = document.getElementById('activePeerList');
    if (!container) return;

    const myName = getPageName();
    const items = [];

    // Thêm tab hiện tại
    items.push(`
        <div class="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <span class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
            <span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 truncate">${myName}</span>
            <span class="ml-auto text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">Trang này</span>
        </div>`);

    // Thêm các tab khác
    activePeers.forEach((name, id) => {
        items.push(`
        <div class="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
            <span class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">${name}</span>
            <span class="ml-auto text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">Đang kết nối</span>
        </div>`);
    });

    if (items.length === 1) {
        items.push(`<p class="text-slate-400 dark:text-slate-500 italic text-[11px] px-1">Chưa có tab nào khác đang mở...</p>`);
    }

    container.innerHTML = items.join('');
}

// ---- Mở trang mới với token đồng bộ ----
function openPage(url) {
    const resolved = resolvePageUrl(url);
    // Token đã có trong localStorage nên trang mới sẽ tự đọc ngay khi load
    // Thêm timestamp để tránh cache
    const sep = resolved.includes('?') ? '&' : '?';
    const target = resolved + sep + '_t=' + Date.now();
    window.open(target, '_blank');
}

function openSettingsModal(initialTab) {
    createSettingsModal();
    const s = getSettings();
    document.getElementById('sharedProxyUrl').value = s.proxyUrl;
    document.getElementById('sharedSid').value = s.sid;
    document.getElementById('sharedToken').value = s.token;
    document.getElementById('sharedScriptUrl').value = s.scriptUrl;
    if (document.getElementById('sharedPinCode')) document.getElementById('sharedPinCode').value = s.pinCode;
    document.getElementById('sharedSettingsModal').classList.replace('hidden', 'flex');
    // Reset về tab token (hoặc tab được chỉ định)
    switchSettingsTab(initialTab || 'token');
    updateSyncUI();
}

// Hàm tiện ích để mở thẳng tab Chuyển Trang
function openPageNavigator() {
    openSettingsModal('pages');
}

function closeSettingsModal() {
    const el = document.getElementById('sharedSettingsModal');
    if (el) el.classList.replace('flex', 'hidden');
}

function saveSettingsModal() {
    let sid = document.getElementById('sharedSid').value.trim();
    let token = document.getElementById('sharedToken').value.trim();
    
    // Auto-fix if user mistakenly pastes a URL
    if (sid.startsWith('http://') || sid.startsWith('https://')) sid = '';
    if (token.startsWith('http://') || token.startsWith('https://')) token = '';
    
    const scriptUrl = document.getElementById('sharedScriptUrl').value.trim();
    const proxyUrl = document.getElementById('sharedProxyUrl').value.trim() || SETTINGS_DEFAULTS.PROXY_URL;
    const pinCode = document.getElementById('sharedPinCode') ? document.getElementById('sharedPinCode').value.trim() : '';

    saveSettings({ sid, token, scriptUrl, proxyUrl, pinCode });

    // Cập nhật token tới proxy server
    if (sid || token) {
        fetch(`${proxyUrl}/update-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid, token })
        })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                console.log("Proxy updated successfully");
            } else {
                alert("Lỗi từ Proxy khi cập nhật token: " + data.message);
            }
        })
        .catch((e) => {
            alert(`Không thể cập nhật token tới Proxy Server (${proxyUrl}).\n\nVui lòng:\n1. Kiểm tra xem file proxy.ps1 hoặc start-proxy.cjs đã được chạy chưa.\n2. Kiểm tra xem Proxy URL trong cài đặt có khớp với cổng proxy đang chạy (8081 hoặc 3000) không.`);
        });
    }

    // Phát tin nhắn đồng bộ tới các tab khác
    if (syncChannel) {
        syncChannel.postMessage({
            type: 'SETTINGS_UPDATED',
            sender: getPageName()
        });
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
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Clear previous timeout if any
    if (window.settingsToastTimeoutId) clearTimeout(window.settingsToastTimeoutId);
    window.settingsToastTimeoutId = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 2500);
}

// ---- Proxy URL helper ----
function getProxyUrl() {
    return getSetting(SETTINGS_KEYS.PROXY_URL) || SETTINGS_DEFAULTS.PROXY_URL;
}

// Khởi chạy đồng bộ
initSync();

