import mongoose from "mongoose";
import dns from "dns";
import { env } from "../config/env.js";

// Set fallback public DNS servers if using SRV connection string
// to resolve local router DNS limitations for SRV records
if (env.MONGODB_URI && env.MONGODB_URI.startsWith("mongodb+srv://")) {
    try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (err) {
        console.warn("Unable to set custom DNS servers, using system default:", err.message);
    }
}

function connect() {
    // Skip if already connected or in the process of connecting
    const state = mongoose.connection.readyState;
    if (state === 1 || state === 2) {
        return;
    }

    mongoose
        .connect(env.MONGODB_URI)
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch((err) => {
            console.error("MongoDB connection error:", err.message);
        });
}

export default connect;
