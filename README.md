# Fusion Print & Services — Backend

Node.js + Express + TypeScript API with **MongoDB (Mongoose)**, Socket.IO, and multer uploads for products, quotes, inquiries, print jobs, shops, and admin auth.

## Local setup

```bash
cp .env.example .env
# Fill MONGODB_URI (Atlas) — do not commit real credentials
npm install
npm run dev
```

API base: `http://localhost:5000`

On startup the server:

1. Connects to MongoDB (`MONGODB_DB`, default `fusionservices`)
2. Seeds products, add-ons, packages, services, and a default admin if collections are empty

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server (production) |
| `npm run seed` | Re-run seed (only fills empty collections) |

## Coolify deploy

This repo is Docker-ready (`Dockerfile` multi-stage build).

| Coolify setting | Value |
|-----------------|-------|
| Build pack | Dockerfile |
| Port | `5000` |
| Health check path | `/api/health` |

### Required environment variables

| Key | Purpose |
|-----|---------|
| `PORT` | Listen port (`5000`) |
| `MONGODB_URI` | MongoDB Atlas / server URI (**required**) |
| `JWT_SECRET` | Admin / shop JWT signing secret (long random string) |
| `PUBLIC_SITE_URL` | Frontend URL (e.g. `http://fusionprintservices.com`) — used for QR links |
| `CORS_ORIGIN` | Optional; ignored while CORS is open. Set to `*` or leave unset. |

### Optional environment variables

| Key | Purpose |
|-----|---------|
| `MONGODB_DB` | Database name (default `fusionservices`) |
| `PUBLIC_API_URL` | Public API base URL (e.g. `https://api.fusionprintservices.com`) |
| `UPLOAD_DIR` | Disk folder for uploads (default `uploads`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Used only when seeding the first admin |
| `SHOPKEEPER_USERNAME` / `SHOPKEEPER_PASSWORD` | Used only when seeding the first shopkeeper |

CORS is open (`origin: true`, credentials enabled) so any frontend origin (http or https) can call the API. Socket.IO uses the same policy.

**Never** put real secrets in git. Set them only in Coolify.

Suggested domain: `api.fusionprintservices.com` → this service. Point the frontend `VITE_API_URL` at that URL.

## Environment (local)

See `.env.example`. Do not commit `.env`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health + MongoDB connection status |
| GET | `/api/products` | Products, add-ons, packages |
| GET | `/api/products/services` | Service list |
| GET | `/api/products/business` | Business / contact info |
| GET | `/api/products/:id` | Single product |
| POST | `/api/products/quote` | Price estimate |
| POST | `/api/inquiries` | Submit quote inquiry (persisted) |
| GET | `/api/inquiries` | List inquiries (admin JWT) |
| PATCH | `/api/inquiries/:id` | Update inquiry status (admin JWT) |
| POST | `/api/auth/login` | Admin login → JWT (bcrypt + DB) |
| GET | `/api/auth/me` | Current admin |
| GET | `/api/auth/dashboard` | Minimal admin stats (admin JWT) |
| POST | `/api/uploads` | Upload design image; metadata stored in MongoDB |
| GET | `/api/uploads` | List uploads (admin JWT) |

Uploaded files are served at `/uploads/<filename>`.
