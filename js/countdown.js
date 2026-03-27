/**
 * countdown.js — Live countdown timers on deal cards
 */
const CountdownModule = (() => {
  let intervalId = null;

  function seededRandom(seed) {
    let s = parseInt(seed.toString().replace(/\D/g, '').slice(0, 8) || '99999');
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }

  function getExpiry(deal) {
    const lastChange = parseInt(deal.lastChange || deal.releaseDate || 0) * 1000;
    const base = lastChange || Date.now() - (24 * 60 * 60 * 1000);
    const rand = seededRandom(deal.dealID || '1');
    const hours = 24 + Math.floor(rand * 48); // 24–72 hours from lastChange
    return base + hours * 60 * 60 * 1000;
  }

  function formatCountdown(ms) {
    if (ms <= 0) return null;
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return { h, m, s: sec, total: ms };
  }

  function updateCountdowns() {
    const countdowns = document.querySelectorAll('.deal-countdown[data-expiry]');
    countdowns.forEach(el => {
      const expiry = parseInt(el.dataset.expiry);
      const remaining = expiry - Date.now();
      const fmt = formatCountdown(remaining);
      if (!fmt) {
        el.textContent = '⏰ Expired';
        el.classList.add('countdown-expired');
        el.classList.remove('countdown-urgent', 'countdown-shake');
        const card = el.closest('.deal-card');
        if (card) card.classList.add('deal-expired');
      } else {
        const { h, m, s } = fmt;
        el.textContent = `⏰ Ends in: ${h}h ${m}m ${s}s`;
        el.classList.toggle('countdown-urgent', remaining < 3600000);
        el.classList.toggle('countdown-shake', remaining < 600000);
      }
    });
  }

  function addCountdownToCard(card, deal) {
    if (!deal || card.querySelector('.deal-countdown')) return;
    const expiry = getExpiry(deal);
    const el = document.createElement('div');
    el.className = 'deal-countdown';
    el.dataset.expiry = expiry;
    const remaining = expiry - Date.now();
    const fmt = formatCountdown(remaining);
    if (!fmt) {
      el.textContent = '⏰ Expired';
      el.classList.add('countdown-expired');
    } else {
      const { h, m, s } = fmt;
      el.textContent = `⏰ Ends in: ${h}h ${m}m ${s}s`;
      if (remaining < 3600000) el.classList.add('countdown-urgent');
      if (remaining < 600000) el.classList.add('countdown-shake');
    }
    const cardHeader = card.querySelector('.card-header, .card-img-wrap, .card-thumb');
    if (cardHeader) cardHeader.insertAdjacentElement('afterend', el);
    else card.insertBefore(el, card.firstChild);
  }

  function addCountdowns() {
    const cards = document.querySelectorAll('.deal-card[data-deal]');
    cards.forEach(card => {
      try {
        const deal = JSON.parse(card.dataset.deal || '{}');
        addCountdownToCard(card, deal);
      } catch {}
    });
  }

  function init() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;
    const observer = new MutationObserver(() => {
      addCountdowns();
    });
    observer.observe(grid, { childList: true, subtree: false });
    addCountdowns();

    // Update all countdowns every second
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(updateCountdowns, 1000);
  }

  return { init, addCountdowns, addCountdownToCard };
})();
