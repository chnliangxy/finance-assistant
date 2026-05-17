const { getExchangeRate, convertToCNYPerGram } = require('./goldService');
const { getGbkText, toNumber } = require('./freeApiClient');

function enrichSilverPrice({ price, change, changePercent, usdPrice, exchangeRate, source, mock = false }) {
  const previousClose = price - change;
  const spread = Math.max(Math.abs(change), price * 0.01);

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

async function getSilverPrice() {
  try {
    const exchangeRate = await getExchangeRate();
    
    const data = await getGbkText('https://hq.sinajs.cn/rn=1&list=hf_SI', {
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
          return getMockSilverPrice();
        }

        const cnyPrice = convertToCNYPerGram(usdPrice, exchangeRate);
        const cnyChange = convertToCNYPerGram(usdChange, exchangeRate);
        const changePercent = usdPrice > 0 ? (usdChange / usdPrice * 100) : 0;

        return enrichSilverPrice({
          price: cnyPrice,
          change: cnyChange,
          changePercent,
          usdPrice,
          exchangeRate,
          source: 'sina-free'
        });
      }
    }

    return getMockSilverPrice();
  } catch (error) {
    console.error('Failed to fetch silver price:', error.message);
    return getMockSilverPrice();
  }
}

function getMockSilverPrice() {
  const basePrice = 6.5;
  const fluctuation = (Math.random() - 0.5) * 0.3;
  const price = basePrice + fluctuation;
  const change = fluctuation;
  const changePercent = (change / basePrice * 100);
  
  return {
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    currency: 'CNY',
    unit: 'g',
    high: parseFloat((price + Math.random() * 0.2).toFixed(2)),
    low: parseFloat((price - Math.random() * 0.2).toFixed(2)),
    open: parseFloat((price - fluctuation * 0.5).toFixed(2)),
    previousClose: parseFloat((price - fluctuation).toFixed(2)),
    high24h: parseFloat((price + Math.random() * 0.3).toFixed(2)),
    low24h: parseFloat((price - Math.random() * 0.3).toFixed(2)),
    volume: `${(Math.random() * 50000 + 10000).toFixed(0)} kg`,
    dataSource: 'offline-sample',
    lastUpdate: new Date().toISOString(),
    isMock: true
  };
}

async function getSilverHistory(hours = 24) {
  const history = [];
  const now = new Date();
  const current = await getSilverPrice();
  const basePrice = current?.price || 6.5;
  const points = Math.min(60, Math.max(12, hours));
  const stepHours = Math.max(1, Math.ceil(hours / points));
  const volatility = Math.max(basePrice * 0.01, 0.2);

  for (let i = hours; i >= 0; i -= stepHours) {
    const time = new Date(now.getTime() - i * 3600000);
    const progress = hours > 0 ? (hours - i) / hours : 1;
    const wave = Math.sin(i / 5) * volatility * 0.5 + Math.cos(i / 9) * volatility * 0.3;
    const anchor = (progress - 1) * volatility * 0.4;
    const price = i === 0 ? basePrice : basePrice + wave + anchor;
    
    history.push({
      time: time.toISOString(),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(1000 + ((Math.sin(i / 3) + 1) * 2000))
    });
  }
  
  return history;
}

module.exports = {
  getSilverPrice,
  getSilverHistory
};
