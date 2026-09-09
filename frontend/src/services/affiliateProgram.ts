/**
 * Affiliate programme — the storefront half of the "Accès Pro" door.
 *
 * ── WHAT THIS MODULE IS ───────────────────────────────────────────────────────────────────
 * The CONTRACT between /partenaires/inscription and the backend, plus two implementations of
 * it: the live HTTP one below, and the in-memory stub in `affiliateProgram.stub.ts`. Exactly
 * one line at the bottom of this file chooses between them, so switching to the real endpoints
 * the day they exist is a one-line change and nothing in the UI moves.
 *
 * Modelled on `services/partners.ts` — same `getApiBaseUrl()`, same axios instance shape, same
 * "turn a Laravel error into one French sentence" discipline — and deliberately kept out of
 * `api.ts` for the same reason that file gives: this is a handful of endpoints used by one
 * route, and folding them in would put them in every page's bundle for nothing.
 *
 * ── WHY AN APPLICATION IS A MULTI-STEP SERVER RECORD, NOT ONE POST ────────────────────────
 * The old /partenaires posted one JSON body and was done. This flow cannot: an ID card is a
 * multipart upload, and an OTP is a round trip that has to be tied to something the server
 * already knows about. So step 2 CREATES a `draft` record and every later step addresses it by
 * id. That also buys resumability for free — the applicant's phone can die between the photo
 * and the SMS and the record is still there.
 *
 * A `draft` grants nothing. No commission rate, no code, no panel access. `submit` moves it to
 * `pending`, which is a request an administrator reviews in Filament. That separation is what
 * makes a public form safe against a money module: the worst a bad actor achieves is noise in a
 * review queue. (docs/affiliate-ecosystem-plan.md §2.6 — note that approve/reject in the admin
 * UI is itself part of the backend build; without it every application is stuck in `pending`.)
 *
 * ── THE RESUME TOKEN ──────────────────────────────────────────────────────────────────────
 * The applicant is NOT authenticated — they have no storefront account and may never want one.
 * So `create` returns an opaque `resume_token` that the browser keeps, and every later call
 * carries it. It is the only credential in the flow, it is scoped to one application record,
 * and it must expire server-side (48h is the value the UI assumes). Addressing a draft by id
 * alone would let anyone enumerate ids and upload an ID card onto someone else's application.
 */
import axios, { type AxiosInstance } from 'axios';
import { stubAffiliateProgramApi } from './affiliateProgram.stub';

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Vocabulary
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * The four affiliate types, as the backend enum spells them
 * (docs/affiliate-ecosystem-plan.md §2.7 adds `individual` and `marketer` to the existing
 * `coach` and `gym`). French labels live in the UI, never on the wire.
 */
export type AffiliateKind = 'individual' | 'coach' | 'gym' | 'marketer';

export const AFFILIATE_KINDS: readonly AffiliateKind[] = ['individual', 'coach', 'gym', 'marketer'];

/** Which side of the identity document an upload carries. */
export type IdDocumentSide = 'front' | 'back';

/**
 * The upload envelope lives in its own leaf module — see `affiliateDocuments.ts` for why — and
 * is re-exported here so a caller still has one import for the whole affiliate surface.
 */
export {
  MAX_DOCUMENT_BYTES,
  ACCEPTED_DOCUMENT_TYPES,
  DOCUMENT_ACCEPT_ATTRIBUTE,
  documentFileError,
  formatBytes,
} from './affiliateDocuments';

/**
 * Where an affiliate signs in. A Filament panel on the ADMIN host — `->id('affilie')` /
 * `->path('affilie')` in AffiliePanelProvider — not a Next.js route, which is why every link to
 * it is a plain `<a>` and never `LinkWithLoading`.
 *
 * One constant so the CNAME switch the plan proposes (§7: `affilie.protein.tn`, so a coach never
 * sees `admin.`) is a single edit rather than a search across the storefront.
 */
export const AFFILIATE_PANEL_URL =
  process.env.NEXT_PUBLIC_AFFILIATE_PANEL_URL ?? 'https://admin.protein.tn/affilie';

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Payloads
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

export interface AffiliateApplicantDetails {
  type: AffiliateKind;
  /** The PERSON. Always required — a gym still has an owner we call back. */
  name: string;
  /** The gym / brand / channel. Required for `gym`, optional for `marketer`, unused otherwise. */
  business_name?: string;
  email: string;
  /** Tunisian mobile, 8 digits, sent WITHOUT the +216 prefix and without spaces. */
  phone: string;
  /** Gouvernorat, in French, from the fixed list in `affiliateCopy.ts`. */
  city: string;
  /** Free text — "40", "~200 adhérents". A string because people do not answer with integers. */
  audience_size?: string;
  /** Set from the `pt_ref` attribution cookie when one affiliate was referred by another. */
  referred_by_code?: string;
}

export type AffiliateApplicationStatus = 'draft' | 'pending' | 'active' | 'rejected' | 'suspended';

/**
 * The server's view of an application. The UI treats this as the single source of truth for
 * "which steps are done" — never its own local booleans — so a resumed session shows the real
 * state even if the local draft is stale or was edited by hand.
 */
export interface AffiliateApplication {
  id: string;
  /** Human-facing reference shown on the confirmation screen, e.g. `AFF-2609-4821`. */
  reference: string;
  status: AffiliateApplicationStatus;
  type: AffiliateKind;
  /** Masked for display: the server never echoes the full contact back. */
  masked_phone: string;
  masked_email: string;
  documents: Record<IdDocumentSide, boolean>;
  phone_verified: boolean;
  email_verified: boolean;
}

/** The shape both OTP channels return. Mirrors the storefront's existing phone-verification
 *  contract in `services/api.ts`, so the countdown/cooldown/attempts UI is the same object. */
export interface OtpChallenge {
  /** `•• •• •• 56` or `a•••@gmail.com`. Display only. */
  masked_destination: string;
  /** Seconds until the code expires. The UI shows a countdown and disables submit at zero. */
  expires_in: number;
  /** Seconds before "Renvoyer le code" is allowed again. */
  resend_after: number;
  attempts_remaining: number;
  /** Only ever set by the STUB, so the demo flow is completable. Live must never send it. */
  demo_code?: string;
}

export interface UploadedDocument {
  side: IdDocumentSide;
  /** Bytes the server accepted. Shown back to the applicant as reassurance. */
  size: number;
}

/**
 * Every method the signup screen can call. Written as an interface rather than loose functions
 * precisely so the stub cannot drift from the live client — `tsc` fails the moment one grows a
 * parameter the other does not have.
 */
export interface AffiliateProgramApi {
  /** True when the UI is talking to the stub, which is what draws the "mode démonstration" note. */
  readonly isStub: boolean;
  /** Step 2. Creates the `draft` record and hands back the resume token with it. */
  createApplication(details: AffiliateApplicantDetails): Promise<AffiliateApplicationCreated>;
  /** Step 2, on a resumed session where the applicant edited their details. */
  updateApplication(
    session: AffiliateApplicationSession,
    details: AffiliateApplicantDetails,
  ): Promise<AffiliateApplication>;
  /** Re-read the server's state. Called once on resume. */
  getApplication(session: AffiliateApplicationSession): Promise<AffiliateApplication>;
  /** Step 3. `multipart/form-data`, one side per call. */
  uploadDocument(
    session: AffiliateApplicationSession,
    side: IdDocumentSide,
    file: File,
  ): Promise<UploadedDocument>;
  /** Steps 4 and 5. */
  sendOtp(session: AffiliateApplicationSession, channel: 'phone' | 'email'): Promise<OtpChallenge>;
  verifyOtp(
    session: AffiliateApplicationSession,
    channel: 'phone' | 'email',
    code: string,
  ): Promise<AffiliateApplication>;
  /** Final. Moves `draft` to `pending` and closes the record to further edits. */
  submitApplication(session: AffiliateApplicationSession): Promise<AffiliateApplication>;
}

/** What the browser keeps between steps. `resume_token` is a credential — see the head of file. */
export interface AffiliateApplicationSession {
  id: string;
  resume_token: string;
}

export interface AffiliateApplicationCreated extends AffiliateApplication {
  resume_token: string;
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Errors — never a raw server string
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * The applicant is a gym owner on a phone, so every failure has to end as one French sentence
 * that names something they can DO. Laravel's own `message` on a 422 is "The given data was
 * invalid." — English, and it names nothing — so the first FIELD error wins instead; that is
 * the one that says which box to fix.
 *
 * Anything unrecognised collapses to a single generic sentence. A stack trace, an English
 * framework string or an HTTP status is never shown.
 */
export function readableAffiliateError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;

    const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
    if (firstFieldError && isFrench(firstFieldError)) return new Error(firstFieldError);

    switch (err.response?.status) {
      case 401:
      case 403:
        return new Error(
          "Votre demande n'est plus valable. Recommencez l'inscription, vos informations ne sont pas perdues.",
        );
      case 404:
        return new Error("Nous ne retrouvons plus cette demande. Recommencez l'inscription.");
      case 409:
        return new Error(
          'Une demande existe déjà avec ces coordonnées. Notre équipe vous rappelle prochainement.',
        );
      case 413:
        return new Error('La photo est trop lourde. Prenez-la à nouveau ou choisissez une image plus légère.');
      case 422:
        return new Error('Certaines informations sont incorrectes. Vérifiez les champs signalés.');
      case 429:
        return new Error('Trop de tentatives. Patientez quelques minutes avant de réessayer.');
      default:
        break;
    }

    if (!err.response) {
      return new Error('Connexion impossible. Vérifiez votre réseau, puis réessayez.');
    }
  }

  return new Error("L'opération a échoué. Réessayez dans un instant, ou appelez-nous.");
}

/**
 * A crude but sufficient guard so an English validation string from the framework is never
 * surfaced verbatim. Laravel's French locale is not guaranteed to be installed on the API, and
 * "The name field is required." in the middle of a French form is worse than our own sentence.
 */
function isFrench(message: string): boolean {
  return !/\b(the|field|must|invalid|required|given data)\b/i.test(message);
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Live implementation
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

const getApiBaseUrl = (): string => {
  // Same-origin proxy in the browser (next.config.js rewrites /api-proxy to the backend) so an
  // ID-card upload is not a cross-origin multipart POST from protein.tn to admin.protein.tn.
  if (typeof window !== 'undefined') return `${window.location.origin}/api-proxy`;
  return process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';
};

let cachedClient: AxiosInstance | null = null;

/**
 * Built lazily, not at module scope. `getApiBaseUrl()` reads `window`, and this module is
 * imported by a page that Next also renders on the server — an eager instance would bake the
 * absolute admin URL into the client bundle and defeat the proxy above.
 */
function client(): AxiosInstance {
  if (!cachedClient) {
    cachedClient = axios.create({
      baseURL: getApiBaseUrl(),
      headers: { Accept: 'application/json' },
      // Generous: step 3 posts a phone photo over a Tunisian mobile connection.
      timeout: 45_000,
    });
  }
  return cachedClient;
}

const auth = (session: AffiliateApplicationSession) => ({
  headers: { 'X-Affilie-Resume-Token': session.resume_token },
});

/**
 * The endpoints this UI expects. Every path is under `/affilie-*` to match the rename map in
 * docs/affiliate-ecosystem-plan.md §6 ("I don't want to see partner").
 *
 *   POST   /affilie-applications                        -> AffiliateApplicationCreated
 *   PATCH  /affilie-applications/{id}                   -> AffiliateApplication
 *   GET    /affilie-applications/{id}                   -> AffiliateApplication
 *   POST   /affilie-applications/{id}/documents         -> UploadedDocument   (multipart)
 *   POST   /affilie-applications/{id}/otp/{channel}     -> OtpChallenge
 *   POST   /affilie-applications/{id}/otp/{channel}/verify -> AffiliateApplication
 *   POST   /affilie-applications/{id}/submit            -> AffiliateApplication
 *
 * All but the first carry `X-Affilie-Resume-Token`.
 */
export const liveAffiliateProgramApi: AffiliateProgramApi = {
  isStub: false,

  async createApplication(details) {
    try {
      const { data } = await client().post<AffiliateApplicationCreated>('/affilie-applications', details);
      return data;
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async updateApplication(session, details) {
    try {
      const { data } = await client().patch<AffiliateApplication>(
        `/affilie-applications/${encodeURIComponent(session.id)}`,
        details,
        auth(session),
      );
      return data;
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async getApplication(session) {
    try {
      const { data } = await client().get<AffiliateApplication>(
        `/affilie-applications/${encodeURIComponent(session.id)}`,
        auth(session),
      );
      return data;
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async uploadDocument(session, side, file) {
    const body = new FormData();
    body.append('side', side);
    body.append('document', file);
    try {
      const { data } = await client().post<UploadedDocument>(
        `/affilie-applications/${encodeURIComponent(session.id)}/documents`,
        body,
        auth(session),
      );
      return data;
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async sendOtp(session, channel) {
    try {
      const { data } = await client().post<OtpChallenge>(
        `/affilie-applications/${encodeURIComponent(session.id)}/otp/${channel}`,
        {},
        auth(session),
      );
      return data;
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async verifyOtp(session, channel, code) {
    try {
      const { data } = await client().post<AffiliateApplication>(
        `/affilie-applications/${encodeURIComponent(session.id)}/otp/${channel}/verify`,
        { code },
        auth(session),
      );
      return data;
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async submitApplication(session) {
    try {
      const { data } = await client().post<AffiliateApplication>(
        `/affilie-applications/${encodeURIComponent(session.id)}/submit`,
        {},
        auth(session),
      );
      return data;
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },
};

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * THE SWAP
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * ══ ONE LINE TO GO LIVE ══════════════════════════════════════════════════════════════════
 *
 * The backend endpoints above DO NOT EXIST YET — `POST /affilie-applications`, the private-disk
 * KYC upload and the OTP wiring are being built separately. Until they land, the screen runs
 * against `stubAffiliateProgramApi`, which keeps the whole flow verifiable end to end in a
 * browser today.
 *
 * To go live: set NEXT_PUBLIC_AFFILIATE_API=live, or delete the ternary and export
 * `liveAffiliateProgramApi` directly. Nothing in `src/app/(shop)/partenaires/**` changes — the
 * UI only ever imports `affiliateProgramApi` and the `AffiliateProgramApi` interface guarantees
 * the two implementations have the same shape.
 *
 * The env flag exists so the live client can be exercised against a staging API without editing
 * a tracked file, and so this stub can never silently reach production behind a forgotten
 * boolean: shipping with the flag unset is a deliberate, visible state ("mode démonstration" is
 * printed on the screen itself, see `isStub`).
 */
export const affiliateProgramApi: AffiliateProgramApi =
  process.env.NEXT_PUBLIC_AFFILIATE_API === 'live' ? liveAffiliateProgramApi : stubAffiliateProgramApi;
