import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IPAddress,
  IPNetwork,
  IPRange,
  valid_glob,
  glob_to_iprange,
  iter_nmap_range,
  ipv6_to_base85,
  base85_to_ipv6,
  valid_ipv4,
  valid_ipv6,
  valid_mac,
  valid_eui64,
} from '../src/index.js';

function makeRng(seed = 0xC0FFEE) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state;
  };
}

function randomIPv4Int(nextU32) {
  return BigInt(nextU32());
}

function randomIPv6Int(nextU32) {
  let value = 0n;
  for (let i = 0; i < 4; i += 1) {
    value = (value << 32n) | BigInt(nextU32());
  }
  return value;
}

test('property: IPv4 and IPv6 textual round-trips preserve numeric value', () => {
  const next = makeRng(0x12345678);

  for (let i = 0; i < 200; i += 1) {
    const v4 = randomIPv4Int(next);
    const ip4 = new IPAddress(v4, 4);
    assert.equal(new IPAddress(ip4.toString(), 4).toBigInt(), v4);

    const v6 = randomIPv6Int(next);
    const ip6 = new IPAddress(v6, 6);
    assert.equal(new IPAddress(ip6.toString(), 6).toBigInt(), v6);
  }
});

test('property: RFC1924 base85 round-trips random IPv6 values', () => {
  const next = makeRng(0xBADC0DE);

  for (let i = 0; i < 100; i += 1) {
    const value = randomIPv6Int(next);
    const original = new IPAddress(value, 6);
    const encoded = ipv6_to_base85(original);
    const decoded = base85_to_ipv6(encoded);
    assert.equal(decoded.toBigInt(), original.toBigInt());
  }
});

test('property: generated IPv4 globs are valid and map to bounded ranges', () => {
  const next = makeRng(0xFACEFEED);

  for (let i = 0; i < 120; i += 1) {
    const octets = [];
    for (let j = 0; j < 4; j += 1) {
      const low = next() % 256;
      // Force one exact-octet case so both ternary branches are covered deterministically.
      const high = i === 0 && j === 0 ? low : low + (next() % (256 - low));
      octets.push(low === high ? String(low) : `${low}-${high}`);
    }
    const glob = octets.join('.');
    assert.equal(valid_glob(glob), true);

    const range = glob_to_iprange(glob);
    assert.ok(range instanceof IPRange);

    const start = range.toString().split('-')[0];
    const end = range.toString().split('-')[1];
    assert.equal(range.contains(start), true);
    assert.equal(range.contains(end), true);
  }
});

test('property: generated nmap specs produce expected cartesian product counts', () => {
  const next = makeRng(0xDEADBEEF);

  for (let i = 0; i < 50; i += 1) {
    const a = next() % 3;
    const b = next() % 3;
    const c = next() % 3;
    const d = next() % 3;

    const spec = `${10 + a}-${10 + a + 1}.${20 + b}.${30 + c}-${30 + c + 1}.${40 + d},${41 + d}`;
    const ips = Array.from(iter_nmap_range(spec));
    const expected = 2 * 1 * 2 * 2;
    assert.equal(ips.length, expected);
  }
});

test('property: validators agree with successful constructor parsing', () => {
  const cases = [
    ['192.0.2.1', true, valid_ipv4],
    ['999.0.0.1', false, valid_ipv4],
    ['2001:db8::1', true, valid_ipv6],
    ['2001:::1', false, valid_ipv6],
    ['00:1b:77:49:54:fd', true, valid_mac],
    ['00:1b:77:49:54:fg', false, valid_mac],
    ['00:1b:77:ff:fe:49:54:fd', true, valid_eui64],
    ['00:1b:77:ff:fe:49:54', false, valid_eui64],
  ];

  for (const [value, expected, validator] of cases) {
    assert.equal(validator(value), expected);
  }

  for (let prefix = 0; prefix <= 32; prefix += 1) {
    const network = new IPNetwork(`10.0.0.1/${prefix}`);
    assert.equal(network.version, 4);
  }
});
