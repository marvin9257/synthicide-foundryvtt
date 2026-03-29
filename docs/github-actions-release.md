# GitHub Actions: Test and Release Workflow for Synthicide

This document explains the automated test and release process for the Synthicide FoundryVTT system using GitHub Actions and semantic-release.

---

## Overview

- **Manual Release (with Automation):** Releases are created when manually triggered from the GitHub Actions UI. When run, the workflow uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/) to fully automate versioning, changelog, manifest update, and GitHub release creation.
- **Automated Versioning:** Version numbers, tags, changelogs, and manifest updates are all handled by semantic-release based on commit messages.
- **No `v` Prefix:** Release tags are in the format `1.2.3` (not `v1.2.3`), which is compatible with FoundryVTT.
- **Release Assets:** semantic-release can be configured to upload assets (e.g., system.json, zip) to each GitHub release for user and FVTT convenience.
- **Validation:** Ensure your manifest and build are correct before running the workflow.
- **Pre-Release Support:** Use commit messages or branch configuration to control pre-releases if needed.

---

## How It Works

### 1. Manual Release Job
- Only runs when you manually trigger it from the GitHub Actions UI ("Run workflow").
- Steps:
  1. Installs dependencies.
  2. Installs semantic-release and plugins.
  3. Runs semantic-release, which:
     - Analyzes commit messages to determine the next version.
     - Updates `CHANGELOG.md` and `system.json` with the new version.
     - Commits those changes.
     - Creates a GitHub release and tag (e.g., `1.2.3`).
     - (Optional) Uploads release assets if configured.

---

## Versioning and Tagging

- **Automated:** semantic-release determines and bumps the version, creates the tag, updates the changelog and manifest, and creates the GitHub release.
- **No manual tagging or manifest editing needed.**
- Tags will be like `1.2.3` (no `v` prefix).

---

## How to Use

1. Go to the **Actions** tab on GitHub.
2. Select the **Test and (Manual) Release** workflow.
3. Click **Run workflow** (top right) and confirm.
4. The workflow will:
   - Install dependencies
   - Install semantic-release and plugins
   - Run semantic-release to handle versioning, changelog, manifest, and release

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
- **Validation**: Validate your manifest and build before running the workflow.

---

## Configuration Files

- **Workflow:** `.github/workflows/test-release.yml`
- **Semantic Release:** `.releaserc`

---

## Troubleshooting
- Make sure your commit messages follow the Conventional Commits format for best results with semantic-release.
- Ensure `GITHUB_TOKEN` is available in your repository secrets (set by default on GitHub).
- For FoundryVTT API submission, you will need to add `FOUNDRYVTT_RELEASE_TOKEN` to your repository secrets.
- Validate your manifest with [jsonlint.com](https://jsonlint.com/) if you encounter issues.

---

For more details, see the comments in the workflow and `.releaserc` files, or ask for help!
