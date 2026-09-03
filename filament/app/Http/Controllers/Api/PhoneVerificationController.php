<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PhoneVerificationService;
use Illuminate\Http\Request;

class PhoneVerificationController extends Controller
{
    public function send(Request $request, PhoneVerificationService $service)
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:20']]);
        return response()->json($service->send($request->user(), $data['phone'], (string) $request->ip()));
    }

    public function verify(Request $request, PhoneVerificationService $service)
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        return response()->json($service->verify($request->user(), $data['code']));
    }
}
