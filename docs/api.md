# API Reference

This document maps all REST endpoints, validation expectations, authorization requirements, and Socket.io event contracts.

---

## 🔐 REST API: User & Authentication

Base path: `/users`

### 1. Register User

- **Endpoint**: `POST /register`
- **Authentication**: None
- **Validation**:
    - `email`: Must be a valid email address (min length: 6, max: 50).
    - `password`: Must be at least 3 characters.
- **Request Body**:
    ```json
    {
        "email": "developer@domain.com",
        "password": "securepassword"
    }
    ```
- **Response (201 Created)**:
    ```json
    {
        "user": {
            "_id": "603d2f9b8849b231ccf1b0a1",
            "email": "developer@domain.com"
        },
        "token": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```

### 2. Login User

- **Endpoint**: `POST /login`
- **Authentication**: None
- **Request Body**:
    ```json
    {
        "email": "developer@domain.com",
        "password": "securepassword"
    }
    ```
- **Response (200 OK)**:
    ```json
    {
        "user": {
            "_id": "603d2f9b8849b231ccf1b0a1",
            "email": "developer@domain.com"
        },
        "token": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```

### 3. Get User Profile

- **Endpoint**: `GET /profile`
- **Authentication**: Bearer Token or Cookie
- **Response (200 OK)**:
    ```json
    {
        "user": {
            "_id": "603d2f9b8849b231ccf1b0a1",
            "email": "developer@domain.com"
        }
    }
    ```

### 4. Logout User

- **Endpoint**: `GET /logout`
- **Authentication**: Bearer Token or Cookie
- **Action**: Blacklists the token in Redis for the remaining validity duration.
- **Response (200 OK)**:
    ```json
    {
        "message": "Logged out successfully"
    }
    ```

### 5. Fetch All Users

- **Endpoint**: `GET /all`
- **Authentication**: Bearer Token or Cookie
- **Response (200 OK)**:
    ```json
    {
        "users": [
            {
                "_id": "603d2f9b8849b231ccf1b0a2",
                "email": "team-member@domain.com"
            }
        ]
    }
    ```

---

## 📁 REST API: Project Workspace

Base path: `/projects`

### 1. Create Project

- **Endpoint**: `POST /create`
- **Authentication**: Bearer Token or Cookie
- **Request Body**:
    ```json
    {
        "name": "codeweave-dashboard"
    }
    ```
- **Response (201 Created)**:
    ```json
    {
        "name": "codeweave-dashboard",
        "users": ["603d2f9b8849b231ccf1b0a1"],
        "_id": "603d2faf8849b231ccf1b0a3",
        "fileTree": {},
        "messages": []
    }
    ```

### 2. Get All Projects

- **Endpoint**: `GET /all`
- **Authentication**: Bearer Token or Cookie
- **Response (200 OK)**:
    ```json
    {
        "projects": [
            {
                "_id": "603d2faf8849b231ccf1b0a3",
                "name": "codeweave-dashboard",
                "users": ["603d2f9b8849b231ccf1b0a1"]
            }
        ]
    }
    ```

### 3. Add Collaborator

- **Endpoint**: `PUT /add-user`
- **Authentication**: Bearer Token or Cookie
- **Validation**:
    - `projectId`: Must be a valid MongoDB ObjectId.
    - `users`: Array of valid MongoDB ObjectIds.
- **Request Body**:
    ```json
    {
        "projectId": "603d2faf8849b231ccf1b0a3",
        "users": ["603d2f9b8849b231ccf1b0a2"]
    }
    ```
- **Response (200 OK)**:
    ```json
    {
        "project": {
            "_id": "603d2faf8849b231ccf1b0a3",
            "name": "codeweave-dashboard",
            "users": ["603d2f9b8849b231ccf1b0a1", "603d2f9b8849b231ccf1b0a2"]
        }
    }
    ```

### 4. Fetch Project Workspace

- **Endpoint**: `GET /get-project/:projectId`
- **Authentication**: Bearer Token or Cookie (User **must** be a member of the project)
- **Response (200 OK)**:
    ```json
    {
        "project": {
            "_id": "603d2faf8849b231ccf1b0a3",
            "name": "codeweave-dashboard",
            "users": [{ "_id": "603d2f9b8849b231ccf1b0a1", "email": "developer@domain.com" }],
            "fileTree": {
                "index.js": {
                    "file": {
                        "contents": "console.log('hello');"
                    }
                }
            },
            "messages": []
        }
    }
    ```

### 5. Update File Tree

- **Endpoint**: `PUT /update-file-tree`
- **Authentication**: Bearer Token or Cookie (User **must** be a member of the project)
- **Request Body**:
    ```json
    {
        "projectId": "603d2faf8849b231ccf1b0a3",
        "fileTree": {
            "index.js": {
                "file": {
                    "contents": "console.log('world');"
                }
            }
        }
    }
    ```
- **Response (200 OK)**:
    ```json
    {
        "project": {
            "_id": "603d2faf8849b231ccf1b0a3",
            "fileTree": {
                "index.js": {
                    "file": { "contents": "console.log('world');" }
                }
            }
        }
    }
    ```

---

## ⚡ Socket.io Real-Time Interface

Connection URL: `ws://localhost:3000`
Query Parameter requirement: `projectId`
Auth Parameter requirement: `token`

### 1. Connection Event

- **Trigger**: Opening WebSocket.
- **Middleware Check**: Checks if token is valid, decodes user payload, checks if user is a member of the requested project `projectId`. Rejects handshake if checks fail.

### 2. Receive/Send Message (`project-message`)

- **Event Name**: `project-message`
- **Direction**: Bidirectional.
- **Payload**:
    ```json
    {
        "message": "Hey team, check this out!",
        "sender": {
            "_id": "603d2f9b8849b231ccf1b0a1",
            "email": "developer@domain.com"
        }
    }
    ```
- **Behavior**:
    - Broadcasts to all users connected to the `projectId` room.
    - Automatically persists the message inside Mongoose `Project` schema.
    - If `@ai` is present, it forwards the query to the Gemini API, persists the reply, and broadcasts the reply under the `ai` user structure.
