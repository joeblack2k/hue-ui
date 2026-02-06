# Room Layout v2 — Architecture & Wireframe Specification
Authoritative implementation brief for senior engineer

---

## CONTEXT

This document supersedes all previous room-layout decisions.

The **home screen remains unchanged**.  
This document applies **only to room screens**.

Goal:
- Align room screens 1:1 with **Philips Hue app v2 mental model**
- Prioritize clarity, scalability, and muscle-memory
- Remove experimental layouts and mixed semantics

This is not a design exploration.  
This is an implementation spec.

---

## CORE PRINCIPLES (NON‑NEGOTIABLE)

1. Predictable vertical flow
2. Strict separation of concerns
3. Config-driven content
4. No visual regressions
5. No layout logic inside widgets

---

## HIGH‑LEVEL ROOM SCREEN STRUCTURE

Vertical order, fixed:

```
[ Room Header ]
[ Scenes (horizontal scroll) ]
[ LIGHTING ]
[ Light grid ]
[ DEVICES ]
[ Device grid ]
[ SENSORS ]
[ Sensor tiles ]
```

---

## 1. ROOM HEADER

### Wireframe
```
←  Woonkamer                    ⏻
```

### Rules
- Back button + room name on left
- Round master power button on right
- Power button:
  - Green = ON
  - Dark grey = OFF
- Toggles all room lights
- Haptic feedback via HA Companion
- No metadata in header

---

## 2. SCENES SECTION

### Wireframe
```
SCENES
[Scene][Scene][Scene] →
[Scene][Scene][Scene] →
```

Rules:
- Two rows
- Horizontal scroll
- Tap = activate scene
- Hue-style behavior

---

## 3. LIGHTING SECTION

### Wireframe
```
LIGHTING
💡 Lamp A   💡 Lamp B
⏻           ⏻

💡 Lamp C   💡 Lamp D
⏻           ⏻
```

Rules:
- Compact grid
- Icon + name + toggle
- Tap icon/name opens detail view
- Toggle only toggles power

---

## 4. LIGHT DETAIL VIEW

```
Lamp name
[ Brightness slider ]
[ Temperature slider ]
[ Color picker ]
```

Capability-driven.

---

## 5. DEVICES SECTION

```
DEVICES
🔌 Device A   🔌 Device B
⏻            ⏻
```

Rules:
- Switches, plugs, buttons
- No color logic

---

## 6. SENSORS SECTION

```
SENSORS
🌡 20.4 °C   💧 53 %
```

Read-only.

---

## 7. ARCHITECTURE RULES

- Room screen owns layout
- Widgets are content-only
- Tokens/primitives only
- Config-driven entities

---

## 8. IMPLEMENTATION ORDER

1. Room header
2. Scenes
3. Lighting grid
4. Light detail view
5. Devices
6. Sensors
7. Documentation update

---

## FINAL NOTE

This spec is final.
