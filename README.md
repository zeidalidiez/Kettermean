# Kettermean

A browser-first, first-person liminal dream walker inspired by *LSD: Dream Emulator*.

Walk rooms that feel slightly wrong, then press **R** when you are ready for the next dream. Room changes are explicit rather than proximity-triggered. Every room is playable with the offline procedural director; optional cloud or in-browser models can steer future rooms without owning geometry, placement, or physics.

## Features

- Three.js first-person rooms assembled from a curated all-3D catalog with 2,328 composed furniture, fixture, animal, and NPC variants across 291 multi-variant families, plus the original one-off kit pieces
- Fifteen semantic scene sets keep rooms visually coherent while reserving a small, curated budget for deliberate contradictions
- Nine architecture systems ranging from tight chambers to 128-unit atriums, arenas, concourses, courtyards, causeways, fields, and basins
- Seeded continuum and randomized dream modes
- History-aware novelty across themes, layouts, scene conditions, lighting, shaders, moods, and room contents
- Indoor chambers, vast open halls, and outdoor dreamscapes with procedural skies and horizons
- Explicit next-dream navigation with mood-tinted fades through keyboard, gamepad, and touch input
- Coherent whole-scene blood, slime, scorch, fire, ruin, overgrowth, ice, flood, dust, mold, electricity, haunting, gilding, bioluminescence, and storm modifiers, with gore gated by the player setting
- Per-room gravity, movement, friction, bounce, and sway
- Seeded lighting plus forty-four randomized visual treatments, including soft focus, watercolor, crosshatching, light leaks, embossed relief, aurora curtains, X-ray plates, frosted glass, oil film, datamosh, cellophane refraction, afterimages, moiré, bloom, fractured glass, night vision, rain glass, spectral trails, mosaic, edge glow, underwater caustics, rare kaleidoscope, acid melt, heatwave, negative, halftone, smear, fisheye, thermal, prism, VHS, mirror, tunnel, posterize, duotone, dither, solarize, strobe, and rare wireframe modes
- Five macro-scale profiles spanning utility closets, human rooms, grand halls, monumental spaces, and colossal open skybox environments where the entire object library scales around a tiny player
- Opt-in comfort controls for static lighting and consistently well-lit rooms
- A player flashlight on **F**, gamepad X, and touch, independent of room lighting
- Billboards that interleave model-authored notices with longer tagged procedural notices from a 584-entry semantic lexicon, so neither writing source replaces the other
- Two high-detail expansion rounds contribute 608 props and 304 NPC/animal variants across 114 artisan families, with geometry changes—not palette swaps—between all eight variants in each family
- Every selectable actor and prop is built as 3D geometry; the former prerendered character cutouts are excluded from the catalog and production bundle
- Deliberately cheap low-poly forms and room-scale voxel giants remain as intentional contrasts to the increasingly intricate catalog
- Body-independent face kits that cross-mount animal faces on people, human faces on animals, and both kinds on furniture, fixtures, and other objects
- Keyboard/mouse, gamepad, and complete touch controls
- WebLLM with the lightweight SmolLM2 360M model by default, plus procedural-only, OpenAI-compatible, OpenRouter, and Anthropic options behind AI settings
- Persisted Light, Standard, and Deep AI direction levels with adaptive passes for room language, signs, inhabitants, and strange room rules
- Readiness-gated AI transitions with visible progress, manual retry, and an explicit procedural escape instead of silent provider fallback
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

The active room is always entered immediately. Kettermean never holds a fade or blocks movement while it waits for a provider. In an AI mode, only the transition to the *next* dream waits for validated direction; the player remains free to explore the current room.

1. The deterministic offline director builds the current playable room.
2. While the player explores, the selected provider may steer exactly the next room.
3. In procedural-only mode, **R** (gamepad Y or touch **Next**) advances immediately. In an AI mode, the control displays **forming** until the prefetched room is validated and **ready** when it can be entered.
4. A late provider result is cached for its seed; it never replaces a room underneath the player.
5. If the provider fails, **R** retries the same planned room and **O** explicitly enters its procedural version. Kettermean never labels that escape room as AI-authored.

Cloud models can select semantic room direction including themes, mood, title, blurb, environment, architecture, scale, condition, visual treatment, preferred catalog assets, signs, inhabitants, dialogue, and a strange room rule. Small browser models begin with eight bounded steering values; Standard and Deep depth add tightly delimited language passes whose valid fields can replace procedural text. In every mode, the client owns coordinates, collision-safe placement, required geometry, safety validation, accessibility constraints, and performance budgets. Invalid individual fields are filled procedurally without discarding other usable AI direction.

Recent-room fingerprints actively steer the director away from repeated themes, layouts, conditions, treatments, moods, and assets. Atmospheric dim and pulsing treatments remain part of normal generation, while navigation-heavy kaleidoscope rooms are deliberately rare. The optional **No flashing or pulsing lights** and **No low-light rooms** settings constrain offline, browser-model, and cloud-model rooms locally, so malformed model output and cached rooms cannot bypass them.

### AI depth

AI depth changes how much authorship the selected model attempts, not the procedural room's size, complexity, effects, or available catalog.

| Depth | Browser WebLLM | Cloud / API |
| --- | --- | --- |
| Light | One compact bounded steering pass | One compact room-direction pass |
| Standard | Steering plus one room-language pass | One rich room-direction pass |
| Deep | Steering, room language, then inhabitants/signs/rule | Rich direction plus a focused writing pass |

Every later pass is additive: if it fails, the game retains the valid AI direction from earlier passes and procedurally fills only the missing fields.

The procedural catalog includes dense furniture arrangements, public-space fixtures, emergency and ruin objects, outdoor objects, twenty dedicated high-detail animal families, eighteen high-detail humanoid roles, and the broader legacy catalog. The newer families range from upholstered furniture, scientific instruments, workshop machinery, ritual displays, and medical apparatus to foxes, octopuses, ravens, axolotls, spiders, tortoises, clockmakers, divers, undertakers, and lamplighters. Assets carry semantic scene-set tags—such as transit, clinical, workplace, aquatic, or roadside—so most placements reinforce a room's primary motif. Some rooms also receive one bounded contrast set chosen from curated pairings, creating intentional juxtaposition without turning the scene into unrelated visual noise. Tagged sign words use the same semantic context to produce readable but uncanny names that belong to the current environment. Actors range from articulated, role-equipped people and species-specific animals to intentionally crude low-poly figures and giant voxel apparitions. Catalog metadata remains separate from geometry builders so future families can be added without turning either system into a monolith.

## Cost and lifecycle controls

| Guard | Behavior |
| --- | --- |
| Procedural foundation | Every room remains complete and playable without a key, model download, or successful model response |
| Global single flight | At most one generation runs at a time, even across different seeds |
| Prefetch depth one | Only the exact next transition seed is warmed |
| Explicit failure recovery | Provider failures do not advance silently; **R** retries the planned AI room and **O** deliberately uses its procedural version |
| Provider-aware cache | Cache keys include provider, base URL, model, schema version, seed, and content/comfort flags |
| Request timeout | Cloud calls abort after 90 seconds |
| Session circuit breaker | Repeated provider errors pause automatic calls; a deliberate retry can restart the selected provider |
| Session-only key | API keys use `sessionStorage`, never persistent `localStorage` or the build output |

Use a disposable or spend-limited key. A browser-delivered application cannot protect a provider secret as strongly as a server-side proxy can.

### Providers

- **Offline procedural only** — fully local and available without a model download.
- **Browser model (WebLLM / WebGPU)** — the fresh-install default, with local inference and no API key. AI settings group models into three hardware/direction tiers, with a suggested model at each tier, independently of the Light/Standard/Deep authorship control. AI depth never restricts room scale, scene complexity, effects, or catalog access. Browsers without WebGPU automatically continue with procedural generation for that run.
- **OpenAI-compatible / OpenRouter** — configurable base URL and model; defaults in the UI target OpenRouter and `openrouter/free`.
- **Anthropic Claude** — direct browser calls may require a CORS-capable proxy.

## WebLLM notes

WebLLM runs in a dedicated web worker so model loading and inference do not freeze rendering or input. Loads, model switches, and completions are serialized, and quitting releases the worker and GPU resources.

- WebGPU requires HTTPS or `http://localhost`; a plain LAN-IP URL is not a secure context.
- The first use downloads model weights and compiles GPU shaders. Later loads normally use the browser cache.
- The default 360M model minimizes download, memory, and inference cost. Larger options may make more deliberate choices but require substantially more VRAM and can lose the GPU device on integrated hardware.
- If a model attempt fails, press **R** to retry it or **O** to use one explicitly procedural room. A smaller model can also be selected from the menu for later runs.
- Tiny models receive a deterministic five-theme shortlist and answer with one `KMR` token plus eight digits for theme, mood, anomaly, shader, lighting, tint, density, and wireframe. Kettermean searches for that token inside surrounding junk, fills missing digits from the room seed, and limits the response to 40 tokens with repetition penalties.
- Standard and Deep browser passes use seed-specific response markers for bounded titles, blurbs, signs, dialogue, and room rules. Literal examples, placeholders, and bad individual fields are rejected; accepted text is sanitized before it reaches the HUD. Older field records and JSON remain accepted during the protocol transition.

## Controls

| Input | Action |
| --- | --- |
| WASD / left stick / left touch stick | Move |
| Mouse / right stick / right touch stick | Look |
| Shift / gamepad B / touch Sprint | Sprint |
| Space / gamepad A / touch Jump | Jump |
| R / gamepad Y / touch Next | Enter the next ready dream, or retry after an AI failure |
| O / recovery button | Explicitly use the planned procedural room after an AI failure |
| F / gamepad X / touch Light | Toggle flashlight |
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

Kettermean is released under the [MIT License](LICENSE).

Copyright © 2026 Zeid Diez.
