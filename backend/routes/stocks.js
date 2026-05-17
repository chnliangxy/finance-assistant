const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const stockService = require('../services/stockService');
const { getStockPositions, saveStockPrice } = require('../services/portfolioService');

router.get('/watchlist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    res.json(await getStockPositions(userId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/watchlist', async (req, res) => {
  try {
    const { userId, stock_code, stock_name, buy_price, shares } = req.body;
    
    if (!userId || !stock_code) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const nextOrder = db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
      FROM watchlist_stocks
      WHERE user_id = ?
    `).get(userId).next_order;

    db.prepare(`
      INSERT INTO watchlist_stocks (user_id, stock_code, stock_name, buy_price, shares, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, stock_code) DO UPDATE SET
        stock_name = excluded.stock_name,
        buy_price = excluded.buy_price,
        shares = excluded.shares
    `).run(userId, stock_code, stock_name || '', buy_price || 0, shares || 0, nextOrder);

    const price = await stockService.getStockPrice(stock_code);
    if (price) {
      saveStockPrice(stock_code, price);
    }
    
    res.status(201).json({ message: 'Stock added', stock_code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/watchlist/:userId/reorder', (req, res) => {
  try {
    const { userId } = req.params;
    const { codes } = req.body;

    if (!Array.isArray(codes)) {
      return res.status(400).json({ error: 'codes must be an array' });
    }

    const update = db.prepare(`
      UPDATE watchlist_stocks
      SET sort_order = ?
      WHERE user_id = ? AND stock_code = ?
    `);
    const transaction = db.transaction((items) => {
      items.forEach((code, index) => update.run(index + 1, userId, code));
    });
    transaction(codes);

    res.json({ message: 'Stock order updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/watchlist/:userId/:stockCode', (req, res) => {
  try {
    const { userId, stockCode } = req.params;
    db.prepare('DELETE FROM watchlist_stocks WHERE user_id = ? AND stock_code = ?').run(userId, stockCode);
    res.json({ message: 'Stock removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/watchlist/:userId/:stockCode', (req, res) => {
  try {
    const { userId, stockCode } = req.params;
    const { buy_price, shares } = req.body;
    
    db.prepare(`
      UPDATE watchlist_stocks 
      SET buy_price = ?, shares = ?
      WHERE user_id = ? AND stock_code = ?
    `).run(buy_price, shares, userId, stockCode);
    
    res.json({ message: 'Stock updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const results = await stockService.searchStock(keyword);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/price/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const price = await stockService.getStockPrice(code);
    if (price) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT OR REPLACE INTO stock_prices (stock_code, price, change_percent, volume, recorded_date)
        VALUES (?, ?, ?, ?, ?)
      `).run(code, price.price, price.change_percent, price.volume, today);
    }
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { days = 30 } = req.query;
    const history = db.prepare(`
      SELECT * FROM stock_prices 
      WHERE stock_code = ? 
      ORDER BY recorded_date DESC 
      LIMIT ?
    `).all(code, parseInt(days));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
