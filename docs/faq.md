# Frequently Asked Questions (FAQ)

Here are answers to the most common questions regarding the design, operation, and maintenance of the Whisper Sandbox.

---

## 💻 Tech Stack & Design Decisions

### 1. Why was the absolute black theme with zinc outlines chosen?

We implemented a high-contrast true dark mode theme (background: `#000000`, borders: `#27272a` zinc-800) to match top-tier developer platforms (like Vercel, Linear, and VS Code). This increases accessibility, reduces eye strain during long coding sessions, and eliminates typical "AI-ish" colorful gradients that distract developers.

### 2. What LLM is powering the code assistant?

The collaborative workspace utilizes **Gemini 2.5 Flash** (via the `@google/generative-ai` SDK). This model was selected for its exceptional token processing speed, low response latency, and strong performance in code generation tasks.

---

## ⚡ Real-Time Collaboration

### 1. How does the real-time file tree synchronization work?

Real-time text synchronization is powered by Socket.io namespaces and rooms:

- Every open project maps to a separate Socket room (room ID = Project MongoDB `_id`).
- When a user updates code, the changes are emitted via sockets to all other members in the room, and auto-saved in the background to the database.

### 2. Can multiple users edit the same file simultaneously?

Yes! Changes are broadcasted live to all connected developers. Currently, text operations use a live-refresh model. For complex parallel editing, we recommend separating tasks across multiple files.

---

## 🔐 Security & Access Control

### 1. How do we ensure users cannot access projects they don't own?

We enforce strict membership guards:

- Database level: API routes verify that the requesting user's `_id` exists inside the project's `users` collection.
- Network level: Sockets reject connection handshakes if the user is not recorded as a collaborator for the target project.

### 2. What is the session blacklist and how does it work?

When a user logs out, the client deletes their JWT locally. To prevent the token from being reused before it expires (which takes 24 hours), the backend registers the token in a Redis cache blocklist. If the blacklisted token is presented again, access is denied. If Redis is down, it safely falls back to a memory map.
