# Maintainers

Use this guide when you are handling release, publishing, and repository
operations.

If you only need local development setup, start with
[Contributing](contributing.md). If you are consuming the package in an app,
use [Getting Started](getting-started.md).

## Release Paths

### Automated path (default)

Use CI/CD automation for normal releases.

- Runbook: [CI/CD and Release](automation-release.md)
- Trigger model: merge/push to `main` with Conventional Commits
- Outcomes: semantic versioning, GitHub Release assets, npm publish

### Manual fallback path (exception only)

Use manual publishing only when automation is unavailable or blocked.

- Runbook: [Manual Publish & Release (Fallback)](manual-publish.md)
- Typical reasons: CI outage, temporary token/permission issue, urgent hotfix

## Maintainer Checklist

- Confirm `main` branch protections and required checks are healthy.
- Confirm `NPM_TOKEN` and workflow permissions are valid.
- Prefer automated releases; use manual fallback only when necessary.
- Confirm release artifacts and npm package include `LICENSE`, `NOTICE`, and
  `THIRD_PARTY_NOTICES.md`.
- After any release, verify npm package, GitHub Release assets, and docs health.

## Related Docs

- Contributor workflows: [Contributing](contributing.md)
- Release automation details: [CI/CD and Release](automation-release.md)
- Manual release fallback: [Manual Publish & Release (Fallback)](manual-publish.md)
