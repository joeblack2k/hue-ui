/**
 * Media Player Widget - iOS 6 Skeuomorphic Row Style
 * Shows what's playing, play/pause button, volume slider 0-100% with 2% steps
 */

import { escapeHtml } from '../ui/helpers2.js';

/**
 * Render the media section with media players as rows
 * @param {object} hass - Home Assistant instance
 * @param {object} config - { media_players: string[] }
 * @returns {string} HTML string
 */
export function renderMediaWidget(hass, config) {
  const { media_players = [] } = config;
  if (media_players.length === 0) return '';

  return `
    <div class="hue-section">
      <div class="hue-section-header">
        <span class="hue-section-title">MEDIA</span>
      </div>
      ${media_players.map(entityId => renderMediaRow(hass, entityId)).join('')}
    </div>
  `;
}

/**
 * Render a single media player as a row
 */
function renderMediaRow(hass, entityId) {
  const state = hass?.states[entityId];
  if (!state) return '';

  const name = state.attributes.friendly_name || entityId.split('.')[1];
  const playerState = state.state; // playing, paused, idle, off, unavailable
  const isPlaying = playerState === 'playing';
  const isPaused = playerState === 'paused';
  const isActive = isPlaying || isPaused;

  const mediaTitle = state.attributes.media_title || '';
  const mediaArtist = state.attributes.media_artist || '';
  const volume = state.attributes.volume_level != null ? Math.round(state.attributes.volume_level * 100) : 50;
  const icon = state.attributes.icon || 'mdi:speaker';

  const iconColor = isActive ? 'var(--hue-gold)' : 'var(--hue-text-muted)';
  const iconGlow = isActive ? 'filter: drop-shadow(0 0 8px var(--hue-gold));' : '';

  // Get status text
  const getStatusText = () => {
    if (isPlaying && mediaTitle) return `${mediaTitle}${mediaArtist ? ' - ' + mediaArtist : ''}`;
    if (isPaused && mediaTitle) return `${mediaTitle}${mediaArtist ? ' - ' + mediaArtist : ''} (Paused)`;
    if (isPlaying) return 'Playing';
    if (isPaused) return 'Paused';
    if (playerState === 'idle') return 'Idle';
    return 'Off';
  };

  return `
    <div class="hue-row" data-entity="${escapeHtml(entityId)}">
      <div class="hue-row-icon" style="color: ${iconColor}; ${iconGlow}">
        <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      </div>
      <div class="hue-row-content" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; min-width: 0;">
            <div class="hue-row-title">${escapeHtml(name)}</div>
            <div class="hue-row-subtitle" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(getStatusText())}</div>
          </div>
          <!-- Play/Pause Button -->
          <button
            class="hue-btn hue-btn-icon"
            data-action="media_play_pause"
            data-entity="${escapeHtml(entityId)}"
            style="${isPlaying ? 'background: var(--hue-gold-gradient); color: #1a1a1a;' : ''}"
          >${isPlaying ? '❚❚' : '▶'}</button>
        </div>

        <!-- Volume Slider -->
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <span style="font-size: 12px; color: var(--hue-text-muted);">🔈</span>
          <input
            type="range"
            class="hue-slider"
            min="0"
            max="100"
            step="2"
            value="${volume}"
            data-action="set_volume"
            data-entity="${escapeHtml(entityId)}"
            style="flex: 1;"
          />
          <span style="font-size: 11px; color: var(--hue-text-muted); min-width: 32px; text-align: right;">${volume}%</span>
        </div>
      </div>
    </div>
  `;
}

export default { render: renderMediaWidget };
