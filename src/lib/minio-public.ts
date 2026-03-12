const publicBaseUrl = process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL?.replace(/\/$/, "");
const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME;

export function getPublicImageUrl(objectKey: string) {
  if (!publicBaseUrl || !bucket) {
    return objectKey;
  }

  const key = objectKey.replace(/^\//, "");
  return `${publicBaseUrl}/${bucket}/${key}`;
}
