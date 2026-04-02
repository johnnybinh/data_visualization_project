import * as d3 from "d3";
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 32, right: 20, bottom: 40, left: 56 };

const RISE_COLOR = "#ef4444"; // red-500
const FALL_COLOR = "#3b82f6"; // blue-500

/**
 * Line chart with segments colored by trend direction.
 * Red = layoffs increasing, Green = layoffs decreasing.
 * Shows date and value label at each data point.
 *
 * @param {object} props
 * @param {{ x: Date, y: number }[]} props.data sorted by x ascending
 * @param {string} [props.xLabel]
 * @param {string} [props.yLabel]
 * @param {(d: Date) => string} [props.formatX]
 * @param {(n: number) => string} [props.formatY]
 * @param {number} [props.width]
 * @param {number} [props.height]
 */
export function TrendLineChart({
  data,
  xLabel,
  yLabel,
  formatX = (d) => d3.timeFormat("%b %Y")(d),
  formatY = (n) => d3.format(",")(Math.round(n)),
  width = 640,
  height = 300,
  margin: marginProp,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const [hoveredIdx, setHoveredIdx] = useState(null);
  const clearHover = useCallback(() => setHoveredIdx(null), []);

  const series = useMemo(() => data.filter((d) => d.y >= 0), [data]);

  const { xScale, yScale, segments, dots, yTicks } = useMemo(() => {
    if (!series.length) {
      const xScale = d3.scaleTime().domain([new Date(), new Date()]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, 1]).nice().range([ih, 0]);
      return { xScale, yScale, segments: [], dots: [], yTicks: [] };
    }

    const xExtent = d3.extent(series, (d) => d.x);
    const xScale = d3.scaleTime().domain(xExtent).range([0, iw]);
    const maxY = d3.max(series, (d) => d.y) ?? 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([ih, 0]);

    // Create line segments between consecutive points
    const segments = [];
    for (let i = 0; i < series.length - 1; i++) {
      const curr = series[i];
      const next = series[i + 1];
      const isRising = next.y > curr.y;
      segments.push({
        x1: xScale(curr.x),
        y1: yScale(curr.y),
        x2: xScale(next.x),
        y2: yScale(next.y),
        color: isRising ? RISE_COLOR : FALL_COLOR,
        rising: isRising,
      });
    }

    // Dots at each data point
    const dots = series.map((d, i) => {
      let color = "#71717a"; // neutral for first point
      if (i > 0) {
        color = d.y > series[i - 1].y ? RISE_COLOR : FALL_COLOR;
      }
      return {
        cx: xScale(d.x),
        cy: yScale(d.y),
        x: d.x,
        y: d.y,
        color,
        idx: i,
      };
    });

    const yTicks = yScale.ticks(5);

    return { xScale, yScale, segments, dots, yTicks };
  }, [series, iw, ih]);

  const fw = 10;
  const fmtK = (n) => (n >= 1000 ? d3.format(".0f")(n / 1000) + "k" : String(Math.round(n)));

  // Determine which labels to show (every nth to avoid overlap)
  const labelInterval = Math.max(1, Math.ceil(dots.length / Math.floor(iw / 60)));

  return (
    <div className={cn("w-full", className)}>
      {/* Legend */}
      <div className="mb-3 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-6 rounded-sm"
            style={{ backgroundColor: RISE_COLOR }}
          />
          <span className="text-muted-foreground">Increasing (↑)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-6 rounded-sm"
            style={{ backgroundColor: FALL_COLOR }}
          />
          <span className="text-muted-foreground">Decreasing (↓)</span>
        </div>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible text-foreground"
        role="img"
        aria-label={xLabel && yLabel ? `${yLabel} over ${xLabel}` : "Trend line chart"}
        onMouseLeave={clearHover}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          <line x1={0} x2={iw} y1={ih} y2={ih} className="stroke-border" strokeWidth={1} />
          <line x1={0} x2={0} y1={0} y2={ih} className="stroke-border" strokeWidth={1} />

          {/* Grid lines */}
          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${yScale(t)})`}>
              <line
                x1={0}
                x2={iw}
                y1={0}
                y2={0}
                className="stroke-border/40"
                strokeWidth={1}
                strokeDasharray="2,4"
              />
              <line x1={0} x2={-5} y1={0} y2={0} className="stroke-muted-foreground" strokeWidth={1} />
              <text
                x={-8}
                y={0}
                dy="0.35em"
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ fontSize: fw }}
              >
                {fmtK(t)}
              </text>
            </g>
          ))}

          {/* Line segments colored by direction */}
          {segments.map((seg, i) => (
            <line
              key={i}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={seg.color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

          {/* Dots and labels at each point */}
          {dots.map((d, i) => {
            const showLabel = i % labelInterval === 0 || i === dots.length - 1 || hoveredIdx === i;
            const isHovered = hoveredIdx === i;
            const isNearTop = d.cy < 50;

            return (
              <g key={i}>
                {/* Combined date + value label near the dot */}
                {showLabel && (
                  <g>
                    {/* Background for better readability */}
                    <rect
                      x={d.cx - 24}
                      y={isNearTop ? d.cy + 12 : d.cy - 32}
                      width={48}
                      height={22}
                      rx={3}
                      fill="white"
                      fillOpacity={0.9}
                      stroke={d.color}
                      strokeWidth={isHovered ? 1.5 : 0.5}
                    />
                    {/* Date */}
                    <text
                      x={d.cx}
                      y={isNearTop ? d.cy + 22 : d.cy - 22}
                      textAnchor="middle"
                      fill={d.color}
                      style={{ fontSize: 8, fontWeight: 600 }}
                    >
                      {d3.timeFormat("%b %Y")(d.x)}
                    </text>
                    {/* Value */}
                    <text
                      x={d.cx}
                      y={isNearTop ? d.cy + 31 : d.cy - 13}
                      textAnchor="middle"
                      className="fill-foreground"
                      style={{ fontSize: 9, fontWeight: 500 }}
                    >
                      {fmtK(d.y)}
                    </text>
                  </g>
                )}

                {/* Dot */}
                <circle
                  cx={d.cx}
                  cy={d.cy}
                  r={isHovered ? 7 : 5}
                  fill={d.color}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredIdx(i)}
                >
                  <title>{`${formatX(d.x)}: ${formatY(d.y)}`}</title>
                </circle>
              </g>
            );
          })}

          {yLabel && (
            <text
              transform="rotate(-90)"
              x={-ih / 2}
              y={-margin.left + 14}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11 }}
            >
              {yLabel}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
