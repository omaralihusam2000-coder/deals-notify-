/**
 * spotlight.js — Global command palette search overlay (Ctrl+K / Cmd+K)
 */
const SpotlightModule = (() => {
  const STORAGE_KEY = 'gdn_recent_searches';
  let isOpen = false;
  let selectedIndex = -1;
  let allResults = [];

  const SECTIONS = [
    { id: 'deals', label: '🔥 Deals' },
    { id: 'giveaways', label: '🆓 Free Games' },
    { id: 'bundles', label: '🎁 Bundles' },
    { id: 'console', label: '🎮 Console' },
    { id: 'news', label: '📰 News' },
    { id: 'calendar', label: '📅 Calendar' },
    { id: 'quiz', label: '🎮 Quiz' },
    { id: 'collections', label: '📚 Collections' },
    { id: 'wishlist', label: '⭐ Wishlist' },
    { id: 'achievements', label: '🏅 Achievements' },
    { id: 'profile', label: '👤 Profile' },
    { id: 'settings', label: '⚙️ Settings' },
  ];

  const QUICK_ACTIONS = [
    { label: '🌙 Toggle Theme', action: () => document.getElementById('theme-toggle')?.click() },
    { label: '🗑️ Clear Wishlist', action: () => { AppModule.switchTab('wishlist'); setTimeout(() => document.getElementById('clear-wishlist-btn')?.click(), 300); } },
    { label: '🔔 Enable Notifications', action: () => { AppModule.switchTab('settings'); } },
    { label: '🎲 Random Deal', action: () => { AppModule.switchTab('achievements'); setTimeout(() => document.getElementById('random-deal-btn')?.click(), 300); } },
  ];

  function getRecentSearches() {
    return storageGet(STORAGE_KEY, []);
  }

  function saveSearch(query) {
    if (!query.trim()) return;
    let searches = getRecentSearches();
    searches = [query, ...searches.filter(s => s !== query)].slice(0, 10);
    storageSet(STORAGE_KEY, searches);
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    const overlay = document.createElement('div');
    overlay.className = 'spotlight-overlay';
    overlay.id = 'spotlight-overlay';
    overlay.innerHTML = `
      <div class="spotlight-modal" role="dialog" aria-label="Search">
        <div class="spotlight-input-wrap">
          <span class="spotlight-search-icon">🔍</span>
          <input type="text" class="spotlight-input" id="spotlight-input" placeholder="Search deals, games, sections…" autocomplete="off" aria-label="Search">
          <kbd class="spotlight-esc-hint">ESC</kbd>
        </div>
        <div class="spotlight-results" id="spotlight-results"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('spotlight-visible'));

    const input = document.getElementById('spotlight-input');
    input.focus();
    renderResults('');

    input.addEventListener('input', () => renderResults(input.value));
    input.addEventListener('keydown', handleKeydown);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    if (typeof SoundsModule !== 'undefined') SoundsModule.click();
  }

  function close() {
    const overlay = document.getElementById('spotlight-overlay');
    if (!overlay) return;
    isOpen = false;
    selectedIndex = -1;
    overlay.classList.remove('spotlight-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  function renderResults(query) {
    const container = document.getElementById('spotlight-results');
    if (!container) return;
    allResults = [];
    let html = '';
    const q = query.toLowerCase().trim();

    // Sections
    const matchedSections = q ? SECTIONS.filter(s => s.label.toLowerCase().includes(q) || s.id.includes(q)) : SECTIONS;
    if (matchedSections.length > 0) {
      html += `<div class="spotlight-group-header">📂 Sections</div>`;
      matchedSections.forEach(s => {
        allResults.push({ type: 'section', data: s });
        html += `<div class="spotlight-item" data-index="${allResults.length - 1}" role="option">${s.label}</div>`;
      });
    }

    // Recent searches
    if (!q) {
      const recent = getRecentSearches();
      if (recent.length > 0) {
        html += `<div class="spotlight-group-header">🕐 Recent Searches</div>`;
        recent.forEach(s => {
          allResults.push({ type: 'search', data: s });
          html += `<div class="spotlight-item" data-index="${allResults.length - 1}" role="option">🔍 ${escapeHtml(s)}</div>`;
        });
      }
    }

    // Quick actions
    const matchedActions = q ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q)) : QUICK_ACTIONS;
    if (matchedActions.length > 0) {
      html += `<div class="spotlight-group-header">⚡ Quick Actions</div>`;
      matchedActions.forEach(a => {
        allResults.push({ type: 'action', data: a });
        html += `<div class="spotlight-item" data-index="${allResults.length - 1}" role="option">${a.label}</div>`;
      });
    }

    if (!html) html = `<div class="spotlight-empty">No results for "${escapeHtml(query)}"</div>`;
    container.innerHTML = html;
    selectedIndex = -1;

    container.querySelectorAll('.spotlight-item').forEach(item => {
      item.addEventListener('click', () => selectResult(parseInt(item.dataset.index)));
      item.addEventListener('mouseenter', () => {
        selectedIndex = parseInt(item.dataset.index);
        updateSelection();
      });
    });
  }

  function selectResult(index) {
    const result = allResults[index];
    if (!result) return;
    const input = document.getElementById('spotlight-input');
    if (input && input.value.trim()) saveSearch(input.value.trim());
    if (result.type === 'section') {
      AppModule.switchTab(result.data.id);
    } else if (result.type === 'search') {
      if (input) input.value = result.data;
      renderResults(result.data);
      return;
    } else if (result.type === 'action') {
      result.data.action();
    }
    close();
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, allResults.length - 1);
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) selectResult(selectedIndex);
      else {
        const query = document.getElementById('spotlight-input')?.value.trim();
        if (query) saveSearch(query);
        close();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  }

  function updateSelection() {
    document.querySelectorAll('.spotlight-item').forEach((item) => {
      item.classList.toggle('spotlight-item-active', parseInt(item.dataset.index) === selectedIndex);
    });
    const active = document.querySelector('.spotlight-item-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function init() {
    // Add search button to header
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm spotlight-btn';
      btn.id = 'spotlight-btn';
      btn.setAttribute('aria-label', 'Open search');
      btn.setAttribute('data-tooltip', 'Search (Ctrl+K)');
      btn.textContent = '🔍';
      btn.addEventListener('click', open);
      headerActions.insertBefore(btn, headerActions.firstChild);
    }

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) close(); else open();
      }
    });
  }

  return { init, open, close };
})();
