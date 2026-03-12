import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serializeTopicRefresh } from "@/lib/topic-refreshes";
import { updateTopicRefreshSchema } from "@/lib/validation";

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

  const topicRefresh = await prisma.topicRefresh.findUnique({ where: { id } });

  if (!topicRefresh) {
    return NextResponse.json({ error: "Topic refresh not found." }, { status: 404 });
  }

  return NextResponse.json(serializeTopicRefresh(topicRefresh));
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
  const parsed = updateTopicRefreshSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.topicRefresh.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Topic refresh not found." }, { status: 404 });
  }

  try {
    const topicRefresh = await prisma.topicRefresh.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(serializeTopicRefresh(topicRefresh));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Topic refresh already exists for this platform and handle." },
        { status: 409 },
      );
    }

    throw error;
  }
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

  const existing = await prisma.topicRefresh.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Topic refresh not found." }, { status: 404 });
  }

  await prisma.topicRefresh.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
