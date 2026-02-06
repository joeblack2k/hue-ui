/**
 * Devices Widget - iOS 6 Skeuomorphic Row Style
 * List of devices (switches, sensors, etc.) with depth and shadows
 */

import { escapeHtml, isEntityOn, getEntityIcon } from '../ui/helpers2.js';

/**
 * Render the devices section with all devices as rows
 * @param {object} hass - Home Assistant instance
 * @param {object} config - { devices: Array<{entity, name?, icon?}> }
 * @returns {string} HTML string
 */
export function renderDevicesWidget(hass, config) {
  const { devices = [] } = config;
  if (devices.length === 0) return '';

  return `
    <div class="hue-section">
      <div class="hue-section-header">
        <span class="hue-section-title">DEVICES</span>
      </div>
      ${devices.map(device => renderDeviceRow(hass, device)).join('')}
    </div>
  `;
}

/**
 * Render a single device as a row
 */
function renderDeviceRow(hass, device) {
  const entityId = device.entity;
  const state = hass?.states[entityId];
  if (!state) return '';

  const name = device.name || state.attributes.friendly_name || entityId.split('.')[1];
  const icon = device.icon || getEntityIcon(hass, entityId);
  const domain = entityId.split('.')[0];
  const isOn = isEntityOn(hass, entityId);

  // Determine if toggleable
  const isToggleable = ['switch', 'light', 'fan', 'input_boolean', 'automation'].includes(domain);

  // Get status text
  const getStatus = () => {
    if (domain === 'sensor') {
      const unit = state.attributes.unit_of_measurement || '';
      return `${state.state}${unit ? ' ' + unit : ''}`;
    }
    if (domain === 'binary_sensor') {
      return state.state === 'on' ? 'Active' : 'Inactive';
    }
    return isOn ? 'On' : 'Off';
  };

  const iconColor = isOn ? 'var(--hue-gold)' : 'var(--hue-text-muted)';
  const iconGlow = isOn ? 'filter: drop-shadow(0 0 8px var(--hue-gold));' : '';

  return `
    <div class="hue-row" data-action="more_info" data-entity="${escapeHtml(entityId)}">
      <div class="hue-row-icon" style="color: ${iconColor}; ${iconGlow}">
        <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      </div>
      <div class="hue-row-content">
        <div class="hue-row-title">${escapeHtml(name)}</div>
        <div class="hue-row-subtitle">${escapeHtml(getStatus())}</div>
      </div>
      <div class="hue-row-end">
        ${isToggleable ? `
          <button class="hue-toggle hue-toggle-sm" data-on="${isOn}" data-action="toggle" data-entity="${escapeHtml(entityId)}"></button>
        ` : `
          <button
            class="hue-btn hue-btn-round hue-btn-sm"
            data-action="more_info"
            data-entity="${escapeHtml(entityId)}"
            style="font-size: 14px;"
          >ℹ️</button>
        `}
      </div>
    </div>
  `;
}

export default { render: renderDevicesWidget };
