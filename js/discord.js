/**
 * discord.js — Discord Community Widget
 * Shows a Discord invite widget; uses configurable guild ID.
 */

const DiscordModule = (() => {
  // Configure these constants for your Discord server.
  // Leave GUILD_ID empty to show "Coming Soon" placeholder.
  const GUILD_ID    = '';  // e.g. '1234567890123456789'
  const INVITE_URL  = '';  // e.g. 'https://discord.gg/yourinvite'
  const SERVER_NAME = 'Gaming Deals Community';

  async function fetchMemberCount() {
    if (!GUILD_ID) return null;
    try {
      const data = await fetchJSON(`https://discord.com/api/guilds/${GUILD_ID}/widget.json`);
      return { online: data.presence_count || 0, name: data.name || SERVER_NAME };
    } catch {
      return null;
    }
  }

  function renderWidget(container, widgetData) {
    if (!container) return;

    if (!GUILD_ID) {
      container.innerHTML = `
        <div class="discord-widget discord-coming-soon">
          <div class="discord-logo">💬</div>
          <div class="discord-info">
            <div class="discord-title">Discord Community</div>
            <div class="discord-desc text-muted">Coming Soon — Join our gaming community!</div>
          </div>
        </div>
      `;
      return;
    }

    const onlineText = widgetData ? `${widgetData.online} online` : 'Join us!';
    const serverName = (widgetData && widgetData.name) || SERVER_NAME;

    container.innerHTML = `
      <div class="discord-widget">
        <div class="discord-logo">
          <svg viewBox="0 0 24 24" fill="#5865F2" width="28" height="28" aria-hidden="true">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.027.017.052.037.065a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </div>
        <div class="discord-info">
          <div class="discord-title">${escapeHtml(serverName)}</div>
          <div class="discord-online"><span class="discord-online-dot"></span>${escapeHtml(onlineText)}</div>
        </div>
        ${INVITE_URL ? `<a class="btn btn-discord btn-sm" href="${escapeHtml(INVITE_URL)}" target="_blank" rel="noopener noreferrer">Join Server</a>` : ''}
      </div>
    `;
  }

  function renderSettingsWidget() {
    const container = document.getElementById('discord-settings-section');
    if (!container) return;

    if (!GUILD_ID) {
      container.innerHTML = `
        <div class="settings-card">
          <h3 class="settings-card-title">💬 Discord Community</h3>
          <div class="settings-row">
            <div class="settings-label">
              <strong>Coming Soon</strong>
              A Discord community server is coming! Configure the GUILD_ID in js/discord.js to enable the widget.
            </div>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="settings-card">
        <h3 class="settings-card-title">💬 Discord Community</h3>
        <div id="discord-widget-settings"></div>
      </div>`;
    fetchMemberCount().then(data => renderWidget(container.querySelector('#discord-widget-settings'), data));
  }

  async function init() {
    // Floating widget in footer
    const floatingContainer = document.getElementById('discord-floating-widget');
    if (floatingContainer) {
      const data = await fetchMemberCount();
      renderWidget(floatingContainer, data);
    }

    renderSettingsWidget();
  }

  return { init, renderWidget, fetchMemberCount };
})();
