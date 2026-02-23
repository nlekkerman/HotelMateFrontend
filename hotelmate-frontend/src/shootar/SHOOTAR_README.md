# ShootAR — Mobile Web Shooter Prototype

## Overview

ShootAR is a fully isolated experimental game module integrated into the HotelMate frontend. It runs as a mobile-first AR-style shooter using the device camera as a background with a Three.js overlay rendering enemy targets.

**Route:** `/shootar`

---

## Architecture

```
src/shootar/
  ShootARPage.jsx    ← Top-level fullscreen page (fixed position, 100vw×100vh)
  CameraLayer.jsx    ← getUserMedia rear camera feed as background
  ThreeLayer.jsx     ← Transparent Three.js canvas overlay (scene, camera, rAF loop)
  HUD.jsx            ← Crosshair, FIRE button, score, health, game-over overlay
  GameEngine.js      ← Score, health, damage cooldown, game-over logic
  EnemyManager.js    ← Spawns/moves/destroys/respawns enemy meshes
  config.js          ← All tunable game constants
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React | UI components |
| React Router | `/shootar` route |
| Three.js | 3D rendering (transparent canvas overlay) |
| getUserMedia | Device camera feed |
| DeviceOrientation API | Gyroscope-based camera rotation on mobile |

---

## How It Works

### Layers (bottom → top)

1. **CameraLayer** — Live camera feed (`<video>` element, fullscreen, `object-fit: cover`)
2. **ThreeLayer** — Transparent Three.js canvas; renders enemies, handles orientation & shooting
3. **HUD** — SVG crosshair, score/HP text, FIRE button, game-over overlay

### Enemy Behavior

- **8 enemies** spawn at random bearings (360°) around the player at distance 30–60 units
- **Type:** sphere only (random colors)
- **Movement:** enemies drift laterally/vertically (hover effect) and slowly approach the player
- **Persistence:** enemies exist in world space — they persist when off-screen and reappear when the player looks back
- **Respawn:** destroyed enemies respawn at a new random position after 2 seconds

### Player Controls

- **Look around:** Device gyroscope (mobile) or touch/mouse drag (desktop fallback)
- **Shoot:** FIRE button (bottom-right) — raycasts from camera center forward
- **Hit detection:** Raycast intersects enemy meshes; hit → destroy + score

### Damage & Game Over

- Enemies reaching minimum distance (3 units) deal 20 damage per tick (1s cooldown per enemy)
- HP reaches 0 → game-over overlay with final score + RESTART button
- Restart fully remounts the Three.js scene and respawns all enemies

---

## Configuration (`config.js`)

| Constant | Default | Description |
|---|---|---|
| `ENEMY_COUNT` | 8 | Number of active enemies |
| `SPAWN_RADIUS_MIN/MAX` | 30 / 60 | Spawn distance range |
| `APPROACH_SPEED` | 0.02 | Units per frame toward player |
| `DRIFT_AMPLITUDE` | 0.03 | Lateral/vertical drift size |
| `ENEMY_DAMAGE_DISTANCE` | 3 | Distance at which enemies deal damage |
| `DAMAGE_PER_HIT` | 20 | HP removed per damage tick |
| `SCORE_PER_KILL` | 100 | Points per enemy destroyed |
| `MAX_HEALTH` | 100 | Starting player health |
| `RESPAWN_DELAY` | 2000 | ms before destroyed enemy respawns |
| `HIT_THRESHOLD` | 1.8 | Raycast hit radius |

---

## Integration

- **Route added** in `App.jsx` before catch-all routes: `<Route path="/shootar" element={<ShootARPage />} />`
- **Import added** in `App.jsx`: `import ShootARPage from "@/shootar/ShootARPage.jsx"`
- **Dependency added:** `three` (installed via `npm install three`)
- **Zero impact** on existing routes, layouts, or styles — the page uses `position: fixed` with `z-index: 99999`

---

## Camera Permissions

- Requests rear-facing camera via `getUserMedia({ video: { facingMode: "environment" } })`
- If denied or unavailable, displays a message on a black background — the game still functions normally

---

## Running

```bash
cd hotelmate-frontend
npm install
npm run dev
# Navigate to http://localhost:5173/shootar
```

Best experienced on a mobile device with gyroscope support.
