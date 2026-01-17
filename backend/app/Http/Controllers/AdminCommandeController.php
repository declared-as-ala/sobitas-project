<?php

namespace App\Http\Controllers;

use App\Client;
use App\Coordinate;
use App\Product;
use App\Commande;
use App\CommandeDetail;
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
use Illuminate\Support\Facades\Mail;

use App\Mail\SoumissionMail;

class AdminCommandeController extends Controller
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

        //add_facture
        $new_facture = new Commande();
        $new_facture->nom = @$request->nom;
        $new_facture->prenom = @$request->prenom;
        $new_facture->email = @$request->email;
        $new_facture->phone = @$request->phone;
        $new_facture->pays = @$request->pays;
        $new_facture->region = @$request->region;
        $new_facture->ville = @$request->ville;
        $new_facture->code_postale = @$request->code_postale;
        $new_facture->adresse1 = @$request->adresse1;
        $new_facture->adresse2 = @$request->adresse2;
        $new_facture->livraison = @$request->livraison;
        $new_facture->frais_livraison = @$request->frais_livraison;
        $new_facture->note = @$request->note;

        $new_facture->livraison_nom = @$request->livraison_nom;
        $new_facture->livraison_prenom = @$request->livraison_prenom;
        $new_facture->livraison_email = @$request->livraison_email;
        $new_facture->livraison_phone = @$request->livraison_phone;
        $new_facture->livraison_region = @$request->livraison_region;
        $new_facture->livraison_ville = @$request->livraison_ville;
        $new_facture->livraison_code_postale = @$request->livraison_code_postale;
        $new_facture->livraison_adresse1 = @$request->livraison_adresse1;
        $new_facture->livraison_adresse2 = @$request->livraison_adresse2;
        $new_facture->etat = 'Nouvelle Commande';
        //$new_facture->remise = $request->m_remise;

        //$new_facture->timbre = $request->timbre_fiscal;
        //$new_facture->client_id = $client_id;

        /* no */
        $nb = Commande::whereYear('created_at', date('Y'))->get()->count();
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

                $new_details = new CommandeDetail();
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
                $new_details->prix_ht = $the_price_ht;

                $new_details->prix_ttc = $the_price_ttc;
                $new_details->commande_id = $new_facture->id;
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
            $new_prix_ht = $all_price_ht;
            if($new_facture->frais_livraison){
                $new_facture->prix_ttc = $all_price_ht+ $new_facture->frais_livraison;
            }else{
                $new_facture->prix_ttc = $new_prix_ht; // + $new_somme_tva +$new_facture->timbre;

            }
        }
        $new_facture->save();
        return redirect()->route('voyager.imprimer_commande', ['id' => $new_facture->id])->with([
            'message'    => " enregistrée avec succès",
            'alert-type' => 'success',
        ]);
    }
    public function storeCommandeApi(Request $request)
    {

        //add_facture
        $new_facture = new Commande();
        $new_facture->nom = @$request->commande['nom'];
        $new_facture->prenom = @$request->commande['prenom'];
        $new_facture->email = @$request->commande['email'];
        $new_facture->phone = @$request->commande['phone'];
        $new_facture->pays = @$request->commande['pays'];
        $new_facture->region = @$request->commande['region'];
        $new_facture->ville = @$request->commande['ville'];
        $new_facture->code_postale = @$request->commande['code_postale'];
        $new_facture->adresse1 = @$request->commande['adresse1'];
        $new_facture->adresse2 = @$request->commande['adresse2'];
        $new_facture->livraison = @$request->commande['livraison'];
        $new_facture->frais_livraison = @$request->commande['frais_livraison'];
        $new_facture->note = @$request->commande['note'];

        if(@$request->commande['user_id']){
        $new_facture->user_id = @$request->commande['user_id'];

        }
        $new_facture->livraison_nom = @$request->commande['livraison_nom'];
        $new_facture->livraison_prenom = @$request->commande['livraison_prenom'];
        $new_facture->livraison_email = @$request->commande['livraison_email'];
        $new_facture->livraison_phone = @$request->commande['livraison_phone'];
        $new_facture->livraison_region = @$request->commande['livraison_region'];
        $new_facture->livraison_ville = @$request->commande['livraison_ville'];
        $new_facture->livraison_code_postale = @$request->commande['livraison_code_postale'];
        $new_facture->livraison_adresse1 = @$request->commande['livraison_adresse1'];
        $new_facture->livraison_adresse2 = @$request->commande['livraison_adresse2'];
        $new_facture->etat = 'nouvelle_commande';

        //$new_facture->remise = $request->m_remise;

        //$new_facture->timbre = $request->timbre_fiscal;
        //$new_facture->client_id = $client_id;

        /* no */
        $nb = Commande::whereYear('created_at', date('Y'))->get()->count();
        $nb = $nb + 1;
        $nb = str_pad($nb, 4, '0', STR_PAD_LEFT);
        $new_facture->numero = date('Y') . '/' . $nb;
        /*  */
        $new_facture->save();

        //add_achats
        $all_price_tva = 0;
        $all_price_ht = 0;
        $all_price_ttc = 0;

        foreach ($request->panier as $panier) {
            $new_details = new CommandeDetail();
                $new_details->produit_id = $panier['produit_id'];
              //  $produit = Product::find($new_details->produit_id);

                $new_details->qte = $panier['quantite'];
                $new_details->prix_unitaire = $panier['prix_unitaire'];
                $the_price_ht = $panier['quantite'] * $panier['prix_unitaire'];

                $the_price_ttc = $the_price_ht;
                $new_details->prix_ht = $the_price_ht;

                $new_details->prix_ttc = $the_price_ttc;
                $new_details->commande_id = $new_facture->id;
                //   $all_price_tva += $mantant_tva;
                $all_price_ht += $the_price_ht;
                $all_price_ttc += $the_price_ttc;
                $new_details->save();


              /*   $produit->qte = $produit->qte - $new_details->qte;
                $produit->save(); */
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
            if($new_facture->frais_livraison){
                $new_facture->prix_ttc = $new_prix_ht + $new_facture->frais_livraison;
            }else{
                $new_facture->prix_ttc = $new_prix_ht; // + $new_somme_tva +$new_facture->timbre;

            }
        } else {
            $new_prix_ht = $all_price_ht;
            if($new_facture->frais_livraison){
                $new_facture->prix_ttc = $all_price_ht+ $new_facture->frais_livraison;
            }else{
                $new_facture->prix_ttc = $new_prix_ht; // + $new_somme_tva +$new_facture->timbre;

            }

        }
        $new_facture->save();

        //************sms********************* */
        $msg  = Message::first();
        $text = $msg->msg_passez_commande ;
        $sms = str_replace("[nom]" , $new_facture->nom , $text);
        $sms = str_replace("[prenom]" , $new_facture->prenom , $sms);
        $sms = str_replace("[num_commande]" , $new_facture->numero , $sms);
        (new SmsService())->send_sms($new_facture->phone , $sms);

        $details = CommandeDetail::where('commande_id' , $new_facture->id)->get();
         $dataa = [
            'titre' => 'Nouvelle commande',
            'commande' => $new_facture,
            'details'=>  $details
        ];

        Mail::to('bitoutawalid@gmail.com')->send(new SoumissionMail($dataa));
        return [
            'id'=> $new_facture->id,
            'message'    => "Merci pour votre commande",
            'alert-type' => 'success',
        ];
    }

    public function updateFacture(Request $request, $id)
    {



        //add_facture

        $new_facture = Commande::find($id);

        /* $new_facture->pays = @$request->pays;
        $new_facture->region = @$request->region;
        $new_facture->ville = @$request->ville;
        $new_facture->code_postale = @$request->code_postale; */
        $new_facture->adresse1 = @$request->adresse1;
      /*   $new_facture->adresse2 = @$request->adresse2;
        $new_facture->livraison = @$request->livraison;
        $new_facture->frais_livraison = @$request->frais_livraison; */
        $new_facture->note = @$request->note;

       /*  $new_facture->livraison_nom = @$request->livraison_nom;
        $new_facture->livraison_prenom = @$request->livraison_prenom;
        $new_facture->livraison_email = @$request->livraison_email;
        $new_facture->livraison_phone = @$request->livraison_phone;

        $new_facture->livraison_region = @$request->livraison_region;
        $new_facture->livraison_ville = @$request->livraison_ville;
        $new_facture->livraison_code_postale = @$request->livraison_code_postale; */
        $new_facture->livraison_adresse1 = @$request->livraison_adresse1;
      /*   $new_facture->livraison_adresse2 = @$request->livraison_adresse2; */
        if($new_facture->etat != $request->etat){
            $new_facture->historique = $new_facture->historique .';'.$request->etat.','.date('Y-m-d h:i:s', time());
        }
        $new_facture->etat =  @$request->etat;

        $new_facture->save();

        //add_achats
        $all_price_tva = 0;
        $all_price_ht = 0;
        $all_price_ttc = 0;

        $old_details = CommandeDetail::where('commande_id', $new_facture->id)->get();
        foreach ($old_details as $old) {
            $produit = Product::find($old->produit_id);
            if ($produit) {
                $produit->qte = $produit->qte + $old->qte;
                $produit->save();
            }

            $old->delete();
        }
        for ($i = 1; $i <= $request->nb_achat + $request->nb_delete; $i++) {
            if ($request->input('produit_id_' . $i) && ($request->input('qte' . $i))) {

                $new_details = new CommandeDetail();
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
                $new_details->prix_ht = $the_price_ht;

                $the_price_ttc = $the_price_ht;
                $new_details->prix_ttc = $the_price_ttc;
                $new_details->commande_id = $new_facture->id;
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
            $new_prix_ht = $all_price_ht;
            if($new_facture->frais_livraison){
                $new_facture->prix_ttc = $all_price_ht+ $new_facture->frais_livraison;
            }else{
                $new_facture->prix_ttc = $new_prix_ht; // + $new_somme_tva +$new_facture->timbre;

            }
        }

        $new_facture->save();



        if($request->send_notif != null){

            if($new_facture->phone){
                $etat = '';
                if($new_facture->etat == "nouvelle_commande" ) { $etat = "Nouvelle Commande" ; }
                if($new_facture->etat == "en_cours_de_preparation" ) { $etat = "En cours de préparations" ; }
                if($new_facture->etat == "prete" ) { $etat = "Prête" ; }
                if($new_facture->etat == "en_cours_de_livraison" ) { $etat = "En cours de livraison" ; }
                if($new_facture->etat == "expidee" ) { $etat = "Expidée" ; }
                if($new_facture->etat == "annuler" ) { $etat = "Annuler" ; }
                $msg  = Message::first();
                $text = $msg->msg_etat_commande ;

                $sms = str_replace("[nom]" , $new_facture->nom , $text);
                $sms = str_replace("[prenom]" , $new_facture->prenom , $sms);
                $sms = str_replace("[num_commande]" , $new_facture->numero , $sms);
                $sms = str_replace("[etat]" , $etat , $sms);

                //$sms = 'Cher(e) '.$new_facture->nom .' '.$new_facture->prenom.', Votre commande numéro '.$new_facture->numero.' est '.$etat .'. Merci pour votre confiance';
                (new SmsService())->send_sms($new_facture->phone , $sms);
            }
        }

        return redirect()->route('voyager.imprimer_commande', ['id' => $new_facture->id])->with([
            'message'    => " enregistrée avec succès",
            'alert-type' => 'success',
        ]);
    }

    public function editFacture($id)
    {
        $facture = Commande::find($id);
        $details_facture = CommandeDetail::where('commande_id', $id)->get();
        $edit_length = $details_facture->count();
        $edit = true;
        $produits = Product::all();

        return view('admin.commande', ['facture' => $facture, 'edit_length' => $edit_length, 'details_facture' => $details_facture, 'edit' => $edit, 'produits' => $produits]);
    }




    public function imprimerFacture($id)
    {
        $facture = Commande::find($id);
        $details_facture = CommandeDetail::where('commande_id', $id)->get();
        $edit_length = $details_facture->count();
        $edit = true;
        $produits = Product::all();

        return view('admin.imprimer_commande', ['facture' => $facture, 'edit_length' => $edit_length, 'details_facture' => $details_facture, 'edit' => $edit, 'produits' => $produits]);
    }


    public function details($id)
    {
        $facture = Commande::find($id);
        $details_facture = CommandeDetail::where('commande_id', $id)->with('produit')->get();


        return ['facture' => $facture,  'details_facture' => $details_facture];
    }
}
