# Manual Publish & Release (Fallback)

Use this guide when GitHub Actions release automation is unavailable and you
need to publish manually.

Use this guide when you are performing manual release operations for
`netaddr-js`.

Need an overview of maintainer operations? See [Maintainers](maintainers.md).

If automation is available, prefer the standard CI/CD flow in
[CI/CD and Release](automation-release.md).

## When to use this

- Temporary GitHub Actions outage.
- Temporary secret/token issue in CI.
- Urgent hotfix requiring manual intervention.

If automation is working, prefer the normal merge-to-main semantic-release flow.

## Prerequisites

- npm publish permissions for the package
- local Node/npm environment
- clean git working tree
- ability to push tags to the repository
- optional: GitHub CLI (`gh`) for creating releases from terminal

## Prepare repository state

```bash
git checkout main
git pull --ff-only
npm ci
npm test
```

## Select semantic version bump

Decide patch/minor/major based on change scope.

```bash
npm version patch
# or: npm version minor
# or: npm version major
```

This updates `package.json`, `package-lock.json`, and creates a git tag
(`vX.Y.Z`).

## Build release assets

```bash
mkdir -p dist
npm pack --pack-destination dist
zip -r dist/netaddr-js-release-assets.zip \
  src docs package.json package-lock.json README.md LICENSE NOTICE \
  THIRD_PARTY_NOTICES.md \
  .releaserc.json .github/workflows
```

## Publish to npm

```bash
npm publish --access public --provenance
```

If your package is scoped/private, adjust `--access` accordingly.

## Push commit and tag

```bash
git push origin main
git push origin --tags
```

## Create GitHub Release

### Option A: with GitHub CLI

```bash
VERSION=$(node -p "require('./package.json').version")
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --notes "Manual release for v$VERSION" \
  dist/*.tgz dist/*.zip
```

### Option B: via GitHub UI

1. Go to Releases → Draft a new release.
2. Select tag `vX.Y.Z`.
3. Upload assets from `dist/` (`.tgz` + `.zip`).
4. Publish the release.

## Post-release checks

- Verify package appears on npm with expected version.
- Verify GitHub Release contains both assets.
- Verify distributed artifacts include `LICENSE`, `NOTICE`, and
  `THIRD_PARTY_NOTICES.md`.
- Verify docs site is still healthy.

## Keeping automation consistent after manual release

- Do not rewrite or delete the manual release tag.
- Keep version/tag history linear on `main`.
- semantic-release should pick up from the latest existing tag on next
  automated run.

## Common pitfalls

- Publishing from a dirty working tree.
- Forgetting to push tags after `npm version`.
- Publishing with the wrong package name/access.
- Manual version bump that conflicts with unmerged PR changes.
