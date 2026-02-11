<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class ClientController extends Controller
{
    private const DEFAULT_PER_PAGE = 20;
    private const MAX_PER_PAGE = 100;

    private function resolvePerPage(Request $request, int $default = self::DEFAULT_PER_PAGE): int
    {
        $perPage = (int) $request->query('per_page', $request->query('limit', $default));

        if ($perPage < 1) {
            $perPage = $default;
        }

        return min($perPage, self::MAX_PER_PAGE);
    }

    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'page'      => $paginator->currentPage(),
            'per_page'  => $paginator->perPage(),
            'total'     => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }

    private function paginationLinks(LengthAwarePaginator $paginator): array
    {
        return [
            'first' => $paginator->url(1),
            'last'  => $paginator->url($paginator->lastPage()),
            'prev'  => $paginator->previousPageUrl(),
            'next'  => $paginator->nextPageUrl(),
        ];
    }

    private function paginatedResponse(LengthAwarePaginator $paginator, string $dataKey = 'data'): array
    {
        return [
            $dataKey => $paginator->items(),
            'meta'   => $this->paginationMeta($paginator),
            'links'  => $this->paginationLinks($paginator),
        ];
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt(['email' => $request->input('email'), 'password' => $request->input('password')])) {
            $user = Auth::user();
            $accessToken = $user->createToken('authToken')->plainTextToken;

            return response()->json([
                'token' => $accessToken,
                'name'  => $user->name,
                'id'    => $user->id,
            ]);
        }

        return response()->json(['message' => 'Données invalides, vérifiez votre email et mot de passe'], 403);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'phone'    => ['required', 'string', 'max:20'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'role_id'  => 2, // Always assign default customer role — never accept from client
            'phone'    => $validated['phone'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('authToken')->plainTextToken;

        return response()->json([
            'token' => $token,
            'name'  => $user->name,
            'id'    => $user->id,
        ], 201);
    }

    public function update_profile(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name'     => ['sometimes', 'required', 'string', 'max:255'],
            'phone'    => ['sometimes', 'string', 'max:20'],
            'email'    => ['sometimes', 'required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['phone'])) {
            $user->phone = $validated['phone'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
        ]);
    }

    public function profil(): JsonResponse
    {
        $user = Auth::user();

        // Never expose password hash or other sensitive fields
        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
        ]);
    }

    /**
     * Client order history — FIXED: added limit (was unbounded ->get()).
     */
    public function client_commandes(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $commandes = Commande::where('user_id', Auth::id())
            ->select('id', 'numero', 'etat', 'prix_ttc', 'created_at', 'region')
            ->latest()
            ->paginate($perPage);

        return $this->paginatedResponse($commandes);
    }

    public function detail_commande(int $id): JsonResponse
    {
        $commande = Commande::where('id', $id)
            ->where('user_id', Auth::id())
            ->select('id', 'numero', 'nom', 'prenom', 'email', 'phone', 'region', 'ville', 'etat', 'prix_ht', 'prix_ttc', 'frais_livraison', 'created_at')
            ->first();

        if (! $commande) {
            return response()->json(['message' => 'Commande introuvable'], 404);
        }

        $details = CommandeDetail::where('commande_id', $commande->id)
            ->select('id', 'commande_id', 'produit_id', 'qte', 'prix_unitaire', 'prix_ht', 'prix_ttc')
            ->with('product:id,designation_fr,cover,prix,promo')
            ->get();

        return response()->json(['commande' => $commande, 'details' => $details]);
    }

    /**
     * Client history by phone number.
     * FIXED: added column selection + limits (was SELECT * + unbounded).
     */
    public function historique(Request $request): JsonResponse
    {
        $request->validate([
            'tel' => ['required', 'string', 'max:20'],
        ]);

        $tel = $request->tel;

        if (str_starts_with($tel, '+216')) {
            $tel = substr($tel, 4);
        } elseif (str_starts_with($tel, '216')) {
            $tel = substr($tel, 3);
        }

        if (mb_strlen($tel) < 4) {
            return response()->json(['error' => 'Numéro trop court'], 422);
        }

        $commandes = Commande::where('phone', 'LIKE', "%{$tel}%")
            ->select('id', 'numero', 'etat', 'prix_ttc', 'created_at', 'phone')
            ->latest()
            ->limit(100)
            ->get();

        $tickets = Ticket::whereHas('client', function ($q) use ($tel) {
            $q->where('phone_1', 'LIKE', "%{$tel}%")
              ->orWhere('phone_2', 'LIKE', "%{$tel}%");
        })
            ->select('id', 'numero', 'client_id', 'prix_ttc', 'created_at')
            ->with('client:id,name,phone_1')
            ->latest()
            ->limit(100)
            ->get();

        $factures = Facture::whereHas('client', function ($q) use ($tel) {
            $q->where('phone_1', 'LIKE', "%{$tel}%")
              ->orWhere('phone_2', 'LIKE', "%{$tel}%");
        })
            ->select('id', 'numero', 'client_id', 'prix_ttc', 'created_at')
            ->with('client:id,name,phone_1')
            ->latest()
            ->limit(100)
            ->get();

        $facture_tvas = FactureTva::whereHas('client', function ($q) use ($tel) {
            $q->where('phone_1', 'LIKE', "%{$tel}%")
              ->orWhere('phone_2', 'LIKE', "%{$tel}%");
        })
            ->select('id', 'numero', 'client_id', 'prix_ttc', 'created_at')
            ->with('client:id,name,phone_1')
            ->latest()
            ->limit(100)
            ->get();

        $user = User::where('phone', 'LIKE', "%{$tel}%")
            ->select('id', 'name', 'email', 'phone')
            ->first();

        if (! $user) {
            $user = Client::where('phone_1', 'LIKE', "%{$tel}%")
                ->orWhere('phone_2', 'LIKE', "%{$tel}%")
                ->select('id', 'name', 'phone_1', 'phone_2')
                ->first();
        }

        return response()->json([
            'commandes'    => $commandes,
            'tickets'      => $tickets,
            'factures'     => $factures,
            'facture_tvas' => $facture_tvas,
            'user'         => $user,
            'tel'          => $tel,
        ]);
    }
}
