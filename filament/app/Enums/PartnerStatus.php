<?php

namespace App\Enums;

enum PartnerStatus: string
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
}
