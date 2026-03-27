/**
 * feedback.js — Floating feedback widget
 */
const FeedbackModule = (() => {
  const STORAGE_KEY = 'gdn_feedback';
  const COOLDOWN_DAYS = 7;
  const PULSE_INTERVAL_MS = 30000;
  let isOpen = false;
  let selectedEmoji = null;
  let pulseTimer = null;

  const EMOJIS = ['😡', '😕', '😐', '🙂', '😍'];

  function hasRecentSubmission() {
    const feedbacks = storageGet(STORAGE_KEY, []);
    if (!feedbacks.length) return false;
    const last = feedbacks[feedbacks.length - 1];
    if (!last.timestamp) return false;
    const daysSince = (Date.now() - last.timestamp) / (1000 * 60 * 60 * 24);
    return daysSince < COOLDOWN_DAYS;
  }

  function showFAB() {
    const fab = document.getElementById('feedback-fab');
    if (fab) fab.style.display = 'flex';
  }

  function hideFAB() {
    const fab = document.getElementById('feedback-fab');
    if (fab) fab.style.display = 'none';
  }

  function openPopup() {
    if (isOpen) { closePopup(); return; }
    isOpen = true;
    selectedEmoji = null;
    const popup = document.getElementById('feedback-popup');
    if (!popup) return;
    popup.innerHTML = `
      <div class="feedback-popup-header">
        <strong>💬 Quick Feedback</strong>
        <button class="btn btn-ghost btn-sm feedback-close-btn" aria-label="Close">✕</button>
      </div>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;">How's your experience?</p>
      <div class="feedback-emojis">
        ${EMOJIS.map((e, i) => `<button class="feedback-emoji" data-index="${i}" title="${e}" aria-label="Rate ${i+1} out of 5">${e}</button>`).join('')}
      </div>
      <textarea class="feedback-textarea" id="feedback-text" placeholder="Tell us more… (optional)" maxlength="300" rows="3" aria-label="Additional feedback"></textarea>
      <button class="btn btn-primary btn-sm feedback-submit-btn" id="feedback-submit-btn" style="width:100%;margin-top:0.5rem;">Submit</button>
    `;
    popup.classList.add('feedback-popup-visible');

    popup.querySelector('.feedback-close-btn')?.addEventListener('click', closePopup);

    popup.querySelectorAll('.feedback-emoji').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedEmoji = parseInt(btn.dataset.index);
        popup.querySelectorAll('.feedback-emoji').forEach((b, i) => b.classList.toggle('selected', i === selectedEmoji));
        if (typeof SoundsModule !== 'undefined') SoundsModule.click();
      });
    });

    document.getElementById('feedback-submit-btn')?.addEventListener('click', submitFeedback);
  }

  function closePopup() {
    isOpen = false;
    const popup = document.getElementById('feedback-popup');
    if (popup) popup.classList.remove('feedback-popup-visible');
  }

  function submitFeedback() {
    if (selectedEmoji === null) { showToast('Please select a rating 😊', 'warning'); return; }
    const text = document.getElementById('feedback-text')?.value.trim() || '';
    const feedbacks = storageGet(STORAGE_KEY, []);
    feedbacks.push({ emoji: EMOJIS[selectedEmoji], rating: selectedEmoji + 1, text, timestamp: Date.now() });
    storageSet(STORAGE_KEY, feedbacks);
    showToast('🙏 Thanks for your feedback!', 'success');
    if (typeof SoundsModule !== 'undefined') SoundsModule.success();
    closePopup();
    hideFAB();
  }

  function startPulse() {
    if (pulseTimer) clearInterval(pulseTimer);
    pulseTimer = setInterval(() => {
      const fab = document.getElementById('feedback-fab');
      if (fab) {
        fab.classList.add('feedback-pulse');
        setTimeout(() => fab.classList.remove('feedback-pulse'), 1000);
      }
    }, PULSE_INTERVAL_MS);
  }

  function init() {
    if (hasRecentSubmission()) return;

    const fab = document.createElement('div');
    fab.id = 'feedback-fab-wrap';
    fab.innerHTML = `
      <button class="feedback-fab" id="feedback-fab" aria-label="Give feedback" data-tooltip="Give Feedback">💬</button>
      <div class="feedback-popup" id="feedback-popup"></div>
    `;
    document.body.appendChild(fab);

    document.getElementById('feedback-fab')?.addEventListener('click', openPopup);
    document.addEventListener('click', (e) => {
      if (isOpen && !e.target.closest('#feedback-fab-wrap')) closePopup();
    });

    startPulse();
  }

  return { init };
})();
