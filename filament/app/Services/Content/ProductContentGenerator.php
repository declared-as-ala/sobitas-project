<?php

namespace App\Services\Content;

use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Draft richer French copy for a product, grounded ONLY in what we actually know about it.
 *
 * Why this exists: 78 of 303 product pages carry under 300 words, median 393, and the site's own
 * blog outranks its commercial pages on their own head terms because the blog answers the question
 * and the product page does not. Roughly 1,239 URLs sit in "Crawled — currently not indexed",
 * which is what Google does with pages that carry nothing worth ranking.
 *
 * Output goes to `ai_description_draft` / `ai_faq_draft` and is published only on human approval.
 *
 * THREE HARD RULES, enforced in the prompt and again in code after the response:
 *
 * 1. No invented numbers. Protein per serving, calories, dosage, creatine grams — people dose
 *    themselves on those. If a figure was not supplied in the attributes below, it must not appear.
 *    This is why nutrition values are NOT generated at all: no product here carries a barcode, so
 *    there is no external database to join against, and an LLM's guess at a Supplement Facts panel
 *    is a health risk, not a content gap.
 * 2. No health or therapeutic claims — nothing that treats, prevents or cures. Supplement claims
 *    are regulated, and "boosts immunity" on a product page is a legal exposure, not just bad copy.
 * 3. No invented certifications, awards, lab tests, origins or ingredient lists.
 *
 * A draft that breaks rule 1 or 2 is rejected in code rather than shown to the admin, because the
 * realistic failure mode is a busy owner approving a plausible-looking panel of fabricated numbers.
 */
class ProductContentGenerator
{
    private const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

    /** Words/phrases that indicate a regulated health claim slipped through. */
    private const CLAIM_PATTERNS = [
        '~\b(gu[ée]rit|gu[ée]rir|soigne|traite|pr[ée]vient la maladie|anti-?cancer|diab[èe]te)\b~iu',
        '~\b(cures?|treats?|prevents? disease|heals?)\b~i',
        '~\bapprouv[ée] par (la )?(FDA|OMS|WHO)\b~iu',
        '~\b(clinically proven|cliniquement prouv[ée])\b~iu',
    ];

    public function isConfigured(): bool
    {
        return filled(config('services.ai.groq_key'));
    }

    /**
     * @return array{description:string, faq:array<int,array{q:string,a:string}>}|null
     *         null on any failure — the caller leaves the product untouched.
     */
    public function generate(Product $product): ?array
    {
        if (! $this->isConfigured()) {
            Log::warning('[ProductContentGenerator] GROQ_API_KEY not set — skipping');

            return null;
        }

        $facts = $this->knownFacts($product);
        $existing = trim(strip_tags((string) $product->description_fr));

        $system = <<<'SYS'
Tu es rédacteur produit pour Protein.tn, une boutique de nutrition sportive et de compléments alimentaires en Tunisie. Tu écris en FRANÇAIS, pour des clients tunisiens.

RÈGLES ABSOLUES — une seule violation rend ta réponse inutilisable :
1. N'INVENTE JAMAIS de chiffre. Aucune valeur nutritionnelle, aucun dosage, aucun nombre de grammes, de calories ou de protéines par portion, sauf s'il figure explicitement dans les ATTRIBUTS fournis. Si tu ne connais pas une valeur, n'en parle pas.
2. AUCUNE allégation de santé. Interdit d'écrire qu'un produit soigne, guérit, traite ou prévient une maladie. Interdit d'invoquer la FDA, l'OMS ou une "preuve clinique".
3. N'INVENTE JAMAIS de certification, de récompense, d'analyse en laboratoire, de pays d'origine ni de liste d'ingrédients.

STYLE :
- Concret et utile. Écris pour quelqu'un qui hésite entre deux produits, pas pour remplir une page.
- Parle de l'usage réel : à qui ce produit convient, quand le prendre dans la journée, avec quoi le combiner.
- Mentionne la Tunisie naturellement (livraison, paiement à la livraison) au maximum UNE fois.
- Pas de superlatifs creux ("le meilleur au monde"), pas d'emoji, pas de MAJUSCULES criardes.
- Varie la structure selon le produit. Deux fiches ne doivent pas se ressembler.

FORMAT : réponds UNIQUEMENT avec un objet JSON, sans prose ni markdown :
{
  "description_html": "<p>…</p><h2>…</h2><p>…</p> (250 à 400 mots, HTML simple : p, h2, ul, li, strong. JAMAIS de <h1>.)",
  "faq": [ {"q": "…", "a": "…"}, … ]  (3 à 5 questions que se pose réellement un acheteur, réponses de 2 à 3 phrases)
}
SYS;

        $user = "ATTRIBUTS CONNUS (n'utilise rien d'autre) :\n" . $facts
            . "\n\nTexte actuel de la fiche (à enrichir, pas à répéter mot pour mot) :\n"
            . ($existing !== '' ? mb_substr($existing, 0, 1200) : '(aucun)');

        try {
            $res = Http::withToken((string) config('services.ai.groq_key'))
                ->connectTimeout(5)
                ->timeout((int) config('services.ai.timeout', 12) * 3)
                ->acceptJson()
                ->post(self::GROQ_ENDPOINT, [
                    'model'           => (string) config('services.ai.groq_model', 'llama-3.3-70b-versatile'),
                    'temperature'     => 0.7,   // some variety, or 303 pages read as one template
                    'max_tokens'      => 1800,
                    'response_format' => ['type' => 'json_object'],
                    'messages'        => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $user],
                    ],
                ]);

            if (! $res->successful()) {
                Log::warning('[ProductContentGenerator] Groq HTTP error', [
                    'product' => $product->id,
                    'status'  => $res->status(),
                ]);

                return null;
            }

            $parsed = json_decode((string) data_get($res->json(), 'choices.0.message.content'), true);
            if (! is_array($parsed)) {
                return null;
            }

            return $this->validate($parsed, $product);
        } catch (\Throwable $e) {
            Log::warning('[ProductContentGenerator] call failed', [
                'product' => $product->id,
                'error'   => $e->getMessage(),
            ]);

            return null;
        }
    }

    /** Everything the model is allowed to know. Anything absent here must not appear in the output. */
    private function knownFacts(Product $product): string
    {
        $lines = [];
        $lines[] = 'Nom du produit : ' . $product->designation_fr;

        if ($brand = optional($product->brand)->designation_fr) {
            $lines[] = 'Marque : ' . $brand;
        }
        if ($sub = optional($product->sousCategorie)->designation_fr) {
            $lines[] = 'Catégorie : ' . $sub;
        }
        if (filled($product->prix)) {
            $lines[] = 'Prix : ' . number_format((float) $product->prix, 3, '.', ' ') . ' DT';
        }
        // The pack size usually lives in the product name ("2.27KG", "180 comprimés"); it is stated
        // rather than derived so the model can quote it without inferring a serving count from it.
        if (preg_match('~(\d+[.,]?\d*)\s*(kg|g|ml|l|caps?|g[ée]lules?|comprim[ée]s?|tablets?|doses?|portions?)~iu', (string) $product->designation_fr, $m)) {
            $lines[] = 'Conditionnement indiqué sur le nom : ' . trim($m[0]);
        }
        // Real Supplement Facts, if an admin has typed them from the label.
        if (filled($product->nutrition_values)) {
            $lines[] = "Valeurs nutritionnelles saisies par l'administrateur (tu peux les citer telles quelles) :\n"
                . mb_substr(strip_tags((string) $product->nutrition_values), 0, 900);
        } else {
            $lines[] = 'Valeurs nutritionnelles : NON DISPONIBLES — ne cite aucun chiffre nutritionnel.';
        }

        return implode("\n", $lines);
    }

    /**
     * @param  array<string,mixed>  $parsed
     * @return array{description:string, faq:array<int,array{q:string,a:string}>}|null
     */
    private function validate(array $parsed, Product $product): ?array
    {
        $html = trim((string) ($parsed['description_html'] ?? ''));
        if ($html === '') {
            return null;
        }

        // A product page already has one h1 (the product name). Anything the model emits is body copy.
        $html = preg_replace('~</?h1[^>]*>~i', '', $html) ?? $html;

        $plain = trim(preg_replace('~\s+~u', ' ', strip_tags($html)) ?? '');
        if (str_word_count($plain) < 120) {
            Log::info('[ProductContentGenerator] draft too short, discarded', ['product' => $product->id]);

            return null;
        }

        foreach (self::CLAIM_PATTERNS as $pattern) {
            if (preg_match($pattern, $plain)) {
                Log::warning('[ProductContentGenerator] draft contained a health claim, discarded', [
                    'product' => $product->id,
                ]);

                return null;
            }
        }

        // Rule 1, enforced rather than trusted: if we supplied no nutrition values, the draft must
        // not contain nutrition-shaped figures. Prices and pack sizes ARE known, so they are exempt.
        if (blank($product->nutrition_values)) {
            $stripped = $plain;
            foreach ([(string) $product->designation_fr, number_format((float) $product->prix, 3, '.', ' ')] as $known) {
                if ($known !== '') {
                    $stripped = str_ireplace($known, ' ', $stripped);
                }
            }
            if (preg_match('~\d+[.,]?\d*\s*(g|mg|kcal|calories?)\s+(de\s+)?(prot[ée]ines?|glucides?|lipides?|sucres?|BCAA|cr[ée]atine|leucine)~iu', $stripped)
                || preg_match('~(prot[ée]ines?|glucides?|lipides?)\s*:?\s*\d+~iu', $stripped)) {
                Log::warning('[ProductContentGenerator] draft invented nutrition figures, discarded', [
                    'product' => $product->id,
                ]);

                return null;
            }
        }

        $faq = [];
        foreach ((array) ($parsed['faq'] ?? []) as $item) {
            $q = trim((string) ($item['q'] ?? ''));
            $a = trim((string) ($item['a'] ?? ''));
            if ($q !== '' && $a !== '') {
                $faq[] = ['q' => $q, 'a' => $a];
            }
        }

        return ['description' => $html, 'faq' => array_slice($faq, 0, 5)];
    }
}
