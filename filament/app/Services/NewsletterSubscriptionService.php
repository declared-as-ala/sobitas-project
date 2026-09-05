<?php

namespace App\Services;

use App\Mail\ConfirmNewsletterSubscriptionMail;
use App\Models\Newsletter;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class NewsletterSubscriptionService
{
    public function request(string $email, string $source = 'storefront'): array
    {
        $email = $this->normalize($email);
        $subscription = Newsletter::firstOrNew(['email' => $email]);

        if ($subscription->exists && $subscription->confirmed_at && ! $subscription->unsubscribed_at) {
            return ['status' => 'subscribed', 'subscription' => $subscription];
        }

        $token = Str::random(64);
        $subscription->forceFill([
            'source' => Str::limit($source, 32, ''),
            'confirmation_token_hash' => hash('sha256', $token),
            'confirmation_sent_at' => now(),
            'confirmed_at' => null,
            'unsubscribed_at' => null,
        ])->save();

        Mail::to($email)->queue(new ConfirmNewsletterSubscriptionMail(
            url('/newsletter/confirm?email='.urlencode($email).'&token='.urlencode($token))
        ));

        return ['status' => 'confirmation_sent', 'subscription' => $subscription];
    }

    public function subscribeVerified(string $email, string $source = 'account'): Newsletter
    {
        $email = $this->normalize($email);

        return Newsletter::updateOrCreate(['email' => $email], [
            'source' => Str::limit($source, 32, ''),
            'confirmed_at' => now(),
            'confirmation_token_hash' => null,
            'confirmation_sent_at' => null,
            'unsubscribed_at' => null,
        ]);
    }

    public function confirm(string $email, string $token): bool
    {
        $subscription = Newsletter::where('email', $this->normalize($email))->first();
        if (! $subscription || ! $subscription->confirmation_token_hash || ! $subscription->confirmation_sent_at) {
            return false;
        }

        if ($subscription->confirmation_sent_at->lt(now()->subHours(24))) {
            return false;
        }

        if (! hash_equals($subscription->confirmation_token_hash, hash('sha256', $token))) {
            return false;
        }

        $subscription->forceFill([
            'confirmed_at' => now(),
            'confirmation_token_hash' => null,
            'unsubscribed_at' => null,
        ])->save();

        return true;
    }

    public function unsubscribe(string $email): void
    {
        Newsletter::where('email', $this->normalize($email))->update([
            'unsubscribed_at' => now(),
            'confirmation_token_hash' => null,
        ]);
    }

    public function isSubscribed(string $email): bool
    {
        if (! Schema::hasTable('newsletters') || ! Schema::hasColumn('newsletters', 'confirmed_at')) {
            return false;
        }

        return Newsletter::subscribed()->where('email', $this->normalize($email))->exists();
    }

    public function status(string $email): string
    {
        if (! Schema::hasTable('newsletters') || ! Schema::hasColumn('newsletters', 'confirmed_at')) {
            return 'unsubscribed';
        }

        $subscription = Newsletter::where('email', $this->normalize($email))->first();
        if (! $subscription || $subscription->unsubscribed_at) {
            return 'unsubscribed';
        }

        return $subscription->confirmed_at ? 'subscribed' : 'pending';
    }

    private function normalize(string $email): string
    {
        return strtolower(trim($email));
    }
}
