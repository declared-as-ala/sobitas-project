<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    |--------------------------------------------------------------------------
    | SMS Service (WinSMS Pro)
    |--------------------------------------------------------------------------
    |
    | Migrated from backend/.env: SMS_API_KEY and SMS_SENDER_ID
    |
    */
    'sms' => [
        'api_key'   => env('SMS_API_KEY'),
        'sender_id' => env('SMS_SENDER_ID'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Frontend (Next.js storefront) — SEO automation
    |--------------------------------------------------------------------------
    | Used by App\Services\Seo\SeoNotifier to trigger on-demand ISR revalidation
    | + IndexNow when a product/review changes. Calls go over the INTERNAL docker
    | network (sobitas-frontend:3000) so they bypass Cloudflare. Committed defaults
    | keep it turnkey; set the matching env vars to override (rotate secret / host).
    */
    'frontend' => [
        'internal_url'      => env('FRONTEND_INTERNAL_URL', 'http://sobitas-frontend:3000'),
        'public_url'        => rtrim(env('FRONTEND_URL', 'https://protein.tn'), '/'),
        'revalidate_secret' => env('REVALIDATE_SECRET', 'c3f8316bd2ab7f577f093d1ac33005e3c561060921578c0c'),
    ],

];
