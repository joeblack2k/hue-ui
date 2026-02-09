/**
 * Config Loader - Fetches and caches room configuration JSON files
 */

const configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ROOM_OVERRIDE_PREFIX = 'hue-ui-room-config-override:';
const ROOMS_INDEX_LOCAL_URL = '/local/hue-ui/config/rooms.index.local.json';
const ROOMS_INDEX_URL = '/local/hue-ui/config/rooms.index.json';
const ROOMS_INDEX_OVERRIDE_KEY = 'hue-ui-rooms-index-override';

/**
 * Fetch the global rooms index
 * @returns {Promise<object>} rooms.index.json content
 */
export async function loadRoomsIndex() {
  const override = getRoomsIndexOverride();
  if (override) return override;
  try {
    // Prefer local (non-versioned) config if present.
    return await fetchWithCache(ROOMS_INDEX_LOCAL_URL);
  } catch (error) {
    // Only fall back if the local file isn't present.
    if (String(error?.message || '').includes(' 404')) {
      return fetchWithCache(ROOMS_INDEX_URL);
    }
    throw error;
  }
}

/**
 * Fetch a specific room configuration
 * @param {string} roomFile - path to room JSON file
 * @returns {Promise<object>} room config
 */
export async function loadRoomConfig(roomFile) {
  const override = getRoomConfigOverride(roomFile);
  if (override) return override;
  return fetchWithCache(roomFile);
}

/**
 * Fetch JSON with caching
 */
async function fetchWithCache(url) {
  const cached = configCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Add cache buster to prevent browser caching stale JSON
    const cacheBuster = `${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
    const response = await fetch(url + cacheBuster);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const data = await response.json();
    configCache.set(url, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('[Config Loader]', error);
    // Return cached data even if expired, as fallback
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

/**
 * Clear the config cache (useful after config edits)
 */
export function clearConfigCache() {
  configCache.clear();
}

export function getRoomsIndexOverride() {
  const storage = safeLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(ROOMS_INDEX_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate: must be object with non-empty rooms array
    if (!parsed || typeof parsed !== 'object') {
      console.warn('[Config Loader] Rooms index override is not an object, clearing.');
      storage.removeItem(ROOMS_INDEX_OVERRIDE_KEY);
      return null;
    }
    if (!Array.isArray(parsed.rooms) || parsed.rooms.length === 0) {
      console.warn('[Config Loader] Rooms index override has no rooms, clearing.');
      storage.removeItem(ROOMS_INDEX_OVERRIDE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[Config Loader] Failed to parse rooms index override, clearing:', error);
    try { storage.removeItem(ROOMS_INDEX_OVERRIDE_KEY); } catch (_) { /* ignore */ }
    return null;
  }
}

export function saveRoomsIndexOverride(index) {
  if (!index || typeof index !== 'object') return false;
  const storage = safeLocalStorage();
  if (!storage) return false;
  try {
    storage.setItem(ROOMS_INDEX_OVERRIDE_KEY, JSON.stringify(index));
    configCache.set(ROOMS_INDEX_URL, { data: index, timestamp: Date.now() });
    return true;
  } catch (error) {
    console.warn('[Config Loader] Failed to save rooms index override:', error);
    return false;
  }
}

export function clearRoomsIndexOverride() {
  const storage = safeLocalStorage();
  if (!storage) return false;
  try {
    storage.removeItem(ROOMS_INDEX_OVERRIDE_KEY);
    configCache.delete(ROOMS_INDEX_URL);
    return true;
  } catch (error) {
    console.warn('[Config Loader] Failed to clear rooms index override:', error);
    return false;
  }
}

function getOverrideStorageKey(roomFile) {
  return `${ROOM_OVERRIDE_PREFIX}${roomFile}`;
}

function safeLocalStorage() {
  try {
    return window?.localStorage || null;
  } catch (_error) {
    return null;
  }
}

export function getRoomConfigOverride(roomFile) {
  if (!roomFile) return null;
  const storage = safeLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(getOverrideStorageKey(roomFile));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Config Loader] Failed to parse room override:', error);
    return null;
  }
}

export function saveRoomConfigOverride(roomFile, config) {
  if (!roomFile || !config || typeof config !== 'object') return false;
  const storage = safeLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(getOverrideStorageKey(roomFile), JSON.stringify(config));
    configCache.set(roomFile, { data: config, timestamp: Date.now() });
    return true;
  } catch (error) {
    console.warn('[Config Loader] Failed to save room override:', error);
    return false;
  }
}

export function clearRoomConfigOverride(roomFile) {
  if (!roomFile) return false;
  const storage = safeLocalStorage();
  if (!storage) return false;
  try {
    storage.removeItem(getOverrideStorageKey(roomFile));
    configCache.delete(roomFile);
    return true;
  } catch (error) {
    console.warn('[Config Loader] Failed to clear room override:', error);
    return false;
  }
}

/**
 * Get room by ID from the index
 * @param {object} index - rooms index object
 * @param {string} roomId - room ID
 * @returns {object|null} room entry or null
 */
export function getRoomFromIndex(index, roomId) {
  return index.rooms?.find(r => r.id === roomId) || null;
}

/**
 * Load a language file and return a key-value translations object.
 * Language file format: one key=value per line, # comments, blank lines ignored.
 * @param {string} languageFile - URL path to the language file
 * @returns {Promise<object>} translations map
 */
let _langCache = null;
let _langCacheUrl = null;

export async function loadLanguageFile(languageFile) {
  if (!languageFile || typeof languageFile !== 'string') return {};
  if (_langCacheUrl === languageFile && _langCache) return _langCache;

  try {
    const cacheBuster = `${languageFile.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
    const response = await fetch(languageFile + cacheBuster);
    if (!response.ok) {
      console.warn('[Config Loader] Failed to load language file:', response.status);
      return {};
    }
    const text = await response.text();
    const translations = {};
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex < 1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) translations[key] = value;
    }
    _langCache = translations;
    _langCacheUrl = languageFile;
    return translations;
  } catch (error) {
    console.warn('[Config Loader] Error loading language file:', error);
    return {};
  }
}

export default {
  loadRoomsIndex,
  loadRoomConfig,
  clearConfigCache,
  getRoomsIndexOverride,
  saveRoomsIndexOverride,
  clearRoomsIndexOverride,
  getRoomConfigOverride,
  saveRoomConfigOverride,
  clearRoomConfigOverride,
  getRoomFromIndex,
  loadLanguageFile,
};
