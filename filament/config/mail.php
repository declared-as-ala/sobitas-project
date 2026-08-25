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

    'default' => env('MAIL_MAILER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | SMTP credentials come only from the runtime environment. Keeping the
    | default mailer configurable also ensures test and staging environments can
    | use the array or log drivers without ever touching production SMTP.
    */

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => (int) env('MAIL_PORT', 2525),
            'encryption' => env('MAIL_ENCRYPTION'),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
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
        'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
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

    'admin_emails' => array_values(array_filter(array_map('trim', explode(',', env('ADMIN_EMAILS', ''))))),

];
