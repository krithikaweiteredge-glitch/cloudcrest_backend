import fs from "fs";
import path from "path";

/**
 * File storage. When BLOB_READ_WRITE_TOKEN is set the buffer is uploaded to
 * Vercel Blob and its public URL is returned; otherwise (local dev) the buffer
 * is written to ./uploads and a relative `uploads/<name>` path is returned.
 * Callers store whatever string comes back and never need to know which backend
 * handled it — `assetUrl()` on the client resolves both forms.
 *
 * `@vercel/blob` is imported lazily inside the Blob branch so a dev environment
 * without the package (or the token) never has to resolve it — the server boots
 * on the local-disk path regardless.
 */

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = !!blobToken;
// Vercel's runtime filesystem is read-only except /tmp; local dev uses ./uploads.
const localDir = process.env.VERCEL ? "/tmp/uploads" : path.resolve("uploads");

type UploadFile = { originalname: string; buffer: Buffer; mimetype?: string };

export async function saveUpload(file: UploadFile): Promise<string> {
  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

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

  // Local fallback so the app runs without a Blob token in development.
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, safeName), file.buffer);
  return `uploads/${safeName}`;
}

/** True for a stored value that is already a full URL (i.e. a Blob URL). */
export function isRemoteUrl(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value);
}
