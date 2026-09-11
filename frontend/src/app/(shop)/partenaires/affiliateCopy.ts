/**
 * The words and the rules of the affiliate surface, in ONE place.
 *
 * The landing page and the five-step signup both describe the same four profiles, the same 24
 * gouvernorats and the same phone shape. When those lived in two components they drifted: the
 * old /partenaires offered "coach" and "gym" while the programme is being opened to four types,
 * so a marketeur reading the page found no box that described them.
 *
 * Deliberately a `.ts` file with no JSX and NO className strings. `scripts/lint-design.mjs` only
 * walks `.tsx`, so a constants module holding Tailwind strings is a hole in the ratchet — the
 * exact trap that hid `aspect-[4/5]` from Tailwind's content scan in `util/productCardFrame.ts`.
 * Icons are components, which is a value and not a style, so they belong here; classes do not.
 */
import { Building2, Megaphone, UserRound, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AffiliateKind } from '@/services/affiliateProgram';

export interface AffiliateProfile {
  kind: AffiliateKind;
  /** The label on the card and in the stepper summary. */
  label: string;
  icon: LucideIcon;
  /** One line under the label — who this is, in the applicant's own words. */
  tagline: string;
  /**
   * The argument. A coach and a gym owner are different buyers with different objections: a
   * coach worries about looking like a salesperson, a gym worries about stock and cash. This is
   * the persuasive copy the old page carried, kept and extended to the two new types.
   */
  pitch: string;
  /** What the identity field is called for this profile. A gym is not "your full name". */
  nameLabel: string;
  namePlaceholder: string;
  /** Set when the profile also has an entity to name (a gym, a page, a brand). */
  businessLabel?: string;
  businessPlaceholder?: string;
  /** Required for a gym — an application with no gym name cannot be reviewed. */
  businessRequired?: boolean;
  /** "Nombre de clients suivis" vs "Nombre d'adhérents" vs "Nombre d'abonnés". */
  audienceLabel: string;
  audiencePlaceholder: string;
}

export const AFFILIATE_PROFILES: readonly AffiliateProfile[] = [
  {
    kind: 'individual',
    label: 'Individuel',
    icon: UserRound,
    tagline: 'Vous vous entraînez et on vous demande conseil.',
    pitch:
      "Vous n'avez ni salle ni clients, mais votre entourage vous demande quoi prendre. Partagez votre code : ils économisent, vous touchez une commission sur chaque commande livrée.",
    nameLabel: 'Votre nom et prénom',
    namePlaceholder: 'Ex. Ali Ben Salah',
    audienceLabel: 'Nombre de personnes autour de vous',
    audiencePlaceholder: 'Ex. 15',
  },
  {
    kind: 'coach',
    label: 'Coach sportif',
    icon: Users,
    tagline: 'Vous suivez des clients en salle ou à distance.',
    pitch:
      'Vos clients vous demandent déjà quoi prendre. Donnez-leur un code de réduction à votre nom : ils économisent, vous êtes rémunéré, et vous ne vendez rien vous-même.',
    nameLabel: 'Votre nom et prénom',
    namePlaceholder: 'Ex. Ali Ben Salah',
    businessLabel: 'Nom de votre activité',
    businessPlaceholder: 'Ex. Coaching Ali (facultatif)',
    audienceLabel: 'Nombre de clients suivis',
    audiencePlaceholder: 'Ex. 40',
  },
  {
    kind: 'gym',
    label: 'Salle de sport',
    icon: Building2,
    tagline: 'Vous gérez une salle et ses adhérents.',
    pitch:
      "Vos adhérents achètent leurs compléments ailleurs. Récupérez cette valeur sans gérer de stock, sans avancer de trésorerie et sans rayon à tenir.",
    nameLabel: 'Nom et prénom du responsable',
    namePlaceholder: 'Ex. Ali Ben Salah',
    businessLabel: 'Nom de la salle',
    businessPlaceholder: 'Ex. Iron Gym Sousse',
    businessRequired: true,
    audienceLabel: "Nombre d'adhérents",
    audiencePlaceholder: 'Ex. 200',
  },
  {
    kind: 'marketer',
    label: 'Créateur / marketeur',
    icon: Megaphone,
    tagline: 'Vous avez une audience en ligne.',
    pitch:
      'Page, chaîne ou groupe : vous avez déjà une audience qui vous fait confiance. Un lien suivi, une commission sur chaque commande livrée, et un tableau de bord qui montre exactement ce que chaque publication a rapporté.',
    nameLabel: 'Votre nom et prénom',
    namePlaceholder: 'Ex. Ali Ben Salah',
    businessLabel: 'Nom de votre page ou chaîne',
    businessPlaceholder: 'Ex. @fitness.tn',
    audienceLabel: "Taille de votre audience",
    audiencePlaceholder: 'Ex. 12 000 abonnés',
  },
];

export const AFFILIATE_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Qui peut devenir affilié Protein.tn ?',
    answer: "Tout le monde en Tunisie : un coach, une salle de sport, un créateur de contenu ou un simple passionné. Vous choisissez le profil qui vous ressemble à l'inscription ; cela adapte seulement les questions posées, pas vos droits ni votre commission.",
  },
  {
    question: 'Comment et quand suis-je payé ?',
    answer: "Chaque vendredi. Vous êtes réglé en espèces à la boutique ou par virement bancaire, au choix. La commission est acquise dès qu'une commande passée avec votre code est livrée.",
  },
  {
    question: 'Combien puis-je gagner ?',
    answer: "Vous ne touchez pas un pourcentage fixe : pour chaque produit, la boutique fixe un « prix affilié » et vous revendez au prix que vous voulez au-dessus. Vous gardez toute la différence. Exemple : sur une vente à 330.000 DT d'un produit dont le prix affilié est 285.000 DT, votre gain est de 45.000 DT.",
  },
  {
    question: "Dois-je gérer un stock ou avancer de l'argent ?",
    answer: "Non. Vous ne stockez rien et vous n'avancez rien. Nous gérons la commande, le paiement à la livraison, l'expédition et le service client. Vous partagez votre code ou votre lien, c'est tout.",
  },
  {
    question: 'Comment mes clients utilisent-ils mon code ?',
    answer: "Ils saisissent votre code de réduction au moment du paiement, ou passent par votre lien de suivi — les deux vous sont attribués. Ils bénéficient d'une remise réelle à votre nom et la commande vous est créditée.",
  },
  {
    question: 'Combien de temps pour être accepté ?',
    answer: "En général sous 48 heures. Après votre inscription — profil, coordonnées, pièce d'identité, puis deux codes de confirmation — une personne de notre équipe vérifie votre dossier et vous appelle pour convenir de votre marge.",
  },
  {
    question: "Pourquoi vérifiez-vous ma pièce d'identité ?",
    answer: "Parce que nous versons de l'argent sur un compte à votre nom. Elle sert uniquement à confirmer votre identité ; elle n'est jamais publiée et n'est visible que par l'équipe qui valide votre dossier.",
  },
];

export function profileOf(kind: AffiliateKind): AffiliateProfile {
  return AFFILIATE_PROFILES.find((p) => p.kind === kind) ?? AFFILIATE_PROFILES[0];
}

/** Accepts a `?type=` value from a landing-page link and refuses anything else. */
export function parseAffiliateKind(value: string | null | undefined): AffiliateKind | null {
  return AFFILIATE_PROFILES.some((p) => p.kind === value) ? (value as AffiliateKind) : null;
}

/** The 24 gouvernorats, in the order Tunisians list them. */
export const GOUVERNORATS = [
  'Tunis', 'Ariana', 'Ben Arous', 'La Manouba', 'Nabeul', 'Bizerte', 'Béja', 'Jendouba', 'Le Kef',
  'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili', 'Zaghouan',
] as const;

/** Tunisian mobile numbers are 8 digits starting 2/4/5/9, optionally prefixed +216. */
const PHONE_RE = /^(?:\+?216)?[\s.-]?[2459]\d[\s.-]?\d{3}[\s.-]?\d{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Strip to the 8 significant digits — what the API is sent, and what OTP is keyed on. */
export function normalisePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^216/, '').slice(-8);
}

/**
 * What step 2 collects. `business` and `audience` are always present as strings and simply unused
 * by profiles that do not ask for them — an optional key here would mean every consumer handling
 * `undefined` for a controlled input, which is how a React form grows an uncontrolled-input warning.
 */
export interface IdentityValues {
  name: string;
  business: string;
  email: string;
  phone: string;
  city: string;
  audience: string;
}

export const EMPTY_IDENTITY: IdentityValues = {
  name: '',
  business: '',
  email: '',
  phone: '',
  city: '',
  audience: '',
};

/**
 * Every message names the thing to change and, where a format is involved, shows one.
 * "Numéro invalide" tells a gym owner nothing; "Entrez un numéro tunisien à 8 chiffres.
 * Exemple : 20 123 456" tells them exactly what to type.
 */
export const validators = {
  name: (v: string) => (v.trim().length < 3 ? 'Indiquez votre nom complet, au moins 3 lettres.' : undefined),
  business: (v: string, required: boolean, label: string) =>
    required && v.trim().length < 2 ? `Indiquez le ${label.toLowerCase()}.` : undefined,
  email: (v: string) =>
    EMAIL_RE.test(v.trim()) ? undefined : "Cette adresse e-mail n'a pas l'air correcte. Exemple : nom@gmail.com",
  phone: (v: string) =>
    PHONE_RE.test(v.trim()) ? undefined : 'Entrez un numéro tunisien à 8 chiffres. Exemple : 20 123 456',
  city: (v: string) => (v ? undefined : 'Choisissez votre gouvernorat dans la liste.'),
};

export type IdentityErrors = Partial<Record<keyof IdentityValues, string>>;

export function identityErrors(values: IdentityValues, profile: AffiliateProfile): IdentityErrors {
  const errors: IdentityErrors = {};
  const name = validators.name(values.name);
  if (name) errors.name = name;
  if (profile.businessLabel) {
    const business = validators.business(
      values.business,
      Boolean(profile.businessRequired),
      profile.businessLabel,
    );
    if (business) errors.business = business;
  }
  const phone = validators.phone(values.phone);
  if (phone) errors.phone = phone;
  const email = validators.email(values.email);
  if (email) errors.email = email;
  const city = validators.city(values.city);
  if (city) errors.city = city;
  return errors;
}

/* ── The signup steps, named once ──────────────────────────────────────────────────────────── */

export const SIGNUP_STEPS = [
  { id: 'type', label: 'Profil', title: 'Vous êtes…', help: 'Choisissez ce qui vous décrit le mieux.' },
  { id: 'identity', label: 'Coordonnées', title: 'Vos coordonnées', help: 'Pour vous rappeler et créer votre compte.' },
  { id: 'kyc', label: 'Identité', title: 'Votre pièce d’identité', help: 'Obligatoire pour être payé.' },
  { id: 'phone', label: 'Téléphone', title: 'Confirmez votre téléphone', help: 'Un code par SMS.' },
  { id: 'email', label: 'E-mail', title: 'Confirmez votre e-mail', help: 'Un code par e-mail.' },
] as const;

export type SignupStepId = (typeof SIGNUP_STEPS)[number]['id'];

/** What a usable photo of a CIN looks like. Shown next to the two upload tiles. */
export const GOOD_PHOTO_RULES = [
  'Les quatre coins de la carte sont visibles',
  'Le texte se lit sans effort, sans flou',
  'Aucun reflet, aucun flash sur la carte',
  'Posez-la sur une table, pas dans la main',
] as const;
