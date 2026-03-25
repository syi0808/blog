---
title: "Manual Publishing vs pubm: The Reality of npm + JSR Multi-Registry Releases"
description: "Why publishing to npm and JSR manually breaks in predictable ways, how existing tools fall short, and what pubm does differently with atomic rollback."
date: 2026-03-25
tags: ["npm", "jsr", "javascript", "typescript", "opensource", "pubm", "ci-cd"]
draft: false
---

You're cutting a release. You run `npm version patch`, execute `npm publish`, watch the success message scroll past, then run `npx jsr publish`. JSR rejects the package. A slow types violation.

npm has `1.2.4`. JSR is still on `1.2.3`. Your `package.json` says `1.2.4` and that commit is already tagged. You have three choices: deprecate the npm release, burn a `1.2.5` that fixes nothing, or leave the registries permanently out of sync.

This is the core problem with multi-registry npm and JSR publishing today: the two registries have no shared tooling, no coordinated auth flow, and no rollback mechanism. You're duct-taping two independent operations together and hoping both succeed.

---

## Why JSR Matters Now

JSR launched open beta in early 2024, built by the Deno team as a TypeScript-first alternative to npm. The growth has been fast. In June 2024, JSR was seeing roughly 250 new packages per week. By January 2025, that number had risen to 400 per week.

The package list tells a clearer story than the numbers. The OpenAI JavaScript SDK published to JSR in January 2025 as `@openai/openai`. Hono published `@hono/hono` in June 2024. Deno's standard library moved entirely to JSR. Valibot is there. These are libraries with serious production usage, not experimental adopters testing the waters.

JSR fills real gaps that npm has never addressed, while npm's 2.5 million packages and 250 billion downloads per 30 days continue growing on their own track:

- You publish `.ts` source directly. JSR handles transpilation.
- API documentation is auto-generated from your TypeScript types and versioned per release.
- JSR Score gives contributors a concrete quality checklist.
- CI publishing uses OIDC tokens instead of long-lived secrets.
- Packages install fine with npm, pnpm, yarn, and bun.

As Theo Browne put it: "I can't honestly remember the last time the npm registry shipped a meaningful new feature." JSR has a different focus entirely, and it's finding an audience.

If your library targets TypeScript developers, shipping to JSR is increasingly an expectation.

---

## Manual Publishing: What It Actually Looks Like

Here is the real 8-step workflow for publishing a package to both npm and JSR manually:

```bash
# 1. Bump version in package.json
npm version patch

# 2. Manually update jsr.json to match (npm version does NOT touch this file)
# Edit jsr.json: "version": "1.2.4"

# 3. Run tests
npm test

# 4. Build
npm run build

# 5. Publish to npm
npm publish

# 6. Publish to JSR
npx jsr publish

# 7. Tag the release
git tag v1.2.4

# 8. Push
git push origin main --tags
```

Step 2 is the trap. `npm version` modifies `package.json`, creates a git commit, and optionally a tag. It does not touch `jsr.json`. That file is outside npm's awareness entirely. If you forget to update it manually, you publish mismatched versions: npm gets `1.2.4`, JSR gets `1.2.3` wrapped in a `1.2.3` manifest that now holds `1.2.4` code.

Three failure scenarios happen regularly in practice:

**Partial publish.** npm accepts `1.2.4`. JSR fails due to a "slow types" violation (a JSR-specific TypeScript check). npm's unpublish window is 72 hours and leaves behind a tombstone. You cannot republish `1.2.4` to npm. Your registries are now permanently out of step unless you burn a patch version.

**Auth failure mid-flow.** Your JSR token expired last week. You don't discover this until step 6, after npm already has the release. You're authenticated to npm but not JSR. The release is half done.

**Version drift over time.** You publish to npm consistently but skip JSR occasionally because the auth setup is tedious. Over months, JSR falls two or three versions behind. Users who install from JSR get stale code and file bugs against a version you've already patched.

The Changesets maintainers acknowledged this problem explicitly in issue #1717 (August 2025): "`changeset publish` currently only supports `npm publish`," and a contributor noted that "having official guidance or hooks for this would reduce the amount of custom scripting needed in CI."

---

## Why Existing Tools Don't Solve This

The tools you already use cannot handle multi-registry publishing.

| Tool | Weekly Downloads | JSR Support | Multi-Registry | Rollback |
|---|---|---|---|---|
| semantic-release | 2.44M | Community plugin only | No | No |
| release-it | 815K | None | No | No |
| np | 143K | None | No | npm only |
| Changesets | — | None | No | No |
| pubm | new | Native | Yes (npm + JSR + crates.io) | Yes, full atomic |

semantic-release is the closest to feature-complete, but its JSR support depends on a community plugin outside the core project. You configure it, it breaks when the plugin lags behind JSR API changes, you debug it, repeat.

release-it has no JSR support at the time of writing. release-please, another popular option, requires manual `extra-files` and `jsonpath` configuration to keep `jsr.json` in sync. That setup works, but it's fragile: the version sync logic lives in config files you maintain, not in the tool.

np is focused entirely on npm. It adds safety checks and a nice interactive prompt, but it has no concept of secondary registries.

JSR didn't exist when these tools were designed, and retrofitting multi-registry support into a tool built around npm's single-registry model is harder than building it from scratch.

pubm is the only tool in this space with native multi-registry support and full atomic rollback built into its core pipeline.

---

## Publishing with pubm

The install and setup is three commands:

```bash
npm i -g pubm
pubm init
pubm
```

`pubm init` runs an interactive wizard that detects your registries, configures your preferred branch, sets up changelog options, and optionally generates a CI workflow file. After that, `pubm` is your release command.

When you run `pubm`, you get an interactive version prompt:

```
? Select version bump:
  patch  (1.2.3 → 1.2.4)
  minor  (1.2.3 → 1.3.0)
❯ major  (1.2.3 → 2.0.0)
  custom
```

If you prefer to skip the prompt: `pubm patch`, `pubm minor`, or `pubm major`.

Here is what the same 8-step manual workflow looks like with pubm:

| Manual Step | pubm Equivalent |
|---|---|
| `npm version patch` | handled internally |
| Edit `jsr.json` manually | handled internally, both files synced atomically |
| `npm test` | runs your `test` script automatically |
| `npm run build` | runs your `build` script automatically |
| `npm publish` | handled internally |
| `npx jsr publish` | handled internally |
| `git tag v1.2.4` | handled internally |
| `git push origin main --tags` | handled internally |

Zero-config registry detection is what makes this work without setup overhead. pubm reads your project's manifest files:

- `package.json` present: publish to npm
- `jsr.json` present: publish to JSR
- Both present: publish to both, automatically

No config file is required. If you need to override defaults — custom registry URLs, pre/post publish hooks, or non-standard script names — `pubm.config.ts` handles that, but you won't need it for a standard npm + JSR setup.

---

## The 8-Step Pipeline

pubm runs its release as an ordered pipeline with a clear responsibility at each step:

1. **Prerequisites check.** Validates you're on the correct branch, your working tree is clean, and your remote is reachable.

2. **Auth pre-validation.** Pings npm and JSR to confirm your credentials are valid and you have publish permission for the specific package name. This happens before any files are modified.

3. **Version and tag prompts.** Interactive version selection. Automatically skipped in CI environments.

4. **Test and build.** Runs your configured `test` and `build` scripts. A test failure aborts the release here, before anything is published.

5. **Version bump.** Updates `package.json` and `jsr.json` to the new version in a single operation, then creates a git commit and tag.

6. **Publish.** Publishes concurrently to npm and JSR.

7. **Post-publish.** Pushes the git tag to your remote and creates a GitHub release draft.

8. **Rollback on failure.** If any prior step fails, pubm reverses everything it completed.

Step 2 is the one that matters most for the partial publish problem. Auth is validated against live registries before pubm touches a single file. You cannot reach the publish step without confirmed credentials. The scenario where npm succeeds and JSR fails due to an expired token is not possible: that failure surfaces in step 2, before the version is bumped, before anything is published, before you have anything to undo.

---

## The Rollback Guarantee

What pubm reverses on failure:

- Deletes any git tags it created
- Reverts the version bump commit
- Restores `package.json` and `jsr.json` to their pre-release versions
- Restores lock files

The result is a clean working tree with no orphaned tags and no version mismatch between your manifest files. You end up exactly where you started.

Compare this with the manual failure scenario:

| Scenario | Manual | pubm |
|---|---|---|
| JSR "slow types" rejection during concurrent publish | npm has 1.2.4, JSR on 1.2.3, git tag exists | Publish-time failure triggers rollback: git tag deleted, version commit reverted, manifests restored |
| Expired JSR token discovered mid-publish | npm published, auth error on JSR, inconsistent state | Caught in step 2 before any publish; nothing to undo |
| Test failure after version bump | Version bumped and tagged, tests never ran | Tests run in step 4; failure before version bump |
| Network failure during JSR publish | Partial upload, unknown registry state | Rollback reverses version commit and tag |

Rollback is tracked per-operation. If a failure occurs before publish, there's nothing to reverse on the registry side. pubm only reverses what it actually completed.

---

## Dry Run and CI

Before setting up CI, validate your full pipeline locally without side effects:

```bash
pubm --dry-run
```

This runs every step, including auth validation, test, build, and a simulated publish, but nothing is written to registries and no git commits are created. The version bump rolls back automatically.

For CI, pubm operates in headless mode. Set your tokens as environment variables and run:

```bash
pubm --mode ci --phase publish
```

A complete GitHub Actions workflow:

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - name: Publish
        run: pubm --mode ci --phase publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}
          JSR_TOKEN: ${{ secrets.JSR_TOKEN }}
```

The `id-token: write` permission enables OIDC-based JSR authentication if you prefer that over a static token.

---

## Three Things pubm Gives You

JSR is growing. The libraries that matter are publishing there. Manual workflows break in predictable ways, and the existing tools weren't designed for this problem.

pubm addresses it at the pipeline level:

1. **Zero-config registry inference.** Having `jsr.json` in your project is enough. No plugin configuration, no extra files.
2. **Auth pre-validation before any side effects.** Credentials are confirmed before files are modified. Partial publishes don't happen.
3. **Atomic rollback on failure.** A failed release leaves your repo in the same state it was before you started.
4. **AI coding agent support.** If you use Claude Code, Codex CLI, or Gemini CLI, `pubm setup-skills` installs agent skills so you can configure and run pubm directly from your agent.

```bash
npm i -g pubm
pubm init
pubm
```

**Docs and full reference:** [pubm docs](https://syi0808.github.io/pubm/)

