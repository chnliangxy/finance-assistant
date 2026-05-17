const { db } = require('../config/database');
const { getGoldPrice } = require('./goldService');
const { getSilverPrice } = require('./silverService');
const stockService = require('./stockService');
const fundService = require('./fundService');

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 2) {
  return Number(toNumber(value).toFixed(digits));
}

function calculatePosition(current, cost) {
  const safeCurrent = toNumber(current);
  const safeCost = toNumber(cost);
  const profit = safeCurrent - safeCost;
  const profitPercent = safeCost > 0 ? (profit / safeCost) * 100 : 0;

  return {
    current: round(safeCurrent),
    cost: round(safeCost),
    profit: round(profit),
    profitPercent: round(profitPercent)
  };
}

function saveStockPrice(code, price) {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT OR REPLACE INTO stock_prices (stock_code, price, change_percent, volume, recorded_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, price.price, price.change_percent, price.volume, today);
}

function saveFundNav(code, nav) {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT OR REPLACE INTO fund_prices (fund_code, nav, accumulated_nav, change_percent, recorded_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, nav.nav, nav.accumulated_nav, nav.change_percent, today);
}

async function getStockPositions(userId) {
  const rows = db.prepare(`
    SELECT ws.*, sp.price as current_price, sp.change_percent, sp.volume
    FROM watchlist_stocks ws
    LEFT JOIN (
      SELECT stock_code, price, change_percent, volume
      FROM stock_prices
      WHERE id IN (SELECT MAX(id) FROM stock_prices GROUP BY stock_code)
    ) sp ON ws.stock_code = sp.stock_code
    WHERE ws.user_id = ?
    ORDER BY COALESCE(NULLIF(ws.sort_order, 0), ws.id) ASC, ws.added_at DESC
  `).all(userId);

  return Promise.all(rows.map(async (item) => {
    let latest = null;

    if (item.stock_code) {
      latest = await stockService.getStockPrice(item.stock_code);
      if (latest) {
        saveStockPrice(item.stock_code, latest);
      }
    }

    const currentPrice = toNumber(latest?.price ?? item.current_price);
    const shares = toNumber(item.shares);
    const buyPrice = toNumber(item.buy_price);
    const position = calculatePosition(currentPrice * shares, buyPrice * shares);

    return {
      ...item,
      current_price: currentPrice,
      change_percent: latest?.change_percent ?? item.change_percent ?? 0,
      volume: latest?.volume ?? item.volume ?? 0,
      current_value: position.current,
      cost_amount: position.cost,
      profit_amount: position.profit,
      profit_percent: position.profitPercent
    };
  }));
}

async function getFundPositions(userId) {
  const rows = db.prepare(`
    SELECT wf.*, fp.nav as current_nav, fp.accumulated_nav, fp.change_percent
    FROM watchlist_funds wf
    LEFT JOIN (
      SELECT fund_code, nav, accumulated_nav, change_percent
      FROM fund_prices
      WHERE id IN (SELECT MAX(id) FROM fund_prices GROUP BY fund_code)
    ) fp ON wf.fund_code = fp.fund_code
    WHERE wf.user_id = ?
    ORDER BY COALESCE(NULLIF(wf.sort_order, 0), wf.id) ASC, wf.added_at DESC
  `).all(userId);

  return Promise.all(rows.map(async (item) => {
    let latest = null;

    if (item.fund_code) {
      latest = await fundService.getFundNav(item.fund_code);
      if (latest) {
        saveFundNav(item.fund_code, latest);
      }
    }

    const currentNav = toNumber(latest?.nav ?? item.current_nav);
    const shares = toNumber(item.shares);
    const buyPrice = toNumber(item.buy_price);
    const position = calculatePosition(currentNav * shares, buyPrice * shares);

    return {
      ...item,
      current_nav: currentNav,
      accumulated_nav: latest?.accumulated_nav ?? item.accumulated_nav ?? 0,
      change_percent: latest?.change_percent ?? item.change_percent ?? 0,
      current_value: position.current,
      cost_amount: position.cost,
      profit_amount: position.profit,
      profit_percent: position.profitPercent
    };
  }));
}

async function buildPerformance(userId, portfolio) {
  const [stocks, funds, goldPrice, silverPrice] = await Promise.all([
    getStockPositions(userId),
    getFundPositions(userId),
    getGoldPrice(),
    getSilverPrice()
  ]);

  const stockCost = stocks.reduce((sum, item) => sum + toNumber(item.cost_amount), 0);
  const stockCurrent = stocks.reduce((sum, item) => sum + toNumber(item.current_value), 0);
  const fundCost = funds.reduce((sum, item) => sum + toNumber(item.cost_amount), 0);
  const fundCurrent = funds.reduce((sum, item) => sum + toNumber(item.current_value), 0);

  const goldCost = toNumber(portfolio.gold_cost_price) * toNumber(portfolio.gold_grams);
  const goldCurrent = toNumber(goldPrice?.price) * toNumber(portfolio.gold_grams);
  const silverCost = toNumber(portfolio.silver_cost_price) * toNumber(portfolio.silver_grams);
  const silverCurrent = toNumber(silverPrice?.price) * toNumber(portfolio.silver_grams);

  const byAsset = {
    stock: calculatePosition(stockCurrent, stockCost),
    fund: calculatePosition(fundCurrent, fundCost),
    gold: calculatePosition(goldCurrent, goldCost),
    silver: calculatePosition(silverCurrent, silverCost)
  };

  const totalCurrent = Object.values(byAsset).reduce((sum, item) => sum + item.current, 0);
  const totalCost = Object.values(byAsset).reduce((sum, item) => sum + item.cost, 0);

  return {
    total: calculatePosition(totalCurrent, totalCost),
    byAsset,
    positions: {
      stocks,
      funds
    },
    prices: {
      gold: goldPrice?.price || 0,
      silver: silverPrice?.price || 0
    }
  };
}

async function buildPortfolioSnapshot(userId) {
  let portfolio = db.prepare('SELECT * FROM portfolio WHERE user_id = ?').get(userId);

  if (!portfolio) {
    const result = db.prepare('INSERT INTO portfolio (user_id) VALUES (?)').run(userId);
    portfolio = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(result.lastInsertRowid);
  }

  const performance = await buildPerformance(userId, portfolio);
  const stockAmount = performance.byAsset.stock.current;
  const fundAmount = performance.byAsset.fund.current;
  const goldAmount = performance.byAsset.gold.current;
  const silverAmount = performance.byAsset.silver.current;
  const total = performance.total.current;

  return {
    ...portfolio,
    total_investment: total,
    stock_amount: stockAmount,
    fund_amount: fundAmount,
    wealth_amount: 0,
    gold_amount: goldAmount,
    silver_amount: silverAmount,
    stock_ratio: total > 0 ? round((stockAmount / total) * 100) : 0,
    fund_ratio: total > 0 ? round((fundAmount / total) * 100) : 0,
    wealth_ratio: 0,
    gold_ratio: total > 0 ? round((goldAmount / total) * 100) : 0,
    silver_ratio: total > 0 ? round((silverAmount / total) * 100) : 0,
    actual_total: total,
    performance
  };
}

module.exports = {
  buildPortfolioSnapshot,
  buildPerformance,
  calculatePosition,
  getStockPositions,
  getFundPositions,
  saveStockPrice,
  saveFundNav
};
