<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Commandes: add client_id FK (nullable) so orders can be linked to clients
        if (Schema::hasTable('commandes') && ! Schema::hasColumn('commandes', 'client_id')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->unsignedInteger('client_id')->nullable()->after('user_id');
                $table->foreign('client_id')->references('id')->on('clients')->nullOnDelete();
                $table->index('client_id', 'idx_commandes_client');
            });
        }

        // Clients: region/ville for delivery (gouvernorat/ville)
        if (Schema::hasTable('clients')) {
            Schema::table('clients', function (Blueprint $table) {
                if (! Schema::hasColumn('clients', 'region')) {
                    $table->string('region', 255)->nullable()->after('adresse');
                }
                if (! Schema::hasColumn('clients', 'ville')) {
                    $table->string('ville', 255)->nullable()->after('region');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('commandes') && Schema::hasColumn('commandes', 'client_id')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->dropForeign(['client_id']);
                $table->dropIndex('idx_commandes_client');
                $table->dropColumn('client_id');
            });
        }
        if (Schema::hasTable('clients')) {
            Schema::table('clients', function (Blueprint $table) {
                if (Schema::hasColumn('clients', 'region')) {
                    $table->dropColumn('region');
                }
                if (Schema::hasColumn('clients', 'ville')) {
                    $table->dropColumn('ville');
                }
            });
        }
    }
};
