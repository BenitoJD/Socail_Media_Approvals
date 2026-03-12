import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializePost } from "@/lib/posts";
import { updatePostSchema } from "@/lib/validation";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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
                  status: parsed.data.agentPostingStatus,
                  postedAt:
                    parsed.data.agentPostingStatus === "POSTED" ? new Date() : null,
                },
                update: {
                  status: parsed.data.agentPostingStatus,
                  postedAt:
                    parsed.data.agentPostingStatus === "POSTED" ? new Date() : null,
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
