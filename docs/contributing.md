# Contributing

Use this guide when working on the `netaddr-js` repository itself.
If you only want to use the package in an application, see
[Getting Started](getting-started.md).

## Prerequisites

- Node.js 22.14+
- npm 9+

## Clone and install

```bash
git clone <your-repo-url>
cd netaddr-js
npm install
```

## Run quality checks

```bash
npm run lint:md
npm test
npm run test:coverage
```

Run strict pre-release checks (requires Python `netaddr` installed):

```bash
npm run test:release
```

Run the Python differential parity test directly:

```bash
PYTHON=.venv/bin/python npm run test:parity
```

Notes:

- `test:parity` sets `REQUIRE_PYTHON_NETADDR=1` and fails if Python `netaddr`
  is unavailable.
- Explicit `PYTHON=...` avoids accidentally using a system interpreter without
  the right package version installed.

## Serve documentation locally

```bash
npm run docs:serve
```

Then open `http://localhost:3000`.

## Refresh bundled registry data

Update both datasets:

```bash
npm run update:data
```

Update one dataset at a time:

```bash
npm run update:iana
npm run update:ieee
```

Note: the release workflow also refreshes these datasets automatically before
running tests and semantic-release on `main`.

## Release workflows

- Maintainer entrypoint: [Maintainers](maintainers.md)
- Automated flow details: [CI/CD and Release](automation-release.md)
- Manual fallback details: [Manual Publish & Release (Fallback)](manual-publish.md)

## Commit message policy (semantic-release)

This repository uses semantic-release with the Conventional Commits preset.
Commit messages on `main` directly determine version bumps.

### Expected release behavior

- `feat(...)` -> minor release
- `fix(...)` -> patch release
- `perf(...)` -> patch release
- `feat!` / `fix!` / `perf!` or a `BREAKING CHANGE:` footer -> major release
- `docs(...)`, `test(...)`, `chore(...)`, `refactor(...)`, `style(...)`,
  `build(...)`, `ci(...)` -> typically no release by themselves

Examples:

- `feat(ip): add ipv4 mapped canonical conversion`
- `fix(cidr): correct hostmask parsing edge case`
- `feat!: remove deprecated parser path`
- `feat(ip)!: simplify parser` with footer `BREAKING CHANGE: removed legacy input mode`

### Merge and PR guidance

- If you squash-merge PRs, the final squash commit title/body must follow
  Conventional Commits.
- If your PR should trigger a release, ensure at least one commit message
  maps to the intended bump level.
- If your PR should not trigger a release, use non-release types such as
  `docs`, `test`, or `chore`.

### Cross-reference

- semantic-release docs: <https://semantic-release.gitbook.io/semantic-release/>
- Commit Analyzer plugin (release rules source):
  <https://github.com/semantic-release/commit-analyzer>
- Conventional Commits specification:
  <https://www.conventionalcommits.org/en/v1.0.0/>

For full automation details, see [CI/CD and Release](automation-release.md).

## GitHub contribution templates

This repository provides templates to keep contribution quality and triage
signal high:

- PR template: `.github/pull_request_template.md`
- Bug report template: `.github/ISSUE_TEMPLATE/bug_report.md`
- Feature request template: `.github/ISSUE_TEMPLATE/feature_request.md`

Please complete template sections fully, especially release impact,
Conventional Commit squash title, and reproduction details.

## Test unpublished package in another app (optional)

Use this when validating local changes in a separate consumer project before
opening or merging a PR.

### Option A: install from packed tarball

From this repository:

```bash
npm pack
```

From your consumer project:

```bash
npm install /path/to/netaddr-js/netaddr-js-0.1.0.tgz
```

### Option B: install from local path

```bash
npm install /path/to/netaddr-js
```

## Coding and testing expectations

- Add or update tests for API behavior changes.
- Keep docs in sync for user-visible changes.
- Prefer focused, minimal PRs over broad refactors.
