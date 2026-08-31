<?php

use App\Services\TransactionalSmsText;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('messages')) {
            return;
        }

        $copy = [];
        if (Schema::hasColumn('messages', 'msg_passez_commande')) {
            $copy['msg_passez_commande'] = TransactionalSmsText::DEFAULT_CONFIRMATION;
        }
        if (Schema::hasColumn('messages', 'msg_etat_commande')) {
            $copy['msg_etat_commande'] = TransactionalSmsText::DEFAULT_STATUS;
        }

        if ($copy !== []) {
            DB::table('messages')->update($copy);
            Cache::forget('message:template');
        }
    }

    public function down(): void
    {
        // Deliberately preserve operator-facing copy on rollback. Replacing it with an
        // unknown historical value would be more destructive than keeping the new text.
    }
};
