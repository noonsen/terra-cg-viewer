# Terra CG Viewer

A fan-made Arknights CG (event illustration) archive, styled after Arknights' own in-game UI. Browse events by year, open an event to see its episode breakdown, and view CGs full-size in a lightbox.

This is a fan project for learning/showcase purposes only. It is not affiliated with or endorsed by Hypergryph/Yostar. All Arknights artwork is © Hypergryph, sourced and credited per-image — see [docs/fetching-images.md](docs/fetching-images.md).

## Project structure

```text
/
├── src/
│   ├── content/events/       # One .md file per event (frontmatter only, see schema below)
│   ├── content.config.ts     # Zod schema for the "events" content collection
│   ├── assets/events/<slug>/ # Downloaded banner + CG images for each event
│   ├── components/           # EventCardGrid, EpisodeTileGrid, Gallery, CGTile, CGLightbox, ...
│   ├── layouts/               # BaseLayout, EventFrame
│   ├── pages/events/          # index.astro (archive) + [slug].astro (event page)
│   └── styles/global.css      # Theme tokens, animations, view-transition styles
├── scripts/prune-unused-assets.mjs  # Post-build cleanup, see below
├── wrangler.jsonc             # Cloudflare Workers static-assets deploy config
└── .github/workflows/ci.yml   # Build check on push/PR
```

### Content model

Each event is one markdown file under `src/content/events/` with no body, only frontmatter:

- `title`, `releaseDate`, `characters` — basic metadata.
- `cover` *(optional)* — the official event banner shown on the archive grid: `{ image, source, credit }`.
- `theme` — per-event accent colors (`accent`, `accentAlt`, `bg`, `surface`) and label styling, used to tint that event's page.
- `cgs` — array of illustrations for the gallery: `{ image, caption?, source, credit, episode?, episodeTitle?, hero? }`. Can be empty for events that only have a cover so far.

`image` fields accept either a real local asset path (validated and optimized by `astro:assets`) or a placeholder string label for CGs not yet sourced.

## Commands

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server at `localhost:4321` (or `astro dev --background` to run it detached — see `astro dev stop/status/logs`) |
| `pnpm build` | Build to `./dist/`, then prune unreferenced original images (see below) |
| `pnpm preview` | Preview the production build locally |
| `pnpm deploy` | Build, then `wrangler deploy` to Cloudflare Workers |
| `pnpm astro ...` | Run any Astro CLI command |

## Image optimization

`astro:assets` emits both an optimized derivative *and* an untouched copy of every source image as a side effect of how Vite handles static asset imports — the untouched copies are never linked from any page. `scripts/prune-unused-assets.mjs` runs after every build, scans the built HTML/CSS/JS for which `_astro/*` files are actually referenced, and deletes the rest. This cuts a typical build from ~190MB down to ~20MB, which matters both for deploy size/time and for Cloudflare Workers' static-assets limits.

## Deployment

Static build deployed to Cloudflare Workers (`wrangler.jsonc`, `assets.directory: "./dist"`). First-time setup:

```bash
pnpm exec wrangler login
```
```bash
pnpm run deploy
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs `pnpm run build` on every push/PR to `main`. A Husky pre-commit hook ([`.husky/pre-commit`](.husky/pre-commit)) runs the same build locally before each commit.

## Adding a new event

1. Add the event to `src/content/events/<slug>.md` with at least `title`, `releaseDate`, `characters`, and `theme`.
2. Source and download the cover banner + CG illustrations — see [docs/fetching-images.md](docs/fetching-images.md) for the full sourcing workflow, credit convention, and known gotchas (bot-blocking, wrong wiki slugs, etc).
3. `pnpm build` to confirm the schema validates and the new event renders.

## Learn more

[Astro docs](https://docs.astro.build)
