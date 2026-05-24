import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import User from "../models/user.model.js";

let app;

beforeAll(async () => {
    // Set env vars before importing app (for env.js Proxy to pick them up)
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("localhost:27017/test-db")) {
        // Already set by CI env or vitest config — use as-is
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test_super_secret";

    // Import app after env is configured — connect() is called inside app.js
    const appModule = await import("../app.js");
    app = appModule.default;

    // Wait for mongoose to actually connect
    if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("MongoDB connection timeout")), 15000);
            mongoose.connection.once("open", () => {
                clearTimeout(timeout);
                resolve();
            });
            mongoose.connection.once("error", (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
}, 30000);

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    // Clean up collection between tests
    if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            await collection.deleteMany({});
        }
    }
});

describe("User Routes API Integration", () => {
    it("should successfully register a new user", async () => {
        const res = await request(app).post("/users/register").send({
            email: "newuser@domain.com",
            password: "securepassword",
        });

        expect(res.status).toBe(201);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe("newuser@domain.com");
        expect(res.body.token).toBeDefined();

        const dbUser = await User.findOne({ email: "newuser@domain.com" });
        expect(dbUser).not.toBeNull();
    });

    it("should fail registration on invalid inputs", async () => {
        const res = await request(app).post("/users/register").send({
            email: "invalidemail",
            password: "12",
        });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    it("should successfully login a registered user", async () => {
        // Create user first
        const hashedPassword = await User.hashPassword("testpass");
        await User.create({
            email: "loginuser@domain.com",
            password: hashedPassword,
        });

        const res = await request(app).post("/users/login").send({
            email: "loginuser@domain.com",
            password: "testpass",
        });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe("loginuser@domain.com");
    });

    it("should fail login with invalid credentials", async () => {
        const res = await request(app).post("/users/login").send({
            email: "loginuser@domain.com",
            password: "wrongpassword",
        });

        expect(res.status).toBe(401);
        expect(res.body.errors[0].msg).toBe("Invalid credentials");
    });
});
