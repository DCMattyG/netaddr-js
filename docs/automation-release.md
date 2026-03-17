# CI/CD, Releases, and Publishing

This project uses GitHub Actions + semantic-release for automated versioning,
GitHub Releases, and npm publishing. Docs + playground are published by GitHub
Pages using the dedicated `pages.yml` workflow artifact.

Use this guide when you are operating automated release and publish workflows
for `netaddr-js`.

Need an overview of maintainer operations? See [Maintainers](maintainers.md).

If you need to publish outside GitHub Actions, use
[Manual Publish & Release (Fallback)](manual-publish.md).

## Workflow overview

### PR validation workflow (`ci.yml`)

- Trigger: pull requests targeting `main`
- Steps: checkout, `npm ci`, `npm run lint:md`, `npm test`
- Purpose: gate merges with a green build/test signal

### Release and npm publish workflow (`release.yml`)

- Trigger: push to `main` (typically after PR merge)
- Steps:
  - install dependencies
  - refresh bundled IANA/IEEE data
  - run tests
  - run semantic-release
- Outputs:
  - refreshed data committed back to `main` (`src/data/iana.js`, `src/data/ieee.js`)
  - semantic version increment (based on Conventional Commits)
  - release asset build after versioning (`dist/*.tgz`, `dist/*.zip`)
  - GitHub Release with attached assets
  - npm package publish
  - changelog + version metadata updates committed back

### Docs and playground Pages workflow (`pages.yml`)

- Trigger: pushes to `main` affecting docs/playground/src build inputs,
  published releases, or manual workflow dispatch
- Steps:
  - install dependencies
  - build Pages artifact via `npm run build:pages`
  - upload `.site` artifact
  - deploy with `actions/deploy-pages`
- Outputs:
  - docs at site root (`/`)
  - playground at `/playground/`
  - browser bundle generated during workflow only (not committed to repo)

## Required repository settings

### Branch protection (recommended)

Protect `main` and require:

- PR reviews
- status check: `CI / test`
- no direct pushes (except automation)

### GitHub Pages

In repository settings:

- Pages -> Build and deployment -> Source: GitHub Actions

### npm token

Create an npm automation token and add it as repository secret:

- `NPM_TOKEN`

Also ensure package name/access is valid for your npm org/account.

## Commit message conventions

semantic-release uses Conventional Commits. Examples:

- `feat(ip): add ipv4 mapped canonical conversion` -> minor release
- `fix(cidr): correct hostmask parsing edge case` -> patch release
- `feat!: remove deprecated parser path` + breaking footer -> major release

If commits are not conventional, no release may be produced.

Cross-reference:

- semantic-release docs: <https://semantic-release.gitbook.io/semantic-release/>
- Commit Analyzer plugin: <https://github.com/semantic-release/commit-analyzer>
- Conventional Commits specification:
  <https://www.conventionalcommits.org/en/v1.0.0/>

## Release assets

The release workflow attaches:

- `dist/*.tgz` (npm pack tarball)
- `dist/*.zip` (source/docs/workflow bundle including `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.md`)

## Troubleshooting

### Release not created

- Verify commit messages are Conventional Commit compliant.
- Verify the workflow has `contents: write` permission.
- Verify semantic-release config in `.releaserc.json`.

### npm publish failed

- Verify `NPM_TOKEN` exists and has publish rights.
- Confirm package name is available and correct.
- Check npm 2FA/automation-token policy.
- If CI is unavailable, follow [Manual Publish & Release (Fallback)](manual-publish.md).

### Pages not updating

- Verify pages workflow triggers include your changed files.
- Verify Pages source is set to `GitHub Actions` in repo settings.
- Inspect the `Pages` workflow run for build/deploy failures.
- Ensure `docs/index.html` and `docs/.nojekyll` are present.

### Attribution files missing from release assets

- Verify the release zip command includes `LICENSE`, `NOTICE`, and
  `THIRD_PARTY_NOTICES.md`.
- Run `npm pack --dry-run` locally and confirm legal files are present.
