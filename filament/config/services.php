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
    | Sign in with Google
    |--------------------------------------------------------------------------
    | ONE variable, and it is the same string the storefront uses as
    | NEXT_PUBLIC_GOOGLE_CLIENT_ID. The client id is public by design — it is
    | baked into the page that renders the button — so there is no secret here
    | and nothing to rotate. What makes the flow safe is that the server checks
    | the ID token's SIGNATURE and its `aud` against this value before trusting
    | any claim in it (see ClientController::googleLogin).
    |
    | There is deliberately NO client SECRET: this is the browser ID-token flow,
    | not an OAuth code exchange, so no secret is ever needed on the server.
    |
    | Leave it unset and POST /api/auth/google answers 503 while the storefront
    | renders no button at all — the site works exactly as it does today.
    |
    | Google Cloud console → Credentials → OAuth 2.0 Client ID (Web application):
    |   Authorised JavaScript origins:  https://protein.tn , http://localhost:3000
    |   Authorised redirect URIs:       none — this flow never redirects.
    */
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
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

    /*
    |--------------------------------------------------------------------------
    | AI provider (Groq — OpenAI-compatible) for content moderation
    |--------------------------------------------------------------------------
    | Reuses the SAME GROQ_API_KEY the fitness-api already runs on (it is loaded
    | into this container via `env_file: .env` in docker-compose). No new vendor
    | and — as long as that key is in the VPS .env — no extra config to turn on.
    | Every consumer degrades gracefully: with no key, AI features simply no-op.
    */
    'ai' => [
        'groq_key'   => env('GROQ_API_KEY'),
        'groq_model' => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
        'timeout'    => (int) env('AI_TIMEOUT', 12),
    ],

];
