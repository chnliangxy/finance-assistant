import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

function Dashboard({ userId, t, language }) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    fetchPortfolio();
    fetchAnalysis();
  }, [userId]);

  const fetchPortfolio = async () => {
    try {
      const res = await axios.get(`/portfolio/${userId}`);
      setPortfolio(res.data);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    try {
      const res = await axios.post(`/analysis/recommendation/${userId}`);
      setAnalysis(res.data);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    }
  };

  const COLORS = ['#FFD84A', '#7DD3FC', '#D6F8D6', '#F8A4D8'];
  const performance = portfolio?.performance;
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const formatMoney = (value = 0) => `¥${Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 2 })}`;
  const formatProfit = (item) => {
    if (!item || item.cost <= 0) return `${t('pl')} --`;
    const sign = item.profit > 0 ? '+' : '';
    return `${sign}${formatMoney(item.profit)} / ${sign}${item.profitPercent}%`;
  };
  const getProfitClass = (item) => {
    if (!item || item.profit === 0) return '';
    return item.profit > 0 ? 'up' : 'down';
  };

  const chartData = portfolio ? [
    { name: t('stocks'), value: portfolio.stock_amount || 0 },
    { name: t('funds'), value: portfolio.fund_amount || 0 },
    { name: t('gold'), value: portfolio.gold_amount || 0 },
    { name: t('silver'), value: portfolio.silver_amount || 0 }
  ].filter(item => item.value > 0) : [];

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-text">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2 className="page-title">{t('portfolioSummary')}</h2>
        <div className="page-subtitle">{t('portfolioSubtitle')}</div>
      </div>

      <div className="pixel-card total-card">
        <div className="total-content">
          <div className="total-icon">$</div>
          <div className="total-info">
            <div className="total-label">{t('totalAssets')}</div>
            <div className="total-value">
              {formatMoney(portfolio?.total_investment || 0)}
            </div>
          </div>
        </div>
        {performance?.total && (
          <div className="total-profit-row">
            <span>{t('totalPl')}</span>
            <strong className={getProfitClass(performance.total)}>
              {formatProfit(performance.total)}
            </strong>
            <span>{t('cost')} {formatMoney(performance.total.cost)}</span>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">STK</div>
          <div className="stat-value">{formatMoney(portfolio?.stock_amount || 0)}</div>
          <div className="stat-label">{t('stock')} {portfolio?.stock_ratio || 0}%</div>
          <div className={`stat-profit ${getProfitClass(performance?.byAsset?.stock)}`}>{formatProfit(performance?.byAsset?.stock)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">FND</div>
          <div className="stat-value">{formatMoney(portfolio?.fund_amount || 0)}</div>
          <div className="stat-label">{t('fund')} {portfolio?.fund_ratio || 0}%</div>
          <div className={`stat-profit ${getProfitClass(performance?.byAsset?.fund)}`}>{formatProfit(performance?.byAsset?.fund)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">GLD</div>
          <div className="stat-value">{formatMoney(portfolio?.gold_amount || 0)}</div>
          <div className="stat-label">{t('gold')} {portfolio?.gold_ratio || 0}%</div>
          <div className={`stat-profit ${getProfitClass(performance?.byAsset?.gold)}`}>{formatProfit(performance?.byAsset?.gold)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">SLV</div>
          <div className="stat-value">{formatMoney(portfolio?.silver_amount || 0)}</div>
          <div className="stat-label">{t('silver')} {portfolio?.silver_ratio || 0}%</div>
          <div className={`stat-profit ${getProfitClass(performance?.byAsset?.silver)}`}>{formatProfit(performance?.byAsset?.silver)}</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="pixel-card allocation-card">
          <h3 className="card-title">{t('allocation')}</h3>
          <div className="allocation-bars">
                <div className="allocation-item">
                  <div className="allocation-header">
                    <span>STK</span>
                    <span>{portfolio?.stock_ratio || 0}%</span>
                  </div>
                  <div className="pixel-progress">
                    <div 
                      className="pixel-progress-bar" 
                      style={{ width: `${portfolio?.stock_ratio || 0}%` }}
                    />
                  </div>
                </div>
                <div className="allocation-item">
                  <div className="allocation-header">
                    <span>FND</span>
                    <span>{portfolio?.fund_ratio || 0}%</span>
                  </div>
                  <div className="pixel-progress">
                    <div 
                      className="pixel-progress-bar" 
                      style={{ width: `${portfolio?.fund_ratio || 0}%` }}
                    />
                  </div>
                </div>
                <div className="allocation-item">
                  <div className="allocation-header">
                    <span>GLD</span>
                    <span>{portfolio?.gold_ratio || 0}%</span>
                  </div>
                  <div className="pixel-progress">
                    <div 
                      className="pixel-progress-bar" 
                      style={{ width: `${portfolio?.gold_ratio || 0}%` }}
                    />
                  </div>
                </div>
                <div className="allocation-item">
                  <div className="allocation-header">
                    <span>SLV</span>
                    <span>{portfolio?.silver_ratio || 0}%</span>
                  </div>
                  <div className="pixel-progress">
                    <div
                      className="pixel-progress-bar"
                      style={{ width: `${portfolio?.silver_ratio || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `¥${value.toLocaleString()}`}
                        contentStyle={{ 
                          background: '#000000', 
                          border: '4px solid #FFFF00',
                          color: '#FFFF00',
                          fontFamily: "'VT323', monospace"
                        }}
                      />
                      <Legend 
                        formatter={(value) => <span style={{ color: '#FFFF00', fontFamily: "'VT323', monospace" }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
        </div>

        <div className="pixel-card advice-card">
          <h3 className="card-title">{t('aiAdvice')}</h3>
          
          {analysis ? (
            <div className="analysis-content">
              <div className={`risk-badge risk-${analysis.risk_level}`}>
                {t('risk')}: {analysis.risk_level.toUpperCase()}
              </div>
              
              <p className="analysis-summary">{analysis.summary}</p>
              
              {analysis.actions && analysis.actions.length > 0 && (
                <div className="action-list">
                  <h4 className="action-title">{t('actionItems')}</h4>
                  <ul>
                    {analysis.actions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <button 
                className="pixel-btn pixel-btn-primary refresh-btn"
                onClick={fetchAnalysis}
              >
                {t('refresh')}
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">AI</div>
              <div className="empty-text">{t('generatingAdvice')}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* DOUBLE BORDER EFFECT BASE STYLES */
        .pixel-card {
          position: relative;
        }
        
        .pixel-card::before {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          right: 4px;
          bottom: 4px;
          border: 1px solid #808080;
          pointer-events: none;
        }
        
        .total-card {
          background: #000000;
          border: 4px solid #FFFF00;
          margin-bottom: 20px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 18px;
        }
        
        .total-content {
          display: flex;
          align-items: center;
          gap: 20px;
          min-width: 0;
        }
        
        .total-icon {
          font-family: 'Press Start 2P', cursive;
          font-size: 48px;
          color: #FFFF00;
          text-shadow: 0 0 10px #FFFF00;
        }
        
        .total-label {
          font-family: 'Press Start 2P', cursive;
          font-size: 10px;
          color: #BF00FF;
          margin-bottom: 5px;
        }
        
        .total-value {
          font-family: 'VT323', monospace;
          font-size: 34px;
          color: #FFFF00;
          text-shadow: 0 0 10px #FFFF00;
          line-height: 1.1;
          overflow-wrap: anywhere;
        }
        
        .total-input {
          font-size: 18px;
          max-width: 200px;
          font-family: 'VT323', monospace;
          background: #000000;
          border: 2px solid #FFFF00;
          color: #FFFF00;
        }
        
        .card-title {
          font-family: 'Press Start 2P', cursive;
          font-size: 10px;
          color: #FFFF00;
          margin: 0 0 20px 0;
          text-shadow: 0 0 5px #FFFF00;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
          margin-bottom: 24px;
        }

        .stat-card {
          min-height: 148px;
          display: grid;
          grid-template-rows: auto minmax(36px, auto) auto auto;
          align-content: start;
          justify-items: center;
          gap: 8px;
          padding: 20px 14px;
        }

        .stat-value {
          max-width: 100%;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .stat-profit {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 20px;
          align-items: stretch;
        }

        .allocation-card,
        .advice-card {
          min-width: 0;
          height: 100%;
        }

        .allocation-card {
          display: grid;
          grid-template-rows: auto auto minmax(220px, 1fr);
        }
        
        .allocation-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .allocation-bars {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .allocation-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .allocation-header {
          display: flex;
          justify-content: space-between;
          font-family: 'Press Start 2P', cursive;
          font-size: 10px;
          color: #BF00FF;
        }
        
        .risk-badge {
          display: inline-block;
          padding: 4px 12px;
          font-family: 'Press Start 2P', cursive;
          font-size: 8px;
          margin-bottom: 15px;
          border: 4px solid;
          background: #000000;
        }
        
        .risk-high { 
          border-color: #ff0040; 
          color: #ff0040; 
          box-shadow: 0 0 5px #ff0040; 
        }
        .risk-medium { 
          border-color: #BF00FF; 
          color: #BF00FF; 
          box-shadow: 0 0 5px #BF00FF; 
        }
        .risk-low { 
          border-color: #FFFF00; 
          color: #FFFF00; 
          box-shadow: 0 0 5px #FFFF00; 
        }
        
        .analysis-summary {
          font-family: 'VT323', monospace;
          font-size: 18px;
          line-height: 1.6;
          color: #E5E5E5;
          margin-bottom: 15px;
        }
        
        .action-list {
          background: #000000;
          padding: 15px;
          border: 4px solid #BF00FF;
          margin-bottom: 15px;
        }
        
        .action-title {
          font-family: 'Press Start 2P', cursive;
          font-size: 8px;
          color: #FFFF00;
          margin: 0 0 10px 0;
        }
        
        .action-list ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .action-list li {
          margin-bottom: 8px;
          font-family: 'VT323', monospace;
          font-size: 16px;
          color: #E5E5E5;
        }
        
        .refresh-btn {
          font-size: 8px;
          font-family: 'Press Start 2P', cursive;
        }

        @media (max-width: 1100px) {
          .total-card {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .total-card {
            padding: 18px;
          }

          .total-content {
            align-items: flex-start;
          }

          .total-icon {
            width: 56px;
            height: 56px;
            font-size: 30px;
          }

          .total-value {
            font-size: 28px;
          }

          .total-profit-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            min-height: 132px;
          }

          .allocation-header {
            font-size: 8px;
          }

          .chart-container {
            height: 220px;
            min-height: 220px;
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
