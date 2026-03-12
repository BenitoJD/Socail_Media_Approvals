import { AgentPostStatus, PostStatus } from "@prisma/client";

import { getImageUrl } from "@/lib/minio";
import { prisma } from "@/lib/prisma";

export async function getPosts(
  status?: PostStatus,
  agentPostingStatus?: AgentPostStatus,
  handle?: string,
) {
  return prisma.post.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(handle ? { handle } : {}),
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

export async function getNextAgentPost(platform?: string, handle?: string) {
  return prisma.post.findFirst({
    where: {
      status: "APPROVED",
      ...(platform ? { platform } : {}),
      ...(handle ? { handle } : {}),
      agentState: {
        is: {
          status: {
            in: ["NOT_POSTED", "FAILED"],
          },
        },
      },
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
      createdAt: "asc",
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
    claimedAt: post.agentState?.claimedAt?.toISOString() ?? null,
    postedAt: post.agentState?.postedAt?.toISOString() ?? null,
    lastAttemptedAt: post.agentState?.lastAttemptedAt?.toISOString() ?? null,
    failureReason: post.agentState?.failureReason ?? null,
    retryCount: post.agentState?.retryCount ?? 0,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    images: post.images.map((image) => ({
      id: image.id,
      objectKey: image.objectKey,
      imageUrl: getImageUrl(image.objectKey),
    })),
  };
}
