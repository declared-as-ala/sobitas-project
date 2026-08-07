<?php

namespace App\Support;

/**
 * French names for the nutrients that appear on a Supplement Facts panel.
 *
 * ── THIS IS A LOOKUP, NOT A TRANSLATOR ────────────────────────────────────────────────────
 * Every entry below is a regulated nutrient term with one settled French equivalent — the same
 * words Règlement (UE) n° 1169/2011 uses on every French food label. "Protein" → "Protéines" renames
 * a row; it does not change a number, and leaving it in English on a French page is both worse for
 * the reader and worse for the query it should rank for.
 *
 * A name that is not in this table comes through UNCHANGED. That is deliberate and it is the whole
 * safety property: botanicals, proprietary blends, enzymes and branded ingredients are not
 * translated, because "Butchers Broom" guessed into French is how a page ends up naming a different
 * plant. Adding an entry here is an editorial act, not an automatic one.
 *
 * Matching is case- and punctuation-insensitive so "Total Fat", "TOTAL FAT" and "Total  Fat" are one
 * key, but it is never fuzzy: an unrecognised name is left alone rather than matched to its nearest
 * neighbour.
 */
final class NutrientNames
{
    /**
     * Regulated nutrient terms only. Grouped as DSLD categorises them, so the boundary between
     * "translated" and "left verbatim" stays visible.
     *
     * @var array<string, string>
     */
    private const FRENCH = [
        // ── Energy ────────────────────────────────────────────────────────────────────────
        'calories' => 'Calories',
        'calories from fat' => 'Calories provenant des lipides',
        'energy' => 'Énergie',

        // ── Macronutrients ────────────────────────────────────────────────────────────────
        'protein' => 'Protéines',
        'proteins' => 'Protéines',
        'total fat' => 'Lipides totaux',
        'fat' => 'Lipides',
        'saturated fat' => 'Acides gras saturés',
        'trans fat' => 'Acides gras trans',
        'monounsaturated fat' => 'Acides gras mono-insaturés',
        'polyunsaturated fat' => 'Acides gras polyinsaturés',
        'cholesterol' => 'Cholestérol',
        'total carbohydrate' => 'Glucides totaux',
        'total carbohydrates' => 'Glucides totaux',
        'carbohydrate' => 'Glucides',
        'carbohydrates' => 'Glucides',
        'sugar' => 'Sucres',
        'sugars' => 'Sucres',
        'total sugars' => 'Sucres totaux',
        'added sugars' => 'Sucres ajoutés',
        'dietary fiber' => 'Fibres alimentaires',
        'soluble fiber' => 'Fibres solubles',
        'insoluble fiber' => 'Fibres insolubles',
        'salt' => 'Sel',

        // ── Vitamins ──────────────────────────────────────────────────────────────────────
        'vitamin a' => 'Vitamine A',
        'vitamin c' => 'Vitamine C',
        'vitamin d' => 'Vitamine D',
        'vitamin d3' => 'Vitamine D3',
        'vitamin e' => 'Vitamine E',
        'vitamin k' => 'Vitamine K',
        'vitamin b6' => 'Vitamine B6',
        'vitamin b12' => 'Vitamine B12',
        'thiamin' => 'Thiamine (vitamine B1)',
        'thiamine' => 'Thiamine (vitamine B1)',
        'riboflavin' => 'Riboflavine (vitamine B2)',
        'niacin' => 'Niacine (vitamine B3)',
        'pantothenic acid' => 'Acide pantothénique (vitamine B5)',
        'folate' => 'Folates',
        'folic acid' => 'Acide folique',
        'biotin' => 'Biotine',
        'choline' => 'Choline',

        // ── Minerals ──────────────────────────────────────────────────────────────────────
        'calcium' => 'Calcium',
        'chloride' => 'Chlorure',
        'chromium' => 'Chrome',
        'copper' => 'Cuivre',
        'iodine' => 'Iode',
        'iron' => 'Fer',
        'magnesium' => 'Magnésium',
        'manganese' => 'Manganèse',
        'molybdenum' => 'Molybdène',
        'phosphorus' => 'Phosphore',
        'potassium' => 'Potassium',
        'selenium' => 'Sélénium',
        'sodium' => 'Sodium',
        'zinc' => 'Zinc',

        // ── Amino acids ───────────────────────────────────────────────────────────────────
        // Included because they are the rows customers of a protein shop actually read, and their
        // French forms differ only by accents and standard endings.
        'alanine' => 'Alanine',
        'arginine' => 'Arginine',
        'aspartic acid' => 'Acide aspartique',
        'cystine' => 'Cystine',
        'cysteine' => 'Cystéine',
        'glutamic acid' => 'Acide glutamique',
        'glutamine' => 'Glutamine',
        'l-glutamine' => 'L-Glutamine',
        'glycine' => 'Glycine',
        'histidine' => 'Histidine',
        'isoleucine' => 'Isoleucine',
        'leucine' => 'Leucine',
        'lysine' => 'Lysine',
        'methionine' => 'Méthionine',
        'phenylalanine' => 'Phénylalanine',
        'proline' => 'Proline',
        'serine' => 'Sérine',
        'threonine' => 'Thréonine',
        'tryptophan' => 'Tryptophane',
        'tyrosine' => 'Tyrosine',
        'valine' => 'Valine',
    ];

    /**
     * The French name, or null when this one is not in the table.
     *
     * Null is the normal, safe answer for anything that is not a regulated nutrient — the caller
     * keeps the manufacturer's own wording.
     */
    public static function french(string $name): ?string
    {
        return self::FRENCH[self::key($name)] ?? null;
    }

    /** The French name when we have one, the original otherwise. */
    public static function display(string $name): string
    {
        return self::french($name) ?? $name;
    }

    /**
     * Normalise for lookup only. Trailing footnote daggers and asterisks are common on transcribed
     * labels ("Protein**"), and a stray character must not cost a row its French name.
     */
    private static function key(string $name): string
    {
        $key = mb_strtolower(trim($name));
        $key = preg_replace('~[*†‡§]+~u', '', $key) ?? $key;
        $key = preg_replace('~\s+~u', ' ', $key) ?? $key;

        return trim($key);
    }
}
