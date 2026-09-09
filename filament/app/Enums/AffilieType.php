<?php

namespace App\Enums;

/**
 * Who an affiliate is. Four kinds, and the two new ones are not cosmetic.
 *
 * The Partner module was built for a boutique's own network: a coach who sells to their athletes,
 * a gym that stocks the shelf. Both are businesses with premises. A public /partenaires form does
 * not attract only those — it attracts an individual with a following and no company, and a
 * performance marketer who will never meet a customer. They were previously forced into `coach`
 * or `gym`, which made "how many gyms do we have" unanswerable and put a sole trader under a
 * label that implies a commercial register number they do not have.
 *
 * The value is what the public API accepts and what the storefront sends. Never renumber or
 * rename a case: `affilies.type` stores the string, so a changed value orphans every row.
 */
enum AffilieType: string
{
    /** A person with an audience and no registered business. The default for public signups. */
    case Individual = 'individual';

    case Coach = 'coach';

    case Gym = 'gym';

    /** Performance/affiliate marketer driving traffic to a code or a subdomain. */
    case Marketer = 'marketer';

    public function label(): string
    {
        return match ($this) {
            self::Individual => 'Particulier',
            self::Coach => 'Coach',
            self::Gym => 'Salle de sport',
            self::Marketer => 'Marketeur',
        };
    }

    /** @return array<string, string> value => French label, for Filament Selects and validation. */
    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $t): array => [$t->value => $t->label()])
            ->all();
    }

    /** @return list<string> The accepted `type` values on the public application endpoint. */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
