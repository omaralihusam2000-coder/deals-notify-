/**
 * social-share.js — Enhanced Social Share Buttons for Deal Cards
 * Adds WhatsApp, Telegram, Twitter/X, Facebook, Copy Link buttons.
 * Uses Web Share API on mobile as primary with social platform URL fallbacks.
 */

const SocialShareModule = (() => {
  function getShareData(deal) {
    const title   = deal.title   || deal.external || '';
    const price   = parseFloat(deal.salePrice || deal.cheapest || deal.price || 0).toFixed(2);
    const savings = Math.round(parseFloat(deal.savings || deal.discount || 0));
    const dealID  = deal.dealID || deal.id || '';
    const url     = dealID
      ? `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(dealID)}`
      : `https://omaralihusam2000-coder.github.io/deals-notify-/`;
    const text = `🎮 ${title} — ${savings}% off! Only $${price}\nCheck it out: ${url}`;
    return { title, price, savings, url, text };
  }

  async function share(deal) {
    const { title, url, text } = getShareData(deal);

    if (navigator.share) {
      try {
        await navigator.share({ title: `🎮 ${title}`, text, url });
        recordShare();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    showPanel(deal);
  }

  function showPanel(deal) {
    document.getElementById('ss-panel-overlay')?.remove();

    const { title, price, savings, url, text } = getShareData(deal);
    const thumb = deal.thumb || '';

    const eTweet = encodeURIComponent(`🎮 ${title} — ${savings}% off! Only $${price} #GameDeals`);
    const eUrl   = encodeURIComponent(url);
    const eText  = encodeURIComponent(text);

    const overlay = document.createElement('div');
    overlay.id = 'ss-panel-overlay';
    overlay.className = 'ss-panel-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Share this deal');

    overlay.innerHTML = `
      <div class="ss-panel">
        <div class="ss-panel-header">
          <h3>📤 Share Deal</h3>
          <button class="ss-panel-close" aria-label="Close">✕</button>
        </div>
        <div class="ss-panel-preview">
          ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" class="ss-panel-thumb" loading="lazy">` : ''}
          <div class="ss-panel-info">
            <div class="ss-panel-title">${escapeHtml(title)}</div>
            <div class="ss-panel-price">
              <span class="badge badge-green">-${savings}%</span>
              <span style="color:var(--accent-green);font-weight:700;">$${price}</span>
            </div>
          </div>
        </div>
        <div class="ss-panel-btns">
          <button class="ss-btn ss-btn-whatsapp" data-action="whatsapp" aria-label="Share on WhatsApp">
            <span class="ss-btn-icon">📱</span><span>WhatsApp</span>
          </button>
          <button class="ss-btn ss-btn-telegram" data-action="telegram" aria-label="Share on Telegram">
            <span class="ss-btn-icon">✈️</span><span>Telegram</span>
          </button>
          <button class="ss-btn ss-btn-twitter" data-action="twitter" aria-label="Share on Twitter/X">
            <span class="ss-btn-icon">🐦</span><span>Twitter/X</span>
          </button>
          <button class="ss-btn ss-btn-facebook" data-action="facebook" aria-label="Share on Facebook">
            <span class="ss-btn-icon">📘</span><span>Facebook</span>
          </button>
          <button class="ss-btn ss-btn-copy" data-action="copy" aria-label="Copy link">
            <span class="ss-btn-icon">📋</span><span>Copy Link</span>
          </button>
        </div>
      </div>
    `;

    const actions = {
      whatsapp: () => window.open(`https://api.whatsapp.com/send?text=${eText}`, '_blank', 'noopener,noreferrer'),
      telegram: () => window.open(`https://t.me/share/url?url=${eUrl}&text=${eText}`, '_blank', 'noopener,noreferrer'),
      twitter:  () => window.open(`https://twitter.com/intent/tweet?text=${eTweet}&url=${eUrl}`, '_blank', 'noopener,noreferrer'),
      facebook: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${eUrl}`, '_blank', 'noopener,noreferrer'),
      copy: async () => {
        try {
          if (navigator.clipboard) await navigator.clipboard.writeText(url);
          else {
            const ta = document.createElement('textarea');
            ta.value = url; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
          }
          showToast('🔗 Link copied!', 'success');
          overlay.remove();
          recordShare();
        } catch { showToast('Failed to copy link', 'error'); }
      },
    };

    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const action = btn.dataset.action;
        if (actions[action]) { actions[action](); if (action !== 'copy') { recordShare(); overlay.remove(); } }
        return;
      }
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.ss-panel-close').addEventListener('click', () => overlay.remove());
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('ss-panel-overlay--visible'));
  }

  function recordShare() {
    if (typeof GamificationModule !== 'undefined') GamificationModule.recordEvent('share');
    if (typeof SoundsModule !== 'undefined') SoundsModule.success?.();
  }

  function createShareButton(deal) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-xs btn-social-share';
    btn.innerHTML = '📤 Share';
    btn.setAttribute('aria-label', `Share ${deal.title || 'this deal'}`);
    btn.addEventListener('click', (e) => { e.stopPropagation(); share(deal); });
    return btn;
  }

  return { share, showPanel, createShareButton };
})();
