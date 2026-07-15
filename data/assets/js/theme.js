(function () {
    const KEY = 'wms_theme';

    function getTheme() {
        return localStorage.getItem(KEY) || 'dark';
    }

    function setTheme(theme) {
        localStorage.setItem(KEY, theme);
        document.documentElement.classList.toggle('light', theme === 'light');
        document.documentElement.classList.toggle('dark', theme !== 'light');
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.innerHTML = theme === 'light'
                ? '<i class="bx bx-moon"></i>'
                : '<i class="bx bx-sun"></i>';
        }
    }

    function toggleTheme() {
        setTheme(getTheme() === 'light' ? 'dark' : 'light');
    }

    function initTheme() {
        setTheme(getTheme());
        const btn = document.getElementById('themeToggle');
        if (btn) btn.addEventListener('click', toggleTheme);
    }

    window.addEventListener('DOMContentLoaded', initTheme);
    if (document.readyState !== 'loading') initTheme();
})();
