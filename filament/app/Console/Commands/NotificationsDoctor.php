<?php

namespace App\Console\Commands;

use App\Mail\OrderConfirmedCustomerMail;
use App\Models\Commande;
use App\Models\Message;
use App\Services\SmsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * ── DOES A CUSTOMER ACTUALLY GET THE EMAIL AND THE SMS? ─────────────────────────────────────
 * Owner, 20/08/2026: *"check when a user passes a command if he gets the emails or not, if he
 * gets sms or not."*
 *
 * That question cannot be answered by reading the code, because every failure mode on this path
 * is SILENT: the SMS gateway's response was discarded, the mail send is wrapped in a catch that
 * logs and returns 201 anyway, and both are configured by values that live on the server. So the
 * answer is a command the owner can run ON the server, against a real order:
 *
 *     php artisan notifications:doctor                      # configuration only, sends nothing
 *     php artisan notifications:doctor --order=1234         # + what that order WOULD send
 *     php artisan notifications:doctor --order=1234 --send-email=moi@exemple.tn
 *     php artisan notifications:doctor --order=1234 --send-sms=+21627612500
 *
 * Nothing is sent unless an address or a number is passed explicitly, and it goes to the address
 * given on the command line — never to the customer on the order. Re-notifying a real customer
 * about an order they placed weeks ago is not a diagnostic, it is a complaint.
 */
class NotificationsDoctor extends Command
{
    protected $signature = 'notifications:doctor
                            {--order= : An order id or numero to render the real messages for}
                            {--send-email= : Send the customer confirmation to THIS address}
                            {--send-sms= : Send the confirmation SMS to THIS number}
                            {--recent=0 : Show this many recent orders/users and notification table health}
                            {--probe-sms : Verify WinSMS credentials and balance without sending}
                            {--strict : Return a failure code when production notification configuration is incomplete}';

    protected $description = 'Report how order emails and SMS are configured, and optionally send a test';

    public function handle(): int
    {
        $strict = (bool) $this->option('strict');
        $issues = [];
        $this->line('');
        $this->components->info('E-MAIL');

        $mailer = (string) config('mail.default');
        $host   = (string) config("mail.mailers.{$mailer}.host", '—');
        $user   = (string) config("mail.mailers.{$mailer}.username", '');
        $from   = (string) config('mail.from.address', '');
        $admins = (array) config('mail.admin_emails', []);

        $this->table(['Réglage', 'Valeur'], [
            ['mailer', $mailer],
            ['host', $host . ':' . config("mail.mailers.{$mailer}.port", '—')],
            ['username', $this->mask($user)],
            ['from', $from . ' (' . config('mail.from.name') . ')'],
            ['admin_emails', $admins ? implode(', ', $admins) : '(aucun)'],
            ['queue', config('queue.default')],
        ]);

        if ($mailer !== 'smtp') {
            $issues[] = "MAIL_MAILER={$mailer} (smtp attendu en production)";
        }
        foreach ([
            'MAIL_HOST' => $host,
            'MAIL_USERNAME' => $user,
            'MAIL_FROM_ADDRESS' => $from,
        ] as $key => $value) {
            if (trim($value) === '' || str_ends_with(strtolower($value), '@example.com')) {
                $issues[] = "{$key} est vide ou utilise une valeur d’exemple";
            }
        }
        if ((string) config("mail.mailers.{$mailer}.password", '') === '') {
            $issues[] = 'MAIL_PASSWORD est vide';
        }
        if ($admins === []) {
            $issues[] = 'ADMIN_EMAILS est vide';
        }

        /*
         * The two things most likely to be wrong on this install, stated plainly rather than left
         * for the reader to notice in a table.
         */
        if (str_ends_with(strtolower($from), '@gmail.com')) {
            $this->warn('  From est une adresse Gmail personnelle. Les clients reçoivent leur');
            $this->warn('  confirmation de commande depuis « ' . $from .' » et non depuis');
            $this->warn('  contact@protein.tn — ce qui ressemble à une arnaque côté client, et');
            $this->warn('  plafonne les envois à la limite quotidienne d’un compte Gmail gratuit.');
        }
        if ($admins && str_ends_with(strtolower((string) ($admins[0] ?? '')), '@gmail.com')) {
            $this->warn('  ADMIN_EMAILS pointe vers un Gmail personnel : les notifications de');
            $this->warn('  commande de la boutique n’arrivent pas sur une adresse de la société.');
        }

        $this->line('');
        $this->components->info('SMS (WinSMS Pro)');

        $apiKey   = (string) config('services.sms.api_key', '');
        $senderId = (string) config('services.sms.sender_id', '');

        $this->table(['Réglage', 'Valeur'], [
            ['api_key', $apiKey !== '' ? $this->mask($apiKey) : '(NON CONFIGURÉ — aucun SMS ne part)'],
            ['sender_id', $senderId !== '' ? $senderId : '(NON CONFIGURÉ — aucun SMS ne part)'],
        ]);

        if ($apiKey === '' || $senderId === '') {
            $issues[] = 'SMS_API_KEY ou SMS_SENDER_ID est vide';
            $this->error('  SMS_API_KEY ou SMS_SENDER_ID manquant : SmsService s’arrête avant');
            $this->error('  l’appel et écrit un warning dans le log. Aucun client ne reçoit de SMS.');
        }

        if ($this->option('probe-sms') && $apiKey !== '' && $senderId !== '') {
            try {
                $probe = app(SmsService::class)->probe();
                $balance = $probe['balance'] ?? null;
                $this->components->info(
                    'Passerelle WinSMS joignable et authentifiée'
                    . ($balance !== null ? " · solde: {$balance}" : '')
                );
            } catch (\Throwable $e) {
                $issues[] = 'La sonde WinSMS a échoué';
                $this->error('  Sonde WinSMS ÉCHOUÉE : '.$e->getMessage());
            }
        }

        $template = optional(Message::getCached())->msg_passez_commande;
        $this->line('  Modèle admin « msg_passez_commande » : ' . (trim((string) $template) !== '' ? 'défini' : 'vide (le texte par défaut du code est utilisé)'));

        $recent = max(0, min(25, (int) $this->option('recent')));
        if ($recent > 0) {
            $this->renderCommerceHealth($recent);
        }

        // ── The real messages for a real order ────────────────────────────────────────────
        $orderRef = $this->option('order');
        if (! $orderRef) {
            $this->line('');
            $this->line('  Passez --order=<id|numero> pour voir les messages réels d’une commande.');

            if ($strict && $issues !== []) {
                $this->line('');
                foreach ($issues as $issue) {
                    $this->error('  ' . $issue);
                }

                return self::FAILURE;
            }

            return self::SUCCESS;
        }

        $order = Commande::query()
            ->where('id', $orderRef)
            ->orWhere('numero', $orderRef)
            ->with('details.product:id,designation_fr')
            ->first();

        if (! $order) {
            $this->error("Commande « {$orderRef} » introuvable.");

            return self::FAILURE;
        }

        $this->line('');
        $this->components->info('COMMANDE ' . ($order->numero ?? $order->id));
        $this->table(['Champ', 'Valeur'], [
            ['etat', $order->etat],
            ['email client', $order->email ?: ($order->livraison_email ?: '(aucun — aucun e-mail ne partira)')],
            ['téléphone', $order->phone ?: ($order->livraison_phone ?: '(aucun — aucun SMS ne partira)')],
            ['order_token', $order->order_token ? 'présent' : 'ABSENT (pas de lien avis possible)'],
            ['delivered_at', $order->delivered_at ?: '—'],
            ['review_request_sent_at', $order->review_request_sent_at ?: '—'],
        ]);

        // What the SMS would look like, AFTER the GSM-7 pass — including the segment count, which
        // is what the invoice from WinSMS is actually counting.
        $sms = $this->previewSms($order);
        $this->line('');
        $this->components->info('SMS QUI SERAIT ENVOYÉ');
        $this->line($sms);
        $this->line('');
        $this->line(sprintf(
            '  %d caractères · %d segment(s) facturé(s)',
            mb_strlen($sms),
            max(1, (int) ceil(mb_strlen($sms) / 160))
        ));

        if ($to = $this->option('send-email')) {
            try {
                Mail::to($to)->send(new OrderConfirmedCustomerMail($order));
                $this->components->info("E-mail de test envoyé à {$to}.");
            } catch (\Throwable $e) {
                $this->error('Envoi e-mail ÉCHOUÉ : ' . $e->getMessage());

                return self::FAILURE;
            }
        }

        if ($number = $this->option('send-sms')) {
            try {
                (new SmsService())->send_sms($number, $sms);
                $this->components->info("SMS de test envoyé à {$number} (voir le log pour la réponse de la passerelle).");
            } catch (\Throwable $e) {
                $this->error('Envoi SMS ÉCHOUÉ : ' . $e->getMessage());

                return self::FAILURE;
            }
        }

        if ($strict && $issues !== []) {
            foreach ($issues as $issue) {
                $this->error('  ' . $issue);
            }

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function previewSms(Commande $order): string
    {
        $nom      = trim((string) ($order->nom ?: $order->livraison_nom ?: ''));
        $numero   = (string) ($order->numero ?? '');
        $total    = number_format((float) ($order->prix_ttc ?? 0), 3, '.', ' ');
        $products = $order->details->take(3)->map(fn ($d) => $d->product->designation_fr ?? 'Produit')->implode(', ');
        $more     = $order->details->count() > 3 ? ' (+' . ($order->details->count() - 3) . ')' : '';

        $template = trim((string) (optional(Message::getCached())->msg_passez_commande ?? ''));
        if ($template !== '') {
            $sms = str_replace(
                ['[nom]', '[prenom]', '[num_commande]', '[etat]', '[produits]', '[total]'],
                [$nom, (string) ($order->prenom ?? ''), $numero, Commande::getStatusLabel((string) $order->etat), $products . $more, $total],
                $template
            );
        } else {
            $greeting = $nom !== '' ? "Bonjour {$nom}" : 'Bonjour';
            $sms = "{$greeting}, votre commande #{$numero} est confirmée.\n"
                . "Produits: {$products}{$more}\n"
                . "Total: {$total} TND. Paiement à la livraison.\n"
                . 'Nous vous appelons pour confirmer. Protein.tn';
        }

        return SmsService::toGsm7($sms);
    }

    private function renderCommerceHealth(int $limit): void
    {
        $this->line('');
        $this->components->info('COMMERCE / BASE DE DONNÉES (lecture seule)');

        $this->table(['Vérification', 'État'], [
            ['commandes.checkout_idempotency_key', \Illuminate\Support\Facades\Schema::hasColumn('commandes', 'checkout_idempotency_key') ? 'présente' : 'ABSENTE'],
            ['notification_deliveries', \Illuminate\Support\Facades\Schema::hasTable('notification_deliveries') ? 'présente' : 'ABSENTE'],
            ['email_verification_otps', \Illuminate\Support\Facades\Schema::hasTable('email_verification_otps') ? 'présente' : 'ABSENTE'],
            ['users.phone_verified_at', \Illuminate\Support\Facades\Schema::hasColumn('users', 'phone_verified_at') ? 'présente' : 'ABSENTE'],
            ['failed_jobs', \Illuminate\Support\Facades\Schema::hasTable('failed_jobs') ? (string) \Illuminate\Support\Facades\DB::table('failed_jobs')->count() : 'table absente'],
        ]);

        $orders = Commande::query()
            ->latest('id')
            ->limit($limit)
            ->get(['id', 'numero', 'etat', 'prix_ttc', 'email', 'livraison_email', 'created_at']);

        $this->line('');
        $this->line("  {$orders->count()} commande(s) la/les plus récente(s) :");
        $this->table(['id', 'numero', 'etat', 'total', 'email?', 'créée'], $orders->map(fn (Commande $order): array => [
            $order->id,
            $order->numero ?: '—',
            $order->etat ?: '—',
            number_format((float) $order->prix_ttc, 3, '.', ' '),
            filter_var($order->livraison_email ?: $order->email, FILTER_VALIDATE_EMAIL) ? 'oui' : 'non',
            optional($order->created_at)->toDateTimeString() ?: '—',
        ])->all());

        $users = \App\Models\User::query()
            ->latest('id')
            ->limit($limit)
            ->get(['id', 'role_id', 'email_verified_at', 'created_at']);

        $this->line('');
        $this->line("  {$users->count()} utilisateur(s) le(s) plus récent(s) :");
        $this->table(['id', 'role', 'email vérifié?', 'créé'], $users->map(fn (\App\Models\User $user): array => [
            $user->id,
            $user->role_id,
            $user->email_verified_at ? 'oui' : 'non',
            optional($user->created_at)->toDateTimeString() ?: '—',
        ])->all());
    }

    private function mask(string $value): string
    {
        if ($value === '') {
            return '(vide)';
        }

        return mb_strlen($value) <= 6
            ? str_repeat('•', mb_strlen($value))
            : mb_substr($value, 0, 3) . str_repeat('•', 6) . mb_substr($value, -3);
    }
}
