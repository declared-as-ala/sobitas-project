<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyCardBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LoyaltyPrintController extends Controller
{
    private const DEFAULT_CARDS_PER_PAGE = 8;

    public function single(LoyaltyCard $card): \Illuminate\View\View
    {
        $card->load(['client', 'batch']);
        $this->markCardsAsPrinted(collect([$card]));

        return $this->renderCardView(collect([$card]), null, request());
    }

    public function batch(LoyaltyCardBatch $batch): \Illuminate\View\View
    {
        $cards = $batch->cards()->with('client')->orderBy('card_number')->get();
        $this->markCardsAsPrinted($cards);

        return $this->renderCardView($cards, $batch, request());
    }

    public function selected(Request $request): \Illuminate\View\View
    {
        $cards = $this->cardsFromIds($request);
        $this->markCardsAsPrinted($cards);

        return $this->renderCardView($cards, null, $request);
    }

    public function singlePdf(LoyaltyCard $card): Response
    {
        $card->load(['client', 'batch']);

        return $this->downloadPdf(
            cards: collect([$card]),
            batch: $card->batch,
            filenamePrefix: 'carte-fidelite-' . $card->card_number,
            request: request(),
        );
    }

    public function batchPdf(LoyaltyCardBatch $batch): Response
    {
        $cards = $batch->cards()->with('client')->orderBy('card_number')->get();

        return $this->downloadPdf(
            cards: $cards,
            batch: $batch,
            filenamePrefix: 'lot-cartes-fidelite-' . ($batch->name ? Str::slug($batch->name) : $batch->id),
            request: request(),
        );
    }

    public function selectedPdf(Request $request): Response
    {
        $cards = $this->cardsFromIds($request);

        return $this->downloadPdf(
            cards: $cards,
            batch: null,
            filenamePrefix: 'cartes-fidelite-selection',
            request: $request,
        );
    }

    public function exportCsv(LoyaltyCardBatch $batch): StreamedResponse
    {
        $filename = 'loyalty-cards-' . ($batch->name ? Str::slug($batch->name) : $batch->id) . '.csv';

        return response()->streamDownload(function () use ($batch) {
            $out = fopen('php://output', 'w');

            fputcsv($out, ['card_number', 'qr_token', 'barcode_value', 'batch_name', 'print_status']);

            foreach ($batch->cards()->orderBy('card_number')->cursor() as $card) {
                fputcsv($out, [
                    $card->card_number,
                    $card->qr_token,
                    $card->qr_token,
                    $batch->name ?: "Lot #{$batch->id}",
                    $card->print_status ?? 'not_printed',
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function renderCardView(Collection $cards, ?LoyaltyCardBatch $batch, Request $request): \Illuminate\View\View
    {
        return view('print.loyalty-card', [
            'cards' => $cards->values(),
            'batch' => $batch,
            'cardsPerPage' => $this->cardsPerPage($request),
            'sideMode' => $this->sideMode($request),
            'logoDataUri' => $this->logoDataUri(),
            'isPdf' => false,
        ]);
    }

    private function downloadPdf(Collection $cards, ?LoyaltyCardBatch $batch, string $filenamePrefix, Request $request): Response
    {
        $this->markCardsAsExported($cards);
        $sideMode = $this->sideMode($request);

        $pdf = Pdf::loadView('print.loyalty-card', [
            'cards' => $cards->values(),
            'batch' => $batch,
            'cardsPerPage' => $this->cardsPerPage($request),
            'sideMode' => $sideMode,
            'logoDataUri' => $this->logoDataUri(),
            'isPdf' => true,
        ])->setPaper('a4', 'portrait');

        $suffix = match ($sideMode) {
            'front' => '-front',
            'back' => '-back',
            default => '',
        };

        return $pdf->download($filenamePrefix . $suffix . '.pdf');
    }

    private function cardsFromIds(Request $request): Collection
    {
        $ids = collect(explode(',', (string) $request->string('ids')))
            ->map(fn (string $id): int => (int) trim($id))
            ->filter(fn (int $id): bool => $id > 0)
            ->values();

        abort_if($ids->isEmpty(), 422, 'Aucune carte sélectionnée.');

        $cards = LoyaltyCard::query()
            ->whereIn('id', $ids->all())
            ->with(['client', 'batch'])
            ->orderBy('card_number')
            ->get();

        abort_if($cards->isEmpty(), 404, 'Cartes introuvables.');

        return $cards;
    }

    private function cardsPerPage(Request $request): int
    {
        $value = (int) $request->integer('per_page', self::DEFAULT_CARDS_PER_PAGE);

        return max(1, min(12, $value));
    }

    private function sideMode(Request $request): string
    {
        $mode = strtolower((string) $request->query('side', 'both'));

        return in_array($mode, ['both', 'front', 'back'], true) ? $mode : 'both';
    }

    private function markCardsAsExported(Collection $cards): void
    {
        $ids = $cards->pluck('id')->filter()->values()->all();
        if ($ids === []) {
            return;
        }

        LoyaltyCard::query()
            ->whereIn('id', $ids)
            ->update([
                'print_status' => 'exported',
                'exported_at' => now(),
            ]);
    }

    private function markCardsAsPrinted(Collection $cards): void
    {
        $ids = $cards->pluck('id')->filter()->values()->all();
        if ($ids === []) {
            return;
        }

        LoyaltyCard::query()
            ->whereIn('id', $ids)
            ->update([
                'print_status' => 'printed',
                'printed_at' => now(),
            ]);
    }

    private function logoDataUri(): ?string
    {
        $logoPath = public_path('logo.png');
        if (!is_file($logoPath)) {
            return null;
        }

        $data = @file_get_contents($logoPath);
        if ($data === false) {
            return null;
        }

        return 'data:image/png;base64,' . base64_encode($data);
    }
}
