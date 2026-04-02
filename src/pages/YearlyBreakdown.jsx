import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useLayoffData } from "@/context/LayoffDataContext";
import { topNCompanies, mostAffectedCompany } from "@/lib/dataHelpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { CompanyBadge } from "@/components/ui/CompanyBadge";
import { BrandedBarChart } from "@/components/charts/BrandedBarChart";
import { StackedMonthlyChart } from "@/components/charts/StackedMonthlyChart";
import { useContainerWidth } from "@/hooks/useContainerWidth";

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const TOP_CO = 15;

export function YearlyBreakdown() {
  const { records, loading, error } = useLayoffData();
  const [year, setYear] = useState(2023);
  const ref = useRef(null);
  const w = useContainerWidth(ref);

  const filtered = useMemo(() => records?.filter((d) => d.year === year) ?? [], [records, year]);
  const companies = useMemo(() => topNCompanies(filtered, TOP_CO), [filtered]);
  const topCompany = useMemo(() => mostAffectedCompany(filtered), [filtered]);

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

  const yearTotal = d3.sum(filtered, (d) => d.laidOff);
  const fmt = (n) => d3.format(",")(Math.round(n));

  return (
    <div ref={ref} className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Yearly breakdown</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Charts filter to a single calendar year ({YEARS[0]}–{YEARS[YEARS.length - 1]}).
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="year-select" className="text-xs font-medium text-muted-foreground">
            Year
          </label>
          <NativeSelect id="year-select" value={String(year)} onChange={(e) => setYear(+e.target.value)}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total layoffs in {year}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{fmt(yearTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across {fmt(filtered.length)} listed events.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Most affected company in {year}</CardDescription>
            {topCompany ? (
              <CardTitle className="text-lg">
                <CompanyBadge company={topCompany.label} size="md" />
              </CardTitle>
            ) : (
              <CardTitle className="text-lg text-muted-foreground">—</CardTitle>
            )}
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {topCompany ? `${fmt(topCompany.value)} layoffs this year.` : "No data available."}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3" aria-labelledby="y-monthly-heading">
        <div>
          <h3 id="y-monthly-heading" className="text-base font-semibold">
            Monthly breakdown ({year})
          </h3>
          <p className="text-sm text-muted-foreground">
            Each bar is stacked by company. Largest layoffs appear at the top. Hover for details.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            {filtered.length ? (
              <StackedMonthlyChart
                records={filtered}
                width={Math.max(w - 48, 300)}
                height={400}
                xLabel="Month"
                yLabel="Layoffs"
                formatX={(d) => d3.timeFormat("%b")(d)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No dated rows for this year.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="y-companies-heading">
        <h3 id="y-companies-heading" className="text-base font-semibold">
          Top companies ({year})
        </h3>
        <Card>
          <CardContent className="pt-6 pb-4">
            {companies.length ? (
              <BrandedBarChart
                data={companies}
                width={Math.max(w - 48, 300)}
                xLabel="Layoffs (headcount)"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No rows for this year.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
