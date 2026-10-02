<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPointTransaction;
use App\Services\PointsService;
use App\Services\PhoneVerificationService;
use App\Services\ProtinaWalletService;
use App\Services\WelcomeBonusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class PointsController extends Controller
{
    /**
     * GET /api/points/history  (auth:sanctum)
     *
     * Returns the authenticated user's points balance, its DT value, the Protinas v3 wallet split
     * (`wallet`) and the latest ~50 ledger transactions (newest first). The hidden migration
     * reconciliation rows (key migration:wallets:{uid}) are never listed.
     */
    public function history(Request $request): JsonResponse
    {
        $user = Auth::user();
        $balance = (int) ($user->points_balance ?? 0);
        $columns = Schema::getColumnListing('user_point_transactions');
        $hasKey = in_array('idempotency_key', $columns, true);

        $transactions = UserPointTransaction::where('user_id', $user->getKey())
            ->when($hasKey, fn ($q) => $q->where(fn ($w) => $w->whereNull('idempotency_key')
                ->orWhere('idempotency_key', 'not like', ProtinaWalletService::MIGRATION_KEY_PREFIX.'%')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(static function (UserPointTransaction $t): array {
                $attributes = $t->getAttributes();

                return [
                    'id'            => (int) $t->id,
                    'type'          => (string) $t->type,
                    'points'        => (int) $t->points,
                    'balance_after' => (int) $t->balance_after,
                    'description'   => $t->description,
                    'commande_id'   => $t->commande_id !== null ? (int) $t->commande_id : null,
                    'created_at'    => optional($t->created_at)->toIso8601String(),
                    // Protinas v3: which wallet, until when (gift), from when (held earnings).
                    'bucket'        => $attributes['bucket'] ?? PointsService::BUCKET_EARNED,
                    'expires_at'    => array_key_exists('expires_at', $attributes) ? optional($t->expires_at)->toIso8601String() : null,
                    'available_at'  => array_key_exists('available_at', $attributes) ? optional($t->available_at)->toIso8601String() : null,
                ];
            })
            ->values();

        return response()->json([
            'balance'      => $balance,
            'value_dt'     => round($balance / PointsService::pointsPerDt(), 3),
            'welcome_status' => app(PhoneVerificationService::class)->bonusStatus($user),
            'pending_welcome_points' => WelcomeBonusService::pendingPoints($user),
            'wallet'       => app(ProtinaWalletService::class)->customerPayload($user),
            'transactions' => $transactions,
        ]);
    }
}
