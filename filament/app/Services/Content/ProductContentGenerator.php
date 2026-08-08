<?php

namespace App\Services\Content;

use App\Models\Product;
use App\Support\Figures;
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
 *    Nutrition values are never generated: an LLM's guess at a Supplement Facts panel is a health
 *    risk, not a content gap. Real values arrive from the label via a barcode lookup
 *    (`seo:enrich-nutrition`), and this class may only quote what is already stored.
 * 2. No health or therapeutic claims — nothing that treats, prevents or cures. Supplement claims
 *    are regulated, and "boosts immunity" on a product page is a legal exposure, not just bad copy.
 * 3. No invented certifications, awards, lab tests, origins or ingredient lists.
 * 4. No dosage instructions. "Prenez 2 capsules par jour" is advice about how much of a supplement
 *    to put in your body, and it is the one sentence on the page a customer will act on literally.
 *    The product's own label is the only authority; copy defers to it and never substitutes for it.
 *
 * A draft that breaks a rule is rejected in code rather than shown to the admin, because the
 * realistic failure mode is a busy owner approving a plausible-looking panel of fabricated numbers.
 *
 * ── WHY THE FAQ IS CHECKED SEPARATELY ─────────────────────────────────────────────────────
 * The validators originally ran over the description only, so every rule above was unenforced
 * inside an FAQ answer — and the FAQ is precisely where "combien par jour ?" gets asked. Each
 * answer now passes the same gate. An answer that fails is dropped on its own rather than
 * discarding the whole draft: losing 400 good words because one answer overstepped helps nobody.
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

    /**
     * A quantity of the product to consume, per unit of time. This is dosing advice whether or not
     * it is phrased as advice, and we have no authority for it: the figure is on the label, and the
     * label is not in our database. Deflection ("suivez les indications du fabricant") contains no
     * number and passes.
     */
    private const DOSAGE_PATTERNS = [
        // "2 capsules par jour", "1 à 2 doses quotidiennes", "30 g par jour"
        '~\d+\s*(?:[àa-]\s*\d+\s*)?(?:g|mg|ml|capsules?|caps|comprim[ée]s?|g[ée]lules?|doses?|portions?|scoops?|mesurettes?|cuill[èe]res?)\b[^.;)]{0,24}\b(?:par|/)\s*jour~iu',
        '~\d+\s*(?:[àa-]\s*\d+\s*)?(?:g|mg|ml|capsules?|caps|comprim[ée]s?|g[ée]lules?|doses?|portions?|scoops?|mesurettes?)\b[^.;)]{0,24}\bquotidien~iu',
        // "prenez 2 comprimés", "consommer 30 g"
        '~\b(?:prene?z|prendre|consomme[rz]|ingére[rz]|avale[rz]|m[ée]lange[rz])\b[^.;)]{0,30}\b\d+\s*(?:g|mg|ml|capsules?|caps|comprim[ée]s?|g[ée]lules?|doses?|portions?|scoops?|mesurettes?)\b~iu',
        // "3 fois par jour", "2 prises quotidiennes"
        '~\b\d+\s*(?:fois|prises?)\s+par\s+jour~iu',
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
4. AUCUNE POSOLOGIE. N'écris jamais combien en prendre ni à quelle fréquence ("2 capsules par jour", "une dose de 30 g", "3 fois par jour"). Renvoie à l'étiquette : « suivez les indications du fabricant figurant sur l'emballage ». Tu peux parler du MOMENT (après l'entraînement, entre les repas) sans jamais donner de quantité.

STYLE :
- Concret et utile. Écris pour quelqu'un qui hésite entre deux produits, pas pour remplir une page.
- Parle de l'usage réel : à qui ce produit convient, quand le prendre dans la journée, avec quoi le combiner.
- Mentionne la Tunisie naturellement (livraison, paiement à la livraison) au maximum UNE fois.
- Pas de superlatifs creux ("le meilleur au monde"), pas d'emoji, pas de MAJUSCULES criardes.
- Varie la structure selon le produit. Deux fiches ne doivent pas se ressembler.

FAQ — règles supplémentaires :
- Ne réponds QU'AUX questions que les ATTRIBUTS permettent réellement de trancher.
- N'invente pas une question uniquement pour placer un mot-clé.
- Ne réponds pas aux questions médicales, de sécurité, de contre-indication, de grossesse, d'interaction médicamenteuse, de garantie, de retour ni de livraison : renvoie à l'étiquette, à un professionnel de santé, ou au service client.
- Ne rends jamais la réponse plus large que ce que tu sais. « Cela dépend de votre objectif » est une réponse acceptable ; une certitude inventée ne l'est pas.
- Mieux vaut 2 bonnes questions que 5 remplissages. Si les attributs ne suffisent pas, renvoie moins de questions — voire aucune.

FORMAT : réponds UNIQUEMENT avec un objet JSON, sans prose ni markdown :
{
  "description_html": "<p>…</p><h2>…</h2><p>…</p> (250 à 400 mots, HTML simple : p, h2, ul, li, strong. JAMAIS de <h1>.)",
  "faq": [ {"q": "…", "a": "…"}, … ]  (0 à 5 questions que se pose réellement un acheteur, réponses de 2 à 3 phrases)
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

        // The figures the model was actually shown — the same block the prompt carries, so "you may
        // quote what you were given" is checkable rather than aspirational.
        $approved = Figures::in($this->knownFacts($product));

        // A description that breaks a rule sinks the whole draft: it is the body of the page, and
        // there is nothing to salvage around it.
        if ($reason = $this->ruleViolation($plain, $product, $approved)) {
            Log::warning('[ProductContentGenerator] draft rejected', [
                'product' => $product->id,
                'reason' => $reason,
            ]);

            return null;
        }

        $faq = [];
        $droppedFaq = [];
        foreach ((array) ($parsed['faq'] ?? []) as $item) {
            $q = trim((string) ($item['q'] ?? ''));
            $a = trim((string) ($item['a'] ?? ''));
            if ($q === '' || $a === '') {
                continue;
            }

            // Same gate as the description. A single overstepping answer is dropped on its own —
            // discarding 400 good words because one answer gave a dosage helps nobody, and the
            // remaining questions are still worth publishing.
            if ($reason = $this->ruleViolation($q.' '.$a, $product, $approved)) {
                $droppedFaq[] = $reason.': '.mb_strimwidth($q, 0, 60, '…');

                continue;
            }

            $faq[] = ['q' => $q, 'a' => $a];
        }

        if ($droppedFaq !== []) {
            Log::warning('[ProductContentGenerator] FAQ entries dropped', [
                'product' => $product->id,
                'dropped' => $droppedFaq,
            ]);
        }

        // Fewer questions is a valid outcome. The prompt asks for none rather than filler when the
        // attributes do not support an answer, so an empty FAQ is a working result, not a failure.
        return ['description' => $html, 'faq' => array_slice($faq, 0, 5)];
    }

    /**
     * The rules that hold for every customer-facing sentence, description or FAQ answer alike.
     *
     * @param  list<string>  $approved  canonical figure tokens the evidence supports
     * @return string|null a short reason when the text breaks a rule, null when it is clean
     */
    /**
     * The dosage and health-claim patterns, for other writers into the same columns.
     *
     * Exposed rather than copied. The research importer has to apply exactly these rules, and two
     * separate definitions of "this is a dosage instruction" would drift — at which point one entry
     * point publishes advice the other rejects, on the same product page.
     *
     * @return list<string>
     */
    public static function dosagePatterns(): array
    {
        return self::DOSAGE_PATTERNS;
    }

    /** @return list<string> */
    public static function claimPatterns(): array
    {
        return self::CLAIM_PATTERNS;
    }

    private function ruleViolation(string $plain, Product $product, array $approved): ?string
    {
        foreach (self::CLAIM_PATTERNS as $pattern) {
            if (preg_match($pattern, $plain)) {
                return 'health claim';
            }
        }

        foreach (self::DOSAGE_PATTERNS as $pattern) {
            if (preg_match($pattern, $plain)) {
                return 'dosage instruction';
            }
        }

        /**
         * Rule 1, enforced rather than trusted: every figure must come from the evidence we handed
         * the model.
         *
         * The earlier version of this check only fired when `nutrition_values` was blank — which was
         * defensible while the column was empty on all 309 products, and became a hole the moment
         * Stage 3 started filling it. A populated panel would have licensed the model to print ANY
         * number, including one the panel contradicts. "24 g de protéines" on a page whose label says
         * 21 g is worse than no number at all, because it reads as sourced.
         *
         * `$approved` is built from exactly the facts block in the prompt, so the rule is simply:
         * the model may quote what it was shown and nothing else. Prices, pack sizes and the product
         * name are in that block, so ordinary copy passes untouched.
         */
        $ungrounded = Figures::ungrounded($plain, $approved);
        if ($ungrounded !== []) {
            return 'ungrounded figure ('.implode(', ', array_slice($ungrounded, 0, 4)).')';
        }

        return null;
    }
}
