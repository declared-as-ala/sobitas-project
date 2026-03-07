# Deploying Next.js on the server (Docker)

## Why you saw 500 and CSS/required-server-files errors

- The container was running **`next dev`** (development server) on the server.
- With **NODE_ENV=production** or `.env.production`, Next expects a **production build** (pre-built CSS, `required-server-files.json`). Those files only exist after `next build`.
- **`next dev`** does not create them, so you get:
  - `Module parse failed: Unexpected character '@'` in `globals.css` (raw `@import`/`@tailwind` not processed)
  - `ENOENT: no such file or directory, open '/app/.next/required-server-files.json'`
  - `GET / 500`

## Fix: run production build + start, not dev

On the server you must:

1. **Build** the app once: `npm run build` (or build inside Docker).
2. **Run** the production server: `npm start` (or `node server.js` with standalone output).
3. Do **not** run `next dev` on the server (use dev only locally).

## Option 1: Use the included Dockerfile (recommended)

This repo includes a production Dockerfile that builds and runs standalone:

```bash
# Build image (runs next build inside the image)
docker build -t sobitas-nextjs .

# Run (uses pre-built app; no next dev)
docker run -p 3000:3000 --env-file .env sobitas-nextjs
```

- **Build** stage runs `npm run build`; CSS and all assets are compiled.
- **Run** stage uses `node server.js` (standalone), so no `required-server-files.json` path issues and no raw CSS parsing.

Ensure your compose/service uses this image and **does not** override the command with `npm run dev`.

### If you use docker-compose (e.g. `context: ./nextjs`)

**Step 1 – Fix the Dockerfile on the server**

The file `./nextjs/Dockerfile` must be exactly the one from this repo, with **no extra lines** after `CMD ["node", "server.js"]`. If you see a parse error like `unknown instruction: 1~#`, the file has extra or corrupted content (e.g. `1~# base image` on line 36).

- Copy the full contents of `Dockerfile` from this repo into `./nextjs/Dockerfile` on the server, overwriting the existing file.
- Ensure the file ends at line 35 with `CMD ["node", "server.js"]` and has no line 36 or beyond.

**Step 2 – Fix docker-compose.yml**

1. **Remove** the `command: npm run dev` line from the `nextjs` service (so the image uses the Dockerfile default: `node server.js`).
2. **Remove** the `volumes: - ./nextjs:/app:delegated` block for the nextjs service. That mount overwrites the built app in the image with the host folder; the container then runs `next dev` and has no build, which causes the CSS and 500 errors.

**Step 3 – Rebuild and start**

```bash
docker-compose build --no-cache nextjs
docker-compose up -d nextjs
```

Example `nextjs` service for production (see also `docker-compose.nextjs.example.yml`):

```yaml
  nextjs:
    build:
      context: ./nextjs
      dockerfile: Dockerfile
    env_file:
      - ./nextjs/.env
    ports:
      - "3001:3000"
    depends_on:
      - backend
    networks:
      - sobitas-net
```

## Option 2: Change existing Docker Compose / Dockerfile

If you keep your current image but change how it runs:

1. **Build at image build time** (in your Dockerfile):
   ```dockerfile
   RUN npm ci
   COPY . .
   RUN npm run build
   ```

2. **Start with production server** (in Dockerfile or compose):
   ```dockerfile
   CMD ["npm", "start"]
   ```
   or, if using standalone output:
   ```dockerfile
   CMD ["node", "server.js"]
   ```

3. **Do not** set `CMD` or `command` to `npm run dev` on the server.

4. **NODE_ENV**: Use `NODE_ENV=production` only when running `next start` (or `node server.js`). Do not use `NODE_ENV=production` with `next dev`.

## Config change in this repo

- **next.config.js**: `output: 'standalone'` is set so the build produces a self-contained output in `.next/standalone` and the Dockerfile can run `node server.js` with minimal files.
- **swcMinify**: Removed (deprecated in Next.js 15).
- **Dockerfile**: The deps stage sets `NODE_ENV=development` before `npm ci` so devDependencies (e.g. `tailwindcss`, `postcss`, `autoprefixer`) are installed; with `NODE_ENV=production`, npm would skip them and the build would fail. The builder runs `npx next build` (no `cross-env` needed). The final image still only contains the standalone output.

After rebuilding the image and running with `npm start` (or `node server.js`), the CSS and `required-server-files.json` errors and 500s from this cause should stop.

---

## API not loading on production (e.g. protein.tn) – "Aucun produit trouvé"

If the site works on **localhost** and **Vercel** but on **protein.tn** products, categories, and packs show as empty ("Aucun produit trouvé"), the frontend cannot reach the API from that deployment.

### Causes

1. **`NEXT_PUBLIC_API_URL` is baked in at build time**  
   Next.js inlines `NEXT_PUBLIC_*` when you run `next build`. The build used for **protein.tn** must have the correct API URL. If that build was done without `NEXT_PUBLIC_API_URL`, it defaults to `https://admin.sobitas.tn/api`.

2. **API unreachable from protein.tn’s server**  
   Server-side rendering (SSR) calls the API from the **Node server** that serves protein.tn. If that server cannot reach the API (firewall, DNS, different network, or the API blocks that server’s IP), requests fail and pages get empty data.

3. **CORS**  
   If some requests run in the **browser**, the API must allow the origin `https://protein.tn` in CORS. Blocked origins also lead to empty or failed requests.

### Fix 1: Use the API proxy (recommended for protein.tn)

The app includes a **rewrite** so all API traffic can go through your domain. Then the browser and your server both call **protein.tn**, and Next.js proxies to the real API. No CORS or server→API connectivity issues.

**When building and running the app that serves protein.tn:**

1. Set env vars (e.g. in `.env.production` or Docker/build env):
   ```env
   NEXT_PUBLIC_API_URL=https://protein.tn/api-proxy
   API_BACKEND_URL=https://admin.sobitas.tn/api
   ```
   Use your real API base URL for `API_BACKEND_URL` if it’s different (e.g. `https://admin.protein.tn/api`).

2. **Rebuild** the app (so `NEXT_PUBLIC_API_URL` is inlined).
3. Redeploy and restart.

All requests then go to `https://protein.tn/api-proxy/...` and are proxied to `API_BACKEND_URL`. No direct calls from the browser or from your server to the API host.

### Fix 2: Keep direct API URL and fix connectivity

If you prefer **not** to use the proxy:

1. **Build with the correct API URL**  
   For the build that serves protein.tn, set:
   ```env
   NEXT_PUBLIC_API_URL=https://admin.sobitas.tn/api
   ```
   (or your real API base). Rebuild and deploy.

2. **Ensure the API is reachable from protein.tn’s server**  
   On the machine that runs Next (e.g. Docker host), run:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://admin.sobitas.tn/api/all_products
   ```
   You should get `200`. If it fails (timeout, 4xx/5xx), fix firewall, DNS, or API access for that server.

3. **CORS**  
   If the API is called from the browser, the backend must allow `https://protein.tn` (and `https://www.protein.tn` if you use it) in `Access-Control-Allow-Origin`.

### Summary

- **Fix 1 (proxy):** Set `NEXT_PUBLIC_API_URL=https://protein.tn/api-proxy` and `API_BACKEND_URL=<real-api-base>` at build time, rebuild, deploy. Easiest and avoids CORS/server reachability.
- **Fix 2 (direct):** Set `NEXT_PUBLIC_API_URL` to the real API, ensure the server that runs protein.tn can reach that API and CORS allows protein.tn.
