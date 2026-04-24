<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\StorefrontPasswordMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;

class StorefrontPasswordController extends Controller
{
    /**
     * POST /api/forgot-password — always same JSON message (no email enumeration).
     */
    public function forgot(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = $request->input('email');
        $user = User::whereRaw('LOWER(email) = ?', [mb_strtolower((string) $email)])->first();

        if ($user) {
            try {
                app(StorefrontPasswordMailer::class)->sendResetLinkForUser($user);
            } catch (\Throwable $e) {
                Log::error('StorefrontPasswordController: forgot mail failed', [
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Si un compte correspond à cet e-mail, un lien de réinitialisation a été envoyé.',
        ]);
    }

    /**
     * POST /api/reset-password
     */
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token'                 => ['required', 'string'],
            'email'                 => ['required', 'email', 'max:255'],
            'password'              => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $status = Password::broker('users')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)]);
        }

        return response()->json(['message' => __($status)], 422);
    }
}
