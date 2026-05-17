const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataRoot = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '../../data');
const dbPath = path.join(dataRoot, 'finance.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_investment REAL DEFAULT 0,
      stock_amount REAL DEFAULT 0,
      fund_amount REAL DEFAULT 0,
      wealth_amount REAL DEFAULT 0,
      gold_amount REAL DEFAULT 0,
      silver_amount REAL DEFAULT 0,
      stock_cost_amount REAL DEFAULT 0,
      fund_cost_amount REAL DEFAULT 0,
      wealth_cost_amount REAL DEFAULT 0,
      gold_cost_price REAL DEFAULT 0,
      gold_grams REAL DEFAULT 0,
      silver_cost_price REAL DEFAULT 0,
      silver_grams REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  [
    'ALTER TABLE portfolio ADD COLUMN silver_amount REAL DEFAULT 0',
    'ALTER TABLE portfolio ADD COLUMN stock_cost_amount REAL DEFAULT 0',
    'ALTER TABLE portfolio ADD COLUMN fund_cost_amount REAL DEFAULT 0',
    'ALTER TABLE portfolio ADD COLUMN wealth_cost_amount REAL DEFAULT 0',
    'ALTER TABLE portfolio ADD COLUMN gold_cost_price REAL DEFAULT 0',
    'ALTER TABLE portfolio ADD COLUMN gold_grams REAL DEFAULT 0',
    'ALTER TABLE portfolio ADD COLUMN silver_cost_price REAL DEFAULT 0',
    'ALTER TABLE portfolio ADD COLUMN silver_grams REAL DEFAULT 0'
  ].forEach((sql) => {
    try {
      db.prepare(sql).run();
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }
  });

  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stock_code TEXT NOT NULL,
      stock_name TEXT,
      buy_price REAL,
      shares INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, stock_code)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist_funds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fund_code TEXT NOT NULL,
      fund_name TEXT,
      buy_price REAL,
      shares REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, fund_code)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_code TEXT NOT NULL,
      price REAL NOT NULL,
      change_percent REAL,
      volume INTEGER,
      recorded_date DATE,
      recorded_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(stock_code, recorded_date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS fund_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fund_code TEXT NOT NULL,
      nav REAL NOT NULL,
      accumulated_nav REAL,
      change_percent REAL,
      recorded_date DATE,
      recorded_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(fund_code, recorded_date)
    )
  `);

  try {
    db.prepare('ALTER TABLE fund_prices ADD COLUMN change_percent REAL').run();
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
  }

  [
    'ALTER TABLE watchlist_stocks ADD COLUMN sort_order INTEGER DEFAULT 0',
    'ALTER TABLE watchlist_funds ADD COLUMN sort_order INTEGER DEFAULT 0'
  ].forEach((sql) => {
    try {
      db.prepare(sql).run();
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }
  });

  db.prepare('UPDATE watchlist_stocks SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0').run();
  db.prepare('UPDATE watchlist_funds SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0').run();

  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      price REAL NOT NULL,
      change_percent REAL,
      recorded_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      price REAL NOT NULL,
      change_percent REAL,
      recorded_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stock_code TEXT,
      analysis_type TEXT,
      content TEXT,
      recommendation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      url TEXT,
      source TEXT,
      published_at DATETIME,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const chineseDefaultUser = db.prepare('SELECT * FROM users WHERE name = ?').get('\u9ed8\u8ba4\u7528\u6237');
  const englishDefaultUser = db.prepare('SELECT * FROM users WHERE name = ?').get('default');

  if (chineseDefaultUser && !englishDefaultUser) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run('default', chineseDefaultUser.id);
  }

  const defaultUser = db.prepare('SELECT * FROM users WHERE name = ?').get('default');
  if (!defaultUser) {
    const result = db.prepare('INSERT INTO users (name) VALUES (?)').run('default');
    db.prepare('INSERT INTO portfolio (user_id) VALUES (?)').run(result.lastInsertRowid);
  }

  console.log(`Database initialized at ${dbPath}`);
}

module.exports = { db, initDatabase };
