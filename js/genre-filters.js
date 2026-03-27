/**
 * genre-filters.js — Tags & Genre Filter Chips for Deals tab
 * Adds clickable genre chips below the search-filter-bar.
 * Multiple genre selection (AND logic). Stores favorites in localStorage.
 */

const GenreFiltersModule = (() => {
  const FAVORITES_KEY = 'fav_genres';
  const GENRES = [
    { id: 'rpg',        label: '⚔️ RPG',       keywords: ['rpg', 'role', 'fantasy', 'dragon', 'quest', 'witcher', 'elden', 'baldur', 'final fantasy', 'dark souls'] },
    { id: 'fps',        label: '🔫 FPS',        keywords: ['fps', 'shooter', 'first-person', 'doom', 'halo', 'call of duty', 'battlefield', 'counter-strike', 'overwatch'] },
    { id: 'strategy',   label: '🧠 Strategy',   keywords: ['strategy', 'rts', 'civilization', 'total war', 'age of empires', 'starcraft', 'xcom', 'commandos'] },
    { id: 'adventure',  label: '🗺️ Adventure',  keywords: ['adventure', 'exploration', 'zelda', 'tomb raider', 'uncharted', 'journey', 'metroid'] },
    { id: 'puzzle',     label: '🧩 Puzzle',     keywords: ['puzzle', 'logic', 'portal', 'tetris', 'baba', 'monument valley', 'talos'] },
    { id: 'racing',     label: '🏎️ Racing',     keywords: ['racing', 'cars', 'forza', 'need for speed', 'f1', 'dirt', 'gran turismo', 'burnout'] },
    { id: 'sports',     label: '⚽ Sports',     keywords: ['sports', 'football', 'soccer', 'fifa', 'nba', 'madden', 'basketball', 'baseball', 'tennis'] },
    { id: 'simulation', label: '🌾 Simulation', keywords: ['simulation', 'sim', 'farming', 'cities', 'sims', 'cities skylines', 'planet', 'flight'] },
    { id: 'horror',     label: '👻 Horror',     keywords: ['horror', 'scary', 'resident evil', 'silent hill', 'outlast', 'alien', 'dead space', 'amnesia'] },
    { id: 'indie',      label: '🎨 Indie',      keywords: ['indie', 'pixel', 'retro', 'platformer', 'stardew', 'hollow knight', 'celeste', 'undertale'] },
  ];

  let selectedGenres = new Set();
  let container = null;

  function getFavorites() {
    try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []); }
    catch { return new Set(); }
  }

  function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...selectedGenres]));
  }

  function matchesGenre(dealTitle, genreId) {
    const genre = GENRES.find(g => g.id === genreId);
    if (!genre) return false;
    const title = (dealTitle || '').toLowerCase();
    return genre.keywords.some(kw => title.includes(kw));
  }

  function filterDeals() {
    if (!selectedGenres.size) {
      document.querySelectorAll('#deals-grid .deal-card').forEach(card => {
        card.style.display = '';
      });
      return;
    }

    document.querySelectorAll('#deals-grid .deal-card').forEach(card => {
      const title = card.querySelector('.card-title')?.textContent || card.dataset.title || '';
      const matches = [...selectedGenres].every(genreId => matchesGenre(title, genreId));
      card.style.display = matches ? '' : 'none';
    });
  }

  function toggleGenre(genreId) {
    if (selectedGenres.has(genreId)) {
      selectedGenres.delete(genreId);
    } else {
      selectedGenres.add(genreId);
    }
    saveFavorites();
    updateChips();
    filterDeals();
  }

  function updateChips() {
    if (!container) return;
    container.querySelectorAll('.genre-chip').forEach(chip => {
      const id = chip.dataset.genre;
      chip.classList.toggle('genre-chip--active', selectedGenres.has(id));
      chip.setAttribute('aria-pressed', selectedGenres.has(id) ? 'true' : 'false');
    });
  }

  function clearGenres() {
    selectedGenres.clear();
    saveFavorites();
    updateChips();
    filterDeals();
  }

  function render() {
    container = document.getElementById('genre-filters-container');
    if (!container) return;

    const favorites = getFavorites();
    // Restore favorites as selected on load
    favorites.forEach(g => selectedGenres.add(g));

    container.innerHTML = `
      <div class="genre-filters-inner" role="group" aria-label="Filter by genre">
        <span class="genre-filters-label">Genres:</span>
        <div class="genre-chips-wrap">
          ${GENRES.map(g => `
            <button class="genre-chip${selectedGenres.has(g.id) ? ' genre-chip--active' : ''}"
                    data-genre="${g.id}"
                    role="checkbox"
                    aria-pressed="${selectedGenres.has(g.id) ? 'true' : 'false'}"
                    aria-label="Filter by ${g.label}">${escapeHtml(g.label)}</button>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-xs genre-clear-btn" id="genre-clear-btn" aria-label="Clear genre filters" style="display:${selectedGenres.size ? 'inline-flex' : 'none'}">✕ Clear</button>
      </div>
    `;

    container.querySelectorAll('.genre-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        toggleGenre(chip.dataset.genre);
        const clearBtn = container.querySelector('#genre-clear-btn');
        if (clearBtn) clearBtn.style.display = selectedGenres.size ? 'inline-flex' : 'none';
      });
    });

    container.querySelector('#genre-clear-btn')?.addEventListener('click', () => {
      clearGenres();
      container.querySelector('#genre-clear-btn').style.display = 'none';
    });
  }

  // Re-apply filter when deals grid changes (MutationObserver)
  function observeDealsGrid() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;
    const observer = new MutationObserver(() => {
      if (selectedGenres.size) filterDeals();
    });
    observer.observe(grid, { childList: true });
  }

  function init() {
    render();
    observeDealsGrid();
  }

  return { init, filterDeals, getSelectedGenres: () => [...selectedGenres], GENRES };
})();

document.addEventListener('DOMContentLoaded', () => GenreFiltersModule.init());
