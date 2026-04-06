import * as d3 from "d3";
import { useMemo, useState, useEffect, useRef } from "react";
import companyBrands from "@/data/company_brands.json";

const defaultMargin = { top: 60, right: 40, bottom: 80, left: 70 };

function CompanyMultiSelect({ allCompanies, selectedCompanies, onSelectionChange, companyTotals }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return allCompanies;
    const lower = search.toLowerCase();
    return allCompanies.filter((c) => c.toLowerCase().includes(lower));
  }, [allCompanies, search]);

  const toggleCompany = (company) => {
    if (selectedCompanies.includes(company)) {
      onSelectionChange(selectedCompanies.filter((c) => c !== company));
    } else {
      onSelectionChange([...selectedCompanies, company]);
    }
  };

  const selectAll = () => onSelectionChange([...allCompanies]);
  const clearAll = () => onSelectionChange([]);

  const fmt = (n) => d3.format(",")(Math.round(n));

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-w-[200px]"
      >
        <span className="truncate">
          {selectedCompanies.length === 0
            ? "Select companies"
            : `${selectedCompanies.length} companies selected`}
        </span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border border-input bg-background shadow-lg">
          <div className="p-2 border-b border-input">
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 p-2 border-b border-input">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground"
            >
              Clear All
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {filteredCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">No companies found</p>
            ) : (
              filteredCompanies.map((company) => {
                const isChecked = selectedCompanies.includes(company);
                const color = companyBrands[company] || "#71717a";
                const total = companyTotals[company] || 0;
                return (
                  <label
                    key={company}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCompany(company)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm flex-1 truncate">{company}</span>
                    <span className="text-xs text-muted-foreground">{fmt(total)}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
 * Animated bubble chart showing top N companies moving left to right through time.
 * Bubbles grow as cumulative layoffs increase over the years.
 */
export function AnimatedBubbleChart({
  records,
  topN = 5,
  width = 700,
  height = 450,
  margin: marginProp,
}) {
  const margin = { ...defaultMargin, ...marginProp };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState(null);
  const intervalRef = useRef(null);
  const svgRef = useRef(null);

  const { years, allCompanies, defaultTopCompanies, companyTotals } = useMemo(() => {
    if (!records?.length)
      return {
        years: [],
        allCompanies: [],
        defaultTopCompanies: [],
        companyTotals: {},
      };

    const byCompany = d3.rollups(
      records,
      (v) => d3.sum(v, (d) => d.laidOff),
      (d) => d.company,
    );
    byCompany.sort((a, b) => b[1] - a[1]);

    const companyTotals = Object.fromEntries(byCompany);
    const allCompanies = byCompany.map(([company]) => company);
    const defaultTopCompanies = byCompany.slice(0, topN).map(([company]) => company);

    const years = [...new Set(records.map((d) => d.year))].sort((a, b) => a - b);

    return { years, allCompanies, defaultTopCompanies, companyTotals };
  }, [records, topN]);

  useEffect(() => {
    if (selectedCompanies === null && defaultTopCompanies.length > 0) {
      setSelectedCompanies(defaultTopCompanies);
    }
  }, [defaultTopCompanies, selectedCompanies]);

  const activeCompanies = selectedCompanies || defaultTopCompanies;

  const { yearlyData, cumulativeData, cumulativeMax } = useMemo(() => {
    if (!records?.length || !activeCompanies.length)
      return { yearlyData: {}, cumulativeData: {}, cumulativeMax: 0 };

    const yearlyData = {};
    years.forEach((year) => {
      yearlyData[year] = {};
      activeCompanies.forEach((company) => {
        const companyYearRecords = records.filter(
          (r) => r.company === company && r.year === year,
        );
        const total = d3.sum(companyYearRecords, (d) => d.laidOff);
        yearlyData[year][company] = total;
      });
    });

    const cumulative = {};
    activeCompanies.forEach((company) => {
      cumulative[company] = 0;
    });

    const cumulativeData = {};
    let cumulativeMax = 0;
    years.forEach((year) => {
      cumulativeData[year] = {};
      activeCompanies.forEach((company) => {
        cumulative[company] += yearlyData[year]?.[company] || 0;
        cumulativeData[year][company] = cumulative[company];
        if (cumulative[company] > cumulativeMax)
          cumulativeMax = cumulative[company];
      });
    });

    return { yearlyData, cumulativeData, cumulativeMax };
  }, [records, years, activeCompanies]);

  useEffect(() => {
    if (isPlaying && years.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentYearIndex((prev) => (prev + 1) % years.length);
      }, 1800);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, years.length]);

  const currentYear = years[currentYearIndex] || years[0];

  const xScale = useMemo(() => {
    if (!years.length) return null;
    return d3
      .scalePoint()
      .domain(years.map(String))
      .range([0, iw])
      .padding(0.5);
  }, [years, iw]);

  const yScale = useMemo(() => {
    return d3
      .scalePow()
      .exponent(2)
      .domain([0, cumulativeMax])
      .range([ih - 40, 40]);
  }, [cumulativeMax, ih]);

  const radiusScale = useMemo(() => {
    return d3.scaleSqrt().domain([0, cumulativeMax]).range([12, 35]);
  }, [cumulativeMax]);

  const bubbles = useMemo(() => {
    if (!currentYear || !cumulativeData[currentYear] || !xScale || !yScale)
      return [];

    return activeCompanies.map((company) => {
      const cumLayoffs = cumulativeData[currentYear][company] || 0;
      const yearLayoffs = yearlyData[currentYear]?.[company] || 0;
      const color = companyBrands[company] || "#71717a";
      const radius = radiusScale(cumLayoffs);

      return {
        company,
        cumLayoffs,
        yearLayoffs,
        color,
        radius,
        x: xScale(String(currentYear)),
        y: yScale(cumLayoffs),
        initials: getInitials(company),
        textColor: getContrastColor(color),
      };
    });
  }, [
    currentYear,
    cumulativeData,
    yearlyData,
    activeCompanies,
    xScale,
    yScale,
    radiusScale,
  ]);

  const trails = useMemo(() => {
    if (!xScale || !yScale || !years.length) return [];

    return activeCompanies.map((company) => {
      const color = companyBrands[company] || "#71717a";

      const points = years.slice(0, currentYearIndex + 1).map((year) => {
        const cumLayoffs = cumulativeData[year]?.[company] || 0;
        return {
          x: xScale(String(year)),
          y: yScale(cumLayoffs),
          radius: radiusScale(cumLayoffs),
          year,
          cumLayoffs,
        };
      });

      return { company, color, points };
    });
  }, [
    activeCompanies,
    years,
    currentYearIndex,
    cumulativeData,
    xScale,
    yScale,
    radiusScale,
  ]);

  if (!years.length) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const fmt = (n) => d3.format(",")(Math.round(n));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <span className="text-3xl font-bold tabular-nums text-foreground">
            {currentYear}
          </span>
        </div>
        <CompanyMultiSelect
          allCompanies={allCompanies}
          selectedCompanies={activeCompanies}
          onSelectionChange={setSelectedCompanies}
          companyTotals={companyTotals}
        />
      </div>
      <div className="flex justify-end gap-1">
        {years.map((year, idx) => (
          <button
            key={year}
            onClick={() => {
              setCurrentYearIndex(idx);
              setIsPlaying(false);
            }}
            className={`w-10 h-8 rounded text-xs font-medium transition-colors ${
              idx === currentYearIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label="Animated bubble chart showing company layoffs moving through time"
      >
        <defs>
          {activeCompanies.map((company) => {
            const color = companyBrands[company] || "#71717a";
            return (
              <linearGradient
                key={`grad-${company}`}
                id={`trail-grad-${company.replace(/\s/g, "-")}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={color} stopOpacity="0.1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.6" />
              </linearGradient>
            );
          })}
          <filter id="bubble-shadow">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* X-axis (years) */}
          <g transform={`translate(0,${ih + 15})`}>
            {years.map((year) => (
              <g key={year} transform={`translate(${xScale(String(year))},0)`}>
                <line
                  y1={-ih - 15}
                  y2={0}
                  className="stroke-border/30"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  y={20}
                  textAnchor="middle"
                  className={`text-xs ${year === currentYear ? "fill-foreground font-semibold" : "fill-muted-foreground"}`}
                >
                  {year}
                </text>
              </g>
            ))}
          </g>

          {/* Y-axis (layoff count) */}
          <g>
            {yScale.ticks(5).map((tick) => (
              <g key={tick} transform={`translate(0,${yScale(tick)})`}>
                <line
                  x1={-8}
                  x2={iw}
                  className="stroke-border/30"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={-12}
                  dy="0.35em"
                  textAnchor="end"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick}
                </text>
              </g>
            ))}
            <text
              transform={`translate(-40,${ih / 2}) rotate(-90)`}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11 }}
            >
              Cumulative Layoffs
            </text>
          </g>

          {/* Trail paths showing history */}
          {trails.map((trail) => {
            if (trail.points.length < 1) return null;

            return (
              <g key={`trail-${trail.company}`}>
                {/* Trail line */}
                {trail.points.length >= 2 && (
                  <path
                    d={d3
                      .line()
                      .x((d) => d.x)
                      .y((d) => d.y)
                      .curve(d3.curveMonotoneX)(trail.points)}
                    fill="none"
                    stroke={trail.color}
                    strokeWidth={6}
                    strokeLinecap="round"
                    opacity={0.4}
                    className="transition-all duration-500"
                  />
                )}
                {/* Past year circles */}
                {trail.points.slice(0, -1).map((pt, idx) => (
                  <circle
                    key={`${trail.company}-${pt.year}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.radius * 0.5}
                    fill={trail.color}
                    opacity={0.3 + idx * 0.08}
                    stroke={trail.color}
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                  />
                ))}
              </g>
            );
          })}

          {/* Current year bubbles */}
          {bubbles.map((b) => (
            <g key={b.company} className="transition-all duration-700 ease-out">
              <circle
                cx={b.x}
                cy={b.y}
                r={b.radius}
                fill={b.color}
                opacity={0.9}
                filter="url(#bubble-shadow)"
                className="transition-all duration-700 ease-out"
              >
                <title>{`${b.company}: ${fmt(b.cumLayoffs)} total layoffs`}</title>
              </circle>

              {b.yearLayoffs > 0 && (
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.radius + 4}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={0.8}
                  className="animate-ping"
                  style={{ animationDuration: "1.5s" }}
                />
              )}

              <text
                x={b.x}
                y={b.y}
                textAnchor="middle"
                dy="0.35em"
                fill={b.textColor}
                style={{
                  fontSize: Math.max(10, b.radius / 2.5),
                  fontWeight: 700,
                }}
                className="pointer-events-none"
              >
                {b.initials}
              </text>

              {/* Layoff count above bubble */}
              <text
                x={b.x}
                y={b.y - b.radius - 8}
                textAnchor="middle"
                className="fill-foreground"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {fmt(b.cumLayoffs)}
              </text>

              {/* New layoffs badge */}
              {b.yearLayoffs > 0 && (
                <g
                  transform={`translate(${b.x + b.radius * 0.7},${b.y - b.radius * 0.7})`}
                >
                  <circle r={12} fill="#ef4444" />
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dy="0.35em"
                    fill="#fff"
                    style={{ fontSize: 7, fontWeight: 600 }}
                  >
                    +
                    {b.yearLayoffs > 999
                      ? `${Math.round(b.yearLayoffs / 1000)}k`
                      : b.yearLayoffs}
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* Timeline progress indicator */}
          <rect
            x={0}
            y={ih + 40}
            width={iw}
            height={4}
            rx={2}
            className="fill-muted"
          />
          <rect
            x={0}
            y={ih + 40}
            width={xScale ? xScale(String(currentYear)) : 0}
            height={4}
            rx={2}
            className="fill-primary transition-all duration-700"
          />
        </g>
      </svg>

      {/* Company legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        {activeCompanies.map((company) => {
          const color = companyBrands[company] || "#71717a";
          return (
            <div key={company} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-foreground">
                {company}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-zinc-400" />
          <span>Bubble size = Cumulative layoffs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span>New layoffs this year</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-2 rounded bg-gradient-to-r from-zinc-400/20 to-zinc-400/60" />
          <span>Trail = History</span>
        </div>
      </div>
    </div>
  );
}
