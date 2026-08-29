<?php

/*
 * Environment values are edited through multiple deployment surfaces. A copied Markdown link
 * such as `[contact@protein.tn](mailto:contact@protein.tn)` used to reach Symfony unchanged and
 * made every mail fail RFC validation before the transport was even called. Accept the address
 * portion defensively, while rejecting anything that still is not an actual mailbox.
 */
$emailAddress = static function (mixed $value, string $fallback = ''): string {
    $candidate = trim((string) $value);
    if (preg_match('/mailto:([^\s)>]+)/i', $candidate, $match)) {
        $candidate = trim($match[1], " <>[]()\t\n\r\0\x0B");
    }

    return filter_var($candidate, FILTER_VALIDATE_EMAIL) ? $candidate : $fallback;
};

$requestedMailer = strtolower(trim((string) env('MAIL_MAILER', 'log')));
$smtpHost = trim((string) env('MAIL_HOST', ''));
$smtpUsername = $emailAddress(env('MAIL_USERNAME'));
$smtpPassword = trim((string) env('MAIL_PASSWORD', ''));
$smtpReady = $smtpHost !== ''
    && ! in_array(strtolower($smtpHost), ['127.0.0.1', 'localhost', 'mailpit', 'example.com'], true)
    && $smtpUsername !== ''
    && $smtpPassword !== '';

// The VPS retained the authenticated SMTP credentials that successfully delivered mail before
// MAIL_MAILER was changed to local sendmail. A local MTA accepting a message only proves queueing;
// Gmail may still reject it later because this VPS has no trusted outbound-mail reputation. Prefer
// authenticated SMTP whenever its complete configuration is present, while keeping array/log in
// tests explicit and untouched.
$defaultMailer = $smtpReady && in_array($requestedMailer, ['sendmail', 'log', 'failover'], true)
    ? 'smtp'
    : $requestedMailer;

$smtpIsGmail = str_contains(strtolower($smtpHost), 'gmail');
$fromAddress = $defaultMailer === 'sendmail'
    ? 'contact@protein.tn'
    : ($smtpIsGmail && $smtpUsername !== ''
        ? $smtpUsername
        : $emailAddress(env('MAIL_FROM_ADDRESS'), $smtpUsername ?: 'contact@protein.tn'));
$fromName = $defaultMailer === 'sendmail' ? 'Protein.tn' : env('MAIL_FROM_NAME', 'Protein.tn');
$replyToAddress = $defaultMailer === 'sendmail'
    ? 'contact@protein.tn'
    : $emailAddress(env('MAIL_REPLY_TO'), $fromAddress);
$adminEmails = array_values(array_unique(array_filter(array_map(
    static fn (string $value): string => $emailAddress($value),
    array_map('trim', explode(',', (string) env('ADMIN_EMAILS', 'contact@protein.tn')))
))));

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

    'default' => $defaultMailer,

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
            'host' => $smtpHost !== '' ? $smtpHost : '127.0.0.1',
            'port' => (int) env('MAIL_PORT', 2525),
            'encryption' => env('MAIL_ENCRYPTION'),
            'username' => $smtpUsername ?: null,
            'password' => $smtpPassword !== '' ? $smtpPassword : null,
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
                'sendmail',
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
        'address' => $fromAddress,
        'name'    => $fromName,
    ],

    /*
    |--------------------------------------------------------------------------
    | Reply-To (support / contact - helps deliverability)
    |--------------------------------------------------------------------------
    */
    'reply_to' => [
        'address' => $replyToAddress,
        'name' => $defaultMailer === 'sendmail'
            ? 'Protein.tn'
            : env('MAIL_REPLY_TO_NAME', env('MAIL_FROM_NAME', 'Protein.TN')),
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

    'admin_emails' => $adminEmails,

    // Safe diagnostic flag: confirms all three SMTP values exist without exposing the password.
    'smtp_ready' => $smtpReady,

];
