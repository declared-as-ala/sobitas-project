<?php
namespace App\Services;
use Illuminate\Support\Facades\Http;

class SmsService {

    public function send_sms($tel , $sms){

        $tel = $tel.'';
        if($tel[0] == '+'){
          $tel = substr($tel,1, strlen($tel -1));

        }
        if($tel[0] == '0' && $tel[1] == '0'){
          $tel = substr($tel,2, strlen($tel -2));
        }
        if(strlen($tel) == 8){
          $tel = '216'.$tel;
        }

        if(strlen($tel) == 11 && $tel[0] == '2' && $tel[1] == '1'  && $tel[2] == '6'){


          //send sms


          $api_key = env('SMS_API_KEY');
          $sender_id = env('SMS_SENDER_ID');



          $api = 'https://www.winsmspro.com/sms/sms/api?action=send-sms&';
          $api = $api . 'api_key='.$api_key;
          $api = $api. '&to=' . $tel ;
          $api = $api. '&from=' . $sender_id ;
          $api = $api. '&sms=' . $sms ;


        
          $response = Http::get($api);

         

        }



      return ;

  }



}
