import * as d3 from "d3";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import companyBrands from "@/data/company_brands.json";

const defaultMargin = { top: 20, right: 60, bottom: 56, left: 140 };
const ICON_SIZE = 22;
const BAR_HEIGHT = 30;

function getInitials(name) {
  const words = name.split(/[\s.]+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getContrastColor(hexColor) {
  if (!hexColor || hexColor === "hsl(var(--primary))") return "#fff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000" : "#fff";
}

/**
 * Horizontal bar chart with company brand colors and initials.
 *
 * @param {object} props
 * @param {{ label: string, value: number }[]} props.data
 * @param {string} [props.xLabel]
 * @param {(n: number) => string} [props.formatValue]
 * @param {number} [props.width]
 * @param {string} [props.className]
 */
export function BrandedBarChart({
  data,
  xLabel,
  formatValue = (n) => d3.format(",")(Math.round(n)),
  width = 640,
  margin: marginProp,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;

  const prepared = useMemo(() => data.filter((d) => d.value >= 0), [data]);

  const height = margin.top + margin.bottom + prepared.length * BAR_HEIGHT;
  const ih = height - margin.top - margin.bottom;

  const { xScale, yScale, bars } = useMemo(() => {
    const yScale = d3
      .scaleBand()
      .domain(prepared.map((d) => d.label))
      .range([0, ih])
      .padding(0.2);

    const max = d3.max(prepared, (d) => d.value) ?? 0;
    const xScale = d3.scaleLinear().domain([0, max]).nice().range([0, iw]);

    const bars = prepared.map((d) => {
      const color = companyBrands[d.label] || "#71717a";
      return {
        key: d.label,
        x: 0,
        y: yScale(d.label),
        w: xScale(d.value),
        h: yScale.bandwidth(),
        label: d.label,
        value: d.value,
        color,
        initials: getInitials(d.label),
        textColor: getContrastColor(color),
      };
    });

    return { xScale, yScale, bars };
  }, [prepared, iw, ih]);

  const xTicks = xScale.ticks(6);
  const fw = 11;

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible text-foreground", className)}
      role="img"
      aria-label="Company layoffs bar chart"
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        <line x1={0} x2={iw} y1={ih} y2={ih} className="stroke-border" strokeWidth={1} />
        <line x1={0} x2={0} y1={0} y2={ih} className="stroke-border" strokeWidth={1} />

        {xTicks.map((t) => (
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

        {bars.map((b) => {
          const barCenterY = b.y + b.h / 2;

          return (
            <g key={b.key}>
              {/* Icon with initials */}
              <g transform={`translate(${-ICON_SIZE - 8},${barCenterY - ICON_SIZE / 2})`}>
                <rect
                  x={0}
                  y={0}
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  rx={4}
                  fill={b.color}
                />
                <text
                  x={ICON_SIZE / 2}
                  y={ICON_SIZE / 2}
                  dy="0.35em"
                  textAnchor="middle"
                  fill={b.textColor}
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  {b.initials}
                </text>
              </g>

              {/* Company name */}
              <text
                x={-ICON_SIZE - 14}
                y={barCenterY}
                dy="0.35em"
                textAnchor="end"
                className="fill-foreground"
                style={{ fontSize: fw }}
              >
                {b.label.length > 14 ? `${b.label.slice(0, 12)}…` : b.label}
              </text>

              {/* Bar */}
              <rect
                x={b.x}
                y={b.y}
                width={Math.max(0, b.w)}
                height={b.h}
                fill={b.color}
                opacity={0.8}
                rx={2}
              >
                <title>{`${b.label}: ${formatValue(b.value)}`}</title>
              </rect>

              {/* Value label */}
              <text
                x={b.w + 6}
                y={barCenterY}
                dy="0.35em"
                textAnchor="start"
                className="fill-muted-foreground"
                style={{ fontSize: 10 }}
              >
                {formatValue(b.value)}
              </text>
            </g>
          );
        })}

        {xLabel && (
          <text
            x={iw / 2}
            y={ih + margin.bottom - 10}
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
