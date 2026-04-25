<?php

namespace App\Http\Controllers;

use App\Models\LoyaltyCard;
use App\Models\LoyaltyCardBatch;
use App\Services\LoyaltyService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LoyaltyPrintController extends Controller
{
    public function single(LoyaltyCard $card): \Illuminate\View\View
    {
        $card->load(['client', 'batch']);

        return view('print.loyalty-card', [
            'cards' => collect([$card]),
        ]);
    }

    public function batch(LoyaltyCardBatch $batch): \Illuminate\View\View
    {
        $cards = $batch->cards()->with('client')->orderBy('card_number')->get();

        return view('print.loyalty-card', [
            'cards' => $cards,
            'batch' => $batch,
        ]);
    }

    public function exportCsv(LoyaltyCardBatch $batch, LoyaltyService $loyaltyService): StreamedResponse
    {
        $filename = 'loyalty-cards-' . ($batch->name ? \Str::slug($batch->name) : $batch->id) . '.csv';

        return response()->streamDownload(function () use ($batch, $loyaltyService) {
            $out = fopen('php://output', 'w');

            fputcsv($out, ['card_number', 'qr_token', 'status', 'client_name', 'client_phone', 'assigned_at', 'printed_at']);

            foreach ($loyaltyService->batchToCsvRows($batch) as $row) {
                fputcsv($out, $row);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
