// Personalized News Feed — Cloudflare Worker
// Frontend + API in one file. Uses KV for topic storage, Google News RSS for news.

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Моя лента новостей</title>
<style>
  :root {
    --bg: #0f1117;
    --bg-card: #1a1d27;
    --bg-card-hover: #222634;
    --text: #e8eaf0;
    --text-muted: #8b8fa3;
    --accent: #6366f1;
    --accent-hover: #818cf8;
    --accent-light: rgba(99,102,241,0.15);
    --border: #2a2e3d;
    --green: #22c55e;
    --red: #ef4444;
    --radius: 14px;
    --shadow: 0 4px 24px rgba(0,0,0,0.3);
  }
  [data-theme="light"] {
    --bg: #f5f6fa;
    --bg-card: #ffffff;
    --bg-card-hover: #f0f2f8;
    --text: #1a1d27;
    --text-muted: #6b7280;
    --accent: #6366f1;
    --accent-hover: #4f46e5;
    --accent-light: rgba(99,102,241,0.1);
    --border: #e2e5ee;
    --shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    transition: background 0.3s, color 0.3s;
  }
  .header {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
    padding: 28px 0 24px;
    box-shadow: var(--shadow);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .header h1 {
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .header h1 .icon { font-size: 28px; }
  .header-actions { display: flex; gap: 8px; align-items: center; }
  .btn-icon {
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    width: 40px; height: 40px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }
  .btn-icon:hover { background: rgba(255,255,255,0.35); }
  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 24px 20px 60px;
  }
  .topics-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: var(--shadow);
  }
  .topics-section h2 {
    font-size: 15px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .topics-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .topic-tag {
    background: var(--accent-light);
    color: var(--accent);
    border: 1px solid var(--accent);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: default;
    transition: all 0.2s;
  }
  .topic-tag:hover {
    background: var(--accent);
    color: #fff;
  }
  .topic-tag .remove {
    cursor: pointer;
    opacity: 0.6;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
  }
  .topic-tag .remove:hover { opacity: 1; }
  .topic-add {
    display: flex;
    gap: 8px;
  }
  .topic-add input {
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    outline: none;
    transition: border 0.2s;
  }
  .topic-add input:focus { border-color: var(--accent); }
  .btn {
    background: var(--accent);
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn:hover { background: var(--accent-hover); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .news-grid {
    display: grid;
    gap: 16px;
  }
  .news-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
    transition: background 0.2s, transform 0.2s;
    cursor: pointer;
    text-decoration: none;
    color: var(--text);
    display: block;
  }
  .news-card:hover {
    background: var(--bg-card-hover);
    transform: translateY(-2px);
  }
  .news-card .source {
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .news-card .title {
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 8px;
  }
  .news-card .snippet {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .news-card .meta {
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .news-card .topic-badge {
    background: var(--accent-light);
    color: var(--accent);
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .loading {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
  }
  .loading .spinner {
    width: 40px; height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    margin: 0 auto 16px;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
  }
  .empty .big-icon { font-size: 48px; margin-bottom: 16px; }
  .empty p { font-size: 15px; margin-bottom: 6px; }
  .empty .hint { font-size: 13px; opacity: 0.7; }
  .error {
    text-align: center;
    padding: 40px 20px;
    color: var(--red);
    font-size: 14px;
  }
  .suggested-topics {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .suggested-topics .suggestion {
    background: var(--bg);
    border: 1px dashed var(--border);
    color: var(--text-muted);
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .suggested-topics .suggestion:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  @media (max-width: 600px) {
    .header h1 { font-size: 18px; }
    .news-card .title { font-size: 15px; }
    .container { padding: 16px 12px 40px; }
  }
</style>
</head>
<body data-theme="dark">
  <div class="header">
    <div class="header-inner">
      <h1><span class="icon">📰</span> Моя лента</h1>
      <div class="header-actions">
        <button class="btn-icon" id="themeBtn" title="Сменить тему">🌙</button>
        <button class="btn-icon" id="refreshBtn" title="Обновить">🔄</button>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="topics-section">
      <h2>
        <span>Мои темы</span>
        <span style="font-size:12px; text-transform:none; letter-spacing:0;" id="topicCount"></span>
      </h2>
      <div class="topics-list" id="topicsList"></div>
      <div class="topic-add">
        <input type="text" id="topicInput" placeholder="Добавить тему (например: технологии, спорт, наука...)" maxlength="50">
        <button class="btn" id="addTopicBtn">Добавить</button>
      </div>
      <div class="suggested-topics" id="suggestedTopics"></div>
    </div>

    <div class="news-grid" id="newsGrid">
      <div class="loading">
        <div class="spinner"></div>
        <p>Загрузка новостей…</p>
      </div>
    </div>
  </div>

<script>
const API = '/api';
let topics = [];
let theme = localStorage.getItem('news-theme') || 'dark';

function applyTheme() {
  document.body.dataset.theme = theme;
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '🌙' : '☀️';
}
applyTheme();

document.getElementById('themeBtn').onclick = () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('news-theme', theme);
  applyTheme();
};

const suggestions = ['Технологии', 'Наука', 'Спорт', 'Кино', 'Музыка', 'Игры', 'Космос', 'Здоровье', 'Экономика', 'Путешествия'];

function renderSuggestedTopics() {
  const container = document.getElementById('suggestedTopics');
  const available = suggestions.filter(s => !topics.some(t => t.toLowerCase() === s.toLowerCase()));
  container.innerHTML = available.slice(0, 6).map(s =>
    '<span class="suggestion" data-topic="' + s + '">+ ' + s + '</span>'
  ).join('');
  container.querySelectorAll('.suggestion').forEach(el => {
    el.onclick = () => addTopic(el.dataset.topic);
  });
}

function renderTopics() {
  const list = document.getElementById('topicsList');
  document.getElementById('topicCount').textContent = topics.length ? topics.length + ' тем' : '';
  if (topics.length === 0) {
    list.innerHTML = '<span style="color:var(--text-muted);font-size:14px;">Пока нет тем. Добавьте темы выше или выберите из предложенных ↓</span>';
  } else {
    list.innerHTML = topics.map(t =>
      '<span class="topic-tag">' + escapeHtml(t) + ' <span class="remove" data-topic="' + escapeHtml(t) + '">×</span></span>'
    ).join('');
    list.querySelectorAll('.remove').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); removeTopic(el.dataset.topic); };
    });
  }
  renderSuggestedTopics();
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function saveTopics() {
  await fetch(API + '/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topics })
  });
}

async function addTopic(topic) {
  topic = topic.trim();
  if (!topic) return;
  if (topics.some(t => t.toLowerCase() === topic.toLowerCase())) return;
  topics.push(topic);
  renderTopics();
  await saveTopics();
  loadNews();
  document.getElementById('topicInput').value = '';
}

async function removeTopic(topic) {
  topics = topics.filter(t => t !== topic);
  renderTopics();
  await saveTopics();
  loadNews();
}

document.getElementById('addTopicBtn').onclick = () => {
  addTopic(document.getElementById('topicInput').value);
};
document.getElementById('topicInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTopic(e.target.value);
});

function timeAgo(dateStr) {
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h > 24) return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    if (h > 0) return h + ' ч назад';
    if (m > 0) return m + ' мин назад';
    return 'только что';
  } catch { return ''; }
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

async function loadNews() {
  const grid = document.getElementById('newsGrid');
  if (topics.length === 0) {
    grid.innerHTML = '<div class="empty"><div class="big-icon">📰</div><p>Добавьте темы, чтобы видеть персональную ленту новостей</p><p class="hint">Выберите из предложенных ниже или введите свою</p></div>';
    return;
  }
  grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Загрузка новостей…</p></div>';
  try {
    const resp = await fetch(API + '/news');
    const data = await resp.json();
    if (!data.items || data.items.length === 0) {
      grid.innerHTML = '<div class="empty"><div class="big-icon">📭</div><p>По вашим темам пока нет новостей</p><p class="hint">Попробуйте другие темы</p></div>';
      return;
    }
    grid.innerHTML = data.items.map(item => {
      const snippet = stripHtml(item.description).slice(0, 200);
      return '<a class="news-card" href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">' +
        '<div class="source">' + escapeHtml(item.source) + '</div>' +
        '<div class="title">' + escapeHtml(item.title) + '</div>' +
        (snippet ? '<div class="snippet">' + escapeHtml(snippet) + '</div>' : '') +
        '<div class="meta">' +
          '<span class="topic-badge">' + escapeHtml(item.topic) + '</span>' +
          '<span>' + timeAgo(item.date) + '</span>' +
        '</div>' +
      '</a>';
    }).join('');
  } catch (e) {
    grid.innerHTML = '<div class="error">Не удалось загрузить новости. Попробуйте обновить.</div>';
  }
}

document.getElementById('refreshBtn').onclick = loadNews;

async function init() {
  try {
    const resp = await fetch(API + '/topics');
    const data = await resp.json();
    topics = data.topics || [];
  } catch {}
  renderTopics();
  loadNews();
}
init();
</script>
</body>
</html>`;

// --- Simple RSS XML parser (no DOMParser in Workers) ---
function parseRSS(xml, topicName) {
  const items = [];
  // Match <item> blocks (RSS 2.0)
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) || [];

  for (const block of matches) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');
    const source = extractTag(block, 'source') || 'Google News';

    if (title && link) {
      items.push({
        title: decodeEntities(title),
        link: decodeEntities(link),
        description: decodeEntities(description || ''),
        date: pubDate || new Date().toISOString(),
        source: decodeEntities(source),
        topic: topicName
      });
    }
  }
  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

async function fetchNewsForTopic(topic) {
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(topic) + '&hl=ru&gl=RU&ceid=RU:ru';
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsFeedBot/1.0)' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    return parseRSS(xml, topic).slice(0, 10);
  } catch {
    return [];
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- API routes ---
    if (url.pathname === '/api/topics') {
      // GET: retrieve topics
      if (request.method === 'GET') {
        const data = await env.NEWS_KV.get('user_topics');
        const topics = data ? JSON.parse(data) : [];
        return json({ topics });
      }
      // POST: save topics
      if (request.method === 'POST') {
        const body = await request.json();
        const topics = (body.topics || []).filter(t => typeof t === 'string' && t.trim().length > 0).slice(0, 30);
        await env.NEWS_KV.put('user_topics', JSON.stringify(topics));
        return json({ ok: true, topics });
      }
    }

    if (url.pathname === '/api/news') {
      if (request.method === 'GET') {
        const data = await env.NEWS_KV.get('user_topics');
        const topics = data ? JSON.parse(data) : [];
        if (topics.length === 0) return json({ items: [] });

        // Fetch news for all topics in parallel
        const results = await Promise.all(topics.map(t => fetchNewsForTopic(t)));
        let allItems = results.flat();

        // Sort by date (newest first)
        allItems.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Limit to 60 items
        allItems = allItems.slice(0, 60);

        return json({ items: allItems });
      }
    }

    // --- Serve frontend ---
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
