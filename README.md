# AEROPODS X — Interactive 3D Product Showcase

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://temporary-agile-banyan-un6a88z.vercel.app)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

An original, fictional 2026 consumer-technology wireless audio system designed specifically for interactive 3D web presentation.

---

## 🎧 Concept & Industrial Design

**AeroPods X** breaks away from conventional cylindrical clones with an aerodynamic, computational fluid dynamics (CFD) inspired form factor:
- **Asymmetric Sculpted Charging Case**: Custom-contoured lozenge geometry featuring lateral brushed titanium fluting and an ergonomic front thumb scoop.
- **Dynamic Front OLED Telemetry Pill**: Curved glanceable OLED matrix display rendering real-time battery percentages, active DSP noise cancellation profile, and animated audio equalizer waveform bars.
- **Swept Blade Airfoil Earbuds**: Earbuds designed with an aerodynamic blade-wing profile, 38° forward acoustic canal angle, soft dual-flange silicone ear tips, and longitudinal titanium capacitive touch ribbons.
- **Precision Mechanical Hinge**: Authentic dual-knuckle titanium barrel hinge enabling smooth articulation from 0° (closed) to 97° (fully open).

> Complete design documentation is available in [MODEL_DESIGN.md](./MODEL_DESIGN.md).

---

## ⚡ Interactive Features

- **Articulated Lid Open/Close**: Realistically rotates around the physical hinge axle with synchronized tactile sound effects via Web Audio API.
- **Inspect / Undock Mode**: Earbuds smoothly elevate vertically out of their magnetic docking bays and splay outward for 360° inspection.
- **3D Hotspot Annotations**:
  1. **Hotspot 1 — Adaptive Noise Cancellation (ANC)**: Pinned to the top feedforward micro-mesh vent.
  2. **Hotspot 2 — 40-Hour Dual-Cell Battery**: Pinned to the internal graphene power core and gold pogo pin array.
  3. **Hotspot 3 — Smart OLED Status Pill**: Pinned to the front dynamic telemetry display.
- **Camera Presets**: Smooth camera tweening between **3/4 Hero**, **Case Open**, **Earbud Macro**, **Hinge & Port**, and **Top Flat**.
- **Material Finish Switcher**:
  - **Obsidian Stealth**: Deep graphite matte + gunmetal titanium + electric cyan accent.
  - **Titanium Nebula**: Aerospace brushed silver + deep indigo + solar amber accent.
  - **Cyber Carbon**: Forged dark green carbon + anodized cyber titanium + neon emerald accent.
- **Tactile Web Audio Synthesizer**: Self-contained procedural acoustic feedback (magnetic latch release, lid thud, interface chimes) without external audio files.

---

## 🛠️ Project Structure

```
├── MODEL_DESIGN.md          # Full industrial design & 3D architecture specification
├── index.html               # Semantic HTML5 showcase structure & glassmorphic UI
├── package.json             # Scripts & Three.js dependencies
├── render.yaml              # Render static site deployment blueprint
├── vercel.json              # Vercel production build & routing config
└── src/
    ├── main.js              # Three.js scene, studio lighting, OrbitControls & camera tweens
    ├── style.css            # Luxury dark mode glassmorphism & responsive styles
    ├── audio/
    │   └── soundEffects.js  # Web Audio API mechanical sound synthesizer
    └── model/
        ├── AeroPodsModel.js # 100% procedural 3D model generator & animation logic
        └── displayTexture.js# Canvas dynamic texture for OLED telemetry pill
```

---

## 🚀 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build for production
npm run build
```

---

## 🌐 Deployment

### Deploy on Vercel
1. Import this repository into [Vercel](https://vercel.com/new).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Click **Deploy**!

### Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New** → **Static Site** (or **Blueprint** using `render.yaml`).
3. Connect `https://github.com/pasta-07/Pasta-Pods`.
4. Render will automatically apply the settings from [`render.yaml`](./render.yaml):
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
5. Click **Create Static Site**!
