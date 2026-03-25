/**
 * steam-import.js — Steam Library Import
 * Users paste game names (comma-separated) to mark owned games.
 */

const SteamImportModule = (() => {
  const OWNED_KEY = 'steam_owned_games';

  function getOwnedGames() {
    return storageGet(OWNED_KEY, []);
  }

  function isOwned(gameTitle) {
    if (!gameTitle) return false;
    const owned = getOwnedGames();
    const lower = gameTitle.toLowerCase().trim();
    // Pre-normalize owned list once per call for efficiency
    const ownedNorm = owned.map(g => g.toLowerCase().trim());
    return ownedNorm.some(g => g === lower || lower.includes(g) || g.includes(lower));
  }

  function importFromText(text) {
    if (!text || !text.trim()) return 0;
    const lines = text
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 200);

    const existing = getOwnedGames();
    const existingNorm = new Set(existing.map(g => g.toLowerCase().trim()));
    const newGames = lines.filter(g => !existingNorm.has(g.toLowerCase().trim()));
    storageSet(OWNED_KEY, [...existing, ...newGames]);
    return newGames.length;
  }

  function clearOwned() {
    storageSet(OWNED_KEY, []);
  }

  function renderImportSection() {
    const container = document.getElementById('steam-import-section');
    if (!container) return;

    const owned = getOwnedGames();

    container.innerHTML = `
      <div class="settings-card">
        <h3 class="settings-card-title">🎮 Steam Library Import</h3>
        <p class="settings-desc">
          Paste your game names (comma-separated or one per line) to mark games you already own.
          Owned games will be highlighted in deal cards.
        </p>
        <div class="steam-import-form">
          <textarea
            id="steam-games-input"
            class="steam-textarea"
            placeholder="Counter-Strike 2, Dota 2, Half-Life: Alyx, …"
            rows="5"
            aria-label="Enter game names"
          ></textarea>
          <div class="steam-import-actions">
            <button id="steam-import-btn" class="btn btn-primary">
              📥 Import Games
            </button>
            <button id="steam-clear-btn" class="btn btn-danger btn-sm">
              🗑️ Clear Library
            </button>
          </div>
        </div>
        <div class="steam-library-info">
          <p class="settings-desc">
            📚 Library: <strong id="steam-library-count">${owned.length}</strong> games imported
          </p>
          ${owned.length > 0 ? `
            <details class="steam-library-details">
              <summary>View imported games</summary>
              <div class="steam-library-list">
                ${owned.map(g => `<span class="steam-game-tag">${escapeHtml(g)}</span>`).join('')}
              </div>
            </details>
          ` : ''}
        </div>
      </div>
    `;

    const importBtn = document.getElementById('steam-import-btn');
    const clearBtn = document.getElementById('steam-clear-btn');
    const input = document.getElementById('steam-games-input');

    if (importBtn && input) {
      importBtn.addEventListener('click', () => {
        const count = importFromText(input.value);
        if (count > 0) {
          input.value = '';
          showToast(`✅ Imported ${count} game(s) to your library!`, 'success');
          renderImportSection();
        } else {
          showToast('Please enter at least one game name.', 'warning');
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all imported games from your library?')) {
          clearOwned();
          showToast('Steam library cleared.', 'info');
          renderImportSection();
        }
      });
    }
  }

  function init() {
    renderImportSection();
  }

  return { getOwnedGames, isOwned, importFromText, clearOwned, renderImportSection, init };
})();
