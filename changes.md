# Hue UI Changelog

---

## v11.0 — 2026-02-05

### Collapsing Dual-Title Header (Home Screen)

Replicated the Philips Hue app's collapsing header on the Home dashboard.

- Large title ("Home") cross-fades into a small pinned title as you scroll
- Scroll-driven animation: `t = clamp(scrollTop / 80, 0, 1)`, rAF-based, writes only `opacity` + `transform` (GPU-friendly)
- Content slides under the pinned header with backdrop blur

**New DOM structure:**
```
.hue-root (position: fixed, inset: 0)
  .hue-background (position: fixed — leather texture)
  .content-scroll (position: absolute, inset: 0, overflow-y: auto)
    .expanded-header (padding-top: 72px)
      .large-title "Home"       ← fades out on scroll
      weather-widget             ← fades out on scroll
      people-row                 ← fades out on scroll
    .scroll-content
      ROOMS section
      DEVICES section
  .header-pinned (position: absolute, top: 0, z-index: 100)
    .header-material             ← backdrop, opacity driven by scroll
    .nav-row
      .small-title "Home"        ← fades in on scroll
      .nav-actions
```

**Scroll handler methods added:**
- `_initScrollHandler()` — caches DOM refs, attaches passive scroll listener
- `_onScroll()` — schedules rAF
- `_applyScrollT(t)` — sets opacity/transform on header material, small title, large title, weather, people
- `disconnectedCallback()` — cancels rAF and removes scroll listener

**Config change:**
- Added `"home_name": "Home"` to `rooms.index.json` (used as both large and small title, fallback: `'Home'`)

### Fixed Canvas Architecture (Room Screen)

Applied the same fixed viewport model to room screens, matching the Home screen.

- `position: fixed; inset: 0` root — escapes HA parent scroll contexts
- Fixed leather background — never scrolls, never ends
- Pinned room header (orange pill with back button, title, master toggle) — absolute positioned, z-index 100
- Single scroll container for all room content sections
- Content slides under the pinned header with gradient fade

**New DOM structure:**
```
.hue-root (position: fixed, inset: 0)
  .hue-background (same leather texture as Home)
  .room-scroll (position: absolute, inset: 0, overflow-y: auto)
    .room-scroll-content (max-width: 680px, padding-top: 102px)
      sections (scenes, lighting, climate, devices, sensors)
  .room-header-pinned (position: absolute, top: 0, z-index: 100)
    .hue-header-bar (orange pill)
```

### Scenes — Paginated 3x2 Grid

Replaced flat scene list with Hue-exact paginated pages.

- 3 columns x 2 rows = 6 scenes per page
- `scroll-snap-type: x mandatory` with `scroll-snap-stop: always` — no partial tiles visible
- Fixed height: 272px (2 rows of 130px + 1 gap of 12px)
- Hidden scrollbar

**CSS classes:**
- `.hue-scene-pager` — flex container, horizontal scroll with snap
- `.hue-scene-page` — `flex: 0 0 100%`, snap-aligned
- `.hue-scene-page-grid` — 3x2 CSS grid

**File changed:** `src/widgets/scenes.widget3.js`
- `renderScenesContent()` now chunks scenes into groups of 6, each wrapped in `.hue-scene-page > .hue-scene-page-grid`

### Lighting — Responsive Wrapping Grid with Hue v2 Tiles

Replaced horizontal-scroll lighting strip with a responsive wrapping grid and Hue v2 tile anatomy.

**Grid:**
- `grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))` — fills horizontally before wrapping
- No horizontal scroll, no clipping

**Tile anatomy (Hue v2):**
```
icon (centered, 32px)
name (centered, 2-line clamp)
divider (1px line)
toggle (centered)
```

- Fixed tile height: 140px
- Added `.hue-light-divider` element between name and toggle

**Files changed:**
- `src/widgets/lighting.widget3.js` — added divider element to tile HTML
- `src/app/hue-room-screen3.js` — replaced `.hue-light-scroll` with `.hue-light-grid`, added tile/divider styles

### Bug Fixes

#### Configuration Error on Main Dashboard

The dashboard showed "Configuration error" after the architecture rewrite. Root causes and fixes:

1. **Lovelace resource version mismatch**
   - `.storage/lovelace_resources` still referenced `hue-ui.js?v=10.9`
   - `hue-ui.js` imports were updated to `?v=11.0`
   - Phone browser cached old entry point, causing mixed old/new module loading
   - **Fix:** Updated resource URL to `?v=11.0`

2. **Missing loading guard in `_loadAndRender()`**
   - HA sets `hass` rapidly on startup — each call triggered a concurrent async `_loadAndRender()`
   - Multiple pending promises each called `_render()` independently, causing redundant DOM teardown/rebuild
   - **Fix:** Added `this._loading` flag to both `HueHomeScreen` and `HueRoomScreen` to prevent concurrent loads

3. **Double `customElements.define` risk**
   - If the module was loaded twice (e.g., from both old `?v=10.9` and new `?v=11.0` URLs during version transition), the second `define()` call would throw
   - **Fix:** Wrapped `customElements.define()` in `customElements.get()` check in both screens

4. **Unscoped `const` in switch cases**
   - `_formatDeviceState()` used `const` declarations inside `switch` cases without block `{}` scoping
   - Older iOS Safari versions can have issues with unscoped lexical declarations in switch statements
   - **Fix:** Wrapped affected cases (`sensor`, `climate`) in block `{}` braces

### Files Modified

| File | Changes |
|------|---------|
| `src/hue-ui.js` | Bumped imports from `?v=10.9` to `?v=11.0` |
| `src/app/hue-home-screen3.js` | Full rewrite: collapsing header, fixed canvas, scroll handler, loading guard, define guard, switch block scoping |
| `src/app/hue-room-screen3.js` | Full rewrite: fixed canvas, pinned header, scenes pager, lighting grid, loading guard, define guard |
| `src/widgets/scenes.widget3.js` | Paginated pages (chunks of 6) |
| `src/widgets/lighting.widget3.js` | Added `.hue-light-divider` element |
| `config/rooms.index.json` | Added `"home_name": "Home"` |
| `.storage/lovelace_resources` | Updated hue-ui.js URL from `?v=10.9` to `?v=11.0` |

### Files Unchanged
- `src/app/config-loader3.js`
- `src/app/events3.js`
- `src/ui/helpers2.js`
- `src/widgets/climate.widget2.js`
- `src/widgets/devices.widget2.js`
- `src/widgets/sensors.widget2.js`
- All room config JSONs (`config/rooms/*.json`)

---

## v10.4 — 2026-02-04 (Room Layout v2)

### Purpose
Implement Room Layout v2 for room screens only, align with Hue v2 layout, and update configs to support scenes/sensors.

### Key Features Implemented
- Room header updated to: back + room name on left, master power toggle on right.
- Room sections order fixed: Scenes → Lighting → Climate → Devices → Sensors.
- Scenes: two-row horizontal scroll tiles; tap activates scene.
- Lighting: flat list of lights in a two-row horizontal scroll grid (left/right only).
- Climate/Devices/Sensors: compact tile grids.
- Light detail uses HA `more_info` modal.
- Added scene activation haptics.

### Files Added
- `src/widgets/scenes.widget3.js` (scene tiles renderer)
- `src/widgets/sensors.widget2.js` (read-only sensor tiles renderer)

### Major File Changes
- `src/app/hue-room-screen3.js`
  - Full Room Layout v2 implementation.
  - New header layout + master toggle.
  - New sections ordering and rendering.
  - New horizontal lighting grid and scene scroll.
  - New CSS for tiles, grids, and scroll behavior.
  - State updates for tiles + master toggle.

- `src/widgets/lighting.widget3.js`
  - Refactored to render light tiles only (no sliders, no groups).

- `src/widgets/devices.widget2.js`
  - Refactored to render device/media tiles (grid style).
  - Media tiles use `media_play_pause` toggle.
  - Power map handled via data attribute for updates.

- `src/widgets/climate.widget2.js`
  - Refactored to render climate tiles (grid style).

- `src/app/events3.js`
  - Added `activate_scene` action.
  - `activate_scene` now triggers haptic feedback.

- `src/hue-ui.js`
  - Bumped module version to `?v=10.4`.

- `src/app/hue-home-screen3.js`
  - Bumped import versions to `?v=10.4`.

### Config Updates
- Added `scenes` and `sensors` arrays to all room configs in `config/rooms/*.json`.
- Woonkamer scene placeholders replaced with actual scene IDs.
- Scenes auto-mapped from HA entities using naming rules:
  - `room_<name>_*` → room `<name>`
  - `room_kitchen_*` → `keuken`
  - `zone_wastafel_*`, `zone_douche_*` → `badkamer`
  - `zone_tvkast_*` → `woonkamer`
  - `scene.slaapkamer_zacht` → `slaapkamer`
- Rooms with no scenes (bioscoop, noah) left unchanged.

### Notes
- Home screen unchanged in this version.
- All changes are in the `hue-room-screen3` path (Room Layout v2).
