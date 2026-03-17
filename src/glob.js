import { AddrConversionError, AddrFormatError } from './core.js';
import { IPAddress, IPNetwork, IPRange, iprange_to_cidrs } from './ip.js';

function parseGlobOctetPart(part, original) {
  if (part === '*') {
    return [0, 255];
  }

  if (/^\d+$/.test(part)) {
    const value = Number(part);
    if (value < 0 || value > 255) {
      throw new AddrFormatError(`invalid IPv4 glob: ${original}`);
    }
    return [value, value];
  }

  const match = part.match(/^(\d+)-(\d+)$/);
  if (!match) {
    throw new AddrFormatError(`invalid IPv4 glob: ${original}`);
  }

  const low = Number(match[1]);
  const high = Number(match[2]);
  if (low < 0 || low > 255 || high < 0 || high > 255 || low > high) {
    throw new AddrFormatError(`invalid IPv4 glob: ${original}`);
  }

  return [low, high];
}

function parseGlob(ipglob) {
  const text = String(ipglob).trim();
  const parts = text.split('.');
  if (parts.length !== 4) {
    throw new AddrFormatError(`invalid IPv4 glob: ${ipglob}`);
  }

  const octets = parts.map((part) => parseGlobOctetPart(part, text));
  const start = octets.map(([low]) => low).join('.');
  const end = octets.map(([, high]) => high).join('.');
  return { start, end, octets };
}

function globTupleToString(octets) {
  return octets
    .map(([low, high]) => {
      if (low === 0 && high === 255) {
        return '*';
      }
      if (low === high) {
        return String(low);
      }
      return `${low}-${high}`;
    })
    .join('.');
}

export function valid_glob(ipglob) {
  try {
    parseGlob(ipglob);
    return true;
  } catch {
    return false;
  }
}

export function glob_to_iptuple(ipglob) {
  const { start, end } = parseGlob(ipglob);
  return [start, end];
}

export function glob_to_iprange(ipglob) {
  const { start, end } = parseGlob(ipglob);
  return new IPRange(start, end);
}

export function glob_to_cidrs(ipglob) {
  const range = glob_to_iprange(ipglob);
  return iprange_to_cidrs(new IPAddress(range.first, 4), new IPAddress(range.last, 4));
}

export function cidr_to_glob(cidr) {
  const ip = new IPNetwork(cidr).cidr;
  if (ip.version !== 4) {
    throw new AddrConversionError('IPv6 CIDR to glob conversion is not supported');
  }

  const first = new IPAddress(ip.first, 4).words;
  const last = new IPAddress(ip.last, 4).words;
  const octets = first.map((low, idx) => [low, last[idx]]);
  return globTupleToString(octets);
}

export function iprange_to_globs(start, end) {
  const cidrs = iprange_to_cidrs(start, end);
  return cidrs.map((cidr) => cidr_to_glob(cidr));
}

export class IPGlob extends IPRange {
  constructor(ipglob) {
    const { start, end } = parseGlob(ipglob);
    super(start, end);
    this._glob = globTupleToString(parseGlob(ipglob).octets);
  }

  toString() {
    return this._glob;
  }
}
