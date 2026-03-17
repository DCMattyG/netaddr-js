# AGENTS.md

Guidance for AI coding agents working in `netaddr-js`.

## Scope and Standard

- This file is the single instruction source for automated coding agents.
- Keep guidance here tool-agnostic so it applies across editors, CI bots, and
  AI-assisted code review flows.
- Avoid duplicating the same rules in additional agent-instruction files.

## Mission

- Keep network behavior correct and deterministic.
- Preserve precision-safe `BigInt` math for all IP arithmetic.
- Maintain high conceptual parity with Python `netaddr` while staying idiomatic
  in JavaScript.

## Quick Context

- Language/runtime: JavaScript (ESM), Node.js `>=22.14.0`
- Tests: `node --test` via npm scripts
- Public API entrypoint: `src/index.js`
- Docs site source: `docs/`

## High-Value File Map

- `src/ip.js`: IPAddress/IPNetwork/IPRange core behavior
- `src/ipset.js`: set operations and CIDR aggregation behavior
- `src/eui.js`: MAC/EUI parsing/formatting and derivations
- `src/core.js`: error classes, flags, shared constants
- `src/index.js`: stable exports and aliases
- `test/*.test.js`: behavioral correctness checks
- `test/integration/python-parity.test.js`: Python parity differential checks

## Working Rules

- Prefer small, local changes over broad structural rewrites.
- If changing behavior, add/update tests in the same change.
- Keep aliases stable unless a breaking change is explicitly requested.
- Treat IPv6 precision as non-negotiable: no implicit numeric narrowing.
- Reuse existing error types and messages patterns when possible.

## Behavioral Invariants

- Treat `src/index.js` exports as the public API contract.
- Preserve compatibility aliases and helpers (`IP`, `CIDR`, `MAC`,
  `reverse_dns`, `iter_hosts()`, etc.) unless a breaking change is explicit.
- Preserve deterministic ordering for merge/match style outputs
  (`cidr_merge`, matching CIDR helpers, set/range transforms).
- Keep mixed-family guardrails intact: operations that require one IP family
  should continue rejecting mixed IPv4/IPv6 inputs.
- Preserve current host-bit behavior:
  `IPNetwork('192.0.2.11/24')` keeps host bits in string form, while `.cidr`
  and `NOHOST` produce normalized network addresses.
- Preserve parser flag semantics:
  `INET_ATON` and `INET_PTON` are mutually exclusive, and `ZEROFILL` controls
  leading-zero normalization behavior.

## Error Contract

- Use `AddrFormatError` for invalid text shape, ranges, masks, prefixes,
  and malformed identifiers.
- Use `AddrConversionError` for invalid cross-family or encoding conversions
  (for example IPv6 to IPv4 when not representable, malformed base85 decode).
- Use `NotRegisteredError` when OUI/IAB registry lookups are missing.

## Command Runbook

Install:

```bash
npm install
```

Primary checks:

```bash
npm run lint:md
npm test
npm run test:coverage
```

Parity check (when Python env has `netaddr`):

```bash
PYTHON=.venv/bin/python npm run test:parity
```

Release-equivalent checks:

```bash
npm run test:release
```

## Task Playbooks

### API or behavior change

- Update implementation in `src/`.
- Ensure `src/index.js` exports remain intentional.
- Add/update tests covering IPv4 and IPv6 edge paths.
- Update docs (`docs/how-to-use.md`, `docs/api-reference.md`) for user-visible
  changes.

### Bug fix

- Prefer test-first workflow: add a failing regression test, then fix.
- Confirm no regressions in adjacent behavior (containment, formatting,
  summarization, set/range conversions).

### Registry data refresh

- Use scripts, do not hand-edit generated registry payloads.
- Commands: `npm run update:iana`, `npm run update:ieee`, or
  `npm run update:data`.

### Generated data files

- Treat `src/data/iana.js` and `src/data/ieee.js` as generated artifacts.
- Prefer updating generation logic in `scripts/update-iana.mjs` and
  `scripts/update-ieee.mjs` when behavior/schema needs to change.
- Keep generated file formatting deterministic (JSON pretty-print style from
  scripts) to reduce review noise.

### Parity and fuzz tests

- Keep property/fuzz tests deterministic (seeded RNG, stable assertions).
- Preserve parity test robustness across Python `netaddr` versions, including
  the `ipv6_to_base85` compatibility fallback path.
- Preserve mapped-IPv6 comparison normalization in parity tests to avoid false
  mismatches from textual formatting differences.

## Docs and Information Architecture

- Keep consumer onboarding and maintainer operations clearly separated.
- Preserve polished docs tone and consistent guide framing.
- Keep Python mapping docs framed as conceptual equivalence, not mandatory
  migration.
- If constructor/flag behavior changes, update
  `docs/python-netaddr-mapping.md` gotchas and examples in the same change.

## Legal and Release Guardrails

- Never remove or skip `NOTICE`, `THIRD_PARTY_NOTICES.md`, or `LICENSE`.
- Keep release assumptions compatible with semantic-release and Conventional
  Commits.
- When touching release/publish logic, validate docs under `docs/maintainers.md`
  and `docs/automation-release.md` remain accurate.

## Review Expectations

- Treat reviews as behavior-first: flag correctness risks, regressions, and
  missing test coverage before style feedback.
- For user-visible behavior changes, ensure docs and tests are updated in the
  same pull request.
- Prefer focused diffs and explicit rationale over broad, low-signal churn.
