# Whisper Sandbox

Whisper Sandbox is a production-grade, collaborative web-based sandbox workspace. It features real-time text synchronization, file tree organization, and interactive AI coding assistance powered by Gemini.

---

## 🌟 Features

- **Real-Time Collaboration**: Edit files and synchronize changes in real-time with team developers via WebSockets.
- **Unified IDE Workspace**: Single-sidebar files explorer and collapsible team member drawer with active online presence indicators.
- **Sleek Multi-Tab Interface**: Open files in independent tabs with unsaved change markers and quick closing behavior.
- **Monaco Editor Integration**: Replace the raw `<textarea>` with the high-performance `@monaco-editor/react` library, bringing syntax highlighting, auto-indentation, and matching bracket highlighting to the workspace.
- **Embedded AI Coding Assistant**: Inline prompting via `@ai` handles debugging, code explanations, and automatic code file tree generation.
- **Fail-Safe Observability**: Winston structured logging, request correlation tracking, and isolated health checks.

---

## 🏗️ Quick Architecture Summary

The sandbox follows a decoupled client-server architecture:

- **Frontend**: Single Page Application built on React, Vite, TailwindCSS, `@monaco-editor/react`, and Socket.io-client.
- **Backend**: REST API and Websocket server built on Node.js, Express, Socket.io, Mongoose (MongoDB), and ioredis (Redis).
- **Core Integrations**: Google Gemini API for AI code recommendations.

---

## 🛠️ Prerequisites

- Node.js `20.x` or `22.x`
- MongoDB instance (local or Atlas cloud cluster)
- Redis instance (optional; falls back automatically to in-memory)

---

## 🚀 Quick Local Setup

```bash
# Clone the repository
git clone https://github.com/TSR0705/AGENTIC-AI-PROJECT.git
cd AGENTIC-AI-PROJECT

# Install dependencies across workspace
npm install
npm install --prefix frontend
npm install --prefix backend
```

---

## ⚙️ Environment Setup

### Backend (`backend/.env`)

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/whisper-sandbox
JWT_SECRET=your_jwt_secret_phrase
GOOGLE_AI_KEY=your_gemini_api_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
```

---

## 💻 Quick Run Instructions

Start the backend API server:

```bash
cd backend
npm run dev
```

Start the frontend Vite application:

```bash
cd frontend
npm run dev
```

---

## 🧪 Testing Commands

Run the Vitest test suites:

```bash
# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

---

## 📦 Deployment Summary

Deploy easily using the provided Docker multi-stage configuration:

```bash
# Build and run entire environment
docker-compose up --build
```

For deep VM/Nginx/PM2 hosting walkthroughs, see the deployment documentation.

---

## 📖 Documentation Index (Deep Guides)

All detailed architectural, deployment, and API design specifications live inside the `/docs` directory:

- [System Architecture & Diagrams](docs/architecture.md)
- [API Reference REST & Websockets](docs/api.md)
- [Deployment Staging & Production](docs/deployment.md)
- [Developer Onboarding & Style Guidelines](docs/development.md)
- [Security Policy & Verification](docs/security.md)
- [Testing Strategy & local testing](docs/testing-strategy.md)
- [Troubleshooting Common Issues](docs/troubleshooting.md)
- [FAQ](docs/faq.md)
- [Hosting Provider Evaluation](docs/hosting-evaluation.md)

---

## 🤝 Contribution Quickstart

We welcome open-source contributions! Please review our [Contributing Guide](CONTRIBUTING.md) and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) before opening Pull Requests.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
