/**
 * deal-badges.js — Adds visual badges to deal cards
 * Badges:
 *   🆓 FREE       — price is $0
 *   🔥 HOT DEAL   — savings ≥ 75%
 *   💎 BEST PRICE — savings ≥ 80%
 *   ⏰ ENDING SOON — deal expires within 24 hours
 *   🆕 NEW        — deal listed within the last 24 hours
 *   ⭐ POPULAR    — highly-rated game (rating ≥ 9)
 * Uses MutationObserver on #deals-grid to badge cards as they are rendered.
 */
const DealBadgesModule = (() => {
  const MAX_BADGES_PER_CARD = 3;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  function getBadges(card) {
    const badges = [];

    const salePriceEl = card.querySelector('.price-sale');
    const badgeEl     = card.querySelector('.card-badge.discount-badge');
    const ratingEl    = card.querySelector('.rating-num');

    const salePriceText = salePriceEl?.textContent?.trim() || '';
    const isFree = salePriceText === '$0.00' || salePriceText === 'Free' || salePriceText === '$0';

    const savingsMatch = badgeEl?.textContent?.match(/([\d.]+)/);
    const savings = savingsMatch ? parseFloat(savingsMatch[1]) : 0;
    const rating  = parseFloat(ratingEl?.textContent) || 0;

    // Timestamps from data attributes (set by deals.js if available)
    const lastChange  = parseInt(card.dataset.lastChange  || '0', 10); // unix seconds
    const releaseDate = parseInt(card.dataset.releaseDate || '0', 10); // unix seconds
    const now = Date.now();

    if (isFree) {
      badges.push({ text: '🆓 FREE', cls: 'badge-free' });
    } else if (savings >= 75) {
      badges.push({ text: '🔥 HOT DEAL', cls: 'badge-hot' });
    }

    if (!isFree && savings >= 80) {
      badges.push({ text: '💎 BEST PRICE', cls: 'badge-best' });
    }

    // ENDING SOON — requires data-last-change (Unix seconds) to be set on the card element
    // by the deal renderer. A deal changed within 24 h is treated as potentially expiring soon
    // because the CheapShark API does not expose explicit expiry timestamps.
    if (lastChange > 0 && (now - lastChange * 1000) < ONE_DAY_MS) {
      badges.push({ text: '⏰ ENDING SOON', cls: 'badge-ending' });
    }

    // NEW — requires data-release-date (Unix seconds) to be set on the card element
    // by the deal renderer, representing when the deal was first listed.
    if (releaseDate > 0 && (now - releaseDate * 1000) < ONE_DAY_MS) {
      badges.push({ text: '🆕 NEW', cls: 'badge-new' });
    }

    // POPULAR — high-rated
    if (rating >= 9) {
      badges.push({ text: '⭐ POPULAR', cls: 'badge-popular' });
    }

    return badges.slice(0, MAX_BADGES_PER_CARD);
  }

  function renderBadges(card) {
    // Avoid adding badges twice
    if (card.querySelector('.deal-badges')) return;

    const badges = getBadges(card);
    if (!badges.length) return;

    const badgesHtml = `<div class="deal-badges">${badges.map(b =>
      `<span class="deal-badge ${b.cls}">${b.text}</span>`
    ).join('')}</div>`;

    // Insert before the card title
    const title = card.querySelector('.card-title');
    if (title) {
      title.insertAdjacentHTML('beforebegin', badgesHtml);
    }
  }

  function init() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;

    // Badge any already-rendered cards
    grid.querySelectorAll('.deal-card').forEach(renderBadges);

    // Watch for new cards
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList.contains('deal-card')) {
            renderBadges(node);
          }
        });
      });
    });

    observer.observe(grid, { childList: true });
  }

  return { init, getBadges, renderBadges };
})();
