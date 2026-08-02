# Fetching event images

Workflow for sourcing an event's cover banner and CG illustrations from [arknights.wiki.gg](https://arknights.wiki.gg), based on what actually worked (and didn't) while populating this repo's content.

All art is © Hypergryph. Every downloaded image must carry a credit line (`source` + `credit` fields) — see [Content model](../README.md#content-model). This is a fan project; don't skip crediting.

## 1. Find the correct wiki page slug

Don't guess a slug from the event's display title and fetch blind — wiki.gg slugs frequently diverge from the marketing title:

- **Apostrophes are usually dropped**: `Darknights' Memoir` → wiki slug `Darknights_Memoir`, not `Darknights%27_Memoir`.
- **Name collisions get disambiguated**: `Pinus Sylvestris` alone is the *faction* page; the event is at `Pinus_Sylvestris_(event)`. Same pattern caught us with `Gavial the Great Chief Returns`, whose actual page is `The_Great_Chief_Returns` (the wiki omits the operator's name from the title entirely).
- **Verify with a search first**: `WebSearch` for `site:arknights.wiki.gg "<exact event name>"` and confirm the returned `arknights.wiki.gg/wiki/<Slug>` URL before fetching. It's cheap; a wrong guess costs a full page fetch plus manual cleanup.
- **If the fetched page turns out wrong**, check for the tell rather than assuming success from a 200: `grep -c "noarticletext" page.html` — a MediaWiki "page does not exist" stub still returns HTTP 200 with a normal `<title>`, so http status alone doesn't prove the page is real.

## 2. Fetch the page (and expect intermittent blocking)

The site is Cloudflare-protected and blocks bare `curl` requests inconsistently — sometimes a plain request 200s, sometimes it 403s or serves a "Just a second..." JS-challenge page. What worked:

```bash
curl -sL "https://arknights.wiki.gg/wiki/<Slug>" \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
  -H "Referer: https://www.google.com/" \
  -o page.html -w "%{http_code}"
```

- Always set a real browser `User-Agent` and a `Referer` — bare `curl` UA gets blocked far more often.
- On non-200 (or a challenge page — check for `<title>Just a second...` or `Blocked - wiki.gg`), wait ~6-8s and retry once. It usually succeeds on retry; this isn't a strict rate limit so much as an inconsistent bot check.
- Space requests **at least 4 seconds apart** even when things are going well — hammering it in a tight loop (sub-3s gaps) reliably triggers a run of 403s across *all* subsequent requests, not just the current one.
- `arknights.fandom.com` mirrors the same content and is generally less aggressive about blocking, but its coverage lags — some newer events (e.g. `Here A People Sows`) 404 there but exist on wiki.gg. Prefer wiki.gg for consistency with this repo's existing credit lines; fall back to Fandom only if wiki.gg won't cooperate.

**Do not trust an LLM web-fetch tool (e.g. `WebFetch`) to hand you the exact image URL.** It summarizes/paraphrases page content through a smaller model and will confidently invent plausible-looking URLs (e.g. a `commons.wiki.gg` host that doesn't exist) that 404 when actually requested. Always pull the raw HTML yourself and grep/parse it directly.

## 3. Extract the banner URL

The infobox image lives in a `druid-main-image`/`druid-main-images` block. Grab the `EN_` prefixed banner where present:

```bash
grep -oE 'https://arknights\.wiki\.gg/images/[^"'"'"']*anner[^"'"'"']*\.(png|jpg)' page.html | grep -v thumb | head -1
```

If that comes up empty, the image may be referenced with a relative path (`src="/images/EN_..._banner.png"`) instead of an absolute URL — check the raw HTML around `druid-main-image` and prefix `https://arknights.wiki.gg` manually. A few events (e.g. `Pinus Sylvestris`) don't split banners by region at all and just use a bare filename like `Pinus_Sylvestris.png`.

Verify the URL actually resolves before downloading anything at scale:

```bash
curl -sI "<url>" -A "Mozilla/5.0 ..." -H "Referer: https://www.google.com/" | head -3
```

## 4. Extract the release date (optional, best-effort)

The "Release" infobox section is real server-rendered HTML (not JS-only), but the label and its value sit on separate lines, so a single-line `grep` won't match across the newline — use Node instead:

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('page.html', 'utf-8');
const m = html.match(/druid-data-globaldate druid-data-nonempty\">\s*([0-9]{4}\/[0-9]{2}\/[0-9]{2})/);
console.log(m ? m[1] : '');
"
```

This repo uses the **Global** server's start date for `releaseDate`. Not every page has a `Release` section in this exact shape (e.g. faction/operator pages) — if the section names come back empty, list what's actually on the page:

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('page.html', 'utf-8');
console.log([...new Set([...html.matchAll(/data-druid-section=\"([^\"]+)\"/g)].map(m => m[1]))]);
"
```

Characters and per-episode CG breakdowns are **not** reliably extractable this way — the infobox doesn't structure them consistently across event types, and getting them right needs a human pass over the page (or the `/Gallery` and `/Synopsis` subpages). For a first pass it's fine to ship `characters: []` and `cgs: []` and fill those in later.

## 5. Download and verify

```bash
mkdir -p "src/assets/events/<slug>"
curl -sL "<banner-url>" \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -H "Referer: https://www.google.com/" \
  -o "src/assets/events/<slug>/banner.png" -w "%{http_code}"
```

Always confirm the download is a real image, not an HTML error page saved with a `.png` name:

```bash
file "src/assets/events/<slug>/banner.png"   # should say "PNG image data, 1560 x 500, ..."
```

Batch downloads should retry once on non-200 (same 6-8s backoff as fetching) and stay spaced ~4s apart — same rate-limit behavior as page fetches applies to image URLs too.

## 6. Wire it into the content file

```yaml
---
title: "Event Title"
releaseDate: 2022-02-17
characters: []
cover:
  image: "../../assets/events/<slug>/banner.png"
  source: "arknights.wiki.gg"
  credit: "via arknights.wiki.gg, © Hypergryph"
theme:
  accent: "#B2653B"
  accentAlt: "#BA8530"
  bg: "#181818"
  surface: "#F5EDDC"
  labelFont: "mono"
  motif: "hud"
cgs: []
---
```

The default theme above (matching the site's global CSS fallback) is fine for a first pass; hand-tune `accent`/`accentAlt` later if you want the event to read as visually distinct on its own page.

Run `pnpm build` after adding new entries — it'll fail loudly if the schema or an image path is wrong.

## What to skip rather than guess

If a search doesn't turn up a confirmed `arknights.wiki.gg/wiki/<Slug>` URL after a couple of targeted queries, skip the event rather than fetching a guessed slug — a couple of events sourced from a blurry/stylized screenshot logo (`Aro`, `Come Catastrophe(s) or Wake of Vultures`) never turned up a real page and were left out rather than risk pulling the wrong art under the wrong title.
