<?php

namespace App\Filament\Resources\Traits;

trait HasEagerLoading
{
    /**
     * Get the default eager loading relationships for this resource.
     */
    protected static function getDefaultEagerLoads(): array
    {
        return [];
    }

    /**
     * Modify the query to include eager loading.
     */
    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        $query = parent::getEloquentQuery();

        $eagerLoads = static::getDefaultEagerLoads();

        if (!empty($eagerLoads)) {
            $query->with($eagerLoads);
        }

        return $query;
    }
}
