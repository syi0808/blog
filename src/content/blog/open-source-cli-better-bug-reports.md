---
title: "Your Open-Source CLI Deserves Better Bug Reports"
description: "Up to 77% of OSS bug reports end up invalid. AI agents now flood security programs with hundreds at once. Why existing tools don't fix this, and what does."
date: 2026-03-27
tags: ["opensource", "cli", "developer-tools", "debugging", "cluvo", "maintainer"]
draft: false
---

You get a GitHub notification. Someone filed an issue titled "it doesn't work." No version. No OS. No stack trace. Just that.

You reply asking for their environment details and a reproduction case. Silence. Three weeks later, the stale bot closes it. Maybe it was a real bug. Maybe it was a misconfigured PATH. You'll never know.

That pattern is happening thousands of times a day across open-source projects. And it's getting worse.

---

## The Bug Report Quality Crisis

Open-source bug reports have always had a signal-to-noise problem. A [study of Mozilla and Firefox bugs](https://www.researchgate.net/publication/220720098_Why_are_Bug_Reports_Invalid) found that between 31% and 77% of reports were classified as invalid or non-reproducible, depending on the project. Duplicate reports add to the pile: depending on the project, [somewhere between 10% and 30% of submitted reports turn out to be duplicates](https://ieeexplore.ieee.org/document/8595210) of existing issues.

That's a lot of triage for reports that go nowhere.

Now add AI-generated reports to the mix. The problem is showing up most acutely in security disclosure and bug bounty programs, where [autonomous agents are flooding projects with hundreds of reports at a time](https://www.axios.com/2026/03/10/ai-agents-spam-the-volunteers-securing-open-source-software). But the underlying dynamic, low-signal reports overwhelming volunteer maintainers, applies to everyday bug reports too.

Curl is the clearest case study. Daniel Stenberg, the project's creator and maintainer, documented the slide in his [January 2026 post](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/): curl's HackerOne program historically confirmed somewhere north of 15% of security reports. By 2025, that rate had dropped below 5%. Fewer than one in twenty reports was real. In Stenberg's words, the project saw "an explosion in AI slop reports combined with a lower quality even in the reports that were not obvious slop." He ended the bounty program's monetary rewards in January 2026 after nearly seven years and over $100,000 paid out. Curl [later reopened HackerOne for security reports without bounties](https://daniel.haxx.se/blog/2026/02/27/security-reports-are-back/), but the signal-to-noise damage was done. The [Register covered the original announcement](https://www.theregister.com/2026/01/21/curl_ends_bug_bounty/).

Curl is a 28-year-old project with a known and active maintainer. Imagine the situation for a two-year-old CLI tool with a single unpaid developer.

The [Tidelift maintainer survey](https://www.sonarsource.com/blog/maintainer-burnout-is-real/) put numbers on what this costs: 58% of maintainers have quit or considered quitting. 44% cite burnout specifically. And a large share of that burnout comes from the time spent not writing code, but triaging low-quality issues.

---

## Why Existing Solutions Don't Fix This

The standard toolkit for managing bug reports is: issue templates, stale bots, and sometimes error monitoring services. None of these address the root problem.

### Issue templates

Nearly all large-scale open-source projects use GitHub issue templates. Templates improve compliance: they can require reproduction links, filter incomplete reports, and auto-close issues that don't meet minimum criteria. But they still rely on user effort, and they can't capture runtime context automatically.

Shelley Vohr, a Node.js and Electron maintainer, [describes the result directly](https://dev.to/codebytere/open-source-the-art-of-the-issue-pnd): "With no actionable steps, I'm forced to make educated guesses, which may harm my ability to understand the underlying causal pathways of the bug." She also notes: "Neglecting to fill out an issue template both ruffles maintainer feathers and results in them needing to ask you for more information - delaying any potential fix."

The structural problem with templates is that they depend entirely on user motivation. When someone's CLI tool is broken and they're frustrated, filling out a structured form carefully is not their top priority.

### Stale bots

Most large open-source projects have adopted a stale bot. A stale bot closes issues that haven't been updated in a set period, usually 60-90 days.

This is symptom treatment. Stale bots reduce the open issue count, but they don't fix the underlying failure: the issue was filed without enough information, the maintainer asked for more, and the reporter never replied. The bug may still exist. The stale bot just makes it invisible.

### Error monitoring services (Sentry, Bugsnag)

These tools are designed for web application operators, not for CLI maintainers distributing a tool to thousands of independent users.

The concern runs deeper than pricing. When you ship a web app, you control the deployment environment and can establish a privacy policy. When you ship a CLI tool, you're asking an SDK to capture data on someone else's machine. What gets collected, where it goes, and whether the user knows about it are all questions your project has to answer. [Sentry's open-source program](https://sentry.io/for/open-source/) exists, but the privacy and control questions remain the same regardless of cost.

Then there's infrastructure. Self-hosted Sentry [requires 4 CPU cores, 16 GB RAM plus 16 GB swap, and 20 GB disk](https://develop.sentry.dev/self-hosted/) at minimum. That's not a realistic ask for a solo maintainer of a 2,000-star CLI tool.

### Telemetry

The obvious alternative is opt-in telemetry. But telemetry [can trigger strong trust and consent concerns](https://posthog.com/blog/open-source-telemetry-ethical) in open-source communities. Homebrew's [GitHub issue #142](https://github.com/Homebrew/brew/issues/142) became an extended community fight when data was sent without explicit permission. Next.js faced similar backlash. The trust cost of adding telemetry to an open-source CLI is real, and for many projects, it's not worth paying.

Russ Cox [proposed a transparent telemetry model for Go](https://research.swtch.com/telemetry-intro) in 2023, where data is collected openly and designed to be non-identifying. It's thoughtful work. It also requires infrastructure, community buy-in, and a level of organizational trust that the Go team has earned over 15 years. Most CLI projects don't have that runway.

---

## There's a Third Option

The current framing treats this as a binary choice: either you use Sentry-style automatic collection (privacy risk, infrastructure burden, community backlash) or you rely on manual bug reports (the broken status quo).

That framing is wrong. It's missing a third option.

The missing path: capture error data locally, sanitize it on-device before the user sees it, let the user review exactly what will be submitted, and then publish a structured report with one confirmation step.

No server. No data leaving the user's machine without review. No infrastructure to maintain. No trust problem.

I've been thinking about this as a tool-building problem, not just a maintainer etiquette problem. If the tooling captures and structures the information at error time, you don't need to convince users to do it manually.

This is the approach [Cluvo](https://github.com/syi0808/cluvo) takes.

---

## How Cluvo Works

Cluvo is an SDK that wraps your CLI's error handling and turns crashes into structured GitHub issues with user consent at every step.

The pipeline is:

1. **Collector**: catches the error and gathers context (error message, stack trace, OS, runtime version, architecture, command args, git SHA)
2. **Sanitizer**: strips credentials, tokens, and private paths before anything is shown to the user
3. **Store**: saves the sanitized report locally
4. **Matcher**: searches your project's existing GitHub issues to detect duplicates before submission
5. **Presenter**: shows the user a preview of exactly what will be submitted, in the terminal
6. **Publisher**: opens a pre-filled GitHub issue via browser, `gh` CLI, GitHub API, or saves to a local file as fallback

The integration takes a few lines:

```typescript
import { Reporter } from "@cluvo/sdk";

const reporter = new Reporter({
  repo: "your-org/your-cli",
  app: { name: "your-cli", version: "1.0.0" },
});

await reporter.wrapCommand(async () => {
  await runCLI();
});
```

From the user's perspective, when something breaks, they see a terminal prompt:

```
✗ Command failed: parse error in config.yaml

A bug report has been prepared. Here's what it contains:
  • OS: macOS 14.3.1 (arm64)
  • Node: v22.14.0
  • Command: your-cli build --watch
  • Error: ParseError: unexpected token at line 23

[Submit to GitHub] [View full report] [Cancel]
```

The user controls submission. Nothing is sent silently. And the report that lands in your GitHub issues includes environment, command, and stack trace by default.

### Core design principles

**Zero-server architecture.** Cluvo has no backend. Reports are published directly to GitHub via the user's own auth (browser session or `gh` CLI token). There's no Cluvo server that sees or stores anything.

**Privacy-safe by default.** The sanitizer runs before the preview. Users see the sanitized version, not the raw error. Common patterns (API keys, tokens, `~/.ssh/` paths, AWS credential patterns) are stripped automatically. You can configure additional sanitization rules.

**Consent-first.** The user sees a preview and explicitly confirms before anything leaves their machine. Opt-out is always one keypress away.

**Fallback chain.** If the browser can't be opened, Cluvo tries the `gh` CLI. If that's not available, it falls back to the GitHub API. If that fails, it saves a markdown file locally with instructions for manual filing.

---

## What This Changes for Maintainers

### Friction asymmetry

The reason bug reports are low quality isn't that users are careless. It's that the cost of filing a good report falls entirely on the user, while the benefit (a fixed bug) may not materialize for months. Cluvo shifts this: the user's burden is one keypress to confirm a pre-filled report. The motivation to get the bug fixed is often enough to clear that bar.

### Structured reports by default

Because the SDK collects environment data automatically, submitted reports include OS, runtime version, command invocation, and stack trace without the user having to type any of it. You stop asking "what version are you on?" in every issue.

### Duplicate detection before submission

The Matcher step runs against your existing GitHub issues before showing the user the submission prompt. If a match is found, the user is told "this looks like it might be related to issue #47" with a link. Duplicate reports are caught before the reporter hits submit.

### Credential leaks caught before they happen

A user pastes their deploy command into a bug report. It includes a database URL with credentials. That URL is now in your public issue tracker. Cluvo's built-in sanitizer strips common patterns (tokens, API keys, home directory paths) before the user sees the preview. You can add custom rules for project-specific patterns. It's not a guarantee that nothing sensitive slips through, but the defaults catch the most common leaks.

### No infrastructure, no maintenance burden

There's no server to host, monitor, or secure. The SDK is a dependency you add to your project, not an infrastructure commitment.

---

## Get Started

```bash
npm install @cluvo/sdk
```

Source and documentation: [github.com/syi0808/cluvo](https://github.com/syi0808/cluvo)

If you maintain a CLI and want higher-signal bug reports without standing up infrastructure, Cluvo is one approach worth trying.

