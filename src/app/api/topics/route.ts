import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getTopics, serializeTopic } from "@/lib/topics";
import { createTopicSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform")?.trim() || undefined;
  const handle = request.nextUrl.searchParams.get("handle")?.trim() || undefined;
  const topics = await getTopics(platform, handle);

  return NextResponse.json(topics.map(serializeTopic));
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = createTopicSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const topic = await prisma.topic.create({
      data: {
        platform: parsed.data.platform,
        handle: parsed.data.handle,
        topic: parsed.data.topic,
        notes: parsed.data.notes || null,
      },
    });

    return NextResponse.json(serializeTopic(topic), { status: 201 });
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
