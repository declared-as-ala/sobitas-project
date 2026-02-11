# Fix Entrypoint Line Endings Issue

## Problem

The entrypoint script is copied but can't be executed. This is likely a **line ending issue** (Windows CRLF vs Unix LF).

## Solution

### Option 1: Fix Line Endings in docker-entrypoint.sh (Recommended)

The file needs Unix line endings (LF). On Windows, you can:

**Using Git (if you have it):**
```powershell
# Configure Git to handle line endings
git config core.autocrlf false

# Re-checkout the file with LF endings
git checkout -- filament/docker-entrypoint.sh
```

**Or manually fix in your editor:**
- Open `filament/docker-entrypoint.sh` in VS Code
- Click on "CRLF" in the bottom right status bar
- Select "LF" 
- Save the file

**Or use PowerShell to convert:**
```powershell
# Convert CRLF to LF
$content = Get-Content -Path "filament/docker-entrypoint.sh" -Raw
$content = $content -replace "`r`n", "`n"
[System.IO.File]::WriteAllText("filament/docker-entrypoint.sh", $content, [System.Text.Encoding]::UTF8)
```

### Option 2: Fix in Dockerfile (Alternative)

Add a step to fix line endings during build:

```dockerfile
# Copy entrypoint script FIRST
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh
```

## After Fixing

```powershell
# Rebuild
docker-compose build --no-cache backend

# Start
docker-compose up -d backend

# Check logs (should work now)
docker logs sobitas-backend --tail 20
```

---

**The Dockerfile has been updated to use full path `/usr/local/bin/docker-entrypoint.sh` in ENTRYPOINT.**
