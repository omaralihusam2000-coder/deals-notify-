/**
 * keyboard.js — Keyboard shortcuts for power users
 */
const KeyboardModule = (() => {
  const SHORTCUTS = {
    'd': { action: () => AppModule.switchTab('deals'), label: 'Go to Deals' },
    'g': { action: () => AppModule.switchTab('giveaways'), label: 'Go to Free Games' },
    'w': { action: () => AppModule.switchTab('wishlist'), label: 'Go to Wishlist' },
    'n': { action: () => AppModule.switchTab('news'), label: 'Go to News' },
    'c': { action: () => AppModule.switchTab('calendar'), label: 'Go to Calendar' },
    'q': { action: () => AppModule.switchTab('quiz'), label: 'Go to Quiz' },
    's': {
      action: () => {
        AppModule.switchTab('deals');
        setTimeout(() => {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        }, 100);
      },
      label: 'Focus Search'
    },
    '?': { action: () => showShortcutsModal(), label: 'Show Shortcuts' },
  };

  function init() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      // Don't trigger with modifier keys (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();

      if (key === 'escape') {
        // Close any open modal
        const modals = document.querySelectorAll('.modal-overlay, .welcome-overlay, .shortcuts-overlay');
        modals.forEach(m => {
          m.classList.remove('visible', 'welcome-visible');
          setTimeout(() => m.remove(), 400);
        });
        return;
      }

      const shortcut = SHORTCUTS[key];
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    });
  }

  function showShortcutsModal() {
    // Remove existing
    const existing = document.getElementById('shortcuts-overlay');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'shortcuts-overlay visible';
    overlay.id = 'shortcuts-overlay';

    const entries = Object.entries(SHORTCUTS)
      .map(([key, { label }]) => `
        <div class="shortcut-row">
          <kbd class="shortcut-key">${key === '?' ? '?' : key.toUpperCase()}</kbd>
          <span class="shortcut-label">${label}</span>
        </div>
      `).join('');

    overlay.innerHTML = `
      <div class="shortcuts-modal">
        <div class="shortcuts-header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button class="btn btn-ghost btn-sm shortcuts-close" aria-label="Close">✕</button>
        </div>
        <div class="shortcuts-body">
          ${entries}
          <div class="shortcut-row">
            <kbd class="shortcut-key">ESC</kbd>
            <span class="shortcut-label">Close any modal</span>
          </div>
        </div>
        <p class="shortcuts-hint">Press <kbd>?</kbd> anytime to toggle this panel</p>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.shortcuts-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  return { init, showShortcutsModal };
})();
