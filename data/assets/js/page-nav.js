/**
 * page-nav.js — Page Navigator dùng chung cho tất cả trang
 * Tự động render modal, detect trang hiện tại để highlight "● Hiện tại"
 * Dùng: chỉ cần <script src="../assets/js/page-nav.js"></script> là xong
 */
(function () {
  // ── Danh sách trang ──────────────────────────────────────────────────────
  const PAGES = [
    {
      section: '─ WMS Kho HN ─',
      href: '../../index.html',
      label: 'Kiểm Kê Hàng Ngày',
      desc: 'Nhập liệu kiểm kê tồn kho thực tế',
      icon: 'bx-package',
      grad: 'linear-gradient(135deg,#6366F1,#4F46E5)',
      shadow: 'rgba(99,102,241,0.4)',
      hoverBg: 'rgba(99,102,241,0.12)',
      hoverBorder: 'rgba(99,102,241,0.35)',
      activeBg: 'rgba(99,102,241,0.12)',
      activeBorder: 'rgba(99,102,241,0.35)',
      activePillColor: '#818CF8',
      activePillBg: 'rgba(99,102,241,0.2)',
      activePillBorder: 'rgba(99,102,241,0.35)',
      match: ['index.html'],
    },
    {
      section: null,
      href: '../../mapping.html',
      label: 'Mapping Kệ Nhanh',
      desc: 'Tra cứu vị trí kệ theo SKU',
      icon: 'bx-map-pin',
      grad: 'linear-gradient(135deg,#10B981,#059669)',
      shadow: 'rgba(16,185,129,0.3)',
      hoverBg: 'rgba(16,185,129,0.1)',
      hoverBorder: 'rgba(16,185,129,0.3)',
      activeBg: 'rgba(16,185,129,0.12)',
      activeBorder: 'rgba(16,185,129,0.35)',
      activePillColor: '#34D399',
      activePillBg: 'rgba(16,185,129,0.2)',
      activePillBorder: 'rgba(16,185,129,0.35)',
      match: ['mapping.html'],
    },
    {
      section: '─ Kho Thuocsi ─',
      href: 'candate.html',
      label: 'Sản Phẩm Cận Date',
      desc: 'Lọc sản phẩm HSD dưới 1 năm',
      icon: 'bx-calendar-exclamation',
      grad: 'linear-gradient(135deg,#F59E0B,#D97706)',
      shadow: 'rgba(245,158,11,0.3)',
      hoverBg: 'rgba(245,158,11,0.1)',
      hoverBorder: 'rgba(245,158,11,0.3)',
      activeBg: 'rgba(245,158,11,0.12)',
      activeBorder: 'rgba(245,158,11,0.35)',
      activePillColor: '#FBBF24',
      activePillBg: 'rgba(245,158,11,0.2)',
      activePillBorder: 'rgba(245,158,11,0.35)',
      match: ['candate.html'],
    },
    {
      section: null,
      href: 'data-missing.html',
      label: 'Data Missing – Tính Lệch',
      desc: 'Khớp dữ liệu kiểm kê vs hệ thống',
      icon: 'bx-radar',
      grad: 'linear-gradient(135deg,#EF4444,#DC2626)',
      shadow: 'rgba(239,68,68,0.3)',
      hoverBg: 'rgba(239,68,68,0.1)',
      hoverBorder: 'rgba(239,68,68,0.3)',
      activeBg: 'rgba(239,68,68,0.12)',
      activeBorder: 'rgba(239,68,68,0.35)',
      activePillColor: '#F87171',
      activePillBg: 'rgba(239,68,68,0.2)',
      activePillBorder: 'rgba(239,68,68,0.35)',
      match: ['data-missing.html'],
    },
    {
      section: null,
      href: 'doisoat.html',
      label: 'Đối Soát Vender',
      desc: 'Quản lý sản lượng & vi phạm',
      icon: 'bx-shield-quarter',
      grad: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
      shadow: 'rgba(139,92,246,0.3)',
      hoverBg: 'rgba(139,92,246,0.1)',
      hoverBorder: 'rgba(139,92,246,0.3)',
      activeBg: 'rgba(139,92,246,0.12)',
      activeBorder: 'rgba(139,92,246,0.35)',
      activePillColor: '#A78BFA',
      activePillBg: 'rgba(139,92,246,0.2)',
      activePillBorder: 'rgba(139,92,246,0.35)',
      match: ['doisoat.html'],
    },
    {
      section: null,
      href: 'multi-search.html',
      label: 'Tra cứu Nhiều Sản Phẩm',
      desc: 'Tra cứu hàng loạt SKU – tồn kho, vị trí, lot',
      icon: 'bx-search',
      grad: 'linear-gradient(135deg,#0EA5E9,#0284C7)',
      shadow: 'rgba(14,165,233,0.3)',
      hoverBg: 'rgba(14,165,233,0.1)',
      hoverBorder: 'rgba(14,165,233,0.3)',
      activeBg: 'rgba(14,165,233,0.12)',
      activeBorder: 'rgba(14,165,233,0.35)',
      activePillColor: '#38BDF8',
      activePillBg: 'rgba(14,165,233,0.2)',
      activePillBorder: 'rgba(14,165,233,0.35)',
      match: ['multi-search.html'],
    },
  ];

  // ── Detect trang hiện tại ────────────────────────────────────────────────
  function getCurrentFile() {
    const path = decodeURIComponent(window.location.pathname);
    const file = path.split('/').pop() || 'index.html';
    // Phân biệt index.html root vs index.html trong data/html/
    if (file === 'index.html' && path.includes('/data/')) return 'data-index.html';
    return file;
  }

  // ── Build và inject modal vào DOM ────────────────────────────────────────
  function buildModal() {
    if (document.getElementById('pageNavModal')) return; // đã có rồi

    const currentFile = getCurrentFile();
    let linksHtml = '';

    PAGES.forEach(p => {
      const isActive = p.match.includes(currentFile);
      const bg     = isActive ? p.activeBg     : 'rgba(255,255,255,0.03)';
      const border = isActive ? p.activeBorder : 'rgba(255,255,255,0.07)';

      const sectionLabel = p.section
        ? `<p style="font-size:0.6rem;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.15em;margin:6px 0 2px;">${p.section}</p>`
        : '';

      const pill = isActive
        ? `<span style="font-size:0.58rem;font-weight:700;color:${p.activePillColor};background:${p.activePillBg};padding:2px 9px;border-radius:20px;border:1px solid ${p.activePillBorder};flex-shrink:0;">● Hiện tại</span>`
        : '';

      const hoverOut  = `this.style.background='${bg}';this.style.borderColor='${border}';this.style.transform='translateX(0)';`;
      const hoverOver = `this.style.background='${p.hoverBg}';this.style.borderColor='${p.hoverBorder}';this.style.transform='translateX(4px)';`;

      linksHtml += `
        ${sectionLabel}
        <a href="${p.href}" onclick="closePageNavigator()"
           style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:${bg};border:1px solid ${border};text-decoration:none;transition:all 0.25s;"
           onmouseover="${hoverOver}" onmouseout="${hoverOut}">
          <div style="width:36px;height:36px;border-radius:10px;background:${p.grad};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:17px;color:white;box-shadow:0 4px 12px ${p.shadow};"><i class='bx ${p.icon}'></i></div>
          <div style="flex:1;min-width:0;">
            <p style="font-size:0.88rem;font-weight:700;color:#E2E8F0;">${p.label}</p>
            <p style="font-size:0.7rem;color:#475569;">${p.desc}</p>
          </div>
          ${pill}
        </a>`;
    });

    const modal = document.createElement('div');
    modal.id = 'pageNavModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,0.8);backdrop-filter:blur(20px);align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div id="pageNavBox" style="width:100%;max-width:480px;border-radius:28px;overflow:hidden;background:linear-gradient(145deg,rgba(30,41,59,0.97),rgba(15,23,42,0.99));border:1px solid rgba(255,255,255,0.1);box-shadow:0 40px 100px rgba(0,0,0,0.8);transform:scale(0.9) translateY(20px);opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);">
        <!-- Header -->
        <div style="padding:24px 24px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:18px;color:white;box-shadow:0 6px 20px rgba(99,102,241,0.4);"><i class='bx bx-layer'></i></div>
            <div>
              <p style="font-size:1rem;font-weight:800;color:#fff;">Chuyển Trang</p>
              <p style="font-size:0.65rem;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Điều hướng hệ thống</p>
            </div>
          </div>
          <button onclick="closePageNavigator()"
            style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94A3B8;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;"
            onmouseover="this.style.background='rgba(239,68,68,0.2)';this.style.color='#fff';"
            onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='#94A3B8';">
            <i class='bx bx-x'></i>
          </button>
        </div>
        <!-- Links -->
        <div style="padding:16px 24px 24px;display:flex;flex-direction:column;gap:8px;">
          ${linksHtml}
        </div>
      </div>`;

    // Đóng khi click nền
    modal.addEventListener('click', function (e) {
      if (e.target === this) closePageNavigator();
    });

    document.body.appendChild(modal);
  }

  // ── API công khai ────────────────────────────────────────────────────────
  function _pnavEsc(e) { if (e.key === 'Escape') closePageNavigator(); }

  window.openPageNavigator = function () {
    buildModal(); // idempotent
    const m = document.getElementById('pageNavModal');
    const b = document.getElementById('pageNavBox');
    m.style.display = 'flex';
    requestAnimationFrame(() => {
      b.style.transform = 'scale(1) translateY(0)';
      b.style.opacity = '1';
    });
    document.addEventListener('keydown', _pnavEsc);
  };

  window.closePageNavigator = function () {
    const m = document.getElementById('pageNavModal');
    const b = document.getElementById('pageNavBox');
    if (!m || !b) return;
    b.style.transform = 'scale(0.9) translateY(20px)';
    b.style.opacity = '0';
    setTimeout(() => { m.style.display = 'none'; }, 300);
    document.removeEventListener('keydown', _pnavEsc);
  };

  // Build ngay khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildModal);
  } else {
    buildModal();
  }
})();
