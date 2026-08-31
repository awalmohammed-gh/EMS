import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectMongodb, closeMongodb } from "./backend/config/mongodb.js";
import { initSocket } from "./backend/utils/socket.js";

// Import all API routes
import adminRouter from "./backend/routes/adminRoutes.js";
import employeeRouter from "./backend/routes/employeeRoutes.js";
import payrollRouter from "./backend/routes/payrollRoutes.js";
import attendanceRouter from "./backend/routes/attendanceRoutes.js";
import dashboardRouter from "./backend/routes/dashboardRoutes.js";
import leaveRouter from "./backend/routes/leaveRoute.js";
import settingsRouter from "./backend/routes/adminSettingsRoute.js";
import notificationRouter from "./backend/routes/notificationRoutes.js";
import authRouter from "./backend/routes/authRoutes.js";
import announcementRouter from "./backend/routes/announcementRoutes.js";
import userRouter from "./backend/routes/userRoutes.js";
import { logErrorToFile } from "./backend/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express and HTTP Server initialization
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = initSocket(server);
app.set("io", io);

const PORT = 3000;

// Security and parsing middleware
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

// Uploads directory preparation and static route
const uploadsStaticDir = path.resolve(__dirname, "backend/uploads");
const avatarsStaticDir = path.resolve(__dirname, "backend/uploads/avatars");
if (!fs.existsSync(avatarsStaticDir)) {
  fs.mkdirSync(avatarsStaticDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsStaticDir, { maxAge: "1d", fallthrough: true }));
app.use("/uploads", (req, res) => {
  res.status(404).send("File not found");
});

// Database connection initialization
connectMongodb().catch((err) => {
  console.warn("[Server] Initial MongoDB connection notice:", err?.message || err);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Mount modular API routers
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

// API Error handling middleware (includes MongoDB offline fallback)
app.use("/api", (err, req, res, next) => {
  if (
    err.name === "MongooseError" ||
    err.name === "MongoNetworkError" ||
    (err.message &&
      (err.message.includes("buffering timed out") ||
        err.message.includes("not connected") ||
        err.message.includes("ECONNREFUSED")))
  ) {
    console.warn("[Server] Database offline — returning fallback response for API route");
    if (req.method === "GET") {
      return res.json(req.path.endsWith("s") || req.path.endsWith("s/") ? [] : {});
    }
    return res.status(503).json({ error: "Service temporarily unavailable (database offline)" });
  }
  console.error("[Server] API error:", err);
  logErrorToFile({
    route: req.originalUrl || req.url || "/api",
    statusCode: 500,
    error: err,
    req,
    details: "Root server Express API exception",
  });
  return res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

// Client serving: Integrate Vite dev middleware in development or serve static dist in production
const clientRoot = path.resolve(__dirname, "client");
const clientDistPath = path.resolve(__dirname, "client/dist");
const isProduction = process.env.NODE_ENV === "production";

let viteDevServer = null;

if (!isProduction && fs.existsSync(path.join(clientRoot, "index.html"))) {
  try {
    const { createServer: createViteServer } = await import("vite");
    viteDevServer = await createViteServer({
      root: clientRoot,
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(viteDevServer.middlewares);
    console.log("[Server] Vite dev middleware successfully attached to Express.");
  } catch (viteErr) {
    console.warn("[Server] Vite dev middleware notice, using static fallback:", viteErr.message);
  }
}

// Serve compiled static assets from client/dist
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Single Page Application (SPA) fallback
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
    const distIndexPath = path.join(clientDistPath, "index.html");
    if (fs.existsSync(distIndexPath)) {
      return res.sendFile(distIndexPath);
    }
    const rootIndexPath = path.join(clientRoot, "index.html");
    if (fs.existsSync(rootIndexPath)) {
      return res.sendFile(rootIndexPath);
    }
  }
  next();
});

// Start Express and Socket.IO server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Application running on http://0.0.0.0:${PORT}`);
});

// Graceful Shutdown & Process Signal Handling (SIGINT/SIGTERM)
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  // Close Vite Dev Server if active
  if (viteDevServer) {
    try {
      await viteDevServer.close();
      console.log("[Server] Vite Dev Server closed.");
    } catch (e) {
      console.warn("[Server] Error closing Vite Dev Server:", e.message);
    }
  }

  // Close active Socket.IO connections
  if (io) {
    try {
      io.close(() => {
        console.log("[Server] Socket.IO connections closed.");
      });
    } catch (e) {
      console.warn("[Server] Error closing Socket.IO:", e.message);
    }
  }

  // Stop accepting new HTTP requests and close server
  server.close(async () => {
    console.log("[Server] HTTP server closed.");
    try {
      await closeMongodb();
    } catch (err) {
      console.warn("[Server] Error during database shutdown:", err.message);
    }
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful close hangs
  setTimeout(() => {
    console.error("[Server] Forced termination after timeout.");
    process.exit(1);
  }, 5000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Global unhandled error handlers
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled Promise Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[Server] Uncaught Exception:", error);
});

export { app, server, io };
