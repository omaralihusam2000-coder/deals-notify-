/**
 * wishlist.js — Wishlist management with localStorage
 * Tracks wishlisted games and checks for deals
 */

const WishlistModule = (() => {
  const STORAGE_KEY = 'wishlist';
  const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';

  /**
   * Load wishlist from localStorage
   * @returns {Array<{gameID, title, thumb, lastPrice}>}
   */
  function load() {
    return storageGet(STORAGE_KEY, []);
  }

  /**
   * Save wishlist to localStorage
   * @param {Array} list
   */
  function save(list) {
    storageSet(STORAGE_KEY, list);
  }

  /**
   * Check if a game is in the wishlist
   * @param {string} gameID
   * @returns {boolean}
   */
  function isWishlisted(gameID) {
    return load().some(g => String(g.gameID) === String(gameID));
  }

  /**
   * Add a game to the wishlist
   * @param {string} gameID
   * @param {string} title
   * @param {string} thumb
   * @param {string} lastPrice
   */
  function add(gameID, title, thumb, lastPrice) {
    const list = load();
    if (!list.some(g => String(g.gameID) === String(gameID))) {
      list.push({ gameID: String(gameID), title, thumb, lastPrice: String(lastPrice), addedAt: Date.now() });
      save(list);
      showToast(`"${escapeHtml(truncate(title, 30))}" added to wishlist ★`, 'success');
      renderWishlist();
    }
  }

  /**
   * Remove a game from the wishlist
   * @param {string} gameID
   */
  function remove(gameID) {
    const list = load().filter(g => String(g.gameID) !== String(gameID));
    save(list);
    showToast('Removed from wishlist.', 'info');
    renderWishlist();
  }

  /**
   * Toggle a game's wishlist status
   * @param {string} gameID
   * @param {string} title
   * @param {string} thumb
   * @param {string} lastPrice
   */
  function toggle(gameID, title, thumb, lastPrice) {
    if (isWishlisted(gameID)) {
      remove(gameID);
    } else {
      add(gameID, title, thumb, lastPrice);
    }
    updateWishlistCount();
  }

  /**
   * Update the wishlist badge count in the nav
   */
  function updateWishlistCount() {
    const badge = document.getElementById('wishlist-count');
    if (badge) {
      const count = load().length;
      badge.textContent = count > 0 ? count : '';
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  /**
   * Render the wishlist tab content
   */
  function renderWishlist() {
    const container = document.getElementById('wishlist-grid');
    if (!container) return;

    const list = load();

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state wishlist-empty">
          <div class="empty-icon">⭐</div>
          <p>Your wishlist is empty.</p>
          <p class="empty-sub">Browse deals and click <span class="star-icon">☆</span> to save games you're watching!</p>
          <button class="btn btn-primary" onclick="AppModule.switchTab('deals')">Browse Deals</button>
        </div>`;
      return;
    }

    container.innerHTML = '';
    list.forEach(game => {
      container.appendChild(createWishlistCard(game));
    });

    updateWishlistCount();
  }

  /**
   * Create a wishlist card
   * @param {object} game
   * @returns {HTMLElement}
   */
  function createWishlistCard(game) {
    const card = document.createElement('div');
    card.className = 'card wishlist-card';
    card.dataset.gameId = game.gameID;

    card.innerHTML = `
      <img class="card-img" 
           src="${escapeHtml(game.thumb || '')}" 
           alt="${escapeHtml(game.title)}" 
           loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22100%22><rect fill=%22%231a1a2e%22 width=%22200%22 height=%22100%22/><text fill=%22%23ffd700%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>⭐</text></svg>'">
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(truncate(game.title, 45))}</h3>
        <div class="wishlist-price-info">
          <div class="wishlist-price-row">
            <span class="price-label">Last seen:</span>
            <span class="price-sale">${formatPrice(game.lastPrice)}</span>
          </div>
          <div class="wishlist-price-row" id="best-price-${escapeHtml(game.gameID)}">
            <span class="price-label">Best price:</span>
            <span class="loading-price">Loading…</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="added-date">Added ${new Date(game.addedAt).toLocaleDateString()}</span>
          <div class="wishlist-actions">
            <a class="btn btn-sm btn-primary view-deals-btn" 
               href="#"
               target="_blank" 
               rel="noopener noreferrer"
               data-game-id="${escapeHtml(game.gameID)}"
               data-game-title="${escapeHtml(game.title)}">
              View Deals
            </a>
            <button class="btn btn-sm btn-danger remove-wishlist-btn" 
                    data-game-id="${escapeHtml(game.gameID)}">
              Remove
            </button>
          </div>
        </div>
      </div>
    `;

    // Remove button
    card.querySelector('.remove-wishlist-btn').addEventListener('click', () => {
      remove(game.gameID);
    });

    // View deals button
    card.querySelector('.view-deals-btn').addEventListener('click', (e) => {
      e.preventDefault();
      window.open(
        `https://www.cheapshark.com/search#${encodeURIComponent(game.title)}`,
        '_blank',
        'noopener,noreferrer'
      );
    });

    // Load best price asynchronously
    loadBestPrice(game.gameID);

    return card;
  }

  /**
   * Load and display the best current price for a game
   * @param {string} gameID
   */
  async function loadBestPrice(gameID) {
    const container = document.getElementById(`best-price-${gameID}`);
    if (!container) return;

    try {
      const results = await fetchJSON(`${CHEAPSHARK_BASE}/games?id=${encodeURIComponent(gameID)}`);
      const cheapest = results && results.deals && results.deals.length > 0
        ? Math.min(...results.deals.map(d => parseFloat(d.price)))
        : null;

      if (container) {
        container.innerHTML = cheapest !== null
          ? `<span class="price-label">Best price:</span><span class="price-sale">${formatPrice(cheapest)}</span>`
          : `<span class="price-label">Best price:</span><span class="price-original">N/A</span>`;
      }
    } catch {
      if (container) {
        container.innerHTML = `<span class="price-label">Best price:</span><span class="price-original">Unavailable</span>`;
      }
    }
  }

  /**
   * Check all wishlisted games for deals and send notifications
   */
  async function checkDeals() {
    const list = load();
    if (list.length === 0) return;

    for (const game of list) {
      try {
        const results = await fetchJSON(
          `${CHEAPSHARK_BASE}/games?title=${encodeURIComponent(game.title)}&limit=5`
        );
        if (!Array.isArray(results) || results.length === 0) continue;

        const best = results[0];
        const bestPrice = parseFloat(best.cheapest);
        const lastPrice = parseFloat(game.lastPrice);

        // If price dropped (or became available on sale)
        if (!isNaN(bestPrice) && !isNaN(lastPrice) && bestPrice < lastPrice * 0.9) {
          // Update stored price
          const updatedList = load().map(g => {
            if (String(g.gameID) === String(game.gameID)) {
              return { ...g, lastPrice: String(bestPrice) };
            }
            return g;
          });
          save(updatedList);

          // Send notification
          if (typeof NotificationsModule !== 'undefined') {
            NotificationsModule.sendNotification(
              `⭐ Wishlist Deal: ${game.title}`,
              `Now ${formatPrice(bestPrice)} (was ${formatPrice(lastPrice)}) — a new low!`,
              game.thumb,
              `https://www.cheapshark.com/search#${encodeURIComponent(game.title)}`
            );
          }
        }
      } catch (err) {
        console.warn(`Wishlist check failed for ${game.title}:`, err);
      }
    }
  }

  /**
   * Clear the entire wishlist
   */
  function clear() {
    save([]);
    renderWishlist();
    updateWishlistCount();
    showToast('Wishlist cleared.', 'info');
  }

  /**
   * Initialise the wishlist module
   */
  function init() {
    renderWishlist();
    updateWishlistCount();

    // Clear wishlist button
    const clearBtn = document.getElementById('clear-wishlist-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear your entire wishlist?')) clear();
      });
    }
  }

  return { init, add, remove, toggle, isWishlisted, renderWishlist, checkDeals, updateWishlistCount };
})();
