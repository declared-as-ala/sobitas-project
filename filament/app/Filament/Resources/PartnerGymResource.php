<?php

namespace App\Filament\Resources;

use App\Enums\PartnerType;

final class PartnerGymResource extends PartnerResource
{
    protected static ?string $slug = 'partner-gyms';

    protected static ?PartnerType $restrictedType = PartnerType::Gym;

    protected static ?string $navigationLabel = 'Salles de sport';

    protected static ?string $modelLabel = 'Salle';

    protected static ?string $pluralModelLabel = 'Salles de sport';

    protected static ?int $navigationSort = 3;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-building-storefront';

    public static function getPages(): array
    {
        return [
            'index' => \App\Filament\Resources\PartnerGymResource\Pages\ListPartnerGyms::route('/'),
            'create' => \App\Filament\Resources\PartnerGymResource\Pages\CreatePartnerGym::route('/create'),
            'edit' => \App\Filament\Resources\PartnerGymResource\Pages\EditPartnerGym::route('/{record}/edit'),
        ];
    }
}
