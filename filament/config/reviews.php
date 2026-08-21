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
    | How long to wait after delivery before asking
    |--------------------------------------------------------------------------
    | The request used to fire the instant an admin flipped the order to "livree",
    | which asks someone to review a protein they have not opened yet. Owner asked
    | for a couple of days' grace. 3 is the default: long enough to have tried the
    | product, short enough that the order is still fresh in mind.
    |
    | Set to 0 to restore the old send-on-delivery behaviour — at 0 the observer
    | sends inline and the daily sweep has nothing left to do, so the behaviour is
    | identical to before this setting existed.
    |
    | NOTE: at any value above 0 the send happens in `reviews:send-due-requests`,
    | which means the SCHEDULER CONTAINER IS LOAD-BEARING. If it is not running, no
    | review requests go out at all. seo:health-check is what catches that.
    */
    'request_delay_days' => (int) env('REVIEW_REQUEST_DELAY_DAYS', 3),

    /*
    | Upper bound for the daily sweep. An order delivered longer ago than this is
    | left to the manual `reviews:backfill-requests` command instead, so turning the
    | sweep on can never quietly email the entire back catalogue.
    */
    'request_max_age_days' => (int) env('REVIEW_REQUEST_MAX_AGE_DAYS', 21),

    /* Hard cap on how many requests one sweep may send. Keeps sends looking like
    | ordinary transactional traffic rather than a blast. */
    'request_daily_limit' => (int) env('REVIEW_REQUEST_DAILY_LIMIT', 40),

    /*
    |--------------------------------------------------------------------------
    | The same request, by SMS
    |--------------------------------------------------------------------------
    | OFF by default, and that default is a decision rather than caution.
    |
    | Every customer of this shop gives a phone number — it is how orders are
    | confirmed — and far fewer of them read email than read a text. So an SMS
    | review request will convert better than the email, and it also COSTS money
    | per send, on a WinSMS balance the owner tops up.
    |
    | It is one segment per order, not two: the link uses the short `review_code`
    | (10 characters) rather than the 64-character order_token, which is the whole
    | reason that column exists. Turn it on with:
    |
    |     REVIEW_REQUEST_SMS_ENABLED=true
    |
    | and it rides along with the same daily sweep, the same cap, the same
    | once-per-order marker. Nothing else needs changing.
    */
    'request_sms_enabled' => (bool) env('REVIEW_REQUEST_SMS_ENABLED', false),

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

    /*
    |--------------------------------------------------------------------------
    | Replies — the thread under a review
    |--------------------------------------------------------------------------
    */
    'replies' => [
        // Master switch for accepting new replies at all. Turning this off leaves every existing
        // thread readable and stops new messages — the setting you want during a spam wave, and
        // the one you want instead of deleting the feature.
        'enabled' => (bool) env('REVIEW_REPLIES_ENABLED', true),

        // A reply the moderator clears goes live without a human.
        //
        // DEFAULT ON, and the opposite of `auto_publish_genuine` above, which is off. The two are
        // asymmetric on purpose: a review carries a STAR RATING that moves a product's
        // aggregateRating and its structured data, so a human keeps the final say. A reply carries
        // no rating and can move nothing. Holding every reply for manual approval would mean a
        // customer asking "est-ce que ça se prend avant l'entraînement ?" waits until somebody
        // opens the panel — which, in practice, means the thread is dead and the feature is
        // decorative.
        'auto_publish_clean' => (bool) env('REVIEW_REPLIES_AUTOPUBLISH', true),

        // Per-author ceiling inside the rate-limit window, checked on top of the route throttle.
        // The route limit is per IP; this one is per identity, and it is what stops one signed-in
        // account from carpeting a popular product's thread from a phone and a laptop at once.
        'max_per_hour' => (int) env('REVIEW_REPLIES_MAX_PER_HOUR', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | Reviews from visitors with no account
    |--------------------------------------------------------------------------
    | A guest review can NEVER be attested — `Review::scopeAttested` requires
    | `verified = 1` or a `commande_id`, and a guest submission has neither by
    | construction. So these are readable on the page and INVISIBLE to the star
    | rating and to the JSON-LD. That is not a limitation to work around; it is
    | the property that makes accepting them safe at all.
    */
    'guest' => [
        'enabled' => (bool) env('REVIEW_GUEST_ENABLED', true),

        // Guest reviews are held until the moderator clears them, and unlike replies there is no
        // switch to skip that. A star rating from an unauthenticated stranger is the single
        // easiest thing on this site to abuse, and the legacy backlog — 203 published reviews with
        // no purchase behind any of them, which had to be unpublished wholesale — is what that
        // abuse looks like after the fact.
        'max_per_hour' => (int) env('REVIEW_GUEST_MAX_PER_HOUR', 3),
    ],
];
