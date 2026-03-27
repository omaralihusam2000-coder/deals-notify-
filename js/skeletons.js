/**
 * skeletons.js — Skeleton loading placeholders for all tabs
 */
const SkeletonsModule = (() => {
  function cardSkeleton() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>
    `;
  }

  function newsSkeleton() {
    return `
      <div class="skeleton-news">
        <div class="skeleton skeleton-news-img"></div>
        <div class="skeleton-news-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>
    `;
  }

  function showInGrid(containerId, count = 6, type = 'card') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const fn = type === 'news' ? newsSkeleton : cardSkeleton;
    container.innerHTML = Array(count).fill(null).map(() => fn()).join('');
  }

  function clearGrid(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const skeletons = container.querySelectorAll('.skeleton-card, .skeleton-news');
      skeletons.forEach(s => s.remove());
    }
  }

  return { showInGrid, clearGrid, cardSkeleton, newsSkeleton };
})();
