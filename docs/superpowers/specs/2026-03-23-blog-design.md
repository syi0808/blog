# Blog Design Spec — syi0808.github.io

## Overview

A personal blog built with Astro 5, deployed on GitHub Pages. Serves as a technical blog, portfolio, and open-source marketing platform (currently for pubm). English-only. Design follows Zed IDE aesthetics — minimal, restrained, refined, technical, trustworthy. SEO and GEO are top priorities.

## Tech Stack

- **Framework**: Astro 5 + Content Collections
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Comments**: giscus (GitHub Discussions)
- **Deployment**: GitHub Actions → GitHub Pages
- **Syntax Highlighting**: Shiki (Astro built-in)
- **Domain**: `syi0808.github.io`

## Architecture

```
blog/
├── src/
│   ├── content/
│   │   ├── blog/               # Markdown posts (.md)
│   │   └── config.ts           # Content Collections schema
│   ├── components/             # Reusable components
│   ├── layouts/
│   │   ├── BaseLayout.astro    # HTML shell, meta, scripts
│   │   └── BlogPostLayout.astro
│   ├── pages/
│   │   ├── index.astro         # Home
│   │   ├── blog/
│   │   │   ├── index.astro     # Post list
│   │   │   └── [...slug].astro # Post detail
│   │   ├── tags/
│   │   │   ├── index.astro     # All tags
│   │   │   └── [tag].astro     # Posts by tag
│   │   └── rss.xml.ts          # RSS feed
│   └── styles/                 # Global styles
├── public/                     # Static assets (favicon, og-image)
├── astro.config.mjs
└── package.json
```

## Pages

### Home (`/`)
- Brief intro — name + one-line bio
- Recent posts (3-5 items)
- Project highlights (pinned projects like pubm, 1-2 items) — data from `src/data/projects.ts`

### Blog List (`/blog`)
- All posts in reverse chronological order
- Each item: title + date + tags + one-line description
- Start as full list; paginate at 20+ posts (10 per page, `/blog/page/[n]`)

### Post Detail (`/blog/[slug]`)
- Title + date + reading time + tags
- Table of contents (h2/h3 based)
- Post body
- Related posts (2-3, tag-based)
- Previous/next post navigation
- giscus comments

### Tags (`/tags`)
- All tags with post count per tag

### Posts by Tag (`/tags/[tag]`)
- Post list filtered by tag (same layout as blog list)

### Common Elements
- **Header**: Site name (logo) + Nav (Home, Blog, Tags) + dark mode toggle
- **Footer**: Minimal — GitHub link, RSS link

### 404 Page (`/404`)
- Custom 404 with site header/footer, brief message, link back to home

## Design System

### Color Palette

**Light mode (default appearance, actual default follows system preference):**
- Background: `#fafafa`
- Text: `#2c2c2c`
- Sub text: `#737373`
- Border: `#e5e5e5`
- Primary: `#6b7280` (low-saturation slate)
- Primary hover: `#4b5563`

**Dark mode:**
- Background: `#1a1a1a`
- Text: `#d4d4d4`
- Sub text: `#8b8b8b`
- Border: `#2e2e2e`
- Primary: `#9ca3af`
- Primary hover: `#d1d5db`

Theme toggle in header, preference saved to localStorage. Default: system preference via `prefers-color-scheme`. Inline `<script>` in `<head>` to apply saved theme before paint (prevents flash of wrong theme).

**Accessibility**: All text/background combinations meet WCAG AA contrast (4.5:1 minimum). Sub text colors adjusted if needed for smaller UI elements. Focus states visible on all interactive elements. Skip-nav link for keyboard users.

### Typography
- Body: `Inter` (system font fallback)
- Code: `JetBrains Mono` (ligature support, system monospace fallback)
- Body size: `18px`
- Line height: `1.75`
- Max content width: `720px`

### Layout Principles
- Generous whitespace — content has room to breathe
- Minimal decoration — no shadows, no gradients
- Borders are subtle lines or spacing only
- Navigation: top-fixed, minimal items

### Code Blocks
- Shiki syntax highlighting
- Light mode: `github-light` theme / Dark mode: `github-dark` theme
- Filename/language display
- Copy button

### Post List Style
- No cards — list format with title + date + tags + description
- Subtle hover effect (slight color shift)

## Content Schema (Frontmatter)

```yaml
---
title: "How pubm simplifies package publishing"
description: "A guide to streamlined npm publishing with pubm"
date: 2026-03-23
updatedDate: 2026-03-24        # optional
tags: ["open-source", "npm", "pubm"]
draft: false                    # true = excluded from production build
image: "./cover.png"            # optional, used as OG image
---
```

## Auto-generated Elements
- Table of contents (h2/h3)
- Estimated reading time
- Related posts (tag-based, 2-3 at post bottom)
- Previous/next post navigation

## SEO Strategy

### Build-time Generation
- `sitemap.xml` — `@astrojs/sitemap`
- `robots.txt` — crawler rules
- `rss.xml` — RSS feed (full post content)

### Per-page Metadata
- `<title>` and `<meta name="description">` from frontmatter
- Open Graph: `og:title`, `og:description`, `og:image`, `og:type`
- Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`
- Canonical URL per page

### Structured Data (JSON-LD)
- `BlogPosting` — author, datePublished, dateModified, headline, description
- `WebSite` — site-level info
- `Person` — author info
- `BreadcrumbList` — navigation path

## GEO (Generative Engine Optimization)

- Semantic HTML: `<article>`, `<section>`, `<header>`, `<nav>`
- Clear heading hierarchy: h1 → h2 → h3
- Summary/key points at top of each post (AI snippet extraction)
- Optional FAQ structured data via frontmatter
- Language tags on code blocks
- Internal linking via related posts (tag-based)

## Performance
- Static HTML, minimal JS → Lighthouse 100 target
- Image optimization: Astro `<Image>` (WebP, lazy loading, srcset)
- Font: `font-display: swap`, system font priority

## Deployment
- **CI**: GitHub Actions
- **Package manager**: pnpm
- **Node**: v22 LTS
- **Caching**: pnpm store cached in CI
- **OG image fallback**: Default site-wide OG image at `public/og-default.png` when post has no `image` field
- **Analytics**: Out of scope for initial version
