const express = require('express');
const router = express.Router();
const { getGoldPrice, getGoldHistory } = require('../services/goldService');

router.get('/price', async (req, res) => {
  try {
    const goldData = await getGoldPrice();
    res.json(goldData);
  } catch (error) {
    console.error('Failed to fetch gold price:', error);
    res.status(500).json({ error: 'Failed to fetch gold price' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const periodHours = {
      day: 24,
      week: 24 * 7,
      month: 24 * 30,
      year: 24 * 365
    };
    const period = req.query.period || 'day';
    const hours = periodHours[period] || parseInt(req.query.hours) || 24;
    const history = await getGoldHistory(hours);
    res.json({ period, history });
  } catch (error) {
    console.error('Failed to fetch gold history:', error);
    res.status(500).json({ error: 'Failed to fetch history data' });
  }
});

module.exports = router;
