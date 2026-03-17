import {
  AddrConversionError,
  AddrFormatError,
  INET_ATON,
  INET_PTON,
  NOHOST,
  ZEROFILL,
} from './core.js';
import {
  bitLength,
  formatIP,
  hostmaskToPrefix,
  maxForVersion,
  netmaskToPrefix,
  parseIP,
  prefixToNetmask,
  toBigInt,
  trailingZeroBits,
  widthForVersion,
} from './addr.js';
import { is_globally_reachable, query_iana } from './iana.js';

function ensureVersionAndRange(value, version) {
  const max = maxForVersion(version);
  if (value < 0n || value > max) {
    throw new AddrFormatError(`value ${value} outside IPv${version} bounds`);
  }
}

function compareRanges(a, b) {
  if (a.version !== b.version) {
    return a.version - b.version;
  }
  if (a.first < b.first) {
    return -1;
  }
  if (a.first > b.first) {
    return 1;
  }
  if (a.last < b.last) {
    return -1;
  }
  if (a.last > b.last) {
    return 1;
  }
  return 0;
}

function ipv6WordsFromValue(value) {
  const words = [];
  let cur = value;
  for (let i = 0; i < 8; i += 1) {
    words.unshift(Number(cur & 0xffffn));
    cur >>= 16n;
  }
  return words;
}

function formatIPv6Word(word, wordFmt) {
  if (wordFmt === '%.4x') {
    return word.toString(16).padStart(4, '0');
  }
  return word.toString(16);
}

function formatIPv6WithDialect(value, dialect) {
  const words = ipv6WordsFromValue(value);
  const wordFmt = dialect?.word_fmt ?? '%x';
  const compact = dialect?.compact ?? true;

  const renderWord = (word) => formatIPv6Word(word, wordFmt);

  if (compact) {
    const allZeroPrefix = words.slice(0, 6).every((word) => word === 0);
    const mappedPrefix = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
    if (allZeroPrefix || mappedPrefix) {
      const high = words[6];
      const low = words[7];
      const dotted = [
        (high >> 8) & 0xff,
        high & 0xff,
        (low >> 8) & 0xff,
        low & 0xff,
      ].join('.');
      if (allZeroPrefix) {
        return `::${dotted}`;
      }
      return `::ffff:${dotted}`;
    }

    let bestStart = -1;
    let bestLen = 0;
    let runStart = -1;

    for (let i = 0; i <= words.length; i += 1) {
      const isZero = i < words.length && words[i] === 0;
      if (isZero && runStart === -1) {
        runStart = i;
      }
      if (!isZero && runStart !== -1) {
        const len = i - runStart;
        if (len > bestLen && len >= 2) {
          bestStart = runStart;
          bestLen = len;
        }
        runStart = -1;
      }
    }

    if (bestStart >= 0) {
      const left = words.slice(0, bestStart).map(renderWord).join(':');
      const right = words.slice(bestStart + bestLen).map(renderWord).join(':');
      if (left && right) {
        return `${left}::${right}`;
      }
      if (left) {
        return `${left}::`;
      }
      if (right) {
        return `::${right}`;
      }
    }
  }

  return words.map(renderWord).join(':');
}

export class ipv6_compact {}
ipv6_compact.word_fmt = '%x';
ipv6_compact.compact = true;

export class ipv6_full extends ipv6_compact {}
ipv6_full.word_fmt = '%x';
ipv6_full.compact = false;

export class ipv6_verbose extends ipv6_compact {}
ipv6_verbose.word_fmt = '%.4x';
ipv6_verbose.compact = false;

export class IPAddress {
  constructor(addr, version = null, flags = 0) {
    this._flags = flags;
    if (addr instanceof IPAddress) {
      if (version !== null && version !== addr.version) {
        throw new AddrFormatError('cannot switch IP versions via copy constructor');
      }
      this.version = addr.version;
      this.value = addr.value;
      return;
    }

    if (typeof addr === 'bigint' || typeof addr === 'number') {
      const value = toBigInt(addr);
      if (version === null) {
        if (value <= maxForVersion(4)) {
          version = 4;
        } else if (value <= maxForVersion(6)) {
          version = 6;
        } else {
          throw new AddrFormatError(`address integer out of range: ${addr}`);
        }
      }
      ensureVersionAndRange(value, version);
      this.version = version;
      this.value = value;
      return;
    }

    const text = String(addr).trim();
    if (text.includes('/')) {
      throw new AddrFormatError('IPAddress does not support CIDR prefixes');
    }

    if (version === null) {
      const parsed = parseIP(text, null, flags);
      this.version = parsed.version;
      this.value = parsed.value;
    } else {
      this.version = version;
      this.value = parseIP(text, version, flags);
    }
    ensureVersionAndRange(this.value, this.version);
  }

  toString() {
    return formatIP(this.value, this.version);
  }

  toJSON() {
    return this.toString();
  }

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') {
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      if (this.value > maxSafe) {
        throw new AddrConversionError('address exceeds Number.MAX_SAFE_INTEGER');
      }
      return Number(this.value);
    }
    return this.toString();
  }

  toBigInt() {
    return this.value;
  }

  equals(other) {
    const ip = new IPAddress(other, this.version);
    return this.value === ip.value;
  }

  compare(other) {
    const ip = new IPAddress(other, this.version);
    if (this.value < ip.value) {
      return -1;
    }
    if (this.value > ip.value) {
      return 1;
    }
    return 0;
  }

  add(num) {
    const next = this.value + toBigInt(num);
    ensureVersionAndRange(next, this.version);
    return new IPAddress(next, this.version);
  }

  sub(num) {
    return this.add(-toBigInt(num));
  }

  get words() {
    if (this.version === 4) {
      return Object.freeze([
        Number((this.value >> 24n) & 255n),
        Number((this.value >> 16n) & 255n),
        Number((this.value >> 8n) & 255n),
        Number(this.value & 255n),
      ]);
    }

    const parts = [];
    let cur = this.value;
    for (let i = 0; i < 8; i += 1) {
      parts.unshift(Number(cur & 0xffffn));
      cur >>= 16n;
    }
    return Object.freeze(parts);
  }

  get bin() {
    const width = widthForVersion(this.version);
    return `0b${this.value.toString(2).padStart(width, '0')}`;
  }

  bits(wordSep = this.version === 4 ? '.' : ':') {
    const width = widthForVersion(this.version);
    const group = this.version === 4 ? 8 : 16;
    const raw = this.value.toString(2).padStart(width, '0');
    const words = [];
    for (let i = 0; i < width; i += group) {
      words.push(raw.slice(i, i + group));
    }
    return words.join(wordSep);
  }

  get reverseDns() {
    if (this.version === 4) {
      return this.words.slice().reverse().join('.') + '.in-addr.arpa';
    }
    const hex = this.value.toString(16).padStart(32, '0').split('').reverse().join('.');
    return `${hex}.ip6.arpa`;
  }

  get reverse_dns() {
    return this.reverseDns;
  }

  get packed() {
    if (this.version === 4) {
      return Uint8Array.from(this.words);
    }

    const bytes = [];
    let cur = this.value;
    for (let i = 0; i < 16; i += 1) {
      bytes.unshift(Number(cur & 0xffn));
      cur >>= 8n;
    }
    return Uint8Array.from(bytes);
  }

  netmaskBits() {
    const width = widthForVersion(this.version);
    return netmaskToPrefix(this.value, width);
  }

  isNetmask() {
    try {
      this.netmaskBits();
      return true;
    } catch {
      return false;
    }
  }

  isHostmask() {
    try {
      hostmaskToPrefix(this.value, widthForVersion(this.version));
      return true;
    } catch {
      return false;
    }
  }

  is_loopback() {
    if (this.version === 4) {
      return new IPNetwork('127.0.0.0/8').contains(this);
    }
    return this.equals('::1');
  }

  is_multicast() {
    if (this.version === 4) {
      return new IPNetwork('224.0.0.0/4').contains(this);
    }
    return new IPNetwork('ff00::/8').contains(this);
  }

  is_private() {
    if (this.version === 4) {
      return (
        new IPNetwork('10.0.0.0/8').contains(this) ||
        new IPNetwork('172.16.0.0/12').contains(this) ||
        new IPNetwork('192.168.0.0/16').contains(this)
      );
    }
    return new IPNetwork('fc00::/7').contains(this);
  }

  is_ipv4_private_use() {
    return this.version === 4 && this.is_private();
  }

  is_ipv6_unique_local() {
    return this.version === 6 && new IPNetwork('fc00::/7').contains(this);
  }

  format(dialect = null) {
    if (dialect !== null && !Object.prototype.hasOwnProperty.call(dialect, 'word_fmt')) {
      throw new TypeError('custom dialects should subclass ipv6_verbose!');
    }
    if (this.version === 4 || dialect == null) {
      return this.toString();
    }
    return formatIPv6WithDialect(this.value, dialect);
  }

  ipv4() {
    if (this.version === 4) {
      return new IPAddress(this);
    }

    const v4MappedPrefix = parseIP('::ffff:0:0', 6);
    const v4MappedMask = parseIP('ffff:ffff:ffff:ffff:ffff:ffff:0:0', 6);
    if ((this.value & v4MappedMask) === v4MappedPrefix) {
      return new IPAddress(this.value & 0xffffffffn, 4);
    }

    if (this.value <= 0xffffffffn) {
      return new IPAddress(this.value, 4);
    }

    throw new AddrConversionError(`IPv6 address ${this} cannot be converted to IPv4`);
  }

  ipv6(ipv4_compatible = false) {
    if (this.version === 6) {
      return new IPAddress(this);
    }

    if (ipv4_compatible) {
      return new IPAddress(this.value, 6);
    }

    const mapped = (0xffffn << 32n) | this.value;
    return new IPAddress(mapped, 6);
  }

  get info() {
    return query_iana(this);
  }

  is_global() {
    return is_globally_reachable(this);
  }
}

export class IPNetwork {
  constructor(addr, version = null, flags = 0) {
    this._flags = flags;
    if (flags & ~NOHOST) {
      throw new AddrFormatError(`unsupported flags: ${flags}`);
    }

    if (addr instanceof IPNetwork) {
      this.version = version ?? addr.version;
      if (this.version !== addr.version) {
        throw new AddrFormatError('cannot switch IP versions via copy constructor');
      }
      this._value = addr._value;
      this.prefixlen = addr.prefixlen;
      if (flags & NOHOST) {
        this._value &= this._netmaskInt();
      }
      return;
    }

    if (addr instanceof IPAddress) {
      this.version = version ?? addr.version;
      if (this.version !== addr.version) {
        throw new AddrFormatError('IP version mismatch');
      }
      this._value = addr.value;
      this.prefixlen = widthForVersion(this.version);
      return;
    }

    if (Array.isArray(addr) || (typeof addr === 'object' && addr !== null && '0' in addr && '1' in addr)) {
      const [raw, prefix] = addr;
      if (version == null) {
        throw new AddrFormatError('version required for tuple constructor');
      }
      this.version = version;
      this._value = toBigInt(raw);
      this.prefixlen = Number(prefix);
      ensureVersionAndRange(this._value, this.version);
      return;
    }

    const text = String(addr).trim();
    let ipText = text;
    let maskText = null;
    if (text.includes('/')) {
      [ipText, maskText] = text.split('/', 2);
    }

    const ip = new IPAddress(ipText, version, INET_PTON);
    this.version = ip.version;
    this._value = ip.value;

    const width = widthForVersion(this.version);

    if (maskText == null || maskText === '') {
      this.prefixlen = width;
    } else if (/^\d+$/.test(maskText)) {
      this.prefixlen = Number(maskText);
    } else {
      const maskIp = new IPAddress(maskText, this.version);
      try {
        this.prefixlen = netmaskToPrefix(maskIp.value, width);
      } catch {
        this.prefixlen = hostmaskToPrefix(maskIp.value, width);
      }
    }

    if (!Number.isInteger(this.prefixlen) || this.prefixlen < 0 || this.prefixlen > width) {
      throw new AddrFormatError(`invalid prefix length /${this.prefixlen}`);
    }

    if (flags & NOHOST) {
      this._value &= this._netmaskInt();
    }
  }

  _width() {
    return widthForVersion(this.version);
  }

  _max() {
    return maxForVersion(this.version);
  }

  _hostmaskInt() {
    return (1n << BigInt(this._width() - this.prefixlen)) - 1n;
  }

  _netmaskInt() {
    return prefixToNetmask(this.prefixlen, this._width());
  }

  get ip() {
    return new IPAddress(this._value, this.version);
  }

  get network() {
    return new IPAddress(this.first, this.version);
  }

  get broadcast() {
    if (this.version === 6 || this._width() - this.prefixlen <= 1) {
      return null;
    }
    return new IPAddress(this.last, this.version);
  }

  get first() {
    return this._value & this._netmaskInt();
  }

  get last() {
    return this.first | this._hostmaskInt();
  }

  get size() {
    return 1n << BigInt(this._width() - this.prefixlen);
  }

  get netmask() {
    return new IPAddress(this._netmaskInt(), this.version);
  }

  set netmask(value) {
    const mask = new IPAddress(value, this.version);
    this.prefixlen = mask.netmaskBits();
  }

  get hostmask() {
    return new IPAddress(this._hostmaskInt(), this.version);
  }

  get cidr() {
    return new IPNetwork([this.first, this.prefixlen], this.version);
  }

  format() {
    return this.toString();
  }

  toString() {
    return `${this.ip}/${this.prefixlen}`;
  }

  toJSON() {
    return this.toString();
  }

  compare(other) {
    const right = new IPNetwork(other);
    const cmp = compareRanges(this, right);
    if (cmp !== 0) {
      return cmp;
    }
    return this.prefixlen - right.prefixlen;
  }

  contains(other) {
    if (other instanceof IPAddress) {
      if (other.version !== this.version) {
        return false;
      }
      return other.value >= this.first && other.value <= this.last;
    }

    if (other instanceof IPRange) {
      return (
        other.version === this.version && other.first >= this.first && other.last <= this.last
      );
    }

    const net = new IPNetwork(other);
    return net.version === this.version && net.first >= this.first && net.last <= this.last;
  }

  overlaps(other) {
    const net = new IPNetwork(other);
    if (net.version !== this.version) {
      return false;
    }
    return this.first <= net.last && net.first <= this.last;
  }

  previous(step = 1) {
    return this.add(-toBigInt(step));
  }

  next(step = 1) {
    return this.add(toBigInt(step));
  }

  add(step) {
    const base = this.first;
    const delta = this.size * step;
    const next = base + delta;
    if (next < 0n || next + (this.size - 1n) > this._max()) {
      throw new AddrFormatError('increment exceeds address boundary');
    }
    return new IPNetwork([next, this.prefixlen], this.version);
  }

  supernet(prefixlen = 0) {
    if (!Number.isInteger(prefixlen)) {
      throw new AddrFormatError('prefixlen must be an integer');
    }
    if (prefixlen < 0 || prefixlen > this.prefixlen) {
      throw new AddrFormatError('invalid supernet prefix length');
    }
    return new IPNetwork([this.first, prefixlen], this.version).cidr;
  }

  subnet(prefixlen, count = null) {
    if (!Number.isInteger(prefixlen)) {
      throw new AddrFormatError('prefixlen must be an integer');
    }
    if (prefixlen < this.prefixlen || prefixlen > this._width()) {
      return [];
    }

    const subnetSize = 1n << BigInt(this._width() - prefixlen);
    const maxSubnets = this.size / subnetSize;
    const total = count == null ? maxSubnets : BigInt(count);
    const result = [];
    let base = this.first;
    for (let i = 0n; i < total && i < maxSubnets; i += 1n) {
      result.push(new IPNetwork([base, prefixlen], this.version));
      base += subnetSize;
    }
    return result;
  }

  iterHosts() {
    const first = this.first;
    const last = this.last;
    let start = first;
    let end = last;

    if (this.version === 4 && this.prefixlen <= 30) {
      start = first + 1n;
      end = last - 1n;
    }

    return iter_iprange(new IPAddress(start, this.version), new IPAddress(end, this.version));
  }

  iter_hosts() {
    return this.iterHosts();
  }

  ipv4() {
    if (this.version === 4) {
      return new IPNetwork(this);
    }

    const ip4 = this.ip.ipv4();
    const prefix = Math.max(0, this.prefixlen - 96);
    return new IPNetwork([ip4.toBigInt(), prefix], 4).cidr;
  }

  ipv6(ipv4_compatible = false) {
    if (this.version === 6) {
      return new IPNetwork(this);
    }

    const ip6 = this.ip.ipv6(ipv4_compatible);
    const prefix = Math.min(128, this.prefixlen + (ipv4_compatible ? 0 : 96));
    return new IPNetwork([ip6.toBigInt(), prefix], 6).cidr;
  }

  [Symbol.iterator]() {
    return iter_iprange(new IPAddress(this.first, this.version), new IPAddress(this.last, this.version));
  }
}

export class IPRange {
  constructor(start, end, flags = 0) {
    this._flags = flags;
    this._start = new IPAddress(start, null, flags);
    this._end = new IPAddress(end, this._start.version, flags);
    if (this._start.value > this._end.value) {
      throw new AddrFormatError('lower bound IP greater than upper bound');
    }
    this.version = this._start.version;
  }

  get first() {
    return this._start.value;
  }

  get last() {
    return this._end.value;
  }

  get size() {
    return this.last - this.first + 1n;
  }

  contains(other) {
    if (other instanceof IPAddress) {
      return other.version === this.version && other.value >= this.first && other.value <= this.last;
    }
    if (other instanceof IPRange) {
      return other.version === this.version && other.first >= this.first && other.last <= this.last;
    }
    const net = new IPNetwork(other);
    return net.version === this.version && net.first >= this.first && net.last <= this.last;
  }

  cidrs() {
    return iprange_to_cidrs(this._start, this._end);
  }

  toString() {
    return `${this._start}-${this._end}`;
  }

  [Symbol.iterator]() {
    return iter_iprange(this._start, this._end);
  }
}

export function* iter_iprange(start, end, step = 1) {
  const a = new IPAddress(start);
  const b = new IPAddress(end, a.version);
  let delta = toBigInt(step);
  if (delta === 0n) {
    throw new AddrFormatError('step cannot be zero');
  }

  if (delta > 0n) {
    for (let cur = a.value; cur <= b.value; cur += delta) {
      yield new IPAddress(cur, a.version);
    }
  } else {
    for (let cur = a.value; cur >= b.value; cur += delta) {
      yield new IPAddress(cur, a.version);
    }
  }
}

export function spanning_cidr(ipAddrs) {
  const items = Array.from(ipAddrs);
  if (items.length < 2) {
    throw new AddrFormatError('IP sequence must contain at least 2 elements');
  }

  const nets = items.map((item) => new IPNetwork(item));
  const version = nets[0].version;
  for (const net of nets) {
    if (net.version !== version) {
      throw new AddrFormatError('mixed IP versions are not supported');
    }
  }

  let min = nets[0].first;
  let max = nets[0].last;
  for (const net of nets.slice(1)) {
    if (net.first < min) {
      min = net.first;
    }
    if (net.last > max) {
      max = net.last;
    }
  }

  const width = widthForVersion(version);
  const differing = min ^ max;
  const prefix = width - bitLength(differing);
  return new IPNetwork([min, prefix], version).cidr;
}

export function iprange_to_cidrs(start, end) {
  const firstNet = new IPNetwork(start);
  const lastNet = new IPNetwork(end, firstNet.version);

  let first = firstNet.first;
  const last = lastNet.last;
  const version = firstNet.version;
  const width = widthForVersion(version);
  const result = [];

  while (first <= last) {
    const tz = trailingZeroBits(first, width);
    const maxPrefixByAlignment = width - tz;

    const remaining = last - first + 1n;
    const maxBlockBits = bitLength(remaining) - 1;
    const maxPrefixBySize = width - maxBlockBits;

    const prefix = Math.max(maxPrefixByAlignment, maxPrefixBySize);
    result.push(new IPNetwork([first, prefix], version));
    first += 1n << BigInt(width - prefix);
  }

  return result;
}

export function cidr_merge(ipAddrs) {
  const ranges = [];
  for (const item of ipAddrs) {
    if (item instanceof IPRange) {
      ranges.push({ version: item.version, first: item.first, last: item.last });
      continue;
    }
    const net = item instanceof IPNetwork ? item : new IPNetwork(item);
    ranges.push({ version: net.version, first: net.first, last: net.last });
  }

  ranges.sort((a, b) => {
    if (a.version !== b.version) {
      return a.version - b.version;
    }
    if (a.first < b.first) {
      return -1;
    }
    if (a.first > b.first) {
      return 1;
    }
    if (a.last < b.last) {
      return -1;
    }
    if (a.last > b.last) {
      return 1;
    }
    return 0;
  });

  const merged = [];
  for (const range of ranges) {
    const current = { ...range };
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.version === current.version &&
      current.first <= previous.last + 1n
    ) {
      if (current.last > previous.last) {
        previous.last = current.last;
      }
    } else {
      merged.push(current);
    }
  }

  const output = [];
  for (const range of merged) {
    output.push(
      ...iprange_to_cidrs(new IPAddress(range.first, range.version), new IPAddress(range.last, range.version)),
    );
  }
  return output;
}

export function cidr_exclude(target, exclude) {
  const t = new IPNetwork(target).cidr;
  const e = new IPNetwork(exclude).cidr;

  if (t.version !== e.version) {
    return [t];
  }

  if (!t.overlaps(e)) {
    return [t];
  }

  if (e.contains(t)) {
    return [];
  }

  const width = widthForVersion(t.version);
  const queue = [t];
  const result = [];

  while (queue.length > 0) {
    const cur = queue.pop();
    if (!cur.overlaps(e)) {
      result.push(cur);
      continue;
    }
    if (e.contains(cur)) {
      continue;
    }
    const children = cur.subnet(cur.prefixlen + 1, 2);
    queue.push(children[1], children[0]);
  }

  result.sort((a, b) => compareRanges(a, b));
  return result;
}

export function largest_matching_cidr(ip, cidrs) {
  const target = new IPAddress(ip);
  const networks = Array.from(cidrs).map((c) => new IPNetwork(c));
  networks.sort((a, b) => {
    if (a.version !== b.version) {
      return a.version - b.version;
    }
    if (a.prefixlen !== b.prefixlen) {
      return a.prefixlen - b.prefixlen;
    }
    return compareRanges(a, b);
  });
  for (const net of networks) {
    if (net.contains(target)) {
      return net;
    }
  }
  return null;
}

export function smallest_matching_cidr(ip, cidrs) {
  const target = new IPAddress(ip);
  const networks = Array.from(cidrs).map((c) => new IPNetwork(c));
  networks.sort((a, b) => {
    if (a.version !== b.version) {
      return a.version - b.version;
    }
    if (a.prefixlen !== b.prefixlen) {
      return b.prefixlen - a.prefixlen;
    }
    return compareRanges(a, b);
  });
  for (const net of networks) {
    if (net.contains(target)) {
      return net;
    }
  }
  return null;
}

export function all_matching_cidrs(ip, cidrs) {
  const target = new IPAddress(ip);
  const networks = Array.from(cidrs).map((c) => new IPNetwork(c));
  networks.sort((a, b) => {
    if (a.version !== b.version) {
      return a.version - b.version;
    }
    if (a.prefixlen !== b.prefixlen) {
      return a.prefixlen - b.prefixlen;
    }
    return compareRanges(a, b);
  });
  return networks.filter((net) => net.contains(target));
}

export function iter_unique_ips(...iterables) {
  const merged = cidr_merge(iterables.flat());
  return merged[Symbol.iterator]();
}

export function cidr_abbrev_to_verbose(abbrev) {
  const text = String(abbrev).trim();
  if (text.length === 0 || text.includes(':')) {
    return text;
  }

  const classfulPrefix = (firstOctet) => {
    if (firstOctet <= 127) {
      return 8;
    }
    if (firstOctet <= 191) {
      return 16;
    }
    if (firstOctet <= 223) {
      return 24;
    }
    if (firstOctet <= 239) {
      return 4;
    }
    return 32;
  };

  let addr = text;
  let prefix = null;
  if (text.includes('/')) {
    [addr, prefix] = text.split('/', 2);
    if (!/^\d+$/.test(prefix) || Number(prefix) < 0 || Number(prefix) > 32) {
      return text;
    }
  }

  const parts = addr.split('.');
  if (!parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
    return text;
  }
  if (parts.length < 1 || parts.length > 4) {
    return text;
  }

  while (parts.length < 4) {
    parts.push('0');
  }

  if (prefix == null) {
    prefix = String(classfulPrefix(Number(parts[0])));
  }

  return `${parts.join('.')}/${prefix}`;
}

export function expand_partial_ipv4_address(addr) {
  const error = () => new AddrFormatError(`invalid partial IPv4 address: ${JSON.stringify(addr)}!`);

  let tokens = [];
  if (typeof addr === 'string') {
    if (addr.includes(':')) {
      throw error();
    }

    const rawParts = addr.includes('.') ? addr.split('.') : [addr];
    try {
      tokens = rawParts.map((part) => {
        if (!/^\s*[+-]?\d+\s*$/.test(part)) {
          throw new Error('not-an-int');
        }
        return String(Number.parseInt(part, 10));
      });
    } catch {
      throw error();
    }

    if (tokens.length >= 1 && tokens.length <= 4) {
      while (tokens.length < 4) {
        tokens.push('0');
      }
    } else {
      throw error();
    }
  }

  if (!tokens.length) {
    throw error();
  }

  return `${tokens[0]}.${tokens[1]}.${tokens[2]}.${tokens[3]}`;
}

function networkIdentityKey(network) {
  return `${network.version}:${network.first}:${network.prefixlen}`;
}

export class SubnetSplitter {
  constructor(base_cidr) {
    this._subnets = [new IPNetwork(base_cidr)];
  }

  available_subnets() {
    return [...this._subnets].sort((a, b) => {
      if (a.prefixlen !== b.prefixlen) {
        return b.prefixlen - a.prefixlen;
      }
      return a.compare(b);
    });
  }

  extract_subnet(prefix, count = null) {
    for (const cidr of this.available_subnets()) {
      const subnets = cidr.subnet(prefix, count);
      if (!subnets.length) {
        continue;
      }

      this.remove_subnet(cidr);

      const remaining = cidr_exclude(cidr, cidr_merge(subnets)[0]);
      const known = new Set(this._subnets.map((subnet) => networkIdentityKey(subnet)));
      for (const subnet of remaining) {
        const key = networkIdentityKey(subnet);
        if (!known.has(key)) {
          this._subnets.push(subnet);
          known.add(key);
        }
      }

      return subnets;
    }
    return [];
  }

  remove_subnet(ip_network) {
    const target = new IPNetwork(ip_network);
    const targetKey = networkIdentityKey(target);
    const index = this._subnets.findIndex((subnet) => networkIdentityKey(subnet) === targetKey);
    if (index < 0) {
      throw new Error(String(target));
    }
    this._subnets.splice(index, 1);
  }
}

export function valid_ipv4(addr) {
  try {
    const ip = new IPAddress(addr, 4);
    return ip.version === 4;
  } catch {
    return false;
  }
}

export function valid_ipv6(addr) {
  try {
    const ip = new IPAddress(addr, 6);
    return ip.version === 6;
  } catch {
    return false;
  }
}

export { INET_ATON, INET_PTON, NOHOST, ZEROFILL };
