<?php

namespace App\Services;

use App\Models\Client;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates a web login for a CRM client and emails a storefront password reset link.
 */
class WebAccessInviteService
{
    public function __construct(
        private readonly CustomerUserLinkService $linkService,
        private readonly StorefrontPasswordMailer $mailer
    ) {}

    public function invite(Client $client): User
    {
        $email = trim((string) ($client->email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Client sans email valide.');
        }

        $existing = User::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first();
        if ($existing) {
            if ($existing->client && (int) $existing->client->id !== (int) $client->id) {
                throw new \RuntimeException('Cet email est déjà lié à un autre fiche client.');
            }
            if ($client->user_id && (int) $client->user_id !== (int) $existing->id) {
                throw new \RuntimeException('Ce client est déjà lié à un autre compte.');
            }
            $client->user_id = $existing->id;
            $client->save();
            $this->linkService->linkOrCreateClientForUser($existing);
            $this->mailer->sendResetLinkForUser($existing);

            return $existing;
        }

        $user = User::create([
            'name'     => $client->name ?: 'Client',
            'email'    => $email,
            'phone'    => $client->phone_1,
            'password' => Hash::make(Str::random(40)),
            'role_id'  => 2,
        ]);

        $client->user_id = $user->id;
        $client->save();
        $this->linkService->linkOrCreateClientForUser($user);
        $this->mailer->sendResetLinkForUser($user);

        return $user;
    }
}
