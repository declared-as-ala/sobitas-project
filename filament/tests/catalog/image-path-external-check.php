<?php

/**
 * Standalone check for App\Filament\Support\ImagePath — no vendor/, no DB, no network.
 *
 *     php filament/tests/catalog/image-path-external-check.php
 *
 * ── WHAT THIS FILE IS DEFENDING ───────────────────────────────────────────────────────────
 * One rule, stated in two directions, that produced the owner's report "the images of products
 * not existing, can't see the image" on every imported product in the Filament admin:
 *
 *   · an ALLOWLISTED ABSOLUTE URL must never be handed to the local disk. Not to exists(), not to
 *     url(), not to size(). The disk holds no file called
 *     `https://cloudinary.images-iherb.com/…/0.jpg`, so exists() answers false and the caller
 *     concludes the product has no image, and url() answers
 *     `https://admin.protein.tn/storage/https://cloudinary.images-iherb.com/…` which 404s inside a
 *     200 page. Both failures are invisible to a status check.
 *
 *   · a LEGACY RELATIVE PATH must still go to the disk, exactly as it did before. 309 hand-made
 *     products are live and earning money on `produits/…webp` values; the fix for the imported
 *     ones is worthless if it moves them.
 *
 * The two are asserted as a pair, because the only way to get one wrong without noticing is to
 * "simplify" the other. Section 3 does not check a return value — it records WHICH PATHS THE DISK
 * WAS ASKED ABOUT, through a fake Storage facade, because "returned the right string" and "did not
 * touch the disk" are different claims and only the second one is the rule.
 *
 * ── WHY THE ALLOWLIST IS READ FROM config/catalog.php AND NOT RETYPED HERE ────────────────
 * A copied host list passes forever after someone removes the real one. `media.external_hosts` is
 * required below and fed to the config() stub, so this harness asserts the SHIPPED configuration:
 * delete cloudinary.images-iherb.com from config and section 1 fails naming it.
 *
 * ── THE THIRD PARTY THIS RULE DEPENDS ON ─────────────────────────────────────────────────
 * Passing a URL through ImagePath is only half the journey. Filament v4.2.0
 * Tables\Columns\ImageColumn::getImageUrl() returns the column state untouched when
 * `filter_var($state, FILTER_VALIDATE_URL) !== false` and otherwise resolves it through
 * ->disk('public'). Section 4 asserts that verdict on a real cover URL and on a real legacy path,
 * so a cover shape Filament would NOT recognise as a URL (a space, a bare host, a protocol-relative
 * `//host/…`) fails here with the value attached instead of blanking a column in production.
 */

namespace Illuminate\Support\Facades {

    /**
     * Fake `Storage`, recording rather than answering.
     *
     * ImagePath::normalizeExisting() reaches for this facade. Under a bare `php` the real one does
     * not exist, and the call sits inside a try/catch(\Throwable) — so a missing class would be
     * swallowed and the harness could not tell "asked the disk and got nothing" apart from "never
     * asked". That distinction is the entire point of section 3, so the facade is supplied here.
     */
    class Storage
    {
        /** @var list<string> every path exists() was called with, in order */
        public static array $probed = [];

        /** @var array<string, bool> paths this fake disk reports as present */
        public static array $present = [];

        public static function reset(): void
        {
            self::$probed = [];
            self::$present = [];
        }

        public static function disk(string $name): self
        {
            return new self;
        }

        public function exists(string $path): bool
        {
            self::$probed[] = $path;

            return self::$present[$path] ?? false;
        }
    }
}

namespace {

    use App\Filament\Support\ImagePath;
    use Illuminate\Support\Facades\Storage;

    if (! function_exists('env')) {
        function env(string $key, mixed $default = null): mixed
        {
            return $default;
        }
    }

    /** The shipped allowlist, not a copy of it. */
    $catalog = require __DIR__.'/../../config/catalog.php';
    $EXTERNAL_HOSTS = $catalog['media']['external_hosts'] ?? [];

    if (! function_exists('config')) {
        /**
         * Minimal stand-in for the framework helper. Only the one key ImagePath reads is served;
         * anything else returns the default, so a new config lookup appearing in ImagePath shows up
         * as a failing assertion rather than as a silent null.
         */
        function config(string $key, mixed $default = null): mixed
        {
            global $EXTERNAL_HOSTS;

            return $key === 'catalog.media.external_hosts' ? $EXTERNAL_HOSTS : $default;
        }
    }

    require __DIR__.'/../../app/Filament/Support/ImagePath.php';

    $failed = 0;
    $checks = 0;

    function check(string $label, bool $ok, string $detail = ''): void
    {
        global $failed, $checks;
        $checks++;
        if (! $ok) {
            $failed++;
        }
        echo ($ok ? '  ok   ' : '  FAIL ').$label.($detail !== '' ? ' — '.$detail : '')."\n";
    }

    // A real cover produced by IHerbClient::imageUrl('OPN-02385', 0) — commas and a colon in the
    // path, which is exactly the shape a naive URL check gets wrong.
    const IMPORTED_COVER = 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/opn/opn02385/l/0.jpg';

    // A real legacy cover, from frontend/src/data/products.ts.
    const LEGACY_COVER = 'produits/September2023/mass_gainer_zero_7kg_-_eric_favre.webp';

    const LEGACY_COVER_AS_FULL_URL = 'https://admin.protein.tn/storage/produits/September2023/mass_gainer_zero_7kg_-_eric_favre.webp';

    echo "\n1. The shipped allowlist covers the hosts the importer actually writes\n";

    check(
        'config/catalog.php media.external_hosts is non-empty',
        is_array($EXTERNAL_HOSTS) && $EXTERNAL_HOSTS !== [],
        json_encode($EXTERNAL_HOSTS)
    );
    check(
        'cloudinary.images-iherb.com is allowlisted (IHerbClient::imageUrl builds every cover on it)',
        ImagePath::isExternal(IMPORTED_COVER)
    );
    check(
        's3.images-iherb.com is allowlisted via the images-iherb.com suffix rule',
        ImagePath::isExternal('https://s3.images-iherb.com/opn/opn02385/y/1.jpg')
    );
    check(
        'a look-alike host is NOT allowlisted',
        ! ImagePath::isExternal('https://cloudinary.images-iherb.com.example.net/steal/0.jpg')
    );
    check(
        'a host merely ending in the allowlisted string is NOT allowlisted',
        ! ImagePath::isExternal('https://evilimages-iherb.com/0.jpg')
    );
    check('our own admin host is not external', ! ImagePath::isExternal(LEGACY_COVER_AS_FULL_URL));
    check('a relative path is not external', ! ImagePath::isExternal(LEGACY_COVER));
    check('null is not external', ! ImagePath::isExternal(null));
    check('an empty string is not external', ! ImagePath::isExternal('   '));

    echo "\n2. normalize(): the domain survives for referenced hosts and is stripped for ours\n";

    check(
        'imported cover passes through byte for byte',
        ImagePath::normalize(IMPORTED_COVER) === IMPORTED_COVER,
        var_export(ImagePath::normalize(IMPORTED_COVER), true)
    );
    check(
        'legacy relative path is returned unchanged',
        ImagePath::normalize(LEGACY_COVER) === LEGACY_COVER,
        var_export(ImagePath::normalize(LEGACY_COVER), true)
    );
    check(
        'a full URL on our own host is reduced to the disk path',
        ImagePath::normalize(LEGACY_COVER_AS_FULL_URL) === LEGACY_COVER,
        var_export(ImagePath::normalize(LEGACY_COVER_AS_FULL_URL), true)
    );
    check(
        'a legacy public/ prefix is still stripped',
        ImagePath::normalize('public/produits/x.webp') === 'produits/x.webp'
    );
    check('null stays null', ImagePath::normalize(null) === null);

    echo "\n3. normalizeExisting(): WHO GETS ASKED THE DISK — the rule, not the return value\n";

    Storage::reset();
    Storage::$present[LEGACY_COVER] = true;
    $legacyPresent = ImagePath::normalizeExisting(LEGACY_COVER);
    check(
        'a legacy path IS probed on the public disk (unchanged behaviour for the 309)',
        Storage::$probed === [LEGACY_COVER],
        json_encode(Storage::$probed)
    );
    check(
        'a legacy path that exists is returned as the path',
        $legacyPresent === LEGACY_COVER,
        var_export($legacyPresent, true)
    );

    Storage::reset();
    $legacyMissing = ImagePath::normalizeExisting(LEGACY_COVER);
    check(
        'a legacy path that is missing still falls back to the placeholder',
        $legacyMissing === ImagePath::FALLBACK_PLACEHOLDER,
        var_export($legacyMissing, true)
    );
    check('…and it got there by asking the disk', Storage::$probed === [LEGACY_COVER]);

    Storage::reset();
    $imported = ImagePath::normalizeExisting(IMPORTED_COVER);
    check(
        'an imported cover is NEVER probed on the disk',
        Storage::$probed === [],
        json_encode(Storage::$probed)
    );
    check(
        'an imported cover is returned as the URL, not as the missing-media placeholder',
        $imported === IMPORTED_COVER,
        var_export($imported, true)
    );

    Storage::reset();
    check(
        'a null cover still yields the placeholder without touching the disk',
        ImagePath::normalizeExisting(null) === ImagePath::FALLBACK_PLACEHOLDER && Storage::$probed === []
    );

    Storage::reset();
    Storage::$present[LEGACY_COVER] = true;
    check(
        'a full URL on our own host is probed by its stripped path',
        ImagePath::normalizeExisting(LEGACY_COVER_AS_FULL_URL) === LEGACY_COVER
            && Storage::$probed === [LEGACY_COVER],
        json_encode(Storage::$probed)
    );

    echo "\n4. What Filament will do with those two values (v4.2.0 ImageColumn::getImageUrl)\n";

    check(
        'the imported cover is a value filter_var accepts as a URL → rendered as-is',
        filter_var(IMPORTED_COVER, FILTER_VALIDATE_URL) !== false
    );
    check(
        'the legacy path is NOT a URL → still resolved through ->disk(\'public\')',
        filter_var(LEGACY_COVER, FILTER_VALIDATE_URL) === false
    );
    check(
        'the missing-media placeholder is NOT a URL → still resolved through ->disk(\'public\')',
        filter_var(ImagePath::FALLBACK_PLACEHOLDER, FILTER_VALIDATE_URL) === false
    );

    echo "\n5. normalizeArray() keeps mixed galleries intact\n";

    $mixed = ImagePath::normalizeArray([LEGACY_COVER, IMPORTED_COVER, LEGACY_COVER_AS_FULL_URL, '', null]);
    check(
        'relative, referenced and own-host values all survive, blanks are dropped',
        $mixed === [LEGACY_COVER, IMPORTED_COVER, LEGACY_COVER],
        json_encode($mixed)
    );

    echo "\n";
    if ($failed > 0) {
        echo "FAILED: {$failed} of {$checks} checks\n";
        exit(1);
    }

    echo "PASSED: {$checks} checks\n";
    exit(0);
}
