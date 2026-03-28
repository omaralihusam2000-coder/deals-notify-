/**
 * site-info.js - Trust pages, footer actions, and quick links
 */

const SiteInfoModule = (() => {
  const INFO_CONTENT = {
    about: {
      title: 'About Gaming Deals Notifier',
      body: `
        <div class="info-modal-copy">
          <p>Gaming Deals Notifier helps players find stronger game discounts without digging through store after store. We curate live deals, reduce duplicates, surface deal quality faster, and keep wishlist, alerts, and price history in one place.</p>
          <div class="info-points">
            <div class="info-point"><strong>Daily updates</strong><span>Deals refresh frequently from trusted third-party APIs and community tools.</span></div>
            <div class="info-point"><strong>Cleaner browsing</strong><span>Weak, duplicate, and low-signal offers are reduced before they reach the main list.</span></div>
            <div class="info-point"><strong>No account required</strong><span>Wishlist, reviews, and alert preferences can work locally on your device.</span></div>
          </div>
        </div>
      `
    },
    contact: {
      title: 'Contact',
      body: `
        <div class="info-modal-copy">
          <p>If you want to report an issue, suggest a feature, or ask for a correction, use one of the channels below.</p>
          <div class="info-link-list">
            <a class="info-link-card" href="https://github.com/omaralihusam2000-coder/deals-notify-" target="_blank" rel="noopener noreferrer">
              <strong>Project Repository</strong>
              <span>View the codebase and follow updates.</span>
            </a>
            <a class="info-link-card" href="https://github.com/omaralihusam2000-coder/deals-notify-/issues" target="_blank" rel="noopener noreferrer">
              <strong>Open an Issue</strong>
              <span>Report bugs, broken deals, missing pages, or layout issues.</span>
            </a>
            <a class="info-link-card" href="https://github.com/omaralihusam2000-coder" target="_blank" rel="noopener noreferrer">
              <strong>GitHub Profile</strong>
              <span>Reach the maintainer through the public project profile.</span>
            </a>
          </div>
        </div>
      `
    },
    privacy: {
      title: 'Privacy Policy',
      body: `
        <div class="info-modal-copy">
          <p>This app is designed to work with minimal personal data. Most preferences like wishlist items, reviews, and notification settings are stored locally in your browser.</p>
          <div class="info-points">
            <div class="info-point"><strong>Local storage</strong><span>Wishlist, alert settings, and community interactions are saved on your device unless you clear browser data.</span></div>
            <div class="info-point"><strong>Email subscribe</strong><span>If you add your email to the newsletter form, it is stored locally in the current browser demo unless a backend is connected later.</span></div>
            <div class="info-point"><strong>Third-party data</strong><span>Deal and giveaway information comes from CheapShark, GamerPower, and other linked services.</span></div>
          </div>
        </div>
      `
    },
    terms: {
      title: 'Terms of Use',
      body: `
        <div class="info-modal-copy">
          <p>Gaming Deals Notifier aggregates offers from third-party sources for convenience. Prices, store availability, and promotions can change without notice.</p>
          <div class="info-points">
            <div class="info-point"><strong>Accuracy</strong><span>We aim to present strong live deals, but store pages are the final source of truth for price and region availability.</span></div>
            <div class="info-point"><strong>Fair use</strong><span>Do not misuse community comments, reviews, or automated alerts.</span></div>
            <div class="info-point"><strong>Updates</strong><span>These terms can be improved as the project grows with more pages, integrations, and account features.</span></div>
          </div>
        </div>
      `
    }
  };

  function closeModal() {
    const existing = document.getElementById('site-info-modal');
    if (!existing) return;
    existing.classList.remove('modal-visible');
    existing.addEventListener('transitionend', () => existing.remove(), { once: true });
  }

  function openModal(type) {
    const content = INFO_CONTENT[type];
    if (!content) return;

    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'site-info-modal';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', content.title);

    overlay.innerHTML = `
      <div class="modal-box info-modal-box">
        <div class="modal-header">
          <h2 class="modal-title">${escapeHtml(content.title)}</h2>
          <button class="modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body info-modal-body">
          ${content.body}
        </div>
      </div>
    `;

    overlay.querySelector('.modal-close')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));
  }

  function scrollToNewsletter() {
    const section = document.querySelector('.newsletter-section:not([hidden])') || document.getElementById('newsletter-manage-section');
    if (!section) {
      if (typeof AppModule !== 'undefined') AppModule.switchTab('settings');
      return;
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = document.getElementById('newsletter-email');
    if (input) setTimeout(() => input.focus(), 300);
  }

  function runAction(action) {
    switch (action) {
      case 'open-settings':
        if (typeof AppModule !== 'undefined') AppModule.switchTab('settings');
        break;
      case 'open-wishlist':
        if (typeof AppModule !== 'undefined') AppModule.switchTab('wishlist');
        break;
      case 'scroll-newsletter':
        if (typeof AppModule !== 'undefined') AppModule.switchTab('deals');
        setTimeout(scrollToNewsletter, 150);
        break;
      default:
        break;
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-site-info]').forEach(button => {
      button.addEventListener('click', () => openModal(button.dataset.siteInfo));
    });

    document.querySelectorAll('[data-site-action]').forEach(button => {
      button.addEventListener('click', () => runAction(button.dataset.siteAction));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.getElementById('site-info-modal')) {
        closeModal();
      }
    });
  }

  function init() {
    bindEvents();
  }

  return { init, openModal };
})();
