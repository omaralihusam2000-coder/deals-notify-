/**
 * giveaways.js — GamerPower API integration
 * Handles fetching and rendering free game giveaways
 */

const GAMERPOWER_BASE = 'https://www.gamerpower.com/api';

const GiveawaysModule = (() => {
  let allGiveaways = [];
  let currentPlatform = 'pc';

  const PLATFORM_OPTIONS = [
    { value: 'pc',        label: 'All PC' },
    { value: 'steam',     label: 'Steam' },
    { value: 'epic-games-store', label: 'Epic Games' },
    { value: 'gog',       label: 'GOG' },
    { value: 'itch.io',   label: 'itch.io' },
    { value: 'android',   label: 'Android' },
    { value: 'ios',       label: 'iOS' },
    { value: 'vr',        label: 'VR' },
  ];

  const TYPE_OPTIONS = [
    { value: '',        label: 'All Types' },
    { value: 'game',    label: 'Games' },
    { value: 'loot',    label: 'In-Game Loot' },
    { value: 'beta',    label: 'Beta Keys' },
  ];

  /**
   * Build platform filter buttons
   */
  function buildPlatformFilter() {
    const container = document.getElementById('giveaway-platform-filters');
    if (!container) return;
    container.innerHTML = PLATFORM_OPTIONS.map(p => `
      <button class="filter-chip ${p.value === currentPlatform ? 'active' : ''}" 
              data-platform="${escapeHtml(p.value)}">
        ${escapeHtml(p.label)}
      </button>
    `).join('');

    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPlatform = btn.dataset.platform;
        container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fetchGiveaways();
      });
    });
  }

  /**
   * Build type filter dropdown
   */
  function buildTypeFilter() {
    const select = document.getElementById('giveaway-type-filter');
    if (!select) return;
    select.innerHTML = TYPE_OPTIONS.map(t =>
      `<option value="${escapeHtml(t.value)}">${escapeHtml(t.label)}</option>`
    ).join('');
    select.addEventListener('change', renderGiveaways);
  }

  /**
   * Fetch giveaways for the current platform
   */
  async function fetchGiveaways() {
    const container = document.getElementById('giveaways-grid');
    if (!container) return;

    showSkeletons(container, 6);

    try {
      const data = await fetchJSON(
        `${GAMERPOWER_BASE}/giveaways?platform=${encodeURIComponent(currentPlatform)}&sort-by=popularity`
      );
      // GamerPower returns 0 or an object with status on error
      if (!Array.isArray(data)) {
        allGiveaways = [];
      } else {
        allGiveaways = data;
      }
      renderGiveaways();
    } catch (err) {
      container.innerHTML = `<div class="error-state">
        <div class="error-icon">⚠️</div>
        <p>Failed to load giveaways. ${escapeHtml(err.message)}</p>
        <button class="btn btn-primary" onclick="GiveawaysModule.refresh()">Try Again</button>
      </div>`;
      showToast(`Failed to load giveaways: ${err.message}`, 'error');
    }
  }

  /**
   * Render the current giveaways list (with type filter applied)
   */
  function renderGiveaways() {
    const container = document.getElementById('giveaways-grid');
    if (!container) return;

    const typeFilter = document.getElementById('giveaway-type-filter');
    const selectedType = typeFilter ? typeFilter.value : '';

    const filtered = selectedType
      ? allGiveaways.filter(g => g.type && g.type.toLowerCase().includes(selectedType))
      : allGiveaways;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎁</div>
          <p>No giveaways found right now. Check back soon!</p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(giveaway => {
      container.appendChild(createGiveawayCard(giveaway));
    });
  }

  /**
   * Create a giveaway card DOM element
   * @param {object} giveaway
   * @returns {HTMLElement}
   */
  function createGiveawayCard(giveaway) {
    const card = document.createElement('div');
    card.className = 'card giveaway-card';

    const endDate = giveaway.end_date && giveaway.end_date !== 'N/A'
      ? `Ends: ${new Date(giveaway.end_date).toLocaleDateString()}`
      : 'Limited time';

    const worth = giveaway.worth && giveaway.worth !== 'N/A'
      ? `<span class="giveaway-worth">Worth ${escapeHtml(giveaway.worth)}</span>` : '';

    const platforms = (giveaway.platforms || '').split(', ').slice(0, 3).map(p =>
      `<span class="platform-tag">${escapeHtml(p.trim())}</span>`
    ).join('');

    card.innerHTML = `
      <div class="card-badge free-badge">FREE</div>
      <img class="card-img" 
           src="${escapeHtml(giveaway.image || giveaway.thumbnail || '')}" 
           alt="${escapeHtml(giveaway.title)}" 
           loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22100%22><rect fill=%22%231a1a2e%22 width=%22200%22 height=%22100%22/><text fill=%22%2300ff88%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎁</text></svg>'">
      <div class="card-body">
        <h3 class="card-title" title="${escapeHtml(giveaway.title)}">${escapeHtml(truncate(giveaway.title, 50))}</h3>
        <p class="card-description">${escapeHtml(truncate(giveaway.description || '', 100))}</p>
        <div class="giveaway-meta">
          ${worth}
          <span class="giveaway-type type-${escapeHtml((giveaway.type || '').toLowerCase())}">${escapeHtml(giveaway.type || 'Game')}</span>
        </div>
        <div class="platform-tags">${platforms}</div>
        <div class="card-footer">
          <span class="end-date">${escapeHtml(endDate)}</span>
          <a class="btn btn-sm btn-success giveaway-link" 
             href="${escapeHtml(giveaway.open_giveaway_url || giveaway.giveaway_url || '#')}" 
             target="_blank" 
             rel="noopener noreferrer">
            Claim Free
          </a>
        </div>
      </div>
    `;

    return card;
  }

  /**
   * Refresh giveaways
   */
  function refresh() {
    fetchGiveaways();
  }

  /**
   * Initialise the giveaways module
   */
  function init() {
    buildPlatformFilter();
    buildTypeFilter();
    fetchGiveaways();
  }

  return { init, refresh };
})();
