import * as d3 from "d3";

/**
 * @param {Array<{ date: Date, laidOff: number, year: number }>} records
 * @returns {Map<number, { year: number, total: number, records: typeof records }>}
 */
export function groupByYear(records) {
  const map = d3.rollups(
    records,
    (v) => ({
      year: v[0].year,
      total: d3.sum(v, (d) => d.laidOff),
      records: v,
    }),
    (d) => d.year
  );
  return new Map(map);
}

/**
 * Month buckets at start of calendar month (UTC-neutral: uses local date from CSV parse).
 * @param {Array<{ date: Date, laidOff: number }>} records
 * @returns {Array<{ month: Date, total: number }>} sorted ascending
 */
export function groupByMonth(records) {
  const rolled = d3.rollups(
    records,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d3.timeMonth(d.date)
  );
  rolled.sort((a, b) => a[0] - b[0]);
  return rolled.map(([month, total]) => ({ month, total }));
}

/**
 * @param {Array<{ company: string, laidOff: number }>} records
 * @param {number} n
 */
export function topNCompanies(records, n = 10) {
  const byCompany = d3.rollups(
    records,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d.company
  );
  byCompany.sort((a, b) => b[1] - a[1]);
  return byCompany.slice(0, n).map(([company, total]) => ({ label: company, value: total }));
}

/**
 * @param {Array<{ laidOff: number }>} records
 * @param {(d: (typeof records)[0]) => string} keyFn
 */
export function aggregateByCategory(records, keyFn) {
  const rolled = d3.rollups(
    records,
    (v) => d3.sum(v, (d) => d.laidOff),
    keyFn
  );
  rolled.sort((a, b) => b[1] - a[1]);
  return rolled.map(([label, value]) => ({ label, value }));
}

export function peakYearByTotal(records) {
  const byYear = d3.rollups(
    records,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d.year
  );
  if (!byYear.length) return null;
  byYear.sort((a, b) => b[1] - a[1]);
  return { year: byYear[0][0], total: byYear[0][1] };
}

export function mostAffectedCompany(records) {
  const top = topNCompanies(records, 1);
  return top[0] ?? null;
}

/**
 * @param {Array<{ year: number, laidOff: number }>} records
 * @returns {Array<{ year: number, total: number }>} sorted ascending by year
 */
export function aggregateByYear(records) {
  const rolled = d3.rollups(
    records,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d.year
  );
  rolled.sort((a, b) => a[0] - b[0]);
  return rolled.map(([year, total]) => ({ year, total }));
}
