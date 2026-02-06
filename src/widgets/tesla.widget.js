/**
 * Tesla Device Tile Widget
 * Renders a Tesla vehicle tile for the home screen device grid.
 * Battery bar (color-coded), SOC %, range, status, charging/driving animations.
 */

import { escapeHtml } from '../ui/helpers2.js?v=3.1.46';

/**
 * Render a Tesla device tile for the home screen
 * @param {object} hass - Home Assistant instance
 * @param {object} device - device config from rooms.index.json
 * @returns {string} HTML string for the tile
 */
export function renderTeslaTile(hass, device) {
  if (!device || !hass) return '';

  const entities = discoverTeslaTileEntities(hass, device);
  const state = entities.status ? hass.states?.[entities.status] : null;

  const batteryState = entities.battery ? hass.states?.[entities.battery] : null;
  const rangeState = entities.range ? hass.states?.[entities.range] : null;

  const soc = parseSoc(batteryState);
  const rangeKm = parseRange(rangeState);
  const speed = parseSpeed(hass.states?.[entities.speed]);
  const statusText = formatTeslaStatus({
    statusState: state,
    chargingState: hass.states?.[entities.charging],
    shiftState: hass.states?.[entities.shift_state],
    speed,
  });
  const isCharging = isTeslaCharging(hass.states?.[entities.charging], state);
  const isDriving = isTeslaDriving(hass.states?.[entities.shift_state], speed, state);
  const barColor = getBatteryBarColor(soc);
  const vehicleName = device.name || state?.attributes?.friendly_name || entities.nameFromState || 'Tesla';

  const chargingClass = isCharging ? 'tesla-charging' : '';
  const drivingClass = isDriving ? 'tesla-driving' : '';

  return `
    <div class="device-tile tesla-tile ${chargingClass} ${drivingClass}"
         data-device="${escapeHtml(device.id)}"
         data-entity="${escapeHtml(entities.status || '')}">
      <div class="device-header">
        <div class="device-icon-container">
          <ha-icon class="device-icon" icon="${escapeHtml(device.icon || 'mdi:car-electric')}"></ha-icon>
        </div>
      </div>
      <div class="device-name">${escapeHtml(vehicleName)}</div>
      <div class="device-status">${escapeHtml(statusText)}</div>
      <div class="tesla-battery-section">
        <div class="tesla-battery-track">
          <div class="tesla-battery-fill" style="width:${soc}%;background:${barColor};"></div>
        </div>
        <div class="tesla-battery-legend">
          <span class="tesla-soc">${soc}%</span>
          <span class="tesla-range">${rangeKm !== null ? rangeKm + ' km' : '--'}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * CSS for Tesla tile (to be injected into host styles)
 */
export const TESLA_TILE_CSS = `
  .tesla-tile {
    min-height: 148px;
  }

  .tesla-battery-section {
    margin-top: auto;
    padding-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .tesla-battery-track {
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.36);
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
  }

  .tesla-battery-fill {
    height: 100%;
    border-radius: inherit;
    transition: width 300ms ease;
    box-shadow: 0 0 8px rgba(100, 255, 130, 0.35);
  }

  .tesla-battery-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    line-height: 1.2;
  }

  .tesla-soc {
    font-weight: 700;
    color: var(--hue-text-primary);
  }

  .tesla-range {
    color: var(--hue-text-muted);
  }

  .tesla-tile.tesla-charging {
    box-shadow:
      var(--hue-shadow-card),
      0 0 0 1px rgba(100, 255, 160, 0.25) inset,
      0 0 18px rgba(80, 220, 130, 0.3);
    animation: teslaChargeGlow 2.4s ease-in-out infinite;
  }

  .tesla-tile.tesla-driving {
    animation: teslaDriveWiggle 1.2s ease-in-out infinite;
  }

  @keyframes teslaChargeGlow {
    0%, 100% {
      box-shadow:
        var(--hue-shadow-card),
        0 0 0 1px rgba(100, 255, 160, 0.2) inset,
        0 0 12px rgba(80, 220, 130, 0.22);
    }
    50% {
      box-shadow:
        var(--hue-shadow-card),
        0 0 0 1px rgba(100, 255, 160, 0.38) inset,
        0 0 24px rgba(80, 220, 130, 0.45);
    }
  }

  @keyframes teslaDriveWiggle {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-1px); }
    75% { transform: translateX(1px); }
  }
`;

function parseSoc(batteryState) {
  if (!batteryState) return 0;
  const val = Number.parseFloat(batteryState.state);
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

function parseRange(rangeState) {
  if (!rangeState) return null;
  const val = Number.parseFloat(rangeState.state);
  if (!Number.isFinite(val)) return null;
  return Math.round(val);
}

function parseSpeed(speedState) {
  if (!speedState) return null;
  const v = Number.parseFloat(speedState.state);
  if (!Number.isFinite(v)) return null;
  return v;
}

function formatTeslaStatus({ statusState, chargingState, shiftState, speed }) {
  // Prefer "Driving {speed}" when speed is available and non-trivial.
  if (Number.isFinite(speed) && speed !== null && speed >= 1) {
    return `Driving ${Math.round(speed)} km/h`;
  }

  const charging = String(chargingState?.state || '').toLowerCase();
  if (charging === 'charging') return 'Charging';

  const shift = String(shiftState?.state || '').toLowerCase();
  if (shift === 'd' || shift === 'r') return 'Driving';

  const s = String(statusState?.state || '').toLowerCase();
  if (!s) return 'Unavailable';
  if (s === 'charging') return 'Charging';
  if (s === 'driving') return 'Driving';
  if (s === 'online') return 'Parked';
  if (s === 'asleep' || s === 'offline' || s === 'suspended') return 'Parked';
  if (s === 'unavailable' || s === 'unknown') return 'Unavailable';
  return statusState.state.charAt(0).toUpperCase() + statusState.state.slice(1);
}

function isTeslaCharging(chargingState, statusState) {
  const charging = String(chargingState?.state || '').toLowerCase();
  if (charging === 'charging') return true;
  return String(statusState?.state || '').toLowerCase() === 'charging';
}

function isTeslaDriving(shiftState, speed, statusState) {
  if (Number.isFinite(speed) && speed !== null && speed >= 1) return true;
  const shift = String(shiftState?.state || '').toLowerCase();
  if (shift === 'd' || shift === 'r') return true;
  return String(statusState?.state || '').toLowerCase() === 'driving';
}

function getBatteryBarColor(soc) {
  if (soc < 30) return 'linear-gradient(90deg, #ff4d4d 0%, #ff7878 100%)';
  if (soc < 50) return 'linear-gradient(90deg, #ffa144 0%, #ffc878 100%)';
  return 'linear-gradient(90deg, #2dd15a 0%, #7cff95 100%)';
}

function discoverTeslaTileEntities(hass, device) {
  const teslaCfg = device?.tesla || {};
  const result = {
    battery: device?.battery_entity || '',
    range: device?.range_entity || '',
    status: device?.status_entity || device?.entity || '',
    speed: device?.speed_entity || '',
    shift_state: device?.shift_state_entity || '',
    charging: device?.charging_entity || '',
    nameFromState: '',
  };

  if (!hass?.states) return result;

  // Config override: explicit vehicle prefix (recommended for Tessie).
  const configuredPrefixRaw = String(teslaCfg.prefix || '').trim();
  const configuredPrefix = configuredPrefixRaw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  if (configuredPrefix) {
    const battery = `sensor.${configuredPrefix}_battery_level`;
    if (hass.states[battery]) {
      result.battery = result.battery || battery;
      result.range = result.range || `sensor.${configuredPrefix}_battery_range`;
      result.speed = result.speed || `sensor.${configuredPrefix}_speed`;
      result.shift_state = result.shift_state || `sensor.${configuredPrefix}_shift_state`;
      result.charging = result.charging || `sensor.${configuredPrefix}_charging`;
    }
  }

  // If explicitly configured, we're done.
  if (result.battery && result.speed) return result;

  // Build a per-vehicle prefix score from known Tessie-style entity IDs, e.g.:
  // sensor.anne_fleur_battery_level, sensor.anne_fleur_speed, sensor.anne_fleur_shift_state
  const sensors = Object.keys(hass.states).filter((eid) => eid.startsWith('sensor.'));
  const prefixScore = new Map();
  const bump = (prefix, points) => {
    if (!prefix) return;
    prefixScore.set(prefix, (prefixScore.get(prefix) || 0) + points);
  };

  for (const eid of sensors) {
    const m = /^sensor\.([a-z0-9_]+)_(battery_level|battery_range|speed|shift_state|charging)$/.exec(eid);
    if (!m) continue;
    const prefix = m[1];
    const kind = m[2];
    bump(prefix, kind === 'battery_level' ? 3 : kind === 'speed' ? 2 : 1);
  }

  // If there is an integration hint (e.g. "tessie"), prefer prefixes that appear in matching entities.
  const hint = String(
    teslaCfg.integration_hint || device.integration_hint || device.integration || ''
  ).toLowerCase();
  if (hint) {
    for (const eid of sensors) {
      if (eid.toLowerCase().includes(hint)) {
        const m = /^sensor\.([a-z0-9_]+)_/.exec(eid);
        if (m) bump(m[1], 1);
      }
    }
  }

  let bestPrefix = '';
  let bestScore = -1;
  for (const [prefix, score] of prefixScore.entries()) {
    if (score > bestScore) {
      bestPrefix = prefix;
      bestScore = score;
    }
  }

  if (!bestPrefix) return result;

  const pick = (suffix) => `sensor.${bestPrefix}_${suffix}`;
  if (!result.battery && hass.states[pick('battery_level')]) result.battery = pick('battery_level');
  if (!result.range && hass.states[pick('battery_range')]) result.range = pick('battery_range');
  if (!result.speed && hass.states[pick('speed')]) result.speed = pick('speed');
  if (!result.shift_state && hass.states[pick('shift_state')]) result.shift_state = pick('shift_state');
  if (!result.charging && hass.states[pick('charging')]) result.charging = pick('charging');

  // Best-effort name from any discovered sensor.
  const anyState = hass.states[result.battery] || hass.states[result.speed] || hass.states[result.shift_state];
  if (anyState?.attributes?.friendly_name) {
    // friendly_name is like "Anne-Fleur Battery level" -> keep the vehicle label part.
    const fn = String(anyState.attributes.friendly_name);
    const vehicle = fn.split(' Battery')[0].split(' Speed')[0].split(' Shift')[0].trim();
    result.nameFromState = vehicle || '';
  }

  // If we still don't have a status entity, use shift_state (it exists even when parked).
  if (!result.status) result.status = result.shift_state || result.battery;

  return result;
}

export default { renderTeslaTile, TESLA_TILE_CSS };
