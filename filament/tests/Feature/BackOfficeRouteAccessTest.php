<?php

namespace Tests\Feature;

use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A partner must not reach the back office.
 *
 * ── THE DEFECT THIS LOCKS DOWN ─────────────────────────────────────────────────────────────
 * Every print/PDF/export route and the POS AJAX helpers in routes/web.php were grouped behind
 * bare `auth`. Partners authenticate on the SAME `web` guard as staff, so `auth` admitted them:
 *
 *     GET /api/pos-clients?q=a   ->  30 customers per call: name, phone_1, adresse, email,
 *                                    ville, code_postale — walk the alphabet, take the list
 *     GET /tickets/{id}/print    ->  every POS ticket, including rival partners' sales and the
 *                                    partner code printed on them
 *     GET /dashboard/export      ->  company revenue; /stock/export/pdf -> full inventory
 *
 * The Filament partner PANEL is correctly isolated — scoped queries, read-only, no record pages.
 * These routes simply live outside it, so panel isolation never applied. Partners are competitors
 * of each other, which is what made this the highest-severity finding in the B2B audit.
 *
 * These tests assert the fix (`back.office` middleware) from the attacker's side: they log in as a
 * real partner-role user and demand 403. Asserting "the middleware is registered" would pass even
 * if the route group forgot to use it, which is exactly how the original hole was shaped.
 */
class BackOfficeRouteAccessTest extends TestCase
{
    use RefreshDatabase;

    private function makePartnerUser(): User
    {
        $user = User::query()->create([
            'name' => 'Coach Ali',
            'email' => 'coach.ali@test.local',
            'password' => Hash::make('secret-password'),
            'role_id' => config('partners.partner_role_id', 4),
        ]);

        Partner::query()->create([
            'user_id' => $user->id,
            'type' => PartnerType::Coach->value,
            'name' => 'Coach Ali',
            'email' => 'coach.ali@test.local',
            'status' => PartnerStatus::Active->value,
            'commission_rate' => 10,
            'current_balance' => 0,
            'total_earned' => 0,
            'total_paid' => 0,
        ]);

        return $user;
    }

    private function makeAdminUser(): User
    {
        return User::query()->create([
            'name' => 'Staff',
            'email' => 'staff@test.local',
            'password' => Hash::make('secret-password'),
            'role_id' => config('partners.admin_role_ids', [1, 3])[0],
        ]);
    }

    /**
     * The customer database. This is the one that mattered most: it needs no ID guessing, returns
     * personal data directly, and a single query parameter walks the whole table.
     */
    public function test_partner_cannot_read_the_customer_database(): void
    {
        $this->actingAs($this->makePartnerUser())
            ->get('/api/pos-clients?q=a')
            ->assertForbidden();
    }

    public function test_partner_cannot_create_client_records(): void
    {
        $this->actingAs($this->makePartnerUser())
            ->post('/api/pos-clients', ['name' => 'Injected', 'phone_1' => '20000000'])
            ->assertForbidden();
    }

    public function test_partner_cannot_read_the_product_catalogue_with_cost_fields(): void
    {
        $this->actingAs($this->makePartnerUser())
            ->get('/api/pos-products?q=whey')
            ->assertForbidden();
    }

    /** @dataProvider backOfficeDocumentRoutes */
    public function test_partner_cannot_reach_back_office_documents(string $path): void
    {
        $this->actingAs($this->makePartnerUser())
            ->get($path)
            ->assertForbidden();
    }

    public static function backOfficeDocumentRoutes(): array
    {
        return [
            'POS ticket print' => ['/tickets/1/print'],
            'invoice print' => ['/factures/1/print'],
            'facture TVA print' => ['/facture-tvas/1/print'],
            'devis print' => ['/quotations/1/print'],
            'wholesale price list' => ['/product-price-lists/1/print'],
            'company revenue export' => ['/dashboard/export'],
            'full stock export' => ['/stock/export/pdf'],
        ];
    }

    /**
     * The other half of the assertion, and the reason it is not enough to check partners are
     * refused: a guard that also locks out staff is not a fix, it is an outage. Staff must not get
     * 403. Any other status (200, 404 for a missing record, a redirect) is fine here — this test
     * is about AUTHORISATION, not about whether ticket #1 exists in an empty test database.
     */
    public function test_staff_are_not_locked_out_by_the_guard(): void
    {
        $response = $this->actingAs($this->makeAdminUser())->get('/api/pos-clients?q=a');

        $this->assertNotSame(403, $response->getStatusCode(), 'The back-office guard is refusing staff.');
    }

    public function test_anonymous_visitors_are_not_admitted(): void
    {
        $response = $this->get('/api/pos-clients?q=a');

        $this->assertContains(
            $response->getStatusCode(),
            [302, 401, 403],
            'An unauthenticated request reached a back-office route.',
        );
    }
}
