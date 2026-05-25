import mongoose from "mongoose";
import dns from "dns";
import { env } from "../config/env.js";

if (process.env.NODE_ENV !== "production" && env.MONGODB_URI?.startsWith("mongodb+srv://")) {
    try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (err) {
        console.warn("DNS fallback failed:", err.message);
    }
}

async function connect() {
    const state = mongoose.connection.readyState;

    if (state === 1 || state === 2) {
        return;
    }

    try {
        await mongoose.connect(env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
}

export default connect;
