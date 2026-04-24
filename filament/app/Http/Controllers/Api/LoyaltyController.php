<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyPointTransaction;
use App\Models\User;
use App\Services\CustomerUserLinkService;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LoyaltyController extends Controller
{
    public function __construct(private readonly LoyaltyService $loyalty) {}

    /**
     * GET /api/loyalty/card — return the authenticated client's loyalty card + points.
     */
    public function card(Request $request): JsonResponse
    {
        $clientId = $this->resolveClientId($request);
        if (! $clientId) {
            return response()->json(['error' => 'Client introuvable.'], 404);
        }

        $client = Client::find($clientId);
        if (! $client) {
            return response()->json(['error' => 'Client introuvable.'], 404);
        }

        $card    = $this->loyalty->getOrCreateCard($client);
        $points  = $this->loyalty->getBalance($clientId);
        $value   = $this->loyalty->getMonetaryValue($clientId);
        $minRedeem = (int) config('loyalty.min_points_to_redeem', 100);

        return response()->json([
            'card' => [
                'id'          => $card->id,
                'card_number' => $card->card_number,
                'qr_token'    => $card->qr_token,
                'status'      => $card->status instanceof \App\Enums\LoyaltyCardStatus ? $card->status->value : $card->status,
                'issued_at'   => $card->issued_at?->toDateString(),
                'qr_url'      => route('loyalty.qr', $card->qr_token),
            ],
            'points'         => $points,
            'monetary_value' => $value,
            'can_redeem'     => $points >= $minRedeem,
            'min_redeem'     => $minRedeem,
            'rate_info'      => '10 points = 1 DT de réduction',
        ]);
    }

    /**
     * GET /api/loyalty/transactions — point transaction history.
     */
    public function transactions(Request $request): JsonResponse
    {
        $clientId = $this->resolveClientId($request);
        if (! $clientId) {
            return response()->json(['error' => 'Client introuvable.'], 404);
        }

        $txs = LoyaltyPointTransaction::where('client_id', $clientId)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($tx) => [
                'id'             => $tx->id,
                'type'           => $tx->type instanceof \App\Enums\LoyaltyTransactionType ? $tx->type->value : $tx->type,
                'type_label'     => $tx->type instanceof \App\Enums\LoyaltyTransactionType ? $tx->type->label() : $tx->type,
                'points'         => $tx->points,
                'monetary_value' => $tx->monetary_value,
                'description'    => $tx->description,
                'date'           => $tx->created_at?->toDateTimeString(),
                'order_number'   => $tx->order?->numero,
            ]);

        return response()->json(['transactions' => $txs]);
    }

    /**
     * POST /api/loyalty/validate-redemption — validate how many points can be used.
     */
    public function validateRedemption(Request $request): JsonResponse
    {
        $request->validate([
            'points'     => ['required', 'integer', 'min:1'],
            'subtotal'   => ['required', 'numeric', 'min:0'],
        ]);

        $clientId = $this->resolveClientId($request);
        if (! $clientId) {
            return response()->json(['error' => 'Client introuvable.'], 404);
        }

        $result = $this->loyalty->validateRedemption(
            $clientId,
            (float) $request->input('subtotal'),
            (int) $request->input('points')
        );

        return response()->json($result);
    }

    /**
     * GET /loyalty/qr/{token} — serve a QR code image (public, but token-secured).
     */
    public function qrImage(string $token)
    {
        $card = LoyaltyCard::where('qr_token', $token)->first();
        if (! $card) {
            abort(404);
        }

        // Generate QR as SVG using a simple URL-based approach or chillerlan/php-qrcode if available
        if (class_exists(\chillerlan\QRCode\QRCode::class)) {
            $qrCode = new \chillerlan\QRCode\QRCode();
            $svg    = $qrCode->render($token);
            return response($svg, 200)->header('Content-Type', 'image/svg+xml');
        }

        // Fallback: redirect to an external QR generator (no sensitive data in token)
        return redirect('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . urlencode($token));
    }

    // ── Admin: scan QR and get client info ───────────────

    /**
     * POST /api/loyalty/scan — admin/staff scan QR code to get client info.
     * Requires auth:sanctum admin.
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

    /**
     * POST /api/loyalty/admin/add-points — admin manually add/deduct points.
     * Requires auth:sanctum.
     */
    public function adminAddPoints(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'   => ['required', 'integer', 'exists:clients,id'],
            'points'      => ['required', 'integer'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $clientId = (int) $request->client_id;
        $points   = (int) $request->points;

        $this->loyalty->adjustPoints(
            $clientId,
            $points,
            $request->input('description', 'Ajustement admin'),
            auth()->id()
        );

        return response()->json([
            'success' => true,
            'balance' => $this->loyalty->getBalance($clientId),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────

    private function resolveClientId(Request $request): ?int
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return null;
        }

        if ($user->client) {
            return (int) $user->client->id;
        }

        return (int) app(CustomerUserLinkService::class)->linkOrCreateClientForUser($user)->id;
    }
}
