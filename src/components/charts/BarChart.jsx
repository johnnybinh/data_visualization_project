import * as d3 from "d3";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 20, right: 20, bottom: 56, left: 64 };

/**
 * Vertical or horizontal bar chart. D3 for scales only; React renders SVG.
 *
 * @param {object} props
 * @param {{ label: string, value: number }[]} props.data
 * @param {"vertical"|"horizontal"} [props.orientation="vertical"]
 * @param {string} [props.xLabel]
 * @param {string} [props.yLabel]
 * @param {(n: number) => string} [props.formatValue]
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} [props.margin]
 * @param {string} [props.className]
 */
export function BarChart({
  data,
  orientation = "vertical",
  xLabel,
  yLabel,
  formatValue = (n) => d3.format(",")(Math.round(n)),
  width = 640,
  height = 320,
  margin: marginProp,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const prepared = useMemo(() => data.filter((d) => d.value >= 0), [data]);

  const { xScale, yScale, bars } = useMemo(() => {
    if (orientation === "vertical") {
      const xScale = d3
        .scaleBand()
        .domain(prepared.map((d) => d.label))
        .range([0, iw])
        .padding(0.2);
      const max = d3.max(prepared, (d) => d.value) ?? 0;
      const yScale = d3.scaleLinear().domain([0, max]).nice().range([ih, 0]);
      const bars = prepared.map((d) => ({
        key: d.label,
        x: xScale(d.label),
        y: yScale(d.value),
        w: xScale.bandwidth(),
        h: ih - yScale(d.value),
        label: d.label,
        value: d.value,
      }));
      return { xScale, yScale, bars };
    }
    const yScale = d3
      .scaleBand()
      .domain(prepared.map((d) => d.label))
      .range([0, ih])
      .padding(0.15);
    const max = d3.max(prepared, (d) => d.value) ?? 0;
    const xScale = d3.scaleLinear().domain([0, max]).nice().range([0, iw]);
    const bars = prepared.map((d) => ({
      key: d.label,
      x: 0,
      y: yScale(d.label),
      w: xScale(d.value),
      h: yScale.bandwidth(),
      label: d.label,
      value: d.value,
    }));
    return { xScale, yScale, bars };
  }, [prepared, orientation, iw, ih]);

  const yTicks = orientation === "vertical" ? yScale.ticks(6) : xScale.ticks(6);
  const xTickLabels =
    orientation === "vertical" ? xScale.domain() : yScale.domain();

  const fw = 11;
  const labelRotate = orientation === "vertical" && xTickLabels.some((l) => l.length > 12);

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible text-foreground", className)}
      role="img"
      aria-label={xLabel && yLabel ? `${yLabel} by ${xLabel}` : "Bar chart"}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        <line x1={0} x2={iw} y1={ih} y2={ih} className="stroke-border" strokeWidth={1} />
        <line x1={0} x2={0} y1={0} y2={ih} className="stroke-border" strokeWidth={1} />

        {orientation === "vertical"
          ? yTicks.map((t) => (
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
                  {formatValue(t)}
                </text>
              </g>
            ))
          : yTicks.map((t) => (
              <g key={t} transform={`translate(${xScale(t)},0)`}>
                <line x1={0} x2={0} y1={ih} y2={ih + 5} className="stroke-muted-foreground" strokeWidth={1} />
                <text
                  x={0}
                  y={ih + 8}
                  dy="0.85em"
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: fw }}
                >
                  {formatValue(t)}
                </text>
              </g>
            ))}

        {orientation === "vertical"
          ? xTickLabels.map((lab) => (
              <text
                key={lab}
                x={(xScale(lab) ?? 0) + xScale.bandwidth() / 2}
                y={ih + (labelRotate ? 8 : 20)}
                textAnchor={labelRotate ? "end" : "middle"}
                transform={
                  labelRotate
                    ? `rotate(-40 ${(xScale(lab) ?? 0) + xScale.bandwidth() / 2} ${ih + 8})`
                    : undefined
                }
                className="fill-muted-foreground"
                style={{ fontSize: fw }}
              >
                {lab}
              </text>
            ))
          : xTickLabels.map((lab) => (
              <text
                key={lab}
                x={-8}
                y={(yScale(lab) ?? 0) + yScale.bandwidth() / 2}
                dy="0.35em"
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ fontSize: fw }}
              >
                {lab.length > 28 ? `${lab.slice(0, 26)}…` : lab}
              </text>
            ))}

        {bars.map((b) => (
          <rect
            key={b.key}
            x={b.x}
            y={b.y}
            width={Math.max(0, b.w)}
            height={Math.max(0, b.h)}
            className="fill-primary/80"
          >
            <title>{`${b.label}: ${formatValue(b.value)}`}</title>
          </rect>
        ))}

        {yLabel && orientation === "vertical" && (
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
        {xLabel && orientation === "vertical" && (
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
        {xLabel && orientation === "horizontal" && (
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
