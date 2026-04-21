# SOBITAS – Full stack (Laravel + Next.js + MySQL + Nginx)

- **Backend / Admin:** Laravel (PHP 8.2) + Voyager dashboard  
- **Frontend:** Next.js 15  
- **Database:** MySQL 8 (seeded with `newest.sql` on first run)  
- **Reverse proxy:** Nginx (frontend + backend on port 80)

## Prerequisites

- Docker & Docker Compose  
- Root `.env` (see below)

## Quick start (Docker)

1. **Ensure root `.env` exists** (same as your current one). Backend uses it via `env_file: ./.env`. For MySQL init, ensure:
   - `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
   - `DB_HOST=mysql`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

2. **Start everything:**
   ```bash
   docker compose up -d mysql
   # Wait for MySQL healthy (~30s), then:
   docker compose up -d backend laravel-nginx frontend nginx
   ```

3. **First-time DB seed:**  
   `newest.sql` is mounted as MySQL init script and runs automatically when the MySQL data volume is empty (first run). To re-seed from scratch, remove the volume and start again:
   ```bash
   docker compose down
   docker volume rm sobitas_mysql-data  # or your project prefix
   docker compose up -d mysql
   # After healthy:
   docker compose up -d backend laravel-nginx frontend nginx
   ```

4. **Laravel storage link (once):**
   ```bash
   docker compose exec backend php artisan storage:link
   ```

## URLs (with default nginx proxy)

| Service        | URL                          |
|----------------|------------------------------|
| Frontend       | http://localhost (port 80)   |
| Frontend direct| http://localhost:3000        |
| Backend / API  | http://localhost/api         |
| Admin dashboard| http://localhost/admin       |
| Storage        | http://localhost/storage     |

Nginx routes: `localhost` → `/` = Next.js, `/admin`, `/api`, `/storage` = Laravel.

## Optional: Nginx Proxy Manager (SSL / domains)

To use NPM instead of the built-in nginx proxy:

```bash
docker compose --profile npm up -d npm npm-db
```

Then in NPM (port 81): add proxy hosts for sobitas.tn → `frontend:3000` and admin.sobitas.tn → `laravel-nginx:80`. When using NPM, you can stop the default nginx service and use NPM’s ports (e.g. 8080/8443).

## Project layout

- `backend/` – Laravel app (Voyager admin, API)
- `frontend/` – Next.js app (Dockerfile with standalone build)
- `nginx/` – `laravel.conf` (Laravel vhost), `sobitas-proxy.conf` (main proxy)
- `newest.sql` – DB seed (loaded into MySQL on first init)
- Root `.env` – used by backend and compose (DB, Laravel, etc.)

## Backend (Laravel)

- **Docker:** Backend uses root `.env` via `env_file: ./.env`; ensure root `.env` has `DB_HOST=mysql` and your DB credentials.
- **Local (no Docker):** Copy root `.env` to `backend/.env` and set `DB_HOST=127.0.0.1` if needed.
- Admin: `/admin` (Voyager).

## Frontend (Next.js)

- Built with `output: 'standalone'`; Dockerfile builds and runs `node server.js`.
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_STORAGE_URL` are set at build time (e.g. `/api`, `/storage`) when using the main nginx proxy.
