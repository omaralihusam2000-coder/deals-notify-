/**
 * price-advisor.js — "Should I Buy Now?" Price Advisor
 * Compares current price to historical low and gives a recommendation.
 */

const PriceAdvisorModule = (() => {
  const CACHE_KEY = 'price_advisor_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  function getCache() {
    return storageGet(CACHE_KEY, {});
  }

  function setCache(gameID, data) {
    const cache = getCache();
    cache[gameID] = { data, ts: Date.now() };
    storageSet(CACHE_KEY, cache);
  }

  function getCached(gameID) {
    const cache = getCache();
    const entry = cache[gameID];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  }

  async function fetchGameData(gameID) {
    const cached = getCached(gameID);
    if (cached) return cached;
    try {
      const data = await fetchJSON(`https://www.cheapshark.com/api/1.0/games?id=${encodeURIComponent(gameID)}`);
      setCache(gameID, data);
      return data;
    } catch {
      return null;
    }
  }

  function getRecommendation(currentPrice, historicalLow) {
    const cur = parseFloat(currentPrice);
    const low = parseFloat(historicalLow);
    if (isNaN(cur) || isNaN(low) || low <= 0) return null;

    if (cur <= low * 1.1) return 'buy';
    if (cur <= low * 1.5) return 'fair';
    return 'wait';
  }

  function createBadgeHTML(recommendation, historicalLow, storeName) {
    if (!recommendation) return '';
    const labels = { buy: '🟢 Buy Now!', fair: '🟡 Fair Price', wait: '🔴 Wait' };
    const label = labels[recommendation] || '';
    const tooltip = historicalLow != null
      ? `Historical low: $${parseFloat(historicalLow).toFixed(2)}${storeName ? ' on ' + storeName : ''}`
      : '';
    return `<span class="price-advisor-badge advisor-${recommendation}" title="${escapeHtml(tooltip)}">${label}</span>`;
  }

  async function applyToCard(card, deal) {
    if (!deal.gameID) return;
    const data = await fetchGameData(deal.gameID);
    if (!data || !data.cheapestPriceEver) return;

    const historicalLow = data.cheapestPriceEver.price;
    const rec = getRecommendation(deal.salePrice, historicalLow);
    if (!rec) return;

    const badgeContainer = card.querySelector('.price-advisor-container');
    if (badgeContainer) {
      badgeContainer.innerHTML = createBadgeHTML(rec, historicalLow, data.cheapestPriceEver.shopName || '');
    }
  }

  function createPlaceholderHTML() {
    return `<div class="price-advisor-container"></div>`;
  }

  return { applyToCard, createPlaceholderHTML, getRecommendation };
})();
