import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectMongodb, closeMongodb } from "./config/mongodb.js";
import { initSocket } from "./utils/socket.js";
import adminRouter from "./routes/adminRoutes.js";
import employeeRouter from "./routes/employeeRoutes.js";
import payrollRouter from "./routes/payrollRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import leaveRouter from "./routes/leaveRoute.js";
import settingsRouter from "./routes/adminSettingsRoute.js";
import notificationRouter from "./routes/notificationRoutes.js";
import authRouter from "./routes/authRoutes.js";
import announcementRouter from "./routes/announcementRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { logErrorToFile } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app config
const app = express();
const server = http.createServer(app);
const io = initSocket(server);
app.set("io", io);

const port = 3000;

// middleware
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-admin-token",
      "x-employee-token",
      "x-admin-id",
      "x-employee-id",
      "x-role",
      "X-Requested-With",
      "Accept",
    ],
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "25mb", strict: false }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Ensure upload directory exists
const uploadsStaticDir = path.resolve(__dirname, "uploads");
const avatarsStaticDir = path.resolve(__dirname, "uploads/avatars");
if (!fs.existsSync(avatarsStaticDir)) {
  fs.mkdirSync(avatarsStaticDir, { recursive: true });
}

// Serve uploaded profile images and avatars
app.use("/uploads", express.static(uploadsStaticDir, { maxAge: "1d", fallthrough: true }));
app.use("/uploads", (req, res) => {
  res.status(404).send("File not found");
});

// database connection (with graceful offline fallback)
connectMongodb().catch((err) => {
  console.warn("MongoDB Connection Error:", err?.message || err);
});

// api endpoints
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/user", userRouter);
app.use("/api/employee", employeeRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/admin", adminRouter);
app.use("/api/pay", payrollRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/payslips", payrollRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/announcements", announcementRouter);

// database offline fallback error handler for API routes
app.use("/api", (err, req, res, next) => {
  if (
    err.name === "MongooseError" ||
    err.name === "MongoNetworkError" ||
    (err.message &&
      (err.message.includes("buffering timed out") ||
        err.message.includes("not connected") ||
        err.message.includes("ECONNREFUSED")))
  ) {
    console.warn("[AI Studio] Database offline — returning fallback response for API route");
    if (req.method === "GET") {
      return res.json(req.path.endsWith("s") || req.path.endsWith("s/") ? [] : {});
    }
    return res.status(503).json({ error: "Service temporarily unavailable (database offline)" });
  }
  console.error("API error:", err);
  logErrorToFile({
    route: req.originalUrl || req.url || "/api",
    statusCode: 500,
    error: err,
    req,
    details: "Server-side Express API exception",
  });
  return res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

// serve frontend static assets
const clientDistPath = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// SPA fallback for all client routes
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
    const indexPath = path.join(clientDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(200).send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"><title>Loading...</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Loading Application...</h2><p>Please wait a moment while the frontend builds.</p></body></html>`);
  }
  next();
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});

// Graceful Shutdown & Process Signal Handling to prevent hanging socket connections
let isShuttingDown = false;
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Backend] Received ${signal}. Initiating graceful shutdown...`);

  // Close socket.io connections
  if (io) {
    try {
      io.close(() => {
        console.log("[Backend] Socket.IO connections closed.");
      });
    } catch (e) {
      console.warn("[Backend] Error closing Socket.IO:", e.message);
    }
  }

  // Stop receiving new connections
  server.close(async () => {
    console.log("[Backend] HTTP server closed.");
    try {
      await closeMongodb();
    } catch (err) {
      console.warn("[Backend] Error closing MongoDB connection:", err.message);
    }
    process.exit(0);
  });

  // Force shutdown if connections do not close within 5 seconds
  setTimeout(() => {
    console.error("[Backend] Forced termination after timeout.");
    process.exit(1);
  }, 5000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));


