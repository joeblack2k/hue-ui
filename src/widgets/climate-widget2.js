/**
 * Climate Widget - iOS 6 Skeuomorphic Row Style
 * Row layout that expands with controls when on
 */

import { escapeHtml, getFriendlyName, formatHvacMode } from '../ui/helpers2.js';

/**
 * Render the climate section with climate entities as rows
 * @param {object} hass - Home Assistant instance
 * @param {object} config - { climate: string[] }
 * @returns {string} HTML string
 */
export function renderClimateWidget(hass, config) {
  const { climate = [] } = config;
  if (climate.length === 0) return '';

  return `
    <div class="hue-section">
      <div class="hue-section-header">
        <span class="hue-section-title">CLIMATE</span>
      </div>
      ${climate.map(entityId => renderClimateRow(hass, entityId)).join('')}
    </div>
  `;
}

/**
 * Render a single climate entity as a row
 */
function renderClimateRow(hass, entityId) {
  const state = hass?.states[entityId];
  if (!state) return '';

  const isOff = state.state === 'off';
  const name = state.attributes.friendly_name || entityId.split('.')[1];
  const hvacMode = state.state;
  const hvacAction = state.attributes.hvac_action || 'idle';
  const currentTemp = state.attributes.current_temperature;
  const targetTemp = state.attributes.temperature;
  const hvacModes = state.attributes.hvac_modes || ['off', 'heat', 'cool', 'auto'];

  // Get action color
  const getActionColor = () => {
    if (hvacAction === 'heating') return '#ff5722';
    if (hvacAction === 'cooling') return '#29b6f6';
    return 'var(--hue-text-muted)';
  };

  // Get icon
  const getIcon = () => {
    if (hvacAction === 'heating') return 'mdi:fire';
    if (hvacAction === 'cooling') return 'mdi:snowflake';
    if (hvacMode === 'heat') return 'mdi:fire';
    if (hvacMode === 'cool') return 'mdi:snowflake';
    return 'mdi:thermostat';
  };

  const iconColor = isOff ? 'var(--hue-text-muted)' : getActionColor();
  const iconGlow = isOff ? '' : `filter: drop-shadow(0 0 8px ${getActionColor()});`;

  // Collapsed row (off state)
  if (isOff) {
    return `
      <div class="hue-row" data-action="more_info" data-entity="${escapeHtml(entityId)}">
        <div class="hue-row-icon" style="color: ${iconColor};">
          <ha-icon icon="mdi:thermostat"></ha-icon>
        </div>
        <div class="hue-row-content">
          <div class="hue-row-title">${escapeHtml(name)}</div>
          <div class="hue-row-subtitle">${currentTemp != null ? `${currentTemp}°` : 'Off'}</div>
        </div>
        <div class="hue-row-end">
          <button class="hue-toggle hue-toggle-sm" data-on="false" data-action="toggle" data-entity="${escapeHtml(entityId)}"></button>
        </div>
      </div>
    `;
  }

  // Expanded row (on state) - with controls
  const modesHtml = hvacModes
    .filter(m => m !== 'off')
    .map(mode => {
      const isActive = hvacMode === mode;
      const chipClass = mode === 'heat' ? 'hue-chip hue-chip-heat' : mode === 'cool' ? 'hue-chip hue-chip-cool' : 'hue-chip';
      const icon = mode === 'heat' ? '🔥' : mode === 'cool' ? '❄️' : mode === 'auto' || mode === 'heat_cool' ? '🔄' : '';
      return `
        <button
          class="${chipClass}"
          data-active="${isActive}"
          data-action="set_hvac_mode"
          data-entity="${escapeHtml(entityId)}"
          data-mode="${escapeHtml(mode)}"
        >${icon} ${formatHvacMode(mode)}</button>
      `;
    }).join('');

  return `
    <div class="hue-row hue-row-expanded" data-entity="${escapeHtml(entityId)}">
      <div class="hue-row-icon" style="color: ${iconColor}; ${iconGlow}">
        <ha-icon icon="${getIcon()}"></ha-icon>
      </div>
      <div class="hue-row-content" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div class="hue-row-title">${escapeHtml(name)}</div>
            <div class="hue-row-subtitle">${currentTemp != null ? `${currentTemp}°` : ''} ${hvacAction !== 'idle' ? `· ${hvacAction}` : ''}</div>
          </div>
          <button class="hue-toggle hue-toggle-sm" data-on="true" data-action="toggle" data-entity="${escapeHtml(entityId)}"></button>
        </div>

        <!-- Temperature control -->
        <div style="display: flex; align-items: center; gap: 12px; margin: 12px 0;">
          <button
            class="hue-btn hue-btn-round"
            data-action="decrease_temperature"
            data-entity="${escapeHtml(entityId)}"
          >−</button>
          <div style="
            font-size: var(--hue-font-size-2xl);
            font-weight: var(--hue-font-weight-bold);
            text-shadow: var(--hue-text-shadow);
            min-width: 60px;
            text-align: center;
          ">${targetTemp != null ? `${targetTemp}°` : '--'}</div>
          <button
            class="hue-btn hue-btn-round"
            data-action="increase_temperature"
            data-entity="${escapeHtml(entityId)}"
          >+</button>
        </div>

        <!-- Mode chips -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${modesHtml}
        </div>
      </div>
    </div>
  `;
}

export default { render: renderClimateWidget };
