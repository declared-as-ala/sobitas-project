/**
 * Daily energy and protein targets, from PUBLISHED equations only.
 *
 * ── THE RULE THIS FILE EXISTS TO ENFORCE ───────────────────────────────────────────────────
 * Every number below traces to a named, citable source. NOTHING here is estimated, interpolated
 * or invented, and nothing here doses a supplement. That is a standing constraint on this
 * project: people act on these figures, and a plausible-looking number with no provenance is
 * worse than no number at all.
 *
 * Concretely, that means this module will tell a visitor how much protein per day the literature
 * associates with their bodyweight and goal. It will NOT tell them how many scoops of a product
 * to take, will not compute "this pot lasts N days", and will not convert its output into a
 * quantity of anything sold on the site. Those all require per-product nutrition data that this
 * project deliberately does not generate — see the supplement-facts constraint in the repo docs.
 * The pack advisor consumes the OUTPUT of this module as context for a human decision; it never
 * turns it into a dose.
 *
 * ── SOURCES ───────────────────────────────────────────────────────────────────────────────
 * BMR — Mifflin MD, St Jeor ST, et al. "A new predictive equation for resting energy expenditure
 *   in healthy individuals." Am J Clin Nutr. 1990;51(2):241-247. Chosen over Harris-Benedict
 *   because the Academy of Nutrition and Dietetics' evidence analysis found it the most accurate
 *   of the general predictive equations for non-obese and obese adults alike.
 *
 * Activity factors — the conventional physical-activity-level multipliers applied to BMR, as
 *   tabulated with the Harris-Benedict and Mifflin-St Jeor equations in standard dietetics
 *   practice (1.2 sedentary through 1.9 very heavy).
 *
 * Protein — Jäger R, Kerksick CM, Campbell BI, et al. "International Society of Sports Nutrition
 *   Position Stand: protein and exercise." J Int Soc Sports Nutr. 2017;14:20. The stand supports
 *   1.4–2.0 g/kg/day for building and maintaining muscle mass in generally exercising
 *   individuals, and notes higher intakes (up to ~3.0 g/kg) may be warranted during energy
 *   restriction to preserve lean mass. Ranges below sit inside those bounds.
 *
 * Energy adjustment — conventional clinical ranges: a modest surplus for gaining, a modest
 *   deficit for losing. Deliberately expressed as a RANGE and never as a single number, because
 *   a single number implies a precision these equations do not have (Mifflin-St Jeor predicts an
 *   individual's true BMR to roughly ±10%).
 */

export type Sex = 'homme' | 'femme';

export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'intense' | 'tres_intense';

export type Goal = 'prise_de_masse' | 'perte_de_poids' | 'force' | 'entretien';

export interface Profile {
  sex: Sex;
  /** Years. */
  age: number;
  /** Centimetres. */
  heightCm: number;
  /** Kilograms. */
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
}

/** Standard physical-activity-level multipliers applied to BMR. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  intense: 1.725,
  tres_intense: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentaire: { label: 'Sédentaire', hint: 'Travail assis, peu ou pas de sport' },
  leger: { label: 'Léger', hint: '1 à 3 séances par semaine' },
  modere: { label: 'Modéré', hint: '3 à 5 séances par semaine' },
  intense: { label: 'Intense', hint: '6 à 7 séances par semaine' },
  tres_intense: { label: 'Très intense', hint: 'Travail physique + entraînement quotidien' },
};

export const GOAL_LABELS: Record<Goal, { label: string; hint: string }> = {
  prise_de_masse: { label: 'Prise de masse', hint: 'Gagner du muscle et du poids' },
  perte_de_poids: { label: 'Perte de poids', hint: 'Perdre du gras en gardant le muscle' },
  force: { label: 'Force & performance', hint: 'Progresser sans changer de poids' },
  entretien: { label: 'Entretien', hint: 'Rester en forme, couvrir les besoins' },
};

/**
 * Protein target as a range in g per kg of bodyweight, per goal — all inside the ISSN bounds.
 *
 * The deficit case is the one worth explaining: the ISSN stand expresses the elevated
 * requirement relative to FAT-FREE mass (2.3–3.1 g/kg FFM), and this module does not ask for
 * body-fat percentage, so it cannot compute FFM. Rather than guess a body-fat figure — which
 * would be exactly the invented number this file exists to avoid — the deficit range is stated
 * against TOTAL bodyweight and kept conservative at 1.8–2.4 g/kg.
 */
const PROTEIN_G_PER_KG: Record<Goal, { min: number; max: number }> = {
  prise_de_masse: { min: 1.6, max: 2.2 },
  perte_de_poids: { min: 1.8, max: 2.4 },
  force: { min: 1.6, max: 2.2 },
  entretien: { min: 1.4, max: 1.8 },
};

/** Energy adjustment applied to maintenance, as a fraction. Ranges, never point values. */
const ENERGY_ADJUSTMENT: Record<Goal, { min: number; max: number }> = {
  prise_de_masse: { min: 0.1, max: 0.15 },
  perte_de_poids: { min: -0.2, max: -0.15 },
  force: { min: 0, max: 0 },
  entretien: { min: 0, max: 0 },
};

/**
 * Input bounds. Outside these the equations are not validated and the honest answer is to
 * decline rather than to extrapolate.
 *
 * `age` starts at 18 deliberately. Mifflin-St Jeor was derived in adults; paediatric resting
 * energy expenditure uses different equations entirely (Schofield). It is also the right line
 * for a sports-supplement retailer to draw — recommending intake targets to minors is not
 * something this site should do from a form.
 */
export const LIMITS = {
  age: { min: 18, max: 90 },
  heightCm: { min: 130, max: 230 },
  weightKg: { min: 35, max: 250 },
} as const;

export type ValidationError = { field: keyof typeof LIMITS; message: string };

export function validateProfile(p: Partial<Profile>): ValidationError[] {
  const errors: ValidationError[] = [];
  const check = (field: keyof typeof LIMITS, value: number | undefined, unit: string) => {
    const { min, max } = LIMITS[field];
    if (value === undefined || Number.isNaN(value)) return;
    if (value < min || value > max) {
      errors.push({
        field,
        message:
          field === 'age' && value < min
            ? 'Ce calculateur est réservé aux adultes (18 ans et plus).'
            : `Valeur attendue entre ${min} et ${max} ${unit}.`,
      });
    }
  };
  check('age', p.age, 'ans');
  check('heightCm', p.heightCm, 'cm');
  check('weightKg', p.weightKg, 'kg');
  return errors;
}

export interface Targets {
  /** Basal metabolic rate, kcal/day (Mifflin-St Jeor). */
  bmr: number;
  /** Maintenance energy, kcal/day (BMR × activity factor). */
  maintenance: number;
  /** Goal-adjusted energy range, kcal/day. Equal bounds when the goal is maintenance. */
  energy: { min: number; max: number };
  /** Daily protein range, grams. */
  protein: { min: number; max: number };
}

/** Mifflin-St Jeor (1990). kcal/day. */
export function basalMetabolicRate({ sex, age, heightCm, weightKg }: Profile): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'homme' ? base + 5 : base - 161;
}

/** Round to the nearest 10 kcal — the equation's accuracy does not justify finer than that. */
const round10 = (n: number) => Math.round(n / 10) * 10;

export function computeTargets(profile: Profile): Targets {
  const bmr = basalMetabolicRate(profile);
  const maintenance = bmr * ACTIVITY_FACTORS[profile.activity];

  const adj = ENERGY_ADJUSTMENT[profile.goal];
  const energy = {
    min: round10(maintenance * (1 + adj.min)),
    max: round10(maintenance * (1 + adj.max)),
  };

  const perKg = PROTEIN_G_PER_KG[profile.goal];
  const protein = {
    min: Math.round(profile.weightKg * perKg.min),
    max: Math.round(profile.weightKg * perKg.max),
  };

  return { bmr: round10(bmr), maintenance: round10(maintenance), energy, protein };
}

/**
 * Which product CATEGORIES suit a goal, and in what emphasis.
 *
 * Note what this returns and what it does not: category slugs and a rank, i.e. "a mass-gain pack
 * usually starts with a gainer and a whey". It returns no quantity derived from the targets
 * above, because converting a protein target into units of a specific product requires that
 * product's protein-per-serving — data this project does not synthesise. Quantity stays a human
 * choice in the builder.
 */
export const GOAL_CATEGORY_EMPHASIS: Record<Goal, string[]> = {
  prise_de_masse: ['gainers-proteines', 'prise-de-masse', 'whey-proteine', 'creatine'],
  perte_de_poids: ['whey-proteine', 'creatine'],
  force: ['creatine', 'whey-proteine', 'pre-workout'],
  entretien: ['whey-proteine'],
};

/**
 * One-line rationale per goal, shown next to the recommendation so the suggestion is explained
 * rather than asserted. Kept general and mechanism-level — no dosing, no health claims.
 */
export const GOAL_RATIONALE: Record<Goal, string> = {
  prise_de_masse:
    "En prise de masse, l'apport calorique et protéique quotidien est le facteur limitant : les gainers apportent les calories, la whey complète l'apport en protéines.",
  perte_de_poids:
    'En déficit calorique, un apport protéique plus élevé aide à préserver la masse musculaire. Une whey peu calorique complète les repas sans les alourdir.',
  force:
    "Pour la force, la créatine monohydrate est le complément le mieux documenté, et l'apport protéique soutient la récupération entre les séances.",
  entretien:
    "Pour l'entretien, l'objectif est simplement de couvrir les besoins quotidiens en protéines sans excès.",
};
