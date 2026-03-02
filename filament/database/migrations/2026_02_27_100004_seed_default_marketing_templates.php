<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Email templates are now defined in code (DefaultEmailTemplates). Skip seeding
     * to avoid schema mismatches with existing marketing_templates tables.
     */
    public function up(): void
    {
        // No-op: default email templates are in App\Services\DefaultEmailTemplates
    }

    public function down(): void
    {
        //
    }
};
