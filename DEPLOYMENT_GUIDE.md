# 🚀 Quick Deployment Guide

## What Was Fixed

**Problem:** Images returned 404 errors in production
**Root Cause:** Docker container missing runtime environment variables
**Solution:** Added `-e` flags to `docker run` command in GitHub Actions

---

## Changes Made

### 1. Updated GitHub Actions Workflow
**File:** `.github/workflows/frontend-deploy.yml`

Added runtime environment variables to Docker container:
```yaml
docker run -d \
  --name sobitas-frontend \
  --network sobitas-net \          # ← NEW: Connect to Docker network
  -e NODE_ENV=production \          # ← NEW
  -e NEXT_PUBLIC_API_URL=... \      # ← NEW
  -e NEXT_PUBLIC_STORAGE_URL=... \  # ← NEW
  -e API_BACKEND_URL=... \          # ← NEW
  -e STORAGE_BACKEND_URL=... \      # ← NEW
  ghcr.io/username/sobitas-frontend:latest
```

### 2. Created Environment Template
**File:** `frontend/.env.production`

Documents all required environment variables for production.

---

## Deploy to Production

### Option 1: Automatic (Recommended)

```bash
# Commit and push changes
git add .
git commit -m "fix: add runtime env vars for production image loading"
git push origin main
```

GitHub Actions will automatically:
1. Build new Docker image
2. Deploy to VPS with environment variables
3. Restart frontend container

**Wait 5-10 minutes** then verify images load.

---

### Option 2: Manual Deployment

If you want to test immediately on VPS:

```bash
# 1. SSH to VPS
ssh YOUR_USER@YOUR_VPS_HOST

# 2. Stop and remove old container
docker stop sobitas-frontend
docker rm sobitas-frontend

# 3. Pull latest image (if already built)
docker pull ghcr.io/YOUR_USERNAME/sobitas-frontend:latest

# 4. Create network if it doesn't exist
docker network inspect sobitas-net >/dev/null 2>&1 || docker network create sobitas-net

# 5. Run with environment variables
docker run -d \
  --name sobitas-frontend \
  --restart unless-stopped \
  --network sobitas-net \
  -p 3001:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=https://protein.tn/api-proxy \
  -e NEXT_PUBLIC_STORAGE_URL=https://protein.tn/storage-proxy \
  -e API_BACKEND_URL=https://admin.protein.tn/api \
  -e STORAGE_BACKEND_URL=https://admin.protein.tn/storage \
  ghcr.io/YOUR_USERNAME/sobitas-frontend:latest
```

---

## Verify Fix

### 1. Check Environment Variables
```bash
docker exec sobitas-frontend env | grep NEXT_PUBLIC
# Should show: NEXT_PUBLIC_API_URL and NEXT_PUBLIC_STORAGE_URL
```

### 2. Test in Browser
1. Open https://protein.tn
2. Press F12 (DevTools) → Network tab
3. Refresh page (Ctrl+F5)
4. Verify images load with **200 OK** status

### 3. Test These Pages
- ✅ Homepage - Logo, slider, products
- ✅ /shop - Product images
- ✅ /products/[slug] - Product details
- ✅ /blog - Article covers

---

## Expected Results

**Before Fix:**
```
❌ GET /storage-proxy/produits/abc.jpg → 404 Not Found
❌ Images don't appear
```

**After Fix:**
```
✅ GET /storage-proxy/produits/abc.jpg → 200 OK
✅ All images load correctly
```

---

## Troubleshooting

**Images still 404?**
```bash
# Check env vars are set
docker exec sobitas-frontend env | grep -E "NEXT_PUBLIC|BACKEND"

# Check container network
docker inspect sobitas-frontend | grep NetworkMode
# Should show: "sobitas-net"
```

**Container won't start?**
```bash
# View logs
docker logs sobitas-frontend --tail 50
```

---

## Files Changed

1. `.github/workflows/frontend-deploy.yml` - Added runtime env vars
2. `frontend/.env.production` - Created environment template

**No code changes needed!** Just configuration updates.

---

## Questions?

See the full walkthrough for detailed explanations:
- Root cause analysis
- Technical details
- Complete troubleshooting guide
