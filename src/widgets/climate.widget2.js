/**
 * Climate Widget - Content Only
 * Renders climate tiles
 */

import { escapeHtml, formatHvacMode } from '../ui/helpers2.js';

/**
 * Render climate content
 * @param {object} hass - Home Assistant instance
 * @param {object} section - Section config with entity or entities
 * @returns {string} HTML string
 */
export function renderClimateContent(hass, section) {
  const entities = [];
  if (Array.isArray(section.entities)) entities.push(...section.entities);
  if (Array.isArray(section.entity)) entities.push(...section.entity);
  if (section.entity && !Array.isArray(section.entity)) entities.push(section.entity);

  return entities.map((entityId) => renderClimateTile(hass, entityId, section)).join('');
}

function renderClimateTile(hass, entityId, section) {
  const state = hass?.states?.[entityId];

  const name = section.name || state?.attributes?.friendly_name || entityId.split('.')[1];
  const hvacMode = state?.state || 'off';
  const currentTemp = state?.attributes?.current_temperature;
  const targetTemp = state?.attributes?.temperature;
  const hvacAction = state?.attributes?.hvac_action || '';
  const isOn = hvacMode !== 'off' && hvacMode !== 'unavailable';
  const pulseClass = hvacAction === 'heating'
    ? 'is-heating'
    : hvacAction === 'cooling'
      ? 'is-cooling'
      : '';

  const setpoint = Number.isFinite(Number(targetTemp))
    ? Number(targetTemp)
    : 21;

  const icon = hvacMode === 'cool'
    ? 'mdi:snowflake'
    : hvacMode === 'heat'
      ? 'mdi:fire'
      : 'mdi:thermostat';

  return `
    <div class="hue-tile hue-climate-tile hue-media-tile is-wide ${isOn ? 'is-on' : ''}" data-action="more_info" data-entity="${escapeHtml(entityId)}">
      <div class="hue-media-header">
        <div class="hue-tile-icon">
          <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
        </div>
        <div class="hue-climate-header-right">
          <div class="hue-climate-mode ${pulseClass}">${escapeHtml(formatHvacMode(hvacMode))}</div>
          <button class="hue-toggle hue-toggle-sm hue-climate-power" data-on="${isOn}" data-action="toggle" data-entity="${escapeHtml(entityId)}"></button>
        </div>
      </div>
      <div class="hue-tile-name">${escapeHtml(name)}</div>
      <div class="hue-climate-temps">
        <div class="hue-climate-temp-block">
          <div class="hue-climate-temp-label">Current</div>
          <div class="hue-climate-current">${currentTemp != null ? `${currentTemp}°C` : '--'}</div>
        </div>
      </div>
      <div class="hue-climate-controls">
        <input
          type="range"
          min="18"
          max="25"
          step="0.5"
          value="${Math.max(18, Math.min(25, setpoint))}"
          class="hue-climate-setpoint"
          data-entity="${escapeHtml(entityId)}"
        />
      </div>
    </div>
  `;
}

export default { renderClimateContent };
