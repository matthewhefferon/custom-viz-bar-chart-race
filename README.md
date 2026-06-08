# Bar chart race

Animated ranking chart for [Metabase](https://www.metabase.com) custom visualizations (v60+). Each **frame** is one time period: categories are sorted by value, bars grow/shrink and swap rank over time. Built with React + D3, based on the [Observable bar chart race](https://observablehq.com/@d3/bar-chart-race).

## Features

- Smooth bar width and rank transitions between frames
- Play / Pause control (restarts from the beginning after the animation finishes)
- Respects Metabase column formatting for value labels
- Configurable top-N bars and animation speed

## Install the plugin

```bash
npm install
npm run build
```

Upload the generated `BarChartRace-<version>.tgz` (e.g. `BarChartRace-1.2.9.tgz`) via **Admin → Custom visualizations → Add**.

## What this chart type needs

**Long / tidy data** — one row per **(time, category, value)**:

| Role in the viz | Your column (example) | Type |
| ---------------- | --------------------- | ---- |
| **Time** (animation frame) | `valuation_date` | Date (or sortable text/number) |
| **Category** (bar label) | `company` | Text |
| **Value** (bar length) | `valuation_usd` | Number |

Requirements:

- At least **3 columns** and **2 rows**
- At least **2 distinct time periods** in the result
- **Value** must be numeric
- Categories can appear/disappear by time period (e.g. OpenAI from 2019, Anthropic from 2022) — each frame only ranks rows present for that period

**Not supported:** wide tables (one column per category). Unpivot first, or query as long format below.

## Example: tech company valuations

The `company_valuations` table below is a direct fit:

```sql
CREATE TABLE IF NOT EXISTS company_valuations (
    valuation_date  DATE            NOT NULL,
    company         VARCHAR(50)     NOT NULL,
    valuation_usd   BIGINT          NOT NULL,
    PRIMARY KEY (valuation_date, company)
);
```

**Metabase question** (after loading seed data):

```sql
SELECT
    valuation_date,
    company,
    valuation_usd
FROM company_valuations
ORDER BY valuation_date, valuation_usd DESC;
```

**Viz settings mapping:**

| Setting | Pick this column |
| ------- | ---------------- |
| Time | `valuation_date` |
| Category | `company` |
| Value | `valuation_usd` |

Suggested display settings: **Max bars** `10`, **Speed** `5` (1 = slow, 10 = fast; ~1.3s per frame at 5).

### Load test data

Full `CREATE TABLE` + `INSERT` for Nvidia, Apple, Microsoft, Google, Meta, SpaceX, OpenAI, and Anthropic (2015–2026):

```bash
psql -f scripts/company_valuations.sql
```

Or run the same file in Metabase’s SQL editor / your DB client. Source: [`scripts/company_valuations.sql`](scripts/company_valuations.sql).

### Try it end-to-end

1. Run `scripts/company_valuations.sql` against your database and sync the table in Metabase.
2. **Admin → Custom visualizations → Add** → upload `BarChartRace-<version>.tgz` from `npm run build`.
3. Create the SQL question above.
4. Visualization → **Bar chart race** → confirm the three column mappings.
5. Resize the card (taller/wider helps); watch the race advance by `valuation_date`. Use **Pause** / **Play** in the top-right corner.

## Minimal synthetic example

If you only need a tiny sanity check without the seed file:

```sql
SELECT year AS time, country AS category, gdp AS value
FROM (
  VALUES
    (2018, 'USA', 100), (2018, 'China', 80),
    (2019, 'USA', 110), (2019, 'China', 95),
    (2020, 'USA', 105), (2020, 'China', 110)
) AS t(year, country, gdp);
```

## Settings reference

| Setting | Description |
| ------- | ----------- |
| Time | Column that defines each animation frame (e.g. `valuation_date`) |
| Category | Bar labels (e.g. `company`) |
| Value | Numeric measure (e.g. `valuation_usd`) |
| Max bars | Top N categories shown per frame (default `10`) |
| Speed | `1` (slow) through `10` (fast); controls ms between frames |

## Project structure

```
src/
  index.tsx             # Plugin config, settings, validation
  BarChartRace.tsx      # D3 animation + play/pause UI
  data.ts               # Keyframe building and interpolation
  format.ts             # Time and value label formatting
metabase-plugin.json    # Plugin manifest (name, icon, version)
public/assets/
  bar-race.svg          # Icon shown in the viz picker
scripts/
  company_valuations.sql
```

## Development

Requires Node **`>= 22.12`** (Vite 8 / rolldown).

```bash
npm install
npm run dev         # watch build + dev server on :5174
npm run build       # dist/ + BarChartRace-<version>.tgz
```

### Live reload in Metabase

1. Run `npm run dev`
2. Open http://localhost:5174 for setup steps
3. Point Metabase `dev_bundle_url` at the dev server; edits hot-reload

## Build troubleshooting

If `npm run build` fails with **Cannot find native binding** / `@rolldown/binding-darwin-arm64`:

```bash
npm install
npm run postinstall
npm run build
```

On Apple Silicon, Node must be **arm64** (`node -p process.arch` → `arm64`). Or install the binding explicitly:

```bash
npm install @rolldown/binding-darwin-arm64@1.0.0-rc.15 --no-save
npm run build
```

## Other scripts

```bash
npm run prettier
npm run type-check
```
