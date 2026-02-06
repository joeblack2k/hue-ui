/**
 * Hue Home Dashboard Card
 * Vertical list of room cards with navigation to room screens
 */

import { escapeHtml, getRoomIcon, isEntityOn, getFriendlyName } from '../ui/helpers2.js';
import { anyOn, countOn } from '../ui/actions.js';

const STYLES = `
  :host {
    display: block;
    /* Design tokens */
    --hue-bg-gradient: linear-gradient(180deg, #4a3a2a 0%, #3a2a1a 100%);
    --hue-bg-dark: #2a1a0a;
    --hue-surface: rgba(255, 255, 255, 0.08);
    --hue-surface-2: rgba(255, 255, 255, 0.12);
    --hue-surface-hover: rgba(255, 255, 255, 0.14);
    --hue-surface-active: rgba(255, 255, 255, 0.18);
    --hue-text-primary: rgba(255, 255, 255, 0.95);
    --hue-text-secondary: rgba(255, 255, 255, 0.7);
    --hue-text-muted: rgba(255, 255, 255, 0.5);
    --hue-gold: #c9a227;
    --hue-gold-light: #f0c75e;
    --hue-space-1: 4px;
    --hue-space-2: 8px;
    --hue-space-3: 12px;
    --hue-space-4: 16px;
    --hue-space-6: 24px;
    --hue-radius-md: 12px;
    --hue-radius-lg: 16px;
    --hue-radius-full: 9999px;
    --hue-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --hue-font-size-sm: 13px;
    --hue-font-size-md: 15px;
    --hue-font-size-lg: 17px;
    --hue-font-size-2xl: 24px;
    --hue-font-weight-medium: 500;
    --hue-font-weight-semibold: 600;
    --hue-transition-fast: 150ms ease;
  }

  .hue-home {
    min-height: 100vh;
    background: var(--hue-bg-gradient);
    font-family: var(--hue-font-family);
    color: var(--hue-text-primary);
    padding: var(--hue-space-4);
    box-sizing: border-box;
  }

  .hue-home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--hue-space-4) 0;
    margin-bottom: var(--hue-space-4);
  }

  .hue-home-title {
    font-size: var(--hue-font-size-2xl);
    font-weight: var(--hue-font-weight-semibold);
  }

  .hue-home-subtitle {
    font-size: var(--hue-font-size-sm);
    color: var(--hue-text-muted);
    margin-top: var(--hue-space-1);
  }

  .hue-rooms-list {
    max-width: 600px;
    margin: 0 auto;
  }

  .hue-room-card {
    display: flex;
    align-items: center;
    gap: var(--hue-space-3);
    background: var(--hue-surface);
    padding: var(--hue-space-4);
    border-radius: var(--hue-radius-lg);
    margin-bottom: var(--hue-space-3);
    cursor: pointer;
    transition: background var(--hue-transition-fast);
  }

  .hue-room-card:hover {
    background: var(--hue-surface-hover);
  }

  .hue-room-card:active {
    background: var(--hue-surface-active);
  }

  .hue-room-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: var(--hue-surface-2);
    border-radius: var(--hue-radius-md);
    font-size: 28px;
    flex-shrink: 0;
  }

  .hue-room-info {
    flex: 1;
    min-width: 0;
  }

  .hue-room-name {
    font-size: var(--hue-font-size-lg);
    font-weight: var(--hue-font-weight-medium);
  }

  .hue-room-status {
    font-size: var(--hue-font-size-sm);
    color: var(--hue-text-muted);
    margin-top: var(--hue-space-1);
  }

  .hue-room-end {
    display: flex;
    align-items: center;
    gap: var(--hue-space-3);
  }

  .hue-indicator-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--hue-text-muted);
    transition: background var(--hue-transition-fast);
  }

  .hue-indicator-dot[data-on="true"] {
    background: var(--hue-gold);
  }

  .hue-chevron {
    color: var(--hue-text-muted);
    font-size: 20px;
  }
`;

class HueHomeDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._lastHash = null;
  }

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (this._shouldRender()) {
      this._render();
    }
  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    if (!config.rooms || !Array.isArray(config.rooms)) {
      throw new Error('You need to define rooms');
    }
    this._config = config;
    this._render();
  }

  getCardSize() {
    return this._config?.rooms?.length || 3;
  }

  _shouldRender() {
    if (!this._hass || !this._config) return false;

    // Collect all entities from all rooms
    const allEntities = [];
    for (const room of this._config.rooms) {
      if (room.entities) allEntities.push(...room.entities);
      if (room.lights) allEntities.push(...room.lights);
      if (room.climate) allEntities.push(...(Array.isArray(room.climate) ? room.climate : [room.climate]));
    }

    // Build state hash
    const hash = allEntities
      .filter((id) => this._hass.states[id])
      .map((id) => `${id}:${this._hass.states[id].state}`)
      .join('|');

    if (hash !== this._lastHash) {
      this._lastHash = hash;
      return true;
    }
    return false;
  }

  _render() {
    if (!this._config) return;

    const title = this._config.title || 'Home';
    const rooms = this._config.rooms || [];

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="hue-home">
        <div class="hue-home-header">
          <div>
            <div class="hue-home-title">${escapeHtml(title)}</div>
            ${this._config.subtitle ? `<div class="hue-home-subtitle">${escapeHtml(this._config.subtitle)}</div>` : ''}
          </div>
        </div>
        <div class="hue-rooms-list">
          ${rooms.map((room, index) => this._renderRoomCard(room, index)).join('')}
        </div>
      </div>
    `;

    // Attach event listeners
    this.shadowRoot.addEventListener('click', this._handleEvent.bind(this));
  }

  _renderRoomCard(room, index) {
    const icon = room.icon || getRoomIcon(room.name);
    const entities = this._getRoomEntities(room);
    const isOn = this._hass ? anyOn(this._hass, entities) : false;
    const status = this._getRoomStatus(room);

    return `
      <div class="hue-room-card" data-action="navigate" data-room="${index}">
        <div class="hue-room-icon">${icon}</div>
        <div class="hue-room-info">
          <div class="hue-room-name">${escapeHtml(room.name)}</div>
          <div class="hue-room-status">${escapeHtml(status)}</div>
        </div>
        <div class="hue-room-end">
          <div class="hue-indicator-dot" data-on="${isOn}"></div>
          <div class="hue-chevron">›</div>
        </div>
      </div>
    `;
  }

  _getRoomEntities(room) {
    const entities = [];
    if (room.entities) entities.push(...room.entities);
    if (room.lights) entities.push(...room.lights);
    return entities;
  }

  _getRoomStatus(room) {
    if (!this._hass) return '';

    const parts = [];

    // Count lights on
    if (room.lights && room.lights.length > 0) {
      const lightsOn = countOn(this._hass, room.lights);
      if (lightsOn > 0) {
        parts.push(`${lightsOn} light${lightsOn > 1 ? 's' : ''} on`);
      }
    }

    // Climate status
    const climateEntities = room.climate
      ? Array.isArray(room.climate)
        ? room.climate
        : [room.climate]
      : [];
    if (climateEntities.length > 0) {
      const climateState = this._hass.states[climateEntities[0]];
      if (climateState && climateState.attributes.current_temperature) {
        parts.push(`${climateState.attributes.current_temperature}°`);
      }
    }

    // Temperature sensor
    if (room.temperature_sensor) {
      const tempState = this._hass.states[room.temperature_sensor];
      if (tempState && tempState.state !== 'unavailable') {
        parts.push(`${tempState.state}°`);
      }
    }

    return parts.join(' · ') || 'All off';
  }

  _handleEvent(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const { action, room } = target.dataset;

    if (action === 'navigate' && room != null) {
      this._navigateToRoom(parseInt(room, 10));
    }
  }

  _navigateToRoom(roomIndex) {
    const room = this._config.rooms[roomIndex];
    if (!room) return;

    // Get the navigation path from config or generate one
    const path = room.path || `/lovelace-hue/room-${roomIndex}`;

    // Navigate using Home Assistant's routing
    history.pushState(null, '', path);
    window.dispatchEvent(new Event('location-changed'));
  }

  static getConfigElement() {
    return document.createElement('hue-home-dashboard-editor');
  }

  static getStubConfig() {
    return {
      title: 'Home',
      rooms: [
        {
          name: 'Living Room',
          icon: '🛋️',
          lights: [],
          climate: null,
          path: '/lovelace/living-room',
        },
      ],
    };
  }
}

customElements.define('hue-home-dashboard', HueHomeDashboard);

export { HueHomeDashboard };
