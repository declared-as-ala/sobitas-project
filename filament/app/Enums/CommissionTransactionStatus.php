<?php

namespace App\Enums;

enum CommissionTransactionStatus: string
{
    case Pending   = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Paid      = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Pending   => 'En attente',
            self::Confirmed => 'Confirmé',
            self::Cancelled => 'Annulé',
            self::Paid      => 'Payé',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending   => 'warning',
            self::Confirmed => 'success',
            self::Cancelled => 'danger',
            self::Paid      => 'info',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn ($c) => [$c->value => $c->label()])->all();
    }
}
