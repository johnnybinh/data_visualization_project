import * as d3 from "d3";
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 40, right: 80, bottom: 20, left: 120 };
const CELL_HEIGHT = 32;

/**
 * Heatmap showing layoffs by industry and year.
 *
 * @param {object} props
 * @param {Array<{ industry: string, year: number, laidOff: number }>} props.records
 * @param {number} [props.width]
 * @param {number} [props.topN] - number of top industries to show
 */
export function IndustryHeatmap({
  records,
  width = 640,
  topN = 12,
  margin: marginProp,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;

  const [tip, setTip] = useState(null);
  const hideTip = useCallback(() => setTip(null), []);

  const { industries, years, matrix, colorScale, maxVal, height, xScale, yScale } = useMemo(() => {
    if (!records?.length) {
      return { industries: [], years: [], matrix: [], colorScale: () => "#fff", maxVal: 0, height: 200, xScale: null, yScale: null };
    }

    const years = [...new Set(records.map((d) => d.year))].sort((a, b) => a - b);

    const byIndustry = d3.rollups(
      records,
      (v) => d3.sum(v, (d) => d.laidOff),
      (d) => d.industry || "Unknown"
    );
    byIndustry.sort((a, b) => b[1] - a[1]);
    const industries = byIndustry.slice(0, topN).map((d) => d[0]);

    const grouped = d3.rollups(
      records.filter((d) => industries.includes(d.industry || "Unknown")),
      (v) => d3.sum(v, (d) => d.laidOff),
      (d) => d.industry || "Unknown",
      (d) => d.year
    );

    const matrix = [];
    const lookup = new Map();
    grouped.forEach(([industry, yearData]) => {
      yearData.forEach(([year, total]) => {
        lookup.set(`${industry}-${year}`, total);
      });
    });

    industries.forEach((industry) => {
      years.forEach((year) => {
        matrix.push({
          industry,
          year,
          value: lookup.get(`${industry}-${year}`) || 0,
        });
      });
    });

    const maxVal = d3.max(matrix, (d) => d.value) || 1;

    const colorScale = d3
      .scaleSequential()
      .domain([0, maxVal])
      .interpolator(d3.interpolateBlues);

    const height = margin.top + margin.bottom + industries.length * CELL_HEIGHT;
    const ih = height - margin.top - margin.bottom;

    const xScale = d3
      .scaleBand()
      .domain(years)
      .range([0, iw])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(industries)
      .range([0, ih])
      .padding(0.05);

    return { industries, years, matrix, colorScale, maxVal, height, xScale, yScale };
  }, [records, topN, iw, margin.top, margin.bottom]);

  if (!industries.length) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const ih = height - margin.top - margin.bottom;
  const fw = 11;
  const fmtNum = (n) => d3.format(",")(Math.round(n));
  const fmtK = (n) => (n >= 1000 ? d3.format(".1f")(n / 1000) + "k" : String(n));

  const legendWidth = 60;
  const legendHeight = ih;
  const legendScale = d3.scaleLinear().domain([0, maxVal]).range([legendHeight, 0]);
  const legendTicks = legendScale.ticks(5);

  return (
    <div className={cn("relative", className)}>
      <svg
        width={width}
        height={height}
        className="overflow-visible text-foreground"
        role="img"
        aria-label="Industry layoffs heatmap"
        onMouseLeave={hideTip}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Year labels (top) */}
          {years.map((year) => (
            <text
              key={year}
              x={xScale(year) + xScale.bandwidth() / 2}
              y={-10}
              textAnchor="middle"
              className="fill-muted-foreground font-medium"
              style={{ fontSize: 12 }}
            >
              {year}
            </text>
          ))}

          {/* Industry labels (left) */}
          {industries.map((industry) => (
            <text
              key={industry}
              x={-8}
              y={yScale(industry) + yScale.bandwidth() / 2}
              dy="0.35em"
              textAnchor="end"
              className="fill-foreground"
              style={{ fontSize: fw }}
            >
              {industry.length > 16 ? `${industry.slice(0, 14)}…` : industry}
            </text>
          ))}

          {/* Cells */}
          {matrix.map((cell) => {
            const x = xScale(cell.year);
            const y = yScale(cell.industry);
            const cellW = xScale.bandwidth();
            const cellH = yScale.bandwidth();

            return (
              <g key={`${cell.industry}-${cell.year}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  fill={cell.value > 0 ? colorScale(cell.value) : "#f8fafc"}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  rx={2}
                  onMouseEnter={() =>
                    setTip({
                      x: x + margin.left + cellW / 2,
                      y: y + margin.top,
                      industry: cell.industry,
                      year: cell.year,
                      value: cell.value,
                    })
                  }
                />
                {cell.value > 0 && cellW > 30 && (
                  <text
                    x={x + cellW / 2}
                    y={y + cellH / 2}
                    dy="0.35em"
                    textAnchor="middle"
                    fill={cell.value > maxVal * 0.5 ? "#fff" : "#1e293b"}
                    style={{ fontSize: 10, fontWeight: 500 }}
                  >
                    {fmtK(cell.value)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${iw + 20}, 0)`}>
            <defs>
              <linearGradient id="heatmap-legend-gradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={colorScale(0)} />
                <stop offset="100%" stopColor={colorScale(maxVal)} />
              </linearGradient>
            </defs>
            <rect
              x={0}
              y={0}
              width={12}
              height={legendHeight}
              fill="url(#heatmap-legend-gradient)"
              stroke="#e2e8f0"
              strokeWidth={1}
              rx={2}
            />
            {legendTicks.map((t) => (
              <g key={t} transform={`translate(0,${legendScale(t)})`}>
                <line x1={12} x2={16} y1={0} y2={0} className="stroke-muted-foreground" strokeWidth={1} />
                <text
                  x={20}
                  y={0}
                  dy="0.35em"
                  textAnchor="start"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {fmtK(t)}
                </text>
              </g>
            ))}
          </g>
        </g>
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
          style={{
            left: Math.min(width - 180, Math.max(8, tip.x - 90)),
            top: Math.max(8, tip.y - 52),
          }}
        >
          <div className="text-sm font-medium">{tip.industry}</div>
          <div className="text-xs text-muted-foreground">
            {tip.year}: {fmtNum(tip.value)} layoffs
          </div>
        </div>
      )}
    </div>
  );
}
