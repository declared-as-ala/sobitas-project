/**
 * A small, on-brand emblem shown at the top of the auth card on MOBILE, where the desktop artwork
 * column is hidden. It fills the empty space the short login form used to leave, and gives every
 * auth page (login, register, password reset, email verification) one consistent, premium anchor.
 *
 * Deliberately flat and token-only per the design system: a solid brand tile with a white
 * (`on-brand`) monoline "shield + check" — reads as "your account, secured" — no gradient, no
 * glassmorphism, no emoji. Purely decorative (aria-hidden), never focusable, so it carries no scope
 * class onto an interactive element.
 */
export function AuthBrandMark({ caption }: { caption?: string }) {
  return (
    <div className="mb-5 flex flex-col items-center text-center lg:hidden">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand text-on-brand shadow-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2.5 4.5 5.5v5.2c0 4.6 3.2 8 7.5 9.3 4.3-1.3 7.5-4.7 7.5-9.3V5.5L12 2.5Z" />
          <path d="m8.8 11.8 2.4 2.4 4-4.6" />
        </svg>
      </span>
      {caption && <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-ink-2">{caption}</p>}
    </div>
  );
}
