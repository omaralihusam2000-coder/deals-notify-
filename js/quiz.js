/**
 * quiz.js — "What Should I Play?" Quiz
 * Multi-step interactive quiz to recommend games from current deals.
 */

const QuizModule = (() => {
  const STORAGE_KEY = 'quiz_results';

  const GENRES = [
    { id: 'rpg',       label: 'RPG',       emoji: '⚔️' },
    { id: 'fps',       label: 'FPS',       emoji: '🔫' },
    { id: 'strategy',  label: 'Strategy',  emoji: '♟️' },
    { id: 'adventure', label: 'Adventure', emoji: '🗺️' },
    { id: 'puzzle',    label: 'Puzzle',    emoji: '🧩' },
    { id: 'horror',    label: 'Horror',    emoji: '👻' },
    { id: 'sports',    label: 'Sports',    emoji: '⚽' },
    { id: 'indie',     label: 'Indie',     emoji: '🎨' },
  ];

  const PLATFORMS = [
    { id: 'pc',       label: 'PC',          emoji: '🖥️' },
    { id: 'ps',       label: 'PlayStation', emoji: '🟦' },
    { id: 'xbox',     label: 'Xbox',        emoji: '🟩' },
    { id: 'nintendo', label: 'Nintendo',    emoji: '🔴' },
    { id: 'mobile',   label: 'Mobile',      emoji: '📱' },
  ];

  const STEPS = [
    { id: 'genre',      title: 'What genres do you enjoy?',         type: 'multi-select', options: GENRES },
    { id: 'budget',     title: 'What\'s your budget?',              type: 'slider',       min: 0, max: 60 },
    { id: 'platform',   title: 'Which platform?',                   type: 'single-select',options: PLATFORMS },
    { id: 'multiplayer',title: 'Multiplayer or single player?',     type: 'toggle',       options: [{ id: 'multi', label: 'Multiplayer', emoji: '👫' }, { id: 'single', label: 'Single Player', emoji: '🎮' }] },
    { id: 'playtime',   title: 'How much time do you have?',        type: 'single-select',options: [
      { id: 'quick',  label: 'Quick', desc: '< 5 hrs',    emoji: '⚡' },
      { id: 'medium', label: 'Medium',desc: '5–20 hrs',   emoji: '🕐' },
      { id: 'long',   label: 'Long',  desc: '20+ hrs',    emoji: '🏰' },
    ]},
  ];

  let currentStep = 0;
  let answers = { genre: [], budget: 30, platform: null, multiplayer: null, playtime: null };
  let allDeals = [];

  function getContainer() { return document.getElementById('quiz-container'); }

  async function fetchDealsForQuiz() {
    try {
      const deals = await fetchJSON('https://www.cheapshark.com/api/1.0/deals?pageSize=60&sortBy=DealRating&desc=1');
      allDeals = deals;
    } catch {
      allDeals = [];
    }
  }

  function scoreGame(deal, answers) {
    let score = 0;
    const title = (deal.title || '').toLowerCase();
    const price = parseFloat(deal.salePrice) || 0;

    // Budget check
    if (price <= answers.budget) score += 30;
    else score -= 20;

    // Genre keyword matching
    const genreKeywords = {
      rpg: ['rpg', 'role', 'dragon', 'quest', 'fantasy', 'witcher', 'souls', 'final', 'elder', 'baldur'],
      fps: ['shooter', 'fps', 'call of duty', 'battlefield', 'doom', 'halo', 'counter', 'wolfenstein', 'far cry'],
      strategy: ['strategy', 'civilization', 'total war', 'starcraft', 'anno', 'cities', 'tropico', 'xcom', 'warcraft'],
      adventure: ['adventure', 'tomb', 'uncharted', 'zelda', 'metroid', 'batman', 'spider', 'horizon'],
      puzzle: ['puzzle', 'portal', 'tetris', 'witness', 'talos', 'braid', 'monument'],
      horror: ['horror', 'resident', 'dead', 'silent hill', 'outlast', 'alien', 'fear', 'soma'],
      sports: ['fifa', 'nba', 'nhl', 'football', 'soccer', 'tennis', '2k', 'rocket league'],
      indie: ['indie', 'pixel', 'rogue', 'platformer', 'stardew', 'hollow', 'celeste', 'hades'],
    };

    (answers.genre || []).forEach(g => {
      const kws = genreKeywords[g] || [];
      if (kws.some(kw => title.includes(kw))) score += 20;
    });

    // Steam rating bonus
    const steamRating = parseInt(deal.steamRatingPercent) || 0;
    score += Math.floor(steamRating / 10);

    // Metacritic bonus
    const mc = parseInt(deal.metacriticScore) || 0;
    if (mc >= 75) score += 10;

    // Savings bonus
    score += Math.floor((parseFloat(deal.savings) || 0) / 10);

    return Math.max(0, Math.min(100, score));
  }

  function renderStep() {
    const container = getContainer();
    if (!container) return;

    const step = STEPS[currentStep];
    const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

    let optionsHTML = '';

    if (step.type === 'multi-select' || step.type === 'single-select') {
      optionsHTML = `<div class="quiz-options ${step.type === 'multi-select' ? 'quiz-multi' : 'quiz-single'}">
        ${step.options.map(opt => {
          const isSelected = step.type === 'multi-select'
            ? (answers[step.id] || []).includes(opt.id)
            : answers[step.id] === opt.id;
          return `
            <button class="quiz-option-card ${isSelected ? 'selected' : ''}" data-id="${escapeHtml(opt.id)}">
              <span class="quiz-option-emoji">${opt.emoji}</span>
              <span class="quiz-option-label">${escapeHtml(opt.label)}</span>
              ${opt.desc ? `<span class="quiz-option-desc">${escapeHtml(opt.desc)}</span>` : ''}
            </button>`;
        }).join('')}
      </div>`;
    }

    if (step.type === 'slider') {
      optionsHTML = `
        <div class="quiz-slider-wrap">
          <div class="quiz-budget-display">$<span id="quiz-budget-val">${answers.budget}</span></div>
          <input type="range" id="quiz-budget-slider" class="quiz-slider"
                 min="${step.min}" max="${step.max}" value="${answers.budget}" step="1">
          <div class="quiz-slider-labels">
            <span>Free</span><span>$${step.max}</span>
          </div>
        </div>`;
    }

    if (step.type === 'toggle') {
      optionsHTML = `<div class="quiz-toggle-row">
        ${step.options.map(opt => {
          const isSelected = answers[step.id] === opt.id;
          return `
            <button class="quiz-toggle-btn ${isSelected ? 'selected' : ''}" data-id="${escapeHtml(opt.id)}">
              <span class="quiz-toggle-emoji">${opt.emoji}</span>
              <span>${escapeHtml(opt.label)}</span>
            </button>`;
        }).join('')}
      </div>`;
    }

    container.innerHTML = `
      <div class="quiz-wrap">
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="quiz-step-indicator">Step ${currentStep + 1} of ${STEPS.length}</div>
        <h2 class="quiz-step-title">${escapeHtml(step.title)}</h2>
        ${optionsHTML}
        <div class="quiz-nav">
          ${currentStep > 0 ? '<button class="btn btn-ghost btn-sm quiz-back-btn">← Back</button>' : '<span></span>'}
          <button class="btn btn-primary quiz-next-btn" ${canProceed() ? '' : 'disabled'}>
            ${currentStep === STEPS.length - 1 ? '🎮 Find My Games!' : 'Next →'}
          </button>
        </div>
      </div>
    `;

    // Bind events
    container.querySelectorAll('.quiz-option-card, .quiz-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const s = STEPS[currentStep];
        if (s.type === 'multi-select') {
          const arr = answers[s.id] || [];
          const idx = arr.indexOf(id);
          if (idx === -1) arr.push(id); else arr.splice(idx, 1);
          answers[s.id] = arr;
        } else {
          answers[s.id] = id;
        }
        renderStep();
      });
    });

    const slider = container.querySelector('#quiz-budget-slider');
    if (slider) {
      slider.addEventListener('input', () => {
        answers.budget = parseInt(slider.value);
        const valEl = container.querySelector('#quiz-budget-val');
        if (valEl) valEl.textContent = slider.value;
        const nextBtn = container.querySelector('.quiz-next-btn');
        if (nextBtn) nextBtn.disabled = !canProceed();
      });
    }

    const nextBtn = container.querySelector('.quiz-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentStep === STEPS.length - 1) {
          showResults();
        } else {
          currentStep++;
          renderStep();
        }
      });
    }

    const backBtn = container.querySelector('.quiz-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (currentStep > 0) { currentStep--; renderStep(); }
      });
    }
  }

  function canProceed() {
    const step = STEPS[currentStep];
    if (step.type === 'multi-select') return (answers[step.id] || []).length > 0;
    if (step.type === 'slider') return true;
    if (step.type === 'single-select' || step.type === 'toggle') return answers[step.id] !== null;
    return true;
  }

  async function showResults() {
    const container = getContainer();
    if (!container) return;

    container.innerHTML = `<div class="quiz-wrap"><div class="modal-loading"><div class="spinner"></div><p>Finding your perfect games…</p></div></div>`;

    if (allDeals.length === 0) await fetchDealsForQuiz();

    const scored = allDeals
      .map(deal => ({ deal, score: scoreGame(deal, answers) }))
      .filter(x => x.score > 0 && parseFloat(x.deal.salePrice) <= answers.budget)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    if (typeof GamificationModule !== 'undefined') {
      GamificationModule.recordEvent('quiz_complete');
    }

    storageSet(STORAGE_KEY, { answers, results: scored.map(x => x.deal.gameID), date: new Date().toISOString() });

    container.innerHTML = `
      <div class="quiz-results">
        <h2 class="quiz-results-title">🎮 Your Perfect Games!</h2>
        <p class="text-muted quiz-results-subtitle">Based on your preferences, here are our top picks:</p>
        <div class="quiz-results-grid">
          ${scored.length === 0 ? '<p class="text-muted">No deals found matching your preferences. Try a different budget or genres!</p>' :
            scored.map(({ deal, score }, idx) => `
              <div class="quiz-result-card" style="animation-delay:${idx * 0.1}s">
                <div class="quiz-match-score">${score}% Match</div>
                <img src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" class="quiz-result-img">
                <div class="quiz-result-info">
                  <div class="quiz-result-title">${escapeHtml(truncate(deal.title, 40))}</div>
                  <div class="quiz-result-price">
                    <span class="price-sale">$${parseFloat(deal.salePrice).toFixed(2)}</span>
                    <span class="badge badge-green">-${Math.round(parseFloat(deal.savings))}%</span>
                  </div>
                  <a class="btn btn-primary btn-sm" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener noreferrer">
                    🎮 Get Deal
                  </a>
                </div>
              </div>
            `).join('')}
        </div>
        <div class="quiz-results-actions">
          <button class="btn btn-outline" id="quiz-retake-btn">🔄 Retake Quiz</button>
          <button class="btn btn-ghost btn-sm" id="quiz-share-btn">📤 Share Results</button>
        </div>
      </div>
    `;

    container.querySelector('#quiz-retake-btn').addEventListener('click', () => {
      currentStep = 0;
      answers = { genre: [], budget: 30, platform: null, multiplayer: null, playtime: null };
      renderStep();
    });

    container.querySelector('#quiz-share-btn').addEventListener('click', () => {
      const top = scored[0];
      if (top && typeof ShareModule !== 'undefined') {
        ShareModule.shareDeal({ ...top.deal, title: `Based on my quiz, I should play ${top.deal.title}! 🎮` });
      }
    });
  }

  let initialized = false;

  function init() {
    if (!initialized) {
      initialized = true;
      fetchDealsForQuiz();
    }
    currentStep = 0;
    answers = { genre: [], budget: 30, platform: null, multiplayer: null, playtime: null };
    renderStep();
  }

  return { init };
})();
