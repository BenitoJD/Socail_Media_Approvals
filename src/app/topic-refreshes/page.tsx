import { TopicRefreshesPage } from "@/components/topic-refreshes-page";
import { getPosts } from "@/lib/posts";
import { getTopicRefreshes, serializeTopicRefresh } from "@/lib/topic-refreshes";

export const dynamic = "force-dynamic";

export default async function TopicRefreshesRoute() {
  const posts = await getPosts();
  const topicRefreshes = await getTopicRefreshes();
  const handleEntries: Array<[string, { platform: string; handle: string }]> = [
    ...posts
      .filter(
        (post): post is typeof post & { platform: string; handle: string } =>
          Boolean(post.platform?.trim()) && Boolean(post.handle?.trim()),
      )
      .map((post) => [
        `${post.platform.trim()}::${post.handle.trim()}`,
        {
          platform: post.platform.trim(),
          handle: post.handle.trim(),
        },
      ] as [string, { platform: string; handle: string }]),
    ...topicRefreshes.map(
      (topicRefresh) =>
        [
          `${topicRefresh.platform.trim()}::${topicRefresh.handle.trim()}`,
          {
            platform: topicRefresh.platform.trim(),
            handle: topicRefresh.handle.trim(),
          },
        ] as [string, { platform: string; handle: string }],
    ),
  ];
  const initialHandleDirectory = Array.from(new Map(handleEntries).values());

  return (
    <TopicRefreshesPage
      initialTopicRefreshes={topicRefreshes.map(serializeTopicRefresh)}
      initialHandleDirectory={initialHandleDirectory}
    />
  );
}
