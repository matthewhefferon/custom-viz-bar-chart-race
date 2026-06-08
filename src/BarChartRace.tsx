import type { CustomVisualizationProps } from "@metabase/custom-viz";
import * as d3 from "d3";
import { useCallback, useEffect, useRef, useState } from "react";

import { companyColorScale } from "./colors";
import {
  type BarDatum,
  buildKeyframes,
  interpolateKeyframes,
  maxAnimationProgress,
  maxValue,
} from "./data";
import { columnIndex } from "./column-options";
import { formatBarValueTween, formatFrameTime } from "./format";
import { speedToFrameMs } from "./speed";
import type { Settings } from "./types";

const MARGIN = { top: 40, right: 20, bottom: 8, left: 8 };
const BAR_GAP = 8;
const VALUE_PAD = 10;
const MOTION_SMOOTHING = 0.12;

export function BarChartRace({
  height,
  series,
  settings,
  width,
}: CustomVisualizationProps<Settings>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | undefined>(undefined);
  const playingRef = useRef(true);
  const finishedRef = useRef(false);
  const resumeRef = useRef<(() => void) | null>(null);
  const restartRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(true);

  const {
    timeField,
    categoryField,
    valueField,
    maxBars = 10,
    speed = 5,
  } = settings;

  const frameMs = speedToFrameMs(speed);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimestampRef.current = undefined;
  }, []);

  const togglePlaying = useCallback(() => {
    if (playingRef.current) {
      playingRef.current = false;
      setPlaying(false);
      stopAnimation();
      return;
    }

    playingRef.current = true;
    setPlaying(true);

    if (finishedRef.current) {
      finishedRef.current = false;
      restartRef.current?.();
    } else {
      resumeRef.current?.();
    }
  }, [stopAnimation]);

  useEffect(() => {
    playingRef.current = true;
    finishedRef.current = false;
    setPlaying(true);
  }, [series, timeField, categoryField, valueField, maxBars, speed, width, height]);

  useEffect(() => {
    if (!width || !height || !svgRef.current) {
      return;
    }

    if (!timeField || !categoryField || !valueField) {
      return;
    }

    const { rows, cols } = series[0].data;
    const keyframes = buildKeyframes(
      rows,
      cols,
      timeField,
      categoryField,
      valueField,
      maxBars,
    );

    if (keyframes.length === 0) {
      return;
    }

    const valueCol = cols[columnIndex(cols, valueField)];
    const companies = [
      ...new Set(keyframes.flatMap((frame) => frame.bars.map((bar) => bar.name))),
    ];
    const color = companyColorScale(companies);

    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;
    const barHeight = Math.max(
      12,
      (innerHeight - BAR_GAP * (maxBars - 1)) / maxBars,
    );
    const xMax = maxValue(keyframes) || 1;

    const maxNameChars = Math.max(...companies.map((name) => name.length), 4);
    const labelWidth = Math.min(
      Math.max(maxNameChars * 7.5, 72),
      innerWidth * 0.28,
    );

    const valueLabels = keyframes.flatMap((frame) =>
      frame.bars.map((bar) => formatBarValueTween(bar.value, valueCol)),
    );
    const maxValueChars = Math.max(...valueLabels.map((label) => label.length), 4);
    const valueColumnWidth = Math.min(
      innerWidth * 0.25,
      Math.max(72, maxValueChars * 8.5 + 16),
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height).attr("overflow", "visible");

    const root = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const maxLabelPixelWidth = maxValueChars * 8.5 + 8;
    const barAreaWidth = Math.max(
      40,
      innerWidth - labelWidth - valueColumnWidth,
    );
    const x = d3.scaleLinear().domain([0, xMax]).range([0, barAreaWidth]);

    const labelXForBarWidth = (barPixelWidth: number) => {
      const atBarTip = labelWidth + barPixelWidth + VALUE_PAD;
      const maxX = innerWidth - maxLabelPixelWidth;
      return Math.min(atBarTip, maxX);
    };

    const title = root
      .append("text")
      .attr("x", 0)
      .attr("y", -14)
      .attr("fill", "var(--mb-color-text-primary)")
      .attr("font-size", 18)
      .attr("font-weight", 600);

    const barsGroup = root.append("g").attr("class", "bars");
    const labelsGroup = root.append("g").attr("class", "labels");
    const valuesGroup = root.append("g").attr("class", "values");

    const barRanks = new Map<string, number>();
    const barWidths = new Map<string, number>();
    const maxProgress = maxAnimationProgress(keyframes.length);

    const truncateName = (name: string) =>
      name.length > 20 ? `${name.slice(0, 19)}…` : name;

    const barWidthForValue = (value: number) => Math.max(0, x(value));

    const smoothToward = (current: number, target: number) =>
      current + (target - current) * MOTION_SMOOTHING;

    const smoothBarWidth = (name: string, targetWidth: number) => {
      const current = barWidths.get(name) ?? 0;
      const next = smoothToward(current, targetWidth);
      barWidths.set(name, next);
      return next;
    };

    const smoothBarY = (name: string, targetRank: number) => {
      const current = barRanks.get(name) ?? targetRank;
      const next = smoothToward(current, targetRank);
      barRanks.set(name, next);
      return next * (barHeight + BAR_GAP);
    };

    const renderAtProgress = (progress: number) => {
      const frame = interpolateKeyframes(keyframes, progress, maxBars);
      progressRef.current = progress;

      title.text(formatFrameTime(frame.time));

      const bars = barsGroup
        .selectAll<SVGRectElement, BarDatum>("rect")
        .data(frame.bars, (d) => d.name);

      bars
        .enter()
        .append("rect")
        .attr("fill", (d) => color(d.name))
        .attr("rx", 3)
        .attr("height", barHeight)
        .attr("x", labelWidth)
        .attr("width", 0);

      const snapRanks = finishedRef.current;

      frame.bars.forEach((bar, rank) => {
        if (snapRanks) {
          barRanks.set(bar.name, rank);
        } else {
          smoothBarY(bar.name, rank);
        }
        smoothBarWidth(bar.name, barWidthForValue(bar.value));
      });

      bars
        .attr("fill", (d) => color(d.name))
        .attr("height", barHeight)
        .attr("x", labelWidth)
        .attr("width", (d) => barWidths.get(d.name) ?? 0)
        .attr("y", (d) => barRanks.get(d.name)! * (barHeight + BAR_GAP));

      bars.exit().remove();

      const labels = labelsGroup
        .selectAll<SVGTextElement, BarDatum>("text")
        .data(frame.bars, (d) => d.name);

      labels
        .enter()
        .append("text")
        .attr("fill", "var(--mb-color-text-primary)")
        .attr("font-size", 13)
        .attr("dominant-baseline", "middle")
        .attr("x", 0);

      labels
        .text((d) => truncateName(d.name))
        .attr("y", (d) => (barRanks.get(d.name) ?? 0) * (barHeight + BAR_GAP) + barHeight / 2);

      labels.exit().remove();

      const values = valuesGroup
        .selectAll<SVGTextElement, BarDatum>("text")
        .data(frame.bars, (d) => d.name);

      values
        .enter()
        .append("text")
        .attr("fill", "var(--mb-color-text-primary)")
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "start");

      values
        .attr("x", (d) => labelXForBarWidth(barWidths.get(d.name) ?? 0))
        .attr("y", (d) => (barRanks.get(d.name) ?? 0) * (barHeight + BAR_GAP) + barHeight / 2)
        .text((d) => formatBarValueTween(d.value, valueCol));

      values.exit().remove();
    };

    const tick = (timestamp: number) => {
      if (!playingRef.current) {
        return;
      }

      if (lastTimestampRef.current !== undefined) {
        const delta = timestamp - lastTimestampRef.current;
        progressRef.current += delta / frameMs;
      }

      lastTimestampRef.current = timestamp;

      if (progressRef.current >= maxProgress) {
        progressRef.current = maxProgress;
        playingRef.current = false;
        finishedRef.current = true;
        renderAtProgress(maxProgress);
        setPlaying(false);
        return;
      }

      renderAtProgress(progressRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    const resumeAnimation = () => {
      lastTimestampRef.current = undefined;
      rafRef.current = requestAnimationFrame(tick);
    };

    const restartFromStart = () => {
      barRanks.clear();
      barWidths.clear();
      progressRef.current = 0;
      renderAtProgress(0);
      resumeAnimation();
    };

    resumeRef.current = resumeAnimation;
    restartRef.current = restartFromStart;

    progressRef.current = 0;
    renderAtProgress(0);

    if (playingRef.current) {
      resumeAnimation();
    }

    return () => {
      resumeRef.current = null;
      restartRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    categoryField,
    height,
    maxBars,
    series,
    speed,
    timeField,
    valueField,
    width,
    frameMs,
  ]);

  if (!width || !height) {
    return null;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "visible",
      }}
    >
      <button
        type="button"
        onClick={togglePlaying}
        style={{
          position: "absolute",
          top: 4,
          right: 8,
          zIndex: 1,
          padding: "4px 12px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: "1px solid var(--mb-color-border)",
          borderRadius: 6,
          background: "var(--mb-color-background)",
          color: "var(--mb-color-text-primary)",
        }}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <svg
        ref={svgRef}
        style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}
      />
    </div>
  );
}
