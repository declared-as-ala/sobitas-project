<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Succeeded => 'Réussi',
            self::Failed => 'Échoué',
            self::Refunded => 'Remboursé',
        };
    }
}
