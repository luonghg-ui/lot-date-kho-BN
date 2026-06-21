// ── Đồng bộ token từ localStorage (do settings.js của kiểm kê hàng ngày lưu) ──
function extractToken(raw) {
  if (!raw) return { sid: '', token: '' };
  const sidMatch = raw.match(/SID=([^;]+)/);
  const tokenMatch = raw.match(/session_token=([^;]+)/);
  return {
    sid: sidMatch ? sidMatch[1] : '',
    token: tokenMatch ? tokenMatch[1] : ''
  };
}
(async function syncTokenFromInventory() {
    let sid = localStorage.getItem('wms_sid');
    let token = localStorage.getItem('wms_token');
    const extracted = extractToken((sid || '') + ';' + (token || ''));
    if (extracted.sid && extracted.token) { sid = extracted.sid; token = extracted.token; }
    const proxyUrl = localStorage.getItem('wms_proxy_url') || 'http://localhost:8081';
    if (sid && token) {
        try {
            const r = await fetch(`${proxyUrl}/update-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sid, token })
            });
            if (r.ok) console.log('✅ Token synced from Kiểm Kê Hàng Ngày');
            else console.warn('⚠️ Token sync failed:', r.status);
        } catch (e) {
            console.warn('⚠️ Proxy not reachable for token sync:', e.message);
        }
    } else {
        console.warn('⚠️ No token found in localStorage. Open Kiểm Kê Hàng Ngày and enter token in Settings.');
    }
})();

const ROWS_PER_PAGE = 30;

let allData = [];
let filtered = [];
let sortCol = 'days';
let sortDir = 'asc';
let currentPage = 1;

const searchInput = document.getElementById('searchInput');
const dateFilter = document.getElementById('dateFilter');
const tableBody = document.getElementById('tableBody');
const resultBadge = document.getElementById('resultBadge');
const statusBanner = document.getElementById('statusBanner');
const bannerInner = document.getElementById('bannerInner');
const refreshBtn = document.getElementById('refreshBtn');
const paginationWrap = document.getElementById('paginationWrap');
const pageInfo = document.getElementById('pageInfo');
const pageBtns = document.getElementById('pageBtns');

function showBanner(type, msg) {
    statusBanner.style.display = 'block';
    bannerInner.className = `banner ${type}`;
    let icon = 'bx-loader-alt bx-spin';
    if (type === 'success') icon = 'bx-check-circle';
    if (type === 'error') icon = 'bx-error-circle';
    bannerInner.innerHTML = `<i class='bx ${icon}'></i><span>${msg}</span>`;
}

function hideBanner() {
    statusBanner.style.display = 'none';
}

function normalize(str) {
    return str ? str.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim() : '';
}

function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function highlight(text, query) {
    if (!query || !text) return escapeHTML(text);
    const q = normalize(query), t = text.toString(), tn = normalize(t);
    let res = '', lastIdx = 0, idx = tn.indexOf(q);
    while (idx !== -1) {
        res += escapeHTML(t.substring(lastIdx, idx)) + `<mark>${escapeHTML(t.substring(idx, idx + q.length))}</mark>`;
        lastIdx = idx + q.length;
        idx = tn.indexOf(q, lastIdx);
    }
    return res + escapeHTML(t.substring(lastIdx));
}

function parseDate(str) {
    if (!str) return null;
    if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]);
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]);
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

function getDaysRemaining(dateStr) {
    const expDate = parseDate(dateStr);
    if (!expDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
}

function getExpLevel(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days < 0) return 'expired';
    if (days <= 90) return 'urgent';
    if (days <= 180) return 'warning';
    if (days <= 365) return 'notice';
    return 'safe';
}

function getProxiedImageUrl(url) {
    if (!url) return '';
    let targetUrl = url;
    if (url.includes('storage.googleapis.com/')) {
        targetUrl = url.replace('storage.googleapis.com/', 'cdn-gcs.thuocsi.vn/');
    }
    if (targetUrl.startsWith('http')) {
        const proxy = localStorage.getItem('wms_proxy_url') || 'http://localhost:8081';
        return `${proxy}/image?url=${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
}

async function loadData() {
    setControls(false);
    refreshBtn.classList.add('spinning');
    showBanner('loading', 'Đang gọi API audit detail...');

    const proxyUrl = localStorage.getItem('wms_proxy_url') || 'http://localhost:8081';
    let auditUrl = `${proxyUrl}/wms/BUYMED/HN/inventory/audit/detail?warehouseCode=HN&auditSessionCode=AUDIT-MAIN-7911`;
    // Truyền token qua query params
    const sid = localStorage.getItem('wms_sid') || '';
    const token = localStorage.getItem('wms_token') || '';
    const extracted = extractToken(sid + ';' + token);
    const cleanSid = extracted.sid || sid;
    const cleanToken = extracted.token || token;
    if (cleanSid && cleanToken) {
      auditUrl += `&_sid=${encodeURIComponent(cleanSid)}&_token=${encodeURIComponent(cleanToken)}`;
    }

    try {
        const res = await fetch(auditUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`API trả về ${res.status}`);
        const result = await res.json();
        const apiData = result.data || result;

        const items = [];
        const skuList = Array.isArray(apiData) ? apiData : (apiData.products || apiData.items || []);

        skuList.forEach(item => {
            const lots = item.skuLotDate || item.lots || item.lotDates || [];
            lots.forEach(lot => {
                const dateStr = lot.expiredDate || lot.expiredTime || lot.expDate || '';
                if (!dateStr) return;
                const days = getDaysRemaining(dateStr);
                if (days === null || days > 365) return;

                items.push({
                    sku: item.sku || item.skuCode || '',
                    name: item.productName || item.name || item.sku || 'N/A',
                    lot: lot.lot || '',
                    expDate: dateStr,
                    daysRemaining: days,
                    location: item.locationCode || item.location || '',
                    qty: lot.availableQuantity || lot.inQuantity || lot.quantity || 0,
                    unit: item.unit || '',
                    image: getProxiedImageUrl(item.image || item.imageUrl || '') || '',
                    group: item.categoryName || item.group || ''
                });
            });
        });

        if (items.length === 0) throw new Error('API không trả về dữ liệu lot/date hợp lệ.');

        allData = items;
        updateStats();
        applyFilter();
        setControls(true);
        hideBanner();
        refreshBtn.classList.remove('spinning');

        if (allData.length === 0) {
            resultBadge.textContent = 'Không có dữ liệu';
        } else {
            showBanner('success', `Tìm thấy ${allData.length} sản phẩm cận date (từ API audit).`);
            resultBadge.textContent = `${allData.length} sản phẩm`;
            setTimeout(hideBanner, 3000);
        }
    } catch (err) {
        console.error('loadData error:', err);
        showBanner('error', `Lỗi: ${err.message}`);
        refreshBtn.classList.remove('spinning');
        setControls(true);
        resultBadge.textContent = 'Lỗi tải dữ liệu';
    }
}

function updateStats() {
    let urgent = 0, warning = 0, notice = 0;
    allData.forEach(d => {
        const level = getExpLevel(d.daysRemaining);
        if (level === 'urgent') urgent++;
        else if (level === 'warning') warning++;
        else if (level === 'notice') notice++;
    });

    document.getElementById('statTotal').textContent = allData.length.toLocaleString('vi-VN');
    document.getElementById('statUrgent').textContent = urgent.toLocaleString('vi-VN');
    document.getElementById('statWarning').textContent = warning.toLocaleString('vi-VN');
    document.getElementById('statNotice').textContent = notice.toLocaleString('vi-VN');
}

function applyFilter() {
    const q = normalize(searchInput.value);
    const dateF = dateFilter.value;

    filtered = allData.filter(d => {
        const text = normalize(d.name) + ' ' + normalize(d.sku) + ' ' + normalize(d.lot);
        if (q && !text.includes(q)) return false;
        const level = getExpLevel(d.daysRemaining);
        if (dateF === 'urgent' && level !== 'urgent') return false;
        if (dateF === 'warning' && level !== 'warning') return false;
        if (dateF === 'notice' && level !== 'notice') return false;
        return true;
    });

    if (sortCol) {
        filtered.sort((a, b) => {
            let av, bv;
            if (sortCol === 'name') { av = a.name; bv = b.name; }
            else if (sortCol === 'lot') { av = a.lot; bv = b.lot; }
            else if (sortCol === 'exp') { av = a.expDate; bv = b.expDate; }
            else if (sortCol === 'days') { av = a.daysRemaining; bv = b.daysRemaining; }
            else if (sortCol === 'qty') { av = a.qty; bv = b.qty; }
            return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
    }

    currentPage = 1;
    resultBadge.textContent = `Lọc được ${filtered.length} sản phẩm`;
    renderPage();
}

function renderPage() {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const slice = filtered.slice(start, start + ROWS_PER_PAGE);

    tableBody.innerHTML = slice.length ? slice.map((d, i) => {
        const level = getExpLevel(d.daysRemaining);
        let badgeClass, badgeText;
        if (level === 'expired') { badgeClass = 'badge-gap missing'; badgeText = 'Hết hạn'; }
        else if (level === 'urgent') { badgeClass = 'badge-gap missing'; badgeText = `${d.daysRemaining} ngày`; }
        else if (level === 'warning') { badgeClass = 'badge-gap surplus'; badgeText = `${d.daysRemaining} ngày`; }
        else if (level === 'notice') { badgeClass = 'badge-gap ok'; badgeText = `${d.daysRemaining} ngày`; }
        else { badgeClass = 'badge-gap ok'; badgeText = `${d.daysRemaining || '?'} ngày`; }

        const imgSrc = d.image || 'https://placehold.co/48x48/1e293b/4f46e5?text=SP';

        return `<tr>
            <td style="text-align:center; opacity:0.5;">${start + i + 1}</td>
            <td class="td-img"><img src="${imgSrc}" onerror="this.src='https://placehold.co/48x48/1e293b/4f46e5?text=SP'" loading="lazy"></td>
            <td class="td-name">
                <div class="name-main">${highlight(d.name, searchInput.value)}</div>
                <span class="name-sku">${highlight(d.sku, searchInput.value)}</span>
                ${d.group ? `<span class="badge badge-indigo" style="font-size:8px; margin-top:4px; display:inline-block;">${escapeHTML(d.group)}</span>` : ''}
            </td>
            <td class="td-lot">${highlight(d.lot || '-', searchInput.value)}</td>
            <td class="td-exp">${d.expDate || '-'}</td>
            <td class="td-days"><span class="${badgeClass}" style="display:inline-block; min-width:70px; text-align:center;">${badgeText}</span></td>
            <td class="td-loc"><span class="loc-badge">${d.location || '-'}</span></td>
            <td class="td-qty">${(d.qty || 0).toLocaleString('vi-VN')} ${d.unit}</td>
        </tr>`;
    }).join('') : '<tr><td colspan="8" class="empty-state">Không tìm thấy sản phẩm nào.</td></tr>';

    const pages = Math.ceil(filtered.length / ROWS_PER_PAGE);
    paginationWrap.style.display = pages > 1 ? 'flex' : 'none';
    if (pages > 1) {
        pageInfo.innerHTML = `Trang <b>${currentPage}</b> / ${pages}`;
        pageBtns.innerHTML = `<button class="page-btn" ${currentPage===1?'disabled':''} onclick="goPage(${currentPage-1})"><i class='bx bx-chevron-left'></i></button>` +
            `<button class="page-btn active">${currentPage}</button>` +
            `<button class="page-btn" ${currentPage===pages?'disabled':''} onclick="goPage(${currentPage+1})"><i class='bx bx-chevron-right'></i></button>`;
    }
}

function goPage(p) { currentPage = p; renderPage(); window.scrollTo(0,0); }

function setupSort() {
    ['thName', 'thLot', 'thExp', 'thDays', 'thQty'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.onclick = (e) => {
            const col = e.currentTarget.dataset.col;
            sortDir = (sortCol === col && sortDir === 'asc') ? 'desc' : 'asc';
            sortCol = col;
            applyFilter();
            document.querySelectorAll('th').forEach(th => { th.classList.remove('asc','desc'); });
            e.currentTarget.classList.add(sortDir);
        };
    });
}

function setControls(en) {
    searchInput.disabled = !en;
    dateFilter.disabled = !en;
}

searchInput.oninput = applyFilter;
dateFilter.onchange = applyFilter;
refreshBtn.onclick = loadData;

function exportToExcel() {
    const dataToExport = filtered.length ? filtered : allData;
    if (!dataToExport.length) { alert('Không có dữ liệu!'); return; }
    try {
        const rows = dataToExport.map((d, i) => ({
            STT: i + 1, 'Mã SKU': d.sku, 'Tên Sản Phẩm': d.name,
            Lot: d.lot || '-', HSD: d.expDate || '-',
            'Số Ngày Còn Lại': d.daysRemaining,
            'Vị Trí': d.location || '-', 'Số Lượng': d.qty, 'ĐVT': d.unit
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cận Date');
        const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 }, fill: { patternType: 'solid', fgColor: { rgb: 'F59E0B' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'B2B2B2' } }, bottom: { style: 'thin', color: { rgb: 'B2B2B2' } }, left: { style: 'thin', color: { rgb: 'B2B2B2' } }, right: { style: 'thin', color: { rgb: 'B2B2B2' } } } };
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const ref = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[ref] && R === 0) ws[ref].s = headerStyle;
            }
        }
        ws['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 50 }, { wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 8 }];
        const d = new Date();
        XLSX.writeFile(wb, `CanDate_${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}.xlsx`);
    } catch (err) { alert('Lỗi xuất Excel: ' + err.message); }
}

document.addEventListener('DOMContentLoaded', () => {
    const exBtn = document.getElementById('exportBtn');
    if (exBtn) exBtn.addEventListener('click', exportToExcel);
    // ── Token Panel ──
    const tokenBtn = document.getElementById('tokenBtn');
    const tokenPanel = document.getElementById('tokenPanel');
    const tokenPanelClose = document.getElementById('tokenPanelClose');
    const tokenExtractBtn = document.getElementById('tokenExtractBtn');
    const tokenTestBtn = document.getElementById('tokenTestBtn');
    const tokenCookieInput = document.getElementById('tokenCookieInput');
    const tokenExtracted = document.getElementById('tokenExtracted');
    const tokenSidDisplay = document.getElementById('tokenSidDisplay');
    const tokenTokenDisplay = document.getElementById('tokenTokenDisplay');
    const tokenExtractStatus = document.getElementById('tokenExtractStatus');
    const tokenTestResult = document.getElementById('tokenTestResult');
    if (tokenBtn && tokenPanel) {
        tokenBtn.addEventListener('click', function() {
            tokenPanel.style.display = tokenPanel.style.display === 'none' ? 'block' : 'none';
            const sid = localStorage.getItem('wms_sid') || '';
            const token = localStorage.getItem('wms_token') || '';
            if (sid || token) tokenCookieInput.value = ((sid || '') + ';' + (token || '')).replace(/^;/, '');
        });
    }
    if (tokenPanelClose && tokenPanel) tokenPanelClose.addEventListener('click', function() { tokenPanel.style.display = 'none'; });
    if (tokenExtractBtn) {
        tokenExtractBtn.addEventListener('click', function() {
            const raw = tokenCookieInput.value.trim();
            if (!raw) { alert('Paste cookie string vào ô trên trước!'); return; }
            const extracted = extractToken(raw);
            const sid = extracted.sid;
            const token = extracted.token;
            if (!sid && !token) { alert('Không tìm thấy SID hoặc session_token.'); return; }
            if (sid) localStorage.setItem('wms_sid', sid);
            if (token) localStorage.setItem('wms_token', token);
            tokenSidDisplay.textContent = sid || '(không tìm thấy)';
            tokenTokenDisplay.textContent = token || '(không tìm thấy)';
            tokenExtracted.style.display = 'block';
            tokenExtractStatus.innerHTML = '<span style="color:#34D399;">✅ Đã lưu. Đồng bộ proxy...</span>';
            const proxyUrl = localStorage.getItem('wms_proxy_url') || 'http://localhost:8081';
            fetch(proxyUrl + '/update-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid, token }) })
                .then(r => { if (r.ok) tokenExtractStatus.innerHTML += '<br><span style="color:#34D399;">✅ Proxy OK.</span>'; })
                .catch(() => { tokenExtractStatus.innerHTML += '<br><span style="color:#F87171;">⚠️ Proxy không kết nối được.</span>'; });
        });
    }
    if (tokenTestBtn) {
        tokenTestBtn.addEventListener('click', function() {
            const proxyUrl = localStorage.getItem('wms_proxy_url') || 'http://localhost:8081';
            tokenTestResult.style.display = 'block';
            tokenTestResult.innerHTML = '🔄 Đang kiểm tra...';
            fetch(proxyUrl + '/ping').then(r => r.text()).then(t => {
                tokenTestResult.innerHTML = t === 'pong' ? '<span style="color:#34D399;">✅ Proxy hoạt động</span>' : '<span style="color:#FBBF24;">⚠️ ' + t.slice(0,100) + '</span>';
            }).catch(e => { tokenTestResult.innerHTML = '<span style="color:#F87171;">❌ ' + e.message + '</span>'; });
        });
    }
});

setupSort();
loadData();
