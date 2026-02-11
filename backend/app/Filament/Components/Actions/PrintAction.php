<?php

namespace App\Filament\Components\Actions;

use Filament\Tables\Actions\Action;

class PrintAction
{
    public static function make(string $routeName, string $routeParam = 'id'): Action
    {
        return Action::make('print')
            ->label('Print')
            ->icon('heroicon-o-printer')
            ->url(fn ($record) => route($routeName, [$routeParam => $record->id]))
            ->openUrlInNewTab()
            ->color('gray');
    }
}
