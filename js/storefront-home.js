/**
 * storefront-home.js
 * Builds the launcher-style deals homepage shelves.
 */

const StorefrontHomeModule = (() => {
  const CHEAPSHARK_REDIRECT = 'https://www.cheapshark.com/redirect?dealID=';
  const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';
  const GAMERPOWER_BASE = 'https://www.gamerpower.com/api';
  const NEWS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

  const NEWS_FEEDS = [
    NEWS_PROXY + encodeURIComponent('https://www.pcgamer.com/rss/'),
    NEWS_PROXY + encodeURIComponent('https://feeds.feedburner.com/ign/games-all'),
    NEWS_PROXY + encodeURIComponent('https://www.eurogamer.net/?format=rss'),
  ];

  const CREATOR_ITEMS = [
    { name: 'Deal Radar', tag: 'Discount analyst', desc: 'Tracks deep cuts, flash sales, and grey-market warnings.' },
    { name: 'Patch Sync', tag: 'Release watcher', desc: 'Pairs price drops with content updates and launch windows.' },
    { name: 'Budget XP', tag: 'Value curator', desc: 'Focuses on sub-$10 games, bundles, and free weekends.' },
    { name: 'Frame Drop', tag: 'PC editor', desc: 'Highlights performance-friendly picks and store comparisons.' },
    { name: 'Console Pulse', tag: 'Platform scout', desc: 'Surfaces PlayStation, Xbox, and Nintendo discounts fast.' },
  ];

  const PLATFORM_TABS = [
    { id: 'pc', label: 'Windows' },
    { id: 'playstation', label: 'PlayStation' },
    { id: 'xbox', label: 'Xbox' },
    { id: 'nintendo', label: 'Nintendo' },
    { id: 'android', label: 'Android' },
  ];

  let initialized = false;
  let platformShelves = {
    pc: [],
    playstation: [],
    xbox: [],
    nintendo: [],
    android: [],
  };
  let activePlatform = 'pc';

  function openTab(tabName) {
    if (!tabName) return;
    if (typeof AppModule !== 'undefined' && AppModule.switchTab) {
      AppModule.switchTab(tabName);
      return;
    }
    document.querySelector(`.nav-tab[data-tab="${tabName}"]`)?.click();
  }

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function formatMoney(value) {
    if (typeof CurrencyModule !== 'undefined' && CurrencyModule.formatConverted) {
      return CurrencyModule.formatConverted(value);
    }
    return formatPrice(value);
  }

  function createDealPoster(deal, options = {}) {
    const savings = Math.round(parseFloat(deal.savings) || 0);
    const storeName = typeof DealsModule !== 'undefined' && DealsModule.getStoreName
      ? DealsModule.getStoreName(deal.storeID)
      : `Store ${deal.storeID}`;

    return `
      <a class="launcher-poster-card ${options.compact ? 'compact' : ''}" href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener noreferrer">
        <div class="launcher-poster-media">
          <img src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" loading="lazy">
          <span class="launcher-poster-badge">${options.badge || `-${savings}%`}</span>
        </div>
        <div class="launcher-poster-body">
          <h3 class="launcher-poster-title">${escapeHtml(truncate(deal.title, 46))}</h3>
          <div class="launcher-poster-meta">
            <span>${escapeHtml(storeName)}</span>
            <span>Score ${(parseFloat(deal.dealRating) || 0).toFixed(1)}</span>
          </div>
          <div class="launcher-poster-price">
            <span class="launcher-poster-sale">${formatMoney(deal.salePrice)}</span>
            ${parseFloat(deal.normalPrice) > 0 ? `<span class="launcher-poster-original">${formatMoney(deal.normalPrice)}</span>` : ''}
          </div>
        </div>
      </a>
    `;
  }

  function createFreebiePoster(item) {
    const worth = item.worth && item.worth !== 'N/A' ? item.worth : 'Free';
    const platforms = (item.platforms || '').split(',').slice(0, 2).join(' • ') || 'PC';
    return `
      <a class="launcher-poster-card compact freebie" href="${escapeHtml(item.open_giveaway_url || '#')}" target="_blank" rel="noopener noreferrer">
        <div class="launcher-poster-media">
          <img src="${escapeHtml(item.image || item.thumbnail || '')}" alt="${escapeHtml(item.title)}" loading="lazy">
          <span class="launcher-poster-badge">FREE</span>
        </div>
        <div class="launcher-poster-body">
          <h3 class="launcher-poster-title">${escapeHtml(truncate(item.title, 42))}</h3>
          <div class="launcher-poster-meta">
            <span>${escapeHtml(platforms)}</span>
            <span>${escapeHtml(item.type || 'Game')}</span>
          </div>
          <div class="launcher-poster-price">
            <span class="launcher-poster-sale">${escapeHtml(worth)}</span>
          </div>
        </div>
      </a>
    `;
  }

  function createNewsListItem(article) {
    const source = article.source || 'Gaming News';
    const pubDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString() : '';
    return `
      <a class="launcher-news-item" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">
        <div class="launcher-news-copy">
          <span class="launcher-news-source">${escapeHtml(source)}</span>
          <h3 class="launcher-news-title">${escapeHtml(truncate(article.title, 88))}</h3>
          <span class="launcher-news-date">${escapeHtml(pubDate)}</span>
        </div>
      </a>
    `;
  }

  function createFeatureStory(article) {
    const image = article.thumbnail || article.enclosure?.link || '';
    const dateLabel = article.pubDate ? new Date(article.pubDate).toLocaleDateString() : 'Now';
    return `
      <a class="launcher-story-card" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">
        <div class="launcher-story-media" ${image ? `style="background-image:url('${escapeHtml(image)}')"` : ''}></div>
        <div class="launcher-story-overlay">
          <span class="launcher-story-kicker">${escapeHtml(article.source || 'Featured news')}</span>
          <h3 class="launcher-story-title">${escapeHtml(truncate(article.title, 82))}</h3>
          <p class="launcher-story-meta">${escapeHtml(dateLabel)} • Read the full story</p>
        </div>
      </a>
    `;
  }

  function createCreatorItem(item, index) {
    const initials = item.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
    return `
      <div class="launcher-creator-item">
        <div class="launcher-creator-avatar launcher-creator-avatar-${(index % 5) + 1}">${escapeHtml(initials)}</div>
        <div class="launcher-creator-copy">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.tag)}</span>
          <p>${escapeHtml(item.desc)}</p>
        </div>
      </div>
    `;
  }

  function renderCreators() {
    setHTML('home-creators-list', CREATOR_ITEMS.map(createCreatorItem).join(''));
  }

  function bindHeroSearch() {
    const proxy = document.getElementById('hero-search-proxy');
    const input = document.getElementById('search-input');
    if (!proxy || !input || proxy.dataset.bound === '1') return;
    proxy.dataset.bound = '1';

    proxy.addEventListener('input', () => {
      input.value = proxy.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    proxy.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('deals-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function renderRecommended(deals) {
    const grid = document.getElementById('home-recommended-grid');
    if (!grid) return;

    if (!Array.isArray(deals) || deals.length === 0) {
      grid.innerHTML = '<div class="launcher-empty-state"><p>Recommendations will appear once live deals finish syncing.</p></div>';
      return;
    }

    let items = [];
    if (typeof RecommendationsModule !== 'undefined' && RecommendationsModule.getRecommendations) {
      items = RecommendationsModule.getRecommendations(deals);
    }
    if (!items.length) {
      items = deals.slice().sort((a, b) => (parseFloat(b.savings) || 0) - (parseFloat(a.savings) || 0)).slice(0, 5);
    }
    grid.innerHTML = items.slice(0, 5).map(deal => createDealPoster(deal, { compact: true, badge: 'REC' })).join('');
  }

  function bindLauncherActions() {
    document.querySelectorAll('[data-launcher-tab]').forEach(button => {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => openTab(button.dataset.launcherTab));
    });
  }

  function renderPlatformTabs() {
    const tabs = document.getElementById('home-platform-tabs');
    if (!tabs) return;

    tabs.innerHTML = PLATFORM_TABS.map(tab => `
      <button class="launcher-platform-tab ${tab.id === activePlatform ? 'active' : ''}" data-platform="${tab.id}">
        ${escapeHtml(tab.label)}
      </button>
    `).join('');

    tabs.querySelectorAll('.launcher-platform-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activePlatform = btn.dataset.platform;
        renderPlatformTabs();
        renderPlatformShelf();
      });
    });
  }

  function renderPlatformShelf() {
    const items = platformShelves[activePlatform] || [];
    const grid = document.getElementById('home-platform-grid');
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = `
        <div class="launcher-empty-state">
          <p>Platform deals are syncing. Try another shelf in a moment.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => item.kind === 'freebie'
      ? createFreebiePoster(item.data)
      : createDealPoster(item.data, { compact: true, badge: item.badge })
    ).join('');
  }

  async function fetchConsoleShelf(storeID, badge) {
    const deals = await fetchJSON(`${CHEAPSHARK_BASE}/deals?storeID=${storeID}&pageSize=6&sortBy=DealRating&desc=1`);
    return deals.slice(0, 5).map(item => ({ kind: 'deal', badge, data: item }));
  }

  async function fetchAndroidShelf() {
    const freebies = await fetchJSON(`${GAMERPOWER_BASE}/giveaways?platform=android&sort-by=popularity`);
    if (!Array.isArray(freebies)) return [];
    return freebies.slice(0, 5).map(item => ({ kind: 'freebie', badge: 'FREE', data: item }));
  }

  async function loadPlatformShelves(deals) {
    platformShelves.pc = deals.slice(0, 5).map(item => ({ kind: 'deal', badge: 'PC', data: item }));
    renderPlatformShelf();

    const [ps, xbox, nintendo, android] = await Promise.allSettled([
      fetchConsoleShelf(35, 'PS'),
      fetchConsoleShelf(11, 'XBOX'),
      fetchConsoleShelf(30, 'NS'),
      fetchAndroidShelf(),
    ]);

    platformShelves.playstation = ps.status === 'fulfilled' ? ps.value : [];
    platformShelves.xbox = xbox.status === 'fulfilled' ? xbox.value : [];
    platformShelves.nintendo = nintendo.status === 'fulfilled' ? nintendo.value : [];
    platformShelves.android = android.status === 'fulfilled' ? android.value : [];
    renderPlatformShelf();
  }

  async function renderFreebiesShelf() {
    const grid = document.getElementById('home-freebies-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="launcher-inline-loading">Loading free games...</div>';

    try {
      const freebies = await fetchJSON(`${GAMERPOWER_BASE}/giveaways?platform=pc&sort-by=popularity`);
      if (!Array.isArray(freebies) || !freebies.length) {
        grid.innerHTML = '<div class="launcher-empty-state"><p>No freebies available right now.</p></div>';
        return;
      }
      grid.innerHTML = freebies.slice(0, 4).map(createFreebiePoster).join('');
    } catch (_) {
      grid.innerHTML = '<div class="launcher-empty-state"><p>Free games are temporarily unavailable.</p></div>';
    }
  }

  async function renderNewsShelves() {
    const newsGrid = document.getElementById('home-news-grid');
    const featureStory = document.getElementById('home-feature-story');
    if (!newsGrid || !featureStory) return;

    newsGrid.innerHTML = '<div class="launcher-inline-loading">Loading highlighted news...</div>';

    try {
      const results = await Promise.allSettled(NEWS_FEEDS.map(url => fetchJSON(url)));
      const items = results
        .filter(result => result.status === 'fulfilled' && Array.isArray(result.value?.items))
        .flatMap(result => result.value.items.slice(0, 4))
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, 5)
        .map(item => ({ ...item, source: item.author || item.categories?.[0] || 'Gaming News' }));

      if (!items.length) {
        newsGrid.innerHTML = '<div class="launcher-empty-state"><p>News preview is temporarily unavailable.</p></div>';
        featureStory.innerHTML = '';
        return;
      }

      featureStory.innerHTML = createFeatureStory(items[0]);
      newsGrid.innerHTML = items.slice(1, 5).map(createNewsListItem).join('');
    } catch (_) {
      newsGrid.innerHTML = '<div class="launcher-empty-state"><p>News preview is temporarily unavailable.</p></div>';
      featureStory.innerHTML = '';
    }
  }

  function handleDealsUpdated(event) {
    const deals = event.detail?.deals || (typeof DealsModule !== 'undefined' && DealsModule.getLoadedDeals ? DealsModule.getLoadedDeals() : []);
    if (!deals.length) return;
    renderRecommended(deals);
    loadPlatformShelves(deals);
  }

  function init() {
    if (initialized) return;
    initialized = true;

    bindHeroSearch();
    bindLauncherActions();
    renderCreators();
    renderPlatformTabs();
    renderPlatformShelf();
    renderFreebiesShelf();
    renderNewsShelves();
    document.addEventListener('deals:updated', handleDealsUpdated);

    const initialDeals = typeof DealsModule !== 'undefined' && DealsModule.getLoadedDeals
      ? DealsModule.getLoadedDeals()
      : [];
    if (initialDeals.length) {
      renderRecommended(initialDeals);
      loadPlatformShelves(initialDeals);
    }
  }

  function refresh() {
    bindHeroSearch();
    bindLauncherActions();
    const deals = typeof DealsModule !== 'undefined' && DealsModule.getLoadedDeals
      ? DealsModule.getLoadedDeals()
      : [];
    if (deals.length) {
      renderRecommended(deals);
      loadPlatformShelves(deals);
    }
  }

  return { init, refresh };
})();
