import { parseIPv4, parseIPv6, prefixToNetmask } from './addr.js';
import { IANA_IPV4, IANA_IPV6 } from './data/iana.js';

const parsedCache = new Map();

function parseCidr(cidr, version) {
  const key = `${version}:${cidr}`;
  if (parsedCache.has(key)) {
    return parsedCache.get(key);
  }

  const [addrText, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);
  const width = version === 4 ? 32 : 128;
  const addr = version === 4 ? parseIPv4(addrText) : parseIPv6(addrText);
  const mask = prefixToNetmask(prefix, width);
  const net = addr & mask;
  const parsed = { net, prefix, width };
  parsedCache.set(key, parsed);
  return parsed;
}

function inCidr(ipValue, version, cidr) {
  const parsed = parseCidr(cidr, version);
  const mask = prefixToNetmask(parsed.prefix, parsed.width);
  return (ipValue & mask) === parsed.net;
}

function normalizeRecords(records, ipValue, version) {
  return records
    .filter((record) => inCidr(ipValue, version, record.cidr))
    .map((record) => ({ ...record }));
}

export function query_iana(ipAddress) {
  const ipValue = ipAddress.toBigInt();
  if (ipAddress.version === 4) {
    const ipv4 = normalizeRecords(IANA_IPV4.filter((r) => !r.category), ipValue, 4);
    const multicast = normalizeRecords(IANA_IPV4.filter((r) => r.category === 'Multicast'), ipValue, 4);
    const info = {};
    if (ipv4.length) {
      info.IPv4 = ipv4;
    }
    if (multicast.length) {
      info.Multicast = multicast;
    }
    return info;
  }

  const ipv6 = normalizeRecords(IANA_IPV6.filter((r) => !r.category), ipValue, 6);
  const multicast = normalizeRecords(IANA_IPV6.filter((r) => r.category === 'Multicast'), ipValue, 6);
  const info = {};
  if (ipv6.length) {
    info.IPv6 = ipv6;
  }
  if (multicast.length) {
    info.Multicast = multicast;
  }
  return info;
}

export function is_globally_reachable(ipAddress) {
  const info = query_iana(ipAddress);
  const allRecords = Object.values(info).flat();
  if (allRecords.length === 0) {
    return true;
  }

  let hasTrue = false;
  for (const record of allRecords) {
    if (record.globallyReachable === true) {
      hasTrue = true;
      break;
    }
  }
  if (hasTrue) {
    return true;
  }

  for (const record of allRecords) {
    if (record.globallyReachable === false || record.globallyReachable === null) {
      return false;
    }
  }

  return true;
}
