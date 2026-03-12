import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serializeTopic } from "@/lib/topics";
import { updateTopicSchema } from "@/lib/validation";

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

  const topic = await prisma.topic.findUnique({ where: { id } });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  return NextResponse.json(serializeTopic(topic));
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
  const parsed = updateTopicSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.topic.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  try {
    const topic = await prisma.topic.update({
      where: { id },
      data: {
        platform: parsed.data.platform,
        handle: parsed.data.handle,
        topic: parsed.data.topic,
        notes: parsed.data.notes !== undefined ? parsed.data.notes || null : undefined,
      },
    });

    return NextResponse.json(serializeTopic(topic));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Topic already exists for this platform and handle." },
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

  const existing = await prisma.topic.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  await prisma.topic.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
