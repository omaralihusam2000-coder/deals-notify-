/**
 * share.js — Deal Share System
 * Share deals via Web Share API, clipboard, or social platforms
 */

const ShareModule = (() => {
  function buildShareText(title, salePrice, discount, url) {
    return `🎮 ${title} is ${discount}% off — only $${parseFloat(salePrice).toFixed(2)}! Check it out: ${url}`;
  }

  function getDealUrl(dealID) {
    return `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(dealID)}`;
  }

  function copyToClipboard(text) {
    return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.resolve(
      (() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      })()
    );
  }

  function openPopup(url) {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  }

  async function shareDeal(deal) {
    const url = getDealUrl(deal.dealID || deal.id || '');
    const title = deal.title || '';
    const salePrice = deal.salePrice || deal.price || '0';
    const discount = Math.round(parseFloat(deal.savings || deal.discount || 0));
    const text = buildShareText(title, salePrice, discount, url);

    // Use native Web Share API on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title, text, url });
        recordShare();
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Web Share failed:', err);
        else return; // user cancelled
      }
    }

    // Show popup
    showSharePopup(deal, url, text, discount, salePrice);
  }

  function showSharePopup(deal, url, text, discount, salePrice) {
    const existing = document.getElementById('share-popup-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'share-popup-overlay';
    overlay.className = 'share-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Share deal');

    const tweetText = encodeURIComponent(`🎮 ${deal.title} is ${discount}% off — only $${parseFloat(salePrice).toFixed(2)}! #GameDeals #Gaming`);
    const tweetUrl = encodeURIComponent(url);
    const waText = encodeURIComponent(text);
    const fbUrl = encodeURIComponent(url);
    const tgText = encodeURIComponent(text);

    overlay.innerHTML = `
      <div class="share-popup">
        <div class="share-popup-header">
          <h3 class="share-popup-title">📤 ${typeof t === 'function' ? t('share') : 'Share'}</h3>
          <button class="share-popup-close" aria-label="Close">✕</button>
        </div>
        <div class="share-game-preview">
          ${deal.thumb ? `<img src="${escapeHtml(deal.thumb)}" alt="" class="share-game-thumb">` : ''}
          <div>
            <div class="share-game-title">${escapeHtml(deal.title || '')}</div>
            <div class="share-game-price">
              <span class="price-sale">$${parseFloat(salePrice).toFixed(2)}</span>
              <span class="badge badge-green">-${discount}%</span>
            </div>
          </div>
        </div>
        <div class="share-options">
          <button class="share-option-btn" data-action="copy">
            <span class="share-option-icon">📋</span>
            <span>${typeof t === 'function' ? t('copy_link') : 'Copy Link'}</span>
          </button>
          <a class="share-option-btn" href="https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}" target="_blank" rel="noopener noreferrer">
            <span class="share-option-icon">🐦</span>
            <span>Twitter/X</span>
          </a>
          <button class="share-option-btn" data-action="discord">
            <span class="share-option-icon">💬</span>
            <span>Discord</span>
          </button>
          <a class="share-option-btn" href="https://api.whatsapp.com/send?text=${waText}" target="_blank" rel="noopener noreferrer">
            <span class="share-option-icon">📱</span>
            <span>WhatsApp</span>
          </a>
          <a class="share-option-btn" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${tgText}" target="_blank" rel="noopener noreferrer">
            <span class="share-option-icon">✈️</span>
            <span>Telegram</span>
          </a>
          <a class="share-option-btn" href="https://www.facebook.com/sharer/sharer.php?u=${fbUrl}" target="_blank" rel="noopener noreferrer">
            <span class="share-option-icon">📘</span>
            <span>Facebook</span>
          </a>
        </div>
      </div>
    `;

    overlay.querySelector('.share-popup-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', handler); }
    }, { once: true });

    overlay.querySelector('[data-action="copy"]').addEventListener('click', async () => {
      await copyToClipboard(url);
      showToast(typeof t === 'function' ? t('link_copied') : 'Link copied!', 'success');
      recordShare();
      overlay.remove();
    });

    overlay.querySelector('[data-action="discord"]').addEventListener('click', async () => {
      await copyToClipboard(`**${deal.title}** — ${discount}% off!\n💰 Only $${parseFloat(salePrice).toFixed(2)}\n🔗 ${url}`);
      showToast(typeof t === 'function' ? t('discord_copied') : 'Discord message copied!', 'success');
      recordShare();
      overlay.remove();
    });

    // Track share clicks on external links
    overlay.querySelectorAll('a.share-option-btn').forEach(link => {
      link.addEventListener('click', () => { recordShare(); overlay.remove(); });
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('share-popup-visible'));
  }

  function recordShare() {
    if (typeof GamificationModule !== 'undefined') {
      GamificationModule.recordEvent('share');
    }
  }

  function createShareButton(deal) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-xs btn-share';
    btn.dataset.dealId = deal.dealID || deal.id || '';
    btn.innerHTML = `📤 ${typeof t === 'function' ? t('share') : 'Share'}`;
    btn.setAttribute('aria-label', 'Share this deal');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      shareDeal(deal);
    });
    return btn;
  }

  return { shareDeal, createShareButton, copyToClipboard };
})();
