/**
 * smart-search.js — Smart Search with Autocomplete & Fuzzy Matching
 * Adds autocomplete dropdown to #search-input with keyboard navigation,
 * debounced API calls, and search history via localStorage.
 */

const SmartSearchModule = (() => {
  const HISTORY_KEY = 'search_history';
  const MAX_HISTORY = 10;
  const SUGGESTIONS_LIMIT = 8;
  const DEBOUNCE_MS = 300;

  let dropdown = null;
  let selectedIndex = -1;
  let currentSuggestions = [];
  let debounceTimer = null;

  // ── Fuzzy match ─────────────────────────────────────────────────
  function fuzzyMatch(query, text) {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (t.includes(q)) return { match: true, score: 100 };
    let qi = 0, score = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) { qi++; score += 10 - (i - qi); }
    }
    return { match: qi === q.length, score };
  }

  // ── Search History ───────────────────────────────────────────────
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  }

  function addToHistory(query) {
    if (!query || query.trim().length < 2) return;
    const history = getHistory().filter(h => h !== query);
    history.unshift(query.trim());
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
  }

  // ── Fetch Suggestions from CheapShark ───────────────────────────
  async function fetchSuggestions(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query)}&limit=20`;
      const data = await fetchJSON(url);
      if (!Array.isArray(data)) return [];
      return data
        .map(g => ({ ...g, _score: fuzzyMatch(query, g.external || g.info?.title || '').score }))
        .sort((a, b) => b._score - a._score)
        .slice(0, SUGGESTIONS_LIMIT);
    } catch { return []; }
  }

  // ── Render Dropdown ──────────────────────────────────────────────
  function renderDropdown(items, query) {
    clearDropdown();
    if (!items.length) return;

    dropdown = document.createElement('div');
    dropdown.className = 'ss-dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-label', 'Search suggestions');

    currentSuggestions = items;
    selectedIndex = -1;

    items.forEach((item, idx) => {
      const li = document.createElement('div');
      li.className = 'ss-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = idx;

      const title = item.external || item.info?.title || '';
      const price = item.cheapest !== undefined ? `$${parseFloat(item.cheapest).toFixed(2)}` : '';
      const thumb = item.thumb || '';

      li.innerHTML = `
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" class="ss-thumb" loading="lazy">` : '<span class="ss-thumb-placeholder">🎮</span>'}
        <div class="ss-info">
          <span class="ss-title">${highlightMatch(escapeHtml(title), query)}</span>
          ${price ? `<span class="ss-price">${escapeHtml(price)}</span>` : ''}
        </div>
      `;

      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectSuggestion(idx);
      });
      li.addEventListener('mouseover', () => {
        setHighlight(idx);
      });

      dropdown.appendChild(li);
    });

    // History clear option
    const history = getHistory();
    if (!query && history.length) {
      const clearBtn = document.createElement('div');
      clearBtn.className = 'ss-clear-history';
      clearBtn.textContent = '🗑️ Clear History';
      clearBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        clearHistory();
        clearDropdown();
      });
      dropdown.appendChild(clearBtn);
    }

    const wrapper = document.querySelector('.search-input-wrapper');
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(dropdown);
    }
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) +
      `<mark class="ss-highlight">${text.slice(idx, idx + query.length)}</mark>` +
      text.slice(idx + query.length);
  }

  function clearDropdown() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
    currentSuggestions = [];
    selectedIndex = -1;
  }

  function setHighlight(idx) {
    selectedIndex = idx;
    dropdown?.querySelectorAll('.ss-item').forEach((el, i) => {
      el.classList.toggle('ss-item--active', i === idx);
      el.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
  }

  function selectSuggestion(idx) {
    const item = currentSuggestions[idx];
    if (!item) return;
    const title = item.external || item.info?.title || '';
    const input = document.getElementById('search-input');
    if (input) {
      input.value = title;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      addToHistory(title);
    }
    clearDropdown();
  }

  // ── Show History ─────────────────────────────────────────────────
  function showHistory() {
    const history = getHistory();
    if (!history.length) return;
    const items = history.map(q => ({
      external: q, cheapest: undefined, thumb: '', _isHistory: true,
    }));
    renderDropdown(items, '');

    // Add history indicator style
    dropdown?.querySelectorAll('.ss-item').forEach(el => {
      el.querySelector('.ss-info')?.insertAdjacentHTML('beforeend', '<span class="ss-hist-badge">🕐</span>');
    });
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (!q) { showHistory(); return; }
      debounceTimer = setTimeout(async () => {
        const results = await fetchSuggestions(q);
        renderDropdown(results, q);
      }, DEBOUNCE_MS);
    });

    input.addEventListener('focus', () => {
      if (!input.value.trim()) showHistory();
    });

    input.addEventListener('blur', () => {
      setTimeout(clearDropdown, 150);
    });

    input.addEventListener('keydown', (e) => {
      if (!dropdown) return;
      const items = dropdown.querySelectorAll('.ss-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(Math.min(selectedIndex + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(Math.max(selectedIndex - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          e.preventDefault();
          selectSuggestion(selectedIndex);
        } else {
          addToHistory(input.value.trim());
          clearDropdown();
        }
      } else if (e.key === 'Escape') {
        clearDropdown();
      }
    });

    // Submit form: save to history
    const form = document.querySelector('.search-filter-bar');
    if (form) {
      form.addEventListener('submit', () => addToHistory(input.value.trim()));
    }
  }

  return { init, getHistory, clearHistory };
})();

document.addEventListener('DOMContentLoaded', () => SmartSearchModule.init());
