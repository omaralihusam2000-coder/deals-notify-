/**
 * currency.js — Multi-currency price conversion
 * Includes auto-detect user region via ipapi.co on first visit.
 */

const CurrencyModule = (() => {
  const CURRENCY_KEY  = 'selected_currency';
  const REGION_KEY    = 'detected_region';
  const REGION_DONE   = 'region_detected';

  const RATES = {
    // NOTE: These are static exchange rates. They may drift over time.
    // For production use, fetch live rates from a currency API (e.g., exchangerate-api.com).
    USD: { rate: 1,      symbol: '$',  name: 'US Dollar' },
    EUR: { rate: 0.92,   symbol: '€',  name: 'Euro' },
    GBP: { rate: 0.79,   symbol: '£',  name: 'British Pound' },
    CAD: { rate: 1.36,   symbol: 'C$', name: 'Canadian Dollar' },
    AUD: { rate: 1.53,   symbol: 'A$', name: 'Australian Dollar' },
    JPY: { rate: 149.5,  symbol: '¥',  name: 'Japanese Yen' },
    BRL: { rate: 5.05,   symbol: 'R$', name: 'Brazilian Real' },
    INR: { rate: 83.2,   symbol: '₹',  name: 'Indian Rupee' },
    IQD: { rate: 1310,   symbol: 'ع.د', name: 'Iraqi Dinar' },
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

    if (currency === 'JPY' || currency === 'INR' || currency === 'IQD') {
      return `${info.symbol}${Math.round(converted).toLocaleString()}`;
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

  // ── Country → Currency mapping ───────────────────────────────────
  const COUNTRY_CURRENCY = {
    US: 'USD', GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
    CA: 'CAD', AU: 'AUD', JP: 'JPY', BR: 'BRL', IN: 'INR', IQ: 'IQD',
    NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', FI: 'EUR',
    // Correct country-specific currencies
    SE: 'USD', NO: 'USD', DK: 'USD', CH: 'EUR', PL: 'USD', CZ: 'USD', RO: 'USD',
  };

  async function detectRegion() {
    if (localStorage.getItem(REGION_DONE)) return;
    try {
      const data = await fetch('https://ipapi.co/json/').then(r => r.json());
      const country = data.country_code || 'US';
      const currency = COUNTRY_CURRENCY[country] || 'USD';

      localStorage.setItem(REGION_KEY, JSON.stringify({ country, currency, name: data.country_name || country }));
      localStorage.setItem(REGION_DONE, '1');

      // Only auto-set if user hasn't manually chosen yet
      const stored = localStorage.getItem(CURRENCY_KEY);
      if (!stored || stored === 'USD') {
        setCurrency(currency);
        const selector = document.getElementById('currency-selector');
        if (selector) selector.value = currency;
        showToast(`🌍 Detected: ${data.country_name || country} — prices shown in ${currency}`, 'info');
      }
    } catch { /* silent fail */ }
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
      // Mark as manually overridden so auto-detect won't override again
      localStorage.setItem(REGION_DONE, '1');
      showToast(`Currency changed to ${selector.value}`, 'info');
    });

    // Auto-detect on first visit
    detectRegion();
  }

  return { getCurrency, setCurrency, convert, formatConverted, refreshAllPrices, init, RATES, detectRegion };
})();