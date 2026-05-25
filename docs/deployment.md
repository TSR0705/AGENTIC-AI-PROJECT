# Deployment Guide

This document outlines how to deploy CodeWeave to staging and production environments, including Docker operations, manual VM service configurations, and standard cloud procedures.

---

## 🐋 Containerized Deployment (Recommended)

Production containerization guarantees consistent library versions and environment safety.

### 1. Build and Run via Docker Compose

To build and run all services (Express server, React client, MongoDB, Redis) locally in a unified grid:

```bash
docker-compose up --build
```

### 2. Manual Docker Build & Registry Push

To build a production image of the backend API for deployment to container registries (AWS ECR, GCP GCR, Koyeb):

```bash
docker build -t codeweave-backend:latest ./backend
```

To run the built backend container standalone:

```bash
docker run -d -p 3000:3000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="production_jwt_secret" \
  -e GOOGLE_AI_KEY="gemini_key" \
  codeweave-backend:latest
```

---

## 🖥️ Virtual Machine / VPS Deployment (Bare Metal)

If you are deploying manually to a Linux instance (Ubuntu/Debian on AWS EC2, DigitalOcean, Linode):

### 1. Install System Prerequisites

```bash
sudo apt update
sudo apt install nodejs npm mongodb redis-server -y
```

### 2. Configure PM2 Process Manager

PM2 manages your Node server process, keeping it alive, restarting it on failure, and loading logs:

- **Install PM2 globally**:
    ```bash
    sudo npm install pm2 -g
    ```
- **Create an ecosystem configuration file** (`backend/ecosystem.config.json`):
    ```json
    {
        "apps": [
            {
                "name": "codeweave-backend",
                "script": "server.js",
                "instances": "max",
                "exec_mode": "cluster",
                "env": {
                    "NODE_ENV": "production"
                }
            }
        ]
    }
    ```
- **Start the backend server process**:
    ```bash
    cd backend
    pm2 start ecosystem.config.json
    ```
- **Save process state for system reboots**:
    ```bash
    pm2 save
    pm2 startup
    ```

### 3. Nginx Reverse Proxy & SSL Setup

Configure Nginx as a reverse proxy to route traffic from port 80/443 to our Express app running on port 3000:

- **Install Nginx**:
    ```bash
    sudo apt install nginx -y
    ```
- **Configure Nginx virtual host** (`/etc/nginx/sites-available/codeweave`):

    ```nginx
    server {
        listen 80;
        server_name sandbox.yourdomain.com;

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

- **Enable the site and reload Nginx**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/codeweave /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```
- **Acquire SSL via Let's Encrypt Certbot**:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d sandbox.yourdomain.com
    ```
