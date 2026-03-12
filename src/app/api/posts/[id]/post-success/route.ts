import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializePost } from "@/lib/posts";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
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

  if (post.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved posts can be posted." }, { status: 409 });
  }

  if (post.agentState?.status === "POSTED") {
    return NextResponse.json(serializePost(post));
  }

  if (post.agentState?.status !== "CLAIMED") {
    return NextResponse.json({ error: "Post must be claimed before marking success." }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.post.update({
    where: { id },
    data: {
      agentState: {
        update: {
          status: "POSTED",
          claimedAt: null,
          postedAt: now,
          lastAttemptedAt: now,
          failureReason: null,
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
