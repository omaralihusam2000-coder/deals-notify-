/**
 * recently-viewed.js — Horizontal strip of recently viewed deals
 */
const RecentlyViewedModule = (() => {
  const STORAGE_KEY = 'gdn_recently_viewed';
  const MAX_ITEMS = 10;

  function getItems() {
    return storageGet(STORAGE_KEY, []);
  }

  function addItem(deal) {
    if (!deal || !deal.dealID) return;
    let items = getItems().filter(i => i.dealID !== deal.dealID);
    items.unshift({
      dealID: deal.dealID,
      title: deal.title || 'Unknown',
      thumb: deal.thumb || '',
      timestamp: Date.now(),
    });
    items = items.slice(0, MAX_ITEMS);
    storageSet(STORAGE_KEY, items);
    renderStrip();
  }

  function clearItems() {
    storageSet(STORAGE_KEY, []);
    renderStrip();
  }

  function renderStrip() {
    const section = document.getElementById('recently-viewed-section');
    if (!section) return;
    const items = getItems();
    if (items.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    section.innerHTML = `
      <div class="rv-header">
        <h3 class="section-subtitle" style="margin:0;">🕐 Recently Viewed</h3>
        <button class="btn btn-ghost btn-sm rv-clear-btn" id="rv-clear-btn">✕ Clear</button>
      </div>
      <div class="rv-strip" role="list">
        ${items.map(item => `
          <div class="rv-item" role="listitem" data-deal-id="${item.dealID}" title="${escapeHtml(item.title)}">
            <img src="${escapeHtml(item.thumb)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23252540%22 width=%2250%22 height=%2250%22/></svg>'">
            <div class="rv-item-title">${escapeHtml(item.title)}</div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('rv-clear-btn')?.addEventListener('click', clearItems);

    document.querySelectorAll('.rv-item').forEach(item => {
      item.addEventListener('click', () => {
        const dealID = item.dataset.dealId;
        const url = `https://www.cheapshark.com/redirect?dealID=${dealID}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    });
  }

  function init() {
    renderStrip();
  }

  return { init, addItem, getItems, renderStrip };
})();
