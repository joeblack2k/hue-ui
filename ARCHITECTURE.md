# Hue UI - Architecture Documentation

## Single Source of Truth for Future Agents

This document describes the complete architecture of the Hue UI dashboard for Home Assistant. It is designed to be read by another AI agent (or a human developer) with no prior knowledge of this project.

---

## 1. Project Goals & Non-Goals

### Goals
- Recreate the Philips Hue app look-and-feel as a Home Assistant Lovelace dashboard
- Config-driven architecture: rooms and entities defined in JSON, not hardcoded
- Strict separation of concerns: screens, widgets, helpers, events
- Skeuomorphic design with leather textures, beveled buttons, inset shadows
- Support for touch devices (Home Assistant Companion App) with haptic feedback

### Non-Goals
- No fullscreen/kiosk mode hacks (use kiosk-mode card instead)
- No build tooling (plain ES modules)
- No camera widgets (can be added later)
- No custom entity discovery (explicit config only)

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Entry Point                          │
│                   hue-ui.js                             │
│         (registers custom elements)                     │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   hue-home-screen   │       │   hue-room-screen   │
│   (Home Dashboard)  │       │   (Room Detail)     │
│                     │       │                     │
│  - Weather widget   │       │  - Room header      │
│  - People row       │       │  - Scenes scroll    │
│  - ROOMS section    │       │  - Lighting grid    │
│  - DEVICES section  │       │  - Climate grid     │
│  - Toggle switches  │       │  - Devices grid     │
│                     │       │  - Sensors grid     │
└─────────────────────┘       └─────────────────────┘
                                       │
                    ┌─────────────────────────────────────────────────────┐
                    ▼                                                     ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │   scenes    │  │  lighting   │  │   climate   │  │   devices   │  │   sensors   │
            │   widget    │  │   widget    │  │   widget    │  │   widget    │  │   widget    │
            └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Layers

1. **Entry Point** (`hue-ui.js`): Registers custom elements, no logic
2. **Screens** (`app/`): Full-page components, handle navigation and composition
3. **Widgets** (`widgets/`): Content-only renderers, return HTML strings
4. **Helpers** (`ui/helpers2.js`): Pure utility functions
5. **Events** (`app/events3.js`): Service call dispatcher, haptic feedback
6. **Config** (`config/`): JSON files defining rooms and entities

---

## 3. Folder & File Structure

```
www/hue-ui/
├── ARCHITECTURE.md          # This file
├── src/
│   ├── hue-ui.js            # Entry point, custom element registration
│   ├── app/
│   │   ├── hue-home-screen3.js   # Home dashboard (weather + room tiles)
│   │   ├── hue-room-screen3.js   # Room detail screen
│   │   ├── config-loader3.js     # JSON config loading
│   │   └── events3.js            # Action dispatcher, haptic feedback
│   ├── widgets/
│   │   ├── scenes.widget3.js     # Scene tiles (horizontal scroll)
│   │   ├── lighting.widget3.js   # Light tiles grid
│   │   ├── climate.widget2.js    # Climate tiles grid
│   │   ├── devices.widget2.js    # Device tiles grid
│   │   └── sensors.widget2.js    # Sensor tiles grid
│   ├── ui/
│   │   └── helpers2.js           # Utility functions (escapeHtml, etc.)
│   └── config/
│       ├── rooms.index.json      # Room index (list of all rooms)
│       └── rooms/
│           ├── woonkamer.json    # Room-specific config
│           ├── keuken.json
│           └── ...
```

---

## 4. Home Screen Design & Logic

**File**: `app/hue-home-screen3.js`

### Layout (v10.9)
- Full-viewport leather-textured background (fixed layer)
- Sticky header: Weather widget + People row (non-scrolling)
- Scroll container with two sections:
  - **ROOMS** section header + room tiles grid
  - **DEVICES** section header + device tiles grid

### Home Screen Structure
```
┌─────────────────────────────────────┐
│  hue-sticky-header (non-scrolling)  │
│  ┌───────────────────────────────┐  │
│  │  Weather Widget               │  │
│  │  (emoji, temp, condition)     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  People Row (avatars)         │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  hue-scroll-container (scrollable)  │
│                                     │
│  ROOMS                              │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Room │ │Room │ │Room │ ...       │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│  DEVICES                            │
│  ┌─────┐ ┌─────┐                   │
│  │Dev  │ │Dev  │ ...               │
│  └─────┘ └─────┘                   │
└─────────────────────────────────────┘
```

### Room Tile Structure
```
┌─────────────────────────────┐
│  [Icon]           [Toggle]  │
│                             │
│  Room Name                  │
│  X / Y aan                  │
│              [Motion] [Temp]│
└─────────────────────────────┘
```

### Device Tile Structure
```
┌─────────────────────────────┐
│  [Icon]           [Toggle]  │
│                             │
│  Device Name                │
│  Status (On/Off/Value)      │
└─────────────────────────────┘
```

Device tiles are similar to room tiles but:
- No motion/temperature indicators
- Toggle can be: true (interactive), false (no toggle), "read-only" (visible but disabled)
- Click navigates to device page (if `device_file` is set) or opens `more_info` dialog

### State Management
- Initial render: Full DOM build
- Subsequent updates: Incremental `_updateStates()` method
- Classes added/removed without DOM rebuild
- `_rendered` flag prevents full re-render on every `hass` setter call

### Vibration Bug Fix (CRITICAL)
The original bug: Room tiles would "vibrate" when toggling lights because:
1. CSS had `transition: all 0.3s` including `transform`
2. State updates modified classes
3. Transform transitions would re-trigger

**The Fix**:
- Changed class from `.active` to `.lights-on` (avoid collision with `:active` pseudo-class)
- Removed `transform` from transition list: `transition: background 0.3s ease, box-shadow 0.3s ease;`
- `:active` (pointer-down) only affects `box-shadow`, not `transform`
- State changes never trigger visual movement

### Scrolling Model & Background Continuity (v10.7)

**Problem**: Scrolling to bottom revealed black "page end" - felt like a web page, not an app.

**Solution**: Restructured from document scroll to internal scroll container.

#### Layout Structure
```
hue-root (full viewport, flex column)
├── hue-background (position: fixed, covers entire viewport)
├── hue-sticky-header (flex-shrink: 0, never scrolls)
│   ├── Weather Widget
│   └── People Row
└── hue-scroll-container (flex: 1, overflow-y: auto)
    └── Room Grid
```

#### Key CSS Properties

```css
.hue-root {
  display: flex;
  flex-direction: column;
  height: 100dvh;              /* Dynamic viewport height (iOS) */
  min-height: 100vh;           /* Fallback */
  overflow: hidden;            /* Prevent document scroll */
  /* Safe area support */
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.hue-background {
  position: fixed;
  inset: 0;                    /* Covers entire viewport */
  z-index: 0;
}

.hue-sticky-header {
  flex-shrink: 0;              /* Never shrinks */
  z-index: 10;
}

.hue-scroll-container {
  flex: 1;                     /* Fill remaining space */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; /* Prevent pull-to-refresh */
}
```

#### Verification Checklist
- [ ] Scroll to bottom → no black area visible
- [ ] Weather + People remain fixed while rooms scroll
- [ ] iOS Companion App: no bounce reveals black
- [ ] Chrome: same behavior, no regressions

---

## 5. Room Screen Composition Rules

**File**: `app/hue-room-screen3.js`

### Header Structure
```
←  Woonkamer                    ⏻
```

- Back button + room name on the left
- Round master power button on the right
- Power button toggles **all room lights**
- No metadata in header (sensors are in the Sensors section)

### Section Order (Fixed)
1. Room Header
2. Scenes (two-row horizontal scroll)
3. Lighting (grid)
4. Climate (grid)
5. Devices (grid)
6. Sensors (grid)

### Section Structure
Each section has:
1. Section header (title only, no controls)
2. Widget content (rendered by widget function)

```javascript
<div class="hue-section">
  <div class="hue-section-header">
    <span class="hue-section-title">LIGHTING</span>
  </div>
  <div class="hue-tile-grid">
    ${renderLightingContent(hass, lights)}
  </div>
</div>
```

**Rule**: Section headers contain ONLY text. All controls live inside widgets.

---

## 6. Widget Philosophy

### What Widgets MAY Do
- Render HTML content (return strings)
- Read entity states from `hass`
- Include data-action attributes for event delegation
- Contain their own interactive controls (toggles, sliders, mode buttons)

### What Widgets MAY NOT Do
- Render section headers (that's the screen's job)
- Call `hass.callService()` directly (use data-action)
- Manage their own state (stateless render functions)
- Include inline CSS (use shared styles from screen)

### Widget Function Signature
```javascript
export function renderWidgetContent(hass, section, ...options) {
  // Returns HTML string
  return `<div>...</div>`;
}
```

---

## 7. Lighting Widget Behavior

**File**: `widgets/lighting.widget3.js`

### Tile Layout
- Flat grid of all lights (groups flattened)
- Each tile contains icon, name, and a power toggle
- Tapping the tile opens `more_info` for the light
- Toggle only toggles power (no sliders or mode controls on the room screen)

---

## 8. Event Handling & State Update Strategy

**File**: `app/events3.js`

### Event Delegation Pattern
All interactions use `data-action` attributes:

```html
<button data-action="toggle" data-entity="light.kitchen">
```

Screen attaches single listener:
```javascript
shadowRoot.addEventListener('click', this._handleClick.bind(this));
```

Handler routes by action:
```javascript
switch (action) {
  case 'toggle':
    handleAction(hass, 'toggle', entity);
    break;
  case 'set_brightness':
    handleAction(hass, 'set_brightness', entity, { brightness });
    break;
  // ...
}
```

### Supported Actions
| Action | Service Call |
|--------|--------------|
| `toggle` | `homeassistant.toggle` |
| `set_brightness` | `light.turn_on` with `brightness` |
| `set_color_temp` | `light.turn_on` with `color_temp` |
| `set_color_hue` | `light.turn_on` with `hs_color` |
| `set_hvac_mode` | `climate.set_hvac_mode` |
| `media_play_pause` | `media_player.media_play_pause` |
| `activate_scene` | `scene.turn_on` |
| `more_info` | Fire `hass-more-info` event |

### Haptic Feedback
```javascript
export function hapticFeedback() {
  // Uses Home Assistant Companion App haptic API
  if (window.navigator.vibrate) {
    window.navigator.vibrate(10);
  }
  // Also fires HA event for Companion app
  window.dispatchEvent(new CustomEvent('haptic', { detail: 'light' }));
}
```

---

## 9. Home Tile Vibration Bug - Full Explanation

### Original Symptom
When toggling lights from the home screen, room tiles would continuously animate/vibrate without user interaction.

### Root Cause Analysis
1. CSS rule: `.room-tile { transition: all 0.3s ... }`
2. This included `transform` in the transition
3. The `.active` class was used for "lights are on" state
4. CSS `:active` pseudo-class is for "pointer down" state
5. When HA state updated, `_updateStates()` toggled `.active` class
6. The transform transition would fire, causing visual movement
7. Rapid state updates created continuous movement

### The Fix (Implemented)
1. **Renamed class**: `.active` → `.lights-on` (no collision with `:active`)
2. **Removed transform from transitions**:
   ```css
   .room-tile {
     transition: background 0.3s ease, box-shadow 0.3s ease;
     /* transform is NOT transitioned */
   }
   ```
3. **Hover uses media query** (no transform on touch):
   ```css
   @media (hover: hover) {
     .room-tile:hover { ... }
   }
   ```
4. **:active only changes box-shadow**:
   ```css
   .room-tile:active {
     box-shadow: inset 0 2px 6px rgba(0,0,0,0.7), ...;
   }
   ```

### Verification
- Toggle lights → tile stays stable
- No continuous animation
- Press feedback only on actual pointer interaction

---

## 10. How to Add a Light / Room / Widget Safely

### Adding a New Room

1. Create room config file: `config/rooms/newroom.json`
```json
{
  "id": "newroom",
  "name": "New Room",
  "icon": "mdi:room",
  "scenes": [],
  "sensors": [
    { "entity": "sensor.newroom_temperature", "name": "Temperature", "icon": "mdi:thermometer" }
  ],
  "sections": [
    {
      "type": "lighting",
      "title": "LIGHTING",
      "groups": [
        {
          "name": "Main Lights",
          "entities": ["light.newroom_main"]
        }
      ]
    }
  ]
}
```

2. Add to rooms index: `config/rooms.index.json`
```json
{
  "rooms": [
    { "id": "newroom", "room_file": "rooms/newroom.json", ... }
  ]
}
```

3. Add Lovelace view in HA dashboard YAML

### Adding a New Light to Existing Room

1. Edit the room's JSON config
2. Add entity ID to appropriate group's `entities` array
3. Refresh dashboard (Ctrl+F5)

### Adding a New Widget Type

1. Create widget file: `widgets/newtype.widget.js`
2. Export render function: `export function renderNewTypeContent(hass, section) { ... }`
3. Import in `hue-room-screen3.js`
4. Add case in `_renderSections()` switch

### Adding a New Device (v10.9+)

Devices appear in the DEVICES section on the home screen. Add to `config/rooms.index.json`:

```json
{
  "devices": [
    {
      "id": "my_device",
      "name": "My Device",
      "icon": "mdi:devices",
      "entity": "sensor.my_device_status",
      "toggle": true
    }
  ]
}
```

Device config options:
| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the device |
| `name` | Yes | Display name |
| `icon` | No | MDI icon (default: `mdi:devices`) |
| `entity` | No | Entity ID for state display and toggle |
| `toggle` | No | `true` (interactive toggle), `false` (no toggle), `"read-only"` (visible but disabled) |
| `device_file` | No | Path to device config JSON for device detail page |

Click behavior:
- If `device_file` is set: Navigate to `/hue-ui/device/{id}`
- Otherwise: Open Home Assistant `more_info` dialog for the entity

---

## 11. Development & Verification Workflow

### Cache Busting
ES modules are cached aggressively. To force reload:

1. Update version in import statements:
```javascript
import { ... } from './module.js?v=10.3';
```

2. Update resource URL via HA WebSocket:
```javascript
hass.callWS({
  type: 'lovelace/resources/update',
  resource_id: '...',
  url: '/local/hue-ui/src/hue-ui.js?v=10.3'
});
```

3. Hard refresh browser (Ctrl+Shift+R)

### Verification Checklist
Before declaring any change complete:

1. [ ] Open Chrome DevTools console - no errors
2. [ ] Navigate to home screen - tiles render correctly
3. [ ] Toggle a light - no vibration, state updates smoothly
4. [ ] Navigate to room screen - header centered, temp below
5. [ ] LIGHTING section - header has only text
6. [ ] Per-group mode button appears (if multiple modes supported)
7. [ ] Click mode button - cycles correctly
8. [ ] Slider changes per mode (brightness/color_temp/hue)
9. [ ] Test on mobile/Companion app if possible

---

## 12. DO / DO NOT Rules for Future Agents

### DO
- Read this document first before making changes
- Use config-driven approach (edit JSON, not JS)
- Keep widgets stateless (pure render functions)
- Use data-action for all interactions
- Test in browser before declaring completion
- Bump version numbers when changing files
- Use `lights-on` class for "lights are on" state (not `active`)

### DO NOT
- Add inline styles to widgets (use shared CSS)
- Call hass.callService directly in widgets
- Put controls in section headers
- Use CSS `transition: all` (be explicit about what transitions)
- Use `.active` class for state (conflicts with `:active` pseudo-class)
- Add polling or setTimeout hacks
- Hardcode entity IDs in JavaScript
- Create new files without updating imports
- Skip browser verification

---

## Appendix: Entity Capability Reference

### Light Supported Color Modes
- `onoff`: On/off only
- `brightness`: Dimming
- `color_temp`: Color temperature (mireds)
- `hs`: Hue/Saturation
- `xy`: CIE XY color
- `rgb`: RGB color
- `rgbw`: RGB + White
- `rgbww`: RGB + Warm White + Cold White

### Supported Features Bitmask
- Bit 0 (1): SUPPORT_BRIGHTNESS
- Bit 1 (2): SUPPORT_COLOR_TEMP
- Bit 2 (4): SUPPORT_EFFECT
- Bit 3 (8): SUPPORT_FLASH
- Bit 4 (16): SUPPORT_COLOR
- Bit 5 (32): SUPPORT_TRANSITION

---

*Document last updated: 2026-02-05 (v10.9 - ROOMS + DEVICES Sections)*
*For questions or issues: Check Home Assistant logs and browser console first*
