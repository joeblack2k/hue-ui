/**
 * Centralized Event Handler - Delegated event routing + HA service calls
 * All widgets emit actions via data-action / data-entity / data-mode attributes
 */

/**
 * Handle an action from a delegated event
 * @param {object} hass - Home Assistant instance
 * @param {string} action - action name
 * @param {string} entity - entity ID
 * @param {object} options - additional options (mode, brightness, etc.)
 */
export function handleAction(hass, action, entity, options = {}) {
  if (!hass) return;

  switch (action) {
    case 'tts_say': {
      const player = String(options?.media_player_entity_id || entity || '').trim();
      const message = String(options?.message || '').trim();
      const provider = String(options?.provider_entity_id || 'tts.google_ai_tts').trim();
      if (!player || !message) return;

      // Prefer Google AI TTS when available, but fall back to other providers to ensure speech works.
      void Promise.resolve()
        .then(() => hass.callService('tts', 'speak', {
          entity_id: provider,
          media_player_entity_id: player,
          message,
        }))
        .catch(() => hass.callService('tts', 'cloud_say', {
          entity_id: player,
          message,
        }))
        .catch(() => hass.callService('tts', 'google_translate_say', {
          entity_id: player,
          message,
        }));
      break;
    }

    case 'call_service': {
      const domain = String(options?.domain || '').trim();
      const service = String(options?.service || '').trim();
      const data = options?.data && typeof options.data === 'object' ? options.data : {};
      if (!domain || !service) return;
      hass.callService(domain, service, data);
      break;
    }

    case 'toggle':
      toggleEntity(hass, entity);
      break;

    case 'turn_on':
      hass.callService('homeassistant', 'turn_on', { entity_id: entity });
      break;

    case 'turn_off':
      hass.callService('homeassistant', 'turn_off', { entity_id: entity });
      break;

    case 'set_brightness':
      if (options.brightness !== undefined) {
        hass.callService('light', 'turn_on', {
          entity_id: entity,
          brightness: options.brightness,
        });
      }
      break;

    case 'set_color_temp':
      if (options.color_temp !== undefined) {
        hass.callService('light', 'turn_on', {
          entity_id: entity,
          color_temp: options.color_temp,
        });
      }
      break;

    case 'set_color_hue':
      if (options.hs_color !== undefined) {
        hass.callService('light', 'turn_on', {
          entity_id: entity,
          hs_color: options.hs_color,
        });
      }
      break;

    case 'set_hvac_mode':
      if (options.mode) {
        hass.callService('climate', 'set_hvac_mode', {
          entity_id: entity,
          hvac_mode: options.mode,
        });
      }
      break;

    case 'set_temperature':
      if (options.temperature !== undefined) {
        hass.callService('climate', 'set_temperature', {
          entity_id: entity,
          temperature: options.temperature,
        });
      }
      break;

    case 'increase_temperature':
      adjustTemperature(hass, entity, 0.5);
      break;

    case 'decrease_temperature':
      adjustTemperature(hass, entity, -0.5);
      break;

    case 'media_play_pause':
      hass.callService('media_player', 'media_play_pause', { entity_id: entity });
      break;

    case 'media_primary': {
      const state = hass.states?.[entity];
      const source = String(state?.attributes?.source || '').toLowerCase();
      const isTvSource = source.includes('tv') || source.includes('hdmi');
      if (isTvSource) {
        const muted = !!state?.attributes?.is_volume_muted;
        hass.callService('media_player', 'volume_mute', {
          entity_id: entity,
          is_volume_muted: !muted,
        });
      } else {
        hass.callService('media_player', 'media_play_pause', { entity_id: entity });
      }
      break;
    }

    case 'media_select_source':
      if (options.source) {
        hass.callService('media_player', 'select_source', {
          entity_id: entity,
          source: options.source,
        });
      }
      break;

    case 'media_seek': {
      const seek = Number(options.seek_position);
      if (Number.isFinite(seek) && seek >= 0) {
        hass.callService('media_player', 'media_seek', {
          entity_id: entity,
          seek_position: seek,
        });
      }
      break;
    }

    case 'activate_scene':
      hapticFeedback();
      hass.callService('scene', 'turn_on', { entity_id: entity });
      break;

    case 'lock':
      hass.callService('lock', 'lock', { entity_id: entity });
      break;

    case 'unlock':
      hass.callService('lock', 'unlock', { entity_id: entity });
      break;

    case 'open_cover':
      hass.callService('cover', 'open_cover', { entity_id: entity });
      break;

    case 'close_cover':
      hass.callService('cover', 'close_cover', { entity_id: entity });
      break;

    case 'press':
      if (entity?.startsWith('script.')) {
        hass.callService('script', 'turn_on', { entity_id: entity });
      } else {
        hass.callService('button', 'press', { entity_id: entity });
      }
      break;

    case 'volume_set':
      if (options.volume_level !== undefined) {
        hass.callService('media_player', 'volume_set', {
          entity_id: entity,
          volume_level: options.volume_level,
        });
      }
      break;

    case 'number_set_value': {
      const value = Number(options.value);
      if (Number.isFinite(value)) {
        hass.callService('number', 'set_value', {
          entity_id: entity,
          value,
        });
      }
      break;
    }

    case 'select_option': {
      const option = String(options.option ?? '').trim();
      if (option) {
        hass.callService('select', 'select_option', {
          entity_id: entity,
          option,
        });
      }
      break;
    }

    case 'more_info':
      fireMoreInfo(hass, entity);
      break;

    case 'navigate':
      if (options.path) {
        window.history.pushState(null, '', options.path);
        window.dispatchEvent(new Event('location-changed'));
      }
      break;

    default:
      console.warn('[Events] Unknown action:', action);
  }
}

/**
 * Toggle entity based on domain
 */
function toggleEntity(hass, entity) {
  const domain = entity.split('.')[0];
  const state = hass.states[entity];
  const isOn = state?.state === 'on' || state?.state === 'playing';

  if (domain === 'button') {
    hass.callService('button', 'press', { entity_id: entity });
    return;
  }

  if (domain === 'climate') {
    // Toggle climate between off and previous mode
    const hvacModes = state?.attributes?.hvac_modes || ['off', 'heat'];
    const newMode = state?.state === 'off' ? hvacModes.find(m => m !== 'off') || 'heat' : 'off';
    hass.callService('climate', 'set_hvac_mode', {
      entity_id: entity,
      hvac_mode: newMode,
    });
  } else {
    hass.callService('homeassistant', isOn ? 'turn_off' : 'turn_on', { entity_id: entity });
  }
}

/**
 * Adjust climate temperature
 */
function adjustTemperature(hass, entity, delta) {
  const state = hass.states[entity];
  if (!state) return;

  const currentTemp = state.attributes.temperature || 20;
  const minTemp = state.attributes.min_temp || 5;
  const maxTemp = state.attributes.max_temp || 35;
  const newTemp = Math.max(minTemp, Math.min(maxTemp, currentTemp + delta));

  hass.callService('climate', 'set_temperature', {
    entity_id: entity,
    temperature: newTemp,
  });
}

/**
 * Fire more-info dialog
 */
function fireMoreInfo(hass, entity) {
  beginMoreInfoGuard();
  const event = new CustomEvent('hass-more-info', {
    detail: { entityId: entity },
    bubbles: true,
    composed: true,
  });
  document.querySelector('home-assistant')?.dispatchEvent(event);
}

let moreInfoGuardInitialized = false;
let moreInfoGuardPoll = null;
let moreInfoGuardStopTimer = null;

function beginMoreInfoGuard() {
  if (!moreInfoGuardInitialized) {
    moreInfoGuardInitialized = true;
    window.addEventListener('dialog-closed', endMoreInfoGuard, true);
    window.addEventListener('hass-more-info', (event) => {
      if (!event?.detail?.entityId) endMoreInfoGuard();
    }, true);
  }

  document.documentElement.classList.add('hue-more-info-open');
  setHueCardsInteractionDisabled(true);

  if (moreInfoGuardStopTimer) clearTimeout(moreInfoGuardStopTimer);
  moreInfoGuardStopTimer = setTimeout(() => {
    endMoreInfoGuard();
  }, 20000);

  if (moreInfoGuardPoll) clearInterval(moreInfoGuardPoll);
  let staleChecks = 0;
  moreInfoGuardPoll = setInterval(() => {
    if (isAnyDialogOpen()) {
      staleChecks = 0;
      return;
    }
    staleChecks += 1;
    if (staleChecks >= 3) {
      endMoreInfoGuard();
    }
  }, 250);
}

function endMoreInfoGuard() {
  if (moreInfoGuardPoll) {
    clearInterval(moreInfoGuardPoll);
    moreInfoGuardPoll = null;
  }
  if (moreInfoGuardStopTimer) {
    clearTimeout(moreInfoGuardStopTimer);
    moreInfoGuardStopTimer = null;
  }
  document.documentElement.classList.remove('hue-more-info-open');
  setHueCardsInteractionDisabled(false);
}

function setHueCardsInteractionDisabled(disabled) {
  const pointerValue = disabled ? 'none' : '';
  document.querySelectorAll('hue-home-screen, hue-room-screen').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.pointerEvents = pointerValue;
  });
}

function isAnyDialogOpen() {
  return !!findNodeDeep(document.documentElement, (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = String(node.tagName || '').toLowerCase();
    if ((tag.includes('dialog') || tag.includes('sheet')) && (node.hasAttribute('open') || node.getAttribute('aria-hidden') === 'false')) {
      return true;
    }
    if (node.classList?.contains('mdc-dialog') && node.classList.contains('mdc-dialog--open')) {
      return true;
    }
    return false;
  });
}

function findNodeDeep(root, matcher) {
  if (!root) return null;
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (matcher(node)) return node;

    if (node.shadowRoot) {
      queue.push(node.shadowRoot);
    }

    const children = node.children || node.childNodes || [];
    for (const child of children) {
      queue.push(child);
    }
  }
  return null;
}

/**
 * Toggle all lights in a list
 */
export function toggleAllLights(hass, lights) {
  if (!hass || !lights?.length) return;

  const anyOn = lights.some(id => hass.states[id]?.state === 'on');
  const service = anyOn ? 'turn_off' : 'turn_on';

  hass.callService('light', service, { entity_id: lights });
}

/**
 * Provide haptic feedback if available
 */
export function hapticFeedback(level = 'light') {
  if (navigator.vibrate) {
    if (level === 'hard') {
      navigator.vibrate([14, 8, 16]);
    } else {
      navigator.vibrate(10);
    }
  }
  window.dispatchEvent(new CustomEvent('haptic', { detail: level }));
}

export default {
  handleAction,
  toggleAllLights,
  hapticFeedback,
};
