(function () {
  const storageKey = 'Fluid_Color_Scheme';
  const root = document.documentElement;

  function getCurrentScheme() {
    return root.getAttribute('data-user-color-scheme')
      || root.getAttribute('data-default-color-scheme')
      || 'light';
  }

  function setIcon(id, scheme) {
    const icon = document.getElementById(id);
    if (!icon) return;
    icon.className = 'iconfont icon-' + scheme;
    icon.setAttribute('data', scheme === 'dark' ? 'light' : 'dark');
  }

  function applyScheme(next) {
    root.setAttribute('data-user-color-scheme', next);
    try { localStorage.setItem(storageKey, next); } catch (e) {}
    setIcon('color-toggle-icon', next);
    setIcon('mobile-color-toggle-icon', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const color = getComputedStyle(root).getPropertyValue('--navbar-bg-color').trim();
      meta.setAttribute('content', color);
    }
  }

  function bind(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const current = getCurrentScheme();
      applyScheme(current === 'dark' ? 'light' : 'dark');
    }, true);
  }

  bind('color-toggle-btn');
  bind('mobile-color-toggle-btn');
})();
