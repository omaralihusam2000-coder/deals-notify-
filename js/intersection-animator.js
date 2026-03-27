/**
 * intersection-animator.js — Animate cards only when they scroll into view
 */
const IntersectionAnimatorModule = (() => {
  let observer = null;

  function init() {
    if (!('IntersectionObserver' in window)) return;

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('card-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });

    // Observe all grid items
    observeAll();

    // Re-observe when new content loads (MutationObserver)
    const grids = document.querySelectorAll('.cards-grid, .news-grid');
    const mutObserver = new MutationObserver(() => {
      requestAnimationFrame(() => observeAll());
    });
    grids.forEach(grid => {
      mutObserver.observe(grid, { childList: true });
    });
  }

  function observeAll() {
    if (!observer) return;
    const items = document.querySelectorAll('.cards-grid > :not(.card-visible):not(.skeleton-card), .news-grid > :not(.card-visible):not(.skeleton-news)');
    items.forEach(item => {
      item.classList.add('card-will-animate');
      observer.observe(item);
    });
  }

  return { init, observeAll };
})();
