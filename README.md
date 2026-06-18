# ConfigR

A microsite that generates crisp QR-code phone wallpapers with shader backgrounds for
Config attendees. Pick a phone size, choose a shader-driven background, drop in a URL, tweak
within tasteful bounds (or hit **Randomize**), and export a PNG at your phone's native
resolution. Everything runs client-side — no backend, no accounts.

## Features

- **Shader "variety pack"** — Mesh, Warp, Grain, Cells, Liquid, Spiral backgrounds via
  [`@paper-design/shaders-react`](https://github.com/paper-design/shaders).
- **Bounded tweaking** — curated palettes + a few clamped sliders per shader. Every option is
  defined in `src/shaders/registry.ts`, so results always stay tasteful.
- **Randomize** — rolls a new shader / palette / params strictly within those bounds.
- **Adaptive QR color** — the QR auto-picks a contrasting color + backing plate based on the
  shader behind it, or you can set the color manually.
- **Device presets** — iPhone, Samsung, Pixel, and a default 9:16, exported at native px.
- **Crisp PNG export** — the shader is re-rendered at full device resolution off-screen and
  the QR is composited at full size (never upscaled), frozen on the frame you see (WYSIWYG).

## Develop

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## Architecture

| Area | File |
| --- | --- |
| App state (reducer + context, Randomize) | `src/state/store.tsx` |
| Shader registry / bounds (constraint system) | `src/shaders/registry.ts` |
| Device resolutions | `src/devices/presets.ts` |
| Live preview + luminance sampling | `src/components/PhonePreview.tsx` |
| QR overlay (preview) | `src/components/QrLayer.tsx` |
| Controls UI | `src/components/Controls.tsx` |
| Adaptive QR coloring | `src/lib/qrColor.ts` |
| QR generation + canvas helpers | `src/lib/qr.ts` |
| Full-res export pipeline | `src/export/renderWallpaper.ts` |

## Deploy

Static site — `npm run build` outputs `dist/`, deployable to Vercel, Netlify, GitHub Pages,
or any static host.
