const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const aiService = require('../services/aiService');
const { buildPortfolioSnapshot, getStockPositions } = require('../services/portfolioService');

router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { stock_code, limit = 10 } = req.query;
    
    let query = 'SELECT * FROM ai_analysis WHERE user_id = ?';
    const params = [userId];
    
    if (stock_code) {
      query += ' AND stock_code = ?';
      params.push(stock_code);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const analyses = db.prepare(query).all(...params);
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { userId, stock_code, analysis_type = 'daily' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const stockInfo = stock_code ? db.prepare(`
      SELECT ws.*, sp.price as current_price, sp.change_percent
      FROM watchlist_stocks ws
      LEFT JOIN stock_prices sp ON ws.stock_code = sp.stock_code
      WHERE ws.user_id = ? AND ws.stock_code = ?
    `).get(userId, stock_code) : null;
    
    const stockHistory = stock_code ? db.prepare(`
      SELECT * FROM stock_prices 
      WHERE stock_code = ? 
      ORDER BY recorded_date DESC 
      LIMIT 30
    `).all(stock_code) : [];
    
    const news = db.prepare('SELECT * FROM news ORDER BY created_at DESC LIMIT 10').all();

    const analysis = await aiService.analyze({
      stockInfo,
      stockHistory,
      news,
      analysisType: analysis_type
    });
    
    const result = db.prepare(`
      INSERT INTO ai_analysis (user_id, stock_code, analysis_type, content, recommendation)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, stock_code || null, analysis_type, analysis.content, analysis.recommendation);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      stock_code,
      analysis_type,
      content: analysis.content,
      recommendation: analysis.recommendation,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/recommendation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const portfolio = await buildPortfolioSnapshot(userId);
    const stocks = await getStockPositions(userId);
    
    const news = db.prepare('SELECT * FROM news ORDER BY created_at DESC LIMIT 5').all();

    const recommendation = await aiService.generateRecommendation({
      portfolio,
      stocks,
      news
    });
    
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
