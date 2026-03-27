/**
 * scroll-progress.js — Reading progress indicator at the top of the page
 */
const ScrollProgressModule = (() => {
  function init() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress-bar';
    bar.id = 'scroll-progress-bar';
    document.body.prepend(bar);

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${Math.min(progress, 100)}%`;
    }, { passive: true });
  }

  return { init };
})();
