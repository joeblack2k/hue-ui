/**
 * Hue UI Helper Functions
 * Utility functions for entity formatting and escaping
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format brightness as percentage (0-100)
 * @param {number} brightness - Brightness value (0-255)
 * @returns {string} Formatted percentage
 */
export function formatBrightness(brightness) {
  if (brightness == null) return '';
  const percent = Math.round((brightness / 255) * 100);
  return `${percent}%`;
}

/**
 * Format temperature with unit
 * @param {number} temp - Temperature value
 * @param {string} unit - Unit ('°C' or '°F')
 * @returns {string} Formatted temperature
 */
export function formatTemperature(temp, unit = '°C') {
  if (temp == null) return '';
  return `${Math.round(temp * 10) / 10}${unit}`;
}

/**
 * Format humidity as percentage
 * @param {number} humidity - Humidity value
 * @returns {string} Formatted humidity
 */
export function formatHumidity(humidity) {
  if (humidity == null) return '';
  return `${Math.round(humidity)}%`;
}

/**
 * Get entity state object from hass
 * @param {object} hass - Home Assistant instance
 * @param {string} entityId - Entity ID
 * @returns {object|null} Entity state object or null
 */
export function getEntityState(hass, entityId) {
  if (!hass || !hass.states || !entityId) return null;
  return hass.states[entityId] || null;
}

/**
 * Check if entity is on
 * @param {object} hass - Home Assistant instance
 * @param {string} entityId - Entity ID
 * @returns {boolean} True if entity is on
 */
export function isEntityOn(hass, entityId) {
  const state = getEntityState(hass, entityId);
  if (!state) return false;
  return ['on', 'playing', 'home', 'open', 'unlocked'].includes(state.state.toLowerCase());
}

/**
 * Check if entity is available
 * @param {object} hass - Home Assistant instance
 * @param {string} entityId - Entity ID
 * @returns {boolean} True if entity is available
 */
export function isEntityAvailable(hass, entityId) {
  const state = getEntityState(hass, entityId);
  if (!state) return false;
  return state.state !== 'unavailable' && state.state !== 'unknown';
}

/**
 * Get friendly name from entity
 * @param {object} hass - Home Assistant instance
 * @param {string} entityId - Entity ID
 * @returns {string} Friendly name or entity ID
 */
export function getFriendlyName(hass, entityId) {
  const state = getEntityState(hass, entityId);
  if (!state) return entityId;
  return state.attributes.friendly_name || entityId;
}

/**
 * Get light color as CSS color string
 * @param {object} state - Light entity state
 * @returns {string} CSS color string
 */
export function getLightColor(state) {
  if (!state || state.state !== 'on') return 'var(--hue-text-muted)';

  const attrs = state.attributes;

  // RGB color
  if (attrs.rgb_color) {
    const [r, g, b] = attrs.rgb_color;
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Color temperature
  if (attrs.color_temp_kelvin) {
    return kelvinToRgb(attrs.color_temp_kelvin);
  }

  if (attrs.color_temp) {
    // Convert mireds to kelvin
    const kelvin = Math.round(1000000 / attrs.color_temp);
    return kelvinToRgb(kelvin);
  }

  // Default warm white
  return 'var(--hue-light-warm)';
}

/**
 * Convert color temperature (Kelvin) to RGB
 * @param {number} kelvin - Color temperature in Kelvin
 * @returns {string} CSS rgb color string
 */
function kelvinToRgb(kelvin) {
  const temp = kelvin / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Get icon for entity based on domain and state
 * @param {object} hass - Home Assistant instance
 * @param {string} entityId - Entity ID
 * @returns {string} Material Design icon name
 */
export function getEntityIcon(hass, entityId) {
  const state = getEntityState(hass, entityId);
  if (!state) return 'mdi:help-circle';

  // Use custom icon if set
  if (state.attributes.icon) {
    return state.attributes.icon;
  }

  const domain = entityId.split('.')[0];
  const isOn = isEntityOn(hass, entityId);

  const icons = {
    light: isOn ? 'mdi:lightbulb' : 'mdi:lightbulb-outline',
    switch: isOn ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off',
    climate: 'mdi:thermostat',
    fan: isOn ? 'mdi:fan' : 'mdi:fan-off',
    media_player: isOn ? 'mdi:cast-connected' : 'mdi:cast',
    sensor: 'mdi:eye',
    binary_sensor: 'mdi:checkbox-blank-circle',
    cover: 'mdi:window-shutter',
    lock: state.state === 'locked' ? 'mdi:lock' : 'mdi:lock-open',
    camera: 'mdi:video',
    vacuum: 'mdi:robot-vacuum',
    input_boolean: isOn ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off',
    scene: 'mdi:palette',
    script: 'mdi:script-text',
    automation: 'mdi:robot',
    person: 'mdi:account',
    device_tracker: 'mdi:crosshairs-gps',
    weather: 'mdi:weather-partly-cloudy',
    sun: 'mdi:white-balance-sunny',
  };

  return icons[domain] || 'mdi:help-circle';
}

/**
 * Get room icon based on room name
 * @param {string} roomName - Room name
 * @returns {string} Emoji or icon
 */
export function getRoomIcon(roomName) {
  const lower = (roomName || '').toLowerCase();

  const icons = {
    living: '🛋️',
    lounge: '🛋️',
    bedroom: '🛏️',
    kitchen: '🍳',
    bathroom: '🚿',
    office: '💼',
    study: '📚',
    garage: '🚗',
    garden: '🌿',
    outdoor: '🌳',
    patio: '☀️',
    dining: '🍽️',
    hallway: '🚪',
    entry: '🚪',
    basement: '🏚️',
    attic: '📦',
    laundry: '🧺',
    nursery: '👶',
    kids: '🧸',
    guest: '🛎️',
    media: '📺',
    gym: '💪',
    pool: '🏊',
    spa: '♨️',
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (lower.includes(key)) return icon;
  }

  return '🏠';
}

/**
 * Format HVAC mode for display
 * @param {string} mode - HVAC mode
 * @returns {string} Formatted mode
 */
export function formatHvacMode(mode) {
  const modes = {
    off: 'Off',
    heat: 'Heat',
    cool: 'Cool',
    heat_cool: 'Auto',
    auto: 'Auto',
    dry: 'Dry',
    fan_only: 'Fan',
  };
  return modes[mode] || mode;
}

/**
 * Get HVAC action color
 * @param {string} action - HVAC action
 * @returns {string} CSS color variable
 */
export function getHvacActionColor(action) {
  const colors = {
    heating: 'var(--hue-temp-heating)',
    cooling: 'var(--hue-temp-cooling)',
    idle: 'var(--hue-temp-idle)',
    off: 'var(--hue-text-muted)',
  };
  return colors[action] || 'var(--hue-text-muted)';
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Translate weather condition to Dutch
 * @param {string} condition - Weather condition
 * @returns {string} Translated condition
 */
export function translateCondition(condition) {
  const translations = {
    'clear-night': 'Helder',
    'cloudy': 'Bewolkt',
    'partlycloudy': 'Half bewolkt',
    'fog': 'Mist',
    'rainy': 'Regen',
    'snowy': 'Sneeuw',
    'sunny': 'Zonnig',
    'lightning': 'Onweer',
    'lightning-rainy': 'Onweer met regen',
    'windy': 'Winderig',
    'hail': 'Hagel',
    'pouring': 'Stortbui',
    'exceptional': 'Uitzonderlijk',
  };
  return translations[condition] || condition;
}

/**
 * Get weather emoji for condition
 * @param {string} condition - Weather condition
 * @returns {string} Weather emoji
 */
export function getWeatherEmoji(condition) {
  const emojis = {
    'clear-night': '🌙',
    'cloudy': '☁️',
    'partlycloudy': '⛅',
    'fog': '🌫️',
    'rainy': '🌧️',
    'snowy': '❄️',
    'sunny': '☀️',
    'lightning': '⚡',
    'lightning-rainy': '⛈️',
    'windy': '💨',
    'hail': '🌨️',
    'pouring': '🌧️',
    'exceptional': '⚠️',
  };
  return emojis[condition] || '☁️';
}

/**
 * Translation store — populated by loadLanguageFile() in config-loader3.js
 */
let _translations = {};

/**
 * Set the translations dictionary
 * @param {object} translations - key-value translation map
 */
export function setTranslations(translations) {
  _translations = translations && typeof translations === 'object' ? translations : {};
}

/**
 * Translate a key using the loaded language file
 * @param {string} key - translation key
 * @param {string} fallback - fallback value if key not found
 * @returns {string} translated string or fallback
 */
export function t(key, fallback) {
  if (_translations[key] !== undefined) return _translations[key];
  return fallback !== undefined ? fallback : key;
}

/**
 * Get temperature LED color based on temperature value
 * @param {number} temp - Temperature in Celsius
 * @returns {string} LED color class (red, orange, blue, unknown)
 */
export function getTemperatureLEDColor(temp) {
  if (temp === null || temp === undefined || isNaN(temp)) return 'unknown';
  if (temp >= 25) return 'red';      // Hot
  if (temp >= 19) return 'orange';   // Comfortable
  if (temp >= 5) return 'blue';      // Cold
  return 'unknown';
}
