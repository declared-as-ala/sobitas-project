<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationOtpMail;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CustomerAuthFlowTest extends TestCase
{
    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('mail.admin_emails', []);
        $app['config']->set('cache.default', 'array');
    }

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->unsignedInteger('role_id')->default(2);
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('personal_access_tokens', function (Blueprint $table): void {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
        Schema::create('email_verification_otps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id');
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_customer_can_register_verify_email_and_login(): void
    {
        Mail::fake();

        $register = $this->postJson('/api/register', [
            'name' => 'Client Test',
            'phone' => '20 123 456',
            'email' => 'CLIENT@example.test',
            'password' => 'Protein123',
        ]);

        $register->assertCreated()
            ->assertJsonPath('requires_verification', true)
            ->assertJsonPath('verification_email_sent', true);
        $token = (string) $register->json('token');
        $this->assertNotSame('', $token);
        $this->assertDatabaseHas('users', [
            'email' => 'client@example.test',
            'phone' => '+21620123456',
            'role_id' => 2,
            'email_verified_at' => null,
        ]);

        $code = null;
        Mail::assertSent(EmailVerificationOtpMail::class, function (EmailVerificationOtpMail $mail) use (&$code): bool {
            $code = $mail->code;

            return $mail->hasTo('client@example.test');
        });
        $this->assertMatchesRegularExpression('/^\d{6}$/', (string) $code);

        $this->withToken($token)
            ->postJson('/api/email-verification/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('email_verified', true)
            ->assertJsonPath('contact_verified', true);

        $this->postJson('/api/login', [
            'email' => 'client@example.test',
            'password' => 'Protein123',
        ])->assertOk()->assertJsonPath('requires_verification', false);
    }

    public function test_registration_rejects_an_invalid_tunisian_phone(): void
    {
        Mail::fake();

        $this->postJson('/api/register', [
            'name' => 'Client Test',
            'phone' => '123',
            'email' => 'client@example.test',
            'password' => 'Protein123',
        ])->assertUnprocessable()->assertJsonValidationErrors('phone');

        $this->assertDatabaseCount('users', 0);
        Mail::assertNothingSent();
    }
}
