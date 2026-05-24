import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { authUser } from "../middleware/auth.middleware.js";
import redisClient from "../services/redis.service.js";
import { env } from "../config/env.js";

vi.mock("../services/redis.service.js", () => {
    return {
        default: {
            get: vi.fn(),
        },
    };
});

describe("Auth Middleware", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = {
            cookies: {},
            headers: {},
        };
        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            cookie: vi.fn(),
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    it("should return 401 if no token is present", async () => {
        await authUser(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized User" });
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is blacklisted in Redis", async () => {
        req.cookies.token = "blacklisted_token";
        redisClient.get.mockResolvedValue("logout");

        await authUser(req, res, next);

        expect(redisClient.get).toHaveBeenCalledWith("blacklisted_token");
        expect(res.cookie).toHaveBeenCalledWith("token", "");
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next and set req.user if token is valid", async () => {
        const payload = { _id: "user123", email: "test@domain.com" };
        const token = jwt.sign(payload, env.JWT_SECRET);
        req.cookies.token = token;
        redisClient.get.mockResolvedValue(null);

        await authUser(req, res, next);

        expect(req.user).toBeDefined();
        expect(req.user._id).toBe("user123");
        expect(req.user.email).toBe("test@domain.com");
        expect(next).toHaveBeenCalled();
    });

    it("should extract token from Authorization header if cookies are missing", async () => {
        const payload = { _id: "user456", email: "auth@domain.com" };
        const token = jwt.sign(payload, env.JWT_SECRET);
        req.headers.authorization = `Bearer ${token}`;
        redisClient.get.mockResolvedValue(null);

        await authUser(req, res, next);

        expect(req.user.email).toBe("auth@domain.com");
        expect(next).toHaveBeenCalled();
    });
});
