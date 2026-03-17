# netaddr-js Documentation

JavaScript has several solid networking/IP packages, but many focus on a
single slice of the problem: parsing, validation, CIDR math, or range
utilities. Real-world network automation often needs all of those capabilities
together in one coherent API.

Python has `netaddr`, which has become a widely trusted toolkit for that style
of work. `netaddr-js` exists to bring that breadth of capability to JavaScript
with precision-safe `BigInt` internals and JS-first ergonomics.

`netaddr-js` is a JavaScript equivalent to Python `netaddr`, focused on:

- precise IP math with `BigInt`
- IPv4 + IPv6 address/network/range operations
- CIDR summarization and exclusion
- IP sets, glob ranges, and nmap-style ranges
- EUI/MAC operations and derived IPv6 addresses

This docs site is built with Docsify and organized for fast onboarding and
migration from Python.

## Why this project exists

Network-heavy applications and automation workflows often need more than
address parsing. They need tasks like CIDR summarization, exact range
decomposition, route matching, and EUI derivations to be reliable and easy to
compose.

`netaddr-js` provides those operations in a single toolkit so users do not need
to stitch together multiple narrowly scoped libraries.

## Inspiration and attribution

`netaddr-js` is explicitly inspired by Python `netaddr`, and credit belongs to
the Python `netaddr` maintainers and contributors for the original concepts and
ecosystem impact.

This project is an independent JavaScript implementation, not an official
Python `netaddr` port. For attribution and licensing context, see
[THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md) and
[License](license.md).

## Who this docs site is for

- application developers integrating network logic into JS/Node services
- teams migrating automation from Python `netaddr` to JavaScript
- contributors and maintainers working on the `netaddr-js` repository

## Start Here

- New to `netaddr-js`: [Getting Started](getting-started.md)
- Need practical workflows: [How To Use](how-to-use.md)
- Need copy/paste recipes: [Examples Cookbook](examples-cookbook.md)
- Coming from Python `netaddr`: [Python netaddr Mapping](python-netaddr-mapping.md)

## Documentation map

- [Getting Started](getting-started.md) for package install and first usage in an app
- [How To Use](how-to-use.md) for structured workflow guidance and feature behavior
- [Examples Cookbook](examples-cookbook.md) for copy/paste task recipes
- [API Reference](api-reference.md) for quick symbol lookup
- [Python netaddr Mapping](python-netaddr-mapping.md) for API and concept equivalence
- [Contributing](contributing.md) for local repository development and maintenance
- [Maintainers](maintainers.md) for release, publishing, and repo operations
- [CI/CD and Release](automation-release.md) for automated maintainer
  release flow details
- [Manual Publish & Release (Fallback)](manual-publish.md) for manual
  maintainer fallback steps
- [License](license.md) for legal terms and attribution links

## Similarity goals with Python netaddr

`netaddr-js` intentionally mirrors Python netaddr concepts:

- class names: `IPAddress`, `IPNetwork`, `IPRange`, `IPSet`, `EUI`
- top-level aliases: `IP`, `CIDR`, `MAC`
- compatibility helpers: `reverse_dns`, `iter_hosts()`, `ipv4()`, `ipv6()`
- utility functions: `cidr_merge`, `iprange_to_cidrs`, `spanning_cidr`, `all_matching_cidrs`

## Precision and safety model

- all internal address arithmetic uses `BigInt`
- IPv6 values are never downcast to JS `Number`
- conversion to number only happens explicitly and guards against unsafe range

## Data-backed lookups

- IANA special-purpose blocks power `IPAddress.info` and `IPAddress.is_global()`
- IEEE OUI/IAB registries are extensible at runtime via registration helpers
- bundled data can be refreshed using update scripts described in [Contributing](contributing.md)
