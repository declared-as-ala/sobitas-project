<?php

namespace App\Filament\Affilie\Resources\AffilieCommandeResource\Pages;

use App\Enums\AffilieStatus;
use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Filament\Affilie\Resources\AffilieCommandeResource;
use App\Models\Affilie;
use App\Models\AffilieTransaction;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\NumberSequence;
use App\Models\Product;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * ── THE AFFILIATE'S ORDER, WRITTEN AS A REAL `Commande` ──────────────────────────────────────
 *
 * This page produces the same object the storefront checkout produces — same table, same status
 * vocabulary, same numbering sequence, same stock discipline — with exactly two deliberate
 * divergences, both of which are the point of the feature and both of which are commented where
 * they happen:
 *
 *   1. `commande_details.prix_unitaire` is the AFFILIATE'S selling price, not the shop's shelf
 *      price. `CommandeController::storeCommandeApi()` overrides whatever the client sent with
 *      `Product::getEffectiveUnitPrice()` because on the storefront a client-supplied price IS an
 *      attack. Here the affiliate's price is the product being sold: the spread the ledger pays
 *      (`AffilieTransactionService::orderSpreadCommission()`) reads `prix_unitaire` and subtracts
 *      `products.prix_affilie` from it. Overriding it with the shelf price would silently pay the
 *      affiliate the shop's own markup instead of theirs. It is not trusted blindly — every line
 *      passes `Affilie::validateSellingPrice()` server-side, below, before anything is written.
 *
 *   2. NO CUSTOMER CONFIRMATION SMS/EMAIL. `OrderConfirmationDispatcher` is deliberately not
 *      called. It texts and emails the customer "merci pour votre commande" on protein.tn — but
 *      this customer bought from their coach, has never visited the site, and gave the shop no
 *      consent to message them; each SMS is also billed. The parcel still announces itself:
 *      `CommandeObserver::updated()` texts on the milestones in
 *      `config('customer_notifications.sms_order_statuses')` once the order actually moves, which
 *      is the message that is useful to them. If the owner decides otherwise, one line —
 *      `app(OrderConfirmationDispatcher::class)->dispatch($commande->id)` — placed AFTER the
 *      transaction commits, never inside it, or a rolled-back order will already have sent its SMS.
 */
class CreateAffilieCommande extends CreateRecord
{
    protected static string $resource = AffilieCommandeResource::class;

    protected static ?string $title = 'Nouvelle commande';

    public function getBreadcrumb(): string
    {
        return 'Nouvelle commande';
    }

    protected function getRedirectUrl(): string
    {
        // The resource has no view/edit page (an affiliate may not alter an order once it exists),
        // so the default redirect chain has nowhere to land. Send them back to their list.
        return static::getResource()::getUrl('index');
    }

    protected function getCreatedNotification(): ?Notification
    {
        return Notification::make()
            ->success()
            ->title('Commande enregistrée')
            ->body('Elle est visible par l’équipe Protein.tn pour préparation et expédition.');
    }

    /**
     * Product search for the visual order composer (the grid in the order-composer view).
     *
     * Livewire-callable from the composer's Alpine layer via `$wire.searchAffilieProducts(term)`.
     * Returns only affiliate-sellable products (same query the server re-validates against), each
     * with the cover image, its affiliate base price, the affiliate's suggested selling price and
     * stock. Auth-scoped — it runs as the logged-in affiliate, so `suggestedSellingPrice()` uses
     * their own markup. It is READ ONLY and writes nothing; the order is still created and
     * re-validated entirely by handleRecordCreation().
     *
     * @return array<int, array<string, mixed>>
     */
    public function searchAffilieProducts(string $term = ''): array
    {
        $affilie = AffilieCommandeResource::currentAffilie();

        $products = AffilieCommandeResource::affiliateProductQuery()
            ->when(trim($term) !== '', function ($query) use ($term): void {
                $like = '%'.trim($term).'%';
                $query->where(fn ($q) => $q->where('designation_fr', 'like', $like)->orWhere('code_product', 'like', $like));
            })
            ->orderByRaw('CASE WHEN qte > 0 THEN 0 ELSE 1 END') // in-stock first
            ->orderBy('designation_fr')
            ->limit(24)
            ->get();

        return $products->map(function (Product $p) use ($affilie): array {
            $base = (float) $p->affiliateBasePrice();
            $rel  = \App\Filament\Support\ImagePath::normalizeExisting($p->cover);
            $img  = \App\Filament\Support\ImagePath::isExternal($rel)
                ? $rel
                : \Illuminate\Support\Facades\Storage::disk('public')->url($rel);

            return [
                'id'        => (int) $p->id,
                'name'      => (string) ($p->designation_fr ?? ('Produit #'.$p->id)),
                'image'     => $img,
                'base'      => round($base, 3),
                'suggested' => $affilie ? round((float) $affilie->suggestedSellingPrice($p), 3) : round($base, 3),
                'markup_percent' => $affilie?->defaultMarkupPercent() ?? 0.0,
                'stock'     => (int) ($p->qte ?? 0),
                'code'      => (string) ($p->code_product ?? ''),
            ];
        })->all();
    }

    /** Raise a French, field-scoped validation error. `data.` is CreateRecord's form statePath. */
    private function fail(string $statePathKey, string $message): never
    {
        throw ValidationException::withMessages(['data.'.$statePathKey => $message]);
    }

    /**
     * Map an AffilieOrderException (a semantic field + optional line key) back onto THIS form's
     * statePath, so the service's error lands under the offending input rather than at the top.
     */
    private function formFieldFor(\App\Services\Affilie\AffilieOrderException $e): string
    {
        return match ($e->field) {
            'phone'   => 'livraison_phone',
            'account' => 'livraison_nom',
            'product' => $e->lineKey !== null ? 'details.'.$e->lineKey.'.produit_id' : 'details',
            'price'   => $e->lineKey !== null ? 'details.'.$e->lineKey.'.prix_unitaire' : 'details',
            'stock'   => $e->lineKey !== null ? 'details.'.$e->lineKey.'.qte' : 'details',
            default   => 'details', // 'lines', 'general'
        };
    }

    protected function handleRecordCreation(array $data): Model
    {
        /*
         * WHO IS CREATING THIS. Read from the session, never from $data — an affiliate must not be
         * able to bill an order to somebody else's account by editing a form field, and there is
         * no field to edit precisely because this value never appears in the form.
         */
        $affilie = AffilieCommandeResource::currentAffilie();

        if (! $affilie || $affilie->status !== AffilieStatus::Active) {
            $this->fail('livraison_nom', __('Votre compte affilié n’est pas actif : vous ne pouvez pas créer de commande.'));
        }

        /*
         * Migration 2026_09_09_120100 adds `commandes.affilie_id`. Without it the insert below
         * fails with a raw SQL error the affiliate cannot act on, and — worse — an order written
         * with no affiliate attribution earns nobody anything while looking perfectly normal.
         * Same defensive posture AffilieTransactionService::syncOrderCommissionOnStatusChange()
         * takes at the top of its own method.
         */
        if (! Schema::hasColumn('commandes', 'affilie_id')) {
            $this->fail('livraison_nom', __('Le module affilié n’est pas encore installé sur ce serveur. Contactez l’administrateur.'));
        }

        // Map the repeater's `details` state + delivery fields into the service's shape, then
        // delegate to the SINGLE shared code path (AffilieOrderService — also used by the
        // /affiliate portal API). Repeater keys are preserved so a per-line error from the service
        // is translated back under the offending row via formFieldFor().
        $lines = [];
        foreach ((array) ($data['details'] ?? []) as $key => $row) {
            $lines[$key] = [
                'produit_id'    => (int) ($row['produit_id'] ?? 0),
                'qte'           => (int) ($row['qte'] ?? 0),
                'prix_unitaire' => (float) ($row['prix_unitaire'] ?? 0),
                'arome'         => $row['arome'] ?? null,
            ];
        }

        $customer = [
            'nom'          => $data['livraison_nom'] ?? null,
            'phone'        => $data['livraison_phone'] ?? null,
            'email'        => $data['livraison_email'] ?? null,
            'region'       => $data['livraison_region'] ?? null,
            'ville'        => $data['livraison_ville'] ?? null,
            'adresse1'     => $data['livraison_adresse1'] ?? null,
            'code_postale' => $data['livraison_code_postale'] ?? null,
            'note'         => $data['note'] ?? null,
        ];

        try {
            return app(\App\Services\Affilie\AffilieOrderService::class)->create(
                $affilie,
                $lines,
                $customer,
                (float) ($data['frais_livraison'] ?? 0),
                Auth::id(),
            );
        } catch (\App\Services\Affilie\AffilieOrderException $e) {
            $this->fail($this->formFieldFor($e), $e->getMessage());
        }
    }

}
