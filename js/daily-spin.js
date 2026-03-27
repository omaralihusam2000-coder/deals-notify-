/**
 * daily-spin.js — Daily Spin / Lucky Deal
 * Spinning wheel with 6 deal categories. One spin per day.
 * Awards XP and highlights a matching deal.
 */

const DailySpinModule = (() => {
  const SPIN_KEY  = 'daily_spin_date';
  const XP_AWARD  = 50;
  const SEGMENTS  = [
    { id: 'free',       label: '🆓 Free',       color: '#00ff88', keywords: ['free', '0.00'] },
    { id: 'rpg',        label: '⚔️ RPG',         color: '#a855f7', keywords: ['rpg', 'fantasy', 'witcher', 'elden'] },
    { id: 'fps',        label: '🔫 FPS',          color: '#ff4757', keywords: ['fps', 'shooter', 'doom', 'call of duty'] },
    { id: 'indie',      label: '🎨 Indie',        color: '#ffd700', keywords: ['indie', 'pixel', 'celeste', 'hollow'] },
    { id: 'strategy',   label: '🧠 Strategy',     color: '#00d4ff', keywords: ['strategy', 'civilization', 'total war'] },
    { id: 'top-deal',   label: '🔥 Top Deal',     color: '#ff6b35', keywords: [] },
    { id: 'horror',     label: '👻 Horror',       color: '#9b59b6', keywords: ['horror', 'resident evil', 'dead'] },
    { id: 'surprise',   label: '🎁 Surprise',     color: '#2ecc71', keywords: [] },
  ];

  function hasSpunToday() {
    const last = localStorage.getItem(SPIN_KEY);
    return last === new Date().toDateString();
  }

  function markSpun() {
    localStorage.setItem(SPIN_KEY, new Date().toDateString());
  }

  function getRandomDeals() {
    // Try to get deals from DOM
    const cards = [...document.querySelectorAll('#deals-grid .deal-card')];
    return cards.map(card => ({
      title: card.querySelector('.card-title')?.textContent || '',
      element: card,
    }));
  }

  function findMatchingDeal(segmentId) {
    const seg = SEGMENTS.find(s => s.id === segmentId);
    const deals = getRandomDeals();
    if (!deals.length) return null;

    if (segmentId === 'top-deal' || segmentId === 'surprise' || !seg?.keywords.length) {
      return deals[Math.floor(Math.random() * deals.length)];
    }

    const matches = deals.filter(d =>
      seg.keywords.some(kw => d.title.toLowerCase().includes(kw))
    );
    return matches.length ? matches[Math.floor(Math.random() * matches.length)] : deals[Math.floor(Math.random() * deals.length)];
  }

  function drawWheel(canvas, rotation) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r  = cx - 10;
    const arc = (Math.PI * 2) / SEGMENTS.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    SEGMENTS.forEach((seg, i) => {
      const start = rotation + arc * i;
      const end   = start + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#0a0a0f';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Poppins, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label, r - 8, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();
    ctx.strokeStyle = 'var(--accent-blue, #00d4ff)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function showModal() {
    document.getElementById('spin-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'spin-overlay';
    overlay.className = 'spin-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Daily Lucky Spin');

    const spunToday = hasSpunToday();

    overlay.innerHTML = `
      <div class="spin-modal">
        <div class="spin-modal-header">
          <h3>🎰 Lucky Deal Spin</h3>
          <button class="spin-close" aria-label="Close">✕</button>
        </div>
        <div class="spin-wheel-wrap">
          <div class="spin-pointer" aria-hidden="true">▼</div>
          <canvas id="spin-canvas" width="280" height="280" aria-label="Spin wheel"></canvas>
        </div>
        ${spunToday
          ? `<p class="spin-used-msg">✅ You already spun today! Come back tomorrow.</p>
             <button class="btn btn-outline spin-btn-again" id="spin-watch-deal">👀 View Today's Result</button>`
          : `<button class="btn btn-primary spin-btn" id="spin-btn">🎰 SPIN!</button>`
        }
        <div id="spin-result" class="spin-result" style="display:none;"></div>
        <p class="spin-xp-info">🏅 Earn +${XP_AWARD} XP per spin</p>
      </div>
    `;

    overlay.querySelector('.spin-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('spin-overlay--visible'));

    const canvas = document.getElementById('spin-canvas');
    let rotation = 0;
    drawWheel(canvas, rotation);

    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) {
      spinBtn.addEventListener('click', () => doSpin(canvas, overlay));
    }
  }

  function doSpin(canvas, overlay) {
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) spinBtn.disabled = true;

    const targetSeg = Math.floor(Math.random() * SEGMENTS.length);
    const arc       = (Math.PI * 2) / SEGMENTS.length;
    // Spin 5-8 full rotations + land on target
    const totalRot  = (Math.PI * 2) * (5 + Math.random() * 3) + (Math.PI * 2 - targetSeg * arc - arc / 2);
    const duration  = 3500;
    const start     = performance.now();
    let   currentRot = 0;

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      currentRot = easeOut(progress) * totalRot;
      drawWheel(canvas, currentRot);
      if (progress < 1) { requestAnimationFrame(animate); }
      else { onSpinEnd(targetSeg, overlay); }
    }

    requestAnimationFrame(animate);
  }

  function onSpinEnd(segIdx, overlay) {
    markSpun();

    const seg  = SEGMENTS[segIdx];
    const deal = findMatchingDeal(seg.id);

    if (typeof GamificationModule !== 'undefined') GamificationModule.recordEvent('spin');
    showToast(`🎰 You got: ${seg.label}! +${XP_AWARD} XP`, 'success');

    const resultEl = document.getElementById('spin-result');
    if (resultEl) {
      resultEl.style.display = '';
      resultEl.innerHTML = `
        <div class="spin-result-inner" style="border-color:${seg.color};">
          <h4 style="color:${seg.color};">🎉 ${seg.label}</h4>
          ${deal ? `<p>Check out: <strong>${escapeHtml(deal.title)}</strong></p>` : '<p>Browse current deals for this category!</p>'}
          ${deal ? `<button class="btn btn-primary btn-sm" id="spin-go-deal">🔥 View Deal</button>` : ''}
        </div>
      `;

      document.getElementById('spin-go-deal')?.addEventListener('click', () => {
        overlay.remove();
        if (deal?.element) {
          deal.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          deal.element.classList.add('deal-card--highlighted');
          setTimeout(() => deal.element.classList.remove('deal-card--highlighted'), 3000);
        } else {
          document.querySelector('[data-tab="deals"]')?.click();
        }
      });
    }
  }

  function init() {
    const btn = document.getElementById('lucky-spin-btn');
    if (btn) btn.addEventListener('click', showModal);
  }

  return { init, showModal };
})();

document.addEventListener('DOMContentLoaded', () => DailySpinModule.init());
