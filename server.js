import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
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
import companyRouter from "./backend/routes/companyRoutes.js";
import { CompanySettings } from "./backend/models/CompanySettings.js";
import { logErrorToFile } from "./backend/utils/logger.js";
import { autoCloseAllStaleShifts } from "./backend/controllers/employeeAttendance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env with absolute path resolution from root and backend
const loadEnvironment = () => {
  const rootEnvPath = path.resolve(__dirname, ".env");
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  } else {
    dotenv.config();
  }

  const backendEnvPath = path.resolve(__dirname, "backend/.env");
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath, override: false });
  }

  // Sanitize empty string values so they are treated as unset
  ["MONGO_URI", "MONGODB_URI"].forEach((key) => {
    if (process.env[key] !== undefined && process.env[key].trim() === "") {
      delete process.env[key];
    }
  });

  // Normalize MONGO_URI and MONGODB_URI
  if (process.env.MONGO_URI && !process.env.MONGODB_URI) {
    process.env.MONGODB_URI = process.env.MONGO_URI;
  } else if (process.env.MONGODB_URI && !process.env.MONGO_URI) {
    process.env.MONGO_URI = process.env.MONGODB_URI;
  }
};

loadEnvironment();

// Resolve port dynamically: enforce port 3000 as required by environment architecture
const parsePort = () => {
  const portArgIndex = process.argv.indexOf("--port");
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(val) && val > 0) {
      if (val === 5173) {
        console.warn("[Server Config] Port 5173 detected in arguments; redirecting to port 3000 to avoid proxy conflict.");
        return 3000;
      }
      return val;
    }
  }
  if (process.env.PORT) {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val) && val > 0) {
      if (val === 5173) {
        console.warn("[Server Config] PORT=5173 detected in environment; enforcing port 3000 for container reverse proxy.");
        return 3000;
      }
      return val;
    }
  }
  return 3000;
};

const PORT = parsePort();

// Validate critical environment variables during server startup
const validateEnvironmentVariables = () => {
  const warnings = [];

  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    warnings.push("[Server Config] Notice: Neither MONGO_URI nor MONGODB_URI is set. Database operations will run with resilient offline fallback.");
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    if (process.env.NODE_ENV === "production") {
      warnings.push("[CRITICAL PRODUCTION WARNING] JWT_SECRET is not configured in production environment!");
    } else {
      process.env.JWT_SECRET = "default_secure_jwt_secret_dev_key_eyenit_2026";
      console.info("[Server Config] Initialized fallback JWT_SECRET for secure runtime session handling.");
    }
  }

  if (!process.env.CLIENT_URL) {
    process.env.CLIENT_URL = `http://localhost:${PORT}`;
  }

  warnings.forEach((w) => console.warn(w));
  console.log(`[Server Config] Environment validation complete (NODE_ENV: ${process.env.NODE_ENV || "development"}, PORT: ${PORT})`);
};

validateEnvironmentVariables();

// Express and HTTP Server initialization
const app = express();
const server = http.createServer(app);

// Server listener error handling to catch port conflicts (EADDRINUSE)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[Server Fatal] Port ${PORT} is already in use by another process or zombie task.`);
    console.error(`[Server Fatal] Please terminate any conflicting process before restarting.`);
  } else {
    console.error("[Server Fatal] HTTP server listener error:", err);
  }
});

// Socket.IO setup
const io = initSocket(server);
app.set("io", io);

// Standard CORS middleware for standalone local and production environments
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin === process.env.CLIENT_URL ||
        origin === process.env.FRONTEND_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
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

// Uploads directory preparation and static route for persistent storage
const uploadsStaticDir = path.resolve(__dirname, "backend/uploads");
const avatarsStaticDir = path.resolve(__dirname, "backend/uploads/avatars");
const brandingStaticDir = path.resolve(__dirname, "backend/uploads/branding");
try {
  if (!fs.existsSync(avatarsStaticDir)) {
    fs.mkdirSync(avatarsStaticDir, { recursive: true });
  }
  if (!fs.existsSync(brandingStaticDir)) {
    fs.mkdirSync(brandingStaticDir, { recursive: true });
  }
} catch (fsErr) {
  console.warn("[Server] Note: Error ensuring upload directory exists:", fsErr.message);
}
app.use("/uploads", express.static(uploadsStaticDir, { maxAge: "1d", fallthrough: true }));
app.use("/uploads", (req, res) => {
  res.status(404).send("File not found");
});

// Health check endpoint (always accessible regardless of DB state)
app.get("/api/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? "healthy" : "degraded",
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Dedicated public branding endpoint: returns configured company name, logo, and theme colors with default values
app.get("/api/company/public-branding", async (req, res) => {
  const defaultBranding = {
    companyName: "Enterprise Organization",
    logo: "/eyenit_logo.png",
    logoUrl: "/eyenit_logo.png",
    welcomeBackgroundUrl: "",
    primaryColor: "#0B1E48",
    themeColors: {
      primary: "#0B1E48",
      accent: "#ff5500",
    },
    contactEmail: "admin@company.com",
    isConfigured: false,
  };

  try {
    let settingsDoc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        settingsDoc = await CompanySettings.findOne().lean();
      } catch (dbErr) {
        console.warn("[Server] DB lookup warning for public branding:", dbErr?.message);
      }
    }

    if (!settingsDoc) {
      return res.status(200).json({
        success: true,
        name: defaultBranding.companyName,
        companyName: defaultBranding.companyName,
        logo: defaultBranding.logo,
        logoUrl: defaultBranding.logoUrl,
        backgroundUrl: defaultBranding.welcomeBackgroundUrl,
        welcomeBackgroundUrl: defaultBranding.welcomeBackgroundUrl,
        themeColor: defaultBranding.primaryColor,
        primaryColor: defaultBranding.primaryColor,
        themeColors: defaultBranding.themeColors,
        company: defaultBranding,
        isConfigured: false,
      });
    }

    const primaryColor = settingsDoc.primaryColor || defaultBranding.primaryColor;
    const companyName = settingsDoc.companyName || defaultBranding.companyName;
    const logoUrl = settingsDoc.logoUrl || defaultBranding.logoUrl;
    const backgroundUrl = settingsDoc.welcomeBackgroundUrl || "";

    const brandingData = {
      name: companyName,
      companyName,
      logo: logoUrl,
      logoUrl,
      backgroundUrl,
      welcomeBackgroundUrl: backgroundUrl,
      themeColor: primaryColor,
      primaryColor,
      themeColors: {
        primary: primaryColor,
        accent: "#ff5500",
      },
      contactEmail: settingsDoc.contactEmail || defaultBranding.contactEmail,
      isConfigured: Boolean(settingsDoc.isConfigured),
    };

    return res.status(200).json({
      success: true,
      name: companyName,
      companyName,
      logo: logoUrl,
      logoUrl,
      backgroundUrl,
      welcomeBackgroundUrl: backgroundUrl,
      themeColor: primaryColor,
      primaryColor,
      themeColors: brandingData.themeColors,
      company: brandingData,
      isConfigured: brandingData.isConfigured,
    });
  } catch (error) {
    console.error("[Server] Error serving /api/company/public-branding:", error);
    return res.status(200).json({
      success: true,
      name: defaultBranding.companyName,
      companyName: defaultBranding.companyName,
      logo: defaultBranding.logo,
      logoUrl: defaultBranding.logoUrl,
      backgroundUrl: defaultBranding.welcomeBackgroundUrl,
      welcomeBackgroundUrl: defaultBranding.welcomeBackgroundUrl,
      themeColor: defaultBranding.primaryColor,
      primaryColor: defaultBranding.primaryColor,
      themeColors: defaultBranding.themeColors,
      company: defaultBranding,
      isConfigured: false,
    });
  }
});

// Database readiness guard for API routes (fails fast with 503 instead of buffering/hanging queries)
app.use("/api", (req, res, next) => {
  if (
    req.path === "/health" ||
    req.path === "/company/public-branding" ||
    req.path === "/company/status" ||
    req.path === "/company/init-status"
  ) {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database connection is not available. Please verify MongoDB status.",
      code: "DATABASE_DISCONNECTED",
    });
  }
  next();
});

// Mount modular API routers
app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
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
app.use(async (req, res, next) => {
  if (
    req.method === "GET" &&
    !req.path.startsWith("/api") &&
    !req.path.startsWith("/uploads") &&
    !req.path.startsWith("/socket.io")
  ) {
    if (viteDevServer) {
      try {
        const url = req.originalUrl || req.url;
        const rootIndexPath = path.join(clientRoot, "index.html");
        if (fs.existsSync(rootIndexPath)) {
          let template = fs.readFileSync(rootIndexPath, "utf-8");
          template = await viteDevServer.transformIndexHtml(url, template);
          return res.status(200).set({ "Content-Type": "text/html" }).send(template);
        }
      } catch (viteTransformErr) {
        console.warn("[Server] Vite transformIndexHtml notice:", viteTransformErr.message);
      }
    }

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

// Start Express and Socket.IO server: bind immediately so port is open without delay
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] ========================================================`);
  console.log(`[Server] Server running on http://localhost:${PORT}`);
  console.log(`[Server] Backend API listening on http://0.0.0.0:${PORT}/api`);
  console.log(`[Server] Vite middleware ready at http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[Server] ========================================================`);
});

// Initialize database connection asynchronously in the background
const initDatabase = async () => {
  try {
    console.log("[Server] Initializing database connection...");
    await connectMongodb();
    if (mongoose.connection.readyState === 1) {
      console.log("[Server] Database ready for incoming requests.");

      // Run initial auto-close sweep for unclosed shifts from prior calendar days
      try {
        await autoCloseAllStaleShifts();
      } catch (sweepErr) {
        console.warn("[Server] Stale shift auto-close sweep notice:", sweepErr.message);
      }

      // Schedule periodic background sweep to catch 7:30 PM auto-close and midnight rollovers
      setInterval(async () => {
        try {
          if (mongoose.connection.readyState === 1) {
            await autoCloseAllStaleShifts();
          }
        } catch {
          // ignore background interval sweep errors
        }
      }, 60 * 1000).unref();
    } else {
      console.warn("[Server] Running in degraded mode: database is disconnected or offline.");
    }
  } catch (error) {
    console.warn("[Server] Notice: Database connection not established:", error.message);
  }
};

initDatabase();

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

export default app;
export { app, server, io };
