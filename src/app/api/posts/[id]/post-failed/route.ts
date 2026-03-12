import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializePost } from "@/lib/posts";
import { markPostFailedSchema } from "@/lib/validation";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = markPostFailedSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: { agentState: true, images: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (post.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved posts can be failed." }, { status: 409 });
  }

  if (post.agentState?.status !== "CLAIMED") {
    return NextResponse.json({ error: "Post must be claimed before marking failure." }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.post.update({
    where: { id },
    data: {
      agentState: {
        update: {
          status: "FAILED",
          claimedAt: null,
          postedAt: null,
          lastAttemptedAt: now,
          failureReason: parsed.data.failureReason || null,
          retryCount: {
            increment: 1,
          },
        },
      },
    },
    include: {
      agentState: true,
      images: true,
    },
  });

  return NextResponse.json(serializePost(updated));
}
