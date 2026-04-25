<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LoyaltyArtisanCommandsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
    }

    public function test_backfill_client_cards_dry_run_runs(): void
    {
        if (! Schema::hasTable('clients')) {
            $this->markTestSkipped();
        }

        $this->artisan('loyalty:backfill-client-cards', ['--dry-run' => true])
            ->assertSuccessful();
    }

    public function test_cleanup_user_loyalty_runs(): void
    {
        $this->artisan('loyalty:cleanup-user-loyalty', ['--migrate-matched' => true])
            ->assertSuccessful();
    }
}
