---
title: "Stop Wrestling with npm publish and cargo publish: A Better Way to Release JS+Rust Projects"
description: "Publishing JS+Rust projects means two auth systems, mismatched versions, and no rollback. Here's why existing tools fall short and how pubm fixes it."
date: 2026-03-26
tags: ["npm", "cargo", "rust", "javascript", "opensource", "pubm", "napi-rs", "ci-cd"]
draft: false
---

You run `npm publish`. It succeeds. You run `cargo publish`. CI reports a timeout while waiting for crates.io to respond. Now you're in an ambiguous state: did the publish actually go through or not? Your `Cargo.toml` already says `1.2.4` and that commit is tagged and pushed.

Here's the problem: crates.io publishes are permanent. You can't delete a crate version, only yank it. If you retry, crates.io may reject it as a duplicate. If you don't, JS and Rust consumers could end up on different versions of what's supposed to be the same release.

It gets worse the more registries you maintain.

---

## The Rust-in-JS Wave Is Real and Growing

Rust-based JS tooling is no longer a niche experiment. The download numbers are hard to ignore:

- [@swc/core](https://npmjs.com/package/@swc/core), [@biomejs/biome](https://npmjs.com/package/@biomejs/biome), [@rspack/core](https://npmjs.com/package/@rspack/core), [oxlint](https://npmjs.com/package/oxlint): each pulling millions of weekly downloads on npm.

[napi-rs](https://github.com/napi-rs/napi-rs), the framework most of these tools are built on, has thousands of GitHub stars and [thousands of dependent projects](https://github.com/napi-rs/napi-rs/network/dependents). Rust has topped the [most admired programming language](https://survey.stackoverflow.co/2024/technology#admired-and-desired) ranking in the Stack Overflow Developer Survey every year since 2016.

Evan You raised [$12.5M in Series A funding](https://voidzero.dev/posts/announcing-voidzero-inc) through VoidZero in October 2025 to build a unified Rust-based JS toolchain. [wasm-pack will be archived in September 2025](https://blog.rust-lang.org/inside-rust/2025/07/21/sunsetting-the-rustwasm-github-org/), and [napi-rs v3 now offers its own WASM compilation support](https://napi.rs/blog/announce-v3) as an alternative. More JS packages are shipping Rust internals.

That growth creates a publish problem that existing tools only partially address.

---

## Why Publishing JS+Rust Is Uniquely Painful

A typical npm-only release is annoying. A JS+Rust release is a different category of problem.

### The platform matrix

napi-rs compiles native binaries for each target platform. One release means building for Linux x64, Linux arm64, macOS x64, macOS arm64, Windows x64, and more. The [napi-rs package-template](https://github.com/napi-rs/package-template) CI file is 385 lines long, covers 13 platform targets, and generates 13+ platform-specific npm packages per release. Each of those packages needs to be published individually.

One version bump. Thirteen-plus npm packages. One crate. Two completely separate auth systems.

### Two auth systems with different semantics

npm uses `NPM_TOKEN`. crates.io uses `CARGO_REGISTRY_TOKEN`. They're configured differently, stored differently, and expire differently. If either token is missing or stale, you discover it mid-release.

npm has an unpublish policy, but it's not a free pass. Even within the 72-hour window, the same `name@version` combination can never be reused once unpublished. crates.io has no unpublish at all. You yank to mark a version as broken, but it stays on the registry forever. Neither registry gives you a clean rollback, and their policies don't align. A failed mid-flight release leaves asymmetric damage across registries.

### The script problem

Here's what a real manual release script looks like for an napi-rs project:

```bash
# 1. Bump version in package.json and all platform packages
npm version patch --workspaces
# 2. Update Cargo.toml version manually
# Edit: version = "1.2.4"
# 3. Update Cargo.lock
cargo update --workspace
# 4. Commit everything
git add -A && git commit -m "chore: release v1.2.4"
# 5. Tag
git tag v1.2.4
# 6. Build all platform targets (this is what CI handles)
# 7. Publish all platform packages to npm
npm publish --workspace packages/linux-x64-gnu
npm publish --workspace packages/linux-arm64-gnu
# ... 12 more
# 8. Publish the main package
npm publish
# 9. Publish to crates.io
cargo publish
# 10. Push tag
git push origin main --tags
```

This doesn't include error handling. Add that and you're at 50+ lines. One developer described the experience in [napi-rs discussion #2087](https://github.com/orgs/napi-rs/discussions/2087): "It took me a while to understand how to publish it to multiple platforms and the docs / tooling of this project needs a lot of improvement about that."

The response from another developer in the same thread: "You just saved my life!"

That exchange captures the state of the tooling. The knowledge is spread across discussions, gists, and blog posts. There's no standard tool.

---

## What Existing Tools Don't Cover

Existing tools solve parts of the release workflow well, but finding one that treats mixed JS+Rust publishing as a single coordinated release is surprisingly difficult.

| Tool | Ecosystem | crates.io Support | Multi-Registry | Rollback |
|---|---|---|---|---|
| cargo-release | Rust only | Yes | No | No |
| release-plz | Rust only, PR-based | Yes | No | No |
| np | npm only | No | No | No |
| release-it | npm only | No | No | No |
| semantic-release | npm only | Plugin (separate config) | Partial | No |
| changesets | npm only | No | No | No |
| release-please | npm + Rust plugin | Limited in mixed workspaces | Partial | No |
| **pubm** | **npm + JSR + crates.io** | **Yes** | **Yes** | **Best-effort** |

semantic-release gets closest with the [semantic-release-cargo](https://github.com/semantic-release-cargo/semantic-release-cargo) community plugin, but you're maintaining two separate config systems that don't share state. If the plugin lags behind crates.io API changes, you debug it yourself.

release-please has a Rust plugin, but [issue #2207](https://github.com/googleapis/release-please/issues/2207) (open since January 2024, triaged to P3) shows that mixed Node.js + Rust workspace scenarios still have gaps. This is not a criticism of those tools. They were designed for one ecosystem, and retrofitting multi-registry support into a single-registry model is a hard problem.

As Orhun Parmaksiz [put it](https://blog.orhun.dev/automated-rust-releases/) while surveying Rust release tooling: "It is still too much manual work + release process is still not fully automated."

---

## How pubm Solves the JS+Rust Publish Problem

[pubm](https://github.com/syi0808/pubm) was built for exactly this scenario. The design premise is that a JS+Rust project should have one release command that handles both ecosystems without manual coordination.

### Zero-config registry detection

pubm reads your project's manifest files and infers what to publish:

- `package.json` present: publish to npm
- `jsr.json` present: publish to JSR
- `Cargo.toml` present: publish to crates.io
- All three present: publish to all three, in one pipeline

No config file is required for a standard setup. pubm detects Cargo workspaces and pnpm/yarn/npm/bun workspaces automatically.

### Preflight checks before anything changes

Before pubm touches a single file, it validates:

- You're on the configured release branch
- Your working tree is clean
- Your auth tokens are valid for every target registry
- You have publish permission for the specific package names

An expired `CARGO_REGISTRY_TOKEN` surfaces here, before the version is bumped, before anything is published. Not mid-flight.

### The publish pipeline

pubm runs releases as an ordered pipeline:

1. Prerequisites check (branch, clean tree, remote reachable)
2. Auth pre-validation against live registries
3. Version prompt (skipped in CI)
4. Test and build
5. Version bump (all manifests synced in one operation, git commit + tag)
6. Publish to all registries
7. Post-publish (push tag, create GitHub release draft)
8. Rollback on any failure

### Best-effort rollback

If any step fails, pubm reverses what it can:

- Deletes any git tags it created
- Reverts the version bump commit
- Restores all manifest files to their pre-release state
- Restores lock files

Your local repository ends up where it started. No orphaned tags, no half-bumped manifests. Registry-side rollback is best-effort: if `cargo publish` already completed before a later step fails, pubm cannot undo that publish (crates.io has no delete API). But your local state stays clean, so you can diagnose and decide what to do next without a corrupted working tree.

### Quick setup

```bash
npm i -g pubm
pubm init
```

`pubm init` runs an interactive wizard that detects your registries, configures your release branch, and optionally generates a CI workflow. After that, releases are one command:

```bash
pubm patch
# or: pubm minor / pubm major / pubm (interactive)
```

---

## Before and After

**Before pubm: a manual JS+Rust release (abbreviated)**

```bash
#!/usr/bin/env bash
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# Check auth
npm whoami || { echo "npm auth failed"; exit 1; }
cargo publish --dry-run || { echo "cargo package validation failed"; exit 1; }

# Bump versions
npm version "$VERSION" --workspaces --no-git-tag-version
npm version "$VERSION" --no-git-tag-version
sed -i "s/^version = .*/version = \"$VERSION\"/" Cargo.toml
cargo update --workspace

# Commit and tag
git add -A
git commit -m "chore: release v$VERSION"
git tag "v$VERSION"

# Publish npm packages (platform packages first)
for pkg in packages/*/; do
  npm publish "$pkg" --access public || {
    echo "Failed to publish $pkg"
    git tag -d "v$VERSION"
    git reset --hard HEAD~1
    exit 1
  }
done
npm publish --access public

# Publish to crates.io
cargo publish || {
  # npm versions already live, can't unpublish
  echo "cargo publish failed. npm packages are already published."
  echo "Manually yank crates.io if needed."
  exit 1
}

git push origin main --tags
echo "Released v$VERSION"
```

That's 50+ lines, and the error handling in the cargo failure case is just a message. You can't unpublish what's already on npm.

**After pubm**

```bash
pubm patch
```

pubm handles every step in the before script, adds preflight auth validation that catches the cargo failure before any publish, and provides best-effort rollback instead of a manual cleanup message.

---

## What pubm Doesn't Solve

No tool can fully undo a completed registry publish. It's worth being upfront about what falls outside pubm's scope:

- **crates.io publish is irreversible.** Once a version lands on crates.io, pubm cannot remove it. At that point, you may choose to yank it manually, while pubm focuses on restoring your local git and manifest state.
- **Registry-side partial success is not fully recoverable.** If npm packages are already live and `cargo publish` fails, pubm rolls back git state but cannot unpublish what's already on npm (same limitation as any other tool).
- **Complex monorepo structures may need additional configuration.** pubm auto-detects standard workspace layouts, but unusual nested or multi-root setups may require explicit configuration in `pubm.config.ts`.

Acknowledging these boundaries is part of the design. pubm focuses on preventing these situations through preflight checks rather than promising to fix them after the fact.

---

## Get Started

The next time `cargo publish` fails halfway through, you won't be staring at mismatched registry versions. If you maintain a project that ships to both npm and crates.io, try pubm:

```bash
npm i -g pubm
pubm init
pubm
```

Full documentation and CI setup guides are at [syi0808.github.io/pubm](https://syi0808.github.io/pubm/guides/quick-start/). The source is on [GitHub](https://github.com/syi0808/pubm).

