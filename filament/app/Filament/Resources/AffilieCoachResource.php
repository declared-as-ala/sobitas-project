<?php

namespace App\Filament\Resources;

use App\Enums\AffilieType;

final class AffilieCoachResource extends AffilieResource
{
    protected static ?string $slug = 'affilie-coaches';

    protected static ?AffilieType $restrictedType = AffilieType::Coach;

    protected static ?string $navigationLabel = 'Coachs';

    protected static ?string $modelLabel = 'Coach';

    protected static ?string $pluralModelLabel = 'Coachs';

    protected static ?int $navigationSort = 2;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-academic-cap';

    public static function getPages(): array
    {
        return [
            'index' => \App\Filament\Resources\AffilieCoachResource\Pages\ListAffilieCoaches::route('/'),
            'create' => \App\Filament\Resources\AffilieCoachResource\Pages\CreateAffilieCoach::route('/create'),
            'edit' => \App\Filament\Resources\AffilieCoachResource\Pages\EditAffilieCoach::route('/{record}/edit'),
        ];
    }
}
