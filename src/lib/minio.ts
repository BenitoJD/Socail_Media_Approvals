import "server-only";

import crypto from "node:crypto";

import { Client } from "minio";

const publicBaseUrl = process.env.MINIO_PUBLIC_BASE_URL?.replace(/\/$/, "");
const bucket = process.env.MINIO_BUCKET_NAME;
const endPoint = process.env.MINIO_ENDPOINT;
const port = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined;
const useSSL = process.env.MINIO_USE_SSL === "true";
const accessKey = process.env.MINIO_ACCESS_KEY;
const secretKey = process.env.MINIO_SECRET_KEY;

let client: Client | null = null;

function getClient() {
  if (client) {
    return client;
  }

  if (!endPoint || !accessKey || !secretKey || !bucket) {
    throw new Error("MinIO is not configured.");
  }

  client = new Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  });

  return client;
}

export function getImageUrl(objectKey: string) {
  if (!publicBaseUrl || !bucket) {
    return objectKey;
  }

  const key = objectKey.replace(/^\//, "");
  return `${publicBaseUrl}/${bucket}/${key}`;
}

export async function uploadImageToMinio(file: File) {
  if (!bucket) {
    throw new Error("MinIO bucket is not configured.");
  }

  const minio = getClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectKey = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await minio.putObject(bucket, objectKey, buffer, buffer.length, {
    "Content-Type": file.type || "application/octet-stream",
  });

  return {
    objectKey,
    imageUrl: getImageUrl(objectKey),
  };
}
