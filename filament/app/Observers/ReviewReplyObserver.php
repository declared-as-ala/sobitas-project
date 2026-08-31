<?php

namespace App\Observers;

use App\Models\ReviewReply;
use App\Models\User;
use App\Services\Reviews\ReviewModerator;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Moderation for the thread under a review — the same posture `ReviewObserver` takes for reviews,
 * and deliberately the same CODE PATH: both go through `ReviewModerator`, so a reply can never end
 * up behind a weaker filter that drifted from the review one.
 *
 * ── WHY EVERY REPLY IS CREATED HELD, INCLUDING A SIGNED-IN CUSTOMER'S ───────────────────────
 * A reply renders on a product page. A product page is as public as this site gets, it is what
 * Google reads, and it is where somebody would put a competitor's phone number if they could. The
 * cost of holding for the second it takes to moderate is a spinner; the cost of publishing first is
 * that the bad version was live and indexed.
 *
 * `afterResponse` means "the moment the HTTP response is flushed", not "later" — in practice the
 * verdict lands within a second or two of the POST, and the storefront's own refetch picks it up.
 * The submitter is told plainly that it is being checked rather than being shown a fake published
 * state, because a UI that lies about this is how a customer posts the same reply four times.
 *
 * ── AND WHY A STAFF REPLY SKIPS ALL OF IT ───────────────────────────────────────────────────
 * `is_staff` is only ever set from the admin panel, by somebody already authenticated into
 * Filament. Sending the shop's own answer to an LLM to ask whether the shop is spamming itself
 * costs a Groq call to reach a foregone conclusion, and a false positive there would hide the one
 * reply on the page that a customer most needs to read.
 */
class ReviewReplyObserver
{
    public function created(ReviewReply $reply): void
    {
        if ($reply->is_staff) {
            return;
        }

        $this->notifyNewReply($reply);

        $replyId = (int) $reply->id;

        // Static closure: captures only the scalar id, never $this — mirrors ReviewObserver, so the
        // after-response callback carries no observer state.
        dispatch(static function () use ($replyId): void {
            self::runModeration($replyId);
        })->afterResponse();
    }

    /**
     * Moderate one reply and apply the verdict. Public + static so a backfill command can drive it.
     * Best-effort throughout: a moderation failure leaves the reply held, which is the safe side.
     */
    public static function runModeration(int $replyId): void
    {
        $reply = ReviewReply::with('review.product')->find($replyId);
        if (! $reply) {
            return;
        }

        try {
            $verdict = app(ReviewModerator::class)->moderateComment(
                (string) $reply->body,
                null, // a reply has no rating; the moderator is told so rather than handed a fake 0
                (string) (optional(optional($reply->review)->product)->designation_fr ?? ''),
                ReviewModerator::KIND_REPLY
            );
        } catch (\Throwable $e) {
            Log::warning('Reply moderation failed', ['reply_id' => $replyId, 'error' => $e->getMessage()]);

            return;
        }

        $decision = (string) ($verdict['decision'] ?? 'hold');

        // `publish` is the only decision that makes a reply visible, and only when the config says
        // so. `hold` and `reject` both leave it at 0 — the difference between them is what the
        // admin is told, not what the customer sees.
        $target = ($decision === 'publish' && (bool) config('reviews.replies.auto_publish_clean', true)) ? 1 : 0;

        $updates = [];
        if (Schema::hasColumn('review_replies', 'ai_moderation')) {
            $updates['ai_moderation'] = $verdict;
        }
        if (Schema::hasColumn('review_replies', 'ai_checked_at')) {
            $updates['ai_checked_at'] = now();
        }
        if ((int) $reply->publier !== $target) {
            $updates['publier'] = $target;
        }
        if (! empty($updates)) {
            // saveQuietly: re-firing `created` is impossible here, but `saved` on a future observer
            // would recurse. The reviews side learned this the same way.
            $reply->forceFill($updates)->saveQuietly();
        }

        if ($target !== 1) {
            self::notifyHeld($reply, $verdict);
        }
    }

    /** Tell the panel a reply arrived, the same way a new avis is announced. */
    private function notifyNewReply(ReviewReply $reply): void
    {
        $recipients = User::all();
        if ($recipients->isEmpty()) {
            return;
        }

        $body = 'Réponse #' . $reply->id . ' sur avis #' . $reply->review_id
            . ' – ' . Str::limit((string) $reply->body, 50);

        foreach ($recipients as $user) {
            Notification::make()->title('Nouvelle réponse à un avis')->body($body)->info()->sendToDatabase($user);
        }
    }

    /**
     * A held reply needs a human, and needs one QUICKLY: unlike a review, the person who wrote it
     * is usually waiting for an answer in a conversation. Silence here reads as the shop ignoring
     * them, so the panel is told which reply and why.
     *
     * @param  array<string,mixed>  $verdict
     */
    private static function notifyHeld(ReviewReply $reply, array $verdict): void
    {
        $recipients = User::all();
        if ($recipients->isEmpty()) {
            return;
        }

        $reason = (string) ($verdict['reason'] ?? 'Vérification requise.');
        $flags  = implode(', ', array_filter((array) ($verdict['flags'] ?? [])));
        $body   = 'Réponse #' . $reply->id . ' en attente – ' . $reason . ($flags !== '' ? ' [' . $flags . ']' : '');

        foreach ($recipients as $user) {
            Notification::make()->title('Réponse à valider')->body($body)->warning()->sendToDatabase($user);
        }
    }
}
