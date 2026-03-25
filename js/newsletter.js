/**
 * newsletter.js — Newsletter subscription management
 * Stores emails in localStorage, manages preferences, shows preview.
 */

const NewsletterModule = (() => {
  const SUBS_KEY = 'newsletter_subscribers';
  const PREFS_KEY = 'newsletter_preferences';

  function getSubscribers() { return storageGet(SUBS_KEY, []); }
  function setSubscribers(s) { storageSet(SUBS_KEY, s); }

  function getPrefs() {
    return storageGet(PREFS_KEY, {
      email: '',
      frequency: 'weekly',
      flashSales: true,
      freeGames: true,
      language: 'en',
    });
  }
  function setPrefs(p) { storageSet(PREFS_KEY, p); }

  function subscribe(email) {
    if (!email || !email.includes('@')) return { ok: false, msg: 'Invalid email address.' };
    const subs = getSubscribers();
    if (subs.some(s => s.email === email)) return { ok: false, msg: 'Already subscribed!' };
    subs.push({ email, date: new Date().toISOString() });
    setSubscribers(subs);
    const prefs = getPrefs();
    prefs.email = email;
    setPrefs(prefs);
    return { ok: true, msg: `✅ Subscribed! Deal alerts will be sent to ${email}` };
  }

  function unsubscribe(email) {
    const subs = getSubscribers().filter(s => s.email !== email);
    setSubscribers(subs);
    const prefs = getPrefs();
    if (prefs.email === email) { prefs.email = ''; setPrefs(prefs); }
  }

  function renderManageSection() {
    const container = document.getElementById('newsletter-manage-section');
    if (!container) return;

    const prefs = getPrefs();
    const subs = getSubscribers();
    const isSubscribed = prefs.email && subs.some(s => s.email === prefs.email);

    container.innerHTML = `
      <div class="settings-card">
        <h3 class="settings-card-title">📧 Newsletter Subscription</h3>

        ${isSubscribed ? `
          <div class="settings-row">
            <div class="settings-label">
              <strong>Subscribed Email</strong>
              <span class="text-muted">${escapeHtml(prefs.email)}</span>
            </div>
            <button class="btn btn-danger btn-sm" id="nl-unsubscribe-btn">Unsubscribe</button>
          </div>
        ` : `
          <div class="settings-row">
            <div class="settings-label"><strong>Not subscribed</strong> Subscribe for deal alerts.</div>
            <button class="btn btn-primary btn-sm" id="nl-subscribe-quick-btn">Subscribe</button>
          </div>
        `}

        <div class="settings-row">
          <div class="settings-label">
            <strong>Frequency</strong>
            Choose how often you want email updates.
          </div>
          <select id="nl-frequency" class="filter-select">
            <option value="daily" ${prefs.frequency === 'daily' ? 'selected' : ''}>Daily Digest</option>
            <option value="weekly" ${prefs.frequency === 'weekly' ? 'selected' : ''}>Weekly Digest</option>
            <option value="flash" ${prefs.frequency === 'flash' ? 'selected' : ''}>Flash Sales Only</option>
            <option value="free" ${prefs.frequency === 'free' ? 'selected' : ''}>Free Games Only</option>
          </select>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Flash Sale Alerts</strong>
            Notify for deals with 90%+ discount.
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="nl-flash-toggle" ${prefs.flashSales ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Free Game Alerts</strong>
            Notify when new free games are posted.
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="nl-free-toggle" ${prefs.freeGames ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="nl-save-prefs-btn">💾 Save Preferences</button>
          <button class="btn btn-outline btn-sm" id="nl-preview-btn">👁️ Preview Newsletter</button>
        </div>

        <div id="nl-preview-section" style="display:none;"></div>
      </div>
    `;

    // Bind events
    const unsubBtn = container.querySelector('#nl-unsubscribe-btn');
    if (unsubBtn) {
      unsubBtn.addEventListener('click', () => {
        unsubscribe(prefs.email);
        showToast('Unsubscribed successfully.', 'info');
        renderManageSection();
      });
    }

    const quickSubBtn = container.querySelector('#nl-subscribe-quick-btn');
    if (quickSubBtn) {
      quickSubBtn.addEventListener('click', () => {
        const email = prompt('Enter your email address:');
        if (email) {
          const result = subscribe(email.trim());
          showToast(result.msg, result.ok ? 'success' : 'warning');
          if (result.ok) renderManageSection();
        }
      });
    }

    container.querySelector('#nl-save-prefs-btn').addEventListener('click', () => {
      const newPrefs = {
        email: prefs.email,
        frequency: container.querySelector('#nl-frequency').value,
        flashSales: container.querySelector('#nl-flash-toggle').checked,
        freeGames: container.querySelector('#nl-free-toggle').checked,
        language: prefs.language,
      };
      setPrefs(newPrefs);
      showToast('Newsletter preferences saved!', 'success');
    });

    container.querySelector('#nl-preview-btn').addEventListener('click', () => {
      const previewSection = container.querySelector('#nl-preview-section');
      if (previewSection.style.display === 'none') {
        renderPreview(previewSection);
        previewSection.style.display = 'block';
      } else {
        previewSection.style.display = 'none';
      }
    });
  }

  async function renderPreview(container) {
    container.innerHTML = '<div class="modal-loading"><div class="spinner"></div><p>Loading preview…</p></div>';
    try {
      const deals = await fetchJSON('https://www.cheapshark.com/api/1.0/deals?pageSize=5&sortBy=DealRating&desc=1');
      container.innerHTML = `
        <div class="nl-preview-box">
          <div class="nl-preview-header">
            <h4>🎮 Gaming Deals Weekly Digest</h4>
            <p>This week's top picks — curated for you</p>
          </div>
          <div class="nl-preview-deals">
            ${deals.map(d => `
              <div class="nl-preview-deal">
                <img src="${escapeHtml(d.thumb)}" alt="" class="nl-preview-img">
                <div class="nl-preview-info">
                  <div class="nl-preview-title">${escapeHtml(truncate(d.title, 40))}</div>
                  <div class="nl-preview-price">
                    <span class="price-sale">$${parseFloat(d.salePrice).toFixed(2)}</span>
                    <span class="badge badge-green">-${Math.round(parseFloat(d.savings))}%</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="nl-preview-footer">
            <p>Unsubscribe anytime in Settings.</p>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p class="text-error">Could not load preview: ${escapeHtml(err.message)}</p>`;
    }
  }

  function enhanceNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletter-email');
      if (!emailInput) return;
      const email = emailInput.value.trim();
      const result = subscribe(email);
      if (result.ok) {
        emailInput.value = '';
        form.classList.add('nl-success-anim');
        setTimeout(() => form.classList.remove('nl-success-anim'), 1200);
        showToast(result.msg, 'success');
      } else {
        showToast(result.msg, 'warning');
      }
    });
  }

  function init() {
    enhanceNewsletterForm();
    renderManageSection();
  }

  return { init, subscribe, unsubscribe, getPrefs, renderManageSection };
})();
