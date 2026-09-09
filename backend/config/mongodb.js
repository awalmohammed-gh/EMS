
import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri || !uri.trim()) {
    const errorMsg = "MongoDB URI not found. Please set MONGODB_URI or MONGO_URI in your environment.";
    console.error(`[MongoDB] Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    await mongoose.connect(uri.trim(), {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    });
    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};

const closeMongodb = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    }
  } catch (error) {
    console.error("MongoDB close error:", error.message);
  }
};

export const connectMongodb = connectDB;
export const disconnectDB = closeMongodb;
export { connectDB, closeMongodb };
export default connectDB;


