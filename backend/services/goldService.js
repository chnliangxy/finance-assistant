const { getGbkText, toNumber } = require('./freeApiClient');

let exchangeRateCache = {
  rate: 7.2,
  lastUpdate: null
};

async function getExchangeRate() {
  try {
    if (exchangeRateCache.lastUpdate && 
        (Date.now() - exchangeRateCache.lastUpdate) < 3600000) {
      return exchangeRateCache.rate;
    }

    const data = await getGbkText('https://hq.sinajs.cn/rn=1/list=fx_susdcny', {
      headers: {
        'Referer': 'https://finance.sina.com.cn'
      }
    });

    const match = data.match(/="([^"]+)"/);

    if (match && match[1]) {
      const parts = match[1].split(',');
      if (parts.length >= 8) {
        const rate = toNumber(parts[8], exchangeRateCache.rate);
        exchangeRateCache = {
          rate,
          lastUpdate: Date.now()
        };
        return rate;
      }
    }
    
    return exchangeRateCache.rate;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error.message);
    return exchangeRateCache.rate;
  }
}

function convertToCNYPerGram(usdPerOunce, exchangeRate) {
  const gramsPerOunce = 31.1034768;
  const cnyPerGram = (usdPerOunce * exchangeRate) / gramsPerOunce;
  return parseFloat(cnyPerGram.toFixed(2));
}

function enrichCommodityPrice({ price, change, changePercent, usdPrice, exchangeRate, source, mock = false }) {
  const previousClose = price - change;
  const spread = Math.max(Math.abs(change), price * 0.006);

  return {
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    currency: 'CNY',
    unit: 'g',
    usdPrice: parseFloat(usdPrice.toFixed(2)),
    usdUnit: 'oz',
    exchangeRate,
    high: parseFloat((Math.max(price, previousClose) + spread * 0.35).toFixed(2)),
    low: parseFloat((Math.max(0, Math.min(price, previousClose) - spread * 0.35)).toFixed(2)),
    open: parseFloat(previousClose.toFixed(2)),
    previousClose: parseFloat(previousClose.toFixed(2)),
    high24h: parseFloat((Math.max(price, previousClose) + spread).toFixed(2)),
    low24h: parseFloat((Math.max(0, Math.min(price, previousClose) - spread)).toFixed(2)),
    volume: '--',
    dataSource: source,
    isMock: mock,
    lastUpdate: new Date().toISOString()
  };
}

async function getGoldPrice() {
  try {
    const exchangeRate = await getExchangeRate();
    
    const data = await getGbkText('https://hq.sinajs.cn/rn=1&list=hf_GC', {
      headers: {
        'Referer': 'https://finance.sina.com.cn'
      }
    });

    const match = data.match(/="([^"]+)"/);

    if (match && match[1]) {
      const parts = match[1].split(',');
      if (parts.length >= 2) {
        const usdPrice = toNumber(parts[0]);
        const usdChange = toNumber(parts[1]);

        if (usdPrice <= 0) {
          return getMockGoldPrice();
        }

        const cnyPrice = convertToCNYPerGram(usdPrice, exchangeRate);
        const cnyChange = convertToCNYPerGram(usdChange, exchangeRate);
        const changePercent = usdPrice > 0 ? (usdChange / usdPrice * 100) : 0;

        return enrichCommodityPrice({
          price: cnyPrice,
          change: cnyChange,
          changePercent,
          usdPrice,
          exchangeRate,
          source: 'sina-free'
        });
      }
    }

    return getMockGoldPrice();
  } catch (error) {
    console.error('Failed to fetch gold price:', error.message);
    return getMockGoldPrice();
  }
}

function getMockGoldPrice() {
  const basePrice = 550;
  const fluctuation = (Math.random() - 0.5) * 10;
  const price = basePrice + fluctuation;
  const change = fluctuation;
  const changePercent = (change / basePrice * 100);
  
  return {
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    currency: 'CNY',
    unit: 'g',
    high: parseFloat((price + Math.random() * 5).toFixed(2)),
    low: parseFloat((price - Math.random() * 5).toFixed(2)),
    open: parseFloat((price - fluctuation * 0.5).toFixed(2)),
    previousClose: parseFloat((price - fluctuation).toFixed(2)),
    high24h: parseFloat((price + Math.random() * 8).toFixed(2)),
    low24h: parseFloat((price - Math.random() * 8).toFixed(2)),
    volume: `${(Math.random() * 10000 + 5000).toFixed(0)} kg`,
    dataSource: 'offline-sample',
    lastUpdate: new Date().toISOString(),
    isMock: true
  };
}

async function getGoldHistory(hours = 24) {
  const history = [];
  const now = new Date();
  const current = await getGoldPrice();
  const basePrice = current?.price || 550;
  const points = Math.min(60, Math.max(12, hours));
  const stepHours = Math.max(1, Math.ceil(hours / points));
  const volatility = Math.max(basePrice * 0.006, 5);

  for (let i = hours; i >= 0; i -= stepHours) {
    const time = new Date(now.getTime() - i * 3600000);
    const progress = hours > 0 ? (hours - i) / hours : 1;
    const wave = Math.sin(i / 5) * volatility * 0.55 + Math.cos(i / 11) * volatility * 0.35;
    const anchor = (progress - 1) * volatility * 0.45;
    const price = i === 0 ? basePrice : basePrice + wave + anchor;
    
    history.push({
      time: time.toISOString(),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(500 + ((Math.sin(i / 3) + 1) * 450))
    });
  }
  
  return history;
}

module.exports = {
  getGoldPrice,
  getGoldHistory,
  getExchangeRate,
  convertToCNYPerGram
};
