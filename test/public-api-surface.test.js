import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AddrFormatError,
  AddrConversionError,
  NotRegisteredError,
  IPAddress,
  IPNetwork,
  IPRange,
  iter_iprange,
  iter_unique_ips,
  cidr_exclude,
  cidr_abbrev_to_verbose,
  valid_ipv4,
  valid_ipv6,
  NOHOST,
  ipv6_verbose,
  all_matching_cidrs,
  smallest_matching_cidr,
  largest_matching_cidr,
  spanning_cidr,
  EUI,
  OUI,
  IAB,
  valid_mac,
  valid_eui64,
  mac_bare,
  mac_pgsql,
  eui64_base,
  eui64_bare,
  eui64_cisco,
  eui64_unix,
  eui64_unix_expanded,
  clear_ieee_registries,
  register_iab,
  register_oui,
  IPGlob,
  valid_glob,
  valid_nmap_range,
  iter_nmap_range,
} from '../src/index.js';

test('IPAddress methods cover numeric conversion, classification, and formatting paths', () => {
  const ip4 = new IPAddress(3232235777);
  assert.equal(ip4.version, 4);
  assert.equal(ip4.toString(), '192.168.1.1');
  assert.equal(ip4.toJSON(), '192.168.1.1');
  assert.equal(`${ip4}`, '192.168.1.1');
  assert.equal(ip4.equals('192.168.1.1'), true);
  assert.equal(ip4.compare('192.168.1.2'), -1);
  assert.equal(ip4.add(2).toString(), '192.168.1.3');
  assert.equal(ip4.sub(1).toString(), '192.168.1.0');
  assert.equal(ip4.is_private(), true);
  assert.equal(ip4.is_ipv4_private_use(), true);
  assert.equal(ip4.is_loopback(), false);
  assert.equal(ip4.is_multicast(), false);
  assert.equal(ip4.bits().split('.').length, 4);
  assert.equal(ip4.bin.startsWith('0b'), true);
  assert.equal(ip4.packed.length, 4);

  const loopback4 = new IPAddress('127.0.0.1');
  assert.equal(loopback4.is_loopback(), true);

  const multicast4 = new IPAddress('239.1.2.3');
  assert.equal(multicast4.is_multicast(), true);

  const hostmask4 = new IPAddress('0.0.0.255');
  assert.equal(hostmask4.isHostmask(), true);
  assert.equal(hostmask4.isNetmask(), false);

  const netmask4 = new IPAddress('255.255.255.0');
  assert.equal(netmask4.netmaskBits(), 24);
  assert.equal(netmask4.isNetmask(), true);

  const ip6 = new IPAddress('::1');
  assert.equal(ip6.is_loopback(), true);
  assert.equal(ip6.is_private(), false);
  assert.equal(ip6.is_ipv6_unique_local(), false);
  assert.equal(ip6.packed.length, 16);
  assert.equal(ip6.format(ipv6_verbose), '0000:0000:0000:0000:0000:0000:0000:0001');

  const ula6 = new IPAddress('fc00::1');
  assert.equal(ula6.is_private(), true);
  assert.equal(ula6.is_ipv6_unique_local(), true);

  const multicast6 = new IPAddress('ff02::1');
  assert.equal(multicast6.is_multicast(), true);

  const low6 = new IPAddress(0x01020304n, 6);
  assert.equal(low6.ipv4().toString(), '1.2.3.4');

  assert.equal(new IPAddress('203.0.113.9').ipv6(true).toString(), '::cb00:7109');
  assert.equal(new IPAddress('203.0.113.9').ipv6(false).toString(), '::ffff:cb00:7109');

  assert.throws(() => new IPAddress('2001:db8::1').format({}), TypeError);
  assert.throws(() => Number(new IPAddress('ffff::1')), AddrConversionError);
  assert.throws(() => new IPAddress(-1, 4), AddrFormatError);
  assert.throws(() => new IPAddress((1n << 130n), null), AddrFormatError);
});

test('IPNetwork and IPRange user operations cover tuple, masks, traversal, and boundaries', () => {
  const hosty = new IPNetwork('192.0.2.123/24');
  assert.equal(hosty.toString(), '192.0.2.123/24');
  assert.equal(hosty.cidr.toString(), '192.0.2.0/24');

  const normalized = new IPNetwork(hosty, null, NOHOST);
  assert.equal(normalized.toString(), '192.0.2.0/24');

  const byHostmask = new IPNetwork('192.0.2.0/0.0.0.255');
  assert.equal(byHostmask.prefixlen, 24);

  const byTuple = new IPNetwork([new IPAddress('10.0.0.0').toBigInt(), 24], 4);
  assert.equal(byTuple.toString(), '10.0.0.0/24');

  const arrayLikeTuple = { 0: new IPAddress('10.1.0.0').toBigInt(), 1: 16 };
  assert.throws(() => new IPNetwork(arrayLikeTuple, 4), TypeError);

  const net31 = new IPNetwork('198.51.100.0/31');
  assert.equal(net31.broadcast, null);

  const net24 = new IPNetwork('198.51.100.0/24');
  net24.netmask = '255.255.0.0';
  assert.equal(net24.prefixlen, 16);
  assert.equal(net24.hostmask.toString(), '0.0.255.255');
  assert.equal(net24.compare('198.51.100.0/16'), 0);
  assert.equal(net24.contains('198.51.100.1'), true);
  assert.equal(net24.contains(new IPRange('198.51.100.1', '198.51.100.10')), true);
  assert.equal(net24.overlaps('198.51.0.0/16'), true);

  const next = net31.next();
  assert.equal(next.toString(), '198.51.100.2/31');
  assert.equal(next.previous().toString(), '198.51.100.0/31');

  assert.equal(net24.supernet(8).toString(), '198.0.0.0/8');
  assert.deepEqual(
    net31.subnet(32).map(String),
    ['198.51.100.0/32', '198.51.100.1/32'],
  );
  assert.equal(net31.subnet(30).length, 0);

  assert.deepEqual(Array.from(new IPNetwork('198.51.100.0/30').iterHosts()).map(String), [
    '198.51.100.1',
    '198.51.100.2',
  ]);
  assert.deepEqual(Array.from(new IPNetwork('198.51.100.0/31').iter_hosts()).map(String), [
    '198.51.100.0',
    '198.51.100.1',
  ]);

  assert.equal(new IPNetwork('::ffff:198.51.100.0/120').ipv4().toString(), '198.51.100.0/24');
  assert.equal(new IPNetwork('198.51.100.0/24').ipv6().toString(), '::ffff:c633:6400/120');
  assert.equal(new IPNetwork('198.51.100.0/24').ipv6(true).toString(), '::/24');

  const range = new IPRange('198.51.100.10', '198.51.100.14');
  assert.equal(range.size, 5n);
  assert.equal(range.contains('198.51.100.12/32'), true);
  assert.deepEqual(range.cidrs().map(String), ['198.51.100.10/31', '198.51.100.12/31', '198.51.100.14/32']);
  assert.deepEqual(Array.from(range).map(String), [
    '198.51.100.10',
    '198.51.100.11',
    '198.51.100.12',
    '198.51.100.13',
    '198.51.100.14',
  ]);

  assert.deepEqual(Array.from(iter_iprange('198.51.100.5', '198.51.100.1', -2)).map(String), [
    '198.51.100.5',
    '198.51.100.3',
    '198.51.100.1',
  ]);

  assert.throws(() => new IPNetwork('192.0.2.1/24', null, NOHOST | 8), AddrFormatError);
  assert.throws(() => new IPNetwork([0n, 24]), AddrFormatError);
  assert.throws(() => new IPNetwork('198.51.100.0/24').supernet(25), AddrFormatError);
  assert.throws(() => new IPNetwork('198.51.100.0/24').supernet('16'), AddrFormatError);
  assert.throws(() => new IPNetwork('255.255.255.0/24').add(1n << 32n), AddrFormatError);
  assert.throws(() => Array.from(iter_iprange('192.0.2.1', '2001:db8::1')), AddrFormatError);
});

test('top-level CIDR and validator helpers cover non-happy paths and ordering behavior', () => {
  const excluded = cidr_exclude('192.0.2.0/24', '192.0.2.128/25').map(String);
  assert.deepEqual(excluded, ['192.0.2.0/25']);

  assert.deepEqual(cidr_exclude('192.0.2.0/24', '2001:db8::/64').map(String), ['192.0.2.0/24']);
  assert.deepEqual(cidr_exclude('192.0.2.0/24', '198.51.100.0/24').map(String), ['192.0.2.0/24']);
  assert.deepEqual(cidr_exclude('192.0.2.0/24', '192.0.2.0/23').map(String), []);

  assert.equal(cidr_abbrev_to_verbose('10/8'), '10.0.0.0/8');
  assert.equal(cidr_abbrev_to_verbose('10.1'), '10.1.0.0/8');
  assert.equal(cidr_abbrev_to_verbose('172.16'), '172.16.0.0/16');
  assert.equal(cidr_abbrev_to_verbose('224.1'), '224.1.0.0/4');
  assert.equal(cidr_abbrev_to_verbose('240.1'), '240.1.0.0/32');
  assert.equal(cidr_abbrev_to_verbose('2001:db8::/64'), '2001:db8::/64');
  assert.equal(cidr_abbrev_to_verbose('999.1.1.1/24'), '999.1.1.1/24');
  assert.equal(cidr_abbrev_to_verbose('10.1/99'), '10.1/99');

  const unique = Array.from(iter_unique_ips(['192.0.2.0/25', '192.0.2.128/25'])).map(String);
  assert.deepEqual(unique, ['192.0.2.0/24']);

  const cidrs = ['10.0.0.0/8', '10.1.0.0/16'];
  assert.equal(largest_matching_cidr('203.0.113.1', cidrs), null);
  assert.equal(smallest_matching_cidr('203.0.113.1', cidrs), null);
  assert.deepEqual(all_matching_cidrs('203.0.113.1', cidrs), []);

  assert.throws(() => spanning_cidr(['192.0.2.1']), AddrFormatError);
  assert.throws(() => spanning_cidr(['192.0.2.1', '2001:db8::1']), AddrFormatError);

  assert.equal(valid_ipv4('198.51.100.12'), true);
  assert.equal(valid_ipv4('198.51.100.999'), false);
  assert.equal(valid_ipv6('2001:db8::1'), true);
  assert.equal(valid_ipv6('2001:::1'), false);

  assert.equal(valid_glob('10-1.0.0.1'), false);
  assert.equal(valid_nmap_range('10.0.0.1,,2'), false);
  assert.deepEqual(Array.from(iter_nmap_range('10.0.0.1')).map(String), ['10.0.0.1']);
});

test('EUI/OUI/IAB and dialect formats cover registration, mutation, and failures', () => {
  clear_ieee_registries();

  register_oui('00-1b-77', { org: 'Dialect Networks' });
  register_iab('001b77449', { org: 'Dialect IAB' });

  const mac = new EUI('00-1b-77-49-54-fd');
  assert.equal(mac.oui.toString(), '00-1b-77');
  assert.equal(typeof mac.ei, 'bigint');
  assert.equal(mac.is_iab(), false);
  assert.equal(mac.iab, null);
  assert.equal(mac.bits(':').split(':').length, 6);
  assert.equal(mac.bin.startsWith('0b'), true);
  assert.equal(mac.packed.length, 6);
  assert.equal(mac.getWord(0), 0x00);
  assert.equal(mac.setWord(5, 0xaa).toString(), '00-1b-77-49-54-aa');

  const eui64 = mac.eui64();
  assert.equal(eui64.version, 64);
  assert.equal(eui64.eui64().toString(), eui64.toString());
  assert.equal(eui64.format(eui64_base).includes('-'), true);
  assert.equal(eui64.format(eui64_unix).includes(':'), true);
  assert.equal(eui64.format(eui64_unix_expanded).includes(':'), true);
  assert.equal(eui64.format(eui64_cisco).includes('.'), true);
  assert.equal(eui64.format(eui64_bare).includes('-'), false);

  const iabMac = new EUI('00-1b-77-44-95-fd');
  assert.equal(iabMac.is_iab(), true);
  assert.equal(iabMac.iab.toString(), '001b77449');
  assert.equal(iabMac.info.org, 'Dialect IAB');

  assert.equal(mac.format(mac_bare), '001b774954aa');
  assert.equal(mac.format(mac_pgsql), '00:1b:77:49:54:aa');
  assert.equal(mac.format({ format: () => 'custom-format' }), 'custom-format');

  const fromBig48 = new EUI(0x001b774954fdn);
  const fromBig64 = new EUI(0x001b77fffe4954fdn);
  assert.equal(fromBig48.version, 48);
  assert.equal(fromBig64.version, 64);

  const copied = new EUI(fromBig48, mac_bare);
  assert.equal(copied.toString(), '001b774954fd');

  assert.equal(new OUI('00:1b:77').registration.org, 'Dialect Networks');
  assert.equal(new IAB('001b77449').registration.org, 'Dialect IAB');

  assert.equal(valid_mac('00-1b-77-49-54-aa'), true);
  assert.equal(valid_mac('00-1b-77-49-54-gg'), false);
  assert.equal(valid_eui64('00-1b-77-ff-fe-49-54-fd'), true);

  assert.throws(() => mac.getWord(9), AddrFormatError);
  assert.throws(() => mac.setWord(0, 999), AddrFormatError);
  assert.throws(() => new EUI(-1), AddrFormatError);
  assert.throws(() => new EUI(1n << 80n), AddrFormatError);
  assert.throws(() => new EUI('00:11:22:33:44:55').ipv6('10.0.0.0/8'), AddrFormatError);
  assert.throws(() => new EUI('00:11:22:33:44:55').ipv6('2001:db8::/96'), AddrFormatError);
  assert.throws(() => new OUI('aa-bb-cc').registration, NotRegisteredError);
  assert.throws(() => new IAB('001b77448').registration, NotRegisteredError);

  const ipGlob = new IPGlob('192.0.2.*');
  assert.equal(ipGlob.toString(), '192.0.2.*');
});
