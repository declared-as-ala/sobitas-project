<?php

namespace App\Filament\Resources;

use App\Enums\AffilieType;

final class AffilieGymResource extends AffilieResource
{
    protected static ?string $slug = 'affilie-gyms';

    protected static ?AffilieType $restrictedType = AffilieType::Gym;

    protected static ?string $navigationLabel = 'Salles de sport';

    protected static ?string $modelLabel = 'Salle';

    protected static ?string $pluralModelLabel = 'Salles de sport';

    protected static ?int $navigationSort = 3;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-building-storefront';

    public static function getPages(): array
    {
        return [
            'index' => \App\Filament\Resources\AffilieGymResource\Pages\ListAffilieGyms::route('/'),
            'create' => \App\Filament\Resources\AffilieGymResource\Pages\CreateAffilieGym::route('/create'),
            'edit' => \App\Filament\Resources\AffilieGymResource\Pages\EditAffilieGym::route('/{record}/edit'),
        ];
    }
}
