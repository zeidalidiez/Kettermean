# Kettermean

A browser first-person liminal dream walker inspired by *LSD: Dream Emulator*.

Walk rooms that feel slightly wrong. Touch a wall, prop, or strange figure to **link** into another space. Rooms are generated offline from seeds by default; optional Claude / OpenAI-compatible APIs can author room JSON when you provide a key.

## Features

- WebGL first-person movement (Three.js + Vite + TypeScript)
- Seeded continuum or fully randomized dream modes
- Wall / entity **linking** with mood-tinted fades
- Per-room physics quirks (gravity, speed, sway, bounce)
- Keyboard + mouse, gamepad, and touch virtual sticks
- Optional LLM room authoring with **strict cost controls**
- Blood/gore prompt flag (off by default); sexual/obscene content always blocked
- Static build suitable for GitHub Pages (`base: './'`) — Actions not configured yet

## Quick start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

Output lands in `dist/` for manual Pages hosting later.

## LLM cost controls

Kettermean is designed to avoid unnecessary API spend:

| Guard | Behavior |
| --- | --- |
| Offline default | Fully playable with no key and zero network calls |
| Seed cache | Memory + `localStorage` reuse by seed + gore flag |
| Single flight | At most one in-flight generation promise per seed |
| Prefetch depth 1 | Only the *next* room is warmed while you explore |
| Compact prompts | One JSON object, `max_tokens` capped (~900) |
| Fail-open | After a provider error, session falls back to offline |
| No retries | Failed calls do not automatically re-bill |

You should still use spend-limited keys or a proxy. Keys are stored only in your browser `localStorage`.

### Providers

- **Offline procedural only** — default
- **OpenAI-compatible** — `baseUrl` + key + model (official API, OpenRouter, local proxies, etc.)
- **Anthropic Claude** — may require a CORS-friendly proxy from browsers

> Direct browser calls to cloud LLM APIs often hit CORS. Prefer a small proxy or an OpenAI-compatible gateway you control.

## Controls

| Input | Action |
| --- | --- |
| WASD / left stick | Move |
| Mouse / right stick | Look |
| Shift / gamepad B | Sprint |
| Space / gamepad A | Jump |
| Walk into walls/props/entities | Link |
| Esc | Pause |

## Content notes

This is meant to feel **liminal and uncanny**, not like a drug sim and not like gore tourism. Expect empty lobbies, wrong nurseries, fluorescent hum, and the occasional giant baby silhouette — not sexual content, and not constant blood.

## Stack

- Three.js
- TypeScript
- Vite

## License

Private repository for now.
