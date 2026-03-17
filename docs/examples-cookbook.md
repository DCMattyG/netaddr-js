# Examples Cookbook

Use this page when you need practical, ready-to-run snippets.

If you want broader conceptual guidance and feature walkthroughs, start with
[How To Use](how-to-use.md).

## CIDR and Routing Recipes

### Build minimal ACL summarize flow

```js
import { cidr_merge } from 'netaddr-js';

const raw = [
  '192.0.2.0/24',
  '192.0.3.0/24',
  '192.0.4.0/25',
  '192.0.4.128/25',
];

const summarized = cidr_merge(raw);
console.log(summarized.map(String));
```

### Exclude a deny range from allow CIDR

```js
import { cidr_exclude } from 'netaddr-js';

const allow = '10.0.0.0/24';
const deny = '10.0.0.64/27';
console.log(cidr_exclude(allow, deny).map(String));
```

### Convert arbitrary start/end to exact CIDRs

```js
import { iprange_to_cidrs } from 'netaddr-js';

const cidrs = iprange_to_cidrs('192.0.2.5', '192.0.2.10');
console.log(cidrs.map(String));
```

### Match IP against route list

```js
import { smallest_matching_cidr } from 'netaddr-js';

const routes = ['0.0.0.0/0', '10.0.0.0/8', '10.23.0.0/16'];
const best = smallest_matching_cidr('10.23.7.5', routes);
console.log(String(best));
```

## Set and Target Spec Recipes

### Use IPSet for overlap analysis

```js
import { IPSet } from 'netaddr-js';

const prod = new IPSet(['10.0.0.0/20']);
const newPool = new IPSet(['10.0.8.0/21']);

const overlap = prod.intersection(newPool);
console.log(overlap.iter_cidrs().map(String));
```

### Globs for operator-readable configs

```js
import { cidr_to_glob, glob_to_cidrs } from 'netaddr-js';

const glob = cidr_to_glob('192.0.2.0/24');
console.log(glob);

const back = glob_to_cidrs(glob);
console.log(back.map(String));
```

### nmap target expansion

```js
import { iter_nmap_range } from 'netaddr-js';

const targets = Array.from(iter_nmap_range('192.168.0-1.1,2'));
console.log(targets.map(String));
```

## Python Mapping Recipes

### Translate Python `flags=` to JavaScript constructors

```js
import { IPAddress, IPNetwork, INET_ATON, NOHOST } from 'netaddr-js';

const legacy = new IPAddress('127.1', null, INET_ATON);
console.log(String(legacy)); // 127.0.0.1

const strictNet = new IPNetwork('192.0.2.11/24', null, NOHOST);
console.log(String(strictNet)); // 192.0.2.0/24
```

### Normalize host bits from host/prefix input

```js
import { IPNetwork } from 'netaddr-js';

const net = new IPNetwork('192.0.2.11/24');
console.log(String(net));      // 192.0.2.11/24
console.log(String(net.cidr)); // 192.0.2.0/24
```

## EUI and Registry Recipes

### EUI to link-local IPv6

```js
import { EUI } from 'netaddr-js';

const mac = new EUI('00-1b-77-49-54-fd');
console.log(String(mac.ipv6_link_local()));
```

### Custom IEEE org mapping injection

```js
import { register_oui, EUI } from 'netaddr-js';

register_oui('001b77', { org: 'Example Networks', source: 'runtime' });
const mac = new EUI('00-1b-77-49-54-fd');
console.log(mac.info.org);
```
