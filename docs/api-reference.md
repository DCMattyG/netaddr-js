# API Reference

This page documents the public `netaddr-js` API exported from `src/index.js`.

Use this page when you need exact symbol names, method signatures, and return
behavior.

For usage examples, see [How To Use](how-to-use.md) and
[Examples Cookbook](examples-cookbook.md).

## Public API policy

- Public API: symbols exported by `src/index.js`.
- Private API: unexported module internals.
- Compatibility target: Python `netaddr` concepts with JavaScript-first behavior.

## Documentation format

- Class sections follow the same order: constructor, core properties, key methods.
- Function sections use the same fields: parameters, returns, raises (when applicable).
- Exception names are listed exactly as exported by `src/index.js`.

## Constants

- `INET_PTON`: strict IPv4 dotted-quad parsing mode.
- `INET_ATON`: legacy `inet_aton`-style IPv4 parsing mode.
- `ZEROFILL`: leading-zero normalization flag for IPv4 text parsing.
- `NOHOST`: host-bit normalization flag for network parsing.

## Custom Exceptions

- `AddrFormatError`: invalid address string, prefix, mask, or identifier shape.
- `AddrConversionError`: unsupported or invalid conversion between formats.
- `NotRegisteredError`: OUI or IAB lookup was requested but not found.

## IP Classes

### `IPAddress` (`IP` alias)

Represents one IPv4 or IPv6 address.

#### IPAddress constructor

- `new IPAddress(addr, version = null, flags = 0)`
  - **Parameters:**
    - `addr`: string, number, bigint, or `IPAddress`.
    - `version`: `4`, `6`, or `null` for auto-detection.
    - `flags`: IPv4 parser flags (`INET_PTON`, `INET_ATON`, `ZEROFILL`).
  - **Raises:** `AddrFormatError` when parsing fails or the version hint is incompatible.

#### IPAddress core properties

- `version`
  - **Type:** `4` or `6`.
  - **Meaning:** detected or assigned IP protocol version.
- `value`
  - **Type:** `bigint`.
  - **Meaning:** internal numeric representation of the address.
- `words`
  - **Type:** read-only integer array.
  - **Meaning:** IPv4 octets or IPv6 hextets.
- `bin`
  - **Type:** string.
  - **Meaning:** zero-padded binary representation.
- `packed`
  - **Type:** `Uint8Array`.
  - **Meaning:** packed network-byte-order representation.
- `reverse_dns` and `reverseDns`
  - **Type:** string.
  - **Meaning:** reverse DNS pointer name.
- `info`
  - **Type:** object.
  - **Meaning:** matching IANA special-purpose metadata (if any).

#### IPAddress key methods

- `toBigInt()`
  - **Returns:** exact numeric address as `bigint`.
- `add(n)` / `sub(n)`
  - **Parameters:** integer step as number or bigint.
  - **Returns:** new `IPAddress` shifted by `n`.
- `compare(other)` / `equals(other)`
  - **Returns:** sort-style comparison result or boolean equality.
- `bits(wordSep?)`
  - **Parameters:** optional separator string for grouped bits.
  - **Returns:** grouped binary representation.
- `format(dialect?)`
  - **Parameters:** optional IPv6 dialect class (`ipv6_compact`,
    `ipv6_full`, `ipv6_verbose`).
  - **Returns:** alternate text rendering for IPv6 addresses;
    IPv4 output is unchanged.
  - **Raises:** `TypeError` when a custom dialect does not provide
    Python-compatible dialect fields.
- `ipv4()` / `ipv6(ipv4_compatible = false)`
  - **Returns:** numerically equivalent `IPAddress` in target family,
    or throws `AddrConversionError` when conversion is not valid.
  - **Raises:** `AddrConversionError` for unsupported family conversions.
- `is_global()`
  - **Returns:** whether the address is globally reachable based on
    bundled IANA special-purpose registries.
- Classification helpers such as `is_loopback()`, `is_multicast()`,
  `is_private()`, `is_ipv4_private_use()`, `is_ipv6_unique_local()`
  - **Returns:** boolean classification value.

### `IPNetwork` (`CIDR` alias)

Represents a network/subnet (address + prefix).

#### IPNetwork constructor

- `new IPNetwork(addr, version = null, flags = 0)`
  - **Parameters:**
    - `addr`: CIDR string, host/netmask forms, tuple-like `[int, prefix]`,
      or copy-construction input.
    - `version`: optional family hint (`4` or `6`).
    - `flags`: currently includes `NOHOST` behavior.
  - **Raises:** `AddrFormatError` for invalid network text, mask, or prefix values.

#### IPNetwork core properties

- `version`
  - **Type:** `4` or `6`.
- `ip`
  - **Type:** `IPAddress`.
  - **Meaning:** canonical address stored with this network object.
- `network`
  - **Type:** `IPAddress`.
  - **Meaning:** first address in the network block (`first`).
- `broadcast`
  - **Type:** `IPAddress | null`.
  - **Meaning:** IPv4 broadcast address for prefixes with usable broadcast semantics.
  - **Notes:** returns `null` for IPv6 and for very small IPv4 subnets (`/31`, `/32`).
- `first`
  - **Type:** `bigint`.
  - **Meaning:** numeric first address of the block.
- `last`
  - **Type:** `bigint`.
  - **Meaning:** numeric last address of the block.
- `size`
  - **Type:** `bigint`.
  - **Meaning:** total number of addresses in the block.
- `netmask`
  - **Type:** `IPAddress`.
  - **Meaning:** mask derived from `prefixlen`.
- `hostmask`
  - **Type:** `IPAddress`.
  - **Meaning:** inverse of the netmask.
- `prefixlen`
  - **Type:** integer.
  - **Meaning:** prefix length for the network.
- `cidr`
  - **Type:** `IPNetwork`.
  - **Meaning:** normalized network object with host bits cleared.

#### IPNetwork key methods

- `contains(other)` / `overlaps(other)`
  - **Parameters:** `other` as `IPAddress`, `IPNetwork`, `IPRange`, or parseable network/address input.
  - **Returns:** boolean relationship result.
- `subnet(prefixlen, count?)`
  - **Parameters:** child prefix and optional maximum number of child networks.
  - **Returns:** array of child `IPNetwork` objects.
  - **Raises:** `AddrFormatError` for invalid target prefix lengths.
- `supernet(prefixlen = 0)`
  - **Returns:** containing `IPNetwork` at the requested prefix.
  - **Raises:** `AddrFormatError` for invalid supernet prefix lengths.
- `previous(step = 1)` / `next(step = 1)`
  - **Returns:** adjacent network by subnet step.
- `iter_hosts()`
  - **Returns:** iterator of host `IPAddress` values.
  - **Notes:** for IPv4 prefixes `<= /30`, excludes network and broadcast addresses.
- `compare(other)`
  - **Returns:** `-1`, `0`, `1` sort-style comparison by version/range/prefix.
- `ipv4()` / `ipv6(ipv4_compatible = false)`
  - **Returns:** converted network object, or throws if invalid.
  - **Raises:** `AddrConversionError` for unsupported family conversions.

### `IPRange`

Represents an arbitrary contiguous range between start and end addresses.

#### IPRange constructor

- `new IPRange(start, end, flags = 0)`
  - **Parameters:** range bounds and optional parser flags.
  - **Raises:** `AddrFormatError` when bounds are invalid, mixed-family, or reversed.

#### IPRange core properties

- `version`
  - **Type:** `4` or `6`.
- `first`
  - **Type:** `bigint`.
  - **Meaning:** numeric lower bound of the range.
- `last`
  - **Type:** `bigint`.
  - **Meaning:** numeric upper bound of the range.
- `size`
  - **Type:** `bigint`.
  - **Meaning:** number of addresses in the range (`last - first + 1`).

#### IPRange key methods

- `contains(value)`
  - **Parameters:** `IPAddress`, `IPNetwork`, `IPRange`, or parseable input.
  - **Returns:** boolean containment result.
- `cidrs()`
  - **Returns:** exact CIDR decomposition of the bounded range.
- `[Symbol.iterator]()`
  - **Returns:** iterator over all addresses in the range.

### `IPSet`

Set-like container for IP networks/ranges with merge-aware operations.

#### IPSet constructor

- `new IPSet(iterable = null)`
  - **Parameters:** optional sequence of IP addresses, ranges, and/or CIDRs.
  - **Raises:** `AddrFormatError` if an input element cannot be parsed as a supported IP type.

#### IPSet core properties

- `size`
  - **Type:** `bigint`.
  - **Meaning:** total number of addresses represented by all merged CIDRs.

#### IPSet key methods

- `add(addr)` / `remove(addr)` / `update(iterable)`
  - **Returns:** mutated `IPSet` instance.
- `union(other)` / `intersection(other)` / `difference(other)`
  - **Returns:** new `IPSet` with the corresponding set operation applied.
- `symmetric_difference(other)`
  - **Returns:** new `IPSet` containing elements in either side but not both.
- `contains(value)`
  - **Returns:** boolean membership/containment result.
- `iter_cidrs()`
  - **Returns:** array of normalized `IPNetwork` entries.
- `iter_ipranges()`
  - **Returns:** array of contiguous `IPRange` segments.
- `iprange()`
  - **Returns:** single `IPRange` when the set is contiguous.
  - **Raises:** `AddrFormatError` when the set is not contiguous.
- `iscontiguous()`
  - **Returns:** whether all members form one contiguous range.

### `SubnetSplitter`

Utility class for iterative subnet extraction from a larger base CIDR.

#### SubnetSplitter constructor

- `new SubnetSplitter(base_cidr)`
  - **Parameters:** base IPv4/IPv6 CIDR to manage and split.
  - **Raises:** `AddrFormatError` when base CIDR cannot be parsed.

#### SubnetSplitter methods

- `available_subnets()`
  - **Returns:** currently available `IPNetwork` entries sorted by
    prefix length (most specific first), matching Python behavior.
- `extract_subnet(prefix, count?)`
  - **Parameters:** desired child prefix and optional max count.
  - **Returns:** extracted `IPNetwork[]` from currently available space.
- `remove_subnet(ip_network)`
  - **Parameters:** exact subnet to remove from the available pool.
  - **Returns:** `void`.
  - **Raises:** `Error` when subnet is not currently available.

### `IPGlob`

IPv4 glob range class (`x.x-y.*` style), implemented as an `IPRange`
specialization.

#### IPGlob constructor

- `new IPGlob(ipglob)`
  - **Parameters:** glob expression in IPv4 glob syntax.
  - **Raises:** `AddrFormatError` for invalid glob syntax or out-of-range octets.

## EUI and MAC Classes

### `EUI` (`MAC` alias)

Represents IEEE EUI-48/EUI-64 identifiers (MAC addresses).

#### EUI constructor

- `new EUI(addr, dialect = null)`
  - **Parameters:**
    - `addr`: supported EUI text format, integer value, or `EUI` copy.
    - `dialect`: optional output formatting dialect.
  - **Raises:** `AddrFormatError` when identifier parsing fails.

#### EUI core properties

- `version`
  - **Type:** `48` or `64`.
- `value`
  - **Type:** `bigint`.
  - **Meaning:** numeric EUI identifier value.
- `words`
  - **Type:** read-only byte array.
  - **Meaning:** individual EUI bytes.
- `packed`
  - **Type:** `Uint8Array`.
  - **Meaning:** packed binary byte representation.
- `bin`
  - **Type:** string.
  - **Meaning:** zero-padded binary string.
- `oui`
  - **Type:** `OUI`.
  - **Meaning:** vendor prefix object.
- `ei`
  - **Type:** `bigint`.
  - **Meaning:** extension identifier bits beyond the OUI prefix.
- `iab`
  - **Type:** `IAB | null`.
  - **Meaning:** IAB object when the EUI is IAB-based.
- `info`
  - **Type:** object.
  - **Meaning:** resolved registry metadata from IAB or OUI lookup.

#### EUI key methods

- `is_iab()`
  - **Returns:** whether this EUI resolves to an IAB registration.
- `format(dialect?)`
  - **Returns:** text output in the selected dialect.
- `eui64()` / `modified_eui64()`
  - **Returns:** EUI-64 form or modified EUI-64 identifier.
- `ipv6(prefix)` / `ipv6_link_local()`
  - **Returns:** derived IPv6 interface-address representation.
  - **Raises:** `AddrFormatError` when prefix constraints are not met.

### `OUI`

#### OUI constructor

- `new OUI(addr)`
  - **Parameters:** OUI-like value in supported text forms.
  - **Raises:** `AddrFormatError` when the OUI prefix format is invalid.

#### OUI core properties

- `registration`
  - **Type:** object.
  - **Meaning:** resolved OUI registration metadata.
  - **Returns:** registration record object.
  - **Raises:** `NotRegisteredError` when prefix is unknown.

### `IAB`

#### IAB constructor

- `new IAB(addr)`
  - **Parameters:** IAB-like value in supported text forms.
  - **Raises:** `AddrFormatError` when the IAB prefix format is invalid.

#### IAB core properties

- `registration`
  - **Type:** object.
  - **Meaning:** resolved IAB registration metadata.
  - **Returns:** registration record object.
  - **Raises:** `NotRegisteredError` when prefix is unknown.

## IP and CIDR Functions

All functions in this section accept string/object inputs where noted and return
normalized class instances.

### Range and CIDR transforms

- `iter_iprange(start, end, step = 1)`
  - **Parameters:** range bounds and optional step.
  - **Returns:** iterator of `IPAddress` values between boundaries.
  - **Raises:** `AddrFormatError` when bounds cannot be parsed,
    versions differ, or step is zero.
- `iprange_to_cidrs(start, end)`
  - **Parameters:** inclusive start/end bounds.
  - **Returns:** exact covering CIDR list.
  - **Raises:** `AddrFormatError` when bounds are invalid,
    mixed-family, or reversed.
- `cidr_merge(ipAddrs)`
  - **Parameters:** iterable of addresses, CIDRs, and/or ranges.
  - **Returns:** summarized CIDR list with overlaps/adjacency merged.
- `cidr_exclude(target, exclude)`
  - **Parameters:** target CIDR and subrange to remove.
  - **Returns:** CIDR list for `target` minus `exclude`.
- `spanning_cidr(ipAddrs)`
  - **Parameters:** iterable of at least two addresses/networks.
  - **Returns:** smallest supernet spanning all inputs.
  - **Raises:** `AddrFormatError` for insufficient input
    or mixed IP families.

### CIDR matching helpers

- `largest_matching_cidr(ip, cidrs)`
  - **Parameters:** one IP and candidate CIDRs.
  - **Returns:** least-specific matching CIDR or `null`.
- `smallest_matching_cidr(ip, cidrs)`
  - **Parameters:** one IP and candidate CIDRs.
  - **Returns:** most-specific matching CIDR or `null`.
- `all_matching_cidrs(ip, cidrs)`
  - **Parameters:** one IP and candidate CIDRs.
  - **Returns:** all matching CIDRs sorted by specificity.

### Utility helpers

- `cidr_abbrev_to_verbose(value)`
  - **Parameters:** abbreviated IPv4 input.
  - **Returns:** classful-abbreviation IPv4 expansion where applicable.
- `iter_unique_ips(...iterables)`
  - **Parameters:** one or more iterables of IP-like inputs.
  - **Returns:** iterator of unique addresses from merged inputs.
- `expand_partial_ipv4_address(addr)`
  - **Parameters:** partial IPv4 string such as `"10"`, `"10.1"`, `"10.1.2"`.
  - **Returns:** expanded dotted-quad IPv4 text (`"10.1.0.0"`, etc.).
  - **Raises:** `AddrFormatError` for malformed partial input.

## Glob and Nmap Functions

### Glob

- `valid_glob(ipglob)`
  - **Parameters:** IPv4 glob expression.
  - **Returns:** boolean syntax validity result.
- `glob_to_iptuple(ipglob)`
  - **Parameters:** IPv4 glob expression.
  - **Returns:** two-element tuple of start/end IPv4 strings.
  - **Raises:** `AddrFormatError` for invalid glob syntax.
- `glob_to_iprange(ipglob)`
  - **Parameters:** IPv4 glob expression.
  - **Returns:** equivalent `IPRange`.
  - **Raises:** `AddrFormatError` for invalid glob syntax.
- `glob_to_cidrs(ipglob)`
  - **Parameters:** IPv4 glob expression.
  - **Returns:** exact covering CIDR list.
  - **Raises:** `AddrFormatError` for invalid glob syntax.
- `cidr_to_glob(cidr)`
  - **Parameters:** IPv4 CIDR value.
  - **Returns:** glob string for IPv4 CIDR input.
  - **Raises:** `AddrFormatError` for invalid or unsupported CIDR input.
- `iprange_to_globs(start, end)`
  - **Parameters:** inclusive IPv4 range bounds.
  - **Returns:** one or more glob ranges covering the IP range.
  - **Raises:** `AddrFormatError` for invalid IPv4 range bounds.

### Nmap target specs

- `valid_nmap_range(spec)`
  - **Parameters:** nmap target-range expression.
  - **Returns:** boolean syntax validity result.
- `iter_nmap_range(spec)`
  - **Parameters:** nmap target-range expression.
  - **Returns:** iterator of `IPAddress` values in target specification order.
  - **Raises:** `AddrFormatError` for malformed nmap target specifications.

## Validation Functions

- `valid_ipv4(addr)`
  - **Parameters:** parseable text input for the target family/type.
  - **Returns:** boolean validity indicator.
- `valid_ipv6(addr)`
  - **Parameters:** parseable text input for the target family/type.
  - **Returns:** boolean validity indicator.
- `valid_mac(addr)`
  - **Parameters:** parseable text input for the target family/type.
  - **Returns:** boolean validity indicator.
- `valid_eui64(addr)`
  - **Parameters:** parseable text input for the target family/type.
  - **Returns:** boolean validity indicator.

## RFC1924 Helpers

- `ipv6_to_base85(ipv6)`
  - **Parameters:** IPv6 address input.
  - **Returns:** 20-character RFC1924 base85 string.
  - **Raises:** `AddrFormatError` for non-IPv6 inputs.
- `base85_to_ipv6(base85)`
  - **Parameters:** 20-character RFC1924 base85 text.
  - **Returns:** decoded IPv6 `IPAddress`.
  - **Raises:** `AddrConversionError` for malformed
    or wrong-length base85 text.

## Registry APIs

### IEEE runtime registration

#### Registry mutators

- `register_oui(prefix, record)`
  - **Parameters:**
    - `prefix`: normalized hex-like prefix accepted in common notations.
    - `record`: object with the fields below.
  - **Returns:** `void`.
  - **Raises:** `AddrFormatError` for invalid prefix
    or invalid record payload.
- `register_iab(prefix, record)`
  - **Parameters:**
    - `prefix`: normalized hex-like prefix accepted in common notations.
    - `record`: object with the fields below.
  - **Returns:** `void`.
  - **Raises:** `AddrFormatError` for invalid prefix
    or invalid record payload.
- `clear_ieee_registries()`
  - **Returns:** `void`.

#### Registry lookups

- `lookup_oui(prefix)`
  - **Parameters:** normalized hex-like prefix.
  - **Returns:** registered record or `null`.
  - **Raises:** `AddrFormatError` for invalid prefix text.
- `lookup_iab(prefix)`
  - **Parameters:** normalized hex-like prefix.
  - **Returns:** registered record or `null`.
  - **Raises:** `AddrFormatError` for invalid prefix text.

#### Record schema

- `org` (required)
- `address` (optional)
- `country` (optional)
- `source` (optional, defaults to `custom`)

### Reachability and info accessors

- `IPAddress.info`
- `IPAddress.is_global()`
- `EUI.info`
- `OUI.registration`
- `IAB.registration`
  - **Returns:** structured registry metadata where available.

## Dialect Exports

### IPv6 dialects

- `ipv6_compact`, `ipv6_full`, `ipv6_verbose`
  - **Type:** dialect classes.
  - **Used by:** `ip.format(dialect)` on `IPAddress` values.
  - **Notes:** mirrors Python netaddr IPv6 formatting dialect behavior.

### MAC/EUI-48 dialects

- `mac_eui48`, `mac_unix`, `mac_unix_expanded`, `mac_cisco`, `mac_bare`,
  `mac_pgsql`
  - **Type:** dialect descriptor objects.
  - **Used by:** `new EUI(addr, dialect)` or `eui.format(dialect)`.

### EUI-64 dialects

- `eui64_base`, `eui64_unix`, `eui64_unix_expanded`, `eui64_cisco`, `eui64_bare`
  - **Type:** dialect descriptor objects.
  - **Used by:** `new EUI(addr, dialect)` or `eui.format(dialect)`.
