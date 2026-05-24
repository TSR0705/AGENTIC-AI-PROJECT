import userModel from "../models/user.model.js";
import * as userService from "../services/user.service.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redis.service.js";

export const createUserController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await userService.createUser(req.body);

        const token = await user.generateJWT();

        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json({ user: userObj, token });
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
};

export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email }).select("+password");

        if (!user) {
            return res.status(401).json({
                errors: [
                    {
                        msg: "Invalid credentials",
                    },
                ],
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                errors: [
                    {
                        msg: "Invalid credentials",
                    },
                ],
            });
        }

        const token = await user.generateJWT();

        const userObj = user.toObject();
        delete userObj.password;

        res.status(200).json({ user: userObj, token });
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
};

export const profileController = async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        res.status(200).json({ user });
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
};

export const logoutController = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        if (token) {
            await redisClient.set(token, "logout", "EX", 86400);
        }

        res.status(200).json({
            message: "Logged out successfully",
        });
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
};

export const getAllUsersController = async (req, res) => {
    try {
        const allUsers = await userService.getAllUsers({ userId: req.user._id });

        res.status(200).json({
            users: allUsers,
        });
    } catch (err) {
        console.error("Get all users error:", err.message);
        res.status(400).send(err.message);
    }
};
