# 🔧 Troubleshooting SSH Connection Timeout

## The Problem
```
dial tcp ***:22: connect: connection timed out
```

This means GitHub Actions cannot connect to your VPS via SSH.

## ✅ Quick Fixes

### 1. Check SSH Service on Server
```bash
# SSH to server manually first
ssh root@145.223.118.9

# Then check SSH service
systemctl status ssh
# or
systemctl status sshd

# If not running, start it
systemctl start ssh
systemctl enable ssh
```

### 2. Check Firewall Rules
```bash
# Check if port 22 is open
ufw status
# or
iptables -L -n | grep 22

# If port 22 is blocked, allow it
ufw allow 22/tcp
# or
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

### 3. Check if IP Changed
- Your VPS IP might have changed
- Update `VPS_HOST` secret in GitHub repository settings

### 4. Verify SSH Key
```bash
# On your local machine, test SSH connection
ssh -v root@145.223.118.9

# If it works locally but not in GitHub Actions:
# - Check if SSH key in GitHub secrets is correct
# - Ensure key has proper permissions (chmod 600)
```

### 5. Check CloudPanel Firewall
If using CloudPanel:
- Go to CloudPanel → Security → Firewall
- Ensure port 22 is allowed
- Check if IP whitelisting is blocking GitHub Actions IPs

## 🔄 Alternative: Manual Deployment

If SSH continues to fail, deploy manually:

```bash
# On your server
cd /root/sobitas-project
git pull origin main
cd backend

# Install Node.js if needed
if ! command -v npm &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Compile assets
npm install
npm run production

# Clear Laravel cache
php artisan view:clear
php artisan cache:clear
php artisan config:clear

# Restart containers
docker compose restart backend-v2 2>/dev/null || docker compose restart backend
```

## 🔍 Verify Connection

Test SSH from GitHub Actions manually:
1. Go to GitHub Actions → Your workflow
2. Add a debug step before deployment
3. Check if connection works

## 📝 Update GitHub Secrets

Make sure these are set correctly:
- `VPS_HOST`: Your server IP (145.223.118.9)
- `VPS_USER`: root
- `VPS_SSH_KEY`: Your private SSH key (full content, including `-----BEGIN` and `-----END`)
- `VPS_PASSWORD`: (optional, if using password auth)
