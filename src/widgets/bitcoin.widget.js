/**
 * Bitcoin Widget (CoinGecko + HA Conversation)
 *
 * Home screen:
 * - Device tile showing current BTC price in a currency (default USD)
 *
 * Room screen:
 * - 12h sparkline chart
 * - Container markup for a Gemini-generated report (rendered by room screen logic)
 */

import { escapeHtml } from '../ui/helpers2.js?v=3.1.51';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const _fmtCache = new Map();
function currencyFormatter(currency, maximumFractionDigits = 0) {
  const key = `${String(currency || '').toUpperCase()}|${maximumFractionDigits}`;
  if (_fmtCache.has(key)) return _fmtCache.get(key);
  // Defensive cap: key space is normally tiny, but keep it bounded.
  if (_fmtCache.size > 50) _fmtCache.clear();
  const fmt = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: String(currency || 'USD').toUpperCase(),
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
  _fmtCache.set(key, fmt);
  return fmt;
}

export function formatCurrency(value, currency = 'USD', maximumFractionDigits = 0) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '--';
  try {
    return currencyFormatter(currency, maximumFractionDigits).format(v);
  } catch (_e) {
    return `${v.toFixed(maximumFractionDigits)} ${String(currency || '').toUpperCase()}`.trim();
  }
}

export function formatPercent(value, digits = 2) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '--';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    signal,
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

export async function fetchBtcPrice({ vsCurrency = 'usd', signal } = {}) {
  const vs = String(vsCurrency || 'usd').toLowerCase();
  const url = `${COINGECKO_BASE}/simple/price?ids=bitcoin&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true&include_last_updated_at=true`;
  const data = await fetchJson(url, { signal });
  const obj = data?.bitcoin || {};
  const price = Number(obj?.[vs]);
  const change24h = Number(obj?.[`${vs}_24h_change`]);
  const updatedAtSec = Number(obj?.last_updated_at);
  const updatedAt = Number.isFinite(updatedAtSec) ? updatedAtSec * 1000 : Date.now();
  return {
    vsCurrency: vs,
    currency: vs.toUpperCase(),
    price: Number.isFinite(price) ? price : null,
    change24h: Number.isFinite(change24h) ? change24h : null,
    updatedAt,
  };
}

export async function fetchBtcMarketChart({ vsCurrency = 'usd', days = 1, signal } = {}) {
  const vs = String(vsCurrency || 'usd').toLowerCase();
  const d = Number(days);
  const safeDays = Number.isFinite(d) ? Math.max(0.1, Math.min(30, d)) : 1;
  const url = `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=${encodeURIComponent(vs)}&days=${encodeURIComponent(String(safeDays))}`;
  const data = await fetchJson(url, { signal });
  const prices = Array.isArray(data?.prices) ? data.prices : [];
  return {
    vsCurrency: vs,
    currency: vs.toUpperCase(),
    prices: prices
      .map((row) => [Number(row?.[0]), Number(row?.[1])])
      .filter(([ts, p]) => Number.isFinite(ts) && Number.isFinite(p))
      .sort((a, b) => a[0] - b[0]),
  };
}

export async function fetchCryptoCompareNews({ lang = 'EN', hours = 12, maxItems = 10, signal } = {}) {
  const safeHours = Number.isFinite(Number(hours)) ? Math.max(1, Math.min(48, Number(hours))) : 12;
  const safeMax = Number.isFinite(Number(maxItems)) ? Math.max(1, Math.min(20, Number(maxItems))) : 10;
  const safeLang = String(lang || 'EN').toUpperCase();
  const url = `https://min-api.cryptocompare.com/data/v2/news/?lang=${encodeURIComponent(safeLang)}`;
  const data = await fetchJson(url, { signal });
  const items = Array.isArray(data?.Data) ? data.Data : [];
  const cutoffSec = Math.floor((Date.now() - safeHours * 3600000) / 1000);

  const isBtcRelated = (item) => {
    const cats = String(item?.categories || '').toUpperCase();
    const tags = String(item?.tags || '');
    const title = String(item?.title || '');
    const body = String(item?.body || '');
    const hay = `${cats} ${tags} ${title} ${body}`.toLowerCase();
    return hay.includes('btc') || hay.includes('bitcoin');
  };

  return items
    .filter((item) => Number(item?.published_on) >= cutoffSec)
    .filter(isBtcRelated)
    .sort((a, b) => Number(b?.published_on || 0) - Number(a?.published_on || 0))
    .slice(0, safeMax)
    .map((item) => ({
      published_on: Number(item?.published_on || 0) * 1000,
      source: String(item?.source_info?.name || item?.source || '').trim(),
      title: String(item?.title || '').trim(),
      url: String(item?.url || '').trim(),
      body: String(item?.body || '').trim(),
      categories: String(item?.categories || '').trim(),
      tags: String(item?.tags || '').trim(),
    }));
}

export function slicePricesLastHours(prices, hours = 12, nowMs = Date.now()) {
  const h = Number(hours);
  const safeHours = Number.isFinite(h) ? Math.max(0.5, Math.min(48, h)) : 12;
  const startMs = nowMs - safeHours * 3600000;
  return (Array.isArray(prices) ? prices : []).filter(([ts]) => Number(ts) >= startMs);
}

export function computePriceStats(prices) {
  const points = Array.isArray(prices) ? prices : [];
  if (points.length === 0) {
    return {
      start: null,
      end: null,
      min: null,
      max: null,
      changePct: null,
      startTs: null,
      endTs: null,
      minTs: null,
      maxTs: null,
    };
  }

  const startTs = points[0][0];
  const endTs = points[points.length - 1][0];
  const start = points[0][1];
  const end = points[points.length - 1][1];

  let min = start;
  let max = start;
  let minTs = startTs;
  let maxTs = startTs;
  for (const [ts, price] of points) {
    if (price < min) { min = price; minTs = ts; }
    if (price > max) { max = price; maxTs = ts; }
  }

  const changePct = Number.isFinite(start) && start !== 0
    ? ((end - start) / start) * 100
    : null;

  return { start, end, min, max, changePct, startTs, endTs, minTs, maxTs };
}

export function renderSparklineSvg(prices, { width = 100, height = 44, padding = 3 } = {}) {
  const points = Array.isArray(prices) ? prices : [];
  if (points.length < 2) {
    return `
      <svg class="btc-spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="${width}" height="${height}" rx="10" ry="10" fill="rgba(0,0,0,0.18)"></rect>
      </svg>
    `;
  }

  const stats = computePriceStats(points);
  const min = stats.min;
  const max = stats.max;
  const range = Number.isFinite(max - min) && (max - min) !== 0 ? (max - min) : 1;

  const w = width - padding * 2;
  const h = height - padding * 2;

  const toX = (i) => padding + (w * i) / (points.length - 1);
  const toY = (price) => padding + (h - ((price - min) / range) * h);

  const line = [];
  for (let i = 0; i < points.length; i += 1) {
    line.push(`${toX(i).toFixed(2)},${toY(points[i][1]).toFixed(2)}`);
  }

  const areaPath = [
    `M ${line[0]}`,
    ...line.slice(1).map((pt) => `L ${pt}`),
    `L ${toX(points.length - 1).toFixed(2)},${(height - padding).toFixed(2)}`,
    `L ${toX(0).toFixed(2)},${(height - padding).toFixed(2)}`,
    'Z',
  ].join(' ');

  const gradId = `btcFill_${Math.random().toString(16).slice(2)}`;

  return `
    <svg class="btc-spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Bitcoin sparkline">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(240, 199, 94, 0.45)"></stop>
          <stop offset="100%" stop-color="rgba(240, 199, 94, 0.02)"></stop>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#${gradId})"></path>
      <polyline points="${line.join(' ')}" fill="none" stroke="rgba(240, 199, 94, 0.95)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
    </svg>
  `;
}

export const BITCOIN_TILE_CSS = `
  .bitcoin-tile {
    position: relative;
  }

  .bitcoin-tile .device-status {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    row-gap: 6px;
    font-variant-numeric: tabular-nums;
    font-weight: 900;
    letter-spacing: 0.2px;
  }

  .bitcoin-price {
    font-size: clamp(16px, 4.4vw, 19px);
    color: var(--hue-text-primary);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bitcoin-change {
    font-size: 12px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(0,0,0,0.24);
    color: var(--hue-text-muted);
    white-space: nowrap;
  }

  .bitcoin-tile.is-up .bitcoin-change {
    background: rgba(48, 200, 110, 0.18);
    border-color: rgba(48, 200, 110, 0.28);
    color: rgba(170, 255, 210, 0.95);
    box-shadow: 0 0 14px rgba(60, 220, 130, 0.18);
  }

  .bitcoin-tile.is-down .bitcoin-change {
    background: rgba(255, 85, 85, 0.16);
    border-color: rgba(255, 85, 85, 0.26);
    color: rgba(255, 200, 200, 0.95);
    box-shadow: 0 0 14px rgba(255, 90, 90, 0.18);
  }

  .bitcoin-updated {
    margin-top: 4px;
    font-size: 11px;
    color: var(--hue-text-muted);
    font-variant-numeric: tabular-nums;
  }
`;

export function renderBitcoinTile(device, priceState = null) {
  const vs = String(device?.vs_currency || 'usd').toLowerCase();
  const currency = vs.toUpperCase();
  const price = priceState?.price;
  const change = priceState?.change24h;
  const updatedAt = priceState?.updatedAt;

  const priceText = Number.isFinite(price) ? formatCurrency(price, currency, 0) : '--';
  const changeText = Number.isFinite(change) ? formatPercent(change, 2) : '--';
  const updatedText = Number.isFinite(updatedAt) ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  const cls = Number.isFinite(change) ? (change >= 0 ? 'is-up' : 'is-down') : '';

  return `
    <div class="device-tile bitcoin-tile ${cls}"
         data-device="${escapeHtml(device?.id || 'bitcoin')}"
         data-kind="bitcoin"
         data-vs="${escapeHtml(vs)}">
      <div class="device-header">
        <div class="device-icon-container">
          <ha-icon class="device-icon" icon="${escapeHtml(device?.icon || 'mdi:bitcoin')}"></ha-icon>
        </div>
      </div>
      <div class="device-name">${escapeHtml(device?.name || 'Bitcoin')}</div>
      <div class="device-status">
        <span class="bitcoin-price" data-role="price">${escapeHtml(priceText)}</span>
        <span class="bitcoin-change" data-role="change">${escapeHtml(changeText)}</span>
      </div>
      <div class="bitcoin-updated">Updated ${escapeHtml(updatedText)}</div>
    </div>
  `;
}

export function updateBitcoinTile(tileEl, priceState = null) {
  if (!tileEl) return;
  const vs = String(tileEl.dataset.vs || 'usd').toLowerCase();
  const currency = vs.toUpperCase();

  const price = priceState?.price;
  const change = priceState?.change24h;
  const updatedAt = priceState?.updatedAt;

  const priceText = Number.isFinite(price) ? formatCurrency(price, currency, 0) : '--';
  const changeText = Number.isFinite(change) ? formatPercent(change, 2) : '--';
  const updatedText = Number.isFinite(updatedAt)
    ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const priceEl = tileEl.querySelector('[data-role="price"]');
  const changeEl = tileEl.querySelector('[data-role="change"]');
  const updatedEl = tileEl.querySelector('.bitcoin-updated');

  if (priceEl) priceEl.textContent = priceText;
  if (changeEl) changeEl.textContent = changeText;
  if (updatedEl) updatedEl.textContent = `Updated ${updatedText}`;

  tileEl.classList.toggle('is-up', Number.isFinite(change) && change >= 0);
  tileEl.classList.toggle('is-down', Number.isFinite(change) && change < 0);
}

export const BITCOIN_SECTION_CSS = `
  .btc-widget {
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    box-shadow: var(--hue-shadow-card);
    padding: 14px 14px 12px 14px;
    overflow: hidden;
  }

  .btc-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .btc-priceline {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .btc-price {
    font-size: 28px;
    font-weight: 950;
    letter-spacing: 0.2px;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 2px 6px rgba(0,0,0,0.55);
  }

  .btc-subline {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 12px;
    color: var(--hue-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .btc-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.22);
    font-weight: 800;
  }

  .btc-chip.is-up {
    background: rgba(48, 200, 110, 0.16);
    border-color: rgba(48, 200, 110, 0.26);
    color: rgba(170, 255, 210, 0.95);
  }

  .btc-chip.is-down {
    background: rgba(255, 85, 85, 0.14);
    border-color: rgba(255, 85, 85, 0.22);
    color: rgba(255, 200, 200, 0.95);
  }

  .btc-spark {
    width: 100%;
    height: 120px;
    display: block;
    border-radius: 14px;
    background: radial-gradient(ellipse at top, rgba(255,255,255,0.06), rgba(0,0,0,0.22));
    border: 1px solid rgba(255,255,255,0.06);
  }

  .btc-range {
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 11px;
    color: var(--hue-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .btc-report-wrap {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
    position: relative;
  }

  .btc-report-title {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.8px;
    color: rgba(245, 230, 211, 0.95);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .btc-report-text {
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(255,255,255,0.92);
    margin: 0;
    min-height: 110px;
    letter-spacing: 0.1px;
  }

  .btc-report-box {
    position: relative;
    min-height: 90px;
  }

  .btc-report-loading {
    position: absolute;
    inset: 0;
    display: none;
    align-items: flex-start;
    padding-top: 6px;
    gap: 8px;
    pointer-events: none;
    color: rgba(255,255,255,0.7);
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .btc-report-loading.is-visible {
    display: flex;
  }

  .btc-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(240, 199, 94, 0.9);
    box-shadow: 0 0 10px rgba(240, 199, 94, 0.35);
    opacity: 0.45;
    transform: translateY(0);
    animation: btcDotBounce 0.9s ease-in-out infinite;
  }

  .btc-dot:nth-child(2) { animation-delay: 0.12s; }
  .btc-dot:nth-child(3) { animation-delay: 0.24s; }

  @keyframes btcDotBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40% { transform: translateY(-4px); opacity: 1; }
  }

  .btc-report-caret {
    display: inline-block;
    width: 8px;
    height: 14px;
    margin-left: 2px;
    vertical-align: -2px;
    background: rgba(240, 199, 94, 0.85);
    box-shadow: 0 0 10px rgba(240, 199, 94, 0.35);
    animation: btcCaretBlink 1.05s step-end infinite;
  }

  .btc-report-status {
    margin-top: 8px;
    font-size: 11px;
    color: var(--hue-text-muted);
  }

  @keyframes btcCaretBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
`;

export function renderBitcoinSection(section) {
  const vs = String(section?.vs_currency || 'usd').toLowerCase();
  const hours = Number(section?.hours);
  const safeHours = Number.isFinite(hours) ? Math.max(1, Math.min(24, Math.round(hours))) : 12;
  const title = String(section?.title || 'Bitcoin');

  return `
    <div class="btc-widget" data-vs="${escapeHtml(vs)}" data-hours="${escapeHtml(String(safeHours))}" data-title="${escapeHtml(title)}" data-agent-id="${escapeHtml(String(section?.agent_id || section?.gemini_agent_id || ''))}">
      <div class="btc-top">
        <div class="btc-priceline">
          <div class="btc-price" data-role="btc-price">--</div>
          <div class="btc-subline">
            <span class="btc-chip" data-role="btc-change">--</span>
            <span data-role="btc-updated">Updated --:--</span>
          </div>
        </div>
      </div>
      <div class="btc-chart" data-role="btc-chart">
        ${renderSparklineSvg([], { width: 100, height: 44 })}
      </div>
      <div class="btc-range">
        <span data-role="btc-low">Low --</span>
        <span data-role="btc-high">High --</span>
      </div>
      <div class="btc-report-wrap">
        <div class="btc-report-title">Nieuwsbrief (laatste ${escapeHtml(String(safeHours))}u + vooruitblik 12u)</div>
        <div class="btc-report-box">
          <div class="btc-report-loading is-visible" data-role="btc-loading" aria-hidden="true">
            <span class="btc-dot"></span><span class="btc-dot"></span><span class="btc-dot"></span>
            <span>Gemini denkt na…</span>
          </div>
          <div class="btc-report-text" data-role="btc-report" aria-live="polite"></div><span class="btc-report-caret" data-role="btc-caret" aria-hidden="true"></span>
        </div>
        <div class="btc-report-status" data-role="btc-report-status">Rapport wordt gemaakt...</div>
      </div>
    </div>
  `;
}
