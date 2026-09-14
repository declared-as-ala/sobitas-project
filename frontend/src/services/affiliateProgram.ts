/**
 * Affiliate programme — the storefront half of the "Accès Pro" door.
 *
 * ── WHAT THIS MODULE IS ───────────────────────────────────────────────────────────────────
 * The CONTRACT between /partenaires/inscription and the backend, plus two implementations of
 * it: the live HTTP one below, and the in-memory stub in `affiliateProgram.stub.ts`. Exactly
 * one line at the bottom of this file chooses between them, so switching to the real endpoints
 * the day they exist is a one-line change and nothing in the UI moves.
 *
 * Modelled on the retired `services/partners.ts` — same `getApiBaseUrl()`, same axios shape, same
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

/**
 * The `resume_token` IS a Sanctum bearer token — `POST /affilie-applications` mints a scoped token
 * for the applicant's (shadow) account, and every `/me` route is `auth:sanctum`. So it travels as a
 * standard Authorization header, not a custom one. (An earlier draft of this client invented an
 * `X-Affilie-Resume-Token` header and `/{id}` routes; the backend that shipped uses neither.)
 */
const auth = (session: AffiliateApplicationSession) => ({
  headers: { Authorization: `Bearer ${session.resume_token}` },
});

/** Display-only masking. The backend's applicant state returns the real contact (it is the
 *  applicant's own record), so the resume screen masks it here; the OTP screens get their masked
 *  destination from `sendOtp` instead. */
function maskPhone(phone: string): string {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 2 ? `•• •• •• ${digits.slice(-2)}` : String(phone);
}
function maskEmail(email: string): string {
  const [user, domain] = String(email).split('@');
  if (!domain || !user) return String(email);
  return `${user.slice(0, 1)}•••@${domain}`;
}

/** The backend's applicant view (`AffilieApplicationController::publicState`) — the shape every
 *  `/me` route returns. Mapped into the UI's `AffiliateApplication` by `toApplication`. */
interface BackendApplicantState {
  reference: string;
  status: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  phone_verified: boolean;
  email_verified: boolean;
  kyc?: { status?: string; id_front?: boolean; id_back?: boolean };
}

function toApplication(id: string, s: BackendApplicantState): AffiliateApplication {
  return {
    id,
    reference: s.reference,
    status: (s.status as AffiliateApplicationStatus) ?? 'pending',
    type: (s.type as AffiliateKind) ?? 'individual',
    masked_phone: maskPhone(s.phone ?? ''),
    masked_email: maskEmail(s.email ?? ''),
    documents: { front: Boolean(s.kyc?.id_front), back: Boolean(s.kyc?.id_back) },
    phone_verified: Boolean(s.phone_verified),
    email_verified: Boolean(s.email_verified),
  };
}

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
      const { data } = await client().post<{
        reference: string;
        status?: string;
        resume_token: string | null;
        requires_login?: boolean;
        linked_account?: boolean;
      }>('/affilie-applications', details);

      // The address already has a storefront account. The backend refuses to mint a session for a
      // merely-typed e-mail (that would be account takeover through a public form), so the applicant
      // has to sign in — after which the server attaches this application to them automatically.
      if (data.requires_login || !data.resume_token) {
        throw new AffiliateLoginRequiredError();
      }

      return {
        id: data.reference,
        reference: data.reference,
        status: (data.status as AffiliateApplicationStatus) ?? 'pending',
        type: details.type,
        masked_phone: maskPhone(details.phone),
        masked_email: maskEmail(details.email),
        documents: { front: false, back: false },
        phone_verified: false,
        email_verified: false,
        resume_token: data.resume_token,
      };
    } catch (err) {
      // Re-throw our own signalling error unchanged; only server/transport errors get translated.
      if (err instanceof AffiliateLoginRequiredError) throw err;
      throw readableAffiliateError(err);
    }
  },

  // The backend has no update endpoint — details are persisted at creation. Re-read server state so
  // a resumed session still reflects the truth. (Editing details after creation is not yet
  // supported server-side; the fields shown are the ones the applicant submitted.)
  async updateApplication(session) {
    return liveAffiliateProgramApi.getApplication(session);
  },

  async getApplication(session) {
    try {
      const { data } = await client().get<BackendApplicantState>(
        '/affilie-applications/me',
        auth(session),
      );
      return toApplication(session.id, data);
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async uploadDocument(session, side, file) {
    // The backend keys each side as its own multipart field (`id_front` / `id_back`), one side per
    // call, rather than a `side` + `document` pair.
    const body = new FormData();
    body.append(side === 'front' ? 'id_front' : 'id_back', file);
    try {
      await client().post<BackendApplicantState>('/affilie-applications/me/kyc', body, auth(session));
      // The endpoint returns the whole applicant state; the UI only needs the accepted size back.
      return { side, size: file.size };
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async sendOtp(session, channel) {
    try {
      if (channel === 'phone') {
        // The send endpoint needs the number in the body; read it from the applicant's own record
        // (the one they created in step 2) rather than trusting anything the client kept.
        const state = await client().get<BackendApplicantState>(
          '/affilie-applications/me',
          auth(session),
        );
        const phone = state.data.phone ?? '';
        const { data } = await client().post<Record<string, unknown>>(
          '/affilie-applications/me/phone-otp',
          { phone },
          auth(session),
        );
        return {
          masked_destination:
            (data.masked_destination as string) ?? (data.masked_phone as string) ?? maskPhone(phone),
          expires_in: Number(data.expires_in ?? 120),
          resend_after: Number(data.resend_after ?? 30),
          attempts_remaining: Number(data.attempts_remaining ?? 3),
        };
      }
      const { data } = await client().post<Record<string, unknown>>(
        '/affilie-applications/me/email-otp',
        {},
        auth(session),
      );
      return {
        masked_destination:
          (data.masked_destination as string) ?? maskEmail(String((data.email as string) ?? '')),
        expires_in: Number(data.expires_in ?? 600),
        resend_after: Number(data.resend_after ?? 60),
        attempts_remaining: Number(data.attempts_remaining ?? 5),
      };
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  async verifyOtp(session, channel, code) {
    try {
      const { data } = await client().post<BackendApplicantState>(
        `/affilie-applications/me/${channel}-otp/verify`,
        { code },
        auth(session),
      );
      return toApplication(session.id, data);
    } catch (err) {
      throw readableAffiliateError(err);
    }
  },

  // No `/submit` on the backend: `store` creates the record as `pending`, and KYC + OTP enrich it in
  // place. The final screen just needs the confirmed server state.
  async submitApplication(session) {
    return liveAffiliateProgramApi.getApplication(session);
  },
};

/**
 * Signals that the application e-mail already belongs to a storefront account. Thrown by
 * `createApplication` so the screen can show the "please sign in" message with a French sentence
 * rather than a raw 4xx — it carries no server string.
 */
class AffiliateLoginRequiredError extends Error {
  constructor() {
    super(
      'Un compte existe déjà avec cette adresse e-mail. Connectez-vous, puis revenez : votre candidature sera rattachée à votre compte automatiquement.',
    );
    this.name = 'AffiliateLoginRequiredError';
  }
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * THE SWAP
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * ══ LIVE BY DEFAULT — the backend endpoints now exist ══════════════════════════════════════
 *
 * `AffilieApplicationController` (filament/app/Http/Controllers/Api/AffilieApplicationController.php)
 * ships the public `POST /affilie-applications` and the authenticated `/me/kyc`, `/me/phone-otp`,
 * `/me/email-otp` routes this client targets, so the storefront now talks to the real backend and
 * "mode démonstration" no longer appears in production.
 *
 * The stub stays for local UI work when the backend is not to hand, reachable with
 * NEXT_PUBLIC_AFFILIATE_API=stub. Nothing in `src/app/(shop)/partenaires/**` changes: the UI only
 * imports `affiliateProgramApi`, and the `AffiliateProgramApi` interface keeps both in shape.
 */
export const affiliateProgramApi: AffiliateProgramApi =
  process.env.NEXT_PUBLIC_AFFILIATE_API === 'stub' ? stubAffiliateProgramApi : liveAffiliateProgramApi;
