const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const userRoutes = require('./routes/users');
const portfolioRoutes = require('./routes/portfolio');
const stockRoutes = require('./routes/stocks');
const fundRoutes = require('./routes/funds');
const goldRoutes = require('./routes/gold');
const silverRoutes = require('./routes/silver');
const analysisRoutes = require('./routes/analysis');
const newsRoutes = require('./routes/news');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initDatabase();

app.use('/api/users', userRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/gold', goldRoutes);
app.use('/api/silver', silverRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/news', newsRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    pricing: 'free-public-sources',
    sources: ['sina-free', 'eastmoney-free', 'offline-sample-fallback'],
    timestamp: new Date().toISOString()
  });
});

require('./services/scheduler');

app.listen(PORT, () => {
  console.log(`Finance Assistant backend is running at http://localhost:${PORT}`);
});
