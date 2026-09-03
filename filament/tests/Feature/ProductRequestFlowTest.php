<?php

namespace Tests\Feature;

use App\Mail\ContactAcknowledgementMail;
use App\Mail\ContactMessageMail;
use App\Models\Contact;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProductRequestFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('mail.admin_emails', ['shop@example.test']);
        config()->set('cache.default', 'array');
        config()->set('app.url', 'https://admin.protein.tn');
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        Mail::fake();

        Schema::create('sous_categories', function (Blueprint $table) {
            $table->id(); $table->integer('categorie_id'); $table->string('slug'); $table->string('designation_fr');
        });
        Schema::create('brands', function (Blueprint $table) {
            $table->id(); $table->string('designation_fr'); $table->string('logo')->nullable();
        });
        Schema::create('external_catalog_products', function (Blueprint $table) {
            $table->id(); $table->integer('product_id'); $table->text('source_gallery_images')->nullable();
        });
        Schema::create('reviews', function (Blueprint $table) {
            $table->id(); $table->integer('product_id'); $table->boolean('publier')->default(1);
        });
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            foreach (['slug', 'designation_fr', 'cover', 'alt_cover', 'description_cover', 'nutrition_values', 'nutrition_facts'] as $column) $table->text($column)->nullable();
            foreach (['qte', 'rupture', 'force_out_of_stock', 'low_stock_threshold', 'new_product', 'best_seller', 'note', 'pack', 'sous_categorie_id', 'brand_id'] as $column) $table->integer($column)->nullable();
            $table->float('prix')->default(200); $table->float('promo')->nullable();
            $table->timestamp('promo_expiration_date')->nullable(); $table->boolean('publier')->default(1);
        });
        Schema::create('contacts', function (Blueprint $table) {
            $table->id(); $table->string('name'); $table->string('email'); $table->text('message'); $table->timestamps();
        });
        DB::table('sous_categories')->insert([
            ['id' => 8, 'categorie_id' => 2, 'slug' => 'whey-isolate', 'designation_fr' => 'Whey isolate'],
            ['id' => 9, 'categorie_id' => 2, 'slug' => 'whey-proteine', 'designation_fr' => 'Whey protéine'],
            ['id' => 10, 'categorie_id' => 3, 'slug' => 'equipement', 'designation_fr' => 'Équipement'],
        ]);
        $this->product(1, ['qte' => 0, 'designation_fr' => 'Isolate vanille — 907 g']);
    }

    private function product(int $id, array $overrides = []): void
    {
        DB::table('products')->insert(array_replace([
            'id' => $id, 'slug' => 'produit-'.$id, 'designation_fr' => 'Protéine '.$id.' — 1 kg',
            'qte' => 5, 'sous_categorie_id' => 8, 'prix' => 250, 'cover' => 'product.png',
        ], $overrides));
    }

    private function payload(array $overrides = []): array
    {
        return array_replace(['name' => 'Client Démonstration', 'email' => 'client@example.test', 'phone' => '20 000 000', 'product_id' => 1, 'message' => 'Une boîte, goût vanille.'], $overrides);
    }

    public function test_request_is_saved_and_both_emails_use_server_product_identity(): void
    {
        $this->postJson('/api/contact', $this->payload(['subject' => 'Fake subject', 'product_url' => 'https://example.invalid']))->assertOk();
        $this->assertDatabaseCount('contacts', 1);
        $this->assertStringContainsString('Téléphone : 20 000 000', Contact::first()->message);
        $this->assertStringContainsString('https://protein.tn/whey-isolate/produit-1', Contact::first()->message);
        Mail::assertSent(ContactMessageMail::class, fn ($mail) => $mail->hasTo('shop@example.test') && $mail->contact->requested_product['name'] === 'Isolate vanille — 907 g' && $mail->contact->phone === '20 000 000');
        Mail::assertSent(ContactAcknowledgementMail::class, fn ($mail) => $mail->hasTo('client@example.test') && $mail->contact->requested_product['url'] === 'https://protein.tn/whey-isolate/produit-1');
        Mail::assertSentCount(2);
    }

    public function test_request_rejects_missing_and_invalid_phone_numbers(): void
    {
        foreach (['', '123', '--------'] as $phone) {
            $this->postJson('/api/contact', $this->payload(['phone' => $phone]))->assertUnprocessable()->assertJsonValidationErrors('phone');
        }
        $this->assertDatabaseCount('contacts', 0);
        Mail::assertNothingSent();
    }

    public function test_request_rejects_bad_email_and_unknown_or_unpublished_products(): void
    {
        $this->postJson('/api/contact', $this->payload(['email' => 'bad']))->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/contact', $this->payload(['product_id' => 987654]))->assertUnprocessable()->assertJsonValidationErrors('product_id');
        DB::table('products')->where('id', 1)->update(['publier' => 0]);
        $this->postJson('/api/contact', $this->payload())->assertNotFound();
        $this->assertDatabaseCount('contacts', 0);
        Mail::assertNothingSent();
    }

    public function test_honeypot_neither_saves_nor_sends(): void
    {
        $this->postJson('/api/contact', $this->payload(['company' => 'spam']))->assertOk();
        $this->assertDatabaseCount('contacts', 0);
        Mail::assertNothingSent();
    }

    public function test_general_contact_still_works_without_a_product_or_phone(): void
    {
        $this->postJson('/api/contact', ['name' => 'Client', 'email' => 'client@example.test', 'message' => 'Bonjour'])->assertOk();
        $this->assertDatabaseHas('contacts', ['message' => 'Bonjour']);
        Mail::assertSent(ContactAcknowledgementMail::class, fn ($mail) => $mail->contact->requested_product === null);
        Mail::assertSentCount(2);
    }

    public function test_alternatives_exclude_packs_and_unavailable_products_and_include_nutrition(): void
    {
        $this->product(2, ['nutrition_facts' => json_encode(['serving_quantity' => 30, 'serving_unit' => 'g', 'rows' => [['name' => 'Protéines', 'quantity' => 25, 'unit' => 'g']]]), 'nutrition_values' => '<p>Par portion de 30 g : protéines 25 g</p>']);
        $this->product(3, ['rupture' => 1]);
        $this->product(4, ['force_out_of_stock' => 1]);
        $this->product(5, ['pack' => 1]);
        $this->product(6, ['designation_fr' => 'PACK PRO']);
        $this->product(7, ['publier' => 0]);
        $this->product(8, ['qte' => null]);
        $this->product(9, ['sous_categorie_id' => 9]);
        $this->product(10, ['sous_categorie_id' => 10]);
        $response = $this->getJson('/api/similar_products/8')->assertOk()->assertJsonCount(2, 'products');
        $this->assertSame([2, 9], array_column($response->json('products'), 'id'));
        $response->assertJsonPath('products.0.nutrition_facts.rows.0.quantity', 25)->assertJsonPath('products.0.sous_categorie.slug', 'whey-isolate');
        $this->assertStringContainsString('25 g', $response->json('products.0.nutrition_values'));
    }

    public function test_alternatives_are_bounded_and_unknown_categories_are_empty(): void
    {
        foreach (range(2, 12) as $id) $this->product($id);
        $this->getJson('/api/similar_products/8')->assertOk()->assertJsonCount(6, 'products');
        $this->getJson('/api/similar_products/987654')->assertOk()->assertExactJson(['products' => []]);
    }

    public function test_emails_render_safe_responsive_product_requests_and_general_contact(): void
    {
        $contact = new Contact(['name' => 'Client Démonstration', 'email' => 'client@example.test', 'message' => '<script>alert(1)</script>', 'phone' => '20 000 000']);
        $contact->id = 123;
        $contact->requested_product = ['name' => 'Isolate vanille — 907 g', 'url' => 'https://protein.tn/whey-isolate/produit-1', 'note' => 'Une boîte, goût vanille. <script>alert(1)</script>'];
        foreach (['client' => new ContactAcknowledgementMail($contact), 'admin' => new ContactMessageMail($contact)] as $key => $mail) {
            $html = $mail->render();
            $this->assertStringContainsString('viewport', $html);
            $this->assertStringContainsString('src="https://admin.protein.tn/logo.png"', $html);
            $this->assertStringContainsString('Isolate vanille', $html);
            $this->assertStringContainsString('Aucune commande ni paiement', $html);
            $this->assertStringNotContainsString('<script>', $html);
            $this->assertStringContainsString('&lt;script&gt;', $html);
            if ($dir = getenv('MAIL_PREVIEW_DIR')) {
                if (! is_dir($dir)) mkdir($dir, 0777, true);
                file_put_contents($dir.'/'.$key.'.html', $html);
            }
        }
        $contact->requested_product = null;
        $this->assertStringContainsString('Votre message est reçu', (new ContactAcknowledgementMail($contact))->render());
    }
}
