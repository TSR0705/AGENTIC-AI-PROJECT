import mongoose from "mongoose";
import { env } from "../config/env.js";

function connect() {
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
