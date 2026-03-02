<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Commande;
use App\Models\Product;
use App\Services\DashboardMetricsService;
use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardMetricsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Run migrations
        $this->artisan('migrate');
    }

    /** @test */
    public function it_calculates_gmv_correctly()
    {
        // Create test orders
        Commande::factory()->create([
            'etat' => 'expidee',
            'prix_ttc' => 1000,
            'created_at' => Carbon::now()->subDays(5),
        ]);

        Commande::factory()->create([
            'etat' => 'en_cours_de_preparation',
            'prix_ttc' => 500,
            'created_at' => Carbon::now()->subDays(3),
        ]);

        Commande::factory()->create([
            'etat' => 'annuler', // Should be excluded
            'prix_ttc' => 300,
            'created_at' => Carbon::now()->subDays(2),
        ]);

        $period = DateRangeFilterService::getPeriod('7d');
        $service = new DashboardMetricsService($period);

        $gmv = $service->getGMV(false);

        $this->assertEquals(1500, $gmv['current']); // 1000 + 500
    }

    /** @test */
    public function it_calculates_aov_correctly()
    {
        // Create orders with different values
        Commande::factory()->create([
            'etat' => 'expidee',
            'prix_ttc' => 100,
            'created_at' => Carbon::now()->subDays(2),
        ]);

        Commande::factory()->create([
            'etat' => 'en_cours_de_preparation',
            'prix_ttc' => 200,
            'created_at' => Carbon::now()->subDays(1),
        ]);

        $period = DateRangeFilterService::getPeriod('7d');
        $service = new DashboardMetricsService($period);

        $aov = $service->getAOV(false);

        // AOV should be (100 + 200) / 2 = 150
        $this->assertEquals(150, $aov['current']);

    }

    /** @test */
    public function it_calculates_cancellation_rate()
    {
        // Create 8 successful orders
        for ($i = 0; $i < 8; $i++) {
            Commande::factory()->create([
                'etat' => 'expidee',
                'created_at' => Carbon::now()->subDays(rand(1, 5)),
            ]);
        }

        // Create 2 cancelled orders
        for ($i = 0; $i < 2; $i++) {
            Commande::factory()->create([
                'etat' => 'annuler',
                'created_at' => Carbon::now()->subDays(rand(1, 5)),
            ]);
        }

        $period = DateRangeFilterService::getPeriod('7d');
        $service = new DashboardMetricsService($period);

        $rate = $service->getCancellationRate(false);

        // Rate should be 2/10 = 20%
        $this->assertEquals(20, $rate['current']);
    }

    /** @test */
    public function it_compares_periods_correctly()
    {
        // Current period orders
        Commande::factory()->create([
            'etat' => 'expidee',
            'prix_ttc' => 500,
            'created_at' => Carbon::now()->subDays(2),
        ]);

        // Previous period orders
        Commande::factory()->create([
            'etat' => 'expidee',
            'prix_ttc' => 400,
            'created_at' => Carbon::now()->subDays(9),
        ]);

        $period = DateRangeFilterService::getPeriod('7d');
        $service = new DashboardMetricsService($period);

        $gmv = $service->getGMV(true);

        $this->assertEquals(500, $gmv['current']);
        $this->assertEquals(400, $gmv['previous']);
        $this->assertEquals(25, $gmv['change']); // (500-400)/400 * 100 = 25%
    }

    /** @test */
    public function it_detects_revenue_anomaly()
    {
        // Create normal revenue for last 6 days (avg = 100)
        for ($i = 1; $i <= 6; $i++) {
            Commande::factory()->create([
                'etat' => 'expidee',
                'prix_ttc' => 100,
                'created_at' => Carbon::now()->subDays($i),
            ]);
        }

        // Today: very low revenue (should trigger alert)
        Commande::factory()->create([
            'etat' => 'expidee',
            'prix_ttc' => 30, // < 60% of average
            'created_at' => Carbon::now(),
        ]);

        $service = new DashboardMetricsService();
        $anomaly = $service->detectRevenueAnomaly();

        $this->assertNotNull($anomaly);
        $this->assertEquals('critical', $anomaly['severity']);
    }

    /** @test */
    public function it_handles_empty_data_gracefully()
    {
        $period = DateRangeFilterService::getPeriod('30d');
        $service = new DashboardMetricsService($period);

        $gmv = $service->getGMV(false);
        $aov = $service->getAOV(false);

        $this->assertEquals(0, $gmv['current']);
        $this->assertEquals(0, $aov['current']);
    }
}
