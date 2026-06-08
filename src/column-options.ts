import type { Column, Series } from "@metabase/custom-viz";

export function getColumnFieldProps(series: Series) {
  const { cols } = series[0].data;

  return {
    columns: cols,
    options: cols.map((col) => ({
      name: col.display_name,
      value: col.name,
    })),
  };
}

export function findColumn(cols: Column[], field?: string) {
  return cols.find((col) => col.name === field);
}

export function columnIndex(cols: Column[], field?: string) {
  return cols.findIndex((col) => col.name === field);
}

export function defaultTimeField(cols: Column[]) {
  return (
    cols.find((col) => col.unit != null)?.name ??
    cols.find((col) => col.base_type?.includes("Date"))?.name ??
    cols[0]?.name
  );
}

export function defaultCategoryField(cols: Column[]) {
  return (
    cols.find(
      (col) =>
        col.base_type === "type/Text" || col.effective_type === "type/Text",
    )?.name ?? cols[1]?.name
  );
}

export function defaultValueField(cols: Column[]) {
  return (
    cols.find(
      (col) =>
        col.base_type === "type/Number" ||
        col.effective_type === "type/Number" ||
        col.source === "aggregation",
    )?.name ?? cols[cols.length - 1]?.name
  );
}
