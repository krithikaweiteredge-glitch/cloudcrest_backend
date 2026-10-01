/**
 * One-time migration: copy uploaded documents out of Vercel Blob into the
 * S3-compatible bucket, then repoint `request_documents.storage_path` at the
 * new location.
 *
 * Why this exists: the Blob store belonged to the developer's Vercel account.
 * Once that account is closed every stored URL 404s, so the bytes have to be
 * copied somewhere the client owns before the account can be retired.
 *
 * The Blob URLs are public, so no Vercel token is required — this reads them
 * over plain HTTPS. Requires the same S3 env vars `utils/storage.ts` uses:
 *   BUCKET_NAME, AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *
 * Safe to re-run: rows already pointing at the bucket are skipped, and each
 * row's URL is only updated after its upload succeeds, so an interrupted run
 * never leaves a row pointing at a file that does not exist.
 *
 *   node src/scripts/migrate-blob-to-s3.mjs [--dry-run]
 */
import "dotenv/config";
import { Client } from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const DRY = process.argv.includes("--dry-run");

const bucket = process.env.BUCKET_NAME;
const endpoint = process.env.AWS_ENDPOINT_URL;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
  console.error(
    "Missing S3 config. Need BUCKET_NAME, AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.",
  );
  process.exit(1);
}

// Mirrors storage.ts: path-style addressing, because S3-compatible providers
// generally do not support virtual-host style bucket names.
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const base = endpoint.replace(/\/+$/, "");

const db = new Client({
  connectionString: (process.env.DATABASE_URL || "").replace("-pooler.", "."),
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});
await db.connect();

const { rows } = await db.query(
  `select id, storage_path from request_documents
   where storage_path like '%blob.vercel-storage.com%'
   order by id`,
);

console.log(`${rows.length} row(s) still pointing at Vercel Blob${DRY ? " (dry run)" : ""}`);

let moved = 0;
const failures = [];

for (const row of rows) {
  // Keep the original object name so the file is still recognisable in the
  // bucket listing; strip any leading "uploads/" prefix Blob added.
  const key = decodeURIComponent(new URL(row.storage_path).pathname)
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");

  try {
    const res = await fetch(row.storage_path);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    const newUrl = `${base}/${bucket}/${key}`;

    if (DRY) {
      console.log(`  would copy ${key} (${body.length} bytes) -> ${newUrl}`);
      moved++;
      continue;
    }

    // public-read so the stored URL is viewable by the browser, matching the
    // behaviour the app relied on with Vercel Blob.
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "public-read",
      }),
    );

    // Only repoint the row once the bytes are safely in the bucket.
    await db.query(`update request_documents set storage_path = $1 where id = $2`, [
      newUrl,
      row.id,
    ]);

    console.log(`  moved ${key} (${body.length} bytes)`);
    moved++;
  } catch (err) {
    console.error(`  FAILED id=${row.id} ${key}: ${err.message}`);
    failures.push({ id: row.id, key, error: err.message });
  }
}

const { rows: left } = await db.query(
  `select count(*)::int n from request_documents where storage_path like '%blob.vercel-storage.com%'`,
);

console.log(`\nmoved: ${moved}  failed: ${failures.length}  still on Blob: ${left[0].n}`);
if (failures.length) {
  console.log("Re-run to retry the failures; successful rows are skipped.");
  process.exitCode = 1;
}

await db.end();
