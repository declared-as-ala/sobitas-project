import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const exportDir = path.join(repoRoot, 'protein.tn');

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  );
}

function readCsv(filename) {
  return parseCsv(fs.readFileSync(path.join(exportDir, filename), 'utf8'));
}

function metricRows(filename, dimension) {
  return readCsv(filename).map((row) => ({
    key: row[dimension],
    clicks: Number(row.Clicks) || 0,
    impressions: Number(row.Impressions) || 0,
    ctr: Number(String(row.CTR).replace('%', '')) || 0,
    position: Number(row.Position) || 0,
  }));
}

function totals(rows) {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const weightedPosition = rows.reduce(
    (sum, row) => sum + row.position * row.impressions,
    0
  );
  return {
    clicks,
    impressions,
    ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    position: impressions ? Number((weightedPosition / impressions).toFixed(2)) : 0,
  };
}

function pick(rows, predicate, limit = 20) {
  return rows
    .filter(predicate)
    .sort((a, b) => b.impressions - a.impressions || a.position - b.position)
    .slice(0, limit);
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.protocol = 'https:';
    url.hostname = url.hostname.replace(/^www\./, '');
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return value;
  }
}

function rollupUrls(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = normalizeUrl(row.key);
    const current = groups.get(key) ?? {
      key,
      clicks: 0,
      impressions: 0,
      positionWeight: 0,
      variants: new Set(),
    };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.positionWeight += row.position * row.impressions;
    current.variants.add(row.key);
    groups.set(key, current);
  }

  return [...groups.values()].map((row) => ({
    key: row.key,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.impressions ? Number(((row.clicks / row.impressions) * 100).toFixed(2)) : 0,
    position: row.impressions
      ? Number((row.positionWeight / row.impressions).toFixed(2))
      : 0,
    variants: [...row.variants],
  }));
}

const queryRows = metricRows('Queries.csv', 'Top queries');
const rawPageRows = metricRows('Pages.csv', 'Top pages');
const pageRows = rollupUrls(rawPageRows);
const chartRows = readCsv('Chart.csv').map((row) => ({
  date: row.Date,
  clicks: Number(row.Clicks) || 0,
  impressions: Number(row.Impressions) || 0,
  ctr: Number(String(row.CTR).replace('%', '')) || 0,
  position: Number(row.Position) || 0,
}));
const filters = Object.fromEntries(readCsv('Filters.csv').map((row) => [row.Filter, row.Value]));

const splitAt = Math.floor(chartRows.length / 2);
const firstPeriod = totals(chartRows.slice(0, splitAt));
const secondPeriod = totals(chartRows.slice(splitAt));
const trend = Object.fromEntries(
  ['clicks', 'impressions', 'ctr', 'position'].map((metric) => {
    const before = firstPeriod[metric];
    const after = secondPeriod[metric];
    return [metric, {
      before,
      after,
      changePercent: before ? Number((((after - before) / before) * 100).toFixed(1)) : null,
    }];
  })
);

const navigationalPattern = /\bsobitas\b|protein\.tn/i;
const topicRules = {
  creatine: /cr[eé]atine/i,
  whey_protein: /\bwhey\b|\bprot[eé]ine(?:s)?\b|protein powder/i,
  mass_gainer: /gainer|prise de masse|serious mass|mass tech|mass gainer/i,
  magnesium: /magn[eé]sium/i,
  omega_3: /om[eé]ga\s*3|fish oil/i,
  vitamins: /vitamine|multivit/i,
  amino_acids: /\bbcaa\b|\beaa\b|acides amin[eé]s/i,
  pre_workout: /pre[- ]?workout|booster/i,
  weight_loss: /perte de poids|maigrir|br[uû]leur|fat burner/i,
};

const topics = Object.fromEntries(
  Object.entries(topicRules).map(([name, pattern]) => [name, totals(queryRows.filter((row) => pattern.test(row.key)))])
);

const hosts = Object.fromEntries(
  [...new Set(rawPageRows.map((row) => new URL(row.key).hostname))].map((host) => [
    host,
    totals(rawPageRows.filter((row) => new URL(row.key).hostname === host)),
  ])
);

let coverage = null;
const coveragePath = path.join(repoRoot, 'frontend', 'gsc-coverage-report.json');
if (fs.existsSync(coveragePath)) {
  const report = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const countBy = (field) =>
    Object.fromEntries(
      [...new Set(rows.map((row) => String(row[field] ?? 'Unknown')))].map((value) => [
        value,
        rows.filter((row) => String(row[field] ?? 'Unknown') === value).length,
      ])
    );
  coverage = {
    totalRows: rows.length,
    byIssue: countBy('issue'),
    byStatus: countBy('status'),
    resolvedAtCrawl: rows.filter((row) => Number(row.status) >= 200 && Number(row.status) < 400).length,
  };
}

const report = {
  source: {
    directory: exportDir,
    filters,
    exportedAt: fs.statSync(path.join(exportDir, 'Queries.csv')).mtime.toISOString(),
    chartStart: chartRows.at(0)?.date,
    chartEnd: chartRows.at(-1)?.date,
  },
  totals: {
    chart: totals(chartRows),
    queryRows: totals(queryRows),
    rawPageRows: totals(rawPageRows),
  },
  trend,
  hosts,
  topics,
  queries: {
    count: queryRows.length,
    navigational: totals(queryRows.filter((row) => navigationalPattern.test(row.key))),
    nonNavigational: totals(queryRows.filter((row) => !navigationalPattern.test(row.key))),
    top: pick(queryRows, () => true, 25),
    positions4to10LowCtr: pick(
      queryRows,
      (row) => !navigationalPattern.test(row.key) && row.position >= 4 && row.position < 10 && row.impressions >= 100 && row.ctr < 6,
      30
    ),
    positions10to20: pick(
      queryRows,
      (row) => !navigationalPattern.test(row.key) && row.position >= 10 && row.position < 20 && row.impressions >= 100,
      40
    ),
    positions20to30: pick(
      queryRows,
      (row) => !navigationalPattern.test(row.key) && row.position >= 20 && row.position < 30 && row.impressions >= 100,
      30
    ),
  },
  pages: {
    rawCount: rawPageRows.length,
    normalizedCount: pageRows.length,
    top: pick(pageRows, () => true, 30),
    positions4to15LowCtr: pick(
      pageRows,
      (row) => row.position >= 4 && row.position < 15 && row.impressions >= 200 && row.ctr < 5,
      40
    ),
    duplicateHostVariants: pageRows
      .filter((row) => row.variants.length > 1)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 30),
  },
  coverage,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
