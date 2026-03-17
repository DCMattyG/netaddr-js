# TODO

This checklist covers the remaining **manual actions** to fully enable CI/CD,
GitHub Pages docs, semantic releases, and npm publishing.

## Required before first release

Complete these before expecting automated release + npm publish to work.

### 1) GitHub repository settings

- [ ] **Enable GitHub Pages from branch docs**
  - Repo Settings → Pages → Build and deployment → Source: **Deploy from a branch**.
  - Branch: `main`, folder: `/docs`.
- [ ] **Enable workflow write permissions**
  - Repo Settings → Actions → General → Workflow permissions: **Read and write permissions**.
  - Required so semantic-release can commit changelog/version updates.
- [ ] **Protect `main` branch**
  - Require pull request reviews.
  - Require status checks to pass before merge.
  - Include required check: **CI / test**.
  - Restrict direct pushes to `main` (recommended).
- [ ] **Allow GitHub Actions to bypass branch protection for release commit**
  (if needed by your policy)
  - Otherwise semantic-release may fail when writing `CHANGELOG.md` / version bumps.

### 2) GitHub secrets and tokens

- [ ] Add repository secret: **NPM_TOKEN**
  - Create npm automation token from npm account/org with publish permissions.
  - Store in Repo Settings → Secrets and variables → Actions.
- [ ] Confirm default **GITHUB_TOKEN** has release permissions
  - Already configured in workflow permissions, but validate org-level
    restrictions don’t block releases.

### 3) npm package readiness

- [ ] Confirm package name availability on npm: `netaddr-js`
  - If unavailable, rename in `package.json` before first publish.
- [ ] Add/verify package metadata in `package.json`:
  - `repository`
  - `homepage`
  - `bugs`
  - `author` / `contributors` (optional but recommended)
- [ ] Decide package access mode
  - Public package: default publish is fine.
  - Scoped package: verify org permissions and publish config.

### 4) Semantic release conventions

- [ ] Adopt Conventional Commits team-wide
  - Examples: `feat: ...`, `fix: ...`, `feat!: ...`, `chore: ...`.
  - semantic-release uses commit messages to calculate version bumps.
- [ ] Add PR template reminder for commit style
  - Helps avoid “no release generated” surprises.

### 5) Validate workflows once configured

- [ ] Open a test PR to `main` and confirm CI passes.
- [ ] Merge a PR with a conventional commit (`feat:` or `fix:`)
  - Verify release workflow creates:
    - GitHub Release
    - attached `dist/*.tgz` and `dist/*.zip` assets
    - npm publish
- [ ] Push a docs-only change under `docs/`
  - Confirm GitHub Pages updates the Docsify site from `main` `/docs`.

## Nice to have (recommended hardening)

### Developer experience and operations

- [ ] Set repository “Website” URL to your Pages URL (optional but useful).
- [ ] Share docs entrypoint with contributors: `docs/README.md`.
- [ ] Add badges to root `README.md`
  - CI status
  - npm version
  - GitHub Pages/docs link

### CI/CD hardening

- [ ] Add a **release dry-run** workflow for safe testing of semantic-release logic.
- [ ] Add dependency/security checks in PR workflow
  - `npm audit` (or scheduled security scan)
  - optional dependency update bot.
- [ ] Add CODEOWNERS for workflow/config files.

## Reference files already in repo

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.releaserc.json`
- `docs/automation-release.md`
