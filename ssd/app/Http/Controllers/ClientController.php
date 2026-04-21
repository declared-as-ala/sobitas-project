<?php

namespace App\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Auth;
use Validator;
use App\Ticket;
use App\Commande;
use App\Facture;
use App\FactureTva;
use App\CommandeDetail;
class ClientController extends Controller
{


    public function login(Request $request){
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            //'phone' => ['required'],
            'password' => ['required'],
        ]);
        // if (Auth::attempt($credentials)) {

        if (Auth::attempt(['email' => $request->input('email'), 'password' => $request->input('password')])){
            $accessToken = Auth::user()->createToken('authToken')->plainTextToken;
            $user = Auth::user();
            return ['token' => $accessToken , 'name'=>$user->name , 'id'=>$user->id];
        } else {
            return response()->json(['message' => 'Données invalides , verifier votre email et password'],403);
        }
    }
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'role_id' => 'required',
            'phone' => 'required',
            'email' => 'required|email|unique:users',
            'password' => 'required'
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Vous avez déjà un compte veuillez se connecter'] , 404);
        }
     /*    $input = $request->all();
        $input['password'] = Hash::make($request->password); */
        $user = User::create([
            'name' =>$request->name,
            'role_id' =>$request->role_id,
            'phone' =>$request->phone,
            'email' =>$request->email,
            'password' =>Hash::make($request->password)
        ]);

        $token = $user->createToken('authToken')->plainTextToken;
        $name = $user->name;
        return ['token'=>$token , 'name'=>$name , 'id'=>$user->id];
    }
    public function update_profile(Request $request){
        $the_user = User::find(Auth::user()->id);
        $the_user->name = $request->input('name');

        $the_user->phone = $request->input('phone');

        $the_user->email = $request->input('email');
        $the_user->password = Hash::make($request->input('password'));

        $the_user->save();
        return $the_user;
    }
    public function profil(){
        return Auth::user();
    }



    public function client_commandes(){

        $commandes = Commande::where('user_id' , Auth::user()->id)->get();

        return $commandes;

    }

    public function detail_commande($id){

        $commande = Commande::find($id);
        $details = CommandeDetail::where('commande_id' , $commande->id)->get();
        return ['commande'=>$commande , 'details'=>$details];

    }

    public function forgotpassword(Request $request){

    }

    public function checkVerificationCode(Request $request){

    }

    public function updatePassword(Request $request){

    }

    public function historique(Request $request){
        $tel = $request->tel;
        if($tel[0] == '+' && $tel[1] == '2' && $tel[2]=='1'  && $tel[3] == '6'){
            $tel = substr($tel,4, strlen($tel -4));
        }else if($tel[0] == '2' && $tel[1] == '1' && $tel[2]=='6' ){
            $tel = substr($tel,3, strlen($tel -3));
        } 

        $commandes = Commande::where('phone' , 'LIKE' , '%'.$tel.'%')->get();
        $tickets = Ticket::join('clients' ,'tickets.client_id' , 'clients.id')
        ->where('clients.phone_1' , 'LIKE' , '%'.$tel.'%')
        ->orWhere('clients.phone_2' , 'LIKE' , '%'.$tel.'%')
        ->select('tickets.*')
        ->get();


        $factures = Facture::join('clients' ,'factures.client_id' , 'clients.id')
        ->where('clients.phone_1' , 'LIKE' , '%'.$tel.'%')
        ->orWhere('clients.phone_2' , 'LIKE' , '%'.$tel.'%')
        ->select('factures.*')
        ->get();

        $facture_tvas = FactureTva::join('clients' ,'facture_tvas.client_id' , 'clients.id')
        ->where('clients.phone_1' , 'LIKE' , '%'.$tel.'%')
        ->orWhere('clients.phone_2' , 'LIKE' , '%'.$tel.'%')
        ->select('facture_tvas.*')
        ->get();

        $user = \App\Models\User::where('phone' , 'LIKE' , '%'.$tel.'%' )->first();
        if(!$user){
            $user = \App\Client::where('phone_1' , 'LIKE' , '%'.$tel.'%')
            ->orWhere('phone_2' , 'LIKE' , '%'.$tel.'%')
            ->first();
        }
        return view('historique_client' , ['commandes'=>$commandes , 'tickets'=>$tickets , 'factures'=>$factures , 'facture_tvas'=>$facture_tvas , 'user'=>$user , 'tel'=>$tel]);
    }


}
