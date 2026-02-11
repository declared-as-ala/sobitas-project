<?php

namespace App\Filament\Resources;

use App\Filament\Resources\Traits\HasEagerLoading;
use Filament\Resources\Resource;
use Illuminate\Database\Eloquent\Model;

abstract class BaseResource extends Resource
{
    use HasEagerLoading;
    protected static ?string $permissionSlug = null;

    protected static function permissionKey(string $action): string
    {
        return sprintf('%s_%s', $action, static::$permissionSlug);
    }

    protected static function checkPermission(string $action): bool
    {
        $user = auth()->user();

        return $user ? $user->can(static::permissionKey($action)) : false;
    }

    public static function canViewAny(): bool
    {
        return static::checkPermission('browse');
    }

    public static function canView(Model $record): bool
    {
        return static::checkPermission('read');
    }

    public static function canCreate(): bool
    {
        return static::checkPermission('add');
    }

    public static function canEdit(Model $record): bool
    {
        return static::checkPermission('edit');
    }

    public static function canDelete(Model $record): bool
    {
        return static::checkPermission('delete');
    }

    public static function canDeleteAny(): bool
    {
        return static::checkPermission('delete');
    }
}
