# Fusion Print & Services — Backend

Node.js + Express + TypeScript API with **MongoDB (Mongoose)** for products, pricing quotes, inquiries, design uploads, and admin auth.

## Setup

```bash
cd backend
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
| `npm start` | Run compiled server |
| `npm run seed` | Re-run seed (only fills empty collections) |

## Environment

See `.env.example`. Important keys:

| Key | Purpose |
|-----|---------|
| `MONGODB_URI` | MongoDB Atlas / server URI (**required**) |
| `MONGODB_DB` | Database name (default `fusionservices`) |
| `JWT_SECRET` | Admin JWT signing secret |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Used only when seeding the first admin |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `UPLOAD_DIR` | Disk folder for design uploads |

Default seeded admin (local):

- Username: `fpsadmin`
- Password: `FusionPrint@2026`

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
