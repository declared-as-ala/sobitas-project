<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPointTransaction;
use App\Services\PointsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PointsController extends Controller
{
    /**
     * GET /api/points/history  (auth:sanctum)
     *
     * Returns the authenticated user's points balance, its DT value and the
     * latest ~50 ledger transactions (newest first).
     */
    public function history(Request $request): JsonResponse
    {
        $user = Auth::user();
        $balance = (int) ($user->points_balance ?? 0);

        $transactions = UserPointTransaction::where('user_id', $user->getKey())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(static fn (UserPointTransaction $t) => [
                'id'            => (int) $t->id,
                'type'          => (string) $t->type,
                'points'        => (int) $t->points,
                'balance_after' => (int) $t->balance_after,
                'description'   => $t->description,
                'commande_id'   => $t->commande_id !== null ? (int) $t->commande_id : null,
                'created_at'    => optional($t->created_at)->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'balance'      => $balance,
            'value_dt'     => round($balance / PointsService::REDEEM_POINTS_PER_DT, 3),
            'transactions' => $transactions,
        ]);
    }
}
