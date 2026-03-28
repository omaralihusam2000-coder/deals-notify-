/**
 * chatbot.js - AI Deal Assistant (rule-based helper for the live deals feed)
 */

const ChatbotModule = (() => {
  let isOpen = false;
  let messageCount = 0;

  const INTENTS = [
    { pattern: /free|giveaway|gratis/i, action: 'findFree' },
    { pattern: /cheap(?:est)?|lowest/i, action: 'findCheap' },
    { pattern: /best deal|top deal|best offer/i, action: 'findBest' },
    { pattern: /rpg|role.?play/i, action: 'findGenre', genre: 'rpg' },
    { pattern: /fps|shooter|first.?person/i, action: 'findGenre', genre: 'fps' },
    { pattern: /strategy|rts/i, action: 'findGenre', genre: 'strategy' },
    { pattern: /horror|scary/i, action: 'findGenre', genre: 'horror' },
    { pattern: /indie|pixel/i, action: 'findGenre', genre: 'indie' },
    { pattern: /racing|car\b/i, action: 'findGenre', genre: 'racing' },
    { pattern: /sports?|football|soccer/i, action: 'findGenre', genre: 'sports' },
    { pattern: /steam/i, action: 'findStore', store: 'Steam' },
    { pattern: /gog/i, action: 'findStore', store: 'GOG' },
    { pattern: /epic/i, action: 'findStore', store: 'Epic Games Store' },
    { pattern: /under \$?(\d+(?:\.\d+)?)/i, action: 'findUnderPrice' },
    { pattern: /hello|hi|hey/i, action: 'greet' },
    { pattern: /help|\?$/i, action: 'help' },
    { pattern: /thank/i, action: 'thanks' },
  ];

  const INTRO_LINES = [
    'I scan the deals already loaded on this page.',
    'Ask for cheap, free, best, genre, or store-based suggestions.',
  ];

  const HELP_TEXT = `
    <div class="cb-help-grid">
      <span class="cb-help-pill">show free games</span>
      <span class="cb-help-pill">best deal right now</span>
      <span class="cb-help-pill">under $5</span>
      <span class="cb-help-pill">find RPG games</span>
      <span class="cb-help-pill">steam deals</span>
      <span class="cb-help-pill">cheapest game today</span>
    </div>
  `;

  function getDealsFromDOM() {
    return [...document.querySelectorAll('#deals-grid .deal-card')].map((card) => {
      const savingsText =
        card.querySelector('.discount-badge')?.textContent ||
        card.querySelector('.cb-deal-badge')?.textContent ||
        '';

      return {
        title: card.querySelector('.card-title')?.textContent?.trim() || '',
        salePrice: parseFloat(
          card.querySelector('.price-sale')?.dataset.usdPrice ||
          card.querySelector('.price-sale')?.textContent?.replace(/[^0-9.]/g, '') ||
          99
        ),
        normalPrice: parseFloat(
          card.querySelector('.price-original')?.dataset.usdPrice ||
          card.querySelector('.price-original')?.textContent?.replace(/[^0-9.]/g, '') ||
          0
        ),
        savings: parseInt(savingsText.replace(/[^0-9]/g, '') || '0', 10),
        thumb: card.querySelector('img')?.src || '',
        storeName: card.querySelector('.store-name')?.textContent?.trim() || card.querySelector('.card-store')?.textContent?.trim() || '',
        dealID: card.dataset.dealId || '',
      };
    });
  }

  function formatDealCard(deal) {
    return `
      <div class="cb-deal-card">
        ${deal.thumb ? `<img src="${escapeHtml(deal.thumb)}" alt="" class="cb-deal-thumb" loading="lazy">` : ''}
        <div class="cb-deal-info">
          <div class="cb-deal-title">${escapeHtml(truncate(deal.title, 42))}</div>
          <div class="cb-deal-meta">
            <span class="cb-deal-price">$${deal.salePrice.toFixed(2)}</span>
            ${deal.savings ? `<span class="cb-deal-badge">-${deal.savings}%</span>` : ''}
          </div>
          ${deal.storeName ? `<div class="cb-deal-store">${escapeHtml(deal.storeName)}</div>` : ''}
        </div>
        ${deal.dealID ? `
          <a class="cb-deal-link"
             href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}"
             target="_blank" rel="noopener noreferrer">View</a>
        ` : ''}
      </div>
    `;
  }

  function introCard(title, subtitle, body) {
    return `
      <div class="cb-response-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(subtitle)}</span>
      </div>
      ${body}
    `;
  }

  function buildWelcomeMessage() {
    return `
      <div class="cb-intro-card">
        <div class="cb-intro-title">Ask for a deal in plain English</div>
        <div class="cb-intro-text">${INTRO_LINES.join(' ')}</div>
        ${HELP_TEXT}
      </div>
    `;
  }

  function processMessage(text) {
    const deals = getDealsFromDOM();

    for (const intent of INTENTS) {
      const match = text.match(intent.pattern);
      if (!match) continue;

      switch (intent.action) {
        case 'greet':
        case 'help':
          return buildWelcomeMessage();

        case 'thanks':
          return introCard(
            'Ready for another search',
            'Try a price, store, or genre request next.',
            HELP_TEXT
          );

        case 'findFree': {
          const free = deals.filter((deal) => deal.salePrice === 0 || deal.salePrice < 0.01).slice(0, 3);
          if (!free.length) {
            return introCard(
              'No free titles loaded right now',
              'The Free Games tab may have more live giveaway results.',
              HELP_TEXT
            );
          }
          return introCard(
            'Free games right now',
            'Best zero-cost picks from the deals already loaded here.',
            free.map(formatDealCard).join('')
          );
        }

        case 'findCheap': {
          const maxPrice = 5;
          const cheap = deals
            .filter((deal) => deal.salePrice <= maxPrice && deal.salePrice > 0)
            .sort((a, b) => a.salePrice - b.salePrice)
            .slice(0, 3);

          if (!cheap.length) {
            return introCard(
              `Nothing under $${maxPrice}`,
              'Try asking for under $10 to widen the results.',
              HELP_TEXT
            );
          }

          return introCard(
            `Cheapest games under $${maxPrice}`,
            'Sorted by lowest current price.',
            cheap.map(formatDealCard).join('')
          );
        }

        case 'findBest': {
          const best = [...deals].sort((a, b) => b.savings - a.savings).slice(0, 3);
          if (!best.length) {
            return introCard(
              'No deals are loaded yet',
              'Open the deals feed first and I can rank it for you.',
              HELP_TEXT
            );
          }
          return introCard(
            'Best deals right now',
            'Top savings from the deals currently visible on this page.',
            best.map(formatDealCard).join('')
          );
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
          const filtered = deals
            .filter((deal) => keywords.some((keyword) => deal.title.toLowerCase().includes(keyword)))
            .slice(0, 3);
          const genreLabel = intent.genre.toUpperCase();

          if (!filtered.length) {
            return introCard(
              `No ${genreLabel} matches found`,
              'The deal titles currently loaded do not match that genre yet.',
              HELP_TEXT
            );
          }

          return introCard(
            `${genreLabel} picks`,
            'Matched from the titles currently visible in the deals feed.',
            filtered.map(formatDealCard).join('')
          );
        }

        case 'findStore': {
          const store = intent.store;
          const filtered = deals
            .filter((deal) => deal.storeName.toLowerCase().includes(store.toLowerCase()))
            .slice(0, 3);

          if (!filtered.length) {
            return introCard(
              `No ${store} deals loaded`,
              'Try refreshing the deals feed or switching filters.',
              HELP_TEXT
            );
          }

          return introCard(
            `${store} deals`,
            'Current matches from that store in the loaded results.',
            filtered.map(formatDealCard).join('')
          );
        }

        case 'findUnderPrice': {
          const maxPrice = parseFloat(match[1]);
          const under = deals
            .filter((deal) => deal.salePrice <= maxPrice && deal.salePrice > 0)
            .sort((a, b) => a.salePrice - b.salePrice)
            .slice(0, 3);

          if (!under.length) {
            return introCard(
              `No games under $${maxPrice}`,
              'Try a higher price cap or a store-specific search.',
              HELP_TEXT
            );
          }

          return introCard(
            `Games under $${maxPrice}`,
            'Cheapest results first.',
            under.map(formatDealCard).join('')
          );
        }
      }
    }

    return introCard(
      'I did not catch that request',
      'Try one of the quick prompts or use a price, store, or genre.',
      HELP_TEXT
    );
  }

  function addMessage(text, sender) {
    const messages = document.getElementById('cb-messages');
    if (!messages) return;

    const message = document.createElement('div');
    message.className = `cb-message cb-message--${sender}`;
    message.innerHTML = sender === 'bot'
      ? `<span class="cb-avatar">AI</span><div class="cb-message-bubble">${text}</div>`
      : `<div class="cb-message-bubble">${escapeHtml(text)}</div><span class="cb-avatar">You</span>`;

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    messageCount++;
  }

  function showTyping() {
    const messages = document.getElementById('cb-messages');
    if (!messages) return;

    const message = document.createElement('div');
    message.className = 'cb-message cb-message--bot cb-typing';
    message.id = 'cb-typing-indicator';
    message.innerHTML = '<span class="cb-avatar">AI</span><div class="cb-message-bubble"><span class="cb-dots"><span></span><span></span><span></span></span></div>';
    messages.appendChild(message);
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
      addMessage(processMessage(text), 'bot');
    }, 450 + Math.random() * 250);
  }

  function toggleChat() {
    const widget = document.getElementById('cb-widget');
    if (!widget) return;

    isOpen = !isOpen;
    widget.classList.toggle('cb-widget--open', isOpen);
    document.getElementById('cb-bubble')?.setAttribute('aria-expanded', String(isOpen));

    if (isOpen && messageCount === 0) {
      setTimeout(() => addMessage(buildWelcomeMessage(), 'bot'), 220);
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

    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    sendBtn?.addEventListener('click', sendMessage);

    document.querySelectorAll('.cb-quick-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (input) input.value = chip.dataset.query || chip.textContent || '';
        sendMessage();
      });
    });
  }

  return { init, toggleChat, sendMessage };
})();
