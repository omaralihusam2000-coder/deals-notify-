/**
 * chatbot.js — AI Deal Assistant (Rule-Based Chatbot)
 * Floating chat bubble. Understands: genre, price, platform, "free", "cheapest", "best".
 * Responds with formatted deal suggestions from the current deals data.
 */

const ChatbotModule = (() => {
  let isOpen = false;
  let messageCount = 0;

  const INTENTS = [
    { pattern: /free|giveaway|gratis/i,          action: 'findFree' },
    { pattern: /cheap(?:est)?|lowest/i,           action: 'findCheap' },
    { pattern: /best deal|top deal|best offer/i,  action: 'findBest' },
    { pattern: /rpg|role.?play/i,                 action: 'findGenre', genre: 'rpg' },
    { pattern: /fps|shooter|first.?person/i,       action: 'findGenre', genre: 'fps' },
    { pattern: /strategy|rts/i,                   action: 'findGenre', genre: 'strategy' },
    { pattern: /horror|scary/i,                   action: 'findGenre', genre: 'horror' },
    { pattern: /indie|pixel/i,                    action: 'findGenre', genre: 'indie' },
    { pattern: /racing|car\b/i,                   action: 'findGenre', genre: 'racing' },
    { pattern: /sports?|football|soccer/i,         action: 'findGenre', genre: 'sports' },
    { pattern: /steam/i,                          action: 'findStore', store: 'Steam' },
    { pattern: /gog/i,                            action: 'findStore', store: 'GOG' },
    { pattern: /epic/i,                           action: 'findStore', store: 'Epic Games Store' },
    { pattern: /under \$?(\d+(?:\.\d+)?)/i,       action: 'findUnderPrice' },
    { pattern: /hello|hi|hey/i,                   action: 'greet' },
    { pattern: /help|\?$/,                        action: 'help' },
    { pattern: /thank/i,                          action: 'thanks' },
  ];

  const GREETINGS = [
    "👋 Hey! I'm your deal hunting assistant. Ask me things like:",
    "🎮 Hello gamer! I can help you find deals. Try asking:",
    "⚡ Hey there! Ready to find some deals? Try:",
  ];

  const HELP_TEXT = `
    <ul class="cb-help-list">
      <li>🆓 "Show free games"</li>
      <li>💰 "Find games under $5"</li>
      <li>🔥 "Best deal right now"</li>
      <li>⚔️ "Find RPG games"</li>
      <li>🔫 "Show FPS games"</li>
      <li>🏪 "Steam deals"</li>
      <li>📉 "Cheapest game today"</li>
    </ul>
  `;

  function getDealsFromDOM() {
    return [...document.querySelectorAll('#deals-grid .deal-card')].map(card => ({
      title:       card.querySelector('.card-title')?.textContent?.trim() || '',
      salePrice:   parseFloat(card.querySelector('[data-usd-price]')?.dataset.usdPrice || card.querySelector('.price-sale')?.textContent?.replace(/[^0-9.]/g, '') || 99),
      normalPrice: parseFloat(card.querySelector('.price-original')?.textContent?.replace(/[^0-9.]/g, '') || 0),
      savings:     parseInt(card.querySelector('.badge-green')?.textContent?.replace(/[^0-9]/g, '') || 0, 10),
      thumb:       card.querySelector('img')?.src || '',
      storeName:   card.querySelector('.card-store')?.textContent?.trim() || '',
      dealID:      card.dataset.dealId || '',
    }));
  }

  function formatDealCard(deal) {
    return `
      <div class="cb-deal-card">
        ${deal.thumb ? `<img src="${escapeHtml(deal.thumb)}" alt="" class="cb-deal-thumb" loading="lazy">` : ''}
        <div class="cb-deal-info">
          <div class="cb-deal-title">${escapeHtml(truncate(deal.title, 40))}</div>
          <div class="cb-deal-meta">
            <span class="cb-deal-price">$${deal.salePrice.toFixed(2)}</span>
            ${deal.savings ? `<span class="badge badge-green">-${deal.savings}%</span>` : ''}
            ${deal.storeName ? `<span class="cb-deal-store">${escapeHtml(deal.storeName)}</span>` : ''}
          </div>
        </div>
        ${deal.dealID ? `<a class="btn btn-primary btn-xs cb-deal-link"
              href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}"
              target="_blank" rel="noopener noreferrer">Go →</a>` : ''}
      </div>
    `;
  }

  function processMessage(text) {
    const deals = getDealsFromDOM();

    for (const intent of INTENTS) {
      const match = text.match(intent.pattern);
      if (!match) continue;

      switch (intent.action) {
        case 'greet': {
          return `${GREETINGS[Math.floor(Math.random() * GREETINGS.length)]}<br>${HELP_TEXT}`;
        }
        case 'help': {
          return `Here's what I can help with:${HELP_TEXT}`;
        }
        case 'thanks': {
          return '😊 Happy hunting! Let me know if you need more deals.';
        }
        case 'findFree': {
          const free = deals.filter(d => d.salePrice === 0 || d.salePrice < 0.01).slice(0, 3);
          if (!free.length) return '😔 No free games right now. Check the 🆓 Free Games tab!';
          return `🆓 Here are some free games right now:<br>${free.map(formatDealCard).join('')}`;
        }
        case 'findCheap': {
          const maxPrice = parseFloat(5);
          const cheap = deals.filter(d => d.salePrice <= maxPrice && d.salePrice > 0).sort((a, b) => a.salePrice - b.salePrice).slice(0, 3);
          if (!cheap.length) return `💸 No games found under $${maxPrice}. Try "under $10" for more results!`;
          return `💰 Cheapest games (under $${maxPrice}):<br>${cheap.map(formatDealCard).join('')}`;
        }
        case 'findBest': {
          const best = deals.sort((a, b) => b.savings - a.savings).slice(0, 3);
          if (!best.length) return '😔 No deals loaded yet. Head to the 🔥 Deals tab!';
          return `🏆 Best deals right now:<br>${best.map(formatDealCard).join('')}`;
        }
        case 'findGenre': {
          const genreKeywords = {
            rpg: ['rpg', 'fantasy', 'dragon', 'witcher', 'elden', 'final fantasy'],
            fps: ['fps', 'shooter', 'doom', 'halo', 'call of duty', 'overwatch'],
            strategy: ['strategy', 'civilization', 'total war', 'starcraft', 'xcom'],
            horror: ['horror', 'resident evil', 'silent hill', 'outlast', 'dead space'],
            indie: ['indie', 'pixel', 'celeste', 'hollow knight', 'stardew'],
            racing: ['racing', 'forza', 'need for speed', 'f1', 'dirt'],
            sports: ['sports', 'fifa', 'nba', 'madden', 'football'],
          };
          const keywords = genreKeywords[intent.genre] || [];
          const filtered = deals.filter(d => keywords.some(kw => d.title.toLowerCase().includes(kw))).slice(0, 3);
          const genreLabel = intent.genre.toUpperCase();
          if (!filtered.length) return `🎮 No ${genreLabel} games found currently. Try the Genre filters in the Deals tab!`;
          return `⚔️ ${genreLabel} deals for you:<br>${filtered.map(formatDealCard).join('')}`;
        }
        case 'findStore': {
          const store = intent.store;
          const filtered = deals.filter(d => d.storeName.toLowerCase().includes(store.toLowerCase())).slice(0, 3);
          if (!filtered.length) return `🏪 No ${store} deals loaded right now.`;
          return `🏪 ${store} deals:<br>${filtered.map(formatDealCard).join('')}`;
        }
        case 'findUnderPrice': {
          const maxP = parseFloat(match[1]);
          const under = deals.filter(d => d.salePrice <= maxP && d.salePrice > 0).sort((a, b) => a.salePrice - b.salePrice).slice(0, 3);
          if (!under.length) return `💸 No games found under $${maxP}.`;
          return `💸 Games under $${maxP}:<br>${under.map(formatDealCard).join('')}`;
        }
      }
    }

    return `🤖 I'm not sure how to help with that. Try asking:<br>${HELP_TEXT}`;
  }

  // ── UI ────────────────────────────────────────────────────────────
  function addMessage(text, sender) {
    const messages = document.getElementById('cb-messages');
    if (!messages) return;

    const div = document.createElement('div');
    div.className = `cb-message cb-message--${sender}`;
    div.innerHTML = sender === 'bot'
      ? `<span class="cb-avatar">🤖</span><div class="cb-bubble">${text}</div>`
      : `<div class="cb-bubble">${escapeHtml(text)}</div><span class="cb-avatar">👤</span>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    messageCount++;
  }

  function showTyping() {
    const messages = document.getElementById('cb-messages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = 'cb-message cb-message--bot cb-typing';
    div.id = 'cb-typing-indicator';
    div.innerHTML = '<span class="cb-avatar">🤖</span><div class="cb-bubble"><span class="cb-dots"><span></span><span></span><span></span></span></div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('cb-typing-indicator')?.remove();
  }

  function sendMessage() {
    const input = document.getElementById('cb-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    showTyping();
    setTimeout(() => {
      hideTyping();
      const response = processMessage(text);
      addMessage(response, 'bot');
    }, 600 + Math.random() * 400);
  }

  function toggleChat() {
    const widget = document.getElementById('cb-widget');
    if (!widget) return;
    isOpen = !isOpen;
    widget.classList.toggle('cb-widget--open', isOpen);
    document.getElementById('cb-bubble')?.setAttribute('aria-expanded', String(isOpen));

    if (isOpen && messageCount === 0) {
      setTimeout(() => addMessage(`${GREETINGS[0]}<br>${HELP_TEXT}`, 'bot'), 300);
    }
    if (isOpen) document.getElementById('cb-input')?.focus();
  }

  function init() {
    const bubble = document.getElementById('cb-bubble');
    if (!bubble) return;

    bubble.addEventListener('click', toggleChat);

    document.getElementById('cb-close')?.addEventListener('click', toggleChat);

    const input = document.getElementById('cb-input');
    const sendBtn = document.getElementById('cb-send-btn');

    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    sendBtn?.addEventListener('click', sendMessage);

    // Quick-action chips
    document.querySelectorAll('.cb-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (input) input.value = chip.dataset.query || chip.textContent;
        sendMessage();
      });
    });
  }

  return { init, toggleChat, sendMessage };
})();

