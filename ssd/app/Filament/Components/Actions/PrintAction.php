<?php

namespace App\Filament\Components\Actions;

use Filament\Tables\Actions\Action;
use Illuminate\Support\HtmlString;

class PrintAction
{
    /**
     * Print in same page: opens a modal with iframe (print preview) and "Imprimer" button
     * that triggers window.print() on the iframe content. No new browser tab.
     */
    public static function make(string $routeName, string $routeParam = 'id'): Action
    {
        return Action::make('print')
            ->label(__('Imprimer'))
            ->icon('heroicon-o-printer')
            ->color('gray')
            ->modalHeading(__('Imprimer'))
            ->modalContent(function ($record) use ($routeName, $routeParam) {
                $printUrl = route($routeName, [$routeParam => $record->id]);

                return new HtmlString(
                    view('filament.components.print-modal', ['printUrl' => $printUrl])->render()
                );
            })
            ->modalSubmitAction(false)
            ->modalCancelActionLabel(__('Fermer'));
    }
}
