<?php

namespace App\Filament\Components\Tables;

use Filament\Tables\Columns\TextColumn;

class CommonColumns
{
    public static function id(): TextColumn
    {
        return TextColumn::make('id')
            ->sortable();
    }

    public static function name(string $field = 'name'): TextColumn
    {
        return TextColumn::make($field)
            ->searchable()
            ->sortable();
    }

    public static function email(): TextColumn
    {
        return TextColumn::make('email')
            ->searchable()
            ->sortable()
            ->copyable();
    }

    public static function phone(string $field = 'phone_1'): TextColumn
    {
        return TextColumn::make($field)
            ->label('Phone')
            ->searchable();
    }

    public static function price(string $field = 'prix', string $label = 'Price'): TextColumn
    {
        return TextColumn::make($field)
            ->label($label)
            ->money('TND')
            ->sortable();
    }

    public static function quantity(string $field = 'qte', string $label = 'Quantity'): TextColumn
    {
        return TextColumn::make($field)
            ->label($label)
            ->numeric()
            ->sortable();
    }

    public static function createdAt(): TextColumn
    {
        return TextColumn::make('created_at')
            ->dateTime()
            ->sortable()
            ->toggleable(isToggledHiddenByDefault: true);
    }

    public static function updatedAt(): TextColumn
    {
        return TextColumn::make('updated_at')
            ->dateTime()
            ->sortable()
            ->toggleable(isToggledHiddenByDefault: true);
    }

    public static function status(string $field = 'etat', array $options = []): TextColumn
    {
        $column = TextColumn::make($field)
            ->label('Status')
            ->badge()
            ->sortable();

        if (!empty($options)) {
            $column->formatStateUsing(fn ($state) => $options[$state] ?? $state);
        }

        return $column;
    }
}
