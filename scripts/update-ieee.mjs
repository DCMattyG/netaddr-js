import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUI_URL = 'https://standards-oui.ieee.org/oui/oui.csv';
const IAB_URL = 'https://standards-oui.ieee.org/iab/iab.csv';
const FETCH_RETRY_ATTEMPTS = 4;
const FETCH_TIMEOUT_MS = 30000;
const FETCH_RETRY_BASE_DELAY_MS = 750;

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!lines.length) {
    return [];
  }
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length !== header.length) {
      continue;
    }
    const row = {};
    for (let i = 0; i < header.length; i += 1) {
      row[header[i]] = cols[i];
    }
    rows.push(row);
  }
  return rows;
}

function normalizePrefix(raw, len) {
  const clean = String(raw ?? '').toLowerCase().replace(/[^0-9a-f]/g, '');
  return clean.slice(0, len);
}

function mapOUI(row) {
  const prefix = normalizePrefix(row['Assignment'] || row['MA-L'], 6);
  if (prefix.length !== 6) {
    return null;
  }
  return {
    prefix,
    org: row['Organization Name'] || row.Organization || 'Unknown',
    address: row['Organization Address'] || row.Address || null,
    country: row.Country || null,
    source: 'ieee',
  };
}

function mapIAB(row) {
  const prefix = normalizePrefix(row['Assignment'] || row['IAB'], 9);
  if (prefix.length !== 9) {
    return null;
  }
  return {
    prefix,
    org: row['Organization Name'] || row.Organization || 'Unknown',
    address: row['Organization Address'] || row.Address || null,
    country: row.Country || null,
    source: 'ieee',
  };
}

async function fetchText(url) {
  let lastError;

  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        const retriable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retriable || attempt === FETCH_RETRY_ATTEMPTS) {
          throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
        throw new Error(`Retryable HTTP status ${response.status} while fetching ${url}`);
      }
      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt === FETCH_RETRY_ATTEMPTS) {
        break;
      }

      const delayMs = FETCH_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      process.stderr.write(
        `Fetch attempt ${attempt}/${FETCH_RETRY_ATTEMPTS} failed for ${url}: ${error.message}. Retrying in ${delayMs}ms...\n`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

function toModuleSource(oui, iab) {
  const pretty = (value) => JSON.stringify(value, null, 2);
  return `export const DEFAULT_OUI_REGISTRY = ${pretty(oui)};\n\nexport const DEFAULT_IAB_REGISTRY = ${pretty(iab)};\n`;
}

async function main() {
  const [ouiCsv, iabCsv] = await Promise.all([fetchText(OUI_URL), fetchText(IAB_URL)]);
  const oui = parseCsv(ouiCsv).map(mapOUI).filter(Boolean);
  const iab = parseCsv(iabCsv).map(mapIAB).filter(Boolean);

  const source = toModuleSource(oui, iab);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const target = path.join(root, 'src', 'data', 'ieee.js');

  await fs.writeFile(target, source, 'utf8');
  process.stdout.write(`Updated ${target}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exit(1);
});
