# Hue UI - Philips Hue-style Home Assistant Dashboard

A modular Lovelace card suite that reproduces the Philips Hue app look-and-feel for Home Assistant.

## Features

- **Leather-textured dark theme** matching Philips Hue app aesthetics
- **Home Dashboard** - Overview of all rooms with status indicators
- **Room Screens** - Detailed control with lighting, climate, and devices
- **Smooth animations** - Hue-style toggles and expand/collapse
- **Smart rendering** - Only updates when entity states change
- **Mobile-friendly** - Responsive grid layouts for phone and tablet

## Installation

### Manual Installation

1. Copy the `hue-ui` folder to your Home Assistant `www` directory:
   ```
   /config/www/hue-ui/
   ```

2. Add the resource to your Lovelace configuration:
   ```yaml
   resources:
     - url: /local/hue-ui/src/index.js
       type: module
   ```

3. Restart Home Assistant or clear your browser cache.

## Cards

### hue-home-dashboard

Displays a vertical list of room cards. Clicking a room navigates to its detail view.

```yaml
type: custom:hue-home-dashboard
title: Home
subtitle: Welcome back
rooms:
  - name: Living Room
    icon: 🛋️
    path: /lovelace-hue/living-room
    lights:
      - light.living_room_ceiling
      - light.living_room_lamp
    climate: climate.living_room
    temperature_sensor: sensor.living_room_temperature
  - name: Kitchen
    icon: 🍳
    path: /lovelace-hue/kitchen
    lights:
      - light.kitchen_ceiling
```

#### Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `title` | string | No | Dashboard title (default: "Home") |
| `subtitle` | string | No | Subtitle text |
| `rooms` | list | Yes | List of room configurations |

**Room options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | Room name |
| `icon` | string | No | Room icon (emoji or mdi:icon) |
| `path` | string | No | Navigation path when clicked |
| `lights` | list | No | Light entity IDs |
| `climate` | string | No | Climate entity ID |
| `temperature_sensor` | string | No | Temperature sensor entity ID |

### hue-room-screen

Detailed room view with sections for lighting, climate, and devices.

```yaml
type: custom:hue-room-screen
name: Living Room
icon: 🛋️
back_path: /lovelace-hue/home

temperature_sensor: sensor.living_room_temperature
humidity_sensor: sensor.living_room_humidity
motion_sensor: binary_sensor.living_room_motion

lights:
  - light.living_room_ceiling
  - light.living_room_lamp
lights_layout: list

climate: climate.living_room

devices:
  - entity: media_player.tv
    name: TV
    icon: mdi:television
    power_sensor: sensor.tv_power
  - entity: switch.fan
    name: Fan
    icon: mdi:fan
```

#### Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | Room name |
| `icon` | string | No | Room icon |
| `back_path` | string | No | Navigation path for back button |
| `temperature_sensor` | string | No | Temperature sensor for header |
| `humidity_sensor` | string | No | Humidity sensor for header |
| `motion_sensor` | string | No | Motion sensor for header |
| `lights` | list | No | Light entity IDs |
| `lights_layout` | string | No | "list" or "grid" |
| `climate` | string/list | No | Climate entity ID(s) |
| `devices` | list | No | Device configurations |

**Device options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `entity` | string | Yes | Entity ID |
| `name` | string | No | Display name |
| `icon` | string | No | Override icon |
| `power_sensor` | string | No | Power sensor entity ID |

## Setting Up Navigation

For room navigation to work, create views in your Lovelace configuration:

```yaml
views:
  - title: Home
    path: home
    panel: true
    cards:
      - type: custom:hue-home-dashboard
        # ... config

  - title: Living Room
    path: living-room
    panel: true
    cards:
      - type: custom:hue-room-screen
        name: Living Room
        back_path: /lovelace-hue/home
        # ... config
```

## Design Tokens

The cards use CSS variables for consistent theming:

- `--hue-bg-gradient`: Background gradient
- `--hue-surface`: Card/row background
- `--hue-gold`: Primary accent color
- `--hue-text-primary`: Primary text color
- `--hue-text-muted`: Muted text color

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Tips

1. **Kiosk Mode**: Use [kiosk-mode](https://github.com/maykar/kiosk-mode) to hide the HA header/sidebar for a true app-like experience.

2. **Full Screen**: Create a dedicated dashboard at `/lovelace-hue/` with `panel: true` views.

3. **Mobile**: The responsive grid shows 2 columns on phones, 3 on tablets.

## License

MIT License
