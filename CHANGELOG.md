# Changelog

Important, user-visible changes only. See commit history for full detail.

## Unreleased

- Home: add Tesla (vehicle) device kind with Hue-styled tile + Tesla-style detail screen (battery/charging/range + key controls).
- Home: add /device/<id> routing so device tiles can open in-app pages (used for Tesla).

- Home: fixed intermittent disappearance of people/weather widgets after returning to Home (route change + stale header refs).
- Rooms: camera cards prefer live MJPEG stream, keep tokens fresh, and fall back to snapshot polling to prevent flashing/broken image loops.
- Rooms: back button navigation now triggers on pointerdown for more reliable taps.

- Home: room editor temp/motion dropdowns now query HA registries and filter by the edited room (instead of only config sensors).
- Home: "Badkamer" shower state shows "Douchen" in the temp line while showering.
- Rooms: light-control popup is larger, removed color/warmth mode buttons, added step-based haptics, and prevented slider jumpiness on release.
- Home title: improved HA sidebar escape by clicking the menu button as a fallback.

## 2026-02-06

- Initial Hue-style Home Assistant dashboard implementation (Home + Room screens).
- Home: swipeable people/weather widget, printer progress tile, shower indicator.
- Rooms: scenes + lighting pagination, climate and media widgets, camera cards.
- Added in-UI editors (room widgets, home room sensors).
- Added person detail screen and HA sidebar escape via tapping the home title.
