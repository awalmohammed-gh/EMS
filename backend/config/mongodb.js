import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

export const connectMongodb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log("MongoDB Connection Error:", error.message);
  }
};

export const closeMongodb = async () => {
  try {
    await mongoose.connection.close();

    console.log("MongoDB connection closed");
  } catch (error) {
    console.log("Error closing MongoDB:", error.message);
  }
};
