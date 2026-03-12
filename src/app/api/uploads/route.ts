import { NextResponse } from "next/server";

import { uploadImageToMinio } from "@/lib/minio";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const uploads = await Promise.all(files.map((file) => uploadImageToMinio(file)));
    return NextResponse.json({ uploads }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 500 },
    );
  }
}
