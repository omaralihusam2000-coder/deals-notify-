/**
 * currency.js — Multi-currency price conversion
 */

const CurrencyModule = (() => {
  const CURRENCY_KEY = 'selected_currency';

  const RATES = {
    USD: { rate: 1,      symbol: '$',  name: 'US Dollar' },
    EUR: { rate: 0.92,   symbol: '€',  name: 'Euro' },
    GBP: { rate: 0.79,   symbol: '£',  name: 'British Pound' },
    CAD: { rate: 1.36,   symbol: 'C$', name: 'Canadian Dollar' },
    AUD: { rate: 1.53,   symbol: 'A$', name: 'Australian Dollar' },
    JPY: { rate: 149.5,  symbol: '¥',  name: 'Japanese Yen' },
    BRL: { rate: 5.05,   symbol: 'R$', name: 'Brazilian Real' },
    INR: { rate: 83.2,   symbol: '₹',  name: 'Indian Rupee' },
  };

  function getCurrency() {
    return storageGet(CURRENCY_KEY, 'USD');
  }

  function setCurrency(code) {
    if (RATES[code]) {
      storageSet(CURRENCY_KEY, code);
      refreshAllPrices();
    }
  }

  function convert(usdPrice) {
    const num = parseFloat(usdPrice);
    if (isNaN(num)) return null;
    const currency = getCurrency();
    const info = RATES[currency] || RATES.USD;
    return num * info.rate;
  }

  function formatConverted(usdPrice) {
    const num = parseFloat(usdPrice);
    if (isNaN(num)) return 'N/A';
    if (num === 0) return 'FREE';

    const currency = getCurrency();
    const info = RATES[currency] || RATES.USD;
    const converted = num * info.rate;

    if (currency === 'JPY' || currency === 'INR') {
      return `${info.symbol}${Math.round(converted)}`;
    }
    return `${info.symbol}${converted.toFixed(2)}`;
  }

  function refreshAllPrices() {
    document.querySelectorAll('[data-usd-price]').forEach(el => {
      const usd = el.dataset.usdPrice;
      if (usd !== undefined) {
        el.textContent = formatConverted(usd);
      }
    });
  }

  function init() {
    const selector = document.getElementById('currency-selector');
    if (!selector) return;

    selector.innerHTML = Object.entries(RATES).map(([code, info]) =>
      `<option value="${code}">${code} — ${escapeHtml(info.name)}</option>`
    ).join('');

    const current = getCurrency();
    selector.value = current;

    selector.addEventListener('change', () => {
      setCurrency(selector.value);
      showToast(`Currency changed to ${selector.value}`, 'info');
    });
  }

  return { getCurrency, setCurrency, convert, formatConverted, refreshAllPrices, init, RATES };
})();
