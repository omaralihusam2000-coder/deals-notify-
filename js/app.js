/**
 * app.js — Main application logic, tab navigation, and initialisation
 */

const AppModule = (() => {
  const TABS = ['home', 'deals', 'giveaways', 'bundles', 'console', 'news', 'calendar', 'quiz', 'dashboard', 'collections', 'wishlist', 'achievements', 'profile', 'settings'];
  let activeTab = 'deals';

  function applyLeanHomepageChrome() {
    if (!document.body.classList.contains('launcher-ui')) return;

    document.getElementById('lucky-spin-btn')?.remove();
    document.getElementById('cb-widget')?.remove();
    document.getElementById('bundle-fab')?.remove();
    document.getElementById('discord-floating-widget')?.remove();

    document.querySelector('.nav-tab[data-tab="news"]')?.remove();
    document.querySelector('.nav-more')?.remove();

    const navMain = document.querySelector('.nav-main');
    if (navMain && !navMain.querySelector('.nav-tab[data-tab="settings"]')) {
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'nav-tab';
      settingsBtn.type = 'button';
      settingsBtn.setAttribute('role', 'tab');
      settingsBtn.setAttribute('aria-selected', 'false');
      settingsBtn.dataset.tab = 'settings';
      settingsBtn.setAttribute('aria-controls', 'tab-settings');
      settingsBtn.textContent = 'Settings';
      navMain.appendChild(settingsBtn);
    }

    [
      'launcher-recommended',
      'launcher-freebies',
      'launcher-news',
      'launcher-feature-story',
      'launcher-creators',
      'launcher-platforms',
      'recommendations-section',
      'recently-viewed-section',
      'live-stats-bar',
      'mini-stats-bar',
      'genre-filters-container',
      'top-rated-deals-section',
      'price-timeline-container',
    ].forEach(id => document.getElementById(id)?.remove());

    document.querySelectorAll('.newsletter-section, .trust-focus-section, .how-it-works-section, .why-us-section').forEach(section => section.remove());
    document.querySelectorAll('.launcher-dual-grid').forEach(grid => {
      if (!grid.children.length) grid.remove();
    });

    const heroBrand = document.querySelector('.launcher-hero-brand');
    if (heroBrand) {
      heroBrand.innerHTML = '<span class="launcher-hero-brand-mark"></span> Deal Board';
    }

    const heroSearch = document.getElementById('hero-search-proxy');
    if (heroSearch) heroSearch.placeholder = 'Search deals or stores';

    const heroSecondaryBtn = document.getElementById('hero-alert-btn');
    if (heroSecondaryBtn) {
      heroSecondaryBtn.id = 'hero-secondary-btn';
      heroSecondaryBtn.textContent = 'Free Games';
      heroSecondaryBtn.setAttribute('aria-label', 'Open free games');
    }

    const heroBrowseBtn = document.getElementById('hero-browse-btn');
    if (heroBrowseBtn) {
      heroBrowseBtn.textContent = 'Browse Deals';
      heroBrowseBtn.setAttribute('aria-label', 'Browse deals');
    }

    document.querySelector('.hero-stats-row')?.remove();
    document.querySelector('.launcher-hero-dots')?.remove();

    if (!document.querySelector('.hero-note')) {
      const note = document.createElement('p');
      note.className = 'hero-note';
      note.textContent = 'We help you discover deals, then redirect you to the official store or offer page.';
      document.querySelector('.hero-cta-row')?.insertAdjacentElement('afterend', note);
    }

    const feedHeader = document.querySelector('.section-header.section-header-split');
    if (feedHeader) {
      feedHeader.classList.add('deals-feed-head');
      feedHeader.querySelector('.section-kicker')?.replaceChildren(document.createTextNode('Browse deals'));
      feedHeader.querySelector('.section-title')?.replaceChildren(document.createTextNode('Find the right offer quickly.'));
      feedHeader.querySelector('.section-lead')?.replaceChildren(document.createTextNode('Filter by store, price, and discount. Final price and availability depend on the destination store page.'));
    }

    const footerBrandCopy = document.querySelector('.footer-brand-copy');
    if (footerBrandCopy) {
      footerBrandCopy.textContent = 'Track game discounts, compare prices, and open trusted store pages without the extra noise.';
    }

    const footerGroups = document.querySelector('.footer-link-groups');
    if (footerGroups) {
      footerGroups.innerHTML = `
        <div class="footer-link-group">
          <span class="footer-link-title">Explore</span>
          <button class="footer-link-btn" type="button" data-launcher-tab="giveaways">Free Games</button>
          <button class="footer-link-btn" type="button" data-launcher-tab="bundles">Bundles</button>
          <button class="footer-link-btn" type="button" data-site-action="open-wishlist">Wishlist</button>
          <button class="footer-link-btn" type="button" data-site-action="open-settings">Settings</button>
        </div>
        <div class="footer-link-group">
          <span class="footer-link-title">Project</span>
          <button class="footer-link-btn" type="button" data-site-info="about">About Us</button>
          <button class="footer-link-btn" type="button" data-site-info="contact">Contact</button>
          <button class="footer-link-btn" type="button" data-site-info="privacy">Privacy Policy</button>
          <button class="footer-link-btn" type="button" data-site-info="terms">Terms</button>
        </div>
      `;
    }

    const trustStrip = document.querySelector('.footer-trust-strip');
    if (trustStrip) {
      trustStrip.innerHTML = `
        <span class="footer-pill">20+ stores tracked</span>
        <span class="footer-pill">Official store redirects</span>
        <span class="footer-pill">Prices depend on the final store page</span>
      `;
    }
  }

  function closeMoreMenu() {
    const menu = document.querySelector('.nav-more-menu');
    const toggle = document.querySelector('.nav-more-toggle');
    if (menu) menu.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function switchTab(tabName) {
    if (!TABS.includes(tabName)) return;

    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
      btn.setAttribute('aria-selected', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    activeTab = tabName;
    storageSet('last_tab', tabName);
    if (typeof SoundsModule !== 'undefined') SoundsModule.tabSwitch();
    if (typeof BottomNavModule !== 'undefined' && BottomNavModule.updateActive) {
      BottomNavModule.updateActive(tabName);
    }

    // Lazy-load tab content on first visit
    if (tabName === 'giveaways' && !document.getElementById('giveaways-grid').dataset.loaded) {
      document.getElementById('giveaways-grid').dataset.loaded = '1';
      if (typeof SkeletonsModule !== 'undefined') SkeletonsModule.showInGrid('giveaways-grid', 6);
      GiveawaysModule.init();
    }
    if (tabName === 'bundles' && typeof BundlesModule !== 'undefined') {
      if (typeof SkeletonsModule !== 'undefined') SkeletonsModule.showInGrid('bundles-grid', 6);
      BundlesModule.init();
      if (typeof GamificationModule !== 'undefined') GamificationModule.recordEvent('view');
    }
    if (tabName === 'console' && typeof ConsoleDealsModule !== 'undefined') {
      if (typeof SkeletonsModule !== 'undefined') SkeletonsModule.showInGrid('console-deals-grid', 6);
      ConsoleDealsModule.init();
    }
    if (tabName === 'news' && typeof NewsModule !== 'undefined') {
      if (typeof SkeletonsModule !== 'undefined') SkeletonsModule.showInGrid('news-grid', 6, 'news');
      NewsModule.init();
      if (typeof GamificationModule !== 'undefined') GamificationModule.recordEvent('news_visit');
    }
    if (tabName === 'calendar' && typeof CalendarModule !== 'undefined') {
      CalendarModule.init();
    }
    if (tabName === 'quiz' && typeof QuizModule !== 'undefined') {
      QuizModule.init();
    }
    if (tabName === 'collections' && typeof CollectionsModule !== 'undefined') {
      CollectionsModule.init();
    }
    if (tabName === 'dashboard' && typeof DashboardModule !== 'undefined') {
      DashboardModule.render();
    }
    if (tabName === 'wishlist') {
      WishlistModule.renderWishlist();
    }
    if (tabName === 'achievements' && typeof GamificationModule !== 'undefined') {
      GamificationModule.renderAchievements();
    }
    if (tabName === 'profile' && typeof ProfileModule !== 'undefined') {
      ProfileModule.renderProfile();
    }
    if (tabName === 'settings') {
      if (typeof NotificationsModule !== 'undefined' && NotificationsModule.updateSettingsUI) {
        NotificationsModule.updateSettingsUI();
      }
      if (typeof SteamImportModule !== 'undefined') {
        SteamImportModule.renderImportSection();
      }
      if (typeof NewsletterModule !== 'undefined') {
        NewsletterModule.renderManageSection();
      }
      if (typeof DiscordModule !== 'undefined') {
        DiscordModule.renderWidget && DiscordModule.init && DiscordModule.init();
      }
      if (typeof SmartAlertsModule !== 'undefined') SmartAlertsModule.renderSettings();
      if (typeof SocialProofModule !== 'undefined') SocialProofModule.renderToggle();
      if (typeof PriceSchedulerModule !== 'undefined') PriceSchedulerModule.renderAlertsInSettings?.();
    }
    if (tabName === 'deals' && typeof StorefrontHomeModule !== 'undefined') {
      StorefrontHomeModule.refresh();
    }
  }

  function bindNavEvents() {
    document.querySelectorAll('.nav-tab').forEach(btn => {
      if (!btn.dataset.tab) return;
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
        closeMoreMenu();
      });
    });

    document.querySelectorAll('.rail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab) switchTab(btn.dataset.tab);
      });
    });

    const moreToggle = document.querySelector('.nav-more-toggle');
    const moreMenu = document.querySelector('.nav-more-menu');
    if (moreToggle && moreMenu) {
      moreToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !moreMenu.classList.contains('open');
        moreMenu.classList.toggle('open', open);
        moreToggle.setAttribute('aria-expanded', open);
      });
      document.addEventListener('click', (e) => {
        if (!moreMenu.contains(e.target) && e.target !== moreToggle) {
          closeMoreMenu();
        }
      });
    }
  }

  function updateThemeToggleIcon() {
    const btn = document.getElementById('theme-toggle');
    const isLight = document.body.classList.contains('light-mode');
    if (btn) btn.textContent = isLight ? '🌙' : '☀️';
  }

  function initAutoTheme() {
    const userManualChoice = storageGet('theme_manual', false);
    if (!userManualChoice) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      if (prefersDark.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.add('light-mode');
      }
      // Listen for system changes
      prefersDark.addEventListener('change', (e) => {
        if (!storageGet('theme_manual', false)) {
          document.body.classList.toggle('light-mode', !e.matches);
          updateThemeToggleIcon();
        }
      });
    }
  }

  function initDarkMode() {
    initAutoTheme();
    const savedTheme = storageGet('theme', null);
    if (savedTheme) applyTheme(savedTheme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        storageSet('theme', next);
        storageSet('theme_manual', true);
        showToast(`${next === 'dark' ? '🌙 Dark' : '☀️ Light'} mode activated`, 'info');
      });
    }
  }

  function applyTheme(theme) {
    document.body.classList.toggle('light-mode', theme === 'light');
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initNewsletterSignup() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletter-email');
      if (!emailInput) return;
      const email = emailInput.value.trim();
      if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }
      const subscribers = storageGet('newsletter_subscribers', []);
      if (subscribers.includes(email)) {
        showToast('You are already subscribed!', 'info');
        return;
      }
      subscribers.push(email);
      storageSet('newsletter_subscribers', subscribers);
      emailInput.value = '';
      showToast(`✅ Subscribed! You'll get deal alerts at ${email}`, 'success');
    });
  }

  function updateNotifBadge() {
    const badge = document.getElementById('notif-status-badge');
    if (!badge) return;
    if (!('Notification' in window)) { badge.style.display = 'none'; return; }
    const perm = Notification.permission;
    badge.style.display = perm === 'default' ? 'flex' : 'none';
    badge.title = 'Enable deal notifications';
    badge.addEventListener('click', async () => {
      const granted = await NotificationsModule.requestPermission();
      if (granted) {
        badge.style.display = 'none';
        showToast('Notifications enabled!', 'success');
      }
    });
  }

  async function init() {
    const leanMode = document.body.classList.contains('launcher-ui');

    // Init i18n first (before any other modules render text)
    if (typeof I18nModule !== 'undefined') I18nModule.init();

    applyLeanHomepageChrome();
    bindNavEvents();
    initDarkMode();
    initBackToTop();
    initNewsletterSignup();

    // Restore last active tab
    const lastTab = storageGet('last_tab', 'deals');
    if (lastTab && lastTab !== 'deals') {
      switchTab(lastTab);
    }

    // Core modules
    WishlistModule.init();
    NotificationsModule.init();

    // New feature modules
    if (typeof CurrencyModule !== 'undefined') CurrencyModule.init();
    if (typeof SteamImportModule !== 'undefined') SteamImportModule.init();
    if (typeof GamificationModule !== 'undefined') GamificationModule.init();
    if (typeof PWAModule !== 'undefined') PWAModule.init();
    if (typeof NewsletterModule !== 'undefined') NewsletterModule.init();
    if (!leanMode && typeof DiscordModule !== 'undefined') DiscordModule.init();

    // Deals tab is default — initialise immediately
    await DealsModule.init();
    if (typeof StorefrontHomeModule !== 'undefined') StorefrontHomeModule.init();

    updateNotifBadge();

    // Welcome onboarding for first-time visitors
    if (!leanMode && typeof WelcomeModule !== 'undefined') {
      WelcomeModule.show();
    }

    // Live stats bar
    if (!leanMode && typeof LiveStatsModule !== 'undefined') {
      LiveStatsModule.init();
    }

    // Floating action button
    if (!leanMode && typeof FABModule !== 'undefined') {
      FABModule.init();
    }

    // Keyboard shortcuts
    if (typeof KeyboardModule !== 'undefined') KeyboardModule.init();

    // Scroll progress bar
    if (typeof ScrollProgressModule !== 'undefined') ScrollProgressModule.init();

    // Intersection observer card animations
    if (typeof IntersectionAnimatorModule !== 'undefined') IntersectionAnimatorModule.init();

    // Pull-to-refresh on mobile
    if (typeof PullToRefreshModule !== 'undefined') PullToRefreshModule.init();

    // Bottom navigation for mobile
    if (typeof BottomNavModule !== 'undefined') BottomNavModule.init();

    // Smart tooltips
    if (typeof TooltipsModule !== 'undefined') TooltipsModule.init();

    // Mini stats dashboard
    if (!leanMode && typeof MiniStatsModule !== 'undefined') MiniStatsModule.init();

    // Wave 4 modules
    if (!leanMode && typeof SpotlightModule !== 'undefined') SpotlightModule.init();
    if (!leanMode && typeof ThemePickerModule !== 'undefined') ThemePickerModule.init();
    if (typeof SmartAlertsModule !== 'undefined') SmartAlertsModule.init();
    if (!leanMode && typeof RecentlyViewedModule !== 'undefined') RecentlyViewedModule.init();
    if (!leanMode && typeof FeedbackModule !== 'undefined') FeedbackModule.init();
    if (!leanMode && typeof SparklinesModule !== 'undefined') SparklinesModule.init();
    if (!leanMode && typeof ProfileModule !== 'undefined') ProfileModule.init();
    if (typeof CountdownModule !== 'undefined') CountdownModule.init();
    if (!leanMode && typeof CompareModule !== 'undefined') CompareModule.init();
    if (!leanMode && typeof SocialProofModule !== 'undefined') SocialProofModule.init();
    if (!leanMode && typeof DailyStreakModule !== 'undefined') DailyStreakModule.init();
    if (!leanMode && typeof ImageZoomModule !== 'undefined') ImageZoomModule.init();

    // UX/SEO improvements
    if (typeof TopDealsModule !== 'undefined') TopDealsModule.init();
    if (!leanMode && typeof DealBadgesModule !== 'undefined') DealBadgesModule.init();
    if (typeof SiteInfoModule !== 'undefined') SiteInfoModule.init();

    // AI Deal Assistant Chatbot
    if (!leanMode && typeof ChatbotModule !== 'undefined') ChatbotModule.init();

    // Hero section CTA buttons
    const heroBrowseBtn = document.getElementById('hero-browse-btn');
    if (heroBrowseBtn) {
      heroBrowseBtn.addEventListener('click', () => {
        const filters = document.querySelector('.search-filter-bar');
        if (filters) filters.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    const heroSecondaryBtn = document.getElementById('hero-secondary-btn') || document.getElementById('hero-alert-btn');
    if (heroSecondaryBtn) {
      heroSecondaryBtn.addEventListener('click', () => {
        switchTab('giveaways');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Sound effects toggle
    const soundsToggle = document.getElementById('sounds-toggle');
    if (soundsToggle && typeof SoundsModule !== 'undefined') {
      soundsToggle.checked = SoundsModule.isEnabled();
      soundsToggle.addEventListener('change', () => {
        const nowEnabled = SoundsModule.toggle();
        soundsToggle.checked = nowEnabled;
        showToast(nowEnabled ? '🔊 Sounds enabled' : '🔇 Sounds muted', 'info');
      });
    }
  }

  return { init, switchTab };
})();

window.AppModule = AppModule;

document.addEventListener('DOMContentLoaded', () => {
  AppModule.init().catch(err => {
    console.error('App init failed:', err);
    showToast('Application failed to initialise. Please refresh the page.', 'error');
  });
});
