/**
 * bottom-nav.js — Fixed bottom navigation bar for mobile devices
 */
const BottomNavModule = (() => {
  const MOBILE_BREAKPOINT = 768;
  const TABS = [
    { id: 'deals', icon: '🔥', label: 'Deals' },
    { id: 'giveaways', icon: '🆓', label: 'Free' },
    { id: 'wishlist', icon: '⭐', label: 'Wishlist' },
    { id: 'news', icon: '📰', label: 'News' },
    { id: 'more', icon: '☰', label: 'More' },
  ];

  let moreMenuOpen = false;

  function init() {
    // Only show on small screens
    if (window.innerWidth > MOBILE_BREAKPOINT) return;

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

    // Create "More" dropdown menu
    const moreMenu = document.createElement('div');
    moreMenu.className = 'bottom-nav-more-menu';
    moreMenu.id = 'bottom-nav-more-menu';
    moreMenu.innerHTML = `
      <button class="more-menu-item" data-tab="bundles">🎁 Bundles</button>
      <button class="more-menu-item" data-tab="console">🎮 Console</button>
      <button class="more-menu-item" data-tab="calendar">📅 Calendar</button>
      <button class="more-menu-item" data-tab="quiz">🎮 Quiz</button>
      <button class="more-menu-item" data-tab="collections">📚 Collections</button>
      <button class="more-menu-item" data-tab="achievements">🏅 Achievements</button>
      <button class="more-menu-item" data-tab="settings">⚙️ Settings</button>
    `;
    document.body.appendChild(moreMenu);

    // Event listeners
    nav.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        if (tabId === 'more') {
          toggleMoreMenu();
          return;
        }
        closeMoreMenu();
        if (typeof AppModule !== 'undefined') AppModule.switchTab(tabId);
        updateActive(tabId);
      });
    });

    moreMenu.querySelectorAll('.more-menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        closeMoreMenu();
        if (typeof AppModule !== 'undefined') AppModule.switchTab(tabId);
        updateActive('more');
      });
    });

    // Close more menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.bottom-nav') && !e.target.closest('.bottom-nav-more-menu')) {
        closeMoreMenu();
      }
    });

    // Sync with top nav clicks
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        const directTabs = TABS.map(t => t.id).filter(id => id !== 'more');
        if (directTabs.includes(tabId)) {
          updateActive(tabId);
        } else {
          updateActive('more');
        }
      });
    });

    // Add body padding for bottom nav
    document.body.style.paddingBottom = '70px';

    // Handle resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        nav.style.display = 'none';
        moreMenu.style.display = 'none';
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

  function toggleMoreMenu() {
    const menu = document.getElementById('bottom-nav-more-menu');
    moreMenuOpen = !moreMenuOpen;
    menu.classList.toggle('visible', moreMenuOpen);
  }

  function closeMoreMenu() {
    const menu = document.getElementById('bottom-nav-more-menu');
    if (menu) menu.classList.remove('visible');
    moreMenuOpen = false;
  }

  return { init, updateActive };
})();
