/**
 * Hue UI - Philips Hue-style Home Assistant Dashboard
 * Config-driven architecture with restored "perfect" home look
 *
 * Cards:
 * - hue-home-screen: Weather + room tiles grid (restored Hue look)
 * - hue-room-screen: Config-driven room with sections (lighting, climate, devices)
 *
 * @version 3.1.83
 */

console.info(
  '%c HUE-UI %c v3.1.83 %c Config-Driven ',
  'color: #fff; background: #c9a227; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
  'color: #c9a227; background: #3a2a1a; font-weight: bold; padding: 2px 4px;',
  'color: #3a2a1a; background: #f0c75e; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);

/**
 * Kiosk Mode — hide HA header/tabs/sidebar when on the Hue UI dashboard.
 *
 * HA DOM structure (2024-2026):
 *   document
 *     └─ home-assistant  (shadowRoot)
 *          └─ home-assistant-main  (shadowRoot)
 *               ├─ ha-drawer            ← sidebar lives here
 *               └─ ha-panel-lovelace  (shadowRoot)
 *                    └─ hui-root  (shadowRoot)
 *                         ├─ app-header / .header  ← toolbar + tabs
 *                         └─ div#view              ← the cards
 *
 * The tab-bar that's visible in the screenshot sits inside hui-root's
 * shadow root (as part of app-header or as a direct child).
 * We must inject CSS into THAT shadow root AND use the right selectors
 * that cover every HA version variant.
 *
 * Additionally we hide the sidebar drawer at the ha-main level and
 * force --header-height to 0 so the content area fills the screen.
 */
const HUE_UI_KIOSK_STYLE_ID = 'hue-ui-kiosk-style';
const HUE_UI_KIOSK_MAX_RETRIES = 40;    // 40 × 150ms = 6s max wait
const HUE_UI_KIOSK_RETRY_MS = 150;
let _kioskRetryTimer = null;
let _kioskRetryCount = 0;
let _kioskInjectedRoots = [];            // track all roots we injected into
let _kioskObservers = [];                // MutationObservers on shadow roots

function isHueUiPath(pathname) {
  const p = String(pathname || window.location?.pathname || '');
  return p === '/hue-ui' || p.startsWith('/hue-ui/') || p.includes('/hue-ui');
}

/**
 * Walk the HA shadow DOM and return all shadow roots we need to inject into.
 *
 * HA 2026.2 structure:
 *   home-assistant (shadowRoot)
 *     home-assistant-main (shadowRoot)
 *       ha-drawer                         ← light DOM, may or may not have shadowRoot
 *         partial-panel-resolver           ← light DOM
 *           ha-panel-lovelace (shadowRoot)
 *             hui-root (shadowRoot)
 *               .header                    ← the tab bar / toolbar
 *               #view                      ← the cards
 *
 * querySelector on a shadowRoot searches the light DOM subtree within it,
 * but NOT into nested shadow roots. If ha-drawer has its own shadow root
 * (which it does in some HA versions), ha-panel-lovelace won't be found
 * by querying mainShadow directly. We must try multiple paths.
 */
function _getHAShadowRoots() {
  const ha = document.querySelector('home-assistant');
  const haShadow = ha?.shadowRoot;
  const main = haShadow?.querySelector('home-assistant-main');
  const mainShadow = main?.shadowRoot;

  // Try multiple paths to find ha-panel-lovelace:
  // Path 1: Direct query from mainShadow (works when ha-drawer has no shadow root)
  // Path 2: Via ha-drawer's light DOM children
  // Path 3: Via ha-drawer's shadow root (HA 2026.2+)
  let panel = mainShadow?.querySelector('ha-panel-lovelace');
  if (!panel) {
    const drawer = mainShadow?.querySelector('ha-drawer');
    // Try drawer's light DOM first
    panel = drawer?.querySelector('ha-panel-lovelace');
    // Try drawer's shadow root
    if (!panel) {
      panel = drawer?.shadowRoot?.querySelector('ha-panel-lovelace');
    }
    // Try via partial-panel-resolver
    if (!panel) {
      const resolver = drawer?.querySelector('partial-panel-resolver')
        || drawer?.shadowRoot?.querySelector('partial-panel-resolver');
      panel = resolver?.querySelector('ha-panel-lovelace');
    }
  }

  const panelShadow = panel?.shadowRoot;
  const huiRoot = panelShadow?.querySelector('hui-root');
  const huiRootShadow = huiRoot?.shadowRoot;
  return { haShadow, mainShadow, panelShadow, huiRootShadow };
}

/** CSS to inject into hui-root's shadow root — hides header, toolbar, tabs */
const KIOSK_CSS_HUI_ROOT = `
  /* Hue UI kiosk — injected into hui-root shadowRoot */
  app-header,
  .header,
  app-toolbar,
  ha-tabs,
  ha-tab-bar,
  paper-tabs {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  :host {
    --header-height: 0px !important;
  }

  #view {
    min-height: 100vh !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
  }
`;

/** CSS to inject into home-assistant-main's shadow root — hides sidebar */
const KIOSK_CSS_MAIN = `
  /* Hue UI kiosk — injected into home-assistant-main shadowRoot */
  ha-drawer > ha-sidebar,
  ha-sidebar {
    display: none !important;
  }

  ha-drawer {
    --mdc-drawer-width: 0px !important;
    --app-drawer-width: 0px !important;
  }
`;

function _injectStyle(shadowRoot, css, idSuffix = '') {
  if (!shadowRoot || typeof shadowRoot.appendChild !== 'function') return false;
  const id = HUE_UI_KIOSK_STYLE_ID + idSuffix;
  if (shadowRoot.getElementById?.(id)) return true; // already present

  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  shadowRoot.appendChild(style);
  return true;
}

function _removeStyle(shadowRoot, idSuffix = '') {
  if (!shadowRoot) return;
  const id = HUE_UI_KIOSK_STYLE_ID + idSuffix;
  try {
    shadowRoot.getElementById?.(id)?.remove?.();
  } catch (_e) { /* ignore */ }
}

function _removeAllKioskStyles() {
  const { huiRootShadow, mainShadow } = _getHAShadowRoots();
  _removeStyle(huiRootShadow, '-hui');
  _removeStyle(mainShadow, '-main');

  // Also remove from any previously tracked roots (in case HA replaced elements)
  for (const [root, suffix] of _kioskInjectedRoots) {
    _removeStyle(root, suffix);
  }
  _kioskInjectedRoots = [];

  // Disconnect observers
  for (const obs of _kioskObservers) {
    try { obs.disconnect(); } catch (_e) { /* ignore */ }
  }
  _kioskObservers = [];

  if (_kioskRetryTimer) {
    clearTimeout(_kioskRetryTimer);
    _kioskRetryTimer = null;
  }
  _kioskRetryCount = 0;
}

/**
 * Also directly hide elements via style.display as a belt-and-suspenders
 * approach — some HA versions use Lit's styleMap which can override CSS rules.
 */
function _forceHideElements(huiRootShadow) {
  if (!huiRootShadow) return;
  const selectors = ['app-header', '.header', 'app-toolbar', 'ha-tabs', 'ha-tab-bar', 'paper-tabs'];
  for (const sel of selectors) {
    try {
      huiRootShadow.querySelectorAll?.(sel)?.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    } catch (_e) { /* ignore */ }
  }
}

/**
 * Set up a MutationObserver on a shadow root so we re-inject if HA rebuilds.
 * Shadow DOM mutations do NOT bubble to document.documentElement, so we must
 * observe each shadow root individually.
 */
function _observeShadowRoot(shadowRoot, callback) {
  if (!shadowRoot) return;
  try {
    const obs = new MutationObserver(callback);
    obs.observe(shadowRoot, { childList: true, subtree: true });
    _kioskObservers.push(obs);
  } catch (_e) { /* ignore */ }
}

function syncHueUiKiosk() {
  if (_kioskRetryTimer) {
    clearTimeout(_kioskRetryTimer);
    _kioskRetryTimer = null;
  }

  const active = isHueUiPath(window.location?.pathname);
  if (!active) {
    _removeAllKioskStyles();
    return;
  }

  const { huiRootShadow, mainShadow, panelShadow } = _getHAShadowRoots();

  // If hui-root's shadow root isn't available yet, retry.
  if (!huiRootShadow) {
    _kioskRetryCount += 1;
    if (_kioskRetryCount < HUE_UI_KIOSK_MAX_RETRIES) {
      _kioskRetryTimer = setTimeout(syncHueUiKiosk, HUE_UI_KIOSK_RETRY_MS);
    }
    return;
  }

  _kioskRetryCount = 0;

  // Inject CSS into hui-root shadow (hides header/tabs)
  if (_injectStyle(huiRootShadow, KIOSK_CSS_HUI_ROOT, '-hui')) {
    _kioskInjectedRoots.push([huiRootShadow, '-hui']);
  }

  // Inject CSS into home-assistant-main shadow (hides sidebar)
  if (mainShadow && _injectStyle(mainShadow, KIOSK_CSS_MAIN, '-main')) {
    _kioskInjectedRoots.push([mainShadow, '-main']);
  }

  // Belt-and-suspenders: also force-hide via inline style
  _forceHideElements(huiRootShadow);

  // Observe hui-root's shadow for re-renders (HA can rebuild the header)
  if (_kioskObservers.length === 0) {
    _observeShadowRoot(huiRootShadow, () => {
      if (!isHueUiPath()) return;
      const roots = _getHAShadowRoots();
      if (roots.huiRootShadow) {
        _injectStyle(roots.huiRootShadow, KIOSK_CSS_HUI_ROOT, '-hui');
        _forceHideElements(roots.huiRootShadow);
      }
    });

    // Also observe panel-lovelace shadow — if hui-root gets replaced entirely
    if (panelShadow) {
      _observeShadowRoot(panelShadow, () => {
        if (!isHueUiPath()) return;
        // hui-root may have been swapped; re-run full sync after a tick
        setTimeout(syncHueUiKiosk, 50);
      });
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
  './app/hue-home-screen3.js?v=3.1.83',
  'Hue Home Screen failed to load. Check resource imports in console.'
);

await loadCardModule(
  'hue-room-screen',
  './app/hue-room-screen3.js?v=3.1.83',
  'Hue Room Screen failed to load. Check resource imports in console.'
);
