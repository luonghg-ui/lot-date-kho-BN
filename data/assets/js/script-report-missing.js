// ============================================================
// WMS REPORT MISSING CONTROLLER
// ============================================================

const SHEET_ID = '1Xhtmq2Y_YVC3qrd2y1RrONmuUxssHoN6vAJjOWFgHrA';
const GID = '0';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${GID}`;

// DOM Elements
const statTotalSkus = document.getElementById('statTotalSkus');
const statTotalMoney = document.getElementById('statTotalMoney');
const statPeakDate = document.getElementById('statPeakDate');
const statPeakDateDesc = document.getElementById('statPeakDateDesc');
const statPeakShift = document.getElementById('statPeakShift');
const statPeakShiftDesc = document.getElementById('statPeakShiftDesc');
const refreshBtn = document.getElementById('refreshBtn');
const topProductsList = document.getElementById('topProductsList');
const statusBanner = document.getElementById('statusBanner');

// Charts references
let dailyChart = null;
let shiftChart = null;

// Raw Data Cache
let reportData = [];
let chartMode = 'qty'; // 'qty' or 'amt'

window.setChartMode = function(mode) {
    chartMode = mode;
    const btnQty = document.getElementById('btnChartModeQty');
    const btnAmt = document.getElementById('btnChartModeAmt');
    if (btnQty && btnAmt) {
        if (mode === 'qty') {
            btnQty.style.background = '#6366f1';
            btnQty.style.color = '#fff';
            btnAmt.style.background = 'transparent';
            btnAmt.style.color = '#94a3b8';
        } else {
            btnAmt.style.background = '#6366f1';
            btnAmt.style.color = '#fff';
            btnQty.style.background = 'transparent';
            btnQty.style.color = '#94a3b8';
        }
    }
    processAggregations();
};

// Theme sync
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        setTimeout(initChartsTheme, 100);
    });
}

function init() {
    fetchReportData();
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchReportData);
    }
    
    // Close Daily Detail Modal
    const overlay = document.getElementById('dailyDetailModalOverlay');
    const closeBtn = document.getElementById('dailyDetailModalCloseBtn');
    if (closeBtn && overlay) {
        closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    }
}

// Helpers
function getProxyUrl() {
    return localStorage.getItem('wms_proxy_url') || 'http://localhost:8081';
}

function getShiftFromTime(timeStr) {
    if (!timeStr) return 'Khác';
    
    // matches e.g. "14/07/2026 4:47:00 AM" or "13/07/2026 11:58:11 PM"
    const timeMatch = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return 'Khác';
    
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    const ampm = timeMatch[4].toUpperCase();
    
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    // Ca 1: 06:00:00 - 13:59:59 (360 - 839 minutes)
    // Ca 2: 14:00:00 - 21:59:59 (840 - 1319 minutes)
    // Ca 3: 22:00:00 - 05:59:59 (1320 - 359 minutes)
    const totalMinutes = hour * 60 + minute;
    if (totalMinutes >= 360 && totalMinutes < 840) {
        return 'Ca 1';
    } else if (totalMinutes >= 840 && totalMinutes < 1320) {
        return 'Ca 2';
    } else {
        return 'Ca 3';
    }
}

function getDateFromTimestamp(timeStr) {
    if (!timeStr) return 'Không rõ';
    const parts = timeStr.split(' ');
    return parts[0] || 'Không rõ';
}

function formatCurrency(val) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

// Fetching
function fetchReportData() {
    if (statusBanner) statusBanner.style.display = 'block';
    
    // Clear old script tags
    const oldScripts = document.querySelectorAll('script[data-type="jsonp-report"]');
    oldScripts.forEach(s => s.remove());

    const ts = Date.now();
    const cbName = 'pa_report_' + ts;
    
    window[cbName] = function(json) {
        if (statusBanner) statusBanner.style.display = 'none';
        parseGVizData(json);
    };

    const script = document.createElement('script');
    script.setAttribute('data-type', 'jsonp-report');
    script.src = `${GVIZ_URL}&tqx=out:json;responseHandler:${cbName}`;
    document.body.appendChild(script);
}

function parseGVizData(json) {
    try {
        if (!json || !json.table || !json.table.rows) throw new Error('Dữ liệu trống hoặc lỗi cấu trúc.');
        
        const headers = json.table.cols.map(c => c ? (c.label || '').trim().toLowerCase() : '');
        const rows = json.table.rows;
        
        // Find indexes
        const idx = {
            sku: headers.indexOf('sku_code'),
            name: headers.indexOf('product_name'),
            qty: headers.indexOf('.qty_moving'),
            amt: headers.indexOf('.amt_moving'),
            date: headers.indexOf('ngày'),
            price: headers.indexOf('price_unit')
        };
        
        // Fallbacks if header mapping fails
        if (idx.sku === -1) idx.sku = 13;
        if (idx.name === -1) idx.name = 15;
        if (idx.qty === -1) idx.qty = 17;
        if (idx.amt === -1) idx.amt = 18;
        if (idx.date === -1) idx.date = 20;
        if (idx.price === -1) idx.price = 16;

        const getSafeStr = (cell) => {
            if (!cell || cell.v === null || cell.v === undefined) return '';
            return cell.v.toString().trim();
        };

        const getSafeNum = (cell) => {
            if (!cell || cell.v === null || cell.v === undefined) return 0;
            const parsed = parseFloat(cell.v);
            return isNaN(parsed) ? 0 : parsed;
        };

        reportData = rows.map(r => {
            if (!r.c) return null;
            return {
                sku: getSafeStr(r.c[idx.sku]),
                name: getSafeStr(r.c[idx.name]),
                qty: Math.abs(getSafeNum(r.c[idx.qty])), // make it absolute for stats
                amt: Math.abs(getSafeNum(r.c[idx.amt])),
                timestamp: getSafeStr(r.c[idx.date]),
                price: getSafeNum(r.c[idx.price])
            };
        }).filter(item => item && item.sku);

        processAggregations();

    } catch (e) {
        console.error("Parse GViz Error:", e);
        if (topProductsList) {
            topProductsList.innerHTML = `<div style="color:#f87171; text-align:center; padding:20px;">Lỗi tải dữ liệu: ${e.message}</div>`;
        }
    }
}

function processAggregations() {
    // 1. Calculations
    const dailyMap = {}; // date -> qty or amt
    const shiftMap = { 'Ca 1': 0, 'Ca 2': 0, 'Ca 3': 0, 'Khác': 0 };
    const productMap = {}; // sku -> { name, qty, amt, price }
    let totalSkusSet = new Set();
    let totalMoney = 0;
    
    reportData.forEach(item => {
        const date = getDateFromTimestamp(item.timestamp);
        const shift = getShiftFromTime(item.timestamp);
        
        // Accumulate daily (depending on Qty or Amt chart mode)
        dailyMap[date] = (dailyMap[date] || 0) + (chartMode === 'qty' ? item.qty : item.amt);
        
        // Accumulate shifts (depending on Qty or Amt chart mode)
        shiftMap[shift] = (shiftMap[shift] || 0) + (chartMode === 'qty' ? item.qty : item.amt);
        
        // Accumulate products
        if (!productMap[item.sku]) {
            productMap[item.sku] = { name: item.name, qty: 0, amt: 0, price: item.price };
        }
        productMap[item.sku].qty += item.qty;
        productMap[item.sku].amt += item.amt;
        
        totalSkusSet.add(item.sku);
        totalMoney += item.amt;
    });

    // 2. Update Bento Stats
    statTotalSkus.textContent = totalSkusSet.size.toLocaleString('vi-VN');
    statTotalMoney.textContent = formatCurrency(totalMoney);
    
    // Day peak (always based on selected chartMode for consistency)
    let peakDate = '-';
    let peakDateVal = 0;
    Object.keys(dailyMap).forEach(d => {
        if (dailyMap[d] > peakDateVal) {
            peakDateVal = dailyMap[d];
            peakDate = d;
        }
    });
    statPeakDate.textContent = peakDate;
    statPeakDateDesc.textContent = chartMode === 'qty' 
        ? `Lệch lớn nhất: ${peakDateVal.toLocaleString('vi-VN')} SP`
        : `Thất thoát lớn nhất: ${formatCurrency(peakDateVal)}`;
    
    // Shift peak
    let peakShift = '-';
    let peakShiftVal = 0;
    Object.keys(shiftMap).forEach(s => {
        if (s !== 'Khác' && shiftMap[s] > peakShiftVal) {
            peakShiftVal = shiftMap[s];
            peakShift = s;
        }
    });
    statPeakShift.textContent = peakShift;
    const totalShiftQty = Object.values(shiftMap).reduce((a,b) => a+b, 0) || 1;
    const shiftPercent = ((peakShiftVal / totalShiftQty) * 100).toFixed(1);
    statPeakShiftDesc.textContent = `Chiếm ${shiftPercent}% tổng ${chartMode === 'qty' ? 'số lượng' : 'giá trị'} missing`;

    const shiftUnitLabel = document.getElementById('shiftUnitLabel');
    if (shiftUnitLabel) {
        shiftUnitLabel.textContent = chartMode === 'qty' ? 'Theo lượng chênh lệch' : 'Theo giá trị chênh lệch';
    }

    // 3. Render Top Products List
    renderTopProducts(productMap);

    // 4. Update Charts
    updateCharts(dailyMap, shiftMap);
}

function renderTopProducts(productMap) {
    const sorted = Object.keys(productMap).map(sku => ({
        sku: sku,
        name: productMap[sku].name,
        qty: productMap[sku].qty,
        amt: productMap[sku].amt,
        price: productMap[sku].price
    })).sort((a, b) => b.qty - a.qty).slice(0, 10);
    
    if (sorted.length === 0) {
        topProductsList.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-dim);">Không có sản phẩm nào chênh lệch</div>`;
        return;
    }

    const maxQty = sorted[0].qty || 1;
    
    topProductsList.innerHTML = sorted.map((item, idx) => {
        const percent = ((item.qty / maxQty) * 100).toFixed(0);
        const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : 'rank-other'));
        return `
            <div class="top-item">
                <div class="top-rank ${rankClass}">${idx + 1}</div>
                <div class="top-info">
                    <div class="top-name" title="${item.name}">${item.name}</div>
                    <div style="font-size:11px; color:var(--text-dim); margin-bottom:4px;">
                        SKU: ${item.sku} &nbsp;•&nbsp; 
                        Đơn giá: ${item.price > 0 ? formatCurrency(item.price) : 'Chưa rõ'}
                    </div>
                    <div class="top-progress-bar">
                        <div class="top-progress-fill" style="width: ${percent}%;"></div>
                    </div>
                </div>
                <div class="top-val-box">
                    <div class="top-val-qty">${item.qty.toLocaleString('vi-VN')} SP</div>
                    <div class="top-val-money">${formatCurrency(item.amt)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateCharts(dailyMap, shiftMap) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const isAmt = chartMode === 'amt';

    // A. Daily Chart
    const dailyLabels = Object.keys(dailyMap).sort((a,b) => {
        const parseD = s => {
            const p = s.split('/');
            return new Date(p[2], p[1]-1, p[0]);
        };
        return parseD(a) - parseD(b);
    });
    const dailyValues = dailyLabels.map(l => dailyMap[l]);

    if (dailyChart) dailyChart.destroy();
    
    const ctxDaily = document.getElementById('dailyChart').getContext('2d');
    dailyChart = new Chart(ctxDaily, {
        type: 'bar',
        data: {
            labels: dailyLabels,
            datasets: [{
                label: isAmt ? 'Giá trị chênh lệch (đ)' : 'Số lượng chênh lệch (SP)',
                data: dailyValues,
                backgroundColor: isAmt ? 'rgba(168, 85, 247, 0.45)' : 'rgba(99, 102, 241, 0.45)',
                borderColor: isAmt ? '#a855f7' : '#6366f1',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: isAmt ? '#c084fc' : '#818cf8'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, activeEls) => {
                if (activeEls && activeEls.length > 0) {
                    const firstEl = activeEls[0];
                    const index = firstEl.index;
                    const dateStr = dailyLabels[index];
                    if (typeof showDailyDetailModal === 'function') {
                        showDailyDetailModal(dateStr);
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { 
                            return isAmt 
                                ? ` Giá trị lệch: ${formatCurrency(context.raw)}`
                                : ` Số lượng lệch: ${context.raw.toLocaleString('vi-VN')} SP`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                },
                y: {
                    ticks: { 
                        color: textColor,
                        callback: function(value) {
                            return isAmt ? (value >= 1e6 ? (value/1e6)+'M đ' : value.toLocaleString('vi-VN')) : value;
                        }
                    },
                    grid: { color: gridColor }
                }
            }
        }
    });

    // B. Shift Chart
    const shiftLabels = ['Ca 1 (06h - 14h)', 'Ca 2 (14h - 22h)', 'Ca 3 (22h - 06h)'];
    const shiftValues = [shiftMap['Ca 1'] || 0, shiftMap['Ca 2'] || 0, shiftMap['Ca 3'] || 0];

    if (shiftChart) shiftChart.destroy();
    
    const ctxShift = document.getElementById('shiftChart').getContext('2d');
    shiftChart = new Chart(ctxShift, {
        type: 'doughnut',
        data: {
            labels: shiftLabels,
            datasets: [{
                data: shiftValues,
                backgroundColor: [
                    'rgba(245, 158, 11, 0.75)',  // amber/yellow for day
                    'rgba(99, 102, 241, 0.75)',  // indigo for evening
                    'rgba(239, 68, 68, 0.75)'    // red for night
                ],
                borderColor: isDark ? '#0f172a' : '#fff',
                borderWidth: 3,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, padding: 16, font: { size: 12, weight: 600 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const total = context.dataset.data.reduce((a,b)=>a+b,0) || 1;
                            const pct = ((val / total) * 100).toFixed(1);
                            return isAmt 
                                ? ` ${context.label}: ${formatCurrency(val)} (${pct}%)`
                                : ` ${context.label}: ${val.toLocaleString('vi-VN')} SP (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '68%'
        }
    });
}

function initChartsTheme() {
    if (dailyChart || shiftChart) {
        processAggregations();
    }
}

window.showDailyDetailModal = function(dateStr) {
    const overlay = document.getElementById('dailyDetailModalOverlay');
    const title = document.getElementById('selectedDateTitle');
    const summary = document.getElementById('selectedDateSummary');
    const tbody = document.getElementById('dailyDetailTableBody');
    if (!overlay || !tbody) return;

    // Filter reportData
    const items = reportData.filter(item => getDateFromTimestamp(item.timestamp) === dateStr);
    
    // Sort by qty desc
    items.sort((a, b) => b.qty - a.qty);

    title.textContent = dateStr;
    
    let totalQty = 0;
    let totalAmt = 0;
    
    tbody.innerHTML = items.map(item => {
        totalQty += item.qty;
        totalAmt += item.amt;
        return `
            <tr style="border-bottom: 1px solid var(--white-alpha-5); transition: background 0.2s;">
                <td style="padding: 12px 16px; font-family: monospace; font-size: 11px; color: #94a3b8; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.sku}</td>
                <td style="padding: 12px 16px; font-size: 13px; color: #e2e8f0; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</td>
                <td style="padding: 12px 16px; font-size: 13px; color: #94a3b8; text-align: right;">${item.price > 0 ? formatCurrency(item.price) : 'Chưa rõ'}</td>
                <td style="padding: 12px 16px; font-size: 13px; color: #f87171; text-align: right; font-weight: 700;">-${item.qty.toLocaleString('vi-VN')} SP</td>
                <td style="padding: 12px 16px; font-size: 13px; color: #ff8a8a; text-align: right; font-weight: 700;">-${formatCurrency(item.amt)}</td>
            </tr>
        `;
    }).join('');

    summary.textContent = `Tổng cộng: ${items.length} SKU, Số lượng lệch: ${totalQty.toLocaleString('vi-VN')} SP, Tổng tiền chênh lệch: ${formatCurrency(totalAmt)}`;

    overlay.classList.add('active');
};

// Run
init();
