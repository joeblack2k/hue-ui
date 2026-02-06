/**
 * Sensors Widget - Content Only
 * Renders read-only sensor tiles
 */

import { escapeHtml, getEntityIcon } from '../ui/helpers2.js';

/**
 * Render sensor tiles
 * @param {object} hass - Home Assistant instance
 * @param {Array} sensors - Array of sensor configs or entity IDs
 * @returns {string} HTML string
 */
export function renderSensorsContent(hass, sensors = []) {
  return sensors.map((sensor) => {
    const entityId = typeof sensor === 'string' ? sensor : sensor?.entity;
    if (!entityId) return '';

    const state = hass?.states?.[entityId];
    const name = sensor?.name || state?.attributes?.friendly_name || entityId.split('.')[1];
    const icon = sensor?.icon || getEntityIcon(hass, entityId);

    let valueText = '--';
    if (state && state.state !== 'unavailable' && state.state !== 'unknown') {
      const domain = entityId.split('.')[0];
      if (domain === 'binary_sensor') {
        valueText = state.state === 'on' ? 'Active' : 'Inactive';
      } else {
        const unit = state.attributes?.unit_of_measurement || '';
        valueText = `${state.state}${unit ? ` ${unit}` : ''}`;
      }
    }

    return `
      <div class="hue-tile hue-sensor-tile" data-action="more_info" data-entity="${escapeHtml(entityId)}">
        <div class="hue-tile-icon">
          <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
        </div>
        <div class="hue-tile-name">${escapeHtml(name)}</div>
        <div class="hue-tile-value">${escapeHtml(valueText)}</div>
      </div>
    `;
  }).join('');
}

export default { renderSensorsContent };
