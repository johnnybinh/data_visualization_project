import * as d3 from "d3";
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 32, right: 24, bottom: 60, left: 72 };

/**
 * Yearly layoff bars + event markers on a shared time scale.
 *
 * @param {object} props
 * @param {{ year: number, total: number }[]} props.yearly
 * @param {{ date: string, title: string, category?: string }[]} props.events
 * @param {number} [props.width]
 * @param {number} [props.height]
 */
export function YearlyTimelineChart({
  yearly,
  events,
  width = 720,
  height = 400,
  margin: marginProp,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const parsedEvents = useMemo(
    () =>
      events
        .map((e) => ({
          ...e,
          at: d3.timeParse("%Y-%m-%d")(e.date),
        }))
        .filter((e) => e.at),
    [events]
  );

  const yearRows = useMemo(() => {
    const sorted = [...yearly].sort((a, b) => a.year - b.year);
    return sorted;
  }, [yearly]);

  const [tip, setTip] = useState(null);

  const hideTip = useCallback(() => setTip(null), []);

  const { xScale, yScale, bars, markers, yearLabels } = useMemo(() => {
    if (!yearRows.length) {
      const xScale = d3.scaleTime().domain([new Date(2020, 0, 1), new Date(2025, 11, 31)]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, 1]).nice().range([ih, 0]);
      return { xScale, yScale, bars: [], markers: [], yearLabels: [] };
    }

    const minYear = Math.min(...yearRows.map((d) => d.year));
    const maxYear = Math.max(...yearRows.map((d) => d.year));
    const start = new Date(minYear, 0, 1);
    const end = new Date(maxYear + 1, 0, 1);
    const xScale = d3.scaleTime().domain([start, end]).range([0, iw]);

    const maxY = d3.max(yearRows, (d) => d.total) ?? 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([ih, 0]);

    const bars = yearRows.map((d) => {
      const x0 = xScale(new Date(d.year, 0, 1));
      const x1 = xScale(new Date(d.year + 1, 0, 1));
      const padding = (x1 - x0) * 0.15;
      const bw = Math.max(1, x1 - x0 - padding * 2);
      return {
        key: d.year,
        x: x0 + padding,
        y: yScale(d.total),
        w: bw,
        h: ih - yScale(d.total),
        year: d.year,
        total: d.total,
      };
    });

    const yearLabels = yearRows.map((d) => {
      const x0 = xScale(new Date(d.year, 0, 1));
      const x1 = xScale(new Date(d.year + 1, 0, 1));
      return {
        year: d.year,
        x: (x0 + x1) / 2,
      };
    });

    const markers = parsedEvents
      .map((e) => {
        const x = xScale(e.at);
        if (x < 0 || x > iw) return null;
        return { ...e, x };
      })
      .filter(Boolean);

    return { xScale, yScale, bars, markers, yearLabels };
  }, [yearRows, parsedEvents, iw, ih]);

  const yTicks = yScale.ticks(5);

  const fw = 11;
  const fmtNum = (n) => d3.format(",")(Math.round(n));
  const fmtK = (n) => (n >= 1000 ? d3.format(".0f")(n / 1000) + "k" : d3.format(",")(n));

  return (
    <div className={cn("relative", className)}>
      <svg
        width={width}
        height={height}
        className="overflow-visible text-foreground"
        role="img"
        aria-label="Layoffs by year with AI and economic events"
        onMouseLeave={hideTip}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          <line x1={0} x2={iw} y1={ih} y2={ih} className="stroke-border" strokeWidth={1} />
          <line x1={0} x2={0} y1={0} y2={ih} className="stroke-border" strokeWidth={1} />

          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${yScale(t)})`}>
              <line x1={0} x2={iw} y1={0} y2={0} className="stroke-border/50" strokeWidth={1} strokeDasharray="2,4" />
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

          {yearLabels.map((yl) => (
            <text
              key={yl.year}
              x={yl.x}
              y={ih + 20}
              textAnchor="middle"
              className="fill-muted-foreground font-medium"
              style={{ fontSize: 12 }}
            >
              {yl.year}
            </text>
          ))}

          {bars.map((b) => (
            <g key={b.key}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                className="fill-primary/80"
                onMouseEnter={() =>
                  setTip({
                    kind: "layoff",
                    x: b.x + margin.left + b.w / 2,
                    y: b.y + margin.top,
                    title: String(b.year),
                    body: `${fmtNum(b.total)} layoffs recorded`,
                  })
                }
              />
              <text
                x={b.x + b.w / 2}
                y={b.y - 6}
                textAnchor="middle"
                className="fill-foreground font-medium"
                style={{ fontSize: 11 }}
              >
                {fmtK(b.total)}
              </text>
            </g>
          ))}

          {markers.map((m, i) => (
            <g key={`${m.date}-${i}`} transform={`translate(${m.x},0)`}>
              <line
                x1={0}
                x2={0}
                y1={ih}
                y2={-8}
                className={m.category === "ai" ? "stroke-chart-2" : "stroke-chart-5"}
                strokeWidth={1.5}
                strokeDasharray={m.category === "ai" ? "none" : "4,3"}
              />
              <circle
                cx={0}
                cy={-12}
                r={5}
                className={m.category === "ai" ? "fill-chart-2 stroke-background" : "fill-chart-5 stroke-background"}
                strokeWidth={1.5}
                onMouseEnter={() =>
                  setTip({
                    kind: "event",
                    x: m.x + margin.left,
                    y: margin.top - 12,
                    title: m.title,
                    body: `${d3.timeFormat("%b %d, %Y")(m.at)} (${m.category})`,
                  })
                }
              />
            </g>
          ))}

          <text
            transform="rotate(-90)"
            x={-ih / 2}
            y={-margin.left + 18}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 12 }}
          >
            Layoffs (headcount)
          </text>
          <text
            x={iw / 2}
            y={ih + margin.bottom - 12}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 12 }}
          >
            Year
          </text>
        </g>
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
          style={{
            left: Math.min(width - 220, Math.max(8, tip.x - 110)),
            top: Math.max(8, tip.y - 56),
          }}
        >
          <div className="text-sm font-medium leading-snug">{tip.title}</div>
          <div className="text-xs text-muted-foreground">{tip.body}</div>
        </div>
      )}
    </div>
  );
}
