<?php

namespace App\Services;

use Carbon\Carbon;

class DateRangeFilterService
{
    /**
     * Parse filter preset and return date range with comparison period.
     *
     * @param string $preset Options: 'today', '7d', '30d', 'mtd', 'ytd', 'custom'
     * @param Carbon|null $customStart For custom preset
     * @param Carbon|null $customEnd For custom preset
     * @return array ['start' => Carbon, 'end' => Carbon, 'prev_start' => Carbon, 'prev_end' => Carbon, 'label' => string]
     */
    public static function getPeriod(string $preset, ?Carbon $customStart = null, ?Carbon $customEnd = null): array
    {
        $now = Carbon::now();

        return match ($preset) {
            'today' => self::getTodayPeriod($now),
            '7d' => self::getLastNDaysPeriod($now, 7),
            '30d' => self::getLastNDaysPeriod($now, 30),
            'mtd' => self::getMonthToDatePeriod($now),
            'ytd' => self::getYearToDatePeriod($now),
            'custom' => self::getCustomPeriod($customStart, $customEnd),
            default => self::getLastNDaysPeriod($now, 30), // Default to 30 days
        };
    }

    /**
     * Today vs Yesterday.
     */
    private static function getTodayPeriod(Carbon $now): array
    {
        $start = $now->copy()->startOfDay();
        $end = $now->copy()->endOfDay();
        $prevStart = $now->copy()->subDay()->startOfDay();
        $prevEnd = $now->copy()->subDay()->endOfDay();

        return [
            'start' => $start,
            'end' => $end,
            'prev_start' => $prevStart,
            'prev_end' => $prevEnd,
            'label' => "Aujourd'hui",
            'days' => 1,
        ];
    }

    /**
     * Last N days vs previous N days.
     */
    private static function getLastNDaysPeriod(Carbon $now, int $days): array
    {
        $start = $now->copy()->subDays($days - 1)->startOfDay();
        $end = $now->copy()->endOfDay();
        $prevStart = $now->copy()->subDays(($days * 2) - 1)->startOfDay();
        $prevEnd = $now->copy()->subDays($days)->endOfDay();

        return [
            'start' => $start,
            'end' => $end,
            'prev_start' => $prevStart,
            'prev_end' => $prevEnd,
            'label' => "{$days} derniers jours",
            'days' => $days,
        ];
    }

    /**
     * Month-to-date vs same period last month.
     */
    private static function getMonthToDatePeriod(Carbon $now): array
    {
        $start = $now->copy()->startOfMonth();
        $end = $now->copy()->endOfDay();
        $daysElapsed = $now->day;

        // Previous period: same number of days in previous month
        $prevStart = $now->copy()->subMonth()->startOfMonth();
        $prevEnd = $prevStart->copy()->addDays($daysElapsed - 1)->endOfDay();

        return [
            'start' => $start,
            'end' => $end,
            'prev_start' => $prevStart,
            'prev_end' => $prevEnd,
            'label' => 'Mois en cours',
            'days' => $daysElapsed,
        ];
    }

    /**
     * Year-to-date vs same period last year.
     */
    private static function getYearToDatePeriod(Carbon $now): array
    {
        $start = $now->copy()->startOfYear();
        $end = $now->copy()->endOfDay();
        $daysElapsed = $now->dayOfYear;

        // Previous period: same number of days last year
        $prevStart = $now->copy()->subYear()->startOfYear();
        $prevEnd = $prevStart->copy()->addDays($daysElapsed - 1)->endOfDay();

        return [
            'start' => $start,
            'end' => $end,
            'prev_start' => $prevStart,
            'prev_end' => $prevEnd,
            'label' => 'Année en cours',
            'days' => $daysElapsed,
        ];
    }

    /**
     * Custom range vs equivalent previous period.
     */
    private static function getCustomPeriod(?Carbon $customStart, ?Carbon $customEnd): array
    {
        if (! $customStart || ! $customEnd) {
            // Fallback to last 30 days if missing
            return self::getLastNDaysPeriod(Carbon::now(), 30);
        }

        $start = $customStart->copy()->startOfDay();
        $end = $customEnd->copy()->endOfDay();
        $days = $start->diffInDays($end) + 1;

        // Previous period: same duration before start
        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->subDays($days - 1)->startOfDay();

        return [
            'start' => $start,
            'end' => $end,
            'prev_start' => $prevStart,
            'prev_end' => $prevEnd,
            'label' => $start->format('d/m/Y') . ' - ' . $end->format('d/m/Y'),
            'days' => $days,
        ];
    }

    /**
     * Calculate percentage change between current and previous value.
     */
    public static function calculateChange(float $current, float $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Format percentage for display with sign.
     */
    public static function formatPercentage(float $percentage): string
    {
        $sign = $percentage >= 0 ? '+' : '';

        return $sign . number_format($percentage, 1) . '%';
    }

    /**
     * Get available filter presets for dropdown.
     */
    public static function getPresets(): array
    {
        return [
            'today' => "Aujourd'hui",
            '7d' => '7 derniers jours',
            '30d' => '30 derniers jours',
            'mtd' => 'Mois en cours',
            'ytd' => 'Année en cours',
            'custom' => 'Période personnalisée',
        ];
    }
}
