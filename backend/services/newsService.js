const { db } = require('../config/database');
const { getJson } = require('./freeApiClient');

async function fetchNews() {
  try {
    const data = await getJson('https://feed.sina.com.cn/api/roll/get', {
      params: {
        pageid: '153',
        lid: '2509',
        k: '',
        num: '20',
        page: '1',
        r: Math.random()
      }
    });

    const news = [];

    if (data && data.result && data.result.data) {
      data.result.data.forEach(item => {
        if (isFinanceRelated(item.title)) {
          const newsItem = {
            title: item.title,
            url: item.url,
            source: item.media_name || 'Sina Finance',
            published_at: new Date(item.createtime * 1000).toISOString(),
            category: categorizeNews(item.title)
          };
          
          news.push(newsItem);
          
          try {
            db.prepare(`
              INSERT OR IGNORE INTO news (title, url, source, published_at, category)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              newsItem.title,
              newsItem.url,
              newsItem.source,
              newsItem.published_at,
              newsItem.category
            );
          } catch (e) {
          }
        }
      });
    }

    if (news.length > 0) {
      return news;
    }

    return getFallbackNews();
  } catch (error) {
    console.error('Failed to fetch news:', error.message);
    return getFallbackNews();
  }
}

function isFinanceRelated(title) {
  return Boolean(title);
}

function categorizeNews(title) {
  if (title.includes('stock') || title.includes('equity') || title.includes('market')) {
    return 'stock';
  }
  if (title.includes('fund')) {
    return 'fund';
  }
  if (title.includes('gold') || title.includes('oil') || title.includes('futures')) {
    return 'commodity';
  }
  if (title.includes('central bank') || title.includes('rate') || title.includes('economy')) {
    return 'macro';
  }
  return 'general';
}

async function getStockNews(stockCode, stockName) {
  try {
    const data = await getJson('https://feed.sina.com.cn/api/roll/get', {
      params: {
        pageid: '153',
        lid: '2509',
        k: stockName || stockCode,
        num: '10',
        page: '1',
        r: Math.random()
      }
    });

    const news = [];

    if (data && data.result && data.result.data) {
      data.result.data.forEach(item => {
        news.push({
          title: item.title,
          url: item.url,
          source: item.media_name || 'Sina Finance',
          published_at: new Date(item.createtime * 1000).toISOString()
        });
      });
    }

    return news;
  } catch (error) {
    console.error('Failed to fetch stock news:', error.message);
    return [];
  }
}

function getFallbackNews() {
  const now = new Date();
  return [
    {
      title: 'The free news source is temporarily unavailable; showing local market notes.',
      url: '',
      source: 'Local fallback',
      published_at: now.toISOString(),
      category: 'general'
    },
    {
      title: 'Review allocation, position P/L, and cash-flow safety margin.',
      url: '',
      source: 'Local fallback',
      published_at: new Date(now.getTime() - 600000).toISOString(),
      category: 'macro'
    },
    {
      title: 'Stock and fund data still refresh through free public market sources.',
      url: '',
      source: 'Local fallback',
      published_at: new Date(now.getTime() - 1200000).toISOString(),
      category: 'stock'
    }
  ];
}

module.exports = {
  fetchNews,
  getStockNews,
  getFallbackNews
};
