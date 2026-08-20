<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Ticket;
use App\Models\User;
use App\Services\PointsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    private const DEFAULT_PER_PAGE = 20;
    private const MAX_PER_PAGE = 100;

    private function resolvePerPage(Request $request, int $default = self::DEFAULT_PER_PAGE): int
    {
        $perPage = (int) $request->query('per_page', $request->query('limit', $default));

        if ($perPage < 1) {
            $perPage = $default;
        }

        return min($perPage, self::MAX_PER_PAGE);
    }

    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'page'      => $paginator->currentPage(),
            'per_page'  => $paginator->perPage(),
            'total'     => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }

    private function paginationLinks(LengthAwarePaginator $paginator): array
    {
        return [
            'first' => $paginator->url(1),
            'last'  => $paginator->url($paginator->lastPage()),
            'prev'  => $paginator->previousPageUrl(),
            'next'  => $paginator->nextPageUrl(),
        ];
    }

    private function paginatedResponse(LengthAwarePaginator $paginator, string $dataKey = 'data'): array
    {
        return [
            $dataKey => $paginator->items(),
            'meta'   => $this->paginationMeta($paginator),
            'links'  => $this->paginationLinks($paginator),
        ];
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt(['email' => $request->input('email'), 'password' => $request->input('password')])) {
            $user = Auth::user();
            $accessToken = $user->createToken('authToken')->plainTextToken;

            return response()->json([
                'token' => $accessToken,
                'name'  => $user->name,
                'id'    => $user->id,
            ]);
        }

        return response()->json(['message' => 'Données invalides, vérifiez votre email et mot de passe'], 403);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'phone'    => ['required', 'string', 'max:20'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'],
        ]);

        // role_id is intentionally non-fillable/guarded on the User model, so `User::create([...])`
        // silently DROPS it — and with a NOT NULL `users.role_id` column the insert throws (HTTP 500,
        // which fully blocked signup). forceFill bypasses mass-assignment protection so role_id is part
        // of the single INSERT while still never being accepted from client input.
        $user = (new User())->forceFill([
            'name'     => $validated['name'],
            'role_id'  => 2, // default customer role — always server-set, never from the client
            'phone'    => $validated['phone'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);
        $user->save();

        $token = $user->createToken('authToken')->plainTextToken;

        return response()->json([
            'token' => $token,
            'name'  => $user->name,
            'id'    => $user->id,
        ], 201);
    }

    /**
     * ── SIGN IN WITH GOOGLE ─────────────────────────────────────────────────────────────────
     * Owner, 20/08/2026: *"add login via google in backend and frontend and make it easy to
     * integrate it."*
     *
     * Takes the ID token the browser got from Google Identity Services and answers with the SAME
     * envelope as login() and register() — {token, name, id} — so the storefront has one session
     * path rather than two.
     *
     * ── THE ONLY THING THAT MAKES THIS SAFE ─────────────────────────────────────────────────
     * The credential is an unverified string from a browser. Anyone can POST this endpoint a JWT
     * they wrote themselves claiming to be contact@protein.tn. So it is NOT decoded here. It is
     * handed to Google, which checks the signature against its own rotating keys, and only the
     * response from GOOGLE is read.
     *
     * Two further checks that the signature alone does not give you:
     *
     *   `aud` MUST equal our client id. A validly-signed token issued to somebody ELSE'S Google
     *   app is still a valid Google token — accepting one lets any other site's login mint
     *   accounts here. This is the classic and most commonly missed mistake in this flow.
     *
     *   `email_verified` MUST be true. Workspace accounts can carry an address the domain admin
     *   set without proof; matching an existing customer on an unverified address would be an
     *   account takeover with extra steps.
     *
     * ── WHY tokeninfo AND NOT A JWT LIBRARY ─────────────────────────────────────────────────
     * Verifying locally means fetching Google's JWKS, caching it, honouring its rotation, and
     * implementing RS256 validation — either google/apiclient (a large dependency for one
     * endpoint) or firebase/php-jwt plus the key handling. tokeninfo is Google's own published
     * endpoint for exactly this and costs one server-to-server request on a path a customer hits
     * once per session. If sign-in volume ever makes that round trip matter, swap the body of
     * verifyGoogleIdToken() and nothing else changes.
     */
    public function googleLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'credential' => ['required', 'string', 'max:4096'],
        ]);

        $clientId = (string) config('services.google.client_id', '');
        if ($clientId === '') {
            // Configuration, not a client error: the button should not have rendered.
            return response()->json([
                'message' => 'La connexion Google n’est pas encore configurée.',
            ], 503);
        }

        $payload = $this->verifyGoogleIdToken($validated['credential'], $clientId);
        if ($payload === null) {
            return response()->json([
                'message' => 'Connexion Google impossible. Réessayez ou utilisez votre mot de passe.',
            ], 401);
        }

        $googleId = (string) ($payload['sub'] ?? '');
        $email    = strtolower(trim((string) ($payload['email'] ?? '')));
        $name     = trim((string) ($payload['name'] ?? '')) ?: (string) strstr($email, '@', true);
        $picture  = (string) ($payload['picture'] ?? '');

        if ($googleId === '' || $email === '') {
            return response()->json(['message' => 'Compte Google incomplet.'], 401);
        }

        $hasGoogleColumn = Schema::hasColumn('users', 'google_id');

        /*
         * Resolution order, and it matters:
         *   1. the stored google_id  — survives the customer changing their email with us;
         *   2. the verified email    — links Google to the password account they already have,
         *                              which is what stops a duplicate account on first sign-in;
         *   3. create.
         */
        $user = null;
        if ($hasGoogleColumn) {
            $user = User::where('google_id', $googleId)->first();
        }
        if (! $user) {
            $user = User::where('email', $email)->first();
        }

        if ($user) {
            $changes = [];
            if ($hasGoogleColumn && (string) ($user->google_id ?? '') === '') {
                $changes['google_id'] = $googleId;
            }
            // Google has verified this address, so an account that reaches us this way is verified
            // by definition. Filament's MustVerifyEmail contract reads exactly this column.
            if (empty($user->email_verified_at)) {
                $changes['email_verified_at'] = now();
            }
            if ($picture !== '' && empty($user->avatar)) {
                $changes['avatar'] = $picture;
            }
            if ($changes) {
                $user->forceFill($changes)->saveQuietly();
            }
        } else {
            /*
             * `users.password` is NOT NULL, so a Google-only account still needs a value in it. A
             * 64-char random string, hashed, is unguessable and un-loggable-into — and the
             * customer can give themselves a password any time through "mot de passe oublié",
             * which is why this is a random secret rather than an empty hash.
             *
             * role_id is server-set here for the same reason register() sets it: the column is
             * NOT NULL and guarded, so a plain create() would throw.
             */
            $attributes = [
                'name'              => $name !== '' ? $name : 'Client',
                'email'             => $email,
                'password'          => Hash::make(Str::random(64)),
                'role_id'           => 2,
                'email_verified_at' => now(),
            ];
            if ($hasGoogleColumn) {
                $attributes['google_id'] = $googleId;
            }
            if ($picture !== '') {
                $attributes['avatar'] = $picture;
            }

            $user = (new User())->forceFill($attributes);
            $user->save();
        }

        return response()->json([
            'token' => $user->createToken('authToken')->plainTextToken,
            'name'  => $user->name,
            'id'    => $user->id,
        ]);
    }

    /**
     * Verify a Google ID token with Google and return its claims, or null.
     *
     * Null for every failure mode — bad signature, wrong audience, expired, unverified email,
     * Google unreachable — because the caller has exactly one thing to say to a customer in all
     * of those cases, and distinguishing them out loud only helps somebody probing the endpoint.
     *
     * @return array<string, mixed>|null
     */
    private function verifyGoogleIdToken(string $credential, string $clientId): ?array
    {
        try {
            /*
             * Retry ONLY a connection failure. `retry()` on its own throws-and-retries on any
             * non-2xx, and tokeninfo answers 400 for an invalid token — so a forged credential
             * would cost three round trips to Google instead of one, which is a free amplifier
             * for anyone hammering this endpoint.
             */
            $response = Http::timeout(8)
                ->retry(2, 200, fn ($e) => $e instanceof \Illuminate\Http\Client\ConnectionException, throw: false)
                ->get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $credential]);
        } catch (\Throwable $e) {
            Log::warning('Google token verification unreachable', ['error' => $e->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $claims = $response->json();
        if (! is_array($claims)) {
            return null;
        }

        // `aud` — the token was issued FOR US. Without this check any Google app's token works.
        if (! hash_equals($clientId, (string) ($claims['aud'] ?? ''))) {
            Log::warning('Google token rejected: audience mismatch');

            return null;
        }

        // `iss` — both spellings are legitimate and Google returns either.
        if (! in_array((string) ($claims['iss'] ?? ''), ['accounts.google.com', 'https://accounts.google.com'], true)) {
            return null;
        }

        // tokeninfo rejects expired tokens itself; checked again because relying on someone else's
        // validation for the one claim that governs replay is not a position worth defending.
        if ((int) ($claims['exp'] ?? 0) <= time()) {
            return null;
        }

        // The string 'true' — tokeninfo returns JSON claims as strings.
        $verified = $claims['email_verified'] ?? false;
        if ($verified !== true && $verified !== 'true') {
            return null;
        }

        return $claims;
    }

    /**
     * ── PASSWORD RESET: THE TWO ENDPOINTS THE STOREFRONT HAS ALWAYS CALLED ──────────────────
     * /forgot-password and /reset-password were BUILT ON THE FRONTEND AND NEVER ROUTED HERE.
     * Both screens exist, both are linked from the login form, and both have been posting into a
     * 404 for as long as they have shipped — verified against the live API on 20/08/2026:
     *
     *     POST https://admin.protein.tn/api/forgot-password  -> 404
     *     POST https://admin.protein.tn/api/reset-password   -> 404
     *
     * So any customer who forgot their password had no way back into their account. Everything
     * needed was already in place — the `password_reset_tokens` table, the `users` broker in
     * config/auth.php, `app.frontend_url` — except these twenty lines and the two routes.
     *
     * The answer is the same whether the address is a customer or not. A form that says "aucun
     * compte" for one address and "e-mail envoyé" for another is an account enumerator, on the
     * one endpoint that is unauthenticated by necessity.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:255']]);

        $neutral = 'Si un compte correspond à cette adresse, un e-mail vient de partir avec le lien de réinitialisation.';

        try {
            Password::sendResetLink(['email' => strtolower(trim($request->input('email')))]);
        } catch (\Throwable $e) {
            // A mail-transport failure must not become a different HTTP answer, for the same
            // enumeration reason. It is logged, loudly, because it means resets are silently dead.
            Log::error('Password reset link failed to send', ['error' => $e->getMessage()]);
        }

        return response()->json(['message' => $neutral]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        // Identical to the register() rule, deliberately. The reset screen used to advertise
        // "minimum 6 caractères" against a backend that wanted 8 with a letter and a digit.
        $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'confirmed', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                /*
                 * Every existing API token is revoked. A password reset is what someone does when
                 * they think their account is compromised, and leaving the attacker's Sanctum
                 * token valid makes the reset theatre. It also signs the customer out of their own
                 * other devices, which is the expected and correct behaviour.
                 */
                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Votre mot de passe a été mis à jour.']);
        }

        return response()->json([
            'message' => 'Ce lien n’est plus valable. Demandez-en un nouveau.',
        ], 422);
    }

    public function update_profile(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name'     => ['sometimes', 'required', 'string', 'max:255'],
            'phone'    => ['sometimes', 'string', 'max:20'],
            'email'    => ['sometimes', 'required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'],
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['phone'])) {
            $user->phone = $validated['phone'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        $passwordChanged = false;
        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
            $passwordChanged = true;
        }

        $user->save();

        // On a password change, revoke the user's OTHER Sanctum tokens so a leaked/stale
        // token elsewhere cannot survive a credential rotation. Keep the current request
        // token so the user stays logged in on THIS device.
        if ($passwordChanged) {
            $currentTokenId = optional($request->user()?->currentAccessToken())->id;
            $user->tokens()
                ->when($currentTokenId, fn ($q) => $q->where('id', '!=', $currentTokenId))
                ->delete();
        }

        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
        ]);
    }

    public function profil(): JsonResponse
    {
        $user = Auth::user();

        // points_balance column may be absent/null on legacy users — default 0.
        $pointsBalance = (int) ($user->points_balance ?? 0);

        // Never expose password hash or other sensitive fields
        return response()->json([
            'id'              => $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'phone'           => $user->phone,
            'points_balance'  => $pointsBalance,
            'points_value_dt' => app(PointsService::class)->pointsToDt($pointsBalance),
        ]);
    }

    /**
     * Client order history — FIXED: added limit (was unbounded ->get()).
     */
    public function client_commandes(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $commandes = Commande::where('user_id', Auth::id())
            ->select('id', 'numero', 'etat', 'prix_ttc', 'created_at', 'region')
            ->latest()
            ->paginate($perPage);

        return $this->paginatedResponse($commandes);
    }

    public function detail_commande(int $id): JsonResponse
    {
        $commande = Commande::where('id', $id)
            ->where('user_id', Auth::id())
            ->select('id', 'numero', 'nom', 'prenom', 'email', 'phone', 'region', 'ville', 'etat', 'prix_ht', 'prix_ttc', 'frais_livraison', 'created_at')
            ->first();

        if (! $commande) {
            return response()->json(['message' => 'Commande introuvable'], 404);
        }

        $details = CommandeDetail::where('commande_id', $commande->id)
            ->select('id', 'commande_id', 'produit_id', 'qte', 'prix_unitaire', 'prix_ht', 'prix_ttc')
            ->with('product:id,designation_fr,cover,prix,promo')
            ->get();

        return response()->json(['commande' => $commande, 'details' => $details]);
    }

    /**
     * Client history by phone number.
     * FIXED: added column selection + limits (was SELECT * + unbounded).
     */
    public function historique(Request $request): JsonResponse
    {
        $request->validate([
            'tel' => ['required', 'string', 'max:20'],
        ]);

        $tel = $request->tel;

        if (str_starts_with($tel, '+216')) {
            $tel = substr($tel, 4);
        } elseif (str_starts_with($tel, '216')) {
            $tel = substr($tel, 3);
        }

        if (mb_strlen($tel) < 4) {
            return response()->json(['error' => 'Numéro trop court'], 422);
        }

        $commandes = Commande::where('phone', 'LIKE', "%{$tel}%")
            ->select('id', 'numero', 'etat', 'prix_ttc', 'created_at', 'phone')
            ->latest()
            ->limit(100)
            ->get();

        $tickets = Ticket::whereHas('client', function ($q) use ($tel) {
            $q->where('phone_1', 'LIKE', "%{$tel}%")
              ->orWhere('phone_2', 'LIKE', "%{$tel}%");
        })
            ->select('id', 'numero', 'client_id', 'prix_ttc', 'created_at')
            ->with('client:id,name,phone_1')
            ->latest()
            ->limit(100)
            ->get();

        $factures = Facture::whereHas('client', function ($q) use ($tel) {
            $q->where('phone_1', 'LIKE', "%{$tel}%")
              ->orWhere('phone_2', 'LIKE', "%{$tel}%");
        })
            ->select('id', 'numero', 'client_id', 'prix_ttc', 'created_at')
            ->with('client:id,name,phone_1')
            ->latest()
            ->limit(100)
            ->get();

        $facture_tvas = FactureTva::whereHas('client', function ($q) use ($tel) {
            $q->where('phone_1', 'LIKE', "%{$tel}%")
              ->orWhere('phone_2', 'LIKE', "%{$tel}%");
        })
            ->select('id', 'numero', 'client_id', 'prix_ttc', 'created_at')
            ->with('client:id,name,phone_1')
            ->latest()
            ->limit(100)
            ->get();

        $user = User::where('phone', 'LIKE', "%{$tel}%")
            ->select('id', 'name', 'email', 'phone')
            ->first();

        if (! $user) {
            $user = Client::where('phone_1', 'LIKE', "%{$tel}%")
                ->orWhere('phone_2', 'LIKE', "%{$tel}%")
                ->select('id', 'name', 'phone_1', 'phone_2')
                ->first();
        }

        return response()->json([
            'commandes'    => $commandes,
            'tickets'      => $tickets,
            'factures'     => $factures,
            'facture_tvas' => $facture_tvas,
            'user'         => $user,
            'tel'          => $tel,
        ]);
    }
}
