import { AddrFormatError } from './core.js';
import { IPAddress, IPNetwork, IPRange, cidr_exclude, cidr_merge, iprange_to_cidrs } from './ip.js';

function asNetworks(input) {
  if (input instanceof IPSet) {
    return input.iter_cidrs();
  }
  if (input instanceof IPNetwork) {
    return [input.cidr];
  }
  if (input instanceof IPRange) {
    return iprange_to_cidrs(input._start, input._end);
  }
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'bigint') {
    return [new IPNetwork(input).cidr];
  }
  if (!input || !input[Symbol.iterator]) {
    throw new AddrFormatError('an iterable was expected');
  }

  const result = [];
  for (const item of input) {
    if (item instanceof IPRange) {
      result.push(...iprange_to_cidrs(item._start, item._end));
    } else if (item instanceof IPNetwork) {
      result.push(item.cidr);
    } else if (item instanceof IPAddress) {
      result.push(new IPNetwork(item));
    } else {
      result.push(new IPNetwork(item).cidr);
    }
  }
  return result;
}

export class IPSet {
  constructor(iterable = null) {
    this._cidrs = [];
    if (iterable != null) {
      this.update(iterable);
    }
  }

  _setCidrs(cidrs) {
    this._cidrs = cidr_merge(cidrs);
  }

  compact() {
    this._setCidrs(this._cidrs);
    return this;
  }

  add(addr) {
    const addition = asNetworks(addr);
    this._setCidrs(this._cidrs.concat(addition));
    return this;
  }

  remove(addr) {
    const toRemove = asNetworks(addr);
    let current = [...this._cidrs];
    for (const rem of toRemove) {
      const next = [];
      for (const net of current) {
        if (!net.overlaps(rem)) {
          next.push(net);
        } else {
          next.push(...cidr_exclude(net, rem));
        }
      }
      current = cidr_merge(next);
    }
    this._cidrs = current;
    return this;
  }

  update(iterable) {
    this._setCidrs(this._cidrs.concat(asNetworks(iterable)));
    return this;
  }

  union(other) {
    const result = new IPSet(this._cidrs);
    result.update(other);
    return result;
  }

  intersection(other) {
    const left = this._cidrs;
    const right = cidr_merge(asNetworks(other));
    const ranges = [];

    for (const a of left) {
      for (const b of right) {
        if (a.version !== b.version) {
          continue;
        }
        if (!a.overlaps(b)) {
          continue;
        }
        const first = a.first > b.first ? a.first : b.first;
        const last = a.last < b.last ? a.last : b.last;
        ranges.push(new IPRange(new IPAddress(first, a.version), new IPAddress(last, a.version)));
      }
    }

    return new IPSet(ranges);
  }

  difference(other) {
    const result = new IPSet(this._cidrs);
    result.remove(other);
    return result;
  }

  symmetric_difference(other) {
    const a = this.difference(other);
    const b = new IPSet(other).difference(this);
    return a.union(b);
  }

  contains(value) {
    if (value instanceof IPNetwork) {
      return this._cidrs.some((cidr) => cidr.contains(value));
    }
    if (value instanceof IPRange) {
      return this._cidrs.some((cidr) => cidr.contains(value));
    }
    const ip = value instanceof IPAddress ? value : new IPAddress(value);
    return this._cidrs.some((cidr) => cidr.contains(ip));
  }

  iter_cidrs() {
    return [...this._cidrs];
  }

  iter_ipranges() {
    if (this._cidrs.length === 0) {
      return [];
    }

    const ranges = [];
    let cur = new IPRange(
      new IPAddress(this._cidrs[0].first, this._cidrs[0].version),
      new IPAddress(this._cidrs[0].last, this._cidrs[0].version),
    );

    for (const cidr of this._cidrs.slice(1)) {
      if (cidr.version === cur.version && cidr.first <= cur.last + 1n) {
        cur = new IPRange(cur._start, new IPAddress(cidr.last, cidr.version));
      } else {
        ranges.push(cur);
        cur = new IPRange(new IPAddress(cidr.first, cidr.version), new IPAddress(cidr.last, cidr.version));
      }
    }
    ranges.push(cur);
    return ranges;
  }

  iprange() {
    const ranges = this.iter_ipranges();
    if (ranges.length !== 1) {
      throw new AddrFormatError('IPSet is not contiguous');
    }
    return ranges[0];
  }

  iscontiguous() {
    return this.iter_ipranges().length <= 1;
  }

  get size() {
    return this._cidrs.reduce((acc, cidr) => acc + cidr.size, 0n);
  }

  toString() {
    return `IPSet([${this._cidrs.map((c) => `'${c.toString()}'`).join(', ')}])`;
  }
}
