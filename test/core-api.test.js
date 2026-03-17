import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AddrFormatError,
  IP,
  CIDR,
  MAC,
  IPAddress,
  IPGlob,
  IPNetwork,
  IPRange,
  IPSet,
  SubnetSplitter,
  cidr_to_glob,
  cidr_merge,
  expand_partial_ipv4_address,
  glob_to_cidrs,
  glob_to_iprange,
  glob_to_iptuple,
  iprange_to_cidrs,
  iprange_to_globs,
  ipv6_compact,
  ipv6_full,
  ipv6_verbose,
  iter_nmap_range,
  spanning_cidr,
  valid_glob,
  EUI,
  IAB,
  OUI,
  base85_to_ipv6,
  ipv6_to_base85,
  mac_cisco,
  mac_unix,
  valid_eui64,
  valid_mac,
  clear_ieee_registries,
  lookup_iab,
  lookup_oui,
  register_iab,
  register_oui,
  INET_ATON,
  INET_PTON,
  ZEROFILL,
  valid_nmap_range,
  smallest_matching_cidr,
  largest_matching_cidr,
  all_matching_cidrs,
} from '../src/index.js';

test('IPv6 precision is preserved with BigInt', () => {
  const ip = new IPAddress('ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff');
  assert.equal(ip.version, 6);
  assert.equal(ip.toBigInt(), (1n << 128n) - 1n);
});

test('IPAddress formatting and reverse DNS', () => {
  const ip4 = new IPAddress('192.0.2.1');
  assert.equal(ip4.toString(), '192.0.2.1');
  assert.equal(ip4.reverseDns, '1.2.0.192.in-addr.arpa');

  const ip6 = new IPAddress('2001:db8::1');
  assert.equal(ip6.toString(), '2001:db8::1');
  assert.ok(ip6.reverseDns.endsWith('.ip6.arpa'));
});

test('IPv6 dialect formatting compatibility', () => {
  const ip = new IPAddress('2001:db8::1');
  assert.equal(ip.format(ipv6_compact), '2001:db8::1');
  assert.equal(ip.format(ipv6_full), '2001:db8:0:0:0:0:0:1');
  assert.equal(ip.format(ipv6_verbose), '2001:0db8:0000:0000:0000:0000:0000:0001');

  const mapped = new IPAddress('::ffff:192.0.2.1');
  assert.equal(mapped.format(ipv6_compact), '::ffff:192.0.2.1');
  assert.equal(mapped.format(ipv6_full), '0:0:0:0:0:ffff:c000:201');
  assert.equal(mapped.format(ipv6_verbose), '0000:0000:0000:0000:0000:ffff:c000:0201');
});

test('expand_partial_ipv4_address mirrors python helper behavior', () => {
  assert.equal(expand_partial_ipv4_address('10'), '10.0.0.0');
  assert.equal(expand_partial_ipv4_address('10.1'), '10.1.0.0');
  assert.equal(expand_partial_ipv4_address('10.1.2'), '10.1.2.0');
  assert.equal(expand_partial_ipv4_address('10.1.2.3'), '10.1.2.3');
  assert.equal(expand_partial_ipv4_address('01.2'), '1.2.0.0');
  assert.equal(expand_partial_ipv4_address('256.1'), '256.1.0.0');
  assert.equal(expand_partial_ipv4_address('-1.2'), '-1.2.0.0');

  assert.throws(() => expand_partial_ipv4_address('0x1.2'));
  assert.throws(() => expand_partial_ipv4_address('1..2'));
  assert.throws(() => expand_partial_ipv4_address('1.2.3.4.5'));
});

test('IPNetwork properties and containment', () => {
  const net = new IPNetwork('192.0.2.5/24');
  assert.equal(net.network.toString(), '192.0.2.0');
  assert.equal(net.broadcast.toString(), '192.0.2.255');
  assert.equal(net.first, new IPAddress('192.0.2.0').toBigInt());
  assert.equal(net.last, new IPAddress('192.0.2.255').toBigInt());
  assert.equal(net.contains('192.0.2.9'), true);
  assert.equal(net.contains('192.0.3.1'), false);
});

test('iprange_to_cidrs returns exact cover', () => {
  const cidrs = iprange_to_cidrs('192.0.2.5', '192.0.2.10').map((n) => n.toString());
  assert.deepEqual(cidrs, ['192.0.2.5/32', '192.0.2.6/31', '192.0.2.8/31', '192.0.2.10/32']);
});

test('cidr_merge merges adjacent and overlapping networks', () => {
  const merged = cidr_merge(['192.0.128.0/24', '192.0.129.0/24']).map((n) => n.toString());
  assert.deepEqual(merged, ['192.0.128.0/23']);
});

test('spanning_cidr computes minimal enclosing CIDR', () => {
  const result = spanning_cidr(['10.0.0.1', '10.0.0.4']).toString();
  assert.equal(result, '10.0.0.0/29');
});

test('matching CIDR functions', () => {
  const cidrs = ['0.0.0.0/0', '192.0.0.0/8', '192.0.2.0/24'];

  assert.equal(largest_matching_cidr('192.0.2.32', cidrs)?.toString(), '0.0.0.0/0');
  assert.equal(smallest_matching_cidr('192.0.2.32', cidrs)?.toString(), '192.0.2.0/24');
  assert.deepEqual(
    all_matching_cidrs('192.0.2.32', cidrs).map((n) => n.toString()),
    ['0.0.0.0/0', '192.0.0.0/8', '192.0.2.0/24'],
  );
});

test('IPRange and IPSet behavior', () => {
  const range = new IPRange('192.0.2.1', '192.0.2.15');
  assert.equal(range.contains('192.0.2.10'), true);
  assert.equal(range.contains('192.0.2.16'), false);

  const ipset = new IPSet(['192.0.2.0/25']);
  ipset.add('192.0.2.128/25');
  assert.equal(ipset.iscontiguous(), true);
  assert.equal(ipset.iprange().toString(), '192.0.2.0-192.0.2.255');
});

test('SubnetSplitter extraction and removal behavior', () => {
  const splitter = new SubnetSplitter('10.0.0.0/24');

  assert.deepEqual(splitter.available_subnets().map(String), ['10.0.0.0/24']);
  assert.deepEqual(
    splitter.extract_subnet(26).map(String),
    ['10.0.0.0/26', '10.0.0.64/26', '10.0.0.128/26', '10.0.0.192/26'],
  );
  assert.deepEqual(splitter.available_subnets().map(String), []);
});

test('IPv4 glob helpers', () => {
  assert.equal(valid_glob('192.0-2.*.1-3'), true);
  assert.equal(valid_glob('192.300.*.1'), false);

  assert.deepEqual(glob_to_iptuple('192.0-1.2.*'), ['192.0.2.0', '192.1.2.255']);
  assert.equal(glob_to_iprange('192.0.2.*').toString(), '192.0.2.0-192.0.2.255');

  const globs = iprange_to_globs('192.0.2.0', '192.0.2.255');
  assert.deepEqual(globs, ['192.0.2.*']);

  assert.equal(cidr_to_glob('192.0.2.0/24'), '192.0.2.*');
  assert.deepEqual(glob_to_cidrs('192.0.2.*').map((c) => c.toString()), ['192.0.2.0/24']);

  const ipglob = new IPGlob('10.1-2.3.*');
  assert.equal(ipglob.toString(), '10.1-2.3.*');
});

test('nmap range helpers', () => {
  assert.equal(valid_nmap_range('192.168.1-2.1,2,5-6'), true);
  assert.equal(valid_nmap_range('192.168.999.1'), false);

  const ips = Array.from(iter_nmap_range('192.168.1.1-3')).map((ip) => ip.toString());
  assert.deepEqual(ips, ['192.168.1.1', '192.168.1.2', '192.168.1.3']);

  const mixed = Array.from(iter_nmap_range('10.0.0-1.1,3')).map((ip) => ip.toString());
  assert.deepEqual(mixed, ['10.0.0.1', '10.0.0.3', '10.0.1.1', '10.0.1.3']);
});

test('EUI parsing and formatting dialects', () => {
  const eui = new EUI('00-1b-77-49-54-fd');
  assert.equal(eui.version, 48);
  assert.equal(eui.toString(), '00-1b-77-49-54-fd');
  assert.equal(eui.format(mac_unix), '00:1b:77:49:54:fd');
  assert.equal(eui.format(mac_cisco), '001b.7749.54fd');
  assert.equal(valid_mac('00:1b:77:49:54:fd'), true);
  assert.equal(valid_eui64('00:1b:77:ff:fe:49:54:fd'), true);
});

test('EUI to EUI-64 and IPv6 derivation', () => {
  const eui = new EUI('00-1b-77-49-54-fd');
  const eui64 = eui.eui64();
  assert.equal(eui64.toString(), '00-1b-77-ff-fe-49-54-fd');

  const modified = eui.modified_eui64();
  assert.equal(modified.toString(), '02-1b-77-ff-fe-49-54-fd');

  const linkLocal = eui.ipv6_link_local();
  assert.equal(linkLocal.toString(), 'fe80::21b:77ff:fe49:54fd');
});

test('OUI and IAB basic shape', () => {
  const oui = new OUI('00-1b-77-49-54-fd');
  assert.equal(oui.toString(), '00-1b-77');

  const iab = new IAB('001b7744954fd');
  assert.equal(iab.toString(), '001b77449');
});

test('RFC1924 base85 round trip', () => {
  const ip = '2001:db8::dead:beef';
  const b85 = ipv6_to_base85(ip);
  assert.equal(b85.length, 20);

  const decoded = base85_to_ipv6(b85);
  assert.equal(decoded.toString(), '2001:db8::dead:beef');
});

test('IANA info and global reachability', () => {
  const privateIp = new IPAddress('10.10.10.10');
  assert.equal(privateIp.is_global(), false);
  assert.ok(Array.isArray(privateIp.info.IPv4));

  const publicIp = new IPAddress('8.8.8.8');
  assert.equal(publicIp.is_global(), true);
  assert.deepEqual(publicIp.info, {});

  const exceptionIp = new IPAddress('192.0.0.9');
  assert.equal(exceptionIp.is_global(), true);
});

test('IEEE registry registration and lookup', () => {
  clear_ieee_registries();

  register_oui('00-1b-77', {
    org: 'Example Networks',
    country: 'US',
    source: 'test',
  });
  register_iab('001b77449', {
    org: 'Example Networks IAB',
    country: 'US',
    source: 'test',
  });

  assert.equal(lookup_oui('001b77')?.org, 'Example Networks');
  assert.equal(lookup_iab('001b77449')?.org, 'Example Networks IAB');

  const eui = new EUI('00-1b-77-44-95-fd');
  assert.equal(eui.info.org, 'Example Networks IAB');
});

test('Python-like compatibility aliases and helpers', () => {
  const ip = new IP('192.0.2.1');
  assert.equal(ip.reverse_dns, '1.2.0.192.in-addr.arpa');
  assert.equal(ip.packed.length, 4);
  assert.equal(ip.ipv6().toString(), '::ffff:c000:201');

  const mapped = new IPAddress('::ffff:192.0.2.1');
  assert.equal(mapped.ipv4().toString(), '192.0.2.1');

  const net = new CIDR('192.0.2.1/24');
  assert.equal(net.iter_hosts().next().value.toString(), '192.0.2.1');
  assert.equal(net.ipv6().toString(), '::ffff:c000:200/120');

  const mac = new MAC('00-1b-77-49-54-fd');
  assert.equal(mac.toString(), '00-1b-77-49-54-fd');
});

test('INET_ATON style IPv4 parsing compatibility', () => {
  assert.equal(new IPAddress('1', null, INET_ATON).toString(), '0.0.0.1');
  assert.equal(new IPAddress('127.1', null, INET_ATON).toString(), '127.0.0.1');
  assert.equal(new IPAddress('10.1.2', null, INET_ATON).toString(), '10.1.0.2');
  assert.equal(new IPAddress('0x7f.1', null, INET_ATON).toString(), '127.0.0.1');
  assert.equal(new IPAddress('0177.1', null, INET_ATON).toString(), '127.0.0.1');
});

test('ZEROFILL and parser flag compatibility', () => {
  assert.throws(() => new IPAddress('127.0.0.01'), AddrFormatError);
  assert.equal(new IPAddress('127.0.0.01', null, ZEROFILL).toString(), '127.0.0.1');

  assert.equal(new IPAddress('010.010.010.010', null, INET_ATON).toString(), '8.8.8.8');
  assert.equal(
    new IPAddress('010.010.010.010', null, INET_ATON | ZEROFILL).toString(),
    '10.10.10.10',
  );

  assert.throws(() => new IPAddress('1.2.3', null, ZEROFILL), AddrFormatError);
  assert.throws(() => new IPAddress('1.2.3', null, INET_PTON | INET_ATON), AddrFormatError);
});
