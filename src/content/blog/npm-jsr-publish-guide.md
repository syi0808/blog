---
title: "The Complete Guide to Publishing Your npm Package (+ JSR in One Command)"
description: "How to publish packages to npm and JSR simultaneously. Covers the pitfalls of manual publishing and atomic multi-registry releases with pubm."
date: 2026-03-23
tags: ["npm", "jsr", "javascript", "typescript", "opensource", "pubm"]
draft: false
---

# The Complete Guide to Publishing Your npm Package (+ JSR in One Command)

You've finished your library. The API is clean, the tests pass, the README is polished. Time to publish.

If you're shipping a JavaScript or TypeScript library today, "just run `npm publish`" is no longer the full picture. npm is still the dominant registry, but [JSR](https://jsr.io), a newer registry built with TypeScript as a first-class citizen, is growing fast. JSR generates documentation directly from your source types, enforces a quality scoring system, and is gaining traction among Deno users and TypeScript-first developers who want native `.ts` imports. Skipping JSR means a real, growing audience never finds your work.

So you consider the manual approach: bump the version, run tests, build, publish to npm, publish to JSR, create a git tag, push. Seven steps, two auth flows. Fine. Until npm succeeds and JSR fails.

Now your `package.json` says `1.2.4`, npm has `1.2.4`, and JSR is still on `1.2.3`. You're left deciding whether to yank the npm release or burn a `1.2.5` that fixes nothing just to resync the version numbers.

**pubm** was built to solve exactly this problem.

---

## What is pubm?

pubm is a CLI that publishes your package to multiple registries (npm, JSR, and others) in a single command. It infers which registries to target from your existing manifest files, runs your full release pipeline in the correct order, and automatically rolls back everything if any step fails.

---

## The Manual Approach and Where It Breaks

Before getting to the solution, it's worth being honest about what publishing to two registries manually actually looks like:

```bash
npm version patch
npm test
npm run build
npm publish
npx jsr publish        # did I remember to bump the version in jsr.json too?
git tag v1.2.4
git push origin main --tags
```

A few ways this goes wrong in practice:

- You forget to run tests before publishing.
- npm succeeds, but you forget the JSR publish entirely.
- JSR rejects your package because of a slow types check. After npm already accepted it.
- You push the git tag before either registry has confirmed the upload succeeded.

The partial publish scenario is the worst. You now have an inconsistent state across registries and git. pubm prevents all of this by treating the full release as a single atomic operation with automatic rollback.

---

## How pubm Infers Registries

pubm reads your project's manifest files to decide where to publish. No extra configuration needed:

- `package.json` present → publishes to **npm**
- `jsr.json` present → publishes to **JSR**
- Both present → publishes to **both**, automatically

That's it. pubm sees both manifest files and publishes to both registries. **No config file is needed.** `pubm.config.ts` is optional. You only need it if you want to override defaults (custom branch, release asset declarations, plugin configuration, etc.).

---

## Step-by-Step Tutorial

### Step 1: Install pubm

```bash
npm i -g pubm
```

### Step 2: Create a jsr.json

If you're only targeting npm today, adding JSR support requires one file. Create `jsr.json` in your project root alongside `package.json`:

```json
{
  "name": "@your-scope/your-package",
  "version": "1.0.0",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

JSR uses this file to determine your package identity, version, and entry points. The `exports` field points directly to your TypeScript source. JSR handles transpilation on its end.

Make sure the `version` field in `jsr.json` matches the version in your `package.json`. pubm keeps them in sync on every release.

### Step 3: Initialize pubm

```bash
pubm init
```

pubm runs an interactive setup wizard that walks you through package detection, branch configuration, changelog and changesets options, and CI workflow generation.

### Step 4: Run pubm

When you're ready to cut a release:

```bash
pubm
```

pubm walks you through an interactive version prompt:

```
? Select version bump:
  patch  (1.2.3 → 1.2.4)
  minor  (1.2.3 → 1.3.0)
❯ major  (1.2.3 → 2.0.0)
  custom
```

If you already know the bump type, you can pass it directly: `pubm patch`, `pubm minor`, or `pubm major`. But the interactive flow is the default, so there's nothing to memorize.

---

## What Happens When You Run pubm

Here's the exact sequence of operations, in order:

1. **Prerequisites check** — validates that you're on the correct branch, your working tree is clean, and the remote is reachable.
2. **Required conditions check** — pings npm and JSR to confirm credentials are valid and you have publish permissions for the package.
3. **Version/tag prompts** — interactive version selection (automatically skipped in CI environments).
4. **Test & Build** — runs your configured test and build npm scripts. If tests fail, the release aborts before anything is published.
5. **Version bump** — updates `package.json` and `jsr.json` to the new version, creates a git commit and tag.
6. **Publish** — publishes concurrently to npm and JSR.
7. **Post-publish** — pushes the git tag to your remote and creates a GitHub release draft.
8. **Rollback on failure** — if any step fails, pubm reverses everything it managed to do.

The credential check in step 2 is worth highlighting. pubm validates your auth against the live registry before touching any files. You won't get halfway through a release only to discover you're logged into the wrong npm account.

---

## The Rollback Guarantee

pubm's rollback is what makes it safe to use for production releases.

If a failure occurs at any step, pubm automatically reverses everything it has completed up to that point. Specifically, it deletes git tags, reverts the version bump commit, and restores manifest files and lock files. You end up exactly where you started. Clean working tree, no orphaned git tags, no version mismatch.

Rollback is tracked per-operation, so it only reverses what pubm actually managed to complete. If the failure happened before publish, there's nothing to reverse.

For library authors who care about keeping npm and JSR in sync (and you should, since diverging versions confuse users), this guarantee matters.

---

## Working with Coding Agents

pubm has built-in support for AI coding agent integration. You can install skills for Claude Code, Codex CLI, and Gemini CLI with a single command:

```bash
pubm setup-skills
```

Select the agents you want, and pubm fetches the latest skill files from GitHub and installs them into each agent's skill directory automatically. You can also set this up as the final step of the `pubm init` wizard.

Skills that get installed:

- **publish-setup** — initial project configuration (config file generation, CI integration, registry setup)
- **create-plugin** — scaffold new pubm plugin packages

Once skills are installed, you can tell your agent "set up pubm for this project" and it handles the entire initial configuration. No need to dig through documentation manually.

---

## Dry Run Mode: Validate Without Side Effects

Want to validate your release pipeline without actually publishing? Use dry run mode:

```bash
pubm --dry-run
```

This runs every step of the pipeline (prerequisites, auth validation, test, build, version bump, and publish) but without side effects. The version bump rolls back automatically and the publish uses each registry's dry-run mode. It's the ideal sanity check before a real release.

For CI preparation, validating tokens and simulating the full pipeline locally before setting up CI:

```bash
pubm --mode ci --phase prepare
```

---

## CI Support

pubm works in non-interactive environments. Set your registry tokens as environment variables and run:

```bash
pubm --mode ci --phase publish
```

In a GitHub Actions workflow:

```yaml
- name: Publish
  run: pubm --mode ci --phase publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}
    JSR_TOKEN: ${{ secrets.JSR_TOKEN }}
```

The `--mode ci` flag switches to CI mode, and `--phase publish` tells pubm to read the version from the existing package manifest rather than prompting interactively. Authentication is read from environment variables.

---

## Summary

If you're starting a new open source TypeScript library and you want it available to the broadest possible audience, set up npm and JSR from day one. The marginal effort is near zero. One extra JSON file, and pubm handles the rest.

The three things pubm gives you:

1. **Zero-config registry inference** — just having `jsr.json` is enough
2. **Ordered pipeline with pre-publish validation** — auth checked before anything is written
3. **Atomic rollback** — a failed publish leaves nothing behind

```bash
npm i -g pubm
pubm init
pubm
```

Ship your library.

**Docs and full reference:** [pubm docs](https://syi0808.github.io/pubm/)
