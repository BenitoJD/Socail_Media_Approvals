import { TopicsPage } from "@/components/topics-page";
import { getPosts } from "@/lib/posts";
import { getTopics, serializeTopic } from "@/lib/topics";

export const dynamic = "force-dynamic";

export default async function TopicsRoute() {
  const posts = await getPosts();
  const topics = await getTopics();
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
    ...topics.map(
      (topic) =>
        [
          `${topic.platform.trim()}::${topic.handle.trim()}`,
          {
            platform: topic.platform.trim(),
            handle: topic.handle.trim(),
          },
        ] as [string, { platform: string; handle: string }],
    ),
  ];
  const initialHandleDirectory = Array.from(new Map(handleEntries).values());

  return (
    <TopicsPage
      initialTopics={topics.map(serializeTopic)}
      initialHandleDirectory={initialHandleDirectory}
    />
  );
}
