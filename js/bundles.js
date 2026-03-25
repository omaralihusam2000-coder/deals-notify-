/**
 * bundles.js — Bundle & Loot tracker via GamerPower API
 */

const BundlesModule = (() => {
  const GAMERPOWER_BASE = 'https://www.gamerpower.com/api';
  let loaded = false;

  async function fetchBundles() {
    const container = document.getElementById('bundles-grid');
    if (!container) return;

    showSkeletons(container, 6);

    try {
      const [loot, games] = await Promise.allSettled([
        fetchJSON(`${GAMERPOWER_BASE}/giveaways?type=loot`),
        fetchJSON(`${GAMERPOWER_BASE}/giveaways?type=game&platform=pc`)
      ]);

      let allBundles = [];

      if (loot.status === 'fulfilled' && Array.isArray(loot.value)) {
        allBundles.push(...loot.value.map(b => ({ ...b, _category: 'loot' })));
      }
      if (games.status === 'fulfilled' && Array.isArray(games.value)) {
        // Only include games that look like bundles (title contains "pack", "bundle", "dlc")
        const bundleKeywords = ['pack', 'bundle', 'dlc', 'collection', 'season pass'];
        const filtered = games.value.filter(g =>
          bundleKeywords.some(kw => g.title.toLowerCase().includes(kw))
        );
        allBundles.push(...filtered.map(b => ({ ...b, _category: 'bundle' })));
      }

      // Sort by publish date
      allBundles.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));

      if (allBundles.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🎁</div>
            <p>No bundles or loot available right now. Check back soon!</p>
          </div>`;
        return;
      }

      renderBundles(allBundles);
      loaded = true;
    } catch (err) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>Failed to load bundles: ${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="BundlesModule.fetchBundles()">Try Again</button>
        </div>`;
    }
  }

  function renderBundles(bundles) {
    const container = document.getElementById('bundles-grid');
    if (!container) return;
    container.innerHTML = '';

    bundles.forEach(bundle => {
      const card = document.createElement('div');
      card.className = 'card bundle-card';

      const endDate = bundle.end_date && bundle.end_date !== 'N/A'
        ? new Date(bundle.end_date)
        : null;
      const isExpiringSoon = endDate && (endDate - Date.now()) < 3 * 24 * 60 * 60 * 1000;
      const categoryLabel = bundle._category === 'loot' ? '🎁 Loot/DLC' : '📦 Bundle';

      card.innerHTML = `
        <div class="bundle-category-badge">${categoryLabel}</div>
        ${isExpiringSoon ? '<div class="bundle-expiry-badge">⏰ Ending Soon</div>' : ''}
        <img class="card-img" src="${escapeHtml(bundle.image || '')}" alt="${escapeHtml(bundle.title)}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22100%22><rect fill=%22%231a1a2e%22 width=%22200%22 height=%22100%22/><text fill=%22%2300d4ff%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎁</text></svg>'">
        <div class="card-body">
          <h3 class="card-title" title="${escapeHtml(bundle.title)}">${escapeHtml(truncate(bundle.title, 55))}</h3>
          <p class="bundle-description">${escapeHtml(truncate(bundle.description || '', 90))}</p>
          <div class="bundle-meta">
            ${bundle.platforms ? `<span class="bundle-platform">🖥️ ${escapeHtml(bundle.platforms)}</span>` : ''}
            ${endDate ? `<span class="bundle-end-date">Ends: ${endDate.toLocaleDateString()}</span>` : ''}
          </div>
          <div class="bundle-footer">
            <span class="bundle-value">${bundle.worth && bundle.worth !== 'N/A' ? `Value: $${escapeHtml(bundle.worth)}` : '🆓 Free'}</span>
            <a class="btn btn-sm btn-primary" href="${escapeHtml(bundle.open_giveaway_url || bundle.open_giveaway || '#')}"
               target="_blank" rel="noopener noreferrer">
              Claim 🎁
            </a>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function init() {
    if (!loaded) {
      fetchBundles();
    }
  }

  return { fetchBundles, renderBundles, init };
})();
