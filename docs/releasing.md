# Releasing Packages

This repository uses [Changesets](https://github.com/changesets/changesets) to manage semantic versioning, changelogs, and npm publishing for `@alesha-nov/*` packages.

## Prerequisites

- `NPM_TOKEN` repository secret configured with npm automation token that can publish `@alesha-nov/*`
- GitHub Actions enabled for this repository

## Versioning Strategy

- **Independent versioning** per package (not lockstep)
- `patch`: bug fix / non-breaking internals
- `minor`: backward-compatible feature
- `major`: breaking API changes
- Keep `0.x` while APIs stabilize, then graduate to `1.0.0`

## Local Workflow

1. Add code changes in the relevant package(s).
2. Create a changeset:

```bash
bun run changeset
```

3. Commit code + generated `.changeset/*.md` file.
4. Open and merge PR to `main`.

## Release Automation

On every push to `main`, `.github/workflows/release.yml` runs `changesets/action`:

1. If there are unpublished changesets, it opens or updates a **Version Packages** PR.
2. When the version PR is merged, the workflow publishes changed packages to npm and creates git tags.

## Useful Commands

```bash
# Create a changeset entry
bun run changeset

# Apply version bumps and changelogs
bun run version-packages

# Publish packages (usually done by CI)
bun run release
```
