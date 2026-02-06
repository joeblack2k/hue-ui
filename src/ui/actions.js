/**
 * Hue UI Actions
 * Service call dispatcher for Home Assistant
 */

/**
 * Handle action dispatch to Home Assistant services
 * @param {object} hass - Home Assistant instance
 * @param {string} action - Action type (toggle, set_brightness, set_hvac_mode, etc.)
 * @param {string} entityId - Entity ID to act on
 * @param {object} options - Additional options for the action
 */
export function handleAction(hass, action, entityId, options = {}) {
  if (!hass || !entityId) {
    console.warn('handleAction: missing hass or entityId');
    return;
  }

  const domain = entityId.split('.')[0];
  const state = hass.states[entityId];

  switch (action) {
    case 'toggle':
      handleToggle(hass, domain, entityId, state);
      break;

    case 'turn_on':
      hass.callService(domain, 'turn_on', { entity_id: entityId });
      break;

    case 'turn_off':
      hass.callService(domain, 'turn_off', { entity_id: entityId });
      break;

    case 'set_brightness':
      if (options.brightness != null) {
        hass.callService('light', 'turn_on', {
          entity_id: entityId,
          brightness: options.brightness,
        });
      }
      break;

    case 'set_color_temp':
      if (options.color_temp != null) {
        hass.callService('light', 'turn_on', {
          entity_id: entityId,
          color_temp: options.color_temp,
        });
      }
      break;

    case 'set_hvac_mode':
      if (options.mode) {
        hass.callService('climate', 'set_hvac_mode', {
          entity_id: entityId,
          hvac_mode: options.mode,
        });
      }
      break;

    case 'set_temperature':
      if (options.temperature != null) {
        hass.callService('climate', 'set_temperature', {
          entity_id: entityId,
          temperature: options.temperature,
        });
      }
      break;

    case 'increase_temperature':
      if (state && state.attributes.temperature != null) {
        const step = options.step || 0.5;
        const maxTemp = state.attributes.max_temp || 30;
        const newTemp = Math.min(state.attributes.temperature + step, maxTemp);
        hass.callService('climate', 'set_temperature', {
          entity_id: entityId,
          temperature: newTemp,
        });
      }
      break;

    case 'decrease_temperature':
      if (state && state.attributes.temperature != null) {
        const step = options.step || 0.5;
        const minTemp = state.attributes.min_temp || 10;
        const newTemp = Math.max(state.attributes.temperature - step, minTemp);
        hass.callService('climate', 'set_temperature', {
          entity_id: entityId,
          temperature: newTemp,
        });
      }
      break;

    case 'media_play_pause':
      hass.callService('media_player', 'media_play_pause', { entity_id: entityId });
      break;

    case 'media_next':
      hass.callService('media_player', 'media_next_track', { entity_id: entityId });
      break;

    case 'media_previous':
      hass.callService('media_player', 'media_previous_track', { entity_id: entityId });
      break;

    case 'volume_up':
      hass.callService('media_player', 'volume_up', { entity_id: entityId });
      break;

    case 'volume_down':
      hass.callService('media_player', 'volume_down', { entity_id: entityId });
      break;

    case 'volume_set':
      if (options.volume_level != null) {
        hass.callService('media_player', 'volume_set', {
          entity_id: entityId,
          volume_level: options.volume_level,
        });
      }
      break;

    case 'fan_set_speed':
      if (options.percentage != null) {
        hass.callService('fan', 'set_percentage', {
          entity_id: entityId,
          percentage: options.percentage,
        });
      }
      break;

    case 'cover_open':
      hass.callService('cover', 'open_cover', { entity_id: entityId });
      break;

    case 'cover_close':
      hass.callService('cover', 'close_cover', { entity_id: entityId });
      break;

    case 'cover_stop':
      hass.callService('cover', 'stop_cover', { entity_id: entityId });
      break;

    case 'cover_set_position':
      if (options.position != null) {
        hass.callService('cover', 'set_cover_position', {
          entity_id: entityId,
          position: options.position,
        });
      }
      break;

    case 'lock':
      hass.callService('lock', 'lock', { entity_id: entityId });
      break;

    case 'unlock':
      hass.callService('lock', 'unlock', { entity_id: entityId });
      break;

    case 'scene_activate':
      hass.callService('scene', 'turn_on', { entity_id: entityId });
      break;

    case 'script_run':
      hass.callService('script', 'turn_on', { entity_id: entityId });
      break;

    case 'more_info':
      fireEvent(hass, 'hass-more-info', { entityId });
      break;

    case 'navigate':
      if (options.path) {
        navigate(options.path);
      }
      break;

    default:
      console.warn(`handleAction: unknown action "${action}"`);
  }
}

/**
 * Handle toggle action for various domains
 * @param {object} hass - Home Assistant instance
 * @param {string} domain - Entity domain
 * @param {string} entityId - Entity ID
 * @param {object} state - Current entity state
 */
function handleToggle(hass, domain, entityId, state) {
  const toggleDomains = ['light', 'switch', 'fan', 'input_boolean', 'automation', 'script'];

  if (toggleDomains.includes(domain)) {
    hass.callService(domain, 'toggle', { entity_id: entityId });
    return;
  }

  if (domain === 'climate') {
    // Toggle between off and last mode or heat
    if (state.state === 'off') {
      const lastMode = state.attributes.last_mode || 'heat';
      hass.callService('climate', 'set_hvac_mode', {
        entity_id: entityId,
        hvac_mode: lastMode,
      });
    } else {
      hass.callService('climate', 'set_hvac_mode', {
        entity_id: entityId,
        hvac_mode: 'off',
      });
    }
    return;
  }

  if (domain === 'media_player') {
    // Toggle between play and pause
    hass.callService('media_player', 'media_play_pause', { entity_id: entityId });
    return;
  }

  if (domain === 'cover') {
    // Toggle between open and closed
    if (state.state === 'open' || state.state === 'opening') {
      hass.callService('cover', 'close_cover', { entity_id: entityId });
    } else {
      hass.callService('cover', 'open_cover', { entity_id: entityId });
    }
    return;
  }

  if (domain === 'lock') {
    // Toggle between locked and unlocked
    if (state.state === 'locked') {
      hass.callService('lock', 'unlock', { entity_id: entityId });
    } else {
      hass.callService('lock', 'lock', { entity_id: entityId });
    }
    return;
  }

  // Default: try generic toggle
  hass.callService('homeassistant', 'toggle', { entity_id: entityId });
}

/**
 * Fire a custom event on the Home Assistant connection
 * @param {object} hass - Home Assistant instance
 * @param {string} eventType - Event type
 * @param {object} detail - Event detail
 */
function fireEvent(hass, eventType, detail) {
  const event = new CustomEvent(eventType, {
    bubbles: true,
    composed: true,
    detail,
  });
  document.querySelector('home-assistant')?.dispatchEvent(event);
}

/**
 * Navigate to a path in Home Assistant
 * @param {string} path - Path to navigate to
 */
function navigate(path) {
  history.pushState(null, '', path);
  const event = new Event('location-changed');
  window.dispatchEvent(event);
}

/**
 * Toggle all entities in a list
 * @param {object} hass - Home Assistant instance
 * @param {string[]} entityIds - Array of entity IDs
 * @param {boolean} turnOn - True to turn on, false to turn off
 */
export function toggleAll(hass, entityIds, turnOn) {
  if (!hass || !entityIds || entityIds.length === 0) return;

  // Group by domain for efficient service calls
  const byDomain = {};
  for (const entityId of entityIds) {
    const domain = entityId.split('.')[0];
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(entityId);
  }

  const service = turnOn ? 'turn_on' : 'turn_off';

  for (const [domain, entities] of Object.entries(byDomain)) {
    hass.callService(domain, service, { entity_id: entities });
  }
}

/**
 * Check if any entities in a list are on
 * @param {object} hass - Home Assistant instance
 * @param {string[]} entityIds - Array of entity IDs
 * @returns {boolean} True if any entity is on
 */
export function anyOn(hass, entityIds) {
  if (!hass || !entityIds) return false;
  return entityIds.some((id) => {
    const state = hass.states[id];
    return state && ['on', 'playing', 'home', 'open', 'unlocked'].includes(state.state.toLowerCase());
  });
}

/**
 * Count how many entities are on
 * @param {object} hass - Home Assistant instance
 * @param {string[]} entityIds - Array of entity IDs
 * @returns {number} Count of entities that are on
 */
export function countOn(hass, entityIds) {
  if (!hass || !entityIds) return 0;
  return entityIds.filter((id) => {
    const state = hass.states[id];
    return state && ['on', 'playing', 'home', 'open', 'unlocked'].includes(state.state.toLowerCase());
  }).length;
}
