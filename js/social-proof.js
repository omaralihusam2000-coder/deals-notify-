/**
 * social-proof.js — Simulated social proof popup notifications
 */
const SocialProofModule = (() => {
  const STORAGE_KEY = 'gdn_social_proof_enabled';
  const MIN_DELAY_MS = 30000;
  const DELAY_VARIANCE_MS = 15000;
  let timer = null;
  let isVisible = false;

  const NAMES = ['Alex','Jordan','Sam','Taylor','Morgan','Casey','Riley','Jamie','Quinn','Avery','Blake','Cameron','Charlie','Dakota','Drew','Emery','Finley','Harper','Hayden','Jesse','Kendall','Lane','Logan','Mackenzie','Micah','Parker','Peyton','Reese','Sage','Skyler','Spencer','Sydney','Tatum','Terry','Toby','Tracy','Tyler','Val','Wren','Zion'];

  const GAMES = ['Cyberpunk 2077','Elden Ring','God of War','Hogwarts Legacy','Red Dead Redemption 2','The Witcher 3','Baldur\'s Gate 3','Starfield','Diablo IV','FIFA 24','Call of Duty','Forza Horizon 5','Stardew Valley','Minecraft','GTA V'];

  const BADGES = ['Deal Hunter','Smart Saver','Wishlist Starter','Diamond Saver','World Explorer','Free Gamer'];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randNum(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function getMessage() {
    const templates = [
      () => `🎮 ${rand(NAMES)} just saved $${randNum(5, 60)} on ${rand(GAMES)}!`,
      () => `⭐ ${randNum(12, 150)} people wishlisted this deal today`,
      () => `🔥 This deal was viewed ${randNum(50, 500)}+ times`,
      () => `🏆 ${rand(NAMES)} earned the '${rand(BADGES)}' achievement!`,
      () => `💰 ${rand(NAMES)} found a ${randNum(50, 95)}% off deal on ${rand(GAMES)}!`,
      () => `🆓 ${rand(NAMES)} just grabbed a free copy of ${rand(GAMES)}!`,
    ];
    return rand(templates)();
  }

  function showPopup() {
    if (!isEnabled() || isVisible) return;
    isVisible = true;

    const existing = document.getElementById('social-proof-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'social-proof-popup';
    popup.id = 'social-proof-popup';
    const msg = getMessage();
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    popup.innerHTML = `
      <div class="social-proof-text">${msg}</div>
      <div class="social-proof-time">${now}</div>
    `;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('social-proof-visible'));

    setTimeout(() => {
      popup.classList.remove('social-proof-visible');
      popup.classList.add('social-proof-hiding');
      popup.addEventListener('transitionend', () => { popup.remove(); isVisible = false; }, { once: true });
    }, 4000);
  }

  function isEnabled() {
    return storageGet(STORAGE_KEY, true);
  }

  function toggle(val) {
    storageSet(STORAGE_KEY, val);
    if (!val && timer) { clearTimeout(timer); timer = null; }
    else if (val && !timer) startTimer();
  }

  function startTimer() {
    if (timer) clearTimeout(timer);
    const delay = MIN_DELAY_MS + Math.random() * DELAY_VARIANCE_MS;
    timer = setTimeout(() => {
      showPopup();
      startTimer();
    }, delay);
  }

  function renderToggle() {
    const container = document.getElementById('social-proof-settings-container');
    if (!container) return;
    container.innerHTML = `
      <div class="settings-card">
        <h3 class="settings-card-title">👥 Social Proof Notifications</h3>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Social Activity Popups</strong>
            Show what other gamers are doing in real-time.
          </div>
          <label class="toggle-switch" aria-label="Enable social proof notifications">
            <input type="checkbox" id="social-proof-toggle" ${isEnabled() ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>
    `;
    document.getElementById('social-proof-toggle')?.addEventListener('change', (e) => {
      toggle(e.target.checked);
      showToast(e.target.checked ? '👥 Social notifications enabled' : '🔇 Social notifications disabled', 'info');
    });
  }

  function init() {
    renderToggle();
    if (isEnabled()) {
      setTimeout(startTimer, 10000);
    }
  }

  return { init, showPopup, toggle, isEnabled, renderToggle };
})();
