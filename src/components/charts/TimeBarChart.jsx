import * as d3 from "d3";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 20, right: 20, bottom: 56, left: 64 };

const RISE_COLOR = "#ef4444"; // red-500
const FALL_COLOR = "#3b82f6"; // blue-500
const NEUTRAL_COLOR = "#71717a"; // zinc-500

/**
 * Bar chart with time (Date) on X axis. Each bar represents a time bucket (e.g. month).
 * Bars are colored red if value increased from previous, blue if decreased.
 *
 * @param {object} props
 * @param {{ x: Date, y: number }[]} props.data sorted by x ascending
 * @param {string} [props.xLabel]
 * @param {string} [props.yLabel]
 * @param {(d: Date) => string} [props.formatX]
 * @param {(n: number) => string} [props.formatY]
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {boolean} [props.showLegend=true]
 */
export function TimeBarChart({
  data,
  xLabel,
  yLabel,
  formatX = (d) => d3.timeFormat("%b %Y")(d),
  formatY = (n) => d3.format(",")(Math.round(n)),
  width = 640,
  height = 300,
  margin: marginProp,
  showLegend = true,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const series = useMemo(() => data.filter((d) => d.y >= 0), [data]);

  const { xScale, yScale, bars, xTicks, yTicks } = useMemo(() => {
    if (!series.length) {
      const xScale = d3.scaleTime().domain([new Date(), new Date()]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, 1]).nice().range([ih, 0]);
      return { xScale, yScale, bars: [], xTicks: [], yTicks: [] };
    }

    const start = d3.timeMonth(series[0].x);
    const end = d3.timeMonth.offset(series[series.length - 1].x, 1);
    const xScale = d3.scaleTime().domain([start, end]).range([0, iw]);

    const maxY = d3.max(series, (d) => d.y) ?? 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([ih, 0]);

    const bars = series.map((d, i) => {
      const x0 = xScale(d3.timeMonth(d.x));
      const x1 = xScale(d3.timeMonth.offset(d.x, 1));
      const bw = Math.max(1, x1 - x0 - 1);
      
      // Determine color based on comparison with previous month
      let color = NEUTRAL_COLOR;
      let trend = "neutral";
      if (i > 0) {
        const prev = series[i - 1].y;
        if (d.y > prev) {
          color = RISE_COLOR;
          trend = "up";
        } else if (d.y < prev) {
          color = FALL_COLOR;
          trend = "down";
        }
      }

      return {
        key: d.x.getTime(),
        x: x0,
        y: yScale(d.y),
        w: bw,
        h: ih - yScale(d.y),
        date: d.x,
        value: d.y,
        color,
        trend,
      };
    });

    const xTicks = xScale.ticks(Math.min(12, Math.max(4, Math.floor(iw / 70))));
    const yTicks = yScale.ticks(5);

    return { xScale, yScale, bars, xTicks, yTicks };
  }, [series, iw, ih]);

  const fw = 11;

  return (
    <div className={cn("w-full", className)}>
      {/* Legend */}
      {showLegend && (
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
      )}

      <svg
        width={width}
        height={height}
        className="overflow-visible text-foreground"
        role="img"
        aria-label={xLabel && yLabel ? `${yLabel} over ${xLabel}` : "Time bar chart"}
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
                {formatY(t)}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <g key={t.getTime()} transform={`translate(${xScale(t)},${ih})`}>
              <line x1={0} x2={0} y1={0} y2={5} className="stroke-muted-foreground" strokeWidth={1} />
              <text
                x={0}
                y={8}
                dy="0.85em"
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: fw }}
              >
                {formatX(t)}
              </text>
            </g>
          ))}

          {bars.map((b) => (
            <rect
              key={b.key}
              x={b.x}
              y={b.y}
              width={Math.max(0, b.w)}
              height={Math.max(0, b.h)}
              fill={b.color}
              opacity={0.85}
              rx={1}
            >
              <title>{`${formatX(b.date)}: ${formatY(b.value)}`}</title>
            </rect>
          ))}

          {yLabel && (
            <text
              transform="rotate(-90)"
              x={-ih / 2}
              y={-margin.left + 16}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 12 }}
            >
              {yLabel}
            </text>
          )}
          {xLabel && (
            <text
              x={iw / 2}
              y={ih + margin.bottom - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 12 }}
            >
              {xLabel}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
