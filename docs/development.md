# Developer Guide

This document describes how to set up, run, format, and contribute to the Whisper Sandbox codebase.

---

## 🛠️ Prerequisites

Before you start, make sure you have installed:

- **Node.js**: version `20.x` or `22.x`.
- **MongoDB**: A running local MongoDB instance or a MongoDB Atlas URI.
- **Redis**: A running local Redis instance (or the application will automatically fall back to in-memory storage).
- **Git**

---

## 🚀 Quick Local Setup

1. **Clone the Repository**:

    ```bash
    git clone https://github.com/TSR0705/AGENTIC-AI-PROJECT.git
    cd AGENTIC-AI-PROJECT
    ```

2. **Install Workspace Dependencies**:
   Install root, frontend, and backend packages:

    ```bash
    npm install
    npm install --prefix frontend
    npm install --prefix backend
    ```

3. **Configure Environment Variables**:
   Create a `.env` file inside both `/backend` and `/frontend` folders using the templates provided.

---

## ⚙️ Environment Variables

### Backend Configuration (`/backend/.env`)

Create `backend/.env` and define:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/whisper-sandbox
JWT_SECRET=super_secure_jwt_passphrase
GOOGLE_AI_KEY=your_gemini_api_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Frontend Configuration (`/frontend/.env`)

Create `frontend/.env` and define:

```env
VITE_API_URL=http://localhost:3000
```

---

## 💻 Running the App

### Start the Backend Server

```bash
cd backend
npm run dev # or node server.js
```

### Start the Frontend Dev Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📏 Code Quality & Standards

To ensure code health, we enforce strict formatting and linting:

### Running Formatters & Linters

- **Run ESLint**: Check for syntax errors and violations.
    ```bash
    npm run lint
    ```
- **Run Prettier**: Auto-format styling and spacing rules.
    ```bash
    npm run format
    ```

### Git Commit Guidelines

This project enforces **Conventional Commits** using Commitlint. Commit messages must follow this structure:

```
<type>(<scope>): <description>

[optional body]
```

#### Valid Types:

- `feat`: A new feature.
- `fix`: A bug fix.
- `docs`: Documentation updates.
- `style`: Changes that do not affect code logic (formatting, spacing).
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `test`: Adding or correcting tests.
- `chore`: Updates to build scripts, configs, or package versions.
- `ci`: CI pipeline workflow updates.
