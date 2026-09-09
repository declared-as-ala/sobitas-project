<?php

namespace App\Enums;

/**
 * How an affiliate is paid on Friday.
 *
 * ── WHY THIS IS AN ENUM AND NOT THE FREE-TEXT FIELD IT REPLACES ─────────────────────────────
 * `affilies.payment_method` was a plain TextInput. On a money field that means one person types
 * "cash", the next "Espèces", the next "espece au magasin" — and the Friday run cannot group by
 * method, so whoever prepares the payments has to read every row and decide what each one meant.
 * Two values, spelled once.
 *
 * The owner's rule: "either they want to come to the boutique and get cash, or we send the money
 * to their bank account each Friday."
 *
 * `Bank` requires a RIB; `Cash` must not demand one, because the affiliates most likely to collect
 * at the counter are exactly the ones without a bank account. Enforced in AffilieResource.
 *
 * Deliberately NOT offering D17 / Flouci / mandat minute yet. They exist and are common in Tunisia,
 * but each carries its own identity requirements and fee schedule, and adding a rail nobody has
 * agreed to operate would put a payout in a state no one knows how to settle. Add one when the
 * owner asks, with its handling rules.
 */
enum AffiliePayoutMethod: string
{
    case Cash = 'cash';
    case Bank = 'bank';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Espèces au magasin',
            self::Bank => 'Virement bancaire',
        };
    }

    /** Whether a RIB/IBAN is mandatory for this method. */
    public function requiresBankDetails(): bool
    {
        return $this === self::Bank;
    }

    /** @return array<string, string> value => label, for a Filament Select. */
    public static function options(): array
    {
        return array_reduce(
            self::cases(),
            static fn (array $carry, self $case): array => $carry + [$case->value => $case->label()],
            []
        );
    }
}
