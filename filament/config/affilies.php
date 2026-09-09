<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Filament role_id for affilie users (must match `users.role_id`)
    |--------------------------------------------------------------------------
    */
    // Reads the legacy PARTNER_ROLE_ID as a fallback: the production .env predates the rename and
    // still carries the old key. Without this, a restored server would silently fall back to 4.
    'affilie_role_id' => (int) env('AFFILIE_ROLE_ID', env('PARTNER_ROLE_ID', 4)),

    /*
    |--------------------------------------------------------------------------
    | Admin roles allowed on `admin` Filament panel (see User::canAccessPanel)
    |--------------------------------------------------------------------------
    */
    'admin_role_ids' => [1, 3],

    /*
    |--------------------------------------------------------------------------
    | Order commission — the money model
    |--------------------------------------------------------------------------
    | These settings are read by AffilieTransactionService and by
    | affilies:prepare-payout-batch. They live HERE, in the one affiliate config
    | file, rather than in a second `affilie_commission.php`. Splitting the
    | module's settings across two files is how `delivered_codes` ends up
    | defined twice with different values.
    */
    'commission' => [

        /*
         * THE COMMISSION BASE. What the affiliate is paid a percentage OF.
         *
         * Shipping is excluded, and that is not a rounding preference. `frais_livraison` is
         * money the shop collects and hands straight to Aramex; it is a cost passed through,
         * not revenue. Commission on it is commission paid out of the shop's own pocket on
         * every single order, forever.
         *
         * Set to true only if the owner decides delivery fees are margin.
         */
        'include_shipping' => (bool) env('AFFILIE_COMMISSION_INCLUDE_SHIPPING', false),

        /*
         * Orders below this TTC total earn no commission. 0 disables the floor.
         * Exists because a manual-entry reseller model makes tiny orders cheap to fabricate.
         */
        'min_order_ttc' => (float) env('AFFILIE_COMMISSION_MIN_ORDER_TTC', 0),
    ],

    /*
    |--------------------------------------------------------------------------
    | Return fee — charged to the affiliate when a dispatched parcel comes back
    |--------------------------------------------------------------------------
    | The courier is paid for the outbound leg whether or not the customer
    | accepts the parcel. In a manual-order-entry reseller model that cost has
    | to land on whoever entered the order, or "enter every phone number you
    | know" becomes a free lottery ticket.
    |
    | Per-affiliate override lives in `affilies.return_fee_override` (nullable
    | decimal). NULL means "use the default below"; 0.0 means "this affiliate is
    | explicitly exempt" and is honoured as a real value, not treated as unset.
    */
    'return_fee' => [

        'enabled' => (bool) env('AFFILIE_RETURN_FEE_ENABLED', true),

        /** Default fee in TND. The owner specified 10 DT. */
        'amount' => (float) env('AFFILIE_RETURN_FEE_AMOUNT', 10.0),

        /*
         * Hard ceiling, as a safety rail rather than a business rule. Nothing should ever
         * produce a four-figure return fee; if a bad override or a future bug does, this is
         * what stops it reaching the ledger.
         */
        'max_amount' => (float) env('AFFILIE_RETURN_FEE_MAX', 100.0),
    ],

    /*
    |--------------------------------------------------------------------------
    | Friday payout batch
    |--------------------------------------------------------------------------
    | The scheduled command PREPARES batches. It never pays. See
    | app/Console/Commands/PrepareAffiliePayoutBatch.php for why.
    */
    'payout' => [

        /** Batches below this amount are not prepared — not worth a bank transfer. */
        'min_batch_amount' => (float) env('AFFILIE_PAYOUT_MIN_BATCH', 20.0),

        /*
         * THE SECOND COD GATE.
         *
         * Commission is EARNED on delivery and PAYABLE only once Aramex has remitted the cash
         * for that specific order (`commandes.cod_remitted_at`). With this true, an order whose
         * money the courier still holds is excluded from the batch.
         *
         * Turning it off pays affiliates out of the shop's working capital on the strength of a
         * courier scan. It exists as a switch only so the owner can make that call knowingly —
         * it is not a tuning parameter.
         */
        /*
         * OWNER'S DECISION: pay every Friday, full stop. Default therefore FALSE.
         *
         * Left at true, the batch waits for someone to mark each order "encaissé (COD)" against an
         * Aramex settlement report. Nobody had agreed to do that, so the run would have selected
         * zero payable commissions every week, exited 0, and looked exactly like a quiet week —
         * the silent-no-op failure this project has been bitten by before.
         *
         * The trade the owner accepted, stated plainly: commission is paid on DELIVERY, and in a
         * cash-on-delivery business delivery means the courier holds the money, not you. Between
         * Friday and Aramex's remittance the shop is fronting the affiliates' margin out of its own
         * cash. That is a working-capital cost, not a loss — the money does arrive — and it is
         * bounded by one week of affiliate sales.
         *
         * Flip this to true (AFFILIE_PAYOUT_REQUIRE_COD_REMITTANCE=1) if that float ever becomes
         * uncomfortable. The gate and its admin action are built and tested; only the default
         * changed. Nothing else needs touching.
         */
        'require_cod_remittance' => (bool) env('AFFILIE_PAYOUT_REQUIRE_COD_REMITTANCE', false),
    ],
];
