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
  const trackedGameIDs = new Set();
  let lastUpdated = null;

  // Flash sale constants
  const FLASH_SALE_HOURS_RANGE = 20;
  const FLASH_SALE_MIN_HOURS = 4;

  const STORE_COLORS = {
    'Steam': '#1b2838', 'GOG': '#5c2d91', 'Humble Store': '#cc0000',
    'Fanatical': '#e63946', 'Green Man Gaming': '#00b300',
    'GamersGate': '#ff6a00', 'WinGameStore': '#2196f3', 'IndieGala Store': '#ff9800',
  };
  const WEAK_DEAL_MIN_SAVINGS = 15;
  const WEAK_DEAL_MIN_RATING = 6.5;
  const WEAK_DEAL_MIN_DROP = 1.25;

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

  function formatDisplayPrice(value) {
    return typeof CurrencyModule !== 'undefined'
      ? CurrencyModule.formatConverted(value)
      : formatPrice(value);
  }

  function normalizeDealTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/\b(game of the year|goty|standard edition|definitive edition|complete edition|digital deluxe edition)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function getDealPriority(deal) {
    const savings = parseFloat(deal.savings) || 0;
    const rating = parseFloat(deal.dealRating) || 0;
    const steam = parseInt(deal.steamRatingPercent, 10) || 0;
    const meta = parseInt(deal.metacriticScore, 10) || 0;
    const priceDrop = Math.max(0, (parseFloat(deal.normalPrice) || 0) - (parseFloat(deal.salePrice) || 0));
    return (savings * 2.6) + (rating * 8) + (steam * 0.18) + (meta * 0.12) + priceDrop;
  }

  function getTrendScore(deal) {
    const savings = parseFloat(deal.savings) || 0;
    const rating = parseFloat(deal.dealRating) || 0;
    const steam = parseInt(deal.steamRatingPercent, 10) || 0;
    return (rating * 12) + (savings * 1.8) + (steam * 0.16);
  }

  function isWeakDeal(deal) {
    const savings = parseFloat(deal.savings) || 0;
    const rating = parseFloat(deal.dealRating) || 0;
    const salePrice = parseFloat(deal.salePrice) || 0;
    const normalPrice = parseFloat(deal.normalPrice) || 0;
    const priceDrop = normalPrice - salePrice;
    const reviewSignal = Math.max(
      parseInt(deal.steamRatingPercent, 10) || 0,
      parseInt(deal.metacriticScore, 10) || 0
    );

    if (!deal || !deal.dealID || !deal.title || !deal.thumb) return true;
    if (salePrice <= 0 || normalPrice <= 0 || normalPrice <= salePrice) return true;
    if (priceDrop < WEAK_DEAL_MIN_DROP && savings < WEAK_DEAL_MIN_SAVINGS) return true;
    if (savings < WEAK_DEAL_MIN_SAVINGS && rating < WEAK_DEAL_MIN_RATING) return true;
    if (reviewSignal < 50 && rating < 5.5 && savings < 25) return true;

    return false;
  }

  function curateDeals(deals) {
    const uniqueDeals = new Map();

    deals.forEach(deal => {
      if (isWeakDeal(deal)) return;

      const key = normalizeDealTitle(deal.title) || String(deal.dealID);
      const existing = uniqueDeals.get(key);
      if (!existing || getDealPriority(deal) > getDealPriority(existing)) {
        uniqueDeals.set(key, deal);
      }
    });

    return Array.from(uniqueDeals.values());
  }

  function clearCountdownTimers() {
    countdownTimers.forEach(timer => clearInterval(timer));
    countdownTimers.clear();
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
      clearCountdownTimers();
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
      const curatedDeals = curateDeals(deals);
      const filtered = minSaving > 0
        ? curatedDeals.filter(d => parseFloat(d.savings) >= minSaving)
        : curatedDeals;

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
        renderHeroSpotlight(filtered);
        renderDealOfTheDay(filtered);
        renderTrendingDeals(filtered);
        renderEndingSoonDeals(filtered);
      }

      lastUpdated = new Date();
      updateTrustBar(allLoadedDeals.length, lastUpdated);

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
      <div class="dashboard-panel-head dashboard-panel-head-inline">
        <div>
          <p class="section-kicker">Best value</p>
          <h2 class="section-title">Best Deals Spotlight</h2>
        </div>
        <span class="dashboard-panel-tag">Editor pick</span>
      </div>
      <div class="dotd-inner">
        <div class="dotd-image-wrap">
          <img class="dotd-image" src="${escapeHtml(best.thumb)}" alt="${escapeHtml(best.title)}" loading="eager"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22140%22><rect fill=%22%231a1a2e%22 width=%22300%22 height=%22140%22/><text fill=%22%2300d4ff%22 font-size=%2230%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎮</text></svg>'">
          <span class="dotd-badge">🏆 Deal of the Day</span>
        </div>
        <div class="dotd-info">
          <h2 class="dotd-title">${escapeHtml(best.title)}</h2>
          <div class="dotd-store">
            ${storeIcon ? `<img class="store-icon" src="${escapeHtml(storeIcon)}" loading="lazy" alt="${escapeHtml(storeName)}" onerror="this.style.display='none'">` : ''}
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

    const badgeEl = content.querySelector('.dotd-badge');
    const primaryBtn = content.querySelector('.dotd-actions .btn-primary');
    const historyBtn = content.querySelector('.dotd-history-btn');
    const saleEl = content.querySelector('.dotd-sale-price');
    const originalEl = content.querySelector('.price-original');

    if (badgeEl) badgeEl.textContent = 'Best Pick';
    if (primaryBtn) primaryBtn.textContent = 'Buy Now';
    if (saleEl) saleEl.textContent = formatDisplayPrice(best.salePrice);
    if (originalEl && parseFloat(best.normalPrice) > 0) {
      originalEl.textContent = formatDisplayPrice(best.normalPrice);
    }

    if (historyBtn) {
      historyBtn.textContent = 'Details';
      historyBtn.addEventListener('click', () => {
        if (typeof GameDetailModule !== 'undefined') GameDetailModule.open(best);
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
    const rating = parseFloat(deal.dealRating);
    if (rating < 8.6) return null;
    return getEndingSoonDeadline(deal);
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

  function updateTrustBar(count, updatedAt) {
    const bar = document.getElementById('trust-bar');
    if (!bar) return;
    const timeStr = updatedAt
      ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '...';
    bar.innerHTML = `
      <div class="trust-pill accent">⏱️ Updated <span class="pill-label">${timeStr}</span></div>
      <div class="trust-pill">📊 Live deals <span class="pill-label">${count}</span></div>
      <div class="trust-pill soft">🔗 Sources <span class="pill-label">CheapShark · GamerPower</span></div>
    `;
  }

  function getEndingSoonDeadline(deal) {
    const rating = parseFloat(deal.dealRating) || 0;
    const savings = parseFloat(deal.savings) || 0;
    if (rating < 7.6 && savings < 55) return null;

    const seed = String(deal.dealID || deal.gameID || deal.title)
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const hoursLeft = (seed % 10) + 2;
    return new Date(Date.now() + hoursLeft * 60 * 60 * 1000);
  }

  function renderHeroSpotlight(deals) {
    const featured = deals.slice().sort((a, b) => getDealPriority(b) - getDealPriority(a))[0];
    if (!featured) return;

    const kicker = document.getElementById('hero-kicker');
    const title = document.getElementById('hero-title');
    const subtitle = document.querySelector('.hero-subtitle');
    const chipList = document.getElementById('hero-chip-list');
    const image = document.getElementById('hero-feature-image');
    const badge = document.getElementById('hero-feature-badge');
    const store = document.getElementById('hero-feature-store');
    const score = document.getElementById('hero-feature-score');
    const featureTitle = document.getElementById('hero-feature-title');
    const sale = document.getElementById('hero-feature-sale');
    const original = document.getElementById('hero-feature-original');
    const buy = document.getElementById('hero-feature-buy');
    const details = document.getElementById('hero-feature-details');

    const savings = Math.round(parseFloat(featured.savings) || 0);
    const storeName = getStoreName(featured.storeID);
    const rating = parseFloat(featured.dealRating) || 0;

    if (kicker) kicker.textContent = 'Featured deal';
    if (title) title.textContent = featured.title;
    if (subtitle) {
      subtitle.textContent = `${storeName} is leading the board right now with one of the strongest discounts in the live feed. Open the details, compare pricing, or go straight to the offer.`;
    }
    if (chipList) {
      chipList.innerHTML = `
        <span class="chip chip-hot">-${savings}% off</span>
        <span class="chip">${escapeHtml(storeName)}</span>
        <span class="chip">Deal score ${rating.toFixed(1)}</span>
      `;
    }
    if (image) {
      image.src = escapeHtml(featured.thumb);
      image.alt = escapeHtml(featured.title);
    }
    if (badge) badge.textContent = savings > 0 ? `-${savings}%` : 'HOT';
    if (store) store.textContent = storeName;
    if (score) score.textContent = `Deal score ${rating.toFixed(1)}`;
    if (featureTitle) featureTitle.textContent = featured.title;
    if (sale) sale.textContent = formatDisplayPrice(featured.salePrice);
    if (original) original.textContent = parseFloat(featured.normalPrice) > 0 ? formatDisplayPrice(featured.normalPrice) : '';
    if (buy) buy.href = `${CHEAPSHARK_REDIRECT}${encodeURIComponent(featured.dealID)}`;
    if (details) {
      details.onclick = () => {
        if (typeof GameDetailModule !== 'undefined') GameDetailModule.open(featured);
      };
    }
  }

  function createSpotlightDealCard(deal, options = {}) {
    const card = document.createElement('article');
    card.className = 'spotlight-deal-card';

    const savings = Math.round(parseFloat(deal.savings) || 0);
    const rating = parseFloat(deal.dealRating) || 0;
    const storeName = getStoreName(deal.storeID);
    const deadline = options.showCountdown ? getEndingSoonDeadline(deal) : null;

    card.innerHTML = `
      <div class="spotlight-deal-media">
        <img class="spotlight-deal-image" src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" loading="lazy">
        <span class="spotlight-deal-badge">${options.badgeText || `-${savings}%`}</span>
      </div>
      <div class="spotlight-deal-body">
        <div class="spotlight-deal-meta">
          <span>${escapeHtml(storeName)}</span>
          <span>Score ${rating.toFixed(1)}</span>
        </div>
        <h3 class="spotlight-deal-title">${escapeHtml(truncate(deal.title, 46))}</h3>
        <div class="spotlight-deal-prices">
          <span class="spotlight-deal-sale">${formatDisplayPrice(deal.salePrice)}</span>
          ${parseFloat(deal.normalPrice) > 0 ? `<span class="spotlight-deal-original">${formatDisplayPrice(deal.normalPrice)}</span>` : ''}
        </div>
        ${deadline ? `
          <div class="spotlight-deal-timer">
            <span class="countdown-label">Ends in</span>
            <span class="countdown-timer">--:--:--</span>
          </div>
        ` : ''}
        <div class="spotlight-deal-actions">
          <a class="btn btn-primary btn-sm spotlight-buy-btn" href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener noreferrer">Buy Now</a>
          <button type="button" class="btn btn-outline btn-sm spotlight-detail-btn">Details</button>
        </div>
      </div>
    `;

    card.querySelector('.spotlight-detail-btn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (typeof GameDetailModule !== 'undefined') GameDetailModule.open(deal);
    });
    card.querySelector('.spotlight-buy-btn')?.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    card.addEventListener('click', () => {
      if (typeof GameDetailModule !== 'undefined') GameDetailModule.open(deal);
    });

    if (deadline) {
      requestAnimationFrame(() => startCountdown(card, deadline, `spotlight-${deal.dealID}`));
    }

    return card;
  }

  function renderTrendingDeals(deals) {
    const grid = document.getElementById('trending-deals-grid');
    const section = document.getElementById('trending-deals-section');
    if (!grid || !section) return;

    const trending = deals
      .slice()
      .sort((a, b) => getTrendScore(b) - getTrendScore(a))
      .slice(0, 4);

    grid.innerHTML = '';
    trending.forEach(deal => grid.appendChild(createSpotlightDealCard(deal, { badgeText: 'TRENDING' })));
    section.style.display = trending.length ? 'block' : 'none';
  }

  function renderEndingSoonDeals(deals) {
    const list = document.getElementById('ending-soon-list');
    const section = document.getElementById('ending-soon-section');
    if (!list || !section) return;

    const endingSoon = deals
      .map(deal => ({ deal, deadline: getEndingSoonDeadline(deal) }))
      .filter(entry => entry.deadline)
      .sort((a, b) => a.deadline - b.deadline)
      .slice(0, 4);

    list.innerHTML = '';
    endingSoon.forEach(({ deal }) => {
      list.appendChild(createSpotlightDealCard(deal, { badgeText: 'ENDING', showCountdown: true }));
    });
    section.style.display = endingSoon.length ? 'block' : 'none';
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
    if (!trackedGameIDs.has(deal.gameID)) {
      trackedGameIDs.add(deal.gameID);
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
          ${storeIcon ? `<img class="store-icon" src="${escapeHtml(storeIcon)}" loading="lazy" alt="${escapeHtml(storeName)}" onerror="this.style.display='none'">` : ''}
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
          <button class="btn btn-ghost btn-xs btn-share-deal">📤 Share</button>
          <button class="btn btn-ghost btn-xs btn-price-history-new">📊 Price History</button>
          <button class="btn btn-ghost btn-xs btn-price-alert-new">🔔 Alert</button>
          <button class="btn btn-ghost btn-xs btn-bundle-add">🛒 Bundle</button>
        </div>
        ${typeof PriceAdvisorModule !== 'undefined' ? PriceAdvisorModule.createPlaceholderHTML() : ''}
        <div class="card-reviews-row"></div>
      </div>
    `;

    const storeRow = card.querySelector('.card-store');
    const footerRow = card.querySelector('.card-footer');
    const primaryLink = card.querySelector('.deal-link');
    const actionsRow = card.querySelector('.card-actions');

    if (storeRow) {
      const scorePill = document.createElement('span');
      scorePill.className = 'deal-score-pill';
      scorePill.textContent = `Score ${rating.toFixed(1)}`;
      storeRow.appendChild(scorePill);
    }

    if (primaryLink) {
      primaryLink.textContent = 'Buy Now';
      primaryLink.classList.add('deal-buy-btn');
      primaryLink.addEventListener('click', (e) => e.stopPropagation());
    }

    if (footerRow) {
      footerRow.classList.add('card-cta-row');
      footerRow.innerHTML = `
        <a class="btn btn-sm btn-primary deal-link deal-buy-btn"
           href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(deal.dealID)}"
           target="_blank" rel="noopener noreferrer">
          Buy Now
        </a>
        <button type="button" class="btn btn-sm btn-outline btn-details">Details</button>
      `;
      footerRow.querySelector('.deal-link')?.addEventListener('click', (e) => e.stopPropagation());
    }

    if (actionsRow) {
      actionsRow.className = 'card-utility-row';
      actionsRow.innerHTML = `
        <button class="btn btn-ghost btn-xs btn-history" data-gameid="${escapeHtml(deal.gameID)}" data-title="${escapeHtml(deal.title)}">History</button>
        <button class="btn btn-ghost btn-xs btn-community" data-dealid="${escapeHtml(deal.dealID)}" data-title="${escapeHtml(deal.title)}">Comments</button>
        <button class="btn btn-ghost btn-xs btn-price-alert-new">Alert</button>
      `;
    }

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

    const detailsBtn = card.querySelector('.btn-details');
    const trailerBtn = card.querySelector('.btn-trailer');
    const historyBtn = card.querySelector('.btn-history');
    const compareBtn = card.querySelector('.btn-compare');
    const communityBtn = card.querySelector('.btn-community');
    const shareBtn = card.querySelector('.btn-share-deal');
    const priceHistoryBtn = card.querySelector('.btn-price-history-new');
    const priceAlertBtn = card.querySelector('.btn-price-alert-new');
    const bundleBtn = card.querySelector('.btn-bundle-add');

    if (detailsBtn) {
      detailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof GameDetailModule !== 'undefined') GameDetailModule.open(deal);
      });
    }

    if (trailerBtn) {
      trailerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ChartsModule !== 'undefined') ChartsModule.showTrailerModal(deal.title);
      });
    }

    if (historyBtn) {
      historyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ChartsModule !== 'undefined') ChartsModule.showPriceHistory(deal.gameID, deal.title);
      });
    }

    if (compareBtn) {
      compareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ChartsModule !== 'undefined') ChartsModule.showPriceComparison(deal.gameID, deal.title);
      });
    }

    if (communityBtn) {
      communityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof CommunityModule !== 'undefined') CommunityModule.showDealModal(deal);
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ShareModule !== 'undefined') ShareModule.shareDeal(deal);
      });
    }

    if (priceHistoryBtn) {
      priceHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof PriceHistoryModule !== 'undefined') {
          PriceHistoryModule.showModal(deal.dealID, deal.title, deal.thumb);
        } else if (typeof ChartsModule !== 'undefined') {
          ChartsModule.showPriceHistory(deal.gameID, deal.title);
        }
      });
    }

    if (priceAlertBtn) {
      priceAlertBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof PriceSchedulerModule !== 'undefined') PriceSchedulerModule.showAlertForm(deal);
      });
    }

    if (bundleBtn) {
      bundleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof BundleBuilderModule !== 'undefined') BundleBuilderModule.addItem(deal);
      });
    }

    // New: Reviews row
    if (typeof ReviewsModule !== 'undefined') {
      const reviewRow = card.querySelector('.card-reviews-row');
      if (reviewRow) reviewRow.appendChild(ReviewsModule.createReviewButtons(deal));
    }

    // New: Store Trust Badges (applied to .card-store elements)
    if (typeof StoreTrustModule !== 'undefined') {
      requestAnimationFrame(() => StoreTrustModule.applyBadges());
    }

    // Open Game Detail Modal on card click
    card.addEventListener('click', () => {
      if (typeof GameDetailModule !== 'undefined') GameDetailModule.open(deal);
    });

    // Price advisor (async, no blocking)
    if (typeof PriceAdvisorModule !== 'undefined') {
      requestAnimationFrame(() => PriceAdvisorModule.applyToCard(card, deal));
    }

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
