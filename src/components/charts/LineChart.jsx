import * as d3 from "d3";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 20, right: 20, bottom: 56, left: 64 };

/**
 * @param {object} props
 * @param {{ x: Date, y: number }[]} props.data sorted by x ascending
 * @param {string} [props.xLabel]
 * @param {string} [props.yLabel]
 * @param {(d: Date) => string} [props.formatX]
 * @param {(n: number) => string} [props.formatY]
 * @param {number} [props.width]
 * @param {number} [props.height]
 */
export function LineChart({
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

  const series = useMemo(() => data.filter((d) => d.y >= 0), [data]);

  const { xScale, yScale, pathD, dots } = useMemo(() => {
    if (!series.length) {
      const xScale = d3.scaleTime().domain([new Date(), new Date()]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, 1]).nice().range([ih, 0]);
      return { xScale, yScale, pathD: "", dots: [] };
    }
    const xExtent = d3.extent(series, (d) => d.x);
    const xScale = d3.scaleTime().domain(xExtent).range([0, iw]);
    const maxY = d3.max(series, (d) => d.y) ?? 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([ih, 0]);
    const line = d3
      .line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));
    const pathD = line(series) ?? "";
    const dots = series.map((d) => ({
      cx: xScale(d.x),
      cy: yScale(d.y),
      x: d.x,
      y: d.y,
    }));
    return { xScale, yScale, pathD, dots };
  }, [series, iw, ih]);

  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(Math.min(8, Math.max(4, Math.floor(iw / 80))));

  const fw = 11;

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible text-foreground", className)}
      role="img"
      aria-label={xLabel && yLabel ? `${yLabel} over ${xLabel}` : "Line chart"}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        <line x1={0} x2={iw} y1={ih} y2={ih} className="stroke-border" strokeWidth={1} />
        <line x1={0} x2={0} y1={0} y2={ih} className="stroke-border" strokeWidth={1} />

        {yTicks.map((t) => (
          <g key={t} transform={`translate(0,${yScale(t)})`}>
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

        {pathD && (
          <path d={pathD} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />
        )}
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={3} className="fill-primary">
            <title>{`${formatX(d.x)} — ${formatY(d.y)}`}</title>
          </circle>
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
  );
}
