const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/current', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users ORDER BY id ASC LIMIT 1').get();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'User name is required' });
    }
    
    const result = db.prepare('INSERT INTO users (name) VALUES (?)').run(name);
    db.prepare('INSERT INTO portfolio (user_id) VALUES (?)').run(result.lastInsertRowid);
    
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'User name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

router.put('/switch/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last user' });
    }
    
    db.prepare('DELETE FROM portfolio WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM watchlist_stocks WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM watchlist_funds WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM ai_analysis WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
