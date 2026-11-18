# HELIOS APEX

High-speed 3D aerial geometric combat game built with **React**, **TypeScript**, **Three.js**, and **Tailwind CSS**. Runs 100% locally in the browser with no backend, no database, and no API keys required.

## Features

- **Solo Campaign**: 100 sequential levels across 10 sectors and 6 distinct 3D worlds, plus Endless Overdrive.
- **2-Player Local Mode**: Split-keyboard duel on one screen with optional match formats (`1 Round`, `Best of 3`, `Best of 5`, `Endless`).
- **vs AI Mode**: Autonomous rival pilot with selectable difficulty levels.
- **Interactive 3D Garage**: Auto-spinning 3D turntable inspection (`Drag` to orbit, `Scroll` to zoom), 16 aircraft shapes, custom armor paints, special moves, and split-screen dual garage in 2P / vs AI modes.
- **Coin & Progression System**: Gold, Silver, and Copper coins plus unlocked aircraft and moves saved locally in browser `localStorage`.

---

## Quick Start (After Downloading or Cloning)

### Option A — One-Click Launcher
- **Windows**: Double-click `play.bat`
- **macOS / Linux**: Run `./play.sh` (make executable once with `chmod +x play.sh` if needed)

The launcher installs packages on first run (if Node.js is installed), starts the dev server, and opens **`http://localhost:3000`**.

### Option B — Terminal / VS Code
Requires **Node.js 20.19+** (or **v22 LTS**):

```bash
npm install
npm run dev
```

Then open **`http://localhost:3000`** in any WebGL-capable browser (Chrome, Edge, Firefox, Safari).

> **Note:** No `.env` file or API key is needed. You can ignore `.env.example`.

---

## Controls

| Action | Player 1 (Solo / Duo) | Player 2 (2P Mode) |
| --- | --- | --- |
| Move | `W` `A` `S` `D` (or Arrow keys in Solo) | Arrow Keys |
| Boost | `Left Shift` | `Right Shift` |
| Barrel Roll | `E` | `/` |
| Homing Missiles | `M` / `Space` | `Enter` |
| Weapons (Solo) | `1` Plasma · `2` Spread · `3` Beam | — |
| Camera (Solo) | `C` | — |
| Pause | `Esc` / `P` | — |

---

## Scripts

- `npm run dev` — Start local dev server on port `3000`
- `npm run build` — Build production bundle to `dist/`
- `npm run preview` — Preview the production build locally
- `npm run lint` — TypeScript type check (`tsc --noEmit`)

## GitHub Pages Deployment

A workflow is included at `.github/workflows/deploy.yml`. After pushing to GitHub, enable **Settings → Pages → Source: GitHub Actions** to publish a live playable link automatically.
