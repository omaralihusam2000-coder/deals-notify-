/**
 * welcome.js — First-time visitor onboarding experience
 */
const WelcomeModule = (() => {
  const STORAGE_KEY = 'welcome_completed';

  const STEPS = [
    {
      emoji: '🎮',
      title: 'Welcome to Gaming Deals!',
      desc: 'Track the best game deals from Steam, Epic, GOG & 20+ stores — all in one place.',
      cta: 'Let\'s Go!'
    },
    {
      emoji: '🔔',
      title: 'Never Miss a Deal',
      desc: 'Enable notifications to get alerted when games drop below your target price — even when the app is closed.',
      cta: 'Next'
    },
    {
      emoji: '⭐',
      title: 'Build Your Wishlist',
      desc: 'Save games you love and we\'ll watch their prices for you. Get notified when they hit a new low!',
      cta: 'Next'
    },
    {
      emoji: '📱',
      title: 'Install as App',
      desc: 'Add this to your home screen for instant access, offline support, and a native app experience.',
      cta: 'Start Exploring'
    }
  ];

  let currentStep = 0;

  function shouldShow() {
    return !localStorage.getItem(STORAGE_KEY);
  }

  function show() {
    if (!shouldShow()) return;

    const overlay = document.createElement('div');
    overlay.className = 'welcome-overlay';
    overlay.id = 'welcome-overlay';
    overlay.innerHTML = `
      <div class="welcome-modal">
        <div class="welcome-progress">
          ${STEPS.map((_, i) => `<div class="welcome-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`).join('')}
        </div>
        <div class="welcome-body" id="welcome-body"></div>
        <div class="welcome-footer">
          <button class="btn btn-ghost btn-sm" id="welcome-skip">Skip</button>
          <button class="btn btn-primary" id="welcome-next">${STEPS[0].cta}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('welcome-visible'));

    renderStep(0);
    bindEvents(overlay);
  }

  function renderStep(index) {
    const body = document.getElementById('welcome-body');
    const step = STEPS[index];
    body.innerHTML = `
      <div class="welcome-step">
        <div class="welcome-emoji">${step.emoji}</div>
        <h2 class="welcome-title">${step.title}</h2>
        <p class="welcome-desc">${step.desc}</p>
      </div>
    `;

    document.querySelectorAll('.welcome-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i <= index);
    });

    const nextBtn = document.getElementById('welcome-next');
    if (nextBtn) nextBtn.textContent = step.cta;
  }

  function bindEvents(overlay) {
    document.getElementById('welcome-next').addEventListener('click', () => {
      currentStep++;
      if (currentStep >= STEPS.length) {
        close(overlay);
      } else {
        renderStep(currentStep);
      }
    });

    document.getElementById('welcome-skip').addEventListener('click', () => close(overlay));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(overlay);
    });
  }

  function close(overlay) {
    localStorage.setItem(STORAGE_KEY, 'true');
    overlay.classList.remove('welcome-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  return { show, shouldShow };
})();
