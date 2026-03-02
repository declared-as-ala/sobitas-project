<?php

namespace Tests\Feature;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Tests\TestCase;

class DateRangeFilterServiceTest extends TestCase
{
    /** @test */
    public function it_calculates_last_7_days_period()
    {
        Carbon::setTestNow(Carbon::create(2026, 2, 10, 12));

        $period = DateRangeFilterService::getPeriod('7d');

        $this->assertEquals('2026-02-04', $period['start']->format('Y-m-d'));
        $this->assertEquals('2026-02-10', $period['end']->format('Y-m-d'));
        $this->assertEquals('2026-01-28', $period['prev_start']->format('Y-m-d'));
        $this->assertEquals('2026-02-03', $period['prev_end']->format('Y-m-d'));
        $this->assertEquals(7, $period['days']);
    }

    /** @test */
    public function it_calculates_last_30_days_period()
    {
        Carbon::setTestNow(Carbon::create(2026, 2, 10, 12));

        $period = DateRangeFilterService::getPeriod('30d');

        $this->assertEquals('2026-01-12', $period['start']->format('Y-m-d'));
        $this->assertEquals('2026-02-10', $period['end']->format('Y-m-d'));
        $this->assertEquals('2025-12-13', $period['prev_start']->format('Y-m-d'));
        $this->assertEquals('2026-01-11', $period['prev_end']->format('Y-m-d'));
    }

    /** @test */
    public function it_calculates_month_to_date_period()
    {
        Carbon::setTestNow(Carbon::create(2026, 2, 10, 12));

        $period = DateRangeFilterService::getPeriod('mtd');

        $this->assertEquals('2026-02-01', $period['start']->format('Y-m-d'));
        $this->assertEquals('2026-02-10', $period['end']->format('Y-m-d'));
        $this->assertEquals('2026-01-01', $period['prev_start']->format('Y-m-d'));
        $this->assertEquals('2026-01-10', $period['prev_end']->format('Y-m-d'));
        $this->assertEquals(10, $period['days']);
    }

    /** @test */
    public function it_calculates_today_period()
    {
        Carbon::setTestNow(Carbon::create(2026, 2, 10, 15));

        $period = DateRangeFilterService::getPeriod('today');

        $this->assertEquals('2026-02-10', $period['start']->format('Y-m-d'));
        $this->assertEquals('2026-02-10', $period['end']->format('Y-m-d'));
        $this->assertEquals('2026-02-09', $period['prev_start']->format('Y-m-d'));
        $this->assertEquals('2026-02-09', $period['prev_end']->format('Y-m-d'));
        $this->assertEquals(1, $period['days']);
    }

    /** @test */
    public function it_calculates_custom_period()
    {
        $start = Carbon::create(2026, 2, 1);
        $end = Carbon::create(2026, 2, 5);

        $period = DateRangeFilterService::getPeriod('custom', $start, $end);

        $this->assertEquals('2026-02-01', $period['start']->format('Y-m-d'));
        $this->assertEquals('2026-02-05', $period['end']->format('Y-m-d'));
        $this->assertEquals('2026-01-27', $period['prev_start']->format('Y-m-d'));
        $this->assertEquals('2026-01-31', $period['prev_end']->format('Y-m-d'));
        $this->assertEquals(5, $period['days']);
    }

    /** @test */
    public function it_calculates_percentage_change()
    {
        $change = DateRangeFilterService::calculateChange(150, 100);
        $this->assertEquals(50, $change); // 50% increase

        $change = DateRangeFilterService::calculateChange(75, 100);
        $this->assertEquals(-25, $change); // 25% decrease

        $change = DateRangeFilterService::calculateChange(100, 0);
        $this->assertEquals(100, $change); // Handle zero division
    }

    /** @test */
    public function it_formats_percentage_with_sign()
    {
        $formatted = DateRangeFilterService::formatPercentage(25.5);
        $this->assertEquals('+25.5%', $formatted);

        $formatted = DateRangeFilterService::formatPercentage(-12.3);
        $this->assertEquals('-12.3%', $formatted);

        $formatted = DateRangeFilterService::formatPercentage(0);
        $this->assertEquals('+0.0%', $formatted);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(); // Reset
        parent::tearDown();
    }
}
