import { AddrFormatError } from './core.js';
import { IPAddress } from './ip.js';

function parseNmapOctetItem(item, original) {
  const text = item.trim();
  if (text.length === 0) {
    throw new AddrFormatError(`invalid nmap range: ${original}`);
  }

  if (text === '*') {
    return [0, 255];
  }

  if (/^\d+$/.test(text)) {
    const value = Number(text);
    if (value < 0 || value > 255) {
      throw new AddrFormatError(`invalid nmap range: ${original}`);
    }
    return [value, value];
  }

  const match = text.match(/^(\d+)-(\d+)$/);
  if (!match) {
    throw new AddrFormatError(`invalid nmap range: ${original}`);
  }

  const low = Number(match[1]);
  const high = Number(match[2]);
  if (low < 0 || low > 255 || high < 0 || high > 255 || low > high) {
    throw new AddrFormatError(`invalid nmap range: ${original}`);
  }

  return [low, high];
}

function expandOctetSpec(spec, original) {
  const items = spec.split(',').map((s) => s.trim());

  const values = new Set();
  for (const item of items) {
    const [low, high] = parseNmapOctetItem(item, original);
    for (let value = low; value <= high; value += 1) {
      values.add(value);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

function parseNmapRange(iprange) {
  const text = String(iprange).trim();
  const parts = text.split('.');
  if (parts.length !== 4) {
    throw new AddrFormatError(`invalid nmap range: ${iprange}`);
  }

  return parts.map((part) => expandOctetSpec(part, text));
}

export function valid_nmap_range(iprange) {
  try {
    parseNmapRange(iprange);
    return true;
  } catch {
    return false;
  }
}

export function* iter_nmap_range(iprange) {
  const [a, b, c, d] = parseNmapRange(iprange);
  for (const o1 of a) {
    for (const o2 of b) {
      for (const o3 of c) {
        for (const o4 of d) {
          yield new IPAddress(`${o1}.${o2}.${o3}.${o4}`, 4);
        }
      }
    }
  }
}
