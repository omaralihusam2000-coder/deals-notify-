/**
 * reviews.js — Rate & Review Deals
 * Adds thumbs up/down to deal cards. Reviews stored in localStorage.
 * Shows aggregate rating on cards and a Top Rated Deals section.
 */

const ReviewsModule = (() => {
  const REVIEWS_KEY = 'deal_reviews';
  const MAX_CHARS   = 200;

  function getReviews() {
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || {}; }
    catch { return {}; }
  }

  function saveReviews(reviews) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  }

  function getAggregate(dealID) {
    const reviews = getReviews();
    const list = reviews[dealID] || [];
    if (!list.length) return null;
    const pos = list.filter(r => r.vote === 'up').length;
    return { total: list.length, positive: pos, pct: Math.round((pos / list.length) * 100) };
  }

  function hasVoted(dealID) {
    const reviews = getReviews();
    return !!(reviews[dealID] || []).find(r => r.own);
  }

  function submitReview(dealID, vote, text) {
    const reviews = getReviews();
    if (!reviews[dealID]) reviews[dealID] = [];
    // Remove previous own vote
    reviews[dealID] = reviews[dealID].filter(r => !r.own);
    reviews[dealID].push({ vote, text, own: true, ts: Date.now() });
    saveReviews(reviews);
    if (typeof GamificationModule !== 'undefined') GamificationModule.recordEvent('review');
    showToast(vote === 'up' ? '👍 Thanks for your review!' : '👎 Feedback saved!', 'success');
    refreshCard(dealID);
  }

  // ── Review Form ──────────────────────────────────────────────────
  function showReviewForm(dealID, dealTitle, vote) {
    document.getElementById('review-form-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'review-form-overlay';
    overlay.className = 'rv-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Leave a review');

    overlay.innerHTML = `
      <div class="rv-form-modal">
        <div class="rv-form-header">
          <h4>${vote === 'up' ? '👍 Recommend Deal' : '👎 Leave Feedback'}</h4>
          <button class="rv-form-close" aria-label="Close">✕</button>
        </div>
        <p class="rv-form-game">${escapeHtml(dealTitle)}</p>
        <textarea class="rv-textarea" id="rv-text-input"
          placeholder="Short comment (optional, max 200 chars)…"
          maxlength="${MAX_CHARS}"
          rows="3"
          aria-label="Review text"></textarea>
        <div class="rv-form-footer">
          <span class="rv-char-count" id="rv-char-count">0/${MAX_CHARS}</span>
          <button class="btn btn-primary btn-sm" id="rv-submit-btn">Submit</button>
        </div>
      </div>
    `;

    const textarea = overlay.querySelector('#rv-text-input');
    const charCount = overlay.querySelector('#rv-char-count');
    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length}/${MAX_CHARS}`;
    });

    overlay.querySelector('.rv-form-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#rv-submit-btn').addEventListener('click', () => {
      submitReview(dealID, vote, textarea.value.trim());
      overlay.remove();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('rv-overlay--visible'));
    setTimeout(() => textarea.focus(), 50);
  }

  // ── Rating badge ─────────────────────────────────────────────────
  function createRatingBadge(dealID) {
    const agg = getAggregate(dealID);
    const badge = document.createElement('span');
    badge.className = 'rv-rating-badge';
    badge.dataset.dealId = dealID;
    if (agg) {
      badge.textContent = `${agg.pct >= 60 ? '👍' : '👎'} ${agg.pct}% (${agg.total})`;
      badge.title = `${agg.positive}/${agg.total} positive reviews`;
    }
    return badge;
  }

  // ── Review buttons ────────────────────────────────────────────────
  function createReviewButtons(deal) {
    const wrap = document.createElement('div');
    wrap.className = 'rv-buttons';
    wrap.dataset.dealId = deal.dealID;

    const voted = hasVoted(deal.dealID);
    const agg   = getAggregate(deal.dealID);

    wrap.innerHTML = `
      <button class="rv-btn rv-btn-up${voted ? ' rv-voted' : ''}"
              aria-label="Thumbs up"
              ${voted ? 'disabled' : ''}>👍</button>
      <button class="rv-btn rv-btn-down${voted ? ' rv-voted' : ''}"
              aria-label="Thumbs down"
              ${voted ? 'disabled' : ''}>👎</button>
      ${agg ? `<span class="rv-rating-badge">${agg.pct}% 👍 (${agg.total})</span>` : ''}
    `;

    if (!voted) {
      wrap.querySelector('.rv-btn-up').addEventListener('click', (e) => {
        e.stopPropagation();
        showReviewForm(deal.dealID, deal.title || '', 'up');
      });
      wrap.querySelector('.rv-btn-down').addEventListener('click', (e) => {
        e.stopPropagation();
        showReviewForm(deal.dealID, deal.title || '', 'down');
      });
    }

    return wrap;
  }

  function refreshCard(dealID) {
    document.querySelectorAll(`.rv-buttons[data-deal-id="${dealID}"]`).forEach(wrap => {
      const agg   = getAggregate(dealID);
      const badge = wrap.querySelector('.rv-rating-badge');
      if (agg) {
        if (badge) { badge.textContent = `${agg.pct}% 👍 (${agg.total})`; }
        else { wrap.insertAdjacentHTML('beforeend', `<span class="rv-rating-badge">${agg.pct}% 👍 (${agg.total})</span>`); }
      }
      wrap.querySelectorAll('.rv-btn').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('rv-voted');
      });
    });
  }

  // ── Top Rated Section ────────────────────────────────────────────
  function renderTopRated() {
    const container = document.getElementById('top-rated-deals-section');
    if (!container) return;

    const reviews = getReviews();
    const ranked = Object.entries(reviews)
      .map(([id, list]) => {
        const pos = list.filter(r => r.vote === 'up').length;
        return { id, total: list.length, pct: Math.round((pos / list.length) * 100) };
      })
      .filter(r => r.total >= 1)
      .sort((a, b) => b.pct - a.pct || b.total - a.total)
      .slice(0, 5);

    if (!ranked.length) { container.style.display = 'none'; return; }

    container.style.display = '';
    container.innerHTML = `
      <h3 class="section-subtitle">⭐ Top Rated Deals (Community)</h3>
      <div class="rv-top-list">
        ${ranked.map(r => `
          <div class="rv-top-item">
            <span class="rv-top-id">Deal #${r.id.slice(0, 8)}…</span>
            <span class="rv-top-rating">${r.pct}% 👍 (${r.total} votes)</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function init() {
    renderTopRated();
  }

  return { init, createReviewButtons, createRatingBadge, submitReview, getAggregate };
})();

document.addEventListener('DOMContentLoaded', () => ReviewsModule.init());
