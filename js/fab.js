/**
 * fab.js — Floating Action Button with quick actions
 */
const FABModule = (() => {
  let isOpen = false;

  function init() {
    const fab = document.createElement('div');
    fab.className = 'fab-container';
    fab.id = 'fab-container';
    fab.innerHTML = `
      <div class="fab-actions" id="fab-actions">
        <button class="fab-action" data-action="top-deals" title="Top Deals Today">
          <span>🔥</span><span class="fab-action-label">Top Deals</span>
        </button>
        <button class="fab-action" data-action="free-games" title="Free Games">
          <span>🆓</span><span class="fab-action-label">Free Games</span>
        </button>
        <button class="fab-action" data-action="wishlist" title="My Wishlist">
          <span>⭐</span><span class="fab-action-label">Wishlist</span>
        </button>
        <button class="fab-action" data-action="random" title="Random Deal">
          <span>🎲</span><span class="fab-action-label">Surprise Me</span>
        </button>
      </div>
      <button class="fab-main" id="fab-main" aria-label="Quick Actions">
        <span class="fab-icon-open">⚡</span>
        <span class="fab-icon-close">✕</span>
      </button>
    `;

    document.body.appendChild(fab);
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('fab-main').addEventListener('click', toggle);
    document.getElementById('fab-actions').addEventListener('click', (e) => {
      const btn = e.target.closest('.fab-action');
      if (!btn) return;

      const action = btn.dataset.action;
      switch (action) {
        case 'top-deals':
          document.querySelector('[data-tab="deals"]')?.click();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'free-games':
          document.querySelector('[data-tab="giveaways"]')?.click();
          break;
        case 'wishlist':
          document.querySelector('[data-tab="wishlist"]')?.click();
          break;
        case 'random':
          document.querySelector('[data-tab="achievements"]')?.click();
          // Allow the tab transition (~300ms) to complete before triggering the random deal button
          setTimeout(() => {
            document.getElementById('random-deal-btn')?.click();
          }, 300);
          break;
      }
      toggle();
    });

    document.addEventListener('click', (e) => {
      if (isOpen && !e.target.closest('#fab-container')) toggle();
    });
  }

  function toggle() {
    isOpen = !isOpen;
    document.getElementById('fab-container').classList.toggle('fab-open', isOpen);
  }

  return { init };
})();
