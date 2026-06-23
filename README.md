# TinyPic Image Compressor

Figma plugin for compressing and exporting selected frames as PNG, JPG, WebP, SVG, or PDF. All processing runs locally — no uploads to external servers, no analytics, no tracking.

[Open in Figma Community](https://www.figma.com/community/plugin/1612595698368227712)

## Features

- Batch export multiple frames at once
- Per-format compression presets (PNG quantization, JPG quality, WebP quality/lossless, SVG optimization)
- Adjustable export scales
- Customizable filename templates with tokens (name, page, scale, dimensions, date)
- Folder structure preserved from frame names (e.g. `section/icon`)
- Reusable export profiles
- Export as ZIP or to a local directory

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
- [jSquash WebP](https://github.com/jamsinclair/jSquash) — WebP encoding
- [SVGO](https://github.com/nicolo-ribaudo/svgo) — SVG optimization
- [Vite](https://vitejs.dev/) — UI bundling with WASM support

## License

This project is licensed under the Creative Commons Attribution-NonCommercial
4.0 International License (CC BY-NC 4.0). See [LICENSE](LICENSE) for the full license text.
