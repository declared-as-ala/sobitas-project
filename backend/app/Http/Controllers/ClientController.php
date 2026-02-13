<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Client;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class ClientController extends Controller
{
    /**
     * Login user and return token.
     */
    public function login(LoginRequest $request): JsonResponse|array
    {
        if (Auth::attempt($request->only('email', 'password'))) {
            /** @var User $user */
            $user = Auth::user();
            $accessToken = $user->createToken('authToken')->plainTextToken;

            return ['token' => $accessToken, 'name' => $user->name, 'id' => $user->id];
        }

        return response()->json(['message' => 'Données invalides, vérifiez votre email et mot de passe'], 403);
    }

    /**
     * Register a new user.
     */
    public function register(RegisterRequest $request): JsonResponse|array
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'role_id' => $validated['role_id'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('authToken')->plainTextToken;

        return ['token' => $token, 'name' => $user->name, 'id' => $user->id];
    }

    /**
     * Update user profile.
     */
    public function update_profile(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        /** @var User $user */
        $user = User::findOrFail(Auth::id());
        $user->update([
            'name' => $request->input('name'),
            'phone' => $request->input('phone'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
        ]);

        return $user;
    }

    /**
     * Get current user profile.
     */
    public function profil()
    {
        return Auth::user();
    }

    /**
     * Get client's commandes.
     */
    public function client_commandes()
    {
        return Commande::where('user_id', Auth::id())->get();
    }

    /**
     * Get commande details.
     */
    public function detail_commande(int $id): array
    {
        $commande = Commande::findOrFail($id);
        $details = CommandeDetail::where('commande_id', $commande->id)->get();

        return ['commande' => $commande, 'details' => $details];
    }

    /**
     * Client purchase history by phone number (admin view).
     */
    public function historique(Request $request)
    {
        $request->validate(['tel' => 'required|string']);

        $tel = $this->normalizePhone($request->tel);

        $commandes = Commande::where('phone', 'LIKE', '%' . $tel . '%')->get();

        $tickets = Ticket::join('clients', 'tickets.client_id', '=', 'clients.id')
            ->where(function ($q) use ($tel) {
                $q->where('clients.phone_1', 'LIKE', '%' . $tel . '%')
                    ->orWhere('clients.phone_2', 'LIKE', '%' . $tel . '%');
            })
            ->select('tickets.*')
            ->get();

        $factures = Facture::join('clients', 'factures.client_id', '=', 'clients.id')
            ->where(function ($q) use ($tel) {
                $q->where('clients.phone_1', 'LIKE', '%' . $tel . '%')
                    ->orWhere('clients.phone_2', 'LIKE', '%' . $tel . '%');
            })
            ->select('factures.*')
            ->get();

        $factureTvas = FactureTva::join('clients', 'facture_tvas.client_id', '=', 'clients.id')
            ->where(function ($q) use ($tel) {
                $q->where('clients.phone_1', 'LIKE', '%' . $tel . '%')
                    ->orWhere('clients.phone_2', 'LIKE', '%' . $tel . '%');
            })
            ->select('facture_tvas.*')
            ->get();

        $user = User::where('phone', 'LIKE', '%' . $tel . '%')->first();
        if (!$user) {
            $user = Client::where('phone_1', 'LIKE', '%' . $tel . '%')
                ->orWhere('phone_2', 'LIKE', '%' . $tel . '%')
                ->first();
        }

        return view('historique_client', [
            'commandes' => $commandes,
            'tickets' => $tickets,
            'factures' => $factures,
            'facture_tvas' => $factureTvas,
            'user' => $user,
            'tel' => $tel,
        ]);
    }

    /**
     * Strip country code prefix from phone number.
     */
    private function normalizePhone(string $tel): string
    {
        if (str_starts_with($tel, '+216')) {
            $tel = substr($tel, 4);
        } elseif (str_starts_with($tel, '216')) {
            $tel = substr($tel, 3);
        }

        return $tel;
    }
}
