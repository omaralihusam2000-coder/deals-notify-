/**
 * console-deals.js — Console Deals Tab (PS5, Xbox, Nintendo)
 * Uses CheapShark API filtered by console-related stores.
 * Store IDs from CheapShark:
 *   PlayStation Store = 35, Xbox Store = 11, Nintendo eShop = 30
 */

const ConsoleDealsModule = (() => {
  const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';
  const CHEAPSHARK_REDIRECT = 'https://www.cheapshark.com/redirect?dealID=';

  // Platform configs — storeID 0 means "all", otherwise filter by storeID
  const PLATFORMS = [
    { id: 'all',       label: 'All Consoles', emoji: '🎮', storeIDs: [35, 11, 30], color: '#00d4ff' },
    { id: 'ps',        label: 'PlayStation',  emoji: '🟦', storeIDs: [35],         color: '#003087' },
    { id: 'xbox',      label: 'Xbox',         emoji: '🟩', storeIDs: [11],         color: '#107c10' },
    { id: 'nintendo',  label: 'Nintendo',     emoji: '🔴', storeIDs: [30],         color: '#e4000f' },
  ];

  // Curated console deal keywords (fallback enrichment)
  const CONSOLE_KEYWORDS = ['PlayStation', 'PS4', 'PS5', 'Xbox', 'Nintendo', 'Switch', 'Forza', 'Halo', 'God of War', 'Horizon', 'Mario', 'Zelda'];

  let activeFilter = 'all';
  let allDeals = [];
  let isLoading = false;

  function getContainer() { return document.getElementById('console-deals-grid'); }

  async function fetchConsoleDealsByStore(storeID) {
    const params = new URLSearchParams({
      storeID,
      pageSize: 20,
      sortBy: 'DealRating',
      desc: 1,
    });
    const deals = await fetchJSON(`${CHEAPSHARK_BASE}/deals?${params}`);
    return deals.map(d => ({ ...d, consolePlatform: getPlatformFromStoreID(String(storeID)) }));
  }

  function getPlatformFromStoreID(storeID) {
    if (storeID === '35') return 'PlayStation';
    if (storeID === '11') return 'Xbox';
    if (storeID === '30') return 'Nintendo';
    return 'Console';
  }

  function getPlatformColor(platform) {
    if (platform === 'PlayStation') return '#003087';
    if (platform === 'Xbox') return '#107c10';
    if (platform === 'Nintendo') return '#e4000f';
    return '#00d4ff';
  }

  async function fetchAllDeals() {
    if (isLoading) return;
    isLoading = true;
    const container = getContainer();
    if (!container) { isLoading = false; return; }

    showSkeletons(container, 8);

    try {
      // Fetch all three platforms in parallel
      const [psDeals, xboxDeals, ninDeals] = await Promise.allSettled([
        fetchConsoleDealsByStore(35),
        fetchConsoleDealsByStore(11),
        fetchConsoleDealsByStore(30),
      ]);

      allDeals = [
        ...(psDeals.status === 'fulfilled' ? psDeals.value : []),
        ...(xboxDeals.status === 'fulfilled' ? xboxDeals.value : []),
        ...(ninDeals.status === 'fulfilled' ? ninDeals.value : []),
      ];

      renderDeals();
    } catch (err) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>Failed to load console deals. ${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="ConsoleDealsModule.init()">Try Again</button>
        </div>`;
    } finally {
      isLoading = false;
    }
  }

  function renderDeals() {
    const container = getContainer();
    if (!container) return;

    let filtered = allDeals;
    if (activeFilter !== 'all') {
      const platform = PLATFORMS.find(p => p.id === activeFilter);
      if (platform) {
        filtered = allDeals.filter(d => platform.storeIDs.includes(parseInt(d.storeID)));
      }
    }

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <p>No console deals found for this platform.</p>
        </div>`;
      return;
    }

    filtered.forEach(deal => {
      container.appendChild(createConsoleCard(deal));
    });
  }

  function createConsoleCard(deal) {
    const card = document.createElement('div');
    card.className = 'card deal-card console-card';
    const savings = parseFloat(deal.savings) || 0;
    const platform = deal.consolePlatform || getPlatformFromStoreID(String(deal.storeID));
    const platformColor = getPlatformColor(platform);
    const isWishlisted = typeof WishlistModule !== 'undefined' && WishlistModule.isWishlisted(deal.gameID);

    card.innerHTML = `
      <div class="card-badge discount-badge">-${Math.round(savings)}%</div>
      <span class="console-platform-badge" style="background:${platformColor}">${escapeHtml(platform)}</span>
      <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" aria-label="Wishlist" data-game-id="${escapeHtml(deal.gameID)}" data-game-title="${escapeHtml(deal.title)}">
        ${isWishlisted ? '★' : '☆'}
      </button>
      <img class="card-img" src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22100%22><rect fill=%22%231a1a2e%22 width=%22200%22 height=%22100%22/><text fill=%22%2300d4ff%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎮</text></svg>'">
      <div class="card-body">
        <h3 class="card-title" title="${escapeHtml(deal.title)}">${escapeHtml(truncate(deal.title, 50))}</h3>
        <div class="card-prices">
          <span class="price-sale">$${parseFloat(deal.salePrice).toFixed(2)}</span>
          ${parseFloat(deal.normalPrice) > 0 ? `<span class="price-original">$${parseFloat(deal.normalPrice).toFixed(2)}</span>` : ''}
        </div>
        <div class="card-footer">
          <span class="store-name">${escapeHtml(platform)}</span>
          <a class="btn btn-sm btn-primary" href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener noreferrer">
            ${typeof t === 'function' ? t('get_deal') : 'Get Deal'}
          </a>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost btn-xs btn-share-console">📤 Share</button>
          <button class="btn btn-ghost btn-xs btn-history-console" data-gameid="${escapeHtml(deal.gameID)}" data-title="${escapeHtml(deal.title)}">📊 History</button>
        </div>
      </div>
    `;

    // Wishlist
    card.querySelector('.wishlist-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof WishlistModule !== 'undefined') {
        WishlistModule.toggle(deal.gameID, deal.title, deal.thumb, deal.salePrice);
        const btn = card.querySelector('.wishlist-btn');
        const isNow = WishlistModule.isWishlisted(deal.gameID);
        btn.classList.toggle('active', isNow);
        btn.textContent = isNow ? '★' : '☆';
      }
    });

    // Share
    card.querySelector('.btn-share-console').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof ShareModule !== 'undefined') ShareModule.shareDeal(deal);
    });

    // History
    card.querySelector('.btn-history-console').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof ChartsModule !== 'undefined') {
        ChartsModule.showPriceHistory(deal.gameID, deal.title);
      }
    });

    // Open detail modal on card click
    card.addEventListener('click', () => {
      if (typeof GameDetailModule !== 'undefined') GameDetailModule.open(deal);
    });

    return card;
  }

  function buildFilterChips() {
    const container = document.getElementById('console-platform-filters');
    if (!container) return;

    container.innerHTML = PLATFORMS.map(p => `
      <button class="filter-chip ${p.id === activeFilter ? 'active' : ''}" data-platform="${p.id}">
        ${p.emoji} ${p.label}
      </button>
    `).join('');

    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.platform;
        renderDeals();
      });
    });
  }

  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;
    buildFilterChips();
    fetchAllDeals();
  }

  return { init };
})();
