const { getGbkText, toNumber, toInteger } = require('./freeApiClient');

async function getStockPrice(code) {
  try {
    if (!/^\d{6}$/.test(code)) {
      return null;
    }

    const market = code.startsWith('6') ? 'sh' : 'sz';
    const symbol = `${market}${code}`;

    const data = await getGbkText(`https://hq.sinajs.cn/list=${symbol}`, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
      }
    });

    const match = data.match(/="([^"]+)"/);

    if (match && match[1]) {
      const parts = match[1].split(',');
      if (parts.length >= 32) {
        const name = parts[0];
        const open = toNumber(parts[1]);
        const lastClose = toNumber(parts[2]);
        const price = toNumber(parts[3]);
        const high = toNumber(parts[4]);
        const low = toNumber(parts[5]);
        const volume = toInteger(parts[8]);

        if (!name || price <= 0) {
          return null;
        }

        const change_percent = lastClose > 0 ? ((price - lastClose) / lastClose * 100).toFixed(2) : 0;

        return {
          code,
          name,
          price,
          open,
          high,
          low,
          lastClose,
          volume,
          change_percent: toNumber(change_percent),
          dataSource: 'sina-free',
          lastUpdate: new Date().toISOString()
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch stock price:', error.message);
    return null;
  }
}

async function searchStock(keyword) {
  try {
    const cleanKeyword = String(keyword || '').trim();
    if (!cleanKeyword) {
      return [];
    }

    const data = await getGbkText('https://suggest3.sinajs.cn/suggest/suggest.php', {
      params: {
        name: 'sina_finance',
        key: cleanKeyword,
        type: '11,12,13,14,15'
      }
    });

    const lines = data.split(';').filter(line => line.trim());

    const results = lines.map(line => {
      const match = line.match(/"([^"]+)"/);
      if (match) {
        const parts = match[1].split(',');
        if (parts.length >= 4) {
          const symbol = parts[0] || '';
          const code = (parts[2] || symbol).replace(/^(sh|sz)/, '');
          const name = parts[4] || parts[1] || code;

          return {
            code,
            name,
            market: symbol.slice(0, 2),
            type: parts[3] || symbol
          };
        }
      }
      return null;
    }).filter(Boolean);

    return results.slice(0, 10);
  } catch (error) {
    console.error('Failed to search stocks:', error.message);
    return [];
  }
}

async function getBatchStockPrices(codes) {
  const results = {};
  for (const code of codes) {
    const price = await getStockPrice(code);
    if (price) {
      results[code] = price;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return results;
}

module.exports = {
  getStockPrice,
  searchStock,
  getBatchStockPrices
};
