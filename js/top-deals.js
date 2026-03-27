/**
 * top-deals.js — Featured Top Deals Hero Section
 * Shows the best deals in a prominent carousel at the top of the Deals tab.
 */
const TopDealsModule = (() => {
  const TOP_COUNT = 5;
  const MIN_CARDS_FOR_RENDER = 3;
  const CHEAPSHARK_REDIRECT = 'https://www.cheapshark.com/redirect?dealID=';

  function init() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;

    // Observe when deal cards are added to the grid
    const observer = new MutationObserver(() => {
      const cards = grid.querySelectorAll('.deal-card[data-deal-id]');
      if (cards.length >= MIN_CARDS_FOR_RENDER) {
        observer.disconnect();
        const deals = extractDealsFromCards(cards);
        if (deals.length) render(deals);
      }
    });

    observer.observe(grid, { childList: true, subtree: false });

    // Also try immediately in case deals are already loaded
    const existing = grid.querySelectorAll('.deal-card[data-deal-id]');
    if (existing.length >= MIN_CARDS_FOR_RENDER) {
      const deals = extractDealsFromCards(existing);
      if (deals.length) render(deals);
    }
  }

  /**
   * Extract deal data from rendered card DOM nodes.
   * We read the visible price/savings values from the card HTML.
   */
  function extractDealsFromCards(cards) {
    const deals = [];
    cards.forEach(card => {
      const dealId = card.dataset.dealId;
      if (!dealId) return;

      const title = card.querySelector('.card-title')?.textContent?.trim() || 'Unknown Game';
      const thumb = card.querySelector('.card-img')?.src || '';
      const salePriceEl = card.querySelector('.price-sale');
      const origPriceEl = card.querySelector('.price-original');
      const badgeEl = card.querySelector('.card-badge.discount-badge');
      const storeEl = card.querySelector('.store-name');
      const ratingEl = card.querySelector('.rating-num');

      const salePrice = salePriceEl?.textContent?.trim() || '';
      const normalPrice = origPriceEl?.textContent?.trim() || '';
      const savings = badgeEl ? parseFloat(badgeEl.textContent) || 0 : 0;
      const store = storeEl?.textContent?.trim() || '';
      const rating = parseFloat(ratingEl?.textContent) || 0;

      if (salePrice) {
        deals.push({ dealId, title, thumb, salePrice, normalPrice, savings: Math.abs(savings), store, rating });
      }
    });

    // Sort by savings descending, then by rating
    deals.sort((a, b) => b.savings - a.savings || b.rating - a.rating);
    return deals.slice(0, TOP_COUNT);
  }

  function render(deals) {
    const section = document.getElementById('top-deals-section');
    const carousel = document.getElementById('top-deals-carousel');
    if (!section || !carousel) return;

    carousel.innerHTML = deals.map(d => createTopDealCard(d)).join('');
    section.style.display = 'block';
  }

  function createTopDealCard(d) {
    const discountLabel = d.savings > 0 ? `-${Math.round(d.savings)}%` : '🆓 FREE';
    const imgSrc = d.thumb
      ? `<img class="deal-thumb" src="${escapeAttr(d.thumb)}" alt="${escapeAttr(d.title)}" loading="lazy" onerror="this.style.display='none'">`
      : '';

    return `
      <div class="top-deal-card">
        ${imgSrc}
        <div class="top-deal-discount">${discountLabel}</div>
        <div class="deal-info">
          <div class="deal-title" title="${escapeAttr(d.title)}">${escapeHtml(d.title)}</div>
          <div class="deal-prices">
            <span class="deal-price-new">${escapeHtml(d.salePrice)}</span>
            ${d.normalPrice ? `<span class="deal-price-old">${escapeHtml(d.normalPrice)}</span>` : ''}
          </div>
          ${d.store ? `<div class="deal-store">🏪 ${escapeHtml(d.store)}</div>` : ''}
          <a class="btn btn-primary" href="${CHEAPSHARK_REDIRECT}${encodeURIComponent(d.dealId)}"
             target="_blank" rel="noopener noreferrer">
            🔥 Get This Deal
          </a>
        </div>
      </div>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { init, render };
})();
