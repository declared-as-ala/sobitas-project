# protein.tn — Canonical redirects (Nginx + Cloudflare)

## Goal

- **Canonical domain:** `https://protein.tn`
- All other variants **301 redirect** to it:
  - `http://protein.tn` → `https://protein.tn`
  - `http://www.protein.tn` → `https://protein.tn`
  - `https://www.protein.tn` → `https://protein.tn`

## Config file

- **`protein-tn-canonical.conf`** — server blocks for the redirects above.
- Main app block must use **`server_name protein.tn;`** and `listen 443 ssl` (not modified here).

## Deployment (production)

### 1. Copy config to the server

Example (paths may differ):

```bash
sudo cp protein-tn-canonical.conf /etc/nginx/conf.d/
# Or include from main config:
# include /etc/nginx/conf.d/protein-tn-canonical.conf;
```

### 2. Set SSL paths for www (if using 443 for www)

In `protein-tn-canonical.conf`, set real paths for the **www** block:

```nginx
ssl_certificate     /etc/nginx/ssl/protein.tn/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/protein.tn/privkey.pem;
```

Use a certificate that covers **www.protein.tn** (e.g. wildcard `*.protein.tn` or a separate cert). Without this, `https://www.protein.tn` can still give Cloudflare **525**.

### 3. Ensure main app block uses `protein.tn` only

Your existing HTTPS server that proxies to the app should have:

```nginx
server_name protein.tn;
```

Not `server_name www.protein.tn protein.tn;` for the app — only the redirect blocks should handle `www`.

### 4. Test config and reload Nginx

```bash
# Test configuration (no traffic change)
sudo nginx -t

# If OK, reload (graceful, no downtime)
sudo systemctl reload nginx
# Or, if nginx was started directly:
# sudo nginx -s reload
```

### 5. Verify redirects (301)

Run from your machine or the server:

```bash
# HTTP non-WWW → HTTPS (expect 301, Location: https://protein.tn/)
curl -sI -o /dev/null -w "%{http_code} %{redirect_url}\n" http://protein.tn/

# HTTP www → HTTPS canonical (expect 301, Location: https://protein.tn/)
curl -sI -o /dev/null -w "%{http_code} %{redirect_url}\n" http://www.protein.tn/

# HTTPS www → HTTPS canonical (expect 301, Location: https://protein.tn/)
curl -sI -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.protein.tn/

# Canonical should be 200 (no redirect)
curl -sI -o /dev/null -w "%{http_code}\n" https://protein.tn/
```

Full headers (to confirm 301 and Location):

```bash
curl -I http://protein.tn/
curl -I http://www.protein.tn/
curl -I https://www.protein.tn/
```

Expected:

- **301** for `http://protein.tn`, `http://www.protein.tn`, `https://www.protein.tn`.
- **Location: https://protein.tn/** (same path preserved).
- **200** for `https://protein.tn/`.

## Cloudflare notes

- **SSL 525** on `https://www.protein.tn` means Cloudflare cannot complete TLS to your origin. Fix by:
  - Having Nginx **listen 443** for `www.protein.tn` with a valid cert for `www.protein.tn` (as in this config), and/or
  - Using Cloudflare **Flexible** for www only (not recommended for SEO; prefer redirect at origin as above).
- After changing Nginx, you can **Purge Cache** in Cloudflare for `www.protein.tn` and `protein.tn` if needed.
