import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

/**
 * File storage. Precedence:
 *   1. Tower / S3-compatible bucket  — when BUCKET_NAME + AWS keys are set.
 *   2. Vercel Blob                   — when BLOB_READ_WRITE_TOKEN is set.
 *   3. Local disk ./uploads          — dev / single-VM fallback.
 * Callers store whatever string comes back and never need to know which backend
 * handled it — the client resolves both a relative `uploads/<name>` path and an
 * absolute https URL.
 *
 * The S3 and Blob SDKs are imported lazily inside their branch so an environment
 * without the package (or its config) never has to resolve it.
 */

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = !!blobToken;

// Tower object storage is S3-compatible (endpoint + access key + secret + bucket).
const s3Bucket = process.env.BUCKET_NAME;
const s3Endpoint = process.env.AWS_ENDPOINT_URL;
const useS3 = !!(
  s3Bucket &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

// Vercel's runtime filesystem is read-only except /tmp; local dev uses ./uploads.
const localDir = process.env.VERCEL ? "/tmp/uploads" : path.resolve("uploads");

type UploadFile = { originalname: string; buffer: Buffer; mimetype?: string };

export async function saveUpload(file: UploadFile): Promise<string> {
  const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
  // A random suffix keeps the object key unguessable (matches Vercel Blob's
  // addRandomSuffix behaviour) so public URLs can't be enumerated.
  const safeName = `${Date.now()}-${randomBytes(8).toString("hex")}-${cleanName}`;

  if (useS3) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      endpoint: s3Endpoint,
      // S3-compatible providers address objects as endpoint/bucket/key
      // (path style) rather than bucket.endpoint (virtual-host style).
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
    const key = `uploads/${safeName}`;
    await client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      }),
    );
    // Public, path-style URL. Requires the bucket/objects to be publicly readable.
    const base = (s3Endpoint || "").replace(/\/+$/, "");
    return `${base}/${s3Bucket}/${key}`;
  }

  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${safeName}`, file.buffer, {
      access: "public",
      token: blobToken,
      contentType: file.mimetype,
      addRandomSuffix: true,
    });
    return blob.url; // absolute https URL
  }

  // Local fallback so the app runs without any storage config in development.
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, safeName), file.buffer);
  return `uploads/${safeName}`;
}

/** True for a stored value that is already a full URL (Blob or S3 URL). */
export function isRemoteUrl(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value);
}
