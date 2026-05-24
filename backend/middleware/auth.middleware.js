import jwt from "jsonwebtoken";
import redisClient from "../services/redis.service.js";
import { env } from "../config/env.js";

export const authUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token =
            req.cookies.token || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

        if (!token) {
            return res.status(401).send({ error: "Unauthorized User" });
        }

        const isBlackListed = await redisClient.get(token);

        if (isBlackListed) {
            res.cookie("token", "");
            return res.status(401).send({ error: "Unauthorized User" });
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);
        res.status(401).send({ error: "Unauthorized User" });
    }
};
