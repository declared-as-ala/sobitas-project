<?php

namespace App\Http\Controllers;

use App\Client;
use App\Coordinate;
use App\DetailsTicket;
use App\Ticket;
use App\Product;
use Illuminate\Http\Request;
use App\Services\SmsService;
use TCG\Voyager\Http\Controllers\Traits\BreadRelationshipParser;
use App\Message;

class AdminTicketController extends Controller
{
    use BreadRelationshipParser;

    public function showTicket(){

        $edit = 0;
        $produits = Product::where('qte', '>', 0)->get();
        return view('admin.ticket'  , ['edit'=>$edit , 'produits'=>$produits]);
    }

    public function storeTicket(Request $request){
        //add client
        if($request->new_client == 1 ){
            $new_client = new Client();
            $new_client->name = $request->name;
            $new_client->adresse = $request->adresse;
            $new_client->phone_1 = $request->phone_1;
            $new_client->matricule = $request->matricule;
            $new_client->save();
            $client_id= $new_client->id;


            // env sms

            if($new_client->phone_1){
                $msg = Message::first();
                if($msg && $msg->msg_welcome){
                    $sms = $msg->msg_welcome;

                }else{
                  $sms = 'Cher(e) client(e), nous vous remercions de votre confiance et nous serons ravis de vous revoir dans notre boutique SOBITAS ou notre site Web Protein.tn';
                }
                // $sms = 'Cher(e) client(e), nous vous remercions de votre confiance et nous serons ravis de vous revoir dans notre boutique SOBITAS ou notre site Web Protein.tn';

                (new SmsService())->send_sms($new_client->phone_1 , $sms);
            }

            // env sms

        }else{
            $client_id=$request->client_id;
        }
        //add_ticket
        $new_ticket = new Ticket();
        $new_ticket->remise = $request->m_remise;
        $new_ticket->pourcentage_remise = $request->pourcent_remise;
        $new_ticket->timbre = $request->timbre_fiscal;
        $new_ticket->client_id = $client_id;

        /* no */
        $nb = Ticket::whereYear('created_at', date('Y'))->get()->count();
        $nb = $nb + 1 ;
        $nb = str_pad($nb,4,'0', STR_PAD_LEFT);
        $new_ticket->numero = date('Y') . '/' . $nb ;
       /* è§§§§§ */
        $new_ticket->save();

        //add_achats
        $all_price_tva = 0;
        $all_price_ht = 0;
        $all_price_ttc = 0;
        for($i = 1; $i <= $request->nb_achat+ $request->nb_delete; $i++){
            if ($request->input('produit_id_' . $i) && ($request->input('qte' . $i))) {

            $new_details = new DetailsTicket();
            $new_details->produit_id = $request->input('produit_id_'.$i);
            $produit = Product::find( $new_details->produit_id);


            $new_details->qte = $request->input('qte'.$i);
            $new_details->prix_unitaire = $request->input('prix_unitaire'.$i);
            $the_price_ht = $request->input('qte'.$i) * $request->input('prix_unitaire'.$i);
            // $new_details->prix_ht = $the_price_ht;
            // $taux = Coordinate::first()->tva;
            // $new_details->tva = $taux;
            // $mantant_tva = ($the_price_ht * $taux) / 100;
            // $the_price_ttc = $the_price_ht + $mantant_tva;
            $the_price_ttc = $the_price_ht;
            $new_details->prix_ttc = $the_price_ttc;
            $new_details->ticket_id = $new_ticket->id;
            // $all_price_tva += $mantant_tva;
            $all_price_ht += $the_price_ht;
            $all_price_ttc += $the_price_ttc;
            $new_details->save();



            $produit->qte = $produit->qte - $new_details->qte;
            $produit->save();
            }
        }

        // $new_ticket->tva = $all_price_tva;
        $new_ticket->prix_ht = $all_price_ht;
        if($request->m_remise>0){
            $new_prix_ht=$all_price_ht - $new_ticket->remise;
            if($all_price_ht != 0){
                $pourcentage=$new_ticket->remise / $all_price_ht;
            }else{
                $pourcentage=0;
            }
            // $new_somme_tva=$all_price_tva-($all_price_tva * $pourcentage);
            // $new_ticket->tva=$new_somme_tva;
            $new_ticket->prix_ttc=$new_prix_ht; //+ $new_somme_tva +$new_ticket->timbre;
        }else{
            $new_ticket->prix_ttc=$all_price_ht; //+ $all_price_tva +$new_ticket->timbre;
        }
        $new_ticket->save();
        return redirect()->route('voyager.imprimer_ticket', ['id' =>$new_ticket->id])->with([
            'message'    => " enregistrée avec succès",
            'alert-type' => 'success', ]);
    }


    public function updateTicket(Request $request , $id){



        //add_ticket

        $new_ticket = Ticket::find($id);
        $new_ticket->remise = $request->m_remise;
        $new_ticket->pourcentage_remise = $request->pourcent_remise;

        $new_ticket->save();

        //add_achats
        $all_price_tva = 0;
        $all_price_ht = 0;
        $all_price_ttc = 0;

        $old_details = DetailsTicket::where('ticket_id' , $new_ticket->id)->get();
        foreach ($old_details as $old) {

            $produit = Product::find( $old->produit_id);
            if($produit){
                $produit->qte = $produit->qte + $old->qte;
                $produit->save();
            }


            $old->delete();
        }
      //  DetailsTicket::where('ticket_id' , $new_ticket->id)->delete();
        for($i = 1; $i <= $request->nb_achat+ $request->nb_delete; $i++){
            if ($request->input('produit_id_' . $i) && ($request->input('qte' . $i))) {

            $new_details = new DetailsTicket();
            $new_details->produit_id = $request->input('produit_id_'.$i);
            $produit = Product::find( $new_details->produit_id);

            $new_details->qte = $request->input('qte'.$i);
            $new_details->prix_unitaire = $request->input('prix_unitaire'.$i);
            $the_price_ht = $request->input('qte'.$i) * $request->input('prix_unitaire'.$i);
            //$new_details->prix_ht = $the_price_ht;
            //$taux = Coordinate::first()->tva;
            //$new_details->tva = $taux;
            //$mantant_tva = ($the_price_ht * $taux) / 100;
            //$the_price_ttc = $the_price_ht + $mantant_tva;
            $the_price_ttc = $the_price_ht;
            $new_details->prix_ttc = $the_price_ttc;
            $new_details->ticket_id = $new_ticket->id;
            //$all_price_tva += $mantant_tva;
            $all_price_ht += $the_price_ht;
            $all_price_ttc += $the_price_ttc;
            $new_details->save();




            $produit->qte = $produit->qte - $new_details->qte;
            $produit->save();
            }
        }

        //$new_ticket->tva = $all_price_tva;
        $new_ticket->prix_ht = $all_price_ht;
        if($request->m_remise>0){
            $new_prix_ht=$all_price_ht - $new_ticket->remise;
            if($all_price_ht != 0){
                $pourcentage=$new_ticket->remise / $all_price_ht;
            }else{
                $pourcentage=0;
            }
          //  $new_somme_tva=$all_price_tva-($all_price_tva * $pourcentage);
            //$new_ticket->tva=$new_somme_tva;
            $new_ticket->prix_ttc=$new_prix_ht;// + $new_somme_tva +$new_ticket->timbre;
        }else{
            $new_ticket->prix_ttc=$all_price_ht;// + $all_price_tva +$new_ticket->timbre;
        }
        $new_ticket->save();
        return redirect()->route('voyager.imprimer_ticket', ['id' =>$new_ticket->id])->with([
            'message'    => " enregistrée avec succès",
            'alert-type' => 'success', ]);
    }

    public function editTicket($id){
        $ticket = Ticket::find($id);
        $details_ticket = DetailsTicket::where('ticket_id', $id)->get();
        $edit_length = $details_ticket->count();
        $edit = true;
        $produits = Product::all();

        return view('admin.ticket', [ 'ticket' => $ticket , 'edit_length'=>$edit_length , 'details_ticket' =>$details_ticket , 'edit'=>$edit , 'produits'=>$produits ]);
    }




    public function imprimerTicket($id){
        $ticket = Ticket::find($id);
        $details_ticket = DetailsTicket::where('ticket_id', $id)->get();
        $edit_length = $details_ticket->count();
        $edit = true;
        $produits = Product::all();

        return view('admin.imprimer_ticket', [ 'ticket' => $ticket , 'edit_length'=>$edit_length , 'details_ticket' =>$details_ticket , 'edit'=>$edit , 'produits'=>$produits ]);
    }







}
