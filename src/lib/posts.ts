import { AgentPostStatus, PostStatus } from "@prisma/client";

import { getImageUrl } from "@/lib/minio";
import { prisma } from "@/lib/prisma";

export async function getPosts(status?: PostStatus, agentPostingStatus?: AgentPostStatus) {
  return prisma.post.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(agentPostingStatus
        ? {
            agentState: {
              is: {
                status: agentPostingStatus,
              },
            },
          }
        : {}),
    },
    include: {
      agentState: true,
      images: {
        orderBy: {
          id: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export function serializePost(post: Awaited<ReturnType<typeof getPosts>>[number]) {
  return {
    id: post.id,
    platform: post.platform,
    handle: post.handle,
    text: post.text,
    status: post.status,
    agentPostingStatus: post.agentState?.status ?? "NOT_POSTED",
    postedAt: post.agentState?.postedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    images: post.images.map((image) => ({
      id: image.id,
      objectKey: image.objectKey,
      imageUrl: getImageUrl(image.objectKey),
    })),
  };
}
