# Troubleshooting Guide

This guide details common failures, connection issues, and configuration bugs encountered during development or deployment, along with instructions to resolve them.

---

## ⚡ Redis Connection Failures

### Symptom:

`Redis connection error. Falling back to in-memory storage.` is displayed in logs.

### Reason:

The Redis server daemon is not running on the configured host/port, or has authentication password mismatches.

### Resolution:

1. **Local environment fallback**: The application is built to run gracefully without Redis. In-memory maps will track user logouts automatically.
2. **Launch Redis locally**:
    - **Linux/macOS**: `sudo systemctl start redis-server` or `redis-server`
    - **Docker**: `docker run -d -p 6379:6379 redis:alpine`
3. **Verify credentials**: Confirm `REDIS_HOST` and `REDIS_PORT` in `backend/.env` point to your Redis instance.

---

## ⚙️ AI Generator Credentials Errors

### Symptom:

Assistant replies: `⚠️ WhisperAgent Error: Failed to generate response (API_KEY_INVALID). Please verify your GOOGLE_AI_KEY in backend/.env.`

### Reason:

The Google Generative AI key is missing, unauthorized, or expired.

### Resolution:

1. Acquire a valid key from the Google AI Studio portal.
2. Update the key inside the backend environment variables:
    ```env
    GOOGLE_AI_KEY=AIzaSyD_your_valid_key_here
    ```
3. Restart the backend process:
    ```bash
    pm2 restart whisper-backend # or stop and start node process
    ```

---

## 🔌 Socket Handshake Disconnects

### Symptom:

Websocket connection fails or drops instantly upon loading the workspace, preventing real-time collaborative editing.

### Reason:

1. The WebSocket is configured to talk to the wrong URL.
2. The user has been added to the project, but the JWT is malformed, invalid, or expired.
3. The user is attempting to connect to a project room they are not registered to.

### Resolution:

1. Check the frontend browser console logs.
2. Verify `VITE_API_URL` inside `frontend/.env` maps to the exact protocol and port of the running backend (e.g., `http://localhost:3000`).
3. If deploying through an Nginx reverse proxy, ensure Nginx configuration headers support protocol upgrade:
    ```nginx
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ```
4. Perform logout and sign back in to refresh your JWT token credentials.

---

## 💾 MongoDB Connection Failure

### Symptom:

Backend fails to boot, exits with `MongoDB connection error: MongooseError: Operation...`

### Reason:

The MongoDB server is offline, blockaded behind a firewall, or the URI is malformed.

### Resolution:

1. Start MongoDB service locally: `sudo systemctl start mongod` (Linux) or run local MongoDB community server.
2. If connecting to MongoDB Atlas, ensure your current IP address is whitelisted inside the MongoDB Atlas Network Security settings.
