# TinyPic Image Compressor

Figma plugin for compressing and exporting selected frames as PNG, JPG, WebP, SVG, or PDF. All processing runs locally — no uploads to external servers, no analytics, no tracking.

## Features

- Batch export multiple frames at once
- Per-format compression presets (PNG quantization, JPG quality, SVG optimization)
- Adjustable export scales
- Customizable filename templates with tokens (name, page, scale, dimensions, date)
- Folder structure preserved from frame names (e.g. `section/icon`)
- Reusable export profiles
- Export as ZIP or to a local directory

## Getting Started

### Install dependencies

```
npm install
```

### Build

```
npm run build
```

This produces the `dist/` folder with `code.js` and `ui.html`.

### Load in Figma

1. Open Figma → Plugins → Development → Import plugin from manifest
2. Select `manifest.json` from this project
3. Run the plugin on any page with selected frames

### Development

```
npm run dev
```

Starts Vite dev server for the UI. Plugin code (`src/code.js`) is rebuilt with `npm run build`.

## Project Structure

```
src/code.js       — Plugin sandbox (Figma API, frame export, compression)
src/main.js       — UI logic (settings, profiles, export controls)
index.html        — UI entry point
manifest.json     — Figma plugin manifest
publish/          — Community listing metadata
```

## Tech Stack

- [libimagequant-wasm](https://github.com/nicolo-ribaudo/libimagequant-wasm) — PNG color quantization
- [oxipng](https://github.com/nicolo-ribaudo/oxipng-wasm) — PNG optimization
- [SVGO](https://github.com/nicolo-ribaudo/svgo) — SVG optimization
- [Vite](https://vitejs.dev/) — UI bundling with WASM support

## License

ISC
