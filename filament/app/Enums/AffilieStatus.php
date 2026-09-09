<?php

namespace App\Enums;

enum AffilieStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Suspended = 'suspended';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Active => 'Actif',
            self::Suspended => 'Suspendu',
            self::Rejected => 'Refusé',
        };
    }

    /**
     * Badge colour for Filament tables.
     *
     * `pending` is deliberately the loud one. Applications sat in that state with no way out of
     * it, and a review queue that does not look urgent is a review queue nobody empties.
     */
    public function color(): string
    {
        return match ($this) {
            self::Pending => 'warning',
            self::Active => 'success',
            self::Suspended => 'gray',
            self::Rejected => 'danger',
        };
    }

    /** @return array<string, string> value => French label, for Filament Selects. */
    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $s): array => [$s->value => $s->label()])
            ->all();
    }
}
