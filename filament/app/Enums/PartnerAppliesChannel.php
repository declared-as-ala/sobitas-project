<?php

namespace App\Enums;

enum PartnerAppliesChannel: string
{
    case Website = 'website';
    case Boutique = 'boutique';
    case Both = 'both';

    public function label(): string
    {
        return match ($this) {
            self::Website => 'Site web',
            self::Boutique => 'Boutique',
            self::Both => 'Site + boutique',
        };
    }

    public function allowsBoutique(): bool
    {
        return $this === self::Boutique || $this === self::Both;
    }

    public function allowsWebsite(): bool
    {
        return $this === self::Website || $this === self::Both;
    }
}
