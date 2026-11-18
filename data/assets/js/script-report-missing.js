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
    var btnQty = document.getElementById('btnChartModeQty');
    var btnAmt = document.getElementById('btnChartModeAmt');
    if (btnQty && btnAmt) {
        btnQty.classList.toggle('active', mode === 'qty');
        btnAmt.classList.toggle('active', mode === 'amt');
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
    
    const timeMatch = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return 'Khác';
    
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    const ampm = timeMatch[4].toUpperCase();
    
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
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
        
        const idx = {
            sku: headers.indexOf('sku_code'),
            name: headers.indexOf('product_name'),
            qty: headers.indexOf('.qty_moving'),
            amt: headers.indexOf('.amt_moving'),
            date: headers.indexOf('ngày'),
            price: headers.indexOf('price_unit'),
            locationFrom: headers.indexOf('location_from')
        };
        
        if (idx.sku === -1) idx.sku = 13;
        if (idx.name === -1) idx.name = 15;
        if (idx.qty === -1) idx.qty = 17;
        if (idx.amt === -1) idx.amt = 18;
        if (idx.date === -1) idx.date = 20;
        if (idx.price === -1) idx.price = 16;
        if (idx.locationFrom === -1) idx.locationFrom = 10;

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
                qty: Math.abs(getSafeNum(r.c[idx.qty])),
                amt: Math.abs(getSafeNum(r.c[idx.amt])),
                timestamp: getSafeStr(r.c[idx.date]),
                price: getSafeNum(r.c[idx.price]),
                locationFrom: getSafeStr(r.c[idx.locationFrom])
            };
        }).filter(item => item && item.sku);

        processAggregations();

    } catch (e) {
        console.error("Parse GViz Error:", e);
    }
}

function processAggregations() {
    const dailyMap = {};
    const shiftMap = { 'Ca 1': 0, 'Ca 2': 0, 'Ca 3': 0, 'Khác': 0 };
    const productMap = {};
    let totalSkusSet = new Set();
    let totalMoney = 0;
    
    reportData.forEach(item => {
        const date = getDateFromTimestamp(item.timestamp);
        const shift = getShiftFromTime(item.timestamp);
        
        dailyMap[date] = (dailyMap[date] || 0) + (chartMode === 'qty' ? item.qty : item.amt);
        shiftMap[shift] = (shiftMap[shift] || 0) + (chartMode === 'qty' ? item.qty : item.amt);
        
        if (!productMap[item.sku]) {
            productMap[item.sku] = { name: item.name, qty: 0, amt: item.amt, price: item.price };
        }
        productMap[item.sku].qty += item.qty;
        productMap[item.sku].amt += item.amt;
        
        totalSkusSet.add(item.sku);
        totalMoney += item.amt;
    });

    // Update Stats Cards
    if (statTotalSkus) statTotalSkus.textContent = totalSkusSet.size.toLocaleString('vi-VN');
    if (statTotalMoney) statTotalMoney.textContent = formatCurrency(totalMoney);
    
    let peakDate = '-';
    let peakDateVal = 0;
    Object.keys(dailyMap).forEach(d => {
        if (dailyMap[d] > peakDateVal) {
            peakDateVal = dailyMap[d];
            peakDate = d;
        }
    });
    if (statPeakDate) statPeakDate.textContent = peakDate;
    if (statPeakDateDesc) {
        statPeakDateDesc.innerHTML = chartMode === 'qty' 
            ? `<i class='bx bx-check-circle'></i> <span>Lệch lớn nhất: ${peakDateVal.toLocaleString('vi-VN')} SP</span>`
            : `<i class='bx bx-check-circle'></i> <span>Lệch lớn: ${formatCurrency(peakDateVal)}</span>`;
    }
    
    let peakShift = '-';
    let peakShiftVal = 0;
    Object.keys(shiftMap).forEach(s => {
        if (s !== 'Khác' && shiftMap[s] > peakShiftVal) {
            peakShiftVal = shiftMap[s];
            peakShift = s;
        }
    });
    if (statPeakShift) statPeakShift.textContent = peakShift;
    const totalShiftQty = Object.values(shiftMap).reduce((a,b) => a+b, 0) || 1;
    const shiftPercent = ((peakShiftVal / totalShiftQty) * 100).toFixed(1);
    if (statPeakShiftDesc) {
        statPeakShiftDesc.innerHTML = `<i class='bx bx-bar-chart-alt-2'></i> <span>Chiếm ${shiftPercent}% tổng số lượng missing</span>`;
    }

    const shiftUnitLabel = document.getElementById('shiftUnitLabel');
    if (shiftUnitLabel) {
        shiftUnitLabel.textContent = chartMode === 'qty' ? 'Theo lượng chênh lệch' : 'Theo giá trị chênh lệch';
    }

    // Render Shelf Tables
    renderShelfTables(reportData);

    // Update Charts
    updateCharts(dailyMap, shiftMap);
}

function updateCharts(dailyMap, shiftMap) {
    const isAmt = chartMode === 'amt';
    const textColor = '#6b7280';
    const gridColor = '#f3f4f6';

    // A. Daily Chart
    const dailyLabels = Object.keys(dailyMap).sort((a,b) => {
        const parseD = s => {
            const p = s.split('/');
            return new Date(p[2] || 2026, (p[1]||1)-1, p[0]||1);
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
                backgroundColor: 'rgba(167, 139, 250, 0.65)',
                borderColor: '#7c3aed',
                borderWidth: 1.5,
                borderRadius: 6,
                hoverBackgroundColor: '#8b5cf6'
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
                    backgroundColor: '#1e1b4b',
                    titleColor: '#fff',
                    bodyColor: '#e0e7ff',
                    padding: 10,
                    borderRadius: 8,
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
                    ticks: { color: textColor, font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { 
                        color: textColor,
                        font: { size: 10 },
                        callback: function(value) {
                            return isAmt ? (value >= 1e6 ? (value/1e6)+'M' : value.toLocaleString('vi-VN')) : value;
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
    const totalShift = (shiftValues[0] + shiftValues[1] + shiftValues[2]) || 1;

    // Update bottom percentage cards
    const p1 = ((shiftValues[0] / totalShift) * 100).toFixed(1);
    const p2 = ((shiftValues[1] / totalShift) * 100).toFixed(1);
    const p3 = ((shiftValues[2] / totalShift) * 100).toFixed(1);

    const elP1 = document.getElementById('legendPct1');
    const elP2 = document.getElementById('legendPct2');
    const elP3 = document.getElementById('legendPct3');
    if (elP1) elP1.textContent = p1 + '%';
    if (elP2) elP2.textContent = p2 + '%';
    if (elP3) elP3.textContent = p3 + '%';

    if (shiftChart) shiftChart.destroy();
    
    const ctxShift = document.getElementById('shiftChart').getContext('2d');
    shiftChart = new Chart(ctxShift, {
        type: 'doughnut',
        data: {
            labels: shiftLabels,
            datasets: [{
                data: shiftValues,
                backgroundColor: [
                    '#7c3aed', // Purple for Ca 1
                    '#f59e0b', // Amber for Ca 2
                    '#ef4444'  // Red for Ca 3
                ],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e1b4b',
                    titleColor: '#fff',
                    bodyColor: '#e0e7ff',
                    padding: 10,
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const pct = ((val / totalShift) * 100).toFixed(1);
                            return isAmt 
                                ? ` ${context.label}: ${formatCurrency(val)} (${pct}%)`
                                : ` ${context.label}: ${val.toLocaleString('vi-VN')} SP (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '72%'
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

    const items = reportData.filter(item => getDateFromTimestamp(item.timestamp) === dateStr);
    items.sort((a, b) => b.qty - a.qty);

    title.textContent = dateStr;
    
    let totalQty = 0;
    let totalAmt = 0;
    
    tbody.innerHTML = items.map(item => {
        totalQty += item.qty;
        totalAmt += item.amt;
        return `
            <tr style="border-bottom: 1px solid #f3f4f6; transition: background 0.15s;">
                <td style="padding: 10px 14px; font-family: monospace; font-size: 11px; color: #7c3aed; font-weight: 600;">${item.sku}</td>
                <td style="padding: 10px 14px; font-size: 12px; color: #374151;" title="${item.name}">${item.name}</td>
                <td style="padding: 10px 14px; font-size: 12px; color: #6b7280; text-align: right;">${item.price > 0 ? formatCurrency(item.price) : 'Chưa rõ'}</td>
                <td style="padding: 10px 14px; font-size: 12px; color: #ef4444; text-align: right; font-weight: 700;">-${item.qty.toLocaleString('vi-VN')} SP</td>
                <td style="padding: 10px 14px; font-size: 12px; color: #b91c1c; text-align: right; font-weight: 700;">-${formatCurrency(item.amt)}</td>
            </tr>
        `;
    }).join('');

    summary.textContent = `Tổng cộng: ${items.length} SKU • Số lượng lệch: ${totalQty.toLocaleString('vi-VN')} SP • Tổng tiền chênh lệch: ${formatCurrency(totalAmt)}`;

    overlay.classList.add('active');
};

// ============================================================
// RENDER KE PA & KE XAM TABLES
// ============================================================
function renderShelfTables(data) {
    var paSku = {};
    var xamSku = {};

    data.forEach(function(item) {
        var loc = (item.locationFrom || '').toUpperCase();
        var isPa = loc.indexOf('PA') >= 0;
        var map = isPa ? paSku : xamSku;
        if (!map[item.sku]) {
            map[item.sku] = { sku: item.sku, name: item.name, qty: 0, locationFrom: item.locationFrom };
        }
        map[item.sku].qty += item.qty;
    });

    renderOneShelfTable('shelfPaTableBody', paSku, 'shelfPaSeeAll');
    renderOneShelfTable('shelfXamTableBody', xamSku, 'shelfXamSeeAll');
}

function renderOneShelfTable(tbodyId, skuMap, seeAllBtnId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    var sorted = Object.values(skuMap).sort(function(a, b) { return b.qty - a.qty; });

    var seeAllBtn = seeAllBtnId ? document.getElementById(seeAllBtnId) : null;
    if (seeAllBtn) {
        if (sorted.length > 5) {
            seeAllBtn.style.display = 'inline-block';
            seeAllBtn.dataset.expanded = 'false';
            seeAllBtn.textContent = 'Xem tất cả →';
        } else {
            seeAllBtn.style.display = 'none';
        }
    }

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td class="empty-cell" colspan="3">Chưa có dữ liệu</td></tr>';
        return;
    }

    var html = '';
    sorted.forEach(function(item, idx) {
        var loc = item.locationFrom || '-';
        var name = (item.name || '').replace(/"/g, '&quot;');
        var qty = item.qty.toLocaleString('vi-VN');
        var isExtra = idx >= 5;
        var style = isExtra ? ' style="display:none;"' : '';
        var cls = isExtra ? ' class="shelf-row-extra"' : '';

        html += '<tr' + cls + style + '>';
        html += '<td class="td-sku" title="' + loc + '">' + loc + '</td>';
        html += '<td class="td-name" title="' + name + '">' + name + '</td>';
        html += '<td class="td-qty">' + qty + '</td>';
        html += '</tr>';
    });
    tbody.innerHTML = html;
}

// Run
init();
