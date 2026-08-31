import mongoose from "mongoose";

let isListenersAttached = false;

export const connectMongodb = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
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
    });
    isListenersAttached = true;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("[MongoDB] MONGODB_URI environment variable not set. Running with database offline fallback.");
    return null;
  }

  try {
    const baseUri = mongoUri.endsWith("/") ? mongoUri.slice(0, -1) : mongoUri;
    const uri = baseUri.includes("?") ? baseUri : `${baseUri}/employee-system`;

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("[MongoDB] Connected to database.");
    return mongoose.connection;
  } catch (error) {
    console.warn("[MongoDB] Connection Error:", error.message);
    return null;
  }
};

export const closeMongodb = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log("[MongoDB] Connection gracefully closed.");
    }
  } catch (err) {
    console.warn("[MongoDB] Error closing connection:", err?.message || err);
  }
};
