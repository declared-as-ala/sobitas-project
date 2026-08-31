<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When Aramex says the parcel was handed over — which is not when we found out.
 *
 * ── WHY A COLUMN AND NOT JUST `aramex_status` ───────────────────────────────────────────────
 * The sweep used `aramex_status IN settled_codes` to decide it was finished with a shipment. That
 * works only while the delivery event is the LAST thing that happens to a parcel, and on this
 * account it is not: it is cash on delivery, so the COD payment posts after the courier hands the
 * parcel over. The newest code on a delivered parcel is `SH239 "Shipment charges paid"`, which is
 * not a settled code and must never be one — it is a payment.
 *
 * Without this column the sweep would promote an order correctly and then re-poll that same
 * waybill on every run for the rest of its life, paying Aramex for a request whose answer it has
 * already acted on.
 *
 * ── AND WHY IT HOLDS ARAMEX'S TIMESTAMP, NOT `now()` ────────────────────────────────────────
 * The first run after the delivery-code fix promotes a backlog months deep. Stamping it all as
 * "today" would tell the loyalty ledger and the review-request sweep that a hundred parcels
 * arrived this afternoon, and the review sweep measures its send window from exactly this kind of
 * timestamp. The real handover time is what Aramex returns on the delivery event, so that is what
 * gets stored.
 *
 * Nullable, because a shipment that has not been delivered has no delivery time, and because a BL
 * created before this migration has none either. `null` means "not delivered as far as we know",
 * which is the only honest value for both.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('factures') || Schema::hasColumn('factures', 'aramex_delivered_at')) {
            return;
        }

        Schema::table('factures', function (Blueprint $table) {
            // Indexed: the sweep's shipment query filters on `whereNull` here on every run, and it
            // runs hourly against a table that only grows.
            $table->timestamp('aramex_delivered_at')->nullable()->index()->after('aramex_status');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('factures') || ! Schema::hasColumn('factures', 'aramex_delivered_at')) {
            return;
        }

        Schema::table('factures', function (Blueprint $table) {
            $table->dropColumn('aramex_delivered_at');
        });
    }
};
