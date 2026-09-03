<?php

return [
    'enabled' => (bool) env('WELCOME_BONUS_ENABLED', true),
    // Operational spending ceiling, separate from per-user / phone / IP protections.
    'daily_sms_limit' => (int) env('PHONE_OTP_DAILY_SMS_LIMIT', 100),
];
