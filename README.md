# custom-viz-bar-chart-race

An unofficial bar chart race custom visualization for Metabase. Each frame is one time period: categories are ranked by value, and bars grow, shrink, and swap rank over time. Play / Pause is in the top-right corner (restarts from the beginning after the animation finishes). Built with React + D3, based on the [Observable bar chart race](https://observablehq.com/@d3/bar-chart-race).

Requires Metabase `>= 62`.

## Data requirements

The query must return three columns in **long / tidy** format — one row per (time, category, value):

- **Time** — animation frame (date, or sortable text/number)
- **Category** — bar label
- **Value** — bar length (numeric)

Need at least 2 distinct time periods. Categories can appear or disappear across periods. Wide tables (one column per category) are not supported.

## Example data

Postgres seed (Nvidia, Apple, Microsoft, Google, Meta, SpaceX, OpenAI, Anthropic, 2015–2026): [`scripts/company_valuations.sql`](scripts/company_valuations.sql)

Load it against your database, then sync the table in Metabase. The Metabase SQL editor won’t run that file (it’s `CREATE` + `INSERT`).

```sql
SELECT
    valuation_date,
    company,
    valuation_usd
FROM company_valuations
ORDER BY valuation_date, valuation_usd DESC;
```

Map **Time** → `valuation_date`, **Category** → `company`, **Value** → `valuation_usd`.

## Settings

| Setting | Description |
| ------- | ----------- |
| Time | Column that defines each animation frame. Auto-selected from the first date column. |
| Category | Bar labels. Auto-selected from the first text column. |
| Value | Numeric measure. Auto-selected from the first numeric column. |
| Max bars | Top N categories shown per frame (default `10`). |
| Speed | `1` (slow) through `10` (fast). |

## Development

```bash
npm install
npm run dev         # watch build + preview
npm run build       # compiles src/ → dist/, then packages it into a .tgz
```

`npm run build` writes `BarChartRace-<version>.tgz` to the project root. Upload that file in **Admin → Custom visualizations → Add** to register the plugin.

> The packaged archive contains `metabase-plugin.json` plus the build output (`dist/index.js` and any whitelisted `dist/assets/*`).

## Other scripts

```bash
npm run prettier    # format
npm run type-check  # tsc --noEmit
```
