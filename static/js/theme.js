/**
 * theme.js
 * 
 * Purpose:
 *     Toggles Dark/Light display modes on the client-side.
 *     Persists preference inside LocalStorage.
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggle');
    if (!themeToggleBtn) return;

    // Check pre-existing local configurations or system settings
    const currentTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    // Apply active theme
    applyTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        const activeTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(activeTheme);
        localStorage.setItem('theme', activeTheme);
    });

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }
    }
});
