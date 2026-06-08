import type { CreateCustomVisualization } from "@metabase/custom-viz";
import { defineConfig } from "@metabase/custom-viz";

import {
  columnIndex,
  defaultCategoryField,
  defaultTimeField,
  defaultValueField,
  findColumn,
  getColumnFieldProps,
} from "./column-options";
import { buildKeyframes } from "./data";
import type { Settings } from "./types";
import { VisualizationComponent } from "./Visualization";

const createVisualization: CreateCustomVisualization<Settings> = ({
  defineSetting,
}) => {
  return defineConfig<Settings>({
    id: "bar-chart-race",
    getName: () => "Bar chart race",
    minSize: { width: 4, height: 4 },
    defaultSize: { width: 12, height: 8 },
    checkRenderable(series, settings) {
      if (series.length !== 1) {
        throw new Error("Only 1 series is supported");
      }

      const [
        {
          data: { cols, rows },
        },
      ] = series;

      if (cols.length < 3) {
        throw new Error(
          "Query needs at least 3 columns: time, category, and value",
        );
      }

      if (rows.length < 2) {
        throw new Error("Query needs at least 2 rows");
      }

      const { timeField, categoryField, valueField, maxBars = 10 } = settings;

      if (!timeField || !categoryField || !valueField) {
        throw new Error("Map time, category, and value columns in settings");
      }

      if (!findColumn(cols, timeField)) {
        throw new Error(`Time column "${timeField}" is missing from results`);
      }

      if (!findColumn(cols, categoryField)) {
        throw new Error(
          `Category column "${categoryField}" is missing from results`,
        );
      }

      if (!findColumn(cols, valueField)) {
        throw new Error(`Value column "${valueField}" is missing from results`);
      }

      const valueIdx = columnIndex(cols, valueField);
      const hasNumericValue = rows.some((row) => {
        const value = Number(row[valueIdx]);
        return !Number.isNaN(value);
      });

      if (!hasNumericValue) {
        throw new Error("Value column must contain numbers");
      }

      const keyframes = buildKeyframes(
        rows,
        cols,
        timeField,
        categoryField,
        valueField,
        maxBars,
      );

      if (keyframes.length < 2) {
        throw new Error("Need at least 2 distinct time periods in the data");
      }
    },
    settings: {
      timeField: defineSetting({
        id: "timeField",
        title: "Time",
        getSection: () => "Data",
        widget: "field",
        getDefault(series) {
          return defaultTimeField(series[0].data.cols);
        },
        getProps(series) {
          return getColumnFieldProps(series);
        },
        isValid(series, settings) {
          return Boolean(findColumn(series[0].data.cols, settings.timeField));
        },
      }),
      categoryField: defineSetting({
        id: "categoryField",
        title: "Category",
        getSection: () => "Data",
        widget: "field",
        getDefault(series) {
          return defaultCategoryField(series[0].data.cols);
        },
        getProps(series) {
          return getColumnFieldProps(series);
        },
        isValid(series, settings) {
          return Boolean(
            findColumn(series[0].data.cols, settings.categoryField),
          );
        },
      }),
      valueField: defineSetting({
        id: "valueField",
        title: "Value",
        getSection: () => "Data",
        widget: "field",
        getDefault(series) {
          return defaultValueField(series[0].data.cols);
        },
        getProps(series) {
          return getColumnFieldProps(series);
        },
        isValid(series, settings) {
          return Boolean(findColumn(series[0].data.cols, settings.valueField));
        },
      }),
      maxBars: defineSetting({
        id: "maxBars",
        title: "Max bars",
        getSection: () => "Display",
        widget: "number",
        getDefault() {
          return 10;
        },
        getProps() {
          return {
            options: {
              isInteger: true,
              isNonNegative: true,
            },
            placeholder: "10",
          };
        },
      }),
      speed: defineSetting({
        id: "speed",
        title: "Speed",
        getSection: () => "Display",
        widget: "number",
        getDefault() {
          return 5;
        },
        getProps() {
          return {
            options: {
              isInteger: true,
              isNonNegative: true,
            },
            placeholder: "1 (slow) – 10 (fast)",
          };
        },
      }),
    },
    VisualizationComponent,
  });
};

export default createVisualization;
