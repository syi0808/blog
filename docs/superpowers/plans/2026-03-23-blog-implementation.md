# Blog Implementation Plan — syi0808.github.io

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, SEO/GEO-optimized personal blog with Zed IDE aesthetics, deployed on GitHub Pages.

**Architecture:** Astro 5 static site with Content Collections for Markdown posts, Tailwind CSS 4 for styling, giscus for comments. All pages are statically generated. Theme system supports light/dark with system preference detection.

**Tech Stack:** Astro 5, Tailwind CSS 4, TypeScript, Shiki, giscus, pnpm, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-23-blog-design.md`

---

## File Structure

```
blog/
├── src/
│   ├── content/
│   │   ├── blog/
│   │   │   └── hello-world.md          # Sample post
│   │   └── config.ts                   # Content Collections schema
│   ├── components/
│   │   ├── Header.astro                # Nav + theme toggle
│   │   ├── Footer.astro                # GitHub + RSS links
│   │   ├── PostList.astro              # Reusable post list (blog + tags pages)
│   │   ├── PostMeta.astro              # Date + reading time + tags
│   │   ├── TableOfContents.astro       # TOC from headings
│   │   ├── RelatedPosts.astro          # Tag-based related posts
│   │   ├── PrevNextNav.astro           # Previous/next post links
│   │   ├── Giscus.astro               # Comments widget
│   │   ├── JsonLd.astro               # Structured data (JSON-LD)
│   │   ├── ThemeToggle.astro          # Light/dark mode button
│   │   └── CopyCodeButton.astro       # Code block copy button (client-side)
│   ├── layouts/
│   │   ├── BaseLayout.astro            # HTML shell, fonts, theme script, meta tags
│   │   └── BlogPostLayout.astro        # Post detail wrapper
│   ├── pages/
│   │   ├── index.astro                 # Home
│   │   ├── blog/
│   │   │   ├── index.astro             # Blog list
│   │   │   └── [...slug].astro         # Post detail
│   │   ├── tags/
│   │   │   ├── index.astro             # All tags
│   │   │   └── [tag].astro             # Posts by tag
│   │   ├── rss.xml.ts                  # RSS feed
│   │   └── 404.astro                   # Custom 404
│   ├── data/
│   │   └── projects.ts                 # Pinned projects data
│   ├── lib/
│   │   ├── reading-time.ts             # Reading time calculator
│   │   └── posts.ts                    # Post query helpers (sorted, filtered, related)
│   └── styles/
│       └── global.css                  # Tailwind directives + custom styles
├── public/
│   ├── favicon.svg
│   └── og-default.svg                  # Fallback OG image (SVG placeholder)
├── .github/
│   └── workflows/
│       └── deploy.yml                  # GitHub Actions → GitHub Pages
├── astro.config.mjs
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/styles/global.css`

- [ ] **Step 1: Initialize Astro project with pnpm**

```bash
pnpm create astro@latest . --template minimal --typescript strict --install --no-git
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add @astrojs/sitemap @astrojs/rss
pnpm add -D @tailwindcss/vite tailwindcss
```

- [ ] **Step 3: Configure Astro**

Replace `astro.config.mjs` with:

```js
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://syi0808.github.io",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
```

- [ ] **Step 4: Create global CSS**

Create `src/styles/global.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

/* Light mode (default) — CSS custom properties, not @theme tokens */
:root {
  --color-bg: #fafafa;
  --color-text: #2c2c2c;
  --color-text-sub: #737373;
  --color-border: #e5e5e5;
  --color-primary: #6b7280;
  --color-primary-hover: #4b5563;
}

/* Dark mode overrides */
.dark {
  --color-bg: #1a1a1a;
  --color-text: #d4d4d4;
  --color-text-sub: #8b8b8b;
  --color-border: #2e2e2e;
  --color-primary: #9ca3af;
  --color-primary-hover: #d1d5db;
}

@layer base {
  html {
    font-family: var(--font-sans);
    font-size: 18px;
    line-height: 1.75;
    color: var(--color-text);
    background-color: var(--color-bg);
  }
}
```

- [ ] **Step 5: Verify dev server starts**

```bash
pnpm dev
```

Expected: Dev server starts at `localhost:4321` without errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Astro project with Tailwind CSS 4"
```

---

## Task 2: Base Layout + Theme System

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/ThemeToggle.astro`

- [ ] **Step 1: Create BaseLayout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
interface Props {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  publishedDate?: string;
  modifiedDate?: string;
}

import "../styles/global.css";

const {
  title,
  description,
  image = "/og-default.svg",
  type = "website",
  publishedDate,
  modifiedDate,
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const ogImageURL = new URL(image, Astro.site);
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <link rel="alternate" type="application/rss+xml" title="syi0808's blog" href="/rss.xml" />
    <link rel="canonical" href={canonicalURL} />

    <title>{title}</title>
    <meta name="description" content={description} />

    <!-- Open Graph -->
    <meta property="og:type" content={type} />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImageURL} />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImageURL} />

    {publishedDate && <meta property="article:published_time" content={publishedDate} />}
    {modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />

    <!-- Theme: apply before paint to prevent FOWT -->
    <script is:inline>
      (function () {
        const saved = localStorage.getItem("theme");
        if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
          document.documentElement.classList.add("dark");
        }
      })();
    </script>

  </head>
  <body class="bg-(--color-bg) text-(--color-text) min-h-screen flex flex-col">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-(--color-primary) focus:text-(--color-bg) focus:rounded">
      Skip to content
    </a>
    <slot name="header" />
    <main id="main-content" class="flex-1">
      <slot />
    </main>
    <slot name="footer" />
  </body>
</html>
```

- [ ] **Step 2: Create ThemeToggle component**

Create `src/components/ThemeToggle.astro`:

```astro
<button
  id="theme-toggle"
  type="button"
  aria-label="Toggle dark mode"
  class="p-2 text-(--color-text-sub) hover:text-(--color-text) transition-colors"
>
  <!-- Sun icon (shown in dark mode) -->
  <svg class="hidden dark:block w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
  <!-- Moon icon (shown in light mode) -->
  <svg class="block dark:hidden w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
</button>

<script>
  const toggle = document.getElementById("theme-toggle")!;
  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
</script>
```

- [ ] **Step 3: Verify layout renders**

Update `src/pages/index.astro` to use BaseLayout:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="syi0808" description="Developer blog">
  <p>Hello</p>
</BaseLayout>
```

Run `pnpm dev` and verify the page loads with correct meta tags and theme toggle works.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add BaseLayout with SEO meta tags and theme system"
```

---

## Task 3: Header + Footer Components

**Files:**
- Create: `src/components/Header.astro`, `src/components/Footer.astro`

- [ ] **Step 1: Create Header**

Create `src/components/Header.astro`:

```astro
---
import ThemeToggle from "./ThemeToggle.astro";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Tags", href: "/tags" },
];

const currentPath = Astro.url.pathname;
---

<header class="sticky top-0 z-40 w-full border-b border-(--color-border) bg-(--color-bg)/80 backdrop-blur-sm">
  <nav class="mx-auto max-w-3xl flex items-center justify-between px-6 py-4">
    <a href="/" class="text-lg font-semibold text-(--color-text) hover:text-(--color-primary) transition-colors">
      syi0808
    </a>
    <div class="flex items-center gap-6">
      {navItems.map((item) => (
        <a
          href={item.href}
          class:list={[
            "text-sm transition-colors",
            currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href))
              ? "text-(--color-text) font-medium"
              : "text-(--color-text-sub) hover:text-(--color-text)",
          ]}
        >
          {item.label}
        </a>
      ))}
      <ThemeToggle />
    </div>
  </nav>
</header>
```

- [ ] **Step 2: Create Footer**

Create `src/components/Footer.astro`:

```astro
<footer class="border-t border-(--color-border) py-8">
  <div class="mx-auto max-w-3xl px-6 flex items-center justify-between text-sm text-(--color-text-sub)">
    <span>&copy; {new Date().getFullYear()} syi0808</span>
    <div class="flex items-center gap-4">
      <a href="https://github.com/syi0808" class="hover:text-(--color-text) transition-colors" target="_blank" rel="noopener noreferrer">
        GitHub
      </a>
      <a href="/rss.xml" class="hover:text-(--color-text) transition-colors">
        RSS
      </a>
    </div>
  </div>
</footer>
```

- [ ] **Step 3: Wire Header and Footer into BaseLayout**

Update `src/layouts/BaseLayout.astro` — replace the `<slot name="header" />` and `<slot name="footer" />` with direct component imports:

```astro
---
// Add to existing imports at top of frontmatter:
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
---
```

Replace body content:

```html
<body class="bg-(--color-bg) text-(--color-text) min-h-screen flex flex-col">
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-(--color-primary) focus:text-(--color-bg) focus:rounded">
    Skip to content
  </a>
  <Header />
  <main id="main-content" class="flex-1">
    <slot />
  </main>
  <Footer />
</body>
```

Remove `<slot name="header" />` and `<slot name="footer" />`.

- [ ] **Step 4: Verify navigation renders and active states work**

Run `pnpm dev`, check header appears with nav items, footer shows GitHub/RSS links.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Header and Footer components"
```

---

## Task 4: Content Collections + Post Utilities

**Files:**
- Create: `src/content/config.ts`, `src/content/blog/hello-world.md`, `src/lib/reading-time.ts`, `src/lib/posts.ts`

- [ ] **Step 1: Define Content Collections schema**

Create `src/content/config.ts`:

```ts
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

export const collections = { blog };
```

- [ ] **Step 2: Create sample blog post**

Create `src/content/blog/hello-world.md`:

```markdown
---
title: "Hello World"
description: "Welcome to my blog. Here I write about software engineering, open-source tools, and the things I learn along the way."
date: 2026-03-23
tags: ["intro"]
draft: false
---

## Welcome

This is the first post on my blog. I'm a developer who builds tools like [pubm](https://github.com/syi0808/pubm) to make the development workflow smoother.

## What to Expect

I'll be writing about:

- Open-source tooling and package management
- Software architecture and design patterns
- Things I learn while building and shipping software

Stay tuned for more.
```

- [ ] **Step 3: Create reading time utility**

Create `src/lib/reading-time.ts`:

```ts
export function getReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
```

- [ ] **Step 4: Create post query helpers**

Create `src/lib/posts.ts`:

```ts
import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

export async function getSortedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection("blog", ({ data }) => {
    return import.meta.env.PROD ? !data.draft : true;
  });
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function getRelatedPosts(
  current: BlogPost,
  allPosts: BlogPost[],
  limit = 3
): BlogPost[] {
  const currentTags = new Set(current.data.tags);
  return allPosts
    .filter((post) => post.id !== current.id)
    .map((post) => ({
      post,
      overlap: post.data.tags.filter((tag) => currentTags.has(tag)).length,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map(({ post }) => post);
}

export function getAllTags(posts: BlogPost[]): Map<string, number> {
  const tags = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }
  return new Map([...tags.entries()].sort((a, b) => b[1] - a[1]));
}
```

- [ ] **Step 5: Verify content collection loads**

Run `pnpm dev` — no errors in terminal about content collection.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Content Collections schema, sample post, and post utilities"
```

---

## Task 5: Blog List Page + PostList Component

**Files:**
- Create: `src/components/PostList.astro`, `src/components/PostMeta.astro`, `src/pages/blog/index.astro`

- [ ] **Step 1: Create PostMeta component**

Create `src/components/PostMeta.astro`:

```astro
---
interface Props {
  date: Date;
  readingTime?: number;
  tags?: string[];
}

const { date, readingTime, tags = [] } = Astro.props;

const formattedDate = date.toLocaleDateString("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});
---

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--color-text-sub)">
  <time datetime={date.toISOString()}>{formattedDate}</time>
  {readingTime && <span>{readingTime} min read</span>}
  {tags.length > 0 && (
    <div class="flex gap-2">
      {tags.map((tag) => (
        <a
          href={`/tags/${tag}`}
          class="text-(--color-primary) hover:text-(--color-primary-hover) transition-colors"
        >
          #{tag}
        </a>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 2: Create PostList component**

Create `src/components/PostList.astro`:

```astro
---
import PostMeta from "./PostMeta.astro";
import type { BlogPost } from "../lib/posts";

interface Props {
  posts: BlogPost[];
}

const { posts } = Astro.props;
---

<ul class="space-y-8">
  {posts.map((post) => (
    <li>
      <a href={`/blog/${post.id}`} class="group block">
        <h3 class="text-lg font-medium text-(--color-text) group-hover:text-(--color-primary) transition-colors">
          {post.data.title}
        </h3>
        <PostMeta date={post.data.date} tags={post.data.tags} />
        <p class="mt-1 text-(--color-text-sub) text-sm line-clamp-2">
          {post.data.description}
        </p>
      </a>
    </li>
  ))}
</ul>
```

- [ ] **Step 3: Create blog list page**

Create `src/pages/blog/index.astro`:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PostList from "../../components/PostList.astro";
import { getSortedPosts } from "../../lib/posts";

const posts = await getSortedPosts();
---

<BaseLayout title="Blog — syi0808" description="Articles on software engineering, open-source tools, and development practices.">
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="text-2xl font-semibold mb-8">Blog</h1>
    <PostList posts={posts} />
  </div>
</BaseLayout>
```

- [ ] **Step 4: Verify blog list page**

Run `pnpm dev`, navigate to `/blog`. Sample post should appear in the list.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add blog list page with PostList and PostMeta components"
```

---

## Task 6: Blog Post Detail Page

**Files:**
- Create: `src/layouts/BlogPostLayout.astro`, `src/components/TableOfContents.astro`, `src/components/RelatedPosts.astro`, `src/components/PrevNextNav.astro`, `src/components/JsonLd.astro`, `src/pages/blog/[...slug].astro`

- [ ] **Step 1: Create TableOfContents component**

Create `src/components/TableOfContents.astro`:

```astro
---
interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface Props {
  headings: Heading[];
}

const { headings } = Astro.props;
const toc = headings.filter((h) => h.depth >= 2 && h.depth <= 3);
---

{toc.length > 0 && (
  <nav aria-label="Table of contents" class="mb-8 p-4 border border-(--color-border) rounded-md">
    <h2 class="text-sm font-medium text-(--color-text-sub) mb-3">Table of Contents</h2>
    <ul class="space-y-1.5 text-sm">
      {toc.map((heading) => (
        <li class={heading.depth === 3 ? "pl-4" : ""}>
          <a
            href={`#${heading.slug}`}
            class="text-(--color-primary) hover:text-(--color-primary-hover) transition-colors"
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)}
```

- [ ] **Step 2: Create RelatedPosts component**

Create `src/components/RelatedPosts.astro`:

```astro
---
import type { BlogPost } from "../lib/posts";

interface Props {
  posts: BlogPost[];
}

const { posts } = Astro.props;
---

{posts.length > 0 && (
  <section class="mt-16 pt-8 border-t border-(--color-border)">
    <h2 class="text-lg font-medium mb-4">Related Posts</h2>
    <ul class="space-y-3">
      {posts.map((post) => (
        <li>
          <a
            href={`/blog/${post.id}`}
            class="text-(--color-primary) hover:text-(--color-primary-hover) transition-colors"
          >
            {post.data.title}
          </a>
        </li>
      ))}
    </ul>
  </section>
)}
```

- [ ] **Step 3: Create PrevNextNav component**

Create `src/components/PrevNextNav.astro`:

```astro
---
import type { BlogPost } from "../lib/posts";

interface Props {
  prev: BlogPost | null;
  next: BlogPost | null;
}

const { prev, next } = Astro.props;
---

{(prev || next) && (
  <nav aria-label="Post navigation" class="mt-12 pt-8 border-t border-(--color-border) flex justify-between gap-4 text-sm">
    <div>
      {prev && (
        <a href={`/blog/${prev.id}`} class="text-(--color-primary) hover:text-(--color-primary-hover) transition-colors">
          <span class="text-(--color-text-sub)">&larr; Previous</span>
          <br />
          {prev.data.title}
        </a>
      )}
    </div>
    <div class="text-right">
      {next && (
        <a href={`/blog/${next.id}`} class="text-(--color-primary) hover:text-(--color-primary-hover) transition-colors">
          <span class="text-(--color-text-sub)">Next &rarr;</span>
          <br />
          {next.data.title}
        </a>
      )}
    </div>
  </nav>
)}
```

- [ ] **Step 4: Create JsonLd component**

Create `src/components/JsonLd.astro`:

```astro
---
interface Props {
  data: Record<string, unknown>;
}

const { data } = Astro.props;
---

<script type="application/ld+json" set:html={JSON.stringify(data)} />
```

- [ ] **Step 5: Create BlogPostLayout**

Create `src/layouts/BlogPostLayout.astro`:

```astro
---
import BaseLayout from "./BaseLayout.astro";
import PostMeta from "../components/PostMeta.astro";
import TableOfContents from "../components/TableOfContents.astro";
import RelatedPosts from "../components/RelatedPosts.astro";
import PrevNextNav from "../components/PrevNextNav.astro";
import JsonLd from "../components/JsonLd.astro";
import { getReadingTime } from "../lib/reading-time";
import type { BlogPost } from "../lib/posts";

interface Props {
  post: BlogPost;
  headings: { depth: number; slug: string; text: string }[];
  content: string;
  relatedPosts: BlogPost[];
  prevPost: BlogPost | null;
  nextPost: BlogPost | null;
}

const { post, headings, content, relatedPosts, prevPost, nextPost } = Astro.props;
const readingTime = getReadingTime(content);

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.data.title,
  description: post.data.description,
  datePublished: post.data.date.toISOString(),
  dateModified: (post.data.updatedDate ?? post.data.date).toISOString(),
  author: {
    "@type": "Person",
    name: "syi0808",
    url: "https://github.com/syi0808",
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": new URL(`/blog/${post.id}`, "https://syi0808.github.io").toString(),
  },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://syi0808.github.io/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://syi0808.github.io/blog/" },
    { "@type": "ListItem", position: 3, name: post.data.title },
  ],
};
---

<BaseLayout
  title={`${post.data.title} — syi0808`}
  description={post.data.description}
  image={post.data.image}
  type="article"
  publishedDate={post.data.date.toISOString()}
  modifiedDate={post.data.updatedDate?.toISOString()}
>
  <JsonLd data={jsonLd} />
  <JsonLd data={breadcrumbLd} />
  <article class="mx-auto max-w-3xl px-6 py-16">
    <header class="mb-8">
      <h1 class="text-3xl font-semibold mb-3">{post.data.title}</h1>
      <PostMeta date={post.data.date} readingTime={readingTime} tags={post.data.tags} />
    </header>

    <TableOfContents headings={headings} />

    <div class="prose">
      <slot />
    </div>

    <RelatedPosts posts={relatedPosts} />
    <PrevNextNav prev={prevPost} next={nextPost} />
  </article>
</BaseLayout>
```

- [ ] **Step 6: Create blog post detail page**

Create `src/pages/blog/[...slug].astro`:

```astro
---
import { type CollectionEntry } from "astro:content";
import BlogPostLayout from "../../layouts/BlogPostLayout.astro";
import { getSortedPosts, getRelatedPosts } from "../../lib/posts";

export async function getStaticPaths() {
  const posts = await getSortedPosts();
  return posts.map((post, index) => ({
    params: { slug: post.id },
    props: {
      post,
      prevPost: posts[index + 1] ?? null,
      nextPost: posts[index - 1] ?? null,
      allPosts: posts,
    },
  }));
}

type Props = {
  post: CollectionEntry<"blog">;
  prevPost: CollectionEntry<"blog"> | null;
  nextPost: CollectionEntry<"blog"> | null;
  allPosts: CollectionEntry<"blog">[];
};

const { post, prevPost, nextPost, allPosts } = Astro.props;
const { Content, headings } = await post.render();
const relatedPosts = getRelatedPosts(post, allPosts);
---

<BlogPostLayout
  post={post}
  headings={headings}
  content={post.body ?? ""}
  relatedPosts={relatedPosts}
  prevPost={prevPost}
  nextPost={nextPost}
>
  <Content />
</BlogPostLayout>
```

- [ ] **Step 7: Verify post detail page**

Run `pnpm dev`, navigate to `/blog/hello-world`. Verify: title, meta, TOC, reading time render correctly.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add blog post detail page with TOC, related posts, and JSON-LD"
```

---

## Task 7: Home Page

**Files:**
- Create: `src/data/projects.ts`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create projects data**

Create `src/data/projects.ts`:

```ts
export interface Project {
  name: string;
  description: string;
  url: string;
}

export const projects: Project[] = [
  {
    name: "pubm",
    description: "Streamlined package publishing for npm",
    url: "https://github.com/syi0808/pubm",
  },
];
```

- [ ] **Step 2: Build Home page**

Replace `src/pages/index.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import PostList from "../components/PostList.astro";
import JsonLd from "../components/JsonLd.astro";
import { getSortedPosts } from "../lib/posts";
import { projects } from "../data/projects";

const posts = await getSortedPosts();
const recentPosts = posts.slice(0, 5);

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "syi0808",
  url: "https://syi0808.github.io",
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "syi0808",
  url: "https://syi0808.github.io",
  sameAs: ["https://github.com/syi0808"],
};
---

<BaseLayout title="syi0808" description="Developer blog — software engineering, open-source tools, and development practices.">
  <JsonLd data={websiteJsonLd} />
  <JsonLd data={personJsonLd} />
  <div class="mx-auto max-w-3xl px-6 py-16">
    <section class="mb-16">
      <h1 class="text-2xl font-semibold mb-2">syi0808</h1>
      <p class="text-(--color-text-sub)">
        Developer building open-source tools for better workflows.
      </p>
    </section>

    {projects.length > 0 && (
      <section class="mb-16">
        <h2 class="text-lg font-medium mb-4">Projects</h2>
        <ul class="space-y-3">
          {projects.map((project) => (
            <li>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                class="group block"
              >
                <span class="font-medium text-(--color-text) group-hover:text-(--color-primary) transition-colors">
                  {project.name}
                </span>
                <span class="text-(--color-text-sub) text-sm ml-2">
                  {project.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    )}

    <section>
      <h2 class="text-lg font-medium mb-4">Recent Posts</h2>
      <PostList posts={recentPosts} />
    </section>
  </div>
</BaseLayout>
```

- [ ] **Step 3: Verify Home page**

Run `pnpm dev`, navigate to `/`. Verify: intro, projects, recent posts all render.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Home page with projects and recent posts"
```

---

## Task 8: Tags Pages

**Files:**
- Create: `src/pages/tags/index.astro`, `src/pages/tags/[tag].astro`

- [ ] **Step 1: Create tags index page**

Create `src/pages/tags/index.astro`:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { getSortedPosts, getAllTags } from "../../lib/posts";

const posts = await getSortedPosts();
const tags = getAllTags(posts);
---

<BaseLayout title="Tags — syi0808" description="Browse posts by topic.">
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="text-2xl font-semibold mb-8">Tags</h1>
    <ul class="flex flex-wrap gap-3">
      {[...tags.entries()].map(([tag, count]) => (
        <li>
          <a
            href={`/tags/${tag}`}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-(--color-border) rounded-md text-(--color-primary) hover:text-(--color-primary-hover) hover:border-(--color-primary) transition-colors"
          >
            #{tag}
            <span class="text-(--color-text-sub)">({count})</span>
          </a>
        </li>
      ))}
    </ul>
  </div>
</BaseLayout>
```

- [ ] **Step 2: Create tag detail page**

Create `src/pages/tags/[tag].astro`:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PostList from "../../components/PostList.astro";
import { getSortedPosts, getAllTags } from "../../lib/posts";

export async function getStaticPaths() {
  const posts = await getSortedPosts();
  const tags = getAllTags(posts);

  return [...tags.keys()].map((tag) => ({
    params: { tag },
    props: {
      posts: posts.filter((post) => post.data.tags.includes(tag)),
    },
  }));
}

const { tag } = Astro.params;
const { posts } = Astro.props;
---

<BaseLayout title={`#${tag} — syi0808`} description={`Posts tagged with "${tag}".`}>
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="text-2xl font-semibold mb-8">#{tag}</h1>
    <PostList posts={posts} />
  </div>
</BaseLayout>
```

- [ ] **Step 3: Verify tags pages**

Run `pnpm dev`, navigate to `/tags` and `/tags/intro`. Both should render correctly.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add tags index and tag detail pages"
```

---

## Task 9: RSS Feed + robots.txt + 404 Page

**Files:**
- Create: `src/pages/rss.xml.ts`, `public/robots.txt`, `src/pages/404.astro`

- [ ] **Step 1: Create RSS feed**

Create `src/pages/rss.xml.ts`:

```ts
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getSortedPosts } from "../lib/posts";

export async function GET(context: APIContext) {
  const posts = await getSortedPosts();

  return rss({
    title: "syi0808",
    description: "Developer blog — software engineering, open-source tools, and development practices.",
    site: context.site!,
    items: await Promise.all(
      posts.map(async (post) => {
        const { Content } = await post.render();
        // Note: @astrojs/rss supports content via the content field
        return {
          title: post.data.title,
          pubDate: post.data.date,
          description: post.data.description,
          link: `/blog/${post.id}/`,
          content: post.body ?? post.data.description,
        };
      })
    ),
  });
}
```

- [ ] **Step 2: Create robots.txt**

Create `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://syi0808.github.io/sitemap-index.xml
```

- [ ] **Step 3: Create 404 page**

Create `src/pages/404.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="Not Found — syi0808" description="Page not found.">
  <div class="mx-auto max-w-3xl px-6 py-32 text-center">
    <h1 class="text-4xl font-semibold mb-4">404</h1>
    <p class="text-(--color-text-sub) mb-8">This page doesn't exist.</p>
    <a href="/" class="text-(--color-primary) hover:text-(--color-primary-hover) transition-colors">
      Go home
    </a>
  </div>
</BaseLayout>
```

- [ ] **Step 4: Verify RSS feed**

Run `pnpm dev`, navigate to `/rss.xml`. Should return valid XML with the sample post.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add RSS feed, robots.txt, and 404 page"
```

---

## Task 10: Prose Styling + Code Block Enhancements

**Files:**
- Modify: `src/styles/global.css`
- Create: `src/components/CopyCodeButton.astro`

- [ ] **Step 1: Add prose styles to global CSS**

Append to `src/styles/global.css`:

```css
@layer base {
  .prose {
    max-width: 720px;
  }

  .prose h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    color: var(--color-text);
  }

  .prose h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    color: var(--color-text);
  }

  .prose p {
    margin-bottom: 1.25rem;
  }

  .prose a {
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.15s;
  }

  .prose a:hover {
    color: var(--color-primary-hover);
  }

  .prose ul,
  .prose ol {
    margin-bottom: 1.25rem;
    padding-left: 1.5rem;
  }

  .prose ul {
    list-style-type: disc;
  }

  .prose ol {
    list-style-type: decimal;
  }

  .prose li {
    margin-bottom: 0.375rem;
  }

  .prose blockquote {
    border-left: 3px solid var(--color-border);
    padding-left: 1rem;
    color: var(--color-text-sub);
    margin-bottom: 1.25rem;
  }

  .prose code:not(pre code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background-color: var(--color-border);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
  }

  .prose pre {
    position: relative;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    line-height: 1.6;
    padding: 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    overflow-x: auto;
    margin-bottom: 1.25rem;
  }

  .prose img {
    border-radius: 0.5rem;
    margin-top: 1.25rem;
    margin-bottom: 1.25rem;
  }

  .prose hr {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 2rem 0;
  }

  .prose table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.25rem;
    font-size: 0.9375rem;
  }

  .prose th,
  .prose td {
    border: 1px solid var(--color-border);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  .prose th {
    font-weight: 600;
    background-color: var(--color-border);
  }
}
```

- [ ] **Step 2: Handle Shiki dual theme CSS**

Append to `src/styles/global.css`:

```css
@layer base {
  /* Shiki dual themes: show light by default, dark when .dark is on html */
  .shiki,
  .shiki span {
    color: var(--shiki-light) !important;
    background-color: var(--shiki-light-bg) !important;
  }

  .dark .shiki,
  .dark .shiki span {
    color: var(--shiki-dark) !important;
    background-color: var(--shiki-dark-bg) !important;
  }
}
```

- [ ] **Step 3: Create CopyCodeButton**

Create `src/components/CopyCodeButton.astro`:

```astro
<!-- Injected via client-side script to all <pre> elements -->
<script>
  document.querySelectorAll(".prose pre").forEach((pre) => {
    const wrapper = pre.parentElement || pre;
    wrapper.style.position = "relative";

    const button = document.createElement("button");
    Object.assign(button.style, {
      position: "absolute",
      top: "0.5rem",
      right: "0.5rem",
      padding: "0.25rem 0.5rem",
      fontSize: "0.75rem",
      borderRadius: "0.25rem",
      opacity: "0",
      transition: "opacity 0.15s",
      backgroundColor: "var(--color-border)",
      color: "var(--color-text-sub)",
      border: "none",
      cursor: "pointer",
    });
    button.textContent = "Copy";

    pre.addEventListener("mouseenter", () => (button.style.opacity = "1"));
    pre.addEventListener("mouseleave", () => (button.style.opacity = "0"));

    button.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      if (code) {
        await navigator.clipboard.writeText(code.textContent ?? "");
        button.textContent = "Copied!";
        setTimeout(() => (button.textContent = "Copy"), 2000);
      }
    });

    pre.style.position = "relative";
    pre.appendChild(button);
  });
</script>
```

- [ ] **Step 4: Include CopyCodeButton in BlogPostLayout**

Add to `src/layouts/BlogPostLayout.astro`, after the closing `</article>` tag but inside the BaseLayout:

```astro
import CopyCodeButton from "../components/CopyCodeButton.astro";
```

And add `<CopyCodeButton />` right after `</article>`.

- [ ] **Step 5: Verify prose styling and code copy**

Run `pnpm dev`, navigate to `/blog/hello-world`. Verify: headings, links, lists render with correct styles. Code blocks should have copy button on hover.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add prose styling, Shiki dual theme, and code copy button"
```

---

## Task 11: giscus Comments

**Files:**
- Create: `src/components/Giscus.astro`
- Modify: `src/layouts/BlogPostLayout.astro`

- [ ] **Step 1: Create Giscus component**

Create `src/components/Giscus.astro`:

```astro
---
// Configure these after enabling giscus on the repo:
// https://giscus.app
const repo = "syi0808/syi0808.github.io";
const repoId = ""; // Fill after repo creation
const category = "Announcements";
const categoryId = ""; // Fill after repo creation
---

<section class="mt-16 pt-8 border-t border-(--color-border)">
  <h2 class="text-lg font-medium mb-4">Comments</h2>
  <div id="giscus-container">
    <script
      src="https://giscus.app/client.js"
      data-repo={repo}
      data-repo-id={repoId}
      data-category={category}
      data-category-id={categoryId}
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="top"
      data-theme="preferred_color_scheme"
      data-lang="en"
      data-loading="lazy"
      crossorigin="anonymous"
      async
    ></script>
  </div>
</section>

<script>
  // Sync giscus theme with site theme toggle
  const observer = new MutationObserver(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const iframe = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    if (iframe) {
      iframe.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: isDark ? "dark" : "light" } } },
        "https://giscus.app"
      );
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
</script>
```

- [ ] **Step 2: Add Giscus to BlogPostLayout**

In `src/layouts/BlogPostLayout.astro`, add import:

```astro
import Giscus from "../components/Giscus.astro";
```

Add `<Giscus />` after `<PrevNextNav ... />` and before the closing `</article>` tag.

- [ ] **Step 3: Verify giscus placeholder renders**

Run `pnpm dev`, navigate to a blog post. The comments section heading should appear (giscus won't load until repo IDs are configured).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add giscus comments component"
```

---

## Task 12: Static Assets

**Files:**
- Create: `public/favicon.svg`, `public/og-default.svg`

- [ ] **Step 1: Create favicon**

Create `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#2c2c2c"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" font-weight="600" fill="#fafafa">S</text>
</svg>
```

- [ ] **Step 2: Create placeholder OG image**

Create `public/og-default.svg` (1200x630 proportions, replace with designed PNG later):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#fafafa"/>
  <text x="600" y="300" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="64" font-weight="600" fill="#2c2c2c">syi0808</text>
  <text x="600" y="380" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="24" fill="#737373">Developer Blog</text>
</svg>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add favicon and OG image placeholder"
```

---

## Task 13: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add GitHub Actions deployment workflow"
```

---

## Task 14: Build Verification

- [ ] **Step 1: Run production build**

```bash
pnpm build
```

Expected: Build succeeds, output in `dist/` directory.

- [ ] **Step 2: Preview production build**

```bash
pnpm preview
```

Navigate to `localhost:4321`. Verify:
- Home page renders with intro, projects, recent posts
- Blog list shows sample post
- Post detail has TOC, reading time, meta tags, structured data
- Tags pages work
- 404 page renders at any invalid URL
- Dark mode toggle works without flash on reload
- RSS feed is valid XML
- All links work

- [ ] **Step 3: Check HTML output for SEO**

```bash
cat dist/index.html | head -50
cat dist/blog/hello-world/index.html | head -80
```

Verify: `<title>`, `<meta name="description">`, Open Graph tags, JSON-LD script, canonical URL are all present and correct.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build verification issues"
```

(Skip if no fixes needed.)

---

## Deferred Items

These are noted in the spec but deferred until needed:

- **Pagination**: Blog list paginates at 20+ posts (`/blog/page/[n]`). Not needed until post count warrants it.
- **Astro `<Image>` optimization**: Posts can use standard Markdown images initially. Switch to `<Image>` component when image-heavy posts are added.
- **Code block filename display**: Shiki meta strings (e.g., ` ```ts title="file.ts" `) require a remark plugin. Add when needed.
- **Proper OG image**: Replace `og-default.svg` with a designed 1200x630 PNG.
