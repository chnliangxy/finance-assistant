const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const fundService = require('../services/fundService');
const { getFundPositions, saveFundNav } = require('../services/portfolioService');

router.get('/watchlist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    res.json(await getFundPositions(userId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/watchlist', async (req, res) => {
  try {
    const { userId, fund_code, fund_name, buy_price, shares } = req.body;
    
    if (!userId || !fund_code) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const nextOrder = db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
      FROM watchlist_funds
      WHERE user_id = ?
    `).get(userId).next_order;

    db.prepare(`
      INSERT INTO watchlist_funds (user_id, fund_code, fund_name, buy_price, shares, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, fund_code) DO UPDATE SET
        fund_name = excluded.fund_name,
        buy_price = excluded.buy_price,
        shares = excluded.shares
    `).run(userId, fund_code, fund_name || '', buy_price || 0, shares || 0, nextOrder);

    const nav = await fundService.getFundNav(fund_code);
    if (nav) {
      saveFundNav(fund_code, nav);
    }
    
    res.status(201).json({ message: 'Fund added', fund_code });
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
      UPDATE watchlist_funds
      SET sort_order = ?
      WHERE user_id = ? AND fund_code = ?
    `);
    const transaction = db.transaction((items) => {
      items.forEach((code, index) => update.run(index + 1, userId, code));
    });
    transaction(codes);

    res.json({ message: 'Fund order updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/watchlist/:userId/:fundCode', (req, res) => {
  try {
    const { userId, fundCode } = req.params;
    db.prepare('DELETE FROM watchlist_funds WHERE user_id = ? AND fund_code = ?').run(userId, fundCode);
    res.json({ message: 'Fund removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/watchlist/:userId/:fundCode', (req, res) => {
  try {
    const { userId, fundCode } = req.params;
    const { buy_price, shares } = req.body;
    
    db.prepare(`
      UPDATE watchlist_funds 
      SET buy_price = ?, shares = ?
      WHERE user_id = ? AND fund_code = ?
    `).run(buy_price, shares, userId, fundCode);
    
    res.json({ message: 'Fund updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const results = await fundService.searchFund(keyword);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/nav/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const nav = await fundService.getFundNav(code);
    if (nav) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT OR REPLACE INTO fund_prices (fund_code, nav, accumulated_nav, change_percent, recorded_date)
        VALUES (?, ?, ?, ?, ?)
      `).run(code, nav.nav, nav.accumulated_nav, nav.change_percent, today);
    }
    res.json(nav);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { days = 30 } = req.query;
    const history = db.prepare(`
      SELECT * FROM fund_prices 
      WHERE fund_code = ? 
      ORDER BY recorded_date DESC 
      LIMIT ?
    `).all(code, parseInt(days));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
