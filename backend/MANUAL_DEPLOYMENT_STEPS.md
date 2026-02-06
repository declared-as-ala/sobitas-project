# 🚀 Manual Deployment Steps (If CI/CD Fails)

Since the GitHub Actions workflow is having connection issues, here's how to manually deploy the modern dashboard:

## Step-by-Step Manual Deployment

### 1. SSH to Your Server
```bash
ssh root@145.223.118.9
```

### 2. Navigate to Project
```bash
cd /root/sobitas-project
```

### 3. Pull Latest Code
```bash
git pull origin main
```

### 4. Go to Backend Directory
```bash
cd backend
```

### 5. Install NPM Dependencies
```bash
npm install
```

**Note**: If `npm` is not available, you may need to:
- Install Node.js first: `curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs`
- Or use Docker: `docker compose exec backend bash` then run commands inside

### 6. Compile Assets (CRITICAL!)
```bash
npm run production
```

This creates:
- `public/css/app.css` (Tailwind CSS)
- `public/js/app.js` (Alpine.js)

### 7. Clear Laravel Cache
```bash
php artisan view:clear
php artisan cache:clear
php artisan config:clear
```

### 8. If Using Docker
If your backend runs in Docker containers:

```bash
# Option A: Run commands inside container
docker compose exec backend bash
cd /var/www/html
npm install
npm run production
exit

# Option B: Copy files if npm is on host
# (compile on host, then ensure files are in container volume)
```

### 9. Verify Files Exist
```bash
# Check if compiled files exist
ls -lh public/css/app.css
ls -lh public/js/app.js

# Should show files with size > 0
```

### 10. Restart Services (if needed)
```bash
# If using Docker
docker compose restart backend laravel-nginx

# If using systemd/php-fpm
sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
```

### 11. Visit Dashboard
Open: **https://admin.sobitas.tn/admin**

You should see the modern dashboard!

---

## 🔧 Troubleshooting CI/CD Connection Issue

The GitHub Actions workflow is failing with:
```
dial tcp ***:22: connect: connection timed out
```

### Possible Causes & Solutions:

1. **Firewall Blocking GitHub Actions IPs**
   ```bash
   # On server, check firewall
   ufw status
   # Allow SSH from GitHub Actions IP ranges
   # Or temporarily allow all (for testing)
   ufw allow 22/tcp
   ```

2. **SSH Service Not Running**
   ```bash
   # Check SSH status
   systemctl status ssh
   # Or
   systemctl status sshd
   
   # Start if needed
   systemctl start ssh
   ```

3. **SSH Port Changed**
   - If SSH is on a different port, update GitHub secret `VPS_PORT`

4. **Server IP Changed**
   - Verify the server IP is still `145.223.118.9`
   - Update GitHub secret `VPS_HOST` if changed

5. **Network Issues**
   - Check if server is accessible: `ping 145.223.118.9`
   - Check if port 22 is open: `telnet 145.223.118.9 22`

### Quick Fix: Use Manual Deployment

For now, use manual deployment (steps above) until CI/CD connection is fixed.

---

## ✅ Verification Checklist

After manual deployment:

- [ ] Code pulled successfully
- [ ] `npm install` completed
- [ ] `npm run production` completed
- [ ] `public/css/app.css` exists (> 0 bytes)
- [ ] `public/js/app.js` exists (> 0 bytes)
- [ ] Laravel cache cleared
- [ ] Dashboard shows modern design at https://admin.sobitas.tn/admin
- [ ] All buttons work
- [ ] Hover effects work
- [ ] Mobile responsive

---

## 🎯 Quick Command Summary

```bash
# All commands in one go (copy-paste ready):
cd /root/sobitas-project && \
git pull origin main && \
cd backend && \
npm install && \
npm run production && \
php artisan view:clear && \
php artisan cache:clear && \
php artisan config:clear
```

Then visit: **https://admin.sobitas.tn/admin**

---

## 📝 If npm is not available

If you get "npm: command not found":

### Option 1: Install Node.js on Server
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### Option 2: Use Docker Container
```bash
# Enter backend container
docker compose exec backend bash

# Inside container:
cd /var/www/html
npm install
npm run production
exit
```

### Option 3: Compile Locally and Upload
1. Compile on your local machine
2. Upload `public/css/app.css` and `public/js/app.js` to server
3. Place in `/root/sobitas-project/backend/public/` directory

---

**Note**: The modern dashboard will work once assets are compiled, regardless of CI/CD status.
