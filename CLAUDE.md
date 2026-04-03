# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Dev server at localhost:4321
pnpm build      # Production build to ./dist/
pnpm preview    # Preview production build locally
```

Requires Node.js >=22.12.0 and pnpm 10.x.

## Architecture

Astro 6 static blog deployed to GitHub Pages at https://blog.castle-yein.com.

**Content model:** Markdown files in `src/content/blog/` with frontmatter schema defined in `src/content.config.ts` (title, description, date, tags, draft, image, updatedDate). Draft posts are filtered out in production via `src/lib/posts.ts`.

**Routing:** File-based routes in `src/pages/`. Blog posts use `[...slug].astro` catch-all route. Tags use dynamic `tags/[tag].astro`.

**Layouts:** `BaseLayout.astro` wraps all pages (header, footer, SEO meta, theme script). `BlogPostLayout.astro` extends it for posts (ToC, reading time, prev/next nav, related posts, Giscus comments, JSON-LD).

**Styling:** Tailwind CSS v4 via Vite plugin. Design tokens are CSS custom properties in `src/styles/global.css` with light/dark variants. Dark mode uses `.dark` class on `<html>`, toggled client-side with localStorage persistence.

**SEO constants** (site title, author, URLs) live in `src/lib/seo.ts`.

## Deployment

Push to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`) which builds and deploys to GitHub Pages. Custom domain: `blog.castle-yein.com`.
