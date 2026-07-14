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
];
