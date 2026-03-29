# GitHub Actions: Test and Release Workflow for Synthicide

This document explains the automated test and release process for the Synthicide FoundryVTT system using GitHub Actions and semantic-release.

---

## Overview

- **Automated Release (on Push):** Releases are created automatically when you push to the `main` or `beta` branches, but **only if your commits follow the Conventional Commits format** (see below).
- **Automated Versioning:** Version numbers, tags, changelogs, and manifest updates are all handled by semantic-release based on commit messages.
- **No `v` Prefix:** Release tags are in the format `1.2.3` (not `v1.2.3`), which is compatible with FoundryVTT.
- **Release Assets:** semantic-release can be configured to upload assets (e.g., system.json, zip) to each GitHub release for user and FVTT convenience.
- **Validation:** Ensure your manifest and build are correct before pushing to main or beta.
- **Pre-Release Support:** Use commit messages or branch configuration to control pre-releases if needed.

---

## Conventional Commits: How Releases Are Triggered

**semantic-release** uses [Conventional Commits](https://www.conventionalcommits.org/) to determine when and how to create a new release. Only pushes or PR merges that include at least one commit with a Conventional Commit message will trigger a new release.

### Basic Format
```
type(scope?): subject
```
- **type**: The kind of change (see below)
- **scope**: (optional) The part of the codebase affected
- **subject**: A short description

### Common Types
- `feat`: A new feature (triggers a minor version bump)
- `fix`: A bug fix (triggers a patch version bump)
- `chore`: Maintenance, build, or tooling changes (does not trigger a release by default)
- `docs`: Documentation changes (does not trigger a release by default)
- `refactor`, `perf`, `test`, etc.: Other types (see the Conventional Commits spec)

### Examples
```
feat: add new dice roller
fix: correct NPC initiative bug
chore(ci): update GitHub Actions workflow
```

### Breaking Changes
To trigger a major version bump, include `BREAKING CHANGE:` in the commit body:
```
feat!: overhaul combat system

BREAKING CHANGE: Combat system is now fully rewritten.
```

### Summary Table
| Commit Message Example         | Release Triggered | Version Bump |
|-------------------------------|-------------------|--------------|
| feat: add new feature         | Yes               | Minor        |
| fix: correct bug              | Yes               | Patch        |
| feat!: breaking API change    | Yes               | Major        |
| docs: update README           | No                | None         |
| chore: update build script    | No                | None         |

---

## How It Works

1. Make sure your commits use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add X`, `fix: bug Y`).
2. Push your changes to the `main` or `beta` branch.
3. The workflow will run automatically and create a release **only if there are qualifying Conventional Commits since the last release**.
4. Check the **Releases** tab on GitHub for the new release.

---

## Best Practices for FoundryVTT Releases

- **Manifest URL**: In `system.json`, set the `manifest` field to:
  ```
  https://github.com/youruser/yourrepo/releases/latest/download/system.json
  ```
- **Download URL**: In `system.json`, set the `download` field to:
  ```
  https://github.com/youruser/yourrepo/releases/download/<version>/synthicide.zip
  ```
- **Version Consistency**: semantic-release ensures the `version` field in `system.json` matches the release/tag version.
- **Release Attachments**: Configure semantic-release to upload both the manifest and the zip archive to each GitHub release.
- **Release Notes**: semantic-release generates changelogs and release notes automatically.
- **Validation**: Validate your manifest and build before pushing to main or beta.

---

## Node.js 24 Warning Fix

GitHub Actions is deprecating Node.js 20 for actions. To avoid warnings and ensure compatibility, add this to your workflow's `env:` block:

```
env:
  node_version: 24
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

This will force all actions to use Node.js 24.

---

## Configuration Files

- **Workflow:** `.github/workflows/test-release.yml`
- **Semantic Release:** `.releaserc`

---

## Troubleshooting
- Make sure your commit messages follow the Conventional Commits format for best results with semantic-release.
- Ensure `GH_TOKEN` is available in your repository secrets (set by default on GitHub).
- For FoundryVTT API submission, you will need to add `FOUNDRYVTT_RELEASE_TOKEN` to your repository secrets.
- Validate your manifest with [jsonlint.com](https://jsonlint.com/) if you encounter issues.

---

For more details, see the comments in the workflow and `.releaserc` files, or ask for help!
