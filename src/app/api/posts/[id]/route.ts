import { NextRequest, NextResponse } from "next/server";
import { AgentPostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serializePost } from "@/lib/posts";
import { updatePostSchema } from "@/lib/validation";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getAgentStateUpdate(status: AgentPostStatus) {
  const now = new Date();

  if (status === "CLAIMED") {
    return {
      status,
      claimedAt: now,
      postedAt: null,
      lastAttemptedAt: now,
      failureReason: null,
    };
  }

  if (status === "POSTED") {
    return {
      status,
      claimedAt: null,
      postedAt: now,
      lastAttemptedAt: now,
      failureReason: null,
    };
  }

  if (status === "FAILED") {
    return {
      status,
      claimedAt: null,
      postedAt: null,
      lastAttemptedAt: now,
    };
  }

  return {
    status,
    claimedAt: null,
    postedAt: null,
    failureReason: null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: { agentState: true, images: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json(serializePost(post));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const json = await request.json();
  const parsed = updatePostSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.post.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const nextModerationStatus = parsed.data.status ?? existing.status;
  if (
    parsed.data.agentPostingStatus === "POSTED" &&
    nextModerationStatus !== "APPROVED"
  ) {
    return NextResponse.json(
      {
        error: "Only approved posts can be marked as posted.",
      },
      { status: 400 },
    );
  }

  if (
    parsed.data.agentPostingStatus === "CLAIMED" &&
    nextModerationStatus !== "APPROVED"
  ) {
    return NextResponse.json(
      {
        error: "Only approved posts can be claimed.",
      },
      { status: 400 },
    );
  }

  const post = await prisma.post.update({
    where: { id },
    data: {
      status: parsed.data.status ?? undefined,
      platform:
        parsed.data.platform !== undefined ? parsed.data.platform || null : undefined,
      handle: parsed.data.handle !== undefined ? parsed.data.handle || null : undefined,
      text: parsed.data.text,
      agentState:
        parsed.data.agentPostingStatus !== undefined
          ? {
              upsert: {
                create: {
                  ...getAgentStateUpdate(parsed.data.agentPostingStatus),
                },
                update: {
                  ...getAgentStateUpdate(parsed.data.agentPostingStatus),
                },
              },
            }
          : undefined,
      images:
        parsed.data.images !== undefined
          ? {
              deleteMany: {},
              create: parsed.data.images.map((objectKey) => ({
                objectKey,
              })),
            }
          : undefined,
    },
    include: {
      agentState: true,
      images: true,
    },
  });

  return NextResponse.json(serializePost(post));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.post.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  await prisma.post.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
