<?php

namespace App\Filament\Components\Filters;

use Filament\Tables\Filters\Filter;
use Filament\Forms\Components\DatePicker;

class DateRangeFilter
{
    public static function make(string $field = 'created_at', string $label = 'Date Range'): Filter
    {
        return Filter::make($field)
            ->form([
                DatePicker::make("{$field}_from")
                    ->label('From'),
                DatePicker::make("{$field}_until")
                    ->label('Until'),
            ])
            ->query(function ($query, array $data) use ($field) {
                return $query
                    ->when(
                        $data["{$field}_from"],
                        fn ($query, $date) => $query->whereDate($field, '>=', $date),
                    )
                    ->when(
                        $data["{$field}_until"],
                        fn ($query, $date) => $query->whereDate($field, '<=', $date),
                    );
            });
    }
}
