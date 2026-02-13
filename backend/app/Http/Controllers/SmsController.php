<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\SmsService;
use Illuminate\Http\Request;

class SmsController extends Controller
{
    public function __construct(
        private readonly SmsService $smsService,
    ) {}

    /**
     * Send SMS to all opted-in clients.
     */
    public function sendSms(Request $request)
    {
        $request->validate(['sms' => 'required|string']);

        $clients = Client::where('sms', true)->get();

        foreach ($clients as $client) {
            if ($client->phone_1) {
                $this->smsService->send($client->phone_1, $request->sms);
            }
        }

        return back()->with([
            'message' => 'SMS ont été envoyés avec succès !',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Send SMS to specific clients.
     */
    public function sendSmsSpecific(Request $request)
    {
        $request->validate([
            'sms' => 'required|string',
            'clients' => 'required|array',
            'clients.*' => 'integer|exists:clients,id',
        ]);

        foreach ($request->clients as $clientId) {
            $client = Client::find($clientId);

            if ($client?->phone_1) {
                $this->smsService->send($client->phone_1, $request->sms);
            }
        }

        return back()->with([
            'message' => 'SMS ont été envoyés avec succès !',
            'alert-type' => 'success',
        ]);
    }
}
