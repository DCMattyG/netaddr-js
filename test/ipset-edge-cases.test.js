import test from 'node:test';
import assert from 'node:assert/strict';

import { IPAddress, IPNetwork, IPRange, IPSet } from '../src/index.js';

test('IPSet remove splits network into expected residual CIDRs', () => {
  const set = new IPSet(['10.0.0.0/24']);
  set.remove('10.0.0.64/26');

  assert.deepEqual(
    set.iter_cidrs().map(String),
    ['10.0.0.0/26', '10.0.0.128/25'],
  );
});

test('IPSet difference and symmetric_difference behaviors on overlaps', () => {
  const a = new IPSet(['10.0.0.0/24']);
  const b = new IPSet(['10.0.0.128/25']);

  assert.deepEqual(a.difference(b).iter_cidrs().map(String), ['10.0.0.0/25']);
  assert.deepEqual(a.symmetric_difference(b).iter_cidrs().map(String), ['10.0.0.0/25']);
});

test('IPSet intersection ignores mixed-family non-overlaps cleanly', () => {
  const a = new IPSet(['10.0.0.0/24', '2001:db8::/126']);
  const b = new IPSet(['10.0.0.64/26', '2001:db8:1::/126']);

  assert.deepEqual(a.intersection(b).iter_cidrs().map(String), ['10.0.0.64/26']);
});

test('IPSet contains supports IPAddress, IPNetwork, and IPRange', () => {
  const set = new IPSet(['192.0.2.0/24']);

  assert.equal(set.contains(new IPAddress('192.0.2.10')), true);
  assert.equal(set.contains(new IPNetwork('192.0.2.64/26')), true);
  assert.equal(set.contains(new IPRange('192.0.2.1', '192.0.2.200')), true);
  assert.equal(set.contains(new IPRange('192.0.2.1', '192.0.3.1')), false);
});

test('IPSet iter_ipranges merges adjacency but keeps disjoint ranges separate', () => {
  const merged = new IPSet(['10.0.0.0/25', '10.0.0.128/25']);
  assert.equal(merged.iter_ipranges().length, 1);
  assert.equal(merged.iprange().toString(), '10.0.0.0-10.0.0.255');

  const disjoint = new IPSet(['10.0.0.0/25', '10.0.1.0/25']);
  assert.equal(disjoint.iter_ipranges().length, 2);
  assert.equal(disjoint.iscontiguous(), false);
});
