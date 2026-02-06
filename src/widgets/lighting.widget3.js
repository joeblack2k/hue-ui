/**
 * Lighting Widget - Content Only
 * Hue v2 tile anatomy: icon (centered) → name → divider → toggle
 */

import { escapeHtml, getLightColor } from '../ui/helpers2.js';

/**
 * Render lighting tiles
 * @param {object} hass - Home Assistant instance
 * @param {string[]} lights - Array of light entity IDs
 * @returns {string} HTML string
 */
export function renderLightingContent(hass, lights = []) {
  return lights.map((entityId) => {
    if (!entityId) return '';
    const state = hass?.states?.[entityId];

    const isOn = state?.state === 'on';
    const name = state?.attributes?.friendly_name || entityId.split('.')[1];
    const icon = state?.attributes?.icon || (isOn ? 'mdi:lightbulb' : 'mdi:lightbulb-outline');
    const rawBrightness = Number(state?.attributes?.brightness);
    const brightness = Number.isFinite(rawBrightness)
      ? Math.max(0, Math.min(100, Math.round((rawBrightness / 255) * 100)))
      : (isOn ? 100 : 0);
    const lightColor = state ? getLightColor(state) : 'var(--hue-text-muted)';
    const iconStyle = isOn
      ? `color: ${lightColor}; filter: drop-shadow(0 0 8px ${lightColor});`
      : 'color: var(--hue-text-muted);';

    return `
      <div class="hue-tile hue-light-tile ${isOn ? 'is-on' : ''}" data-action="more_info" data-entity="${escapeHtml(entityId)}">
        <div class="hue-tile-icon" style="${iconStyle}">
          <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
        </div>
        <div class="hue-tile-name">${escapeHtml(name)}</div>
        <div class="hue-light-divider"></div>
        <div class="hue-light-brightness">${brightness}%</div>
        <div class="hue-tile-footer">
          <button class="hue-toggle hue-toggle-sm" data-on="${isOn}" data-action="toggle" data-entity="${escapeHtml(entityId)}"></button>
        </div>
      </div>
    `;
  }).join('');
}

export default { renderLightingContent };
