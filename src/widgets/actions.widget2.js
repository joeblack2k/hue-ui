/**
 * Action Tiles Widget - Content Only
 * Renders tappable command tiles.
 *
 * Supported action kinds:
 * - Entity press (button.press / script.turn_on) via data-action="press"
 * - Generic HA action (toggle/more_info/navigate/...) via action.action + action.entity
 * - Arbitrary HA service call via action.service { domain, service, data }
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
  const entityId = action.entity || '';
  const hasService = !!action?.service && typeof action.service === 'object';
  const actionType = String(action.action || (hasService ? 'call_service' : 'press')).trim() || 'press';
  if (!entityId && !hasService) return '';

  const state = entityId ? hass?.states?.[entityId] : null;
  const available = hasService
    ? true
    : (!!state && state.state !== 'unavailable' && state.state !== 'unknown');

  const fallbackName = entityId ? entityId.split('.')[1] : 'action';
  const name = action.name || state?.attributes?.friendly_name || fallbackName;
  const icon = action.icon || state?.attributes?.icon || 'mdi:gesture-tap-button';
  const subtitle = action.subtitle || (available ? 'Tap' : 'Unavailable');
  const subtitleFixedAttr = action.subtitle ? 'data-subtitle-fixed="true"' : '';
  const disabledAttr = available ? '' : 'disabled';
  const wideClass = action.wide ? 'is-wide' : '';

  const svcDomain = hasService ? String(action.service.domain || '').trim() : '';
  const svcName = hasService ? String(action.service.service || '').trim() : '';
  const svcData = hasService ? (action.service.data ?? {}) : null;
  const svcDataJson = hasService ? escapeHtml(JSON.stringify(svcData || {})) : '';
  const svcAttrs = hasService
    ? `data-service-domain="${escapeHtml(svcDomain)}" data-service-name="${escapeHtml(svcName)}" data-service-data="${svcDataJson}"`
    : '';

  const actionData = (action.data && typeof action.data === 'object') ? action.data : null;
  const actionDataAttr = actionData
    ? `data-action-data="${escapeHtml(JSON.stringify(actionData))}"`
    : '';

  return `
    <button class="hue-tile hue-action-tile ${wideClass} ${available ? '' : 'is-disabled'}"
            data-action="${escapeHtml(actionType)}"
            data-entity="${escapeHtml(entityId)}"
            ${svcAttrs}
            ${actionDataAttr}
            ${subtitleFixedAttr}
            ${disabledAttr}>
      <div class="hue-tile-icon">
        <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      </div>
      <div class="hue-tile-name">${escapeHtml(name)}</div>
      <div class="hue-tile-subtitle">${escapeHtml(subtitle)}</div>
      <div class="hue-tile-footer">
        <span class="hue-action-pill">${escapeHtml(action.pill || (hasService ? 'Send' : 'Run'))}</span>
      </div>
    </button>
  `;
}

export default { renderActionsContent };
