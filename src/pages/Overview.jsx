import { useMemo, useRef } from "react";
import * as d3 from "d3";
import { useLayoffData } from "@/context/LayoffDataContext";
import {
  groupByMonth,
  mostAffectedCompany,
  peakYearByTotal,
  topNCompanies,
} from "@/lib/dataHelpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyBadge } from "@/components/ui/CompanyBadge";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { BrandedBarChart } from "@/components/charts/BrandedBarChart";
import { IndustryHeatmap } from "@/components/charts/IndustryHeatmap";
import { AnimatedBubbleChart } from "@/components/charts/AnimatedBubbleChart";
import { useContainerWidth } from "@/hooks/useContainerWidth";

const INDUSTRY_CAP = 12;
const COMPANY_CAP = 15;

export function Overview() {
  const { records, loading, error } = useLayoffData();
  const ref = useRef(null);
  const w = useContainerWidth(ref);

  const derived = useMemo(() => {
    if (!records?.length) return null;
    const total = d3.sum(records, (d) => d.laidOff);
    const peak = peakYearByTotal(records);
    const topCo = mostAffectedCompany(records);
    const monthly = groupByMonth(records).map((d) => ({ x: d.month, y: d.total }));
    const companies = topNCompanies(records, COMPANY_CAP);
    return { total, peak, topCo, monthly, companies };
  }, [records]);

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
  if (!derived) {
    return <p className="text-sm text-muted-foreground">No rows to display.</p>;
  }

  const fmt = (n) => d3.format(",")(Math.round(n));

  return (
    <div ref={ref} className="space-y-10">
      <section aria-labelledby="overview-stats-heading">
        <h2 id="overview-stats-heading" className="sr-only">
          Summary statistics
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total layoffs recorded</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{fmt(derived.total)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Sum of reported layoffs for all rows in range 2020–2025.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Peak year by total layoffs</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {derived.peak ? derived.peak.year : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {derived.peak ? `${fmt(derived.peak.total)} layoffs that year.` : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Most affected company</CardDescription>
              {derived.topCo ? (
                <CardTitle className="text-lg leading-snug">
                  <CompanyBadge company={derived.topCo.label} size="md" />
                </CardTitle>
              ) : (
                <CardTitle className="text-lg text-muted-foreground">—</CardTitle>
              )}
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {derived.topCo ? `${fmt(derived.topCo.value)} cumulative layoffs.` : "—"}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="timeline-heading">
        <div>
          <h2 id="timeline-heading" className="text-base font-semibold">
            Layoffs over time
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly totals with trend direction. Red indicates rising layoffs, blue indicates declining.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            <TrendLineChart
              data={derived.monthly}
              width={Math.max(w - 48, 300)}
              height={340}
              yLabel="Layoffs"
              formatX={(d) => d3.timeFormat("%b %Y")(d)}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="bubble-heading">
        <div>
          <h2 id="bubble-heading" className="text-base font-semibold">
            Top 5 companies with most layoffs over 5 years
          </h2>
          <p className="text-sm text-muted-foreground">
            Animated bubbles showing cumulative layoffs. Bubble size represents total workforce reduction over time.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            <AnimatedBubbleChart
              records={records}
              topN={5}
              width={Math.max(w - 48, 500)}
              height={600}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="industry-heading">
        <div>
          <h2 id="industry-heading" className="text-base font-semibold">
            Layoffs by industry and year
          </h2>
          <p className="text-sm text-muted-foreground">
            Heatmap showing top {INDUSTRY_CAP} industries. Darker cells indicate higher layoff counts.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4 overflow-x-auto">
            <IndustryHeatmap records={records} width={Math.max(w - 48, 400)} topN={INDUSTRY_CAP} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="companies-heading">
        <div>
          <h2 id="companies-heading" className="text-base font-semibold">
            Top companies by total layoffs
          </h2>
          <p className="text-sm text-muted-foreground">
            Top {COMPANY_CAP} firms by cumulative layoffs (2020–2025). Bars colored by brand.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            <BrandedBarChart
              data={derived.companies}
              width={Math.max(w - 48, 300)}
              xLabel="Layoffs (headcount)"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
