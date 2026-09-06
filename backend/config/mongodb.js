import mongoose from "mongoose";

/**
 * Global cache for Mongoose connection across serverless invocations.
 * In serverless lambdas (e.g. Vercel), global variables persist across warm invocations.
 */
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let isListenersAttached = false;

export async function connectDB() {
  return connectMongodb();
}

export const connectMongodb = async () => {
  if (cached.conn && mongoose.connection.readyState >= 1) {
    return cached.conn;
  }

  // Prevent Mongoose from buffering queries indefinitely when offline
  mongoose.set("bufferCommands", false);

  if (!isListenersAttached) {
    mongoose.connection.on("connected", () => {
      console.log("[MongoDB] Connection established successfully.");
    });
    mongoose.connection.on("error", (err) => {
      console.warn("[MongoDB] Connection error:", err?.message || err);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("[MongoDB] Connection disconnected.");
      if (cached) {
        cached.conn = null;
      }
    });
    isListenersAttached = true;
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("[MongoDB] MONGO_URI / MONGODB_URI environment variable not set. Running with database offline fallback.");
    return null;
  }

  if (!cached.promise) {
    const baseUri = mongoUri.endsWith("/") ? mongoUri.slice(0, -1) : mongoUri;
    const uri = baseUri.includes("?") ? baseUri : `${baseUri}/employee-system`;

    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        console.log("[MongoDB] Connected to database.");
        return m.connection || mongoose.connection;
      })
      .catch((error) => {
        cached.promise = null;
        console.warn("[MongoDB] Connection Error:", error.message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.warn("[MongoDB] Connection Error:", error.message);
    return null;
  }
};

export const closeMongodb = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      if (cached) {
        cached.conn = null;
        cached.promise = null;
      }
      console.log("[MongoDB] Connection gracefully closed.");
    }
  } catch (err) {
    console.warn("[MongoDB] Error closing connection:", err?.message || err);
  }
};
