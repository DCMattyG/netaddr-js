# Getting Started

Use this guide when you want to consume `netaddr-js` in an application.
If you want to work on this repository itself, see [Contributing](contributing.md).

## Prerequisites

- Node.js 22.14+
- npm 9+

## Install from npm

```bash
npm install netaddr-js
```

If you need to test an unpublished local snapshot, see the optional workflow in
[Contributing](contributing.md).

`netaddr-js` is ESM-only. Your consumer project must either:

- set `"type": "module"` in `package.json`, or
- use `.mjs` file extensions.

Then import what you need:

```js
import { IPAddress, IPNetwork, cidr_merge } from 'netaddr-js';
```

## Minimal consumer project setup

```bash
mkdir netaddr-js-test
cd netaddr-js-test
npm init -y
npm pkg set type=module
npm install netaddr-js
```

Create `index.js`:

```js
import { valid_ipv4, valid_ipv6, valid_mac } from 'netaddr-js';

console.log(valid_ipv4('192.0.2.1'));
console.log(valid_ipv6('2001:db8::1'));
console.log(valid_mac('00:1b:77:49:54:fd'));
```

Run:

```bash
node index.js
```

## First usage example

```js
import { IPAddress, IPNetwork, cidr_merge } from 'netaddr-js';

const ip = new IPAddress('2001:db8::1');
console.log(ip.toBigInt());

const network = new IPNetwork('192.0.2.11/24');
console.log(String(network.network));

const merged = cidr_merge(['192.0.2.0/24', '192.0.3.0/24']);
console.log(merged.map(String));
```

## Quick validation in your app

```js
import { valid_ipv4, valid_ipv6, valid_mac } from 'netaddr-js';

console.log(valid_ipv4('192.0.2.1')); // true
console.log(valid_ipv6('2001:db8::1')); // true
console.log(valid_mac('00:1b:77:49:54:fd')); // true
```

## Next steps

- Feature walkthrough: [How To Use](how-to-use.md)
- Python concept mapping: [Python netaddr Mapping](python-netaddr-mapping.md)
- Full symbol list: [API Reference](api-reference.md)

## Type and precision recommendations

- Keep address math in `BigInt` values.
- Avoid converting IPv6 values to JS numbers.
- Use `toString()` for display and `toBigInt()` for exact numeric workflows.
