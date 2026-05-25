# Hosting Evaluation Guide

This document presents a comprehensive evaluation of hosting alternatives for the CodeWeave stack, analyzing free tiers, websocket requirements, cold starts, and container management.

---

## 📊 Hosting Alternatives Comparison

Our stack has specific deployment needs:

1. **Frontend**: Static React Single Page Application (SPA) with routing.
2. **Backend**: Persistent Express application running **Socket.io** (WebSockets) and connecting to MongoDB and Redis.

| Provider       | Best Fit For               | WebSockets Support                                  | Cold Starts                                        | Free Limits                                     | Recommendation & Analysis                                                                                                               |
| :------------- | :------------------------- | :-------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel**     | Frontend React SPA         | ❌ No (Serverless functions timeout after 10-60s)   | None (Static Edge)                                 | Unlimited bandwidth for personal projects       | **Excellent for frontend**. Unusable for Socket.io backend due to Serverless function execution limits.                                 |
| **Render**     | Backend Express API        | Yes                                                 | ⚠️ High (up to 50s spin-up delay after inactivity) | 500 hours/month (sleeps after 15 mins)          | Good for backend testing, but cold start delays degrade real-time user collaboration experience.                                        |
| **Railway**    | Backend & Databases        | Yes (Native WS)                                     | ⚡ Low / None                                      | $5.00 one-time credit (no permanent free tier)  | Outstanding DX, easy container builds, but lacks a long-term free tier.                                                                 |
| **Fly.io**     | Backend Containers         | Yes                                                 | ⚡ Low                                             | 3 Shared CPUs, 3GB Volume, 256MB RAM instances  | Great container execution, but requires credit card authorization even for free tiers.                                                  |
| **Koyeb**      | Containerized APIs         | Yes                                                 | ⚡ Low                                             | 1 Web Service (512MB RAM), $5/month free credit | **Highly Recommended**. Koyeb provides a persistent container service that supports WebSockets natively without automatic sleep cycles. |
| **Cloudflare** | Static Frontends / Workers | ❌ No (Requires Workers WebSockets API refactoring) | None                                               | Free Pages static hosting                       | Excellent frontend alternative to Vercel.                                                                                               |

---

## 🎯 Recommended Deployment Architecture

For the best performance, developer experience, and cost efficiency, we recommend a **hybrid hosting architecture**:

```
[ Client Browser ]
      │
      ├── (Static Web Assets) ──> [ Vercel Edge CDN ]
      │
      └── (REST / WebSockets) ──> [ Koyeb Container Service (Backend) ]
                                            │
                                            ├── [ MongoDB Atlas (Free M0 Sandbox) ]
                                            └── [ Upstash Redis (Free Serverless Redis) ]
```

### 1. Frontend: **Vercel**

- **Why**: Fastest CDN edge delivery, automatic deployments from git pushes, and custom domains with free SSL.
- **Cost**: $0 (Hobby Tier).

### 2. Backend: **Koyeb** (Deploying our multi-stage Dockerfile)

- **Why**: Koyeb runs Docker containers natively. It supports the HTTP/1.1 upgrade header required for Socket.io WebSockets, and unlike Render, it does not put the container to sleep aggressively, ensuring instant socket connections.
- **Cost**: $0 (Koyeb Free Tier covers 1 micro instance).

### 3. Databases:

- **MongoDB**: **MongoDB Atlas** M0 Free Sandbox (512MB storage, fully managed, hosted in the same cloud region).
- **Redis**: **Upstash** (Serverless Redis, free tier allows 10,000 commands/day, perfectly covers token blacklisting).
