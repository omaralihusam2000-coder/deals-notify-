/**
 * news.js — Gaming News Feed via RSS2JSON (English + Arabic)
 */

const NewsModule = (() => {
  const PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  const EN_FEEDS = [
    { name: 'IGN',       url: PROXY + encodeURIComponent('https://feeds.feedburner.com/ign/games-all') },
    { name: 'PC Gamer',  url: PROXY + encodeURIComponent('https://www.pcgamer.com/rss/') },
    { name: 'Eurogamer', url: PROXY + encodeURIComponent('https://www.eurogamer.net/?format=rss') },
    { name: 'GameSpot',  url: PROXY + encodeURIComponent('https://www.gamespot.com/feeds/mashup/') },
    { name: 'Polygon',   url: PROXY + encodeURIComponent('https://www.polygon.com/rss/index.xml') },
    { name: 'Kotaku',    url: PROXY + encodeURIComponent('https://kotaku.com/rss') },
  ];

  // Arabic gaming keywords used to filter mixed feeds (pre-lowercased)
  const AR_GAMING_KEYWORDS = [
    'لعبة', 'ألعاب', 'جيمز', 'جيمر', 'بلايستيشن', 'اكس بوكس', 'نينتندو',
    'ستيم', 'gaming', 'game', 'ps5', 'xbox', 'nintendo', 'steam', 'esport',
    'كونسول', 'تحديث', 'إطلاق', 'مراجعة', 'موبايل', 'بطولة', 'pc',
  ];

  const AR_FEEDS = [
    { name: 'عرب هاردوير', url: PROXY + encodeURIComponent('https://www.arabhardware.net/feed/'), filter: true },
    { name: 'سعودي جيمر',  url: PROXY + encodeURIComponent('https://saudigamer.com/feed/') },
    { name: 'ترو جيمنج',   url: PROXY + encodeURIComponent('https://www.true-gaming.net/home/feed/') },
    { name: 'جيمز ميكس',   url: PROXY + encodeURIComponent('https://gamesmix.net/feed/') },
  ];

  let allArticles = [];
  let seenLinks = new Set();
  let currentLang = storageGet('news-lang', 'all');
  let lastUpdated = null;
  let refreshTimer = null;
  let lastUpdatedTimer = null;
  let visibleCount = 12;

  // ── Helpers ───────────────────────────────────────────────────────

  function isGamingArticle(item) {
    const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
    return AR_GAMING_KEYWORDS.some(kw => text.includes(kw));
  }

  function relativeDate(dateStr, isArabic) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);

    if (isArabic) {
      if (mins < 1)    return 'الآن';
      if (mins < 60)   return `قبل ${mins} دقيقة`;
      if (hours < 24)  return `قبل ${hours} ساعة`;
      return `قبل ${days} يوم`;
    } else {
      if (mins < 1)    return 'just now';
      if (mins < 60)   return `${mins}m ago`;
      if (hours < 24)  return `${hours}h ago`;
      return `${days}d ago`;
    }
  }

  function lastUpdatedText() {
    if (!lastUpdated) return '';
    const mins = Math.floor((Date.now() - lastUpdated) / 60000);
    if (mins < 1) return 'Last updated: just now';
    return `Last updated: ${mins} minute${mins !== 1 ? 's' : ''} ago`;
  }

  function updateLastUpdatedUI() {
    const el = document.getElementById('news-last-updated');
    if (el) el.textContent = lastUpdatedText();
  }

  // ── Fetch ─────────────────────────────────────────────────────────

  async function fetchFeed(feed, lang) {
    try {
      const data = await fetchJSON(feed.url);
      if (!data || !Array.isArray(data.items)) return [];
      let items = data.items.slice(0, 10);
      if (feed.filter) items = items.filter(isGamingArticle);
      return items.map(item => ({ ...item, source: feed.name, lang }));
    } catch (_) {
      return [];
    }
  }

  async function fetchNews() {
    const container = document.getElementById('news-grid');
    if (!container) return;

    showSkeletons(container, 6);
    visibleCount = 12;

    const [enResults, arResults] = await Promise.all([
      Promise.all(EN_FEEDS.map(f => fetchFeed(f, 'en'))),
      Promise.all(AR_FEEDS.map(f => fetchFeed(f, 'ar'))),
    ]);

    const freshArticles = [
      ...enResults.flat(),
      ...arResults.flat(),
    ].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Count truly new articles by tracking links seen in previous fetch
    const newCount = freshArticles.filter(a => a.link && !seenLinks.has(a.link)).length;
    const isRefresh = seenLinks.size > 0;

    seenLinks = new Set(freshArticles.map(a => a.link).filter(Boolean));
    allArticles = freshArticles;

    lastUpdated = Date.now();
    updateLastUpdatedUI();

    if (isRefresh && newCount > 0) {
      showToast(`🆕 ${newCount} new article${newCount !== 1 ? 's' : ''} found!`, 'success');
    }

    renderFiltered();
  }

  // ── Render ────────────────────────────────────────────────────────

  function getFilteredArticles() {
    if (currentLang === 'en') return allArticles.filter(a => a.lang === 'en');
    if (currentLang === 'ar') return allArticles.filter(a => a.lang === 'ar');
    return allArticles;
  }

  function renderFiltered() {
    const container = document.getElementById('news-grid');
    if (!container) return;

    const articles = getFilteredArticles();

    if (articles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📰</div>
          <p>No news articles available right now. Try again later.</p>
        </div>`;
      const loadMoreWrap = document.getElementById('news-load-more-wrap');
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      return;
    }

    renderNews(articles.slice(0, visibleCount));

    // Load more button
    const loadMoreWrap = document.getElementById('news-load-more-wrap');
    if (loadMoreWrap) {
      loadMoreWrap.style.display = articles.length > visibleCount ? 'flex' : 'none';
    }
  }

  function renderNews(articles) {
    const container = document.getElementById('news-grid');
    if (!container) return;
    container.innerHTML = '';

    articles.forEach(article => {
      const isAr = article.lang === 'ar';
      const card = document.createElement('article');
      card.className = 'news-card';
      if (isAr) card.setAttribute('dir', 'rtl');

      const thumbnail = article.thumbnail || article.enclosure?.link || '';
      const dateStr = relativeDate(article.pubDate, isAr);

      let summary = '';
      try {
        const doc = new DOMParser().parseFromString(article.description || '', 'text/html');
        summary = truncate(doc.body.textContent.trim(), 120);
      } catch (_) {
        summary = '';
      }

      const langBadge = isAr
        ? `<span class="lang-badge lang-badge-ar">AR 🇮🇶</span>`
        : `<span class="lang-badge lang-badge-en">EN 🇬🇧</span>`;

      card.innerHTML = `
        <a class="news-card-link" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(article.title)}">
          <div class="news-img-wrap">
            ${thumbnail
              ? `<img class="news-img" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">`
              : `<div class="news-img-placeholder">📰</div>`
            }
            <span class="news-source-badge">${escapeHtml(article.source)}</span>
            ${langBadge}
          </div>
          <div class="news-body">
            <h3 class="news-title">${escapeHtml(article.title)}</h3>
            ${summary ? `<p class="news-summary">${escapeHtml(summary)}</p>` : ''}
            <div class="news-meta">
              ${dateStr ? `<span class="news-date">📅 ${escapeHtml(dateStr)}</span>` : ''}
              <span class="news-read-more">${isAr ? 'اقرأ المزيد ←' : 'Read →'}</span>
            </div>
          </div>
        </a>
      `;
      container.appendChild(card);
    });
  }

  // ── Language toggle ───────────────────────────────────────────────

  function setLang(lang) {
    currentLang = lang;
    storageSet('news-lang', lang);
    visibleCount = 12;

    // Update active button
    document.querySelectorAll('.news-lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    renderFiltered();
  }

  // ── Load more ─────────────────────────────────────────────────────

  function loadMore() {
    visibleCount += 12;
    renderFiltered();
  }

  // ── Auto-refresh ──────────────────────────────────────────────────

  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (lastUpdatedTimer) clearInterval(lastUpdatedTimer);

    refreshTimer = setInterval(fetchNews, REFRESH_INTERVAL_MS);
    lastUpdatedTimer = setInterval(updateLastUpdatedUI, 60 * 1000);
  }

  // ── Init ──────────────────────────────────────────────────────────

  function init() {
    const newsTab = document.getElementById('tab-news');
    if (newsTab && !newsTab.dataset.loaded) {
      newsTab.dataset.loaded = '1';

      // Set initial active toggle button
      currentLang = storageGet('news-lang', 'all');
      document.querySelectorAll('.news-lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
        btn.addEventListener('click', () => setLang(btn.dataset.lang));
      });

      // Load more button
      const loadMoreBtn = document.getElementById('news-load-more-btn');
      if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMore);

      fetchNews();
      startAutoRefresh();
    }
  }

  return { fetchNews, renderNews, renderFiltered, setLang, loadMore, init };
})();
