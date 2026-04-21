<?php

namespace App\Imports;

use App\Client;
use Maatwebsite\Excel\Concerns\ToModel;

class ClientsImport implements ToModel
{
    /**
    * @param array $row
    *
    * @return \Illuminate\Database\Eloquent\Model|null
    */
    public function model(array $row)
    {



        $name = @$row[0] .' ' .@$row[1];
        $phone = $this->reform(@$row[2]);


        if($name == ' '){
            $name = 'Ahmed';
        }
        if($phone != false){
            $exist = Client::where('phone_1' , $phone)->first();
            if(!$exist){
                return new Client([
                    //
                    "name" => $name,

                    "phone_1" => $phone,
                ]);
            }else{
                return;
            }

        }else{
            return;
        }

    }

    public function reform($tel){

        $tel = str_replace(" " , "" , $tel);
        if(strlen($tel) == 12 && $tel[0] == '+' && $tel[1] == '2' && $tel[2] == '1'  && $tel[3] == '6'){
            return $tel;
        }else  if(strlen($tel) == 11 &&  $tel[0] == '2' && $tel[1] == '1'  && $tel[2] == '6'){
            $tel = '+'.$tel;
            return $tel;
        } else if(strlen($tel) == 8 ){
            $tel = '+216'.$tel;
            return $tel;
        }

        return false;
    }
}
