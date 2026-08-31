<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\Message;

/**
 * One source of truth for transactional SMS copy.
 *
 * Messages stay concise, identify Protein.tn immediately and avoid product
 * lists or other unnecessary customer data. SmsService performs the final
 * GSM-7 normalization before delivery.
 */
class TransactionalSmsText
{
    public const DEFAULT_CONFIRMATION = 'Protein.tn: commande #[num_commande] bien recue. Total: [total] TND, paiement a la livraison. Notre equipe vous appellera pour confirmation. Merci.';

    public const DEFAULT_STATUS = "Protein.tn: mise a jour commande #[num_commande]: [etat]. Gardez votre telephone joignable. Besoin d'aide? +216 27 612 500.";

    public static function confirmation(Commande $commande): string
    {
        $template = trim((string) (Message::getCached()?->msg_passez_commande ?? ''));

        return self::render($template !== '' ? $template : self::DEFAULT_CONFIRMATION, $commande);
    }

    public static function status(Commande $commande): string
    {
        $template = trim((string) (Message::getCached()?->msg_etat_commande ?? ''));

        return self::render($template !== '' ? $template : self::DEFAULT_STATUS, $commande);
    }

    private static function render(string $template, Commande $commande): string
    {
        $commande->loadMissing('details.product:id,designation_fr');
        $products = $commande->details
            ->take(4)
            ->map(fn ($detail) => $detail->product->designation_fr ?? 'Produit')
            ->filter()
            ->implode(', ');
        $more = $commande->details->count() > 4
            ? ' (+'.($commande->details->count() - 4).')'
            : '';

        return trim(str_replace(
            ['[nom]', '[prenom]', '[num_commande]', '[etat]', '[produits]', '[total]'],
            [
                (string) ($commande->livraison_nom ?: $commande->nom ?: ''),
                (string) ($commande->livraison_prenom ?: $commande->prenom ?: ''),
                (string) ($commande->numero ?? $commande->id),
                Commande::getStatusLabel((string) $commande->etat),
                trim($products.$more),
                self::formatAmount((float) ($commande->prix_ttc ?? 0)),
            ],
            $template
        ));
    }

    private static function formatAmount(float $amount): string
    {
        return rtrim(rtrim(number_format($amount, 3, '.', ''), '0'), '.');
    }
}
