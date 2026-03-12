import { prisma } from "@/lib/prisma";

export async function getTopics(platform?: string, handle?: string) {
  return prisma.topic.findMany({
    where: {
      ...(platform ? { platform } : {}),
      ...(handle ? { handle } : {}),
    },
    orderBy: [
      { platform: "asc" },
      { handle: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export function serializeTopic(topic: Awaited<ReturnType<typeof getTopics>>[number]) {
  return {
    id: topic.id,
    platform: topic.platform,
    handle: topic.handle,
    topic: topic.topic,
    notes: topic.notes,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  };
}
