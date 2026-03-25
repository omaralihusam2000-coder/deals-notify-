/**
 * deals.js — CheapShark API integration
 * Handles fetching, rendering, searching, and filtering game deals
 */

const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';
const CHEAPSHARK_REDIRECT = 'https://www.cheapshark.com/redirect?dealID=';

// Module state
const DealsModule = (() => {
  let currentPage = 0;
  let currentFilters = {};
  let storeList = [];
  let isLoading = false;
  let hasMore = true;

  // ─── Store Colours (fallback map) ────────────────────────────────────────
  const STORE_COLORS = {
    'Steam': '#1b2838',
    'GOG': '#5c2d91',
    'Humble Store': '#cc0000',
    'Fanatical': '#e63946',
    'Green Man Gaming': '#00b300',
    'GamersGate': '#ff6a00',
    'WinGameStore': '#2196f3',
    'IndieGala Store': '#ff9800',
  };

  /**
   * Fetch the list of stores from CheapShark
   * @returns {Promise<Array>}
   */
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

  /**
   * Build the store filter dropdown from the fetched store list
   */
  function buildStoreFilter() {
    const select = document.getElementById('filter-store');
    if (!select) return;
    // Clear and add default
    select.innerHTML = '<option value="">All Stores</option>';
    storeList.forEach(store => {
      const opt = document.createElement('option');
      opt.value = store.storeID;
      opt.textContent = store.storeName;
      select.appendChild(opt);
    });
  }

  /**
   * Get the name for a store ID
   * @param {string} storeID
   * @returns {string}
   */
  function getStoreName(storeID) {
    const store = storeList.find(s => s.storeID === String(storeID));
    return store ? store.storeName : `Store ${storeID}`;
  }

  /**
   * Get the icon URL for a store
   * @param {string} storeID
   * @returns {string}
   */
  function getStoreIcon(storeID) {
    const store = storeList.find(s => s.storeID === String(storeID));
    if (store && store.images) {
      return `https://www.cheapshark.com${store.images.icon}`;
    }
    return '';
  }

  /**
   * Fetch deals with current filters & page
   * @param {boolean} reset — whether to reset to page 0
   */
  async function fetchDeals(reset = true) {
    if (isLoading) return;
    isLoading = true;

    const container = document.getElementById('deals-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!container) return;

    if (reset) {
      currentPage = 0;
      hasMore = true;
      showSkeletons(container, 8);
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else {
      // Append skeleton loaders at the end
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
        ...( currentFilters.storeID   ? { storeID: currentFilters.storeID }     : {} ),
        ...( currentFilters.title     ? { title: currentFilters.title }          : {} ),
        ...( currentFilters.maxPrice  !== undefined ? { upperPrice: currentFilters.maxPrice } : {} ),
        ...( currentFilters.minSaving ? { lowerPrice: 0, sortBy: 'Savings', minSteamRating: 0 } : {} ),
      });

      // CheapShark uses lowerPrice as min discount differently — we filter client-side
      const deals = await fetchJSON(`${CHEAPSHARK_BASE}/deals?${params}`);

      // Remove skeleton / loading indicator
      const loadingMore = document.getElementById('loading-more');
      if (loadingMore) loadingMore.remove();

      // Apply min-saving filter client-side
      const minSaving = parseFloat(currentFilters.minSaving) || 0;
      const filtered = minSaving > 0
        ? deals.filter(d => parseFloat(d.savings) >= minSaving)
        : deals;

      if (reset) {
        container.innerHTML = '';
      }

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
      });

      // Trigger notification check with new deals
      if (typeof NotificationsModule !== 'undefined') {
        NotificationsModule.checkDeals(filtered);
      }

      // Determine if more pages exist
      hasMore = deals.length === 12;
      if (loadMoreBtn) {
        loadMoreBtn.style.display = hasMore ? 'block' : 'none';
      }
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

  /**
   * Create a deal card DOM element
   * @param {object} deal
   * @returns {HTMLElement}
   */
  function createDealCard(deal) {
    const card = document.createElement('div');
    card.className = 'card deal-card';
    card.dataset.dealId = deal.dealID;

    const savings = parseFloat(deal.savings) || 0;
    const storeName = getStoreName(deal.storeID);
    const storeIcon = getStoreIcon(deal.storeID);
    const rating = parseFloat(deal.dealRating) || 0;
    const isWishlisted = typeof WishlistModule !== 'undefined' && WishlistModule.isWishlisted(deal.gameID);

    card.innerHTML = `
      <div class="card-badge discount-badge">-${Math.round(savings)}%</div>
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
        <h3 class="card-title" title="${escapeHtml(deal.title)}">${escapeHtml(truncate(deal.title, 50))}</h3>
        <div class="card-store">
          ${storeIcon ? `<img class="store-icon" src="${escapeHtml(storeIcon)}" alt="${escapeHtml(storeName)}" onerror="this.style.display='none'">` : ''}
          <span class="store-name">${escapeHtml(storeName)}</span>
        </div>
        <div class="card-prices">
          <span class="price-sale">${formatPrice(deal.salePrice)}</span>
          ${parseFloat(deal.normalPrice) > 0 ? `<span class="price-original">${formatPrice(deal.normalPrice)}</span>` : ''}
        </div>
        <div class="card-footer">
          <div class="deal-rating" title="Deal Rating">
            <span class="rating-stars">${getRatingStars(rating)}</span>
            <span class="rating-num">${rating.toFixed(1)}</span>
          </div>
          <a class="btn btn-sm btn-primary deal-link" 
             href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(deal.dealID)}" 
             target="_blank" 
             rel="noopener noreferrer">
            Get Deal
          </a>
        </div>
      </div>
    `;

    // Wishlist button handler
    card.querySelector('.wishlist-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof WishlistModule !== 'undefined') {
        WishlistModule.toggle(deal.gameID, deal.title, deal.thumb, deal.salePrice);
        const btn = card.querySelector('.wishlist-btn');
        const isNowWishlisted = WishlistModule.isWishlisted(deal.gameID);
        btn.classList.toggle('active', isNowWishlisted);
        btn.textContent = isNowWishlisted ? '★' : '☆';
        btn.setAttribute('aria-label', isNowWishlisted ? 'Remove from wishlist' : 'Add to wishlist');
      }
    });

    return card;
  }

  /**
   * Convert a deal rating (0–10) to star icons
   * @param {number} rating
   * @returns {string}
   */
  function getRatingStars(rating) {
    const stars = Math.round(rating / 2); // 0–5
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }

  /**
   * Set filters and re-fetch
   * @param {object} filters
   */
  function applyFilters(filters) {
    currentFilters = { ...currentFilters, ...filters };
    fetchDeals(true);
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    currentFilters = {};
    const form = document.getElementById('deals-filter-form');
    if (form) form.reset();
    fetchDeals(true);
  }

  /**
   * Refresh deals feed
   */
  function refresh() {
    fetchDeals(true);
  }

  /**
   * Load next page
   */
  function loadMore() {
    fetchDeals(false);
  }

  /**
   * Initialise the deals module
   */
  async function init() {
    await fetchStores();
    buildStoreFilter();
    await fetchDeals(true);
    bindEvents();
  }

  /**
   * Bind UI event listeners for deals section
   */
  function bindEvents() {
    // Search input (debounced)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        applyFilters({ title: e.target.value.trim() });
      }, 600));
    }

    // Filter form
    const filterForm = document.getElementById('deals-filter-form');
    if (filterForm) {
      filterForm.addEventListener('change', () => {
        const data = new FormData(filterForm);
        applyFilters({
          storeID: data.get('store') || '',
          maxPrice: data.get('max-price') || undefined,
          minSaving: data.get('min-saving') || 0,
          sortBy: data.get('sort-by') || 'DealRating',
        });
      });
    }

    // Clear filters button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearFilters);
    }

    // Load more
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', loadMore);
    }
  }

  return { init, refresh, loadMore, applyFilters, clearFilters };
})();
