import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/pixel.css';

function Silver({ userId, t, language }) {
  const [silverData, setSilverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [investmentAmount, setInvestmentAmount] = useState(10000);
  const [holding, setHolding] = useState({ cost_price: '', grams: '' });
  const [savingHolding, setSavingHolding] = useState(false);
  const [period, setPeriod] = useState('day');
  const periods = [
    { key: 'day', label: t('day') },
    { key: 'week', label: t('week') },
    { key: 'month', label: t('month') },
    { key: 'year', label: t('year') }
  ];

  const fetchSilverData = async () => {
    try {
      const response = await axios.get('/silver/price');
      setSilverData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch silver price:', error);
      setLoading(false);
    }
  };

  const fetchHistory = async (nextPeriod = period) => {
    try {
      const response = await axios.get(`/silver/history?period=${nextPeriod}`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to fetch history data:', error);
    }
  };

  const fetchHolding = async () => {
    try {
      const response = await axios.get(`/portfolio/${userId}`);
      setHolding({
        cost_price: response.data.silver_cost_price > 0 ? String(response.data.silver_cost_price) : '',
        grams: response.data.silver_grams > 0 ? String(response.data.silver_grams) : ''
      });
    } catch (error) {
      console.error('Failed to fetch silver holding:', error);
    }
  };

  const saveHolding = async () => {
    setSavingHolding(true);
    try {
      await axios.put(`/portfolio/${userId}/metal/silver`, {
        cost_price: parseFloat(holding.cost_price) || 0,
        grams: parseFloat(holding.grams) || 0
      });
    } catch (error) {
      console.error('Failed to save silver holding:', error);
    } finally {
      setSavingHolding(false);
    }
  };

  useEffect(() => {
    fetchSilverData();
    fetchHistory(period);
    fetchHolding();
    const interval = setInterval(fetchSilverData, 600000); // Updates every 10 minutes
    return () => clearInterval(interval);
  }, [period, userId]);

  const switchPeriod = (nextPeriod) => {
    setPeriod(nextPeriod);
    fetchHistory(nextPeriod);
  };

  const formatPrice = (value, digits = 2) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(digits) : '--';
  };
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const periodLabel = period === 'day' ? '24H' : periods.find(item => item.key === period)?.label || period.toUpperCase();
  const historyPrices = history.map(item => Number(item.price)).filter(Number.isFinite);
  const trendHigh = historyPrices.length > 0 ? Math.max(...historyPrices) : Number(silverData?.high24h);
  const trendLow = historyPrices.length > 0 ? Math.min(...historyPrices) : Number(silverData?.low24h);
  const gramsHeld = parseFloat(holding.grams) || 0;
  const costPrice = parseFloat(holding.cost_price) || 0;
  const holdingCost = costPrice * gramsHeld;
  const holdingValue = (silverData?.price || 0) * gramsHeld;
  const holdingProfit = holdingValue - holdingCost;
  const holdingProfitPercent = holdingCost > 0 ? holdingProfit / holdingCost * 100 : 0;

  const getChangeColor = (change) => {
    if (change > 0) return '#ff6b9d'; // Pink for up
    if (change < 0) return '#60a5fa'; // Blue for down
    return '#94a3b8';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '−';
  };

  // Generate sparkline data
  const generateSparkline = (data) => {
    if (!data || data.length < 2) return '';
    const prices = data.map(d => Number(d.price)).filter(Number.isFinite);
    if (prices.length < 2) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    return prices.map((price, i) => {
      const x = (i / (prices.length - 1)) * 100;
      const y = 100 - ((price - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="pixel-spinner"></div>
          <p className="loading-text">{t('loadingSilver')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <span className="title-icon">[AG]</span>
          {t('silverPrice')}
        </h1>
        <p className="page-subtitle">{t('silverSubtitle')}</p>
      </div>

      {/* Main price card */}
      <div className="pixel-card main-price-card">
        <div className="card-header">
          <span className="card-icon">[AG]</span>
          <span className="card-title">{t('spotSilverPrice')}</span>
          <span className="update-badge">{silverData?.isMock ? t('fallback') : t('freeLive')}</span>
        </div>
        
        <div className="price-display">
          <div className="price-main">
            <span className="currency">¥</span>
            <span className="amount">
              {formatPrice(silverData?.price)}
            </span>
            <span className="unit">/g</span>
          </div>
          
          <div 
            className="price-change"
            style={{ color: getChangeColor(silverData?.change) }}
          >
            <span className="change-icon">{getChangeIcon(silverData?.change)}</span>
            <span className="change-value">
              {silverData?.change != null ? Math.abs(Number(silverData.change)).toFixed(2) : '--'}
            </span>
            <span className="change-percent">
              ({silverData?.changePercent != null ? Math.abs(Number(silverData.changePercent)).toFixed(2) : '--'}%)
            </span>
          </div>
        </div>

        <div className="price-details">
          <div className="detail-item">
            <span className="detail-label">{t('todayHigh')}</span>
            <span className="detail-value high">¥{formatPrice(silverData?.high)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('todayLow')}</span>
            <span className="detail-value low">¥{formatPrice(silverData?.low)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('open')}</span>
            <span className="detail-value">¥{formatPrice(silverData?.open)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">{t('previousClose')}</span>
            <span className="detail-value">¥{formatPrice(silverData?.previousClose)}</span>
          </div>
        </div>

        <div className="update-time">
          <span className="time-icon">[TIME]</span>
          {t('updateTime')}: {silverData?.lastUpdate ? new Date(silverData.lastUpdate).toLocaleString(locale) : '--'}
        </div>
      </div>

      {/* Price trend chart */}
      <div className="pixel-card chart-card">
        <div className="card-header">
          <span className="card-icon">[TREND]</span>
          <span className="card-title">{periodLabel} {t('trend')}</span>
          <div className="period-tabs">
            {periods.map(item => (
              <button
                key={item.key}
                className={`period-tab ${period === item.key ? 'active' : ''}`}
                onClick={() => switchPeriod(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="chart-container">
          {history.length > 0 ? (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="sparkline">
              <defs>
                <linearGradient id="silverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`0,100 ${generateSparkline(history)} 100,100`}
                fill="url(#silverGradient)"
              />
              <polyline
                points={generateSparkline(history)}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div className="chart-placeholder">
              <span className="placeholder-icon">[CHART]</span>
              <p>{t('loadingChart')}</p>
            </div>
          )}
        </div>

        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">{periodLabel} {t('high')}</span>
            <span className="stat-value">¥{formatPrice(trendHigh)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{periodLabel} {t('low')}</span>
            <span className="stat-value">¥{formatPrice(trendLow)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('dataPoints')}</span>
            <span className="stat-value">{history.length || '--'}</span>
          </div>
        </div>
      </div>

      {/* Investment calculator */}
      <div className="pixel-card calculator-card">
        <div className="card-header">
          <span className="card-icon">[HOLD]</span>
          <span className="card-title">{t('silverHolding')}</span>
        </div>

        <div className="calculator">
          <div className="calc-row">
            <label>{t('costPriceG')}</label>
            <input
              type="number"
              className="pixel-input"
              value={holding.cost_price}
              placeholder={t('costPrice')}
              onChange={e => setHolding({ ...holding, cost_price: e.target.value })}
            />
          </div>
          <div className="calc-row">
            <label>{t('gramsHeld')}</label>
            <input
              type="number"
              className="pixel-input"
              value={holding.grams}
              placeholder={t('gramsHeld')}
              onChange={e => setHolding({ ...holding, grams: e.target.value })}
            />
          </div>
          <div className="holding-summary">
            <span>{t('value')} ¥{holdingValue.toFixed(2)}</span>
            <span>{t('cost')} ¥{holdingCost.toFixed(2)}</span>
            <strong className={holdingProfit > 0 ? 'up' : holdingProfit < 0 ? 'down' : ''}>
              P/L {holdingProfit > 0 ? '+' : ''}¥{holdingProfit.toFixed(2)} / {holdingProfit > 0 ? '+' : ''}{holdingProfitPercent.toFixed(2)}%
            </strong>
          </div>
          <button className="pixel-btn pixel-btn-success" onClick={saveHolding} disabled={savingHolding}>
            {savingHolding ? t('saving') : t('saveHolding')}
          </button>
        </div>
      </div>

      <div className="pixel-card calculator-card">
        <div className="card-header">
          <span className="card-icon">[CALC]</span>
          <span className="card-title">{t('investmentCalculator')}</span>
        </div>
        
        <div className="calculator">
          <div className="calc-row">
            <label>{t('investmentAmount')}</label>
            <input 
              type="number" 
              className="pixel-input"
              placeholder={t('amountPlaceholder')}
              value={investmentAmount}
              onChange={e => setInvestmentAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="calc-row">
            <label>{t('canBuy')}</label>
            <div className="calc-result">
              <span className="result-value">
                {(investmentAmount / (silverData?.price || 1)).toFixed(2)}
              </span>
              <span className="result-unit">g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Market info */}
      <div className="pixel-card info-card">
        <div className="card-header">
          <span className="card-icon">[INFO]</span>
          <span className="card-title">{t('marketInfo')}</span>
        </div>
        <div className="info-list">
          <div className="info-item">
            <span className="info-dot" style={{ background: '#c084fc' }}></span>
            <span className="info-text">{t('silverUpdates')}</span>
          </div>
          <div className="info-item">
            <span className="info-dot" style={{ background: '#60a5fa' }}></span>
            <span className="info-text">{t('priceUnit')}</span>
          </div>
          <div className="info-item">
            <span className="info-dot" style={{ background: '#ff6b9d' }}></span>
            <span className="info-text">{t('dataSource')}: {silverData?.dataSource || t('freePublicSource')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Silver;
