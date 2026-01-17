<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Message;
use App\Services\SmsService;
use Illuminate\Http\Request;
use TCG\Voyager\Http\Controllers\VoyagerBaseController;

class AdminController extends  VoyagerBaseController
{
    public function store(Request $request)
    {
        // Let Voyager handle everything first
        $response = parent::store($request);

        
        // Get the DataType
        $slug = $this->getSlug($request);
        $dataType = \TCG\Voyager\Models\DataType::where('slug', $slug)->first();

        if ($dataType && $dataType->slug === 'clients') {
            // Get last inserted data
            $data = $dataType->model_name::latest('id')->first();

            if ($data && $data->phone_1) {
                $msg = Message::first();

                $sms = $msg && $msg->msg_welcome
                    ? $msg->msg_welcome
                    : 'Cher(e) client(e), nous vous remercions de votre confiance et nous serons ravis de vous revoir dans notre boutique SOBITAS ou notre site Web Protein.tn';

                (new SmsService())->send_sms($data->phone_1, $sms);
            }
        }

        return $response;
    }
}
