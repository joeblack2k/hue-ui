# Hue UI (Hue-style Home Assistant Dashboard)

Hue-inspired Home Assistant Lovelace cards with a Philips Hue app-like layout and interaction model.

This repo contains code only. Do not commit personal Home Assistant entity IDs, names, or images. Keep your real config in ignored files.

## Features

- Home screen with swipeable people/weather widget, rooms grid, devices grid.
- Room screens with scenes, paginated lighting, climate, devices, mediaplayers, cameras.
- In-app editors (persist to browser local storage overrides).
- Person detail screen (photo, location map, battery bar, phone sensors).
- Tap the home title to open the native Home Assistant sidebar (escape kiosk mode).

## Install (Fresh Home Assistant)

### 1. Copy Files

Copy this folder to your Home Assistant `www` directory:

- `/config/www/hue-ui/`

On Home Assistant OS/Supervised you can do this via Samba/SSH add-on.

### 2. Add Lovelace Resource

Settings -> Dashboards -> Resources -> Add resource:

- URL: `/local/hue-ui/src/hue-ui.js?v=12.22`
- Type: `JavaScript Module`

If you update files later, bump the `v=` query to force a refresh.

### 3. Create Config Files

Create your local config files (these are ignored by git on purpose):

- `/config/www/hue-ui/config/rooms.index.json`
- `/config/www/hue-ui/config/rooms/<room>.json`

Start from the templates:

- `/config/www/hue-ui/config/examples/rooms.index.example.json`
- `/config/www/hue-ui/config/examples/rooms/living_room.example.json`

### 4. Create Dashboard Views

Create a new dashboard (or add to an existing one) and add these cards.

Home view:

```yaml
type: custom:hue-home-screen
```

Room view (one per room id):

```yaml
type: custom:hue-room-screen
room: living_room
```

Navigation uses the `dashboard_path` set in `rooms.index.json` (default `/hue-ui`).

## Configuration Model

The UI is config-driven via JSON under `config/` in `/config/www/hue-ui/`.

- Global index: `config/rooms.index.json`
- Rooms: `config/rooms/<room>.json`

Important fields in `rooms.index.json`:

- `home_name`: the title shown on the Home screen (example: `Huisje Weltevree`)
- `dashboard_path`: base path used for internal navigation (example: `/hue-ui`)
- `rooms[]`: your rooms list, their `lights[]`, and `sensors` (temp/motion/shower)
- `devices[]`: extra tiles (example: printer progress)
- `people[]`: `person.*` entities to show
- `people_area_sensors`: optional mapping for “room-level presence” display

## Editors and Overrides (LocalStorage)

Some edits (widget renames/hide/remove/add, home room sensor picks, etc.) are stored as browser localStorage overrides so you can iterate quickly without editing JSON on disk.

To reset overrides, clear the site data for your Home Assistant URL or remove localStorage keys starting with:

- `hue-ui-room-config-override:`
- `hue-ui-rooms-index-override`

## Updating This Repo (Workflow)

This repo should stay safe to share publicly.

- Never commit real entity IDs that include personal names, addresses, or device identifiers.
- Keep real configs in `config/rooms.index.json` and `config/rooms/` (ignored by `.gitignore`).
- Commit with a clear message that states what changed and why.
- Update `CHANGELOG.md` for user-visible changes.

## Changelog

See `CHANGELOG.md`.

### Highlights (Latest)

- Fresh-install setup guide and safe example configs.
- Hue-style Home + Room screens with in-UI editors and pagination.
- Person detail screen (map + battery + sensors) and sidebar escape via tapping the home title.
- More reliable sidebar escape + less jumpy light-control sliders (room popup).
