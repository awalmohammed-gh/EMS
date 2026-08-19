import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { connectMongodb } from "./config/mongodb.js";
import adminRouter from "./routes/adminRoutes.js";
import employeeRouter from "./routes/employeeRoutes.js";
import payrollRouter from "./routes/payrollRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import leaveRouter from "./routes/leaveRoute.js";
import settingsRouter from "./routes/adminSettingsRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app config
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// database connection (with graceful offline fallback)
await connectMongodb();

// api endpoints
app.use("/api/employee", employeeRouter);
app.use("/api/admin", adminRouter);
app.use("/api/pay", payrollRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/settings", settingsRouter);

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
  return res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

// serve frontend static assets
const clientDistPath = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// SPA fallback for all client routes
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(clientDistPath, "index.html"));
  }
  next();
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
