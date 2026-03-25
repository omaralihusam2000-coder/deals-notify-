/**
 * utils.js — Shared utility functions
 */

/**
 * Fetch wrapper with error handling and optional CORS proxy fallback
 * @param {string} url
 * @param {object} options
 * @returns {Promise<any>}
 */
async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Format a price number as USD string
 * @param {string|number} price
 * @returns {string}
 */
function formatPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return 'N/A';
  if (num === 0) return 'FREE';
  return `$${num.toFixed(2)}`;
}

/**
 * Format a savings percentage
 * @param {string|number} savings
 * @returns {string}
 */
function formatSavings(savings) {
  const num = parseFloat(savings);
  if (isNaN(num)) return '0%';
  return `${Math.round(num)}%`;
}

/**
 * Truncate text to a max length
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max = 60) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/**
 * Debounce a function call
 * @param {Function} fn
 * @param {number} delay ms
 * @returns {Function}
 */
function debounce(fn, delay = 400) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Show a toast notification on screen
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  // Animate in
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  // Remove after 4s
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 4000);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get a value from localStorage, with JSON parsing
 * @param {string} key
 * @param {any} defaultValue
 * @returns {any}
 */
function storageGet(key, defaultValue = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a value in localStorage with JSON serialisation
 * @param {string} key
 * @param {any} value
 */
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

/**
 * Create a loading skeleton card HTML string
 * @returns {string}
 */
function skeletonCard() {
  return `<div class="card skeleton">
    <div class="skeleton-img"></div>
    <div class="skeleton-line skeleton-line-long"></div>
    <div class="skeleton-line skeleton-line-medium"></div>
    <div class="skeleton-line skeleton-line-short"></div>
  </div>`;
}

/**
 * Render N skeleton cards into a container
 * @param {HTMLElement} container
 * @param {number} count
 */
function showSkeletons(container, count = 8) {
  container.innerHTML = Array(count).fill(skeletonCard()).join('');
}
