<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class SiteNavigationItem extends Model
{
    public const LOCATION_NAVBAR = 'navbar';
    public const LOCATION_SIDEBAR = 'sidebar';

    protected $fillable = [
        'location',
        'label',
        'url',
        'icon',
        'is_visible',
        'sort_order',
        'opens_new_tab',
    ];

    protected $casts = [
        'is_visible' => 'boolean',
        'opens_new_tab' => 'boolean',
        'sort_order' => 'integer',
    ];

    public static function locationOptions(): array
    {
        return [
            self::LOCATION_NAVBAR => 'Navbar',
            self::LOCATION_SIDEBAR => 'Sidebar',
        ];
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('is_visible', true);
    }
}
