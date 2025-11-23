## SOBITAS-FULL-PROJECT — Copilot instructions for code agents

Purpose: give AI coding agents the minimal, actionable knowledge to be productive in this repository (architecture, workflows, conventions, and helpful file pointers).

- Architecture highlights
  - Monorepo with two main apps:
    - backend/ — Laravel 9 (PHP 8.2) application. Key pieces: `routes/api.php`, `routes/web.php`, `app/` (models/controllers), `composer.json`, `Dockerfile`.
    - frontend/ — Angular 16 app with optional SSR (nguniversal). Key files: `frontend/package.json`, `frontend/server.ts`, `angular.json`, `src/`.
  - docker-compose.yml orchestrates services:
    - `mysql` initialized from `db/protein_db.sql`.
    - `backend` (php-fpm) built from `backend/Dockerfile`.
    - `laravel-nginx` uses `nginx/laravel.conf` and serves Laravel public directory.
    - `frontend` is built into `frontend/dist` and served via nginx in compose.
  - Authentication & admin: Laravel Sanctum (API auth) + TCG Voyager admin (mounted at `/admin`).

- Important integration points
  - Public API endpoints are defined in `backend/routes/api.php` and are exposed under the Laravel API prefix (default `/api/`). Example routes: `/api/home`, `/api/all_products`, `/api/product_details/{slug}`, `/api/login`, `/api/register`.
  - The frontend calls these API endpoints; when running in Docker, services communicate over the `sobitas-net` network defined in `docker-compose.yml`.
  - Database seed / initial data is provided via `db/protein_db.sql` (mounted into MySQL container on startup).

- Developer workflows (concrete commands)
  - Full local environment (recommended):
    - Build & run containers: `docker-compose up --build -d`
    - Inspect backend container: `docker-compose exec backend bash` — inside you can run `composer install`, `php artisan migrate`, `php artisan db:seed`, `php artisan storage:link`, etc.
  - Backend quick dev (without Docker):
    - From `backend/`: `composer install`, copy `.env.example` -> `.env` (composer `post-root-package-install` does this in new projects), then `php artisan key:generate` and `php artisan serve` (or use Docker for parity).
  - Frontend dev: from `frontend/`:
    - `npm install`
    - `npm run start` (runs `ng serve` → https://localhost:4200)
    - Build production bundle: `npm run build` (produces `dist/`) — production container uses the built `dist` directory.
  - Frontend SSR:
    - Build SSR: `npm run build:ssr` then `npm run serve:ssr` (see `frontend/package.json` scripts). `frontend/server.ts` is the SSR entry.

- Project-specific conventions & gotchas
  - Database is hydrated on docker-compose start using `db/protein_db.sql`. Be cautious when running `migrate:fresh` locally if you rely on that SQL.
  - `backend` Dockerfile is multi-stage and runs `composer update --no-dev` in the builder stage — containerized builds are optimized for production.
  - Storage & uploads: `docker-compose.yml` mounts `./backend/storage` explicitly to the nginx container to ensure uploaded assets are served. Running `php artisan storage:link` inside the backend container may still be required for correct symlinks.
  - Voyager admin routes are registered in `routes/web.php` under the `admin` prefix.
  - API auth: routes that need authentication use `auth:sanctum` middleware (see `routes/api.php`). When testing authenticated flows from the frontend, use Sanctum tokens/cookies appropriately.

- Where to look for examples of common patterns
  - API list and naming: `backend/routes/api.php` (many GET endpoints and a couple of POST endpoints used by the frontend).
  - Docker orchestration and volume mappings: `docker-compose.yml` and `nginx/laravel.conf` (fastcgi -> `backend:9000`).
  - Laravel build/production optimizations and runtime entrypoint: `backend/Dockerfile`.
  - Angular SSR server & express integration: `frontend/server.ts` and `frontend/package.json` scripts.

- Editing and PR guidance for AI agents
  - Small changes: run unit or smoke tests locally (backend: `./vendor/bin/phpunit` inside backend container; frontend: `npm run test`). If tests are missing, run a quick smoke test (start app and hit `GET /api/home`).
  - For API changes: update `routes/api.php` and corresponding `app/Http/Controllers/*` controllers. Keep route names and parameter names consistent with existing endpoints (e.g., `product_details/{slug}`).
  - When modifying Docker or nginx config, ensure container healthchecks in `docker-compose.yml` still pass (they are used by the compose setup).

- Examples (copyable snippets agents may use)
  - Start full stack: `docker-compose up --build -d`
  - Enter backend shell: `docker-compose exec backend bash`
  - Run migrations inside container: `php artisan migrate --seed`
  - Build frontend (production): `cd frontend && npm ci && npm run build`

If anything here is incomplete or you want the file to emphasize other workflows (CI, hosting, or a different dev flow), tell me which area to expand and I will iterate.  
