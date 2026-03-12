import { NextRequest, NextResponse } from "next/server";

import { getNextAgentPost, serializePost } from "@/lib/posts";

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform")?.trim() || undefined;
  const post = await getNextAgentPost(platform);

  if (!post) {
    return NextResponse.json({ post: null });
  }

  return NextResponse.json({ post: serializePost(post) });
}
