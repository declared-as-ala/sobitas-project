'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  Images,
  Loader2,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';
import { AuthSubmit } from '@/app/components/AuthShell';
import { cn } from '@/app/components/ui/utils';
import {
  DOCUMENT_ACCEPT_ATTRIBUTE,
  documentFileError,
  formatBytes,
  type IdDocumentSide,
} from '@/services/affiliateProgram';
import { GOOD_PHOTO_RULES } from '../affiliateCopy';
import { BackButton, ErrorNote, StepHeading } from './signupUi';

/**
 * Step 3 — the identity document.
 *
 * ── THE HARDEST SCREEN IN THE FLOW ────────────────────────────────────────────────────────
 * Everything before this is typing. This asks somebody to photograph their CIN with a phone,
 * which is where a form like this actually loses people: they do not know why it is needed, they
 * do not know what "a good photo" means, and if the first attempt is rejected they leave. So the
 * screen answers all three before it asks for anything:
 *
 *   1. WHY, in one sentence and without jargon — we cannot pay a name we have not verified.
 *   2. WHAT a usable photo looks like, DRAWN, next to four short rules. A picture of the right
 *      framing costs one small figure and removes the most common retake.
 *   3. WHERE it goes — private, never published, seen only by the team.
 *
 * ── TWO BUTTONS, NOT ONE INPUT ────────────────────────────────────────────────────────────
 * "Prendre une photo" sets `capture="environment"` and opens the camera. "Choisir une image"
 * removes it and opens the picker. One input with `capture` would be camera-only on Android and
 * would strand anyone who already photographed their card yesterday; one input WITHOUT it shows
 * an OS sheet whose wording differs per device, which is exactly the ambiguity this audience
 * cannot afford. Two explicitly labelled buttons say what will happen before it happens.
 *
 * ── THE PREVIEW IS A DOWNSCALED data: URL, AND THAT IS NOT A STYLE CHOICE ────────────────
 * The obvious implementation is `URL.createObjectURL(file)` into an `<img>`. It renders NOTHING
 * on this site, silently: next.config.js sends
 *
 *     img-src 'self' data: https:
 *
 * and a `blob:` URL matches none of those, so the browser blocks the load and logs a CSP
 * violation the visitor never sees. Caught by `scripts/measure-affiliate-signup.mjs`, which reads
 * the console — it is invisible in a screenshot, because a blocked image looks exactly like an
 * image that has not decoded yet.
 *
 * So the file is decoded with `createImageBitmap`, drawn into a canvas at most 640px on its long
 * edge and exported as a JPEG `data:` URL, which the policy allows. Two things fall out of that
 * for free: the preview costs ~60 KB instead of pinning a 5 MB blob per side on a phone that is
 * also running the camera, and there is nothing to revoke.
 *
 * `createImageBitmap` cannot decode HEIC in most browsers, and HEIC is the iPhone default. That
 * is not a failure — the UPLOAD still works, only the thumbnail does not — so a null preview
 * falls through to the "photo reçue" plate rather than to a broken image.
 *
 * The bytes are never persisted anywhere on the client. A resumed session shows "Photo déjà
 * envoyée" from the SERVER's `documents` flags rather than from a stored copy — putting a scan of
 * someone's CIN in `localStorage` to make a resume prettier is the same mistake as `disk('public')`
 * on the backend (docs/affiliate-ecosystem-plan.md §8).
 */

interface SideState {
  /** Downscaled `data:` thumbnail of a photo chosen in THIS session. Null after a resume, and
   *  null for a format the browser cannot decode (HEIC). Never the original bytes. */
  previewUrl: string | null;
  fileName: string | null;
  size: number | null;
  uploading: boolean;
  error: string | null;
}

const EMPTY_SIDE: SideState = { previewUrl: null, fileName: null, size: null, uploading: false, error: null };

const SIDES: { id: IdDocumentSide; label: string; help: string }[] = [
  { id: 'front', label: 'Recto', help: 'La face avec votre photo et votre nom.' },
  { id: 'back', label: 'Verso', help: 'La face arrière, avec l’adresse.' },
];

export function StepKyc({
  received,
  onUpload,
  onBack,
  onSubmit,
  serverError,
}: {
  /** The SERVER's view of which sides it holds. The tiles render from this, never from local state. */
  received: Record<IdDocumentSide, boolean>;
  onUpload: (side: IdDocumentSide, file: File) => Promise<void>;
  onBack: () => void;
  onSubmit: () => void;
  serverError: string | null;
}) {
  const [state, setState] = useState<Record<IdDocumentSide, SideState>>({
    front: EMPTY_SIDE,
    back: EMPTY_SIDE,
  });
  const inputs = useRef<Record<IdDocumentSide, HTMLInputElement | null>>({ front: null, back: null });
  /*
   * `mounted` guards the setState that follows an await, so a visitor who leaves the step while a
   * photo is uploading does not get a React warning.
   *
   * It is set to TRUE inside the effect, not only at `useRef(true)`. React 18 StrictMode mounts,
   * unmounts and remounts every component in development: the cleanup ran, latched the ref to
   * false, and nothing ever set it back — so `uploading` never cleared, the tile never showed
   * "Reçue", and the step could not be completed. It failed only in dev, which is the worst place
   * for a bug to live, and the walker is what found it.
   */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const openPicker = (side: IdDocumentSide, mode: 'camera' | 'library') => {
    const input = inputs.current[side];
    if (!input) return;
    if (mode === 'camera') input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };

  const handleFile = async (side: IdDocumentSide, file: File | undefined) => {
    if (!file) return;

    const rejected = documentFileError(file);
    if (rejected) {
      setState((s) => ({ ...s, [side]: { ...s[side], error: rejected } }));
      return;
    }

    // The upload starts immediately; the thumbnail catches up. Decoding a 5 MB photo takes long
    // enough on a mid-range phone that waiting for it before posting would read as a dead tap.
    setState((s) => ({
      ...s,
      [side]: { previewUrl: null, fileName: file.name, size: file.size, uploading: true, error: null },
    }));

    void makeThumbnail(file).then((previewUrl) => {
      if (previewUrl && mounted.current) setState((s) => ({ ...s, [side]: { ...s[side], previewUrl } }));
    });

    try {
      await onUpload(side, file);
      if (mounted.current) setState((s) => ({ ...s, [side]: { ...s[side], uploading: false } }));
    } catch (error) {
      if (!mounted.current) return;
      setState((s) => ({
        ...s,
        [side]: {
          ...s[side],
          uploading: false,
          error: error instanceof Error ? error.message : 'L’envoi de la photo a échoué. Réessayez.',
        },
      }));
    }
  };

  const busy = state.front.uploading || state.back.uploading;
  const complete = received.front && received.back;

  return (
    <div>
      <BackButton onClick={onBack} label="Modifier mes coordonnées" />

      <div className="mt-3">
        <StepHeading title="Votre pièce d’identité">
          Nous versons de l’argent sur un compte : la loi et le bon sens nous obligent à vérifier
          à qui. Prenez en photo votre carte d’identité, des deux côtés.
        </StepHeading>
      </div>

      <p className="mb-5 flex gap-2.5 rounded-xl border border-ok/40 bg-elevated p-3 text-sm leading-snug text-ink-2">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
        <span>
          Votre document reste privé. Il n’apparaît nulle part sur le site et n’est consulté que
          par l’équipe qui valide votre dossier.
        </span>
      </p>

      <PhotoGuide />

      {serverError && (
        <div className="mt-5">
          <ErrorNote>{serverError}</ErrorNote>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {SIDES.map((side) => (
          <SideTile
            key={side.id}
            side={side}
            state={state[side.id]}
            received={received[side.id]}
            onCamera={() => openPicker(side.id, 'camera')}
            onLibrary={() => openPicker(side.id, 'library')}
            inputRef={(node) => {
              inputs.current[side.id] = node;
            }}
            onFile={(file) => handleFile(side.id, file)}
          />
        ))}
      </div>

      <div className="mt-6">
        <AuthSubmit
          type="button"
          onClick={onSubmit}
          disabled={!complete || busy}
          loading={busy}
          loadingLabel="Envoi de la photo…"
        >
          Continuer
          <ArrowRight className="h-4 w-4" aria-hidden />
        </AuthSubmit>
        {!complete && !busy && (
          <p className="mt-3 text-center text-xs text-ink-3" aria-live="polite">
            Ajoutez le recto et le verso pour continuer.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A small `data:` JPEG of the chosen file, or null when the browser cannot decode it.
 *
 * `createImageBitmap` takes the Blob directly, so no `blob:` URL is ever created and the CSP is
 * never involved. 640px on the long edge is well past what a 160px-tall tile needs, and leaves
 * enough resolution that the applicant can actually judge whether their photo is sharp — which is
 * the entire point of showing it back to them.
 */
async function makeThumbnail(file: File): Promise<string | null> {
  if (typeof window === 'undefined' || typeof window.createImageBitmap !== 'function') return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await window.createImageBitmap(file);
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    // HEIC, a corrupt file, or a browser without the API. The UPLOAD is unaffected.
    return null;
  } finally {
    bitmap?.close?.();
  }
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * "What a good photo looks like"
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * Two drawn examples and four rules.
 *
 * Drawn in divs rather than shipped as an image: it is four rectangles, it costs no request, it
 * inherits both themes from the tokens, and it can never be the stale asset that still shows the
 * old card design two years from now.
 */
function PhotoGuide() {
  return (
    <section aria-labelledby="kyc-guide" className="rounded-2xl border border-hairline bg-sunken p-4">
      <h2 id="kyc-guide" className="font-display text-sm font-extrabold uppercase tracking-tight text-ink-1">
        Une photo utilisable
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
        <PhotoExample good />
        <PhotoExample good={false} />
      </div>

      <ul className="mt-4 space-y-1.5">
        {GOOD_PHOTO_RULES.map((rule) => (
          <li key={rule} className="flex gap-2 text-sm leading-snug text-ink-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PhotoExample({ good }: { good: boolean }) {
  return (
    <figure className="min-w-0">
      <div
        className="relative aspect-[3/2] overflow-hidden rounded-xl border border-hairline bg-canvas"
        aria-hidden
      >
        <div
          className={cn(
            'absolute rounded-md border border-rule-strong bg-sunken p-2',
            good ? 'inset-[13%]' : 'left-[34%] top-[7%] h-[92%] w-[86%] rotate-6',
          )}
        >
          <div className="flex gap-2">
            <span className="h-7 w-5 shrink-0 rounded-sm bg-rule" />
            <span className="min-w-0 flex-1 space-y-1 pt-1">
              <span className="block h-1.5 w-full rounded-full bg-rule" />
              <span className="block h-1.5 w-3/4 rounded-full bg-rule" />
              <span className="block h-1.5 w-1/2 rounded-full bg-hairline" />
            </span>
          </div>
        </div>
      </div>
      {/*
        The COLOUR IS IN THE ICON AND THE CAPTION IS INK. `--c-destructive` measures 4.84:1 on an
        untinted surface and 4.47:1 on `--c-sunken`, which this guide sits on — a WCAG AA failure
        at 12px that looks completely fine and was caught only by the contrast pass. Same rule as
        the account status chips: a status colour may not carry small text on a tinted plate.
      */}
      <figcaption className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
        {good ? (
          <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden />
        ) : (
          <X className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
        )}
        {good ? 'Bien : à plat, entière, nette' : 'À éviter : coupée, de travers'}
      </figcaption>
    </figure>
  );
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * One side
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

function SideTile({
  side,
  state,
  received,
  onCamera,
  onLibrary,
  onFile,
  inputRef,
}: {
  side: { id: IdDocumentSide; label: string; help: string };
  state: SideState;
  received: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onFile: (file: File | undefined) => void;
  inputRef: (node: HTMLInputElement | null) => void;
}) {
  const done = received && !state.uploading;

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        done ? 'border-ok/50 bg-elevated' : 'border-rule bg-elevated',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
            {side.label}
          </p>
          <p className="mt-0.5 text-xs text-ink-3">{side.help}</p>
        </div>
        {done && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-ok/40 bg-elevated px-2.5 py-1 text-xs font-semibold text-ok">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Reçue
          </span>
        )}
      </div>

      {/* The preview, or the reassurance that the server already has one. `<img>` and not
          next/image on purpose: the source is a blob: URL from the device, which the image
          optimiser cannot fetch, resize or cache. */}
      {state.previewUrl ? (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-hairline bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.previewUrl}
            alt={`Aperçu du ${side.label.toLowerCase()} de votre pièce d’identité`}
            className="h-40 w-full object-contain"
          />
          {state.uploading && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-elevated/90 text-sm font-semibold text-ink-1">
              <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
              Envoi de la photo…
            </span>
          )}
        </div>
      ) : state.uploading ? (
        /* No thumbnail yet — either it is still decoding, or the format is one the browser
           cannot read (HEIC). The upload is still running, so the state has to be visible. */
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-hairline bg-sunken p-3 text-sm font-semibold text-ink-1">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" aria-hidden />
          Envoi de la photo…
        </p>
      ) : done ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-hairline bg-sunken p-3 text-sm text-ink-2">
          <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden />
          Photo enregistrée. Vous pouvez la remplacer si elle n’était pas nette.
        </p>
      ) : null}

      {state.error && (
        <p role="alert" className="mt-3 text-sm leading-snug text-destructive">
          {state.error}
        </p>
      )}

      {state.fileName && !state.error && (
        <p className="mt-2 truncate text-xs text-ink-3">
          {state.fileName}
          {state.size ? ` · ${formatBytes(state.size)}` : ''}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCamera}
          disabled={state.uploading}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition-colors [@media(hover:hover)]:hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
        >
          {done ? <RefreshCw className="h-4 w-4" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
          {done ? 'Reprendre la photo' : 'Prendre une photo'}
        </button>
        <button
          type="button"
          onClick={onLibrary}
          disabled={state.uploading}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rule-strong bg-elevated px-4 text-sm font-semibold text-ink-1 transition-colors [@media(hover:hover)]:hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
        >
          <Images className="h-4 w-4" aria-hidden />
          Choisir une image
        </button>
      </div>

      {/* `hidden`, driven by the two buttons above. `value` is cleared on every change so
          picking the SAME file again after a failed upload still fires an event. */}
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT_ATTRIBUTE}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          onFile(file);
        }}
      />
    </div>
  );
}
