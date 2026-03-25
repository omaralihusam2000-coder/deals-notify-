/**
 * news.js — Gaming News Feed via RSS2JSON
 */

const NewsModule = (() => {
  const RSS2JSON_BASE = 'https://api.rss2json.com/v1/api.json?rss_url=';

  const RSS_FEEDS = [
    {
      name: 'Polygon',
      url: RSS2JSON_BASE + encodeURIComponent('https://www.polygon.com/rss/index.xml')
    },
    {
      name: 'PC Gamer',
      url: RSS2JSON_BASE + encodeURIComponent('https://www.pcgamer.com/rss/')
    },
    {
      name: 'Kotaku',
      url: RSS2JSON_BASE + encodeURIComponent('https://kotaku.com/rss')
    },
    {
      name: 'Rock Paper Shotgun',
      url: RSS2JSON_BASE + encodeURIComponent('https://www.rockpapershotgun.com/feed/rss')
    },
  ];

  let allArticles = [];

  async function fetchNews() {
    const container = document.getElementById('news-grid');
    if (!container) return;

    showSkeletons(container, 6);

    try {
      const results = await Promise.allSettled(
        RSS_FEEDS.map(feed => fetchJSON(feed.url))
      );

      allArticles = [];
      results.forEach((result, i) => {
        if (
          result.status === 'fulfilled' &&
          result.value &&
          result.value.status === 'ok' &&
          Array.isArray(result.value.items)
        ) {
          const items = result.value.items.slice(0, 10).map(item => ({
            ...item,
            source: RSS_FEEDS[i].name
          }));
          allArticles.push(...items);
        }
      });

      // Sort by publish date descending
      allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      if (allArticles.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📰</div>
            <p>No news articles available right now. Try again later.</p>
          </div>`;
        return;
      }

      renderNews(allArticles.slice(0, 12));
    } catch (err) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>Failed to load news: ${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="NewsModule.fetchNews()">Try Again</button>
        </div>`;
    }
  }

  function renderNews(articles) {
    const container = document.getElementById('news-grid');
    if (!container) return;
    container.innerHTML = '';

    articles.forEach(article => {
      const card = document.createElement('article');
      card.className = 'news-card';

      const thumbnail = article.thumbnail || article.enclosure?.link || '';
      const pubDate = article.pubDate ? new Date(article.pubDate) : null;
      const dateStr = pubDate ? pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

      // Safely strip HTML from description using DOMParser
      let rawDescription = article.description || '';
      let summary = '';
      try {
        const doc = new DOMParser().parseFromString(rawDescription, 'text/html');
        summary = truncate(doc.body.textContent.trim(), 120);
      } catch (_) {
        summary = '';
      }

      card.innerHTML = `
        <a class="news-card-link" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(article.title)}">
          <div class="news-img-wrap">
            ${thumbnail
              ? `<img class="news-img" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">`
              : `<div class="news-img-placeholder">📰</div>`
            }
            <span class="news-source-badge">${escapeHtml(article.source)}</span>
          </div>
          <div class="news-body">
            <h3 class="news-title">${escapeHtml(article.title)}</h3>
            ${summary ? `<p class="news-summary">${escapeHtml(summary)}</p>` : ''}
            <div class="news-meta">
              ${dateStr ? `<span class="news-date">📅 ${escapeHtml(dateStr)}</span>` : ''}
              <span class="news-read-more">Read →</span>
            </div>
          </div>
        </a>
      `;
      container.appendChild(card);
    });
  }

  function init() {
    const newsTab = document.getElementById('tab-news');
    if (newsTab && !newsTab.dataset.loaded) {
      newsTab.dataset.loaded = '1';
      fetchNews();
    }
  }

  return { fetchNews, renderNews, init };
})();
