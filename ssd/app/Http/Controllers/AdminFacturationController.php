<?php

namespace App\Http\Controllers;

use App\Client;
use App\Coordinate;
use App\DetailsFacture;
use App\Facture;
use App\Product;
use Exception;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use TCG\Voyager\Database\Schema\SchemaManager;
use TCG\Voyager\Events\BreadDataAdded;
use TCG\Voyager\Events\BreadDataDeleted;
use TCG\Voyager\Events\BreadDataRestored;
use TCG\Voyager\Events\BreadDataUpdated;
use TCG\Voyager\Events\BreadImagesDeleted;
use TCG\Voyager\Facades\Voyager;
use TCG\Voyager\Http\Controllers\Traits\BreadRelationshipParser;
use App\Services\SmsService;
use App\Message;

class AdminFacturationController extends Controller
{
    use BreadRelationshipParser;

    public function showFacture()
    {

        $edit = 0;
        $produits = Product::where('qte', '>', 0)->get();
        return view('admin.facture', ['edit' => $edit, 'produits' => $produits]);
    }

    public function storeFacture(Request $request)
    {
        //add client
        if ($request->new_client == 1) {
            $new_client = new Client();
            $new_client->name = $request->name;
            $new_client->adresse = $request->adresse;
            $new_client->phone_1 = $request->phone_1;
            $new_client->matricule = $request->matricule;
            $new_client->save();
            $client_id = $new_client->id;



            // env sms
            if($new_client->phone_1){
                $msg = Message::first();
                if($msg && $msg->msg_welcome){
                    $sms = $msg->msg_welcome;

                }else{
                  $sms = 'Cher(e) client(e), nous vous remercions de votre confiance et nous serons ravis de vous revoir dans notre boutique SOBITAS ou notre site Web Protein.tn';
                }

                (new SmsService())->send_sms($new_client->phone_1 , $sms);
            }
            // env sms

        } else {
            $client_id = $request->client_id;
        }
        //add_facture
        $new_facture = new Facture();
        $new_facture->remise = $request->m_remise;
        $new_facture->pourcentage_remise = $request->pourcent_remise;
        $new_facture->timbre = $request->timbre_fiscal;
        $new_facture->client_id = $client_id;

        /* no */
        $nb = Facture::whereYear('created_at', date('Y'))->get()->count();
        $nb = $nb + 1;
        $nb = str_pad($nb, 4, '0', STR_PAD_LEFT);
        $new_facture->numero = date('Y') . '/' . $nb;
        /*  */
        $new_facture->save();

        //add_achats
        $all_price_tva = 0;
        $all_price_ht = 0;
        $all_price_ttc = 0;
        for ($i = 1; $i <= $request->nb_achat+ $request->nb_delete; $i++) {
            if ($request->input('produit_id_' . $i) && ($request->input('qte' . $i))) {

                $new_details = new DetailsFacture();
                $new_details->produit_id = $request->input('produit_id_' . $i);
                $produit = Product::find($new_details->produit_id);

                $new_details->qte = $request->input('qte' . $i);
                $new_details->prix_unitaire = $request->input('prix_unitaire' . $i);
                $the_price_ht = $request->input('qte' . $i) * $request->input('prix_unitaire' . $i);
                //  $new_details->prix_ht = $the_price_ht;
                // $taux = Coordinate::first()->tva;
                //  $new_details->tva = $taux;
                //  $mantant_tva = ($the_price_ht * $taux) / 100;
                // $the_price_ttc = $the_price_ht + $mantant_tva;
                $the_price_ttc = $the_price_ht;
                $new_details->prix_ttc = $the_price_ttc;
                $new_details->facture_id = $new_facture->id;
                //   $all_price_tva += $mantant_tva;
                $all_price_ht += $the_price_ht;
                $all_price_ttc += $the_price_ttc;
                $new_details->save();


                $produit->qte = $produit->qte - $new_details->qte;
                $produit->save();
            }
        }

        // $new_facture->tva = $all_price_tva;
        $new_facture->prix_ht = $all_price_ht;
        if ($request->m_remise > 0) {
            $new_prix_ht = $all_price_ht - $new_facture->remise;
            if ($all_price_ht != 0) {
                $pourcentage = $new_facture->remise / $all_price_ht;
            } else {
                $pourcentage = 0;
            }
            // $new_somme_tva=$all_price_tva-($all_price_tva * $pourcentage);
            // $new_facture->tva=$new_somme_tva;
            $new_facture->prix_ttc = $new_prix_ht; // + $new_somme_tva +$new_facture->timbre;
        } else {
            $new_facture->prix_ttc = $all_price_ht; /* + $all_price_tva +$new_facture->timbre; */
        }
        $new_facture->save();
        return redirect()->route('voyager.imprimer_facture', ['id' => $new_facture->id])->with([
            'message'    => " enregistrée avec succès",
            'alert-type' => 'success',
        ]);
    }


    public function updateFacture(Request $request, $id)
    {



        //add_facture

        $new_facture = Facture::find($id);
        $new_facture->remise = $request->m_remise;
        $new_facture->pourcentage_remise = $request->pourcent_remise;

        $new_facture->save();

        //add_achats
        $all_price_tva = 0;
        $all_price_ht = 0;
        $all_price_ttc = 0;

        $old_details = DetailsFacture::where('facture_id', $new_facture->id)->get();
        foreach ($old_details as $old) {
            $produit = Product::find($old->produit_id);
            if ($produit) {
                $produit->qte = $produit->qte + $old->qte;
                $produit->save();
            }

            $old->delete();
        }
       // DetailsFacture::where('facture_id', $new_facture->id)->delete();
        for ($i = 1; $i <= $request->nb_achat + $request->nb_delete; $i++) {
            if ($request->input('produit_id_' . $i) && ($request->input('qte' . $i))) {

                $new_details = new DetailsFacture();
                $new_details->produit_id = $request->input('produit_id_' . $i);
                $produit = Product::find($new_details->produit_id);

                $new_details->qte = $request->input('qte' . $i);
                $new_details->prix_unitaire = $request->input('prix_unitaire' . $i);
                $the_price_ht = $request->input('qte' . $i) * $request->input('prix_unitaire' . $i);
                //  $new_details->prix_ht = $the_price_ht;
                //    $taux = Coordinate::first()->tva;
                //  $new_details->tva = $taux;
                // $mantant_tva = ($the_price_ht * $taux) / 100;
                // $the_price_ttc = $the_price_ht + $mantant_tva;
                $the_price_ttc = $the_price_ht;
                $new_details->prix_ttc = $the_price_ttc;
                $new_details->facture_id = $new_facture->id;
                // $all_price_tva += $mantant_tva;
                $all_price_ht += $the_price_ht;
                $all_price_ttc += $the_price_ttc;
                $new_details->save();




                $produit->qte = $produit->qte - $new_details->qte;
                $produit->save();
            }
        }

        //$new_facture->tva = $all_price_tva;
        $new_facture->prix_ht = $all_price_ht;
        if ($request->m_remise > 0) {
            $new_prix_ht = $all_price_ht - $new_facture->remise;
            if ($all_price_ht != 0) {
                $pourcentage = $new_facture->remise / $all_price_ht;
            } else {
                $pourcentage = 0;
            }
            // $new_somme_tva=$all_price_tva-($all_price_tva * $pourcentage);
            //$new_facture->tva=$new_somme_tva;
            $new_facture->prix_ttc = $new_prix_ht; // + $new_somme_tva +$new_facture->timbre;
        } else {
            $new_facture->prix_ttc = $all_price_ht; //+ $all_price_tva +$new_facture->timbre;
        }
        $new_facture->save();
        return redirect()->route('voyager.imprimer_facture', ['id' => $new_facture->id])->with([
            'message'    => " enregistrée avec succès",
            'alert-type' => 'success',
        ]);
    }

    public function editFacture($id)
    {
        $facture = Facture::find($id);
        $details_facture = DetailsFacture::where('facture_id', $id)->get();
        $edit_length = $details_facture->count();
        $edit = true;
        $produits = Product::all();

        return view('admin.facture', ['facture' => $facture, 'edit_length' => $edit_length, 'details_facture' => $details_facture, 'edit' => $edit, 'produits' => $produits]);
    }




    public function imprimerFacture($id)
    {
        $facture = Facture::find($id);
        $details_facture = DetailsFacture::where('facture_id', $id)->get();
        $edit_length = $details_facture->count();
        $edit = true;
        $produits = Product::all();

        return view('admin.imprimer_facture', ['facture' => $facture, 'edit_length' => $edit_length, 'details_facture' => $details_facture, 'edit' => $edit, 'produits' => $produits]);
    }
}
