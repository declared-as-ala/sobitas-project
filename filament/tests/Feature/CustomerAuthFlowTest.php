<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationOtpMail;
use App\Models\User;
use App\Notifications\ResetPasswordLink;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
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

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('mail.admin_emails', []);
        config()->set('cache.default', 'array');
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

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
        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
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

    public function test_customer_reset_email_always_targets_the_https_storefront(): void
    {
        config()->set('app.frontend_url', 'https://admin.protein.tn');
        $user = new User(['name' => 'Client Test', 'email' => 'client@example.test']);

        $mail = (new ResetPasswordLink('secure-token'))->toMail($user);
        $url = (string) ($mail->viewData['url'] ?? '');

        $this->assertStringStartsWith('https://protein.tn/reset-password?', $url);
        $this->assertStringContainsString('token=secure-token', $url);
        $this->assertStringContainsString('email=client%40example.test', $url);
    }

    public function test_customer_can_request_and_complete_a_password_reset(): void
    {
        Notification::fake();
        $user = User::create([
            'name' => 'Client Test',
            'email' => 'client@example.test',
            'phone' => '+21620123456',
            'password' => 'OldPassword1',
        ]);

        $this->postJson('/api/forgot-password', ['email' => 'CLIENT@example.test'])
            ->assertOk();
        Notification::assertSentTo($user, ResetPasswordLink::class);

        $token = Password::broker()->createToken($user);
        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPassword2',
            'password_confirmation' => 'NewPassword2',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPassword2', $user->fresh()->password));
    }
}
