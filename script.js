// State management
const DEFAULT_PRODUCTS = [
    { sku: "DSOQEM8DN9.ALER2AXH", name: "Bổ máu Ferromax Extra Vinaphar (h/100v)", location: "E1A49C24", systemQty: 30, unit: "Hộp" },
    { sku: "DSOQEM8DN9.CELQ61PG", name: "Bổ Sung Vitamin 20-B Blinhzhi Gingseng Vinaphar (H/100v)", location: "E1A48C04", systemQty: 30, unit: "Hộp" },
    { sku: "DSOQEM8DN9.PK7JYJYJ", name: "Omega 3 6 9 th pharma (c/100v)", location: "E1A48C21", systemQty: 20, unit: "Hộp" },
    { sku: "SMEM8DN9F1.GE2ER2AX", name: "Venlormid 5/1.25 Hasan (H/90v)", location: "E1A17A02", systemQty: 10, unit: "Hộp" },
    { sku: "Z3STYACBVI.NAK-TIF-05", name: "Tiffy syrup thai nakorn (c/60ml)", location: "E1A37B06", systemQty: 94, unit: "Chai" }
];

// IndexedDB setup for large datasets
const DB_NAME = 'WMS_DB';
const STORE_NAME = 'products';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'sku' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveProductsToDB(items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        items.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getProductsFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function searchProductsInDB(query) {
    // We already have 'products' in memory for fast access
    return products.filter(p => 
        (p.sku && p.sku.toLowerCase().includes(query)) || 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.location && p.location.toLowerCase().includes(query))
    ).slice(0, 20);
}

// Initial load logic
let products = [];
let inventory = [];

async function loadData() {
    try {
        products = await getProductsFromDB();
        if (products.length === 0) {
            console.log("No data in DB, using defaults...");
            products = DEFAULT_PRODUCTS;
            await saveProductsToDB(products);
        }
        inventory = JSON.parse(localStorage.getItem('wms_inventory')) || [];
    } catch (e) {
        console.error("DB Load Error", e);
        products = DEFAULT_PRODUCTS;
    }
}

// DOM Elements
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/10Oguigdpx5RWP4rV0Mw3eVdBrf-uS8ilQHKfA26GMw8/gviz/tq?tqx=out:csv&gid=0';
const PROXY_URL = 'http://localhost:8081';
const MOVE_PROXY_URL = 'http://localhost:8081/wms/move';
const IMAGE_PROXY_URL = 'http://localhost:8081/image';

const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAACv0lEQVR4nO3bS0hUURzH8f8Z08yxSByZpSByZJYCyZFYCqRHmS2iTYI2Cdok6FmZLaJNgp6V2SLaJGizok2CNgmaZWSWAsmRWDJL9T9X7mUmM+fce+8998y9v9/yA8I5537v59x77v3MOXNmAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4XyY7AMAtfQf+V3V19WlVVXVDVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVWfVFX1SVVV31VV9X1VVf9XVfVTVVXfVVX1V1VVP1VV9XlVVXVDVVX1X1VVv1VV9X1VVf9XVfVTVVXfVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVXfVVX1V1VVP1VV9XlVVXVDVVX1X1VVv1VV9X1VVf9XVfVTVVXfVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVXfVVX1V1VVP1VV9XlVVXVDVVX1X1VVv1VV9X1VVf9XVfVTVVXfVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVXfVVX1V1VVP1VV9XlVVXVDVVX1X1VVv1VV9X1VVf9XVfVTVVXfVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVXfVVX1V1VVP1VV9XlVVXVDVVX1X1VVv1VV9X1VVf9XVfVTVVXfVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVXfVVX1V1VVP1VV9XlVVXVDVVX1X1VVv1VV9X1VVf9XVfVTVVXfVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVXfVVX1V1VVP1VV9XlVVXVDVVX1X1VVv1VV9X1VVf9XVfVTVVXfVVX1XVVVdVdVVT1UVVVfVVX1SVVV31VV9X1VVf9XVfVTVVXfVVX1X1VVP1VV9XlVVXVDVVX1f9VV/R1VVT8A8P68B/r7R36Pof9VAAAAAElFTkSuQmCC';

function getProxiedImageUrl(url) {
    if (!url) return PLACEHOLDER_IMG;
    
    let targetUrl = url;
    // Transform storage.googleapis.com to cdn-gcs.thuocsi.vn
    if (url.includes('storage.googleapis.com/')) {
        targetUrl = url.replace('storage.googleapis.com/', 'cdn-gcs.thuocsi.vn/');
    }

    console.log("Processing Image URL:", targetUrl);
    if (targetUrl.startsWith('http')) {
        return `${IMAGE_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
}
const WMS_PROXY_URL = PROXY_URL + '/wms';
const DETAIL_PROXY_URL = PROXY_URL + '/wms/detail';
const UPDATE_TOKEN_URL = PROXY_URL + '/update-token';
const skuSearch = document.getElementById('skuSearch');
const suggestions = document.getElementById('suggestions');
const productCard = document.getElementById('productCard');
const inventoryForm = document.getElementById('inventoryForm');
const countForm = document.getElementById('countForm');
const inventoryList = document.getElementById('inventoryList');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const btnSync = document.getElementById('btnSync');

// --- Initialization ---
async function init() {
    console.log("Initializing app...");
    await loadData();
    updateStats();
    renderInventory();
    setupEventListeners();
    
    // Check if we should auto-sync
    if (products.length <= DEFAULT_PRODUCTS.length) {
        fetchAllData();
    }
}

async function fetchAllData() {
    await fetchWmsData();
    await fetchSheetData();
}

async function fetchWmsData() {
    try {
        console.log("Fetching WMS data...");
        const response = await fetch(WMS_PROXY_URL);
        if (!response.ok) throw new Error("WMS Proxy error: " + response.status);
        
        const result = await response.json();
        console.log("WMS Data received:", result);

        // Assume result.data is the array of SKUs
        // Based on typical Thuocsi internal API: result.data contains items
        if (result.total) {
            window.wmsTotalCount = result.total;
        }
        
        const wmsItems = result.data || [];
        if (wmsItems.length > 0) {
            // Create a map for quick lookup
            const wmsMap = new Map();
            wmsItems.forEach(item => {
                wmsMap.set(item.sku, {
                    location: item.locationCode || item.location || '',
                    qty: item.stockQuantity || item.physicalQuantity || item.totalQuantity || item.quantity || 0,
                    availableQty: item.availableQuantity || 0
                });
            });

            // Supplement existing products with WMS data
            products.forEach(p => {
                if (wmsMap.has(p.sku)) {
                    const wmsInfo = wmsMap.get(p.sku);
                    p.location = wmsInfo.location || p.location;
                    p.systemQty = wmsInfo.qty || p.systemQty;
                    p.availableQty = wmsInfo.availableQty || p.availableQty;
                }
            });

            // Add new items from WMS if they don't exist
            wmsItems.forEach(item => {
                if (!products.find(p => p.sku === item.sku)) {
                    products.push({
                        sku: item.sku,
                        name: item.productName || item.name || 'Sản phẩm mới (WMS)',
                        location: item.locationCode || item.location || '',
                        systemQty: item.totalQuantity || item.quantity || 0,
                        unit: item.unit || 'Cái',
                        image: getProxiedImageUrl(item.image || item.imageUrl || (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : ''))
                    });
                }
            });

            await saveProductsToDB(products);
            updateStats();
            updateProductCount();
            showToast(`Đã đồng bộ ${wmsItems.length} SKU từ WMS!`);
        }
    } catch (e) {
        console.warn("WMS fetch failed:", e);
        // Don't show toast error here, let fetchSheetData handle the main UI feedback
    }
}

async function fetchSheetData() {
    try {
        btnSync.classList.add('animate-spin');
        const statTotalSku = document.getElementById('statTotalSku');
        if (statTotalSku) statTotalSku.textContent = "Đang tải...";
        
        let response;
        try {
            console.log("Attempting sync via proxy...");
            response = await fetch(PROXY_URL);
            if (!response.ok) throw new Error("Proxy returned " + response.status);
        } catch (e) {
            console.warn("Proxy fetch failed, trying direct (might hit CORS)...", e);
            try {
                response = await fetch(SHEET_URL);
            } catch (e2) {
                throw new Error("Không thể kết nối tới Proxy. Hãy đảm bảo file proxy.ps1 đang chạy!");
            }
        }

        const csvText = await response.text();
        console.log("CSV Data received, length:", csvText.length);
        
        // Remove BOM and split rows
        const cleanText = csvText.replace(/^\uFEFF/, '');
        const allRows = cleanText.split(/\r?\n/).filter(r => r.trim());
        
        if (allRows.length < 2) {
            throw new Error("File CSV không có dữ liệu hoặc chỉ có tiêu đề.");
        }

        // Parse Header Row robustly
        const firstLine = allRows[0];
        // Split by "," or just , depending on format
        const headerRow = firstLine.split(/","|",|,"|,/).map(c => c.replace(/^"|"$/g, '').trim().toUpperCase());
        console.log("Headers detected:", headerRow);
        
        const idx = {
            sku: headerRow.findIndex(h => h.includes('SKU') || h === 'MÃ' || h.includes('MÃ SKU')),
            name: headerRow.findIndex(h => h.includes('TÊN') || h.includes('NAME') || h.includes('SANPHAM')),
            location: headerRow.findIndex(h => h.includes('VỊ TRÍ') || h.includes('LOCATION') || h.includes('VITRI') || h.includes('MÃ VỊ TRÍ')),
            qty: headerRow.findIndex(h => h.includes('TỒN') || h.includes('QTY') || h.includes('VẬT LÝ')),
            lot: headerRow.findIndex(h => h.includes('LOT')),
            date: headerRow.findIndex(h => h.includes('DATE') || h.includes('HẠN')),
            unit: headerRow.findIndex(h => h.includes('QUY CÁCH') || h.includes('UNIT') || h.includes('ĐVT')),
            group: headerRow.findIndex(h => h === 'NHÓM' || h.includes('GROUP') || h === 'NHOM'),
            image: headerRow.findIndex(h => h.includes('HÌNH') || h.includes('IMAGE') || h.includes('ẢNH'))
        };
        console.log("Column mapping indices:", idx);
        if (idx.sku === -1) {
            throw new Error("Không tìm thấy cột 'SKU' hoặc 'MÃ SKU' trong file.");
        }

        const dataRows = allRows.slice(1);
        const newProducts = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            // Fast split for quoted CSV
            const cols = row.split(/","|",|,"|,/).map(c => c.replace(/^"|"$/g, '').trim());
            
            const sku = cols[idx.sku];
            if (!sku || sku === '#N/A' || sku === 'MÃ SKU' || sku === '') continue;

            newProducts.push({
                sku: sku,
                name: cols[idx.name] || 'N/A',
                location: cols[idx.location] || '',
                lastLot: idx.lot !== -1 ? cols[idx.lot] : '',
                lastDate: idx.date !== -1 ? cols[idx.date] : '',
                systemQty: parseInt(cols[idx.qty]) || 0,
                unit: (idx.unit !== -1 ? cols[idx.unit] : '') || "Cái",
                group: (idx.group !== -1 ? cols[idx.group] : '') || '',
                image: (idx.image !== -1 ? cols[idx.image] : '') || ''
            });
        }

        if (newProducts.length > 0) {
            // Merge logic
            const productMap = new Map(products.map(p => [p.sku, p]));
            
            newProducts.forEach(newP => {
                if (productMap.has(newP.sku)) {
                    const existing = productMap.get(newP.sku);
                    Object.assign(existing, {
                        name: newP.name || existing.name,
                        unit: newP.unit || existing.unit,
                        location: existing.location || newP.location,
                        systemQty: newP.systemQty !== undefined ? newP.systemQty : existing.systemQty,
                        group: newP.group || existing.group,
                        image: newP.image || existing.image
                    });
                } else {
                    products.push(newP);
                }
            });

            if (statTotalSku) statTotalSku.textContent = "Đang lưu...";
            await saveProductsToDB(products);
            updateProductCount();
            updateStats();
            showToast(`Đã đồng bộ ${newProducts.length} sản phẩm!`);
        } else {
            throw new Error("Không tìm thấy dữ liệu SKU hợp lệ trong file");
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast("Lỗi đồng bộ: " + error.message, "warning");
        const statTotalSku = document.getElementById('statTotalSku');
        if (statTotalSku) statTotalSku.textContent = products.length.toLocaleString('vi-VN');
    } finally {
        btnSync.classList.remove('animate-spin');
    }
}

function updateStats() {
    const statTotalSku = document.getElementById('statTotalSku');
    const statCounted = document.getElementById('statCounted');
    const statTotalQty = document.getElementById('statTotalQty');
    const statDiscrepancy = document.getElementById('statDiscrepancy');

    if (statTotalSku) {
        statTotalSku.textContent = (window.wmsTotalCount || products.length).toLocaleString('vi-VN');
    }
    
    if (inventory.length === 0) {
        if (statCounted) statCounted.textContent = "0";
        if (statTotalQty) statTotalQty.textContent = "0";
        if (statDiscrepancy) statDiscrepancy.textContent = "0";
        return;
    }

    const uniqueSkus = new Set(inventory.map(item => item.sku));
    const totalQty = inventory.reduce((sum, item) => sum + item.qty, 0);
    const discrepancies = inventory.filter(item => (item.qty - item.systemQty) !== 0).length;

    if (statCounted) statCounted.textContent = uniqueSkus.size;
    if (statTotalQty) statTotalQty.textContent = totalQty;
    if (statDiscrepancy) statDiscrepancy.textContent = discrepancies;
}

function updateProductCount() {
    const badge = document.getElementById('productCountBadge');
    if (badge) {
        badge.textContent = `Dữ liệu: ${products.length} sản phẩm`;
    }
}

function setupEventListeners() {
    updateProductCount();
    const importModal = document.getElementById('importModal');
    document.getElementById('btnOpenImport').addEventListener('click', () => importModal.classList.replace('hidden', 'flex'));
    document.getElementById('btnCloseImport').addEventListener('click', () => importModal.classList.replace('flex', 'hidden'));
    document.getElementById('btnProcessImport').addEventListener('click', handleManualImport);
    skuSearch.addEventListener('input', handleSearch);
    document.addEventListener('click', (e) => {
        if (!skuSearch.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.add('hidden');
        }
    });
    document.getElementById('btnAddLot').addEventListener('click', () => handleAddInventory(null, false));
    countForm.addEventListener('submit', (e) => handleAddInventory(e, true));
    btnSync.addEventListener('click', fetchAllData);
    document.getElementById('btnCopy').addEventListener('click', copyToClipboard);
    document.getElementById('btnExport').addEventListener('click', exportToCSV);
    document.getElementById('btnClear').addEventListener('click', clearInventory);

    // Settings Modal logic
    const settingsModal = document.getElementById('settingsModal');
    document.getElementById('btnOpenSettings').addEventListener('click', () => {
        settingsModal.classList.replace('hidden', 'flex');
        // Pre-fill with current tokens if stored in localStorage
        document.getElementById('sidInput').value = localStorage.getItem('wms_sid') || '';
        document.getElementById('tokenInput').value = localStorage.getItem('wms_token') || '';
    });
    document.getElementById('btnCloseSettings').addEventListener('click', () => settingsModal.classList.replace('flex', 'hidden'));
    document.getElementById('btnSaveSettings').addEventListener('click', handleSaveTokens);
}

async function handleSaveTokens() {
    const sid = document.getElementById('sidInput').value.trim();
    const token = document.getElementById('tokenInput').value.trim();

    if (!sid || !token) {
        showToast("Vui lòng nhập đầy đủ SID và Token!", "warning");
        return;
    }

    try {
        const response = await fetch(UPDATE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid, token })
        });

        if (response.ok) {
            localStorage.setItem('wms_sid', sid);
            localStorage.setItem('wms_token', token);
            showToast("Đã cập nhật Token thành công!");
            document.getElementById('settingsModal').classList.replace('flex', 'hidden');
        } else {
            throw new Error("Proxy không phản hồi đúng.");
        }
    } catch (e) {
        showToast("Lỗi khi cập nhật Token: " + e.message, "warning");
    }
}

async function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 1) {
        suggestions.classList.add('hidden');
        return;
    }

    const filtered = await searchProductsInDB(query);
    
    if (filtered.length > 0) {
        suggestions.innerHTML = filtered.map(p => `
            <div class="suggestion-item" onclick="window.selectProduct('${p.sku}')">
                <img src="${getProxiedImageUrl(p.image) || 'https://via.placeholder.com/44x44?text=SP'}" class="suggestion-img" onerror="this.src='https://via.placeholder.com/44x44?text=SP'">
                <div class="flex-grow min-w-0">
                    <div class="font-bold text-slate-800 text-sm truncate">${p.name}</div>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] font-mono text-slate-400">${p.sku}</span>
                        ${p.group ? `<span class="badge badge-indigo py-0 px-1.5 text-[8px] rounded">${p.group}</span>` : ''}
                    </div>
                </div>
                <div class="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 uppercase">${p.location || 'N/A'}</div>
            </div>
        `).join('');
        suggestions.classList.remove('hidden');
    } else {
        suggestions.classList.add('hidden');
    }
}

window.selectProduct = async (sku) => {
    selectedProduct = products.find(p => p.sku === sku);
    if (!selectedProduct) return;
    
    // UI Update (Initial)
    document.getElementById('pName').textContent = selectedProduct.name;
    document.getElementById('pSku').textContent = `SKU: ${selectedProduct.sku}`;
    document.getElementById('pSysQty').textContent = selectedProduct.systemQty;
    document.getElementById('pUnit').textContent = selectedProduct.unit;
    document.getElementById('pLastLot').textContent = selectedProduct.lastLot || '-';
    
    const entryContainer = document.getElementById('entryContainer');
    if (entryContainer) entryContainer.classList.remove('hidden');
    
    suggestions.classList.add('hidden');
    skuSearch.value = selectedProduct.sku;
    setTimeout(() => document.getElementById('lotInput').focus(), 100);

    // Clear previous table data
    document.getElementById('locationTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">Đang tải...</td></tr>';
    document.getElementById('lotTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">Đang tải...</td></tr>';

    // Fetch live system quantity from Detail API
    try {
        console.log(`Fetching live data for SKU: ${sku}...`);
        const response = await fetch(`${DETAIL_PROXY_URL}?sku=${sku}`);
        if (response.ok) {
            const result = await response.json();
            console.log("Full Detail API Response:", result);
            const detail = result.data;
            if (detail) {
                // Priority: stockQuantity (Tồn vật lý) > physicalQuantity > totalQuantity
                const liveQty = detail.stockQuantity || detail.physicalQuantity || detail.totalQuantity || detail.quantity || 0;
                console.log(`Live System Qty (Stock) for ${sku}: ${liveQty}`);
                
                selectedProduct.systemQty = liveQty;
                
                // Update Badges
                const availableQty = detail.availableQuantity || 0;
                const onHoldQty = detail.onHoldQuantity || 0;
                
                // 1. Phân loại (Nhóm) - Lấy từ API hoặc fallback về dữ liệu Sheet
                const groupValue = detail.categoryName || detail.group || selectedProduct.group || '';
                const groupText = groupValue ? (groupValue.toString().startsWith('Nhóm') ? groupValue : `Nhóm ${groupValue}`) : '';
                
                // 2. Loại sản phẩm (Thuốc / Không phải thuốc)
                const detailStr = JSON.stringify(detail);
                const isMedicine = detailStr.includes('Thuốc') || detailStr.includes('DRUG') || detailStr.includes('THUOC') || selectedProduct.name.toLowerCase().includes('thuốc');

                selectedProduct.classification = isMedicine ? 'Thuốc' : 'Khác';
                selectedProduct.group = groupValue || selectedProduct.group;
                
                // --- Image Detection & Normalization ---
                let apiImage = '';
                if (detail.imageUrl) apiImage = detail.imageUrl;
                else if (detail.image) apiImage = detail.image;
                else if (detail.imageUrls && detail.imageUrls.length > 0) apiImage = detail.imageUrls[0];
                else if (detail.images && detail.images.length > 0) {
                    apiImage = typeof detail.images[0] === 'string' ? detail.images[0] : (detail.images[0].url || detail.images[0].imageUrl || '');
                }

                // If still no image, try building from productId
                if (!apiImage && detail.productId) {
                    apiImage = `https://storage.googleapis.com/buy-med/production/product/${detail.productId}.jpg`;
                }

                // Normalize relative URLs
                if (apiImage && apiImage.startsWith('/')) {
                    apiImage = 'https://cdn.thuocsi.vn' + apiImage;
                }
                if (apiImage && !apiImage.startsWith('http')) {
                    apiImage = 'https://cdn.thuocsi.vn/product/' + apiImage;
                }

                selectedProduct.image = apiImage || selectedProduct.image || '';
                const proxiedUrl = getProxiedImageUrl(selectedProduct.image);
                console.log(`Final Proxied Image URL:`, proxiedUrl);

                // --- Update UI ---
                document.getElementById('pName').textContent = selectedProduct.name;
                const pSku = document.getElementById('pSku');
                pSku.innerHTML = `SKU: ${selectedProduct.sku} ${groupText ? `<span class="badge badge-indigo rounded-full ml-3 py-1 px-4 text-[10px] font-bold shadow-sm">${groupText}</span>` : ''}`;

                const typeBadge = document.getElementById('pTypeBadge');
                if (typeBadge) {
                    typeBadge.textContent = isMedicine ? 'Thuốc' : 'Khác';
                    typeBadge.className = `badge ${isMedicine ? 'badge-orange' : 'badge-slate'} text-[10px] font-bold`;
                    typeBadge.classList.remove('hidden');
                }

                // Image handling
                const pImg = document.getElementById('pMainImage');
                const pImgCont = document.getElementById('pImageContainer');
                if (pImg && pImgCont) {
                    pImg.onerror = function() { pImgCont.classList.add('hidden'); };
                    if (proxiedUrl) {
                        pImg.src = proxiedUrl;
                        pImgCont.classList.remove('hidden');
                    } else {
                        pImgCont.classList.add('hidden');
                    }
                }

                document.getElementById('pSysQty').textContent = liveQty.toLocaleString('vi-VN');
                document.getElementById('pUnit').textContent = selectedProduct.unit;
                document.getElementById('pLastLot').textContent = selectedProduct.lastLot || '-';

                document.getElementById('pAvailableQty').textContent = availableQty.toLocaleString('vi-VN');
                document.getElementById('pHoldQty').textContent = onHoldQty.toLocaleString('vi-VN');

                // Render Locations Table
                const locations = result.skuLocations || [];
                document.getElementById('pShelfCount').textContent = locations.length;
                document.getElementById('pLocationCount').textContent = `${locations.length} vị trí`;
                
                const locBody = document.getElementById('locationTableBody');
                if (locations.length > 0) {
                    locBody.innerHTML = locations.map(loc => `
                        <tr>
                            <td class="px-4 py-2 font-bold text-emerald-600">${loc.locationCode}</td>
                            <td class="px-4 py-2 text-right font-bold">${(loc.stockQuantity || 0).toLocaleString('vi-VN')}</td>
                            <td class="px-4 py-2 text-right text-emerald-500">${(loc.availableQuantity || 0).toLocaleString('vi-VN')}</td>
                            <td class="px-4 py-2 text-right text-amber-500">${(loc.onHoldQuantity || 0).toLocaleString('vi-VN')}</td>
                        </tr>
                    `).join('');

                    // Show primary location badge
                    const primaryLoc = locations.find(l => l.type === 'MAPPING') || locations[0];
                    if (primaryLoc) {
                        const locBadge = document.getElementById('pLocationBadge');
                        if (locBadge) {
                            locBadge.textContent = primaryLoc.locationCode;
                            locBadge.classList.remove('hidden');
                        }
                    }
                } else {
                    locBody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 italic">Không có vị trí kệ</td></tr>';
                }

                // Render Lots Table
                const lots = result.skuLotDate || [];
                const lotBody = document.getElementById('lotTableBody');
                if (lots.length > 0) {
                    lotBody.innerHTML = lots.map(lot => `
                        <tr>
                            <td class="px-4 py-2 font-bold">${lot.lot}</td>
                            <td class="px-4 py-2 text-emerald-600">${lot.expiredDate || '-'}</td>
                            <td class="px-4 py-2 text-right">${(lot.inQuantity || 0).toLocaleString('vi-VN')}</td>
                            <td class="px-4 py-2 text-right text-emerald-500">${(lot.availableQuantity || 0).toLocaleString('vi-VN')}</td>
                        </tr>
                    `).join('');
                } else {
                    lotBody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 italic">Không có dữ liệu Lot</td></tr>';
                }

                // Fetch Move data
                try {
                    const moveResponse = await fetch(`${MOVE_PROXY_URL}?sku=${sku}`);
                    if (moveResponse.ok) {
                        const moveResult = await moveResponse.json();
                        const moveLots = moveResult.data || [];
                        if (moveLots.length > 0) {
                            lotBody.innerHTML = moveLots.map(lot => `
                                <tr>
                                    <td class="px-4 py-2 font-bold">${lot.lot}</td>
                                    <td class="px-4 py-2 text-emerald-600">${lot.expiredDate || '-'}</td>
                                    <td class="px-4 py-2 text-right">${(lot.inQuantity || 0).toLocaleString('vi-VN')}</td>
                                    <td class="px-4 py-2 text-right text-emerald-500">${(lot.availableQuantity || 0).toLocaleString('vi-VN')}</td>
                                </tr>
                            `).join('');
                        }
                    }
                } catch (err) {
                    console.warn("Could not fetch move data:", err);
                }
            } else {
                console.warn("Detail data is empty/null.");
                document.getElementById('locationTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-red-500 italic">Lỗi: Token hết hạn hoặc không có quyền truy cập</td></tr>';
                document.getElementById('lotTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-red-500 italic">Lỗi: Token hết hạn hoặc không có quyền truy cập</td></tr>';
            }
        } else {
            console.warn(`Detail API returned status: ${response.status}`);
            document.getElementById('locationTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-red-500 italic">Lỗi kết nối API chi tiết</td></tr>';
            document.getElementById('lotTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-red-500 italic">Lỗi kết nối API chi tiết</td></tr>';
        }
    } catch (e) {
        console.warn("Could not fetch live system quantity:", e);
        document.getElementById('locationTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-red-500 italic">Lỗi hệ thống khi tải dữ liệu</td></tr>';
        document.getElementById('lotTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-red-500 italic">Lỗi hệ thống khi tải dữ liệu</td></tr>';
    }
};

function handleAddInventory(e, finishSKU = true) {
    if (e) e.preventDefault();
    if (!selectedProduct) return;

    const lotInput = document.getElementById('lotInput');
    const dateInput = document.getElementById('dateInput');
    const qtyInput = document.getElementById('qtyInput');
    const noteInput = document.getElementById('noteInput');

    // Basic validation for manual click
    if (!lotInput.value || !dateInput.value || !qtyInput.value) {
        countForm.reportValidity();
        return;
    }

    const lot = lotInput.value.toUpperCase();
    const date = dateInput.value;
    const qty = parseInt(qtyInput.value);
    const note = noteInput.value;

    const newItem = {
        id: Date.now(),
        sku: selectedProduct.sku,
        name: selectedProduct.name,
        unit: selectedProduct.unit,
        group: selectedProduct.group,
        classification: selectedProduct.classification,
        image: selectedProduct.image,
        location: selectedProduct.location,
        systemQty: selectedProduct.systemQty,
        lot,
        date,
        qty,
        note,
        timestamp: new Date().toLocaleString('vi-VN')
    };

    inventory.unshift(newItem);
    saveInventory();
    renderInventory();
    showToast("Đã thêm vào danh sách!");

    if (finishSKU) {
        countForm.reset();
        const entryContainer = document.getElementById('entryContainer');
        if (entryContainer) entryContainer.classList.add('hidden');
        skuSearch.value = '';
        skuSearch.focus();
    } else {
        // Keep SKU, clear only lot/date/qty/note
        lotInput.value = '';
        dateInput.value = '';
        qtyInput.value = '';
        noteInput.value = '';
        lotInput.focus();
    }
    updateStats();
}

function deleteItem(id) {
    inventory = inventory.filter(item => item.id !== id);
    saveInventory();
    renderInventory();
}
window.deleteItem = deleteItem;

function saveInventory() {
    localStorage.setItem('wms_inventory', JSON.stringify(inventory));
}

function renderInventory() {
    if (inventory.length === 0) {
        emptyState.classList.remove('hidden');
        inventoryList.innerHTML = '';
        return;
    }
    emptyState.classList.add('hidden');

    // Group items by SKU
    const groups = new Map();
    inventory.forEach(item => {
        if (!groups.has(item.sku)) groups.set(item.sku, []);
        groups.get(item.sku).push(item);
    });

    let html = '';
    groups.forEach((items, sku) => {
        const rowSpan = items.length;
        const firstItem = items[0];
        const pInfo = products.find(p => p.sku === sku) || { name: sku, image: '' };
        const isMed = (pInfo.classification || '').toLowerCase().includes('thuốc') || pInfo.name.toLowerCase().includes('thuốc');
        const groupLabel = pInfo.group || '';

        items.forEach((item, index) => {
            const diff = item.qty - item.systemQty;
            let badgeClass = 'badge-success';
            let diffText = 'Khớp';
            
            if (diff > 0) {
                badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
                diffText = `+${diff}`;
            } else if (diff < 0) {
                badgeClass = 'badge-danger';
                diffText = `${diff}`;
            }

            html += `
                <tr class="group transition-all hover:bg-slate-50/50">
                    ${index === 0 ? `
                        <td class="py-6 px-4 product-group-cell align-top" rowspan="${rowSpan}" style="width: 38%;">
                            <div class="sticky">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="w-1.5 h-5 bg-indigo-500 rounded-full"></span>
                                    <h4 class="text-slate-900 font-bold text-sm leading-tight">${item.name}</h4>
                                </div>
                                <div class="flex items-center gap-2 mb-3">
                                    <span class="text-[10px] font-mono text-slate-400 uppercase">${item.sku}</span>
                                    <span class="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">${rowSpan} LOT</span>
                                </div>
                                <div class="flex flex-wrap items-center gap-2 mb-4">
                                    ${groupLabel ? `<span class="badge badge-indigo text-[9px] uppercase">${groupLabel.startsWith('Nhóm') ? groupLabel : 'Nhóm ' + groupLabel}</span>` : ''}
                                    <span class="badge ${isMed ? 'badge-orange' : 'badge-slate'} text-[9px] uppercase">
                                        ${ isMed ? 'Thuốc' : 'Không phải thuốc'}
                                    </span>
                                </div>
                                    <div class="mt-2 inline-block p-1 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <img src="${getProxiedImageUrl(item.image)}" onerror="this.parentElement.style.display='none'" class="w-16 h-16 object-contain">
                                    </div>
                            </div>
                        </td>
                    ` : ''}
                    <td class="py-5 pl-6 border-b border-slate-50">
                        <span class="lot-text text-sm">${item.lot}</span>
                    </td>
                    <td class="py-5 border-b border-slate-50">
                        <span class="text-slate-500 text-xs font-medium">${formatDate(item.date)}</span>
                    </td>
                    <td class="py-5 text-center border-b border-slate-50">
                        <span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100/50">
                            ${item.location || '-'}
                        </span>
                    </td>
                    <td class="py-5 text-center border-b border-slate-50">
                        <span class="text-lg font-bold text-slate-800">${item.qty.toLocaleString('vi-VN')}</span>
                    </td>
                    <td class="py-5 text-center border-b border-slate-50">
                        <span class="badge ${badgeClass} shadow-sm inline-block min-w-[4rem] py-2">${diffText}</span>
                    </td>
                    <td class="py-5 text-right pr-4 border-b border-slate-50">
                        <button onclick="window.deleteItem(${item.id})" class="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    inventoryList.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateStats();
}

function clearInventory() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ danh sách kiểm kê?")) {
        inventory = [];
        saveInventory();
        renderInventory();
        showToast("Đã xóa toàn bộ!", "warning");
    }
}

function handleManualImport() {
    const data = document.getElementById('importArea').value.trim();
    if (!data) return;
    try {
        const allRows = data.split('\n').filter(r => r.trim());
        if (allRows.length === 0) return;
        const firstRow = allRows[0].split(/\t|,/).map(c => c.toUpperCase());
        const isHeader = firstRow.some(h => h.includes('SKU') || h.includes('TÊN'));
        const idx = {
            sku: firstRow.findIndex(h => h.includes('SKU')),
            name: firstRow.findIndex(h => h.includes('TÊN') || h.includes('NAME') || h.includes('SANPHAM')),
            location: firstRow.findIndex(h => h.includes('VỊ TRÍ') || h.includes('LOCATION') || h.includes('VITRI')),
            qty: firstRow.findIndex(h => h.includes('TỒN') || h.includes('QTY')),
            lot: firstRow.findIndex(h => h.includes('LOT')),
            date: firstRow.findIndex(h => h.includes('DATE') || h.includes('HẠN'))
        };
        if (idx.sku === -1) idx.sku = 2;
        if (idx.name === -1) idx.name = 3;
        if (idx.location === -1) idx.location = 4;
        if (idx.qty === -1) idx.qty = 5;
        const dataRows = isHeader ? allRows.slice(1) : allRows;
        const newProducts = dataRows.map(row => {
            const cols = row.split(/\t|,/);
            return {
                sku: cols[idx.sku]?.trim() || '',
                name: cols[idx.name]?.trim() || '',
                location: cols[idx.location]?.trim() || '',
                lastLot: idx.lot !== -1 ? cols[idx.lot]?.trim() : '',
                lastDate: idx.date !== -1 ? cols[idx.date]?.trim() : '',
                systemQty: parseInt(cols[idx.qty]) || 0,
                unit: "Cái"
            };
        }).filter(p => p.sku);
        if (newProducts.length > 0) {
            products = newProducts;
            localStorage.setItem('wms_products', JSON.stringify(products));
            updateProductCount();
            showToast(`Đã nhập thành công ${products.length} sản phẩm!`);
            document.getElementById('importModal').classList.replace('flex', 'hidden');
            document.getElementById('importArea').value = '';
        } else {
            showToast("Dữ liệu không đúng định dạng!", "warning");
        }
    } catch (e) {
        console.error(e);
        showToast("Có lỗi khi xử lý dữ liệu!", "warning");
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    return dateStr;
}

function copyToClipboard() {
    if (inventory.length === 0) return;
    const headers = "Ngày\tSKU\tTên SP\tLot\tDate\tSL Thực\tSL Hệ Thống\tGhi Chú\n";
    const rows = inventory.map(item => 
        `${item.timestamp}\t${item.sku}\t${item.name}\t${item.lot}\t${item.date}\t${item.qty}\t${item.systemQty}\t${item.note || ''}`
    ).join('\n');
    navigator.clipboard.writeText(headers + rows).then(() => {
        showToast("Đã copy dữ liệu vào Clipboard!");
    });
}

function exportToCSV() {
    if (inventory.length === 0) return;
    const headers = "Ngay,SKU,Ten SP,Lot,Date,SL Thuc,SL He Thong,Ghi Chu\n";
    const csvContent = inventory.map(item => 
        `"${item.timestamp}","${item.sku}","${item.name}","${item.lot}","${item.date}",${item.qty},${item.systemQty},"${item.note || ''}"`
    ).join('\n');
    const blob = new Blob(["\ufeff" + headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `kiem_ke_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất file CSV!");
}

function showToast(msg, type = "success") {
    if (!toastMsg) return;
    toastMsg.textContent = msg;
    const iconBox = document.getElementById('toastIconBox');
    const icon = iconBox ? iconBox.querySelector('i') : null;
    
    if (icon && iconBox) {
        if (type === "warning") {
            icon.setAttribute('data-lucide', 'alert-circle');
            iconBox.className = 'p-1.5 bg-amber-50 rounded-lg text-amber-600';
        } else {
            icon.setAttribute('data-lucide', 'check-circle');
            iconBox.className = 'p-1.5 bg-emerald-50 rounded-lg text-emerald-600';
        }
    }
    
    try {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {}

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Global helper for hard reset
window.hardReset = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và tải lại từ đầu không?")) {
        localStorage.clear();
        location.reload();
    }
};

window.toggleSection = (id, iconId) => {
    const content = document.getElementById(id);
    const icon = document.getElementById(iconId);
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.setAttribute('data-lucide', 'eye');
    } else {
        content.classList.add('hidden');
        icon.setAttribute('data-lucide', 'eye-off');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

console.log("Script.js ready to init");
init();
