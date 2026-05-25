import mongoose from "mongoose";
import { env } from "../config/env.js";

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
