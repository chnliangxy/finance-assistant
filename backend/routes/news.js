const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const newsService = require('../services/newsService');

router.get('/', (req, res) => {
  try {
    const { category, limit = 20 } = req.query;
    let query = 'SELECT * FROM news';
    const params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY published_at DESC, created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    let news = db.prepare(query).all(...params);

    if (news.length === 0) {
      news = newsService.getFallbackNews();
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const news = await newsService.fetchNews();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const news = db.prepare('SELECT * FROM news WHERE id = ?').get(id);
    if (!news) {
      return res.status(404).json({ error: 'News item not found' });
    }
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
