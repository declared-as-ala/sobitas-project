<?php

namespace App\Filament\Resources;

use App\Enums\PartnerType;

final class PartnerCoachResource extends PartnerResource
{
    protected static ?string $slug = 'partner-coaches';

    protected static ?PartnerType $restrictedType = PartnerType::Coach;

    protected static ?string $navigationLabel = 'Coachs';

    protected static ?string $modelLabel = 'Coach';

    protected static ?string $pluralModelLabel = 'Coachs';

    protected static ?int $navigationSort = 2;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-academic-cap';

    public static function getPages(): array
    {
        return [
            'index' => \App\Filament\Resources\PartnerCoachResource\Pages\ListPartnerCoaches::route('/'),
            'create' => \App\Filament\Resources\PartnerCoachResource\Pages\CreatePartnerCoach::route('/create'),
            'edit' => \App\Filament\Resources\PartnerCoachResource\Pages\EditPartnerCoach::route('/{record}/edit'),
        ];
    }
}
