import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import {
  IPAddress,
  IPNetwork,
  cidr_merge,
  expand_partial_ipv4_address,
  iprange_to_cidrs,
  ipv6_compact,
  ipv6_full,
  ipv6_verbose,
  iter_iprange,
  ipv6_to_base85,
} from '../../src/index.js';

function runPython(code) {
  const executable = process.env.PYTHON ?? 'python3';
  return spawnSync(executable, ['-c', code], { encoding: 'utf8' });
}

function pythonNetaddrAvailable() {
  const probe = runPython('import netaddr');
  return probe.status === 0;
}

function pythonNetaddrJSON() {
  const script = String.raw`
import json
from netaddr import IPAddress, IPNetwork, cidr_merge, iprange_to_cidrs, iter_iprange, expand_partial_ipv4_address
from netaddr.strategy import ipv6

RFC1924_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_" + chr(96) + "{|}~"

def ipv6_to_base85_compat(value):
  if hasattr(ipv6, "ipv6_to_base85"):
    return ipv6.ipv6_to_base85(value)

  encoded = []
  for _ in range(20):
    value, remainder = divmod(value, 85)
    encoded.append(RFC1924_ALPHABET[remainder])
  return "".join(reversed(encoded))

out = {
  "ip": {
    "192.0.2.1": str(IPAddress("192.0.2.1")),
    "2001:db8::1": str(IPAddress("2001:db8::1")),
    "::ffff:192.0.2.1": str(IPAddress("::ffff:192.0.2.1")),
  },
  "network": {
    "192.0.2.5/24": str(IPNetwork("192.0.2.5/24")),
    "10.0.0.9/255.255.255.0": str(IPNetwork("10.0.0.9/255.255.255.0")),
    "2001:db8::1/64": str(IPNetwork("2001:db8::1/64")),
  },
  "cidr_merge": [
    [str(n) for n in cidr_merge(["192.0.128.0/24", "192.0.129.0/24"])],
    [str(n) for n in cidr_merge(["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/23"])],
  ],
  "range_to_cidrs": [
    [str(n) for n in iprange_to_cidrs("192.0.2.5", "192.0.2.10")],
    [str(n) for n in iprange_to_cidrs("2001:db8::1", "2001:db8::5")],
  ],
  "iter_iprange": [str(ip) for ip in iter_iprange("192.0.2.1", "192.0.2.3")],
  "ipv6_base85": ipv6_to_base85_compat(int(IPAddress("2001:db8::dead:beef"))),
  "expand_partial_ipv4": [
    expand_partial_ipv4_address("10"),
    expand_partial_ipv4_address("10.1"),
    expand_partial_ipv4_address("10.1.2"),
    expand_partial_ipv4_address("10.1.2.3"),
    expand_partial_ipv4_address("01.2"),
  ],
  "ipv6_formats": {
    "compact": IPAddress("::ffff:192.0.2.1").format(ipv6.ipv6_compact),
    "full": IPAddress("::ffff:192.0.2.1").format(ipv6.ipv6_full),
    "verbose": IPAddress("::ffff:192.0.2.1").format(ipv6.ipv6_verbose),
  },
}

print(json.dumps(out))
`;

  const result = runPython(script);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim());
}

test('Python netaddr differential parity for core operations', (t) => {
  if (!pythonNetaddrAvailable()) {
    if (process.env.REQUIRE_PYTHON_NETADDR === '1') {
      assert.fail('python netaddr is required for this run but is not available');
    }
    t.skip('python netaddr is not available in the current environment');
    return;
  }

  const py = pythonNetaddrJSON();

  const jsIp = {
    '192.0.2.1': String(new IPAddress('192.0.2.1')),
    '2001:db8::1': String(new IPAddress('2001:db8::1')),
    '::ffff:192.0.2.1': String(new IPAddress('::ffff:192.0.2.1')),
  };
  const pyIpNormalized = Object.fromEntries(
    Object.entries(py.ip).map(([key, value]) => [key, String(new IPAddress(value))]),
  );
  assert.deepEqual(jsIp, pyIpNormalized);

  const jsNetwork = {
    '192.0.2.5/24': String(new IPNetwork('192.0.2.5/24')),
    '10.0.0.9/255.255.255.0': String(new IPNetwork('10.0.0.9/255.255.255.0')),
    '2001:db8::1/64': String(new IPNetwork('2001:db8::1/64')),
  };
  assert.deepEqual(jsNetwork, py.network);

  const jsMerge = [
    cidr_merge(['192.0.128.0/24', '192.0.129.0/24']).map(String),
    cidr_merge(['10.0.0.0/24', '10.0.1.0/24', '10.0.2.0/23']).map(String),
  ];
  assert.deepEqual(jsMerge, py.cidr_merge);

  const jsRangeCidrs = [
    iprange_to_cidrs('192.0.2.5', '192.0.2.10').map(String),
    iprange_to_cidrs('2001:db8::1', '2001:db8::5').map(String),
  ];
  assert.deepEqual(jsRangeCidrs, py.range_to_cidrs);

  const jsIter = Array.from(iter_iprange('192.0.2.1', '192.0.2.3')).map(String);
  assert.deepEqual(jsIter, py.iter_iprange);

  assert.equal(ipv6_to_base85('2001:db8::dead:beef'), py.ipv6_base85);

  const jsExpanded = [
    expand_partial_ipv4_address('10'),
    expand_partial_ipv4_address('10.1'),
    expand_partial_ipv4_address('10.1.2'),
    expand_partial_ipv4_address('10.1.2.3'),
    expand_partial_ipv4_address('01.2'),
  ];
  assert.deepEqual(jsExpanded, py.expand_partial_ipv4);

  const jsIpv6Formats = {
    compact: new IPAddress('::ffff:192.0.2.1').format(ipv6_compact),
    full: new IPAddress('::ffff:192.0.2.1').format(ipv6_full),
    verbose: new IPAddress('::ffff:192.0.2.1').format(ipv6_verbose),
  };
  assert.deepEqual(jsIpv6Formats, py.ipv6_formats);
});
