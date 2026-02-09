/**
 * Tesla In-App Screen
 * Tesla-app-inspired layout, styled to match Hue-UI tokens.
 *
 * This screen is mounted from the home screen when route matches:
 *   {dashboard_path}/device/{deviceId}
 * and the device kind is "tesla".
 */

import { escapeHtml } from '../ui/helpers2.js?v=3.1.51';
import { handleAction, hapticFeedback } from './events3.js?v=3.1.51';

const TESLA_SCREEN_STYLES = `
  /* Root structure: pinned header + separate scroll container (same as rooms). */
  .tesla-root {
    position: relative;
    height: 100%;
    min-height: 100%;
    font-family: var(--hue-font-family);
    color: var(--hue-text-primary);
  }

  .tesla-header-pinned {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 16px 18px 0 18px;
    pointer-events: none;
  }

  .tesla-header-pinned::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -20px;
    height: 20px;
    background: linear-gradient(180deg, rgba(58,42,26,0.5) 0%, transparent 100%);
    pointer-events: none;
  }

  /* Room-like header bar + back button (same design language) */
  .hue-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 20px;
    background:
      linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.12) 100%),
      linear-gradient(120deg, #5a4a3a 0%, #3f3226 100%);
    box-shadow: var(--hue-shadow-card);
    pointer-events: auto;
    transition: background 180ms ease, box-shadow 180ms ease;
  }

  .hue-header-bar[data-state="charging"] {
    background: linear-gradient(120deg, rgba(87, 199, 255, 0.8) 0%, rgba(0, 120, 170, 0.7) 100%);
    box-shadow:
      var(--hue-shadow-card),
      0 0 0 1px rgba(87, 199, 255, 0.22) inset;
  }

  .hue-header-bar[data-state="driving"] {
    background: linear-gradient(120deg, rgba(55, 214, 107, 0.78) 0%, rgba(26, 140, 74, 0.7) 100%);
    box-shadow:
      var(--hue-shadow-card),
      0 0 0 1px rgba(55, 214, 107, 0.22) inset;
  }

  .hue-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .hue-header-back {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--hue-radius-full);
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.18);
    color: var(--hue-text-primary);
    font-size: 22px;
    cursor: pointer;
    box-shadow: var(--hue-shadow-button);
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    pointer-events: auto;
  }

  .hue-header-back::before {
    content: '';
    position: absolute;
    inset: -8px;
  }

  .hue-header-title {
    font-size: 22px;
    font-weight: var(--hue-font-weight-semibold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: var(--hue-text-shadow);
  }

  .tesla-topmeta {
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
  }

  .tesla-scroll {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    z-index: 10;
  }

  .tesla-scroll::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }

  .tesla-scroll-content {
    max-width: 920px;
    margin: 0 auto;
    padding: 102px 18px 32px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tesla-chip {
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(0,0,0,0.22);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    color: rgba(255,255,255,0.9);
  }

  .tesla-chip .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(255,255,255,0.45);
    box-shadow: 0 0 10px rgba(255,255,255,0.12);
  }

  .tesla-chip.is-driving .dot { background: #37d66b; box-shadow: 0 0 12px rgba(55, 214, 107, 0.45); }
  .tesla-chip.is-charging .dot { background: #57c7ff; box-shadow: 0 0 12px rgba(87, 199, 255, 0.45); }
  .tesla-chip.is-asleep .dot { background: rgba(255,255,255,0.32); box-shadow: none; }

  .tesla-hero {
    background: var(--hue-surface);
    border-radius: var(--hue-radius-xl);
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255,255,255,0.12);
    padding: 16px 16px 14px;
    overflow: hidden;
    position: relative;
  }

  .tesla-hero::before {
    content: "";
    position: absolute;
    inset: -40px -60px auto -60px;
    height: 180px;
    background: radial-gradient(circle at 40% 40%, rgba(201, 162, 39, 0.22), rgba(0,0,0,0) 55%);
    pointer-events: none;
  }

  .tesla-hero-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    position: relative;
  }

  .tesla-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .tesla-name {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.2px;
    text-shadow: var(--hue-text-shadow);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: min(520px, 70vw);
  }

  .tesla-subtitle {
    font-size: 12px;
    color: var(--hue-text-muted);
    font-weight: 700;
  }

  .tesla-speed {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .tesla-speed-value {
    font-size: 28px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.2px;
  }

  .tesla-speed-unit {
    font-size: 11px;
    color: var(--hue-text-muted);
    font-weight: 800;
  }

  .tesla-battery {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .tesla-battery-track {
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(0,0,0,0.32);
    box-shadow: var(--hue-shadow-inset);
  }

  .tesla-battery-fill {
    height: 100%;
    border-radius: inherit;
    transition: width 300ms ease;
    box-shadow: 0 0 12px rgba(120, 255, 175, 0.16);
  }

  .tesla-battery-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    font-weight: 800;
  }

  .tesla-battery-legend .muted {
    color: var(--hue-text-muted);
    font-weight: 700;
  }

  .tesla-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (min-width: 820px) {
    .tesla-grid {
      grid-template-columns: 1.15fr 0.85fr;
      align-items: start;
    }
  }

  .tesla-card {
    background: var(--hue-surface);
    border-radius: var(--hue-radius-xl);
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255,255,255,0.12);
    padding: 14px;
  }

  .tesla-card-title {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.62);
    margin-bottom: 10px;
  }

  .tesla-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  @media (max-width: 420px) {
    .tesla-actions {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .tesla-btn {
    min-height: 72px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(0,0,0,0.18);
    box-shadow: var(--hue-shadow-button);
    color: rgba(255,255,255,0.88);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    cursor: pointer;
    transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
    text-align: center;
    font-size: 11px;
    font-weight: 800;
  }

  .tesla-btn ha-icon {
    --mdc-icon-size: 22px;
    color: rgba(255,255,255,0.9);
  }

  .tesla-btn:active {
    transform: translateY(1px);
    background: rgba(255,255,255,0.08);
  }

  .tesla-btn.is-on {
    border-color: rgba(240, 199, 94, 0.45);
    background: rgba(201, 162, 39, 0.14);
    box-shadow:
      var(--hue-shadow-button),
      0 0 0 1px rgba(201, 162, 39, 0.18) inset,
      0 0 16px rgba(201, 162, 39, 0.18);
  }

  .tesla-btn.is-danger {
    border-color: rgba(255, 130, 130, 0.35);
    background: rgba(255, 110, 110, 0.12);
  }

  .tesla-statrow {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  @media (max-width: 520px) {
    .tesla-statrow {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .tesla-stat {
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.18);
    padding: 10px 10px 9px;
    box-shadow: var(--hue-shadow-inset);
  }

  .tesla-stat-label {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
  }

  .tesla-stat-value {
    margin-top: 4px;
    font-size: 16px;
    font-weight: 900;
  }

  .tesla-stat-value small {
    font-size: 11px;
    font-weight: 800;
    color: rgba(255,255,255,0.65);
    margin-left: 4px;
  }

  .tesla-form {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tesla-control {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.18);
    padding: 10px 10px 10px;
    box-shadow: var(--hue-shadow-inset);
  }

  .tesla-control-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }

  .tesla-control-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 900;
  }

  .tesla-control-title ha-icon {
    --mdc-icon-size: 18px;
    color: rgba(255,255,255,0.85);
  }

  .tesla-control-value {
    font-size: 12px;
    font-weight: 900;
    color: rgba(255,255,255,0.8);
  }

  .tesla-range {
    width: 100%;
  }

  .tesla-range input[type="range"] {
    width: 100%;
    accent-color: var(--hue-gold-light);
  }

  .tesla-select {
    width: 100%;
    height: 36px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(0, 0, 0, 0.22);
    color: rgba(255,255,255,0.92);
    font-size: 12px;
    padding: 0 10px;
    box-sizing: border-box;
    font-weight: 800;
  }
`;

export function renderTeslaScreen(hass, roomsIndex, deviceId) {
  const device = (roomsIndex?.devices || []).find((d) => d.id === deviceId);
  if (!device) {
    return {
      html: '<div style="padding:16px;color:rgba(255,255,255,0.6);">Tesla device not found.</div>',
      styles: '',
      attachListeners: () => {},
    };
  }

  const dashboardPath = roomsIndex?.dashboard_path || '/hue-ui';
  const entities = discoverTeslaEntities(hass, device);
  const vehicleName = device.name || entities.nameFromState || 'Tesla';

  const soc = readNumber(hass, entities.battery_level, null);
  const rangeKm = readNumber(hass, entities.battery_range, null);
  const speed = readNumber(hass, entities.speed, null);
  const shift = String(hass?.states?.[entities.shift_state]?.state || '').toLowerCase();
  const chargingState = String(hass?.states?.[entities.charging]?.state || '').toLowerCase();

  const isDriving = isTeslaDriving(speed, shift);
  const isCharging = chargingState === 'charging';
  const statusText = formatTeslaStatus({ hass, entities, isDriving, isCharging, speed });

  const batteryPercent = soc == null ? 0 : clamp(Math.round(soc), 0, 100);
  const barColor = getBatteryBarColor(batteryPercent);

  const inside = readNumber(hass, entities.inside_temperature, null);
  const outside = readNumber(hass, entities.outside_temperature, null);
  const chargerPower = readNumber(hass, entities.charger_power, null);
  const chargeRate = readNumber(hass, entities.charge_rate, null);
  const odometer = readNumber(hass, entities.odometer, null);

  const lockState = hass?.states?.[entities.lock]?.state;
  const locked = String(lockState || '').toLowerCase() === 'locked';

  const sentryOn = isSwitchOn(hass, entities.sentry_mode);
  const valetOn = isSwitchOn(hass, entities.valet_mode);
  const defrostOn = isSwitchOn(hass, entities.defrost_mode);
  const wheelHeatOn = isSwitchOn(hass, entities.steering_wheel_heater);

  const chipClass = isDriving ? 'is-driving' : isCharging ? 'is-charging' : (statusText.toLowerCase().includes('sleep') ? 'is-asleep' : '');
  const chipLabel = statusText;

  const coverBtn = (entityId, { label, icon }) => {
    if (!entityId) return null;
    const st = String(hass?.states?.[entityId]?.state || '').toLowerCase();
    const isOpen = st === 'open';
    return {
      icon,
      label,
      action: isOpen ? 'close_cover' : 'open_cover',
      entity: entityId,
      isOn: isOpen,
    };
  };

  const quickButtons = [
    entities.lock ? {
      icon: locked ? 'mdi:lock' : 'mdi:lock-open',
      label: locked ? 'Ontgrendel' : 'Vergrendel',
      action: locked ? 'unlock' : 'lock',
      entity: entities.lock,
      isOn: locked,
    } : null,
    entities.sentry_mode ? { icon: 'mdi:shield-car', label: 'Sentry', action: 'toggle', entity: entities.sentry_mode, isOn: sentryOn } : null,
    entities.charge ? { icon: 'mdi:ev-station', label: 'Laden', action: 'toggle', entity: entities.charge, isOn: isSwitchOn(hass, entities.charge) } : null,
    coverBtn(entities.charge_port_door, { icon: 'mdi:ev-plug-type2', label: 'Charge Port' }),
    coverBtn(entities.trunk, { icon: 'mdi:car-back', label: 'Trunk' }),
    coverBtn(entities.frunk, { icon: 'mdi:car', label: 'Frunk' }),
    coverBtn(entities.vent_windows, { icon: 'mdi:window-open-variant', label: 'Vent' }),
    entities.wake ? { icon: 'mdi:power', label: 'Wake', action: 'press', entity: entities.wake } : null,
    entities.flash_lights ? { icon: 'mdi:car-light-high', label: 'Flash', action: 'press', entity: entities.flash_lights } : null,
    entities.honk_horn ? { icon: 'mdi:bullhorn', label: 'Honk', action: 'press', entity: entities.honk_horn, danger: true } : null,
    entities.homelink ? { icon: 'mdi:garage', label: 'HomeLink', action: 'press', entity: entities.homelink } : null,
    entities.keyless_driving ? { icon: 'mdi:key-wireless', label: 'Keyless', action: 'press', entity: entities.keyless_driving } : null,
    entities.play_fart ? { icon: 'mdi:emoticon-outline', label: 'Fart', action: 'press', entity: entities.play_fart, danger: true } : null,
  ].filter(Boolean);

  const html = `
    <div class="tesla-root">
      <div class="tesla-header-pinned">
        <div class="hue-header-bar" data-state="${escapeHtml(isDriving ? 'driving' : isCharging ? 'charging' : 'parked')}">
          <div class="hue-header-left">
            <button class="hue-header-back" data-tesla-nav="back" data-path="${escapeHtml(dashboardPath)}" aria-label="Terug">&#8249;</button>
            <div class="hue-header-title">${escapeHtml(vehicleName)}</div>
          </div>
          <div class="tesla-topmeta">
            <div class="tesla-chip ${escapeHtml(chipClass)}">
              <span class="dot"></span>
              <span>${escapeHtml(chipLabel)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="tesla-scroll">
        <div class="tesla-scroll-content">
          <div class="tesla-hero">
            <div class="tesla-hero-row">
              <div class="tesla-title">
                <div class="tesla-name">${escapeHtml(vehicleName)}</div>
                <div class="tesla-subtitle">
                  ${escapeHtml(buildHeroSubtitle({ batteryPercent, rangeKm, inside, outside, isCharging, chargerPower, chargeRate }))}
                </div>
              </div>

              ${isDriving && speed != null ? `
                <div class="tesla-speed">
                  <div class="tesla-speed-value">${escapeHtml(String(Math.round(speed)))}</div>
                  <div class="tesla-speed-unit">km/h</div>
                </div>
              ` : ''}
            </div>

            <div class="tesla-battery">
              <div class="tesla-battery-track">
                <div class="tesla-battery-fill" style="width:${batteryPercent}%;background:${escapeHtml(barColor)};"></div>
              </div>
              <div class="tesla-battery-legend">
                <div>${batteryPercent}% <span class="muted">SOC</span></div>
                <div>${rangeKm != null ? escapeHtml(String(Math.round(rangeKm))) : '--'} <span class="muted">km</span></div>
              </div>
            </div>
          </div>

          <div class="tesla-grid">
            <div class="tesla-card">
              <div class="tesla-card-title">Snelle acties</div>
              <div class="tesla-actions">
                ${quickButtons.map((btn) => renderActionButton(btn)).join('')}
              </div>
            </div>

            <div class="tesla-card">
              <div class="tesla-card-title">Status</div>
              <div class="tesla-statrow">
                ${renderStat('Binnen', inside != null ? `${round1(inside)}°` : '--')}
                ${renderStat('Buiten', outside != null ? `${round1(outside)}°` : '--')}
                ${renderStat('Driver', readNumber(hass, entities.driver_temperature_setting, null) != null ? `${round1(readNumber(hass, entities.driver_temperature_setting, null))}°` : '--')}
                ${renderStat('Pass.', readNumber(hass, entities.passenger_temperature_setting, null) != null ? `${round1(readNumber(hass, entities.passenger_temperature_setting, null))}°` : '--')}
                ${renderStat('Odometer', odometer != null ? `${Math.round(odometer)} km` : '--')}
                ${renderStat('Charge', chargingState ? chargingState : '--')}
                ${renderStat('Power', chargerPower != null ? `${round1(chargerPower)} kW` : '--')}
                ${renderStat('Rate', chargeRate != null ? `${Math.round(chargeRate)} km/h` : '--')}
              </div>
            </div>

            <div class="tesla-card">
              <div class="tesla-card-title">Opladen</div>
              <div class="tesla-form">
                ${renderNumberSlider(hass, entities.charge_limit, { label: 'Charge limit', icon: 'mdi:battery-charging-80', unit: '%' })}
                ${renderNumberSlider(hass, entities.charge_current, { label: 'Charge current', icon: 'mdi:current-ac', unit: 'A' })}
              </div>
            </div>

            <div class="tesla-card">
              <div class="tesla-card-title">Security & Comfort</div>
              <div class="tesla-actions">
                ${entities.valet_mode ? renderActionButton({ icon: 'mdi:key', label: 'Valet', action: 'toggle', entity: entities.valet_mode, isOn: valetOn }) : ''}
                ${entities.defrost_mode ? renderActionButton({ icon: 'mdi:snowflake', label: 'Defrost', action: 'toggle', entity: entities.defrost_mode, isOn: defrostOn }) : ''}
                ${entities.steering_wheel_heater ? renderActionButton({ icon: 'mdi:steering', label: 'Stuur', action: 'toggle', entity: entities.steering_wheel_heater, isOn: wheelHeatOn }) : ''}
                ${entities.charge_cable_lock ? renderActionButton({
                  icon: 'mdi:lock',
                  label: 'Cable lock',
                  action: String(hass?.states?.[entities.charge_cable_lock]?.state || '').toLowerCase() === 'locked' ? 'unlock' : 'lock',
                  entity: entities.charge_cable_lock,
                  isOn: String(hass?.states?.[entities.charge_cable_lock]?.state || '').toLowerCase() === 'locked',
                }) : ''}
              </div>
              <div style="height:10px"></div>
              <div class="tesla-form">
                ${renderNumberSlider(hass, entities.speed_limit, { label: 'Speed limit', icon: 'mdi:speedometer' })}
                ${renderSelectControl(hass, entities.seat_heater_left, { label: 'Seat heat (L)', icon: 'mdi:car-seat-heater' })}
                ${renderSelectControl(hass, entities.seat_heater_right, { label: 'Seat heat (R)', icon: 'mdi:car-seat-heater' })}
                ${renderSelectControl(hass, entities.seat_heater_rear_left, { label: 'Rear heat (L)', icon: 'mdi:car-seat-heater' })}
                ${renderSelectControl(hass, entities.seat_heater_rear_right, { label: 'Rear heat (R)', icon: 'mdi:car-seat-heater' })}
                ${renderSelectControl(hass, entities.seat_cooler_left, { label: 'Seat cool (L)', icon: 'mdi:snowflake' })}
                ${renderSelectControl(hass, entities.seat_cooler_right, { label: 'Seat cool (R)', icon: 'mdi:snowflake' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return {
    html,
    styles: TESLA_SCREEN_STYLES,
    attachListeners: (shadowRoot) => attachTeslaListeners(shadowRoot, hass, dashboardPath),
  };
}

function attachTeslaListeners(shadowRoot, hass, dashboardPath) {
  // Navigation
  shadowRoot.querySelectorAll('[data-tesla-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nav = el.dataset.teslaNav;
      if (nav !== 'back') return;
      hapticFeedback();
      const path = el.dataset.path || dashboardPath;
      window.history.pushState(null, '', path);
      window.dispatchEvent(new Event('location-changed'));
    });
  });

  // Buttons
  shadowRoot.querySelectorAll('[data-tesla-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hass) return;
      hapticFeedback();
      const action = el.dataset.teslaAction;
      const entity = el.dataset.entity;
      if (!action || !entity) return;
      handleAction(hass, action, entity);
    });
  });

  // Number sliders (commit on change)
  shadowRoot.querySelectorAll('input[data-tesla-number]').forEach((el) => {
    el.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hass) return;
      hapticFeedback();
      const entity = el.dataset.entity;
      const value = Number(el.value);
      if (!entity || !Number.isFinite(value)) return;
      handleAction(hass, 'number_set_value', entity, { value });
    });
  });

  // Select dropdowns
  shadowRoot.querySelectorAll('select[data-tesla-select]').forEach((el) => {
    el.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hass) return;
      hapticFeedback();
      const entity = el.dataset.entity;
      const option = String(el.value || '');
      if (!entity || !option) return;
      handleAction(hass, 'select_option', entity, { option });
    });
  });
}

function discoverTeslaEntities(hass, device) {
  const result = {
    nameFromState: '',
    prefix: '',

    // Sensors
    battery_level: '',
    battery_range: '',
    speed: '',
    shift_state: '',
    charging: '',
    charger_power: '',
    charge_rate: '',
    odometer: '',
    inside_temperature: '',
    outside_temperature: '',
    driver_temperature_setting: '',
    passenger_temperature_setting: '',

    // Switches
    defrost_mode: '',
    sentry_mode: '',
    valet_mode: '',
    steering_wheel_heater: '',
    charge: '',

    // Covers
    vent_windows: '',
    charge_port_door: '',
    frunk: '',
    trunk: '',

    // Locks
    lock: '',
    charge_cable_lock: '',

    // Buttons
    wake: '',
    flash_lights: '',
    honk_horn: '',
    homelink: '',
    keyless_driving: '',
    play_fart: '',

    // Numbers
    charge_current: '',
    charge_limit: '',
    speed_limit: '',

    // Selects
    seat_heater_left: '',
    seat_heater_right: '',
    seat_heater_rear_left: '',
    seat_heater_rear_right: '',
    seat_cooler_left: '',
    seat_cooler_right: '',
  };

  if (!hass?.states) return result;

  // Prefer a per-vehicle prefix (Tessie style), e.g. sensor.anne_fleur_battery_level.
  // Use config override when provided (most reliable).
  const cfg = device?.tesla || {};
  const cfgPrefix = normalizePrefix(cfg.prefix || cfg.vehicle_prefix || '');
  const prefix = cfgPrefix || discoverTeslaPrefix(hass) || '';
  result.prefix = prefix;

  const s = (domain, suffix) => (prefix ? `${domain}.${prefix}_${suffix}` : '');

  // Sensors
  result.battery_level = pickFirstExisting(hass, [s('sensor', 'battery_level')]);
  result.battery_range = pickFirstExisting(hass, [s('sensor', 'battery_range')]);
  result.speed = pickFirstExisting(hass, [s('sensor', 'speed')]);
  result.shift_state = pickFirstExisting(hass, [s('sensor', 'shift_state')]);
  result.charging = pickFirstExisting(hass, [s('sensor', 'charging')]);
  result.charger_power = pickFirstExisting(hass, [s('sensor', 'charger_power')]);
  result.charge_rate = pickFirstExisting(hass, [s('sensor', 'charge_rate')]);
  result.odometer = pickFirstExisting(hass, [s('sensor', 'odometer')]);
  result.inside_temperature = pickFirstExisting(hass, [s('sensor', 'inside_temperature')]);
  result.outside_temperature = pickFirstExisting(hass, [s('sensor', 'outside_temperature')]);
  result.driver_temperature_setting = pickFirstExisting(hass, [s('sensor', 'driver_temperature_setting')]);
  result.passenger_temperature_setting = pickFirstExisting(hass, [s('sensor', 'passenger_temperature_setting')]);

  // Switches
  result.defrost_mode = pickFirstExisting(hass, [s('switch', 'defrost_mode')]);
  result.sentry_mode = pickFirstExisting(hass, [s('switch', 'sentry_mode')]);
  result.valet_mode = pickFirstExisting(hass, [s('switch', 'valet_mode')]);
  result.steering_wheel_heater = pickFirstExisting(hass, [s('switch', 'steering_wheel_heater')]);
  result.charge = pickFirstExisting(hass, [s('switch', 'charge')]);

  // Covers
  result.vent_windows = pickFirstExisting(hass, [s('cover', 'vent_windows')]);
  result.charge_port_door = pickFirstExisting(hass, [s('cover', 'charge_port_door')]);
  result.frunk = pickFirstExisting(hass, [s('cover', 'frunk')]);
  result.trunk = pickFirstExisting(hass, [s('cover', 'trunk')]);

  // Locks
  result.lock = pickFirstExisting(hass, [s('lock', 'lock')]);
  result.charge_cable_lock = pickFirstExisting(hass, [s('lock', 'charge_cable_lock')]);

  // Buttons
  result.wake = pickFirstExisting(hass, [s('button', 'wake')]);
  result.flash_lights = pickFirstExisting(hass, [s('button', 'flash_lights')]);
  result.honk_horn = pickFirstExisting(hass, [s('button', 'honk_horn')]);
  result.homelink = pickFirstExisting(hass, [s('button', 'homelink')]);
  result.keyless_driving = pickFirstExisting(hass, [s('button', 'keyless_driving')]);
  result.play_fart = pickFirstExisting(hass, [s('button', 'play_fart')]);

  // Numbers
  result.charge_current = pickFirstExisting(hass, [s('number', 'charge_current')]);
  result.charge_limit = pickFirstExisting(hass, [s('number', 'charge_limit')]);
  result.speed_limit = pickFirstExisting(hass, [s('number', 'speed_limit')]);

  // Selects
  result.seat_heater_left = pickFirstExisting(hass, [s('select', 'seat_heater_left')]);
  result.seat_heater_right = pickFirstExisting(hass, [s('select', 'seat_heater_right')]);
  result.seat_heater_rear_left = pickFirstExisting(hass, [s('select', 'seat_heater_rear_left')]);
  result.seat_heater_rear_right = pickFirstExisting(hass, [s('select', 'seat_heater_rear_right')]);
  result.seat_cooler_left = pickFirstExisting(hass, [s('select', 'seat_cooler_left')]);
  result.seat_cooler_right = pickFirstExisting(hass, [s('select', 'seat_cooler_right')]);

  // Friendly name fallback
  if (device?.entity && hass.states?.[device.entity]?.attributes?.friendly_name) {
    result.nameFromState = hass.states[device.entity].attributes.friendly_name;
  } else if (result.lock && hass.states?.[result.lock]?.attributes?.friendly_name) {
    // Often the lock has the car name.
    result.nameFromState = hass.states[result.lock].attributes.friendly_name.replace(/\\s*lock\\s*$/i, '');
  }

  return result;
}

function normalizePrefix(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function discoverTeslaPrefix(hass) {
  const keys = Object.keys(hass?.states || {});
  const score = new Map();

  const bump = (prefix, points) => {
    if (!prefix) return;
    score.set(prefix, (score.get(prefix) || 0) + points);
  };

  for (const eid of keys) {
    const m = /^sensor\\.([a-z0-9_]+)_(battery_level|battery_range|speed|shift_state|charging)$/.exec(eid);
    if (!m) continue;
    const prefix = m[1];
    const kind = m[2];
    bump(prefix, kind === 'battery_level' ? 3 : kind === 'speed' ? 2 : 1);
  }

  let best = '';
  let bestScore = -1;
  for (const [prefix, s] of score.entries()) {
    if (s > bestScore) {
      best = prefix;
      bestScore = s;
    }
  }
  return best;
}

function pickFirstExisting(hass, candidates) {
  for (const eid of candidates) {
    if (!eid) continue;
    if (hass?.states?.[eid]) return eid;
  }
  return '';
}

function isSwitchOn(hass, entityId) {
  if (!entityId) return false;
  const s = String(hass?.states?.[entityId]?.state || '').toLowerCase();
  return s === 'on';
}

function readNumber(hass, entityId, fallback) {
  if (!entityId || !hass?.states?.[entityId]) return fallback;
  const n = Number.parseFloat(hass.states[entityId].state);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round1(v) {
  if (!Number.isFinite(v)) return '--';
  return (Math.round(v * 10) / 10).toFixed(1);
}

function isTeslaDriving(speed, shift) {
  if (Number.isFinite(speed) && speed !== null && speed >= 1) return true;
  return shift === 'd' || shift === 'r';
}

function getBatteryBarColor(soc) {
  if (soc < 30) return 'linear-gradient(90deg, #ff4d4d 0%, #ff7878 100%)';
  if (soc < 50) return 'linear-gradient(90deg, #ffa144 0%, #ffc878 100%)';
  return 'linear-gradient(90deg, #2dd15a 0%, #7cff95 100%)';
}

function formatTeslaStatus({ hass, entities, isDriving, isCharging, speed }) {
  if (isDriving) {
    if (speed != null && Number.isFinite(speed) && speed >= 1) return `Rijden ${Math.round(speed)} km/h`;
    return 'Rijden';
  }
  if (isCharging) return 'Aan het laden';

  const chargingRaw = String(hass?.states?.[entities.charging]?.state || '').toLowerCase();
  if (chargingRaw === 'disconnected') return 'Geparkeerd';
  if (chargingRaw === 'complete') return 'Klaar met laden';

  // If we have no better signal, show a safe fallback.
  return 'Geparkeerd';
}

function buildHeroSubtitle({ batteryPercent, rangeKm, inside, outside, isCharging, chargerPower, chargeRate }) {
  const parts = [];
  if (isCharging) {
    const p = chargerPower != null ? `${round1(chargerPower)} kW` : null;
    const r = chargeRate != null ? `${Math.round(chargeRate)} km/h` : null;
    parts.push(['Laden', p, r].filter(Boolean).join(' · '));
  } else {
    parts.push(`${batteryPercent}%`);
    if (rangeKm != null) parts.push(`${Math.round(rangeKm)} km`);
  }

  const temps = [];
  if (inside != null) temps.push(`Binnen ${round1(inside)}°`);
  if (outside != null) temps.push(`Buiten ${round1(outside)}°`);
  if (temps.length) parts.push(temps.join(' · '));

  return parts.filter(Boolean).join('  |  ');
}

function renderActionButton({ icon, label, action, entity, isOn, danger }) {
  const classes = [
    'tesla-btn',
    isOn ? 'is-on' : '',
    danger ? 'is-danger' : '',
  ].filter(Boolean).join(' ');
  return `
    <button class="${escapeHtml(classes)}"
            data-tesla-action="${escapeHtml(action)}"
            data-entity="${escapeHtml(entity)}">
      <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      ${escapeHtml(label)}
    </button>
  `;
}

function renderStat(label, value) {
  return `
    <div class="tesla-stat">
      <div class="tesla-stat-label">${escapeHtml(label)}</div>
      <div class="tesla-stat-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderNumberSlider(hass, entityId, { label, icon, unit }) {
  if (!entityId || !hass?.states?.[entityId]) return '';
  const st = hass.states[entityId];
  const current = Number.parseFloat(st.state);
  if (!Number.isFinite(current)) return '';

  const min = Number.isFinite(Number(st.attributes?.min)) ? Number(st.attributes.min) : 0;
  const max = Number.isFinite(Number(st.attributes?.max)) ? Number(st.attributes.max) : 100;
  const step = Number.isFinite(Number(st.attributes?.step)) ? Number(st.attributes.step) : 1;
  const unitResolved = unit || st.attributes?.unit_of_measurement || '';
  const display = `${current}${unitResolved ? ' ' + unitResolved : ''}`;

  return `
    <div class="tesla-control">
      <div class="tesla-control-head">
        <div class="tesla-control-title">
          <ha-icon icon="${escapeHtml(icon || 'mdi:tune')}"></ha-icon>
          <span>${escapeHtml(label)}</span>
        </div>
        <div class="tesla-control-value">${escapeHtml(display)}</div>
      </div>
      <div class="tesla-range">
        <input type="range"
               min="${escapeHtml(String(min))}"
               max="${escapeHtml(String(max))}"
               step="${escapeHtml(String(step))}"
               value="${escapeHtml(String(current))}"
               data-tesla-number="1"
               data-entity="${escapeHtml(entityId)}" />
      </div>
    </div>
  `;
}

function renderSelectControl(hass, entityId, { label, icon }) {
  if (!entityId || !hass?.states?.[entityId]) return '';
  const st = hass.states[entityId];
  const current = String(st.state || '');
  const options = Array.isArray(st.attributes?.options) ? st.attributes.options : [];
  if (!options.length) return '';

  return `
    <div class="tesla-control">
      <div class="tesla-control-head">
        <div class="tesla-control-title">
          <ha-icon icon="${escapeHtml(icon || 'mdi:format-list-bulleted')}"></ha-icon>
          <span>${escapeHtml(label)}</span>
        </div>
        <div class="tesla-control-value">${escapeHtml(current)}</div>
      </div>
      <select class="tesla-select" data-tesla-select="1" data-entity="${escapeHtml(entityId)}">
        ${options.map((opt) => `
          <option value="${escapeHtml(String(opt))}" ${String(opt) === current ? 'selected' : ''}>${escapeHtml(String(opt))}</option>
        `).join('')}
      </select>
    </div>
  `;
}

function renderToggleLike(hass, entityId, { label, icon }) {
  if (!entityId || !hass?.states?.[entityId]) return '';
  const st = hass.states[entityId];
  const isLocked = String(st.state || '').toLowerCase() === 'locked';
  const action = isLocked ? 'unlock' : 'lock';
  const iconToUse = isLocked ? (icon || 'mdi:lock') : 'mdi:lock-open';
  return renderActionButton({
    icon: iconToUse,
    label,
    action,
    entity: entityId,
    isOn: isLocked,
  });
}

export default { renderTeslaScreen };
