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

## Which machine am I on? (read this first)

This is the one thing that goes wrong. There are **two different shells** involved and they take
**different languages**:

| shell | prompt looks like | language | how you open it |
|---|---|---|---|
| your Windows PC | `PS C:\Users\kouss>` | PowerShell | Start menu → PowerShell |
| the VPS | `root@srv596408:~#` | bash (Linux) | hPanel → VPS → Browser terminal |

`$env:USERPROFILE`, `Get-Content` and `Set-Clipboard` are **PowerShell only**. Pasted into the VPS
they do not fail usefully — bash expands `$env` to an empty string and silently writes a key with a
broken filename, then `Get-Content: command not found`. That happened on 14/08/2026 and cost an hour.

**Everything below runs in ONE place: the Hostinger browser terminal.** Your PC is not involved at
all. That is deliberate — the key is for GitHub, not for you, so it never needs to touch your laptop.

---

## Step 1 — Make the key pair, on the VPS

hPanel → **VPS → your server → Browser terminal**. It logs in without SSH, so it works even while
SSH is broken. Widen the browser window before you start — you will be copying a long block of text
out of this terminal, and a narrow window wraps it.

Paste this whole block:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "github-actions@protein.tn" -f ~/.ssh/github_actions -N ""
```

`-N ""` means **no passphrase** — two double-quote characters with nothing between them. That is
correct here and only here: GitHub Actions runs unattended and cannot type one. The key's only power
is logging into this VPS, and Step 5 revokes it in one line.

> In bash, `-N '""'` (quote-quote wrapped in single quotes) sets the passphrase to the literal text
> `""` rather than to nothing, and Actions then cannot use the key. The quoting rule differs from
> PowerShell. Use exactly `-N ""` here.

Two files now exist:

| file | what it is | where it goes |
|---|---|---|
| `~/.ssh/github_actions.pub` | public half | stays on the VPS |
| `~/.ssh/github_actions` | **private half** | into the GitHub secret, nowhere else |

## Step 2 — Let that key log in

```bash
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
tail -1 ~/.ssh/authorized_keys
```

The last command must print one line starting `ssh-ed25519 AAAA…` and ending
`github-actions@protein.tn`.

This **adds** a way in. It removes nothing, so there is no risk of locking yourself out.

If you previously pasted the placeholder line from an older copy of this runbook, drop it — it is
inert, but it is noise in a file that should be readable at a glance:

```bash
grep -vF 'PASTE' ~/.ssh/authorized_keys > /root/ak.tmp || true
mv /root/ak.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
```

## Step 3 — Confirm the server will accept a key at all

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

Print it, still in the browser terminal:

```bash
cat ~/.ssh/github_actions
```

Select from `-----BEGIN OPENSSH PRIVATE KEY-----` to `-----END OPENSSH PRIVATE KEY-----`
**inclusive** — both banner lines are part of the key — and copy.

Then: <https://github.com/declared-as-ala/sobitas-project/settings/secrets/actions>
→ **New repository secret**

| field | value |
|---|---|
| Name | `VPS_SSH_KEY` — exact, case-sensitive, no spaces |
| Secret | the pasted key, both banner lines included |

That name is not a choice. It is what every workflow reads —
`key: ${{ secrets.VPS_SSH_KEY }}` in `deploy-filament.yml`, `deploy-frontend.yml`,
`deploy-fitness-api.yml` and `vps-run.yml`. Any other name silently changes nothing.

While you are on that page, confirm these three already exist:

- `VPS_HOST` — the IP or hostname
- `VPS_USER` — `root`
- `VPS_PORT` — `22` unless you changed it

Leave `VPS_PASSWORD` in place. `appleboy/ssh-action` uses the key when one is supplied, so the
password simply stops being consulted; keeping it means a bad paste does not lock you out of your
own pipeline on the day you set it up. Delete it once Step 5 has been green twice.

## Step 5 — Prove it, then keep it proven

Run **Actions → VPS Doctor → Run workflow**. It is read-only, changes nothing, and reports whether
the server accepted the key. Green means done.

Then run a real deploy — **Actions → Deploy Filament → Run workflow** — and watch the SSH step.

To revoke this key later:

```bash
sed -i '/github-actions@protein.tn/d' ~/.ssh/authorized_keys
```

That is why `-C` in Step 1 was set to something identifiable.

---

## About the hPanel "SSH keys" form

hPanel → VPS → **SSH keys** exists and takes a **public** key through a form. It can replace Step 2.

It cannot replace the rest, and this is the part that catches people out: GitHub Actions needs the
**private** half, and a form that accepts a public key never shows you a private one. You still have
to generate the pair somewhere and copy the private half out. The browser terminal is already open
in Step 1, so doing all four steps there is strictly fewer moves.

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
