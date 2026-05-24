import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = "test_super_secret_project";

    const appModule = await import("../app.js");
    app = appModule.default;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            await collection.deleteMany({});
        }
    }
});

describe("Project Routes API Integration", () => {
    it("should successfully create a new project for authenticated user", async () => {
        const user = await User.create({
            email: "owner@domain.com",
            password: "hashedpassword",
        });
        const token = user.generateJWT();

        const res = await request(app)
            .post("/projects/create")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "AlphaProject" });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe("alphaproject");
        expect(res.body.users).toContain(user._id.toString());
    });

    it("should block project creation for unauthenticated request", async () => {
        const res = await request(app).post("/projects/create").send({ name: "BetaProject" });

        expect(res.status).toBe(401);
    });

    it("should allow a member to fetch project details", async () => {
        const user = await User.create({
            email: "member@domain.com",
            password: "hashedpassword",
        });
        const token = user.generateJWT();

        const project = await Project.create({
            name: "gammaproject",
            users: [user._id],
        });

        const res = await request(app)
            .get(`/projects/get-project/${project._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.project.name).toBe("gammaproject");
    });

    it("should deny project access if authenticated user is not a member", async () => {
        const owner = await User.create({
            email: "owner@domain.com",
            password: "hashedpassword",
        });
        const intruder = await User.create({
            email: "intruder@domain.com",
            password: "hashedpassword",
        });
        const intruderToken = intruder.generateJWT();

        const project = await Project.create({
            name: "privateproject",
            users: [owner._id],
        });

        const res = await request(app)
            .get(`/projects/get-project/${project._id}`)
            .set("Authorization", `Bearer ${intruderToken}`);

        expect(res.status).toBe(400); // throws error -> status 400
        expect(res.body.error).toContain("Access Denied");
    });
});
