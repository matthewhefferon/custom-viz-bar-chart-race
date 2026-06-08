import type { Column, Row } from "@metabase/custom-viz";
import * as d3 from "d3";

import { columnIndex } from "./column-options";

export type BarDatum = {
  name: string;
  value: number;
};

export type Keyframe = {
  time: string;
  bars: BarDatum[];
};

export function buildKeyframes(
  rows: Row[],
  cols: Column[],
  timeField: string,
  categoryField: string,
  valueField: string,
  maxBars: number,
): Keyframe[] {
  const timeIdx = columnIndex(cols, timeField);
  const categoryIdx = columnIndex(cols, categoryField);
  const valueIdx = columnIndex(cols, valueField);

  if (timeIdx < 0 || categoryIdx < 0 || valueIdx < 0) {
    return [];
  }

  const byTime = new Map<string, BarDatum[]>();

  for (const row of rows) {
    const time = String(row[timeIdx] ?? "");
    const name = String(row[categoryIdx] ?? "");
    const value = Number(row[valueIdx]);

    if (!time || !name || Number.isNaN(value)) {
      continue;
    }

    const bucket = byTime.get(time) ?? [];
    bucket.push({ name, value });
    byTime.set(time, bucket);
  }

  const times = sortTimes([...byTime.keys()]);

  return times.map((time) => ({
    time,
    bars: (byTime.get(time) ?? [])
      .sort((a, b) => b.value - a.value)
      .slice(0, maxBars),
  }));
}

function sortTimes(times: string[]) {
  if (times.every((time) => !Number.isNaN(Number(time)))) {
    return times.sort((a, b) => Number(a) - Number(b));
  }

  return times.sort((a, b) => a.localeCompare(b));
}

/**
 * Smoothly blend between keyframes.
 * Progress 0…1: intro — bars grow from zero into the first snapshot.
 * Progress 1…n: travel between snapshots (n = keyframes.length).
 */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  progress: number,
  maxBars: number,
): Keyframe {
  const last = keyframes.length - 1;
  if (last < 0) {
    return { time: "", bars: [] };
  }

  if (progress < 1) {
    const t = d3.easeCubicInOut(Math.min(1, Math.max(0, progress)));
    const bars = keyframes[0].bars
      .map((bar) => ({ name: bar.name, value: bar.value * t }))
      .sort((a, b) => b.value - a.value)
      .slice(0, maxBars);

    return { time: keyframes[0].time, bars };
  }

  const travel = progress - 1;
  if (travel >= last) {
    return keyframes[last];
  }

  const index = Math.floor(travel);
  const t = travel - index;
  const k0 = keyframes[index];
  const k1 = keyframes[index + 1];
  const names = new Set([
    ...k0.bars.map((bar) => bar.name),
    ...k1.bars.map((bar) => bar.name),
  ]);

  const v0 = new Map(k0.bars.map((bar) => [bar.name, bar.value]));
  const v1 = new Map(k1.bars.map((bar) => [bar.name, bar.value]));

  const bars = [...names]
    .map((name) => ({
      name,
      value: d3.interpolateNumber(v0.get(name) ?? 0, v1.get(name) ?? 0)(t),
    }))
    .filter((bar) => bar.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars);

  return {
    time: t < 0.5 ? k0.time : k1.time,
    bars,
  };
}

export function maxAnimationProgress(keyframeCount: number) {
  return Math.max(1, keyframeCount);
}

export function maxValue(keyframes: Keyframe[]) {
  let max = 0;

  for (const frame of keyframes) {
    for (const bar of frame.bars) {
      if (bar.value > max) {
        max = bar.value;
      }
    }
  }

  return max;
}
