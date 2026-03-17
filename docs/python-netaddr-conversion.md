# Python netaddr Concept Mapping

This guide is for engineers who already know Python `netaddr` and want a clear
mapping to equivalent concepts in JavaScript `netaddr-js`.

These libraries target similar networking workflows in different ecosystems.
This page is a familiarity and concept-mapping guide, not a requirement to
perform a full codebase conversion.

Use this guide when you are bringing Python `netaddr` mental models into
JavaScript or evaluating API equivalence between ecosystems.

`netaddr-js` is inspired by Python `netaddr`, and this document is intended to
help migration workflows while clearly crediting the original Python project.
`netaddr-js` is an independent JavaScript implementation, not an official
Python `netaddr` port.

## Import mapping

Python:

```python
from netaddr import IPAddress, IPNetwork, IPRange, IPSet, EUI
```

JavaScript:

```js
import { IPAddress, IPNetwork, IPRange, IPSet, EUI } from 'netaddr-js';
```

Alias-style imports are also available:

```js
import { IP, CIDR, MAC } from 'netaddr-js';
```

## Symbol mapping table

| Python netaddr | netaddr-js | Notes |
| --- | --- | --- |
| `IPAddress` | `IPAddress` / `IP` | same concept |
| `IPNetwork` | `IPNetwork` / `CIDR` | same concept |
| `IPRange` | `IPRange` | same concept |
| `IPSet` | `IPSet` | set operations available |
| `IPGlob` | `IPGlob` | IPv4 glob support |
| `EUI` | `EUI` / `MAC` | EUI-48 and EUI-64 |
| `OUI` | `OUI` | registration lookup |
| `IAB` | `IAB` | registration lookup |
| `cidr_merge` | `cidr_merge` | same intent |
| `cidr_exclude` | `cidr_exclude` | same intent |
| `spanning_cidr` | `spanning_cidr` | same intent |
| `iter_iprange` | `iter_iprange` | generator |
| `glob_to_cidrs` | `glob_to_cidrs` | same intent |
| `iter_nmap_range` | `iter_nmap_range` | generator |
| `ipv6_to_base85` | `ipv6_to_base85` | RFC1924 |
| `expand_partial_ipv4_address` | `expand_partial_ipv4_address` | partial IPv4 expansion |
| `SubnetSplitter` | `SubnetSplitter` | iterative subnet extraction utility |
| `ipv6_compact` / `ipv6_full` / `ipv6_verbose` | `ipv6_compact` / `ipv6_full` / `ipv6_verbose` | IPv6 formatting dialect classes |

## Side-by-side examples

### Basic IP

Python:

```python
ip = IPAddress('192.0.2.1')
int(ip)
ip.reverse_dns
```

JavaScript:

```js
const ip = new IPAddress('192.0.2.1');
ip.toBigInt();
ip.reverse_dns;
```

### Network properties

Python:

```python
net = IPNetwork('192.0.2.11/24')
net.network
net.broadcast
net.iter_hosts()
```

JavaScript:

```js
const net = new IPNetwork('192.0.2.11/24');
net.network;
net.broadcast;
net.iter_hosts();
```

### IPv4/IPv6 conversion

Python:

```python
IPAddress('192.0.2.15').ipv6()
IPAddress('::ffff:192.0.2.15').ipv4()
```

JavaScript:

```js
new IPAddress('192.0.2.15').ipv6();
new IPAddress('::ffff:192.0.2.15').ipv4();
```

### CIDR merge

Python:

```python
cidr_merge(['192.0.128.0/24', '192.0.129.0/24'])
```

JavaScript:

```js
cidr_merge(['192.0.128.0/24', '192.0.129.0/24']);
```

### Partial IPv4 expansion helper

Python:

```python
expand_partial_ipv4_address('10.1')
```

JavaScript:

```js
expand_partial_ipv4_address('10.1');
```

### IPv6 formatting dialects

Python:

```python
ip = IPAddress('::ffff:192.0.2.1')
ip.format(ipv6_compact)
ip.format(ipv6_full)
ip.format(ipv6_verbose)
```

JavaScript:

```js
const ip = new IPAddress('::ffff:192.0.2.1');
ip.format(ipv6_compact);
ip.format(ipv6_full);
ip.format(ipv6_verbose);
```

### EUI and dialect formatting

Python:

```python
mac = EUI('00-1B-77-49-54-FD')
mac.format(mac_cisco)
```

JavaScript:

```js
const mac = new EUI('00-1b-77-49-54-fd');
mac.format(mac_cisco);
```

## Semantic differences to watch

### Numeric types

- Python `int` is arbitrary precision.
- JavaScript uses `BigInt` for exact IP math.
- Use `toBigInt()` where Python code used `int(ip)`.

### Constructors and methods

- JavaScript uses `new` for classes (`new IPAddress(...)`).

### Iterators

- JS iterators are lazy and consumed with `for...of` or `Array.from()`.

### Flags

- `INET_ATON` compatibility is supported in `IPAddress` parsing.
- `ZEROFILL` compatibility is supported for leading-zero IPv4 normalization.
- `INET_ATON` and `INET_PTON` are mutually exclusive, matching Python `netaddr`.

## Adoption checklist for netaddr-style workflows

- Replace Python imports with ES module imports.
- Replace `int(...)` with `toBigInt()`.
- Verify string formatting expectations for IPv6 and EUI dialects.
- Verify behavior around legacy IPv4 parsing flags.
- Add tests for critical ACL/CIDR transformations during migration.
