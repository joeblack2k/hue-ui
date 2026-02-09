/**
 * Tesla Device Tile Widget
 * Renders a Tesla vehicle tile for the home screen device grid.
 * Battery bar (color-coded), SOC %, range, status, charging/driving animations.
 */

import { escapeHtml } from '../ui/helpers2.js?v=3.1.51';

/**
 * Render a Tesla device tile for the home screen
 * @param {object} hass - Home Assistant instance
 * @param {object} device - device config from rooms.index.json
 * @returns {string} HTML string for the tile
 */
export function renderTeslaTile(hass, device) {
  if (!device || !hass) return '';

  const entities = discoverTeslaTileEntities(hass, device);
  const statusState = entities.status ? hass.states?.[entities.status] : null;

  const batteryState = entities.battery ? hass.states?.[entities.battery] : null;
  const rangeState = entities.range ? hass.states?.[entities.range] : null;
  const shiftState = entities.shift_state ? hass.states?.[entities.shift_state] : null;
  const chargingState = entities.charging ? hass.states?.[entities.charging] : null;
  const timeToFullState = entities.time_to_full ? hass.states?.[entities.time_to_full] : null;
  const sentryState = entities.sentry_mode ? hass.states?.[entities.sentry_mode] : null;

  const soc = parseSoc(batteryState);
  const rangeKm = parseRange(rangeState);
  const speed = parseSpeed(hass.states?.[entities.speed]);
  const isCharging = isTeslaCharging(chargingState, statusState);
  const countdownTargetMs = isCharging ? parseChargeTargetMs(timeToFullState) : null;
  const shiftLabel = isCharging ? 'Opladen' : formatShiftLabelNl(shiftState?.state, statusState?.state);
  const showSpeed = Number.isFinite(speed) && speed !== null && speed >= 1;
  const speedLabel = showSpeed ? `${Math.round(speed)} km/u` : '0 km/u';
  const isDriving = isTeslaDriving(shiftState, speed, statusState);
  const barColor = getBatteryBarColor(soc);
  const vehicleName = device.name || statusState?.attributes?.friendly_name || entities.nameFromState || 'Tesla';
  const sentryOn = String(sentryState?.state || '').toLowerCase() === 'on';

  const chargingClass = isCharging ? 'tesla-charging' : '';
  const drivingClass = isDriving ? 'tesla-driving' : '';
  const sentryClass = sentryOn ? 'tesla-sentry-on' : '';
  const rangeText = (isCharging && countdownTargetMs)
    ? formatCountdownHhMmSs(Math.max(0, Math.floor((countdownTargetMs - Date.now()) / 1000)))
    : (rangeKm !== null ? rangeKm + ' km' : '--');
  const countdownAttr = (isCharging && countdownTargetMs) ? ` data-countdown-target="${countdownTargetMs}"` : '';

  return `
    <div class="device-tile tesla-tile ${chargingClass} ${drivingClass} ${sentryClass}"
         data-device="${escapeHtml(device.id)}"
         data-entity="${escapeHtml(entities.status || '')}">
      <div class="tesla-sentry-dot" aria-hidden="true"></div>
      <div class="device-header">
        <div class="device-icon-container">
         <ha-icon class="device-icon" icon="${escapeHtml(device.icon || 'mdi:car-electric')}"></ha-icon>
        </div>
      </div>
      <div class="device-name">${escapeHtml(vehicleName)}</div>
      <div class="tesla-drive-row">
        <span class="tesla-shift">${escapeHtml(shiftLabel)}</span>
        <span class="tesla-speed ${showSpeed ? '' : 'is-hidden'}">${escapeHtml(speedLabel)}</span>
      </div>
      <div class="tesla-battery-section">
        <div class="tesla-battery-track">
          <div class="tesla-battery-fill" style="width:${soc}%;background:${barColor};"></div>
        </div>
        <div class="tesla-battery-legend">
          <span class="tesla-soc">${soc}%</span>
          <span class="tesla-range"${countdownAttr}>${escapeHtml(rangeText)}</span>
        </div>
      </div>
    </div>
  `;
}

export function updateTeslaTile(hass, tileEl, device) {
  if (!hass || !tileEl || !device) return;

  const entities = discoverTeslaTileEntities(hass, device);

  const statusState = entities.status ? hass.states?.[entities.status] : null;
  const batteryState = entities.battery ? hass.states?.[entities.battery] : null;
  const rangeState = entities.range ? hass.states?.[entities.range] : null;
  const shiftState = entities.shift_state ? hass.states?.[entities.shift_state] : null;
  const chargingState = entities.charging ? hass.states?.[entities.charging] : null;
  const timeToFullState = entities.time_to_full ? hass.states?.[entities.time_to_full] : null;
  const sentryState = entities.sentry_mode ? hass.states?.[entities.sentry_mode] : null;

  const soc = parseSoc(batteryState);
  const rangeKm = parseRange(rangeState);
  const speed = parseSpeed(hass.states?.[entities.speed]);
  const isCharging = isTeslaCharging(chargingState, statusState);
  const countdownTargetMs = isCharging ? parseChargeTargetMs(timeToFullState) : null;
  const shiftLabel = isCharging ? 'Opladen' : formatShiftLabelNl(shiftState?.state, statusState?.state);
  const showSpeed = Number.isFinite(speed) && speed !== null && speed >= 1;
  const speedLabel = showSpeed ? `${Math.round(speed)} km/u` : '0 km/u';
  const isDriving = isTeslaDriving(shiftState, speed, statusState);
  const barColor = getBatteryBarColor(soc);
  const sentryOn = String(sentryState?.state || '').toLowerCase() === 'on';

  tileEl.classList.toggle('tesla-charging', isCharging);
  tileEl.classList.toggle('tesla-driving', isDriving);
  tileEl.classList.toggle('tesla-sentry-on', sentryOn);

  const shiftEl = tileEl.querySelector('.tesla-shift');
  if (shiftEl) shiftEl.textContent = shiftLabel;

  const speedEl = tileEl.querySelector('.tesla-speed');
  if (speedEl) {
    speedEl.textContent = speedLabel;
    speedEl.classList.toggle('is-hidden', !showSpeed);
  }

  const fillEl = tileEl.querySelector('.tesla-battery-fill');
  if (fillEl) {
    fillEl.style.width = `${soc}%`;
    fillEl.style.background = barColor;
  }

  const socEl = tileEl.querySelector('.tesla-soc');
  if (socEl) socEl.textContent = `${soc}%`;

  const rangeEl = tileEl.querySelector('.tesla-range');
  if (rangeEl) {
    if (isCharging && countdownTargetMs) {
      rangeEl.dataset.countdownTarget = String(countdownTargetMs);
      rangeEl.textContent = formatCountdownHhMmSs(
        Math.max(0, Math.floor((countdownTargetMs - Date.now()) / 1000))
      );
    } else {
      delete rangeEl.dataset.countdownTarget;
      rangeEl.textContent = rangeKm !== null ? `${rangeKm} km` : '--';
    }
  }
}

/**
 * CSS for Tesla tile (to be injected into host styles)
 */
export const TESLA_TILE_CSS = `
  .tesla-tile {
    position: relative;
    min-height: 148px;
  }

  /* Defensive: if a generic device tile status line ever sneaks into a Tesla tile,
     hide it so we only show shift/speed + battery UI. */
  .tesla-tile .device-status {
    display: none !important;
  }

  .tesla-tile .tesla-drive-row {
    font-size: var(--hue-font-size-sm);
    color: var(--hue-text-muted);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .tesla-tile .tesla-shift {
    font-weight: 800;
    letter-spacing: 0.2px;
    font-variant-numeric: tabular-nums;
  }

  .tesla-tile .tesla-speed {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .tesla-tile .tesla-speed.is-hidden {
    visibility: hidden;
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

  .tesla-tile.tesla-charging .tesla-battery-fill {
    background: linear-gradient(90deg, #2dd15a 0%, #7cff95 100%) !important;
    animation: teslaBatteryPulse 1.8s ease-in-out infinite;
    box-shadow:
      0 0 10px rgba(67, 255, 130, 0.55),
      0 0 18px rgba(67, 255, 130, 0.25);
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

  .tesla-sentry-dot {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 80, 80, 0.0);
    opacity: 0;
    transform: scale(0.6);
    pointer-events: none;
  }

  .tesla-tile.tesla-sentry-on .tesla-sentry-dot {
    opacity: 1;
    transform: scale(1);
    background: #ff4242;
    box-shadow:
      0 0 10px rgba(255, 66, 66, 0.85),
      0 0 20px rgba(255, 66, 66, 0.35);
    animation: teslaSentryPulse 1.25s ease-in-out infinite;
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

  @keyframes teslaBatteryPulse {
    0%, 100% {
      filter: brightness(0.95);
      transform: scaleY(1);
      opacity: 0.92;
    }
    50% {
      filter: brightness(1.08);
      transform: scaleY(1.02);
      opacity: 1;
    }
  }

  @keyframes teslaSentryPulse {
    0%, 100% {
      transform: scale(0.92);
      opacity: 0.78;
      box-shadow:
        0 0 10px rgba(255, 66, 66, 0.75),
        0 0 18px rgba(255, 66, 66, 0.25);
    }
    50% {
      transform: scale(1.08);
      opacity: 1;
      box-shadow:
        0 0 14px rgba(255, 66, 66, 0.95),
        0 0 28px rgba(255, 66, 66, 0.42);
    }
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

function formatCountdownHhMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hh = Math.floor(s / 3600).toString().padStart(2, '0');
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function parseChargeTargetMs(timeToFullState) {
  if (!timeToFullState) return null;

  const raw = String(timeToFullState.state || '').trim();
  if (!raw || raw === 'unknown' || raw === 'unavailable') return null;

  const parsedDate = Date.parse(raw);
  if (Number.isFinite(parsedDate)) return parsedDate;

  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const unit = String(timeToFullState.attributes?.unit_of_measurement || '').toLowerCase().trim();
  if (unit === 'h' || unit === 'hr' || unit === 'hrs' || unit === 'hour' || unit === 'hours') {
    return Date.now() + numeric * 3600000;
  }
  if (unit === 'min' || unit === 'mins' || unit === 'minute' || unit === 'minutes') {
    return Date.now() + numeric * 60000;
  }
  if (unit === 's' || unit === 'sec' || unit === 'secs' || unit === 'second' || unit === 'seconds') {
    return Date.now() + numeric * 1000;
  }

  return null;
}

function formatShiftLabelNl(shiftValue, statusValue) {
  const shift = String(shiftValue ?? '').trim().toLowerCase();
  if (shift === 'p') return 'Geparkeerd';
  if (shift === 'd') return 'Rijden';
  if (shift === 'r') return 'Achteruit';
  if (shift === 'n') return 'Neutraal';
  if (shift && shift !== 'unknown' && shift !== 'unavailable') return shift.toUpperCase();

  const status = String(statusValue ?? '').trim().toLowerCase();
  if (status === 'charging') return 'Opladen';
  if (status === 'driving') return 'Rijden';
  if (status === 'online') return 'Geparkeerd';
  if (status === 'asleep' || status === 'offline' || status === 'suspended') return 'Geparkeerd';
  if (status === 'unavailable') return 'Onbeschikbaar';
  if (status === 'unknown') return 'Onbekend';
  return '--';
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
  if (charging === 'charging' || charging === 'starting') return true;
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
    time_to_full: device?.time_to_full_entity || '',
    sentry_mode: device?.sentry_entity || '',
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
      result.time_to_full = result.time_to_full || `sensor.${configuredPrefix}_time_to_full_charge`;
      result.sentry_mode = result.sentry_mode || `switch.${configuredPrefix}_sentry_mode`;
    }
  }

  // If explicitly configured, we're done.
  if (result.battery && result.speed && result.shift_state && result.charging && result.time_to_full && result.sentry_mode) {
    return result;
  }

  // Build a per-vehicle prefix score from known Tessie-style entity IDs, e.g.:
  // sensor.anne_fleur_battery_level, sensor.anne_fleur_speed, sensor.anne_fleur_shift_state
  const sensors = Object.keys(hass.states).filter((eid) => eid.startsWith('sensor.'));
  const prefixScore = new Map();
  const bump = (prefix, points) => {
    if (!prefix) return;
    prefixScore.set(prefix, (prefixScore.get(prefix) || 0) + points);
  };

  for (const eid of sensors) {
    const m = /^sensor\.([a-z0-9_]+)_(battery_level|battery_range|speed|shift_state|charging|time_to_full_charge)$/.exec(eid);
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
  if (!result.time_to_full && hass.states[pick('time_to_full_charge')]) result.time_to_full = pick('time_to_full_charge');
  const sentrySwitch = `switch.${bestPrefix}_sentry_mode`;
  if (!result.sentry_mode && hass.states[sentrySwitch]) result.sentry_mode = sentrySwitch;

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

export default { renderTeslaTile, updateTeslaTile, TESLA_TILE_CSS };
