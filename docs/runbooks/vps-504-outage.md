# Runbook — admin.protein.tn returns 504

**Symptom.** Every URL on `admin.protein.tn` (the Filament panel AND `/api/*`) answers
`504 Gateway Timeout` after exactly 60 seconds. `protein.tn` still answers 200 because Next is
serving ISR pages from cache — that is a countdown, not health. As cache entries expire, product
and category pages start rendering empty.

**What the 60s tells you.** It is always exactly 60s because that is a proxy read timeout, not a
crash. Something downstream accepted the connection and never replied. Cloudflare is not the
problem — `Server: cloudflare` with no `cf-cache-status` on a 504 means Cloudflare asked the origin
and the origin went quiet.

**The request path**, so you know what you are bisecting:

```
Cloudflare → host reverse proxy → :8083 → sobitas-laravel-nginx-v2 → php-fpm (sobitas-backend-v2:9000) → sobitas-mysql / sobitas-redis
```

---

## 1. Diagnose — six commands, in this order

SSH in, then:

```bash
cd /root/sobitas-project

# (a) DISK. Check this FIRST. This VPS has filled up before (2026-07-28: it killed
#     three deploys because mysqldump could not create its output file).
#     A full disk makes MySQL refuse writes, which blocks every PHP worker, which
#     produces exactly this 504. If Use% is 100% or /var is full, jump to §2.
df -h /
df -h /var

# (b) Is anything actually running, and is anything restart-looping?
docker compose ps

# (c) Memory. An OOM kill of MySQL looks identical from outside.
free -h
dmesg -T 2>/dev/null | grep -i -E 'out of memory|oom-kill' | tail -20

# (d) What is PHP saying? LOG_CHANNEL is stderr, so Laravel's log IS the docker log.
docker logs --tail 200 --timestamps sobitas-backend-v2

# (e) What is nginx saying? "upstream timed out" here means php-fpm is the culprit;
#     "connect() failed" means php-fpm is not listening at all.
docker logs --tail 100 sobitas-laravel-nginx-v2

# (f) Is MySQL alive, and is it stuck on a query?
docker exec sobitas-mysql mysqladmin -uroot -p"$MYSQL_ROOT_PASSWORD" ping
docker exec sobitas-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW FULL PROCESSLIST"' | head -40
```

Read (f) carefully. A long list of `Query` rows all sitting on `SELECT ... FROM products` with a
`Time` in the hundreds is the signature of the most likely cause: **the catalogue grew from ~400 to
10,669 products, `/api/all_products` costs ~5s a call, and every `/shop` render used to fire ~30 of
them in sequence** — plus the sitemap crawler doing the same walk. The PHP-FPM worker pool fills up,
every worker blocks on the database, and new requests queue until the proxy gives up at 60s.

---

## 2. Fix now

### If the disk is full (§1a showed 100%)

```bash
# See where it went. Usually one of: docker logs, old images, or /var/sobitas/backups.
du -sh /var/lib/docker/* 2>/dev/null | sort -h | tail
du -sh /var/sobitas/* 2>/dev/null | sort -h | tail
du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -h | tail

# Reclaim, least destructive first.
docker image prune -af                 # unused images — always safe
docker builder prune -af               # build cache — always safe
ls -1t /var/sobitas/backups/db-pre-deploy-*.sql.gz | tail -n +11 | xargs -r rm -f   # keep 10 newest

# Truncate runaway container logs (does NOT restart anything).
truncate -s 0 $(docker inspect --format='{{.LogPath}}' sobitas-backend-v2)

df -h /                                # confirm you got space back
```

Then restart the app tier (see below).

### Restart the app tier

Restart in dependency order and **watch each one come up** rather than restarting everything at once
— if you restart the lot, you lose the evidence of which one was wrong.

```bash
# Least disruptive first: just the PHP workers.
docker compose restart backend-v2
sleep 15
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' --max-time 30 https://admin.protein.tn/api/coordonnees
```

If that fixed it, stop here — it was worker-pool exhaustion, and §3 is what stops it recurring.

If it did not:

```bash
docker compose restart backend-nginx-v2
sleep 10
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' --max-time 30 https://admin.protein.tn/api/coordonnees
```

Still not? MySQL is the suspect. Restarting it is heavier — it drops every open connection — so
check it is actually sick first (§1f), then:

```bash
docker compose restart mysql
sleep 30
docker compose restart backend-v2 backend-v2-queue backend-v2-scheduler
```

### Last resort

```bash
docker compose down && docker compose up -d
```

This recreates containers. Uploads survive (host bind-mount at `/var/sobitas/uploads`) and the
database survives (named volume `mysql-data`). Use it only when the targeted restarts above have not
worked, because it destroys the state you would need to explain what happened.

### Confirm you are actually back

```bash
for p in coordonnees categories "all_products?per_page=2" shop_facets; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s  /api/$p\n" --max-time 65 \
    "https://admin.protein.tn/api/$p"
done
```

All four should be `200`. If `/api/shop_facets` is 404 that is expected until the Filament deploy
that adds it has run — it is not an outage.

---

## 3. Why it keeps happening, and what stops it

The restart in §2 buys time. These are the causes.

### 3a. Nothing was watching (fixed in docker-compose.yml)

`backend-v2` had `restart: unless-stopped` and **no healthcheck**. That combination only helps when a
process *exits*. A PHP-FPM pool that is full does not exit — it accepts connections and never
answers, forever, and Docker considers it perfectly healthy. Nobody found out until a customer did.

There is now a healthcheck on `backend-v2` and an `autoheal` sidecar that restarts any container
Docker has marked unhealthy. Docker healthchecks on their own only *label* a container; they do not
restart it outside Swarm, which is why the sidecar is needed and not optional.

### 3b. Container logs were unbounded (fixed in docker-compose.yml)

`LOG_CHANNEL: stderr` sends every Laravel log line into Docker's `json-file` driver, which by default
**has no size limit**. On a busy day with warnings firing, that file grows until the disk is gone —
and a full disk presents as exactly this 504. Every service now has `max-size: 10m, max-file: 3`.

Rotation applies to logs written *after* the container is recreated, so run this once to apply it:

```bash
cd /root/sobitas-project && docker compose up -d
```

### 3c. The load itself (fixed in the app)

`/shop` fetched the entire catalogue on every render — ~30 sequential API calls, each ~5s, each one
a full `products` scan — and the sitemap crawler competed with it for the same worker pool. That is
what filled the pool. `/shop` now asks the database for one page of twelve, which is one call.

### 3d. Raise the worker pool anyway

Even with the load fixed, the pool is sized for a 400-product shop. Check what it is:

```bash
docker exec sobitas-backend-v2 sh -c 'grep -rE "^pm\b|^pm\.(max_children|start_servers|min_spare_servers|max_spare_servers)" /usr/local/etc/php-fpm.d/'
```

If `pm.max_children` is the PHP default (5), that is five concurrent requests for the whole site.
Raise it in `filament/Dockerfile` so it ships with the image instead of being hand-edited on the
server and lost at the next deploy — roughly `available RAM for PHP / 60MB per worker`, so 25–50 on
a 4 GB box.

### 3e. Find out before your customers do

Nothing currently watches the origin. Point a free monitor (UptimeRobot, BetterStack, or a
Cloudflare Health Check) at:

```
https://admin.protein.tn/api/coordonnees
```

Every 5 minutes, alert after 2 failures, timeout 30s. Pick that endpoint deliberately: it is cheap,
it is unauthenticated, and it exercises the whole path — proxy, nginx, php-fpm, MySQL. A monitor on
`protein.tn` would have stayed green through this entire outage, because Next kept serving cache.

---

## 4. Note on SSH access

`vps-run` and `vps-doctor` (GitHub Actions → Run workflow) can run diagnostics without a terminal,
but they currently fail on **password** auth. Deploys work because they use `VPS_SSH_KEY`. Setting
`VPS_SSH_KEY` for those two workflows as well would make the read-only tasks (`catalog-status`,
`queue-log`, `scheduler-log`) usable from a phone during an outage — which is exactly when a laptop
and an SSH client are least likely to be to hand.
