/**
 * Hue UI - Philips Hue-style Home Assistant Dashboard
 * Config-driven architecture with restored "perfect" home look
 *
 * Cards:
 * - hue-home-screen: Weather + room tiles grid (restored Hue look)
 * - hue-room-screen: Config-driven room with sections (lighting, climate, devices)
 *
 * @version 3.1.75
 */

console.info(
  '%c HUE-UI %c v3.1.75 %c Config-Driven ',
  'color: #fff; background: #c9a227; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
  'color: #c9a227; background: #3a2a1a; font-weight: bold; padding: 2px 4px;',
  'color: #3a2a1a; background: #f0c75e; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);

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
  './app/hue-home-screen3.js?v=3.1.75',
  'Hue Home Screen failed to load. Check resource imports in console.'
);

await loadCardModule(
  'hue-room-screen',
  './app/hue-room-screen3.js?v=3.1.75',
  'Hue Room Screen failed to load. Check resource imports in console.'
);
