/**
 * ══ STUB — NOT A BACKEND ══════════════════════════════════════════════════════════════════
 *
 * An in-browser stand-in for the affiliate application endpoints, which do not exist yet. It
 * exists so /partenaires/inscription is fully clickable — including the ID-card upload and both
 * OTP round trips — while the real `POST /affilie-applications`, the private-disk KYC upload and
 * the SMS/e-mail wiring are built separately.
 *
 * It is selected by the LAST LINE of `affiliateProgram.ts` and by nothing else. When the API is
 * ready, set NEXT_PUBLIC_AFFILIATE_API=live; this file then loads but is never called, and it can
 * be deleted in the same commit that removes the ternary.
 *
 * ── HOW IT IS KEPT HONEST ─────────────────────────────────────────────────────────────────
 * It implements `AffiliateProgramApi`, so `tsc` fails if the two drift. It also reproduces the
 * FAILURES the UI has to survive, not only the happy path — a wrong OTP burns an attempt, an
 * expired challenge is refused, a resend before the cooldown is refused, an oversized or
 * non-image file is rejected. A stub that only ever succeeds teaches the UI nothing and is how a
 * form ships with no error states.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────────────────────
 * It never keeps the image bytes. The file is measured and thrown away — see `uploadDocument`.
 * Persisting an identity document into `localStorage` to make a demo prettier would put a scan
 * of somebody's CIN in a store that survives the tab, is readable by any script on the origin,
 * and is exactly the class of mistake the plan calls out for the server side (§8: KYC must not
 * use `disk('public')`).
 *
 * `isStub` is true, which is what makes the screen draw its "mode démonstration" notice with the
 * code in it. That notice is the only reason this is safe to have on a route a customer can
 * reach: nobody can mistake it for a real submission.
 */
import { documentFileError } from './affiliateDocuments';
import type {
  AffiliateApplicantDetails,
  AffiliateApplication,
  AffiliateApplicationCreated,
  AffiliateApplicationSession,
  AffiliateProgramApi,
  IdDocumentSide,
  OtpChallenge,
  UploadedDocument,
} from './affiliateProgram';

/** The code the demo accepts on both channels. Printed on screen; see the head of this file. */
const DEMO_CODE = '123456';

const OTP_TTL_SECONDS = 180;
const OTP_RESEND_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;

const STORE_KEY = 'pt_affilie_stub_v1';

interface StubRecord extends AffiliateApplication {
  resume_token: string;
  email: string;
  phone: string;
  otp: Partial<Record<'phone' | 'email', { expires_at: number; resend_at: number; attempts: number }>>;
}

type StubStore = Record<string, StubRecord>;

/** `localStorage` so a reload mid-flow behaves like the real thing — the resume path is the
 *  single most likely place this UI breaks, and a stub that forgets everything on refresh would
 *  hide that. Wrapped because Safari private mode throws on access, not on write. */
function readStore(): StubStore {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '{}') as StubStore;
  } catch {
    return {};
  }
}

function writeStore(store: StubStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* Quota or private mode. The flow still works for the life of this tab. */
  }
}

/** Network is not instant and the UI must show its pending states, so the stub is not either. */
const latency = (ms = 420) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Strip everything the real endpoint would never send back: the token, the raw contacts, the
 *  live OTP state. A stub that leaks more than the API teaches the UI to depend on it. */
function publicView(record: StubRecord): AffiliateApplication {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resume_token: _token, email: _email, phone: _phone, otp: _otp, ...rest } = record;
  return rest;
}

function load(session: AffiliateApplicationSession): StubRecord {
  const record = readStore()[session.id];
  if (!record) throw new Error("Nous ne retrouvons plus cette demande. Recommencez l'inscription.");
  if (record.resume_token !== session.resume_token) {
    throw new Error("Votre demande n'est plus valable. Recommencez l'inscription.");
  }
  return record;
}

function save(record: StubRecord): void {
  const store = readStore();
  store[record.id] = record;
  writeStore(store);
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-8);
  return digits.length === 8 ? `•• ••• ${digits.slice(-3)}` : '•• ••• •••';
}

function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  const head = user.slice(0, 1) || '•';
  return `${head}${'•'.repeat(Math.max(2, user.length - 1))}@${domain}`;
}

function reference(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const tail = String(Math.floor(1000 + Math.random() * 9000));
  return `AFF-${year}${month}-${tail}`;
}

function randomId(): string {
  // `crypto.randomUUID` is unavailable on http:// origins in some browsers; this is a demo id.
  return `stub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const stubAffiliateProgramApi: AffiliateProgramApi = {
  isStub: true,

  async createApplication(details: AffiliateApplicantDetails): Promise<AffiliateApplicationCreated> {
    await latency(700);
    const record: StubRecord = {
      id: randomId(),
      reference: reference(),
      status: 'draft',
      type: details.type,
      masked_phone: maskPhone(details.phone),
      masked_email: maskEmail(details.email),
      documents: { front: false, back: false },
      phone_verified: false,
      email_verified: false,
      resume_token: randomId(),
      email: details.email,
      phone: details.phone,
      otp: {},
    };
    save(record);
    return { ...publicView(record), resume_token: record.resume_token };
  },

  async updateApplication(session, details) {
    await latency();
    const record = load(session);
    record.type = details.type;
    record.phone = details.phone;
    record.email = details.email;
    record.masked_phone = maskPhone(details.phone);
    record.masked_email = maskEmail(details.email);
    // Changing a contact invalidates the verification of that contact. The real backend MUST do
    // the same or the whole OTP step is theatre: verify a number you control, then swap it.
    record.phone_verified = false;
    record.email_verified = false;
    record.otp = {};
    save(record);
    return publicView(record);
  },

  async getApplication(session) {
    await latency(220);
    return publicView(load(session));
  },

  async uploadDocument(
    session: AffiliateApplicationSession,
    side: IdDocumentSide,
    file: File,
  ): Promise<UploadedDocument> {
    // Same judgement the tile already applied. Applied AGAIN here on purpose: a client-side
    // limit is a courtesy, and the server that replaces this stub must not inherit the habit of
    // trusting one.
    const rejected = documentFileError(file);
    if (rejected) throw new Error(rejected);
    // The record is checked before the wait so an expired token fails fast, and RE-READ after it.
    load(session);

    // Deliberately proportional to the file: an 8 MB upload on a phone is not instant, and the
    // progress state has to be visible in the demo or nobody will notice it is missing.
    await latency(600 + Math.min(2200, file.size / 4000));

    /*
     * ── A LOST UPDATE, FOUND BY THE GUARD ────────────────────────────────────────────────
     * The first version read the record BEFORE the wait and saved it after. Both sides upload
     * at once — the applicant taps recto then verso without waiting, and the walker in
     * `scripts/measure-affiliate-signup.mjs` does exactly that — so two read-modify-write
     * cycles interleaved and the second `save()` wrote a copy that still had `front: false`.
     * The screen looked right (it patches its own copy) and `submit` then refused the
     * application for a missing document that had been uploaded.
     *
     * Re-reading here makes the critical section a single synchronous run, which JavaScript
     * makes atomic for free.
     *
     * THE REAL BACKEND HAS THE SAME HAZARD AND DOES NOT GET IT FOR FREE. Two concurrent
     * requests each `Affilie::find($id)`, set one column and `save()`; Eloquent writes every
     * dirty attribute from ITS snapshot, so whichever saves last reverts the other's column.
     * The upload endpoint must write the single column it owns (`->update([$column => $path])`
     * or a `lockForUpdate` inside a transaction), never `save()` on a stale model.
     */
    const record = load(session);
    record.documents = { ...record.documents, [side]: true };
    save(record);
    return { side, size: file.size };
  },

  async sendOtp(session, channel) {
    await latency(800);
    const record = load(session);
    const existing = record.otp[channel];
    const now = Date.now();
    if (existing && existing.resend_at > now) {
      throw new Error(
        `Patientez ${Math.ceil((existing.resend_at - now) / 1000)} secondes avant de demander un nouveau code.`,
      );
    }
    record.otp[channel] = {
      expires_at: now + OTP_TTL_SECONDS * 1000,
      resend_at: now + OTP_RESEND_SECONDS * 1000,
      attempts: OTP_MAX_ATTEMPTS,
    };
    save(record);
    const challenge: OtpChallenge = {
      masked_destination: channel === 'phone' ? record.masked_phone : record.masked_email,
      expires_in: OTP_TTL_SECONDS,
      resend_after: OTP_RESEND_SECONDS,
      attempts_remaining: OTP_MAX_ATTEMPTS,
      demo_code: DEMO_CODE,
    };
    return challenge;
  },

  async verifyOtp(session, channel, code) {
    await latency(650);
    const record = load(session);
    const challenge = record.otp[channel];
    if (!challenge) throw new Error("Aucun code n'a été envoyé. Demandez un nouveau code.");
    if (challenge.expires_at < Date.now()) {
      throw new Error('Ce code a expiré. Demandez-en un nouveau.');
    }
    if (code !== DEMO_CODE) {
      challenge.attempts -= 1;
      if (challenge.attempts <= 0) {
        delete record.otp[channel];
        save(record);
        throw new Error('Trop de tentatives. Demandez un nouveau code.');
      }
      save(record);
      throw new Error(
        `Code incorrect. Il vous reste ${challenge.attempts} tentative${challenge.attempts > 1 ? 's' : ''}.`,
      );
    }
    if (channel === 'phone') record.phone_verified = true;
    else record.email_verified = true;
    delete record.otp[channel];
    save(record);
    return publicView(record);
  },

  async submitApplication(session) {
    await latency(900);
    const record = load(session);
    // Mirrors the server-side guard the real endpoint needs: a record that skipped a step must
    // not become `pending`, or the review queue fills with applications nobody can act on.
    if (!record.documents.front || !record.documents.back) {
      throw new Error('Ajoutez les deux faces de votre pièce d’identité avant de valider.');
    }
    if (!record.phone_verified) throw new Error('Confirmez votre numéro de téléphone avant de valider.');
    if (!record.email_verified) throw new Error('Confirmez votre adresse e-mail avant de valider.');
    record.status = 'pending';
    save(record);
    return publicView(record);
  },
};
