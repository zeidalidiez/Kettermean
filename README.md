# Kettermean

A browser-first, first-person liminal dream walker inspired by *LSD: Dream Emulator*.

Walk rooms that feel slightly wrong. Pass through a marked door to link into another seeded space. Every room is playable with the offline procedural director; optional cloud or in-browser models can steer future rooms without owning geometry or physics.

## Features

- Three.js first-person rooms assembled from a curated prop kit, including 240 additional composed prop and NPC variants
- Seeded continuum and randomized dream modes
- History-aware novelty across themes, layouts, lighting, shaders, moods, and room contents
- Indoor chambers, vast open halls, and outdoor dreamscapes with procedural skies and horizons
- Door-only room links with mood-tinted fades and fog-independent exit beacons
- Per-room gravity, movement, friction, bounce, and sway
- Seeded lighting, tint, retro, dream, noir, CRT, and wireframe treatments
- Keyboard/mouse, gamepad, and complete touch controls
- Optional OpenAI-compatible, OpenRouter, Anthropic, and WebLLM providers
- Provider-scoped room cache and strict one-request-at-a-time generation
- Content sanitization at every LLM-to-HUD boundary
- Static Vite build and GitHub Pages workflow

## Local development

Use Node.js 20.19 or newer (Node 24 is used in CI).

```bash
npm ci
npm run dev
```

The full local verification command is:

```bash
npm run check
```

It runs TypeScript, ESLint, Vitest, and the production build. Other useful commands are `npm test`, `npm run test:watch`, and `npm run preview`.

## How room generation works

The active room is always entered immediately. Kettermean never holds a fade or blocks movement while it waits for a provider.

1. The deterministic offline director builds the current playable room.
2. While the player explores, the selected provider may steer exactly the next room.
3. At a door, Kettermean uses the completed prefetched room when available or the deterministic offline room otherwise.
4. A late provider result is cached for its seed; it never replaces a room underneath the player.

Cloud models can select themes, mood, title, blurb, and preferred catalog assets. The much smaller browser models only choose eight bounded steering values. In both modes, the client owns titles when needed, layout, placement, collision, density, doors, lighting, visual effects, safety validation, and performance budgets. Recent-room fingerprints actively steer the director away from repeated themes, layouts, treatments, moods, and assets.

The procedural catalog includes furniture, public-space fixtures, outdoor objects, and ten richer humanoid families. NPCs use composed heads, faces, torsos, limbs, clothing, profession-specific accessories, and lightweight gait/idle animation rather than placeholder cylinders.

## Cost and lifecycle controls

| Guard | Behavior |
| --- | --- |
| Offline default | No key, model download, or network request |
| Global single flight | At most one generation runs at a time, even across different seeds |
| Prefetch depth one | Only the exact next transition seed is warmed |
| No automatic retry | Invalid cloud fields fall back procedurally for that seed; malformed browser output becomes a complete procedural steering code without disabling later model calls |
| Provider-aware cache | Cache keys include provider, base URL, model, schema version, seed, and gore flag |
| Request timeout | Cloud calls abort after 90 seconds |
| Session fail-open | Repeated provider errors stop further calls and keep the dream offline |
| Session-only key | API keys use `sessionStorage`, never persistent `localStorage` or the build output |

Use a disposable or spend-limited key. A browser-delivered application cannot protect a provider secret as strongly as a server-side proxy can.

### Providers

- **Offline procedural only** — default and fully local.
- **Browser model (WebLLM / WebGPU)** — local inference with no API key. The default is the lightweight `SmolLM2-360M-Instruct-q4f16_1-MLC`; a 1.5B option remains available for machines that can comfortably run it.
- **OpenAI-compatible / OpenRouter** — configurable base URL and model; defaults in the UI target OpenRouter and `openrouter/free`.
- **Anthropic Claude** — direct browser calls may require a CORS-capable proxy.

## WebLLM notes

WebLLM runs in a dedicated web worker so model loading and inference do not freeze rendering or input. Loads, model switches, and completions are serialized, and quitting releases the worker and GPU resources.

- WebGPU requires HTTPS or `http://localhost`; a plain LAN-IP URL is not a secure context.
- The first use downloads model weights and compiles GPU shaders. Later loads normally use the browser cache.
- The default 360M model minimizes download, memory, and inference cost. Larger options may make more deliberate choices but require substantially more VRAM and can lose the GPU device on integrated hardware.
- If a model fails, return to the menu and choose a smaller model. Gameplay remains available offline.
- Tiny models receive a deterministic five-theme shortlist and answer with one `KMR` token plus eight digits for theme, mood, anomaly, shader, lighting, tint, density, and wireframe. Kettermean searches for that token inside surrounding junk, fills missing digits from the room seed, and limits the response to 40 tokens with repetition penalties.
- Titles and blurbs stay procedural in browser mode, so weak model prose never reaches the HUD. Older field records and JSON remain accepted during the protocol transition.

## Controls

| Input | Action |
| --- | --- |
| WASD / left stick / left touch stick | Move |
| Mouse / right stick / right touch stick | Look |
| Shift / gamepad B / touch Sprint | Sprint |
| Space / gamepad A / touch Jump | Jump |
| Walk into a marked door | Link rooms |
| Escape / gamepad Menu / touch pause | Pause |

The setup menu permits normal touch scrolling and browser zoom. Gameplay input disables page gestures only over the canvas and touch controls.

## Content policy

Mild blood/gore can be included in prompts only when explicitly enabled. Sexual and obscene display content is always rejected. Provider text is treated as untrusted input, and the final room assembly sanitizes titles, blurbs, tags, and labels before they can reach the HUD.

## GitHub Pages

The Vite build uses relative asset paths. To publish, enable **Settings → Pages → Source: GitHub Actions** in the repository. Pushes to `main` then run `.github/workflows/pages.yml`; all branches and pull requests run `.github/workflows/ci.yml`.

## Stack

- Three.js
- TypeScript
- Vite
- WebLLM
- Vitest and ESLint

## License

Private repository for now.
