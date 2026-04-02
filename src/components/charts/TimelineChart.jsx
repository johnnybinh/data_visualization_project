import * as d3 from "d3";
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 24, right: 24, bottom: 60, left: 68 };

/**
 * Monthly layoff bars + event markers on a shared time scale.
 *
 * @param {object} props
 * @param {{ month: Date, total: number }[]} props.monthly
 * @param {{ date: string, title: string, category?: string }[]} props.events
 * @param {number} [props.width]
 * @param {number} [props.height]
 */
export function TimelineChart({
  monthly,
  events,
  width = 720,
  height = 340,
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
          at: d3.timeParse("%Y-%m-%d")(e.date) ?? d3.timeParse("%Y-%m-%d")(e.date.slice(0, 10)),
        }))
        .filter((e) => e.at),
    [events]
  );

  const monthRows = useMemo(() => {
    const sorted = [...monthly].sort((a, b) => a.month - b.month);
    return sorted;
  }, [monthly]);

  const [tip, setTip] = useState(null);

  const hideTip = useCallback(() => setTip(null), []);

  const { xScale, yScale, bars, markers } = useMemo(() => {
    if (!monthRows.length) {
      const xScale = d3.scaleTime().domain([new Date(2020, 0, 1), new Date(2025, 11, 31)]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, 1]).nice().range([ih, 0]);
      return { xScale, yScale, bars: [], markers: [] };
    }
    const start = monthRows[0].month;
    const end = d3.timeMonth.offset(monthRows[monthRows.length - 1].month, 1);
    const xScale = d3.scaleTime().domain([start, end]).range([0, iw]);
    const maxY = d3.max(monthRows, (d) => d.total) ?? 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([ih, 0]);

    const bars = monthRows.map((d) => {
      const x0 = xScale(d.month);
      const x1 = xScale(d3.timeMonth.offset(d.month, 1));
      const bw = Math.max(1, x1 - x0 - 1);
      return {
        key: d.month.getTime(),
        x: x0,
        y: yScale(d.total),
        w: bw,
        h: ih - yScale(d.total),
        month: d.month,
        total: d.total,
      };
    });

    const markers = parsedEvents
      .map((e) => {
        const x = xScale(e.at);
        if (x < 0 || x > iw) return null;
        return { ...e, x };
      })
      .filter(Boolean);

    return { xScale, yScale, bars, markers };
  }, [monthRows, parsedEvents, iw, ih]);

  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(d3.timeMonth.every(3));

  const fw = 11;
  const fmtMonth = d3.timeFormat("%b %Y");
  const fmtNum = (n) => d3.format(",")(Math.round(n));

  return (
    <div className={cn("relative", className)}>
      <svg
        width={width}
        height={height}
        className="overflow-visible text-foreground"
        role="img"
        aria-label="Layoffs by month with AI and economic events"
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
                {fmtNum(t)}
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
                {fmtMonth(t)}
              </text>
            </g>
          ))}

          {bars.map((b) => (
            <rect
              key={b.key}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              className="fill-primary/70"
              onMouseEnter={() =>
                setTip({
                  kind: "layoff",
                  x: b.x + margin.left + b.w / 2,
                  y: b.y + margin.top,
                  title: fmtMonth(b.month),
                  body: `${fmtNum(b.total)} workers (layoffs recorded this month)`,
                })
              }
            />
          ))}

          {markers.map((m) => (
            <g key={`${m.date}-${m.title}`} transform={`translate(${m.x},0)`}>
              <line x1={0} x2={0} y1={ih} y2={0} className="stroke-chart-2" strokeWidth={1.5} />
              <circle
                cx={0}
                cy={8}
                r={5}
                className="fill-chart-2 stroke-background"
                strokeWidth={1}
                onMouseEnter={() =>
                  setTip({
                    kind: "event",
                    x: m.x + margin.left,
                    y: margin.top + 8,
                    title: m.title,
                    body: d3.timeFormat("%Y-%m-%d")(m.at),
                  })
                }
              />
            </g>
          ))}

          <text
            transform="rotate(-90)"
            x={-ih / 2}
            y={-margin.left + 16}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 12 }}
          >
            Layoffs (headcount)
          </text>
          <text
            x={iw / 2}
            y={ih + margin.bottom - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 12 }}
          >
            Time (calendar month)
          </text>
        </g>
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
          style={{
            left: Math.min(width - 200, Math.max(8, tip.x - 100)),
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
