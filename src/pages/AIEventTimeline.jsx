import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useLayoffData } from "@/context/LayoffDataContext";
import { groupByMonth } from "@/lib/dataHelpers";
import eventsData from "@/data/ai_economic_events.json";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { LayoffTimelineChart } from "@/components/charts/LayoffTimelineChart";
import { useContainerWidth } from "@/hooks/useContainerWidth";

const parseDate = d3.timeParse("%Y-%m-%d");
const YEARS = ["all", 2020, 2021, 2022, 2023, 2024, 2025];

export function AIEventTimeline() {
  const { records, loading, error } = useLayoffData();
  const [selectedYear, setSelectedYear] = useState("all");
  const ref = useRef(null);
  const w = useContainerWidth(ref);

  // Filter records by year
  const filteredRecords = useMemo(() => {
    if (!records?.length) return [];
    if (selectedYear === "all") return records;
    return records.filter((d) => d.year === Number(selectedYear));
  }, [records, selectedYear]);

  // Transform layoff data to { date, total } format
  const layoffsByMonth = useMemo(() => {
    if (!filteredRecords.length) return [];
    return groupByMonth(filteredRecords).map((d) => ({
      date: d.month,
      total: d.total,
    }));
  }, [filteredRecords]);

  // Parse all events with dates
  const allEvents = useMemo(() => {
    return eventsData
      .map((e) => ({
        date: parseDate(e.date),
        title: e.title,
        category: e.category,
        dateStr: e.date,
      }))
      .filter((e) => e.date);
  }, []);

  // Filter events by selected year
  const filteredEvents = useMemo(() => {
    if (selectedYear === "all") return allEvents;
    return allEvents.filter((e) => e.date.getFullYear() === Number(selectedYear));
  }, [allEvents, selectedYear]);

  // Separate filtered events by category for the legend lists
  const aiEvents = useMemo(() => {
    if (selectedYear === "all") {
      return eventsData.filter((e) => e.category === "ai");
    }
    return eventsData.filter(
      (e) => e.category === "ai" && e.date.startsWith(String(selectedYear))
    );
  }, [selectedYear]);

  const econEvents = useMemo(() => {
    if (selectedYear === "all") {
      return eventsData.filter((e) => e.category === "economic");
    }
    return eventsData.filter(
      (e) => e.category === "economic" && e.date.startsWith(String(selectedYear))
    );
  }, [selectedYear]);

  // Calculate stats for selected period
  const stats = useMemo(() => {
    if (!filteredRecords.length) return null;
    const total = d3.sum(filteredRecords, (d) => d.laidOff);
    const peakMonth = layoffsByMonth.reduce(
      (max, d) => (d.total > max.total ? d : max),
      { total: 0, date: null }
    );
    return { total, peakMonth };
  }, [filteredRecords, layoffsByMonth]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading dataset…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load data: {error.message}
      </p>
    );
  }

  const chartWidth = Math.max(w - 48, 400);
  const fmt = (n) => d3.format(",")(Math.round(n));
  const formatMonth = d3.timeFormat("%b %Y");

  return (
    <div ref={ref} className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Layoffs and macro context</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Monthly layoffs with AI and economic event markers on the same time axis.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="year-select" className="text-xs font-medium text-muted-foreground">
            Time period
          </label>
          <NativeSelect
            id="year-select"
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(e.target.value === "all" ? "all" : e.target.value)}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y === "all" ? "All years (2020–2025)" : y}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Total layoffs {selectedYear === "all" ? "(2020–2025)" : `in ${selectedYear}`}
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{fmt(stats.total)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Peak month</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {stats.peakMonth.date ? formatMonth(stats.peakMonth.date) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              {stats.peakMonth.date ? `${fmt(stats.peakMonth.total)} layoffs` : ""}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {selectedYear === "all" ? "Full timeline (2020–2025)" : `${selectedYear} timeline`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-6">
          {layoffsByMonth.length ? (
            <LayoffTimelineChart
              data={layoffsByMonth}
              events={filteredEvents}
              width={chartWidth}
              height={400}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No data for this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Event lists */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
              AI milestones
              {selectedYear !== "all" && (
                <span className="font-normal text-muted-foreground">({selectedYear})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {aiEvents.length ? (
              <ul className="space-y-2 text-sm">
                {aiEvents.map((e) => (
                  <li key={`${e.date}-${e.title}`} className="flex gap-3">
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {e.date.slice(0, 7)}
                    </span>
                    <span className="text-foreground">{e.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No AI events in {selectedYear}.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-chart-5" />
              Economic events
              {selectedYear !== "all" && (
                <span className="font-normal text-muted-foreground">({selectedYear})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {econEvents.length ? (
              <ul className="space-y-2 text-sm">
                {econEvents.map((e) => (
                  <li key={`${e.date}-${e.title}`} className="flex gap-3">
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {e.date.slice(0, 7)}
                    </span>
                    <span className="text-foreground">{e.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No economic events in {selectedYear}.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
