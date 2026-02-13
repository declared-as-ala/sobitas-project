<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Chart controller for admin statistics.
 * LaravelCharts dependency is kept for backward compatibility.
 */
class AdminChartController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    /**
     * Show statistics page with default chart.
     */
    public function statistic()
    {
        $chart1 = null; // Placeholder - Filament will provide charts

        return view('admin.index', compact('chart1'));
    }

    /**
     * Generate chart based on request parameters.
     */
    public function chart(Request $request)
    {
        $request->validate([
            'dropdown1' => 'required|string',
            'date1' => 'required|date',
            'date2' => 'required|date',
            'chart' => 'required|string',
        ]);

        // For now, return dashboard with null chart - Filament will handle charts
        $chart1 = null;

        return view('admin.index', compact('chart1'));
    }
}
