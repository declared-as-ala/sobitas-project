<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send any email
    | messages sent by your application. Alternative mailers may be setup
    | and used as needed; however, this mailer will be used by default.
    |
    */

    'default' => 'smtp',

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Hardcoded to match backend .env so Filament campaign emails use the same
    | SMTP as order emails (no dependency on Filament container env).
    |
    | ── THE DEFAULTS BELOW ARE A LIVE CREDENTIAL, IN GIT ───────────────────────
    | The values were literals with no env() around them, so the SMTP username
    | and a Google App Password are committed to this repository and readable by
    | anyone with clone access. Two things follow, and neither is a code change:
    |
    |   1. THAT APP PASSWORD MUST BE ROTATED. Revoke it in the Google account's
    |      app-password list and issue a new one. Everything below reads from the
    |      environment now, so the new value goes in .env and never in a commit.
    |
    |   2. THE FROM ADDRESS IS A PERSONAL GMAIL. Every order confirmation this
    |      shop sends arrives from « bitoutawalid@gmail.com », not from
    |      contact@protein.tn. To a customer who has just paid nothing yet and is
    |      waiting for a delivery, that reads as a scam; it also caps the shop at
    |      a free Gmail account's daily send limit and puts the shop's entire
    |      transactional mail reputation on one personal mailbox.
    |
    | The literals are KEPT as the env() fallback on purpose: nothing changes on
    | deploy until the variables are set, so this is safe to ship today and the
    | migration to a proper mailbox is a .env edit rather than a release.
    |
    | Set in filament/.env:  MAIL_HOST, MAIL_PORT, MAIL_ENCRYPTION,
    |                        MAIL_USERNAME, MAIL_PASSWORD,
    |                        MAIL_FROM_ADDRESS=contact@protein.tn,
    |                        ADMIN_EMAILS=contact@protein.tn
    */

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'host' => env('MAIL_HOST', 'smtp.gmail.com'),
            'port' => (int) env('MAIL_PORT', 587),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
            'username' => env('MAIL_USERNAME', 'bitoutawalid@gmail.com'),
            'password' => env('MAIL_PASSWORD', 'xwpfxykujdlorutz'),
            'timeout' => null,
            'auth_mode' => null,
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'mailgun' => [
            'transport' => 'mailgun',
        ],

        'postmark' => [
            'transport' => 'postmark',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -t -i'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    | For better deliverability (Inbox vs Promotions): use an address on your
    | domain (e.g. no-reply@protein.tn) and configure SPF, DKIM, DMARC for
    | that domain. Reply-To can be your support address.
    |
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'bitoutawalid@gmail.com'),
        'name'    => env('MAIL_FROM_NAME', 'Protein.tn'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Reply-To (support / contact - helps deliverability)
    |--------------------------------------------------------------------------
    */
    'reply_to' => [
        'address' => env('MAIL_REPLY_TO', env('MAIL_FROM_ADDRESS', 'contact@protein.tn')),
        'name' => env('MAIL_REPLY_TO_NAME', env('MAIL_FROM_NAME', 'Protein.TN')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Markdown Mail Settings
    |--------------------------------------------------------------------------
    |
    | If you are using Markdown based email rendering, you may configure your
    | theme and component paths here, allowing you to customize the design
    | of the emails. Or, you may simply stick with the Laravel defaults!
    |
    */

    'markdown' => [
        'theme' => 'default',

        'paths' => [
            resource_path('views/vendor/mail'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Emails (order notifications)
    |--------------------------------------------------------------------------
    |
    | Comma-separated list of emails that receive new order notifications.
    | Set ADMIN_EMAILS in .env, e.g. admin@protein.tn,other@protein.tn
    |
    */

    'admin_emails' => array_filter(array_map('trim', explode(',', env('ADMIN_EMAILS', 'bitoutawalid@gmail.com')))),

];
