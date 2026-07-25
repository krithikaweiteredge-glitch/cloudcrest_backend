import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import router from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const app = express();

// Behind Vercel / a proxy, trust it so secure cookies and client IPs work.
app.set("trust proxy", 1);

// Security headers. API only serves JSON + file downloads, so the strict CSP
// helmet enables by default doesn't get in the way.
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin / server-to-server requests have no Origin header.
      if (!origin) return callback(null, true);
      // With no explicit allowlist (local dev), reflect localhost origins only.
      if (env.corsOrigins.length === 0) {
        return callback(null, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
      }
      return callback(null, env.corsOrigins.includes(origin));
    },
    credentials: true,
  }),
);

app.use(cookieParser());
// Cap request bodies so a huge JSON payload can't exhaust memory.
app.use(express.json({ limit: "1mb" }));

// Static uploads folder
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api", router);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

// 404 + terminal error handler must come after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`Server is running and listening on port ${env.port}`);
  });
}

export default app;
