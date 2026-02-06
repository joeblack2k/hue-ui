/**
 * Hue Room Screen Card
 * iOS 6 Skeuomorphic style with sections layout
 */

import { escapeHtml, getRoomIcon, getEntityState } from '../ui/helpers2.js';
import { handleAction } from '../ui/actions.js';
import { renderLightingWidget } from '../widgets/lighting-widget.js';
import { renderClimateWidget } from '../widgets/climate-widget.js';
import { renderMediaWidget } from '../widgets/media-widget.js';
import { renderDevicesWidget } from '../widgets/devices-widget.js';

const STYLES = `
  :host {
    display: block;
    /* iOS 6 Skeuomorphic tokens */
    --hue-bg-gradient: linear-gradient(180deg, #5a4a3a 0%, #4a3a2a 20%, #3a2a1a 80%, #2a1a0a 100%);
    --hue-surface-solid: rgba(60, 50, 40, 0.95);
    --hue-surface-row: rgba(255, 255, 255, 0.08);
    --hue-surface-hover: rgba(255, 255, 255, 0.12);
    --hue-text-primary: #ffffff;
    --hue-text-secondary: rgba(255, 255, 255, 0.8);
    --hue-text-muted: rgba(255, 255, 255, 0.5);
    --hue-text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    --hue-gold: #c9a227;
    --hue-gold-light: #f0c75e;
    --hue-gold-gradient: linear-gradient(180deg, #f0c75e 0%, #c9a227 50%, #9a7a1a 100%);
    --hue-temp-heating: linear-gradient(180deg, #ff8a65 0%, #ff5722 50%, #d84315 100%);
    --hue-temp-cooling: linear-gradient(180deg, #4fc3f7 0%, #29b6f6 50%, #0288d1 100%);
    --hue-space-2: 8px;
    --hue-space-3: 12px;
    --hue-space-4: 16px;
    --hue-space-6: 24px;
    --hue-radius-md: 12px;
    --hue-radius-lg: 16px;
    --hue-radius-xl: 20px;
    --hue-radius-full: 9999px;
    --hue-shadow-card: 0 1px 0 rgba(255, 255, 255, 0.1) inset, 0 8px 16px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3);
    --hue-shadow-row: 0 1px 0 rgba(255, 255, 255, 0.08) inset, 0 4px 8px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
    --hue-shadow-inset: 0 2px 4px rgba(0, 0, 0, 0.4) inset, 0 1px 2px rgba(0, 0, 0, 0.3) inset;
    --hue-shadow-button: 0 1px 0 rgba(255, 255, 255, 0.2) inset, 0 -1px 0 rgba(0, 0, 0, 0.1) inset, 0 3px 6px rgba(0, 0, 0, 0.3);
    --hue-shadow-toggle: 0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
    --hue-shadow-glow: 0 0 15px rgba(201, 162, 39, 0.4);
    --hue-font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    --hue-font-size-xs: 11px;
    --hue-font-size-sm: 13px;
    --hue-font-size-md: 15px;
    --hue-font-size-lg: 17px;
    --hue-font-size-xl: 20px;
    --hue-font-size-2xl: 28px;
    --hue-font-weight-medium: 500;
    --hue-font-weight-semibold: 600;
    --hue-font-weight-bold: 700;
    --hue-transition-fast: 150ms ease;
    --hue-transition-normal: 250ms ease;
    --hue-transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
    --hue-toggle-width: 52px;
    --hue-toggle-height: 32px;
    --hue-toggle-knob: 26px;
    --hue-toggle-width-sm: 44px;
    --hue-toggle-height-sm: 28px;
    --hue-toggle-knob-sm: 22px;
  }

  .hue-room {
    min-height: 100vh;
    background: var(--hue-bg-gradient);
    font-family: var(--hue-font-family);
    color: var(--hue-text-primary);
    padding: var(--hue-space-4);
    box-sizing: border-box;
  }

  .hue-room-content {
    max-width: 600px;
    margin: 0 auto;
  }

  /* Header - iOS style with depth */
  .hue-header {
    display: flex;
    align-items: center;
    gap: var(--hue-space-3);
    padding: var(--hue-space-4) 0;
    margin-bottom: var(--hue-space-6);
  }

  .hue-header-back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: var(--hue-surface-solid);
    border-radius: var(--hue-radius-full);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--hue-text-primary);
    cursor: pointer;
    font-size: 24px;
    box-shadow: var(--hue-shadow-button);
    transition: all var(--hue-transition-fast);
  }

  .hue-header-back:active {
    transform: scale(0.95);
    box-shadow: var(--hue-shadow-inset);
  }

  .hue-header-badge {
    display: flex;
    align-items: center;
    gap: var(--hue-space-2);
    background: var(--hue-surface-solid);
    padding: var(--hue-space-2) var(--hue-space-4);
    border-radius: var(--hue-radius-full);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--hue-shadow-button);
  }

  .hue-header-badge-icon { font-size: 22px; }
  .hue-header-badge-text {
    font-size: var(--hue-font-size-lg);
    font-weight: var(--hue-font-weight-semibold);
    text-shadow: var(--hue-text-shadow);
  }

  .hue-header-status {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--hue-space-4);
    color: var(--hue-text-secondary);
    font-size: var(--hue-font-size-sm);
    text-shadow: var(--hue-text-shadow);
  }

  /* Section */
  .hue-section {
    margin-bottom: var(--hue-space-6);
  }

  .hue-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--hue-space-2) 0;
    margin-bottom: var(--hue-space-3);
  }

  .hue-section-title {
    font-size: var(--hue-font-size-sm);
    font-weight: var(--hue-font-weight-bold);
    color: var(--hue-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: var(--hue-text-shadow);
  }

  /* Row - Skeuomorphic card style */
  .hue-row {
    display: flex;
    align-items: center;
    gap: var(--hue-space-3);
    background: var(--hue-surface-row);
    padding: var(--hue-space-3) var(--hue-space-4);
    border-radius: var(--hue-radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: var(--hue-space-2);
    box-shadow: var(--hue-shadow-row);
    cursor: pointer;
    transition: all var(--hue-transition-fast);
    position: relative;
  }

  .hue-row::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%);
    border-radius: var(--hue-radius-lg) var(--hue-radius-lg) 0 0;
    pointer-events: none;
  }

  .hue-row:active {
    transform: scale(0.98);
    box-shadow: var(--hue-shadow-inset);
  }

  .hue-row-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 24px;
    flex-shrink: 0;
  }

  .hue-row-content {
    flex: 1;
    min-width: 0;
  }

  .hue-row-title {
    font-size: var(--hue-font-size-md);
    font-weight: var(--hue-font-weight-medium);
    text-shadow: var(--hue-text-shadow);
  }

  .hue-row-subtitle {
    font-size: var(--hue-font-size-sm);
    color: var(--hue-text-muted);
  }

  .hue-row-end {
    display: flex;
    align-items: center;
    gap: var(--hue-space-3);
    flex-shrink: 0;
  }

  /* Toggle Switch - iOS style with depth */
  .hue-toggle {
    position: relative;
    width: var(--hue-toggle-width);
    height: var(--hue-toggle-height);
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--hue-radius-full);
    border: none;
    cursor: pointer;
    box-shadow: var(--hue-shadow-inset);
    transition: all var(--hue-transition-fast);
    padding: 0;
    flex-shrink: 0;
  }

  .hue-toggle::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: var(--hue-toggle-knob);
    height: var(--hue-toggle-knob);
    background: linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%);
    border-radius: var(--hue-radius-full);
    box-shadow: var(--hue-shadow-toggle);
    transition: transform var(--hue-transition-fast);
  }

  .hue-toggle[data-on="true"] {
    background: var(--hue-gold-gradient);
    box-shadow: var(--hue-shadow-inset), var(--hue-shadow-glow);
  }

  .hue-toggle[data-on="true"]::after {
    transform: translateX(20px);
  }

  .hue-toggle-sm {
    width: var(--hue-toggle-width-sm);
    height: var(--hue-toggle-height-sm);
  }

  .hue-toggle-sm::after {
    width: var(--hue-toggle-knob-sm);
    height: var(--hue-toggle-knob-sm);
  }

  .hue-toggle-sm[data-on="true"]::after {
    transform: translateX(16px);
  }

  /* Slider - iOS style */
  .hue-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--hue-radius-full);
    outline: none;
    box-shadow: var(--hue-shadow-inset);
  }

  .hue-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    background: linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%);
    border-radius: var(--hue-radius-full);
    cursor: pointer;
    box-shadow: var(--hue-shadow-toggle);
  }

  /* Color dot */
  .hue-color-dot {
    width: 16px;
    height: 16px;
    border-radius: var(--hue-radius-full);
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 8px currentColor;
  }

  /* Mode switch */
  .hue-mode-switch {
    display: flex;
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--hue-radius-full);
    padding: 2px;
    box-shadow: var(--hue-shadow-inset);
  }

  .hue-mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-radius: var(--hue-radius-full);
    color: var(--hue-text-muted);
    font-size: var(--hue-font-size-sm);
    cursor: pointer;
    transition: all var(--hue-transition-fast);
  }

  .hue-mode-btn[data-active="true"] {
    background: var(--hue-gold-gradient);
    color: #1a1a1a;
    box-shadow: var(--hue-shadow-button);
  }

  /* Button - iOS style */
  .hue-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--hue-surface-solid);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--hue-radius-lg);
    color: var(--hue-text-primary);
    cursor: pointer;
    box-shadow: var(--hue-shadow-button);
    transition: all var(--hue-transition-fast);
    font-family: inherit;
  }

  .hue-btn:active {
    transform: scale(0.95);
    box-shadow: var(--hue-shadow-inset);
  }

  .hue-btn-round {
    width: 44px;
    height: 44px;
    border-radius: var(--hue-radius-full);
    font-size: 20px;
  }

  .hue-btn-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--hue-radius-full);
    font-size: 24px;
  }

  /* Chip - iOS style */
  .hue-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: var(--hue-surface-solid);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--hue-radius-full);
    color: var(--hue-text-secondary);
    font-size: var(--hue-font-size-sm);
    font-family: inherit;
    font-weight: var(--hue-font-weight-medium);
    cursor: pointer;
    box-shadow: var(--hue-shadow-button);
    transition: all var(--hue-transition-fast);
  }

  .hue-chip:active { transform: scale(0.95); }

  .hue-chip[data-active="true"] {
    background: var(--hue-gold-gradient);
    color: #1a1a1a;
    border-color: transparent;
    box-shadow: var(--hue-shadow-button), var(--hue-shadow-glow);
  }

  .hue-chip-heat[data-active="true"] {
    background: var(--hue-temp-heating);
    color: white;
  }

  .hue-chip-cool[data-active="true"] {
    background: var(--hue-temp-cooling);
    color: white;
  }

  /* Expanded row for climate */
  .hue-row-expanded {
    flex-direction: column;
    align-items: stretch;
    padding: var(--hue-space-4);
  }

  .hue-row-expanded .hue-row-icon {
    position: absolute;
    top: var(--hue-space-4);
    left: var(--hue-space-4);
  }

  .hue-row-expanded .hue-row-content {
    margin-left: 52px;
  }

  /* Small button */
  .hue-btn-sm {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .hue-btn-round.hue-btn-sm {
    border-radius: var(--hue-radius-full);
  }

  /* Expandable panel */
  .hue-expandable {
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: max-height var(--hue-transition-slow), opacity var(--hue-transition-normal);
  }

  .hue-expandable[data-expanded="true"] {
    max-height: 300px;
    opacity: 1;
  }

  /* Temperature control */
  .hue-temp-control {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--hue-space-4);
    padding: var(--hue-space-4) 0;
  }

  .hue-temp-value {
    font-size: var(--hue-font-size-2xl);
    font-weight: var(--hue-font-weight-bold);
    text-shadow: var(--hue-text-shadow);
    min-width: 80px;
    text-align: center;
  }

  /* ha-icon */
  ha-icon {
    --mdc-icon-size: 24px;
    color: inherit;
  }
`;

class HueRoomScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._lastHash = null;
    this._lightingMode = 'brightness';
  }

  set hass(hass) {
    this._hass = hass;
    if (this._shouldRender()) {
      this._render();
    }
  }

  get hass() { return this._hass; }

  setConfig(config) {
    if (!config.name) throw new Error('You need to define a room name');
    this._config = config;
    this._render();
  }

  getCardSize() { return 6; }

  _shouldRender() {
    if (!this._hass || !this._config) return false;
    const entities = this._getAllEntities();
    const hash = entities
      .filter(id => this._hass.states[id])
      .map(id => JSON.stringify(this._hass.states[id]))
      .join('|');
    if (hash !== this._lastHash) {
      this._lastHash = hash;
      return true;
    }
    return false;
  }

  _getAllEntities() {
    const entities = [];
    if (this._config.lights) entities.push(...this._config.lights);
    if (this._config.climate) {
      const list = Array.isArray(this._config.climate) ? this._config.climate : [this._config.climate];
      entities.push(...list);
    }
    if (this._config.media_players) entities.push(...this._config.media_players);
    if (this._config.devices) {
      for (const d of this._config.devices) if (d.entity) entities.push(d.entity);
    }
    if (this._config.temperature_sensor) entities.push(this._config.temperature_sensor);
    return entities;
  }

  _render() {
    if (!this._config) return;

    const icon = this._config.icon || getRoomIcon(this._config.name);
    const backPath = this._config.back_path || '/lovelace';

    let statusHtml = '';
    if (this._config.temperature_sensor && this._hass) {
      const state = this._hass.states[this._config.temperature_sensor];
      if (state && state.state !== 'unavailable') {
        statusHtml += `<span>🌡️ ${state.state}°</span>`;
      }
    }

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="hue-room">
        <div class="hue-room-content">
          <div class="hue-header">
            <button class="hue-header-back" data-action="navigate" data-path="${escapeHtml(backPath)}">‹</button>
            <div class="hue-header-badge">
              <span class="hue-header-badge-icon">${icon}</span>
              <span class="hue-header-badge-text">${escapeHtml(this._config.name)}</span>
            </div>
            <div class="hue-header-status">${statusHtml}</div>
          </div>
          ${this._renderLighting()}
          ${this._renderClimate()}
          ${this._renderMedia()}
          ${this._renderDevices()}
        </div>
      </div>
    `;

    this.shadowRoot.addEventListener('click', this._handleEvent.bind(this));
    this.shadowRoot.addEventListener('input', this._handleInput.bind(this));
  }

  _renderLighting() {
    if (!this._config.lights || this._config.lights.length === 0) return '';
    return renderLightingWidget(this._hass, {
      lights: this._config.lights,
      mode: this._lightingMode,
    });
  }

  _renderClimate() {
    if (!this._config.climate) return '';
    const climate = Array.isArray(this._config.climate) ? this._config.climate : [this._config.climate];
    return renderClimateWidget(this._hass, { climate });
  }

  _renderMedia() {
    if (!this._config.media_players || this._config.media_players.length === 0) return '';
    return renderMediaWidget(this._hass, { media_players: this._config.media_players });
  }

  _renderDevices() {
    if (!this._config.devices || this._config.devices.length === 0) return '';
    return renderDevicesWidget(this._hass, { devices: this._config.devices });
  }

  _handleEvent(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const { action, entity, mode, path } = target.dataset;

    switch (action) {
      case 'navigate':
        if (path) {
          history.pushState(null, '', path);
          window.dispatchEvent(new Event('location-changed'));
        }
        break;
      case 'toggle':
        if (entity) handleAction(this._hass, 'toggle', entity);
        break;
      case 'toggle_all_lights':
        this._toggleAllLights();
        break;
      case 'set_hvac_mode':
        if (entity && mode) handleAction(this._hass, 'set_hvac_mode', entity, { mode });
        break;
      case 'increase_temperature':
        if (entity) handleAction(this._hass, 'increase_temperature', entity);
        break;
      case 'decrease_temperature':
        if (entity) handleAction(this._hass, 'decrease_temperature', entity);
        break;
      case 'media_play_pause':
        if (entity) handleAction(this._hass, 'media_play_pause', entity);
        break;
      case 'set_lighting_mode':
        if (mode) {
          this._lightingMode = mode;
          this._lastHash = null;
          this._render();
        }
        break;
      case 'more_info':
        if (entity) handleAction(this._hass, 'more_info', entity);
        break;
    }
  }

  _handleInput(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const { action, entity } = target.dataset;

    if (action === 'set_brightness' && entity) {
      const brightness = Math.round((parseInt(target.value, 10) / 100) * 255);
      handleAction(this._hass, 'set_brightness', entity, { brightness });
    }
    if (action === 'set_volume' && entity) {
      const volume = parseInt(target.value, 10) / 100;
      handleAction(this._hass, 'volume_set', entity, { volume_level: volume });
    }
  }

  _toggleAllLights() {
    if (!this._config.lights || !this._hass) return;
    const anyOn = this._config.lights.some(id => {
      const state = this._hass.states[id];
      return state && state.state === 'on';
    });
    const service = anyOn ? 'turn_off' : 'turn_on';
    this._hass.callService('light', service, { entity_id: this._config.lights });
  }

  static getStubConfig() {
    return { name: 'Room', lights: [], climate: null, media_players: [], devices: [] };
  }
}

customElements.define('hue-room-screen', HueRoomScreen);
export { HueRoomScreen };
