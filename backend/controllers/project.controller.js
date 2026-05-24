import projectModel from "../models/project.model.js";
import * as projectService from "../services/project.service.js";
import { validationResult } from "express-validator";

export const createProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name } = req.body;
        const userId = req.user._id;

        const newProject = await projectService.createProject({ name, userId });

        res.status(201).json(newProject);
    } catch (err) {
        console.error("Create project error:", err.message);
        res.status(400).send(err.message);
    }
};

export const getAllProject = async (req, res) => {
    try {
        const userId = req.user._id;

        const allUserProjects = await projectService.getAllProjectByUserId({
            userId,
        });

        return res.status(200).json({
            projects: allUserProjects,
        });
    } catch (err) {
        console.error("Get all projects error:", err.message);
        res.status(400).json({ error: err.message });
    }
};

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, users } = req.body;
        const userId = req.user._id;

        const project = await projectService.addUsersToProject({
            projectId,
            users,
            userId,
        });

        return res.status(200).json({
            project,
        });
    } catch (err) {
        console.error("Add user to project error:", err.message);
        res.status(400).json({ error: err.message });
    }
};

export const getProjectById = async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user._id;

    try {
        const project = await projectService.getProjectById({ projectId, userId });

        return res.status(200).json({
            project,
        });
    } catch (err) {
        console.error("Get project by ID error:", err.message);
        res.status(400).json({ error: err.message });
    }
};

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, fileTree } = req.body;
        const userId = req.user._id;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree,
            userId,
        });

        return res.status(200).json({
            project,
        });
    } catch (err) {
        console.error("Update file tree error:", err.message);
        res.status(400).json({ error: err.message });
    }
};
