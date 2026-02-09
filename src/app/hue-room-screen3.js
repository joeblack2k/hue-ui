/**
 * Hue Room Screen - Config-driven room composition
 * Room Layout v3 — Fixed canvas architecture (Hue app parity)
 *
 * Layout Model:
 * - Fixed viewport root with infinite leather background (same as Home)
 * - Pinned room header (back button, title, master toggle) — never scrolls
 * - Single scroll container for all room content sections
 * - Content slides under the pinned header
 */

import {
  loadRoomsIndex,
  loadRoomConfig,
  getRoomFromIndex,
  saveRoomConfigOverride,
} from './config-loader3.js?v=3.1.78';
import { handleAction, toggleAllLights, hapticFeedback } from './events3.js?v=3.1.78';
import { escapeHtml, getLightColor, isEntityOn, formatHvacMode, t, getWeatherEmoji, translateCondition } from '../ui/helpers2.js?v=3.1.51';
import { renderScenesContent } from '../widgets/scenes.widget3.js?v=3.1.51';
import { renderLightingContent } from '../widgets/lighting.widget3.js?v=3.1.51';
import { renderClimateContent } from '../widgets/climate.widget2.js?v=3.1.51';
import { renderDevicesContent, renderMediaPlayersContent } from '../widgets/devices.widget2.js?v=3.1.51';
import { renderSensorsContent } from '../widgets/sensors.widget2.js?v=3.1.51';
import { renderActionsContent } from '../widgets/actions.widget2.js?v=3.1.78';
import {
  renderBitcoinSection,
  fetchBtcPrice,
  fetchBtcMarketChart,
  fetchCryptoCompareNews,
  slicePricesLastHours,
  computePriceStats,
  renderSparklineSvg,
  formatCurrency,
  formatPercent,
  BITCOIN_SECTION_CSS,
} from '../widgets/bitcoin.widget.js?v=3.1.75';
import { renderWeatherSection, WEATHER_SECTION_CSS } from '../widgets/weather.widget.js?v=3.1.67';
import { renderNewsRoomSection, NEWS_ROOM_CSS } from '../widgets/news-room.widget.js?v=3.1.75';

const STYLES = `
  /* ===== ROOT LAYOUT ===== */
  :host {
    display: block;
    overflow: hidden;
    --hue-surface-tile: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.35) 100%);
    --hue-surface-tile-on: linear-gradient(180deg, rgba(255, 168, 82, 0.95) 0%, rgba(160, 90, 32, 0.9) 100%);
    --hue-surface-dark: rgba(30, 24, 20, 0.9);
    --hue-text-primary: #ffffff;
    --hue-text-secondary: rgba(255, 255, 255, 0.8);
    --hue-text-muted: rgba(255, 255, 255, 0.55);
    --hue-gold: #f0c75e;
    --hue-green: #3ddc70;
    --hue-light-warm: #ffb74d;
    --hue-radius-lg: 18px;
    --hue-radius-full: 9999px;
    --hue-shadow-card: 0 1px 0 rgba(255, 255, 255, 0.08) inset, 0 8px 16px rgba(0, 0, 0, 0.45), 0 4px 8px rgba(0, 0, 0, 0.3);
    --hue-shadow-button: 0 1px 0 rgba(255, 255, 255, 0.2) inset, 0 -1px 0 rgba(0, 0, 0, 0.1) inset, 0 6px 14px rgba(0, 0, 0, 0.35);
    --hue-font-size-sm: 12px;
    --hue-font-size-md: 14px;
    --hue-font-size-lg: 18px;
    --hue-font-weight-medium: 500;
    --hue-font-weight-semibold: 600;
  }

  ha-card {
    background: transparent;
    border: none !important;
    box-shadow: none !important;
    overflow: hidden;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    outline: none !important;
  }

  /* ===== FIXED APP CANVAS ===== */
  .hue-root {
    position: fixed;
    inset: 0;
    overflow: hidden;
    padding-top: env(safe-area-inset-top, 0);
    padding-bottom: env(safe-area-inset-bottom, 0);
    padding-left: env(safe-area-inset-left, 0);
    padding-right: env(safe-area-inset-right, 0);
    box-sizing: border-box;
    z-index: 1;
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    color: var(--hue-text-primary);
  }

  :host-context(.hue-more-info-open) .hue-root {
    pointer-events: none !important;
  }

  /* ===== BACKGROUND — FIXED, INFINITE ===== */
  /* Same leather texture as Home screen — never scrolls, never ends */
  .hue-background {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    background:
      linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%),
      radial-gradient(ellipse at top, rgba(255,255,255,0.05), transparent 40%),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        rgba(0,0,0,0.03) 1px,
        transparent 2px,
        transparent 4px
      ),
      linear-gradient(135deg, #4a3a2a 0%, #6b5b4b 25%, #5a4a3a 50%, #4a3a2a 75%, #3a2a1a 100%);
    box-shadow:
      inset 0 2px 4px rgba(255,255,255,0.1),
      inset 0 -2px 4px rgba(0,0,0,0.3);
  }

  .hue-background::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        rgba(0,0,0,0.02) 1px,
        transparent 2px,
        transparent 3px
      );
    pointer-events: none;
  }

  /* ===== PINNED ROOM HEADER ===== */
  /* Absolute within .hue-root — never scrolls, never bounces */
  .room-header-pinned {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 16px 18px 0 18px;
    pointer-events: none;
  }

  /* Subtle fade below header so content doesn't abruptly appear */
  .room-header-pinned::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -20px;
    height: 20px;
    background: linear-gradient(180deg, rgba(58,42,26,0.5) 0%, transparent 100%);
    pointer-events: none;
  }

  .hue-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 20px;
    background:
      linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.12) 100%),
      linear-gradient(120deg, #5a4a3a 0%, #3f3226 100%);
    box-shadow: var(--hue-shadow-card);
    pointer-events: auto;
    transition: background 180ms ease, box-shadow 180ms ease;
  }

  .hue-header-bar[data-on="true"] {
    background: linear-gradient(120deg, #f1a24b 0%, #c57a2b 100%);
    box-shadow:
      var(--hue-shadow-card),
      0 0 0 1px rgba(255, 187, 112, 0.25) inset;
  }

  .hue-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .hue-header-back {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--hue-radius-full);
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.18);
    color: var(--hue-text-primary);
    font-size: 22px;
    cursor: pointer;
    box-shadow: var(--hue-shadow-button);
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    pointer-events: auto;
  }

  .hue-header-back::before {
    content: '';
    position: absolute;
    inset: -8px;
  }

  .hue-header-title {
    font-size: 22px;
    font-weight: var(--hue-font-weight-semibold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hue-master-toggle {
    width: 46px;
    height: 46px;
    border-radius: var(--hue-radius-full);
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: #3b3b3b;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--hue-shadow-button);
    transition: all 160ms ease;
  }

  .hue-master-toggle[data-on="true"] {
    background: linear-gradient(180deg, #6ef29a 0%, #26b556 100%);
    color: #0b2b14;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2), 0 10px 18px rgba(0, 0, 0, 0.4);
  }

  /* ===== SCROLL CONTAINER — THE ONLY SCROLLABLE ELEMENT ===== */
  .room-scroll {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    z-index: 10;
  }

  .room-scroll::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }

  .room-scroll-content {
    max-width: 680px;
    margin: 0 auto;
    /* Top padding clears the pinned header (16px pad + ~74px bar + 12px gap = ~102px) */
    padding: 102px 18px 32px 18px;
  }

  /* ===== SECTIONS ===== */
  .hue-section {
    margin-bottom: 22px;
  }

  .hue-section:last-child {
    margin-bottom: 0;
  }

  .hue-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 2px;
    margin-bottom: 12px;
  }

  .hue-section-title {
    font-size: var(--hue-font-size-sm);
    font-weight: var(--hue-font-weight-semibold);
    color: var(--hue-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ===== SCENES — PAGINATED 3×2 GRID ===== */
  .hue-scene-pager {
    display: flex;
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scroll-padding-inline: 8px;
    padding: 8px 0 10px;
  }

  .hue-scene-pager::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .hue-scene-page {
    flex: 0 0 100%;
    width: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    box-sizing: border-box;
    padding: 6px 8px;
  }

  .hue-scene-page-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, minmax(126px, auto));
    gap: 10px;
  }

  .hue-scene-tile {
    background: var(--hue-surface-tile);
    border-radius: var(--hue-radius-lg);
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    min-width: 0;
    min-height: 126px;
  }

  .hue-scene-badge {
    width: 54px;
    height: 54px;
    border-radius: var(--hue-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1b1b1b;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
  }

  .hue-scene-tile .hue-tile-name {
    font-size: 12px;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    width: 100%;
  }

  @media (max-width: 380px) {
    .hue-scene-page-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(3, minmax(116px, auto));
    }

    .hue-scene-badge {
      width: 48px;
      height: 48px;
    }
  }

  /* ===== LIGHTING — PAGINATED 2-ROW GRID ===== */
  .hue-light-pager {
    display: flex;
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scroll-padding-inline: 8px;
    padding: 8px 0 10px;
  }

  .hue-light-pager::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .hue-light-page {
    flex: 0 0 100%;
    width: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    box-sizing: border-box;
    padding: 6px 8px;
  }

  .hue-light-page-grid {
    display: grid;
    grid-template-columns: repeat(var(--hue-light-page-cols, 3), minmax(0, 1fr));
    gap: 10px;
  }

  /* Lighting tile — Hue v2 anatomy: icon → name → divider → toggle */
  .hue-tile.hue-light-tile {
    height: 150px;
    min-height: 150px;
    padding: 14px 10px 12px;
    align-items: center;
    text-align: center;
    gap: 0;
  }

  .hue-light-tile .hue-tile-icon {
    width: 34px;
    height: 34px;
    font-size: 28px;
    margin: 0 auto 8px;
  }

  .hue-light-tile .hue-tile-name {
    font-size: 12px;
    font-weight: var(--hue-font-weight-semibold);
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    width: 100%;
  }

  .hue-light-divider {
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 8px 0 0;
  }

  .hue-light-brightness {
    margin-top: 7px;
    font-size: 11px;
    font-weight: var(--hue-font-weight-medium);
    color: var(--hue-text-secondary);
    text-align: center;
  }

  .hue-light-tile .hue-tile-footer {
    margin-top: auto;
    justify-content: center;
    padding-top: 10px;
  }

  /* ===== TILE GRID ===== */
  .hue-tile-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  @media (min-width: 600px) {
    .hue-tile-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .hue-tile {
    background: var(--hue-surface-tile);
    border-radius: var(--hue-radius-lg);
    padding: 14px;
    min-height: 132px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
  }

  .hue-light-tile.is-on {
    background: var(--hue-surface-tile-on);
  }

  .hue-tile-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    color: var(--hue-text-muted);
  }

  .hue-tile.is-on .hue-tile-icon {
    color: var(--hue-gold);
    filter: drop-shadow(0 0 8px rgba(240, 199, 94, 0.5));
  }

  .hue-tile-name {
    font-size: var(--hue-font-size-md);
    font-weight: var(--hue-font-weight-semibold);
    line-height: 1.2;
  }

  .hue-tile-subtitle {
    font-size: var(--hue-font-size-sm);
    color: var(--hue-text-muted);
  }

  .hue-tile-value {
    font-size: var(--hue-font-size-lg);
    font-weight: var(--hue-font-weight-semibold);
  }

  .hue-tile-footer {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
  }

  /* ===== TOGGLE ===== */
  .hue-toggle {
    position: relative;
    width: 52px;
    height: 32px;
    background: rgba(0, 0, 0, 0.35);
    border-radius: var(--hue-radius-full);
    border: none;
    cursor: pointer;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
    transition: all 150ms ease;
    padding: 0;
  }

  .hue-toggle::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 26px;
    height: 26px;
    background: linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%);
    border-radius: var(--hue-radius-full);
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    transition: transform 150ms ease;
  }

  .hue-toggle[data-on="true"] {
    background: linear-gradient(180deg, #4ddc75 0%, #23a653 100%);
  }

  .hue-toggle[data-on="true"]::after {
    transform: translateX(20px);
  }

  .hue-toggle-sm {
    width: 44px;
    height: 28px;
  }

  .hue-toggle-sm::after {
    width: 22px;
    height: 22px;
  }

  .hue-toggle-sm[data-on="true"]::after {
    transform: translateX(16px);
  }

  /* ===== ACTION TILES ===== */
  .hue-action-tile {
    width: 100%;
    text-align: left;
    border: none;
    min-height: 124px;
  }

  .hue-action-tile.is-wide {
    grid-column: span 2;
    min-height: 92px;
  }

  .hue-action-tile.is-talking {
    border: 1px solid rgba(61, 220, 112, 0.35);
    box-shadow: 0 0 0 2px rgba(61, 220, 112, 0.14), var(--hue-shadow-card);
  }

  .hue-action-tile.is-talking .hue-tile-icon {
    animation: hueTalkPulse 1.2s ease-in-out infinite;
  }

  @keyframes hueTalkPulse {
    0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(61, 220, 112, 0)); }
    50% { transform: scale(1.06); filter: drop-shadow(0 0 10px rgba(61, 220, 112, 0.35)); }
    100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(61, 220, 112, 0)); }
  }

  .hue-action-tile .hue-tile-footer {
    justify-content: flex-start;
  }

  .hue-action-tile.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* ===== WEBRTC CAMERA ===== */
  .hue-webrtc-host {
    width: 100%;
    border-radius: 18px;
    overflow: hidden;
    background: rgba(0,0,0,0.25);
    box-shadow: var(--hue-shadow-card);
  }

  .hue-webrtc-host > * {
    display: block;
    width: 100%;
  }

  .hue-action-pill {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: var(--hue-text-secondary);
  }

  /* ===== MEDIA (WIDE PLAYER) ===== */
  .hue-media-tile {
    min-height: 160px;
  }

  .hue-media-tile.is-wide {
    grid-column: span 2;
  }

  .hue-media-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .hue-media-primary {
    min-width: 98px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.1);
    color: var(--hue-text-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: var(--hue-font-weight-semibold);
    padding: 0 10px;
  }

  .hue-media-primary ha-icon {
    --mdc-icon-size: 16px;
  }

  .hue-media-now {
    min-height: 32px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.2;
  }

  .hue-media-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: auto;
  }

  .hue-media-volume {
    flex: 1;
    accent-color: #58de79;
    height: 22px;
  }

  .hue-media-volume-value {
    width: 40px;
    text-align: right;
    font-size: 11px;
    color: var(--hue-text-muted);
  }

  .hue-media-progress-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
  }

  .hue-media-progress-wrap.is-hidden {
    display: none;
  }

  .hue-media-progress {
    flex: 1;
    accent-color: var(--hue-gold);
    height: 22px;
  }

  .hue-media-progress-value {
    width: 40px;
    text-align: right;
    font-size: 11px;
    color: var(--hue-text-muted);
  }

  .hue-media-source {
    margin-top: 8px;
    width: 100%;
    height: 32px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.28);
    color: var(--hue-text-primary);
    font-size: 12px;
    padding: 0 10px;
  }

  .hue-climate-tile {
    min-height: 160px;
    grid-column: span 2;
  }

  .hue-climate-mode {
    min-width: 92px;
    text-align: right;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--hue-text-secondary);
  }

  .hue-climate-mode.is-heating {
    color: #ff7d66;
    animation: climatePulseHeat 1.9s ease-in-out infinite;
  }

  .hue-climate-mode.is-cooling {
    color: #74b9ff;
    animation: climatePulseCool 1.9s ease-in-out infinite;
  }

  .hue-climate-temps {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0;
    margin-top: 4px;
  }

  .hue-climate-header-right {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .hue-climate-temp-block {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .hue-climate-temp-label {
    font-size: 11px;
    color: var(--hue-text-muted);
    letter-spacing: 0.2px;
    text-transform: uppercase;
  }

  .hue-climate-current {
    color: var(--hue-text-primary);
    font-weight: 700;
    font-size: 18px;
    line-height: 1.1;
  }

  .hue-climate-controls {
    display: flex;
    align-items: center;
    gap: 0;
    margin-top: auto;
    flex-direction: column;
    align-items: stretch;
  }

  .hue-climate-ruler {
    padding: 0 10px; /* roughly matches slider thumb overhang */
    margin-bottom: 6px;
    user-select: none;
  }

  .hue-climate-ruler-ticks {
    height: 12px;
    width: 100%;
    background-image:
      linear-gradient(to bottom, transparent 0 55%, rgba(255, 255, 255, 0.18) 55% 100%),
      linear-gradient(to bottom, transparent 0 20%, rgba(255, 255, 255, 0.28) 20% 100%);
    /* Range 18..25 is 7C:
       - Minor ticks every 0.2C => 35 intervals
       - Major ticks every 1C   => 7 intervals (every 5 minor ticks) */
    background-size:
      calc(100% / 35) 100%,
      calc(100% / 7) 100%;
    background-repeat: repeat;
    border-radius: 999px;
    opacity: 0.9;
  }

  .hue-climate-ruler-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    letter-spacing: 0.2px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 2px;
  }

  .hue-climate-setpoint {
    flex: 1;
    height: 24px;
    accent-color: #ff884d;
    background: linear-gradient(
      90deg,
      rgba(82, 167, 255, 0.9) 0%,
      rgba(255, 183, 77, 0.95) 52%,
      rgba(255, 99, 71, 0.95) 100%
    );
    border-radius: 999px;
    -webkit-appearance: none;
    appearance: none;
  }

  .hue-climate-setpoint::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      rgba(82, 167, 255, 0.9) 0%,
      rgba(255, 183, 77, 0.95) 52%,
      rgba(255, 99, 71, 0.95) 100%
    );
  }

  .hue-climate-setpoint::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    margin-top: -5px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.22);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  }

  @keyframes climatePulseHeat {
    0%, 100% { opacity: 0.7; text-shadow: 0 0 0 rgba(255, 96, 69, 0); }
    50% { opacity: 1; text-shadow: 0 0 12px rgba(255, 96, 69, 0.58); }
  }

  @keyframes climatePulseCool {
    0%, 100% { opacity: 0.7; text-shadow: 0 0 0 rgba(114, 187, 255, 0); }
    50% { opacity: 1; text-shadow: 0 0 12px rgba(114, 187, 255, 0.58); }
  }

  .widget-editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(6, 8, 14, 0.58);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .widget-editor-overlay.is-open {
    display: flex;
  }

  .widget-editor-modal {
    width: min(360px, calc(100vw - 40px));
    border-radius: 18px;
    padding: 18px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(45, 35, 24, 0.95), rgba(20, 16, 12, 0.96));
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .widget-editor-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.4px;
  }

  .widget-editor-name {
    height: 38px;
    width: 100%;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(0, 0, 0, 0.3);
    color: var(--hue-text-primary);
    padding: 0 11px;
    box-sizing: border-box;
    font-size: 13px;
  }

  .widget-editor-btn {
    width: 100%;
    height: 38px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: var(--hue-text-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .widget-editor-btn.save {
    background: linear-gradient(180deg, #59d47d 0%, #2d9f4f 100%);
    border-color: rgba(0, 0, 0, 0.2);
    color: #0f2e19;
  }

  .widget-editor-btn.cancel {
    background: rgba(255, 255, 255, 0.04);
    color: var(--hue-text-secondary);
  }

  .widget-editor-scene-btn {
    display: none;
  }

  .widget-editor-modal[data-scene="true"] .widget-editor-scene-btn {
    display: block;
  }

  .widget-add-flow {
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.22);
  }

  .widget-add-flow.is-open {
    display: flex;
  }

  .widget-add-step {
    font-size: 12px;
    font-weight: 600;
    color: var(--hue-text-secondary);
  }

  .widget-add-classes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .widget-class-btn {
    height: 34px;
    font-size: 12px;
  }

  .widget-class-btn.is-selected {
    border-color: rgba(99, 210, 124, 0.8);
    background: rgba(64, 160, 92, 0.35);
  }

  .widget-editor-entity-select {
    width: 100%;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.28);
    color: var(--hue-text-primary);
    font-size: 12px;
    padding: 0 10px;
    box-sizing: border-box;
  }

  .widget-add-prompt {
    display: none;
    flex-direction: column;
    gap: 8px;
    margin-top: 2px;
    padding: 8px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.06);
  }

  .widget-add-prompt.is-open {
    display: flex;
  }

  .widget-add-prompt-text {
    font-size: 12px;
    color: var(--hue-text-secondary);
    line-height: 1.35;
  }

  .widget-add-prompt-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .widget-editor-status {
    min-height: 16px;
    font-size: 11px;
    color: var(--hue-text-muted);
    text-align: center;
  }

  .light-control-overlay {
    position: fixed;
    inset: 0;
    z-index: 115;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(8, 10, 16, 0.62);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .light-control-overlay.is-open {
    display: flex;
  }

  .light-control-modal {
    width: min(440px, calc(100vw - 34px));
    max-height: calc(100vh - 46px);
    overflow-y: auto;
    border-radius: 20px;
    padding: 18px 16px 16px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(45, 35, 24, 0.96), rgba(18, 14, 11, 0.96));
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 16px 42px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .light-control-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .light-control-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--hue-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .light-control-close {
    border: 0;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .light-control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .light-control-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.4px;
    color: var(--hue-text-secondary);
    text-transform: uppercase;
  }

  .light-control-slider {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 24px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  }

  .light-control-slider::-webkit-slider-runnable-track {
    height: 9px;
    border-radius: 999px;
    background: var(--track, linear-gradient(90deg, #74b5ff 0%, #ffd56f 50%, #ff7358 100%));
    box-shadow: 0 0 12px var(--glow, rgba(120, 190, 255, 0.45));
  }

  .light-control-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    margin-top: -4.5px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.25);
    box-shadow: 0 1px 7px rgba(0, 0, 0, 0.4);
  }

  .light-control-slider:disabled {
    opacity: 0.45;
  }

  .light-control-toggles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .light-control-toggle {
    height: 34px;
    border-radius: 11px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: var(--hue-text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .light-control-toggle.is-on {
    border-color: rgba(255, 205, 116, 0.85);
    background: linear-gradient(180deg, rgba(255, 187, 105, 0.85), rgba(214, 117, 54, 0.86));
    color: #2a160b;
    box-shadow: 0 0 14px rgba(255, 170, 80, 0.28);
  }

  .light-control-power-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
  }

  .light-control-power-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--hue-text-secondary);
  }

  .light-control-power-switch {
    position: relative;
    width: 52px;
    height: 30px;
    border-radius: 999px;
    border: none;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    padding: 0;
    transition: background 160ms ease;
  }

  .light-control-power-switch[aria-checked="true"] {
    background: linear-gradient(180deg, #4ddc75 0%, #23a653 100%);
  }

  .light-control-power-switch-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(180deg, #ffffff, #e0e0e0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    transition: transform 160ms ease;
  }

  .light-control-power-switch[aria-checked="true"] .light-control-power-switch-thumb {
    transform: translateX(22px);
  }

  .is-hidden {
    display: none !important;
  }

  /* ===== CAMERA ===== */
  .hue-camera-card {
    background: var(--hue-surface-tile);
    border-radius: var(--hue-radius-lg);
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;
    cursor: pointer;
  }

  .hue-camera-card.is-unavailable {
    opacity: 0.72;
  }

  .hue-camera-media {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: rgba(0, 0, 0, 0.35);
  }

  .hue-camera-feed {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .hue-camera-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
  }

  .hue-camera-name {
    font-size: var(--hue-font-size-md);
    font-weight: var(--hue-font-weight-semibold);
    color: var(--hue-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hue-camera-status {
    font-size: var(--hue-font-size-sm);
    font-weight: var(--hue-font-weight-medium);
    color: var(--hue-text-muted);
    white-space: nowrap;
  }

  /* ===== HA-ICON ===== */
  ha-icon {
    --mdc-icon-size: 24px;
    color: inherit;
  }

  /* ===== GLOBAL ===== */
  * {
    -webkit-tap-highlight-color: transparent;
  }

  ${BITCOIN_SECTION_CSS}
  ${WEATHER_SECTION_CSS}
  ${NEWS_ROOM_CSS}
`;

class HueRoomScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._roomsIndex = null;
    this._roomConfig = null;
    this._rendered = false;
    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandlePointerUp = this._handlePointerUp.bind(this);
    this._boundHandlePointerDown = this._handlePointerDown.bind(this);
    this._boundHandlePointerCancel = this._handlePointerCancel.bind(this);
    this._boundHandlePointerMove = this._handlePointerMove.bind(this);
    this._boundHandleInput = this._handleInput.bind(this);
    this._boundHandleChange = this._handleChange.bind(this);
    this._loading = false;
    this._lastBackNavAt = 0;
    this._cameraRefreshIntervals = new Map();
    this._longPressTimer = null;
    this._longPressPointerId = null;
    this._longPressStart = null;
    this._suppressNextClick = false;
    this._editorEntity = null;
    this._editorSnapshot = null;
    this._editorSelectedClass = '';
    this._pendingAddWidget = null;
    this._roomEntityOptionsByClass = {};
    this._areaRegistry = null;
    this._entityRegistry = null;
    this._deviceRegistry = null;
    this._roomFile = null;
    this._editorIsScene = false;
    this._swipeStartX = null;
    this._swipeStartY = null;
    this._boundSwipeTouchStart = this._handleSwipeTouchStart.bind(this);
    this._boundSwipeTouchEnd = this._handleSwipeTouchEnd.bind(this);
    this._lightControlEntity = null;
    this._lightControlUseColor = false;
    this._lightControlUseTemp = false;
    this._lightControlDragging = { brightness: false, color: false, temp: false };
    this._lightControlCooldownUntil = 0;
    this._lightControlTimers = { brightness: null, color: null, temp: null };
    this._lightControlLastHaptic = { brightness: 0, color: 0, temp: 0 };

    // Bitcoin room widget (CoinGecko chart + Gemini report)
    this._bitcoinRunId = 0;
    this._bitcoinAbortController = null;
    this._bitcoinTypingTimer = null;
    this._bitcoinLivePriceTimer = null;
    this._bitcoinReportStarted = false;

    // Weather room widget (banner + Gemini report)
    this._weatherRunId = 0;
    this._weatherAbortController = null;
    this._weatherTypingTimer = null;
    this._weatherReportStarted = false;

    // News room widget (sources + Gemini summaries)
    this._newsRunId = 0;
    this._newsAbortController = null;
    this._newsTypingTimers = [];
    this._newsReportStarted = false;
    this._newsHourlyTimer = null;
    this._newsDailyTimer = null;
    this._newsHydratedFromCache = false;
    this._newsHourlyInFlight = false;
    this._newsDailyInFlight = false;
    this._newsBootstrapInFlight = false;
  }

  async _copyToClipboard(text) {
    const s = String(text || '');
    if (!s.trim()) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch (_e) {
      // fallback below
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = s;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (_e) {
      return false;
    }
  }

  setConfig(config) {
    if (!config.room) throw new Error('You need to define a room id');
    this._config = config;
  }

  connectedCallback() {
    this._enterKioskMode();
    // Ensure listeners are present on reconnect (belt-and-suspenders)
    if (this._rendered) {
      this._attachEventListeners();
      this._ensureBitcoinWidget({ reason: 'reconnect' });
      this._ensureWeatherWidget({ reason: 'reconnect' });
      this._ensureNewsWidget({ reason: 'reconnect' });
    }
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._roomsIndex || !this._roomConfig) {
      this._loadAndRender();
      return;
    }

    if (!this._rendered) {
      this._render();
      return;
    }

    this._updateStates();
  }

  get hass() {
    return this._hass;
  }

  async _loadAndRender() {
    if (this._loading) return;
    this._loading = true;

    if (!this._roomsIndex) {
      try {
        this._roomsIndex = await loadRoomsIndex();
      } catch (e) {
        console.error('[HueRoomScreen] Failed to load rooms index:', e);
        this._loading = false;
        return;
      }
    }

    const roomId = this._config.room;
    const roomEntry = getRoomFromIndex(this._roomsIndex, roomId);

    if (!roomEntry) {
      console.error('[HueRoomScreen] Room not found:', roomId);
      this._loading = false;
      return;
    }

    this._roomFile = roomEntry.room_file;

    if (!this._roomConfig) {
      try {
        this._roomConfig = await loadRoomConfig(roomEntry.room_file);
      } catch (e) {
        console.error('[HueRoomScreen] Failed to load room config:', e);
        this._loading = false;
        return;
      }
    }

    this._loading = false;
    this._render();
  }

  _render() {
    if (!this._hass || !this._roomConfig || !this._roomsIndex) return;

    this._teardownCameraFeeds();
    this._rendered = false;

    const dashboardPath = this._roomsIndex.dashboard_path || '/hue-ui';
    const roomName = this._roomConfig.name || 'Room';
    const anyOn = this._anyLightsOn();

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        <div class="hue-root">
          <div class="hue-background"></div>
          <div class="room-scroll">
            <div class="room-scroll-content">
              ${this._renderSections()}
            </div>
          </div>
          <div class="room-header-pinned">
            <div class="hue-header-bar" data-on="${anyOn ? 'true' : 'false'}">
              <div class="hue-header-left">
                <button class="hue-header-back" data-action="navigate" data-path="${escapeHtml(dashboardPath)}">&#8249;</button>
                <div class="hue-header-title">${escapeHtml(roomName)}</div>
              </div>
              <button class="hue-master-toggle" data-on="${anyOn}" data-action="toggle_room_lights">
                <ha-icon icon="mdi:power"></ha-icon>
              </button>
            </div>
          </div>
          <div class="widget-editor-overlay">
            <div class="widget-editor-modal">
              <div class="widget-editor-title">Edit widget</div>
              <input class="widget-editor-name" type="text" placeholder="Widget name" />
              <button class="widget-editor-btn" data-editor-action="rename_widget">Rename widget</button>
              <button class="widget-editor-btn" data-editor-action="remove_widget">Remove widget</button>
              <button class="widget-editor-btn" data-editor-action="hide_widget">Hide widget</button>
              <button class="widget-editor-btn widget-editor-scene-btn" data-editor-action="new_scene">New scene</button>
              <button class="widget-editor-btn" data-editor-action="add_widget">Add widget</button>
              <div class="widget-add-flow">
                <div class="widget-add-step">Choose class</div>
                <div class="widget-add-classes">
                  <button class="widget-editor-btn widget-class-btn" data-editor-class="lighting">Lighting</button>
                  <button class="widget-editor-btn widget-class-btn" data-editor-class="climate">Climate</button>
                  <button class="widget-editor-btn widget-class-btn" data-editor-class="devices">Devices</button>
                  <button class="widget-editor-btn widget-class-btn" data-editor-class="sensors">Sensors</button>
                  <button class="widget-editor-btn widget-class-btn" data-editor-class="mediaplayers">Mediaplayers</button>
                </div>
                <select class="widget-editor-entity-select"></select>
                <button class="widget-editor-btn" data-editor-action="add_widget_confirm">Add selected widget</button>
                <div class="widget-add-prompt">
                  <div class="widget-add-prompt-text"></div>
                  <div class="widget-add-prompt-actions">
                    <button class="widget-editor-btn" data-editor-action="add_widget_create_section">Create section</button>
                    <button class="widget-editor-btn cancel" data-editor-action="add_widget_abort">Cancel add</button>
                  </div>
                </div>
              </div>
              <button class="widget-editor-btn save" data-editor-action="save_widget">Save button</button>
              <button class="widget-editor-btn cancel" data-editor-action="cancel_widget">Cancel</button>
              <div class="widget-editor-status"></div>
            </div>
          </div>
          <div class="light-control-overlay">
            <div class="light-control-modal">
              <div class="light-control-head">
                <div class="light-control-title">Light</div>
                <button class="light-control-close" data-light-action="close" aria-label="Close">x</button>
              </div>
              <div class="light-control-power-row">
                <span class="light-control-power-label">Power</span>
                <button class="light-control-power-switch" role="switch" aria-checked="false" data-light-action="toggle-power">
                  <span class="light-control-power-switch-thumb"></span>
                </button>
              </div>
              <div class="light-control-group">
                <div class="light-control-label">${escapeHtml(t('Brightness', 'Brightness'))}</div>
                <input class="light-control-slider light-control-brightness" type="range" min="1" max="100" step="1" />
              </div>
              <div class="light-control-group light-control-color-group">
                <div class="light-control-label">Color</div>
                <input class="light-control-slider light-control-color" type="range" min="0" max="360" step="1" />
              </div>
              <div class="light-control-group light-control-temp-group">
                <div class="light-control-label">Warmth</div>
                <input class="light-control-slider light-control-temp" type="range" min="153" max="500" step="1" />
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
    this._wireCameraFeeds();
    void this._wireWebRtcCards();
    this._applyWidgetOverridesToDom();
    this._rendered = true;
    this._updateStates();
    this._ensureBitcoinWidget({ reason: 'render' });
    this._ensureWeatherWidget({ reason: 'render' });
    this._ensureNewsWidget({ reason: 'render' });
  }

  // ===== Section Rendering =====

  _renderSections() {
    const sections = this._roomConfig.sections || [];
    const blocks = [];

    if (this._roomConfig.scenes && this._roomConfig.scenes.length > 0) {
      blocks.push(this._renderScenesSection(this._roomConfig.scenes));
    }

    // Render sections in config order to allow rooms like "Voordeur" to put camera first.
    for (const section of sections) {
      if (!section || typeof section !== 'object') continue;
      const type = String(section.type || '').trim().toLowerCase();
      switch (type) {
        case 'news':
          blocks.push(this._renderNewsSection(section));
          break;
        case 'weather':
          blocks.push(this._renderWeatherSection(section));
          break;
        case 'bitcoin':
          blocks.push(this._renderBitcoinSection(section));
          break;
        case 'lighting':
          blocks.push(this._renderLightingSection(section));
          break;
        case 'climate':
          blocks.push(this._renderClimateSection(section));
          break;
        case 'camera':
          blocks.push(this._renderCameraSection(section));
          break;
        case 'webrtc':
          blocks.push(this._renderWebRtcSection(section));
          break;
        case 'devices':
          blocks.push(this._renderDevicesSection(section));
          break;
        case 'mediaplayers':
          blocks.push(this._renderMediaPlayersSection(section));
          break;
        case 'actions':
          blocks.push(this._renderActionsSection(section));
          break;
        default:
          break;
      }
    }

    if (this._roomConfig.sensors && this._roomConfig.sensors.length > 0) {
      blocks.push(this._renderSensorsSection(this._roomConfig.sensors));
    }

    return blocks.join('');
  }

  _renderScenesSection(scenes) {
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t('SCENES', 'SCENES'))}</span>
        </div>
        <div class="hue-scene-pager">
          ${renderScenesContent(this._hass, scenes)}
        </div>
      </div>
    `;
  }

  _renderBitcoinSection(section) {
    const title = String(section?.title || 'Bitcoin').toUpperCase();
    const content = renderBitcoinSection(section);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t(title, title))}</span>
        </div>
        ${content}
      </div>
    `;
  }

  _renderWeatherSection(section) {
    const title = String(section?.title || 'Weer').toUpperCase();
    const content = renderWeatherSection(section);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t(title, title))}</span>
        </div>
        ${content}
      </div>
    `;
  }

  _renderNewsSection(section) {
    const title = String(section?.title || 'Nieuws').toUpperCase();
    const content = renderNewsRoomSection(section);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t(title, title))}</span>
        </div>
        ${content}
      </div>
    `;
  }

  _renderLightingSection(section) {
    const lights = this._getLightsFromSection(section);
    if (lights.length === 0) return '';
    const pageSize = this._getLightingPageSize();
    const pages = [];
    for (let i = 0; i < lights.length; i += pageSize) {
      const chunk = lights.slice(i, i + pageSize);
      pages.push(`
        <div class="hue-light-page">
          <div class="hue-light-page-grid">
            ${renderLightingContent(this._hass, chunk)}
          </div>
        </div>
      `);
    }

    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t('LIGHTING', 'LIGHTING'))}</span>
        </div>
        <div class="hue-light-pager">
          ${pages.join('')}
        </div>
      </div>
    `;
  }

  _renderClimateSection(section) {
    const content = renderClimateContent(this._hass, section);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t('CLIMATE', 'CLIMATE'))}</span>
        </div>
        <div class="hue-tile-grid">
          ${content}
        </div>
      </div>
    `;
  }

  _renderDevicesSection(section) {
    const content = renderDevicesContent(this._hass, section);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t('DEVICES', 'DEVICES'))}</span>
        </div>
        <div class="hue-tile-grid">
          ${content}
        </div>
      </div>
    `;
  }

  _renderMediaPlayersSection(section) {
    const content = renderMediaPlayersContent(this._hass, section);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml((section.title || 'MediaPlayers').toUpperCase())}</span>
        </div>
        <div class="hue-tile-grid">
          ${content}
        </div>
      </div>
    `;
  }

  _renderCameraSection(section) {
    const entityId = section.entity || section.camera_entity || section.camera;
    if (!entityId) return '';

    const state = this._hass?.states?.[entityId];
    const available = !!state && state.state !== 'unavailable' && state.state !== 'unknown';
    const title = section.title || 'CAMERA';
    const cameraName = section.name || state?.attributes?.friendly_name || entityId.split('.')[1];
    const statusText = !available ? 'Unavailable' : 'Live';
    const streamUrl = this._cameraStreamUrl(entityId, state);
    const snapshotUrl = this._cameraSnapshotUrl(entityId, state);
    const refreshMs = Number.isFinite(Number(section.refresh_ms))
      ? Math.max(2000, Math.min(15000, Number(section.refresh_ms)))
      : 4500;
    const eager = section.eager === true || section.fetch_priority === 'high';
    const loadingAttr = eager ? 'eager' : 'lazy';
    const fetchPriorityAttr = eager ? 'high' : 'auto';

    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t(title.toUpperCase(), title.toUpperCase()))}</span>
        </div>
        <div class="hue-camera-card ${available ? '' : 'is-unavailable'}" data-action="more_info" data-entity="${escapeHtml(entityId)}">
          <div class="hue-camera-media">
            <img
              class="hue-camera-feed"
              src="${escapeHtml(this._withCacheBuster(snapshotUrl))}"
              alt="${escapeHtml(cameraName)}"
              loading="${loadingAttr}"
              fetchpriority="${fetchPriorityAttr}"
              data-live-src="${escapeHtml(streamUrl)}"
              data-snapshot-src="${escapeHtml(snapshotUrl)}"
              data-mode="snapshot"
              data-refresh-ms="${refreshMs}"
              data-entity="${escapeHtml(entityId)}"
            />
          </div>
          <div class="hue-camera-meta">
            <div class="hue-camera-name">${escapeHtml(cameraName)}</div>
            <div class="hue-camera-status">${escapeHtml(statusText)}</div>
          </div>
        </div>
      </div>
    `;
  }

  _renderWebRtcSection(section) {
    const entityId = section.entity || section.camera_entity || section.camera;
    if (!entityId) return '';
    const title = section.title || 'LIVE';
    const cardId = section.card_id || entityId;
    const wantTalk = section.two_way_audio === true || section.talk === true;
    const allowMic = wantTalk === true; // mic only when talk-toggle enables it

    // We mount the actual webrtc-camera card after render (needs card helpers + hass).
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(t(title.toUpperCase(), title.toUpperCase()))}</span>
        </div>
        <div class="hue-webrtc-host"
             data-webrtc="true"
             data-card-id="${escapeHtml(cardId)}"
             data-entity="${escapeHtml(entityId)}"
             data-allow-mic="${allowMic ? 'true' : 'false'}"></div>
      </div>
    `;
  }

  _renderActionsSection(section) {
    const content = renderActionsContent(this._hass, section);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml((section.title || 'Actions').toUpperCase())}</span>
        </div>
        <div class="hue-tile-grid">
          ${content}
        </div>
      </div>
    `;
  }

  _renderSensorsSection(sensors) {
    const content = renderSensorsContent(this._hass, sensors);
    if (!content) return '';
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">SENSORS</span>
        </div>
        <div class="hue-tile-grid">
          ${content}
        </div>
      </div>
    `;
  }

  // ===== Bitcoin (CoinGecko + Gemini) =====

  _cancelBitcoinJobs({ resetReport = false } = {}) {
    if (this._bitcoinAbortController) {
      try { this._bitcoinAbortController.abort(); } catch (_e) { /* ignore */ }
      this._bitcoinAbortController = null;
    }
    if (this._bitcoinTypingTimer) {
      clearInterval(this._bitcoinTypingTimer);
      this._bitcoinTypingTimer = null;
    }
    if (this._bitcoinLivePriceTimer) {
      clearInterval(this._bitcoinLivePriceTimer);
      this._bitcoinLivePriceTimer = null;
    }
    if (resetReport) {
      this._bitcoinReportStarted = false;
    }
  }

  _ensureBitcoinWidget({ reason = '' } = {}) {
    const widget = this.shadowRoot?.querySelector('.btc-widget');
    if (!widget) {
      this._cancelBitcoinJobs({ resetReport: true });
      return;
    }

    // Keep the live price fresh while this room is visible.
    if (!this._bitcoinLivePriceTimer) {
      const vs = String(widget.dataset.vs || 'usd').toLowerCase();
      this._bitcoinLivePriceTimer = setInterval(() => {
        void this._refreshBitcoinPriceOnly(widget, vs);
      }, 60 * 1000);
      void this._refreshBitcoinPriceOnly(widget, vs);
    }

    // Reports are prefetched in the background by Home Assistant automations and stored in /local/hue-ui/data/.
    // We render instantly (no typing animation) and never call Gemini from the browser.
    if (this._bitcoinReportStarted) return;
    this._bitcoinReportStarted = true;
    const mins = this._minutesSinceLocalMidnight();
    const slot = (mins >= (16 * 60 + 30)) ? 'pm' : 'am';
    const runId = ++this._bitcoinRunId;
    widget.dataset.btcSlot = slot;
    void this._loadBitcoinPrefetch(widget, runId, { reason, slot });
  }

  async _loadBitcoinPrefetch(widget, runId, { reason = '', slot = 'am' } = {}) {
    const reportEl = widget.querySelector('[data-role="btc-report"]');
    const caretEl = widget.querySelector('[data-role="btc-caret"]');
    const statusEl = widget.querySelector('[data-role="btc-report-status"]');
    const loadingEl = widget.querySelector('[data-role="btc-loading"]');
    if (caretEl) caretEl.style.display = 'none';
    if (reportEl) reportEl.textContent = '';
    if (loadingEl) loadingEl.classList.add('is-visible');
    if (statusEl) statusEl.textContent = `(${reason || 'open'}) Rapport laden…`;

    try {
      const file = slot === 'pm' ? 'btc_pm.json' : 'btc_am.json';
      const data = await this._fetchLocalJson(`/local/hue-ui/data/${file}`, { timeoutMs: 3000 });
      if (runId !== this._bitcoinRunId) return;

      const text = typeof data?.text === 'string' ? data.text : (typeof data?.report === 'string' ? data.report : '');
      const ts = Number(data?.ts);
      if (statusEl) {
        const when = Number.isFinite(ts) ? this._formatHhMm(ts) : this._formatHhMm(Date.now());
        statusEl.textContent = `Samenvatting (${slot === 'pm' ? 'middag' : 'ochtend'}) • bijgewerkt ${when}`;
      }
      if (reportEl) reportEl.textContent = this._normalizeBitcoinReportText(text || '') || 'Nog geen Bitcoin-rapport beschikbaar.';

      // If the prefetch includes chart points/stats, render them immediately (no CoinGecko call required).
      const points = Array.isArray(data?.points) ? data.points : (Array.isArray(data?.prices_12h) ? data.prices_12h : null);
      const vs = String(widget?.dataset?.vs || 'usd').toLowerCase();
      const currency = String(data?.currency || data?.vs || vs || 'USD').toUpperCase();
      if (Array.isArray(points) && points.length >= 2) {
        this._updateBitcoinChartFromPoints(widget, points, { currency, updatedAt: Number.isFinite(ts) ? ts : Date.now() });
      } else {
        // Fallback: fetch chart data once (no Gemini) if prefetch doesn't include points yet.
        void this._refreshBitcoinChartOnce(widget, runId, { vs, hours: 12, updatedAt: Number.isFinite(ts) ? ts : Date.now() });
      }
    } catch (e) {
      if (runId !== this._bitcoinRunId) return;
      if (statusEl) statusEl.textContent = 'Geen prefetched rapport gevonden.';
      if (reportEl) reportEl.textContent = 'Nog geen Bitcoin-rapport beschikbaar.';
      console.warn('[HueRoomScreen] BTC prefetch load failed:', e);
    } finally {
      if (loadingEl) loadingEl.classList.remove('is-visible');
      if (caretEl) caretEl.style.display = 'none';
    }
  }

  _updateBitcoinChartFromPoints(widget, points, { currency = 'USD', updatedAt = null } = {}) {
    if (!widget) return;
    const sliced = Array.isArray(points) ? points : [];
    const stats = computePriceStats(sliced);
    const price = Number.isFinite(stats?.end) ? stats.end : null;
    const priceState = {
      price,
      currency,
      updatedAt: Number.isFinite(Number(updatedAt)) ? Number(updatedAt) : (stats?.endTs || Date.now()),
    };
    this._updateBitcoinWidgetUi(widget, { priceState, sliced, stats, currency });
  }

  async _refreshBitcoinChartOnce(widget, runId, { vs = 'usd', hours = 12, updatedAt = null } = {}) {
    if (!widget || !this.shadowRoot?.contains(widget)) return;
    try {
      const chart = await fetchBtcMarketChart({ vsCurrency: vs, days: 1 });
      if (runId !== this._bitcoinRunId) return;
      const sliced = slicePricesLastHours(chart?.prices || [], hours, Date.now());
      const stats = computePriceStats(sliced);
      const currency = String(vs || 'USD').toUpperCase();
      const priceState = {
        price: Number.isFinite(stats?.end) ? stats.end : null,
        currency,
        updatedAt: Number.isFinite(Number(updatedAt)) ? Number(updatedAt) : (stats?.endTs || Date.now()),
      };
      this._updateBitcoinWidgetUi(widget, { priceState, sliced, stats, currency });
    } catch (e) {
      // Soft-fail; the report still shows.
      console.warn('[HueRoomScreen] BTC chart fetch failed:', e);
    }
  }

  _formatHhMm(tsMs) {
    if (!Number.isFinite(Number(tsMs))) return '--:--';
    const d = new Date(Number(tsMs));
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  _samplePriceTimeline(points, currency, maxLines = 13) {
    const list = Array.isArray(points) ? points : [];
    if (list.length === 0) return [];
    const max = Math.max(2, Math.min(maxLines, list.length));
    const step = Math.max(1, Math.floor(list.length / max));
    const out = [];
    for (let i = 0; i < list.length; i += step) {
      const [ts, price] = list[i];
      out.push(`${this._formatHhMm(ts)}  ${formatCurrency(price, currency, 0)}`);
    }
    const last = list[list.length - 1];
    const lastLine = `${this._formatHhMm(last[0])}  ${formatCurrency(last[1], currency, 0)}`;
    if (out[out.length - 1] !== lastLine) out.push(lastLine);
    return out.slice(0, maxLines);
  }

  async _runBitcoinFlow(widget, runId, reason) {
    const vs = String(widget?.dataset?.vs || 'usd').toLowerCase();
    const hours = Number(widget?.dataset?.hours || 12);
    const safeHours = Number.isFinite(hours) ? Math.max(1, Math.min(24, Math.round(hours))) : 12;
    const agentIdHint = String(widget?.dataset?.agentId || '').trim();

    const reportEl = widget.querySelector('[data-role="btc-report"]');
    const caretEl = widget.querySelector('[data-role="btc-caret"]');
    const statusEl = widget.querySelector('[data-role="btc-report-status"]');
    const loadingEl = widget.querySelector('[data-role="btc-loading"]');
    if (caretEl) caretEl.style.display = '';
    if (reportEl) reportEl.textContent = '';
    if (loadingEl) loadingEl.classList.add('is-visible');
    if (statusEl) statusEl.textContent = `(${reason || 'enter'}) Fetching BTC data...`;

    // Abort any previous in-flight network calls.
    if (this._bitcoinAbortController) {
      try { this._bitcoinAbortController.abort(); } catch (_e) { /* ignore */ }
    }
    const controller = new AbortController();
    this._bitcoinAbortController = controller;

    try {
      const [priceState, chart] = await Promise.all([
        fetchBtcPrice({ vsCurrency: vs, signal: controller.signal }),
        fetchBtcMarketChart({ vsCurrency: vs, days: 1, signal: controller.signal }),
      ]);
      if (runId !== this._bitcoinRunId) return;

      const sliced = slicePricesLastHours(chart.prices, safeHours, Date.now());
      const stats = computePriceStats(sliced);
      const currency = (priceState?.currency || vs.toUpperCase()).toUpperCase();

      this._updateBitcoinWidgetUi(widget, { priceState, sliced, stats, currency });

      if (statusEl) statusEl.textContent = 'Gemini verzamelt bronnen en schrijft het rapport...';
      const reportText = await this._generateBitcoinReport({
        stats,
        points: sliced,
        hours: safeHours,
        currency,
        agentIdHint,
      });
      if (runId !== this._bitcoinRunId) return;

      if (!reportText) {
        if (statusEl) statusEl.textContent = 'Gemini gaf geen tekst terug.';
        if (caretEl) caretEl.style.display = 'none';
        if (loadingEl) loadingEl.classList.remove('is-visible');
        return;
      }

      if (statusEl) statusEl.textContent = `Rapport klaar om ${this._formatHhMm(Date.now())}`;
      if (loadingEl) loadingEl.classList.remove('is-visible');
      this._typeBitcoinReport(reportEl, caretEl, reportText, runId);

      // Cache the generated report for this slot.
      const slot = String(widget?.dataset?.btcSlot || '').trim();
      if (slot === 'am' || slot === 'pm') {
        const cacheKey = 'hue-ui-cache:btc:v1';
        const cache = this._lsGetJson(cacheKey) || {};
        cache[slot] = { ts: Date.now(), text: String(reportText || '') };
        this._lsSetJson(cacheKey, cache);
      }
    } catch (e) {
      if (runId !== this._bitcoinRunId) return;
      console.warn('[HueRoomScreen] Bitcoin widget failed:', e);
      if (statusEl) statusEl.textContent = `Mislukt: ${String(e?.message || e)}`;
      if (reportEl) reportEl.textContent = 'Kon geen rapport maken.';
      if (caretEl) caretEl.style.display = 'none';
      if (loadingEl) loadingEl.classList.remove('is-visible');
    } finally {
      if (this._bitcoinAbortController === controller) {
        this._bitcoinAbortController = null;
      }
    }
  }

  _updateBitcoinWidgetUi(widget, { priceState, sliced, stats, currency }) {
    if (!widget) return;
    const priceEl = widget.querySelector('[data-role="btc-price"]');
    const changeEl = widget.querySelector('[data-role="btc-change"]');
    const updatedEl = widget.querySelector('[data-role="btc-updated"]');
    const chartEl = widget.querySelector('[data-role="btc-chart"]');
    const lowEl = widget.querySelector('[data-role="btc-low"]');
    const highEl = widget.querySelector('[data-role="btc-high"]');

    const price = Number.isFinite(priceState?.price) ? priceState.price : stats?.end;
    if (priceEl) priceEl.textContent = formatCurrency(price, currency, 0);

    const changePct = stats?.changePct;
    if (changeEl) {
      changeEl.textContent = Number.isFinite(changePct) ? formatPercent(changePct, 2) : '--';
      changeEl.classList.toggle('is-up', Number.isFinite(changePct) && changePct >= 0);
      changeEl.classList.toggle('is-down', Number.isFinite(changePct) && changePct < 0);
    }

    const updatedAt = Number.isFinite(priceState?.updatedAt) ? priceState.updatedAt : stats?.endTs;
    if (updatedEl) updatedEl.textContent = `Updated ${this._formatHhMm(updatedAt)}`;

    if (chartEl) {
      chartEl.innerHTML = renderSparklineSvg(sliced, { width: 100, height: 44, padding: 3 });
    }

    if (lowEl) {
      const min = stats?.min;
      lowEl.textContent = Number.isFinite(min)
        ? `Low ${formatCurrency(min, currency, 0)} @ ${this._formatHhMm(stats?.minTs)}`
        : 'Low --';
    }
    if (highEl) {
      const max = stats?.max;
      highEl.textContent = Number.isFinite(max)
        ? `High ${formatCurrency(max, currency, 0)} @ ${this._formatHhMm(stats?.maxTs)}`
        : 'High --';
    }
  }

  async _refreshBitcoinPriceOnly(widget, vs) {
    if (!widget || !this.shadowRoot?.contains(widget)) return;
    try {
      const priceState = await fetchBtcPrice({ vsCurrency: vs });
      const currency = (priceState?.currency || vs.toUpperCase()).toUpperCase();
      const priceEl = widget.querySelector('[data-role="btc-price"]');
      const updatedEl = widget.querySelector('[data-role="btc-updated"]');
      if (priceEl && Number.isFinite(priceState?.price)) {
        priceEl.textContent = formatCurrency(priceState.price, currency, 0);
      }
      if (updatedEl && Number.isFinite(priceState?.updatedAt)) {
        updatedEl.textContent = `Updated ${this._formatHhMm(priceState.updatedAt)}`;
      }
    } catch (e) {
      // Soft-fail; don't spam UI.
      console.warn('[HueRoomScreen] Bitcoin price refresh failed:', e);
    }
  }

  async _pickConversationAgentId(agentIdHint = '') {
    const hint = String(agentIdHint || '').trim();
    if (hint) return hint;

    // Prefer the known HA Gemini agent (Google Generative AI integration).
    // Listing agents via WS is not always available, and auto-picking can land on the
    // Home Assistant agent (which may interpret URLs/words as device names).
    const hass = this._hass;
    const geminiAgentId = 'conversation.google_ai_conversation';
    if (hass?.states?.[geminiAgentId]) return geminiAgentId;
    return '';
  }

  async _fetchFearGreedIndex() {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=1&format=json', { method: 'GET', mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const row = Array.isArray(data?.data) ? data.data[0] : null;
      const value = Number(row?.value);
      const classification = String(row?.value_classification || '').trim();
      const tsSec = Number(row?.timestamp);
      return {
        value: Number.isFinite(value) ? value : null,
        classification,
        timestamp: Number.isFinite(tsSec) ? tsSec * 1000 : null,
        source: 'Alternative (Fear & Greed)',
      };
    } catch (e) {
      console.warn('[HueRoomScreen] Fear & Greed fetch failed:', e);
      return null;
    }
  }

  _stripConversationWrapping(text) {
    let s = String(text || '').trim();
    if (!s) return '';
    // Remove common markdown fences that some agents add even when asked not to.
    s = s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    // Some agents prefix with "JSON:" etc.
    s = s.replace(/^\s*json\s*:\s*/i, '');
    return s.trim();
  }

  _safeLocalStorage() {
    try { return window?.localStorage || null; } catch (_e) { return null; }
  }

  _lsGetJson(key) {
    const storage = this._safeLocalStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(String(key));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  _lsSetJson(key, value) {
    const storage = this._safeLocalStorage();
    if (!storage) return false;
    try {
      storage.setItem(String(key), JSON.stringify(value));
      return true;
    } catch (_e) {
      return false;
    }
  }

  _startOfLocalDayMs(tsMs) {
    const d = new Date(Number(tsMs) || Date.now());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  _minutesSinceLocalMidnight() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  _safeJsonParseObject(text) {
    const s = this._stripConversationWrapping(text);
    if (!s) return null;
    // Try full parse first.
    try {
      const obj = JSON.parse(s);
      return (obj && typeof obj === 'object') ? obj : null;
    } catch (_e) {
      // Fallback: extract the first {...} block.
      const a = s.indexOf('{');
      const b = s.lastIndexOf('}');
      if (a >= 0 && b > a) {
        try {
          const obj = JSON.parse(s.slice(a, b + 1));
          return (obj && typeof obj === 'object') ? obj : null;
        } catch (_e2) {
          return null;
        }
      }
      return null;
    }
  }

  _sanitizeBitcoinReportText(s) {
    let t = String(s || '');
    if (!t.trim()) return '';
    // Kill URLs and URL-like fragments. Covers "https://", "http://", "https//" (missing colon), "www.".
    t = t.replace(/\bhttps?:\/\/\S+/gi, '');
    t = t.replace(/\bhttps\/\/\S+/gi, '');
    t = t.replace(/\bwww\.\S+/gi, '');
    // Remove (domain.tld/...) even without scheme.
    t = t.replace(/\((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^)]*)?\)/gi, '');
    // Remove bare domains like "example.com" (avoid "links" in the rendered text).
    t = t.replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, '');
    // Remove markdown-ish markers.
    t = t.replace(/\*\*/g, '');
    t = t.replace(/`{1,3}/g, '');
    t = t.replace(/^\s*#+\s*/gm, '');
    // Normalize bullets (we will add bullets ourselves).
    t = t.replace(/^\s*[•\*\-]\s+/gm, '');
    // Trim spaces, collapse internal runs.
    t = t.split('\n').map((line) => line.replace(/\s+$/g, '')).join('\n');
    t = t.replace(/[ \t]{2,}/g, ' ');
    t = t.replace(/\(\s*\)/g, '');
    return t.trim();
  }

  _formatBitcoinReportFromJson(obj) {
    const headline = this._sanitizeBitcoinReportText(obj?.headline).replace(/\n+/g, ' ').trim();
    const lead = this._sanitizeBitcoinReportText(obj?.lead).replace(/\n{3,}/g, '\n\n').trim();
    const wat = this._sanitizeBitcoinReportText(obj?.wat_speelde_er).replace(/\n{3,}/g, '\n\n').trim();
    const vooruitblik = this._sanitizeBitcoinReportText(obj?.vooruitblik).replace(/\n{3,}/g, '\n\n').trim();
    const disclaimer = this._sanitizeBitcoinReportText(obj?.disclaimer).replace(/\n+/g, ' ').trim();

    const cijfersRaw = Array.isArray(obj?.in_cijfers) ? obj.in_cijfers : [];
    const cijfers = cijfersRaw
      .filter((v) => typeof v === 'string' && v.trim())
      .map((v) => this._sanitizeBitcoinReportText(v).replace(/\n+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 3);

    const out = [];
    if (headline) out.push(headline);
    if (lead) { out.push(''); out.push(lead); }
    out.push('');
    out.push('In cijfers');
    if (cijfers.length) {
      for (const c of cijfers) out.push(`• ${c}`);
    } else {
      out.push('• --');
    }
    if (wat) { out.push(''); out.push(wat); }
    if (vooruitblik) { out.push(''); out.push(vooruitblik); }
    if (disclaimer) { out.push(''); out.push(disclaimer); }
    return out.join('\n').trim();
  }

  async _generateBitcoinReport({ stats, points, hours, currency, agentIdHint }) {
    if (!stats || !Array.isArray(points) || points.length < 2) {
      return 'Not enough price data to generate a report.';
    }

    const startTime = this._formatHhMm(stats.startTs);
    const endTime = this._formatHhMm(stats.endTs);
    const rangePct = (Number.isFinite(stats.start) && stats.start !== 0 && Number.isFinite(stats.max) && Number.isFinite(stats.min))
      ? ((stats.max - stats.min) / stats.start) * 100
      : null;

    const localNow = new Date();
    const localDay = localNow.toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const localTime = localNow.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    const dayNote = `Het is nu ${localDay} ${localTime} (Europe/Amsterdam).`;

    // Internet sources (headlines + sentiment proxy).
    const [news, fng] = await Promise.all([
      fetchCryptoCompareNews({ lang: 'EN', hours, maxItems: 8 }),
      this._fetchFearGreedIndex(),
    ]);

    const newsItems = (news || []).map((n) => ({
      when: n?.published_on ? this._formatHhMm(n.published_on) : '--:--',
      source: String(n?.source || 'Bron').trim(),
      title: String(n?.title || '').trim(),
    })).filter((n) => n.title);

    const agentId = await this._pickConversationAgentId(agentIdHint);

    const context = {
      now_local: `${localDay} ${localTime}`,
      timezone_note: 'Europe/Amsterdam',
      currency: String(currency || 'USD'),
      window_hours: Number(hours) || 12,
      price: {
        start_time: startTime,
        end_time: endTime,
        start: formatCurrency(stats.start, currency, 0),
        end: formatCurrency(stats.end, currency, 0),
        change_pct: Number.isFinite(stats.changePct) ? formatPercent(stats.changePct, 2) : '--',
        low: formatCurrency(stats.min, currency, 0),
        low_time: this._formatHhMm(stats.minTs),
        high: formatCurrency(stats.max, currency, 0),
        high_time: this._formatHhMm(stats.maxTs),
        range_pct: Number.isFinite(rangePct) ? formatPercent(rangePct, 2) : '--',
      },
      sentiment: (fng && (fng.value != null || fng.classification))
        ? { fear_greed_value: fng.value != null ? fng.value : null, classification: fng.classification || '' }
        : null,
      headlines: newsItems.slice(0, 4),
      sources_note: 'Koppen: CryptoCompare. Sentiment: Alternative (Fear & Greed).',
    };

    const prompt = [
      `Je bent redacteur van een krant. Schrijf een kort Bitcoin-bericht (BTC/${currency}) in het Nederlands.`,
      `Periode: laatste ${hours} uur + verwachting komende 12 uur.`,
      dayNote,
      '',
      'Output-regels (strict):',
      '- Return ALLEEN geldige JSON. Geen markdown. Geen extra tekst.',
      '- Geen links, geen URLs, geen domeinen. Dus ook geen "(https...)" of "www...".',
      '- Geen bronlijst. Je mag bronnen wel als NAAM noemen in een zin (bijv. "CryptoCompare", "CoinDesk"), zonder link.',
      '- Toon "In cijfers" als array met MAX 3 korte items (geen bullet tekens in de strings).',
      '- Verder alleen alinea’s (korte paragrafen, goed leesbaar).',
      '- Wees eerlijk en nuchter: geen absolute claims. Als het onzeker is, benoem dat.',
      '- Context zondag: Bitcoin handelt 24/7, maar weekend-liquiditeit kan anders zijn. Benoem dat traditionele markten pas maandag weer open zijn.',
      '- Toon ook risico’s en wat tegen kan vallen (neutraal, serieuze belegger; geen hype/“moon” taal).',
      '',
      'Schema van de JSON (exact deze keys):',
      '{',
      '  "headline": "1 zin",',
      '  "lead": "2 zinnen",',
      '  "in_cijfers": ["item1", "item2", "item3"],',
      '  "wat_speelde_er": "1 alinea",',
      '  "vooruitblik": "1 alinea",',
      '  "disclaimer": "1 zin"',
      '}',
      '',
      'Context (gebruik dit, maar herhaal geen lijsten/ruwe data):',
      JSON.stringify(context),
    ].join('\n');

    const result = await this._conversationProcess(prompt, agentId);
    const raw = this._extractConversationText(result);
    const obj = this._safeJsonParseObject(raw);
    if (obj) {
      return this._formatBitcoinReportFromJson(obj);
    }
    return this._normalizeBitcoinReportText(raw);
  }

  async _conversationProcess(text, agentId) {
    const hass = this._hass;
    if (!hass) throw new Error('Home Assistant (hass) is not available');

    const payload = { text, language: 'nl' };
    const agent = String(agentId || '').trim();
    if (agent) payload.agent_id = agent;

    if (typeof hass.callApi === 'function') {
      return hass.callApi('POST', 'conversation/process', payload);
    }
    if (typeof hass.callWS === 'function') {
      return hass.callWS({ type: 'conversation/process', ...payload });
    }

    const token = hass?.auth?.data?.access_token;
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;

    const res = await fetch('/api/conversation/process', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} calling /api/conversation/process`);
    return res.json();
  }

  _extractConversationText(result) {
    const candidates = [
      result?.response?.speech?.plain?.speech,
      result?.response?.speech?.plain,
      result?.response?.speech?.speech,
      result?.response?.speech,
      result?.response?.text,
      result?.speech,
      result?.text,
    ];

    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c.trim();
      if (Array.isArray(c)) {
        const joined = c.filter((v) => typeof v === 'string').join('\n').trim();
        if (joined) return joined;
      }
    }
    return '';
  }

  _normalizeBitcoinReportText(text) {
    let s = String(text || '');
    if (!s.trim()) return '';

    s = this._sanitizeBitcoinReportText(s);
    // Replace leading markdown bullets with a clean bullet (only if present).
    s = s.replace(/^\s*[\*\-]\s+/gm, '• ');
    // Collapse excessive blank lines.
    s = s.replace(/\n{4,}/g, '\n\n\n');
    return s.trim();
  }

  _typeBitcoinReport(reportEl, caretEl, text, runId) {
    if (!reportEl) return;
    if (this._bitcoinTypingTimer) {
      clearInterval(this._bitcoinTypingTimer);
      this._bitcoinTypingTimer = null;
    }

    const full = this._normalizeBitcoinReportText(text);
    const total = full.length;
    if (total === 0) {
      if (caretEl) caretEl.style.display = 'none';
      return;
    }

    if (caretEl) caretEl.style.display = '';
    reportEl.textContent = '';

    const chunk = total > 5000 ? 14 : total > 2500 ? 10 : total > 1400 ? 6 : total > 800 ? 3 : 1;
    let i = 0;
    this._bitcoinTypingTimer = setInterval(() => {
      if (runId !== this._bitcoinRunId) {
        clearInterval(this._bitcoinTypingTimer);
        this._bitcoinTypingTimer = null;
        return;
      }

      i = Math.min(total, i + chunk);
      reportEl.textContent = full.slice(0, i);
      if (i >= total) {
        clearInterval(this._bitcoinTypingTimer);
        this._bitcoinTypingTimer = null;
        if (caretEl) caretEl.style.display = 'none';
      }
    }, 22);
  }

  // ===== Weather (Buienradar + Gemini) =====

  _cancelWeatherJobs({ resetReport = false } = {}) {
    if (this._weatherAbortController) {
      try { this._weatherAbortController.abort(); } catch (_e) { /* ignore */ }
      this._weatherAbortController = null;
    }
    if (this._weatherTypingTimer) {
      clearInterval(this._weatherTypingTimer);
      this._weatherTypingTimer = null;
    }
    if (resetReport) {
      this._weatherReportStarted = false;
    }
  }

  _ensureWeatherWidget({ reason = '' } = {}) {
    const widget = this.shadowRoot?.querySelector('.wx-widget');
    if (!widget) {
      this._cancelWeatherJobs({ resetReport: true });
      return;
    }

    // Reports are prefetched in the background by Home Assistant automations and stored in /local/hue-ui/data/.
    // Render instantly (no typing animation) and never call Gemini from the browser.
    if (this._weatherReportStarted) return;
    this._weatherReportStarted = true;

    const mins = this._minutesSinceLocalMidnight();
    const slot = (mins >= (12 * 60)) ? 'midday' : 'morning';
    widget.dataset.wxSlot = slot;
    const runId = ++this._weatherRunId;
    void this._loadWeatherPrefetch(widget, runId, { reason, slot });
  }

  async _loadWeatherPrefetch(widget, runId, { reason = '', slot = 'morning' } = {}) {
    const reportEl = widget.querySelector('[data-role="wx-report"]');
    const caretEl = widget.querySelector('[data-role="wx-caret"]');
    const statusEl = widget.querySelector('[data-role="wx-status"]');
    const loadingEl = widget.querySelector('[data-role="wx-loading"]');
    if (caretEl) caretEl.style.display = 'none';
    if (reportEl) reportEl.textContent = '';
    if (loadingEl) loadingEl.classList.add('is-visible');

    this._updateWeatherBanner(widget);
    if (statusEl) statusEl.textContent = `(${reason || 'open'}) Weerbericht laden…`;

    try {
      const file = slot === 'midday' ? 'weather_midday.json' : 'weather_morning.json';
      const data = await this._fetchLocalJson(`/local/hue-ui/data/${file}`, { timeoutMs: 3000 });
      if (runId !== this._weatherRunId) return;

      // Preferred format: either "text" or the structured JSON keys used by _formatWeatherReportFromJson().
      const text = typeof data?.text === 'string'
        ? data.text
        : this._formatWeatherReportFromJson(data || {});

      const ts = Number(data?.ts);
      const when = Number.isFinite(ts) ? this._formatHhMm(ts) : this._formatHhMm(Date.now());
      if (statusEl) statusEl.textContent = `Weerbericht (${slot === 'midday' ? 'middag' : 'ochtend'}) • bijgewerkt ${when}`;

      if (reportEl) reportEl.textContent = this._normalizeBitcoinReportText(text || '') || 'Nog geen weerbericht beschikbaar.';
      // Prefer the prefetched current/window data so the banner reflects reality even if the HA weather entity is missing.
      this._updateWeatherBanner(widget, data);
    } catch (e) {
      if (runId !== this._weatherRunId) return;
      if (statusEl) statusEl.textContent = 'Geen prefetched weerbericht gevonden.';
      if (reportEl) reportEl.textContent = 'Nog geen weerbericht beschikbaar.';
      console.warn('[HueRoomScreen] Weather prefetch load failed:', e);
    } finally {
      if (loadingEl) loadingEl.classList.remove('is-visible');
      if (caretEl) caretEl.style.display = 'none';
    }
  }

  // ===== News (Sources + Gemini) =====

  _cancelNewsJobs({ resetReport = false } = {}) {
    if (this._newsAbortController) {
      try { this._newsAbortController.abort(); } catch (_e) { /* ignore */ }
      this._newsAbortController = null;
    }
    if (this._newsHourlyTimer) {
      try { clearInterval(this._newsHourlyTimer); } catch (_e) { /* ignore */ }
      this._newsHourlyTimer = null;
    }
    if (this._newsDailyTimer) {
      try { clearInterval(this._newsDailyTimer); } catch (_e) { /* ignore */ }
      this._newsDailyTimer = null;
    }
    const timers = Array.isArray(this._newsTypingTimers) ? this._newsTypingTimers : [];
    for (const t of timers) {
      try { clearInterval(t); } catch (_e) { /* ignore */ }
    }
    this._newsTypingTimers = [];
    if (resetReport) {
      this._newsReportStarted = false;
      this._newsHydratedFromCache = false;
    }
  }

  _ensureNewsWidget({ reason = '' } = {}) {
    const widget = this.shadowRoot?.querySelector('.newsr-widget');
    if (!widget) {
      this._cancelNewsJobs({ resetReport: true });
      return;
    }

    // News is prefetched in the background by Home Assistant automations and stored in /local/hue-ui/data/news.json.
    // Render instantly (no typing animation) and never call Gemini from the browser.
    if (this._newsReportStarted) return;
    this._newsReportStarted = true;
    const runId = ++this._newsRunId;
    void this._loadNewsPrefetch(widget, runId, { reason });
  }

  async _loadNewsPrefetch(widget, runId, { reason = '' } = {}) {
    const loadingEl = widget.querySelector('[data-role="newsr-loading"]');
    const statusEl = widget.querySelector('[data-role="newsr-status"]');
    if (loadingEl) loadingEl.classList.add('is-visible');
    if (statusEl) statusEl.textContent = `(${reason || 'open'}) Nieuws laden…`;

    try {
      const data = await this._fetchLocalJson('/local/hue-ui/data/news.json', { timeoutMs: 3500 });
      if (runId !== this._newsRunId) return;
      if (data && (Array.isArray(data.local) || Array.isArray(data.national))) {
        this._fillNewsRoomUiFromCache(widget, data, { animate: false });
        this._newsHydratedFromCache = true;
      } else {
        if (statusEl) statusEl.textContent = 'Geen nieuwsdata gevonden.';
      }
    } catch (e) {
      if (runId !== this._newsRunId) return;
      console.warn('[HueRoomScreen] News prefetch load failed:', e);
      if (statusEl) statusEl.textContent = 'Geen prefetched nieuws gevonden.';
    } finally {
      if (loadingEl) loadingEl.classList.remove('is-visible');
    }
  }

  _normalizeNewsItemForCache(it, summaryObj) {
    const headline = this._sanitizeNewsTextNoLinks(summaryObj?.headline || it?.title || '—');
    const summary = this._sanitizeNewsTextNoLinks(summaryObj?.summary || '');
    return {
      headline,
      summary,
      url: String(it?.url || '').trim(),
      source: String(it?.source || '').trim(),
      publishedMs: Number.isFinite(Number(it?.publishedMs)) ? Number(it.publishedMs) : null,
    };
  }

  _fillNewsRoomUiFromCache(widget, cache, { animate = true } = {}) {
    if (!widget) return;
    const titleEl = widget.querySelector('[data-role="newsr-title"]');
    const subtitleEl = widget.querySelector('[data-role="newsr-subtitle"]');
    const stampEl = widget.querySelector('[data-role="newsr-datestamp"]');
    const agendaEl = widget.querySelector('[data-role="newsr-agenda"]');
    const permitsEl = widget.querySelector('[data-role="newsr-permits"]');
    const loadingEl = widget.querySelector('[data-role="newsr-loading"]');
    const statusEl = widget.querySelector('[data-role="newsr-status"]');

    if (loadingEl) loadingEl.classList.remove('is-visible');
    if (titleEl) titleEl.textContent = this._sanitizeNewsTextNoLinks(cache?.title || 'Weekkrantje');
    if (subtitleEl) subtitleEl.textContent = this._sanitizeNewsTextNoLinks(cache?.subtitle || 'Dit is het nieuws van deze week');
    if (stampEl) {
      const ts = Number(cache?.ts);
      stampEl.textContent = Number.isFinite(ts)
        ? new Date(ts).toLocaleString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
    }
    if (agendaEl) agendaEl.textContent = this._sanitizeNewsTextNoLinks(cache?.agenda_paragraph || '') || 'Geen open dagen of informatieavonden die er deze week uitspringen.';
    if (permitsEl) permitsEl.textContent = this._sanitizeNewsTextNoLinks(cache?.permits_paragraph || '') || 'Geen opvallende bouw- of vergunningupdates deze week.';

    const localSlots = Array.from(widget.querySelectorAll('.newsr-item[data-kind="local"]')) || [];
    const natSlots = Array.from(widget.querySelectorAll('.newsr-item[data-kind="national"]')) || [];

    const setSlot = (slotEl, item, { shouldType } = {}) => {
      const headlineEl = slotEl.querySelector('[data-role="newsr-headline"]');
      const summaryEl = slotEl.querySelector('[data-role="newsr-summary"]');
      const caretEl = slotEl.querySelector('[data-role="newsr-caret"]');
      const sourceEl = slotEl.querySelector('[data-role="newsr-source"]');
      const whenEl = slotEl.querySelector('[data-role="newsr-when"]');
      const linkEl = slotEl.querySelector('[data-role="newsr-link"]');
      const copyBtn = slotEl.querySelector('[data-news-action="copy"]');

      const headline = this._sanitizeNewsTextNoLinks(item?.headline || '—');
      const summary = this._sanitizeNewsTextNoLinks(item?.summary || '');
      if (headlineEl) headlineEl.textContent = headline;
      if (summaryEl) summaryEl.textContent = '';
      if (caretEl) caretEl.style.display = '';

      if (sourceEl) sourceEl.textContent = String(item?.source || '—').trim() || '—';
      if (whenEl) whenEl.textContent = this._formatWhenShort(item?.publishedMs);

      const url = String(item?.url || '').trim();
      if (linkEl) {
        linkEl.href = url || '#';
        linkEl.style.pointerEvents = url ? 'auto' : 'none';
        linkEl.style.opacity = url ? '1' : '0.4';
      }

      slotEl.dataset.url = url || '';
      slotEl.dataset.headline = headline;
      slotEl.dataset.summary = summary;
      if (copyBtn) copyBtn.dataset.copyReady = 'true';

      if (shouldType) {
        this._typeNewsText(summaryEl, caretEl, summary, this._newsRunId);
      } else {
        if (summaryEl) summaryEl.textContent = summary;
        if (caretEl) caretEl.style.display = 'none';
      }
    };

    const local = Array.isArray(cache?.local) ? cache.local : [];
    const national = Array.isArray(cache?.national) ? cache.national : [];
    const animateUrls = (cache && cache._animate_urls && Array.isArray(cache._animate_urls))
      ? new Set(cache._animate_urls.map((u) => String(u || '').trim()).filter(Boolean))
      : null;
    const allowTyping = !!animate;

    for (let i = 0; i < localSlots.length; i += 1) {
      const item = local[i] || {};
      const u = String(item?.url || '').trim();
      const shouldType = allowTyping && (!animateUrls || (u && animateUrls.has(u)));
      setSlot(localSlots[i], item, { shouldType });
    }
    for (let i = 0; i < natSlots.length; i += 1) {
      const item = national[i] || {};
      const u = String(item?.url || '').trim();
      const shouldType = allowTyping && (!animateUrls || (u && animateUrls.has(u)));
      setSlot(natSlots[i], item, { shouldType });
    }

    if (statusEl) statusEl.textContent = cache?.status || 'Gereed';
  }

  async _newsFetchCandidates({ signal } = {}) {
    const controller = { signal: signal || new AbortController().signal };
    const fetchStep = async (label, fn, timeoutMs) => {
      const sub = new AbortController();
      const onAbort = () => { try { sub.abort(); } catch (_e) { /* ignore */ } };
      controller.signal.addEventListener('abort', onAbort, { once: true });
      const t = setTimeout(() => { try { sub.abort(); } catch (_e) { /* ignore */ } }, Math.max(500, Number(timeoutMs) || 3500));
      try { return await fn(sub.signal); } catch (_e) { return []; } finally {
        clearTimeout(t);
        try { controller.signal.removeEventListener('abort', onAbort); } catch (_e) { /* ignore */ }
      }
    };

    const krantje = await fetchStep('Het Krantje', (s) => this._fetchHetKrantjeHome({ signal: s }), 4500);
    const lv = await fetchStep('LV.nl', (s) => this._fetchLvRss({ signal: s }), 4000);
    const google = await fetchStep('Google Nieuws', (s) => this._fetchGoogleNewsLv({ signal: s }), 3000);
    const nu = await fetchStep('NU.nl', (s) => this._fetchNuRss({ signal: s }), 4000);

    const allLocal = [].concat(lv || []).concat(krantje || []).concat(google || []).filter((it) => it && it.url);
    const localWeek = this._pickWeekItems(allLocal, 30);
    const localAgenda = localWeek.filter((it) => this._isAgendaOrEvent(it));
    const localPermits = localWeek.filter((it) => !this._isAgendaOrEvent(it) && this._isPermitOrBuild(it));
    const localRegular = localWeek.filter((it) => !this._isAgendaOrEvent(it) && !this._isPermitOrBuild(it));
    const nationalWeek = this._pickWeekItems(nu || [], 30, { mustHaveDate: true });

    return {
      localRegular,
      nationalWeek,
      agendaTitles: localAgenda.slice(0, 10).map((x) => x.title),
      permitTitles: localPermits.slice(0, 10).map((x) => x.title),
    };
  }

  async _newsSummarizeItems(items) {
    const list = (Array.isArray(items) ? items : []).slice(0, 2).map((it) => ({
      title: String(it?.title || '').trim().slice(0, 140),
      source: String(it?.source || '').trim().slice(0, 30),
    }));
    if (!list.length) return [];

    const now = new Date();
    const stamp = now.toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long' });

    const prompt = [
      `Schrijf 2-3 zinnen per nieuwsitem in krant-stijl. Datum: ${stamp}.`,
      'Output-regels (strict):',
      '- Return ALLEEN geldige JSON. Geen markdown. Geen extra tekst.',
      '- Geen links/URLs/domeinen.',
      '- Geen oorlog/overlijden/geweld/zeer negatief nieuws; als het item negatief is, maak de summary leeg.',
      '',
      'Schema:',
      '{ "items": [ { "headline":"", "summary":"" } ] }',
      '',
      'Input items:',
      JSON.stringify(list),
    ].join('\n');

    const agentId = await this._pickConversationAgentId('');
    const result = await this._conversationProcess(prompt, agentId);
    const raw = this._extractConversationText(result);
    const obj = this._safeJsonParseObject(raw);
    const out = Array.isArray(obj?.items) ? obj.items : [];
    return out.slice(0, list.length);
  }

  async _newsSummarizeExtras({ agendaTitles, permitTitles }) {
    const agenda = (Array.isArray(agendaTitles) ? agendaTitles : []).slice(0, 8).map((s) => String(s || '').trim().slice(0, 120)).filter(Boolean);
    const permits = (Array.isArray(permitTitles) ? permitTitles : []).slice(0, 8).map((s) => String(s || '').trim().slice(0, 120)).filter(Boolean);

    const prompt = [
      'Schrijf twee korte alinea’s voor onderaan een lokale weekkrant.',
      'Output-regels (strict):',
      '- Return ALLEEN geldige JSON. Geen markdown. Geen extra tekst.',
      '- Geen links/URLs/domeinen.',
      '',
      'Schema:',
      '{ "agenda_paragraph": "", "permits_paragraph": "" }',
      '',
      'Agenda titels:',
      JSON.stringify(agenda),
      '',
      'Bouwen/vergunning titels:',
      JSON.stringify(permits),
    ].join('\n');

    const agentId = await this._pickConversationAgentId('');
    const result = await this._conversationProcess(prompt, agentId);
    const raw = this._extractConversationText(result);
    const obj = this._safeJsonParseObject(raw) || {};
    return {
      agenda_paragraph: this._sanitizeNewsTextNoLinks(obj?.agenda_paragraph || ''),
      permits_paragraph: this._sanitizeNewsTextNoLinks(obj?.permits_paragraph || ''),
    };
  }

  _newsSlotKeyHourly() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`;
  }

  async _newsMaybeRunDaily() {
    if (this._newsDailyInFlight) return;
    const now = Date.now();
    const mins = this._minutesSinceLocalMidnight();
    const after = (7 * 60 + 5);
    if (mins < after) return;

    const cacheKey = 'hue-ui-cache:news:v2';
    const cache = this._lsGetJson(cacheKey) || {};
    const dayMs = this._startOfLocalDayMs(now);
    if (Number(cache?.daily_day_ms) === dayMs) return;

    this._newsDailyInFlight = true;
    try {
      const widget = this.shadowRoot?.querySelector('.newsr-widget');
      const statusEl = widget?.querySelector?.('[data-role="newsr-status"]');
      if (statusEl) statusEl.textContent = 'Dagupdate: agenda & vergunningen…';

      const candidates = await this._newsFetchCandidates({});
      const extras = await this._newsSummarizeExtras(candidates);

      cache.daily_day_ms = dayMs;
      cache.agenda_paragraph = extras.agenda_paragraph || cache.agenda_paragraph || '';
      cache.permits_paragraph = extras.permits_paragraph || cache.permits_paragraph || '';
      cache.ts = Date.now();
      this._lsSetJson(cacheKey, cache);

      if (widget) this._fillNewsRoomUiFromCache(widget, cache, { animate: false });
    } catch (_e) {
      // soft fail
    } finally {
      this._newsDailyInFlight = false;
    }
  }

  async _newsMaybeRunHourly() {
    if (this._newsHourlyInFlight) return;
    const cacheKey = 'hue-ui-cache:news:v2';
    const cache = this._lsGetJson(cacheKey) || {};
    const slotKey = this._newsSlotKeyHourly();
    if (cache?.hourly_slot === slotKey) return;

    this._newsHourlyInFlight = true;
    try {
      const widget = this.shadowRoot?.querySelector('.newsr-widget');
      const statusEl = widget?.querySelector?.('[data-role="newsr-status"]');
      if (statusEl) statusEl.textContent = 'Uurupdate: nieuwe koppen…';

      const candidates = await this._newsFetchCandidates({});
      const knownUrls = new Set([]
        .concat(Array.isArray(cache.local) ? cache.local : [])
        .concat(Array.isArray(cache.national) ? cache.national : [])
        .map((x) => String(x?.url || '').trim())
        .filter(Boolean));

      const newLocal = candidates.localRegular.find((it) => it?.url && !knownUrls.has(it.url)) || null;
      const newNat = candidates.nationalWeek.find((it) => it?.url && !knownUrls.has(it.url)) || null;
      const picks = [];
      if (newLocal) picks.push({ kind: 'local', it: newLocal });
      if (newNat && picks.length < 2) picks.push({ kind: 'national', it: newNat });
      if (!picks.length) {
        cache.hourly_slot = slotKey;
        this._lsSetJson(cacheKey, cache);
        if (widget) this._fillNewsRoomUiFromCache(widget, cache, { animate: false });
        return;
      }

      const summaries = await this._newsSummarizeItems(picks.map((p) => p.it));
      const localArr = Array.isArray(cache.local) ? cache.local.slice(0, 5) : [];
      const natArr = Array.isArray(cache.national) ? cache.national.slice(0, 5) : [];
      const animateUrls = [];

      for (let i = 0; i < picks.length; i += 1) {
        const p = picks[i];
        const s = summaries[i] || {};
        const entry = this._normalizeNewsItemForCache(p.it, s);
        if (p.kind === 'local') {
          localArr.unshift(entry);
          while (localArr.length > 5) localArr.pop();
        } else {
          natArr.unshift(entry);
          while (natArr.length > 5) natArr.pop();
        }
        if (entry?.url) animateUrls.push(entry.url);
      }

      cache.local = localArr;
      cache.national = natArr;
      cache.hourly_slot = slotKey;
      cache.ts = Date.now();
      cache.status = `Bijgewerkt om ${this._formatHhMm(Date.now())}`;
      cache._animate_urls = animateUrls;
      this._lsSetJson(cacheKey, cache);

      if (widget) {
        widget.classList.add('has-new');
        setTimeout(() => { try { widget.classList.remove('has-new'); } catch (_e) { /* ignore */ } }, 6500);
        this._fillNewsRoomUiFromCache(widget, cache, { animate: true });
        delete cache._animate_urls;
      }
    } catch (_e) {
      // soft fail
    } finally {
      this._newsHourlyInFlight = false;
    }
  }

  async _newsBootstrap(widget, runId, reason) {
    const loadingEl = widget?.querySelector?.('[data-role="newsr-loading"]');
    const statusEl = widget?.querySelector?.('[data-role="newsr-status"]');
    if (loadingEl) loadingEl.classList.add('is-visible');
    if (statusEl) statusEl.textContent = `(${reason || 'enter'}) Eerste keer: koppen ophalen…`;

    const candidates = await this._newsFetchCandidates({});
    const localPicked = this._ensureNewsN(candidates.localRegular, 5, 'lokaal');
    const nationalPicked = this._ensureNewsN(candidates.nationalWeek, 5, 'landelijk');

    if (statusEl) statusEl.textContent = 'Gemini schrijft samenvattingen (lokaal)…';
    const localSummaries = await this._newsSummarizeItems(localPicked.slice(0, 2));
    const localSummaries2 = await this._newsSummarizeItems(localPicked.slice(2, 4));
    const localSummaries3 = await this._newsSummarizeItems(localPicked.slice(4, 5));
    const localAll = [].concat(localSummaries || []).concat(localSummaries2 || []).concat(localSummaries3 || []);

    if (statusEl) statusEl.textContent = 'Gemini schrijft samenvattingen (NL)…';
    const natSummaries = await this._newsSummarizeItems(nationalPicked.slice(0, 2));
    const natSummaries2 = await this._newsSummarizeItems(nationalPicked.slice(2, 4));
    const natSummaries3 = await this._newsSummarizeItems(nationalPicked.slice(4, 5));
    const natAll = [].concat(natSummaries || []).concat(natSummaries2 || []).concat(natSummaries3 || []);

    if (statusEl) statusEl.textContent = 'Gemini schrijft agenda/vergunningen…';
    const extras = await this._newsSummarizeExtras(candidates);

    const cache = {
      ts: Date.now(),
      title: 'Weekkrantje',
      subtitle: 'Dit is het nieuws van deze week',
      local: localPicked.map((it, i) => this._normalizeNewsItemForCache(it, localAll[i] || {})),
      national: nationalPicked.map((it, i) => this._normalizeNewsItemForCache(it, natAll[i] || {})),
      agenda_paragraph: extras.agenda_paragraph || '',
      permits_paragraph: extras.permits_paragraph || '',
      daily_day_ms: this._startOfLocalDayMs(Date.now()),
      hourly_slot: this._newsSlotKeyHourly(),
      status: `Bijgewerkt om ${this._formatHhMm(Date.now())}`,
    };
    this._lsSetJson('hue-ui-cache:news:v2', cache);

    if (loadingEl) loadingEl.classList.remove('is-visible');
    this._fillNewsRoomUiFromCache(widget, cache, { animate: true });
    this._newsHydratedFromCache = true;
  }

  _parseRfc2822ToMs(s) {
    const v = String(s || '').trim();
    if (!v) return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }

  _parseDutchDateToMs(s) {
    // Examples in Het Krantje HTML:
    // "7 feb, 15:00" or "dinsdag 10 februari 2026 10:30"
    const v = String(s || '').trim().toLowerCase();
    if (!v) return null;
    const months = {
      jan: 0, januari: 0,
      feb: 1, februari: 1,
      mrt: 2, maart: 2,
      apr: 3, april: 3,
      mei: 4,
      jun: 5, juni: 5,
      jul: 6, juli: 6,
      aug: 7, augustus: 7,
      sep: 8, september: 8,
      okt: 9, oktober: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };

    // "7 feb, 15:00"
    let m = v.match(/\b(\d{1,2})\s+([a-z]{3,9})\s*,\s*(\d{1,2}):(\d{2})\b/);
    if (m) {
      const day = Number(m[1]);
      const mon = months[m[2]];
      const hh = Number(m[3]);
      const mm = Number(m[4]);
      if (!Number.isFinite(day) || mon == null) return null;
      const now = new Date();
      const year = now.getFullYear();
      const d = new Date(year, mon, day, hh, mm, 0, 0);
      const ts = d.getTime();
      return Number.isFinite(ts) ? ts : null;
    }

    // "dinsdag 10 februari 2026 10:30"
    m = v.match(/\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\s+(\d{1,2}):(\d{2})\b/);
    if (m) {
      const day = Number(m[1]);
      const mon = months[m[2]];
      const year = Number(m[3]);
      const hh = Number(m[4]);
      const mm = Number(m[5]);
      if (!Number.isFinite(day) || mon == null || !Number.isFinite(year)) return null;
      const d = new Date(year, mon, day, hh, mm, 0, 0);
      const ts = d.getTime();
      return Number.isFinite(ts) ? ts : null;
    }

    // "Geplaatst op woensdag 4 februari 2026"
    m = v.match(/\bgeplaatst\s+op\s+[a-z]+\s+(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\b/);
    if (m) {
      const day = Number(m[1]);
      const mon = months[m[2]];
      const year = Number(m[3]);
      if (!Number.isFinite(day) || mon == null || !Number.isFinite(year)) return null;
      const d = new Date(year, mon, day, 12, 0, 0, 0);
      const ts = d.getTime();
      return Number.isFinite(ts) ? ts : null;
    }

    return null;
  }

  _stripHtmlToText(html) {
    const s = String(html || '').trim();
    if (!s) return '';
    try {
      const doc = new DOMParser().parseFromString(s, 'text/html');
      return String(doc?.body?.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (_e) {
      return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  async _fetchViaCodeTabs(url, { signal } = {}) {
    const u = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(String(url || '').trim())}`;
    const res = await fetch(u, { method: 'GET', mode: 'cors', signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  }

  _parseRssItems(xmlText, sourceName) {
    const xml = String(xmlText || '').trim();
    if (!xml) return [];
    let doc;
    try {
      doc = new DOMParser().parseFromString(xml, 'application/xml');
    } catch (_e) {
      return [];
    }
    const items = Array.from(doc.querySelectorAll('item')) || [];
    return items.map((it) => {
      const title = String(it.querySelector('title')?.textContent || '').trim();
      const link = String(it.querySelector('link')?.textContent || '').trim();
      const desc = String(it.querySelector('description')?.textContent || '').trim();
      const pub = String(it.querySelector('pubDate')?.textContent || '').trim();
      const cat = String(it.querySelector('category')?.textContent || '').trim();
      const publishedMs = this._parseRfc2822ToMs(pub);
      return {
        source: sourceName,
        title,
        url: link,
        description: this._stripHtmlToText(desc),
        category: cat,
        publishedMs,
      };
    }).filter((x) => x.title && x.url);
  }

  async _fetchNuRss({ signal } = {}) {
    const xml = await this._fetchViaCodeTabs('https://www.nu.nl/rss', { signal });
    return this._parseRssItems(xml, 'NU.nl');
  }

  async _fetchLvRss({ signal } = {}) {
    const xml = await this._fetchViaCodeTabs('https://www.lv.nl/feed/rss/nieuws/10%2B179', { signal });
    return this._parseRssItems(xml, 'LV.nl');
  }

  async _fetchHetKrantjeHome({ signal } = {}) {
    const html = await this._fetchViaCodeTabs('https://www.hetkrantje-online.nl/', { signal });
    let doc;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (_e) {
      return [];
    }
    const anchors = Array.from(doc.querySelectorAll('a[href^="/nieuws/"], a[href^="/agenda/"]')) || [];
    const seen = new Set();
    const out = [];
    for (const a of anchors) {
      const href = String(a.getAttribute('href') || '').trim();
      const title = String(a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!href || !title) continue;
      const url = `https://www.hetkrantje-online.nl${href}`;
      const key = `${href}|${title}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Try to find a nearby date string in the card.
      let publishedMs = null;
      let cursor = a.parentElement;
      for (let depth = 0; depth < 4 && cursor && !publishedMs; depth += 1) {
        const txt = String(cursor.textContent || '').replace(/\s+/g, ' ').trim();
        const mm = txt.match(/\b(\d{1,2})\s+[a-z]{3,9}\s*,\s*\d{1,2}:\d{2}\b/i) || txt.match(/\bgeplaatst\s+op\s+[a-z]+\s+\d{1,2}\s+[a-z]{3,9}\s+\d{4}\b/i) || txt.match(/\b\d{1,2}\s+[a-z]{3,9}\s+\d{4}\s+\d{1,2}:\d{2}\b/i);
        if (mm) publishedMs = this._parseDutchDateToMs(mm[0]);
        cursor = cursor.parentElement;
      }

      out.push({
        source: 'Het Krantje',
        title,
        url,
        description: '',
        category: href.startsWith('/agenda/') ? 'agenda' : 'nieuws',
        publishedMs,
      });
      if (out.length >= 30) break;
    }
    return out;
  }

  async _fetchGoogleNewsLv({ signal } = {}) {
    try {
      const base = String(this._roomsIndex?.news_google_query || this._roomsIndex?.weather_location || '').trim();
      const query = base ? base : 'Nederland';
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=nl&gl=NL&ceid=NL:nl`;
      const xml = await this._fetchViaCodeTabs(url, { signal });
      const items = this._parseRssItems(xml, 'Google Nieuws');
      return items.slice(0, 12);
    } catch (_e) {
      return [];
    }
  }

  _sanitizeNewsTextNoLinks(text) {
    let s = String(text || '');
    if (!s.trim()) return '';
    s = s.replace(/\bhttps?:\/\/\S+/gi, '');
    s = s.replace(/\bwww\.\S+/gi, '');
    s = s.replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, '');
    s = s.replace(/\*\*/g, '');
    s = s.replace(/`{1,3}/g, '');
    s = s.replace(/^\s*#+\s*/gm, '');
    s = s.replace(/[ \t]{2,}/g, ' ');
    s = s.replace(/\n{4,}/g, '\n\n\n');
    return s.trim();
  }

  _isNegativeNews(item) {
    const hay = `${String(item?.title || '')} ${String(item?.description || '')} ${String(item?.category || '')}`.toLowerCase();
    const neg = [
      'oorlog', 'oorlogen', 'gaza', 'israel', 'israël', 'palestina', 'oekra', 'rusland', 'raket',
      'overleden', 'dood', 'dodelijk', 'rouw', 'moord', 'mishand', 'aanslag', 'schiet', 'gewond', 'slachtoffer',
      'explos', 'brand', 'crash', 'ongeval', 'verkracht', 'drugs', 'terror', 'diefstal', 'beroving',
    ];
    return neg.some((k) => hay.includes(k));
  }

  _isIrrelevantLocal(item) {
    const hay = `${String(item?.title || '')} ${String(item?.description || '')}`.toLowerCase();
    return hay.includes('ooievaarspas');
  }

  _isPermitOrBuild(item) {
    const hay = `${String(item?.title || '')} ${String(item?.description || '')}`.toLowerCase();
    const keys = [
      'vergunning', 'omgevingsvergunning', 'bestemmingsplan', 'bouw', 'woningbouw', 'herinrichting',
      'intentieovereenkomst', 'plan', 'project', 'aanleg', 'warmtetransportleiding', 'vlietlijn',
      'sloop', 'nieuw woon', 'complex', 'plaspoelpolder', 'julianabaan',
    ];
    return keys.some((k) => hay.includes(k));
  }

  _isAgendaOrEvent(item) {
    const hay = `${String(item?.title || '')} ${String(item?.description || '')} ${String(item?.category || '')}`.toLowerCase();
    if (hay.includes('agenda')) return true;
    const keys = [
      'open dag', 'opendag', 'informatieavond', 'informatie avond', 'infoavond', 'info avond',
      'inloop', 'bijeenkomst', 'lezing', 'workshop',
      'markt', 'braderie', 'festival', 'kermis', 'concert', 'optreden', 'theater',
      'open huis', 'proeverij',
      'raadsvergadering', 'inspraak', 'informatie bijeenkomst',
    ];
    return keys.some((k) => hay.includes(k));
  }

  _ensureNewsN(items, n, label) {
    const maxN = Number.isFinite(Number(n)) ? Math.max(1, Math.min(8, Math.round(Number(n)))) : 5;
    const out = Array.isArray(items) ? items.slice(0, maxN) : [];
    while (out.length < maxN) {
      out.push({
        source: '',
        title: `Geen ${label} nieuws gevonden (deze week)`,
        url: '',
        description: '',
        category: '',
        publishedMs: NaN,
      });
    }
    return out;
  }

  _formatWhenShort(tsMs) {
    if (!Number.isFinite(Number(tsMs))) return '—';
    const d = new Date(Number(tsMs));
    return d.toLocaleDateString('nl-NL', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  _pickWeekItems(items, max, { mustHaveDate = false } = {}) {
    const list = Array.isArray(items) ? items : [];
    const maxN = Number.isFinite(Number(max)) ? Math.max(1, Math.min(12, Math.round(Number(max)))) : 5;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    const filtered = list
      .filter((it) => it && it.title && it.url)
      .filter((it) => !this._isNegativeNews(it))
      .filter((it) => !this._isIrrelevantLocal(it))
      .filter((it) => !mustHaveDate || Number.isFinite(Number(it.publishedMs)));

    const scored = filtered.map((it) => {
      const t = Number(it.publishedMs);
      const inWeek = Number.isFinite(t) ? (t >= weekAgo && t <= now) : false;
      return { it, inWeek, t: Number.isFinite(t) ? t : 0 };
    }).filter((x) => (mustHaveDate ? x.inWeek : true));

    // Prefer in-week dated items; then newest first.
    scored.sort((a, b) => (b.inWeek - a.inWeek) || (b.t - a.t));

    const out = [];
    const seen = new Set();
    for (const x of scored) {
      if (!x.inWeek && Number.isFinite(Number(x.it.publishedMs))) continue; // if dated but old, skip
      const key = String(x.it.title || '').toLowerCase().slice(0, 120);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(x.it);
      if (out.length >= maxN) break;
    }
    return out;
  }

  async _generateNewsRoomSummaries({ localItems, nationalItems, permitItems, agendaItems }) {
    const local = (Array.isArray(localItems) ? localItems : []).slice(0, 5).map((it) => ({
      title: String(it.title || '').trim().slice(0, 140),
      source: String(it.source || '').trim(),
      description: String(it.description || '').trim().slice(0, 180),
    }));
    const national = (Array.isArray(nationalItems) ? nationalItems : []).slice(0, 5).map((it) => ({
      title: String(it.title || '').trim().slice(0, 140),
      source: String(it.source || '').trim(),
      description: String(it.description || '').trim().slice(0, 180),
    }));
    const permits = (Array.isArray(permitItems) ? permitItems : []).slice(0, 4).map((it) => String(it.title || '').trim()).filter(Boolean);
    const agenda = (Array.isArray(agendaItems) ? agendaItems : []).slice(0, 6).map((it) => String(it.title || '').trim()).filter(Boolean);

    const now = new Date();
    const localDay = now.toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const localTime = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    const loc = String(this._roomsIndex?.news_location_hint || this._roomsIndex?.weather_location || '').trim();
    const context = {
      now_local: `${localDay} ${localTime}`,
      location_hint: loc,
      local_items: local,
      national_items: national,
      agenda_titles: agenda,
      permits_titles: permits,
      constraints: {
        no_wars_deaths_negative: true,
        local_first: true,
        week_only: true,
      },
    };

    const locLine = loc ? ` in ${loc}` : '';
    const prompt = [
      `Je maakt een speels, goed leesbaar weekkrantje in het Nederlands voor een gemiddeld gezin${locLine}.`,
      '',
      'Output-regels (strict):',
      '- Return ALLEEN geldige JSON. Geen markdown. Geen extra tekst.',
      '- Geen links/URLs/domeinen in de tekst zelf.',
      '- Geen oorlog/overlijden/geweld/zeer negatief nieuws; als er toch iets negatiefs in de input zit, laat het weg.',
      '- Samenvattingen: rustig, concreet, 2-3 zinnen, geen bullets.',
      '',
      'Schema (exact deze keys):',
      '{',
      '  "title": "korte titel",',
      '  "subtitle": "1 zin (bijv. Dit is het nieuws van deze week)",',
      '  "local": [{"headline":"", "summary":""}],',
      '  "national": [{"headline":"", "summary":""}],',
      '  "agenda_paragraph": "1 alinea over agenda/open dagen/informatieavonden (optioneel)",',
      '  "permits_paragraph": "1 alinea over bouwen/vergunningen (optioneel)"',
      '}',
      '',
      'Vul local en national met precies 5 items.',
      'agenda_paragraph en permits_paragraph mogen leeg zijn als er niets relevants is.',
      'Als een input-item "Geen ... nieuws gevonden" is, schrijf dan 1 korte zin waarom (bijv. rustig weekje of te weinig relevante koppen).',
      '',
      'Context:',
      JSON.stringify(context),
    ].join('\n');

    const agentId = await this._pickConversationAgentId('');
    const result = await this._conversationProcess(prompt, agentId);
    const raw = this._extractConversationText(result);

    const normalize = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const out = { ...obj };
      if (typeof out.title !== 'string') out.title = 'Weekkrantje';
      if (typeof out.subtitle !== 'string') out.subtitle = 'Dit is het nieuws van deze week';
      if (!Array.isArray(out.local)) out.local = [];
      if (!Array.isArray(out.national)) out.national = [];
      out.local = out.local.slice(0, 5).map((x) => ({
        headline: typeof x?.headline === 'string' ? x.headline : '',
        summary: typeof x?.summary === 'string' ? x.summary : '',
      }));
      out.national = out.national.slice(0, 5).map((x) => ({
        headline: typeof x?.headline === 'string' ? x.headline : '',
        summary: typeof x?.summary === 'string' ? x.summary : '',
      }));
      while (out.local.length < 5) out.local.push({ headline: '—', summary: '' });
      while (out.national.length < 5) out.national.push({ headline: '—', summary: '' });
      if (typeof out.agenda_paragraph !== 'string') out.agenda_paragraph = '';
      if (typeof out.permits_paragraph !== 'string') out.permits_paragraph = '';
      return out;
    };

    let obj = normalize(this._safeJsonParseObject(raw));
    if (obj) return obj;

    // Repair pass: Gemini sometimes adds extra text or slightly-invalid JSON.
    const repairPrompt = [
      'Converteer de volgende tekst naar GELDIGE JSON volgens dit schema.',
      'Return ALLEEN JSON. Geen markdown. Geen extra tekst.',
      '',
      'Schema:',
      '{',
      '  "title": "korte titel",',
      '  "subtitle": "1 zin",',
      '  "local": [{"headline":"", "summary":""}],',
      '  "national": [{"headline":"", "summary":""}],',
      '  "agenda_paragraph": "1 alinea (optioneel)",',
      '  "permits_paragraph": "1 alinea (optioneel)"',
      '}',
      '',
      'Tekst:',
      raw,
    ].join('\n');

    const repaired = await this._conversationProcess(repairPrompt, agentId);
    const repairedRaw = this._extractConversationText(repaired);
    obj = normalize(this._safeJsonParseObject(repairedRaw));
    return obj;
  }

  _fillNewsRoomUi(widget, payload, { localPicked, nationalPicked, permitPicked }) {
    const titleEl = widget.querySelector('[data-role="newsr-title"]');
    const subtitleEl = widget.querySelector('[data-role="newsr-subtitle"]');
    const stampEl = widget.querySelector('[data-role="newsr-datestamp"]');
    const agendaEl = widget.querySelector('[data-role="newsr-agenda"]');
    const permitsEl = widget.querySelector('[data-role="newsr-permits"]');

    const now = new Date();
    if (stampEl) stampEl.textContent = now.toLocaleString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
    if (titleEl) titleEl.textContent = this._sanitizeNewsTextNoLinks(payload?.title || 'Weekkrantje');
    if (subtitleEl) subtitleEl.textContent = this._sanitizeNewsTextNoLinks(payload?.subtitle || 'Dit is het nieuws van deze week');

    const agendaText = String(payload?.agenda_paragraph || '').trim()
      ? this._sanitizeNewsTextNoLinks(payload.agenda_paragraph)
      : 'Geen open dagen of informatieavonden die er deze week uitspringen.';
    if (agendaEl) agendaEl.textContent = agendaText;

    const permitsText = String(payload?.permits_paragraph || '').trim()
      ? this._sanitizeNewsTextNoLinks(payload.permits_paragraph)
      : (permitPicked && permitPicked.length)
        ? `Deze week in de regio: ${permitPicked.slice(0, 3).map((x) => x.title).join('. ') + '.'}`
        : 'Geen opvallende bouw- of vergunningupdates deze week.';
    if (permitsEl) permitsEl.textContent = permitsText;

    const renderItem = (slotEl, textItem, srcItem) => {
      const headlineEl = slotEl.querySelector('[data-role="newsr-headline"]');
      const summaryEl = slotEl.querySelector('[data-role="newsr-summary"]');
      const caretEl = slotEl.querySelector('[data-role="newsr-caret"]');
      const sourceEl = slotEl.querySelector('[data-role="newsr-source"]');
      const whenEl = slotEl.querySelector('[data-role="newsr-when"]');
      const linkEl = slotEl.querySelector('[data-role="newsr-link"]');
      const copyBtn = slotEl.querySelector('[data-news-action="copy"]');

      const headline = this._sanitizeNewsTextNoLinks(textItem?.headline || srcItem?.title || '—');
      const summary = this._sanitizeNewsTextNoLinks(textItem?.summary || '');

      if (headlineEl) headlineEl.textContent = headline;
      if (summaryEl) summaryEl.textContent = '';
      if (caretEl) caretEl.style.display = '';

      const source = String(srcItem?.source || '').trim() || '—';
      if (sourceEl) sourceEl.textContent = source;
      if (whenEl) whenEl.textContent = this._formatWhenShort(srcItem?.publishedMs);

      const url = String(srcItem?.url || '').trim();
      if (linkEl) {
        linkEl.href = url || '#';
        linkEl.style.pointerEvents = url ? 'auto' : 'none';
        linkEl.style.opacity = url ? '1' : '0.4';
      }

      // Store for copy action.
      slotEl.dataset.url = url || '';
      slotEl.dataset.headline = headline;
      slotEl.dataset.summary = summary;
      if (copyBtn) copyBtn.dataset.copyReady = 'true';

      // Typewriter the summary.
      this._typeNewsText(summaryEl, caretEl, summary, this._newsRunId);
    };

    const localText = Array.isArray(payload?.local) ? payload.local : [];
    const nationalText = Array.isArray(payload?.national) ? payload.national : [];

    const localSlots = Array.from(widget.querySelectorAll('.newsr-item[data-kind="local"]')) || [];
    const natSlots = Array.from(widget.querySelectorAll('.newsr-item[data-kind="national"]')) || [];

    for (let i = 0; i < localSlots.length; i += 1) {
      renderItem(localSlots[i], localText[i], localPicked[i]);
    }
    for (let i = 0; i < natSlots.length; i += 1) {
      renderItem(natSlots[i], nationalText[i], nationalPicked[i]);
    }
  }

  _typeNewsText(el, caretEl, text, runId) {
    if (!el) return;
    const full = this._sanitizeNewsTextNoLinks(text || '');
    if (!full) {
      if (caretEl) caretEl.style.display = 'none';
      return;
    }

    el.textContent = '';
    if (caretEl) caretEl.style.display = '';
    const total = full.length;
    const chunk = total > 900 ? 3 : 1;
    let i = 0;
    const timer = setInterval(() => {
      if (runId !== this._newsRunId) {
        clearInterval(timer);
        return;
      }
      i = Math.min(total, i + chunk);
      el.textContent = full.slice(0, i);
      if (i >= total) {
        clearInterval(timer);
        if (caretEl) caretEl.style.display = 'none';
      }
    }, 20);
    this._newsTypingTimers.push(timer);
  }

  async _runNewsFlow(widget, runId, reason) {
    const loadingEl = widget.querySelector('[data-role="newsr-loading"]');
    const statusEl = widget.querySelector('[data-role="newsr-status"]');
    if (loadingEl) loadingEl.classList.add('is-visible');
    if (statusEl) statusEl.textContent = `(${reason || 'enter'}) Koppen ophalen…`;

    if (this._newsAbortController) {
      try { this._newsAbortController.abort(); } catch (_e) { /* ignore */ }
    }
    const controller = new AbortController();
    this._newsAbortController = controller;

    try {
      const fetchStep = async (label, fn, timeoutMs) => {
        if (statusEl) statusEl.textContent = `${label}…`;
        const sub = new AbortController();
        const onAbort = () => { try { sub.abort(); } catch (_e) { /* ignore */ } };
        controller.signal.addEventListener('abort', onAbort, { once: true });
        const t = setTimeout(() => {
          try { sub.abort(); } catch (_e) { /* ignore */ }
        }, Math.max(500, Number(timeoutMs) || 3500));
        try {
          return await fn(sub.signal);
        } catch (e) {
          console.warn('[HueRoomScreen] News source failed:', label, e);
          return [];
        } finally {
          clearTimeout(t);
          try { controller.signal.removeEventListener('abort', onAbort); } catch (_e) { /* ignore */ }
        }
      };

      // Fetch sources sequentially with short timeouts so one slow source doesn't block the whole room.
      const krantje = await fetchStep('Het Krantje ophalen', (signal) => this._fetchHetKrantjeHome({ signal }), 4500);
      if (runId !== this._newsRunId) return;
      const lv = await fetchStep('LV.nl ophalen', (signal) => this._fetchLvRss({ signal }), 4000);
      if (runId !== this._newsRunId) return;
      const google = await fetchStep('Google Nieuws ophalen', (signal) => this._fetchGoogleNewsLv({ signal }), 3000);
      if (runId !== this._newsRunId) return;
      const nu = await fetchStep('NU.nl ophalen', (signal) => this._fetchNuRss({ signal }), 4000);
      if (runId !== this._newsRunId) return;

      const allLocal = []
        .concat(lv || [])
        .concat(krantje || [])
        .concat(google || [])
        .filter((it) => it && it.url);

      // Local sources are not always reliably dated (Het Krantje anchors). Keep undated items but prefer dated/newest.
      const localWeek = this._pickWeekItems(allLocal, 20);
      const localAgenda = localWeek.filter((it) => this._isAgendaOrEvent(it));
      const localPermits = localWeek.filter((it) => !this._isAgendaOrEvent(it) && this._isPermitOrBuild(it));
      const localRegular = localWeek.filter((it) => !this._isAgendaOrEvent(it) && !this._isPermitOrBuild(it));

      const agendaPicked = localAgenda.slice(0, 6);
      const permitPicked = localPermits.slice(0, 6);
      const localPicked = this._ensureNewsN(localRegular, 5, 'lokaal');

      const nuWeek = this._pickWeekItems(nu || [], 12, { mustHaveDate: true });
      const nationalPicked = this._ensureNewsN(nuWeek, 5, 'landelijk');

      if (statusEl) statusEl.textContent = 'Gemini schrijft samenvattingen…';
      const payload = await this._generateNewsRoomSummaries({
        localItems: localPicked,
        nationalItems: nationalPicked,
        permitItems: permitPicked,
        agendaItems: agendaPicked,
      });
      if (runId !== this._newsRunId) return;
      if (!payload) throw new Error('Gemini gaf geen geldig resultaat terug');

      this._fillNewsRoomUi(widget, payload, { localPicked, nationalPicked, permitPicked });
      if (statusEl) statusEl.textContent = `Bijgewerkt om ${this._formatHhMm(Date.now())}`;
      if (loadingEl) loadingEl.classList.remove('is-visible');

      // Mark as "new" only when we have new URLs since last run (simple heuristic).
      const cacheKey = 'hue-ui-cache:news:lasturls:v1';
      const prev = this._lsGetJson(cacheKey) || {};
      const urls = []
        .concat(localPicked || [])
        .concat(nationalPicked || [])
        .map((it) => String(it?.url || '').trim())
        .filter(Boolean);
      const hasAnyNew = urls.some((u) => !prev[u]);
      if (hasAnyNew) {
        const next = {};
        for (const u of urls) next[u] = 1;
        this._lsSetJson(cacheKey, next);
        widget.classList.add('has-new');
        setTimeout(() => {
          try { widget.classList.remove('has-new'); } catch (_e) { /* ignore */ }
        }, 6500);
      }
    } catch (e) {
      if (runId !== this._newsRunId) return;
      console.warn('[HueRoomScreen] News flow failed:', e);
      if (statusEl) statusEl.textContent = `Mislukt: ${String(e?.message || e)}`;
      if (loadingEl) loadingEl.classList.remove('is-visible');
    } finally {
      if (this._newsAbortController === controller) {
        this._newsAbortController = null;
      }
    }
  }

  _getWeatherState() {
    const weatherEntity = this._roomsIndex?.weather_entity || 'weather.buienradar';
    return this._hass?.states?.[weatherEntity] || null;
  }

  _getRainChanceNextHourRoom() {
    const entityId = this._roomsIndex?.weather_rain_chance_entity;
    if (!entityId) return null;
    const rainState = this._hass?.states?.[entityId];
    if (!rainState) return null;
    const v = Number(rainState?.state);
    if (Number.isFinite(v)) return Math.max(0, Math.min(100, Math.round(v)));
    return null;
  }

  _formatWind(weatherState) {
    const w = Number(weatherState?.attributes?.wind_speed);
    const u = String(weatherState?.attributes?.wind_speed_unit || '').trim();
    if (!Number.isFinite(w)) return '--';
    return `${Math.round(w)}${u ? ` ${u}` : ''}`.trim();
  }

  _openMeteoCodeToCondition(code) {
    const c = Number(code);
    if (!Number.isFinite(c)) return '';
    // Open-Meteo weather codes: https://open-meteo.com/en/docs
    if (c === 0) return 'sunny';
    if (c === 1) return 'partlycloudy';
    if (c === 2 || c === 3) return 'cloudy';
    if (c === 45 || c === 48) return 'fog';
    if (c === 51 || c === 53 || c === 55) return 'rainy';
    if (c === 56 || c === 57) return 'rainy';
    if (c === 61 || c === 63 || c === 65) return 'rainy';
    if (c === 66 || c === 67) return 'rainy';
    if (c === 71 || c === 73 || c === 75 || c === 77) return 'snowy';
    if (c === 80 || c === 81 || c === 82) return 'pouring';
    if (c === 85 || c === 86) return 'snowy-rainy';
    if (c === 95 || c === 96 || c === 99) return 'lightning-rainy';
    return 'cloudy';
  }

  _updateWeatherBanner(widget, prefetch = null) {
    const weather = this._getWeatherState();
    const location = String(this._roomsIndex?.weather_location || 'Leidschendam').trim() || 'Leidschendam';
    const emojiEl = widget.querySelector('[data-role="wx-emoji"]');
    const tempEl = widget.querySelector('[data-role="wx-temp"]');
    const condEl = widget.querySelector('[data-role="wx-cond"]');
    const locEl = widget.querySelector('[data-role="wx-loc"]');
    const rainEl = widget.querySelector('[data-role="wx-rain"]');
    const windEl = widget.querySelector('[data-role="wx-wind"]');

    if (locEl) locEl.textContent = location;

    // Prefetched Open-Meteo data (server-side) takes precedence when available.
    const current = prefetch && typeof prefetch === 'object' ? prefetch.current : null;
    if (current && (current.temperature_c != null || current.windspeed_kmh != null)) {
      const temp = Number(current.temperature_c);
      const wind = Number(current.windspeed_kmh);
      const pprob = Number(current.precip_probability_pct);
      const cond = this._openMeteoCodeToCondition(current.weathercode);
      if (emojiEl) emojiEl.textContent = getWeatherEmoji(cond || 'cloudy');
      if (tempEl) tempEl.textContent = Number.isFinite(temp) ? `${Math.round(temp)}°` : '--°';
      if (condEl) condEl.textContent = translateCondition(cond || 'cloudy');
      if (rainEl) rainEl.textContent = `Regen: ${Number.isFinite(pprob) ? Math.round(pprob) : '--'}%`;
      if (windEl) windEl.textContent = `Wind: ${Number.isFinite(wind) ? `${Math.round(wind)} km/u` : '--'}`;
      this._updateWeatherForecastStrip(widget, prefetch);
      return;
    }

    if (!weather) {
      if (emojiEl) emojiEl.textContent = '⛅';
      if (tempEl) tempEl.textContent = '--°';
      if (condEl) condEl.textContent = 'Weer onbekend';
      if (rainEl) rainEl.textContent = 'Regen: --%';
      if (windEl) windEl.textContent = 'Wind: --';
      return;
    }

    const condition = String(weather.state || '').trim();
    const temp = weather.attributes?.temperature;
    const rainChance = this._getRainChanceNextHourRoom();

    if (emojiEl) emojiEl.textContent = getWeatherEmoji(condition);
    if (tempEl) tempEl.textContent = Number.isFinite(Number(temp)) ? `${Math.round(Number(temp))}°` : '--°';
    if (condEl) condEl.textContent = translateCondition(condition);
    if (rainEl) rainEl.textContent = `Regen: ${rainChance == null ? '--' : rainChance}%`;
    if (windEl) windEl.textContent = `Wind: ${this._formatWind(weather)}`;

    this._updateWeatherForecastStrip(widget);
  }

  _updateWeatherForecastStrip(widget, prefetch = null) {
    if (!widget) return;
    const strip = widget.querySelector('[data-role="wx-forecast"]');
    if (!strip) return;
    const preWindow = prefetch && typeof prefetch === 'object' && Array.isArray(prefetch.window) ? prefetch.window : null;

    const mins = this._minutesSinceLocalMidnight();
    const slot = mins >= (12 * 60) ? 'midday' : 'morning';
    const startHour = slot === 'midday' ? 12 : 7;
    const endHour = slot === 'midday' ? 19 : 13;

    const rows = [];
    if (preWindow && preWindow.length) {
      for (const f of preWindow) {
        const dt = f?.time || '';
        const t = Date.parse(String(dt));
        if (!Number.isFinite(t)) continue;
        const d = new Date(t);
        const h = d.getHours();
        if (h < startHour || h > endHour) continue;
        rows.push({
          time: d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          cond: this._openMeteoCodeToCondition(f?.code),
          temp: Number.isFinite(Number(f?.temp)) ? Math.round(Number(f.temp)) : null,
          precip: Number.isFinite(Number(f?.pprob)) ? Number(f.pprob) : null,
        });
        if (rows.length >= 10) break;
      }
    } else {
      const weather = this._getWeatherState();
      const forecast = Array.isArray(weather?.attributes?.forecast) ? weather.attributes.forecast : [];
      if (!forecast.length) {
        strip.innerHTML = '';
        return;
      }
      for (const f of forecast) {
        const dt = f?.datetime || f?.time || '';
        const t = Date.parse(String(dt));
        if (!Number.isFinite(t)) continue;
        const d = new Date(t);
        const h = d.getHours();
        if (h < startHour || h > endHour) continue;
        rows.push({
          time: d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          cond: String(f?.condition || '').trim(),
          temp: Number.isFinite(Number(f?.temperature)) ? Math.round(Number(f.temperature)) : null,
          precip: Number.isFinite(Number(f?.precipitation)) ? Number(f.precipitation) : null,
        });
        if (rows.length >= 10) break;
      }
    }

    if (!rows.length) {
      strip.innerHTML = '';
      return;
    }

    strip.innerHTML = rows.map((r) => {
      const emoji = getWeatherEmoji(r.cond);
      const temp = r.temp == null ? '--' : String(r.temp);
      const rain = r.precip == null ? '--' : String(Math.round(r.precip));
      return `
        <div class="wx-fi">
          <div class="wx-fi-time">${escapeHtml(r.time)}</div>
          <div class="wx-fi-emoji">${escapeHtml(emoji)}</div>
          <div class="wx-fi-temp">${escapeHtml(temp)}°</div>
          <div class="wx-fi-rain">${escapeHtml(rain)}%</div>
        </div>
      `;
    }).join('');
  }

  async _runWeatherFlow(widget, runId, reason) {
    const reportEl = widget.querySelector('[data-role="wx-report"]');
    const caretEl = widget.querySelector('[data-role="wx-caret"]');
    const statusEl = widget.querySelector('[data-role="wx-status"]');
    const loadingEl = widget.querySelector('[data-role="wx-loading"]');

    if (caretEl) caretEl.style.display = '';
    if (reportEl) reportEl.textContent = '';
    if (loadingEl) loadingEl.classList.add('is-visible');
    this._updateWeatherBanner(widget);
    if (statusEl) statusEl.textContent = `(${reason || 'enter'}) Weerdata ophalen…`;

    if (this._weatherAbortController) {
      try { this._weatherAbortController.abort(); } catch (_e) { /* ignore */ }
    }
    const controller = new AbortController();
    this._weatherAbortController = controller;

    try {
      if (statusEl) statusEl.textContent = 'Gemini schrijft het weerbericht…';
      const reportText = await this._generateWeatherReport();
      if (runId !== this._weatherRunId) return;

      if (!reportText) {
        if (statusEl) statusEl.textContent = 'Gemini gaf geen tekst terug.';
        if (caretEl) caretEl.style.display = 'none';
        if (loadingEl) loadingEl.classList.remove('is-visible');
        return;
      }

      if (statusEl) statusEl.textContent = `Rapport klaar om ${this._formatHhMm(Date.now())}`;
      if (loadingEl) loadingEl.classList.remove('is-visible');
      this._updateWeatherForecastStrip(widget);
      this._typeWeatherReport(reportEl, caretEl, reportText, runId);

      // Cache the generated report for this slot.
      const slot = String(widget?.dataset?.wxSlot || '').trim();
      if (slot === 'morning' || slot === 'midday') {
        const cacheKey = 'hue-ui-cache:weather:v1';
        const cache = this._lsGetJson(cacheKey) || {};
        cache[slot] = { ts: Date.now(), text: String(reportText || '') };
        this._lsSetJson(cacheKey, cache);
      }
    } catch (e) {
      if (runId !== this._weatherRunId) return;
      console.warn('[HueRoomScreen] Weather widget failed:', e);
      if (statusEl) statusEl.textContent = `Mislukt: ${String(e?.message || e)}`;
      if (reportEl) reportEl.textContent = 'Kon geen weerbericht maken.';
      if (caretEl) caretEl.style.display = 'none';
      if (loadingEl) loadingEl.classList.remove('is-visible');
    } finally {
      if (this._weatherAbortController === controller) {
        this._weatherAbortController = null;
      }
    }
  }

  async _fetchLocalJson(url, { timeoutMs = 3500 } = {}) {
    const safeUrl = String(url || '').trim();
    if (!safeUrl) throw new Error('Missing URL');
    const t = Number(timeoutMs);
    const ms = Number.isFinite(t) ? Math.max(500, Math.min(20000, t)) : 3500;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try { controller.abort(); } catch (_e) { /* ignore */ }
    }, ms);
    try {
      const res = await fetch(this._withCacheBuster(safeUrl), {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${safeUrl}`);
      const raw = await res.text();
      try {
        return JSON.parse(raw);
      } catch (_e) {
        // Allow a plain-text fallback so a slightly-invalid Gemini response still shows up.
        return { ts: Date.now(), text: String(raw || '').trim() };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  _formatWeatherReportFromJson(obj) {
    const sanitize = (v) => this._sanitizeBitcoinReportText(v).replace(/\n{3,}/g, '\n\n').trim();
    const region = sanitize(obj?.region_intro);
    const nu = sanitize(obj?.nu);
    const verwachting = sanitize(obj?.verwachting);
    const kleding = sanitize(obj?.kledingadvies);
    const jas = sanitize(obj?.jas);
    const umbrella = sanitize(obj?.paraplu);
    const noah = sanitize(obj?.noah_school);
    const felix = sanitize(obj?.felix_opvang);
    const disclaimer = sanitize(obj?.disclaimer);

    // Fill the playful sub-cards if present.
    const widget = this.shadowRoot?.querySelector('.wx-widget');
    if (widget) {
      const umbEl = widget.querySelector('[data-role="wx-umbrella"]');
      const jacketEl = widget.querySelector('[data-role="wx-jacket"]');
      const noahEl = widget.querySelector('[data-role="wx-noah"]');
      const felixEl = widget.querySelector('[data-role="wx-felix"]');
      if (umbEl) umbEl.textContent = umbrella ? `Paraplu: ${umbrella}` : 'Paraplu: —';
      if (jacketEl) jacketEl.textContent = jas ? `Jas: ${jas}` : 'Jas: —';
      if (noahEl) noahEl.textContent = noah || '—';
      if (felixEl) felixEl.textContent = felix || '—';
    }

    const out = [];
    if (region) out.push(region);
    if (nu) { out.push(''); out.push(nu); }
    if (verwachting) { out.push(''); out.push(verwachting); }
    if (kleding || jas) {
      out.push('');
      if (kleding) out.push(`Kledingadvies: ${kleding}`);
      if (jas) out.push(`Jas: ${jas}`);
    }
    if (disclaimer) { out.push(''); out.push(disclaimer); }
    return out.join('\n').trim();
  }

  async _generateWeatherReport() {
    const weather = this._getWeatherState();
    const location = String(this._roomsIndex?.weather_location || 'Leidschendam').trim() || 'Leidschendam';
    const rainChance = this._getRainChanceNextHourRoom();

    const people = this._roomsIndex?.people || [];
    const areaMap = this._roomsIndex?.people_area_sensors || {};
    const personAreas = {};
    for (const p of people) {
      const areaEntity = areaMap?.[p];
      const st = areaEntity ? this._hass?.states?.[areaEntity] : null;
      const areaName = st?.attributes?.area_name || st?.state;
      if (typeof areaName === 'string' && areaName.trim() && areaName !== 'unknown' && areaName !== 'unavailable') {
        personAreas[p] = areaName.trim();
      }
    }

    const now = new Date();
    const localDay = now.toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const localTime = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    const mins = this._minutesSinceLocalMidnight();
    const slot = mins >= (12 * 60) ? 'midday' : 'morning';
    const startHour = slot === 'midday' ? 12 : 7;
    const endHour = slot === 'midday' ? 19 : 13;

    const context = {
      now_local: `${localDay} ${localTime}`,
      timezone_note: 'Europe/Amsterdam',
      location_hint: location,
      rain_next_hour_pct: rainChance,
      people_areas: personAreas,
      current: weather ? {
        condition: String(weather.state || '').trim(),
        temperature: weather.attributes?.temperature ?? null,
        feels_like: weather.attributes?.apparent_temperature ?? null,
        humidity: weather.attributes?.humidity ?? null,
        wind_speed: weather.attributes?.wind_speed ?? null,
        wind_gust: weather.attributes?.wind_gust_speed ?? null,
        pressure: weather.attributes?.pressure ?? null,
      } : null,
      focus_window: `${String(startHour).padStart(2,'0')}:00-${String(endHour).padStart(2,'0')}:00`,
      forecast_sample: Array.isArray(weather?.attributes?.forecast)
        ? weather.attributes.forecast
          .map((f) => ({
            datetime: f?.datetime || f?.time || '',
            condition: f?.condition || '',
            temperature: f?.temperature ?? null,
            precipitation: f?.precipitation ?? null,
            wind_speed: f?.wind_speed ?? null,
          }))
          .filter((f) => {
            const dt = String(f?.datetime || '');
            const t = Date.parse(dt);
            if (!Number.isFinite(t)) return false;
            const d = new Date(t);
            const h = d.getHours();
            return h >= startHour && h <= endHour;
          })
          .slice(0, 10)
        : [],
      user_profile: {
        address_area: String(this._roomsIndex?.weather_area_hint || location || '').trim(),
        baseline_outfit: 'meestal een t-shirt, overhemd en hoodie met spijkerbroek',
        question: 'Moet ik een winterjas of een herfstjas aan? Of geen jas?',
        preference: 'ik wil concrete, rustige instructies (autisme)',
        family: 'gezin van 4: twee volwassenen en twee kinderen (6 en 2 jaar)',
        practical_questions: [
          'Moet Noah een jas mee naar school?',
          'Moet Felix wanten of extra laagjes mee naar de opvang?',
          'Paraplu nodig voor boodschappen doen?',
          'Na 18:00 zijn we meestal binnen; waarschuw alleen bij storm/hevige regen.',
        ],
      },
    };

    const prompt = [
      `Schrijf een speels maar rustig weerbericht in het Nederlands (focus: ${String(startHour).padStart(2,'0')}:00-${String(endHour).padStart(2,'0')}:00).`,
      '',
      'Output-regels (strict):',
      '- Return ALLEEN geldige JSON. Geen markdown. Geen extra tekst.',
      '- Geen links/URLs, geen domeinen.',
      '- Wees concreet en rustig (autisme). Zeg expliciet wat aan te trekken.',
      '- Focus op het dagdeel; avond/nacht alleen noemen bij storm of iets waar we rekening mee moeten houden.',
      '',
      'Schema (exact deze keys):',
      '{',
      '  "region_intro": "1 zin: voor welke regio is dit bericht (noem ook de personen als dat kan)",',
      '  "nu": "1 korte alinea: hoe is het nu",',
      '  "verwachting": "1 alinea: dit dagdeel met relevante punten zoals regen/wind/koud/heet",',
      '  "kledingadvies": "1 alinea: wat trek ik aan (laagjes), en wanneer afwijken",',
      '  "jas": "1 kort antwoord: winterjas / herfstjas / geen jas / regenjas",',
      '  "paraplu": "1 kort antwoord: ja/nee + reden",',
      '  "noah_school": "1 korte alinea met advies voor Noah (6): jas/regen/extra kleding",',
      '  "felix_opvang": "1 korte alinea met advies voor Felix (2): wanten/extra laagjes/regenkleding",',
      '  "disclaimer": "1 zin"',
      '}',
      '',
      'Context (gebruik dit, maar herhaal geen lijstjes):',
      JSON.stringify(context),
    ].join('\n');

    const agentId = await this._pickConversationAgentId('');
    const result = await this._conversationProcess(prompt, agentId);
    const raw = this._extractConversationText(result);
    const obj = this._safeJsonParseObject(raw);
    if (obj) return this._formatWeatherReportFromJson(obj);
    return this._normalizeBitcoinReportText(raw);
  }

  _typeWeatherReport(reportEl, caretEl, text, runId) {
    if (!reportEl) return;
    if (this._weatherTypingTimer) {
      clearInterval(this._weatherTypingTimer);
      this._weatherTypingTimer = null;
    }

    const full = this._normalizeBitcoinReportText(text);
    const total = full.length;
    if (total === 0) {
      if (caretEl) caretEl.style.display = 'none';
      return;
    }

    if (caretEl) caretEl.style.display = '';
    reportEl.textContent = '';

    const chunk = total > 3500 ? 10 : total > 1800 ? 6 : total > 900 ? 3 : 1;
    let i = 0;
    this._weatherTypingTimer = setInterval(() => {
      if (runId !== this._weatherRunId) {
        clearInterval(this._weatherTypingTimer);
        this._weatherTypingTimer = null;
        return;
      }
      i = Math.min(total, i + chunk);
      reportEl.textContent = full.slice(0, i);
      if (i >= total) {
        clearInterval(this._weatherTypingTimer);
        this._weatherTypingTimer = null;
        if (caretEl) caretEl.style.display = 'none';
      }
    }, 22);
  }

  // ===== Event Handling =====

  _attachEventListeners() {
    // Always detach first to avoid duplicates, then re-attach.
    // No flag-based skipping — listeners must be reattached after every innerHTML rebuild.
    this.shadowRoot.removeEventListener('pointerdown', this._boundHandlePointerDown);
    this.shadowRoot.removeEventListener('click', this._boundHandleClick);
    this.shadowRoot.removeEventListener('pointerup', this._boundHandlePointerUp);
    this.shadowRoot.removeEventListener('pointercancel', this._boundHandlePointerCancel);
    this.shadowRoot.removeEventListener('pointermove', this._boundHandlePointerMove);
    this.shadowRoot.removeEventListener('input', this._boundHandleInput);
    this.shadowRoot.removeEventListener('change', this._boundHandleChange);

    this.shadowRoot.addEventListener('pointerdown', this._boundHandlePointerDown);
    this.shadowRoot.addEventListener('click', this._boundHandleClick);
    this.shadowRoot.addEventListener('pointerup', this._boundHandlePointerUp);
    this.shadowRoot.addEventListener('pointercancel', this._boundHandlePointerCancel);
    this.shadowRoot.addEventListener('pointermove', this._boundHandlePointerMove);
    this.shadowRoot.addEventListener('input', this._boundHandleInput);
    this.shadowRoot.addEventListener('change', this._boundHandleChange);
    this.shadowRoot.removeEventListener('touchstart', this._boundSwipeTouchStart);
    this.shadowRoot.removeEventListener('touchend', this._boundSwipeTouchEnd);
    this.shadowRoot.addEventListener('touchstart', this._boundSwipeTouchStart, { passive: true });
    this.shadowRoot.addEventListener('touchend', this._boundSwipeTouchEnd, { passive: true });
  }

  _handlePointerDown(e) {
    const overlay = this.shadowRoot.querySelector('.widget-editor-overlay');
    if (overlay?.classList.contains('is-open')) return;
    const lightOverlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (lightOverlay?.classList.contains('is-open')) return;

    const isInteractive = e.target.closest(
      '.hue-header-back, .hue-toggle, .hue-media-primary, .hue-media-volume, .hue-media-progress, .hue-media-source, .hue-climate-setpoint, .light-control-modal, button, input, select'
    );
    if (isInteractive) return;

    const tile = e.target.closest('.hue-tile[data-entity], .hue-scene-tile[data-entity], .hue-camera-card[data-entity]');
    if (!tile) return;

    this._clearLongPressTimer();
    this._longPressPointerId = e.pointerId;
    this._longPressStart = { x: e.clientX, y: e.clientY };
    this._longPressTimer = setTimeout(() => {
      this._openWidgetEditor(tile.dataset.entity, tile.classList.contains('hue-scene-tile'));
      this._suppressNextClick = true;
      this._clearLongPressTimer();
    }, 3000);
  }

  _handlePointerCancel() {
    this._clearLongPressTimer();
    this._releaseLightDragGuards();
  }

  _handlePointerMove(e) {
    if (this._longPressPointerId == null || this._longPressPointerId !== e.pointerId) return;
    if (!this._longPressStart) return;
    const dx = Math.abs(e.clientX - this._longPressStart.x);
    const dy = Math.abs(e.clientY - this._longPressStart.y);
    if (dx > 10 || dy > 10) {
      this._clearLongPressTimer();
    }
  }

  _handlePointerUp(e) {
    this._clearLongPressTimer();
    this._releaseLightDragGuards();
    const backButton = e.target.closest('.hue-header-back');
    if (!backButton) return;

    e.preventDefault();
    e.stopPropagation();
    this._navigateToPath(backButton.dataset.path, true);
  }

  _handleClick(e) {
    if (this._suppressNextClick) {
      this._suppressNextClick = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const newsAction = e.target.closest('[data-news-action]')?.dataset.newsAction;
    if (newsAction) {
      if (newsAction === 'copy') {
        const item = e.target.closest('.newsr-item');
        const headline = String(item?.dataset?.headline || '').trim();
        const summary = String(item?.dataset?.summary || '').trim();
        const url = String(item?.dataset?.url || '').trim();
        const text = [headline, summary, url].filter(Boolean).join('\n\n');
        e.preventDefault();
        e.stopPropagation();
        hapticFeedback();
        void this._copyToClipboard(text);
        return;
      }
    }

    const lightOverlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (lightOverlay?.classList.contains('is-open')) {
      if (e.target === lightOverlay) {
        this._closeLightControl();
        return;
      }
      const lightAction = e.target.closest('[data-light-action]')?.dataset.lightAction;
      if (lightAction) {
        e.preventDefault();
        e.stopPropagation();
        this._handleLightControlAction(lightAction);
        return;
      }
    }

    const overlay = this.shadowRoot.querySelector('.widget-editor-overlay');
    if (overlay?.classList.contains('is-open') && e.target === overlay) {
      this._closeWidgetEditor({ discardChanges: true, rerender: true });
      return;
    }

    const classButton = e.target.closest('[data-editor-class]');
    if (classButton) {
      e.preventDefault();
      e.stopPropagation();
      void this._handleWidgetClassPick(classButton.dataset.editorClass);
      return;
    }

    const editorAction = e.target.closest('[data-editor-action]')?.dataset.editorAction;
    if (editorAction) {
      e.preventDefault();
      e.stopPropagation();
      void this._handleWidgetEditorAction(editorAction);
      return;
    }

    const backButton = e.target.closest('.hue-header-back');
    if (backButton) {
      e.preventDefault();
      e.stopPropagation();
      this._navigateToPath(backButton.dataset.path, true);
      return;
    }

    if (
      e.target.closest('.hue-media-volume')
      || e.target.closest('.hue-media-source')
      || e.target.closest('.hue-climate-setpoint')
      || e.target.closest('.light-control-modal')
      || e.target.closest('.widget-editor-modal')
    ) {
      return;
    }

    const lightTile = e.target.closest('.hue-light-tile[data-entity]');
    if (lightTile && !e.target.closest('.hue-toggle')) {
      e.preventDefault();
      e.stopPropagation();
      this._openLightControl(lightTile.dataset.entity);
      return;
    }

    const target = e.target.closest('[data-action]');
    if (!target) return;

    const { action, entity, path } = target.dataset;
    const svcDomain = target.dataset.serviceDomain;
    const svcName = target.dataset.serviceName;
    const svcDataRaw = target.dataset.serviceData;
    const actionDataRaw = target.dataset.actionData;

    hapticFeedback();

    switch (action) {
      case 'navigate':
        this._navigateToPath(path, false);
        break;

      case 'toggle_room_lights':
        toggleAllLights(this._hass, this._getAllLightEntities());
        break;

      case 'toggle':
        if (entity) handleAction(this._hass, 'toggle', entity);
        break;

      case 'media_play_pause':
        if (entity) handleAction(this._hass, 'media_play_pause', entity);
        break;

      case 'media_primary':
        if (entity) handleAction(this._hass, 'media_primary', entity);
        break;

      case 'activate_scene':
        if (entity) handleAction(this._hass, 'activate_scene', entity);
        break;

      case 'press':
        if (entity) handleAction(this._hass, 'press', entity);
        break;

      case 'toggle_talk':
        e.preventDefault();
        e.stopPropagation();
        this._toggleTalkMode(target);
        break;

      case 'tts_say': {
        let opts = {};
        if (actionDataRaw) {
          try {
            const parsed = JSON.parse(actionDataRaw);
            if (parsed && typeof parsed === 'object') opts = parsed;
          } catch (e2) {
            console.warn('[HueRoomScreen] Bad action data JSON:', e2);
          }
        }
        handleAction(this._hass, 'tts_say', entity || '', opts);
        break;
      }

      case 'call_service': {
        let data = {};
        if (svcDataRaw) {
          try {
            const parsed = JSON.parse(svcDataRaw);
            if (parsed && typeof parsed === 'object') data = parsed;
          } catch (e2) {
            console.warn('[HueRoomScreen] Bad service data JSON:', e2);
          }
        }
        handleAction(this._hass, 'call_service', entity || '', {
          domain: svcDomain,
          service: svcName,
          data,
        });
        break;
      }

      case 'more_info':
        if (entity) handleAction(this._hass, 'more_info', entity);
        break;
    }
  }

  _toggleTalkMode(buttonEl) {
    this._talkingActive = !this._talkingActive;
    const active = this._talkingActive;

    if (buttonEl) {
      buttonEl.classList.toggle('is-talking', active);
      const subtitle = buttonEl.querySelector('.hue-tile-subtitle');
      if (subtitle) subtitle.textContent = active ? 'Talking… tap to stop' : 'Tap to talk';
      const pill = buttonEl.querySelector('.hue-action-pill');
      if (pill) pill.textContent = active ? 'LIVE' : 'Talk';
    }

    // Re-mount WebRTC cards so they switch between `media: video,audio` and `video,audio,microphone`.
    void this._wireWebRtcCards();
  }

  _queueLightControlTimer(kind, fn) {
    // Always store the latest callback so the final value is never lost
    this._lightControlPendingFn = this._lightControlPendingFn || {};
    this._lightControlPendingFn[kind] = fn;
    if (this._lightControlTimers[kind]) return; // timer already running, fn updated
    this._lightControlTimers[kind] = setTimeout(() => {
      this._lightControlTimers[kind] = null;
      const pending = this._lightControlPendingFn[kind];
      this._lightControlPendingFn[kind] = null;
      if (pending) pending();
    }, 120);
  }

  _flushLightControlTimer(kind) {
    const timer = this._lightControlTimers[kind];
    if (timer) {
      clearTimeout(timer);
      this._lightControlTimers[kind] = null;
    }
    // Execute the latest pending call so the final slider position is sent
    const pending = this._lightControlPendingFn?.[kind];
    if (pending) {
      this._lightControlPendingFn[kind] = null;
      pending();
    }
  }

  _handleInput(e) {
    const lightBrightness = e.target.closest('.light-control-brightness');
    if (lightBrightness) {
      e.stopPropagation();
      this._lightControlDragging.brightness = true;
      const entity = this._lightControlEntity;
      if (!entity) return;
      const percent = Math.max(1, Math.min(100, Number.parseInt(lightBrightness.value, 10) || 1));
      const brightness = Math.round((percent / 100) * 255);
      // Haptic every 2%
      if (Math.abs(percent - this._lightControlLastHaptic.brightness) >= 2) {
        hapticFeedback();
        this._lightControlLastHaptic.brightness = percent;
      }
      this._queueLightControlTimer('brightness', () => {
        handleAction(this._hass, 'set_brightness', entity, { brightness });
      });
      return;
    }

    const lightColor = e.target.closest('.light-control-color');
    if (lightColor) {
      e.stopPropagation();
      this._lightControlDragging.color = true;
      if (!this._lightControlUseColor) return;
      const entity = this._lightControlEntity;
      if (!entity) return;
      const hue = Math.max(0, Math.min(360, Number.parseInt(lightColor.value, 10) || 0));
      const state = this._hass?.states?.[entity];
      const sat = Number.isFinite(Number(state?.attributes?.hs_color?.[1]))
        ? Number(state.attributes.hs_color[1])
        : 100;
      // Haptic every 10°
      if (Math.abs(hue - this._lightControlLastHaptic.color) >= 10) {
        hapticFeedback();
        this._lightControlLastHaptic.color = hue;
      }
      this._queueLightControlTimer('color', () => {
        handleAction(this._hass, 'set_color_hue', entity, { hs_color: [hue, sat] });
      });
      this._setColorSliderGlow(hue);
      return;
    }

    const lightTemp = e.target.closest('.light-control-temp');
    if (lightTemp) {
      e.stopPropagation();
      this._lightControlDragging.temp = true;
      if (!this._lightControlUseTemp) return;
      const entity = this._lightControlEntity;
      if (!entity) return;
      const temp = Number.parseInt(lightTemp.value, 10);
      if (!Number.isFinite(temp)) return;
      // Haptic every 10 mireds
      if (Math.abs(temp - this._lightControlLastHaptic.temp) >= 10) {
        hapticFeedback();
        this._lightControlLastHaptic.temp = temp;
      }
      this._queueLightControlTimer('temp', () => {
        handleAction(this._hass, 'set_color_temp', entity, { color_temp: temp });
      });
      this._setTempSliderGlow(temp, Number(lightTemp.min), Number(lightTemp.max));
      return;
    }

    const climateSlider = e.target.closest('.hue-climate-setpoint');
    if (climateSlider) {
      e.stopPropagation();
      const entity = climateSlider.dataset.entity;
      if (!entity) return;

      const raw = Number.parseFloat(climateSlider.value);
      if (!Number.isFinite(raw)) return;
      const stepped = Math.max(18, Math.min(25, Math.round(raw * 2) / 2));
      if (String(stepped) !== climateSlider.value) {
        climateSlider.value = String(stepped);
      }

      if (climateSlider.dataset.lastStep !== String(stepped)) {
        climateSlider.dataset.lastStep = String(stepped);
        hapticFeedback('hard');
        handleAction(this._hass, 'set_temperature', entity, { temperature: stepped });
      }
      return;
    }

    const volume = e.target.closest('.hue-media-volume');
    if (!volume) return;

    e.stopPropagation();
    const entity = volume.dataset.entity;
    if (!entity) return;

    const raw = Number.parseInt(volume.value, 10);
    if (!Number.isFinite(raw)) return;
    const stepped = Math.max(0, Math.min(100, Math.round(raw / 2) * 2));
    if (String(stepped) !== volume.value) {
      volume.value = String(stepped);
    }

    const valueEl = volume.parentElement?.querySelector('.hue-media-volume-value');
    if (valueEl) valueEl.textContent = `${stepped}%`;

    if (volume.dataset.lastStep !== String(stepped)) {
      volume.dataset.lastStep = String(stepped);
      hapticFeedback('hard');
      handleAction(this._hass, 'volume_set', entity, { volume_level: stepped / 100 });
    }
  }

  _handleChange(e) {
    if (
      e.target.closest('.light-control-brightness')
      || e.target.closest('.light-control-color')
      || e.target.closest('.light-control-temp')
    ) {
      e.stopPropagation();
      // Flush pending throttled call and release drag guard on change (pointerup fires change)
      this._releaseLightDragGuards();
      return;
    }

    const widgetSelect = e.target.closest('.widget-editor-entity-select');
    if (widgetSelect) {
      e.stopPropagation();
      return;
    }

    const progress = e.target.closest('.hue-media-progress');
    if (progress) {
      e.stopPropagation();
      const entity = progress.dataset.entity;
      if (!entity) return;

      const raw = Number.parseInt(progress.value, 10);
      if (!Number.isFinite(raw)) return;
      const stepped = Math.max(0, Math.min(100, Math.round(raw)));
      if (String(stepped) !== progress.value) {
        progress.value = String(stepped);
      }

      const state = this._hass?.states?.[entity];
      const duration = Number(state?.attributes?.media_duration);
      if (!Number.isFinite(duration) || duration <= 0) return;

      // Only seek on change to avoid spamming HA while dragging.
      if (progress.dataset.lastStep !== String(stepped)) {
        progress.dataset.lastStep = String(stepped);
        const seekPosition = (stepped / 100) * duration;
        hapticFeedback('hard');
        handleAction(this._hass, 'media_seek', entity, { seek_position: seekPosition });
      }
      return;
    }

    const sourceSelect = e.target.closest('.hue-media-source');
    if (!sourceSelect) return;

    e.stopPropagation();
    const entity = sourceSelect.dataset.entity;
    const source = sourceSelect.value;
    if (!entity || !source) return;

    hapticFeedback();
    handleAction(this._hass, 'media_select_source', entity, { source });
  }

  _handleSwipeTouchStart(e) {
    const touch = e.touches[0];
    if (!touch) return;
    // Only track swipes starting from the left 20px edge
    if (touch.clientX <= 20) {
      this._swipeStartX = touch.clientX;
      this._swipeStartY = touch.clientY;
    } else {
      this._swipeStartX = null;
      this._swipeStartY = null;
    }
  }

  _handleSwipeTouchEnd(e) {
    if (this._swipeStartX === null) return;
    const touch = e.changedTouches[0];
    if (!touch) { this._swipeStartX = null; return; }
    const dx = touch.clientX - this._swipeStartX;
    const dy = Math.abs(touch.clientY - this._swipeStartY);
    this._swipeStartX = null;
    this._swipeStartY = null;
    // Require 80px horizontal, and horizontal > vertical (not a scroll)
    if (dx >= 80 && dx > dy) {
      // Don't swipe back if a modal/editor is open
      const overlay = this.shadowRoot.querySelector('.widget-editor-overlay');
      if (overlay?.classList.contains('is-open')) return;
      const lightOverlay = this.shadowRoot.querySelector('.light-control-overlay');
      if (lightOverlay?.classList.contains('is-open')) return;
      const dashboardPath = this._roomsIndex?.dashboard_path || '/hue-ui';
      this._navigateToPath(dashboardPath, true);
    }
  }

  _navigateToPath(path, withHaptic = false) {
    if (!path) return;

    const now = Date.now();
    if (now - this._lastBackNavAt < 250) return;
    this._lastBackNavAt = now;

    if (withHaptic) {
      hapticFeedback();
    }

    const normalize = (value) => {
      const trimmed = String(value || '').replace(/\/+$/, '');
      return trimmed || '/';
    };

    const currentPath = normalize(window.location.pathname);
    const targetPath = normalize(path);

    if (currentPath !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }

    // Dispatch twice (next tick as backup) because some HA views debounce route events.
    window.dispatchEvent(new Event('location-changed'));
    setTimeout(() => {
      window.dispatchEvent(new Event('location-changed'));
    }, 0);
  }

  _clearLongPressTimer() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this._longPressPointerId = null;
    this._longPressStart = null;
  }

  _openLightControl(entityId) {
    if (!entityId || !this._hass?.states?.[entityId]) return;
    this._lightControlEntity = entityId;

    const state = this._hass.states[entityId];
    const colorMode = String(state?.attributes?.color_mode || '').toLowerCase();
    this._lightControlUseColor = colorMode === 'hs' || colorMode === 'xy' || !!state?.attributes?.hs_color;
    this._lightControlUseTemp = colorMode === 'color_temp' || Number.isFinite(Number(state?.attributes?.color_temp));

    const overlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (!overlay) return;
    overlay.classList.add('is-open');
    this._refreshLightControlUi();
  }

  _closeLightControl() {
    const overlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (overlay) overlay.classList.remove('is-open');
    this._lightControlEntity = null;
    this._lightControlUseColor = false;
    this._lightControlUseTemp = false;
    this._releaseLightDragGuards();
  }

  _releaseLightDragGuards() {
    let wasDragging = false;
    for (const kind of ['brightness', 'color', 'temp']) {
      if (this._lightControlDragging[kind]) wasDragging = true;
      // Flush: execute the latest pending call so final slider value is sent to HA
      this._flushLightControlTimer(kind);
      this._lightControlDragging[kind] = false;
    }
    // Keep a cooldown so _refreshLightControlUi doesn't overwrite the slider
    // with stale HA state before the service call round-trips
    if (wasDragging) {
      this._lightControlCooldownUntil = Date.now() + 1500;
    }
  }

  _handleLightControlAction(action) {
    if (!action) return;
    const entity = this._lightControlEntity;
    if (!entity) return;

    if (action === 'close') {
      this._closeLightControl();
      return;
    }

    if (action === 'toggle-power') {
      hapticFeedback();
      handleAction(this._hass, 'toggle', entity);
      // Update the switch UI immediately
      const powerSwitch = this.shadowRoot.querySelector('.light-control-power-switch');
      if (powerSwitch) {
        const wasOn = powerSwitch.getAttribute('aria-checked') === 'true';
        powerSwitch.setAttribute('aria-checked', wasOn ? 'false' : 'true');
      }
      return;
    }
  }

  _refreshLightControlUi() {
    const overlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (!overlay?.classList.contains('is-open')) return;
    const entity = this._lightControlEntity;
    if (!entity) return;
    const state = this._hass?.states?.[entity];
    if (!state) return;

    // Skip UI refresh during active drag or cooldown after release
    if (this._lightControlDragging && Object.values(this._lightControlDragging).some(Boolean)) return;
    if (Date.now() < this._lightControlCooldownUntil) return;

    const titleEl = this.shadowRoot.querySelector('.light-control-title');
    const brightnessEl = this.shadowRoot.querySelector('.light-control-brightness');
    const powerSwitch = this.shadowRoot.querySelector('.light-control-power-switch');
    const colorEl = this.shadowRoot.querySelector('.light-control-color');
    const tempEl = this.shadowRoot.querySelector('.light-control-temp');
    const colorGroup = this.shadowRoot.querySelector('.light-control-color-group');
    const tempGroup = this.shadowRoot.querySelector('.light-control-temp-group');

    const name = state.attributes?.friendly_name || entity.split('.')[1];
    if (titleEl) titleEl.textContent = name;

    const rawBrightness = Number(state.attributes?.brightness);
    const brightnessPct = Number.isFinite(rawBrightness)
      ? Math.max(1, Math.min(100, Math.round((rawBrightness / 255) * 100)))
      : 100;
    if (brightnessEl) {
      brightnessEl.value = String(brightnessPct);
      brightnessEl.style.setProperty('--track', 'linear-gradient(90deg, #5bb4ff 0%, #ffd56f 55%, #ff8a56 100%)');
      brightnessEl.style.setProperty('--glow', 'rgba(255, 190, 102, 0.48)');
    }

    const isOn = state.state === 'on';
    if (powerSwitch) {
      powerSwitch.setAttribute('aria-checked', isOn ? 'true' : 'false');
    }

    // Auto-detect color/temp support
    const colorMode = String(state.attributes?.color_mode || '').toLowerCase();
    const supportsColor = colorMode === 'hs' || colorMode === 'xy' || !!state.attributes?.hs_color;
    const supportsTemp = colorMode === 'color_temp' || Number.isFinite(Number(state.attributes?.color_temp));
    this._lightControlUseColor = supportsColor;
    this._lightControlUseTemp = supportsTemp;

    // Toggle visibility
    if (colorGroup) colorGroup.classList.toggle('is-hidden', !supportsColor);
    if (tempGroup) tempGroup.classList.toggle('is-hidden', !supportsTemp);

    const hue = Number.isFinite(Number(state.attributes?.hs_color?.[0]))
      ? Number(state.attributes.hs_color[0])
      : 30;
    if (colorEl) {
      colorEl.value = String(Math.round(hue));
      colorEl.disabled = !supportsColor;
      this._setColorSliderGlow(hue);
    }

    const minMired = Number(state.attributes?.min_mireds);
    const maxMired = Number(state.attributes?.max_mireds);
    const min = Number.isFinite(minMired) ? minMired : 153;
    const max = Number.isFinite(maxMired) ? maxMired : 500;
    const colorTempRaw = Number(state.attributes?.color_temp);
    const colorTemp = Number.isFinite(colorTempRaw)
      ? Math.max(min, Math.min(max, colorTempRaw))
      : Math.round((min + max) / 2);

    if (tempEl) {
      tempEl.min = String(min);
      tempEl.max = String(max);
      tempEl.value = String(colorTemp);
      tempEl.disabled = !supportsTemp;
      this._setTempSliderGlow(colorTemp, min, max);
    }
  }

  _setColorSliderGlow(hue) {
    const slider = this.shadowRoot.querySelector('.light-control-color');
    if (!slider) return;
    const safeHue = Math.max(0, Math.min(360, Number(hue) || 0));
    slider.style.setProperty('--track', 'linear-gradient(90deg, hsl(0 100% 55%) 0%, hsl(60 100% 55%) 16%, hsl(120 100% 48%) 33%, hsl(180 100% 46%) 50%, hsl(240 100% 62%) 66%, hsl(300 100% 62%) 83%, hsl(360 100% 55%) 100%)');
    slider.style.setProperty('--glow', `hsla(${safeHue}, 95%, 62%, 0.58)`);
  }

  _setTempSliderGlow(value, min, max) {
    const slider = this.shadowRoot.querySelector('.light-control-temp');
    if (!slider) return;
    const denom = Math.max(1, max - min);
    const t = Math.max(0, Math.min(1, (Number(value) - min) / denom));
    const hue = Math.round(210 - (t * 190));
    slider.style.setProperty('--track', 'linear-gradient(90deg, #72b9ff 0%, #ffc06f 55%, #ff7b57 100%)');
    slider.style.setProperty('--glow', `hsla(${hue}, 95%, 62%, 0.56)`);
  }

  _getWidgetOverrides() {
    if (!this._roomConfig) return {};
    if (!this._roomConfig.widget_overrides || typeof this._roomConfig.widget_overrides !== 'object') {
      this._roomConfig.widget_overrides = {};
    }
    return this._roomConfig.widget_overrides;
  }

  _getWidgetOverride(entityId) {
    if (!entityId) return {};
    const overrides = this._getWidgetOverrides();
    return overrides[entityId] || {};
  }

  _setWidgetOverride(entityId, patch = {}) {
    if (!entityId) return;
    const overrides = this._getWidgetOverrides();
    overrides[entityId] = { ...(overrides[entityId] || {}), ...patch };
  }

  _openWidgetEditor(entityId, isSceneWidget = false) {
    if (!entityId) return;
    this._editorEntity = entityId;
    this._editorIsScene = !!isSceneWidget;
    this._editorSnapshot = this._cloneRoomConfig(this._roomConfig);
    this._editorSelectedClass = '';
    this._pendingAddWidget = null;
    this._roomEntityOptionsByClass = {};
    const overlay = this.shadowRoot.querySelector('.widget-editor-overlay');
    const input = this.shadowRoot.querySelector('.widget-editor-name');
    const status = this.shadowRoot.querySelector('.widget-editor-status');
    const title = this.shadowRoot.querySelector('.widget-editor-title');
    const addFlow = this.shadowRoot.querySelector('.widget-add-flow');
    const addPrompt = this.shadowRoot.querySelector('.widget-add-prompt');
    const entitySelect = this.shadowRoot.querySelector('.widget-editor-entity-select');
    const modal = this.shadowRoot.querySelector('.widget-editor-modal');
    if (!overlay || !input) return;

    const state = this._hass?.states?.[entityId];
    const override = this._getWidgetOverride(entityId);
    const defaultName = override.name || state?.attributes?.friendly_name || entityId.split('.')[1];
    input.value = defaultName;
    if (title) title.textContent = `Edit widget · ${defaultName}`;
    if (status) status.textContent = '';
    if (modal) modal.dataset.scene = this._editorIsScene ? 'true' : 'false';
    if (addFlow) addFlow.classList.remove('is-open');
    if (addPrompt) addPrompt.classList.remove('is-open');
    this._clearWidgetClassSelection();
    if (entitySelect) {
      entitySelect.innerHTML = '<option value="">Select a class first</option>';
      entitySelect.disabled = true;
    }
    overlay.classList.add('is-open');
    input.focus();
    input.select();
  }

  _closeWidgetEditor({ discardChanges = false, rerender = false } = {}) {
    if (discardChanges && this._editorSnapshot) {
      this._roomConfig = this._cloneRoomConfig(this._editorSnapshot);
    }
    const overlay = this.shadowRoot.querySelector('.widget-editor-overlay');
    const status = this.shadowRoot.querySelector('.widget-editor-status');
    const modal = this.shadowRoot.querySelector('.widget-editor-modal');
    if (overlay) overlay.classList.remove('is-open');
    if (status) status.textContent = '';
    if (modal) delete modal.dataset.scene;
    this._editorEntity = null;
    this._editorIsScene = false;
    this._editorSnapshot = null;
    this._editorSelectedClass = '';
    this._pendingAddWidget = null;
    this._roomEntityOptionsByClass = {};
    if (rerender) this._render();
  }

  async _handleWidgetEditorAction(action) {
    const entityId = this._editorEntity;
    if (!entityId) return;

    const input = this.shadowRoot.querySelector('.widget-editor-name');
    const status = this.shadowRoot.querySelector('.widget-editor-status');
    const nextName = String(input?.value || '').trim();
    const current = this._getWidgetOverride(entityId);

    if (action === 'rename_widget') {
      if (!nextName) {
        if (status) status.textContent = 'Name is empty.';
        return;
      }
      this._setWidgetOverride(entityId, { name: nextName });
      this._applyWidgetOverridesToDom();
      if (status) status.textContent = 'Name updated.';
      return;
    }

    if (action === 'hide_widget') {
      this._setWidgetOverride(entityId, { hidden: true });
      this._applyWidgetOverridesToDom();
      if (status) status.textContent = 'Widget hidden.';
      return;
    }

    if (action === 'remove_widget') {
      this._setWidgetOverride(entityId, { removed: true, hidden: true });
      this._applyWidgetOverridesToDom();
      if (status) status.textContent = 'Widget removed.';
      return;
    }

    if (action === 'new_scene') {
      if (!this._editorIsScene) {
        if (status) status.textContent = 'Use this from a scene widget.';
        return;
      }
      const requestedName = nextName || window.prompt('New scene name', '') || '';
      const sceneName = String(requestedName).trim();
      if (!sceneName) {
        if (status) status.textContent = 'Scene name is required.';
        return;
      }
      if (status) status.textContent = 'Creating scene...';
      const result = await this._createSceneFromVisibleLights(sceneName);
      if (!result.ok) {
        if (status) status.textContent = result.message || 'Failed to create scene.';
        return;
      }
      const saved = saveRoomConfigOverride(this._roomFile, this._roomConfig);
      if (status) status.textContent = saved ? 'Scene created and added.' : 'Scene created, save failed.';
      this._closeWidgetEditor({ discardChanges: false, rerender: true });
      return;
    }

    if (action === 'add_widget') {
      const addFlow = this.shadowRoot.querySelector('.widget-add-flow');
      if (addFlow) addFlow.classList.add('is-open');
      this._hideCreateSectionPrompt();
      if (status) status.textContent = 'Choose class and entity.';
      return;
    }

    if (action === 'add_widget_confirm') {
      const addClass = this._editorSelectedClass;
      const selectEl = this.shadowRoot.querySelector('.widget-editor-entity-select');
      const selectedEntity = selectEl?.value;
      if (!addClass) {
        if (status) status.textContent = 'Choose a class first.';
        return;
      }
      if (!selectedEntity) {
        if (status) status.textContent = 'Choose an entity first.';
        return;
      }
      const result = this._addWidgetToRoomConfig(addClass, selectedEntity, { allowCreateMissing: false });
      if (result.needsCreate) {
        this._pendingAddWidget = { widgetClass: addClass, entityId: selectedEntity };
        this._showCreateSectionPrompt(result.sectionType, addClass);
        if (status) status.textContent = 'Section missing. Create it to continue.';
        return;
      }
      if (!result.ok) {
        if (status) status.textContent = result.message || 'Widget already exists or cannot be added.';
        return;
      }
      const saved = saveRoomConfigOverride(this._roomFile, this._roomConfig);
      if (status) status.textContent = saved ? 'Widget added and saved.' : 'Widget added, save failed.';
      this._closeWidgetEditor({ discardChanges: false, rerender: true });
      return;
    }

    if (action === 'add_widget_create_section') {
      const pending = this._pendingAddWidget;
      if (!pending) {
        if (status) status.textContent = 'Nothing pending to add.';
        return;
      }
      const result = this._addWidgetToRoomConfig(pending.widgetClass, pending.entityId, { allowCreateMissing: true });
      if (!result.ok) {
        if (status) status.textContent = result.message || 'Could not create section.';
        return;
      }
      const saved = saveRoomConfigOverride(this._roomFile, this._roomConfig);
      if (status) status.textContent = saved ? 'Section created, widget added and saved.' : 'Widget added, save failed.';
      this._closeWidgetEditor({ discardChanges: false, rerender: true });
      return;
    }

    if (action === 'add_widget_abort') {
      this._pendingAddWidget = null;
      this._hideCreateSectionPrompt();
      if (status) status.textContent = 'Add cancelled.';
      return;
    }

    if (action === 'cancel_widget') {
      this._closeWidgetEditor({ discardChanges: true, rerender: true });
      return;
    }

    if (action === 'save_widget') {
      if (nextName && current.name !== nextName) {
        this._setWidgetOverride(entityId, { name: nextName });
      }
      const saved = saveRoomConfigOverride(this._roomFile, this._roomConfig);
      if (status) status.textContent = saved ? 'Saved to room JSON override.' : 'Save failed.';
      this._closeWidgetEditor({ discardChanges: false, rerender: true });
    }
  }

  async _handleWidgetClassPick(widgetClass) {
    const status = this.shadowRoot.querySelector('.widget-editor-status');
    const selectEl = this.shadowRoot.querySelector('.widget-editor-entity-select');
    if (!selectEl) return;

    this._editorSelectedClass = String(widgetClass || '').toLowerCase();
    this._pendingAddWidget = null;
    this._hideCreateSectionPrompt();
    this._clearWidgetClassSelection();
    const activeButton = this.shadowRoot.querySelector(`[data-editor-class="${this._editorSelectedClass}"]`);
    if (activeButton) activeButton.classList.add('is-selected');

    selectEl.disabled = true;
    selectEl.innerHTML = '<option value="">Loading room entities...</option>';
    const options = await this._getRoomEntitiesForClass(this._editorSelectedClass);
    if (!options.length) {
      selectEl.innerHTML = '<option value="">No entities found for this room/class</option>';
      if (status) status.textContent = 'No matching entities in this room.';
      return;
    }

    selectEl.innerHTML = options.map((item) => (
      `<option value="${escapeHtml(item.entity_id)}">${escapeHtml(item.name)}</option>`
    )).join('');
    selectEl.disabled = false;
    if (status) status.textContent = `${options.length} entities available.`;
  }

  _clearWidgetClassSelection() {
    this.shadowRoot.querySelectorAll('.widget-class-btn').forEach((button) => {
      button.classList.remove('is-selected');
    });
  }

  _showCreateSectionPrompt(sectionType, widgetClass) {
    const prompt = this.shadowRoot.querySelector('.widget-add-prompt');
    const text = this.shadowRoot.querySelector('.widget-add-prompt-text');
    if (!prompt || !text) return;
    const label = String(widgetClass || sectionType || 'widget');
    text.textContent = `No "${label}" section exists in this room config. Create that section now?`;
    prompt.classList.add('is-open');
  }

  _hideCreateSectionPrompt() {
    const prompt = this.shadowRoot.querySelector('.widget-add-prompt');
    const text = this.shadowRoot.querySelector('.widget-add-prompt-text');
    if (prompt) prompt.classList.remove('is-open');
    if (text) text.textContent = '';
  }

  _cloneRoomConfig(config) {
    if (!config || typeof config !== 'object') return {};
    if (typeof structuredClone === 'function') {
      return structuredClone(config);
    }
    return JSON.parse(JSON.stringify(config));
  }

  _applyWidgetOverridesToDom() {
    const overrides = this._getWidgetOverrides();
    const tiles = this.shadowRoot.querySelectorAll(
      '.hue-tile[data-entity], .hue-scene-tile[data-entity], .hue-camera-card[data-entity]'
    );
    tiles.forEach((tile) => {
      const entityId = tile.dataset.entity;
      if (!entityId) return;
      const override = overrides[entityId];
      if (!override) return;

      if (override.hidden || override.removed) {
        tile.remove();
        return;
      }

      if (typeof override.name === 'string' && override.name.trim()) {
        const nameEl = tile.querySelector('.hue-tile-name, .hue-camera-name');
        if (nameEl) {
          nameEl.textContent = override.name.trim();
        }
      }
    });
  }

  async _getRoomEntitiesForClass(widgetClass) {
    const key = String(widgetClass || '').toLowerCase();
    if (!key) return [];
    if (Array.isArray(this._roomEntityOptionsByClass[key])) {
      return this._roomEntityOptionsByClass[key];
    }

    const domains = this._getDomainsForClass(key);
    if (!domains.length) return [];

    let options = await this._getRoomAreaScopedEntities(domains);
    if (!options.length) {
      options = this._getFallbackEntitiesForClass(key);
    }

    this._roomEntityOptionsByClass[key] = options;
    return options;
  }

  async _getRoomAreaScopedEntities(domains) {
    if (!this._hass?.callWS) return [];

    try {
      if (!Array.isArray(this._areaRegistry)) {
        this._areaRegistry = await this._hass.callWS({ type: 'config/area_registry/list' });
      }
      if (!Array.isArray(this._entityRegistry)) {
        this._entityRegistry = await this._hass.callWS({ type: 'config/entity_registry/list' });
      }
      if (!Array.isArray(this._deviceRegistry)) {
        this._deviceRegistry = await this._hass.callWS({ type: 'config/device_registry/list' });
      }

      const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const roomNameNorm = normalize(this._roomConfig?.name || this._config?.room || '');
      const roomIdNorm = normalize(this._config?.room || '');
      const areaIdFromConfig = this._roomConfig?.area_id || null;
      let roomAreaId = areaIdFromConfig;

      if (!roomAreaId) {
        const areaMatch = this._areaRegistry.find((area) => {
          const areaId = area?.area_id || area?.id || '';
          const areaName = normalize(area?.name || areaId);
          return areaName === roomNameNorm || areaName === roomIdNorm;
        });
        roomAreaId = areaMatch?.area_id || areaMatch?.id || null;
      }

      const deviceAreaMap = new Map();
      this._deviceRegistry.forEach((device) => {
        const deviceId = device?.id;
        const areaId = device?.area_id || null;
        if (deviceId) deviceAreaMap.set(deviceId, areaId);
      });

      const roomMatcher = this._getRoomMatcher();

      let entities = this._entityRegistry.filter((entry) => {
        const entityId = String(entry?.entity_id || '');
        const domain = entityId.split('.')[0];
        if (!domains.includes(domain)) return false;
        if (entry?.disabled_by) return false;
        return true;
      });

      if (roomAreaId) {
        entities = entities.filter((entry) => {
          if (entry?.area_id === roomAreaId) return true;
          const byDevice = entry?.device_id ? deviceAreaMap.get(entry.device_id) : null;
          return byDevice === roomAreaId;
        });
      } else {
        entities = entities.filter((entry) => {
          const entityIdNorm = normalize(entry?.entity_id || '');
          const nameNorm = normalize(entry?.name || entry?.original_name || '');
          const state = this._hass?.states?.[entry?.entity_id];
          const friendlyNorm = normalize(state?.attributes?.friendly_name || '');
          return roomMatcher(entityIdNorm) || roomMatcher(nameNorm) || roomMatcher(friendlyNorm);
        });
      }

      const mapped = entities.map((entry) => {
        const entityId = entry.entity_id;
        const state = this._hass?.states?.[entityId];
        const name = state?.attributes?.friendly_name || entry?.name || entry?.original_name || entityId;
        return {
          entity_id: entityId,
          name,
        };
      });

      return this._sortAndDedupeEntityOptions(mapped);
    } catch (error) {
      console.warn('[HueRoomScreen] Failed room area lookup, using fallback entities:', error);
      return [];
    }
  }

  _getFallbackEntitiesForClass(widgetClass) {
    const options = [];
    const pushEntity = (entityId, explicitName = null) => {
      if (!entityId) return;
      const state = this._hass?.states?.[entityId];
      const name = explicitName || state?.attributes?.friendly_name || entityId;
      options.push({ entity_id: entityId, name });
    };

    if (widgetClass === 'lighting') {
      this._getAllLightEntities().forEach((entityId) => pushEntity(entityId));
    } else if (widgetClass === 'climate') {
      (this._roomConfig.sections || [])
        .filter((section) => section.type === 'climate')
        .forEach((section) => {
          if (Array.isArray(section.entities)) section.entities.forEach((entityId) => pushEntity(entityId));
          if (Array.isArray(section.entity)) section.entity.forEach((entityId) => pushEntity(entityId));
          if (typeof section.entity === 'string') pushEntity(section.entity);
        });
    } else if (widgetClass === 'devices') {
      (this._roomConfig.sections || [])
        .filter((section) => section.type === 'devices')
        .forEach((section) => {
          (section.switches || []).forEach((item) => pushEntity(item?.entity, item?.name));
        });
    } else if (widgetClass === 'sensors') {
      (this._roomConfig.sensors || []).forEach((item) => pushEntity(item?.entity, item?.name));
    } else if (widgetClass === 'mediaplayers') {
      (this._roomConfig.sections || [])
        .filter((section) => section.type === 'mediaplayers' || section.type === 'devices')
        .forEach((section) => {
          (section.players || []).forEach((item) => pushEntity(item?.entity, item?.name));
          (section.tv_players || []).forEach((item) => pushEntity(item?.entity, item?.name));
          (section.media_players || []).forEach((item) => pushEntity(item?.entity, item?.name));
        });
    }

    const domainOptions = this._scanHassStatesForRoom(this._getDomainsForClass(widgetClass));
    return this._sortAndDedupeEntityOptions([...options, ...domainOptions]);
  }

  _getDomainsForClass(widgetClass) {
    const domainsByClass = {
      lighting: ['light'],
      climate: ['climate'],
      devices: ['switch', 'fan', 'cover', 'lock', 'button', 'input_boolean'],
      sensors: ['sensor', 'binary_sensor'],
      mediaplayers: ['media_player'],
    };
    return domainsByClass[String(widgetClass || '').toLowerCase()] || [];
  }

  _getRoomMatcher() {
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const roomNameNorm = normalize(this._roomConfig?.name || this._config?.room || '');
    const roomIdNorm = normalize(this._config?.room || '');
    const needles = [roomNameNorm, roomIdNorm].filter(Boolean);
    return (candidateNorm) => {
      const v = normalize(candidateNorm);
      if (!v || needles.length === 0) return false;
      return needles.some((needle) => v.includes(needle));
    };
  }

  _scanHassStatesForRoom(domains) {
    if (!this._hass?.states || !Array.isArray(domains) || !domains.length) return [];
    const roomMatches = this._getRoomMatcher();
    const options = [];

    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      const domain = entityId.split('.')[0];
      if (!domains.includes(domain)) return;

      const friendly = state?.attributes?.friendly_name || '';
      const areaName = state?.attributes?.area_name || '';
      if (!roomMatches(entityId) && !roomMatches(friendly) && !roomMatches(areaName)) return;

      options.push({
        entity_id: entityId,
        name: friendly || entityId,
      });
    });

    return options;
  }

  _sortAndDedupeEntityOptions(options) {
    const seen = new Set();
    return options
      .filter((item) => {
        if (!item?.entity_id || seen.has(item.entity_id)) return false;
        seen.add(item.entity_id);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _addWidgetToRoomConfig(widgetClass, entityId, { allowCreateMissing = true } = {}) {
    if (!entityId || !this._roomConfig) return { ok: false, message: 'Invalid widget or room config.' };
    const state = this._hass?.states?.[entityId];
    const name = state?.attributes?.friendly_name || entityId;
    const icon = state?.attributes?.icon;
    const domain = entityId.split('.')[0];

    const hasEntityInList = (list, getter) => list.some((item) => getter(item) === entityId);
    const ensureSections = () => {
      if (!Array.isArray(this._roomConfig.sections)) this._roomConfig.sections = [];
      return this._roomConfig.sections;
    };
    const getSection = (type) => {
      const sections = ensureSections();
      return sections.find((item) => item?.type === type) || null;
    };
    const createSection = (type, defaults) => {
      const sections = ensureSections();
      const section = { type, ...defaults };
      sections.push(section);
      return section;
    };

    if (widgetClass === 'lighting') {
      let section = getSection('lighting');
      if (!section && !allowCreateMissing) {
        return { ok: false, needsCreate: true, sectionType: 'lighting' };
      }
      if (!section) {
        section = createSection('lighting', {
          title: 'Lighting',
          layout: 'list',
          mode_default: 'brightness',
          groups: [],
          ungrouped: [],
        });
      }
      const grouped = (section.groups || []).flatMap((group) => group?.entities || []);
      if (grouped.includes(entityId) || (section.ungrouped || []).includes(entityId)) {
        return { ok: false, message: 'Widget already exists.' };
      }
      if (!Array.isArray(section.ungrouped)) section.ungrouped = [];
      section.ungrouped.push(entityId);
    } else if (widgetClass === 'climate') {
      let section = getSection('climate');
      if (!section && !allowCreateMissing) {
        return { ok: false, needsCreate: true, sectionType: 'climate' };
      }
      if (!section) {
        section = createSection('climate', { title: 'Climate', entities: [] });
      }
      const entities = [];
      if (Array.isArray(section.entities)) entities.push(...section.entities);
      if (Array.isArray(section.entity)) entities.push(...section.entity);
      if (typeof section.entity === 'string') entities.push(section.entity);
      if (entities.includes(entityId)) {
        return { ok: false, message: 'Widget already exists.' };
      }
      entities.push(entityId);
      section.entities = entities;
      delete section.entity;
    } else if (widgetClass === 'devices') {
      let section = getSection('devices');
      if (!section && !allowCreateMissing) {
        return { ok: false, needsCreate: true, sectionType: 'devices' };
      }
      if (!section) {
        section = createSection('devices', {
          title: 'Devices',
          switches: [],
          media_players: [],
          power_map: {},
        });
      }
      if (!Array.isArray(section.switches)) section.switches = [];
      if (hasEntityInList(section.switches, (item) => item?.entity)) {
        return { ok: false, message: 'Widget already exists.' };
      }
      const item = { entity: entityId, name };
      if (icon) item.icon = icon;
      section.switches.push(item);
    } else if (widgetClass === 'sensors') {
      if (!Array.isArray(this._roomConfig.sensors) && !allowCreateMissing) {
        return { ok: false, needsCreate: true, sectionType: 'sensors' };
      }
      if (!Array.isArray(this._roomConfig.sensors)) this._roomConfig.sensors = [];
      if (hasEntityInList(this._roomConfig.sensors, (item) => item?.entity)) {
        return { ok: false, message: 'Widget already exists.' };
      }
      const item = { entity: entityId, name };
      if (icon) item.icon = icon;
      this._roomConfig.sensors.push(item);
    } else if (widgetClass === 'mediaplayers') {
      let section = getSection('mediaplayers');
      if (!section && !allowCreateMissing) {
        return { ok: false, needsCreate: true, sectionType: 'mediaplayers' };
      }
      if (!section) {
        section = createSection('mediaplayers', {
          title: 'Mediaplayers',
          players: [],
          tv_players: [],
        });
      }
      if (!Array.isArray(section.players)) section.players = [];
      if (!Array.isArray(section.tv_players)) section.tv_players = [];
      if (hasEntityInList(section.players, (item) => item?.entity) || hasEntityInList(section.tv_players, (item) => item?.entity)) {
        return { ok: false, message: 'Widget already exists.' };
      }

      const isTvLike = domain === 'media_player'
        && (entityId.toLowerCase().includes('tv') || String(name).toLowerCase().includes('tv'));
      const item = { entity: entityId, name, wide: true };
      if (icon) item.icon = icon;
      if (isTvLike) {
        item.show_primary = false;
        item.show_volume = false;
        section.tv_players.push(item);
      } else {
        section.players.push(item);
      }
    } else {
      return { ok: false, message: 'Unsupported class.' };
    }

    // Re-enable entity if it was hidden/removed before.
    this._setWidgetOverride(entityId, { hidden: false, removed: false });
    return { ok: true };
  }

  // ===== Helpers =====

  async _createSceneFromVisibleLights(sceneName) {
    if (!this._hass?.callService) return { ok: false, message: 'Home Assistant unavailable.' };

    const visibleLights = Array.from(
      this.shadowRoot.querySelectorAll('.hue-light-tile[data-entity]')
    )
      .map((tile) => String(tile.dataset.entity || '').trim())
      .filter((entityId) => entityId.startsWith('light.'));

    const uniqueLights = [...new Set(visibleLights)];
    if (!uniqueLights.length) {
      return { ok: false, message: 'No visible lights to snapshot.' };
    }

    const sceneId = this._slugifySceneName(sceneName);
    if (!sceneId) return { ok: false, message: 'Invalid scene name.' };
    const entityId = `scene.${sceneId}`;

    try {
      await this._hass.callService('scene', 'create', {
        scene_id: sceneId,
        snapshot_entities: uniqueLights,
      });
    } catch (error) {
      console.error('[HueRoomScreen] Failed to create scene:', error);
      return { ok: false, message: 'Home Assistant scene creation failed.' };
    }

    if (!Array.isArray(this._roomConfig.scenes)) {
      this._roomConfig.scenes = [];
    }
    const exists = this._roomConfig.scenes.some((item) => {
      if (typeof item === 'string') return item === entityId;
      return item?.entity === entityId;
    });
    if (!exists) {
      this._roomConfig.scenes.push({ entity: entityId, name: sceneName });
    }

    this._setWidgetOverride(entityId, { hidden: false, removed: false, name: sceneName });
    return { ok: true, entityId };
  }

  _slugifySceneName(value) {
    const base = String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!base) return '';
    return base.slice(0, 60);
  }

  _getLightsFromSection(section) {
    const lights = [];
    (section.groups || []).forEach((group) => lights.push(...(group.entities || [])));
    lights.push(...(section.ungrouped || []));
    return lights;
  }

  _getAllLightEntities() {
    const sections = this._roomConfig?.sections || [];
    const lights = [];
    sections.filter((section) => section.type === 'lighting')
      .forEach((section) => lights.push(...this._getLightsFromSection(section)));
    return lights;
  }

  _getLightingPageSize() {
    const isSmall = window.matchMedia && window.matchMedia('(max-width: 380px)').matches;
    if (isSmall) {
      this.style.setProperty('--hue-light-page-cols', '2');
      return 4; // 2 columns × 2 rows
    }

    this.style.setProperty('--hue-light-page-cols', '3');
    return 6; // 3 columns × 2 rows
  }

  _anyLightsOn() {
    return this._getAllLightEntities().some((id) => this._hass?.states?.[id]?.state === 'on');
  }

  // ===== State Updates =====

  _updateStates() {
    if (!this._hass) return;

    const headerBar = this.shadowRoot.querySelector('.hue-header-bar');
    const masterToggle = this.shadowRoot.querySelector('.hue-master-toggle');
    const anyOn = this._anyLightsOn();

    if (headerBar) {
      headerBar.setAttribute('data-on', anyOn ? 'true' : 'false');
    }

    if (masterToggle) {
      masterToggle.setAttribute('data-on', anyOn ? 'true' : 'false');
    }

    this._updateLightTiles();
    this._updateCameraTiles();
    this._updateDeviceTiles();
    this._updateClimateTiles();
    this._updateActionTiles();
    this._updateSensorTiles();
    this._applyWidgetOverridesToDom();
    this._refreshLightControlUi();

    // Optional: on doorbell/attention triggers, force the primary camera feed to reload.
    this._maybeKickAttentionCamera();

    // Keep embedded WebRTC cards wired with current hass + talk mode.
    void this._wireWebRtcCards();
  }

  _maybeKickAttentionCamera() {
    const attentionEntity = this._roomConfig?.attention_entity;
    const attentionCamera = this._roomConfig?.attention_camera_entity;
    if (!attentionEntity || !attentionCamera) return;
    const state = this._hass?.states?.[attentionEntity];
    const isOn = state?.state === 'on';
    if (this._attentionLastOn == null) this._attentionLastOn = isOn;
    if (!this._attentionLastOn && isOn) {
      this._reloadCameraNow(attentionCamera);
    }
    this._attentionLastOn = isOn;
  }

  _reloadCameraNow(cameraEntityId) {
    if (!cameraEntityId) return;
    const img = this.shadowRoot?.querySelector(`.hue-camera-feed[data-entity="${CSS.escape(cameraEntityId)}"]`);
    if (!img) return;

    // Restart the MJPEG connection. Adding a cache buster ensures the browser opens a new request.
    const liveSrc = img.dataset.liveSrc || '';
    if (!liveSrc) return;
    img.dataset.mode = 'live';
    img.src = this._withCacheBuster(liveSrc);
  }
  _cameraStreamUrl(entityId, stateOverride = null) {
    const state = stateOverride || this._hass?.states?.[entityId];
    const token = state?.attributes?.access_token;
    const base = `/api/camera_proxy_stream/${encodeURIComponent(entityId)}`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  _cameraSnapshotUrl(entityId, stateOverride = null) {
    const state = stateOverride || this._hass?.states?.[entityId];
    const entityPicture = state?.attributes?.entity_picture;
    if (typeof entityPicture === 'string' && entityPicture.startsWith('/api/camera_proxy/')) {
      return entityPicture;
    }

    const token = state?.attributes?.access_token;
    const base = `/api/camera_proxy/${encodeURIComponent(entityId)}`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  _withCacheBuster(url) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_cb=${Date.now()}`;
  }

  _wireCameraFeeds() {
    this.shadowRoot.querySelectorAll('.hue-camera-feed').forEach((img) => {
      if (img.dataset.bound === 'true') return;
      img.dataset.bound = 'true';

      const rawRefreshMs = Number.parseInt(img.dataset.refreshMs || '4500', 10);
      const refreshMs = Number.isFinite(rawRefreshMs)
        ? Math.max(2000, Math.min(15000, rawRefreshMs))
        : 4500;

      // Try live MJPEG stream first
      this._switchCameraToLive(img, refreshMs);
    });
  }

  async _wireWebRtcCards() {
    const hosts = Array.from(this.shadowRoot?.querySelectorAll('.hue-webrtc-host[data-webrtc="true"]') || []);
    if (hosts.length === 0) return;
    if (!this._hass) return;

    // WebRTC Camera card (AlexxIT) is loaded via HA dashboard resources.
    // If it's not installed, fall back to the existing MJPEG camera section(s).
    if (!customElements.get('webrtc-camera')) {
      console.warn('[HueRoomScreen] webrtc-camera element not found; cannot mount WebRTC cards.');
      return;
    }

    if (!this._webrtcCards) this._webrtcCards = new Map();
    if (!this._webrtcHelpersPromise) {
      this._webrtcHelpersPromise = (typeof window.loadCardHelpers === 'function')
        ? window.loadCardHelpers()
        : Promise.resolve(null);
    }
    const helpers = await this._webrtcHelpersPromise;
    if (!helpers?.createCardElement) {
      console.warn('[HueRoomScreen] Card helpers not available; cannot mount WebRTC cards.');
      return;
    }

    for (const host of hosts) {
      const entityId = host.dataset.entity;
      const cardId = host.dataset.cardId || entityId;
      if (!entityId || !cardId) continue;

      const allowMic = host.dataset.allowMic === 'true';
      const micOn = !!(allowMic && this._talkingActive);

      const cfg = {
        type: 'custom:webrtc-camera',
        entity: entityId,
        // Keep UI off; we provide our own big Talk button. The video should start instantly.
        ui: false,
        // Force WebRTC for lowest latency + to support 2-way audio (microphone).
        mode: 'webrtc',
        // Let the card handle best provider (go2rtc/web_rtc).
        muted: false,
        media: micOn ? 'video,audio,microphone' : 'video,audio',
      };

      const prev = this._webrtcCards.get(cardId);
      if (prev?.host === host && prev?.config?.media === cfg.media) {
        if (prev.el) prev.el.hass = this._hass;
        continue;
      }

      host.innerHTML = '';
      const el = await helpers.createCardElement(cfg);
      el.hass = this._hass;
      host.appendChild(el);
      this._webrtcCards.set(cardId, { host, el, config: cfg });
    }
  }

  _teardownWebRtcCards() {
    if (!this._webrtcCards) return;
    for (const { host } of this._webrtcCards.values()) {
      try {
        if (host) host.innerHTML = '';
      } catch (_e) { /* ignore */ }
    }
    this._webrtcCards.clear();
  }

  _switchCameraToLive(img, refreshMs) {
    const liveSrc = img.dataset.liveSrc;
    if (!liveSrc) {
      this._startSnapshotPolling(img, refreshMs);
      return;
    }

    img.dataset.mode = 'live';
    const errorHandler = () => {
      img.removeEventListener('error', errorHandler);
      console.warn('[HueRoomScreen] Live stream error, falling back to snapshot polling');
      this._switchCameraToSnapshot(img);
      this._startSnapshotPolling(img, refreshMs);
    };
    img.addEventListener('error', errorHandler, { once: true });
    img.src = liveSrc;

    // Periodically refresh the live URL (access tokens rotate)
    const tokenRefreshId = setInterval(() => {
      if (!img.isConnected) {
        clearInterval(tokenRefreshId);
        return;
      }
      const entityId = img.dataset.entity;
      if (!entityId) return;
      const state = this._hass?.states?.[entityId];
      if (!state) return;
      const newLiveSrc = this._cameraStreamUrl(entityId, state);
      const newSnapshotSrc = this._cameraSnapshotUrl(entityId, state);
      img.dataset.liveSrc = newLiveSrc;
      img.dataset.snapshotSrc = newSnapshotSrc;
      if (img.dataset.mode === 'live' && img.src !== newLiveSrc) {
        img.src = newLiveSrc;
      }
    }, 60000);
    this._cameraRefreshIntervals.set(`token-${img.dataset.entity}`, tokenRefreshId);
  }

  _startSnapshotPolling(img, refreshMs) {
    this._refreshCameraSnapshot(img, true);
    const intervalId = setInterval(() => this._refreshCameraSnapshot(img), refreshMs);
    this._cameraRefreshIntervals.set(img, intervalId);
  }

  _switchCameraToSnapshot(img) {
    this._refreshCameraSnapshot(img, true);
  }

  _refreshCameraSnapshot(img, force = false) {
    if (!img || !img.isConnected) return;

    const snapshotSrc = img.dataset.snapshotSrc;
    if (!snapshotSrc) return;
    if (!force && img.dataset.loading === 'true') return;
    if (!force && document.hidden) return;

    img.dataset.loading = 'true';
    const nextSrc = this._withCacheBuster(snapshotSrc);
    const loader = new Image();
    loader.decoding = 'async';
    loader.onload = () => {
      if (!img.isConnected) return;
      img.src = nextSrc;
      img.dataset.mode = 'snapshot';
      delete img.dataset.loading;
    };
    loader.onerror = () => {
      if (!img.isConnected) return;
      delete img.dataset.loading;
    };
    loader.src = nextSrc;
  }

  _teardownCameraFeeds() {
    for (const [key, intervalId] of this._cameraRefreshIntervals.entries()) {
      clearInterval(intervalId);
    }
    this._cameraRefreshIntervals.clear();
  }

  _updateCameraTiles() {
    this.shadowRoot.querySelectorAll('.hue-camera-card').forEach((tile) => {
      const entityId = tile.dataset.entity;
      const state = this._hass?.states?.[entityId];
      const available = !!state && state.state !== 'unavailable' && state.state !== 'unknown';

      tile.classList.toggle('is-unavailable', !available);

      const img = tile.querySelector('.hue-camera-feed');
      const statusEl = tile.querySelector('.hue-camera-status');
      if (statusEl) {
        if (!available) {
          statusEl.textContent = 'Unavailable';
        } else {
          statusEl.textContent = 'Live';
        }
      }
    });
  }

  _updateLightTiles() {
    this.shadowRoot.querySelectorAll('.hue-light-tile').forEach((tile) => {
      const entityId = tile.dataset.entity;
      const state = this._hass?.states?.[entityId];
      if (!state) {
        tile.classList.remove('is-on');
        const toggle = tile.querySelector('.hue-toggle');
        if (toggle) toggle.setAttribute('data-on', 'false');
        const brightnessEl = tile.querySelector('.hue-light-brightness');
        if (brightnessEl) brightnessEl.textContent = '--%';
        const iconWrap = tile.querySelector('.hue-tile-icon');
        if (iconWrap) {
          iconWrap.style.color = 'var(--hue-text-muted)';
          iconWrap.style.filter = '';
        }
        return;
      }

      const isOn = state.state === 'on';
      tile.classList.toggle('is-on', isOn);

      const toggle = tile.querySelector('.hue-toggle');
      if (toggle) toggle.setAttribute('data-on', isOn ? 'true' : 'false');
      const brightnessEl = tile.querySelector('.hue-light-brightness');
      if (brightnessEl) {
        const rawBrightness = Number(state.attributes?.brightness);
        const brightness = Number.isFinite(rawBrightness)
          ? Math.max(0, Math.min(100, Math.round((rawBrightness / 255) * 100)))
          : (isOn ? 100 : 0);
        brightnessEl.textContent = `${brightness}%`;
      }

      const iconWrap = tile.querySelector('.hue-tile-icon');
      if (iconWrap) {
        const lightColor = getLightColor(state);
        if (isOn) {
          iconWrap.style.color = lightColor;
          iconWrap.style.filter = `drop-shadow(0 0 8px ${lightColor})`;
        } else {
          iconWrap.style.color = 'var(--hue-text-muted)';
          iconWrap.style.filter = '';
        }
      }
    });
  }

  _updateDeviceTiles() {
    this.shadowRoot.querySelectorAll('.hue-device-tile').forEach((tile) => {
      const entityId = tile.dataset.entity;
      const state = this._hass?.states?.[entityId];
      if (!state) {
        tile.classList.remove('is-on');
        const toggle = tile.querySelector('.hue-toggle');
        if (toggle) toggle.setAttribute('data-on', 'false');
        const subtitle = tile.querySelector('.hue-tile-subtitle');
        if (subtitle) subtitle.textContent = 'Unavailable';
        return;
      }

      const domain = entityId.split('.')[0];
      const isOn = domain === 'media_player'
        ? state.state === 'playing' || state.state === 'paused'
        : isEntityOn(this._hass, entityId);
      tile.classList.toggle('is-on', isOn);

      const toggle = tile.querySelector('.hue-toggle');
      if (toggle) toggle.setAttribute('data-on', isOn ? 'true' : 'false');

      const subtitle = tile.querySelector('.hue-tile-subtitle');
      if (!subtitle) return;

      if (domain === 'media_player') {
        const mediaTitle = state.attributes?.media_title || '';
        const mediaArtist = state.attributes?.media_artist || '';
        const source = state.attributes?.source || '';
        const sourceLower = String(source).toLowerCase();
        const isTvSource = sourceLower.includes('tv') || sourceLower.includes('hdmi');
        if (state.state === 'playing' && mediaTitle) {
          subtitle.textContent = `${mediaTitle}${mediaArtist ? ' - ' + mediaArtist : ''}`;
        } else if (state.state === 'paused' && mediaTitle) {
          subtitle.textContent = `${mediaTitle} (Paused)`;
        } else if (source) {
          subtitle.textContent = `Source: ${source}`;
        } else if (state.state === 'playing') {
          subtitle.textContent = 'Playing';
        } else if (state.state === 'paused') {
          subtitle.textContent = 'Paused';
        } else if (state.state === 'idle') {
          subtitle.textContent = 'Idle';
        } else {
          subtitle.textContent = 'Off';
        }

        const volumeInput = tile.querySelector('.hue-media-volume');
        const volumeValue = tile.querySelector('.hue-media-volume-value');
        const volumePercent = Math.max(0, Math.min(100, Math.round((state.attributes?.volume_level || 0) * 100 / 2) * 2));
        if (volumeInput) {
          volumeInput.value = String(volumePercent);
          volumeInput.dataset.lastStep = String(volumePercent);
        }
        if (volumeValue) {
          volumeValue.textContent = `${volumePercent}%`;
        }

        const progressWrap = tile.querySelector('.hue-media-progress-wrap');
        const progressInput = tile.querySelector('.hue-media-progress');
        const progressValue = tile.querySelector('.hue-media-progress-value');
        if (progressWrap && progressInput) {
          const duration = Number(state.attributes?.media_duration);
          const position = Number(state.attributes?.media_position);
          const canShow = state.state === 'playing'
            && Number.isFinite(duration) && duration > 0
            && Number.isFinite(position) && position >= 0;
          progressWrap.classList.toggle('is-hidden', !canShow);
          if (canShow) {
            const pct = Math.max(0, Math.min(100, Math.round((position / duration) * 100)));
            progressInput.value = String(pct);
            if (progressValue) progressValue.textContent = `${pct}%`;
          }
        }

        const sourceSelect = tile.querySelector('.hue-media-source');
        if (sourceSelect) {
          const optionValues = Array.from(sourceSelect.options).map((opt) => opt.value);
          if (optionValues.includes(source)) {
            sourceSelect.value = source;
          }
        }

        const primaryBtn = tile.querySelector('.hue-media-primary');
        if (primaryBtn) {
          primaryBtn.dataset.action = 'media_primary';
          primaryBtn.title = isTvSource ? 'Mute or unmute' : 'Play or pause';
          const icon = primaryBtn.querySelector('ha-icon');
          const label = primaryBtn.querySelector('.hue-media-primary-label');
          if (icon) {
            icon.setAttribute('icon', isTvSource
              ? (state.attributes?.is_volume_muted ? 'mdi:volume-off' : 'mdi:volume-high')
              : (state.state === 'playing' ? 'mdi:pause' : 'mdi:play'));
          }
          if (label) {
            label.textContent = isTvSource
              ? (state.attributes?.is_volume_muted ? 'Unmute' : 'Mute')
              : (state.state === 'playing' ? 'Pause' : 'Play');
          }
        }
      } else {
        const powerEntity = tile.dataset.powerEntity;
        if (powerEntity) {
          const powerState = this._hass?.states?.[powerEntity];
          if (powerState && powerState.state !== 'unavailable') {
            const unit = powerState.attributes?.unit_of_measurement || 'W';
            subtitle.textContent = `${powerState.state} ${unit}`;
            return;
          }
        }
        subtitle.textContent = isOn ? 'On' : 'Off';
      }
    });
  }

  _updateClimateTiles() {
    this.shadowRoot.querySelectorAll('.hue-climate-tile').forEach((tile) => {
      const entityId = tile.dataset.entity;
      const state = this._hass?.states?.[entityId];
      if (!state) {
        tile.classList.remove('is-on');
        const toggle = tile.querySelector('.hue-climate-power');
        if (toggle) toggle.setAttribute('data-on', 'false');
        const currentEl = tile.querySelector('.hue-climate-current');
        const modeEl = tile.querySelector('.hue-climate-mode');
        if (currentEl) currentEl.textContent = '--';
        if (modeEl) {
          modeEl.classList.remove('is-heating', 'is-cooling');
          modeEl.textContent = 'OFF';
        }
        return;
      }

      const hvacMode = state.state;
      const isOn = hvacMode !== 'off' && hvacMode !== 'unavailable';
      tile.classList.toggle('is-on', isOn);
      const toggle = tile.querySelector('.hue-climate-power');
      if (toggle) toggle.setAttribute('data-on', isOn ? 'true' : 'false');

      const modeEl = tile.querySelector('.hue-climate-mode');
      if (modeEl) {
        modeEl.classList.remove('is-heating', 'is-cooling');
        if (state.attributes?.hvac_action === 'heating') {
          modeEl.classList.add('is-heating');
        } else if (state.attributes?.hvac_action === 'cooling') {
          modeEl.classList.add('is-cooling');
        }
        modeEl.textContent = formatHvacMode(hvacMode).toUpperCase();
      }

      const currentTemp = state.attributes?.current_temperature;
      const targetTemp = Number(state.attributes?.temperature);
      const currentEl = tile.querySelector('.hue-climate-current');
      const slider = tile.querySelector('.hue-climate-setpoint');

      if (currentEl) {
        currentEl.textContent = currentTemp != null ? `${currentTemp}°C` : '--';
      }
      if (slider && Number.isFinite(targetTemp)) {
        const clamped = Math.max(18, Math.min(25, targetTemp));
        slider.value = String(clamped);
        slider.dataset.lastStep = String(clamped);
      }
    });
  }

  _updateActionTiles() {
    this.shadowRoot.querySelectorAll('.hue-action-tile').forEach((tile) => {
      const entityId = tile.dataset.entity;
      const isServiceTile = !!tile.dataset.serviceDomain && !!tile.dataset.serviceName;
      const state = entityId ? this._hass?.states?.[entityId] : null;
      const available = isServiceTile
        ? true
        : (!!state && state.state !== 'unavailable' && state.state !== 'unknown');

      tile.classList.toggle('is-disabled', !available);
      tile.disabled = !available;

      const subtitle = tile.querySelector('.hue-tile-subtitle');
      if (!subtitle) return;
      if (tile.dataset.subtitleFixed === 'true') return;
      subtitle.textContent = available ? 'Tap to run' : 'Unavailable';
    });
  }

  _updateSensorTiles() {
    this.shadowRoot.querySelectorAll('.hue-sensor-tile').forEach((tile) => {
      const entityId = tile.dataset.entity;
      const state = this._hass?.states?.[entityId];
      const valueEl = tile.querySelector('.hue-tile-value');
      if (!valueEl) return;

      if (!state) {
        valueEl.textContent = '--';
        return;
      }

      let valueText = '--';
      if (state.state !== 'unavailable' && state.state !== 'unknown') {
        const domain = entityId.split('.')[0];
        if (domain === 'binary_sensor') {
          valueText = state.state === 'on' ? 'Active' : 'Inactive';
        } else {
          const unit = state.attributes?.unit_of_measurement || '';
          valueText = `${state.state}${unit ? ` ${unit}` : ''}`;
        }
      }
      valueEl.textContent = valueText;
    });
  }

  getCardSize() {
    return 6;
  }

  disconnectedCallback() {
    this._exitKioskMode();
    // Only tear down timers and camera feeds.
    // Event listeners are on the persistent shadowRoot — leave them intact
    // so they survive disconnect/reconnect cycles without reattachment.
    this._teardownCameraFeeds();
    this._teardownWebRtcCards();
    this._cancelBitcoinJobs({ resetReport: true });
    this._cancelWeatherJobs({ resetReport: true });
    this._cancelNewsJobs({ resetReport: true });
    this._clearLongPressTimer();
    this._closeLightControl();
  }

  _enterKioskMode() {
    // HA chrome can re-appear after navigation/renders; enforce kiosk mode continuously.
    if (this._kioskEnforcerActive) return;
    this._kioskEnforcerActive = true;
    this._kioskHidden = this._kioskHidden || new WeakMap();

    const apply = () => {
      const nodes = this._deepQueryAll([
        'app-header',
        'ha-tabs',
        'ha-tab-bar',
        'app-toolbar',
      ]);
      for (const el of nodes) {
        if (!el || !(el instanceof HTMLElement)) continue;
        if (this.contains(el)) continue;
        if (!this._kioskHidden.has(el)) {
          this._kioskHidden.set(el, { display: el.style.display || '' });
        }
        el.style.setProperty('display', 'none', 'important');
      }
    };

    apply();
    let rafScheduled = false;
    const schedule = () => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        apply();
      });
    };

    try { this._kioskObserver?.disconnect?.(); } catch (_e) { /* ignore */ }
    this._kioskObserver = new MutationObserver(schedule);
    try { this._kioskObserver.observe(document.documentElement, { subtree: true, childList: true }); } catch (_e) { /* ignore */ }

    try { clearInterval(this._kioskInterval); } catch (_e) { /* ignore */ }
    this._kioskInterval = setInterval(apply, 1000);
  }

  _exitKioskMode() {
    this._kioskEnforcerActive = false;
    try { this._kioskObserver?.disconnect?.(); } catch (_e) { /* ignore */ }
    this._kioskObserver = null;
    try { clearInterval(this._kioskInterval); } catch (_e) { /* ignore */ }
    this._kioskInterval = null;

    const hidden = this._kioskHidden;
    if (!hidden) return;
    try {
      const nodes = this._deepQueryAll(['app-header', 'ha-tabs', 'ha-tab-bar', 'app-toolbar']);
      for (const el of nodes) {
        if (!el || !(el instanceof HTMLElement)) continue;
        const prev = hidden.get(el);
        if (!prev) continue;
        if (prev.display) el.style.display = prev.display;
        else el.style.removeProperty('display');
      }
    } catch (_e) { /* ignore */ }
  }

  _deepQueryAll(selectors) {
    const sel = Array.isArray(selectors) ? selectors : [selectors];
    const out = [];
    const seen = new Set();
    const stack = [document.documentElement];
    while (stack.length) {
      const root = stack.pop();
      if (!root) continue;
      try {
        for (const s of sel) {
          const list = root.querySelectorAll ? root.querySelectorAll(s) : [];
          for (const el of list) {
            if (!el) continue;
            if (seen.has(el)) continue;
            seen.add(el);
            out.push(el);
          }
        }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let n = walker.currentNode;
        while (n) {
          if (n.shadowRoot) stack.push(n.shadowRoot);
          n = walker.nextNode();
        }
      } catch (_e) { /* ignore */ }
    }
    return out;
  }

  static getStubConfig() {
    return { room: 'woonkamer' };
  }
}

if (!customElements.get('hue-room-screen')) {
  customElements.define('hue-room-screen', HueRoomScreen);
}

export { HueRoomScreen };
