# 🔧 Troubleshooting SSH Connection Timeout

## The Problem
GitHub Actions CI/CD is failing with:
```
dial tcp ***:22: connect: connection timed out
```

This means GitHub Actions cannot connect to your VPS via SSH.

## Possible Causes

1. **Firewall blocking SSH port 22**
2. **SSH service not running on VPS**
3. **IP address changed**
4. **Network connectivity issues**
5. **SSH key authentication problems**

## ✅ Solutions

### Solution 1: Manual Deployment (RECOMMENDED - Works Now)

Since CI/CD is blocked, deploy manually on your server:

```bash
# SSH to your server
ssh root@145.223.118.9

# Run the manual deployment script
cd /root/sobitas-project/backend
chmod +x MANUAL_DEPLOY_FIX.sh
./MANUAL_DEPLOY_FIX.sh
```

This will:
- Pull latest code
- Compile assets
- Clear all caches
- Fix route registration
- Restart container

### Solution 2: Fix SSH Access for CI/CD

#### Check SSH Service on VPS
```bash
# On your VPS
systemctl status ssh
# or
systemctl status sshd
```

If not running:
```bash
systemctl start ssh
systemctl enable ssh
```

#### Check Firewall
```bash
# Check if port 22 is open
ufw status
# or
iptables -L -n | grep 22

# If port 22 is blocked, open it:
ufw allow 22/tcp
# or
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

#### Check SSH Configuration
```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Ensure these are set:
Port 22
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes

# Restart SSH
systemctl restart ssh
```

#### Test SSH Connection
From your local machine:
```bash
ssh -v root@145.223.118.9
```

If it works locally but not from GitHub Actions, it's likely a firewall issue.

### Solution 3: Use Alternative Port

If port 22 is blocked, use a different port:

1. **Change SSH port on VPS:**
```bash
# Edit SSH config
nano /etc/ssh/sshd_config
# Change: Port 22 to Port 2222 (or another port)

# Restart SSH
systemctl restart ssh

# Update firewall
ufw allow 2222/tcp
```

2. **Update GitHub Actions workflow:**
```yaml
- name: Deploy Backend V2 to VPS
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    password: ${{ secrets.VPS_PASSWORD }}
    key: ${{ secrets.VPS_SSH_KEY }}
    port: 2222  # Add this line
    script_stop: true
    timeout: 600s
    retry_attempts: 3
    retry_wait_interval: 10s
```

### Solution 4: Check GitHub Secrets

Verify your GitHub repository secrets are correct:

1. Go to: `https://github.com/your-repo/settings/secrets/actions`
2. Check:
   - `VPS_HOST` - Should be `145.223.118.9` (or your VPS IP)
   - `VPS_USER` - Should be `root`
   - `VPS_PASSWORD` - Your root password
   - `VPS_SSH_KEY` - Your SSH private key

### Solution 5: Use SSH Key Only (More Secure)

Instead of password, use SSH key:

1. **Generate SSH key pair:**
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
```

2. **Copy public key to VPS:**
```bash
ssh-copy-id root@145.223.118.9
```

3. **Add private key to GitHub Secrets:**
   - Copy private key content
   - Add to `VPS_SSH_KEY` secret

4. **Update workflow to not use password:**
```yaml
with:
  host: ${{ secrets.VPS_HOST }}
  username: ${{ secrets.VPS_USER }}
  key: ${{ secrets.VPS_SSH_KEY }}
  # Remove password line
```

## 🚀 Quick Fix (Do This Now)

**Just run the manual deployment script on your server:**

```bash
ssh root@145.223.118.9
cd /root/sobitas-project/backend
chmod +x MANUAL_DEPLOY_FIX.sh
./MANUAL_DEPLOY_FIX.sh
```

This bypasses the CI/CD issue and gets your dashboard working immediately!

## 📝 After Manual Deployment

Once the dashboard is working, you can fix the SSH issue for future CI/CD deployments by following Solution 2-5 above.
