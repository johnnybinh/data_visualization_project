import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function About() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
      <div>
        <h2 className="text-base font-semibold text-foreground">About this site</h2>
        <p className="mt-2">
          This is a small, static visualization layer on top of a cleaned tech layoffs table (
          <code className="text-foreground">Cleaned_tech_layoffs.csv</code>). Rows represent reported layoff events with
          company, industry, location, date, and headcount fields. Charts aggregate those counts; they do not model
          employment levels or unreported cuts.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-inside list-disc space-y-1">
            <li>React (function components) and Vite</li>
            <li>D3.js for scales, ticks, grouping, and line generation — SVG markup is rendered by React</li>
            <li>Tailwind CSS and shadcn-style primitives (Card, borders, default palette tokens)</li>
            <li>react-router for pages</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Data processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Records are loaded in the browser via <code className="text-foreground">d3.csv</code>. Dates use{" "}
            <code className="text-foreground">%Y-%m-%d</code> parsing; rows with invalid dates are dropped. Analyses
            restrict to calendar years <span className="text-foreground">2020–2025</span> as specified for this
            project.
          </p>
          <p>
            Aggregations (by month, year, company, industry) use <code className="text-foreground">d3.rollups</code>{" "}
            and related helpers in <code className="text-foreground">src/lib/dataHelpers.js</code>. Monthly buckets use{" "}
            <code className="text-foreground">d3.timeMonth</code> so each bar or point aligns to calendar months.
          </p>
          <p>
            The AI/economic timeline uses a separate hand-curated JSON list of headline events; it is not inferred from
            the layoffs CSV. Markers are positioned by event date on the same time axis as layoff bars.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
