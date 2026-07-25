import multer from "multer";

// Files are held in memory so the storage layer (src/utils/storage.ts) can send
// the buffer to Vercel Blob — or write it to disk as a local-dev fallback.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
