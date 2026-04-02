import * as d3 from "d3";

/**
 * @typedef {Object} LayoffRecord
 * @property {string} company
 * @property {string} country
 * @property {string} continent
 * @property {string} industry
 * @property {number} laidOff
 * @property {Date} date
 * @property {number} year
 */

const parseDate = d3.timeParse("%Y-%m-%d");

/**
 * @param {string} [url='/dataset/Cleaned_tech_layoffs.csv']
 * @returns {Promise<LayoffRecord[]>}
 */
export async function loadLayoffData(url = "/dataset/Cleaned_tech_layoffs.csv") {
  const raw = await d3.csv(url);
  return raw
    .map((d) => ({
      company: d.Company,
      country: d.Country,
      continent: d.Continent,
      industry: d.Industry,
      laidOff: +d.Laid_Off || 0,
      date: parseDate(d.Date_layoffs),
      year: +d.Year || 0,
    }))
    .filter((d) => d.date !== null && d.year >= 2020 && d.year <= 2025);
}
