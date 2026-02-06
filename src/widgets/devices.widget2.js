/**
 * Devices Widget - Content Only
 * Renders device tiles (switches + media players)
 */

import { escapeHtml, isEntityOn, getEntityIcon } from '../ui/helpers2.js';

/**
 * Render devices content
 * @param {object} hass - Home Assistant instance
 * @param {object} section - Section config with switches, media_players, power_map
 * @returns {string} HTML string
 */
export function renderDevicesContent(hass, section) {
  const switches = section.switches || [];
  const mediaPlayers = section.media_players || [];
  const powerMap = section.power_map || {};

  let html = '';

  switches.forEach((item) => {
    html += renderSwitchTile(hass, item, powerMap);
  });

  mediaPlayers.forEach((item) => {
    html += renderMediaTile(hass, item);
  });

  return html;
}

export function renderMediaPlayersContent(hass, section) {
  const players = [];
  if (Array.isArray(section.players)) players.push(...section.players);
  if (Array.isArray(section.media_players)) players.push(...section.media_players);
  if (Array.isArray(section.tv_players)) players.push(...section.tv_players);
  return players.map((item) => renderMediaTile(hass, item)).join('');
}

function renderSwitchTile(hass, item, powerMap) {
  const entityId = item.entity;
  const state = hass?.states?.[entityId];

  const name = item.name || state?.attributes?.friendly_name || entityId.split('.')[1];
  const isOn = state ? isEntityOn(hass, entityId) : false;
  const icon = item.icon || (state ? getEntityIcon(hass, entityId) : 'mdi:power');

  let subtitle = state ? (isOn ? 'On' : 'Off') : 'Unavailable';
  const powerSensor = powerMap[entityId];
  if (powerSensor) {
    const powerState = hass?.states?.[powerSensor];
    if (powerState && powerState.state !== 'unavailable') {
      const unit = powerState.attributes?.unit_of_measurement || 'W';
      subtitle = `${powerState.state} ${unit}`;
    }
  }

  const powerAttr = powerSensor ? `data-power-entity="${escapeHtml(powerSensor)}"` : '';

  return `
    <div class="hue-tile hue-device-tile ${isOn ? 'is-on' : ''}" data-action="more_info" data-entity="${escapeHtml(entityId)}" ${powerAttr}>
      <div class="hue-tile-icon">
        <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
      </div>
      <div class="hue-tile-name">${escapeHtml(name)}</div>
      <div class="hue-tile-subtitle">${escapeHtml(subtitle)}</div>
      <div class="hue-tile-footer">
        <button class="hue-toggle hue-toggle-sm" data-on="${isOn}" data-action="toggle" data-entity="${escapeHtml(entityId)}"></button>
      </div>
    </div>
  `;
}

function renderMediaTile(hass, item) {
  const entityId = item.entity;
  const state = hass?.states?.[entityId];

  const name = item.name || state?.attributes?.friendly_name || entityId.split('.')[1];
  const isAppleTV = isAppleTvEntity(entityId, name, state);
  const playerState = state?.state || 'off';
  const isPlaying = playerState === 'playing';
  const isPaused = playerState === 'paused';
  const isActive = isPlaying || isPaused;
  const icon = item.icon || state?.attributes?.icon || 'mdi:speaker';

  const mediaTitle = state?.attributes?.media_title || '';
  const mediaArtist = state?.attributes?.media_artist || '';
  const source = state?.attributes?.source || '';
  const sourceLower = String(source).toLowerCase();
  const isTvSource = sourceLower.includes('tv') || sourceLower.includes('hdmi');
  const volumePercent = Math.max(0, Math.min(100, Math.round(((state?.attributes?.volume_level || 0) * 100) / 2) * 2));
  const mediaDuration = Number(state?.attributes?.media_duration);
  const mediaPosition = Number(state?.attributes?.media_position);
  const canShowProgress = isPlaying && Number.isFinite(mediaDuration) && mediaDuration > 0 && Number.isFinite(mediaPosition) && mediaPosition >= 0;
  const progressPercent = canShowProgress
    ? Math.max(0, Math.min(100, Math.round((mediaPosition / mediaDuration) * 100)))
    : 0;
  const isWide = item.wide !== false;
  const showPrimary = item.show_primary !== false;
  // Apple TV volume is often managed by the TV/receiver; prefer progress slider instead.
  const showVolume = item.show_volume !== false && !isAppleTV;

  let subtitle = state ? 'Off' : 'Unavailable';
  if (isPlaying && mediaTitle) subtitle = `${mediaTitle}${mediaArtist ? ' - ' + mediaArtist : ''}`;
  else if (isPaused && mediaTitle) subtitle = `${mediaTitle} (Paused)`;
  else if (source) subtitle = `Source: ${source}`;
  else if (isPlaying) subtitle = 'Playing';
  else if (isPaused) subtitle = 'Paused';
  else if (playerState === 'idle') subtitle = 'Idle';

  const requestedSources = Array.isArray(item.sources) ? item.sources : [];
  const sourceList = Array.isArray(state?.attributes?.source_list) ? state.attributes.source_list : [];
  const wantsAllSources = requestedSources.some((v) => String(v || '').trim() === '*');
  const sourceOptions = buildSourceOptions({
    requestedSources,
    sourceList,
    wantsAllSources,
    isAppleTV,
  });
  const sourceDropdown = sourceOptions.length > 0
    ? `
      <select class="hue-media-source" data-entity="${escapeHtml(entityId)}">
        ${sourceOptions.map((option) => `
          <option value="${escapeHtml(option.value)}" ${option.value === source ? 'selected' : ''}>${escapeHtml(option.label)}</option>
        `).join('')}
      </select>
    `
    : '';
  const primaryButton = showPrimary
    ? `
      <button class="hue-media-primary" data-action="media_primary" data-entity="${escapeHtml(entityId)}" title="${isTvSource ? 'Mute or unmute' : 'Play or pause'}">
        <ha-icon icon="${isTvSource ? (state?.attributes?.is_volume_muted ? 'mdi:volume-off' : 'mdi:volume-high') : (isPlaying ? 'mdi:pause' : 'mdi:play')}"></ha-icon>
        <span class="hue-media-primary-label">${isTvSource ? (state?.attributes?.is_volume_muted ? 'Unmute' : 'Mute') : (isPlaying ? 'Pause' : 'Play')}</span>
      </button>
    `
    : '';
  const volumeControls = showVolume
    ? `
      <div class="hue-media-controls">
        <input type="range" min="0" max="100" step="2" value="${volumePercent}" class="hue-media-volume" data-entity="${escapeHtml(entityId)}" />
        <div class="hue-media-volume-value">${volumePercent}%</div>
      </div>
    `
    : '';
  // Always render the progress slider so it can become visible later without a full re-render.
  const progressControls = `
      <div class="hue-media-progress-wrap ${canShowProgress ? '' : 'is-hidden'}">
        <input type="range" min="0" max="100" step="1" value="${progressPercent}" class="hue-media-progress" data-entity="${escapeHtml(entityId)}" data-last-step="${progressPercent}" />
        <div class="hue-media-progress-value">${progressPercent}%</div>
      </div>
    `;

  return `
    <div class="hue-tile hue-device-tile hue-media-tile ${isActive ? 'is-on' : ''} ${isWide ? 'is-wide' : ''}" data-action="more_info" data-entity="${escapeHtml(entityId)}">
      <div class="hue-media-header">
        <div class="hue-tile-icon">
          <ha-icon icon="${escapeHtml(icon)}"></ha-icon>
        </div>
        ${primaryButton}
      </div>
      <div class="hue-tile-name">${escapeHtml(name)}</div>
      <div class="hue-tile-subtitle hue-media-now">${escapeHtml(subtitle)}</div>
      ${progressControls}
      ${volumeControls}
      ${sourceDropdown}
    </div>
  `;
}

function normalizeSource(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function isAppleTvEntity(entityId, name, state) {
  const entityLower = String(entityId || '').toLowerCase();
  if (entityLower.includes('appletv') || entityLower.includes('apple_tv')) return true;

  const friendly = String(state?.attributes?.friendly_name || name || '').toLowerCase();
  return friendly.includes('apple tv') || friendly.includes('appletv');
}

function uniqueNonEmptyStrings(values) {
  const seen = new Set();
  const out = [];
  (Array.isArray(values) ? values : []).forEach((v) => {
    const s = String(v || '').trim();
    if (!s) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  });
  return out;
}

function buildSourceOptions({ requestedSources, sourceList, wantsAllSources, isAppleTV }) {
  const list = uniqueNonEmptyStrings(sourceList);
  if (list.length === 0) return [];

  // Explicit wildcard: show everything from HA (works well for Apple TV apps too).
  if (wantsAllSources) {
    return list.map((s) => ({ value: s, label: s }));
  }

  // Explicit allow-list from config.
  if (Array.isArray(requestedSources) && requestedSources.length > 0) {
    return uniqueNonEmptyStrings(requestedSources).map((requested) => {
      const match = list.find((candidate) => normalizeSource(candidate) === normalizeSource(requested));
      return { value: match || requested, label: requested };
    });
  }

  // Apple TV: by default show apps (its "inputs" are the source_list).
  if (isAppleTV) {
    return list.map((s) => ({ value: s, label: s }));
  }

  return [];
}

export default { renderDevicesContent, renderMediaPlayersContent };
