import fs from "fs";
import path from "path";
import { pool, db } from "../config/db.js";
import {
  serviceRequests,
  requestDocuments,
  orders,
  orderDocuments,
  orderFieldValues,
  estimates,
  invoices,
  payments,
} from "../models/schema.js";

const s3Bucket = process.env.BUCKET_NAME;
const s3Endpoint = process.env.AWS_ENDPOINT_URL;
const useS3 = !!(
  s3Bucket &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = !!blobToken;

async function deleteRemoteOrLocalFile(filePathOrUrl: string) {
  if (!filePathOrUrl) return;

  try {
    if (useS3 && filePathOrUrl.includes(s3Bucket!)) {
      const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        endpoint: s3Endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        },
      });
      const key = filePathOrUrl.split("/").pop();
      if (key) {
        await client.send(
          new DeleteObjectCommand({
            Bucket: s3Bucket,
            Key: key,
          })
        );
        console.log(`[storage] Deleted S3 object: ${key}`);
      }
    } else if (useBlob && filePathOrUrl.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(filePathOrUrl, { token: blobToken });
      console.log(`[storage] Deleted Vercel Blob: ${filePathOrUrl}`);
    }
  } catch (err: any) {
    console.warn(`[storage] Could not delete remote file ${filePathOrUrl}:`, err.message);
  }

  try {
    const filename = path.basename(filePathOrUrl);
    const localDir = process.env.VERCEL ? "/tmp/uploads" : path.resolve("uploads");
    const localPath = path.join(localDir, filename);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`[storage] Deleted local file: ${localPath}`);
    }
  } catch (err: any) {
    console.warn(`[storage] Could not delete local file for ${filePathOrUrl}:`, err.message);
  }
}

async function cleanup() {
  console.log("Starting full cleanup of applications and uploaded files...");

  const reqDocs = await db.select().from(requestDocuments);
  console.log(`Found ${reqDocs.length} request documents in DB.`);
  for (const doc of reqDocs) {
    if (doc.storagePath) {
      await deleteRemoteOrLocalFile(doc.storagePath);
    }
  }

  const ordDocs = await db.select().from(orderDocuments);
  console.log(`Found ${ordDocs.length} order documents in DB.`);
  for (const doc of ordDocs) {
    if (doc.fileUrl) {
      await deleteRemoteOrLocalFile(doc.fileUrl);
    }
  }

  const localDir = process.env.VERCEL ? "/tmp/uploads" : path.resolve("uploads");
  if (fs.existsSync(localDir)) {
    const files = fs.readdirSync(localDir);
    console.log(`Found ${files.length} files in local uploads directory.`);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(localDir, f));
        console.log(`[storage] Removed local uploads file: ${f}`);
      } catch (e: any) {
        console.warn(`Failed to remove ${f}:`, e.message);
      }
    }
  }

  console.log("Deleting database records...");
  await db.delete(requestDocuments);
  console.log("Deleted request_documents records.");

  await db.delete(serviceRequests);
  console.log("Deleted service_requests records.");

  await db.delete(orderDocuments);
  console.log("Deleted order_documents records.");

  await db.delete(orderFieldValues);
  console.log("Deleted order_field_values records.");

  await db.delete(payments);
  console.log("Deleted payments records.");

  await db.delete(invoices);
  console.log("Deleted invoices records.");

  await db.delete(estimates);
  console.log("Deleted estimates records.");

  await db.delete(orders);
  console.log("Deleted orders records.");

  console.log("All user applications, orders, and uploaded files have been completely removed.");
  await pool.end();
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("Cleanup failed with error:", err);
  process.exit(1);
});
