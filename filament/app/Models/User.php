<?php

namespace App\Models;

use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements FilamentUser
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
        'role_id',
    ];

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
        'password' => 'hashed',
    ];

    public function canAccessPanel(Panel $panel): bool
    {
        if ($panel->getId() === 'partner') {
            return \App\Models\Partner::where('user_id', $this->id)
                ->where('status', 'active')
                ->exists();
        }

        return in_array((int) ($this->role_id ?? 0), [1, 3], true);
    }

    public function partner(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Models\Partner::class);
    }

    /** CRM customer (loyalty, invoices) linked to this login. */
    public function client(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Client::class);
    }

    /**
     * Send the password reset notification using the SAME direct Mail::send()
     * path as order confirmation emails — bypasses the Notification system
     * to guarantee delivery via the hardcoded SMTP config.
     */
    public function sendPasswordResetNotification($token): void
    {
        // Use Filament panel's URL builder — generates a SIGNED URL.
        // The previous manual route() call was NOT signed, causing 403.
        $resetUrl = \Filament\Facades\Filament::getPanel('admin')
            ->getResetPasswordUrl($token, $this);



        $user     = $this;
        $fromAddr = config('mail.from.address', 'bitoutawalid@gmail.com');
        $fromName = config('mail.from.name', 'Sobitas');

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
                    ->subject('Réinitialisation de votre mot de passe — Sobitas')
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
