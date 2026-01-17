<?php

namespace App\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Client;
use App\Services\SmsService;

class SmsController extends Controller
{

    public function sendSms(Request $request){



        $clients = Client::where('sms' , 1)->get();
        // $clients = Client::where('etat' , 1)->get();
        $send_number = 0;

        foreach ($clients as $client) {

          $tel = $client->phone_1;
          (new SmsService())->send_sms( $tel , $request->sms);

        }


        return back()->with([
            'message'    => "SMS ont été envoyer avec success !",
            'alert-type' => 'success', ]);

    }


    public function sendSmsSpecific(Request $request){





        foreach ($request->clients as $client_id) {
        $client = Client::find($client_id);

          $tel = $client->phone_1;


          (new SmsService())->send_sms( $tel , $request->sms);
        }


        return back()->with([
            'message'    => "SMS ont été envoyer avec success !",
            'alert-type' => 'success', ]);

    }


}
