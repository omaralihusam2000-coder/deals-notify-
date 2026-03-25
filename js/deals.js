/**
 * deals.js — CheapShark API integration
 * Handles fetching, rendering, searching, and filtering game deals
 */

const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';
const CHEAPSHARK_REDIRECT = 'https://www.cheapshark.com/redirect?dealID=';

const DealsModule = (() => {
  let currentPage = 0;
  let currentFilters = {};
  let storeList = [];
  let isLoading = false;
  let hasMore = true;
  let allLoadedDeals = [];
  const countdownTimers = new Map();

  const STORE_COLORS = {
    'Steam': '#1b2838', 'GOG': '#5c2d91', 'Humble Store': '#cc0000',
    'Fanatical': '#e63946', 'Green Man Gaming': '#00b300',
    'GamersGate': '#ff6a00', 'WinGameStore': '#2196f3', 'IndieGala Store': '#ff9800',
  };

  async function fetchStores() {
    try {
      const stores = await fetchJSON(`${CHEAPSHARK_BASE}/stores`);
      storeList = stores.filter(s => s.isActive === 1);
      return storeList;
    } catch (err) {
      console.error('Failed to fetch stores:', err);
      return [];
    }
  }

  function buildStoreFilter() {
    const select = document.getElementById('filter-store');
    if (!select) return;
    select.innerHTML = '<option value="">All Stores</option>';
    storeList.forEach(store => {
      const opt = document.createElement('option');
      opt.value = store.storeID;
      opt.textContent = store.storeName;
      select.appendChild(opt);
    });
  }

  function getStoreName(storeID) {
    const store = storeList.find(s => s.storeID === String(storeID));
    return store ? store.storeName : `Store ${storeID}`;
  }

  function getStoreIcon(storeID) {
    const store = storeList.find(s => s.storeID === String(storeID));
    if (store && store.images) {
      return `https://www.cheapshark.com${store.images.icon}`;
    }
    return '';
  }

  async function fetchDeals(reset = true) {
    if (isLoading) return;
    isLoading = true;

    const container = document.getElementById('deals-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!container) { isLoading = false; return; }

    if (reset) {
      currentPage = 0;
      hasMore = true;
      allLoadedDeals = [];
      showSkeletons(container, 8);
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else {
      const skeletonWrap = document.createElement('div');
      skeletonWrap.id = 'loading-more';
      skeletonWrap.innerHTML = Array(4).fill(skeletonCard()).join('');
      container.appendChild(skeletonWrap);
    }

    try {
      const params = new URLSearchParams({
        pageNumber: currentPage,
        pageSize: 12,
        sortBy: currentFilters.sortBy || 'DealRating',
        desc: 1,
        ...(currentFilters.storeID  ? { storeID: currentFilters.storeID }   : {}),
        ...(currentFilters.title    ? { title: currentFilters.title }        : {}),
        ...(currentFilters.maxPrice !== undefined ? { upperPrice: currentFilters.maxPrice } : {}),
        ...(currentFilters.minSaving ? { lowerPrice: 0, sortBy: 'Savings', minSteamRating: 0 } : {}),
      });

      const deals = await fetchJSON(`${CHEAPSHARK_BASE}/deals?${params}`);
      const loadingMore = document.getElementById('loading-more');
      if (loadingMore) loadingMore.remove();

      const minSaving = parseFloat(currentFilters.minSaving) || 0;
      const filtered = minSaving > 0
        ? deals.filter(d => parseFloat(d.savings) >= minSaving)
        : deals;

      if (reset) container.innerHTML = '';

      if (filtered.length === 0 && reset) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>No deals found matching your filters.</p>
            <button class="btn btn-primary" onclick="DealsModule.clearFilters()">Clear Filters</button>
          </div>`;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
      }

      filtered.forEach(deal => {
        container.appendChild(createDealCard(deal));
        allLoadedDeals.push(deal);
      });

      if (typeof NotificationsModule !== 'undefined') {
        NotificationsModule.checkDeals(filtered);
      }

      // Update recommendations after deals load
      if (typeof RecommendationsModule !== 'undefined' && reset) {
        RecommendationsModule.renderSection(allLoadedDeals);
      }

      // Render Deal of the Day on first load
      if (reset && filtered.length > 0) {
        renderDealOfTheDay(filtered);
      }

      hasMore = deals.length === 12;
      if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'block' : 'none';
      currentPage++;

    } catch (err) {
      const loadingMore = document.getElementById('loading-more');
      if (loadingMore) loadingMore.remove();
      if (reset) {
        container.innerHTML = `<div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>Failed to load deals. ${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="DealsModule.refresh()">Try Again</button>
        </div>`;
      }
      showToast(`Failed to load deals: ${err.message}`, 'error');
    } finally {
      isLoading = false;
    }
  }

  function renderDealOfTheDay(deals) {
    const section = document.getElementById('deal-of-day-section');
    const content = document.getElementById('deal-of-day-content');
    if (!section || !content) return;

    // Pick the deal with the highest rating
    const best = deals.reduce((a, b) =>
      parseFloat(b.dealRating) > parseFloat(a.dealRating) ? b : a, deals[0]);

    const savings = Math.round(parseFloat(best.savings) || 0);
    const storeName = getStoreName(best.storeID);
    const storeIcon = getStoreIcon(best.storeID);

    content.innerHTML = `
      <div class="dotd-inner">
        <div class="dotd-image-wrap">
          <img class="dotd-image" src="${escapeHtml(best.thumb)}" alt="${escapeHtml(best.title)}" loading="eager"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22140%22><rect fill=%22%231a1a2e%22 width=%22300%22 height=%22140%22/><text fill=%22%2300d4ff%22 font-size=%2230%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎮</text></svg>'">
          <span class="dotd-badge">🏆 Deal of the Day</span>
        </div>
        <div class="dotd-info">
          <h2 class="dotd-title">${escapeHtml(best.title)}</h2>
          <div class="dotd-store">
            ${storeIcon ? `<img class="store-icon" src="${escapeHtml(storeIcon)}" alt="${escapeHtml(storeName)}" onerror="this.style.display='none'">` : ''}
            <span>${escapeHtml(storeName)}</span>
          </div>
          <div class="dotd-prices">
            <span class="price-sale dotd-sale-price">$${parseFloat(best.salePrice).toFixed(2)}</span>
            ${parseFloat(best.normalPrice) > 0
              ? `<span class="price-original">$${parseFloat(best.normalPrice).toFixed(2)}</span>`
              : ''}
            <span class="badge badge-green dotd-savings">-${savings}%</span>
          </div>
          <div class="dotd-actions">
            <a class="btn btn-primary"
               href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(best.dealID)}"
               target="_blank" rel="noopener noreferrer">
              🔥 Get This Deal
            </a>
            <button class="btn btn-outline btn-sm dotd-history-btn"
                    data-gameid="${escapeHtml(best.gameID)}"
                    data-title="${escapeHtml(best.title)}">
              📊 Price History
            </button>
          </div>
        </div>
      </div>
    `;

    const historyBtn = content.querySelector('.dotd-history-btn');
    if (historyBtn && typeof ChartsModule !== 'undefined') {
      historyBtn.addEventListener('click', () => {
        ChartsModule.showPriceHistory(historyBtn.dataset.gameid, historyBtn.dataset.title);
      });
    }
    section.style.display = 'block';
  }

  function getMetacriticBadge(score) {
    const num = parseInt(score, 10);
    if (!num || num <= 0) return '';
    let cls = 'metacritic-red';
    if (num >= 75) cls = 'metacritic-green';
    else if (num >= 50) cls = 'metacritic-yellow';
    return `<span class="metacritic-badge ${cls}" title="Metacritic Score">MC: ${num}</span>`;
  }

  function getSteamRatingBadge(percent, count) {
    const num = parseInt(percent, 10);
    if (!num || num <= 0) return '';
    let label = '';
    if (num >= 95) label = 'Overwhelmingly Positive';
    else if (num >= 85) label = 'Very Positive';
    else if (num >= 70) label = 'Mostly Positive';
    else if (num >= 40) label = 'Mixed';
    else label = 'Mostly Negative';
    return `<span class="steam-rating-badge" title="Steam: ${label} (${count || '?'} reviews)">🟢 ${num}%</span>`;
  }

  function getFlashSaleCountdown(deal) {
    // CheapShark doesn't provide end dates; simulate a flash sale for top deals with rating > 9
    const rating = parseFloat(deal.dealRating);
    if (rating < 9) return null;

    // Use deal ID as seed for a deterministic "expires in X hours"
    const seed = deal.dealID.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const hoursLeft = (seed % 20) + 4; // 4–23 hours
    const endsAt = new Date(Date.now() + hoursLeft * 60 * 60 * 1000);
    return endsAt;
  }

  function startCountdown(card, endTime, dealID) {
    const el = card.querySelector('.countdown-timer');
    if (!el) return;

    function update() {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        el.textContent = 'Expired';
        clearInterval(timer);
        countdownTimers.delete(dealID);
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    update();
    const timer = setInterval(update, 1000);
    countdownTimers.set(dealID, timer);
  }

  function createDealCard(deal) {
    const card = document.createElement('div');
    card.className = 'card deal-card';
    card.dataset.dealId = deal.dealID;

    const savings = parseFloat(deal.savings) || 0;
    const storeName = getStoreName(deal.storeID);
    const storeIcon = getStoreIcon(deal.storeID);
    const rating = parseFloat(deal.dealRating) || 0;
    const isWishlisted = typeof WishlistModule !== 'undefined' && WishlistModule.isWishlisted(deal.gameID);
    const isOwned = typeof SteamImportModule !== 'undefined' && SteamImportModule.isOwned(deal.title);
    const metacriticBadge = getMetacriticBadge(deal.metacriticScore);
    const steamRatingBadge = getSteamRatingBadge(deal.steamRatingPercent, deal.steamRatingCount);
    const flashSaleEnd = getFlashSaleCountdown(deal);
    const isFlashSale = flashSaleEnd !== null;

  // Track view in recommendations — only once per unique gameID per session
  if (typeof RecommendationsModule !== 'undefined') {
    if (!createDealCard._tracked) createDealCard._tracked = new Set();
    if (!createDealCard._tracked.has(deal.gameID)) {
      createDealCard._tracked.add(deal.gameID);
      RecommendationsModule.trackView(deal);
    }
  }

    // Track view in gamification
    if (typeof GamificationModule !== 'undefined') {
      GamificationModule.recordEvent('view', {
        storeID: deal.storeID,
        normalPrice: deal.normalPrice,
        salePrice: deal.salePrice
      });
    }

    // Currency formatting
    const displayPrice = typeof CurrencyModule !== 'undefined'
      ? CurrencyModule.formatConverted(deal.salePrice)
      : formatPrice(deal.salePrice);
    const displayNormal = typeof CurrencyModule !== 'undefined'
      ? CurrencyModule.formatConverted(deal.normalPrice)
      : formatPrice(deal.normalPrice);

    card.innerHTML = `
      ${isFlashSale ? `<div class="flash-sale-banner">🔥 Flash Sale</div>` : ''}
      <div class="card-badge discount-badge">-${Math.round(savings)}%</div>
      ${isOwned ? '<div class="owned-badge">✅ Owned</div>' : ''}
      <button class="wishlist-btn ${isWishlisted ? 'active' : ''}"
              aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}"
              data-game-id="${escapeHtml(deal.gameID)}"
              data-game-title="${escapeHtml(deal.title)}">
        ${isWishlisted ? '★' : '☆'}
      </button>
      <img class="card-img"
           src="${escapeHtml(deal.thumb)}"
           alt="${escapeHtml(deal.title)}"
           loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22100%22><rect fill=%22%231a1a2e%22 width=%22200%22 height=%22100%22/><text fill=%22%2300d4ff%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎮</text></svg>'">
      <div class="card-body">
        <div class="card-badges-row">
          ${metacriticBadge}
          ${steamRatingBadge}
        </div>
        <h3 class="card-title" title="${escapeHtml(deal.title)}">${escapeHtml(truncate(deal.title, 50))}</h3>
        <div class="card-store">
          ${storeIcon ? `<img class="store-icon" src="${escapeHtml(storeIcon)}" alt="${escapeHtml(storeName)}" onerror="this.style.display='none'">` : ''}
          <span class="store-name">${escapeHtml(storeName)}</span>
        </div>
        <div class="card-prices">
          <span class="price-sale" data-usd-price="${escapeHtml(deal.salePrice)}">${displayPrice}</span>
          ${parseFloat(deal.normalPrice) > 0
            ? `<span class="price-original" data-usd-price="${escapeHtml(deal.normalPrice)}">${displayNormal}</span>`
            : ''}
        </div>
        ${isFlashSale ? `
          <div class="countdown-wrap">
            <span class="countdown-label">⏱️ Ends in:</span>
            <span class="countdown-timer">--:--:--</span>
          </div>
        ` : ''}
        <div class="card-footer">
          <div class="deal-rating" title="Deal Rating">
            <span class="rating-stars">${getRatingStars(rating)}</span>
            <span class="rating-num">${rating.toFixed(1)}</span>
          </div>
          <a class="btn btn-sm btn-primary deal-link"
             href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(deal.dealID)}"
             target="_blank" rel="noopener noreferrer">
            Get Deal
          </a>
        </div>
        ${typeof CommunityModule !== 'undefined' ? CommunityModule.renderVotingUI(deal.dealID) : ''}
        <div class="card-actions">
          <button class="btn btn-ghost btn-xs btn-trailer" data-title="${escapeHtml(deal.title)}">🎬 Trailer</button>
          <button class="btn btn-ghost btn-xs btn-history" data-gameid="${escapeHtml(deal.gameID)}" data-title="${escapeHtml(deal.title)}">📊 History</button>
          <button class="btn btn-ghost btn-xs btn-compare" data-gameid="${escapeHtml(deal.gameID)}" data-title="${escapeHtml(deal.title)}">🆚 Compare</button>
          <button class="btn btn-ghost btn-xs btn-community" data-dealid="${escapeHtml(deal.dealID)}" data-title="${escapeHtml(deal.title)}">💬 Community</button>
        </div>
      </div>
    `;

    // Wishlist button
    card.querySelector('.wishlist-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof WishlistModule !== 'undefined') {
        WishlistModule.toggle(deal.gameID, deal.title, deal.thumb, deal.salePrice);
        const btn = card.querySelector('.wishlist-btn');
        const isNowWishlisted = WishlistModule.isWishlisted(deal.gameID);
        btn.classList.toggle('active', isNowWishlisted);
        btn.textContent = isNowWishlisted ? '★' : '☆';
        btn.setAttribute('aria-label', isNowWishlisted ? 'Remove from wishlist' : 'Add to wishlist');
        if (isNowWishlisted && typeof GamificationModule !== 'undefined') {
          GamificationModule.recordEvent('wishlist_add');
        }
      }
    });

    // Voting buttons
    if (typeof CommunityModule !== 'undefined') {
      CommunityModule.bindVoteButtons(card, deal.dealID);
    }

    // Trailer button
    card.querySelector('.btn-trailer').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof ChartsModule !== 'undefined') {
        ChartsModule.showTrailerModal(deal.title);
      }
    });

    // Price History button
    card.querySelector('.btn-history').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof ChartsModule !== 'undefined') {
        ChartsModule.showPriceHistory(deal.gameID, deal.title);
      }
    });

    // Compare button
    card.querySelector('.btn-compare').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof ChartsModule !== 'undefined') {
        ChartsModule.showPriceComparison(deal.gameID, deal.title);
      }
    });

    // Community button
    card.querySelector('.btn-community').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof CommunityModule !== 'undefined') {
        CommunityModule.showDealModal(deal);
      }
    });

    // Start countdown timer if flash sale
    if (isFlashSale) {
      requestAnimationFrame(() => startCountdown(card, flashSaleEnd, deal.dealID));
    }

    return card;
  }

  function getRatingStars(rating) {
    const stars = Math.round(rating / 2);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }

  function applyFilters(filters) {
    currentFilters = { ...currentFilters, ...filters };
    fetchDeals(true);
  }

  function clearFilters() {
    currentFilters = {};
    const form = document.getElementById('deals-filter-form');
    if (form) form.reset();
    fetchDeals(true);
  }

  function refresh() { fetchDeals(true); }
  function loadMore() { fetchDeals(false); }

  async function init() {
    await fetchStores();
    buildStoreFilter();
    await fetchDeals(true);
    bindEvents();
  }

  function bindEvents() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        applyFilters({ title: e.target.value.trim() });
      }, 600));
    }

    const filterForm = document.getElementById('deals-filter-form');
    if (filterForm) {
      filterForm.addEventListener('change', () => {
        const data = new FormData(filterForm);
        applyFilters({
          storeID:   data.get('store') || '',
          maxPrice:  data.get('max-price') || undefined,
          minSaving: data.get('min-saving') || 0,
          sortBy:    data.get('sort-by') || 'DealRating',
        });
      });
    }

    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMore);
  }

  return { init, refresh, loadMore, applyFilters, clearFilters, getStoreName, getStoreIcon, storeList: () => storeList };
})();
