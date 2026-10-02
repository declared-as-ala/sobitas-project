<?php

return [
    'points' => (int) env('WELCOME_BONUS_POINTS', 300),
    // v3 launch value: the gift is credited at phone verification (as gift Protinas, budget-bounded).
    'unlock_on_first_delivery' => (bool) env('WELCOME_BONUS_UNLOCK_ON_DELIVERY', false),
    // v3 meaning: checked when the gift is USED — gift Protinas do not apply when the delivery phone
    // belongs to another account's welcome claim. Off: money-safe anyway because of the order budget.
    'unique_delivery_phone' => (bool) env('WELCOME_BONUS_UNIQUE_DELIVERY_PHONE', false),
    'enabled' => (bool) env('WELCOME_BONUS_ENABLED', true),
    // Owner-approved 2026-09-03: existing customers also qualify on phone proof.
    'include_existing_customers' => (bool) env('WELCOME_BONUS_INCLUDE_EXISTING', true),
    // Operational spending ceiling, separate from per-user / phone / IP protections.
    'daily_sms_limit' => (int) env('PHONE_OTP_DAILY_SMS_LIMIT', 100),
];
