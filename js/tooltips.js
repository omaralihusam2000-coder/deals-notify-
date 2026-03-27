/**
 * tooltips.js — Contextual tooltips for interactive elements
 */
const TooltipsModule = (() => {
  let currentTooltip = null;

  function init() {
    // Use event delegation for dynamic content
    document.addEventListener('mouseenter', handleHover, true);
    document.addEventListener('mouseleave', hideTooltip, true);
    document.addEventListener('scroll', hideTooltip, { passive: true });
  }

  function handleHover(e) {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    showTooltip(target, target.dataset.tooltip);
  }

  function showTooltip(anchor, text) {
    hideTooltip();
    const tip = document.createElement('div');
    tip.className = 'smart-tooltip';
    tip.textContent = text;
    document.body.appendChild(tip);

    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();

    let top = rect.top - tipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

    // Keep on screen
    if (top < 4) top = rect.bottom + 8;
    if (left < 4) left = 4;
    if (left + tipRect.width > window.innerWidth - 4) left = window.innerWidth - tipRect.width - 4;

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    requestAnimationFrame(() => tip.classList.add('tooltip-visible'));

    currentTooltip = tip;
  }

  function hideTooltip() {
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }
  }

  return { init, showTooltip, hideTooltip };
})();
