<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Post-delivery review-request emails
    |--------------------------------------------------------------------------
    | Master kill-switch for the automatic "leave a review" email that fires
    | once when an order is marked delivered (etat = livree). Set
    | REVIEW_REQUEST_EMAILS_ENABLED=false in .env to pause it without a deploy.
    */
    'request_emails_enabled' => (bool) env('REVIEW_REQUEST_EMAILS_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | AI review moderation (Groq LLM)
    |--------------------------------------------------------------------------
    | The star-gate alone auto-publishes every 4–5★ review and holds 1–3★. That
    | lets a spammy / fake / abusive 5★ go live automatically — the exact thing
    | that risks a Google rich-result (review-snippet) penalty. This layer vets
    | every new review with the LLM (falling back to rule checks when no AI key
    | is present) so only GENUINE reviews stay published.
    */
    'moderation' => [
        // Master switch. When on AND a Groq key is present, each new review is
        // vetted by the LLM. With no key it silently falls back to rule checks
        // (links / contact-info detection) — still safe, just less nuanced.
        'enabled' => (bool) env('REVIEW_AI_MODERATION_ENABLED', true),

        // When a PUBLISHED review is judged spam / fake / abusive / off-topic /
        // contact-harvesting, immediately unpublish it (publier -> 0) and flag the
        // admin. This is the protection that stops a bad 5★ from sitting live.
        'demote_bad' => (bool) env('REVIEW_AI_DEMOTE_BAD', true),

        // When a HELD (1–3★) review is judged genuine + on-topic, also publish it
        // automatically. Default OFF: genuine negatives are surfaced to the admin
        // as "recommend publish" but a human keeps the final say. NOTE: never
        // silently suppress genuine negative reviews — that is review-gating and
        // itself violates consumer-protection / platform rules.
        'auto_publish_genuine' => (bool) env('REVIEW_AI_AUTOPUBLISH_GENUINE', false),
    ],
];
