<?php

namespace Tests\Unit;

use App\Services\SmsService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class SmsServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.sms.api_key', 'test-api-key');
        config()->set('services.sms.sender_id', 'ProteinTN');
    }

    public function test_it_normalizes_a_tunisian_number_and_sends_gsm7_text(): void
    {
        Http::fake(['www.winsmspro.com/*' => Http::response(['code' => 'ok'], 200)]);

        app(SmsService::class)->send_sms('+216 20 123 456', 'Commande confirmée ✅');

        Http::assertSent(function (Request $request): bool {
            $url = urldecode($request->url());

            return str_contains($url, 'to=21620123456')
                && str_contains($url, 'from=ProteinTN')
                && str_contains($url, 'sms=Commande confirmée')
                && ! str_contains($url, '✅');
        });
    }

    public function test_it_throws_when_the_gateway_refuses_a_message(): void
    {
        Http::fake(['www.winsmspro.com/*' => Http::response(['code' => 'error', 'message' => 'insufficient credit'], 200)]);

        $this->expectException(RuntimeException::class);

        app(SmsService::class)->send_sms('20123456', 'Votre commande est confirmée.');
    }

    public function test_it_throws_when_sms_credentials_are_missing(): void
    {
        config()->set('services.sms.api_key', null);

        $this->expectException(RuntimeException::class);

        app(SmsService::class)->send_sms('20123456', 'Votre commande est confirmée.');
    }

    public function test_it_rejects_an_invalid_tunisian_number_before_calling_the_gateway(): void
    {
        Http::fake();

        try {
            app(SmsService::class)->send_sms('123', 'Votre commande est confirmée.');
            $this->fail('Une exception était attendue.');
        } catch (RuntimeException) {
            Http::assertNothingSent();
        }
    }
}
