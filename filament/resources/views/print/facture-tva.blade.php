{{--
    FACTURE (TVA) — browser print (routes/web.php facture-tvas.print), PDF download
    (DocumentPdfController::downloadFactureTva) and the e-mailed PDF (FactureTvaSent).

    Layout: the bon de livraison's classic form, shared with the devis through
    print/partials/classic-document. This file only PREPARES the data; every amount is the one the
    previous design printed — InvoiceCalculator totals, the order pack / coupon / Protinas breakdown
    with its residual rule, the delivery paid with Protinas, the coupon / manual remise split.
--}}
@php
    /* ── Context ──────────────────────────────────────────────── */
    $coordonnee = $coordonnee ?? $company ?? null;
    $isPdf      = ! empty($forPdf);

    /* ── Totals (pre-computed by the caller, or recalculated the same way) ── */
    if (! isset($calcTotals) && isset($facture, $details_facture)) {
        $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $details_facture->toArray(),
            (float) ($facture->remise ?? 0),
            (float) ($facture->timbre ?? 0),
            $defaultTva
        );
    }
    $ct          = $calcTotals ?? [];
    $totalHtBrut = (float) ($ct['total_ht_brut'] ?? $facture->prix_ht ?? 0);
    $totalRemise = (float) ($ct['remise'] ?? $facture->remise ?? 0);

    /* Coupon breakdown: remise = manual_remise + coupon_discount_ht (invariant) */
    $couponDiscountHt = (float) ($facture->discount_ht ?? 0);
    $manualRemise     = max(0.0, round($totalRemise - $couponDiscountHt, 3));
    $couponCode       = $facture->coupon_code_snapshot ?? null;
    $sourceOrder   = $facture->commande ?? null;
    $orderPack     = (float) ($sourceOrder?->pack_discount_ht ?? 0);
    $orderCoupon   = (float) ($sourceOrder?->discount_ht ?? 0);
    $orderPoints   = (float) ($sourceOrder?->points_discount_ht ?? 0);
    $orderDiscount = $orderPack + $orderCoupon + $orderPoints;
    /*
     * The order's pack / coupon / Protinas lines replace this invoice's own remise rows only when
     * they reconcile with its remise. Anything above them prints as a plain 'Remise'; an invoice
     * whose remise is BELOW the order amounts prints its own remise rows as before.
     */
    $orderResidual      = round($totalRemise - $orderDiscount, 3);
    $showOrderBreakdown = $sourceOrder && $orderDiscount > 0 && $orderResidual >= -0.001;
    $docDiscount        = $orderDiscount + max(0, $orderResidual);
    // Protinas v3: delivery paid with Protinas — shown for the record, it nets to 0 on this invoice.
    $shipPaidProtinas = \App\Support\OrderCashOnDelivery::shippingPaidWithProtinasDt($sourceOrder);

    $baseImp     = round($totalHtBrut - $totalRemise, 3);
    $totalTva    = (float) ($ct['tva'] ?? $facture->tva ?? 0);
    $totalTimbre = (float) ($ct['timbre'] ?? $facture->timbre ?? 0);
    $netAPayer   = (float) ($ct['net_a_payer'] ?? $facture->prix_ttc ?? $facture->net_a_payer ?? 0);
    $totalTtc    = isset($ct['prix_ttc']) ? (float) $ct['prix_ttc'] : round($netAPayer - $totalTimbre, 3);
    $tvaRate     = (float) ($coordonnee->tva ?? 19);

    /* ── Date ─────────────────────────────────────────────────── */
    $dateStr = $documentDate
        ?? ($facture->date_facture
            ? \Carbon\Carbon::parse($facture->date_facture)->format('d/m/Y')
            : ($facture->created_at?->format('d/m/Y') ?? ''));

    /* ── Rows (the caller's invoice_rows, else built the same way) ── */
    $srcRows = $invoice_rows ?? [];
    if (empty($srcRows) && isset($details_facture)) {
        foreach ($details_facture as $i => $d) {
            $qte         = (int) ($d->qte ?? $d->quantite ?? 0);
            $pu_ht       = (float) ($d->prix_unitaire ?? 0);
            $tva_pct     = (float) ($d->tva ?? $tvaRate);
            $total_ht    = round($pu_ht * $qte, 3);
            $montant_tva = round($total_ht * $tva_pct / 100, 3);
            $srcRows[] = [
                'index'       => $i + 1,
                'produit'     => $d->product->designation_fr ?? '—',
                'qte'         => $qte,
                'pu_ht'       => $pu_ht,
                'pu_ttc'      => round($pu_ht * (1 + $tva_pct / 100), 3),
                'total_ht'    => $total_ht,
                'tva_pct'     => $tva_pct,
                'montant_tva' => $montant_tva,
                'total_ttc'   => round($total_ht + $montant_tva, 3),
            ];
        }
    }
    /*
     * Defensive on purpose: the three callers do not build identical rows. FactureTvaSent (the
     * e-mailed PDF) sends no 'montant_tva' — and the previous template read it unconditionally, an
     * « Undefined array key » that aborts the render. Every derived figure falls back to the same
     * formula the print route uses (TVA on the line HT, TTC = HT + TVA).
     */
    $rows = [];
    foreach (array_values($srcRows) as $i => $r) {
        $qte      = (float) ($r['qte'] ?? 0);
        $puHt     = (float) ($r['pu_ht'] ?? 0);
        $tvaPct   = (float) ($r['tva_pct'] ?? $tvaRate);
        $totalHt  = (float) ($r['total_ht'] ?? round($puHt * $qte, 3));
        $montTva  = (float) ($r['montant_tva'] ?? round($totalHt * $tvaPct / 100, 3));
        $rows[] = [
            'n'           => $r['index'] ?? $i + 1,
            'produit'     => $r['produit'] ?? '—',
            'qte'         => $r['qte'] ?? 0,
            'pu_ht'       => $puHt,
            'tva'         => $tvaPct,
            'pu_ttc'      => (float) ($r['pu_ttc'] ?? round($puHt * (1 + $tvaPct / 100), 3)),
            'total_ht'    => $totalHt,
            'montant_tva' => $montTva,
            'total_ttc'   => (float) ($r['total_ttc'] ?? round($totalHt + $montTva, 3)),
        ];
    }
    $taxBuckets  = \App\Support\PrintTaxRecap::buckets($rows, $totalHtBrut, $totalRemise, $totalTva);
    $singleRate  = count($taxBuckets) <= 1;
    $rateLabel   = $singleRate && $taxBuckets !== [] ? array_key_first($taxBuckets) : $tvaRate;
    $rateLabel   = ((float) $rateLabel == floor((float) $rateLabel)) ? (int) $rateLabel : (float) $rateLabel;

    /* ── Totals table (same rows, same conditions as before) ──── */
    // Raw share of the order's goods; each label rounds it ONCE, as the previous design did (1 decimal
    // for the pack, 2 for the total) — rounding twice can move the pack label by 0.1 %.
    $pct = fn (float $part): float => $sourceOrder && $sourceOrder->prix_ht > 0 ? $part / $sourceOrder->prix_ht * 100 : 0.0;
    $totals = [['label' => 'Total H.T.', 'value' => $totalHtBrut]];
    if ($showOrderBreakdown) {
        if ($orderPack > 0) {
            $totals[] = ['label' => 'Remise pack ('.round($pct($orderPack), 1).' %)', 'value' => $orderPack, 'sign' => '-'];
        }
        if ($sourceOrder->coupon_code_snapshot) {
            $totals[] = ['label' => 'Code promo '.$sourceOrder->coupon_code_snapshot, 'value' => $orderCoupon, 'sign' => '-'];
        }
        if ($orderPoints > 0) {
            $totals[] = ['label' => 'Protinas ('.\App\Support\OrderCashOnDelivery::goodsProtinasPoints($sourceOrder).' pts)', 'value' => $orderPoints, 'sign' => '-'];
        }
        if ($orderResidual > 0.001) {
            $totals[] = ['label' => 'Remise', 'value' => $orderResidual, 'sign' => '-'];
        }
        $totals[] = ['label' => 'Total remises ('.round($pct($docDiscount), 2).' % des articles)', 'value' => $docDiscount];
    }
    if ($shipPaidProtinas > 0) {
        $totals[] = ['label' => 'Livraison', 'value' => $shipPaidProtinas];
        $totals[] = ['label' => 'Réglée en Protinas', 'value' => $shipPaidProtinas, 'sign' => '-'];
    }
    if ($manualRemise > 0 && ! $showOrderBreakdown) {
        $totals[] = ['label' => 'Remise', 'value' => $manualRemise, 'sign' => '-'];
    }
    if ($couponDiscountHt > 0 && ! $showOrderBreakdown) {
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

    /* ── References for the remark box ───────────────────────────
       « Réf. BL » printed the raw database id of the delivery note; the number on the BL itself is
       what a reader can match, so it is preferred and the id stays the fallback. */
    $blRef = null;
    if (! empty($facture->facture_id)) {
        $blRef = $facture->facture?->numero ?: $facture->facture_id;
    }
    $orderRef = $sourceOrder ? ($sourceOrder->numero ?: $sourceOrder->id) : ($facture->commande_id ?? null);

    $doc = [
        'kind'     => 'facture',
        'title'    => 'Facture',
        'numero'   => $facture->numero ?? '',
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
        // The business's own terms (DocumentPdfController's text), split: the mode in the heading,
        // the request to quote the invoice number with the references below.
        'payHead'  => 'Modalité de paiement : à réception, par virement ou en espèces',
        'remarks'  => [
            $blRef ? 'Réf. bon de livraison : '.$blRef : null,
            $orderRef ? 'N° commande web : '.$orderRef : null,
            'Merci de préciser le n° de facture lors du règlement.',
        ],
        'rows'       => $rows,
        'taxBuckets' => $taxBuckets,
        'totals'     => $totals,
        'noteLead'   => 'Arrêtée la présente facture à la somme de :',
        'words'      => \App\Support\AmountInWords::fr($netAPayer),
        'extraNotes' => [],
        'signLeft'   => null,
        'signRight'  => 'Signature et Cachet',
    ];
@endphp
@include('print.partials.classic-document', ['doc' => $doc])
