import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure local 'uploads' directory exists
// On serverless environments like Vercel, the root filesystem is read-only. We use '/tmp/uploads' instead.
const uploadDir = process.env.VERCEL ? "/tmp/uploads" : path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create upload directory ${uploadDir}:`, error);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique file name: timestamp + clean original name
    const timestamp = Date.now();
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}-${sanitizedOriginal}`);
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit files to 10MB
  },
});
