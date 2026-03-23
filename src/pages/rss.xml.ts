import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getSortedPosts } from "../lib/posts";
import { SITE } from "../lib/seo";

export async function GET(context: APIContext) {
  const posts = await getSortedPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    items: await Promise.all(
      posts.map(async (post) => {
        return {
          title: post.data.title,
          pubDate: post.data.date,
          description: post.data.description,
          link: `/${post.id}/`,
          content: post.body ?? post.data.description,
        };
      })
    ),
  });
}
