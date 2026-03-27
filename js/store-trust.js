/**
 * store-trust.js — Store Trust Badges
 * Adds trust level badge next to store names on deal cards.
 * Predefined trust data for major stores.
 */

const StoreTrustModule = (() => {
  const TRUST_DB = {
    'Steam':             { level: 'trusted',  label: '✅ Trusted',  detail: 'Official Valve store — industry standard, full refund policy, family sharing.' },
    'GOG':               { level: 'trusted',  label: '✅ Trusted',  detail: 'DRM-free games, authorized publisher partner, excellent customer service.' },
    'Epic Games Store':  { level: 'trusted',  label: '✅ Trusted',  detail: 'Official Epic platform, regular free games, authorized publisher.' },
    'Humble Store':      { level: 'trusted',  label: '✅ Trusted',  detail: 'Authorized reseller. Part of IGN/Ziff Davis. Charity bundles.' },
    'Fanatical':         { level: 'trusted',  label: '✅ Trusted',  detail: 'Authorized reseller (Focus Home). Safe and legitimate store.' },
    'Green Man Gaming':  { level: 'trusted',  label: '✅ Trusted',  detail: 'UK-based authorized reseller, established since 2009.' },
    'WinGameStore':      { level: 'trusted',  label: '✅ Trusted',  detail: 'Authorized reseller. Been around since 2010. Generally safe.' },
    'IndieGala Store':   { level: 'trusted',  label: '✅ Trusted',  detail: 'Authorized reseller for indie games and bundles.' },
    'GamersGate':        { level: 'caution',  label: '⚠️ Caution',  detail: 'Some user reports of slow delivery. Generally legit but not top-tier.' },
    'Amazon':            { level: 'trusted',  label: '✅ Trusted',  detail: 'Official Amazon marketplace. Safe and reliable.' },
    'Gamesplanet':       { level: 'trusted',  label: '✅ Trusted',  detail: 'Authorized EU-based reseller. Safe.' },
    'Voidu':             { level: 'caution',  label: '⚠️ Caution',  detail: 'Grey market tendencies. Proceed with caution.' },
    'GameBillet':        { level: 'caution',  label: '⚠️ Caution',  detail: 'Generally works, but some reports of issues. Use at own risk.' },
    'Funstock':          { level: 'caution',  label: '⚠️ Caution',  detail: 'UK reseller. Some reports of slower customer support.' },
    'default':           { level: 'unknown',  label: '❔ Unknown',  detail: 'Trust level unknown. Research this store before purchasing.' },
  };

  function getTrust(storeName) {
    return TRUST_DB[storeName] || TRUST_DB['default'];
  }

  function createBadge(storeName) {
    const trust = getTrust(storeName);
    const span = document.createElement('span');
    span.className = `store-trust-badge store-trust-badge--${trust.level}`;
    span.textContent = trust.label;
    span.title = trust.detail;
    span.setAttribute('data-tooltip', trust.detail);
    span.setAttribute('aria-label', `${storeName} trust level: ${trust.label}`);
    return span;
  }

  // Apply badges to all deal cards in the DOM
  function applyBadges() {
    document.querySelectorAll('.card-store, .deal-store').forEach(storeEl => {
      if (storeEl.querySelector('.store-trust-badge')) return; // already applied
      const storeName = storeEl.textContent?.trim();
      if (!storeName) return;
      const badge = createBadge(storeName);
      storeEl.appendChild(badge);
    });
  }

  // Observe deals grid for new cards
  function observeGrid() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;
    const obs = new MutationObserver(() => applyBadges());
    obs.observe(grid, { childList: true, subtree: true });
  }

  function init() {
    applyBadges();
    observeGrid();
  }

  return { init, getTrust, createBadge, applyBadges };
})();

document.addEventListener('DOMContentLoaded', () => StoreTrustModule.init());
