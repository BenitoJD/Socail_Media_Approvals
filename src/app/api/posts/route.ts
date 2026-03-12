import { NextRequest, NextResponse } from "next/server";
import { AgentPostStatus, PostStatus } from "@prisma/client";

import { getPosts, serializePost } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get("status");
  const agentPostingStatusParam = request.nextUrl.searchParams.get("agentPostingStatus");
  const handleParam = request.nextUrl.searchParams.get("handle")?.trim() || undefined;
  const status =
    statusParam && ["PENDING", "APPROVED", "REJECTED"].includes(statusParam)
      ? (statusParam as PostStatus)
      : undefined;
  const agentPostingStatus =
    agentPostingStatusParam &&
    ["NOT_POSTED", "CLAIMED", "POSTED", "FAILED"].includes(agentPostingStatusParam)
      ? (agentPostingStatusParam as AgentPostStatus)
      : undefined;

  const posts = await getPosts(status, agentPostingStatus, handleParam);
  return NextResponse.json(posts.map(serializePost));
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = createPostSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const post = await prisma.post.create({
    data: {
      platform: parsed.data.platform || null,
      handle: parsed.data.handle || null,
      text: parsed.data.text,
      agentState: {
        create: {
          status: "NOT_POSTED",
        },
      },
      images: {
        create: parsed.data.images.map((objectKey) => ({
          objectKey,
        })),
      },
    },
    include: {
      agentState: true,
      images: true,
    },
  });

  return NextResponse.json(serializePost(post), { status: 201 });
}
