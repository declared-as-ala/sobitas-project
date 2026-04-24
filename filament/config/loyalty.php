<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Points earning rate
    |--------------------------------------------------------------------------
    | points_per_currency: points earned per 1 DT spent (default: 1)
    */
    'points_per_currency' => env('LOYALTY_POINTS_PER_CURRENCY', 1),

    /*
    |--------------------------------------------------------------------------
    | Points redemption rate
    |--------------------------------------------------------------------------
    | points_per_dt: how many points = 1 DT discount (default: 10)
    */
    'points_per_dt' => env('LOYALTY_POINTS_PER_DT', 10),

    /*
    |--------------------------------------------------------------------------
    | Minimum points to redeem
    |--------------------------------------------------------------------------
    */
    'min_points_to_redeem' => env('LOYALTY_MIN_REDEEM', 100),

    /*
    |--------------------------------------------------------------------------
    | Maximum discount from points as % of order total
    |--------------------------------------------------------------------------
    | e.g. 0.50 = max 50% of the order can be paid with points
    */
    'max_discount_percent' => env('LOYALTY_MAX_DISCOUNT_PCT', 0.50),

    /*
    |--------------------------------------------------------------------------
    | Whether points are earned on discounted orders
    |--------------------------------------------------------------------------
    | true = earn points on subtotal AFTER coupon discount
    | false = do not earn when a coupon was applied
    */
    'earn_on_discounted_orders' => env('LOYALTY_EARN_ON_DISCOUNTED', true),

    /*
    |--------------------------------------------------------------------------
    | Whether delivery fee counts toward points
    |--------------------------------------------------------------------------
    */
    'earn_on_delivery_fee' => env('LOYALTY_EARN_ON_DELIVERY', false),

    /*
    |--------------------------------------------------------------------------
    | Order statuses that trigger earning points
    |--------------------------------------------------------------------------
    */
    'earn_trigger_statuses' => ['expidee'],

    /*
    |--------------------------------------------------------------------------
    | Order statuses that trigger reversal of points
    |--------------------------------------------------------------------------
    */
    'reversal_trigger_statuses' => ['annuler'],
];
