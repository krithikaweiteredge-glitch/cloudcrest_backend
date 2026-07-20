import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import router from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any origin dynamically to avoid CORS issues across different ports/deployments
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Static uploads folder
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api", router);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
