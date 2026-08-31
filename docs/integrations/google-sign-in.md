# Sign in with Google

*Written 20/08/2026. Owner's ask: "add login via google in backend and frontend and make it easy
to integrate it."*

Everything is built and shipped. **Turning it on is pasting one string into two files.** With that
string absent, no Google button renders and `POST /api/auth/google` answers `503` — the site
behaves exactly as it does today, which is why this could ship before the Google project exists.

---

## Turn it on

### 1. Create the OAuth client (5 minutes, once)

[console.cloud.google.com](https://console.cloud.google.com) → your project → **APIs & Services →
Credentials → Create credentials → OAuth client ID**.

| Field | Value |
|---|---|
| Application type | **Web application** |
| Name | anything — `protein.tn storefront` |
| Authorised JavaScript origins | `https://protein.tn` and `http://localhost:3000` |
| Authorised redirect URIs | **leave empty** |

The redirect URIs are empty on purpose. This is the browser ID-token flow; it never leaves
protein.tn, so there is nothing to redirect to. If a guide tells you to add
`/auth/google/callback`, it is describing the other flow.

You will also need the **OAuth consent screen** filled in once (app name, support email, logo,
privacy-policy URL). For accounts outside your own Workspace it must be *Published*, not *Testing*
— in Testing mode only the addresses on the test-user list can sign in, and everyone else gets an
error that says nothing useful.

Copy the client id. It looks like `123456789012-abc….apps.googleusercontent.com`.

### 2. Paste it in two places — the same string in both

```dotenv
# frontend/.env.production      (baked at build time → needs a rebuild)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789012-abc….apps.googleusercontent.com

# filament/.env                 (read at runtime → needs `php artisan config:clear`)
GOOGLE_CLIENT_ID=123456789012-abc….apps.googleusercontent.com
```

They **must** match. The API rejects any ID token whose `aud` is not this exact value, and a
mismatch fails every sign-in with "Connexion Google impossible" and one line in the log.

### 3. Migrate and deploy

```bash
php artisan migrate          # adds users.google_id
php artisan config:clear
```

Then rebuild the storefront (`NEXT_PUBLIC_*` is compiled into the bundle, so an env change without
a rebuild does nothing).

### 4. Check it

Open `/login` on a phone and on a desktop. The Google button appears under the password form,
after an "ou" rule. Sign in with an address that is **not** already a customer, then check
`users` — there should be a new row with `google_id` set and `email_verified_at` stamped. Sign out,
sign in again: no second row.

---

## How it works, and why it is built this way

```
browser                      Google                    admin.protein.tn
  │
  │ 1. click "Continuer avec Google"
  ├──────────────────────────►│
  │                            │  account chooser
  │ 2. signed ID token (JWT)   │
  │◄──────────────────────────┤
  │
  │ 3. POST /api/auth/google { credential }
  ├────────────────────────────────────────────────────►│
  │                                                      │ 4. GET oauth2.googleapis.com/tokeninfo
  │                                                      ├──► Google verifies the signature
  │                                                      │◄── claims
  │                                                      │ 5. aud == our client id?
  │                                                      │    email_verified?  exp?
  │                                                      │ 6. find by google_id → by email → create
  │ 7. { token, id, name }  — a Sanctum token            │
  │◄────────────────────────────────────────────────────┤
```

**The credential is never trusted.** It arrives as a string from a browser; anyone can POST a JWT
they wrote themselves. It is handed to Google, and only Google's answer is read.

**`aud` is checked, and that check is the whole thing.** A validly-signed Google token issued to
*another* website is still a valid Google token. Skipping this comparison — the single most common
mistake in this flow — would let any other site's login mint accounts here.

**No Socialite, no composer dependency.** The redirect flow would bring a package, two routes on
the API host, and a session token arriving back in a query string, where it lands in access logs
and in the `Referer` of the next request.

**No client secret exists in this flow.** The client id is public by design — it ships inside the
page. There is nothing here to rotate or leak.

---

## Account linking

1. **`google_id` matches** → that account. Stable even after the customer changes their email.
2. **verified email matches an existing account** → link Google to it and stamp `google_id`.
   This is what stops a duplicate account the first time an existing customer uses the button.
3. **neither** → create. `password` gets a hashed 64-character random string (the column is
   `NOT NULL`), so the account cannot be password-logged-into until the customer sets one through
   *mot de passe oublié* — which works now, see below.

Linking on email is safe **because Google asserts `email_verified`**, and the endpoint refuses a
token without it.

---

## Files

| File | What it does |
|---|---|
| `frontend/src/app/components/auth/GoogleSignInButton.tsx` | Loads GIS, renders Google's own button, hands the credential up |
| `frontend/src/services/api.ts` → `loginWithGoogle` | `POST /api/auth/google` |
| `frontend/src/contexts/AuthContext.tsx` → `loginWithGoogle` | Same session path as password login |
| `filament/app/Http/Controllers/Api/ClientController.php` → `googleLogin`, `verifyGoogleIdToken` | Verification and account resolution |
| `filament/config/services.php` → `google.client_id` | The one setting |
| `filament/database/migrations/2026_08_20_000002_add_google_id_to_users_table.php` | `users.google_id` |
| `frontend/next.config.js` | CSP `frame-src` allows `accounts.google.com` |

The button is **Google's own control**, drawn by `renderButton`. A hand-built one would match the
card better and would breach Google's branding terms, which govern the mark, the wording and the
proportions.

---

## If it does not work

| What you see | Cause |
|---|---|
| No button at all | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` unset, **or set but not rebuilt** |
| Button appears, nothing happens on click | Origin not in *Authorised JavaScript origins*. The browser console names it |
| "Connexion Google impossible" every time | `GOOGLE_CLIENT_ID` differs from the frontend's, or `config:clear` was not run. `laravel.log` says `audience mismatch` |
| Works for you, fails for everyone else | Consent screen still in **Testing** |
| Button flashes then vanishes | CSP — confirm `frame-src` includes `https://accounts.google.com` |

---

## Related, and shipped in the same change

**Password reset now exists.** `/forgot-password` and `/reset-password` had screens on the
storefront and **no routes on the API** — both POSTed into a 404, verified against live on
20/08/2026. Every customer who forgot their password was locked out. The endpoints are routed, the
reset mail points at the storefront (not the admin panel), and the rule is now the same 8
characters/letter/digit that `/register` and the API already required — the reset screen had been
advertising "minimum 6 caractères".

One thing to check on deploy: `FRONTEND_URL` in `filament/.env`. It falls back to `APP_URL`, which
is `admin.protein.tn` — leave it unset and customers get a reset link to the admin host.
