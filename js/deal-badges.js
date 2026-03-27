/**
 * deal-badges.js — Adds visual badges to deal cards
 * Badges: "🆓 FREE", "🔥 Hot Deal", "💰 Great Value", "🏆 Top Rated", "💎 Best Price"
 * Uses MutationObserver on #deals-grid to badge cards as they are rendered.
 */
const DealBadgesModule = (() => {
  const MAX_BADGES_PER_CARD = 3;

  function getBadges(card) {
    const badges = [];

    const salePriceEl = card.querySelector('.price-sale');
    const origPriceEl = card.querySelector('.price-original');
    const badgeEl = card.querySelector('.card-badge.discount-badge');
    const ratingEl = card.querySelector('.rating-num');

    const salePriceText = salePriceEl?.textContent?.trim() || '';
    const isFree = salePriceText === '$0.00' || salePriceText === 'Free' || salePriceText === '$0';

    const savingsMatch = badgeEl?.textContent?.match(/([\d.]+)/);
    const savings = savingsMatch ? parseFloat(savingsMatch[1]) : 0;
    const rating = parseFloat(ratingEl?.textContent) || 0;

    if (isFree) {
      badges.push({ text: '🆓 FREE', cls: 'badge-free' });
    } else if (savings >= 90) {
      badges.push({ text: '🔥 Hot Deal', cls: 'badge-hot' });
    } else if (savings >= 75) {
      badges.push({ text: '💰 Great Value', cls: 'badge-value' });
    }

    if (rating >= 9) {
      badges.push({ text: '🏆 Top Rated', cls: 'badge-top' });
    }

    if (!isFree && savings >= 80) {
      badges.push({ text: '💎 Best Price', cls: 'badge-best' });
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
