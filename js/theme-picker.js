/**
 * theme-picker.js — Accent color theme customizer
 */
const ThemePickerModule = (() => {
  const STORAGE_KEY = 'gdn_accent_color';
  const COLORS = [
    { hex: '#00d4ff', name: 'Cyan' },
    { hex: '#a855f7', name: 'Purple' },
    { hex: '#00ff88', name: 'Green' },
    { hex: '#ff4757', name: 'Red' },
    { hex: '#ffd700', name: 'Gold' },
    { hex: '#ff85a1', name: 'Pink' },
  ];

  function applyColor(hex) {
    document.documentElement.style.setProperty('--accent-blue', hex);
    const glow = hex + '66';
    document.documentElement.style.setProperty('--accent-glow', glow);
    storageSet(STORAGE_KEY, hex);
    document.querySelectorAll('.accent-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === hex);
    });
  }

  function renderPicker() {
    const container = document.getElementById('accent-picker-container');
    if (!container) return;
    container.innerHTML = COLORS.map(c => `
      <button class="accent-swatch ${storageGet(STORAGE_KEY, '#00d4ff') === c.hex ? 'active' : ''}"
        data-color="${c.hex}"
        style="background:${c.hex};"
        title="${c.name}"
        aria-label="Set ${c.name} theme">
        ${storageGet(STORAGE_KEY, '#00d4ff') === c.hex ? '<span class="accent-check">✓</span>' : ''}
      </button>
    `).join('');
    container.querySelectorAll('.accent-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        applyColor(swatch.dataset.color);
        renderPicker();
        if (typeof SoundsModule !== 'undefined') SoundsModule.click();
        showToast(`🎨 Theme color changed!`, 'success');
      });
    });
  }

  function init() {
    // Apply saved color on load
    const saved = storageGet(STORAGE_KEY, null);
    if (saved) applyColor(saved);
    renderPicker();
  }

  return { init, applyColor };
})();
