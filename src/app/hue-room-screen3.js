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
} from './config-loader3.js?v=12.20';
import { handleAction, toggleAllLights, hapticFeedback } from './events3.js?v=12.20';
import { escapeHtml, getLightColor, isEntityOn, formatHvacMode } from '../ui/helpers2.js?v=12.20';
import { renderScenesContent } from '../widgets/scenes.widget3.js?v=12.20';
import { renderLightingContent } from '../widgets/lighting.widget3.js?v=12.20';
import { renderClimateContent } from '../widgets/climate.widget2.js?v=12.20';
import { renderDevicesContent, renderMediaPlayersContent } from '../widgets/devices.widget2.js?v=12.20';
import { renderSensorsContent } from '../widgets/sensors.widget2.js?v=12.20';
import { renderActionsContent } from '../widgets/actions.widget2.js?v=12.20';

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

  .hue-action-tile .hue-tile-footer {
    justify-content: flex-start;
  }

  .hue-action-tile.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
    width: min(440px, calc(100vw - 24px));
    border-radius: 20px;
    padding: 20px 18px 18px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(45, 35, 24, 0.96), rgba(18, 14, 11, 0.96));
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 16px 42px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: calc(100vh - 46px);
    overflow: auto;
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

  .light-control-power-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.22);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.06);
  }

  .light-control-power-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.3px;
    color: var(--hue-text-secondary);
    text-transform: uppercase;
  }

  .light-control-power-toggle {
    width: 50px;
    height: 28px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.38);
    border: 1px solid rgba(255, 255, 255, 0.14);
    position: relative;
    flex: 0 0 auto;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }

  .light-control-power-toggle[data-on="true"] {
    background: linear-gradient(180deg, rgba(255, 193, 120, 0.85), rgba(214, 117, 54, 0.86));
    border-color: rgba(255, 205, 116, 0.7);
    box-shadow: 0 0 16px rgba(255, 170, 80, 0.22);
  }

  .light-control-power-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 7px rgba(0, 0, 0, 0.4);
    transition: transform 0.22s ease;
  }

  .light-control-power-toggle[data-on="true"] .light-control-power-thumb {
    transform: translateX(22px);
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

  .light-control-group.is-hidden {
    display: none;
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
    this._listenersAttached = false;
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
    this._lightControlEntity = null;
    this._lightControlSupportsColor = false;
    this._lightControlSupportsTemp = false;
    this._lightControlDragging = { brightness: false, color: false, temp: false };
    this._lightControlThrottleTimers = { brightness: null, color: null, temp: null };
    this._lightControlLastStep = { brightness: null, color: null, temp: null };
    this._lightControlPending = { brightnessPct: null, hue: null, temp: null };
    this._autoCameraEntities = null;
    this._autoCameraLookupStarted = false;
  }

  setConfig(config) {
    if (!config.room) throw new Error('You need to define a room id');
    this._config = config;
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
              <div class="light-control-group">
                <div class="light-control-label">Brightness</div>
                <input class="light-control-slider light-control-brightness" type="range" min="1" max="100" step="1" />
              </div>
              <div class="light-control-power-row">
                <div class="light-control-power-label">Power</div>
                <div class="light-control-power-toggle" data-light-action="toggle-power" data-on="false" role="switch" aria-checked="false">
                  <div class="light-control-power-thumb"></div>
                </div>
              </div>
              <div class="light-control-group light-control-group-color">
                <div class="light-control-label">Color</div>
                <input class="light-control-slider light-control-color" type="range" min="0" max="360" step="1" />
              </div>
              <div class="light-control-group light-control-group-temp">
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
    this._applyWidgetOverridesToDom();
    this._rendered = true;
    this._updateStates();
  }

  // ===== Section Rendering =====

  _renderSections() {
    const sections = this._roomConfig.sections || [];
    const lightingSection = sections.find((section) => section.type === 'lighting');
    const climateSection = sections.find((section) => section.type === 'climate');
    const cameraSections = sections.filter((section) => section.type === 'camera');
    const devicesSection = sections.find((section) => section.type === 'devices');
    const mediaPlayerSection = sections.find((section) => section.type === 'mediaplayers');
    const actionSections = sections.filter((section) => section.type === 'actions');

    const blocks = [];

    if (this._roomConfig.scenes && this._roomConfig.scenes.length > 0) {
      blocks.push(this._renderScenesSection(this._roomConfig.scenes));
    }

    if (lightingSection) {
      blocks.push(this._renderLightingSection(lightingSection));
    }

    if (climateSection) {
      blocks.push(this._renderClimateSection(climateSection));
    }

    cameraSections.forEach((section) => {
      blocks.push(this._renderCameraSection(section));
    });

    // Auto camera fallback: if the room config has no camera section, render
    // any camera entities that match the room (area-scoped async, then rerender).
    if (cameraSections.length === 0) {
      const autoEntities = Array.isArray(this._autoCameraEntities) ? this._autoCameraEntities : null;
      if (autoEntities && autoEntities.length > 0) {
        autoEntities.forEach((entityId) => {
          blocks.push(this._renderCameraSection({ type: 'camera', entity: entityId, title: 'CAMERA' }));
        });
      } else if (!this._autoCameraLookupStarted) {
        this._autoCameraLookupStarted = true;
        void this._loadAutoCamerasForRoom();
      }
    }

    if (devicesSection) {
      blocks.push(this._renderDevicesSection(devicesSection));
    }

    if (mediaPlayerSection) {
      blocks.push(this._renderMediaPlayersSection(mediaPlayerSection));
    }

    actionSections.forEach((section) => {
      blocks.push(this._renderActionsSection(section));
    });

    if (this._roomConfig.sensors && this._roomConfig.sensors.length > 0) {
      blocks.push(this._renderSensorsSection(this._roomConfig.sensors));
    }

    return blocks.join('');
  }

  async _loadAutoCamerasForRoom() {
    try {
      const options = await this._getRoomAreaScopedEntities(['camera']);
      this._autoCameraEntities = (options || []).map((o) => o.entity_id).filter((id) => String(id).startsWith('camera.'));
    } catch {
      this._autoCameraEntities = [];
    }
    if (this._rendered) {
      this._render();
    }
  }

  _renderScenesSection(scenes) {
    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">SCENES</span>
        </div>
        <div class="hue-scene-pager">
          ${renderScenesContent(this._hass, scenes)}
        </div>
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
          <span class="hue-section-title">LIGHTING</span>
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
          <span class="hue-section-title">CLIMATE</span>
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
          <span class="hue-section-title">DEVICES</span>
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

    return `
      <div class="hue-section">
        <div class="hue-section-header">
          <span class="hue-section-title">${escapeHtml(title.toUpperCase())}</span>
        </div>
        <div class="hue-camera-card ${available ? '' : 'is-unavailable'}" data-action="more_info" data-entity="${escapeHtml(entityId)}">
          <div class="hue-camera-media">
            <img
              class="hue-camera-feed"
              src="${escapeHtml(streamUrl)}"
              alt="${escapeHtml(cameraName)}"
              loading="lazy"
              data-live-src="${escapeHtml(streamUrl)}"
              data-snapshot-src="${escapeHtml(snapshotUrl)}"
              data-mode="live"
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

  // ===== Event Handling =====

  _attachEventListeners() {
    if (this._listenersAttached) return;
    this.shadowRoot.addEventListener('pointerdown', this._boundHandlePointerDown);
    this.shadowRoot.addEventListener('click', this._boundHandleClick);
    this.shadowRoot.addEventListener('pointerup', this._boundHandlePointerUp);
    this.shadowRoot.addEventListener('pointercancel', this._boundHandlePointerCancel);
    this.shadowRoot.addEventListener('pointermove', this._boundHandlePointerMove);
    this.shadowRoot.addEventListener('input', this._boundHandleInput);
    this.shadowRoot.addEventListener('change', this._boundHandleChange);
    this._listenersAttached = true;
  }

  _handlePointerDown(e) {
    const overlay = this.shadowRoot.querySelector('.widget-editor-overlay');
    if (overlay?.classList.contains('is-open')) return;
    const lightOverlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (lightOverlay?.classList.contains('is-open')) {
      // While the light control is open, we still want pointer events for sliders,
      // but we must never start the long-press widget editor timer.
      const brightness = e.target.closest('.light-control-brightness');
      const color = e.target.closest('.light-control-color');
      const temp = e.target.closest('.light-control-temp');
      if (brightness) this._lightControlDragging.brightness = true;
      if (color) this._lightControlDragging.color = true;
      if (temp) this._lightControlDragging.temp = true;
      return;
    }

    const backButton = e.target.closest('.hue-header-back');
    if (backButton) {
      e.preventDefault();
      e.stopPropagation();
      this._navigateToPath(backButton.dataset.path, true);
      return;
    }

    const isInteractive = e.target.closest(
      '.hue-header-back, .hue-toggle, .hue-media-primary, .hue-media-volume, .hue-media-source, .hue-climate-setpoint, .light-control-modal, button, input, select'
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

    const lightOverlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (lightOverlay?.classList.contains('is-open')) {
      const brightness = e.target.closest('.light-control-brightness');
      const color = e.target.closest('.light-control-color');
      const temp = e.target.closest('.light-control-temp');
      if (brightness) {
        this._lightControlDragging.brightness = false;
        this._flushLightControlTimer('brightness');
      }
      if (color) {
        this._lightControlDragging.color = false;
        this._flushLightControlTimer('color');
      }
      if (temp) {
        this._lightControlDragging.temp = false;
        this._flushLightControlTimer('temp');
      }
    }

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

      case 'more_info':
        if (entity) handleAction(this._hass, 'more_info', entity);
        break;
    }
  }

  _handleInput(e) {
    const lightBrightness = e.target.closest('.light-control-brightness');
    if (lightBrightness) {
      e.stopPropagation();
      const entity = this._lightControlEntity;
      if (!entity) return;
      const percent = Math.max(1, Math.min(100, Number.parseInt(lightBrightness.value, 10) || 1));
      this._lightControlPending.brightnessPct = percent;

      // Hard haptic on 2% steps to avoid noisy vibration spam.
      const stepped = Math.max(0, Math.min(100, Math.round(percent / 2) * 2));
      if (this._lightControlLastStep.brightness !== stepped) {
        this._lightControlLastStep.brightness = stepped;
        hapticFeedback('hard');
      }

      this._queueLightControlTimer('brightness');
      return;
    }

    const lightColor = e.target.closest('.light-control-color');
    if (lightColor) {
      e.stopPropagation();
      if (!this._lightControlSupportsColor) return;
      const entity = this._lightControlEntity;
      if (!entity) return;
      const hue = Math.max(0, Math.min(360, Number.parseInt(lightColor.value, 10) || 0));
      this._lightControlPending.hue = hue;
      this._setColorSliderGlow(hue);

      const stepped = Math.max(0, Math.min(360, Math.round(hue / 10) * 10));
      if (this._lightControlLastStep.color !== stepped) {
        this._lightControlLastStep.color = stepped;
        hapticFeedback('hard');
      }

      this._queueLightControlTimer('color');
      return;
    }

    const lightTemp = e.target.closest('.light-control-temp');
    if (lightTemp) {
      e.stopPropagation();
      if (!this._lightControlSupportsTemp) return;
      const entity = this._lightControlEntity;
      if (!entity) return;
      const temp = Number.parseInt(lightTemp.value, 10);
      if (!Number.isFinite(temp)) return;
      this._lightControlPending.temp = temp;
      this._setTempSliderGlow(temp, Number(lightTemp.min), Number(lightTemp.max));

      const stepped = Math.round(temp / 10) * 10;
      if (this._lightControlLastStep.temp !== stepped) {
        this._lightControlLastStep.temp = stepped;
        hapticFeedback('hard');
      }

      this._queueLightControlTimer('temp');
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
      return;
    }

    const widgetSelect = e.target.closest('.widget-editor-entity-select');
    if (widgetSelect) {
      e.stopPropagation();
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
    const supported = Array.isArray(state?.attributes?.supported_color_modes)
      ? state.attributes.supported_color_modes.map((v) => String(v || '').toLowerCase())
      : [];
    this._lightControlSupportsColor = supported.some((m) => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m))
      || colorMode === 'hs'
      || colorMode === 'xy'
      || !!state?.attributes?.hs_color;
    this._lightControlSupportsTemp = supported.includes('color_temp')
      || colorMode === 'color_temp'
      || Number.isFinite(Number(state?.attributes?.color_temp))
      || Number.isFinite(Number(state?.attributes?.min_mireds))
      || Number.isFinite(Number(state?.attributes?.max_mireds));
    this._lightControlDragging = { brightness: false, color: false, temp: false };

    const overlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (!overlay) return;
    overlay.classList.add('is-open');
    this._refreshLightControlUi();
  }

  _closeLightControl() {
    const overlay = this.shadowRoot.querySelector('.light-control-overlay');
    if (overlay) overlay.classList.remove('is-open');
    this._lightControlEntity = null;
    this._lightControlSupportsColor = false;
    this._lightControlSupportsTemp = false;
    this._lightControlDragging = { brightness: false, color: false, temp: false };
    Object.keys(this._lightControlThrottleTimers || {}).forEach((key) => {
      const timer = this._lightControlThrottleTimers[key];
      if (timer) clearTimeout(timer);
      this._lightControlThrottleTimers[key] = null;
    });
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
      handleAction(this._hass, 'toggle', entity);
      this._refreshLightControlUi();
      return;
    }
  }

  _queueLightControlTimer(kind) {
    const key = String(kind || '').toLowerCase();
    if (!this._lightControlThrottleTimers) {
      this._lightControlThrottleTimers = { brightness: null, color: null, temp: null };
    }
    const existing = this._lightControlThrottleTimers[key];
    if (existing) clearTimeout(existing);
    this._lightControlThrottleTimers[key] = setTimeout(() => {
      this._lightControlThrottleTimers[key] = null;
      this._sendLightControlPending(key);
    }, 120);
  }

  _flushLightControlTimer(kind) {
    const key = String(kind || '').toLowerCase();
    const timer = this._lightControlThrottleTimers?.[key];
    if (timer) {
      clearTimeout(timer);
      this._lightControlThrottleTimers[key] = null;
    }
    this._sendLightControlPending(key);
  }

  _sendLightControlPending(kind) {
    const entity = this._lightControlEntity;
    if (!entity) return;
    const pending = this._lightControlPending || {};

    if (kind === 'brightness') {
      const pct = Number(pending.brightnessPct);
      if (!Number.isFinite(pct)) return;
      const percent = Math.max(1, Math.min(100, Math.round(pct)));
      const brightness = Math.round((percent / 100) * 255);
      handleAction(this._hass, 'set_brightness', entity, { brightness });
      return;
    }

    if (kind === 'color') {
      if (!this._lightControlSupportsColor) return;
      const hue = Number(pending.hue);
      if (!Number.isFinite(hue)) return;
      const safeHue = Math.max(0, Math.min(360, Math.round(hue)));
      const state = this._hass?.states?.[entity];
      const sat = Number.isFinite(Number(state?.attributes?.hs_color?.[1]))
        ? Number(state.attributes.hs_color[1])
        : 100;
      handleAction(this._hass, 'set_color_hue', entity, { hs_color: [safeHue, sat] });
      return;
    }

    if (kind === 'temp') {
      if (!this._lightControlSupportsTemp) return;
      const temp = Number(pending.temp);
      if (!Number.isFinite(temp)) return;
      handleAction(this._hass, 'set_color_temp', entity, { color_temp: Math.round(temp) });
    }
  }

	  _refreshLightControlUi() {
	    const overlay = this.shadowRoot.querySelector('.light-control-overlay');
	    if (!overlay?.classList.contains('is-open')) return;
	    const entity = this._lightControlEntity;
	    if (!entity) return;
	    const state = this._hass?.states?.[entity];
	    if (!state) return;

	    const titleEl = this.shadowRoot.querySelector('.light-control-title');
	    const brightnessEl = this.shadowRoot.querySelector('.light-control-brightness');
	    const powerToggle = this.shadowRoot.querySelector('.light-control-power-toggle');
	    const colorGroup = this.shadowRoot.querySelector('.light-control-group-color');
	    const tempGroup = this.shadowRoot.querySelector('.light-control-group-temp');
	    const colorEl = this.shadowRoot.querySelector('.light-control-color');
	    const tempEl = this.shadowRoot.querySelector('.light-control-temp');

	    const name = state.attributes?.friendly_name || entity.split('.')[1];
	    if (titleEl) titleEl.textContent = name;

	    const rawBrightness = Number(state.attributes?.brightness);
	    const brightnessPct = Number.isFinite(rawBrightness)
	      ? Math.max(1, Math.min(100, Math.round((rawBrightness / 255) * 100)))
	      : 100;
	    if (brightnessEl) {
	      if (!this._lightControlDragging?.brightness) {
	        brightnessEl.value = String(brightnessPct);
	      }
	      brightnessEl.style.setProperty('--track', 'linear-gradient(90deg, #5bb4ff 0%, #ffd56f 55%, #ff8a56 100%)');
	      brightnessEl.style.setProperty('--glow', 'rgba(255, 190, 102, 0.48)');
	    }

	    const isOn = state.state === 'on';
	    if (powerToggle) {
	      powerToggle.dataset.on = isOn ? 'true' : 'false';
	      powerToggle.setAttribute('aria-checked', isOn ? 'true' : 'false');
	    }

	    if (colorGroup) {
	      colorGroup.classList.toggle('is-hidden', !this._lightControlSupportsColor);
	    }
	    if (tempGroup) {
	      tempGroup.classList.toggle('is-hidden', !this._lightControlSupportsTemp);
	    }

	    const hue = Number.isFinite(Number(state.attributes?.hs_color?.[0]))
	      ? Number(state.attributes.hs_color[0])
	      : 30;
	    if (colorEl) {
	      if (!this._lightControlDragging?.color) {
	        colorEl.value = String(Math.round(hue));
	      }
	      colorEl.disabled = !this._lightControlSupportsColor;
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
	      if (!this._lightControlDragging?.temp) {
	        tempEl.value = String(colorTemp);
	      }
	      tempEl.disabled = !this._lightControlSupportsTemp;
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

      // Prefer live MJPEG stream, fall back to snapshot polling on error.
      img.addEventListener('error', () => {
        if (!img.isConnected) return;
        if (img.dataset.mode === 'live') {
          this._switchCameraToSnapshot(img);
        }
      });

      img.addEventListener('load', () => {
        if (!img.isConnected) return;
        img.dataset.lastOk = String(Date.now());
      });

      this._switchCameraToLive(img);

      // If we're in snapshot mode, poll snapshots. If live mode works, we don't need polling.
      const intervalId = setInterval(() => {
        if (!img.isConnected) return;
        if (img.dataset.mode === 'snapshot') {
          this._refreshCameraSnapshot(img);
        }
      }, refreshMs);
      this._cameraRefreshIntervals.set(img, intervalId);
    });
  }

  _switchCameraToLive(img) {
    if (!img || !img.isConnected) return;
    const liveSrc = img.dataset.liveSrc;
    if (!liveSrc) return;
    img.dataset.mode = 'live';
    img.src = liveSrc;
  }

  _switchCameraToSnapshot(img) {
    if (!img || !img.isConnected) return;
    img.dataset.mode = 'snapshot';
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
    for (const intervalId of this._cameraRefreshIntervals.values()) {
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

      if (img && available) {
        // Keep tokens fresh: camera access_token can rotate, so keep URLs updated.
        img.dataset.liveSrc = this._cameraStreamUrl(entityId, state);
        img.dataset.snapshotSrc = this._cameraSnapshotUrl(entityId, state);

        // If we're in live mode but the src doesn't match anymore, update it.
        if (img.dataset.mode === 'live' && img.src !== img.dataset.liveSrc) {
          img.src = img.dataset.liveSrc;
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
      const state = this._hass?.states?.[entityId];
      const available = !!state && state.state !== 'unavailable' && state.state !== 'unknown';

      tile.classList.toggle('is-disabled', !available);
      tile.disabled = !available;

      const subtitle = tile.querySelector('.hue-tile-subtitle');
      if (!subtitle) return;
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
    this._teardownCameraFeeds();
    this._clearLongPressTimer();
    this._closeLightControl();
    if (!this._listenersAttached) return;
    this.shadowRoot.removeEventListener('pointerdown', this._boundHandlePointerDown);
    this.shadowRoot.removeEventListener('click', this._boundHandleClick);
    this.shadowRoot.removeEventListener('pointerup', this._boundHandlePointerUp);
    this.shadowRoot.removeEventListener('pointercancel', this._boundHandlePointerCancel);
    this.shadowRoot.removeEventListener('pointermove', this._boundHandlePointerMove);
    this.shadowRoot.removeEventListener('input', this._boundHandleInput);
    this.shadowRoot.removeEventListener('change', this._boundHandleChange);
    this._listenersAttached = false;
  }

  static getStubConfig() {
    return { room: 'woonkamer' };
  }
}

if (!customElements.get('hue-room-screen')) {
  customElements.define('hue-room-screen', HueRoomScreen);
}

export { HueRoomScreen };
