import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AddrConversionError,
  AddrFormatError,
  INET_PTON,
  IPAddress,
  IPGlob,
  IPNetwork,
  IPRange,
  IPSet,
  EUI,
  OUI,
  IAB,
  base85_to_ipv6,
  cidr_to_glob,
  iter_iprange,
  register_iab,
  register_oui,
  lookup_iab,
  lookup_oui,
} from '../src/index.js';

test('IPAddress invalid inputs and conversion failures throw expected errors', () => {
  assert.throws(() => new IPAddress('192.0.2.1/24'), AddrFormatError);
  assert.throws(() => new IPAddress('999.1.1.1', 4, INET_PTON), AddrFormatError);
  assert.throws(() => Number(new IPAddress('2001:db8::1')), AddrConversionError);
  assert.throws(() => new IPAddress('2001:db8::1').ipv4(), AddrConversionError);
});

test('IPNetwork and IPRange invalid shapes throw AddrFormatError', () => {
  assert.throws(() => new IPNetwork('192.0.2.1/33'), AddrFormatError);
  assert.throws(() => new IPNetwork(['10.0.0.1', 24]), AddrFormatError);
  assert.throws(() => new IPRange('192.0.2.10', '192.0.2.1'), AddrFormatError);
  assert.throws(() => Array.from(iter_iprange('192.0.2.1', '192.0.2.10', 0)), AddrFormatError);
});

test('glob/nmap/rfc1924 invalid inputs throw expected exceptions', () => {
  assert.throws(() => new IPGlob('300.1.1.*'), AddrFormatError);
  assert.throws(() => cidr_to_glob('2001:db8::/64'), AddrConversionError);
  assert.throws(() => base85_to_ipv6('short'), AddrConversionError);
  assert.throws(() => base85_to_ipv6('[[[[[[[[[[[[[[[[[[[['), AddrConversionError);
});

test('EUI/OUI/IAB and registry validation failures throw AddrFormatError', () => {
  assert.throws(() => new EUI('zz:zz:zz:zz:zz:zz'), AddrFormatError);
  assert.throws(() => new EUI('00:11:22:33:44:55').ipv6('10.0.0.0/24'), AddrFormatError);
  assert.throws(() => new OUI('zzzzzz'), AddrFormatError);
  assert.throws(() => new IAB('xyzxyzxyz'), AddrFormatError);

  assert.throws(() => register_oui('00-11', { org: 'bad' }), AddrFormatError);
  assert.throws(() => register_iab('00112233', { org: 'bad' }), AddrFormatError);
  assert.throws(() => register_oui('001122', { org: '' }), AddrFormatError);
  assert.throws(() => lookup_oui('bad-prefix'), AddrFormatError);
  assert.throws(() => lookup_iab('bad-prefix'), AddrFormatError);
});

test('IPSet throws on invalid iterable and non-contiguous iprange requests', () => {
  assert.throws(() => new IPSet({}), AddrFormatError);

  const set = new IPSet(['10.0.0.0/24', '10.0.2.0/24']);
  assert.equal(set.iscontiguous(), false);
  assert.throws(() => set.iprange(), AddrFormatError);
});
