const schedule = require('node-schedule');
const { db } = require('../config/database');
const stockService = require('./stockService');
const fundService = require('./fundService');
const goldService = require('./goldService');
const silverService = require('./silverService');

const stockUpdateJob = schedule.scheduleJob('30 15 * * 1-5', async () => {
  console.log('Updating stock prices...');
  
  try {
    const stocks = db.prepare('SELECT DISTINCT stock_code FROM watchlist_stocks').all();
    
    for (const stock of stocks) {
      const price = await stockService.getStockPrice(stock.stock_code);
      if (price) {
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT OR REPLACE INTO stock_prices (stock_code, price, change_percent, volume, recorded_date)
          VALUES (?, ?, ?, ?, ?)
        `).run(stock.stock_code, price.price, price.change_percent, price.volume, today);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Stock prices updated');
  } catch (error) {
    console.error('Failed to update stock prices:', error.message);
  }
});

const fundUpdateJob = schedule.scheduleJob('0 20 * * 1-5', async () => {
  console.log('Updating fund NAV...');
  
  try {
    const funds = db.prepare('SELECT DISTINCT fund_code FROM watchlist_funds').all();
    
    for (const fund of funds) {
      const nav = await fundService.getFundNav(fund.fund_code);
      if (nav) {
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT OR REPLACE INTO fund_prices (fund_code, nav, accumulated_nav, change_percent, recorded_date)
          VALUES (?, ?, ?, ?, ?)
        `).run(fund.fund_code, nav.nav, nav.accumulated_nav, nav.change_percent, today);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Fund NAV updated');
  } catch (error) {
    console.error('Failed to update fund NAV:', error.message);
  }
});

const goldUpdateJob = schedule.scheduleJob('*/10 * * * *', async () => {
  console.log('Updating gold price...');
  
  try {
    const price = await goldService.getGoldPrice();
    if (price) {
      db.prepare('INSERT INTO gold_prices (price, change_percent) VALUES (?, ?)').run(price.price, price.changePercent);
      console.log('Gold price updated:', price.price, 'CNY/g');
    }
  } catch (error) {
    console.error('Failed to update gold price:', error.message);
  }
});

const silverUpdateJob = schedule.scheduleJob('*/10 * * * *', async () => {
  console.log('Updating silver price...');
  
  try {
    const price = await silverService.getSilverPrice();
    if (price) {
      db.prepare('INSERT INTO silver_prices (price, change_percent) VALUES (?, ?)').run(price.price, price.changePercent);
      console.log('Silver price updated:', price.price, 'CNY/g');
    }
  } catch (error) {
    console.error('Failed to update silver price:', error.message);
  }
});

console.log('Scheduled jobs started:');
console.log('- Stock prices: weekdays 15:30');
console.log('- Fund NAV: weekdays 20:00');
console.log('- Gold price: every 10 minutes');
console.log('- Silver price: every 10 minutes');

module.exports = {
  stockUpdateJob,
  fundUpdateJob,
  goldUpdateJob,
  silverUpdateJob
};
