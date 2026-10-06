{{--
    DEVIS — browser print (routes/web.php quotations.print), PDF download
    (DocumentPdfController::downloadQuotation) and the e-mailed PDF (QuotationSent).

    Layout: the bon de livraison's classic form, shared with the invoice through
    print/partials/classic-document. This file only PREPARES the data; every amount is the one the
    previous design printed — DevisCalculator lines, InvoiceCalculator totals, the same remise /
    coupon / order rows under the same conditions.
--}}
@php
    /* ── Context ──────────────────────────────────────────────── */
    $coordonnee = $coordonnee ?? $company ?? null;
    $isPdf      = ! empty($forPdf);

    /* ── TVA config ───────────────────────────────────────────── */
    $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;

    /* ── Totals (use pre-computed or recalculate) ─────────────── */
    if (! isset($calcTotals) && isset($facture, $details_facture)) {
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            collect($details_facture)->map(function ($d) use ($defaultTva) {
                return [
                    'produit_id'    => $d->produit_id ?? null,
                    'qte'           => (int) ($d->qte ?? $d->quantite ?? 1),
                    'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
                    'tva_pct'       => (float) ($d->tva ?? $defaultTva),
                ];
            })->toArray(),
            (float) ($facture->remise ?? 0),
            (float) ($facture->timbre ?? 0),
            $defaultTva
        );
    }

    $ct               = $calcTotals ?? [];
    $totalHtBrut      = (float) ($ct['total_ht_brut'] ?? $facture->prix_ht ?? 0);
    $totalRemise      = (float) ($ct['remise'] ?? $facture->remise ?? 0);
    $couponDiscountHt = (float) ($facture->discount_ht ?? 0);
    $manualRemise     = max(0.0, round($totalRemise - $couponDiscountHt, 3));
    $couponCode       = $facture->coupon_code_snapshot ?? null;
    $sourceOrder      = $facture->commande ?? null;
    $orderPack        = (float) ($sourceOrder?->pack_discount_ht ?? 0);
    $orderCoupon      = (float) ($sourceOrder?->discount_ht ?? 0);
    $orderPoints      = (float) ($sourceOrder?->points_discount_ht ?? 0);
    $orderDiscount    = $orderPack + $orderCoupon + $orderPoints;
    // Protinas v3: delivery paid with Protinas — shown for the record, it nets to 0 here.
    $shipPaidProtinas = $sourceOrder instanceof \App\Models\Commande
        ? \App\Support\OrderCashOnDelivery::shippingPaidWithProtinasDt($sourceOrder) : 0.0;
    $baseImp     = round($totalHtBrut - $totalRemise, 3);
    $totalTva    = (float) ($ct['tva'] ?? $facture->tva ?? 0);
    $totalTimbre = (float) ($ct['timbre'] ?? $facture->timbre ?? 0);
    $netAPayer   = (float) ($ct['net_a_payer'] ?? $facture->prix_ttc ?? $facture->net_a_payer ?? 0);
    $totalTtc    = isset($ct['prix_ttc']) ? (float) $ct['prix_ttc'] : round($netAPayer - $totalTimbre, 3);

    /* ── Date ─────────────────────────────────────────────────── */
    $dateStr = $documentDate
        ?? ($facture->date_quotation
            ? \Carbon\Carbon::parse($facture->date_quotation)->format('d/m/Y')
            : ($facture->created_at?->format('d/m/Y') ?? ''));

    /* ── Rows ─────────────────────────────────────────────────── */
    $rows = [];

    /* Path 1: pre-built $devis_lines (passed by the route and the PDF controller) */
    $devisLineList = is_array($devis_lines ?? null) ? $devis_lines : [];
    $i = 0;
    foreach ($devisLineList as $line) {
        $d = $line['detail'] ?? null;
        if (! $d) {
            continue;
        }
        $i++;
        $qte         = (int) ($d->qte ?? $d->quantite ?? 0);
        $pu_ht       = (float) ($d->prix_unitaire ?? 0);
        $tva_pct     = (float) ($line['line_tva_pct'] ?? $defaultTva);
        $total_ht    = (float) ($line['line_total_ht'] ?? round($pu_ht * $qte, 3));
        $montant_tva = round($total_ht * $tva_pct / 100, 3);
        $rows[] = [
            'n'           => $i,
            'produit'     => $d->product->designation_fr ?? '—',
            'qte'         => $qte,
            'pu_ht'       => $pu_ht,
            'tva'         => $tva_pct,
            'pu_ttc'      => round($pu_ht * (1 + $tva_pct / 100), 3),
            'total_ht'    => $total_ht,
            'montant_tva' => $montant_tva,
            'total_ttc'   => round($total_ht + $montant_tva, 3),
        ];
    }

    /* Path 2: fallback $details_facture */
    if (empty($rows) && isset($details_facture)) {
        $i = 0;
        foreach ($details_facture as $d) {
            $i++;
            $qte         = (int) ($d->qte ?? $d->quantite ?? 0);
            $pu_ht       = (float) ($d->prix_unitaire ?? 0);
            $tva_pct     = (float) ($d->tva ?? $defaultTva);
            $total_ht    = round($pu_ht * $qte, 3);
            $montant_tva = round($total_ht * $tva_pct / 100, 3);
            $rows[] = [
                'n'           => $i,
                'produit'     => $d->product->designation_fr ?? '—',
                'qte'         => $qte,
                'pu_ht'       => $pu_ht,
                'tva'         => $tva_pct,
                'pu_ttc'      => round($pu_ht * (1 + $tva_pct / 100), 3),
                'total_ht'    => $total_ht,
                'montant_tva' => $montant_tva,
                'total_ttc'   => round($total_ht + $montant_tva, 3),
            ];
        }
    }

    $taxBuckets = \App\Support\PrintTaxRecap::buckets($rows, $totalHtBrut, $totalRemise, $totalTva);
    $singleRate = count($taxBuckets) <= 1;
    $rateLabel  = $singleRate && $taxBuckets !== [] ? array_key_first($taxBuckets) : $defaultTva;
    $rateLabel  = ((float) $rateLabel == floor((float) $rateLabel)) ? (int) $rateLabel : (float) $rateLabel;

    /* ── Totals table (same rows, same conditions as before) ──── */
    $pct = fn (float $part): float => $sourceOrder && $sourceOrder->prix_ht > 0 ? $part / $sourceOrder->prix_ht * 100 : 0.0;
    $totals = [['label' => 'Total H.T.', 'value' => $totalHtBrut]];
    if ($sourceOrder && $orderDiscount > 0) {
        if ($orderPack > 0) {
            $totals[] = ['label' => 'Remise pack ('.round($pct($orderPack), 1).' %)', 'value' => $orderPack, 'sign' => '-'];
        }
        if ($sourceOrder->coupon_code_snapshot) {
            $totals[] = ['label' => 'Code promo '.$sourceOrder->coupon_code_snapshot, 'value' => $orderCoupon, 'sign' => '-'];
        }
        if ($orderPoints > 0) {
            $totals[] = ['label' => 'Protinas ('.\App\Support\OrderCashOnDelivery::goodsProtinasPoints($sourceOrder).' pts)', 'value' => $orderPoints, 'sign' => '-'];
        }
        $totals[] = ['label' => 'Total remises ('.round($pct($orderDiscount), 2).' % des articles)', 'value' => $orderDiscount];
    }
    if ($shipPaidProtinas > 0) {
        $totals[] = ['label' => 'Livraison', 'value' => $shipPaidProtinas];
        $totals[] = ['label' => 'Réglée en Protinas', 'value' => $shipPaidProtinas, 'sign' => '-'];
    }
    if ($manualRemise > 0 && ! $sourceOrder) {
        $totals[] = ['label' => 'Remise', 'value' => $manualRemise, 'sign' => '-'];
    }
    if ($couponDiscountHt > 0 && ! $sourceOrder) {
        $totals[] = ['label' => 'Code promo'.($couponCode ? ' ('.$couponCode.')' : ''), 'value' => $couponDiscountHt, 'sign' => '-'];
    }
    if ($totalRemise > 0) {
        $totals[] = ['label' => 'Net H.T. (base imposable)', 'value' => $baseImp];
    }
    $totals[] = ['label' => $singleRate ? 'T.V.A ('.$rateLabel.' %)' : 'Total T.V.A', 'value' => $totalTva];
    if ($totalTimbre > 0) {
        $totals[] = ['label' => 'Total T.T.C.', 'value' => $totalTtc];
        $totals[] = ['label' => 'Timbre fiscal', 'value' => $totalTimbre];
    }
    $totals[] = ['label' => 'Net à payer', 'value' => $netAPayer, 'grand' => true];

    /* ── Client ───────────────────────────────────────────────── */
    $printClient = $client ?? $facture->client ?? null;
    $cPhones = array_values(array_filter([$printClient?->phone_1, $printClient?->phone_2]));

    $doc = [
        'kind'     => 'devis',
        'title'    => 'Devis',
        'numero'   => $facture->numero ?? '',
        'subtitle' => 'Ce devis n’est pas une facture',
        'date'     => $dateStr,
        'isPdf'    => $isPdf,
        'backUrl'  => $backUrl ?? null,
        'company'  => $coordonnee,
        'logoUrl'  => \App\Support\PrintLogo::sobitas($coordonnee ?? null),
        'client'   => [
            'code'    => $printClient?->code ?? $printClient?->id,
            'name'    => $printClient?->name,
            'address' => $printClient?->adresse,
            'mf'      => $printClient?->matricule,
            'ville'   => $printClient?->ville,
            'phones'  => implode(' / ', $cPhones),
            'email'   => $printClient?->email,
        ],
        'payHead'  => 'Conditions : '.($paymentTerms ?? 'Valable 30 jours. Paiement à la commande ou à la livraison.'),
        'remarks'  => [
            $noteDevis ?? $coordonnee->note_devis ?? null,
        ],
        'rows'       => $rows,
        'taxBuckets' => $taxBuckets,
        'totals'     => $totals,
        'noteLead'   => 'Arrêté le présent devis à la somme de :',
        'words'      => \App\Support\AmountInWords::fr($netAPayer),
        'extraNotes' => [],
        'signLeft'     => 'Bon pour accord',
        'signLeftNote' => '(date, cachet et signature du client)',
        'signRight'    => 'Signature et Cachet',
    ];
@endphp
@include('print.partials.classic-document', ['doc' => $doc])
