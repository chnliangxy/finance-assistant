const { getJson, getText, toNumber } = require('./freeApiClient');

async function getFundNav(fundCode) {
  try {
    if (!/^\d{6}$/.test(fundCode)) {
      return null;
    }

    const data = await getText(`https://fundgz.1234567.com.cn/js/${fundCode}.js`);
    const start = data.indexOf('jsonpgz(');
    const end = data.lastIndexOf(')');
    const payload = start >= 0 && end > start ? data.slice(start + 'jsonpgz('.length, end) : '';

    if (payload) {
      const fund = JSON.parse(payload);
      return {
        code: fund.fundcode,
        name: fund.name,
        nav: toNumber(fund.dwjz),
        accumulated_nav: toNumber(fund.gsz),
        nav_date: fund.jzrq,
        estimate_time: fund.gztime,
        estimate_value: toNumber(fund.gszzl),
        change_percent: toNumber(fund.gszzl),
        dataSource: 'eastmoney-free',
        lastUpdate: new Date().toISOString()
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch fund NAV:', error.message);
    return null;
  }
}

async function searchFund(keyword) {
  try {
    const cleanKeyword = String(keyword || '').trim();
    if (!cleanKeyword) {
      return [];
    }

    const data = await getJson('https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx', {
      params: {
        m: '1',
        t: '500',
        key: cleanKeyword,
        _: Date.now()
      }
    });

    const results = [];

    if (data && data.Datas) {
      data.Datas.slice(0, 10).forEach(item => {
        results.push({
          code: item.CODE,
          name: item.NAME,
          type: item.FundType,
          manager: item.FundManagerName
        });
      });
    }

    return results;
  } catch (error) {
    console.error('Failed to search funds:', error.message);
    return [];
  }
}

async function getFundDetail(fundCode) {
  try {
    const html = await getText(`https://fund.eastmoney.com/pingzhongdata/${fundCode}.html`);
    const nameMatch = html.match(/<title>([^<]+)</);

    return {
      code: fundCode,
      name: nameMatch ? nameMatch[1].split('_')[0] : ''
    };
  } catch (error) {
    console.error('Failed to fetch fund detail:', error.message);
    return null;
  }
}

module.exports = {
  getFundNav,
  searchFund,
  getFundDetail
};
