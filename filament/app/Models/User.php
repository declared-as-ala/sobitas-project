<?php

namespace App\Models;

use App\Enums\PartnerStatus;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements FilamentUser, MustVerifyEmail
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'avatar',
    ];

    // role_id must never be mass-assigned — always set explicitly server-side
    protected $guarded = ['role_id'];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function hasVerifiedContact(): bool
    {
        return $this->hasVerifiedEmail() || $this->phone_verified_at !== null;
    }

    public function partner(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Partner::class, 'user_id');
    }

    public function client(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Client::class, 'user_id');
    }

    public function canAccessPanel(Panel $panel): bool
    {
        if ($panel->getId() === 'admin') {
            return in_array((int) ($this->role_id ?? 0), config('partners.admin_role_ids', [1, 3]), true);
        }

        if ($panel->getId() === 'partner') {
            $partner = $this->partner()->first();

            return $partner !== null
                && $partner->status === PartnerStatus::Active
                && (int) ($this->role_id ?? 0) === Partner::availableCommissionRoleId();
        }

        return false;
    }

    /**
     * Invitation password setup mail targeting the `/partner` Filament panel.
     */
    public function sendPartnerInvitationResetNotification(string $token): void
    {
        $resetUrl = \Filament\Facades\Filament::getPanel('partner')
            ->getResetPasswordUrl($token, $this);

        $user     = $this;
        $fromAddr = (string) config('mail.from.address');
        $fromName = config('mail.from.name', 'Protein.tn');

        Log::info('PartnerInviteReset: attempting send', [
            'to' => $user->email,
            'reset_url' => $resetUrl,
        ]);

        Mail::send([], [], function ($message) use ($user, $resetUrl, $fromAddr, $fromName) {
            $message
                ->to($user->email, $user->name)
                ->from($fromAddr, $fromName)
                ->subject('Invitation espace partenaire — Protein.tn')
                ->html(
                    view('mail.password-reset', [
                        'resetUrl' => $resetUrl,
                        'user' => $user,
                        'expiry' => config('auth.passwords.users.expire', 60),
                    ])->render()
                );
        });
    }

    /**
     * Send the password reset notification.
     *
     * ── ONE MODEL, TWO AUDIENCES, AND THEY NEED DIFFERENT LINKS ─────────────────────────────
     * This table holds admin staff AND storefront customers. Until now every reset mail linked to
     * the FILAMENT ADMIN panel's reset screen — correct for staff, useless for a customer, who
     * cannot open that panel at all (canAccessPanel refuses them). It never showed up as a bug
     * because the storefront's own /forgot-password endpoint was never routed, so no customer had
     * ever reached this method. Routing it (20/08/2026) is precisely what would have started
     * mailing customers a link they cannot use.
     *
     * The destination is therefore chosen from the role: staff keep the signed Filament URL they
     * have always had, everybody else gets the storefront screen through the ResetPasswordLink
     * notification. The role list is the same config canAccessPanel reads, so the two cannot
     * disagree about who counts as staff.
     */
    public function sendPasswordResetNotification($token): void
    {
        $isStaff = in_array((int) ($this->role_id ?? 0), config('partners.admin_role_ids', [1, 3]), true);

        if (! $isStaff) {
            $this->notify(new \App\Notifications\ResetPasswordLink($token));

            return;
        }

        // Use Filament panel's URL builder — generates a SIGNED URL.
        // The previous manual route() call was NOT signed, causing 403.
        $resetUrl = \Filament\Facades\Filament::getPanel('admin')
            ->getResetPasswordUrl($token, $this);



        $user     = $this;
        $fromAddr = (string) config('mail.from.address');
        $fromName = config('mail.from.name', 'Protein.tn');

        Log::info('PasswordReset: attempting to send reset email', [
            'to'         => $user->email,
            'from'       => $fromAddr,
            'mailer'     => config('mail.default'),
            'smtp_host'  => config('mail.mailers.smtp.host'),
            'reset_url'  => $resetUrl,
        ]);

        try {
            Mail::send([], [], function ($message) use ($user, $resetUrl, $fromAddr, $fromName) {
                $message
                    ->to($user->email, $user->name)
                    ->from($fromAddr, $fromName)
                    ->subject('Réinitialisation de votre mot de passe — Protein.tn')
                    ->html(
                        view('mail.password-reset', [
                            'resetUrl' => $resetUrl,
                            'user'     => $user,
                            'expiry'   => config('auth.passwords.users.expire', 60),
                        ])->render()
                    );
            });

            Log::info('PasswordReset: email sent successfully', ['to' => $user->email]);
        } catch (\Throwable $e) {
            Log::error('PasswordReset: FAILED to send reset email', [
                'to'    => $user->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Re-throw so Filament shows an error instead of fake success
            throw $e;
        }
    }
}
