import Link from 'next/link';
import { User } from 'lucide-react';

/**
 * A reviewer's name — a link to their public page when there is one, plain text when there is not.
 *
 * ── WHY THIS IS A COMPONENT AND NOT A TERNARY AT EACH CALL SITE ─────────────────────────────
 * Three different kinds of author render in the same list and they are NOT interchangeable:
 *
 *   a member    `user_id` set → `/membres/{id}` exists and is worth linking
 *   a guest     no account, no page, and linking one would 404
 *   the shop    a staff reply, which must never resolve to whichever admin wrote it
 *
 * Getting that wrong in either direction is a real defect: a link to a 404 on every anonymous
 * review, or a customer's name silently unlinked on the one page built to show their reviews.
 * `/members/{id}` also 404s for a member with nothing published — but a name appearing here means a
 * published review by definition, so a linked name always resolves.
 */
export function MemberLink({
  userId,
  name,
  className,
}: {
  userId?: number | null;
  name: string;
  className?: string;
}) {
  const label = name?.trim() || 'Client';

  if (!userId) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Link
      href={`/membres/${userId}`}
      /* `-my-3 py-3` buys the 44px target back without moving the text, which is the pattern the
         design system prescribes for a control that has to sit inline in a sentence.
         py-2 was the first guess and measured 36px: the line box here is 20px, so 8px of padding
         each side lands four short. measure-reviews is what caught it — at a glance the name looks
         like a comfortable click at any zoom level. */
      className={`group -my-3 inline-flex items-center gap-1.5 rounded py-3 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${className ?? ''}`}
    >
      <User className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-brand" aria-hidden="true" />
      <span className="underline-offset-2 group-hover:underline">{label}</span>
    </Link>
  );
}
