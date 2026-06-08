import type { Column } from "@metabase/custom-viz";
import { formatValue } from "@metabase/custom-viz";
import * as d3 from "d3";

/** Strip ISO timestamps; keep Metabase quarter labels as-is. */
export function formatFrameTime(time: string) {
  const trimmed = time.trim();

  if (/^\d{4}\s*Q[1-4]$/i.test(trimmed) || /^Q[1-4]\s*\d{4}$/i.test(trimmed)) {
    return trimmed;
  }

  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) {
    return dateOnly[1];
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return trimmed.replace(/T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/i, "");
}

export function formatBarValue(value: number, col?: Column) {
  if (col) {
    const formatted = formatValue(value, { column: col, compact: true });
    if (formatted) {
      return formatted;
    }
  }

  if (value >= 1_000_000_000) {
    return `${d3.format(".2f")(value / 1_000_000_000)}B`;
  }
  if (value >= 1_000_000) {
    return `${d3.format(".2f")(value / 1_000_000)}M`;
  }

  return d3.format(",")(value);
}

/** Compact B/M/K labels that tick during bar transitions (e.g. 1.2B → 1.3B). */
export function formatBarValueTween(value: number, col?: Column) {
  const v = Math.max(0, value);

  if (col) {
    const formatted = formatValue(v, { column: col, compact: true });
    if (formatted) {
      return formatted;
    }
  }

  if (v >= 1_000_000_000) {
    return `${d3.format(".2f")(v / 1_000_000_000)}B`;
  }
  if (v >= 1_000_000) {
    return `${d3.format(".2f")(v / 1_000_000)}M`;
  }
  if (v >= 1_000) {
    return `${d3.format(".2f")(v / 1_000)}K`;
  }

  return d3.format(".0f")(v);
}
