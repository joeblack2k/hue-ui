/**
 * Scenes Widget - Paginated Grid (Hue-exact)
 * Renders scene tiles in discrete pages: 3 columns × 2 rows = 6 per page.
 * Pages snap horizontally. No partial tiles visible.
 */

import { escapeHtml } from '../ui/helpers2.js';

const SCENES_PER_PAGE = 6;

/**
 * Render scenes as paginated pages.
 * Each page is a .hue-scene-page containing a 3×2 grid.
 * @param {object} hass - Home Assistant instance
 * @param {Array} scenes - Array of scene configs or entity IDs
 * @returns {string} HTML string (one or more .hue-scene-page elements)
 */
export function renderScenesContent(hass, scenes = []) {
  const pages = [];

  for (let i = 0; i < scenes.length; i += SCENES_PER_PAGE) {
    const pageScenes = scenes.slice(i, i + SCENES_PER_PAGE);
    const tiles = pageScenes.map((scene) => renderSceneTile(hass, scene)).join('');
    pages.push(`<div class="hue-scene-page"><div class="hue-scene-page-grid">${tiles}</div></div>`);
  }

  return pages.join('');
}

function renderSceneTile(hass, scene) {
  const entityId = typeof scene === 'string' ? scene : scene?.entity;
  if (!entityId) return '';

  const state = hass?.states?.[entityId];
  const name = scene?.name || state?.attributes?.friendly_name || entityId.split('.')[1];
  const icon = scene?.icon || state?.attributes?.icon || 'mdi:palette';
  const color = scene?.color || 'rgba(255, 255, 255, 0.18)';

  return `
    <div class="hue-scene-tile" data-action="activate_scene" data-entity="${escapeHtml(entityId)}">
      <div class="hue-scene-badge" style="background: ${color};">
        <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      </div>
      <div class="hue-tile-name">${escapeHtml(name)}</div>
    </div>
  `;
}

export default { renderScenesContent };
