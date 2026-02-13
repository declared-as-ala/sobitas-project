<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Message;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\SoumissionMail;

class OrderService
{
    public function __construct(
        private readonly SmsService $smsService,
    ) {}

    // ─── Create from API (frontend) ─────────────────────────────────────

    /**
     * Create a new order from the storefront API request.
     *
     * @param array $data Expected keys: 'commande' (array), 'panier' (array of items)
     */
    public function createFromApi(array $data): Commande
    {
        return DB::transaction(function () use ($data): Commande {
            $commandeData = $data['commande'] ?? [];

            $commande = Commande::create([
                'nom' => $commandeData['livraison_nom'] ?? $commandeData['nom'] ?? null,
                'prenom' => $commandeData['livraison_prenom'] ?? $commandeData['prenom'] ?? null,
                'email' => $commandeData['livraison_email'] ?? $commandeData['email'] ?? null,
                'phone' => $commandeData['livraison_phone'] ?? $commandeData['phone'] ?? null,
                'pays' => $commandeData['pays'] ?? 'Tunisie',
                'region' => $commandeData['livraison_region'] ?? $commandeData['region'] ?? null,
                'ville' => $commandeData['livraison_ville'] ?? $commandeData['ville'] ?? null,
                'code_postale' => $commandeData['livraison_code_postale'] ?? $commandeData['code_postale'] ?? null,
                'adresse1' => $commandeData['livraison_adresse1'] ?? $commandeData['adresse1'] ?? null,
                'adresse2' => $commandeData['livraison_adresse2'] ?? $commandeData['adresse2'] ?? null,
                'livraison' => $commandeData['livraison'] ?? null,
                'frais_livraison' => $commandeData['frais_livraison'] ?? null,
                'note' => $commandeData['note'] ?? null,
                'user_id' => $commandeData['user_id'] ?? null,
                'livraison_nom' => $commandeData['livraison_nom'] ?? null,
                'livraison_prenom' => $commandeData['livraison_prenom'] ?? null,
                'livraison_email' => $commandeData['livraison_email'] ?? null,
                'livraison_phone' => $commandeData['livraison_phone'] ?? null,
                'livraison_region' => $commandeData['livraison_region'] ?? null,
                'livraison_ville' => $commandeData['livraison_ville'] ?? null,
                'livraison_code_postale' => $commandeData['livraison_code_postale'] ?? null,
                'livraison_adresse1' => $commandeData['livraison_adresse1'] ?? null,
                'livraison_adresse2' => $commandeData['livraison_adresse2'] ?? null,
                'etat' => OrderStatus::NOUVELLE_COMMANDE,
                'numero' => $this->generateNumber(),
            ]);

            // Process cart items
            $totalHt = 0.0;
            foreach ($data['panier'] ?? [] as $item) {
                $qte = (int) $item['quantite'];
                $prixUnitaire = (float) $item['prix_unitaire'];
                $prixHt = $qte * $prixUnitaire;

                CommandeDetail::create([
                    'commande_id' => $commande->id,
                    'produit_id' => $item['produit_id'],
                    'qte' => $qte,
                    'prix_unitaire' => $prixUnitaire,
                    'prix_ht' => $prixHt,
                    'prix_ttc' => $prixHt,
                ]);

                $totalHt += $prixHt;
            }

            // Calculate totals
            $frais = (float) ($commande->frais_livraison ?? 0);
            $commande->update([
                'prix_ht' => $totalHt,
                'prix_ttc' => $totalHt + $frais,
            ]);

            // Send notifications
            $this->sendOrderSms($commande);
            $this->sendOrderEmail($commande);

            return $commande->fresh();
        });
    }

    // ─── Create from Admin ──────────────────────────────────────────────

    /**
     * Create a new order from admin panel form.
     *
     * @param array $data Expected keys: 'commande' (array), 'products' (array of items)
     */
    public function storeCommandeAdmin(array $data): Commande
    {
        return DB::transaction(function () use ($data): Commande {
            $commandeData = $data['commande'] ?? $data;

            $commande = Commande::create([
                'nom' => $commandeData['nom'] ?? null,
                'prenom' => $commandeData['prenom'] ?? null,
                'email' => $commandeData['email'] ?? null,
                'phone' => $commandeData['phone'] ?? null,
                'pays' => $commandeData['pays'] ?? 'Tunisie',
                'region' => $commandeData['region'] ?? null,
                'ville' => $commandeData['ville'] ?? null,
                'code_postale' => $commandeData['code_postale'] ?? null,
                'adresse1' => $commandeData['adresse1'] ?? null,
                'adresse2' => $commandeData['adresse2'] ?? null,
                'livraison' => $commandeData['livraison'] ?? null,
                'frais_livraison' => $commandeData['frais_livraison'] ?? null,
                'note' => $commandeData['note'] ?? null,
                'user_id' => $commandeData['user_id'] ?? null,
                'livraison_nom' => $commandeData['livraison_nom'] ?? null,
                'livraison_prenom' => $commandeData['livraison_prenom'] ?? null,
                'livraison_email' => $commandeData['livraison_email'] ?? null,
                'livraison_phone' => $commandeData['livraison_phone'] ?? null,
                'livraison_region' => $commandeData['livraison_region'] ?? null,
                'livraison_ville' => $commandeData['livraison_ville'] ?? null,
                'livraison_code_postale' => $commandeData['livraison_code_postale'] ?? null,
                'livraison_adresse1' => $commandeData['livraison_adresse1'] ?? null,
                'livraison_adresse2' => $commandeData['livraison_adresse2'] ?? null,
                'etat' => OrderStatus::NOUVELLE_COMMANDE,
                'numero' => $this->generateNumber(),
            ]);

            // Process product items from admin form
            $totalHt = $this->processAdminProducts($data['products'] ?? [], $commande);

            // Calculate totals
            $remise = (float) ($data['remise'] ?? 0);
            $frais = (float) ($commande->frais_livraison ?? 0);

            $commande->update([
                'prix_ht' => $totalHt,
                'remise' => $remise,
                'prix_ttc' => ($totalHt - $remise) + $frais,
            ]);

            return $commande->fresh();
        });
    }

    // ─── Update Order ───────────────────────────────────────────────────

    /**
     * Update an existing order (admin panel).
     *
     * @param int $id
     * @param array $data Expected keys: 'etat', 'note', 'products', 'send_notif', etc.
     */
    public function updateCommande(int $id, array $data): Commande
    {
        return DB::transaction(function () use ($id, $data): Commande {
            $commande = Commande::findOrFail($id);

            // Restore stock from old details
            foreach ($commande->details as $detail) {
                Product::where('id', $detail->produit_id)->increment('qte', $detail->qte);
                $detail->delete();
            }

            // Process new product items
            $totalHt = $this->processAdminProducts($data['products'] ?? [], $commande);

            // Update order fields
            $remise = (float) ($data['remise'] ?? 0);
            $frais = (float) ($commande->frais_livraison ?? 0);
            $newEtat = $data['etat'] ?? $commande->etat;

            // Track status change in history
            if ($newEtat instanceof OrderStatus) {
                $etatValue = $newEtat;
            } else {
                $etatValue = OrderStatus::tryFrom((string) $newEtat) ?? $commande->etat;
            }

            if ($commande->etat !== $etatValue) {
                $commande->historique = ($commande->historique ?? '') . ';' . $etatValue->value . ',' . now()->format('Y-m-d H:i:s');
            }

            $commande->update([
                'etat' => $etatValue,
                'note' => $data['note'] ?? $commande->note,
                'adresse1' => $data['adresse1'] ?? $commande->adresse1,
                'livraison_adresse1' => $data['livraison_adresse1'] ?? $commande->livraison_adresse1,
                'prix_ht' => $totalHt,
                'remise' => $remise,
                'prix_ttc' => ($totalHt - $remise) + $frais,
                'historique' => $commande->historique,
            ]);

            // Send status notification if requested
            if (!empty($data['send_notif']) && $commande->phone) {
                $this->sendStatusNotification($commande, $etatValue);
            }

            return $commande->fresh();
        });
    }

    // ─── Status Update ──────────────────────────────────────────────────

    /**
     * Update order status and optionally send notification.
     */
    public function updateStatus(Commande $commande, OrderStatus $newStatus, bool $sendNotif = false): void
    {
        if ($commande->etat !== $newStatus) {
            $commande->historique = ($commande->historique ?? '') . ';' . $newStatus->value . ',' . now()->format('Y-m-d H:i:s');
        }

        $commande->etat = $newStatus;
        $commande->save();

        if ($sendNotif && $commande->phone) {
            $this->sendStatusNotification($commande, $newStatus);
        }
    }

    // ─── Internal Helpers ───────────────────────────────────────────────

    /**
     * Generate sequential order number for the current year.
     */
    private function generateNumber(): string
    {
        $count = Commande::whereYear('created_at', date('Y'))->count() + 1;

        return date('Y') . '/' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Process product items from admin form. Returns total HT.
     *
     * @param array<int, array{produit_id: int, qte: int, prix_unitaire: float}> $products
     */
    private function processAdminProducts(array $products, Commande $commande): float
    {
        $totalHt = 0.0;

        foreach ($products as $item) {
            $qte = (int) ($item['qte'] ?? 0);
            $produitId = (int) ($item['produit_id'] ?? 0);
            $prixUnitaire = (float) ($item['prix_unitaire'] ?? 0);

            if (!$produitId || $qte <= 0) {
                continue;
            }

            $prixHt = $qte * $prixUnitaire;

            CommandeDetail::create([
                'commande_id' => $commande->id,
                'produit_id' => $produitId,
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ht' => $prixHt,
                'prix_ttc' => $prixHt,
            ]);

            // Decrement stock
            Product::where('id', $produitId)->decrement('qte', $qte);

            $totalHt += $prixHt;
        }

        return $totalHt;
    }

    /**
     * Send SMS when order is first placed.
     */
    private function sendOrderSms(Commande $commande): void
    {
        try {
            $phone = $commande->phone ?? $commande->livraison_phone ?? null;
            if (!$phone || empty(trim((string) $phone))) {
                return;
            }

            $msg = Message::first();
            if (!$msg?->msg_passez_commande || empty(trim($msg->msg_passez_commande))) {
                return;
            }

            $nom = (string) ($commande->nom ?? $commande->livraison_nom ?? '');
            $prenom = (string) ($commande->prenom ?? $commande->livraison_prenom ?? '');
            $numero = (string) ($commande->numero ?? '');

            $sms = str_replace(
                ['[nom]', '[prenom]', '[num_commande]'],
                [$nom, $prenom, $numero],
                $msg->msg_passez_commande
            );

            if (!empty(trim($sms))) {
                $this->smsService->send($phone, $sms);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send order SMS', [
                'commande_id' => $commande->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send status change SMS notification.
     */
    private function sendStatusNotification(Commande $commande, OrderStatus $status): void
    {
        try {
            $phone = $commande->phone ?? $commande->livraison_phone ?? null;
            if (!$phone || empty(trim((string) $phone))) {
                return;
            }

            $msg = Message::first();
            if (!$msg?->msg_etat_commande || empty(trim($msg->msg_etat_commande))) {
                return;
            }

            $nom = (string) ($commande->nom ?? $commande->livraison_nom ?? '');
            $prenom = (string) ($commande->prenom ?? $commande->livraison_prenom ?? '');
            $numero = (string) ($commande->numero ?? '');
            $etatLabel = (string) $status->label();

            $sms = str_replace(
                ['[nom]', '[prenom]', '[num_commande]', '[etat]'],
                [$nom, $prenom, $numero, $etatLabel],
                $msg->msg_etat_commande
            );

            if (!empty(trim($sms))) {
                $this->smsService->send($phone, $sms);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send status SMS', [
                'commande_id' => $commande->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send email notification for a new order.
     */
    private function sendOrderEmail(Commande $commande): void
    {
        $details = CommandeDetail::where('commande_id', $commande->id)->get();
        $data = [
            'titre' => 'Nouvelle commande',
            'commande' => $commande,
            'details' => $details,
        ];

        try {
            // Send to admin
            Mail::to('bitoutawalid@gmail.com')->send(new SoumissionMail($data, 'bitoutawalid@gmail.com'));

            // Send to client
            $clientEmail = $commande->email ?? $commande->livraison_email;
            if ($clientEmail && filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
                Mail::to($clientEmail)->send(new SoumissionMail($data, 'contact@protein.tn'));
            }
        } catch (\Exception $e) {
            Log::error('Failed to send order email', [
                'commande_id' => $commande->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
