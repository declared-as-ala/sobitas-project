<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Services\Reviews\ReviewAuthenticity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * The client-side evidence a review submission carries, captured identically on all three routes
 * that accept one.
 *
 * A trait rather than three copies, because there are exactly three entry points — the signed-in
 * form (`add_review`), the guest form (`storeGuestReview`) and the tokenised email link
 * (`storeByToken`) — and a bot will find whichever one forgot to check. Anti-abuse that covers two
 * doors out of three is decoration.
 */
trait CapturesReviewSignals
{
    /**
     * The hidden field name. Deliberately meaningless: `website`, `url`, `company` and `nickname`
     * are all names a browser's autofill recognises, and an autofilled honeypot silently discards a
     * real customer's review — the one failure mode this technique actually has.
     */
    private function honeypotField(): string
    {
        return 'hp_field';
    }

    /**
     * True when the submission filled a field no human can see.
     *
     * The caller should then return the ORDINARY SUCCESS RESPONSE and store nothing. Telling a
     * script it was caught is telling whoever wrote it which field to skip next time; letting it
     * believe it succeeded costs nothing and teaches it nothing.
     */
    protected function trippedHoneypot(Request $request): bool
    {
        $value = $request->input($this->honeypotField());

        if (is_string($value) && trim($value) !== '') {
            Log::info('Review honeypot tripped', [
                'route' => $request->path(),
                // The address is not logged; the hashed form is enough to spot a burst and is what
                // the reviews table stores anyway.
                'ip_hash' => hash('sha256', (string) config('app.key') . '|' . (string) $request->ip()),
            ]);

            return true;
        }

        return false;
    }

    /**
     * The behavioural columns to merge into a review payload.
     *
     * `compose_ms` is how long the form was open before submit, measured by the browser. It is not
     * trustworthy on its own — a script can send any number — but a script that sends a plausible
     * one has to be written to send it at all, and almost none are. It is one signal among several
     * in `ReviewAuthenticity`, never a verdict by itself.
     *
     * `text_hash` is computed here rather than in the observer so that the very first duplicate
     * check has something to compare against: the observer runs after the response, and two
     * simultaneous submissions of the same paragraph would otherwise both find an empty table.
     *
     * Schema-guarded, like everything else that writes to this legacy table.
     *
     * @return array<string, mixed>
     */
    protected function reviewSignalColumns(Request $request, string $comment): array
    {
        $out = [];

        if (Schema::hasColumn('reviews', 'compose_ms')) {
            $ms = (int) $request->input('compose_ms', 0);
            // Clamp rather than validate: an absurd value is a signal, not a reason to 422 a
            // customer's review. 0 means "not reported", which ReviewAuthenticity treats as its own
            // (mild) signal. Two hours is the ceiling — beyond that the tab was simply left open.
            $out['compose_ms'] = ($ms > 0 && $ms < 7_200_000) ? $ms : null;
        }

        if (Schema::hasColumn('reviews', 'text_hash')) {
            $out['text_hash'] = app(ReviewAuthenticity::class)->textHash($comment);
        }

        return $out;
    }
}
