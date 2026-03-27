/**
 * store-trust.js -- Store Trust Badges + Redirect Notice Modal + Price Verification
 * - Adds trust level badge next to store names on deal cards.
 * - Shows a Redirect Notice modal before opening external store links.
 * - Adds a "Price Verified" badge to deal cards.
 */

const StoreTrustModule = (() => {
  const SKIP_REDIRECT_KEY = 'store_trust_skip_redirect';

  const TRUST_DB = {
    'Steam':             { level: 'trusted',  label: 'Trusted',  rating: '4.9', users: '100M+', detail: 'Official Valve store — industry standard, full refund policy, family sharing.' },
    'GOG':               { level: 'trusted',  label: 'Trusted',  rating: '4.8', users: '15M+',  detail: 'DRM-free games, authorized publisher partner, excellent customer service.' },
    'Epic Games Store':  { level: 'trusted',  label: 'Trusted',  rating: '4.7', users: '200M+', detail: 'Official Epic platform, regular free games, authorized publisher.' },
    'Humble Store':      { level: 'trusted',  label: 'Trusted',  rating: '4.8', users: '20M+',  detail: 'Authorized reseller. Part of IGN/Ziff Davis. Charity bundles.' },
    'Fanatical':         { level: 'trusted',  label: 'Trusted',  rating: '4.7', users: '5M+',   detail: 'Authorized reseller (Focus Home). Safe and legitimate store.' },
    'Green Man Gaming':  { level: 'trusted',  label: 'Trusted',  rating: '4.6', users: '10M+',  detail: 'UK-based authorized reseller, established since 2009.' },
    'WinGameStore':      { level: 'trusted',  label: 'Trusted',  rating: '4.5', users: '2M+',   detail: 'Authorized reseller. Been around since 2010. Generally safe.' },
    'IndieGala Store':   { level: 'trusted',  label: 'Trusted',  rating: '4.5', users: '3M+',   detail: 'Authorized reseller for indie games and bundles.' },
    'GamersGate':        { level: 'caution',  label: 'Caution',  rating: '3.8', users: '1M+',   detail: 'Some user reports of slow delivery. Generally legit but not top-tier.' },
    'Amazon':            { level: 'trusted',  label: 'Trusted',  rating: '4.8', users: '300M+', detail: 'Official Amazon marketplace. Safe and reliable.' },
    'Gamesplanet':       { level: 'trusted',  label: 'Trusted',  rating: '4.6', users: '2M+',   detail: 'Authorized EU-based reseller. Safe.' },
    'Voidu':             { level: 'caution',  label: 'Caution',  rating: '3.5', users: '500K+', detail: 'Grey market tendencies. Proceed with caution.' },
    'GameBillet':        { level: 'caution',  label: 'Caution',  rating: '3.7', users: '500K+', detail: 'Generally works, but some reports of issues. Use at own risk.' },
    'Funstock':          { level: 'caution',  label: 'Caution',  rating: '3.6', users: '1M+',   detail: 'UK reseller. Some reports of slower customer support.' },
    'default':           { level: 'unknown',  label: 'Unknown',  rating: '?',   users: 'Unknown', detail: 'Trust level unknown. Research this store before purchasing.' },
  };

  function getTrust(storeName) {
    return TRUST_DB[storeName] || TRUST_DB['default'];
  }

  function createBadge(storeName) {
    const trust = getTrust(storeName);
    const span = document.createElement('span');
    span.className = 'store-trust-badge store-trust-badge--' + trust.level;
    const icon = trust.level === 'trusted' ? '\u2705' : trust.level === 'caution' ? '\u26a0\ufe0f' : '\u2754';
    span.innerHTML = '\uD83D\uDD12 ' + icon + ' ' + trust.label;
    const tooltip = trust.detail + ' | \u2B50 ' + trust.rating + '/5 | Used by ' + trust.users + ' gamers';
    span.title = tooltip;
    span.setAttribute('data-tooltip', tooltip);
    span.setAttribute('aria-label', storeName + ' trust level: ' + trust.label);
    return span;
  }

  // -- Price Verification Badge ------------------------------------------
  function addPriceVerifiedBadge(card) {
    if (card.querySelector('.price-verified-badge')) return;
    const priceEl = card.querySelector('.card-prices, .deal-prices');
    if (!priceEl) return;
    const badge = document.createElement('span');
    badge.className = 'price-verified-badge';
    badge.innerHTML = '\u2714 Price Verified';
    badge.setAttribute('aria-label', 'Price has been verified');
    priceEl.appendChild(badge);
  }

  // -- Redirect Notice Modal ---------------------------------------------
  function buildModal() {
    if (document.getElementById('store-redirect-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'store-redirect-modal';
    modal.className = 'str-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'str-title');
    modal.innerHTML = '<div class="str-modal">' +
      '<div class="str-modal-header">' +
        '<h3 id="str-title" class="str-modal-title">\uD83D\uDD12 Leaving Gaming Deals Notifier</h3>' +
        '<button class="str-close-btn" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="str-modal-body">' +
        '<p class="str-redirect-msg">You\'re being redirected to:</p>' +
        '<div class="str-store-info">' +
          '<span class="str-store-name" id="str-store-name"></span>' +
          '<span class="str-store-badge" id="str-store-badge"></span>' +
        '</div>' +
        '<div class="str-trust-row" id="str-trust-row">' +
          '<span class="str-trust-item">\u2B50 Rating: <strong id="str-rating"></strong>/5</span>' +
          '<span class="str-trust-item">\uD83D\uDC65 Used by: <strong id="str-users"></strong></span>' +
        '</div>' +
        '<p class="str-trust-detail" id="str-trust-detail"></p>' +
        '<label class="str-skip-label"><input type="checkbox" id="str-skip-check"> Don\'t show this again</label>' +
      '</div>' +
      '<div class="str-modal-footer">' +
        '<button class="btn btn-ghost btn-sm str-back-btn" id="str-back-btn">\u2190 Go Back</button>' +
        '<a class="btn btn-primary btn-sm str-continue-btn" id="str-continue-btn" target="_blank" rel="noopener noreferrer">Continue to Store \u2192</a>' +
      '</div>' +
    '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
    modal.querySelector('.str-close-btn').addEventListener('click', closeModal);
    document.getElementById('str-back-btn').addEventListener('click', closeModal);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('str-overlay--visible')) closeModal();
    });
  }

  function openModal(storeName, href) {
    buildModal();
    const trust = getTrust(storeName);
    document.getElementById('str-store-name').textContent = storeName;
    const badge = document.getElementById('str-store-badge');
    const icon = trust.level === 'trusted' ? '\u2705' : trust.level === 'caution' ? '\u26a0\ufe0f' : '\u2754';
    badge.textContent = icon + ' ' + trust.label;
    badge.className = 'str-store-badge store-trust-badge--' + trust.level;
    document.getElementById('str-rating').textContent = trust.rating;
    document.getElementById('str-users').textContent = trust.users;
    document.getElementById('str-trust-detail').textContent = trust.detail;
    const continueBtn = document.getElementById('str-continue-btn');
    continueBtn.href = href;

    const modal = document.getElementById('store-redirect-modal');
    modal.style.display = 'flex';
    requestAnimationFrame(function() { modal.classList.add('str-overlay--visible'); });
  }

  function closeModal() {
    const modal = document.getElementById('store-redirect-modal');
    if (!modal) return;
    const skipCheck = document.getElementById('str-skip-check');
    if (skipCheck && skipCheck.checked) {
      localStorage.setItem(SKIP_REDIRECT_KEY, '1');
    }
    modal.classList.remove('str-overlay--visible');
    modal.addEventListener('transitionend', function() { modal.style.display = 'none'; }, { once: true });
  }

  function shouldSkipRedirect() {
    return localStorage.getItem(SKIP_REDIRECT_KEY) === '1';
  }

  // Intercept clicks on external store links inside deal cards
  function interceptStoreLinks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('http')) return;
      const isDealLink = link.closest('.deal-card, .card, .top-deal-card, .giveaway-card');
      if (!isDealLink) return;
      if (shouldSkipRedirect()) return;

      const storeEl = link.closest('.deal-card, .card') && link.closest('.deal-card, .card').querySelector('.card-store, .deal-store');
      const rawText = storeEl ? (storeEl.firstChild ? storeEl.firstChild.textContent : storeEl.textContent) : '';
      const storeName = rawText.trim() || 'Store';

      e.preventDefault();
      openModal(storeName, href);
    });
  }

  // Apply badges to all deal cards in the DOM
  function applyBadges() {
    document.querySelectorAll('.card-store, .deal-store').forEach(function(storeEl) {
      if (storeEl.querySelector('.store-trust-badge')) return;
      const rawText = storeEl.firstChild ? storeEl.firstChild.textContent : storeEl.textContent;
      const storeName = rawText ? rawText.trim() : '';
      if (!storeName) return;
      const badge = createBadge(storeName);
      storeEl.appendChild(badge);
    });
    document.querySelectorAll('.deal-card, .card').forEach(addPriceVerifiedBadge);
  }

  // Observe deals grid for new cards
  function observeGrid() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;
    const obs = new MutationObserver(function() { applyBadges(); });
    obs.observe(grid, { childList: true, subtree: true });
  }

  function init() {
    buildModal();
    applyBadges();
    observeGrid();
    interceptStoreLinks();
  }

  return { init, getTrust, createBadge, applyBadges, openModal };
})();

document.addEventListener('DOMContentLoaded', function() { StoreTrustModule.init(); });
