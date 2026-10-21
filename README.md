# MA3NA

>.Mapping Morocco's economic connections

MA3NA (معنى — *meaning*) maps how Moroccan **listed issuers**, **AMMC sectors**, **official index
levels** and **dated Bourse and AMMC records** connect to one another, using only data the
sources actually publish.

It is a frontend-only application with **no backend, no database and no external API at
runtime**. Every figure on screen comes from a cached JSON snapshot written by a data pipeline
that reads the official sources. Nothing is generated, interpolated or estimated. Where a value
is not published, MA3NA renders an explicit unavailable state instead of a plausible number.

---

## Contents

- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Data](#data)
- [Sources](#sources)
- [What is in the dataset](#what-is-in-the-dataset)
- [Data model](#data-model)
- [Routes](#routes)
- [The economic graph](#the-economic-graph)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Design system](#design-system)
- [Adding data](#adding-data)
- [Deployment](#deployment)
- [Verification](#verification)
- [Tech stack](#tech-stack)
- [Known limitations](#known-limitations)
- [Disclaimer](#disclaimer)

---

## Quick start

Requires **Node.js >= 20.9**.

```bash
npm install
npm run fetch-data   # writes the cached snapshots into ./data
npm run dev
```

Open <http://localhost:3000>.

Production build:

```bash
npm run build
npm start
```

> `fetch-data` needs outbound HTTPS. On machines whose Node CA bundle is incomplete, run it
> with `NODE_EXTRA_CA_CERTS` pointing at your system roots, or set `HTTPS_PROXY` to a
> certificate-intercepting proxy you trust.

---

## Scripts

| Script              | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `npm run fetch-data` | Retrieve and validate the official snapshots into `./data`   |
| `npm run dev`       | Start the Turbopack dev server                                |
| `npm run build`     | Production build with type checking and prerendering         |
| `npm start`         | Serve the production build                                    |
| `npm run lint`      | ESLint 9 flat config (`eslint-config-next`)                   |
| `npm run typecheck` | `tsc --noEmit`                                                |

> **ESLint version note.** ESLint is pinned to `9.x` on purpose. `eslint-config-next@16.3.8`
> bundles `eslint-plugin-react`, which crashes on ESLint 10
> (`contextOrFilename.getFilename is not a function`). `9.39.5` is the newest version the
> current Next.js config actually supports, despite npm marking 9.x as unsupported.

---

## Data

`data/` holds the cached output of the pipeline and **is committed to the repository**, so the
application runs with no network access. Each snapshot is a JSON envelope:

```jsonc
{
  "version": 1,
  "status": "VALID",
  "quality": { "status": "VALID", "issues": [], "rejected": 0 },
  "source": "Bourse de Casablanca",
  "sourceUrl": "https://www.casablanca-bourse.com/en/market-data/Cours",
  "retrieved_at": "2026-09-30T19:43:34.851Z",
  "period_start": "2023-10-02",
  "period_end": "2026-09-30",
  "notes": "Free historical depth is the exchange-stated maximum of three years…",
  "data": { "observations": [] }
}
```

Two independent trust levels run through the app:

| Level             | Meaning                                                         |
| ----------------- | --------------------------------------------------------------- |
| `VALID` / `WARNING` / `ERROR` | record-level validation of a cached file, from the pipeline |
| `REAL` / `DERIVED` / `UNAVAILABLE` | trust of a single figure shown in the UI              |

`REAL` means the source published it as-is. `DERIVED` means MA3NA computed it from `REAL`
observations and states the method and the observation count next to it. `UNAVAILABLE` means the
source did not publish it — the UI renders that word, never a substitute value.

The pipeline preserves **non-trading sessions as gaps** rather than interpolating across them,
and rejects malformed records with a recorded reason instead of coercing them.

---

## Sources

| Dataset                    | Source                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| Listed instruments, prices, capitalisation, volume | [Casablanca Bourse — Cours](https://www.casablanca-bourse.com/en/market-data/Cours) |
| Official index levels      | [Casablanca Bourse — Indices](https://www.casablanca-bourse.com/en/market-data/Indices) |
| Official bulletins         | [Casablanca Bourse — Actualités](https://www.casablanca-bourse.com/en/actualites) |
| Issuer register and sector classification | [AMMC — Registre des émetteurs](https://www.ammc.ma) |
| Dated issuer publications  | [AMMC — Publications](https://www.ammc.ma) |

No source is scraped through a proxy, mirror or third-party aggregator. Where a source
publishes a free limit — the exchange states three years of free daily history — the pipeline
records that limit in the snapshot notes rather than quietly requesting more.

---

## What is in the dataset

Current cached counts, from `data/manifest.json`:

| Figure                        | Count |
| ----------------------------- | ----- |
| Listed equities with history  | 81    |
| Official index levels cached  | 32    |
| Issuers in the AMMC register  | 183   |
| Issuers matched to a listed ticker | 67 |
| Dated issuer publications     | 10    |
| Dated official bulletins      | 20    |
| Daily observations            | 57,124 |

The registry exposes **81 companies, 16 sectors, 32 indices and 30 records**, connected by
**67 `classified_in`** relations and **18 `published_by`** relations.

---

## Data model

Four node types share one id space, so relations are plain `{ from, to }` pairs.

```ts
type NodeType = 'company' | 'sector' | 'index' | 'event';

type RelationBasis = 'VERIFIED' | 'DERIVED' | 'INFERRED';

interface RegistryNode {
  id: string;          // eq:TICKER | sec:slug | ix:CODE | evt:source:slug
  type: NodeType;
  label: string;
  sublabel: string;
  href: string;
  status: 'REAL' | 'DERIVED' | 'UNAVAILABLE';
  provenance: Provenance;
  code: string | null; // ticker or official index code
}

interface RegistryRelation {
  from: string;
  to: string;
  kind: 'classified_in' | 'published_by';
  basis: RelationBasis;
  source: string;
  sourceUrl: string;
  date: string | null;
  method: string;
  value: number | null; // disclosed strength, when the calculation yields one
}
```

| Relation         | Meaning                                                                | Basis |
| ---------------- | ---------------------------------------------------------------------- | ----- |
| `classified_in`  | The AMMC issuer register places this issuer in this sector            | `VERIFIED` |
| `published_by`   | A dated record's own document names this ticker                        | `VERIFIED` |

There is deliberately **no relation to a commodity, country or index**. No source used here
publishes an index constituent list, an exposure weight or a supply-chain link, so those edges
do not exist rather than being guessed.

Everything else in the app is computed from those snapshots:

- `getCompanySummaries()` — the issuer table: latest published close, capitalisation, volume,
  turnover, plus derived return, volatility, drawdown and 52-week range over the cached window
- `getSectorSummaries()` — equal-weighted mean member session change and summed capitalisation,
  both labelled `DERIVED` with the member count stated
- `getEvents()` — dated records with their documents and the tickers those documents name
- `getSeries()` — the published sessions for one ticker, as stored
- `getCorrelatedPeers()` / `getPairCorrelation()` — Pearson correlation of daily returns across
  shared sessions, returned with `n`

---

## Routes

| Route                 | Rendering | Contents                                                                     |
| --------------------- | --------- | ---------------------------------------------------------------------------- |
| `/`                   | Static    | Hero with dataset counts, the interactive graph, market snapshot, movers     |
| `/market`             | Static    | Official index levels, sector composition, breadth, most-traded by turnover  |
| `/companies`          | Static    | Searchable, sortable issuer table with sparklines and sector filter         |
| `/companies/[ticker]` | SSG       | Price and volume history, metrics, relations, records, correlated peers      |
| `/sectors`            | Static    | Sector composition grid                                                      |
| `/sectors/[slug]`     | SSG       | Member issuers, sector network, dated records                               |
| `/events`             | Static    | Year, kind and text filters over a dated chronology                          |
| `/events/[slug]`      | SSG       | Documents, source, connected issuers, sibling records                        |
| `/simulator`          | Static    | Pairwise correlation explorer over two cached series                        |
| `/api/data`           | Dynamic   | JSON pass-through of the cached snapshots, for client components             |

Unknown routes render the custom `not-found` page.

---

## The economic graph

The graph is laid out deterministically rather than force-simulated, so the same entity always
appears in the same place on every render.

### What it opens on

The graph opens on the **AMMC sector ring**: sixteen sectors, nothing else. That is the largest
scope whose labels stay readable in one viewport. Selecting a sector expands to its listed
members; searching reaches any issuer, index or record on its own.

An earlier build opened on the entire registry. That produced 159 nodes — including 32 index
levels with no published relation to anything and 26 records attached to no issuer — so every
label rendered too small to read. The scope was narrowed to the official classification spine
and its neighbourhood.

Index levels and dated records therefore appear **disconnected** when you reach them by search,
and MA3NA says why in the detail panel instead of drawing an invented edge.

### Layout algorithm

`src/lib/graph/layout.ts` places entities on an **anisotropic radial** arrangement:

1. Entities are grouped by type and ordered **sectors → companies → indices and records**.
2. Each type occupies a band of concentric rings. A scope containing a single sector uses that
   sector as the centre rather than putting it on a ring, and the diagram is recentred on it.
3. Positions are scaled by `LAYOUT_SQUASH` (`0.52`) on the vertical axis, because typical
   monitors are far wider than they are tall.
4. Overlap is resolved using **exact axis-aligned bounding boxes** that match the rendered node
   dimensions, expanding rings outward only as far as necessary.
5. A seeded `mulberry32` PRNG supplies small angular jitter, keeping the result stable across
   server and client. It positions nodes; it never produces a value.

The result is measured, not assumed: **zero overlapping node boxes** at the sector ring and at a
single-sector neighbourhood.

### Embedding the graph

```tsx
import { EconomicGraph } from '@/components/graph/EconomicGraph';

// Opens on the sector ring
<EconomicGraph height="h-[560px]" />

// Locked to one entity's neighbourhood, as used on detail pages
<EconomicGraph rootId="sec:mines" depth={1} height="h-[540px]" />
```

| Prop           | Type                    | Default     | Purpose                                       |
| -------------- | ----------------------- | ----------- | --------------------------------------------- |
| `rootId`       | `string`                | –           | Lock the graph to a neighbourhood of an entity |
| `depth`        | `1 \| 2`                | –           | Locked traversal depth                         |
| `initialRoot`  | `string`                | –           | Opening selection when not locked              |
| `initialDepth` | `0 \| 1 \| 2`           | `1`         | Starting depth for an unlocked graph           |
| `height`       | `string`                | `h-[600px]` | Any Tailwind height class                      |
| `compact`      | `boolean`               | `false`     | Trim chrome for dense layouts                  |
| `showPanel`    | `boolean`               | `true`      | Render the entity detail drawer                |

---

## Keyboard shortcuts

| Shortcut            | Action                                                  |
| ------------------- | ------------------------------------------------------- |
| `Cmd/Ctrl + K`      | Open the global command palette                         |
| `↑` / `↓`           | Move through palette results                            |
| `Enter`             | Open the highlighted result                             |
| `Escape`            | Close the palette / clear graph selection               |
| `/`                 | Focus the in-graph entity search (when a graph is unlocked) |

Text inputs are excluded from the `/` shortcut so typing never triggers a search.

---

## Architecture

The snapshots live on disk and are read with `node:fs`, which a browser bundle cannot include.
The data layer is therefore split into two halves that share one set of shapes:

```
             ┌──────────────────────────────┐
server  ─────►  lib/data/index.ts           │  reads ./data via node:fs
             │  lib/data/snapshot.ts        │  cache loaders
             │  lib/data/registry.ts        │  nodes + relations
             └──────────────┬───────────────┘
                            │  JSON pass-through
                    ┌───────▼────────┐
                    │ /api/data      │  Next.js route handler
                    └───────┬────────┘
client   ───────────────────►└─► lib/data/client.ts  browser-side loaders
```

| Module                       | Runs on | Contents                                                |
| ---------------------------- | ------- | ------------------------------------------------------- |
| `lib/data/shapes.ts`        | both    | `Registry`, `CompanySummary`, `Observation`, `Figure`   |
| `lib/data/provenance.ts`    | both    | `Provenance`, `DataStatus`, `provenanceOf()`             |
| `lib/data/metrics.ts`       | both    | `totalReturn`, `volatility`, `maxDrawdown`, `correlation` |
| `lib/data/snapshot.ts`      | server  | `node:fs` loaders                                       |
| `lib/data/registry.ts`      | server  | `getRegistry()`, `getSeries()`                          |
| `lib/data/index.ts`         | server  | `getCompanySummaries()`, `getEvents()`, `getMovers()`   |
| `lib/data/client.ts`        | client  | the same function names over `fetch('/api/data')`        |
| `lib/data/use-series.ts`    | client  | `useSeries`, `useSparkline`, `usePairCorrelation`        |

Server components import `@/lib/data` directly. Client components import `@/lib/data/client`,
which reads the identical cached snapshots over HTTP. Both return the same values, so there is
one source of truth and one place where provenance is decided.

---

## Project structure

```
src/
├── app/
│   ├── api/data/route.ts            # JSON surface over the cached snapshots
│   ├── page.tsx                     # home / Explore
│   ├── market/                      # market board (+ loading skeleton)
│   ├── companies/
│   │   ├── page.tsx                 # directory
│   │   └── [ticker]/page.tsx        # issuer detail
│   ├── sectors/
│   │   ├── page.tsx                 # directory
│   │   └── [slug]/page.tsx          # detail
│   ├── events/
│   │   ├── page.tsx                 # chronology
│   │   └── [slug]/page.tsx          # record detail
│   ├── simulator/page.tsx           # correlation explorer
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── globals.css                  # design tokens + base layer
│   └── layout.tsx                   # fonts, providers, theme script, skip link
├── components/
│   ├── charts/                      # Charts, Sparkline (Recharts)
│   ├── companies/                   # CompanyTable, CompanyPanels
│   ├── events/                      # EventTimeline, EventPanels
│   ├── graph/                       # EconomicGraph, nodes, GraphLegend, EntityDetail
│   ├── layout/                      # SiteHeader, SiteFooter, RegistryStats
│   ├── market/                      # MarketPanels, MarketTables
│   ├── search/                      # CommandPalette, SearchProvider
│   ├── sectors/                     # SectorPicker, SectorPanels
│   ├── simulator/                   # SimulatorPanel
│   └── ui/                          # primitives, Provenance, Zellige motif
├── lib/
│   ├── data/                        # snapshot, registry, metrics, shapes, client
│   ├── graph/layout.ts              # deterministic radial layout
│   └── utils.ts                     # number/date formatting, cx, clamp
└── types/index.ts                   # shared types
scripts/
├── fetch-data.mjs                   # pipeline entry point
├── lib/                             # http, record validation
└── providers/                       # bourse.mjs, ammc.mjs
data/                                # committed snapshots, one provenance envelope each
```

---

## Design system

The interface is deliberately restrained: hairline borders, generous whitespace, and colour
reserved almost entirely for **entity identity** and **directional semantics**. Decorative
geometry is limited to a single zellige-inspired motif, used in the hero, the footer and the
command palette, so the data stays the loudest thing on screen.

### Tokens

All colours are defined as RGB channel triplets in `globals.css` and consumed through Tailwind
with alpha support, defined once per theme:

| Token              | Role                                   |
| ------------------ | -------------------------------------- |
| `bg` `surface` `elevated` | Surfaces                           |
| `line` `line-strong`     | Hairline borders                     |
| `ink` `ink-soft` `ink-mute` `ink-faint` | Text hierarchy           |
| `accent` `accent-soft`   | Zellige gold accent                  |
| `pos` `neg`              | Gains and losses                      |
| `t-company` `t-sector` `t-commodity` `t-country` `t-event` | Entity hues |

> The `t-commodity` and `t-country` tokens survive as palette names even though those node
> types were removed. They now colour index levels and records.

### Type

| Role      | Font              | Usage                              |
| --------- | ----------------- | ---------------------------------- |
| `font-sans`    | Inter         | Body copy                           |
| `font-display` | Inter Tight   | Headlines                           |
| `font-mono`    | JetBrains Mono | Prices, deltas, tickers, tabular data |

### Entity colours

| Type    | Colour      |
| ------- | ----------- |
| Company | Indigo      |
| Sector  | Gold        |
| Index   | Amber-brown |
| Record  | Violet      |

---

## Adding data

**Do not add data to the application.** There is no seed file and no fixture to extend. Every
figure must come from a source.

To cover more ground, add a provider:

```js
// scripts/providers/example.mjs
export const id = 'example';
export const source = 'Example Authority';
export const sourceUrl = 'https://example.ma/feed.json';

export async function collect() {
  const records = await fetchJson(sourceUrl);
  return {
    file: 'example/records.json',
    data: { records },
    quality: { status: 'VALID', issues: [], rejected: 0 },
  };
}
```

Register it in `scripts/fetch-data.mjs`, run `npm run fetch-data`, and the snapshot is validated,
written to `data/`, and available to every loader immediately. If the new dataset implies a new
relation kind, add it to the registry builder with an explicit `basis` and a written `method`.

To change what is already cached, re-run the pipeline. Values are never hand-edited.

---

## Deployment

Three GitHub Actions workflows, in `.github/workflows/`.

| Workflow           | Trigger                    | What it does                                                     |
| ------------------ | -------------------------- | ---------------------------------------------------------------- |
| `ci.yml`           | push, pull request         | `npm ci`, type check, lint, build                                 |
| `deploy.yml`       | push to `master`           | builds and deploys to Vercel with `vercel deploy --prebuilt`      |
| `refresh-data.yml` | daily at 06:17 UTC, manual | runs the pipeline, validates the manifest, commits `data/` if it changed |

The refresh job is what makes the "no backend" claim true. The application has no runtime
network access and no server-side data store; the cached snapshots are the entire dataset, and
a scheduled job keeps them current. A refresh that changes `data/` commits it to `master`,
which then runs CI and deploys it.

### Required secrets

Set these on the repository (`Settings → Secrets and variables → Actions`):

| Secret            | Where it comes from                                                                |
| ----------------- | ---------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`    | Vercel → Account Settings → Tokens                                                  |
| `VERCEL_ORG_ID`   | Vercel → Project Settings → General → Project ID                                    |
| `VERCEL_PROJECT_ID` | Vercel → Project Settings → General → Project ID                                  |

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are identifiers, not secrets, but storing them as
secrets keeps them out of the workflow file. The workflow also needs a Vercel project that
already has the repository linked — the usual `vercel` → `Add New → Project` step, or
`npx vercel link`.

### One detail worth knowing

`/api/data` is a route handler, so the app needs a server runtime. `output: 'export'` fails
the build with *"Route Handlers are not supported with `output: export`"*. A Node host such as
Vercel is therefore required, and `/api/data` is deployed as a serverless function.

The snapshots are read from `./data` with a computed path, which the file tracer cannot follow.
`next.config.js` therefore lists them explicitly:

```js
outputFileTracingIncludes: { '/*': ['./data/**/*'] },
```

Without that, the deployment ships without its dataset and every panel renders empty.

---

## Verification

```bash
npm run typecheck   # 0 errors
npm run lint        # 0 errors, 0 warnings
npm run build       # every route prerenders or is declared dynamic
npm run fetch-data  # re-retrieves and re-validates every snapshot
```

The production build was additionally crawled to confirm every route resolves:

- `/`, `/market`, `/companies`, `/sectors`, `/events`, `/simulator`, `/companies/M2M` and
  `/sectors/agro-alimentaire` return `200`
- all 81 issuer pages, 16 sector pages and 26 record pages prerender
- an unknown path returns `404` and renders the custom not-found page
- `/api/data` returns registry, companies, sectors, records, series, correlation, peers, movers
  and most-traded payloads, each a pass-through of the cached file
- the graph layout reports **zero node-box collisions** at the sector ring and at a
  single-sector neighbourhood

---

## Tech stack

| Layer     | Choice                          |
| --------- | ------------------------------- |
| Framework | Next.js 16.3.8 (App Router, Turbopack) |
| UI        | React 19.2.0                     |
| Language  | TypeScript 5.7 (`strict`)        |
| Styling   | Tailwind CSS 3.4 + CSS variables |
| Graph     | `@xyflow/react` 12.12 (React Flow) |
| Charts    | `recharts` 3.10                  |
| Icons     | `lucide-react` 0.545             |
| Linting   | ESLint 9 flat config + `eslint-config-next` |

---

## Known limitations

These are limitations of the sources, stated rather than papered over:

- **No historical index series.** Casablanca Bourse publishes official index *levels* but
  exposes no free historical endpoint. Index charts, MASI beta and index history are therefore
  not computed. The sector page charts one named member's real close history and labels it as
  such; it is not a sector index.
- **No index constituents.** The exchange does not publish a free constituent list per index,
  so index nodes carry no relation to the issuers they follow. They are not drawn connected.
- **No exposure or supply-chain data.** Nothing published supports a commodity, country or
  counterparty exposure edge, so those node types were removed instead of being estimated.
- **Three years of free history.** Older and real-time data are licensed products. Sessions
  outside trading days are preserved as gaps.
- **AMMC PDFs are not parsed.** Dated issuer publications are recorded with their title, date,
  URL and document list. Figures inside a PDF are not extracted, so a record cannot state a
  financial impact.
- **Sector change is derived.** An equal-weighted mean of member session changes is not an
  exchange-published sector index. It is labelled `DERIVED` with the member count beside it.
- **Issuer matching is heuristic.** 67 of 183 register issuers match a listed ticker by a
  published rule. The method and a confidence level are recorded on every match and shown in
  the UI. The other 116 register entries are not listed companies and are excluded.
- **Correlation is historical.** It describes how two series moved together, nothing more. No
  figure here is a forecast, and the app states that wherever a correlation is shown.
- **No persistence.** The theme preference is stored in `localStorage`; nothing else is
  retained, and there is no user account or saved state.
- **No test suite.** Correctness is verified by type checking, linting, the production build,
  route crawling and the pipeline's own record validation, rather than by unit tests.
- **ESLint 9.x is deprecated.** npm reports it unsupported. ESLint 10 was tested and fails
  because `eslint-plugin-react` inside `eslint-config-next@16.3.8` is not yet ESLint 10
  compatible. This resolves when Next.js updates the plugin, not before.

---

## Disclaimer

MA3NA presents **published official data** and clearly labelled derivations of it. It is a
research and exploration tool.

Figures marked `DERIVED` are MA3NA's own calculations over published observations. The method
and the observation count behind each one are stated in the interface. Figures marked
`UNAVAILABLE` were not published by the source and must not be read as zero.

Nothing in this application constitutes financial, investment, economic or legal advice. A
correlation between two historical price series is not a causal relationship and does not
predict future behaviour. No figure shown here should be used to make decisions about any
actual security, company, sector or index.