import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AddrFormatError,
  INET_ATON,
  INET_PTON,
  ZEROFILL,
  NOHOST,
  IPAddress,
  IPNetwork,
  IPRange,
  IPSet,
  IPGlob,
  ipv6_compact,
  ipv6_full,
  ipv6_verbose,
  largest_matching_cidr,
  smallest_matching_cidr,
  all_matching_cidrs,
  spanning_cidr,
  iprange_to_cidrs,
  cidr_merge,
  cidr_abbrev_to_verbose,
  expand_partial_ipv4_address,
  iter_iprange,
  SubnetSplitter,
  valid_glob,
  glob_to_iptuple,
  valid_nmap_range,
  iter_nmap_range,
  EUI,
  OUI,
  IAB,
  mac_eui48,
  register_oui,
  lookup_oui,
} from '../src/index.js';

import {
  bitLength,
  formatIP,
  formatIPv6,
  hostmaskToPrefix,
  maxForVersion,
  netmaskToPrefix,
  parseIP,
  parseIPv4,
  parseIPv6,
  prefixToNetmask,
  toBigInt,
  trailingZeroBits,
  widthForVersion,
} from '../src/addr.js';
import { is_globally_reachable, query_iana } from '../src/iana.js';
import { IANA_IPV4 } from '../src/data/iana.js';
import { IANA_IPV6 } from '../src/data/iana.js';

test('addr.js helper and parser edge branches are exercised', () => {
  assert.equal(widthForVersion(4), 32);
  assert.equal(widthForVersion(6), 128);
  assert.equal(maxForVersion(4), 0xffffffffn);

  assert.throws(() => widthForVersion(5), AddrFormatError);
  assert.equal(toBigInt(10), 10n);
  assert.equal(toBigInt(10n), 10n);
  assert.throws(() => toBigInt(1.2), AddrFormatError);
  assert.throws(() => toBigInt('1'), AddrFormatError);

  assert.equal(bitLength(0n), 0);
  assert.equal(bitLength(8n), 4);
  assert.throws(() => bitLength(-1n), AddrFormatError);

  assert.equal(trailingZeroBits(0n, 32), 32);
  assert.equal(trailingZeroBits(8n, 32), 3);

  assert.equal(prefixToNetmask(0, 32), 0n);
  assert.equal(prefixToNetmask(24, 32), 0xffffff00n);
  assert.throws(() => prefixToNetmask(33, 32), AddrFormatError);

  assert.equal(netmaskToPrefix(0xffffff00n, 32), 24);
  assert.throws(() => netmaskToPrefix(-1n, 32), AddrFormatError);
  assert.throws(() => netmaskToPrefix(0xff00ff00n, 32), AddrFormatError);

  assert.equal(hostmaskToPrefix(0x000000ffn, 32), 24);
  assert.throws(() => hostmaskToPrefix(-1n, 32), AddrFormatError);
  assert.throws(() => hostmaskToPrefix(0x00ff00ffn, 32), AddrFormatError);

  assert.equal(parseIPv4('1', INET_ATON), 1n);
  assert.equal(parseIPv4('1.2', INET_ATON), (1n << 24n) | 2n);
  assert.equal(parseIPv4('1.2.3', INET_ATON), (1n << 24n) | (2n << 16n) | 3n);
  assert.equal(parseIPv4('1.2.3.4', INET_ATON), (1n << 24n) | (2n << 16n) | (3n << 8n) | 4n);

  assert.throws(() => parseIPv4('', INET_ATON), AddrFormatError);
  assert.throws(() => parseIPv4('0xgg', INET_ATON), AddrFormatError);
  assert.throws(() => parseIPv4('0x100000000', INET_ATON), AddrFormatError);
  assert.throws(() => parseIPv4('1.-1', INET_ATON), AddrFormatError);
  assert.throws(() => parseIPv4('1.16777216', INET_ATON), AddrFormatError);
  assert.throws(() => parseIPv4('1.2.65536', INET_ATON), AddrFormatError);
  assert.throws(() => parseIPv4('1.2.3.256', INET_ATON), AddrFormatError);
  assert.throws(() => parseIPv4('1.2.3.4.5', INET_ATON), AddrFormatError);

  assert.throws(() => parseIPv4('0x1', INET_ATON | ZEROFILL), AddrFormatError);
  assert.throws(() => parseIPv4('4294967296', INET_ATON | ZEROFILL), AddrFormatError);
  assert.throws(() => parseIPv4('1.2.3', 0), AddrFormatError);
  assert.throws(() => parseIPv4('1.a.3.4', 0), AddrFormatError);
  assert.throws(() => parseIPv4('01.2.3.4', 0), AddrFormatError);
  assert.throws(() => parseIPv4('256.1.1.1', 0), AddrFormatError);
  assert.throws(() => parseIPv4('1.2.3.4', INET_ATON | INET_PTON), AddrFormatError);

  assert.equal(parseIPv6('::1%eth0'), 1n);
  assert.throws(() => parseIPv6(''), AddrFormatError);
  assert.throws(() => parseIPv6('1::2::3'), AddrFormatError);
  assert.throws(() => parseIPv6('1::2:3:4:5:6:7:8'), AddrFormatError);
  assert.throws(() => parseIPv6('1:2:3:4:5:6:7'), AddrFormatError);
  assert.throws(() => parseIPv6('::1.2.3'), AddrFormatError);
  assert.throws(() => parseIPv6('1.2.3.4'), AddrFormatError);
  assert.equal(
    parseIPv6('2001:db8:0:0:0:0:1.2.3.4'),
    parseIPv6('2001:db8::102:304'),
  );

  assert.equal(formatIPv6(parseIPv6('2001::')), '2001::');
  assert.equal(formatIPv6(parseIPv6('::1')), '::1');

  assert.equal(parseIP('1.2.3.4', 4), parseIPv4('1.2.3.4'));
  assert.equal(parseIP('2001:db8::1', 6), parseIPv6('2001:db8::1'));
  assert.deepEqual(parseIP('2001:db8::1', null), { value: parseIPv6('2001:db8::1'), version: 6 });
  assert.deepEqual(parseIP('203.0.113.5', null), { value: parseIPv4('203.0.113.5'), version: 4 });

  assert.equal(formatIP(parseIPv4('203.0.113.5'), 4), '203.0.113.5');
  assert.equal(formatIP(parseIPv6('2001:db8::1'), 6), '2001:db8::1');
});

test('iana.js IPv4/IPv6 and global reachability branches are exercised', () => {
  const v6Info = query_iana(new IPAddress('::1'));
  assert.ok(v6Info.IPv6?.length > 0);

  assert.equal(is_globally_reachable(new IPAddress('::1')), false);

  const originalV4Length = IANA_IPV4.length;
  const originalV6Length = IANA_IPV6.length;
  IANA_IPV4.push({
    cidr: '224.0.0.0/24',
    title: 'Temporary IPv4 Multicast Coverage Record',
    rfc: '[TEST]',
    category: 'Multicast',
    globallyReachable: true,
  });
  IANA_IPV6.push({
    cidr: 'ff12::/16',
    title: 'Temporary Multicast Coverage Record',
    rfc: '[TEST]',
    category: 'Multicast',
    globallyReachable: false,
  });
  IANA_IPV6.push({
    cidr: '3000:ffff::/32',
    title: 'Temporary Reachability Fallback Record',
    rfc: '[TEST]',
    globallyReachable: undefined,
  });

  try {
    const injectedV4Multicast = query_iana(new IPAddress('224.0.0.1'));
    assert.ok(injectedV4Multicast.Multicast?.length > 0);

    const injectedV6Multicast = query_iana(new IPAddress('ff12::1'));
    assert.ok(injectedV6Multicast.Multicast?.length > 0);

    assert.equal(is_globally_reachable(new IPAddress('3000:ffff::1')), true);
  } finally {
    IANA_IPV4.splice(originalV4Length);
    IANA_IPV6.splice(originalV6Length);
  }
});

test('glob/nmap and ipset edge branches are exercised', () => {
  assert.equal(valid_glob('1-2-3.0.0.0'), false);
  assert.throws(() => glob_to_iptuple('1-2-3.0.0.0'), AddrFormatError);
  assert.equal(valid_glob('1.2.3'), false);

  assert.equal(valid_nmap_range('1-2-3.0.0.0'), false);
  assert.equal(valid_nmap_range('1.2.3'), false);
  assert.equal(valid_nmap_range('5-1.0.0.1'), false);
  assert.throws(() => Array.from(iter_nmap_range('1,,2.0.0.1')), AddrFormatError);
  assert.deepEqual(Array.from(iter_nmap_range('*.1.1.1')).slice(0, 2).map(String), ['0.1.1.1', '1.1.1.1']);

  const set = new IPSet();
  assert.deepEqual(set.iter_ipranges(), []);

  set.add(new IPNetwork('10.0.0.0/24'));
  set.add(new IPRange('10.0.1.0', '10.0.1.3'));
  set.update([new IPAddress('10.0.2.1')]);
  set.compact();
  set.remove('192.0.2.0/24');

  assert.equal(set.size > 0n, true);
  assert.equal(set.contains(new IPAddress('10.0.2.1')), true);
  assert.equal(set.contains('10.0.0.1'), true);
  assert.ok(set.toString().startsWith('IPSet(['));

  const adjacency = new IPSet([new IPRange('10.10.10.0', '10.10.10.2')]);
  assert.equal(adjacency.iter_ipranges()[0].toString(), '10.10.10.0-10.10.10.2');

  const aWide = new IPSet(['10.20.0.0/24']);
  const bNarrow = new IPSet(['10.20.0.64/26']);
  assert.deepEqual(aWide.intersection(bNarrow).iter_cidrs().map(String), ['10.20.0.64/26']);
  assert.deepEqual(bNarrow.intersection(aWide).iter_cidrs().map(String), ['10.20.0.64/26']);
});

test('ip.js helper and class branch closeout coverage', () => {
  assert.equal(new ipv6_compact() instanceof ipv6_compact, true);
  assert.equal(new ipv6_full() instanceof ipv6_full, true);
  assert.equal(new ipv6_verbose() instanceof ipv6_verbose, true);

  const ipv6Auto = new IPAddress(1n << 40n);
  assert.equal(ipv6Auto.version, 6);
  assert.equal(Number(new IPAddress(42)), 42);

  assert.equal(new IPAddress('::1').format(ipv6_compact), '::0.0.0.1');
  assert.equal(new IPAddress('2001:db8::').format(ipv6_compact), '2001:db8::');
  assert.equal(new IPAddress('::1:2').format(ipv6_compact), '::0.1.0.2');
  assert.equal(new IPAddress('::').format(ipv6_compact), '::0.0.0.0');
  assert.equal(new IPAddress('::abcd:0:1:2:3').format(ipv6_compact), '::abcd:0:1:2:3');
  assert.equal(new IPAddress('1.2.3.4').format(ipv6_compact), '1.2.3.4');
  assert.equal(new IPAddress('2001:db8::1').format({ word_fmt: '%.4x', compact: false }), '2001:0db8:0000:0000:0000:0000:0000:0001');
  assert.equal(new IPAddress('2001:db8::1').format({ word_fmt: undefined, compact: undefined }), '2001:db8::1');
  assert.equal(new IPAddress('1.2.3.4').bits().includes('.'), true);
  assert.equal(new IPAddress('2001:db8::1').bits().includes(':'), true);
  assert.throws(() => new IPAddress('1.2.3.4', 6), AddrFormatError);
  assert.throws(() => new IPAddress(new IPAddress('1.2.3.4'), 6), AddrFormatError);

  const cmpBase = new IPAddress('192.0.2.2');
  assert.equal(cmpBase.compare('192.0.2.1'), 1);
  assert.equal(cmpBase.compare('192.0.2.2'), 0);
  assert.deepEqual(new IPAddress('2001:db8::1').words, [0x2001, 0x0db8, 0, 0, 0, 0, 0, 1]);
  assert.equal(new IPAddress('255.0.255.0').isHostmask(), false);
  assert.equal(new IPAddress('1.2.3.4').ipv4().toString(), '1.2.3.4');
  assert.equal(new IPAddress('::ffff:1.2.3.4').ipv4().toString(), '1.2.3.4');
  assert.equal(new IPAddress('2001:db8::1').ipv6().toString(), '2001:db8::1');

  const net = new IPNetwork('192.0.2.5/24');
  assert.equal(net.netmask.toString(), '255.255.255.0');
  assert.equal(net.format(), net.toString());
  assert.equal(net.toJSON(), net.toString());
  assert.equal(net.compare('192.0.3.0/24') < 0, true);
  assert.equal(net.contains(new IPAddress('::1')), false);
  assert.equal(net.overlaps('2001:db8::/64'), false);
  assert.throws(() => new IPNetwork('192.0.2.0/24').subnet('25'), AddrFormatError);

  const ipBased = new IPNetwork(new IPAddress('192.0.2.1'));
  assert.throws(() => new IPNetwork(ipBased, 6), AddrFormatError);
  assert.throws(() => new IPNetwork(new IPAddress('192.0.2.1'), 6), AddrFormatError);
  assert.equal(new IPNetwork('192.0.2.123/24', null, NOHOST).toString(), '192.0.2.0/24');

  const v4Net = new IPNetwork('192.0.2.0/24');
  const v6Net = new IPNetwork('2001:db8::/64');
  assert.equal(v4Net.ipv4().toString(), '192.0.2.0/24');
  assert.equal(v6Net.ipv6().toString(), '2001:db8::/64');
  assert.deepEqual(Array.from(new IPNetwork('192.0.2.1/32')).map(String), ['192.0.2.1']);
  assert.equal(new IPNetwork('0.0.0.0/0').compare('::/0') < 0, true);
  assert.equal(new IPNetwork('192.0.2.0/24').compare('192.0.2.0/25') > 0, true);
  assert.equal(new IPNetwork('192.0.2.0/25').compare('192.0.2.0/24') < 0, true);

  const range = new IPRange('192.0.2.10', '192.0.2.12');
  assert.equal(range.contains(new IPAddress('192.0.2.11')), true);
  assert.equal(range.contains(new IPRange('192.0.2.10', '192.0.2.12')), true);
  assert.equal(range.contains('192.0.2.0/24'), false);
  assert.throws(() => Array.from(iter_nmap_range('1.2.3')), AddrFormatError);

  assert.equal(spanning_cidr(['192.0.2.128/25', '192.0.2.0/25']).toString(), '192.0.2.0/24');
  assert.deepEqual(
    cidr_merge([
      new IPRange('192.0.2.0', '192.0.2.3'),
      '192.0.2.4/30',
      '192.0.2.0/31',
      '192.0.2.0/30',
      '192.0.3.0/24',
      '::/128',
    ]).map(String),
    ['192.0.2.0/29', '192.0.3.0/24', '::/128'],
  );

  const sameStart = ['10.0.0.0/30', '10.0.0.0/31', '10.0.0.0/32'];
  const permutations = [
    sameStart,
    [sameStart[0], sameStart[2], sameStart[1]],
    [sameStart[1], sameStart[0], sameStart[2]],
    [sameStart[1], sameStart[2], sameStart[0]],
    [sameStart[2], sameStart[0], sameStart[1]],
    [sameStart[2], sameStart[1], sameStart[0]],
  ];
  for (const permutation of permutations) {
    assert.deepEqual(cidr_merge(permutation).map(String), ['10.0.0.0/30']);
  }
  assert.throws(
    () => Array.from(iter_iprange(new IPAddress('192.0.2.1'), new IPAddress('::1'))),
    AddrFormatError,
  );

  const mixed = ['::/0', '0.0.0.0/0', '192.0.2.0/24'];
  assert.equal(largest_matching_cidr('192.0.2.1', mixed)?.toString(), '0.0.0.0/0');
  assert.equal(smallest_matching_cidr('192.0.2.1', mixed)?.toString(), '192.0.2.0/24');
  assert.deepEqual(all_matching_cidrs('192.0.2.1', mixed).map(String), ['0.0.0.0/0', '192.0.2.0/24']);

  const samePrefixDifferentRange = ['192.0.3.0/24', '192.0.2.0/24'];
  assert.equal(largest_matching_cidr('192.0.2.99', samePrefixDifferentRange)?.toString(), '192.0.2.0/24');
  assert.equal(smallest_matching_cidr('192.0.2.99', samePrefixDifferentRange)?.toString(), '192.0.2.0/24');
  assert.deepEqual(all_matching_cidrs('192.0.2.99', samePrefixDifferentRange).map(String), ['192.0.2.0/24']);

  assert.equal(cidr_abbrev_to_verbose('192.0.2.1.5.6'), '192.0.2.1.5.6');
  assert.equal(cidr_abbrev_to_verbose('192.0'), '192.0.0.0/24');
  assert.throws(() => expand_partial_ipv4_address('1:2:3:4'), AddrFormatError);
  assert.throws(() => expand_partial_ipv4_address({ bad: true }), AddrFormatError);

  const splitter = new SubnetSplitter('10.0.0.0/24');
  splitter.extract_subnet(26, 1);
  assert.equal(splitter.available_subnets().length > 0, true);
  splitter._subnets = [new IPNetwork('10.0.1.0/24'), new IPNetwork('10.0.0.0/24')];
  assert.deepEqual(splitter.available_subnets().map(String), ['10.0.0.0/24', '10.0.1.0/24']);
  assert.deepEqual(splitter.extract_subnet(23), []);
  assert.throws(() => splitter.remove_subnet('10.0.2.0/24'));
});

test('eui dotted forms and registration edge branches are exercised', () => {
  const dotted48 = new EUI('001b.7749.54fd');
  const dotted64 = new EUI('001b.77ff.fe49.54fd');
  const plainHex = new EUI('001b774954fd');
  assert.equal(dotted48.version, 48);
  assert.equal(dotted64.version, 64);
  assert.equal(plainHex.version, 48);

  const asUnknownDialect = new EUI('00-1b-77-49-54-fd', { name: 'unknown' });
  assert.equal(asUnknownDialect.toString(), '00-1b-77-49-54-fd');

  assert.equal(new OUI('00-1b-77').toBigInt() > 0n, true);
  assert.equal(new IAB('001b77449').toBigInt() > 0n, true);

  assert.throws(() => new EUI('', mac_eui48), AddrFormatError);
  assert.throws(() => new OUI('aa'), AddrFormatError);
  assert.throws(() => new IAB('aa'), AddrFormatError);

  const mac = new EUI('00-1b-77-49-54-fd');
  assert.throws(() => mac.getWord(-1), AddrFormatError);
  assert.throws(() => mac.setWord(-1, 0), AddrFormatError);
  assert.equal(mac.info != null, true);
  assert.equal(mac.format(mac_eui48), '00-1b-77-49-54-fd');
  assert.equal(new EUI('00-1b-77-ff-fe-49-54-fd').is_iab(), false);

  assert.throws(() => register_oui('00-11-23', {}), AddrFormatError);
  register_oui('00-11-22', { org: 'With Address', address: '123 Test St' });
  assert.equal(lookup_oui('001122')?.address, '123 Test St');

  const glob = new IPGlob('203.0.113.*');
  assert.equal(glob.toString(), '203.0.113.*');
});
