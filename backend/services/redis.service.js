import Redis from "ioredis";
import { env } from "../config/env.js";

let client;
let useMemoryDb = false;
const memoryDb = new Map();

try {
    client = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1, // fail fast so we fall back
        showFriendlyErrorStack: true,
    });

    client.on("error", (err) => {
        if (!useMemoryDb) {
            console.warn("Redis connection error. Falling back to in-memory storage for blacklisted tokens.");
            useMemoryDb = true;
        }
    });

    client.on("connect", () => {
        console.log("Redis connected successfully");
    });
} catch (error) {
    console.warn("Could not initialize Redis. Falling back to in-memory storage.");
    useMemoryDb = true;
}

const redisClient = {
    async get(key) {
        if (useMemoryDb) {
            return memoryDb.get(key) || null;
        }
        try {
            return await client.get(key);
        } catch (err) {
            useMemoryDb = true;
            return memoryDb.get(key) || null;
        }
    },
    async set(key, value, mode, duration) {
        if (useMemoryDb) {
            memoryDb.set(key, value);
            if (mode === "EX" && duration) {
                setTimeout(() => memoryDb.delete(key), duration * 1000);
            }
            return "OK";
        }
        try {
            if (mode && duration) {
                return await client.set(key, value, mode, duration);
            }
            return await client.set(key, value);
        } catch (err) {
            useMemoryDb = true;
            memoryDb.set(key, value);
            if (mode === "EX" && duration) {
                setTimeout(() => memoryDb.delete(key), duration * 1000);
            }
            return "OK";
        }
    },
};

export default redisClient;
