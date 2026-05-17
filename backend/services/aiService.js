const { db } = require('../config/database');

async function analyze({ stockInfo, stockHistory, news, analysisType }) {
  if (stockInfo && stockInfo.current_price) {
    return analyzeStock(stockInfo, stockHistory, news);
  }

  return analyzeMarket(news);
}

function analyzeStock(stockInfo, history, news) {
  const analysis = {
    content: '',
    recommendation: 'hold'
  };
  
  const prices = history.map(h => h.price).filter(p => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const currentPrice = stockInfo.current_price || 0;
  const changePercent = stockInfo.change_percent || 0;

  let content = `[${stockInfo.stock_name || stockInfo.stock_code} Analysis]\n\n`;
  content += `Price\n`;
  content += `Current price: ¥${currentPrice.toFixed(2)}\n`;
  content += `Daily change: ${changePercent > 0 ? '+' : ''}${changePercent}%\n`;
  
  if (avgPrice > 0) {
    const pricePosition = ((currentPrice - avgPrice) / avgPrice * 100).toFixed(2);
    content += `${history.length}-day average: ¥${avgPrice.toFixed(2)}\n`;
    content += `Versus average: ${pricePosition > 0 ? '+' : ''}${pricePosition}%\n`;
  }

  if (stockInfo.buy_price > 0) {
    const profitPercent = ((currentPrice - stockInfo.buy_price) / stockInfo.buy_price * 100).toFixed(2);
    content += `\nHolding\n`;
    content += `Cost price: ¥${stockInfo.buy_price.toFixed(2)}\n`;
    content += `P/L ratio: ${profitPercent > 0 ? '+' : ''}${profitPercent}%\n`;
  }

  content += `\nTechnical view\n`;
  if (changePercent > 3) {
    content += `The daily gain is large; avoid chasing strength blindly.\n`;
  } else if (changePercent < -3) {
    content += `The daily drawdown is large; review whether it is a pullback opportunity.\n`;
  } else {
    content += `Daily movement is normal; continue monitoring.\n`;
  }
  
  if (currentPrice > avgPrice * 1.1) {
    content += `Price is more than 10% above the recent average and may be extended.\n`;
  } else if (currentPrice < avgPrice * 0.9) {
    content += `Price is more than 10% below the recent average and may be oversold.\n`;
  }

  if (news && news.length > 0) {
    content += `\nRelated news\n`;
    news.slice(0, 3).forEach(n => {
      content += `- ${n.title}\n`;
    });
  }

  content += `\nSuggested action\n`;
  
  if (stockInfo.buy_price > 0) {
    const profitPercent = (currentPrice - stockInfo.buy_price) / stockInfo.buy_price * 100;
    
    if (profitPercent > 20) {
      analysis.recommendation = 'sell';
      content += `Profit is above 20%; consider partial profit-taking.\n`;
    } else if (profitPercent < -10) {
      analysis.recommendation = 'buy';
      content += `Loss is above 10%; review whether averaging down still fits the plan.\n`;
    } else {
      analysis.recommendation = 'hold';
      content += `Hold and wait for a clearer setup.\n`;
    }
  } else {
    if (changePercent < -3 && currentPrice < avgPrice * 0.95) {
      analysis.recommendation = 'buy';
      content += `Price is in a pullback zone; consider a starter position.\n`;
    } else if (changePercent > 5) {
      analysis.recommendation = 'wait';
      content += `The daily gain is large; wait for a better entry.\n`;
    } else {
      analysis.recommendation = 'hold';
      content += `Stay patient until signals are clearer.\n`;
    }
  }
  
  analysis.content = content;
  return analysis;
}

function analyzeMarket(news) {
  const analysis = {
    content: '',
    recommendation: 'hold'
  };
  
  let content = `[Market Analysis]\n\n`;
  content += `Date: ${new Date().toLocaleDateString('en-US')}\n\n`;

  if (news && news.length > 0) {
    content += `Top news\n`;
    news.slice(0, 5).forEach(n => {
      content += `- ${n.title}\n`;
    });
    content += `\n`;
  }
  
  const positiveKeywords = ['rise', 'positive', 'breakout', 'record high', 'rebound'];
  const negativeKeywords = ['fall', 'negative', 'breakdown', 'new low', 'correction'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  news.forEach(n => {
    const title = n.title || '';
    positiveCount += positiveKeywords.filter(k => title.includes(k)).length;
    negativeCount += negativeKeywords.filter(k => title.includes(k)).length;
  });
  
  content += `Market sentiment\n`;
  if (positiveCount > negativeCount * 1.5) {
    content += `Market sentiment is optimistic with more positive headlines.\n`;
    analysis.recommendation = 'buy';
  } else if (negativeCount > positiveCount * 1.5) {
    content += `Market sentiment is cautious; keep risk controls tight.\n`;
    analysis.recommendation = 'sell';
  } else {
    content += `Market sentiment is neutral; stay selective.\n`;
    analysis.recommendation = 'hold';
  }

  content += `\nAction notes\n`;
  content += `Align allocation with risk tolerance and investment goals.\n`;
  content += `Keep stock exposure within a planned range.\n`;
  
  analysis.content = content;
  return analysis;
}

async function generateRecommendation({ portfolio, stocks, news }) {
  const recommendation = {
    summary: '',
    actions: [],
    risk_level: 'medium'
  };
  
  const total = (portfolio?.stock_amount || 0) + 
                (portfolio?.fund_amount || 0) + 
                (portfolio?.gold_amount || 0) +
                (portfolio?.silver_amount || 0);
  
  if (total === 0) {
    recommendation.summary = 'No assets are configured yet. Add assets from their dedicated pages.';
    recommendation.actions.push('Add stock, fund, gold, or silver holdings to unlock allocation and P/L advice.');
    recommendation.risk_level = 'none';
    return recommendation;
  }
  
  const stockRatio = (portfolio?.stock_amount || 0) / total * 100;
  const fundRatio = (portfolio?.fund_amount || 0) / total * 100;
  
  if (stockRatio > 70) {
    recommendation.risk_level = 'high';
    recommendation.summary = 'Stock exposure is high, so portfolio risk is elevated.';
    recommendation.actions.push('Consider reducing stock exposure and adding steadier assets.');
  } else if (stockRatio < 30 && fundRatio < 20) {
    recommendation.risk_level = 'low';
    recommendation.summary = 'The allocation is conservative.';
    recommendation.actions.push('Consider adding stocks or funds if that matches your risk plan.');
  } else {
    recommendation.risk_level = 'medium';
    recommendation.summary = 'The allocation is reasonably balanced.';
    recommendation.actions.push('Keep reviewing cost basis and position size as prices move.');
  }

  if ((portfolio?.gold_amount || 0) + (portfolio?.silver_amount || 0) > total * 0.5) {
    recommendation.actions.push('Metal exposure is more than half of assets; check whether that matches your liquidity needs.');
  }

  if (stocks && stocks.length > 0) {
    stocks.forEach(stock => {
      if (stock.cost_amount > 0 && stock.current_value > 0) {
        const profit = stock.profit_percent;
        
        if (profit > 30) {
          recommendation.actions.push(`${stock.stock_name || stock.stock_code} is up more than 30%; review profit-taking.`);
        } else if (profit < -15) {
          recommendation.actions.push(`${stock.stock_name || stock.stock_code} is down more than 15%; review stop-loss or averaging rules.`);
        }
      }
    });
  }
  
  return recommendation;
}

module.exports = {
  analyze,
  generateRecommendation
};
