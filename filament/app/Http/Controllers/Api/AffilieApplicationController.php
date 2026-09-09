<?php

namespace App\Http\Controllers\Api;

use App\Enums\AffilieStatus;
use App\Enums\AffilieType;
use App\Http\Controllers\Controller;
use App\Models\Affilie;
use App\Models\User;
use App\Services\AffilieKycService;
use App\Services\EmailVerificationOtpService;
use App\Services\PhoneVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * The public affiliate application, and the pipeline that turns it into a reviewable file.
 *
 * ── THIS ENDPOINT DID NOT EXIST ──────────────────────────────────────────────────────────────
 * `frontend/src/services/partners.ts` has POSTed to `/partner-applications` since the /partenaires
 * form shipped. routes/api.php had no affiliate route of any kind, so every submission got a 404
 * and every applicant got a generic failure message. Nobody who filled that form was ever
 * recorded. This class is the receiving end that was missing.
 *
 * ── THE SECURITY PROPERTY, PRESERVED VERBATIM ────────────────────────────────────────────────
 * From the frontend service's own docblock, and it is the reason a public form may be pointed at a
 * previously admin-only module at all:
 *
 *   > An application is a REQUEST, NOT AN ACCOUNT. It creates an affiliate with status `pending`
 *   > and NOTHING else: no commission rate, no code, no panel access. An administrator reviews it
 *   > in Filament and approves. The form can only ever create the least-privileged row in the
 *   > system, so the worst a bad actor achieves is noise in a review queue.
 *
 * Concretely, `store()` writes `status = pending` and `commission_rate = 0`, creates no
 * `AffilieCode`, and creates no `User`. Panel access is impossible by construction: User::
 * canAccessPanel('affilie') demands BOTH an Active affiliate AND role_id === the affiliate role,
 * and neither is set here. If you add a field to this method, check it against that paragraph
 * first.
 *
 * ── WHY THE OTP AND KYC STEPS REQUIRE A LOGIN AND THE APPLICATION DOES NOT ───────────────────
 * `PhoneVerificationService` and `EmailVerificationOtpService` are production-grade — hashed
 * codes, expiry, attempt caps, per-account / per-phone / per-IP / shop-wide ceilings, and a
 * `Cache::lock` around the allocation so a paid WinSMS send cannot be raced. They are also, by
 * their signatures, bound to a `User`. Writing an anonymous variant of either would mean a second
 * OTP implementation with its own copy of those five ceilings — exactly the drift the affiliate
 * plan forbids for the money ledger, for the same reason.
 *
 * So the split is: the application itself stays anonymous (the lead-capture form keeps working
 * exactly as the visitor expects), and the steps that spend money or store an identity document
 * run against `auth:sanctum`, reusing the two services untouched. The verified timestamps are then
 * MIRRORED onto the affiliate row, which is what `affilies.phone_verified_at` /
 * `email_verified_at` are for — the affiliate file must be readable by a reviewer without joining
 * to the user table.
 */
class AffilieApplicationController extends Controller
{
    /**
     * POST /api/affilie-applications — public.
     *
     * Returns 201 with `{ status: 'pending', reference }`. The frontend already special-cases 409
     * (duplicate) and 429 (throttle); 422 carries Laravel's usual `errors` bag, whose first field
     * message the storefront surfaces.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(AffilieType::values())],
            'name' => ['required', 'string', 'max:255'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email:filter', 'max:255'],
            // Not normalised to the Tunisian +216 form here: a gym may legitimately give a
            // landline, and the strict check belongs at the OTP step, where it produces an error
            // the applicant can act on instead of blocking the whole application.
            'phone' => ['required', 'string', 'max:64'],
            'city' => ['nullable', 'string', 'max:120'],
            // Free text. People answer "~200 adhérents", not 200.
            'audience_size' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:2000'],
            'referred_by_code' => ['nullable', 'string', 'max:64'],
        ]);

        $email = mb_strtolower(trim($data['email']));

        if (Affilie::query()->forEmail($email)->exists()) {
            // 409, not 422: the payload is valid, the state conflicts. The frontend has a specific
            // French message for this and it is reassuring rather than corrective — a second
            // submission is almost always someone who is not sure the first one arrived.
            return response()->json([
                'message' => 'Une candidature existe déjà pour cette adresse e-mail.',
            ], 409);
        }

        $affilie = new Affilie;
        $affilie->forceFill([
            'type' => $data['type'],
            'name' => trim($data['name']),
            'business_name' => $data['business_name'] ?? null,
            'email' => $email,
            'phone' => trim($data['phone']),
            'city' => $data['city'] ?? null,
            'audience_size' => $data['audience_size'] ?? null,
            'application_message' => $data['message'] ?? null,
            'referred_by_code' => isset($data['referred_by_code'])
                ? mb_strtoupper(trim($data['referred_by_code']))
                : null,
            'status' => AffilieStatus::Pending->value,
            /*
             * NOT the table's default of 10.
             *
             * `affilies.commission_rate` is NOT NULL with a default of 10, inherited from a module
             * where every row was typed in by an administrator who had already agreed a rate. Left
             * to the default, a public application would arrive pre-loaded with a 10% margin that
             * nobody granted, and an admin who approves without opening the rate field would be
             * handing it out by accident. 0 makes the docblock's "no commission rate" literally
             * true and makes a forgotten rate fail closed. The Approve action requires one.
             */
            'commission_rate' => 0,
            'kyc_status' => Affilie::KYC_PENDING,
            'reference' => Affilie::generateReference(),
            'applied_at' => now(),
            /*
             * Link the account when the visitor is already signed in on the storefront. This grants
             * nothing — a customer's role_id is 2 and the affiliate is `pending`, so both halves of
             * canAccessPanel still refuse — it only lets the same person come back and finish their
             * own KYC and OTP steps without an administrator having to pair the rows by hand.
             *
             * The guard is named EXPLICITLY. This route is public, so no `auth:` middleware has
             * called `shouldUse('sanctum')` and the default guard is still `web` — which on an API
             * route has no session and would therefore always resolve to null, silently discarding
             * the link for every signed-in applicant.
             */
            'user_id' => $request->user('sanctum')?->getAuthIdentifier(),
        ])->save();

        return response()->json([
            'status' => 'pending',
            'reference' => (string) $affilie->reference,
            'message' => 'Votre candidature a bien été enregistrée. Nous revenons vers vous après examen.',
            // Tells the storefront whether it can go straight to the ID-card and OTP steps or must
            // first ask the visitor to sign in / create a customer account.
            'linked_account' => $affilie->user_id !== null,
        ], 201);
    }

    /**
     * GET /api/affilie-applications/me — the caller's own application, for resuming the funnel.
     *
     * Deliberately thin, for the same reason the public code preview is: it returns what the
     * APPLICANT is entitled to see. No commission rate, no balance, no admin note. Someone whose
     * application is refused should not be able to read the internal reasoning by polling their
     * own status endpoint.
     */
    public function me(Request $request, AffilieKycService $kyc): JsonResponse
    {
        $affilie = $this->findApplication($request);

        if ($affilie === null) {
            return response()->json(['message' => 'Aucune candidature associée à ce compte.'], 404);
        }

        return response()->json($this->publicState($affilie, $kyc));
    }

    /**
     * POST /api/affilie-applications/me/kyc — multipart. Both sides of the identity card.
     *
     * Sides may be sent together or one at a time (a phone camera fails often enough that forcing
     * both into one request means re-taking a good photo to replace a bad one). A side already on
     * file is optional; a missing one is required, so the first call must carry both.
     */
    public function uploadKyc(Request $request, AffilieKycService $kyc): JsonResponse
    {
        $affilie = $this->findApplication($request);

        if ($affilie === null) {
            return response()->json(['message' => 'Aucune candidature associée à ce compte.'], 404);
        }

        if ($affilie->status === AffilieStatus::Rejected) {
            return response()->json([
                'message' => 'Cette candidature a été refusée. Contactez-nous avant d’envoyer des documents.',
            ], 409);
        }

        $request->validate([
            'id_front' => AffilieKycService::rulesFor(! $kyc->exists($affilie, 'front')),
            'id_back' => AffilieKycService::rulesFor(! $kyc->exists($affilie, 'back')),
            // The CIN number itself, so a reviewer can cross-check the card against what was typed.
            'kyc_cin' => ['nullable', 'string', 'max:32'],
        ], [], [
            'id_front' => 'recto de la CIN',
            'id_back' => 'verso de la CIN',
        ]);

        foreach (AffilieKycService::sides() as $side) {
            $field = 'id_'.$side;
            if ($request->hasFile($field)) {
                $kyc->store($affilie, $side, $request->file($field));
            }
        }

        if ($request->filled('kyc_cin')) {
            $affilie->forceFill(['kyc_cin' => trim((string) $request->input('kyc_cin'))])->save();
        }

        $kyc->markSubmittedIfComplete($affilie->refresh());

        return response()->json($this->publicState($affilie->refresh(), $kyc));
    }

    /**
     * POST /api/affilie-applications/me/phone-otp — send.
     *
     * A pass-through to PhoneVerificationService. Every ceiling, the resend cooldown and the
     * `Cache::lock` that stops two concurrent requests buying two SMS all live in the service and
     * are not reimplemented, reordered or relaxed here.
     */
    public function sendPhoneOtp(Request $request, PhoneVerificationService $service): JsonResponse
    {
        $affilie = $this->findApplication($request);

        if ($affilie === null) {
            return response()->json(['message' => 'Aucune candidature associée à ce compte.'], 404);
        }

        $data = $request->validate(['phone' => ['required', 'string', 'max:20']]);

        return response()->json(
            $service->send($this->userOf($request), $data['phone'], (string) $request->ip())
        );
    }

    /** POST /api/affilie-applications/me/phone-otp/verify */
    public function verifyPhoneOtp(Request $request, PhoneVerificationService $service, AffilieKycService $kyc): JsonResponse
    {
        $affilie = $this->findApplication($request);

        if ($affilie === null) {
            return response()->json(['message' => 'Aucune candidature associée à ce compte.'], 404);
        }

        $data = $request->validate(['code' => ['required', 'digits:6']]);

        // Throws ValidationException (422) on a wrong/expired code, exactly as the storefront's own
        // phone-verification screen already expects.
        $service->verify($this->userOf($request), $data['code']);

        $verifiedPhone = (string) $this->userOf($request)->refresh()->phone;

        $affilie->forceFill([
            // Take the PROVED number, not the one typed on the application form. If they differ,
            // the proved one is the only number we know reaches this person — and it is stored in
            // the normalised +216 form the SMS service produced.
            'phone' => $verifiedPhone !== '' ? $verifiedPhone : $affilie->phone,
            'phone_verified_at' => now(),
        ])->save();

        return response()->json($this->publicState($affilie->refresh(), $kyc));
    }

    /** POST /api/affilie-applications/me/email-otp — send. */
    public function sendEmailOtp(Request $request, EmailVerificationOtpService $service, AffilieKycService $kyc): JsonResponse
    {
        $affilie = $this->findApplication($request);

        if ($affilie === null) {
            return response()->json(['message' => 'Aucune candidature associée à ce compte.'], 404);
        }

        $user = $this->userOf($request);

        if ($user->hasVerifiedEmail()) {
            // The service is a no-op for an already-verified address, which would leave the
            // affiliate row unmirrored and the funnel stuck on a step the user has already passed.
            $this->mirrorEmailVerified($affilie);

            return response()->json([
                'already_verified' => true,
                'message' => 'Votre adresse e-mail est déjà vérifiée.',
            ] + $this->publicState($affilie->refresh(), $kyc));
        }

        $service->send($user);

        return response()->json([
            'message' => 'Code envoyé par e-mail.',
            'expires_in' => EmailVerificationOtpService::EXPIRY_MINUTES * 60,
            'resend_after' => EmailVerificationOtpService::RESEND_SECONDS,
            'attempts_remaining' => EmailVerificationOtpService::MAX_ATTEMPTS,
        ]);
    }

    /** POST /api/affilie-applications/me/email-otp/verify */
    public function verifyEmailOtp(Request $request, EmailVerificationOtpService $service, AffilieKycService $kyc): JsonResponse
    {
        $affilie = $this->findApplication($request);

        if ($affilie === null) {
            return response()->json(['message' => 'Aucune candidature associée à ce compte.'], 404);
        }

        $data = $request->validate(['code' => ['required', 'digits:6']]);

        $service->verify($this->userOf($request), $data['code']);

        $this->mirrorEmailVerified($affilie);

        return response()->json($this->publicState($affilie->refresh(), $kyc));
    }

    private function mirrorEmailVerified(Affilie $affilie): void
    {
        if ($affilie->getAttribute('email_verified_at') === null) {
            $affilie->forceFill(['email_verified_at' => now()])->save();
        }
    }

    private function userOf(Request $request): User
    {
        /** @var User $user auth:sanctum guarantees this is set on every route reaching here. */
        $user = $request->user();

        return $user;
    }

    /**
     * Resolve the caller's application.
     *
     * Primary key is `affilies.user_id`, set when the application was submitted by a signed-in
     * visitor. The fallback exists because most people apply logged out and create an account
     * afterwards — but it is gated on `hasVerifiedEmail()`, because registration alone does not
     * prove control of an address. Without that gate, anyone could register with a known
     * applicant's e-mail and take over their file, which for a KYC pipeline means uploading a
     * different person's identity card into someone else's application.
     */
    private function findApplication(Request $request): ?Affilie
    {
        $user = $this->userOf($request);

        $affilie = Affilie::query()->where('user_id', $user->getAuthIdentifier())->first();
        if ($affilie !== null) {
            return $affilie;
        }

        if (! $user->hasVerifiedEmail() || blank($user->email)) {
            return null;
        }

        $claimable = Affilie::query()
            ->whereNull('user_id')
            ->forEmail((string) $user->email)
            ->first();

        if ($claimable === null) {
            return null;
        }

        $claimable->forceFill(['user_id' => $user->getAuthIdentifier()])->save();

        return $claimable;
    }

    /** @return array<string, mixed> */
    private function publicState(Affilie $affilie, AffilieKycService $kyc): array
    {
        $status = $affilie->status instanceof AffilieStatus
            ? $affilie->status
            : AffilieStatus::tryFrom((string) $affilie->getAttribute('status'));

        $type = $affilie->type instanceof AffilieType
            ? $affilie->type
            : AffilieType::tryFrom((string) $affilie->getAttribute('type'));

        return [
            'reference' => (string) $affilie->getAttribute('reference'),
            'status' => $status?->value ?? (string) $affilie->getAttribute('status'),
            'status_label' => $status?->label(),
            'type' => $type?->value ?? (string) $affilie->getAttribute('type'),
            'type_label' => $type?->label(),
            'name' => (string) $affilie->name,
            'email' => (string) $affilie->email,
            'phone' => (string) $affilie->phone,
            'phone_verified' => $affilie->getAttribute('phone_verified_at') !== null,
            'email_verified' => $affilie->getAttribute('email_verified_at') !== null,
            'kyc' => [
                'status' => (string) ($affilie->getAttribute('kyc_status') ?? Affilie::KYC_PENDING),
                // Booleans, never paths. A path is a hint about the private disk's layout and is
                // useless to the client anyway: documents are only ever reachable through the
                // signed, authenticated route.
                'id_front' => $kyc->pathFor($affilie, 'front') !== null,
                'id_back' => $kyc->pathFor($affilie, 'back') !== null,
                'submitted_at' => optional($affilie->getAttribute('kyc_submitted_at'))->toIso8601String(),
                'reject_reason' => $affilie->getAttribute('kyc_reject_reason'),
            ],
        ];
    }
}
