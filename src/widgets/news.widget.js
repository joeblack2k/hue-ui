/**
 * News device tile (Home screen)
 *
 * Home screen fetches/rendering logic lives in hue-home-screen3.js.
 * This module only provides the "Nieuws" device tile markup + CSS.
 */

import { escapeHtml } from '../ui/helpers2.js?v=3.1.67';

export const NEWS_TILE_CSS = `
  .news-tile .device-status {
    font-size: 12px;
    font-weight: 800;
    color: rgba(255,255,255,0.85);
    line-height: 1.35;
    max-height: 2.7em;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .news-tile .news-hint {
    margin-top: 6px;
    font-size: 11px;
    color: var(--hue-text-muted);
    font-variant-numeric: tabular-nums;
  }
`;

export function renderNewsTile(device) {
  return `
    <div class="device-tile news-tile"
         data-device="${escapeHtml(device?.id || 'news')}"
         data-kind="news">
      <div class="device-header">
        <div class="device-icon-container">
          <ha-icon class="device-icon" icon="${escapeHtml(device?.icon || 'mdi:newspaper-variant-outline')}"></ha-icon>
        </div>
      </div>
      <div class="device-name">${escapeHtml(device?.name || 'Nieuws')}</div>
      <div class="device-status">Tik om de 10 belangrijkste koppen te lezen.</div>
      <div class="news-hint">5 lokaal, 5 landelijk. Zonder oorlog, dood en ellende.</div>
    </div>
  `;
}
