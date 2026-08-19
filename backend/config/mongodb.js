import mongoose from "mongoose";

export const connectMongodb = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // Prevent Mongoose from buffering queries indefinitely when offline
  mongoose.set("bufferCommands", false);

  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI environment variable not set. Running with database offline fallback.");
    return;
  }

  try {
    const baseUri = process.env.MONGODB_URI.endsWith("/")
      ? process.env.MONGODB_URI.slice(0, -1)
      : process.env.MONGODB_URI;
    const uri = baseUri.includes("?")
      ? baseUri
      : `${baseUri}/employee-system`;
    await mongoose.connect(uri);
    console.log("MongoDB Connected");
  } catch (error) {
    console.warn("MongoDB Connection Error:", error.message);
  }
};
