<?php

namespace App\Services;

use App\Models\NumberSequence;
use Illuminate\Support\Facades\Schema;

class NumberSequenceService
{
    /**
     * Get next number in format PREFIX-YYYY-NNNN (e.g. BL-2026-0001).
     * Uses number_sequences table when present; otherwise fallback from model counts.
     */
    public function getNext(string $prefix): string
    {
        $year = (int) date('Y');
        $num = Schema::hasTable('number_sequences')
            ? NumberSequence::getNextFor($prefix, $year)
            : $this->fallbackNext($prefix, $year);

        return sprintf('%s-%s-%s', $prefix, $year, str_pad((string) $num, 4, '0', STR_PAD_LEFT));
    }

    /**
     * Fallback when number_sequences table does not exist.
     */
    protected function fallbackNext(string $prefix, int $year): int
    {
        $count = match (strtoupper($prefix)) {
            'FA' => \App\Models\FactureTva::whereYear('created_at', $year)->count(),
            'BL' => \App\Models\Facture::whereYear('created_at', $year)->count(),
            'DV' => \App\Models\Quotation::whereYear('created_at', $year)->count(),
            'AV' => \App\Models\CreditNote::whereYear('created_at', $year)->count(),
            default => 0,
        };

        return $count + 1;
    }

    public function nextDevis(): string
    {
        return $this->getNext('DV');
    }

    public function nextBl(): string
    {
        return $this->getNext('BL');
    }

    public function nextFacture(): string
    {
        return $this->getNext('FA');
    }

    public function nextAvoir(): string
    {
        return $this->getNext('AV');
    }
}
