<?php

return [
    'points' => (int) env('WELCOME_BONUS_POINTS', 300),
    'unlock_on_first_delivery' => (bool) env('WELCOME_BONUS_UNLOCK_ON_DELIVERY', true),
    'unique_delivery_phone' => (bool) env('WELCOME_BONUS_UNIQUE_DELIVERY_PHONE', true),
    'enabled' => (bool) env('WELCOME_BONUS_ENABLED', true),
    // Owner-approved 2026-09-03: existing customers also qualify on phone proof.
    'include_existing_customers' => (bool) env('WELCOME_BONUS_INCLUDE_EXISTING', true),
    // Operational spending ceiling, separate from per-user / phone / IP protections.
    'daily_sms_limit' => (int) env('PHONE_OTP_DAILY_SMS_LIMIT', 100),
];
