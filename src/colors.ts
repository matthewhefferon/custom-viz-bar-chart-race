import * as d3 from "d3";

const PALETTE = [
  "#509EE3",
  "#88BF4D",
  "#A989C5",
  "#EF8C8C",
  "#F9D45C",
  "#F2A86F",
  "#98D9D9",
  "#7172AD",
  "#F8B4C4",
  "#84BB4C",
  "#B4A7D6",
  "#F4A582",
];

export function companyColorScale(companies: string[]) {
  return d3.scaleOrdinal(PALETTE).domain(companies);
}
