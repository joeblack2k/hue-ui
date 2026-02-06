/**
 * Action Tiles Widget - Content Only
 * Renders tappable command tiles that call button.press via data-action="press".
 */

import { escapeHtml } from '../ui/helpers2.js';

/**
 * Render action tiles.
 * @param {object} hass - Home Assistant instance
 * @param {object} section - Section config with actions/buttons arrays
 * @returns {string} HTML string
 */
export function renderActionsContent(hass, section = {}) {
  const actions = [
    ...(Array.isArray(section.actions) ? section.actions : []),
    ...(Array.isArray(section.buttons) ? section.buttons : []),
  ];

  return actions.map((action) => renderActionTile(hass, action)).join('');
}

function renderActionTile(hass, action = {}) {
  const entityId = action.entity;
  if (!entityId) return '';

  const state = hass?.states?.[entityId];
  const available = !!state && state.state !== 'unavailable' && state.state !== 'unknown';
  const name = action.name || state?.attributes?.friendly_name || entityId.split('.')[1];
  const icon = action.icon || state?.attributes?.icon || 'mdi:gesture-tap-button';
  const subtitle = action.subtitle || (available ? 'Tap to run' : 'Unavailable');
  const disabledAttr = available ? '' : 'disabled';

  return `
    <button class="hue-tile hue-action-tile ${available ? '' : 'is-disabled'}"
            data-action="press"
            data-entity="${escapeHtml(entityId)}"
            ${disabledAttr}>
      <div class="hue-tile-icon">
        <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      </div>
      <div class="hue-tile-name">${escapeHtml(name)}</div>
      <div class="hue-tile-subtitle">${escapeHtml(subtitle)}</div>
      <div class="hue-tile-footer">
        <span class="hue-action-pill">Run</span>
      </div>
    </button>
  `;
}

export default { renderActionsContent };
