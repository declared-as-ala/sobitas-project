<?php

namespace App\Services;

use App\Models\Affilie;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Storage and access control for affiliate identity documents (CIN, both sides).
 *
 * ── THE DISK IS NOT NEGOTIABLE ───────────────────────────────────────────────────────────────
 * Everything here writes to `affilie-kyc`, whose docblock in config/filesystems.php explains why
 * it lives at storage/app/public/.affilie-kyc and nowhere else: it must survive a container deploy
 * (only storage/app/public is bind-mounted) and it must not be fetchable (nginx 404s any /storage/
 * path whose segment starts with a dot). Both constraints, one directory.
 *
 * The consequence for this class: **never call Storage::url() and never fall back to disk('public')
 * when the disk is missing.** A missing disk must be an error, not a silent downgrade that
 * publishes national identity cards at a guessable URL. `getDisk()` therefore throws.
 *
 * ── WHY THE FILENAME IS RANDOM AND THE MIME IS RE-DERIVED ────────────────────────────────────
 * The client-supplied name and extension are attacker-controlled and are used for neither. The
 * extension comes from the mime type Symfony guesses from the file's own bytes, and the stem is 48
 * random characters — so even if the dot-prefix rule were ever removed from the nginx config, a
 * document would still not be reachable by guessing `1/front.jpg`.
 *
 * ── WHY SIGNED **AND** AUTHENTICATED ─────────────────────────────────────────────────────────
 * A signature alone is a bearer token in a URL: it survives in browser history, in a Referer
 * header, in a screenshot of the address bar, and in whatever the admin pastes into a chat. So the
 * route also requires a session and `canView()` re-checks the viewer on every request. The
 * signature's job is only to bound the window and stop a stale link being replayed forever.
 */
class AffilieKycService
{
    public const DISK = 'affilie-kyc';

    /** Both sides of the card. Keys are the public API's `side` values. */
    public const SIDES = [
        'front' => 'kyc_id_front',
        'back' => 'kyc_id_back',
    ];

    /**
     * 8 MB. A phone photo of a CIN is 1–4 MB; a scan can reach 6. Above that it is not a document,
     * and the cap is what stops the upload endpoint being used as free storage.
     */
    public const MAX_KILOBYTES = 8192;

    /**
     * Mime types accepted, checked against the file's CONTENT — not its extension.
     *
     * PDF is here because Tunisian applicants routinely send a scanner's PDF rather than a photo.
     * Nothing else: SVG would carry script, HEIC cannot be rendered by the admin panel, and an
     * archive has no business being an identity document.
     */
    public const MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

    private const EXTENSION_BY_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'application/pdf' => 'pdf',
    ];

    /**
     * Validation rules for one uploaded side.
     *
     * `mimes` (extension) AND `mimetypes` (content) on purpose: `mimes` alone trusts the filename,
     * `mimetypes` alone lets `cin.php` through with an image body, which is only harmless for as
     * long as nothing ever serves this directory as PHP.
     *
     * @return list<string>
     */
    public static function rulesFor(bool $required): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            'mimes:jpg,jpeg,png,pdf',
            'mimetypes:'.implode(',', self::MIME_TYPES),
            'max:'.self::MAX_KILOBYTES,
        ];
    }

    /** @return list<string> The `side` values the API accepts. */
    public static function sides(): array
    {
        return array_keys(self::SIDES);
    }

    public static function columnForSide(string $side): ?string
    {
        return self::SIDES[$side] ?? null;
    }

    /**
     * Never resolve this disk through a fallback. See the class docblock.
     *
     * @throws \RuntimeException
     */
    private function disk(): \Illuminate\Filesystem\FilesystemAdapter
    {
        if (! is_array(config('filesystems.disks.'.self::DISK))) {
            throw new \RuntimeException(
                'The "'.self::DISK.'" disk is not configured. Refusing to store identity documents '
                .'on a fallback disk — see config/filesystems.php.'
            );
        }

        return Storage::disk(self::DISK);
    }

    /**
     * Store one side and return the stored relative path.
     *
     * Replacing an existing document deletes the old file: an affiliate who re-uploads because the
     * first photo was blurred should not leave a second copy of their CIN on the volume forever.
     */
    public function store(Affilie $affilie, string $side, UploadedFile $file): string
    {
        $column = self::columnForSide($side);
        if ($column === null) {
            throw new \InvalidArgumentException("Unknown KYC side [{$side}].");
        }

        $mime = (string) $file->getMimeType();
        if (! in_array($mime, self::MIME_TYPES, true)) {
            // Belt and braces: the request rules already checked this, but this class is also
            // reachable from the admin panel and from any future importer.
            throw new \InvalidArgumentException("Unsupported KYC mime type [{$mime}].");
        }

        $extension = self::EXTENSION_BY_MIME[$mime];
        $path = sprintf('a%d/%s-%s.%s', $affilie->getKey(), $side, Str::random(48), $extension);

        $stream = fopen($file->getRealPath(), 'rb');
        if ($stream === false) {
            throw new \RuntimeException('Could not read the uploaded KYC document.');
        }

        try {
            $written = $this->disk()->put($path, $stream);
        } finally {
            fclose($stream);
        }

        if ($written === false) {
            // The disk is declared with 'throw' => false, so a failed write returns false rather
            // than raising. Swallowing that would record a path to a file that does not exist.
            throw new \RuntimeException('Could not write the KYC document to the private disk.');
        }

        $previous = (string) ($affilie->getAttribute($column) ?? '');

        $affilie->forceFill([$column => $path])->save();

        if ($previous !== '' && $previous !== $path) {
            $this->deletePath($previous);
        }

        return $path;
    }

    /**
     * Flip the affiliate into `submitted` once BOTH sides exist.
     *
     * One side is not a submission — a reviewer opening a half-finished upload sees an incomplete
     * card and rejects a perfectly good applicant.
     */
    public function markSubmittedIfComplete(Affilie $affilie): bool
    {
        if (! $affilie->hasKycDocuments()) {
            return false;
        }

        $affilie->forceFill([
            'kyc_status' => Affilie::KYC_SUBMITTED,
            'kyc_submitted_at' => now(),
            // A re-submission clears the previous refusal, otherwise the admin list keeps showing
            // a stale reason next to fresh documents.
            'kyc_reject_reason' => null,
            'kyc_reviewed_at' => null,
            'kyc_reviewed_by' => null,
        ])->save();

        return true;
    }

    public function pathFor(Affilie $affilie, string $side): ?string
    {
        $column = self::columnForSide($side);
        if ($column === null) {
            return null;
        }

        $path = $affilie->getAttribute($column);

        return filled($path) ? (string) $path : null;
    }

    public function exists(Affilie $affilie, string $side): bool
    {
        $path = $this->pathFor($affilie, $side);

        return $path !== null && $this->disk()->exists($path);
    }

    /**
     * May this viewer see this affiliate's identity document?
     *
     * Staff by the SAME role list the admin panel and EnsureBackOfficeRole use — one definition of
     * "staff", not a third — or the affiliate the document belongs to. Nobody else, ever.
     */
    public function canView(?Authenticatable $viewer, Affilie $affilie): bool
    {
        if ($viewer === null) {
            return false;
        }

        $roleId = (int) ($viewer->getAttribute('role_id') ?? 0);
        if (in_array($roleId, (array) config('affilies.admin_role_ids', [1, 3]), true)) {
            return true;
        }

        $ownerId = $affilie->getAttribute('user_id');

        return $ownerId !== null && (int) $ownerId === (int) $viewer->getAuthIdentifier();
    }

    /**
     * A short-lived signed link to the streaming route.
     *
     * Five minutes: long enough for the admin panel to render the <img>, short enough that a link
     * copied out of the address bar is dead before it can be pasted anywhere useful.
     */
    public function temporaryUrl(Affilie $affilie, string $side, int $minutes = 5): ?string
    {
        if (self::columnForSide($side) === null || ! filled($this->pathFor($affilie, $side))) {
            return null;
        }

        return URL::temporarySignedRoute(
            'affilie.kyc.document',
            now()->addMinutes($minutes),
            ['affilie' => $affilie->getKey(), 'side' => $side],
        );
    }

    /**
     * Stream the document. Headers matter as much as the bytes:
     *  - `inline` so the admin sees it without a download, `nosniff` so a mislabelled file cannot
     *    be re-interpreted by the browser as something executable;
     *  - `no-store` + `private` so it never lands in a shared proxy or the browser's disk cache;
     *  - `noindex` because the day this leaks to a crawler is the day it is in a search index.
     */
    public function stream(Affilie $affilie, string $side): StreamedResponse
    {
        $path = $this->pathFor($affilie, $side);
        if ($path === null || ! $this->disk()->exists($path)) {
            abort(404);
        }

        $mime = $this->disk()->mimeType($path) ?: 'application/octet-stream';
        if (! in_array($mime, self::MIME_TYPES, true)) {
            // Whatever is on disk is not one of the three types we accept. Serving it as its own
            // declared type would be trusting a stored value to describe itself.
            $mime = 'application/octet-stream';
        }

        return $this->disk()->response(
            $path,
            sprintf('cin-%s-%d.%s', $side, $affilie->getKey(), pathinfo($path, PATHINFO_EXTENSION)),
            [
                'Content-Type' => $mime,
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store, max-age=0',
                'Pragma' => 'no-cache',
                'X-Robots-Tag' => 'noindex, nofollow, noarchive',
                'Referrer-Policy' => 'no-referrer',
            ],
            'inline',
        );
    }

    private function deletePath(string $path): void
    {
        try {
            $this->disk()->delete($path);
        } catch (\Throwable) {
            // A stale file left behind is a housekeeping problem; failing the upload over it would
            // turn a successful replacement into an error the applicant cannot act on.
        }
    }
}
