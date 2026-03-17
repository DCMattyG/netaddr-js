import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IPV4_URL =
  'https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry-1.csv';
const IPV6_URL =
  'https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry-1.csv';

const IPV4_INDEX_URL = 'https://www.iana.org/assignments/iana-ipv4-special-registry/';
const IPV6_INDEX_URL = 'https://www.iana.org/assignments/iana-ipv6-special-registry/';

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
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]);
  const records = [];
  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    if (row.length !== header.length) {
      continue;
    }
    const item = {};
    for (let i = 0; i < header.length; i += 1) {
      item[header[i]] = row[i];
    }
    records.push(item);
  }
  return records;
}

function parseBoolFlag(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'true') {
    return true;
  }
  if (v === 'false') {
    return false;
  }
  return null;
}

function normalizeCellText(value) {
  const text = String(value ?? '').trim();
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function extractCidrs(value) {
  const text = normalizeCellText(value);
  if (!text) {
    return [];
  }

  return text
    .split(',')
    .map((part) => part.trim())
    .map((part) => part.replace(/\s*\[[^\]]+\]\s*$/g, '').trim())
    .filter((part) => /\//.test(part))
    .filter((part) => /^\S+\/\d+$/.test(part));
}

function transformIanaRow(row) {
  const cidrs = extractCidrs(row.Address_Block || row['Address Block'] || row.Prefix || '');
  if (cidrs.length === 0) {
    return [];
  }

  const title = normalizeCellText(row.Name || row.Description || 'Unknown');
  const rfc = row.RFC || row.Reference || null;
  const globallyReachable = parseBoolFlag(row['Globally Reachable']);
  const isMulticast = title.toLowerCase().includes('multicast');

  return cidrs.map((cidr) => {
    const out = { cidr, title, rfc, globallyReachable };
    if (isMulticast) {
      out.category = 'Multicast';
    }
    return out;
  });
}

function toModuleSource(ipv4, ipv6) {
  const pretty = (value) => JSON.stringify(value, null, 2);
  return `export const IANA_IPV4 = ${pretty(ipv4)};\n\nexport const IANA_IPV6 = ${pretty(ipv6)};\n`;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function findCsvHref(indexHtml, matchText) {
  const hrefRegex = /href=["']([^"']+\.csv)["']/gi;
  const matches = [];
  let match;
  while ((match = hrefRegex.exec(indexHtml)) != null) {
    matches.push(match[1]);
  }

  const candidate = matches.find((href) => href.toLowerCase().includes(matchText));
  return candidate ?? matches[0] ?? null;
}

async function resolveCsvUrl(indexUrl, fallbackUrl, matchText) {
  try {
    const html = await fetchText(indexUrl);
    const href = findCsvHref(html, matchText);
    if (!href) {
      return fallbackUrl;
    }
    return new URL(href, indexUrl).toString();
  } catch {
    return fallbackUrl;
  }
}

async function main() {
  const [ipv4Url, ipv6Url] = await Promise.all([
    resolveCsvUrl(IPV4_INDEX_URL, IPV4_URL, 'iana-ipv4-special-registry'),
    resolveCsvUrl(IPV6_INDEX_URL, IPV6_URL, 'iana-ipv6-special-registry'),
  ]);

  const [ipv4Csv, ipv6Csv] = await Promise.all([fetchText(ipv4Url), fetchText(ipv6Url)]);
  const ipv4 = parseCsv(ipv4Csv).flatMap(transformIanaRow);
  const ipv6 = parseCsv(ipv6Csv).flatMap(transformIanaRow);

  const source = toModuleSource(ipv4, ipv6);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const target = path.join(root, 'src', 'data', 'iana.js');

  await fs.writeFile(target, source, 'utf8');
  process.stdout.write(`Updated ${target}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exit(1);
});
