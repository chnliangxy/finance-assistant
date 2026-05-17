const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { buildPortfolioSnapshot } = require('../services/portfolioService');

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    res.json(await buildPortfolioSnapshot(userId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:userId/metal/:metal', (req, res) => {
  try {
    const { userId, metal } = req.params;
    const { cost_price, grams } = req.body;

    if (!['gold', 'silver'].includes(metal)) {
      return res.status(400).json({ error: 'Unsupported metal' });
    }

    const fields = metal === 'gold'
      ? ['gold_cost_price', 'gold_grams']
      : ['silver_cost_price', 'silver_grams'];

    db.prepare(`
      UPDATE portfolio
      SET ${fields[0]} = ?, ${fields[1]} = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(cost_price || 0, grams || 0, userId);

    res.json({ message: 'Metal holding updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const {
      total_investment,
      stock_amount,
      fund_amount,
      wealth_amount,
      gold_amount,
      silver_amount,
      stock_cost_amount,
      fund_cost_amount,
      wealth_cost_amount,
      gold_cost_price,
      gold_grams,
      silver_cost_price,
      silver_grams
    } = req.body;
    
    db.prepare(`
      UPDATE portfolio 
      SET total_investment = ?,
          stock_amount = ?,
          fund_amount = ?,
          wealth_amount = ?,
          gold_amount = ?,
          silver_amount = ?,
          stock_cost_amount = ?,
          fund_cost_amount = ?,
          wealth_cost_amount = ?,
          gold_cost_price = ?,
          gold_grams = ?,
          silver_cost_price = ?,
          silver_grams = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(
      total_investment || 0,
      stock_amount || 0,
      fund_amount || 0,
      wealth_amount || 0,
      gold_amount || 0,
      silver_amount || 0,
      stock_cost_amount || 0,
      fund_cost_amount || 0,
      wealth_cost_amount || 0,
      gold_cost_price || 0,
      gold_grams || 0,
      silver_cost_price || 0,
      silver_grams || 0,
      userId
    );
    
    res.json({ message: 'Portfolio updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
