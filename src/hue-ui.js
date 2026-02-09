/**
 * Hue UI - Philips Hue-style Home Assistant Dashboard
 * Config-driven architecture with restored "perfect" home look
 *
 * Cards:
 * - hue-home-screen: Weather + room tiles grid (restored Hue look)
 * - hue-room-screen: Config-driven room with sections (lighting, climate, devices)
 *
 * @version 3.1.78
 */

console.info(
  '%c HUE-UI %c v3.1.78 %c Config-Driven ',
  'color: #fff; background: #c9a227; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
  'color: #c9a227; background: #3a2a1a; font-weight: bold; padding: 2px 4px;',
  'color: #3a2a1a; background: #f0c75e; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);

const HUE_UI_KIOSK_STYLE_ID = 'hue-ui-kiosk-style';
let _kioskRetryTimer = null;
let _kioskObserver = null;
let _kioskHostRoot = null;

function isHueUiPath(pathname) {
  const p = String(pathname || window.location?.pathname || '');
  // Matches /hue-ui and /hue-ui/... and also /lovelace/hue-ui style routes.
  return p === '/hue-ui' || p.startsWith('/hue-ui/') || p.includes('/hue-ui');
}

function _getHuiRootShadow() {
  // HA structure: home-assistant (shadow) -> home-assistant-main (shadow) -> ha-panel-lovelace (shadow) -> hui-root (shadow)
  const ha = document.querySelector('home-assistant');
  const main = ha?.shadowRoot?.querySelector('home-assistant-main');
  const panel = main?.shadowRoot?.querySelector('ha-panel-lovelace');
  const huiRoot = panel?.shadowRoot?.querySelector('hui-root');
  return huiRoot?.shadowRoot || null;
}

function _injectKioskStyleInto(rootShadow) {
  if (!rootShadow || typeof rootShadow.appendChild !== 'function') return false;
  if (rootShadow.getElementById?.(HUE_UI_KIOSK_STYLE_ID)) return true;

  const style = document.createElement('style');
  style.id = HUE_UI_KIOSK_STYLE_ID;
  style.textContent = `
    /* Hue UI kiosk: hide top header/tabs only inside Lovelace (shadow-root local) */
    app-header,
    app-toolbar,
    ha-tabs,
    ha-tab-bar {
      display: none !important;
    }

    :host {
      --header-height: 0px !important;
    }
  `;
  rootShadow.appendChild(style);
  return true;
}

function _removeKioskStyle() {
  try {
    const root = _kioskHostRoot || _getHuiRootShadow();
    const el = root?.getElementById?.(HUE_UI_KIOSK_STYLE_ID);
    el?.remove?.();
  } catch (_e) {
    // ignore
  }
  _kioskHostRoot = null;
  if (_kioskObserver) {
    try { _kioskObserver.disconnect(); } catch (_e) { /* ignore */ }
    _kioskObserver = null;
  }
  if (_kioskRetryTimer) {
    clearTimeout(_kioskRetryTimer);
    _kioskRetryTimer = null;
  }
}

function _scheduleKioskRetry() {
  if (_kioskRetryTimer) return;
  _kioskRetryTimer = setTimeout(() => {
    _kioskRetryTimer = null;
    syncHueUiKiosk();
  }, 200);
}

function syncHueUiKiosk() {
  const active = isHueUiPath(window.location?.pathname);
  if (!active) {
    _removeKioskStyle();
    return;
  }

  const targetShadow = _getHuiRootShadow();
  if (!targetShadow) {
    _scheduleKioskRetry();
    return;
  }

  _kioskHostRoot = targetShadow;
  const ok = _injectKioskStyleInto(targetShadow);
  if (!ok) {
    _scheduleKioskRetry();
    return;
  }

  // Watch for HA re-rendering/replacing hui-root (iOS/Safari can be slow/lazy).
  if (!_kioskObserver) {
    _kioskObserver = new MutationObserver(() => {
      if (!isHueUiPath(window.location?.pathname)) return;
      const shadow = _getHuiRootShadow();
      if (!shadow) return;
      _kioskHostRoot = shadow;
      _injectKioskStyleInto(shadow);
    });
    try {
      _kioskObserver.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_e) {
      // ignore
    }
  }
}

try {
  syncHueUiKiosk();
  window.addEventListener('location-changed', syncHueUiKiosk);
  window.addEventListener('popstate', syncHueUiKiosk);
} catch (_e) {
  // ignore
}

window.customCards = window.customCards || [];

window.customCards.push({
  type: 'hue-home-screen',
  name: 'Hue Home Screen',
  description: 'Philips Hue-style weather + room tiles dashboard',
  preview: true,
});

window.customCards.push({
  type: 'hue-room-screen',
  name: 'Hue Room Screen',
  description: 'Config-driven room with lighting, climate, and devices',
  preview: true,
});

class HueUiFallbackCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._message = 'This card failed to load.';
  }

  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    const escapeHtml = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div style="padding: 16px; color: var(--error-color, #f44336); font-weight: 700;">
          <div>Hue UI kon deze kaart niet laden.</div>
          <pre style="margin:10px 0 0 0; white-space: pre-wrap; word-break: break-word; color: rgba(255,255,255,0.92); font-weight: 600; font-size: 12px; line-height: 1.4;">${escapeHtml(this._message)}</pre>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 2;
  }
}

function defineFallback(tag, message) {
  if (customElements.get(tag)) return;
  class FallbackCard extends HueUiFallbackCard {
    constructor() {
      super();
      this._message = message;
    }
  }
  customElements.define(tag, FallbackCard);
}

async function loadCardModule(tag, modulePath, fallbackMessage) {
  try {
    await import(modulePath);
    if (!customElements.get(tag)) {
      defineFallback(tag, fallbackMessage);
      console.error(`[HUE-UI] ${tag} module loaded but did not register custom element.`);
    }
  } catch (error) {
    const msg = `${fallbackMessage}\n\nModule: ${modulePath}\nError: ${String(error?.message || error)}`;
    defineFallback(tag, msg);
    console.error(`[HUE-UI] Failed to load ${tag} from ${modulePath}`, error);
  }
}

// Important: we top-level await the imports so Lovelace won't try to render
// cards before the custom elements are registered (avoids "Configuration Error").
await loadCardModule(
  'hue-home-screen',
  './app/hue-home-screen3.js?v=3.1.78',
  'Hue Home Screen failed to load. Check resource imports in console.'
);

await loadCardModule(
  'hue-room-screen',
  './app/hue-room-screen3.js?v=3.1.78',
  'Hue Room Screen failed to load. Check resource imports in console.'
);
