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
            $table->integer('points_balance')->default(0);
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
        (require database_path('migrations/2026_09_03_160000_add_phone_verification_welcome_bonus.php'))->up();
        Schema::create('user_point_transactions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('commande_id')->nullable();
            $table->string('type');
            $table->integer('points');
            $table->integer('balance_after');
            $table->string('description')->nullable();
            $table->timestamps();
        });
        config()->set('welcome_bonus.enabled', true);
    }

    public function test_welcome_migration_can_resume_without_erasing_claims(): void
    {
        DB::table('welcome_bonus_claims')->insert([
            'user_id' => 98765, 'phone_hash' => str_repeat('a', 64),
            'email_hash' => str_repeat('b', 64), 'points' => 300, 'created_at' => now(),
        ]);
        Schema::table('phone_verification_otps', fn (Blueprint $table) => $table->dropIndex(['user_id', 'created_at']));
        (require database_path('migrations/2026_09_03_160000_add_phone_verification_welcome_bonus.php'))->up();
        $this->assertDatabaseHas('welcome_bonus_claims', ['user_id' => 98765, 'points' => 300]);
        $this->assertTrue(collect(Schema::getIndexes('phone_verification_otps'))->contains(fn ($index) => $index['columns'] === ['user_id', 'created_at']));
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
        Mail::assertQueued(EmailVerificationOtpMail::class, function (EmailVerificationOtpMail $mail) use (&$code): bool {
            $code = $mail->code;

            return $mail->hasTo('client@example.test') && $mail->queue === 'auth';
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

    private function phoneCustomer(string $email = 'phone@example.test', bool $eligible = true): User
    {
        Mail::fake();
        $user = new User(['name' => 'Client SMS', 'email' => $email, 'phone' => '+21620123456', 'password' => 'Protein123']);
        $user->forceFill(['role_id' => 2, 'welcome_bonus_eligible' => $eligible])->save();
        return $user;
    }

    private function sendPhoneCode(User $user, string $phone = '20 123 456'): string
    {
        $code = '';
        $this->mock(\App\Services\SmsService::class)->shouldReceive('send_sms')->once()->andReturnUsing(function ($to, $message) use (&$code) {
            preg_match('/\b(\d{6})\b/', $message, $match);
            $code = $match[1];
            $this->assertLessThanOrEqual(160, strlen($message));
            return 'test-reference';
        });
        $result = app(\App\Services\PhoneVerificationService::class)->send($user, $phone, '192.0.2.1');
        $this->assertSame(180, $result['expires_in']);
        $otp = DB::table('phone_verification_otps')->latest('id')->first();
        $this->assertNotSame($code, $otp->code_hash);
        $this->assertTrue(Hash::check($code, $otp->code_hash));
        return $code;
    }

    public function test_phone_proof_credits_exactly_300_points_and_cannot_replay(): void
    {
        $user = $this->phoneCustomer();
        $code = $this->sendPhoneCode($user);
        $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/phone-verification/verify', ['code' => $code])
            ->assertOk()->assertJsonPath('bonus_awarded', true)->assertJsonPath('points_balance', 300)->assertJsonPath('points_value_dt', 15);
        $this->assertNotNull($user->fresh()->phone_verified_at);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->postJson('/api/phone-verification/verify', ['code' => $code])->assertUnprocessable();
        $this->assertDatabaseCount('welcome_bonus_claims', 1);
        $this->assertDatabaseCount('user_point_transactions', 1);
    }

    public function test_phone_code_expires_at_three_minutes(): void
    {
        $user = $this->phoneCustomer();
        $code = $this->sendPhoneCode($user);
        $this->travel(180)->seconds();
        $this->withToken($user->createToken('test')->plainTextToken)->postJson('/api/phone-verification/verify', ['code' => $code])->assertUnprocessable();
        $this->assertDatabaseCount('welcome_bonus_claims', 0);
    }

    public function test_five_wrong_attempts_remain_consumed_and_block_correct_code(): void
    {
        $user = $this->phoneCustomer();
        $code = $this->sendPhoneCode($user);
        $this->withToken($user->createToken('test')->plainTextToken);
        for ($i = 0; $i < 5; $i++) $this->postJson('/api/phone-verification/verify', ['code' => '000000'])->assertUnprocessable();
        $this->assertSame(5, DB::table('phone_verification_otps')->value('attempts'));
        $this->postJson('/api/phone-verification/verify', ['code' => $code])->assertUnprocessable();
        $this->assertSame(0, $user->fresh()->points_balance);
    }

    public function test_resend_is_rate_limited_and_new_code_invalidates_old_challenge(): void
    {
        $user = $this->phoneCustomer();
        $this->sendPhoneCode($user);
        $firstId = DB::table('phone_verification_otps')->value('id');
        $this->withToken($user->createToken('test')->plainTextToken)->postJson('/api/phone-verification/send', ['phone' => '+21620123456'])->assertUnprocessable();
        $this->travel(61)->seconds();
        $this->sendPhoneCode($user);
        $this->assertNotNull(DB::table('phone_verification_otps')->where('id', $firstId)->value('consumed_at'));
        $this->assertDatabaseCount('phone_verification_otps', 2);
    }

    public function test_same_phone_cannot_receive_bonus_on_another_account_even_after_deletion(): void
    {
        $first = $this->phoneCustomer();
        $service = app(\App\Services\PhoneVerificationService::class);
        $service->verify($first, $this->sendPhoneCode($first));
        $first->delete();
        $this->travel(61)->seconds();
        $second = $this->phoneCustomer('second@example.test');
        $result = $service->verify($second, $this->sendPhoneCode($second, '00216 20 123 456'));
        $this->assertFalse($result['bonus_awarded']);
        $this->assertNotNull($second->fresh()->phone_verified_at);
        $this->assertSame(0, $second->fresh()->points_balance);
        $this->assertDatabaseCount('welcome_bonus_claims', 1);
    }

    public function test_existing_customer_can_verify_but_does_not_receive_signup_bonus(): void
    {
        $user = $this->phoneCustomer('existing@example.test', false);
        $result = app(\App\Services\PhoneVerificationService::class)->verify($user, $this->sendPhoneCode($user));
        $this->assertFalse($result['bonus_awarded']);
        $this->assertDatabaseCount('welcome_bonus_claims', 0);
        $user->refresh()->update(['phone' => '+21622123456']);
        $this->assertNull($user->fresh()->phone_verified_at);
    }

    public function test_gateway_failure_never_leaves_a_usable_code_and_retains_cooldown(): void
    {
        $user = $this->phoneCustomer();
        $this->mock(\App\Services\SmsService::class)->shouldReceive('send_sms')->once()->andThrow(new \RuntimeException('timeout'));
        $this->withToken($user->createToken('test')->plainTextToken)->postJson('/api/phone-verification/send', ['phone' => '20123456'])->assertUnprocessable();
        $this->assertDatabaseHas('phone_verification_otps', ['status' => 'failed']);
        $this->postJson('/api/phone-verification/send', ['phone' => '20123456'])->assertUnprocessable();
        $this->assertDatabaseCount('phone_verification_otps', 1);
    }

    public function test_phone_endpoints_require_authentication(): void
    {
        $this->postJson('/api/phone-verification/send', ['phone' => '20123456'])->assertUnauthorized();
        $this->postJson('/api/phone-verification/verify', ['code' => '123456'])->assertUnauthorized();
    }

    public function test_new_phone_on_rewarded_account_does_not_pay_again(): void
    {
        $user = $this->phoneCustomer();
        $service = app(\App\Services\PhoneVerificationService::class);
        $service->verify($user, $this->sendPhoneCode($user));
        $this->travel(61)->seconds();
        $result = $service->verify($user, $this->sendPhoneCode($user, '22123456'));
        $this->assertFalse($result['bonus_awarded']);
        $this->assertSame(300, $user->fresh()->points_balance);
        $this->assertDatabaseCount('user_point_transactions', 1);
    }

    public function test_failed_ledger_write_rolls_back_claim_and_verification(): void
    {
        $user = $this->phoneCustomer();
        $code = $this->sendPhoneCode($user);
        $this->mock(\App\Services\PointsService::class)->shouldReceive('record')->once()->andThrow(new \RuntimeException('ledger unavailable'));
        try {
            app(\App\Services\PhoneVerificationService::class)->verify($user, $code);
            $this->fail('Expected ledger failure');
        } catch (\RuntimeException $e) {
            $this->assertSame('ledger unavailable', $e->getMessage());
        }
        $this->assertDatabaseCount('welcome_bonus_claims', 0);
        $this->assertNull($user->fresh()->phone_verified_at);
        $this->assertNull(DB::table('phone_verification_otps')->value('consumed_at'));
    }

    public function test_sms_spending_ceiling_blocks_before_contacting_gateway(): void
    {
        $user = $this->phoneCustomer();
        config()->set('welcome_bonus.daily_sms_limit', 0);
        $this->mock(\App\Services\SmsService::class)->shouldNotReceive('send_sms');
        $this->withToken($user->createToken('test')->plainTextToken)->postJson('/api/phone-verification/send', ['phone' => '20123456'])->assertUnprocessable();
        $this->assertDatabaseCount('phone_verification_otps', 0);
    }
}
