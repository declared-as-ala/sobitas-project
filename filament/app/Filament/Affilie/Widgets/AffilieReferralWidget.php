<?php

namespace App\Filament\Affilie\Widgets;

use Filament\Widgets\Widget;

/**
 * Surfaces the two attribution handles that already exist in the data model — the affiliate's
 * vanity subdomain link and their promo code — each with one-tap copy. Both are optional: a new
 * affiliate typically has neither yet (the subdomain is admin-assigned), so the card degrades to a
 * calm "en cours d'activation" state instead of showing empty fields.
 */
class AffilieReferralWidget extends Widget
{
    protected string $view = 'filament.affilie.widgets.affilie-referral-widget';

    protected static ?int $sort = 3;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = false;

    /**
     * @return array{link: ?string, code: ?string, reference: ?string, has_any: bool}
     */
    public function getReferral(): array
    {
        $affilie = auth()->user()?->affilie;

        $link = null;
        $code = null;
        $reference = null;

        if ($affilie) {
            $sub = trim((string) ($affilie->subdomain ?? ''));
            if ($sub !== '') {
                $link = 'https://' . $sub . '.protein.tn';
            }

            try {
                $code = $affilie->codes()->orderByDesc('id')->value('code') ?: null;
            } catch (\Throwable) {
                $code = null;
            }

            $reference = $affilie->reference ?: null;
        }

        return [
            'link'      => $link,
            'code'      => $code,
            'reference' => $reference,
            'has_any'   => $link !== null || $code !== null,
        ];
    }
}
