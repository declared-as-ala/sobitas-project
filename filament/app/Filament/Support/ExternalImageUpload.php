<?php

namespace App\Filament\Support;

use Filament\Forms\Components\BaseFileUpload;

/**
 * Teaches a Filament FileUpload about covers we REFERENCE instead of storing.
 *
 * ── THE BUG THIS EXISTS TO STOP, WHICH IS NOT A RENDERING BUG ────────────────────────────────
 * A FileUpload is not a viewer, it is a round trip: it hydrates the stored value, shows it, and
 * writes back whatever survived. Filament v4.2.0 hydrates like this (BaseFileUpload::setUp()):
 *
 *     $component->rawState(array_filter(Arr::wrap($rawState), fn ($file) =>
 *         filled($file) && (! $shouldFetchFileInformation || $component->getDisk()->exists($file))));
 *
 * An imported cover is `https://cloudinary.images-iherb.com/…/0.jpg`. The `public` disk does not
 * hold a file by that name, `exists()` says false, and the value is filtered OUT of the component's
 * state. The field then renders empty — and, because `beforeStateDehydrated` writes the component's
 * state back over the column, THE NEXT SAVE OF THAT PRODUCT PERSISTS AN EMPTY COVER. Opening an
 * imported product and pressing Enregistrer — changing the price, fixing a typo — silently destroys
 * the only image reference it has, with no error and no way to tell afterwards which products lost
 * one. SlideResource hit the identical trap with full storage URLs; its EditAction carries the
 * autopsy.
 *
 * Surviving hydration is necessary but not sufficient: the preview URL comes from
 * `getUploadedFileUsing`, whose default ends in `$storage->url($file)` and would emit
 * `https://admin.protein.tn/storage/https://cloudinary.images-iherb.com/…` — a 404 inside a 200.
 * `$storage->size()` / `->mimeType()` on the same value are equally meaningless.
 *
 * ── WHY IT IS SHAPED AS TWO CONDITIONAL OVERRIDES AND NOT A REPLACED HYDRATION CLOSURE ───────
 * Replacing `afterStateHydrated()` is the obvious fix and the wrong one: that closure also builds
 * the `[uuid => path]` array the uploader UI is driven by, so overriding it leaves state as a raw
 * string and breaks the widget for every product. SlideResource documents that too.
 *
 * Instead both vendor closures are left in place and steered:
 *
 *   · `fetchFileInformation()` accepts a Closure, and the vendor hydration filter keeps ANY value
 *     unconditionally when it evaluates false. It is made false ONLY when the component's own raw
 *     state holds an allowlisted URL — so an imported cover survives hydration and is written back
 *     unchanged, while a record whose value is a plain path keeps the exists()/size()/mimeType()
 *     behaviour it has today, unchanged.
 *
 *   · `getUploadedFileUsing()` returns the URL directly for an external value and otherwise
 *     reproduces the vendor default verbatim (see diskFile()).
 *
 * THE 309 LEGACY PRODUCTS: their covers are relative paths, isExternal() is false for all of them,
 * so `fetchFileInformation` stays true and diskFile() is the vendor closure line for line. The
 * legacy edit form performs the same disk probes, shows the same name/size/type and produces the
 * same preview URL as before this class existed.
 */
final class ExternalImageUpload
{
    /**
     * Wrap a FileUpload so allowlisted absolute URLs survive it intact.
     *
     * Applied as a wrapper rather than two chained calls on purpose: the two overrides are only
     * correct together — keeping the value without fixing the preview shows a broken image, fixing
     * the preview without keeping the value shows nothing at all — and a wrapper cannot be half
     * applied by someone editing the chain.
     */
    public static function allow(BaseFileUpload $component): BaseFileUpload
    {
        return $component
            ->fetchFileInformation(static fn (BaseFileUpload $component): bool => ! self::holdsExternalUrl($component))
            ->getUploadedFileUsing(static function (BaseFileUpload $component, string $file, string | array | null $storedFileNames): ?array {
                if (ImagePath::isExternal($file)) {
                    $name = basename((string) parse_url($file, PHP_URL_PATH));

                    return [
                        'name' => $name !== '' ? $name : $file,
                        // The remote object's byte size and MIME type are not knowable without an
                        // HTTP request per file on every form render. 0/null is what Filament itself
                        // reports when file information is not fetched, and the uploader renders it.
                        'size' => 0,
                        'type' => null,
                        'url' => $file,
                    ];
                }

                return self::diskFile($component, $file, $storedFileNames);
            });
    }

    /**
     * Does this component currently carry a value we reference rather than store?
     *
     * Read off the component's raw state rather than the Eloquent record: the raw state is what the
     * vendor hydration filter is about to judge, it is available at exactly the moment
     * `shouldFetchFileInformation()` is evaluated (the filter calls it BEFORE it rewrites state),
     * and it does not depend on a `$record` being injectable — which it is not on a create form.
     */
    private static function holdsExternalUrl(BaseFileUpload $component): bool
    {
        $state = $component->getRawState();
        $values = is_array($state) ? $state : [$state];

        foreach ($values as $value) {
            if (is_string($value) && ImagePath::isExternal($value)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The vendor default, reproduced.
     *
     * Copied line for line from Filament v4.2.0 BaseFileUpload::setUp()'s `getUploadedFileUsing`
     * closure, because overriding that closure replaces it wholesale and the non-external branch
     * must keep behaving exactly as it does for the 309 legacy products. Deviating from it here
     * would change the legacy edit form, which is the one thing this work may not do.
     *
     * The one deliberate difference: the vendor catches League\Flysystem\UnableToCheckFileExistence
     * and this catches \Throwable. Same outcome for a local disk that answers; broader only in
     * failure modes the vendor would let bubble into a 500.
     *
     * @return array{name: string, size: int, type: ?string, url: ?string}|null
     */
    private static function diskFile(BaseFileUpload $component, string $file, string | array | null $storedFileNames): ?array
    {
        /** @var \Illuminate\Filesystem\FilesystemAdapter $storage */
        $storage = $component->getDisk();

        $shouldFetchFileInformation = $component->shouldFetchFileInformation();

        if ($shouldFetchFileInformation) {
            try {
                if (! $storage->exists($file)) {
                    return null;
                }
            } catch (\Throwable) {
                return null;
            }
        }

        $url = null;

        if ($component->getVisibility() === 'private') {
            try {
                $url = $storage->temporaryUrl($file, now()->addMinutes(30)->endOfHour());
            } catch (\Throwable) {
                // This driver does not support creating temporary URLs.
            }
        }

        $url ??= $storage->url($file);

        return [
            'name' => ($component->isMultiple() ? ($storedFileNames[$file] ?? null) : $storedFileNames) ?? basename($file),
            'size' => $shouldFetchFileInformation ? $storage->size($file) : 0,
            'type' => $shouldFetchFileInformation ? $storage->mimeType($file) : null,
            'url' => $url,
        ];
    }
}
