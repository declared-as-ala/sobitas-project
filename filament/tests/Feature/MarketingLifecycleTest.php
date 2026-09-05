<?php

namespace Tests\Feature;

use App\Jobs\SendMarketingEmailJob;
use App\Mail\ConfirmNewsletterSubscriptionMail;
use App\Mail\MarketingEmailMailable;
use App\Models\MarketingCampaign;
use App\Models\Newsletter;
use App\Services\MarketingService;
use App\Services\NewsletterSubscriptionService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MarketingLifecycleTest extends TestCase
{
    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('queue.default', 'sync');
    }

    protected function setUp(): void
    {
        parent::setUp();
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        Schema::create('newsletters', function (Blueprint $table): void {
            $table->id();
            $table->string('email')->unique();
            $table->timestamp('confirmed_at')->nullable();
            $table->string('confirmation_token_hash', 64)->nullable();
            $table->timestamp('confirmation_sent_at')->nullable();
            $table->timestamp('unsubscribed_at')->nullable();
            $table->string('source')->default('storefront');
            $table->timestamps();
        });
        Schema::create('clients', function (Blueprint $table): void {
            $table->id();
            $table->string('email')->nullable();
            $table->timestamp('email_unsubscribed_at')->nullable();
            $table->timestamps();
        });
        Schema::create('marketing_campaigns', function (Blueprint $table): void {
            $table->id();
            $table->string('automation_key')->nullable()->unique();
            $table->string('type');
            $table->string('template_key')->nullable();
            $table->json('template_vars')->nullable();
            $table->string('subject')->nullable();
            $table->text('body_override')->nullable();
            $table->json('recipients');
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('sent')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->unsignedInteger('skipped')->default(0);
            $table->string('status')->default('queued');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
        Schema::create('marketing_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('idempotency_key')->nullable()->unique();
            $table->string('channel');
            $table->unsignedBigInteger('template_id')->nullable();
            $table->string('recipient_type')->nullable();
            $table->string('recipient_value');
            $table->unsignedBigInteger('client_id')->nullable();
            $table->string('status');
            $table->string('provider_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->string('campaign_id')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_subscription_requires_confirmation_and_token_is_not_stored_in_plain_text(): void
    {
        Mail::fake();
        $result = app(NewsletterSubscriptionService::class)->request(' PERSON@Example.test ');

        $this->assertSame('confirmation_sent', $result['status']);
        $row = Newsletter::firstOrFail();
        $this->assertSame('person@example.test', $row->email);
        $this->assertNull($row->confirmed_at);
        $this->assertSame(64, strlen((string) $row->confirmation_token_hash));

        $token = null;
        Mail::assertQueued(ConfirmNewsletterSubscriptionMail::class, function ($mail) use (&$token): bool {
            parse_str((string) parse_url($mail->confirmationUrl, PHP_URL_QUERY), $query);
            $token = $query['token'] ?? null;
            return $mail->hasTo('person@example.test');
        });
        $this->assertNotSame($token, $row->confirmation_token_hash);
        $this->assertTrue(app(NewsletterSubscriptionService::class)->confirm($row->email, (string) $token));
        $this->assertTrue(app(NewsletterSubscriptionService::class)->isSubscribed($row->email));
    }

    public function test_delivery_rechecks_consent_and_is_idempotent(): void
    {
        Mail::fake();
        Newsletter::create(['email' => 'member@example.test', 'confirmed_at' => now()]);
        $campaign = MarketingCampaign::create([
            'type' => 'email', 'recipients' => [['email' => 'member@example.test']],
            'total' => 1, 'status' => MarketingCampaign::STATUS_SENDING,
        ]);
        $job = new SendMarketingEmailJob(
            'member@example.test', 'Subject', '<p>Hello</p>', 'https://protein.tn/unsubscribe',
            campaignId: (string) $campaign->id, marketingCampaignId: $campaign->id
        );

        $job->handle();
        $job->handle();
        Mail::assertSentCount(1);
        $this->assertSame(1, $campaign->fresh()->sent);

        Newsletter::where('email', 'member@example.test')->update(['unsubscribed_at' => now()]);
        $this->assertFalse(MarketingService::canEmailRecipient('member@example.test'));
    }

    public function test_unsubscribe_after_queue_skips_delivery_and_finishes_campaign(): void
    {
        Mail::fake();
        Newsletter::create(['email' => 'stop@example.test', 'confirmed_at' => now(), 'unsubscribed_at' => now()]);
        $campaign = MarketingCampaign::create([
            'type' => 'email', 'recipients' => [['email' => 'stop@example.test']],
            'total' => 1, 'status' => MarketingCampaign::STATUS_SENDING,
        ]);

        (new SendMarketingEmailJob(
            'stop@example.test', 'Subject', '<p>Hello</p>', 'https://protein.tn/unsubscribe',
            campaignId: (string) $campaign->id, marketingCampaignId: $campaign->id
        ))->handle();

        Mail::assertNothingSent();
        $this->assertSame(1, $campaign->fresh()->skipped);
        $this->assertSame(MarketingCampaign::STATUS_DONE, $campaign->fresh()->status);
    }
}
