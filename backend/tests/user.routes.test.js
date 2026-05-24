import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/user.model.js";

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = "test_super_secret";

    // Dynamic import to ensure process.env.MONGODB_URI is set before db/db.js connect runs
    const appModule = await import("../app.js");
    app = appModule.default;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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
