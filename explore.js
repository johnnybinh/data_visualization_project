const parseDate = d3.timeParse("%Y-%m-%d");
const formatDate = d3.timeFormat("%Y-%m-%d");
const formatNum = d3.format(",");

let allData = [];
let sortCol = "laidOff";
let sortAsc = false;
let currentPage = 0;
const PAGE_SIZE = 25;

async function loadData() {
  const raw = await d3.csv("dataset/Cleaned_tech_layoffs.csv");

  allData = raw
    .map((d) => ({
      company: d.Company,
      country: d.Country,
      continent: d.Continent,
      industry: d.Industry,
      laidOff: +d.Laid_Off || 0,
      percentage: +d.Percentage || 0,
      stage: d.Stage || "Unknown",
      date: parseDate(d.Date_layoffs),
      year: +d.Year || 0,
      moneyRaised: +d.Money_Raised_in__mil || 0,
    }))
    .filter((d) => d.date !== null);

  renderStats();
  renderTopCompanies(allData);
  renderByCountry(allData);
  renderByStage(allData);
  renderByContinent(allData);
  setupDropdowns();
  setupTable();
}

function filterByYear(year) {
  if (year === "all") return allData;
  return allData.filter((d) => d.year === +year);
}

// ── Per-chart dropdown wiring ────────────────────────────────────────

function setupDropdowns() {
  const renderers = {
    "top-companies": renderTopCompanies,
    "by-country": renderByCountry,
    "by-stage": renderByStage,
    "by-continent": renderByContinent,
  };

  document.querySelectorAll(".year-dropdown[data-chart]").forEach((sel) => {
    sel.addEventListener("change", () => {
      const chartId = sel.dataset.chart;
      const data = filterByYear(sel.value);
      renderers[chartId](data);
    });
  });
}

// ── Stats ────────────────────────────────────────────────────────────

function renderStats() {
  const total = d3.sum(allData, (d) => d.laidOff);
  const companies = new Set(allData.map((d) => d.company)).size;
  const countries = new Set(allData.map((d) => d.country)).size;
  const avg = Math.round(total / allData.length);

  document.getElementById("stat-total").textContent = formatNum(total);
  document.getElementById("stat-companies").textContent = formatNum(companies);
  document.getElementById("stat-countries").textContent = formatNum(countries);
  document.getElementById("stat-avg").textContent = formatNum(avg);
}

// ── Top 20 Companies (horizontal bar) ────────────────────────────────

function renderTopCompanies(data) {
  const container = document.querySelector("#top-companies .chart-area");
  container.innerHTML = "";
  const width = container.clientWidth;
  const height = 520;
  const margin = { top: 10, right: 60, bottom: 20, left: 140 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const rolled = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d.company
  );
  const top = rolled.sort((a, b) => b[1] - a[1]).slice(0, 20);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3
    .scaleBand()
    .domain(top.map((d) => d[0]))
    .range([0, ih])
    .padding(0.18);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(top, (d) => d[1]) || 0])
    .nice()
    .range([0, iw]);

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8));

  g.selectAll(".hbar")
    .data(top)
    .join("rect")
    .attr("class", "hbar")
    .attr("y", (d) => y(d[0]))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .transition()
    .duration(500)
    .delay((_, i) => i * 20)
    .attr("width", (d) => x(d[1]));

  g.selectAll(".hbar-label")
    .data(top)
    .join("text")
    .attr("class", "hbar-label")
    .attr("y", (d) => y(d[0]) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("x", (d) => x(d[1]) + 6)
    .text((d) => formatNum(d[1]))
    .style("opacity", 0)
    .transition()
    .duration(500)
    .delay((_, i) => i * 20)
    .style("opacity", 1);
}

// ── By Country (horizontal bar) ──────────────────────────────────────

function renderByCountry(data) {
  const container = document.querySelector("#by-country .chart-area");
  container.innerHTML = "";
  const width = container.clientWidth;
  const height = 440;
  const margin = { top: 10, right: 60, bottom: 20, left: 120 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const rolled = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d.country
  );
  const top = rolled.sort((a, b) => b[1] - a[1]).slice(0, 15);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3
    .scaleBand()
    .domain(top.map((d) => d[0]))
    .range([0, ih])
    .padding(0.18);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(top, (d) => d[1]) || 0])
    .nice()
    .range([0, iw]);

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8));

  g.selectAll(".hbar")
    .data(top)
    .join("rect")
    .attr("class", "hbar hbar-teal")
    .attr("y", (d) => y(d[0]))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .transition()
    .duration(500)
    .delay((_, i) => i * 20)
    .attr("width", (d) => x(d[1]));

  g.selectAll(".hbar-label")
    .data(top)
    .join("text")
    .attr("class", "hbar-label")
    .attr("y", (d) => y(d[0]) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("x", (d) => x(d[1]) + 6)
    .text((d) => formatNum(d[1]))
    .style("opacity", 0)
    .transition()
    .duration(500)
    .delay((_, i) => i * 20)
    .style("opacity", 1);
}

// ── By Funding Stage ─────────────────────────────────────────────────

function renderByStage(data) {
  const container = document.querySelector("#by-stage .chart-area");
  container.innerHTML = "";
  const width = container.clientWidth;
  const height = 340;
  const margin = { top: 10, right: 20, bottom: 70, left: 60 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const rolled = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d.stage
  );
  const sorted = rolled.sort((a, b) => b[1] - a[1]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(sorted.map((d) => d[0]))
    .range([0, iw])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(sorted, (d) => d[1]) || 0])
    .nice()
    .range([ih, 0]);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(8))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));

  g.selectAll(".stage-bar")
    .data(sorted)
    .join("rect")
    .attr("class", "stage-bar")
    .attr("x", (d) => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", ih)
    .attr("height", 0)
    .transition()
    .duration(500)
    .delay((_, i) => i * 30)
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => ih - y(d[1]));
}

// ── By Continent (donut) ─────────────────────────────────────────────

function renderByContinent(data) {
  const container = document.querySelector("#by-continent .chart-area");
  container.innerHTML = "";
  const width = container.clientWidth;
  const height = 340;
  const radius = Math.min(width, height) / 2 - 40;

  const rolled = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.laidOff),
    (d) => d.continent
  );
  const sorted = rolled.sort((a, b) => b[1] - a[1]);

  const color = d3
    .scaleOrdinal()
    .domain(sorted.map((d) => d[0]))
    .range(d3.schemeTableau10);

  const pie = d3
    .pie()
    .value((d) => d[1])
    .sort(null);

  const arc = d3.arc().innerRadius(radius * 0.52).outerRadius(radius);
  const arcLabel = d3
    .arc()
    .innerRadius(radius * 0.78)
    .outerRadius(radius * 0.78);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const arcs = g
    .selectAll(".arc")
    .data(pie(sorted))
    .join("g")
    .attr("class", "arc");

  arcs
    .append("path")
    .attr("fill", (d) => color(d.data[0]))
    .attr("stroke", "#1a1d27")
    .attr("stroke-width", 2)
    .transition()
    .duration(600)
    .attrTween("d", function (d) {
      const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return (t) => arc(i(t));
    });

  arcs
    .filter((d) => d.endAngle - d.startAngle > 0.25)
    .append("text")
    .attr("class", "donut-label")
    .attr("transform", (d) => `translate(${arcLabel.centroid(d)})`)
    .attr("text-anchor", "middle")
    .text((d) => d.data[0])
    .style("opacity", 0)
    .transition()
    .delay(350)
    .duration(350)
    .style("opacity", 1);

  const total = d3.sum(sorted, (d) => d[1]);
  g.append("text")
    .attr("class", "donut-center")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.2em")
    .text(formatNum(total));
  g.append("text")
    .attr("class", "donut-center-sub")
    .attr("text-anchor", "middle")
    .attr("dy", "1.2em")
    .text("Total");
}

// ── Data Table ───────────────────────────────────────────────────────

function getFilteredTableData() {
  const yearVal = document.getElementById("table-year-filter").value;
  const q = document.getElementById("table-search").value.toLowerCase();

  let result = yearVal === "all" ? allData : allData.filter((d) => d.year === +yearVal);

  if (q) {
    result = result.filter(
      (d) =>
        d.company.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.industry.toLowerCase().includes(q) ||
        d.stage.toLowerCase().includes(q)
    );
  }
  return result;
}

function setupTable() {
  const searchInput = document.getElementById("table-search");
  const yearFilter = document.getElementById("table-year-filter");

  searchInput.addEventListener("input", () => {
    currentPage = 0;
    sortAndRenderTable();
  });

  yearFilter.addEventListener("change", () => {
    currentPage = 0;
    sortAndRenderTable();
  });

  document.querySelectorAll("#data-table th").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortAsc = !sortAsc;
      } else {
        sortCol = col;
        sortAsc = col === "company" || col === "country" || col === "industry" || col === "stage";
      }
      document.querySelectorAll("#data-table th").forEach((t) => t.classList.remove("sorted-asc", "sorted-desc"));
      th.classList.add(sortAsc ? "sorted-asc" : "sorted-desc");
      currentPage = 0;
      sortAndRenderTable();
    });
  });

  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      renderTablePage();
    }
  });
  document.getElementById("next-page").addEventListener("click", () => {
    const filtered = getFilteredTableData();
    const maxPage = Math.ceil(filtered.length / PAGE_SIZE) - 1;
    if (currentPage < maxPage) {
      currentPage++;
      renderTablePage();
    }
  });

  sortAndRenderTable();
}

function sortAndRenderTable() {
  renderTablePage();
}

function renderTablePage() {
  let filtered = getFilteredTableData();

  const isString = ["company", "country", "industry", "stage"].includes(sortCol);
  filtered = [...filtered].sort((a, b) => {
    let va = a[sortCol],
      vb = b[sortCol];
    if (sortCol === "date") {
      va = va ? va.getTime() : 0;
      vb = vb ? vb.getTime() : 0;
    }
    if (isString) {
      va = (va || "").toLowerCase();
      vb = (vb || "").toLowerCase();
    }
    return sortAsc ? (va < vb ? -1 : va > vb ? 1 : 0) : va > vb ? -1 : va < vb ? 1 : 0;
  });

  const tbody = document.querySelector("#data-table tbody");
  const start = currentPage * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = page
    .map(
      (d) => `<tr>
        <td>${d.company}</td>
        <td>${d.country}</td>
        <td>${d.industry}</td>
        <td class="num">${formatNum(d.laidOff)}</td>
        <td class="num">${d.percentage ? d.percentage + "%" : "—"}</td>
        <td><span class="stage-badge">${d.stage}</span></td>
        <td>${d.date ? formatDate(d.date) : "—"}</td>
      </tr>`
    )
    .join("");

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  document.getElementById("page-indicator").textContent = `${currentPage + 1} / ${totalPages}`;
  document.getElementById("table-info").textContent = `${formatNum(filtered.length)} events`;
  document.getElementById("prev-page").disabled = currentPage === 0;
  document.getElementById("next-page").disabled = currentPage >= totalPages - 1;
}

// ── Bootstrap ────────────────────────────────────────────────────────
loadData();
