<?php

declare(strict_types=1);

namespace App\Enums;

enum OrderStatus: string
{
    case NOUVELLE_COMMANDE = 'nouvelle_commande';
    case EN_COURS_DE_PREPARATION = 'en_cours_de_preparation';
    case PRETE = 'prete';
    case EN_COURS_DE_LIVRAISON = 'en_cours_de_livraison';
    case EXPEDIEE = 'expidee';
    case ANNULEE = 'annuler';

    public function label(): string
    {
        return match ($this) {
            self::NOUVELLE_COMMANDE => 'Nouvelle Commande',
            self::EN_COURS_DE_PREPARATION => 'En cours de préparation',
            self::PRETE => 'Prête',
            self::EN_COURS_DE_LIVRAISON => 'En cours de livraison',
            self::EXPEDIEE => 'Expédiée',
            self::ANNULEE => 'Annulée',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::NOUVELLE_COMMANDE => 'info',
            self::EN_COURS_DE_PREPARATION => 'warning',
            self::PRETE => 'success',
            self::EN_COURS_DE_LIVRAISON => 'primary',
            self::EXPEDIEE => 'success',
            self::ANNULEE => 'danger',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::NOUVELLE_COMMANDE => 'heroicon-o-plus-circle',
            self::EN_COURS_DE_PREPARATION => 'heroicon-o-clock',
            self::PRETE => 'heroicon-o-check-circle',
            self::EN_COURS_DE_LIVRAISON => 'heroicon-o-truck',
            self::EXPEDIEE => 'heroicon-o-check-badge',
            self::ANNULEE => 'heroicon-o-x-circle',
        };
    }
}
