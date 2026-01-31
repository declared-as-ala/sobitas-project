# Frontend CI/CD (Build → Test → Deploy to VPS)

Push to `main` (with changes under `frontend/`) triggers: **build**, **lint**, **Docker image push**, then **deploy to your VPS** — similar to Vercel.

## One-time setup

### 1. GitHub repository secrets

In the repo: **Settings → Secrets and variables → Actions** → **New repository secret**. Add:

| Secret         | Description |
|----------------|-------------|
| `VPS_HOST`     | VPS IP or hostname (e.g. `123.45.67.89` or `vps.example.com`) |
| `VPS_USER`     | SSH user (e.g. `root` or `deploy`) |
| `VPS_SSH_KEY`  | Full private key content for SSH (the key you use to `ssh user@host`) |
| `GHCR_PAT`     | GitHub Personal Access Token with **read:packages** (so the VPS can pull the image). Create at: GitHub → Settings → Developer settings → Personal access tokens. For public repos you can try without this first; if pull fails, add it. |

### 2. (Optional) Build-time variables

If you need custom env at build time, in **Settings → Secrets and variables → Actions → Variables** add:

- `NEXT_PUBLIC_API_URL` (e.g. `https://api.sobitas.tn` or `/api`)
- `NEXT_PUBLIC_STORAGE_URL` (e.g. `/storage`)

### 3. VPS setup

On the VPS (one time):

1. **Install Docker** (if not already):
   - Ubuntu/Debian: `curl -fsSL https://get.docker.com | sh`
   - Then: `sudo usermod -aG docker $USER` and log out/in (or use root).

2. **Open port 3000** (or the port you use for the frontend):
   - Firewall: `ufw allow 3000` (or your port) and `ufw enable` if you use UFW.
   - If you use Nginx as reverse proxy, point it to `http://127.0.0.1:3000`.

3. **Optional – GHCR login** (for private repos or if pull fails):
   - `echo YOUR_GHCR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin`
   - You can also rely on the workflow to log in using the `GHCR_PAT` secret (see above).

## Flow

1. You push to `main` and change something under `frontend/` (or under `.github/workflows/frontend-deploy.yml`).
2. GitHub Actions runs:
   - Install deps, **lint**, **build** in `frontend/`.
   - Build Docker image and push to `ghcr.io/<your-org>/<repo>/frontend:latest`.
   - SSH into the VPS, pull the new image, stop/remove the old container, run the new one as `sobitas-frontend` on port 3000.
3. Frontend is live at `http://VPS_IP:3000` (or via your Nginx domain).

## Manual run

In the repo: **Actions** → **Frontend Build & Deploy** → **Run workflow**.

## Branch

The workflow runs on pushes to **main**. To use another branch (e.g. `master`), edit in `.github/workflows/frontend-deploy.yml`:

```yaml
on:
  push:
    branches: [main]   # change to [master] if needed
```

## Troubleshooting

- **SSH fails**: Check `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. Test with `ssh -i keyfile user@host` locally.
- **Docker pull unauthorized**: Add `GHCR_PAT` with **read:packages** and, if needed, make the package public (repo Settings → Packages).
- **Port in use**: Change the `-p 3000:3000` in the workflow to another host port, or stop the existing container on the VPS first.
