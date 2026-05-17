const axios = require('axios');
const iconv = require('iconv-lite');

const client = axios.create({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 FinanceAssistant/1.0',
    'Accept': '*/*'
  }
});

function decodeGbk(data) {
  if (!data) return '';
  if (Buffer.isBuffer(data)) {
    return iconv.decode(data, 'gbk');
  }
  return String(data);
}

async function getJson(url, options = {}) {
  const response = await client.get(url, {
    ...options,
    responseType: options.responseType || 'json'
  });
  return response.data;
}

async function getText(url, options = {}) {
  const response = await client.get(url, {
    ...options,
    responseType: options.responseType || 'text'
  });
  return response.data;
}

async function getGbkText(url, options = {}) {
  const response = await client.get(url, {
    ...options,
    responseType: 'arraybuffer'
  });
  return decodeGbk(response.data);
}

function toNumber(value, fallback = 0) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function toInteger(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

module.exports = {
  client,
  decodeGbk,
  getJson,
  getText,
  getGbkText,
  toNumber,
  toInteger
};
