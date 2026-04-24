<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StorefrontPasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
    }

    public function test_forgot_password_returns_generic_message_for_unknown_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'not-registered-' . uniqid('', true) . '@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Si un compte correspond à cet e-mail, un lien de réinitialisation a été envoyé.');
    }

    public function test_forgot_password_sends_mail_for_existing_user(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'storefront-reset-' . uniqid('', true) . '@example.com',
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertOk();
    }
}
