# Security & privacy

Anywhere City Web is a **100% client-side** browser game. There is no backend, no accounts, and no analytics SDK in this repository.

## What leaves your browser

**Nothing by default.** The deployed static site does not phone home. Network use is limited to loading the app bundle and assets from the host (e.g. Netlify CDN).

## Local storage

| Storage | Key / DB | Contents |
| --- | --- | --- |
| `localStorage` | `anywhere-city-presets` | Vehicle handling, weapon tuning, asset transform presets (Zustand persist) |
| IndexedDB | `anywhere-city` | User-uploaded GLB models, PNG tile textures, imported Tiled maps |

This data stays on **your device** unless you explicitly export a preset JSON from Settings.

## Import / export

- **Preset bundles** (`anywhere-city-presets.json`) are JSON files you choose to download or upload. Only import files from sources you trust; malformed files may break local settings (they cannot affect other players).
- **Tiled maps** (`.tmj`) are parsed locally; they are not sent to any server.

## Repository hygiene

Before publishing or forking, confirm you have not added:

- `.env` files with API keys
- Personal paths, emails, or credentials in JSON or comments
- Custom assets you do not have rights to redistribute

This repo ships only procedural defaults and placeholder geometry—no third-party secrets.

## Reporting issues

If you find a security concern in this project, open a GitHub issue or contact the maintainer privately.
