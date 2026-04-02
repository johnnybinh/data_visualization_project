import * as d3 from "d3";
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const defaultMargin = { top: 40, right: 24, bottom: 50, left: 60 };

const RISE_COLOR = "#ef4444"; // red-500
const FALL_COLOR = "#3b82f6"; // blue-500
const NEUTRAL_COLOR = "#71717a"; // zinc-500

/**
 * Combined visualization: line chart of layoffs + event markers on shared time axis.
 * Line segments are colored red (increasing) or blue (decreasing).
 *
 * @param {object} props
 * @param {Array<{ date: Date, total: number }>} props.data - Monthly layoff data
 * @param {Array<{ date: Date, title: string, category?: string }>} props.events - AI/Economic events
 * @param {number} [props.width=800]
 * @param {number} [props.height=400]
 */
export function LayoffTimelineChart({
  data,
  events,
  width = 800,
  height = 400,
  margin: marginProp,
  className,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const [tooltip, setTooltip] = useState(null);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  // Process and sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.date - b.date);
  }, [data]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.date - b.date);
  }, [events]);

  // Scales
  const { xScale, yScale } = useMemo(() => {
    if (!sortedData.length) {
      return {
        xScale: d3.scaleTime().domain([new Date(), new Date()]).range([0, innerWidth]),
        yScale: d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]),
      };
    }

    const xExtent = d3.extent(sortedData, (d) => d.date);
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const maxY = d3.max(sortedData, (d) => d.total) || 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([innerHeight, 0]);

    return { xScale, yScale };
  }, [sortedData, innerWidth, innerHeight]);

  // Line segments with colors based on direction
  const lineSegments = useMemo(() => {
    if (sortedData.length < 2) return [];

    const segments = [];
    for (let i = 0; i < sortedData.length - 1; i++) {
      const curr = sortedData[i];
      const next = sortedData[i + 1];
      const isRising = next.total > curr.total;

      segments.push({
        x1: xScale(curr.date),
        y1: yScale(curr.total),
        x2: xScale(next.date),
        y2: yScale(next.total),
        color: isRising ? RISE_COLOR : FALL_COLOR,
      });
    }
    return segments;
  }, [sortedData, xScale, yScale]);

  // Data points for interaction
  const dataPoints = useMemo(() => {
    return sortedData.map((d, i) => {
      let color = NEUTRAL_COLOR;
      if (i > 0) {
        color = d.total > sortedData[i - 1].total ? RISE_COLOR : FALL_COLOR;
      }
      return {
        ...d,
        cx: xScale(d.date),
        cy: yScale(d.total),
        color,
      };
    });
  }, [sortedData, xScale, yScale]);

  // Event markers positioned on shared x scale
  const eventMarkers = useMemo(() => {
    return sortedEvents
      .map((e) => {
        const x = xScale(e.date);
        if (x < 0 || x > innerWidth) return null;
        return {
          ...e,
          x,
        };
      })
      .filter(Boolean);
  }, [sortedEvents, xScale, innerWidth]);

  // Axis ticks
  const xTicks = useMemo(() => xScale.ticks(Math.min(10, Math.floor(innerWidth / 80))), [xScale, innerWidth]);
  const yTicks = useMemo(() => yScale.ticks(6), [yScale]);

  // Formatters
  const formatDate = d3.timeFormat("%b %Y");
  const formatValue = (n) => (n >= 1000 ? d3.format(".0f")(n / 1000) + "k" : String(n));

  return (
    <div className={cn("relative", className)}>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5" style={{ backgroundColor: RISE_COLOR }} />
          <span className="text-muted-foreground">Increasing (↑)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5" style={{ backgroundColor: FALL_COLOR }} />
          <span className="text-muted-foreground">Decreasing (↓)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
          <span className="text-muted-foreground">AI milestone</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-5" />
          <span className="text-muted-foreground">Economic event</span>
        </span>
      </div>

      <svg
        width={width}
        height={height}
        className="overflow-visible"
        onMouseLeave={hideTooltip}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={tick}
              x1={0}
              x2={innerWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          ))}

          {/* X axis */}
          <line
            x1={0}
            x2={innerWidth}
            y1={innerHeight}
            y2={innerHeight}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />

          {/* Y axis */}
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={innerHeight}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />

          {/* X axis ticks and labels */}
          {xTicks.map((tick) => (
            <g key={tick.getTime()} transform={`translate(${xScale(tick)},${innerHeight})`}>
              <line y1={0} y2={6} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              <text
                y={20}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={10}
              >
                {formatDate(tick)}
              </text>
            </g>
          ))}

          {/* Y axis ticks and labels */}
          {yTicks.map((tick) => (
            <g key={tick} transform={`translate(0,${yScale(tick)})`}>
              <line x1={-6} x2={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              <text
                x={-10}
                dy="0.32em"
                textAnchor="end"
                fill="hsl(var(--muted-foreground))"
                fontSize={10}
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {/* Y axis label */}
          <text
            transform={`rotate(-90)`}
            x={-innerHeight / 2}
            y={-margin.left + 16}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={11}
          >
            Layoffs
          </text>

          {/* Line segments colored by direction */}
          {lineSegments.map((seg, i) => (
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

          {/* Event markers - vertical lines */}
          {eventMarkers.map((event, i) => (
            <g key={`event-${i}`}>
              {/* Vertical line from bottom to marker */}
              <line
                x1={event.x}
                x2={event.x}
                y1={innerHeight}
                y2={-20}
                stroke={event.category === "ai" ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"}
                strokeWidth={1}
                strokeDasharray={event.category === "ai" ? "none" : "3,3"}
                opacity={0.6}
              />
              {/* Event marker circle */}
              <circle
                cx={event.x}
                cy={-20}
                r={5}
                fill={event.category === "ai" ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setTooltip({
                    type: "event",
                    x: event.x + margin.left,
                    y: margin.top - 20,
                    title: event.title,
                    date: formatDate(event.date),
                    category: event.category,
                  })
                }
              />
            </g>
          ))}

          {/* Data points for interaction */}
          {dataPoints.map((point, i) => (
            <circle
              key={i}
              cx={point.cx}
              cy={point.cy}
              r={tooltip?.type === "data" && tooltip?.date === formatDate(point.date) ? 6 : 4}
              fill={point.color}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              style={{ cursor: "pointer" }}
              onMouseEnter={() =>
                setTooltip({
                  type: "data",
                  x: point.cx + margin.left,
                  y: point.cy + margin.top,
                  date: formatDate(point.date),
                  value: point.total,
                })
              }
            />
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[140px] rounded-md border border-border bg-popover px-3 py-2 shadow-md"
          style={{
            left: Math.min(width - 160, Math.max(8, tooltip.x - 70)),
            top: tooltip.type === "event" ? tooltip.y + 30 : Math.max(8, tooltip.y - 60),
          }}
        >
          {tooltip.type === "data" ? (
            <>
              <div className="text-xs text-muted-foreground">{tooltip.date}</div>
              <div className="text-sm font-semibold text-foreground">
                {d3.format(",")(tooltip.value)} layoffs
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                {tooltip.date} · <span className="capitalize">{tooltip.category}</span>
              </div>
              <div className="text-sm font-medium text-foreground">{tooltip.title}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
