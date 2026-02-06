/**
 * Hue Home Screen - Collapsing Dual-Title Header
 * Philips Hue–style collapsing header: large title cross-fades into a
 * small pinned title as you scroll, content slides under the header.
 *
 * Layout Model (v11.0):
 * - Fixed viewport root with infinite background
 * - Pinned header overlay (small title + backdrop, opacity driven by scroll)
 * - Single scroll container holding expanded header (large title, weather, people)
 *   followed by ROOMS + DEVICES sections
 */

import { loadRoomsIndex, saveRoomsIndexOverride, loadLanguageFile } from './config-loader3.js?v=3.1.47';
import { handleAction, toggleAllLights, hapticFeedback } from './events3.js?v=3.1.47';
import { escapeHtml, translateCondition, getWeatherEmoji, getTemperatureLEDColor, setTranslations, t } from '../ui/helpers2.js?v=3.1.47';
import { renderTeslaTile, TESLA_TILE_CSS } from '../widgets/tesla.widget.js?v=3.1.47';
import { renderTeslaScreen } from './tesla-screen.js?v=3.1.47';

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

  /* ===== MAIN CONTAINER - FIXED APP CANVAS ===== */
  .hue-root {
    position: fixed;
    inset: 0;
    overflow: hidden;
    /* Safe area support for iOS notch/home indicator */
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

  /* ===== BACKGROUND LAYER - FIXED, INFINITE ===== */
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

  /* ===== PINNED HEADER OVERLAY ===== */
  .header-pinned {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    pointer-events: none;
  }

  .header-material {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%),
      radial-gradient(ellipse at top, rgba(255,255,255,0.05), transparent 40%),
      linear-gradient(135deg, #4a3a2a 0%, #6b5b4b 25%, #5a4a3a 50%, #4a3a2a 75%, #3a2a1a 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    opacity: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .nav-row {
    position: relative;
    display: flex;
    align-items: center;
    height: 56px;
    padding: 0 24px;
    pointer-events: auto;
  }

  .small-title {
    font-size: 18px;
    font-weight: 700;
    color: #f5e6d3;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    opacity: 0;
    transform: translateY(8px);
    will-change: opacity, transform;
  }

  .home-title-button {
    border: 0;
    padding: 0;
    margin: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-shadow: inherit;
    cursor: pointer;
  }

  .nav-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ===== CONTENT SCROLL CONTAINER ===== */
  .content-scroll {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    z-index: 10;
  }

  .content-scroll::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }

  /* ===== EXPANDED HEADER (inside scroll) ===== */
  .expanded-header {
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 18px 0 18px;
  }

  .large-title {
    font-size: 34px;
    font-weight: 800;
    color: var(--hue-text-primary);
    text-shadow: 0 2px 4px rgba(0,0,0,0.45);
    margin-bottom: 20px;
    will-change: opacity, transform;
  }

  /* ===== WEATHER WIDGET ===== */
  .weather-widget {
    background: var(--hue-surface-tile);
    border-radius: var(--hue-radius-lg);
    padding: 16px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255, 255, 255, 0.06);
    position: relative;
    overflow: hidden;
    will-change: opacity, transform;
  }

  .widget-pager-frame {
    background: var(--hue-surface-tile);
    border-radius: var(--hue-radius-lg);
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 24px;
    overflow: hidden;
    will-change: opacity, transform;
    position: relative;
  }

  .widget-pager-frame::before,
  .widget-pager-frame::after {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.6);
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 6px rgba(0,0,0,0.28);
    pointer-events: none;
    z-index: 4;
  }

  .widget-pager-frame::before {
    content: '‹';
    left: 6px;
    opacity: 0.35;
  }

  .widget-pager-frame::after {
    content: '›';
    right: 6px;
    opacity: 0.75;
  }

  .widget-pager-frame[data-page="people"]::before {
    opacity: 0.2;
  }

  .widget-pager-frame[data-page="people"]::after {
    opacity: 0.78;
  }

  .widget-pager-frame[data-page="weather"]::before {
    opacity: 0.78;
  }

  .widget-pager-frame[data-page="weather"]::after {
    opacity: 0.25;
  }

  .widget-pager {
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    touch-action: pan-x;
  }

  .widget-pager::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .widget-page {
    flex: 0 0 100%;
    width: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    box-sizing: border-box;
    min-height: 164px;
    padding: 16px;
  }

  .widget-page .weather-widget {
    margin-bottom: 0;
    padding: 0;
    min-height: 100%;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
  }

  /* ===== WEATHER FULLSCREEN FX ===== */
  .weather-fx-overlay {
    position: absolute;
    inset: 0;
    z-index: 120;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity 620ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0ms linear 620ms;
  }

  .weather-fx-overlay.is-active {
    opacity: 1;
    visibility: visible;
    transition-delay: 0ms;
  }

  .weather-fx-overlay.is-exit {
    opacity: 0;
  }

  .weather-fx-backdrop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    transform: scale(1.03) translateY(10px);
    filter: blur(2px);
    transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1), filter 700ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .weather-fx-overlay.is-active .weather-fx-backdrop {
    transform: scale(1) translateY(0);
    filter: blur(0);
  }

  .weather-fx-overlay.is-exit .weather-fx-backdrop {
    transform: scale(1.02) translateY(-6px);
    filter: blur(1px);
  }

  .weather-fx-overlay[data-effect="rain"] .weather-fx-backdrop {
    background:
      radial-gradient(circle at 20% 15%, rgba(255,255,255,0.14), rgba(255,255,255,0) 36%),
      linear-gradient(180deg, rgba(16, 28, 44, 0.48) 0%, rgba(12, 18, 29, 0.52) 100%);
  }

  .weather-fx-overlay[data-effect="rain"] .weather-fx-backdrop::before,
  .weather-fx-overlay[data-effect="rain"] .weather-fx-backdrop::after {
    content: '';
    position: absolute;
    inset: -25% 0;
    background-image: repeating-linear-gradient(
      110deg,
      rgba(173, 216, 255, 0) 0px,
      rgba(173, 216, 255, 0) 10px,
      rgba(173, 216, 255, 0.2) 11px,
      rgba(173, 216, 255, 0.2) 12px
    );
    animation: rainSweep 1250ms linear infinite;
  }

  .weather-fx-overlay[data-effect="rain"] .weather-fx-backdrop::after {
    opacity: 0.25;
    animation-duration: 1580ms;
    animation-delay: -240ms;
  }

  .weather-fx-overlay[data-effect="cloud"] .weather-fx-backdrop {
    background:
      radial-gradient(circle at 18% 24%, rgba(255,255,255,0.12), rgba(255,255,255,0) 34%),
      radial-gradient(circle at 70% 12%, rgba(255,255,255,0.1), rgba(255,255,255,0) 30%),
      linear-gradient(180deg, rgba(90, 106, 122, 0.44) 0%, rgba(54, 66, 78, 0.5) 100%);
  }

  .weather-fx-overlay[data-effect="cloud"] .weather-fx-backdrop::before,
  .weather-fx-overlay[data-effect="cloud"] .weather-fx-backdrop::after {
    content: '';
    position: absolute;
    width: 52vw;
    height: 24vw;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    filter: blur(12px);
    animation: cloudDrift 5.4s ease-in-out infinite alternate;
  }

  .weather-fx-overlay[data-effect="cloud"] .weather-fx-backdrop::before {
    top: 26%;
    left: -8%;
  }

  .weather-fx-overlay[data-effect="cloud"] .weather-fx-backdrop::after {
    top: 48%;
    right: -10%;
    animation-delay: -1.1s;
  }

  .weather-fx-overlay[data-effect="sun"] .weather-fx-backdrop {
    background:
      radial-gradient(circle at 50% 42%, rgba(255, 234, 145, 0.58) 0%, rgba(255, 206, 92, 0.34) 20%, rgba(255, 171, 59, 0.14) 45%, rgba(255, 171, 59, 0) 72%),
      linear-gradient(180deg, rgba(255, 191, 77, 0.34) 0%, rgba(215, 130, 42, 0.38) 100%);
    animation: sunPulse 3.2s ease-in-out infinite;
  }

  .weather-widget::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  }

  .weather-icon {
    font-size: 56px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: var(--hue-radius-full);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 16px rgba(0,0,0,0.35);
  }

  .weather-emoji {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  .weather-info {
    flex: 1;
  }

  .weather-temp {
    font-size: 44px;
    font-weight: 700;
    color: var(--hue-text-primary);
    text-shadow: 0 2px 4px rgba(0,0,0,0.45);
    line-height: 1;
    margin-bottom: 4px;
  }

  .weather-condition {
    font-size: var(--hue-font-size-lg);
    color: var(--hue-text-secondary);
    text-shadow: 0 1px 2px rgba(0,0,0,0.45);
    font-weight: var(--hue-font-weight-medium);
  }

  .weather-meta {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .weather-location,
  .weather-rain {
    font-size: 12px;
    color: var(--hue-text-muted);
    line-height: 1.2;
  }

  .weather-rain {
    color: var(--hue-text-secondary);
  }

  /* ===== PEOPLE ROW ===== */
  .people-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 0;
    flex-wrap: wrap;
    will-change: opacity, transform;
  }

  .people-widget {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
  }

  .people-widget-title {
    font-size: var(--hue-font-size-sm);
    font-weight: var(--hue-font-weight-semibold);
    color: var(--hue-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
  }

  .person-card {
    width: 78px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .person-avatar {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .person-avatar:active {
    transform: scale(0.95);
  }

  @media (hover: hover) {
    .person-avatar:hover {
      transform: scale(1.05);
    }
  }

  .person-avatar-ring {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(0,0,0,0.35));
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    transition: all 0.4s ease;
  }

  .person-avatar.home .person-avatar-ring {
    background: linear-gradient(145deg, #55c46f, #258a45);
    box-shadow: 0 0 14px rgba(61, 220, 112, 0.45), 0 4px 10px rgba(0,0,0,0.35);
  }

  .person-avatar.not_home .person-avatar-ring {
    background: linear-gradient(145deg, #4a4a4a, #3a3a3a);
    opacity: 0.6;
  }

  .person-avatar-img {
    position: absolute;
    inset: 3px;
    width: calc(100% - 6px);
    height: calc(100% - 6px);
    border-radius: 50%;
    object-fit: cover;
    background: rgba(0,0,0,0.24);
    box-shadow: inset 0 -2px 4px rgba(0,0,0,0.32);
    transition: opacity 0.3s ease, filter 0.3s ease;
  }

  .person-avatar.not_home .person-avatar-img {
    filter: grayscale(0.7) brightness(0.7);
    opacity: 0.7;
  }

  .person-avatar-placeholder {
    position: absolute;
    inset: 3px;
    width: calc(100% - 6px);
    height: calc(100% - 6px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.24);
    box-shadow: inset 0 -2px 4px rgba(0,0,0,0.32);
  }

  .person-avatar-placeholder ha-icon {
    --mdc-icon-size: 32px;
    color: #888;
  }

  .person-status-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #444;
    border: 2px solid rgba(30, 24, 20, 0.9);
    transition: all 0.4s ease;
  }

  .person-avatar.home .person-status-dot {
    background: radial-gradient(circle at 30% 30%, #88ff88, #39bd5c);
    box-shadow: 0 0 8px rgba(61, 220, 112, 0.6);
  }

  .person-zone {
    max-width: 100%;
    font-size: 11px;
    line-height: 1.1;
    color: var(--hue-text-secondary);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .person-avatar.not_home .person-status-dot {
    background: radial-gradient(circle at 30% 30%, #888, #666);
  }

  .person-avatar.unknown .person-status-dot {
    background: radial-gradient(circle at 30% 30%, #666, #444);
  }

  /* ===== SCROLLABLE CONTENT SECTIONS ===== */
  .scroll-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 24px 18px 32px 18px;
  }

  .person-detail {
    max-width: 680px;
    margin: 0 auto;
    padding: 34px 18px 32px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .person-detail-back {
    align-self: flex-start;
    height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.2);
    background: rgba(255, 255, 255, 0.08);
    color: var(--hue-text-primary);
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .person-detail-card {
    background: var(--hue-surface-tile);
    border-radius: var(--hue-radius-lg);
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 16px;
  }

  .person-detail-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .person-detail-photo-wrap {
    width: 128px;
    height: 128px;
    border-radius: 50%;
    padding: 4px;
    background: linear-gradient(145deg, rgba(85,196,111,0.85), rgba(37,138,69,0.95));
    box-shadow: 0 0 20px rgba(61,220,112,0.35);
  }

  .person-detail-photo {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    background: rgba(0,0,0,0.22);
  }

  .person-detail-name {
    font-size: 22px;
    font-weight: 800;
    color: var(--hue-text-primary);
    text-align: center;
  }

  .person-detail-location {
    font-size: 13px;
    color: var(--hue-text-secondary);
    text-align: center;
  }

  .person-map-frame {
    width: 100%;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.26);
    min-height: 220px;
  }

  .person-map-frame iframe {
    width: 100%;
    height: 220px;
    border: 0;
    display: block;
  }

  .person-battery-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--hue-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 8px;
  }

  .person-battery-track {
    height: 12px;
    border-radius: 999px;
    background: rgba(0,0,0,0.34);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.45);
    overflow: hidden;
  }

  .person-battery-fill {
    height: 100%;
    width: 0%;
    border-radius: inherit;
    background: linear-gradient(90deg, #3ddc70 0%, #89ffad 100%);
    box-shadow: 0 0 12px rgba(61,220,112,0.45);
  }

  .person-battery-value {
    margin-top: 7px;
    font-size: 12px;
    color: var(--hue-text-secondary);
    text-align: right;
  }

  .person-phone-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .person-phone-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    line-height: 1.3;
    border-radius: 9px;
    padding: 6px 8px;
    background: rgba(0,0,0,0.2);
  }

  .person-phone-key {
    color: var(--hue-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .person-phone-value {
    color: var(--hue-text-primary);
    text-align: right;
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

  .home-section {
    margin-bottom: 22px;
  }

  .home-section:last-child {
    margin-bottom: 0;
  }

  /* ===== ROOM GRID ===== */
  .room-grid, .device-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  @media (min-width: 600px) {
    .room-grid, .device-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .room-tile,
  .device-tile {
    background: var(--hue-surface-tile);
    border-radius: var(--hue-radius-lg);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
    transition: background 0.3s ease, box-shadow 0.3s ease;
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255, 255, 255, 0.06);
    position: relative;
    overflow: hidden;
    transform: translateY(0);
    min-height: 132px;
  }

  .room-header,
  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .room-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .room-temp-line {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--hue-text-secondary);
    max-width: fit-content;
    border-radius: 999px;
    padding: 2px 8px 2px 6px;
    background: rgba(0, 0, 0, 0.24);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.06);
  }

  .room-temp-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #555;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.25) inset;
    transition: all 0.25s ease;
  }

  .room-temp-dot.red {
    background: radial-gradient(circle at 30% 30%, #ff7272, #d03c3c);
    box-shadow: 0 0 10px rgba(255, 85, 85, 0.55);
  }

  .room-temp-dot.orange {
    background: radial-gradient(circle at 30% 30%, #ffbf66, #d1873a);
    box-shadow: 0 0 10px rgba(255, 173, 78, 0.5);
  }

  .room-temp-dot.blue {
    background: radial-gradient(circle at 30% 30%, #7ca0ff, #4f6fd2);
    box-shadow: 0 0 10px rgba(105, 146, 255, 0.55);
  }

  .room-indicators-bottom {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .motion-indicator {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(0,0,0,0.32);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.45);
    transition: all 0.3s ease;
  }

  .motion-indicator ha-icon {
    --mdc-icon-size: 14px;
    color: #666;
    transition: all 0.3s ease;
  }

  .motion-indicator.active {
    background: rgba(61, 220, 112, 0.2);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.25), 0 0 8px rgba(61, 220, 112, 0.35);
  }

  .motion-indicator.active ha-icon {
    color: #88ff88;
    filter: drop-shadow(0 0 4px rgba(100, 255, 100, 0.6));
  }

  .temp-led {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: relative;
    background: rgba(0,0,0,0.35);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
    transition: all 0.3s ease;
  }

  .temp-led .led-glow {
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background: #444;
    transition: all 0.3s ease;
  }

  .temp-led.red .led-glow {
    background: radial-gradient(circle at 30% 30%, #ff6666, #cc3333);
    box-shadow: 0 0 8px rgba(255, 80, 80, 0.6);
  }

  .temp-led.orange .led-glow {
    background: radial-gradient(circle at 30% 30%, #ffaa44, #cc8833);
    box-shadow: 0 0 8px rgba(255, 170, 80, 0.6);
  }

  .temp-led.blue .led-glow {
    background: radial-gradient(circle at 30% 30%, #6688ff, #4466cc);
    box-shadow: 0 0 8px rgba(80, 120, 255, 0.6);
  }

  .temp-led.unknown .led-glow {
    background: #444;
  }

  @media (hover: hover) {
    .room-tile:hover,
    .device-tile:hover {
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1) inset, 0 10px 20px rgba(0, 0, 0, 0.5);
    }
  }

  .room-tile:active,
  .device-tile:active {
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 4px 10px rgba(0,0,0,0.45);
  }

  .room-tile.lights-on {
    background: var(--hue-surface-tile-on);
    box-shadow: var(--hue-shadow-card), 0 0 0 1px rgba(255, 187, 112, 0.2) inset;
  }

  .room-tile.is-showering::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(116, 191, 255, 0.65);
    box-shadow:
      0 0 0 1px rgba(116, 191, 255, 0.25) inset,
      0 0 14px rgba(86, 166, 255, 0.35),
      0 0 26px rgba(86, 166, 255, 0.2);
    animation: showerGlowPulse 2.8s ease-in-out infinite;
    pointer-events: none;
    z-index: 2;
  }

  .room-tile.is-showering::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image: repeating-linear-gradient(
      112deg,
      rgba(132, 196, 255, 0) 0px,
      rgba(132, 196, 255, 0) 9px,
      rgba(132, 196, 255, 0.14) 10px,
      rgba(132, 196, 255, 0.14) 11px
    );
    mix-blend-mode: screen;
    animation: showerRainDrift 1.8s linear infinite;
    pointer-events: none;
    z-index: 1;
  }

  .room-icon-container,
  .device-icon-container {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .room-icon,
  .device-icon {
    --mdc-icon-size: 24px;
    color: var(--hue-text-secondary);
  }

  .room-tile.lights-on .room-icon {
    color: #28170c;
    filter: drop-shadow(0 0 8px rgba(255,150,50,0.6));
  }

  .toggle-track {
    width: 44px;
    height: 28px;
    background: rgba(0, 0, 0, 0.35);
    border-radius: var(--hue-radius-full);
    position: relative;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
    transition: background 0.3s ease;
  }

  .toggle-track.on {
    background: linear-gradient(180deg, #4ddc75 0%, #23a653 100%);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  }

  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    background: linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%);
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toggle-thumb.on {
    left: 19px;
    background: linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%);
  }

  .room-toggle {
    z-index: 10;
    cursor: pointer;
  }

  .room-name {
    font-size: var(--hue-font-size-md);
    font-weight: var(--hue-font-weight-semibold);
    color: var(--hue-text-primary);
  }

  .room-tile.lights-on .room-name {
    color: #2b180c;
  }

  .room-status {
    font-size: var(--hue-font-size-sm);
    color: var(--hue-text-muted);
  }

  .room-tile.lights-on .room-status {
    color: rgba(43, 24, 12, 0.78);
  }

  .device-tile.active {
    background: var(--hue-surface-tile-on);
    box-shadow: var(--hue-shadow-card), 0 0 0 1px rgba(255, 187, 112, 0.2) inset;
  }

  .device-tile.active .device-icon {
    color: #2b180c;
    filter: drop-shadow(0 0 8px rgba(255, 187, 112, 0.45));
  }

  .device-name {
    font-size: var(--hue-font-size-md);
    font-weight: var(--hue-font-weight-semibold);
    color: var(--hue-text-primary);
  }

  .device-tile.active .device-name {
    color: #2b180c;
  }

  .device-status {
    font-size: var(--hue-font-size-sm);
    color: var(--hue-text-muted);
  }

  .device-tile.active .device-status {
    color: rgba(43, 24, 12, 0.78);
  }

  .device-printer {
    margin-top: auto;
    padding-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .device-printer-track {
    position: relative;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.36);
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
  }

  .device-printer-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0%;
    border-radius: inherit;
    background: linear-gradient(90deg, #2dd15a 0%, #7cff95 100%);
    box-shadow:
      0 0 8px rgba(67, 255, 130, 0.45),
      0 0 16px rgba(67, 255, 130, 0.25);
    transition: width 260ms ease;
  }

  .device-printer-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    line-height: 1.2;
    color: var(--hue-text-secondary);
  }

  .device-printer-percent {
    font-weight: 600;
    color: #99ffc0;
    text-shadow: 0 0 6px rgba(67, 255, 130, 0.35);
  }

  .device-printer-eta {
    color: var(--hue-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70%;
  }

  .device-tile.printer-alert {
    background: linear-gradient(180deg, rgba(255, 110, 110, 0.95) 0%, rgba(165, 52, 52, 0.92) 100%);
    box-shadow:
      var(--hue-shadow-card),
      0 0 0 1px rgba(255, 180, 180, 0.35) inset,
      0 0 20px rgba(255, 76, 76, 0.42);
    animation: printerAlertPulse 1.1s ease-in-out infinite;
  }

  .device-tile.printer-alert .device-icon,
  .device-tile.printer-alert .device-name {
    color: #3b0d0d;
  }

  .device-tile.printer-alert .device-status {
    color: rgba(55, 10, 10, 0.82);
  }

  .device-tile.printer-alert .device-printer-fill {
    background: linear-gradient(90deg, #ff4d4d 0%, #ff9797 100%);
    box-shadow:
      0 0 8px rgba(255, 80, 80, 0.58),
      0 0 16px rgba(255, 80, 80, 0.35);
  }

  .device-toggle.read-only {
    opacity: 0.7;
    pointer-events: none;
  }

  .home-room-editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 130;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(6, 8, 14, 0.58);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .home-room-editor-overlay.is-open {
    display: flex;
  }

  .home-room-editor-modal {
    width: min(380px, calc(100vw - 36px));
    border-radius: 18px;
    padding: 16px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(45, 35, 24, 0.96), rgba(20, 16, 12, 0.96));
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .home-room-editor-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--hue-text-primary);
  }

  .home-room-editor-select {
    width: 100%;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(0, 0, 0, 0.3);
    color: var(--hue-text-primary);
    font-size: 12px;
    padding: 0 10px;
    box-sizing: border-box;
  }

  .home-room-editor-btn {
    width: 100%;
    height: 38px;
    border-radius: 11px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: var(--hue-text-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .home-room-editor-btn.save {
    background: linear-gradient(180deg, #59d47d 0%, #2d9f4f 100%);
    border-color: rgba(0, 0, 0, 0.24);
    color: #0f2e19;
  }

  .home-room-editor-btn.remove {
    background: rgba(255, 115, 115, 0.2);
    border-color: rgba(255, 130, 130, 0.35);
  }

  .home-room-editor-status {
    min-height: 16px;
    font-size: 11px;
    text-align: center;
    color: var(--hue-text-muted);
  }

  /* ===== GLOBAL ===== */
  * {
    -webkit-tap-highlight-color: transparent;
  }

  .room-tile, .widget-pager-frame, .person-avatar {
    will-change: transform, box-shadow;
  }

  /* ===== ANIMATIONS ===== */
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(100, 200, 100, 0.4); }
    50% { box-shadow: 0 0 16px rgba(100, 200, 100, 0.7); }
  }

  @keyframes showerGlowPulse {
    0%, 100% {
      box-shadow:
        0 0 0 1px rgba(116, 191, 255, 0.25) inset,
        0 0 12px rgba(86, 166, 255, 0.26),
        0 0 20px rgba(86, 166, 255, 0.18);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(116, 191, 255, 0.35) inset,
        0 0 18px rgba(86, 166, 255, 0.45),
        0 0 34px rgba(86, 166, 255, 0.28);
    }
  }

  @keyframes showerRainDrift {
    from { transform: translateY(-6%); }
    to { transform: translateY(6%); }
  }

  @keyframes rainSweep {
    from { transform: translateY(-20%); }
    to { transform: translateY(20%); }
  }

  @keyframes cloudDrift {
    from { transform: translateX(-2%) translateY(0); }
    to { transform: translateX(8%) translateY(-3%); }
  }

  @keyframes sunPulse {
    0%, 100% { filter: saturate(1); }
    50% { filter: saturate(1.2); }
  }

  @keyframes printerAlertPulse {
    0%, 100% {
      box-shadow:
        var(--hue-shadow-card),
        0 0 0 1px rgba(255, 180, 180, 0.35) inset,
        0 0 12px rgba(255, 76, 76, 0.35);
    }
    50% {
      box-shadow:
        var(--hue-shadow-card),
        0 0 0 1px rgba(255, 206, 206, 0.52) inset,
        0 0 24px rgba(255, 76, 76, 0.62);
    }
  }

  .weather-icon.sunny {
    animation: rotate 20s linear infinite, pulse 3s ease-in-out infinite;
  }

  .person-avatar.home .person-status-dot {
    animation: glowPulse 2s ease-in-out infinite;
  }

  .room-tile, .device-tile {
    animation: fadeIn 0.4s ease-out backwards;
  }

  .room-tile:nth-child(1), .device-tile:nth-child(1) { animation-delay: 0.05s; }
  .room-tile:nth-child(2), .device-tile:nth-child(2) { animation-delay: 0.1s; }
  .room-tile:nth-child(3), .device-tile:nth-child(3) { animation-delay: 0.15s; }
  .room-tile:nth-child(4), .device-tile:nth-child(4) { animation-delay: 0.2s; }
  .room-tile:nth-child(5), .device-tile:nth-child(5) { animation-delay: 0.25s; }
  .room-tile:nth-child(6), .device-tile:nth-child(6) { animation-delay: 0.3s; }
  .room-tile:nth-child(7), .device-tile:nth-child(7) { animation-delay: 0.35s; }
  .room-tile:nth-child(8), .device-tile:nth-child(8) { animation-delay: 0.4s; }

  .widget-pager-frame {
    animation: fadeIn 0.3s ease-out;
  }

  /* ===== SHOWER LABEL ===== */
  .room-shower-label {
    font-size: 12px;
    font-weight: 700;
    color: rgba(118, 185, 255, 0.95);
    text-shadow: 0 0 8px rgba(100, 170, 255, 0.6);
  }

  ${TESLA_TILE_CSS}
`;

class HueHomeScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._roomsIndex = null;
    this._rendered = false;

    // Scroll handler refs
    this._scrollEl = null;
    this._headerMaterial = null;
    this._smallTitle = null;
    this._largeTitle = null;
    this._expandedChildren = null;
    this._lastT = -1;
    this._rafId = null;
    this._onScroll = this._onScroll.bind(this);
    this._onLocationChanged = this._onLocationChanged.bind(this);
    this._loading = false;
    this._error = null;
    this._locationListenerAttached = false;
    this._widgetPagerEl = null;
    this._widgetPagerFrameEl = null;
    this._widgetPagerSettleTimer = null;
    this._widgetPageIndex = 0;
    this._onWidgetPagerScroll = this._onWidgetPagerScroll.bind(this);
    this._weatherFxOverlayEl = null;
    this._weatherFxHideTimer = null;
    this._weatherFxCleanupTimer = null;
    this._homeReturnRerenderTimer = null;
    this._roomLongPressTimer = null;
    this._roomLongPressPointerId = null;
    this._roomLongPressStart = null;
    this._roomLongPressRoomId = null;
    this._suppressRoomClickUntil = 0;
    this._homeRoomEditor = null;
    this._homeRoomSnapshot = null;
    this._lastRenderedPath = null;
  }

  setConfig(config) {
    this._config = config;
  }

  connectedCallback() {
    if (!this._locationListenerAttached) {
      window.addEventListener('location-changed', this._onLocationChanged);
      this._locationListenerAttached = true;
    }
    // Force re-render on reconnect — DOM element listeners (scroll, pager, room tiles)
    // were on destroyed elements; re-rendering recreates them.
    if (this._rendered && this._hass && this._roomsIndex) {
      this._rendered = false;
      this._render();
    }
  }

  set hass(hass) {
    this._hass = hass;
    try {
      if (!this._roomsIndex) {
        this._loadAndRender();
        return;
      }

      if (this._rendered) {
        this._updateStates();
        this._updateWeather();
        return;
      }

      this._render();
    } catch (error) {
      this._handleCardError(error, 'Failed to update Home screen');
    }
  }

  get hass() {
    return this._hass;
  }

  async _loadAndRender() {
    if (this._loading) return;
    this._loading = true;

    if (!this._roomsIndex) {
      try {
        this._roomsIndex = this._normalizeRoomsIndex(await loadRoomsIndex());
      } catch (e) {
        console.error('[HueHomeScreen] Failed to load rooms index:', e);
        this._roomsIndex = this._normalizeRoomsIndex({ rooms: [], weather_entity: 'weather.buienradar' });
      }
    } else {
      this._roomsIndex = this._normalizeRoomsIndex(this._roomsIndex);
    }

    // Load language file if configured
    const langFile = this._roomsIndex?.language_file;
    if (langFile && typeof langFile === 'string') {
      try {
        const translations = await loadLanguageFile(langFile);
        setTranslations(translations);
      } catch (e) {
        console.warn('[HueHomeScreen] Failed to load language file:', e);
      }
    }

    this._loading = false;
    try {
      this._render();
    } catch (error) {
      this._handleCardError(error, 'Failed to render Home screen');
    }
  }

  _render() {
    if (!this._hass || !this._roomsIndex) return;

    const hasDevices = (this._roomsIndex.devices || []).length > 0;
    const homeName = this._roomsIndex.home_name || 'Huisje Weltevree';
    const route = this._getRouteState();
    const isPersonScreen = route.kind === 'person';
    const isDeviceScreen = route.kind === 'device';
    const isHomeScreen = !isPersonScreen && !isDeviceScreen;

    // Handle device screen (Tesla, etc.)
    if (isDeviceScreen) {
      const device = (this._roomsIndex.devices || []).find(d => d.id === route.deviceId);
      const isTesla = device?.kind === 'tesla';
      if (isTesla) {
        const teslaResult = renderTeslaScreen(this._hass, this._roomsIndex, route.deviceId);
        this._rendered = false;
        this.shadowRoot.innerHTML = `
          <style>${STYLES}${teslaResult.styles}</style>
          <ha-card>
            <div class="hue-root">
              <div class="hue-background"></div>
              ${teslaResult.html}
            </div>
          </ha-card>
        `;
        teslaResult.attachListeners(this.shadowRoot);
        this._rendered = true;
        this._lastRenderedPath = window.location.pathname;
        this._error = null;
        return;
      }
    }

    try {
      this._rendered = false;
      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <ha-card>
          <div class="hue-root">
            <div class="hue-background"></div>
            <div class="content-scroll">
              ${isPersonScreen ? `
                ${this._renderPersonDetail(route.personEntity)}
              ` : `
                <div class="expanded-header">
                  <div class="large-title"><button class="home-title-button" data-home-action="open_sidebar">${escapeHtml(homeName)}</button></div>
                  ${this._renderWidgetPager()}
                </div>
                <div class="scroll-content">
                  ${hasDevices ? `
                  <div class="home-section">
                    <div class="hue-section-header">
                      <div class="hue-section-title">${escapeHtml(t('DEVICES', 'DEVICES'))}</div>
                    </div>
                    ${this._renderDeviceGrid()}
                  </div>
                  ` : ''}
                  <div class="home-section">
                    <div class="hue-section-header">
                      <div class="hue-section-title">${escapeHtml(t('ROOMS', 'ROOMS'))}</div>
                    </div>
                    ${this._renderRoomGrid()}
                  </div>
                </div>
              `}
            </div>
            ${isHomeScreen ? `
              <div class="header-pinned">
                <div class="header-material"></div>
                <div class="nav-row">
                  <div class="small-title"><button class="home-title-button" data-home-action="open_sidebar">${escapeHtml(homeName)}</button></div>
                  <div class="nav-actions"></div>
                </div>
              </div>
            ` : ''}
            ${isHomeScreen ? `
              <div class="weather-fx-overlay" data-effect="cloud" aria-hidden="true">
                <div class="weather-fx-backdrop"></div>
              </div>
            ` : ''}
            <div class="home-room-editor-overlay">
              <div class="home-room-editor-modal">
                <div class="home-room-editor-title">Edit room widget</div>
                <button class="home-room-editor-btn remove" data-room-editor-action="remove_room">Remove room</button>
                <button class="home-room-editor-btn" data-room-editor-action="change_temp_entity">Change temp. entity</button>
                <select class="home-room-editor-select" data-room-editor-select="temp"></select>
                <button class="home-room-editor-btn" data-room-editor-action="change_motion_entity">Change motion entity</button>
                <select class="home-room-editor-select" data-room-editor-select="motion"></select>
                <button class="home-room-editor-btn save" data-room-editor-action="save">Save</button>
                <button class="home-room-editor-btn" data-room-editor-action="cancel">Cancel</button>
                <div class="home-room-editor-status"></div>
              </div>
            </div>
          </div>
        </ha-card>
      `;

      this._attachEventListeners();
      if (isHomeScreen) {
        this._initScrollHandler();
        this._initWidgetPager();
        this._resetHeaderToExpanded();
      } else {
        this._clearWeatherFullscreenEffect(true);
      }
      this._updateStates();
      this._rendered = true;
      this._lastRenderedPath = window.location.pathname;
      this._error = null;
    } catch (error) {
      this._handleCardError(error, 'Failed to build Home screen markup');
    }
  }

  _getRouteState() {
    const dashboardPath = (this._roomsIndex?.dashboard_path || '/hue-ui').replace(/\/+$/, '');
    const currentPath = (window.location.pathname || '').replace(/\/+$/, '');
    const personPrefix = `${dashboardPath}/person/`;
    if (currentPath.startsWith(personPrefix)) {
      const encodedEntity = currentPath.slice(personPrefix.length);
      const personEntity = decodeURIComponent(encodedEntity || '').trim();
      if (personEntity) return { kind: 'person', personEntity };
    }
    const devicePrefix = `${dashboardPath}/device/`;
    if (currentPath.startsWith(devicePrefix)) {
      const deviceId = decodeURIComponent(currentPath.slice(devicePrefix.length) || '').trim();
      if (deviceId) return { kind: 'device', deviceId };
    }
    return { kind: 'home', personEntity: '' };
  }

  _renderPersonDetail(personEntityId) {
    const data = this._getPersonDetailData(personEntityId);
    const dashboardPath = this._roomsIndex?.dashboard_path || '/hue-ui';
    const mapBlock = data.mapUrl
      ? `<iframe src="${escapeHtml(data.mapUrl)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      : `<div style="padding:12px;color:var(--hue-text-muted);font-size:12px;">Location unavailable</div>`;

    return `
      <div class="person-detail">
        <button class="person-detail-back" data-home-action="go_home" data-path="${escapeHtml(dashboardPath)}">Back</button>
        <div class="person-detail-card person-detail-hero">
          <div class="person-detail-photo-wrap">
            ${data.picture
              ? `<img class="person-detail-photo" src="${escapeHtml(data.picture)}" alt="${escapeHtml(data.name)}" />`
              : `<div class="person-detail-photo" style="display:flex;align-items:center;justify-content:center;"><ha-icon icon="mdi:account"></ha-icon></div>`
            }
          </div>
          <div class="person-detail-name">${escapeHtml(data.name)}</div>
          <div class="person-detail-location">${escapeHtml(data.locationText)}</div>
        </div>
        <div class="person-detail-card">
          <div class="person-battery-label">Where is ${escapeHtml(data.name)}?</div>
          <div class="person-map-frame">${mapBlock}</div>
        </div>
        <div class="person-detail-card">
          <div class="person-battery-label">Phone battery</div>
          <div class="person-battery-track">
            <div class="person-battery-fill" style="width:${data.batteryPercent}%"></div>
          </div>
          <div class="person-battery-value">${data.batteryPercent}%</div>
        </div>
        <div class="person-detail-card">
          <div class="person-battery-label">Phone sensors</div>
          <div class="person-phone-list">
            ${data.phoneRows.map((row) => `
              <div class="person-phone-row">
                <span class="person-phone-key">${escapeHtml(row.key)}</span>
                <span class="person-phone-value">${escapeHtml(row.value)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  _getPersonDetailData(personEntityId) {
    const person = this._hass?.states?.[personEntityId];
    const name = person?.attributes?.friendly_name || String(personEntityId || '').split('.')[1] || 'Person';
    const picture = person?.attributes?.entity_picture || '';
    const locationText = this._formatPersonZone(personEntityId, person?.state || 'unknown');
    const sourceEntityId = person?.attributes?.source || '';
    const sourceState = sourceEntityId ? this._hass?.states?.[sourceEntityId] : null;
    const lat = Number(person?.attributes?.latitude ?? sourceState?.attributes?.latitude);
    const lon = Number(person?.attributes?.longitude ?? sourceState?.attributes?.longitude);
    const mapUrl = Number.isFinite(lat) && Number.isFinite(lon)
      ? `https://www.google.com/maps?q=${lat},${lon}&z=16&output=embed`
      : '';
    const batteryPercent = this._resolvePersonBattery(personEntityId, sourceState);
    const phoneRows = this._collectPersonPhoneRows(personEntityId, sourceEntityId, sourceState);
    return { name, picture, locationText, mapUrl, batteryPercent, phoneRows };
  }

  _resolvePersonBattery(personEntityId, sourceState) {
    const direct = Number(sourceState?.attributes?.battery_level);
    if (Number.isFinite(direct)) return Math.max(0, Math.min(100, Math.round(direct)));
    const token = String(personEntityId || '').split('.')[1]?.toLowerCase() || '';
    const fromSensors = Object.entries(this._hass?.states || {})
      .filter(([entityId, state]) => {
        const id = entityId.toLowerCase();
        const friendly = String(state?.attributes?.friendly_name || '').toLowerCase();
        return (id.includes(token) || friendly.includes(token))
          && (id.includes('battery') || friendly.includes('battery'));
      })
      .map(([, state]) => Number(state?.state))
      .find((value) => Number.isFinite(value));
    if (Number.isFinite(fromSensors)) return Math.max(0, Math.min(100, Math.round(fromSensors)));
    return 0;
  }

  _collectPersonPhoneRows(personEntityId, sourceEntityId, sourceState) {
    const rows = [];
    const token = String(personEntityId || '').split('.')[1]?.toLowerCase() || '';
    const push = (key, value) => {
      const text = String(value ?? '').trim();
      if (!text || text === 'unknown' || text === 'unavailable') return;
      rows.push({ key, value: text });
    };

    push('Person entity', personEntityId);
    push('Tracker', sourceEntityId || sourceState?.entity_id || '');
    push('State', this._hass?.states?.[personEntityId]?.state || '');
    push('Battery state', sourceState?.attributes?.battery_state || '');
    push('Charging', sourceState?.attributes?.is_charging);
    push('Wi-Fi', sourceState?.attributes?.ssid || sourceState?.attributes?.wifi_connection || '');
    push('Connection', sourceState?.attributes?.connection_type || '');
    push('Bluetooth', sourceState?.attributes?.bluetooth_connection || '');

    Object.entries(this._hass?.states || {})
      .filter(([entityId, state]) => {
        const id = entityId.toLowerCase();
        const friendly = String(state?.attributes?.friendly_name || '').toLowerCase();
        return id.includes(token) || friendly.includes(token);
      })
      .slice(0, 30)
      .forEach(([entityId, state]) => {
        const label = state?.attributes?.friendly_name || entityId;
        const unit = state?.attributes?.unit_of_measurement || '';
        push(label, `${state?.state ?? '--'}${unit ? ` ${unit}` : ''}`);
      });

    return rows.slice(0, 24);
  }

  _handleCardError(error, message = 'Home screen error') {
    this._error = error;
    console.error(`[HueHomeScreen] ${message}:`, error);
    const detail = error?.message ? ` (${error.message})` : '';
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div style="padding:16px;color:var(--error-color,#f44336);font-weight:600;">
          ${escapeHtml(`${message}${detail}`)}
        </div>
      </ha-card>
    `;
  }

  _normalizeRoomsIndex(index = {}) {
    const safeRooms = Array.isArray(index.rooms)
      ? index.rooms.filter((room) => room && typeof room === 'object' && room.id)
      : [];
    const safeDevices = Array.isArray(index.devices)
      ? index.devices.filter((device) => device && typeof device === 'object' && device.id)
      : [];
    const safePeople = Array.isArray(index.people)
      ? index.people.filter((entityId) => typeof entityId === 'string' && entityId.includes('.'))
      : [];
    const safePeopleAreaSensors = (index.people_area_sensors && typeof index.people_area_sensors === 'object')
      ? Object.fromEntries(
        Object.entries(index.people_area_sensors)
          .filter(([personEntity, areaEntity]) => (
            typeof personEntity === 'string'
            && personEntity.includes('.')
            && typeof areaEntity === 'string'
            && areaEntity.includes('.')
          ))
      )
      : {};
    const configuredHomeName = typeof index.home_name === 'string' ? index.home_name.trim() : '';

    return {
      ...index,
      home_name: configuredHomeName && configuredHomeName.toLowerCase() !== 'home'
        ? configuredHomeName
        : 'Huisje Weltevree',
      weather_entity: typeof index.weather_entity === 'string' ? index.weather_entity : 'weather.buienradar',
      weather_location: typeof index.weather_location === 'string' ? index.weather_location : 'Leidschendam',
      weather_rain_chance_entity: typeof index.weather_rain_chance_entity === 'string'
        ? index.weather_rain_chance_entity
        : 'sensor.neerslag_buienradar_regen_data',
      people_area_sensors: safePeopleAreaSensors,
      dashboard_path: typeof index.dashboard_path === 'string' ? index.dashboard_path : '/hue-ui',
      rooms: safeRooms,
      devices: safeDevices,
      people: safePeople,
    };
  }

  // ===== Scroll-driven collapsing header =====

  _initScrollHandler() {
    this._scrollEl = this.shadowRoot.querySelector('.content-scroll');
    this._headerMaterial = this.shadowRoot.querySelector('.header-material');
    this._smallTitle = this.shadowRoot.querySelector('.small-title');
    this._largeTitle = this.shadowRoot.querySelector('.large-title');

    // Collect expanded-header children that should fade out (weather + people)
    const widgetPagerEl = this.shadowRoot.querySelector('.expanded-header .widget-pager-frame');
    this._expandedChildren = [widgetPagerEl].filter(Boolean);

    this._lastT = -1;

    if (this._scrollEl) {
      this._scrollEl.addEventListener('scroll', this._onScroll, { passive: true });
    }
  }

  _onScroll() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      const scrollTop = this._scrollEl ? this._scrollEl.scrollTop : 0;
      const t = Math.min(Math.max(scrollTop / 80, 0), 1);
      if (t !== this._lastT) {
        this._applyScrollT(t);
        this._lastT = t;
      }
    });
  }

  _applyScrollT(t) {
    // Header backdrop: fades in
    if (this._headerMaterial) {
      this._headerMaterial.style.opacity = t;
    }

    // Small title: fades in + slides up into place
    if (this._smallTitle) {
      this._smallTitle.style.opacity = t;
      this._smallTitle.style.transform = `translateY(${8 * (1 - t)}px)`;
    }

    // Large title: fades out + slides up slightly
    if (this._largeTitle) {
      this._largeTitle.style.opacity = 1 - t;
      this._largeTitle.style.transform = `translateY(${-10 * t}px)`;
    }

    // Weather + people: fade out together with large title
    for (const el of this._expandedChildren) {
      el.style.opacity = 1 - t;
    }
  }

  _onLocationChanged() {
    if (!this._roomsIndex) return;

    const dashboardPath = (this._roomsIndex.dashboard_path || '/hue-ui').replace(/\/+$/, '');
    const currentPath = (window.location.pathname || '').replace(/\/+$/, '');
    const personPrefix = `${dashboardPath}/person/`;
    const devicePrefix = `${dashboardPath}/device/`;
    const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const homeWithViewIndex = new RegExp(`^${esc(dashboardPath)}/\\d+$`);
    const isHome = currentPath === dashboardPath || homeWithViewIndex.test(currentPath);
    if (!isHome && !currentPath.startsWith(personPrefix) && !currentPath.startsWith(devicePrefix)) return;

    if (this._homeReturnRerenderTimer) {
      clearTimeout(this._homeReturnRerenderTimer);
    }
    this._homeReturnRerenderTimer = setTimeout(() => {
      this._homeReturnRerenderTimer = null;
      if (!this._hass || !this._roomsIndex) return;
      this._render();
      if (isHome) {
        this._resetHeaderToExpanded();
        this._resetWidgetPager();
      }
    }, 32);
  }

  _resetHeaderToExpanded() {
    if (!this.shadowRoot) return;

    if (!this._scrollEl) {
      this._initScrollHandler();
    }

    if (this._scrollEl) {
      this._scrollEl.scrollTop = 0;
    }

    this._applyScrollT(0);
    this._lastT = 0;
  }

  _initWidgetPager() {
    this._widgetPagerEl = this.shadowRoot.querySelector('.widget-pager');
    this._widgetPagerFrameEl = this.shadowRoot.querySelector('.widget-pager-frame');
    this._weatherFxOverlayEl = this.shadowRoot.querySelector('.weather-fx-overlay');

    if (!this._widgetPagerEl || !this._widgetPagerFrameEl) return;

    this._widgetPagerEl.removeEventListener('scroll', this._onWidgetPagerScroll);
    this._widgetPagerEl.addEventListener('scroll', this._onWidgetPagerScroll, { passive: true });
    this._resetWidgetPager();
  }

  _onWidgetPagerScroll() {
    if (this._widgetPagerSettleTimer) {
      clearTimeout(this._widgetPagerSettleTimer);
    }

    this._widgetPagerSettleTimer = setTimeout(() => {
      this._widgetPagerSettleTimer = null;
      this._handleWidgetPagerSettled();
    }, 120);
  }

  _handleWidgetPagerSettled() {
    if (!this._widgetPagerEl || !this._widgetPagerFrameEl) return;

    const pageWidth = this._widgetPagerEl.clientWidth || 1;
    const pageCount = this._widgetPagerEl.children.length || 1;
    const nextIndex = Math.min(
      Math.max(Math.round(this._widgetPagerEl.scrollLeft / pageWidth), 0),
      pageCount - 1
    );

    if (nextIndex === this._widgetPageIndex) return;

    this._widgetPageIndex = nextIndex;
    const pageName = nextIndex === 1 ? 'weather' : 'people';
    this._widgetPagerFrameEl.dataset.page = pageName;

    if (pageName === 'weather') {
      this._playWeatherFullscreenEffect();
      return;
    }

    this._clearWeatherFullscreenEffect(true);
  }

  _resetWidgetPager() {
    if (!this._widgetPagerEl || !this._widgetPagerFrameEl) return;
    this._widgetPageIndex = 0;
    this._widgetPagerEl.scrollLeft = 0;
    this._widgetPagerFrameEl.dataset.page = 'people';
    this._clearWeatherFullscreenEffect(true);
  }

  disconnectedCallback() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._scrollEl) {
      this._scrollEl.removeEventListener('scroll', this._onScroll);
    }
    if (this._widgetPagerEl) {
      this._widgetPagerEl.removeEventListener('scroll', this._onWidgetPagerScroll);
    }
    if (this._widgetPagerSettleTimer) {
      clearTimeout(this._widgetPagerSettleTimer);
      this._widgetPagerSettleTimer = null;
    }
    if (this._homeReturnRerenderTimer) {
      clearTimeout(this._homeReturnRerenderTimer);
      this._homeReturnRerenderTimer = null;
    }
    this._clearRoomLongPress();
    this._closeHomeRoomEditor({ discardChanges: true });
    this._clearWeatherFullscreenEffect(true);
    if (this._locationListenerAttached) {
      window.removeEventListener('location-changed', this._onLocationChanged);
      this._locationListenerAttached = false;
    }
  }

  // ===== Weather =====

  _updateWeather() {
    const weatherEntity = this._roomsIndex?.weather_entity || 'weather.buienradar';
    const weather = this._hass?.states[weatherEntity];
    if (!weather) return;

    const tempEl = this.shadowRoot.querySelector('.weather-temp');
    const condEl = this.shadowRoot.querySelector('.weather-condition');
    const iconEl = this.shadowRoot.querySelector('.weather-icon');
    const locationEl = this.shadowRoot.querySelector('.weather-location');
    const rainEl = this.shadowRoot.querySelector('.weather-rain');

    if (tempEl) tempEl.textContent = `${weather.attributes.temperature}°`;
    if (condEl) condEl.textContent = translateCondition(weather.state);
    if (locationEl) locationEl.textContent = this._getWeatherLocation(weather);
    if (rainEl) {
      const rainChance = this._getRainChanceNextHour();
      rainEl.textContent = rainChance === null
        ? 'Rain next hour: --%'
        : `Rain next hour: ${rainChance}%`;
    }
    if (iconEl) {
      const emoji = getWeatherEmoji(weather.state);
      const emojiEl = iconEl.querySelector('.weather-emoji');
      if (emojiEl) emojiEl.textContent = emoji;
      iconEl.dataset.condition = weather.state;
    }
  }

  _renderWeatherWidget() {
    const weatherEntity = this._roomsIndex.weather_entity || 'weather.buienradar';
    const weather = this._hass?.states[weatherEntity];
    if (!weather) {
      return `
        <div class="weather-widget">
          <div class="weather-info">
            <div class="weather-condition">Weather unavailable</div>
            <div class="weather-meta">
              <div class="weather-location">${escapeHtml(this._getWeatherLocation())}</div>
              <div class="weather-rain">Rain next hour: --%</div>
            </div>
          </div>
        </div>
      `;
    }

    const condition = weather.state;
    const temp = weather.attributes.temperature;
    const emoji = getWeatherEmoji(condition);
    const location = this._getWeatherLocation(weather);
    const rainChance = this._getRainChanceNextHour();

    return `
      <div class="weather-widget">
        <div class="weather-icon ${condition}" data-condition="${escapeHtml(condition)}">
          <span class="weather-emoji">${emoji}</span>
        </div>
        <div class="weather-info">
          <div class="weather-temp">${temp}°</div>
          <div class="weather-condition">${translateCondition(condition)}</div>
          <div class="weather-meta">
            <div class="weather-location">${escapeHtml(location)}</div>
            <div class="weather-rain">Rain next hour: ${rainChance === null ? '--' : rainChance}%</div>
          </div>
        </div>
      </div>
    `;
  }

  _playWeatherFullscreenEffect() {
    if (!this._weatherFxOverlayEl) return;

    const weatherEntity = this._roomsIndex?.weather_entity || 'weather.buienradar';
    const condition = String(this._hass?.states?.[weatherEntity]?.state || '').toLowerCase();
    const effect = this._mapWeatherEffect(condition);
    const holdDuration = effect === 'rain' ? 2000 : 1600;

    if (this._weatherFxHideTimer) {
      clearTimeout(this._weatherFxHideTimer);
      this._weatherFxHideTimer = null;
    }
    if (this._weatherFxCleanupTimer) {
      clearTimeout(this._weatherFxCleanupTimer);
      this._weatherFxCleanupTimer = null;
    }

    this._weatherFxOverlayEl.classList.remove('is-active', 'is-exit');
    this._weatherFxOverlayEl.dataset.effect = effect;

    // Restart CSS animations on rapid swipes.
    void this._weatherFxOverlayEl.offsetWidth;
    this._weatherFxOverlayEl.classList.add('is-active');

    this._weatherFxHideTimer = setTimeout(() => {
      if (!this._weatherFxOverlayEl) return;
      this._weatherFxOverlayEl.classList.add('is-exit');
      this._weatherFxCleanupTimer = setTimeout(() => {
        this._clearWeatherFullscreenEffect(true);
      }, 720);
    }, holdDuration);
  }

  _clearWeatherFullscreenEffect(immediate = false) {
    if (this._weatherFxHideTimer) {
      clearTimeout(this._weatherFxHideTimer);
      this._weatherFxHideTimer = null;
    }
    if (this._weatherFxCleanupTimer) {
      clearTimeout(this._weatherFxCleanupTimer);
      this._weatherFxCleanupTimer = null;
    }
    if (!this._weatherFxOverlayEl) return;

    if (immediate) {
      this._weatherFxOverlayEl.classList.remove('is-active', 'is-exit');
      return;
    }

    this._weatherFxOverlayEl.classList.add('is-exit');
    this._weatherFxCleanupTimer = setTimeout(() => {
      if (!this._weatherFxOverlayEl) return;
      this._weatherFxOverlayEl.classList.remove('is-active', 'is-exit');
    }, 720);
  }

  _mapWeatherEffect(condition) {
    const value = String(condition || '').toLowerCase();
    if (
      value.includes('rain') ||
      value.includes('drizzle') ||
      value.includes('pouring') ||
      value.includes('lightning')
    ) {
      return 'rain';
    }

    if (
      value.includes('sunny') ||
      value.includes('clear') ||
      value.includes('partlycloudy')
    ) {
      return 'sun';
    }

    return 'cloud';
  }

  _renderWidgetPager() {
    return `
      <div class="widget-pager-frame">
        <div class="widget-pager">
          <div class="widget-page people-widget">
            ${this._renderPeopleRow()}
          </div>
          <div class="widget-page">
            ${this._renderWeatherWidget()}
          </div>
        </div>
      </div>
    `;
  }

  // ===== People =====

  _renderPeopleRow() {
    const people = this._roomsIndex.people || [];
    if (people.length === 0) return '<div class="people-widget-title">No People Configured</div>';

    return `
      <div class="people-widget-title">People</div>
      <div class="people-row">
        ${people.map(entityId => this._renderPersonAvatar(entityId)).join('')}
      </div>
    `;
  }

  _renderPersonAvatar(entityId) {
    if (typeof entityId !== 'string' || !entityId.includes('.')) return '';
    const state = this._hass?.states[entityId];
    const personState = state?.state || 'unknown';
    const personStateClass = this._getPersonStateClass(personState);
    const zoneLabel = this._formatPersonZone(entityId, personState);
    const entityPicture = state?.attributes?.entity_picture;
    const name = state?.attributes?.friendly_name || entityId.split('.')[1];

    const imgHtml = entityPicture
      ? `<img class="person-avatar-img" src="${escapeHtml(entityPicture)}" alt="${escapeHtml(name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="person-avatar-placeholder" style="display:none;"><ha-icon icon="mdi:account"></ha-icon></div>`
      : `<div class="person-avatar-placeholder"><ha-icon icon="mdi:account"></ha-icon></div>`;

    return `
      <div class="person-card">
        <div class="person-avatar ${escapeHtml(personStateClass)}" data-entity="${escapeHtml(entityId)}" data-action="more_info" title="${escapeHtml(name)}">
          <div class="person-avatar-ring"></div>
          ${imgHtml}
          <div class="person-status-dot"></div>
        </div>
        <div class="person-zone">${escapeHtml(zoneLabel)}</div>
      </div>
    `;
  }

  // ===== Rooms =====

  _renderRoomGrid() {
    const rooms = (this._roomsIndex.rooms || []).filter((room) => room?.hide_on_home !== true);
    return `
      <div class="room-grid">
        ${rooms.map(room => this._renderRoomTile(room)).join('')}
      </div>
    `;
  }

  _renderRoomTile(room) {
    if (!room || typeof room !== 'object') return '';
    const lights = room.lights || [];
    const lightsOn = lights.filter(id => this._hass?.states[id]?.state === 'on').length;
    const hasLightsOn = lightsOn > 0;
    const showerSensor = room.sensors?.shower;
    const isShowering = showerSensor ? this._isEntityActive(showerSensor) : false;

    const motionSensor = room.sensors?.motion;
    const hasMotion = motionSensor ? this._hass?.states[motionSensor]?.state === 'on' : false;

    const tempSensor = room.sensors?.temperature;
    const tempValue = tempSensor ? parseFloat(this._hass?.states[tempSensor]?.state) : null;
    const ledColor = getTemperatureLEDColor(tempValue);
    const tempText = Number.isFinite(tempValue) ? `${tempValue.toFixed(1)}°C` : '--';

    return `
      <div class="room-tile ${hasLightsOn ? 'lights-on' : ''} ${isShowering ? 'is-showering' : ''}" data-room="${escapeHtml(room.id)}">
        <div class="room-header">
          <div class="room-icon-container">
            <ha-icon class="room-icon" icon="${escapeHtml(room.icon || 'mdi:home')}"></ha-icon>
          </div>
          <div class="room-toggle" data-room="${escapeHtml(room.id)}">
            <div class="toggle-track ${hasLightsOn ? 'on' : ''}">
              <div class="toggle-thumb ${hasLightsOn ? 'on' : ''}"></div>
            </div>
          </div>
        </div>
        <div class="room-name">${escapeHtml(room.name)}</div>
        <div class="room-meta">
          ${isShowering ? `
            <span class="room-shower-label">${escapeHtml(t('Douchen', 'Douchen'))}</span>
          ` : `
            <div class="room-temp-line">
              <span class="room-temp-dot ${ledColor}" data-sensor="${escapeHtml(tempSensor || '')}"></span>
              <span class="room-temp-value" data-sensor="${escapeHtml(tempSensor || '')}">${escapeHtml(tempText)}</span>
            </div>
          `}
          <div class="room-status">${lightsOn} / ${lights.length} aan</div>
        </div>
        <div class="room-indicators-bottom">
          ${motionSensor ? `
            <div class="motion-indicator ${hasMotion ? 'active' : ''}" data-sensor="${escapeHtml(motionSensor)}">
              <ha-icon icon="mdi:motion-sensor"></ha-icon>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ===== Devices =====

  _renderDeviceGrid() {
    const devices = this._roomsIndex.devices || [];
    return `
      <div class="device-grid">
        ${devices.map(device => this._renderDeviceTile(device)).join('')}
      </div>
    `;
  }

  _renderDeviceTile(device) {
    if (!device || typeof device !== 'object') return '';
    if (device.kind === 'tesla') return renderTeslaTile(this._hass, device);
    const entityId = device.entity;
    const state = entityId ? this._hass?.states[entityId] : null;
    const isActive = this._isDeviceActive(device, state);
    const isPrinterAlert = this._isPrintAlertStatus(state?.state);
    const stateText = state ? this._formatDeviceState(state) : 'Unavailable';

    const showToggle = device.toggle !== false && entityId;
    const readOnly = device.toggle === 'read-only';

    return `
      <div class="device-tile ${isActive ? 'active' : ''} ${isPrinterAlert ? 'printer-alert' : ''}"
           data-device="${escapeHtml(device.id)}"
           data-entity="${escapeHtml(entityId || '')}"
           data-progress-entity="${escapeHtml(device.progress_entity || '')}"
           data-eta-entity="${escapeHtml(device.eta_entity || '')}">
        <div class="device-header">
          <div class="device-icon-container">
            <ha-icon class="device-icon" icon="${escapeHtml(device.icon || 'mdi:devices')}"></ha-icon>
          </div>
          ${showToggle ? `
          <div class="room-toggle ${readOnly ? 'device-toggle read-only' : ''}"
               data-device="${escapeHtml(device.id)}"
               data-entity="${escapeHtml(entityId)}">
            <div class="toggle-track ${isActive ? 'on' : ''}">
              <div class="toggle-thumb ${isActive ? 'on' : ''}"></div>
            </div>
          </div>
          ` : ''}
        </div>
        <div class="device-name">${escapeHtml(device.name)}</div>
        <div class="device-status">${escapeHtml(stateText)}</div>
        ${this._renderPrinterProgress(device)}
      </div>
    `;
  }

  _formatDeviceState(state) {
    const domain = state.entity_id.split('.')[0];
    const stateValue = state.state;

    switch (domain) {
      case 'sensor': {
        const unit = state.attributes.unit_of_measurement || '';
        return `${stateValue}${unit ? ' ' + unit : ''}`;
      }
      case 'binary_sensor':
        return stateValue === 'on' ? 'Detected' : 'Clear';
      case 'switch':
      case 'light':
      case 'fan':
        return stateValue === 'on' ? 'On' : 'Off';
      case 'media_player':
        if (stateValue === 'playing') return 'Playing';
        if (stateValue === 'paused') return 'Paused';
        if (stateValue === 'idle') return 'Idle';
        return stateValue === 'off' ? 'Off' : stateValue;
      case 'climate': {
        const hvacMode = state.state;
        const currentTemp = state.attributes.current_temperature;
        if (hvacMode === 'off') return 'Off';
        return currentTemp ? `${currentTemp}°` : hvacMode;
      }
      case 'lock':
        return stateValue === 'locked' ? 'Locked' : 'Unlocked';
      case 'cover':
        return stateValue === 'open' ? 'Open' : stateValue === 'closed' ? 'Closed' : stateValue;
      case 'vacuum':
        return stateValue.charAt(0).toUpperCase() + stateValue.slice(1);
      default:
        return stateValue;
    }
  }

  _renderPrinterProgress(device) {
    const progressEntity = device?.progress_entity;
    const etaEntity = device?.eta_entity;
    if (!progressEntity && !etaEntity) return '';

    const statusState = this._hass?.states?.[device.entity]?.state;
    const active = this._isPrintStatusActive(statusState);
    const alert = this._isPrintAlertStatus(statusState);
    if (!active && !alert) return '';

    const progress = this._getPrinterProgressPercent(progressEntity);
    const etaText = this._getPrinterEtaLabel(etaEntity);

    return `
      <div class="device-printer" data-printer-active="true">
        <div class="device-printer-track">
          <div class="device-printer-fill" style="width:${progress}%"></div>
        </div>
        <div class="device-printer-legend">
          <span class="device-printer-percent">${progress}%</span>
          <span class="device-printer-eta">${escapeHtml(etaText)}</span>
        </div>
      </div>
    `;
  }

  _getPrinterProgressPercent(entityId) {
    if (!entityId) return 0;
    const raw = Number.parseFloat(this._hass?.states?.[entityId]?.state);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  _getPrinterEtaLabel(entityId) {
    if (!entityId) return 'ETA --:--';
    const etaState = this._hass?.states?.[entityId];
    const rawHours = Number.parseFloat(etaState?.state);
    if (!Number.isFinite(rawHours) || rawHours <= 0) return 'ETA --:--';

    const doneAt = new Date(Date.now() + rawHours * 3600000);
    const hour = doneAt.getHours().toString().padStart(2, '0');
    const minute = doneAt.getMinutes().toString().padStart(2, '0');
    return `ETA ${hour}:${minute}`;
  }

  _isPrintStatusActive(status) {
    const value = String(status || '').toLowerCase();
    return ['running', 'prepare', 'slicing', 'pause'].includes(value);
  }

  _isPrintAlertStatus(status) {
    const value = String(status || '').toLowerCase();
    return ['pause', 'paused', 'error', 'failed', 'cancelled', 'canceled'].includes(value);
  }

  _isDeviceActive(device, state) {
    if (!state) return false;
    if (device?.progress_entity || device?.eta_entity || device?.entity === 'sensor.bambu_x1c_print_status') {
      return this._isPrintStatusActive(state.state);
    }
    return state.state === 'on' || state.state === 'playing' || state.state === 'home';
  }

  _isEntityActive(entityId) {
    const value = String(this._hass?.states?.[entityId]?.state || '').toLowerCase();
    return value === 'on' || value === 'home' || value === 'true' || value === 'running';
  }

  // ===== Event Listeners =====

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('[data-home-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = el.dataset.homeAction;
        if (action === 'open_sidebar') {
          this._openHomeAssistantSidebar();
          return;
        }
        if (action === 'go_home') {
          const path = el.dataset.path || (this._roomsIndex?.dashboard_path || '/hue-ui');
          window.history.pushState(null, '', path);
          window.dispatchEvent(new Event('location-changed'));
        }
      });
    });

    // Room tile click - navigate to room
    this.shadowRoot.querySelectorAll('.room-tile').forEach(tile => {
      tile.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.room-toggle')) return;
        this._startRoomLongPress(e, tile.dataset.room);
      });
      tile.addEventListener('pointermove', (e) => this._trackRoomLongPressMove(e));
      tile.addEventListener('pointerup', () => this._clearRoomLongPress());
      tile.addEventListener('pointercancel', () => this._clearRoomLongPress());
      tile.addEventListener('click', (e) => {
        if (e.target.closest('.room-toggle')) return;
        if (Date.now() < this._suppressRoomClickUntil) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        hapticFeedback();
        const roomId = tile.dataset.room;
        const dashboardPath = this._roomsIndex.dashboard_path || '/hue-ui';
        window.history.pushState(null, '', `${dashboardPath}/${roomId}`);
        window.dispatchEvent(new Event('location-changed'));
      });
    });

    // Toggle switches - control all room lights
    this.shadowRoot.querySelectorAll('.room-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        hapticFeedback();

        const roomId = toggle.dataset.room;
        const room = this._roomsIndex.rooms?.find(r => r.id === roomId);
        if (!room) return;

        toggleAllLights(this._hass, room.lights);
      });
    });

    // Person avatar click - show more info
    this.shadowRoot.querySelectorAll('.person-avatar').forEach(avatar => {
      avatar.addEventListener('click', () => {
        hapticFeedback();
        const entityId = avatar.dataset.entity;
        if (!entityId) return;
        const dashboardPath = this._roomsIndex?.dashboard_path || '/hue-ui';
        window.history.pushState(null, '', `${dashboardPath}/person/${encodeURIComponent(entityId)}`);
        window.dispatchEvent(new Event('location-changed'));
      });
    });

    // Device tile click - navigate to device page or show more info
    this.shadowRoot.querySelectorAll('.device-tile').forEach(tile => {
      tile.addEventListener('click', (e) => {
        const toggle = e.target.closest('.room-toggle:not(.read-only)');
        if (toggle) return;

        hapticFeedback();
        const deviceId = tile.dataset.device;
        const device = this._roomsIndex.devices?.find(d => d.id === deviceId);

        // Tesla and other kind-based devices navigate to /device/{id}
        if (device?.kind === 'tesla') {
          const dashboardPath = this._roomsIndex.dashboard_path || '/hue-ui';
          window.history.pushState(null, '', `${dashboardPath}/device/${deviceId}`);
          window.dispatchEvent(new Event('location-changed'));
          return;
        }

        if (device?.path) {
          const dashboardPath = this._roomsIndex.dashboard_path || '/hue-ui';
          const targetPath = device.path.startsWith('/')
            ? device.path
            : `${dashboardPath}/${device.path}`;
          window.history.pushState(null, '', targetPath);
          window.dispatchEvent(new Event('location-changed'));
        } else if (device?.device_file) {
          const dashboardPath = this._roomsIndex.dashboard_path || '/hue-ui';
          window.history.pushState(null, '', `${dashboardPath}/device/${deviceId}`);
          window.dispatchEvent(new Event('location-changed'));
        } else {
          const entityId = tile.dataset.entity;
          if (entityId && this._hass?.states[entityId]) {
            handleAction(this._hass, 'more_info', entityId);
          }
        }
      });
    });

    // Device toggle switches
    this.shadowRoot.querySelectorAll('.device-tile .room-toggle:not(.read-only)').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        hapticFeedback();

        const entityId = toggle.dataset.entity;
        if (entityId && this._hass?.states[entityId]) {
          handleAction(this._hass, 'toggle', entityId);
        }
      });
    });

    const roomEditorOverlay = this.shadowRoot.querySelector('.home-room-editor-overlay');
    if (roomEditorOverlay) {
      roomEditorOverlay.addEventListener('click', (e) => {
        if (e.target === roomEditorOverlay) {
          this._closeHomeRoomEditor({ discardChanges: true });
          return;
        }
        const action = e.target.closest('[data-room-editor-action]')?.dataset.roomEditorAction;
        if (!action) return;
        e.preventDefault();
        e.stopPropagation();
        this._handleHomeRoomEditorAction(action);
      });
    }
  }

  _startRoomLongPress(event, roomId) {
    if (!roomId) return;
    this._clearRoomLongPress();
    this._roomLongPressPointerId = event.pointerId;
    this._roomLongPressStart = { x: event.clientX, y: event.clientY };
    this._roomLongPressRoomId = roomId;
    this._roomLongPressTimer = setTimeout(() => {
      this._roomLongPressTimer = null;
      this._suppressRoomClickUntil = Date.now() + 600;
      this._handleRoomLongPress(roomId);
    }, 3000);
  }

  _trackRoomLongPressMove(event) {
    if (this._roomLongPressPointerId == null || this._roomLongPressPointerId !== event.pointerId) return;
    if (!this._roomLongPressStart) return;
    const dx = Math.abs(event.clientX - this._roomLongPressStart.x);
    const dy = Math.abs(event.clientY - this._roomLongPressStart.y);
    if (dx > 10 || dy > 10) {
      this._clearRoomLongPress();
    }
  }

  _clearRoomLongPress() {
    if (this._roomLongPressTimer) {
      clearTimeout(this._roomLongPressTimer);
      this._roomLongPressTimer = null;
    }
    this._roomLongPressPointerId = null;
    this._roomLongPressStart = null;
    this._roomLongPressRoomId = null;
  }

  _handleRoomLongPress(roomId) {
    const room = this._roomsIndex?.rooms?.find((item) => item?.id === roomId);
    if (!room) return;

    hapticFeedback('hard');
    this._openHomeRoomEditor(room);
  }

  _openHomeRoomEditor(room) {
    if (!room) return;
    this._homeRoomSnapshot = JSON.parse(JSON.stringify(room));
    this._homeRoomEditor = {
      roomId: room.id,
      removeRoom: room.hide_on_home === true,
      temperature: room?.sensors?.temperature || '',
      motion: room?.sensors?.motion || '',
      showTempSelect: false,
      showMotionSelect: false,
    };

    const overlay = this.shadowRoot.querySelector('.home-room-editor-overlay');
    const title = this.shadowRoot.querySelector('.home-room-editor-title');
    const tempSelect = this.shadowRoot.querySelector('[data-room-editor-select="temp"]');
    const motionSelect = this.shadowRoot.querySelector('[data-room-editor-select="motion"]');
    const status = this.shadowRoot.querySelector('.home-room-editor-status');
    if (!overlay || !tempSelect || !motionSelect) return;

    const tempOptions = this._collectRoomSensorOptions(room, 'temp');
    const motionOptions = this._collectRoomSensorOptions(room, 'motion');
    tempSelect.innerHTML = this._renderHomeRoomSensorOptions(tempOptions, this._homeRoomEditor.temperature);
    motionSelect.innerHTML = this._renderHomeRoomSensorOptions(motionOptions, this._homeRoomEditor.motion);
    tempSelect.style.display = 'none';
    motionSelect.style.display = 'none';
    if (title) title.textContent = `Edit room widget · ${room.name || room.id}`;
    if (status) status.textContent = '';
    overlay.classList.add('is-open');
  }

  _closeHomeRoomEditor({ discardChanges = false } = {}) {
    const overlay = this.shadowRoot.querySelector('.home-room-editor-overlay');
    const status = this.shadowRoot.querySelector('.home-room-editor-status');
    if (overlay) overlay.classList.remove('is-open');
    if (status) status.textContent = '';
    if (discardChanges && this._homeRoomSnapshot && this._homeRoomEditor?.roomId) {
      const roomId = this._homeRoomEditor.roomId;
      const idx = this._roomsIndex?.rooms?.findIndex((item) => item?.id === roomId);
      if (idx >= 0) this._roomsIndex.rooms[idx] = this._homeRoomSnapshot;
    }
    this._homeRoomEditor = null;
    this._homeRoomSnapshot = null;
  }

  _collectRoomSensorOptions(room, kind) {
    const list = [];
    const add = (entityId) => {
      if (!entityId || typeof entityId !== 'string') return;
      if (list.some((item) => item.entity_id === entityId)) return;
      const state = this._hass?.states?.[entityId];
      const name = state?.attributes?.friendly_name || entityId;
      list.push({ entity_id: entityId, name });
    };

    const sensorsObj = room?.sensors && typeof room.sensors === 'object' ? room.sensors : {};
    Object.values(sensorsObj).forEach((entityId) => {
      const domain = String(entityId || '').split('.')[0];
      if (kind === 'temp' && domain === 'sensor') add(entityId);
      if (kind === 'motion' && domain === 'binary_sensor') add(entityId);
    });

    if (kind === 'temp') add(room?.sensors?.temperature);
    if (kind === 'motion') add(room?.sensors?.motion);

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  _renderHomeRoomSensorOptions(options, selected) {
    const rows = ['<option value="">None</option>'];
    options.forEach((opt) => {
      const isSel = opt.entity_id === selected ? ' selected' : '';
      rows.push(`<option value="${escapeHtml(opt.entity_id)}"${isSel}>${escapeHtml(opt.name)}</option>`);
    });
    return rows.join('');
  }

  _handleHomeRoomEditorAction(action) {
    const editor = this._homeRoomEditor;
    if (!editor) return;
    const status = this.shadowRoot.querySelector('.home-room-editor-status');
    const tempSelect = this.shadowRoot.querySelector('[data-room-editor-select="temp"]');
    const motionSelect = this.shadowRoot.querySelector('[data-room-editor-select="motion"]');

    if (action === 'remove_room') {
      editor.removeRoom = !editor.removeRoom;
      if (status) status.textContent = editor.removeRoom ? 'Room will be removed from Home.' : 'Room will stay on Home.';
      return;
    }

    if (action === 'change_temp_entity') {
      editor.showTempSelect = !editor.showTempSelect;
      if (tempSelect) tempSelect.style.display = editor.showTempSelect ? '' : 'none';
      return;
    }

    if (action === 'change_motion_entity') {
      editor.showMotionSelect = !editor.showMotionSelect;
      if (motionSelect) motionSelect.style.display = editor.showMotionSelect ? '' : 'none';
      return;
    }

    if (action === 'cancel') {
      this._closeHomeRoomEditor({ discardChanges: true });
      this._suppressRoomClickUntil = Date.now() + 320;
      return;
    }

    if (action === 'save') {
      const roomIdx = this._roomsIndex?.rooms?.findIndex((item) => item?.id === editor.roomId);
      if (roomIdx == null || roomIdx < 0) return;
      const nextRooms = this._roomsIndex.rooms.map((item) => ({ ...item, sensors: { ...(item.sensors || {}) } }));
      const target = nextRooms[roomIdx];
      const nextTemp = String(tempSelect?.value || '').trim();
      const nextMotion = String(motionSelect?.value || '').trim();
      target.hide_on_home = !!editor.removeRoom;
      target.sensors.temperature = nextTemp || '';
      target.sensors.motion = nextMotion || '';

      const nextIndex = { ...this._roomsIndex, rooms: nextRooms };
      const saved = saveRoomsIndexOverride(nextIndex);
      if (!saved) {
        if (status) status.textContent = 'Save failed.';
        return;
      }
      this._roomsIndex = this._normalizeRoomsIndex(nextIndex);
      this._closeHomeRoomEditor({ discardChanges: false });
      this._suppressRoomClickUntil = Date.now() + 500;
      this._render();
    }
  }

  _openHomeAssistantSidebar() {
    hapticFeedback();
    // Escape hatch: hard-navigate to HA Settings to exit kiosk mode.
    // Use assign() for a full page load — SPA routing cannot be trusted in kiosk.
    window.location.assign('/config/dashboard');
  }

  // ===== State Updates =====

  _updateStates() {
    // Update person avatars
    this.shadowRoot.querySelectorAll('.person-avatar').forEach(avatar => {
      const entityId = avatar.dataset.entity;
      const state = this._hass?.states[entityId];
      if (!state) return;

      const personState = state.state || 'unknown';
      const personStateClass = this._getPersonStateClass(personState);
      avatar.classList.remove('home', 'not_home', 'unknown');
      avatar.classList.add(personStateClass);
    });

    this.shadowRoot.querySelectorAll('.person-card').forEach((card) => {
      const avatar = card.querySelector('.person-avatar');
      const zoneEl = card.querySelector('.person-zone');
      const entityId = avatar?.dataset.entity;
      const state = entityId ? this._hass?.states[entityId] : null;
      if (!zoneEl || !state) return;
      zoneEl.textContent = this._formatPersonZone(entityId, state.state || 'unknown');
    });

    // Update room tiles
    this.shadowRoot.querySelectorAll('.room-tile').forEach(tile => {
      const roomId = tile.dataset.room;
      const room = this._roomsIndex.rooms?.find(r => r.id === roomId);
      if (!room) return;

      const lights = room.lights || [];
      const lightsOn = lights.filter(id => this._hass?.states[id]?.state === 'on').length;
      const statusEl = tile.querySelector('.room-status');
      const toggleTrack = tile.querySelector('.toggle-track');
      const toggleThumb = tile.querySelector('.toggle-thumb');
      const tempSensor = room.sensors?.temperature;
      const tempValue = tempSensor ? parseFloat(this._hass?.states[tempSensor]?.state) : null;
      const tempLine = tile.querySelector('.room-temp-line');
      const tempValueEl = tile.querySelector('.room-temp-value');
      const tempDot = tile.querySelector('.room-temp-dot');

      if (statusEl) {
        statusEl.textContent = `${lightsOn} / ${lights.length} aan`;
      }
      const showerLabel = tile.querySelector('.room-shower-label');
      const showerSensorUpdate = room.sensors?.shower;
      const isShoweringNow = showerSensorUpdate ? this._isEntityActive(showerSensorUpdate) : false;

      if (showerLabel) {
        showerLabel.style.display = isShoweringNow ? '' : 'none';
      }
      if (tempValueEl) {
        tempValueEl.textContent = Number.isFinite(tempValue) ? `${tempValue.toFixed(1)}°C` : '--';
      }
      if (tempLine) {
        tempLine.style.display = (tempSensor && !isShoweringNow) ? '' : 'none';
      }
      if (tempDot) {
        tempDot.classList.remove('red', 'orange', 'blue', 'unknown');
        tempDot.classList.add(getTemperatureLEDColor(tempValue));
      }

      if (lightsOn > 0) {
        tile.classList.add('lights-on');
        toggleTrack?.classList.add('on');
        toggleThumb?.classList.add('on');
      } else {
        tile.classList.remove('lights-on');
        toggleTrack?.classList.remove('on');
        toggleThumb?.classList.remove('on');
      }

      const showerSensor = room.sensors?.shower;
      if (showerSensor) {
        tile.classList.toggle('is-showering', this._isEntityActive(showerSensor));
      } else {
        tile.classList.remove('is-showering');
      }
    });

    // Update motion indicators
    this.shadowRoot.querySelectorAll('.motion-indicator').forEach(indicator => {
      const sensorId = indicator.dataset.sensor;
      const hasMotion = this._hass?.states[sensorId]?.state === 'on';
      indicator.classList.toggle('active', hasMotion);
    });

    // Update device tiles
    this.shadowRoot.querySelectorAll('.device-tile').forEach(tile => {
      const entityId = tile.dataset.entity;
      if (!entityId) return;

      const state = this._hass?.states[entityId];
      if (!state) return;

      const deviceId = tile.dataset.device;
      const device = this._roomsIndex.devices?.find(d => d.id === deviceId);
      const isActive = this._isDeviceActive(device, state);
      const printerLike = !!(device?.progress_entity || device?.eta_entity || device?.entity === 'sensor.bambu_x1c_print_status');
      const printerAlert = this._isPrintAlertStatus(state.state);
      const statusEl = tile.querySelector('.device-status');
      const toggleTrack = tile.querySelector('.toggle-track');
      const toggleThumb = tile.querySelector('.toggle-thumb');

      if (statusEl) {
        statusEl.textContent = this._formatDeviceState(state);
      }

      if (isActive) {
        tile.classList.add('active');
        toggleTrack?.classList.add('on');
        toggleThumb?.classList.add('on');
      } else {
        tile.classList.remove('active');
        toggleTrack?.classList.remove('on');
        toggleThumb?.classList.remove('on');
      }
      tile.classList.toggle('printer-alert', printerLike && printerAlert);

      const progressEntity = tile.dataset.progressEntity;
      const etaEntity = tile.dataset.etaEntity;
      const printerBlock = tile.querySelector('.device-printer');
      if (progressEntity || etaEntity) {
        const status = this._hass?.states?.[entityId]?.state;
        const printerActive = this._isPrintStatusActive(status);
        const printerAlertNow = this._isPrintAlertStatus(status);
        tile.classList.toggle('printer-alert', printerLike && printerAlertNow);

        if (printerBlock) {
          printerBlock.style.display = (printerActive || printerAlertNow) ? '' : 'none';
          const fillEl = printerBlock.querySelector('.device-printer-fill');
          const percentEl = printerBlock.querySelector('.device-printer-percent');
          const etaEl = printerBlock.querySelector('.device-printer-eta');

          const progress = this._getPrinterProgressPercent(progressEntity);
          if (fillEl) fillEl.style.width = `${progress}%`;
          if (percentEl) percentEl.textContent = `${progress}%`;
          if (etaEl) etaEl.textContent = this._getPrinterEtaLabel(etaEntity);
        }
      }
    });
  }

  _getPersonStateClass(personState) {
    if (personState === 'home') return 'home';
    if (personState === 'unknown' || personState === 'unavailable' || !personState) return 'unknown';
    // Any specific zone name should be treated as away-style, not as a raw CSS class token.
    return 'not_home';
  }

  _getWeatherLocation(weatherState = null) {
    const configured = this._roomsIndex?.weather_location;
    if (typeof configured === 'string' && configured.trim()) return configured.trim();

    const weather = weatherState || this._hass?.states?.[this._roomsIndex?.weather_entity || 'weather.buienradar'];
    const attrs = weather?.attributes || {};
    const candidate = attrs.location || attrs.city || attrs.station || attrs.place || attrs.friendly_name;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();

    return 'Leidschendam';
  }

  _getRainChanceNextHour() {
    const rainEntityId = this._roomsIndex?.weather_rain_chance_entity || 'sensor.neerslag_buienradar_regen_data';
    const rainState = this._hass?.states?.[rainEntityId];
    if (!rainState) return null;

    const unit = String(rainState.attributes?.unit_of_measurement || '').trim();
    const numericState = Number.parseFloat(rainState.state);

    if (Number.isFinite(numericState) && unit === '%') {
      return Math.max(0, Math.min(100, Math.round(numericState)));
    }

    const data = rainState.attributes?.data;
    if (typeof data === 'string' && data.trim()) {
      const values = data
        .trim()
        .split(/\s+/)
        .map((chunk) => Number.parseInt(chunk.split('|')[0], 10))
        .filter((value) => Number.isFinite(value))
        .slice(0, 12);

      if (values.length > 0) {
        const wetSlots = values.filter((value) => value > 0).length;
        return Math.round((wetSlots / values.length) * 100);
      }
    }

    return Number.isFinite(numericState) && numericState > 0 ? 100 : 0;
  }

  _formatPersonZone(personEntityId, personState) {
    if (!personState || personState === 'unknown' || personState === 'unavailable') return 'Unknown';

    if (personState === 'home') {
      const areaSensorMap = this._roomsIndex?.people_area_sensors || {};
      const areaEntityId = areaSensorMap[personEntityId];
      if (areaEntityId) {
        const areaState = this._hass?.states?.[areaEntityId];
        const areaName = areaState?.attributes?.area_name || areaState?.state;
        if (typeof areaName === 'string') {
          const normalized = areaName.trim();
          if (normalized && normalized !== 'unknown' && normalized !== 'unavailable') {
            return normalized;
          }
        }
      }
      return 'Home';
    }

    if (personState === 'not_home') return 'Away';
    return 'Away';
  }

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {};
  }
}

if (!customElements.get('hue-home-screen')) {
  customElements.define('hue-home-screen', HueHomeScreen);
}

export { HueHomeScreen };
