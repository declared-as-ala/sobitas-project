<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendOrderEmailJob;
use App\Jobs\SendSmsJob;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Message;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommandeController extends Controller
{
    /**
     * Store a new commande from the frontend API.
     *
     * ⚠️ LEGACY CODE — This replicates the exact behavior from
     *   AdminCommandeController::storeCommandeApi() in the backend project.
     *   Price calculation logic preserved as-is.
     *   SMS and email are now dispatched to queue for better response time.
     */
    public function storeCommandeApi(Request $request): JsonResponse
    {
        $request->validate([
            'commande'          => ['required', 'array'],
            'commande.phone'    => ['nullable', 'string', 'max:20'],
            'commande.email'    => ['nullable', 'email', 'max:255'],
            'commande.nom'      => ['nullable', 'string', 'max:255'],
            'commande.prenom'   => ['nullable', 'string', 'max:255'],
            'commande.region'   => ['nullable', 'string', 'max:255'],
            'panier'            => ['required', 'array', 'min:1'],
            'panier.*.produit_id'    => ['required', 'integer', 'exists:products,id'],
            'panier.*.quantite'      => ['required', 'integer', 'min:1'],
            'panier.*.prix_unitaire' => ['required', 'numeric', 'min:0'],
        ]);

        $commandeData = $request->commande;

        $new_facture = DB::transaction(function () use ($commandeData, $request) {
            $new_facture = new Commande();

            // Use livraison fields as primary source, fallback to billing fields
            $new_facture->nom = $commandeData['livraison_nom'] ?? $commandeData['nom'] ?? null;
            $new_facture->prenom = $commandeData['livraison_prenom'] ?? $commandeData['prenom'] ?? null;
            $new_facture->email = $commandeData['livraison_email'] ?? $commandeData['email'] ?? null;
            $new_facture->phone = $commandeData['livraison_phone'] ?? $commandeData['phone'] ?? null;
            $new_facture->pays = $commandeData['pays'] ?? 'Tunisie';
            $new_facture->region = $commandeData['livraison_region'] ?? $commandeData['region'] ?? null;
            $new_facture->ville = $commandeData['livraison_ville'] ?? $commandeData['ville'] ?? null;
            $new_facture->code_postale = $commandeData['livraison_code_postale'] ?? $commandeData['code_postale'] ?? null;
            $new_facture->adresse1 = $commandeData['livraison_adresse1'] ?? $commandeData['adresse1'] ?? null;
            $new_facture->adresse2 = $commandeData['livraison_adresse2'] ?? $commandeData['adresse2'] ?? null;
            $new_facture->livraison = $commandeData['livraison'] ?? null;
            $new_facture->frais_livraison = $commandeData['frais_livraison'] ?? null;
            $new_facture->note = $commandeData['note'] ?? null;

            if (! empty($commandeData['user_id'])) {
                $new_facture->user_id = $commandeData['user_id'];
            }

            $new_facture->livraison_nom = $commandeData['livraison_nom'] ?? null;
            $new_facture->livraison_prenom = $commandeData['livraison_prenom'] ?? null;
            $new_facture->livraison_email = $commandeData['livraison_email'] ?? null;
            $new_facture->livraison_phone = $commandeData['livraison_phone'] ?? null;
            $new_facture->livraison_region = $commandeData['livraison_region'] ?? null;
            $new_facture->livraison_ville = $commandeData['livraison_ville'] ?? null;
            $new_facture->livraison_code_postale = $commandeData['livraison_code_postale'] ?? null;
            $new_facture->livraison_adresse1 = $commandeData['livraison_adresse1'] ?? null;
            $new_facture->livraison_adresse2 = $commandeData['livraison_adresse2'] ?? null;
            $new_facture->etat = Commande::STATUS_NEW;

            // Generate order number
            $nb = Commande::whereYear('created_at', date('Y'))->count() + 1;
            $nb = str_pad($nb, 4, '0', STR_PAD_LEFT);
            $new_facture->numero = date('Y') . '/' . $nb;

            $new_facture->save();

            // Add order items
            $all_price_ht = 0;

            foreach ($request->panier as $panier) {
                $new_details = new CommandeDetail();
                $new_details->produit_id = $panier['produit_id'];
                $new_details->qte = $panier['quantite'];
                $new_details->prix_unitaire = $panier['prix_unitaire'];

                $the_price_ht = $panier['quantite'] * $panier['prix_unitaire'];
                $new_details->prix_ht = $the_price_ht;
                $new_details->prix_ttc = $the_price_ht;
                $new_details->commande_id = $new_facture->id;
                $all_price_ht += $the_price_ht;

                $new_details->save();
            }

            // Calculate totals
            $new_facture->prix_ht = $all_price_ht;

            if (($request->m_remise ?? 0) > 0) {
                $new_prix_ht = $all_price_ht - ($new_facture->remise ?? 0);
                $new_facture->prix_ttc = $new_facture->frais_livraison
                    ? $new_prix_ht + $new_facture->frais_livraison
                    : $new_prix_ht;
            } else {
                $new_facture->prix_ttc = $new_facture->frais_livraison
                    ? $all_price_ht + $new_facture->frais_livraison
                    : $all_price_ht;
            }

            $new_facture->save();

            return $new_facture;
        });

        // ── Queue SMS notification (non-blocking) ────────
        if ($new_facture->phone && ($new_facture->nom || $new_facture->livraison_nom)) {
            $msg = Message::getCached();
            if ($msg && $msg->msg_passez_commande) {
                $text = $msg->msg_passez_commande;
                $nom = $new_facture->nom ?: $new_facture->livraison_nom ?: '';
                $prenom = $new_facture->prenom ?: $new_facture->livraison_prenom ?: '';
                $sms = str_replace(['[nom]', '[prenom]', '[num_commande]'], [$nom, $prenom, $new_facture->numero], $text);

                SendSmsJob::dispatch($new_facture->phone, $sms);
            }
        }

        // ── Queue email notifications (non-blocking) ─────
        $details = CommandeDetail::where('commande_id', $new_facture->id)->get();
        $adminEmail = config('mail.admin_email', 'bitoutawalid@gmail.com');

        $mailData = [
            'titre'    => 'Nouvelle commande',
            'commande' => $new_facture->toArray(),
            'details'  => $details->toArray(),
        ];

        SendOrderEmailJob::dispatch($mailData, $adminEmail, $adminEmail);

        $clientEmail = $new_facture->email ?? $new_facture->livraison_email ?? null;
        if ($clientEmail && filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
            SendOrderEmailJob::dispatch($mailData, $clientEmail, 'contact@protein.tn');
        }

        return response()->json([
            'id'         => $new_facture->id,
            'message'    => 'Merci pour votre commande',
            'alert-type' => 'success',
        ], 201);
    }

    /**
     * Get commande details (API).
     */
    public function details(int $id): JsonResponse
    {
        $facture = Commande::select('id', 'numero', 'nom', 'prenom', 'email', 'phone', 'region', 'ville', 'etat', 'prix_ht', 'prix_ttc', 'frais_livraison', 'created_at')
            ->find($id);

        if (! $facture) {
            return response()->json(['error' => 'Commande introuvable'], 404);
        }

        $details_facture = CommandeDetail::where('commande_id', $id)
            ->select('id', 'commande_id', 'produit_id', 'qte', 'prix_unitaire', 'prix_ht', 'prix_ttc')
            ->with('product:id,designation_fr,cover,prix,promo')
            ->get();

        return response()->json(['facture' => $facture, 'details_facture' => $details_facture]);
    }
}
