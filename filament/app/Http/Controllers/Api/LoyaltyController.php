<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyCard;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Boutique / staff loyalty API only. Storefront loyalty routes were removed.
 */
class LoyaltyController extends Controller
{
    public function __construct(private readonly LoyaltyService $loyalty) {}

    /**
     * GET /loyalty/qr/{token} — QR image (requires web auth; see routes/web.php).
     */
    public function qrImage(string $token)
    {
        $card = LoyaltyCard::where('qr_token', $token)->first();
        if (! $card) {
            abort(404);
        }

        if (class_exists(\chillerlan\QRCode\QRCode::class)) {
            $qrCode = new \chillerlan\QRCode\QRCode();
            $svg    = $qrCode->render($token);

            return response($svg, 200)->header('Content-Type', 'image/svg+xml');
        }

        return redirect('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . urlencode($token));
    }

    /**
     * POST /api/loyalty/scan — staff scan QR to resolve card + client + balance.
     */
    public function scan(Request $request): JsonResponse
    {
        $request->validate(['qr_token' => ['required', 'string']]);

        $card = LoyaltyCard::with('client')->where('qr_token', $request->qr_token)->first();
        if (! $card) {
            return response()->json(['error' => 'Carte introuvable.'], 404);
        }

        $points = $this->loyalty->getBalance($card->client_id);
        $value  = $this->loyalty->getMonetaryValue($card->client_id);

        return response()->json([
            'card'   => [
                'card_number' => $card->card_number,
                'status'      => $card->status instanceof \App\Enums\LoyaltyCardStatus ? $card->status->value : $card->status,
            ],
            'client' => [
                'id'    => $card->client->id,
                'name'  => $card->client->name,
                'phone' => $card->client->phone_1,
                'email' => $card->client->email,
            ],
            'points'         => $points,
            'monetary_value' => $value,
        ]);
    }
}
