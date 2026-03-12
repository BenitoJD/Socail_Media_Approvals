import { prisma } from "@/lib/prisma";

export async function getTopicRefreshes(platform?: string, handle?: string) {
  return prisma.topicRefresh.findMany({
    where: {
      ...(platform ? { platform } : {}),
      ...(handle ? { handle } : {}),
    },
    orderBy: [
      { platform: "asc" },
      { handle: "asc" },
      { updatedAt: "desc" },
    ],
  });
}

export function serializeTopicRefresh(
  topicRefresh: Awaited<ReturnType<typeof getTopicRefreshes>>[number],
) {
  return {
    id: topicRefresh.id,
    platform: topicRefresh.platform,
    handle: topicRefresh.handle,
    prompt: topicRefresh.prompt,
    createdAt: topicRefresh.createdAt.toISOString(),
    updatedAt: topicRefresh.updatedAt.toISOString(),
  };
}
