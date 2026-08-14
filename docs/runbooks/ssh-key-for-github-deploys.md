# Fixing the VPS SSH problem, permanently

**Status: this is the single most expensive unfixed thing in the deploy pipeline.**

Every deploy workflow ends with an SSH step that tells the VPS to pull the new image. That step has
been failing intermittently since 07/08/2026 and consistently since 10/08:

```
ssh: handshake failed: unable to authenticate, attempted methods [none password]
❌ Could not copy docker-compose.yml to the server.
❌ SSH deploy failed — the new image did NOT reach the server.
```

What it costs, concretely:

- **Deploys land late or not at all.** The image builds and is pushed to GHCR every time; only the
  "go and get it" step fails. On 14/08 the `catalog_health` backend deploy failed this way and had
  to be re-run by hand.
- **Every read-only diagnostic is unavailable.** `vps-run` and `vps-doctor` both authenticate the
  same way, so `catalog:iherb:content --status`, `catalog:iherb:promote --status` and the Laravel
  logs cannot be read at all. Diagnosing "why are 10,259 products noindexed" on 14/08 had to be done
  by sampling the public API forty times, because the command that answers it in one line needs a
  shell.

## Why a new password is not the fix

The workflow's own error message currently suggests rotating `VPS_PASSWORD`. That works until the
next rotation, and then breaks again — a pipeline whose only credential is a password breaks every
time that password changes, and it has to change. Hostinger also resets it on some support actions.

A key does not expire, is not typed by a human, and cannot be mangled by quoting. The workflows
already pass `key: ${{ secrets.VPS_SSH_KEY }}` **before** the password and fall back to the password
when the secret is unset — so this can be set up with no code change and no downtime.

---

## Step 1 — Make a key pair (on your own machine)

Open PowerShell. `ed25519` rather than RSA: shorter, and OpenSSH on every current Hostinger image
supports it.

```powershell
ssh-keygen -t ed25519 -C "github-actions@protein.tn" -f "$env:USERPROFILE\.ssh\protein_deploy" -N '""'
```

`-N '""'` means **no passphrase**. That is correct here and only here: GitHub Actions runs
unattended and cannot type one. The key's only power is logging into this VPS, and you can revoke it
in one line (Step 5).

Two files now exist:

| file | what it is | where it goes |
|---|---|---|
| `protein_deploy.pub` | public key | onto the VPS |
| `protein_deploy` | **private key** | into a GitHub secret, nowhere else |

## Step 2 — Put the public key on the VPS

Open Hostinger **hPanel → VPS → your server → Browser terminal**. That terminal logs in without SSH,
so it works even though SSH is currently broken.

Print the public key on your own machine first:

```powershell
Get-Content "$env:USERPROFILE\.ssh\protein_deploy.pub"
```

It is one line starting `ssh-ed25519 AAAA…`. In the browser terminal, paste it into the command
below **between the quotes**:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA...PASTE THE WHOLE LINE HERE... github-actions@protein.tn" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Check it landed as exactly one new line:

```bash
tail -1 ~/.ssh/authorized_keys
wc -l ~/.ssh/authorized_keys
```

> Hostinger also has **hPanel → VPS → SSH keys**, which does the same thing through a form. Either
> is fine. The browser terminal is written out here because it also lets you run Step 3.

## Step 3 — Confirm the server will accept a key at all

Still in the browser terminal:

```bash
grep -E "^\s*(PubkeyAuthentication|PermitRootLogin|AuthorizedKeysFile)" /etc/ssh/sshd_config
```

You want to see, or nothing at all (the defaults are already correct):

```
PubkeyAuthentication yes
PermitRootLogin yes            # or prohibit-password, which is better and still works with a key
```

If `PubkeyAuthentication` is explicitly `no`, change it and reload:

```bash
sed -i 's/^\s*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sshd -t && systemctl reload sshd
```

`sshd -t` validates the config **before** reloading. Run it. A malformed `sshd_config` plus a reload
is how a VPS becomes unreachable by SSH entirely, and then only the browser terminal can save you.

## Step 4 — Give GitHub the private key

```powershell
Get-Content "$env:USERPROFILE\.ssh\protein_deploy" | Set-Clipboard
```

GitHub → the repo → **Settings → Secrets and variables → Actions → New repository secret**

| field | value |
|---|---|
| Name | `VPS_SSH_KEY` |
| Secret | paste — **including** the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END …-----` lines and the trailing newline |

While you are there, confirm these three exist and are right:

- `VPS_HOST` — the IP or hostname
- `VPS_USER` — `root`
- `VPS_PORT` — `22` unless you changed it

Leave `VPS_PASSWORD` in place for now. `appleboy/ssh-action` uses the key when one is supplied, so
the password simply stops being consulted; keeping it means a broken key does not lock you out of
your own pipeline on the same day you set it up.

## Step 5 — Prove it, then keep it proven

Run **Actions → VPS Doctor** (`workflow_dispatch`). It is read-only and it reports the auth result
without changing anything. Green means done.

From your own machine, the same check:

```powershell
ssh -i "$env:USERPROFILE\.ssh\protein_deploy" -o IdentitiesOnly=yes root@YOUR_VPS_IP "docker compose ps"
```

To revoke this key later — if the laptop is lost, or someone leaves:

```bash
sed -i '/github-actions@protein.tn/d' ~/.ssh/authorized_keys
```

That is why the `-C` comment in Step 1 was set to something identifiable.

---

## While you are in that terminal — two things are still outstanding

Both were found earlier and both need one command each.

**The watchdog is scheduled but the file it calls does not exist.** The cron line is live and has
been failing silently every time it fires:

```bash
cd /root/sobitas-project && git pull
install -m 0755 ops/watchdog.sh /usr/local/bin/protein-watchdog
protein-watchdog --once        # confirm it runs before trusting the schedule
```

**Confirm the image poller is installed.** It is what delivers deploys when the SSH step fails, and
on 14/08 a backend deploy sat undelivered until the workflow was re-run by hand:

```bash
crontab -l | grep vps-autodeploy
```

Nothing printed means it is not installed, and every failed SSH step is a deploy that never arrived.
