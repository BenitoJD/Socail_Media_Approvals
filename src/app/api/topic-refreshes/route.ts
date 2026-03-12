import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getTopicRefreshes, serializeTopicRefresh } from "@/lib/topic-refreshes";
import { createTopicRefreshSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform")?.trim() || undefined;
  const handle = request.nextUrl.searchParams.get("handle")?.trim() || undefined;
  const topicRefreshes = await getTopicRefreshes(platform, handle);

  return NextResponse.json(topicRefreshes.map(serializeTopicRefresh));
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = createTopicRefreshSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const topicRefresh = await prisma.topicRefresh.create({
      data: parsed.data,
    });

    return NextResponse.json(serializeTopicRefresh(topicRefresh), { status: 201 });
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

export async function PUT(request: NextRequest) {
  const json = await request.json();
  const parsed = createTopicRefreshSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const topicRefresh = await prisma.topicRefresh.upsert({
    where: {
      platform_handle: {
        platform: parsed.data.platform,
        handle: parsed.data.handle,
      },
    },
    create: parsed.data,
    update: {
      prompt: parsed.data.prompt,
    },
  });

  return NextResponse.json(serializeTopicRefresh(topicRefresh));
}
