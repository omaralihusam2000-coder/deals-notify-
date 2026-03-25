/**
 * recommendations.js — Personalized Deal Recommendations
 * Tracks browsing behaviour and surfaces relevant deals.
 */

const RecommendationsModule = (() => {
  const HISTORY_KEY = 'reco_history';
  const MAX_HISTORY = 50;

  function trackView(deal) {
    if (!deal) return;
    const history = storageGet(HISTORY_KEY, []);
    history.unshift({
      gameID: deal.gameID,
      title: deal.title,
      storeID: deal.storeID,
      salePrice: deal.salePrice,
      savings: deal.savings,
      timestamp: Date.now()
    });
    storageSet(HISTORY_KEY, history.slice(0, MAX_HISTORY));

    if (typeof GamificationModule !== 'undefined') {
      GamificationModule.recordEvent('view');
    }
  }

  function getPreferences() {
    const history = storageGet(HISTORY_KEY, []);
    if (history.length === 0) return null;

    const storeCounts = {};
    let totalPrice = 0;
    let priceCount = 0;

    history.forEach(item => {
      storeCounts[item.storeID] = (storeCounts[item.storeID] || 0) + 1;
      const p = parseFloat(item.salePrice);
      if (!isNaN(p)) { totalPrice += p; priceCount++; }
    });

    const topStore = Object.keys(storeCounts).sort((a, b) => storeCounts[b] - storeCounts[a])[0];
    const avgPrice = priceCount > 0 ? totalPrice / priceCount : 15;

    return { topStore, avgPrice, history };
  }

  function getRecommendations(allDeals) {
    const prefs = getPreferences();
    if (!prefs || allDeals.length === 0) return [];

    const viewedIDs = new Set((prefs.history || []).map(h => h.gameID));
    const priceThreshold = prefs.avgPrice * 1.5;

    const scored = allDeals
      .filter(d => !viewedIDs.has(d.gameID))
      .map(d => {
        let score = 0;
        if (d.storeID === prefs.topStore) score += 3;
        const price = parseFloat(d.salePrice);
        if (!isNaN(price) && price <= priceThreshold) score += 2;
        const savings = parseFloat(d.savings);
        if (!isNaN(savings) && savings >= 70) score += 2;
        const rating = parseFloat(d.dealRating);
        if (!isNaN(rating) && rating >= 8) score += 1;
        return { ...d, _score: score };
      })
      .filter(d => d._score > 0)
      .sort((a, b) => b._score - a._score);

    return scored.slice(0, 6);
  }

  function renderSection(deals) {
    const section = document.getElementById('recommendations-section');
    if (!section) return;

    const prefs = getPreferences();
    if (!prefs || deals.length === 0) {
      section.style.display = 'none';
      return;
    }

    const recs = getRecommendations(deals);
    if (recs.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const grid = section.querySelector('.reco-grid');
    if (!grid) return;

    grid.innerHTML = '';
    recs.forEach(deal => {
      const storeName = typeof DealsModule !== 'undefined' ? DealsModule.getStoreName(deal.storeID) : `Store ${deal.storeID}`;
      const savings = Math.round(parseFloat(deal.savings) || 0);
      const card = document.createElement('a');
      card.className = 'reco-card';
      card.href = `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}`;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.innerHTML = `
        <img class="reco-img" src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2260%22><rect fill=%22%231a1a2e%22 width=%22120%22 height=%2260%22/><text fill=%22%2300d4ff%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎮</text></svg>'">
        <div class="reco-info">
          <span class="reco-title">${escapeHtml(truncate(deal.title, 35))}</span>
          <span class="reco-store">${escapeHtml(storeName)}</span>
          <div class="reco-price-row">
            <span class="reco-price">$${parseFloat(deal.salePrice).toFixed(2)}</span>
            ${savings > 0 ? `<span class="badge badge-green">-${savings}%</span>` : ''}
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function init() {
    // Section is rendered after deals load; renderSection is called externally
  }

  return { trackView, getRecommendations, renderSection, getPreferences, init };
})();
