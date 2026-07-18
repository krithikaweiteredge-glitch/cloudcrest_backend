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
    origin: ["http://localhost:8080", "http://127.0.0.1:8080"], // Frontend Vite Port
    credentials: true, // Allow sharing cookies
  })
);
app.use(cookieParser());
app.use(express.json());

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
