import * as d3 from "d3";
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import companyBrands from "@/data/company_brands.json";

const defaultMargin = { top: 32, right: 20, bottom: 56, left: 64 };
const MIN_PERCENT_THRESHOLD = 5; // Companies below this % are grouped into "Other"
const MIN_HEIGHT_FOR_LABEL = 18; // Minimum block height (px) to show label

function getCompanyColor(company) {
  if (company === "Other") return "#a1a1aa";
  return companyBrands[company] || "#71717a";
}

function getContrastColor(hexColor) {
  if (!hexColor || hexColor.startsWith("hsl")) return "#fff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000" : "#fff";
}

/**
 * Stacked bar chart where each month's bar is composed of company blocks.
 * Small companies (< threshold %) are grouped into "Other".
 * Companies are stacked with the highest layoff count at the top.
 *
 * @param {object} props
 * @param {Array<{ date: Date, company: string, laidOff: number }>} props.records
 * @param {string} [props.xLabel]
 * @param {string} [props.yLabel]
 * @param {(d: Date) => string} [props.formatX]
 * @param {(n: number) => string} [props.formatY]
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {number} [props.minPercent] - Minimum percentage to show individually (default 5)
 */
export function StackedMonthlyChart({
  records,
  xLabel,
  yLabel,
  formatX = (d) => d3.timeFormat("%b %Y")(d),
  formatY = (n) => d3.format(",")(Math.round(n)),
  width = 640,
  height = 360,
  margin: marginProp,
  minPercent = MIN_PERCENT_THRESHOLD,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const [tip, setTip] = useState(null);
  const hideTip = useCallback(() => setTip(null), []);

  const { xScale, yScale, monthlyStacks, xTicks, yTicks } = useMemo(() => {
    if (!records?.length) {
      const xScale = d3.scaleTime().domain([new Date(), new Date()]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, 1]).nice().range([ih, 0]);
      return { xScale, yScale, monthlyStacks: [], xTicks: [], yTicks: [] };
    }

    // Group by month
    const byMonth = d3.rollups(
      records,
      (v) => {
        const monthTotal = d3.sum(v, (d) => d.laidOff);
        
        // Group by company within month
        const byCompany = d3.rollups(
          v,
          (cv) => d3.sum(cv, (d) => d.laidOff),
          (d) => d.company
        );

        // Separate into significant companies and "Other"
        const significant = [];
        let otherTotal = 0;
        const otherCompanies = [];

        byCompany.forEach(([company, total]) => {
          const percent = (total / monthTotal) * 100;
          if (percent >= minPercent) {
            significant.push({ company, total, percent });
          } else {
            otherTotal += total;
            otherCompanies.push(company);
          }
        });

        // Sort significant companies by total ascending (highest ends up on top)
        significant.sort((a, b) => a.total - b.total);

        // Prepend "Other" at the beginning so it's always at the bottom of the stack
        const result = [];
        if (otherTotal > 0) {
          result.push({
            company: "Other",
            total: otherTotal,
            percent: (otherTotal / monthTotal) * 100,
            otherCompanies,
          });
        }
        result.push(...significant);

        return { companies: result, monthTotal };
      },
      (d) => d3.timeMonth(d.date)
    );
    byMonth.sort((a, b) => a[0] - b[0]);

    // Calculate monthly totals for y scale
    const monthlyTotals = byMonth.map(([month, data]) => ({
      month,
      total: data.monthTotal,
      companies: data.companies,
    }));

    const start = monthlyTotals[0].month;
    const end = d3.timeMonth.offset(monthlyTotals[monthlyTotals.length - 1].month, 1);
    const xScale = d3.scaleTime().domain([start, end]).range([0, iw]);

    const maxY = d3.max(monthlyTotals, (d) => d.total) ?? 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([ih, 0]);

    // Build stacked rectangles for each month
    const monthlyStacks = monthlyTotals.map((m) => {
      const x0 = xScale(m.month);
      const x1 = xScale(d3.timeMonth.offset(m.month, 1));
      const bw = Math.max(1, x1 - x0 - 2);

      let cumulative = 0;
      const blocks = m.companies.map((c) => {
        const y0 = cumulative;
        cumulative += c.total;
        const color = getCompanyColor(c.company);
        return {
          company: c.company,
          total: c.total,
          percent: c.percent,
          y0,
          y1: cumulative,
          color,
          textColor: getContrastColor(color),
          otherCompanies: c.otherCompanies,
        };
      });

      return {
        key: m.month.getTime(),
        month: m.month,
        x: x0,
        w: bw,
        total: m.total,
        blocks,
      };
    });

    const xTicks = xScale.ticks(Math.min(12, Math.max(4, Math.floor(iw / 70))));
    const yTicks = yScale.ticks(5);

    return { xScale, yScale, monthlyStacks, xTicks, yTicks };
  }, [records, iw, ih, minPercent]);

  const fw = 11;
  const fmtK = (n) => (n >= 1000 ? d3.format(".1f")(n / 1000) + "k" : String(Math.round(n)));

  return (
    <div className={cn("relative", className)}>
      <svg
        width={width}
        height={height}
        className="overflow-visible text-foreground"
        role="img"
        aria-label={xLabel && yLabel ? `${yLabel} over ${xLabel}` : "Stacked monthly chart"}
        onMouseLeave={hideTip}
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

          {monthlyStacks.map((stack) => (
            <g key={stack.key}>
              {/* Stacked company blocks */}
              {stack.blocks.map((block, i) => {
                const rectY = yScale(block.y1);
                const rectH = yScale(block.y0) - yScale(block.y1);
                const showLabel = rectH >= MIN_HEIGHT_FOR_LABEL && stack.w >= 20;
                const labelText = block.company.length > 10 
                  ? block.company.slice(0, 8) + "…" 
                  : block.company;

                return (
                  <g key={`${stack.key}-${block.company}-${i}`}>
                    <rect
                      x={stack.x}
                      y={rectY}
                      width={stack.w}
                      height={Math.max(0, rectH)}
                      fill={block.color}
                      opacity={0.9}
                      stroke="#fff"
                      strokeWidth={rectH > 2 ? 0.5 : 0}
                      onMouseEnter={() =>
                        setTip({
                          x: stack.x + margin.left + stack.w / 2,
                          y: rectY + margin.top,
                          company: block.company,
                          total: block.total,
                          percent: block.percent,
                          month: stack.month,
                          monthTotal: stack.total,
                          otherCompanies: block.otherCompanies,
                        })
                      }
                    />
                    {/* Company label inside the block */}
                    {showLabel && (
                      <text
                        x={stack.x + stack.w / 2}
                        y={rectY + rectH / 2}
                        dy="0.35em"
                        textAnchor="middle"
                        fill={block.textColor}
                        style={{ 
                          fontSize: Math.min(10, stack.w / 5), 
                          fontWeight: 500,
                          pointerEvents: "none",
                        }}
                      >
                        {labelText}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Total label at top */}
              <text
                x={stack.x + stack.w / 2}
                y={yScale(stack.total) - 6}
                textAnchor="middle"
                className="fill-foreground"
                style={{ fontSize: 9, fontWeight: 500 }}
              >
                {fmtK(stack.total)}
              </text>
            </g>
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

      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
          style={{
            left: Math.min(width - 220, Math.max(8, tip.x - 110)),
            top: Math.max(8, tip.y - 70),
          }}
        >
          <div className="text-sm font-medium">{tip.company}</div>
          <div className="text-xs text-muted-foreground">
            {formatY(tip.total)} layoffs ({tip.percent.toFixed(1)}% of month)
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatX(tip.month)} total: {formatY(tip.monthTotal)}
          </div>
          {tip.otherCompanies && tip.otherCompanies.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              Includes: {tip.otherCompanies.slice(0, 5).join(", ")}
              {tip.otherCompanies.length > 5 && ` +${tip.otherCompanies.length - 5} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
