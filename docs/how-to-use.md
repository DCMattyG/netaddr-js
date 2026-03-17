# How To Use netaddr-js

This guide is organized by common workflows so you can jump directly to the
task you need.

Use this page when you want to understand capability areas, API behavior, and
which objects/functions to reach for.

If you want fast copy/paste snippets for common tasks, see
[Examples Cookbook](examples-cookbook.md).

## Address Basics

### Create and inspect IP addresses

```js
import { IPAddress } from 'netaddr-js';

const ip4 = new IPAddress('192.0.2.1');
console.log(ip4.version);          // 4
console.log(ip4.words);            // [192, 0, 2, 1]
console.log(ip4.bin);              // 0b110000...
console.log(ip4.reverse_dns);      // 1.2.0.192.in-addr.arpa

const ip6 = new IPAddress('2001:db8::dead:beef');
console.log(ip6.version);          // 6
console.log(ip6.toBigInt());       // precise bigint value
```

### Exact numeric operations

```js
const base = new IPAddress('10.0.0.1');
const next = base.add(5);
console.log(String(next)); // 10.0.0.6
```

### Parse with legacy IPv4 semantics (`INET_ATON`)

```js
import { IPAddress, INET_ATON } from 'netaddr-js';

console.log(String(new IPAddress('1', null, INET_ATON)));        // 0.0.0.1
console.log(String(new IPAddress('127.1', null, INET_ATON)));    // 127.0.0.1
console.log(String(new IPAddress('0x7f.1', null, INET_ATON)));   // 127.0.0.1
console.log(String(new IPAddress('0177.1', null, INET_ATON)));   // 127.0.0.1
```

### Convert between IPv4 and IPv6 representations

```js
import { IPAddress, IPNetwork } from 'netaddr-js';

const ip4 = new IPAddress('192.0.2.15');
console.log(String(ip4.ipv6()));       // ::ffff:192.0.2.15 (mapped)
console.log(String(ip4.ipv6(true)));   // ::192.0.2.15 (compatible)

const mapped = new IPAddress('::ffff:192.0.2.15');
console.log(String(mapped.ipv4()));    // 192.0.2.15

const net4 = new IPNetwork('192.0.2.1/23');
console.log(String(net4.ipv6()));      // ::ffff:192.0.2.0/119 style
```

## Networks and CIDR

### Inspect network properties

```js
import { IPNetwork, NOHOST } from 'netaddr-js';

const net = new IPNetwork('192.0.2.11/24');
console.log(String(net.ip));        // 192.0.2.11
console.log(String(net.network));   // 192.0.2.0
console.log(String(net.cidr));      // 192.0.2.0/24
console.log(String(net.broadcast)); // 192.0.2.255
console.log(String(net.netmask));   // 255.255.255.0
console.log(String(net.hostmask));  // 0.0.0.255
console.log(net.size);              // 256n

const strict = new IPNetwork('192.0.2.11/24', null, NOHOST);
console.log(String(strict));        // 192.0.2.0/24
```

`IPNetwork('host/prefix')` input is accepted for inspection workflows. If you
need canonical network CIDR text immediately, use `.cidr` or construct with
`NOHOST`.

### Iterate usable hosts

```js
const hosts = net.iter_hosts();
console.log(hosts.next().value.toString()); // 192.0.2.1
```

### Subnet and supernet

```js
const parent = new IPNetwork('10.0.0.0/16');
const children = parent.subnet(20);
console.log(children.slice(0, 3).map(String));

const child = new IPNetwork('10.0.8.0/24');
console.log(String(child.supernet(16))); // 10.0.0.0/16
```

### Convert arbitrary ranges to exact CIDRs

```js
import { IPRange, iprange_to_cidrs } from 'netaddr-js';

const range = new IPRange('192.0.2.5', '192.0.2.10');
console.log(String(range));
console.log(range.cidrs().map(String));

const exact = iprange_to_cidrs('192.0.2.5', '192.0.2.10');
console.log(exact.map(String));
```

### Summarize and exclude CIDRs

```js
import { cidr_merge, cidr_exclude } from 'netaddr-js';

const merged = cidr_merge(['192.0.128.0/24', '192.0.129.0/24']);
console.log(merged.map(String)); // [ '192.0.128.0/23' ]

const remaining = cidr_exclude('10.0.0.0/24', '10.0.0.64/26');
console.log(remaining.map(String));
```

### Find matching networks

```js
import {
  largest_matching_cidr,
  smallest_matching_cidr,
  all_matching_cidrs,
} from 'netaddr-js';

const rules = ['0.0.0.0/0', '192.0.0.0/8', '192.0.2.0/24'];
console.log(String(largest_matching_cidr('192.0.2.32', rules)));  // least specific
console.log(String(smallest_matching_cidr('192.0.2.32', rules))); // most specific
console.log(all_matching_cidrs('192.0.2.32', rules).map(String));
```

## Sets, Globs, and Target Specs

### Use IP sets for unions, intersections, and differences

```js
import { IPSet } from 'netaddr-js';

const a = new IPSet(['192.0.2.0/25']);
const b = new IPSet(['192.0.2.64/26']);

console.log(a.intersection(b).iter_cidrs().map(String));
console.log(a.difference(b).iter_cidrs().map(String));
console.log(a.union(b).iter_cidrs().map(String));
```

### Work with glob and nmap range formats

```js
import {
  IPGlob,
  valid_glob,
  glob_to_cidrs,
  cidr_to_glob,
  iter_nmap_range,
  valid_nmap_range,
} from 'netaddr-js';

console.log(valid_glob('192.0-1.2.*'));
console.log(glob_to_cidrs('192.0.2.*').map(String));
console.log(cidr_to_glob('192.0.2.0/24'));

const g = new IPGlob('10.1-2.3.*');
console.log(String(g));

console.log(valid_nmap_range('10.0.0-1.1,3'));
console.log(Array.from(iter_nmap_range('10.0.0-1.1,3')).map(String));
```

## MAC/EUI and Registry Metadata

### MAC and EUI operations

```js
import { EUI, mac_unix, mac_cisco } from 'netaddr-js';

const mac = new EUI('00-1b-77-49-54-fd');
console.log(mac.format(mac_unix));  // 00:1b:77:49:54:fd
console.log(mac.format(mac_cisco)); // 001b.7749.54fd

const eui64 = mac.eui64();
const modified = mac.modified_eui64();
console.log(String(eui64));
console.log(String(modified));
console.log(String(mac.ipv6_link_local()));
```

### IANA and IEEE information lookups

```js
import {
  IPAddress,
  register_oui,
  register_iab,
  EUI,
} from 'netaddr-js';

const ip = new IPAddress('10.10.10.10');
console.log(ip.is_global());
console.log(ip.info);

register_oui('001b77', { org: 'Example Networks', source: 'custom' });
register_iab('001b77449', { org: 'Example IAB', source: 'custom' });

const eui = new EUI('00-1b-77-44-95-fd');
console.log(eui.info);
```

## Encoding and Compatibility

### RFC1924 base85 conversion

```js
import { ipv6_to_base85, base85_to_ipv6 } from 'netaddr-js';

const b85 = ipv6_to_base85('2001:db8::dead:beef');
console.log(b85);
console.log(String(base85_to_ipv6(b85)));
```

### Python compatibility helpers

```js
import {
  IPAddress,
  SubnetSplitter,
  expand_partial_ipv4_address,
  ipv6_compact,
  ipv6_full,
  ipv6_verbose,
} from 'netaddr-js';

console.log(expand_partial_ipv4_address('10.1')); // 10.1.0.0

const ip = new IPAddress('::ffff:192.0.2.1');
console.log(ip.format(ipv6_compact)); // ::ffff:192.0.2.1
console.log(ip.format(ipv6_full));    // 0:0:0:0:0:ffff:c000:201
console.log(ip.format(ipv6_verbose)); // 0000:0000:0000:0000:0000:ffff:c000:0201

const splitter = new SubnetSplitter('10.0.0.0/24');
console.log(splitter.extract_subnet(26).map(String));
```
