const express = require('express');
const router = express.Router();
const { getSilverPrice, getSilverHistory } = require('../services/silverService');

router.get('/price', async (req, res) => {
  try {
    const silverData = await getSilverPrice();
    res.json(silverData);
  } catch (error) {
    console.error('Failed to fetch silver price:', error);
    res.status(500).json({ error: 'Failed to fetch silver price' });
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
    const history = await getSilverHistory(hours);
    res.json({ period, history });
  } catch (error) {
    console.error('Failed to fetch silver history:', error);
    res.status(500).json({ error: 'Failed to fetch history data' });
  }
});

module.exports = router;
