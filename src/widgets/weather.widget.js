/**
 * Weather widget (Room screen)
 *
 * The Room screen owns the data fetching + Gemini generation. This file
 * provides just markup + styling.
 */

import { escapeHtml } from '../ui/helpers2.js?v=3.1.67';

export const WEATHER_SECTION_CSS = `
  .wx-widget {
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    box-shadow: var(--hue-shadow-card);
    padding: 14px 14px 12px 14px;
    overflow: hidden;
  }

  .wx-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px;
    border-radius: 16px;
    background:
      radial-gradient(ellipse at top, rgba(255,255,255,0.06), rgba(0,0,0,0.22)),
      rgba(0,0,0,0.12);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .wx-emoji {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.22);
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: 0 8px 18px rgba(0,0,0,0.35);
    font-size: 22px;
  }

  .wx-main {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .wx-temp {
    font-size: 26px;
    font-weight: 950;
    letter-spacing: 0.2px;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 2px 6px rgba(0,0,0,0.55);
  }

  .wx-cond {
    font-size: 13px;
    font-weight: 800;
    color: rgba(255,255,255,0.90);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wx-meta {
    margin-top: 2px;
    font-size: 12px;
    color: var(--hue-text-muted);
    font-variant-numeric: tabular-nums;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .wx-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.20);
    font-weight: 800;
  }

  .wx-report-wrap {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
    position: relative;
  }

  .wx-report-title {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.8px;
    color: rgba(245, 230, 211, 0.95);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .wx-forecast {
    margin-top: 10px;
    display: flex;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    padding-bottom: 2px;
  }

  .wx-forecast::-webkit-scrollbar { display: none; width: 0; height: 0; }

  .wx-fi {
    scroll-snap-align: start;
    flex: 0 0 auto;
    width: 76px;
    border-radius: 16px;
    padding: 10px 10px 9px 10px;
    background: rgba(0,0,0,0.16);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .wx-fi-time {
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: rgba(245, 230, 211, 0.92);
    font-variant-numeric: tabular-nums;
  }

  .wx-fi-emoji {
    margin-top: 6px;
    font-size: 20px;
    line-height: 1;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
  }

  .wx-fi-temp {
    margin-top: 6px;
    font-size: 14px;
    font-weight: 950;
    color: rgba(255,255,255,0.94);
    font-variant-numeric: tabular-nums;
  }

  .wx-fi-rain {
    margin-top: 4px;
    font-size: 11px;
    font-weight: 900;
    color: rgba(173,216,255,0.92);
    font-variant-numeric: tabular-nums;
  }

  .wx-cta {
    margin-top: 10px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .wx-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(118,185,255,0.26);
    background: rgba(118,185,255,0.12);
    color: rgba(255,255,255,0.90);
    font-size: 12px;
    font-weight: 900;
  }

  .wx-family {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 10px;
  }

  @media (min-width: 680px) {
    .wx-family {
      grid-template-columns: 1fr 1fr;
    }
  }

  .wx-card {
    position: relative;
    border-radius: 16px;
    padding: 10px 12px;
    background: rgba(0,0,0,0.16);
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
  }

  .wx-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(120deg, rgba(118,185,255,0.10) 0%, rgba(240,199,94,0.06) 35%, transparent 70%);
    opacity: 0.9;
  }

  .wx-card-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }

  .wx-card-title {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 950;
    letter-spacing: 0.3px;
    color: rgba(255,255,255,0.92);
  }

  .wx-card-body {
    position: relative;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255,255,255,0.84);
    white-space: pre-wrap;
  }

  .wx-report-box {
    position: relative;
    min-height: 100px;
  }

  .wx-report-text {
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

  .wx-report-loading {
    position: absolute;
    inset: 0;
    display: none;
    align-items: flex-start;
    padding-top: 6px;
    gap: 8px;
    pointer-events: none;
    color: rgba(255,255,255,0.7);
    font-size: 12px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .wx-report-loading.is-visible { display: flex; }

  .wx-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(240, 199, 94, 0.9);
    box-shadow: 0 0 10px rgba(240, 199, 94, 0.35);
    opacity: 0.45;
    transform: translateY(0);
    animation: wxDotBounce 0.9s ease-in-out infinite;
  }

  .wx-dot:nth-child(2) { animation-delay: 0.12s; }
  .wx-dot:nth-child(3) { animation-delay: 0.24s; }

  @keyframes wxDotBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40% { transform: translateY(-4px); opacity: 1; }
  }

  .wx-report-caret {
    display: inline-block;
    width: 8px;
    height: 14px;
    margin-left: 2px;
    vertical-align: -2px;
    background: rgba(240, 199, 94, 0.85);
    box-shadow: 0 0 10px rgba(240, 199, 94, 0.35);
    animation: wxCaretBlink 1.05s step-end infinite;
  }

  .wx-report-status {
    margin-top: 8px;
    font-size: 11px;
    color: var(--hue-text-muted);
  }

  @keyframes wxCaretBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
`;

export function renderWeatherSection(section) {
  const title = String(section?.title || 'Weer');
  return `
    <div class="wx-widget" data-title="${escapeHtml(title)}">
      <div class="wx-banner">
        <div class="wx-emoji" data-role="wx-emoji">⛅</div>
        <div class="wx-main">
          <div class="wx-temp" data-role="wx-temp">--°</div>
          <div class="wx-cond" data-role="wx-cond">Weer laden…</div>
          <div class="wx-meta">
            <span class="wx-chip" data-role="wx-loc">—</span>
            <span class="wx-chip" data-role="wx-rain">Regen: --%</span>
            <span class="wx-chip" data-role="wx-wind">Wind: --</span>
          </div>
        </div>
      </div>
      <div class="wx-forecast" data-role="wx-forecast" aria-label="Verwachting">
        <div class="wx-fi" aria-hidden="true">
          <div class="wx-fi-time">--:--</div>
          <div class="wx-fi-emoji">⛅</div>
          <div class="wx-fi-temp">--°</div>
          <div class="wx-fi-rain">--%</div>
        </div>
        <div class="wx-fi" aria-hidden="true">
          <div class="wx-fi-time">--:--</div>
          <div class="wx-fi-emoji">⛅</div>
          <div class="wx-fi-temp">--°</div>
          <div class="wx-fi-rain">--%</div>
        </div>
        <div class="wx-fi" aria-hidden="true">
          <div class="wx-fi-time">--:--</div>
          <div class="wx-fi-emoji">⛅</div>
          <div class="wx-fi-temp">--°</div>
          <div class="wx-fi-rain">--%</div>
        </div>
      </div>
      <div class="wx-report-wrap">
        <div class="wx-report-title">Weerbericht + kledingadvies</div>
        <div class="wx-report-box">
          <div class="wx-report-loading is-visible" data-role="wx-loading" aria-hidden="true">
            <span class="wx-dot"></span><span class="wx-dot"></span><span class="wx-dot"></span>
            <span>Gemini schrijft het weerbericht…</span>
          </div>
          <div class="wx-report-text" data-role="wx-report" aria-live="polite"></div><span class="wx-report-caret" data-role="wx-caret" aria-hidden="true"></span>
        </div>
        <div class="wx-cta">
          <span class="wx-pill" data-role="wx-umbrella">Paraplu: —</span>
          <span class="wx-pill" data-role="wx-jacket">Jas: —</span>
        </div>
        <div class="wx-family">
          <div class="wx-card">
            <div class="wx-card-head">
              <div class="wx-card-title"><ha-icon icon="mdi:school"></ha-icon> Noah (school)</div>
            </div>
            <div class="wx-card-body" data-role="wx-noah">—</div>
          </div>
          <div class="wx-card">
            <div class="wx-card-head">
              <div class="wx-card-title"><ha-icon icon="mdi:baby-face-outline"></ha-icon> Felix (opvang)</div>
            </div>
            <div class="wx-card-body" data-role="wx-felix">—</div>
          </div>
        </div>
        <div class="wx-report-status" data-role="wx-status">Rapport wordt gemaakt...</div>
      </div>
    </div>
  `;
}
