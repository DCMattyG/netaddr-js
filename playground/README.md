# Playground Prototype

Use this example when you want a quick, dependency-light demo app for `netaddr-js` behavior.

## What This Helps You Do

- Explore `netaddr-js` behavior by task area (address, network, CIDR, range,
  set operations, EUI, validators, and splitter workflows).
- Use section-level presets to load realistic examples quickly.
- Run focused actions in each mode without unrelated inputs getting in the way.
- See the exact command trace for each action (commands, inputs, and output)
  from the bottom command history dock.

## Quick Start

From this directory:

```bash
cd playground
npm run serve
```

Then open:

```text
http://localhost:4173/playground/
```

## How To Use It

- Pick a lab area from the sidebar.
- Use the `Quick Presets` panel at the top of that section if you want starter
  values.
- Choose a mode tab, edit inputs, then run the action button for that mode.
- Open `Command History` at the bottom to see the command mapping for each
  click.
- Use per-block `Copy` buttons in command history to copy just the command,
  inputs, or output you care about.

## Feature Coverage Map

The playground includes dedicated labs for most exported API groups:

- `IPAddress`: parsing, flags, formatting, reverse DNS, conversion,
  classification, IANA info.
- `IPNetwork`: host-bit behavior, containment/overlap checks,
  subnet/supernet, host iteration.
- CIDR helpers: `cidr_merge`, `cidr_exclude`, `spanning_cidr`,
  `largest_matching_cidr`, `smallest_matching_cidr`, `all_matching_cidrs`,
  `iter_unique_ips`, `cidr_abbrev_to_verbose`, `expand_partial_ipv4_address`.
- `IPRange` and transforms: range decomposition and range-to-glob helpers.
- Glob and nmap helpers: `IPGlob`, `valid_glob`, `glob_to_*`,
  `cidr_to_glob`, `valid_nmap_range`, `iter_nmap_range`.
- `IPSet`: union, intersection, difference, symmetric-difference,
  contiguity checks.
- EUI/MAC and registries: `EUI`, `OUI`, `IAB`, MAC/EUI-64 dialects,
  runtime `register_*`/`lookup_*`/`clear_ieee_registries`.
- RFC1924: `ipv6_to_base85` and `base85_to_ipv6` roundtrip.
- Validators: `valid_ipv4`, `valid_ipv6`, `valid_mac`, `valid_eui64`.
- `SubnetSplitter`: extraction and remaining pool inspection.

## Troubleshooting

- If the page is blank or modules fail to load, confirm you started the server
  from `playground` using `npm run serve`.
- Open the app at `http://localhost:4173/playground/` (not by opening
  `index.html` directly from disk).
- If port `4173` is busy, stop the process using it and rerun `npm run serve`.
