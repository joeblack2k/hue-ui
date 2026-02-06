/**
 * Lighting Widget - iOS 6 Skeuomorphic Row Style
 * List of lights with depth and shadows
 */

import { escapeHtml, getFriendlyName, getLightColor } from '../ui/helpers2.js';

/**
 * Render the lighting section with all lights as rows
 * @param {object} hass - Home Assistant instance
 * @param {object} config - { lights: string[], mode: string }
 * @returns {string} HTML string
 */
export function renderLightingWidget(hass, config) {
  const { lights = [], mode = 'brightness' } = config;
  if (lights.length === 0) return '';

  const anyOn = lights.some(id => {
    const state = hass?.states[id];
    return state && state.state === 'on';
  });

  return `
    <div class="hue-section">
      <div class="hue-section-header">
        <span class="hue-section-title">LIGHTING</span>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="hue-mode-switch">
            <button class="hue-mode-btn" data-active="${mode === 'brightness'}" data-action="set_lighting_mode" data-mode="brightness">☀️</button>
            <button class="hue-mode-btn" data-active="${mode === 'color_temp'}" data-action="set_lighting_mode" data-mode="color_temp">🌡️</button>
          </div>
          <button class="hue-toggle" data-on="${anyOn}" data-action="toggle_all_lights"></button>
        </div>
      </div>
      ${lights.map(entityId => renderLightRow(hass, entityId, mode)).join('')}
    </div>
  `;
}

/**
 * Render a single light as a row
 */
function renderLightRow(hass, entityId, mode) {
  const state = hass?.states[entityId];
  if (!state) return '';

  const isOn = state.state === 'on';
  const name = state.attributes.friendly_name || entityId.split('.')[1];
  const brightness = state.attributes.brightness;
  const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0;
  const lightColor = getLightColor(state);
  const icon = state.attributes.icon || (isOn ? 'mdi:lightbulb' : 'mdi:lightbulb-outline');

  return `
    <div class="hue-row" data-action="more_info" data-entity="${escapeHtml(entityId)}">
      <div class="hue-row-icon" style="color: ${isOn ? lightColor : 'var(--hue-text-muted)'}; ${isOn ? `filter: drop-shadow(0 0 8px ${lightColor});` : ''}">
        <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      </div>
      <div class="hue-row-content">
        <div class="hue-row-title">${escapeHtml(name)}</div>
        ${isOn && brightness ? `<div class="hue-row-subtitle">${brightnessPercent}%</div>` : ''}
        ${isOn && mode === 'brightness' ? `
          <input
            type="range"
            class="hue-slider"
            min="1"
            max="100"
            value="${brightnessPercent}"
            data-action="set_brightness"
            data-entity="${escapeHtml(entityId)}"
            style="margin-top: 8px;"
          />
        ` : ''}
      </div>
      <div class="hue-row-end">
        <div class="hue-color-dot" style="background: ${lightColor};"></div>
        <button class="hue-toggle hue-toggle-sm" data-on="${isOn}" data-action="toggle" data-entity="${escapeHtml(entityId)}"></button>
      </div>
    </div>
  `;
}

export default { render: renderLightingWidget };
