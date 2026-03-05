<?php

use App\Enums\InvoiceStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('facture_tvas')) {
            return;
        }

        // Backfill existing invoices: treat any draft or null status as "issued" (validated)
        DB::table('facture_tvas')
            ->whereNull('status')
            ->orWhere('status', InvoiceStatus::Draft->value)
            ->update(['status' => InvoiceStatus::Issued->value]);
    }

    public function down(): void
    {
        // No data rollback to avoid corrupting real-world invoice history.
        // If needed, statuses can be adjusted manually.
    }
};

