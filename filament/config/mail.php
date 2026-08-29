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
$smtpIsGmail = str_contains(strtolower($smtpHost), 'gmail');
$smtpUsername = $emailAddress(env('MAIL_USERNAME'));
$rawSmtpPassword = trim((string) env('MAIL_PASSWORD', ''));
// Google displays 16-character app passwords in four groups. Those visual spaces are not part of
// the credential, but copying the displayed value into .env preserves them and Gmail answers 535.
$smtpPassword = $smtpIsGmail
    ? (preg_replace('/\s+/', '', $rawSmtpPassword) ?? '')
    : $rawSmtpPassword;
$smtpReady = $smtpHost !== ''
    && ! in_array(strtolower($smtpHost), ['127.0.0.1', 'localhost', 'mailpit', 'example.com'], true)
    && $smtpUsername !== ''
    && $smtpPassword !== '';

$awsAccessKey = trim((string) env('AWS_ACCESS_KEY_ID', ''));
$awsSecretKey = trim((string) env('AWS_SECRET_ACCESS_KEY', ''));
$awsRegion = trim((string) env('AWS_DEFAULT_REGION', 'us-east-1')) ?: 'us-east-1';
$sesSmtpReady = $awsAccessKey !== '' && $awsSecretKey !== '';
$sesSmtpPassword = null;
if ($sesSmtpReady) {
    // AWS SES SMTP credentials use the IAM access-key id as username and a deterministic
    // Signature-v4 conversion of the secret access key as password.
    $dateKey = hash_hmac('sha256', '11111111', 'AWS4'.$awsSecretKey, true);
    $regionKey = hash_hmac('sha256', $awsRegion, $dateKey, true);
    $serviceKey = hash_hmac('sha256', 'ses', $regionKey, true);
    $terminalKey = hash_hmac('sha256', 'aws4_request', $serviceKey, true);
    $signature = hash_hmac('sha256', 'SendRawEmail', $terminalKey, true);
    $sesSmtpPassword = base64_encode(chr(0x04).$signature);
}

// Presence is not validity. The retained Gmail app password is structurally complete but the live
// SMTP probe can still reject it (535). Honour the explicit deployment choice so a stale credential
// cannot silently override the local transport and make every queued job exhaust its retries.
$defaultMailer = $requestedMailer;

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
            'timeout' => 15,
            'auth_mode' => null,
        ],

        'ses-smtp' => [
            'transport' => 'smtp',
            'host' => 'email-smtp.'.$awsRegion.'.amazonaws.com',
            'port' => 587,
            'encryption' => 'tls',
            'username' => $sesSmtpReady ? $awsAccessKey : null,
            'password' => $sesSmtpPassword,
            'timeout' => 15,
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
    'ses_smtp_ready' => $sesSmtpReady,

];
