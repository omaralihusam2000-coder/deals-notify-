/**
 * collections.js — Curated & User-Created Game Collections
 */

const CollectionsModule = (() => {
  const USER_COLLECTIONS_KEY = 'user_collections';

  const CURATED = [
    { id: 'under5',    title: '🏆 Best Games Under $5',      desc: 'Top-rated deals under $5',                    filter: d => parseFloat(d.salePrice) <= 5 && parseInt(d.metacriticScore) >= 70 },
    { id: 'coop',      title: '👫 Best Co-op Games on Sale',  desc: 'Great for playing with friends',              filter: d => ['co-op','co op','multiplayer','coop'].some(k => (d.title||'').toLowerCase().includes(k)) || parseFloat(d.savings) >= 50 },
    { id: 'rpg',       title: '🗡️ Top RPG Deals',             desc: 'Role-playing games at great prices',          filter: d => ['rpg','dragon','quest','witcher','souls','fantasy','final fantasy','elder scrolls','baldur'].some(k => (d.title||'').toLowerCase().includes(k)) },
    { id: 'fps',       title: '🔫 FPS Deals This Week',       desc: 'Best first-person shooter deals',             filter: d => ['shooter','fps','doom','halo','wolfenstein','far cry','battlefield','call of duty'].some(k => (d.title||'').toLowerCase().includes(k)) },
    { id: 'indie',     title: '🎨 Best Indie Games on Sale',  desc: 'Indie gems at amazing prices',                filter: d => parseFloat(d.salePrice) <= 15 && parseInt(d.steamRatingPercent) >= 80 },
    { id: 'new',       title: '🆕 New Releases on Sale',      desc: 'Recently released games with discounts',      filter: d => parseFloat(d.savings) >= 20 && parseFloat(d.normalPrice) >= 30 },
    { id: 'toprated',  title: '⭐ Highest Rated Games',       desc: 'Best reviewed games currently on sale',       filter: d => parseInt(d.steamRatingPercent) >= 90 || parseInt(d.metacriticScore) >= 85 },
    { id: 'gift',      title: '🎄 Holiday Gift Guide',        desc: 'Great games to gift someone special',         filter: d => parseFloat(d.salePrice) <= 20 && parseInt(d.metacriticScore) >= 75 },
  ];

  let allDeals = [];
  let activeTab = 'curated';

  function getUserCollections() { return storageGet(USER_COLLECTIONS_KEY, []); }
  function setUserCollections(c) { storageSet(USER_COLLECTIONS_KEY, c); }

  async function fetchDeals() {
    if (allDeals.length > 0) return;
    try {
      allDeals = await fetchJSON('https://www.cheapshark.com/api/1.0/deals?pageSize=60&sortBy=DealRating&desc=1');
    } catch {
      allDeals = [];
    }
  }

  function getContainer() { return document.getElementById('collections-container'); }

  function renderCollectionCard(col, deals) {
    const count = deals.length;
    const previewImgs = deals.slice(0, 3).map(d =>
      `<img src="${escapeHtml(d.thumb)}" alt="" class="col-preview-img"
            onerror="this.style.display='none'">`
    ).join('');

    return `
      <div class="col-card" data-col-id="${escapeHtml(col.id)}">
        <div class="col-preview-imgs">${previewImgs}</div>
        <div class="col-card-info">
          <h3 class="col-card-title">${escapeHtml(col.title)}</h3>
          <p class="col-card-desc">${escapeHtml(col.desc)}</p>
          <div class="col-card-meta">
            <span class="col-count">${count} deals</span>
            <button class="btn btn-primary btn-sm col-view-btn">View →</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCollectionDeals(col, deals) {
    const container = getContainer();
    if (!container) return;
    container.innerHTML = `
      <button class="btn btn-ghost btn-sm col-back-btn" style="margin-bottom:1rem;">← Back to Collections</button>
      <div class="section-header">
        <h2 class="section-title">${escapeHtml(col.title)}</h2>
      </div>
      <p class="text-muted" style="margin-bottom:1.25rem;">${escapeHtml(col.desc)}</p>
      <div class="cards-grid col-deals-grid">
        ${deals.length === 0
          ? '<div class="empty-state"><div class="empty-icon">🔍</div><p>No deals found for this collection right now.</p></div>'
          : deals.map(deal => `
            <div class="card deal-card col-deal-card" data-deal-id="${escapeHtml(deal.dealID)}">
              <div class="card-badge discount-badge">-${Math.round(parseFloat(deal.savings))}%</div>
              <img class="card-img" src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" loading="lazy"
                   onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22100%22><rect fill=%22%231a1a2e%22 width=%22200%22 height=%22100%22/><text fill=%22%2300d4ff%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎮</text></svg>'">
              <div class="card-body">
                <h3 class="card-title">${escapeHtml(truncate(deal.title, 50))}</h3>
                <div class="card-prices">
                  <span class="price-sale">$${parseFloat(deal.salePrice).toFixed(2)}</span>
                  ${parseFloat(deal.normalPrice) > 0 ? `<span class="price-original">$${parseFloat(deal.normalPrice).toFixed(2)}</span>` : ''}
                </div>
                <div class="card-footer">
                  <a class="btn btn-primary btn-sm" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener noreferrer">Get Deal</a>
                  <button class="btn btn-ghost btn-xs col-share-deal-btn">📤</button>
                </div>
              </div>
            </div>
          `).join('')}
      </div>
    `;

    container.querySelector('.col-back-btn').addEventListener('click', () => render());

    container.querySelectorAll('.col-share-deal-btn').forEach((btn, i) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ShareModule !== 'undefined' && deals[i]) ShareModule.shareDeal(deals[i]);
      });
    });

    container.querySelectorAll('.col-deal-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        if (typeof GameDetailModule !== 'undefined' && deals[i]) GameDetailModule.open(deals[i]);
      });
    });
  }

  function renderUserCollectionsPanel() {
    const userCols = getUserCollections();
    if (userCols.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">📚</div><p>You haven't created any collections yet.</p></div>`;
    }
    return userCols.map(col => `
      <div class="col-user-card">
        <div>
          <strong>${escapeHtml(col.name)}</strong>
          <span class="text-muted" style="margin-left:0.5rem;">${(col.games || []).length} games</span>
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button class="btn btn-outline btn-xs col-share-collection-btn" data-col-id="${escapeHtml(col.id)}">📤 Share</button>
          <button class="btn btn-danger btn-xs col-delete-btn" data-col-id="${escapeHtml(col.id)}">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function render() {
    const container = getContainer();
    if (!container) return;

    const curatedHTML = CURATED.map(col => {
      const deals = allDeals.filter(col.filter).slice(0, 12);
      return renderCollectionCard(col, deals);
    }).join('');

    container.innerHTML = `
      <div class="col-tabs">
        <button class="col-tab ${activeTab === 'curated' ? 'active' : ''}" data-tab="curated">🏆 Curated</button>
        <button class="col-tab ${activeTab === 'user' ? 'active' : ''}" data-tab="user">👤 My Collections</button>
      </div>

      <div id="col-panel-curated" class="col-panel" ${activeTab !== 'curated' ? 'style="display:none"' : ''}>
        <div class="col-grid">${curatedHTML}</div>
      </div>

      <div id="col-panel-user" class="col-panel" ${activeTab !== 'user' ? 'style="display:none"' : ''}>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h3 class="section-subtitle" style="margin:0;">My Collections</h3>
          <button class="btn btn-primary btn-sm" id="col-create-btn">➕ New Collection</button>
        </div>
        <div id="col-user-list">${renderUserCollectionsPanel()}</div>
      </div>
    `;

    // Tab switching
    container.querySelectorAll('.col-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        container.querySelectorAll('.col-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        container.querySelectorAll('.col-panel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById(`col-panel-${activeTab}`);
        if (panel) panel.style.display = 'block';
      });
    });

    // View collection
    container.querySelectorAll('.col-view-btn').forEach(btn => {
      const card = btn.closest('.col-card');
      const colId = card && card.dataset.colId;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const col = CURATED.find(c => c.id === colId);
        if (col) {
          const deals = allDeals.filter(col.filter).slice(0, 20);
          renderCollectionDeals(col, deals);
        }
      });
    });

    // Create user collection
    const createBtn = container.querySelector('#col-create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const name = prompt('Collection name:');
        if (!name || !name.trim()) return;
        const cols = getUserCollections();
        cols.push({ id: Date.now().toString(), name: name.trim(), games: [], created: new Date().toISOString() });
        setUserCollections(cols);
        showToast('Collection created!', 'success');
        render();
      });
    }

    // Delete user collection
    container.querySelectorAll('.col-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.dataset.colId;
        const cols = getUserCollections().filter(c => c.id !== colId);
        setUserCollections(cols);
        showToast('Collection deleted.', 'info');
        render();
      });
    });

    // Share user collection
    container.querySelectorAll('.col-share-collection-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.dataset.colId;
        const col = getUserCollections().find(c => c.id === colId);
        if (col) {
          const text = `📚 My gaming collection "${col.name}" — ${col.games.length} games curated on Gaming Deals Notifier!`;
          if (typeof ShareModule !== 'undefined') {
            ShareModule.copyToClipboard(text).then(() => showToast('Collection text copied!', 'success'));
          }
        }
      });
    });
  }

  let initialized = false;

  async function init() {
    if (!initialized) {
      initialized = true;
      await fetchDeals();
    }
    render();
  }

  return { init };
})();
