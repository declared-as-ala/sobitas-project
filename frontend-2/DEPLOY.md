# Deploy Frontend-2 (GitHub Actions → GHCR → VPS)

## When the workflow runs

| Event | Requirement |
|--------|----------------|
| **Push** | Branch **`main`**, and at least one changed file must match `frontend-2/**` (or `docker-compose.yml`, or `.github/workflows/deploy-frontend-2.yml`). |
| **Manual** | GitHub → **Actions** → **Deploy Frontend-2 (Docker Image)** → **Run workflow**. |

Pushes that only change `filament/`, `frontend/` (without `frontend-2`), docs at repo root, etc. **do not** start this workflow — by design (path filters).

## If the site didn’t update after your push

1. Confirm the commit is on **`main`** (merge your PR if needed).
2. Confirm your changes live under **`frontend-2/`**.
3. Run the workflow **manually** once (Actions tab) to redeploy without changing code.
4. On the VPS: `docker pull ghcr.io/declared-as-ala/sobitas-frontend-2:latest` and recreate the `frontend-2` service (the workflow does this if SSH secrets are set).

## Image & compose

- Image: `ghcr.io/declared-as-ala/sobitas-frontend-2:latest`
- Compose service: `frontend-2` (see repo root `docker-compose.yml`, host port **3002** → container 3000).
