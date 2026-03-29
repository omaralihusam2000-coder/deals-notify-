/**
 * bottom-nav.js
 * Minimal bottom navigation for the lean launcher homepage.
 */
const BottomNavModule = (() => {
  const MOBILE_BREAKPOINT = 768;
  const TABS = [
    { id: 'deals', icon: 'D', label: 'Deals' },
    { id: 'giveaways', icon: 'F', label: 'Free' },
    { id: 'bundles', icon: 'B', label: 'Bundles' },
    { id: 'wishlist', icon: 'W', label: 'Wishlist' },
    { id: 'settings', icon: 'S', label: 'Settings' },
  ];

  function init() {
    if (!document.body.classList.contains('launcher-ui')) return;
    if (window.innerWidth > MOBILE_BREAKPOINT) return;
    if (document.getElementById('bottom-nav')) return;

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.id = 'bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Quick navigation');

    nav.innerHTML = TABS.map(tab => `
      <button class="bottom-nav-item ${tab.id === 'deals' ? 'active' : ''}" data-tab="${tab.id}" aria-label="${tab.label}">
        <span class="bottom-nav-icon">${tab.icon}</span>
        <span class="bottom-nav-label">${tab.label}</span>
      </button>
    `).join('');

    document.body.appendChild(nav);

    nav.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        if (typeof AppModule !== 'undefined') AppModule.switchTab(tabId);
        updateActive(tabId);
      });
    });

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (TABS.some(item => item.id === tabId)) updateActive(tabId);
      });
    });

    document.body.style.paddingBottom = '70px';

    window.addEventListener('resize', () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        nav.style.display = 'none';
        document.body.style.paddingBottom = '0';
      } else {
        nav.style.display = 'flex';
        document.body.style.paddingBottom = '70px';
      }
    });
  }

  function updateActive(tabId) {
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
  }

  return { init, updateActive };
})();
