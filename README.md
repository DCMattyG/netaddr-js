# netaddr-js

`netaddr-js` is a JavaScript network address toolkit inspired by Python
[`netaddr`](https://github.com/netaddr/netaddr).

Use this package when you need one coherent API for IPv4/IPv6 parsing,
network/range math, CIDR summarization, sets, globs, nmap ranges, and EUI/MAC
operations without stitching multiple libraries together.

## Why netaddr-js

- Precision-safe IP arithmetic with `BigInt`
- IPv4 and IPv6 first-class support
- Familiar naming for Python `netaddr` users (`IPAddress`, `IPNetwork`, `IPSet`)
- Practical utilities for routing-style tasks (`cidr_merge`, `cidr_exclude`,
  `spanning_cidr`)
- Data-backed lookups for IANA and IEEE registry context

## Install

```bash
npm install netaddr-js
```

`netaddr-js` is ESM-only.

## Quick Start

```js
import {
  IPAddress,
  IPNetwork,
  cidr_merge,
  valid_ipv4,
  valid_ipv6,
  valid_mac,
} from 'netaddr-js';

console.log(valid_ipv4('192.0.2.1')); // true
console.log(valid_ipv6('2001:db8::1')); // true
console.log(valid_mac('00:1b:77:49:54:fd')); // true

const host = new IPAddress('2001:db8::10');
console.log(host.toBigInt());

const network = new IPNetwork('192.0.2.11/24');
console.log(String(network.network)); // 192.0.2.0

const merged = cidr_merge(['192.0.2.0/24', '192.0.3.0/24']);
console.log(merged.map(String)); // ['192.0.2.0/23']
```

## Common Imports

```js
import {
  IPAddress,
  IPNetwork,
  IPRange,
  IPSet,
  EUI,
  cidr_merge,
  iprange_to_cidrs,
  valid_ipv4,
  valid_ipv6,
  valid_mac,
} from 'netaddr-js';
```

## Documentation

- Docs site: <https://dcmattyg.github.io/netaddr-js/>
- Getting started: <https://dcmattyg.github.io/netaddr-js/#/getting-started>
- How to use: <https://dcmattyg.github.io/netaddr-js/#/how-to-use>
- API reference: <https://dcmattyg.github.io/netaddr-js/#/api-reference>
- Python mapping guide: <https://dcmattyg.github.io/netaddr-js/#/python-netaddr-mapping>
- Playground: <https://dcmattyg.github.io/netaddr-js/playground/>

Repository and issue tracking:

- GitHub: <https://github.com/DCMattyG/netaddr-js>
- Issues: <https://github.com/DCMattyG/netaddr-js/issues>

## Attribution

`netaddr-js` is explicitly inspired by Python `netaddr`.

Credit belongs to the Python `netaddr` maintainers and contributors for the
original project and ecosystem impact. `netaddr-js` is an independent
JavaScript implementation and is not an official Python `netaddr` port.

For attribution and third-party notice details, see [NOTICE](NOTICE) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

BSD-3-Clause. See [LICENSE](LICENSE).
