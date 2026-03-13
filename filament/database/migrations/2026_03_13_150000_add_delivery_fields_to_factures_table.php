<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            // Billing info
            $table->string('nom')->nullable();
            $table->string('prenom')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('adresse1')->nullable();
            $table->string('adresse2')->nullable();
            $table->string('ville')->nullable();
            $table->string('region')->nullable();
            $table->string('code_postale')->nullable();

            // Shipping info
            $table->string('livraison_nom')->nullable();
            $table->string('livraison_prenom')->nullable();
            $table->string('livraison_email')->nullable();
            $table->string('livraison_phone')->nullable();
            $table->string('livraison_adresse1')->nullable();
            $table->string('livraison_adresse2')->nullable();
            $table->string('livraison_ville')->nullable();
            $table->string('livraison_region')->nullable();
            $table->string('livraison_code_postale')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->dropColumn([
                'nom', 'prenom', 'email', 'phone', 'adresse1', 'adresse2', 'ville', 'region', 'code_postale',
                'livraison_nom', 'livraison_prenom', 'livraison_email', 'livraison_phone', 
                'livraison_adresse1', 'livraison_adresse2', 'livraison_ville', 'livraison_region', 'livraison_code_postale'
            ]);
        });
    }
};
