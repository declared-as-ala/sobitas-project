<?php

namespace App\Support\AdminMenu;

use App\Models\Menu;
use App\Models\MenuItem;
use Illuminate\Support\Facades\Cache;

class AdminMenuRepository
{
    private const CACHE_KEY = 'admin_menu_tree_v1';
    private const CACHE_TTL_SECONDS = 600;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAdminMenuTree(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, function () {
            $menu = Menu::query()
                ->where('name', 'admin')
                ->with(['items.children'])
                ->first();

            if (! $menu) {
                return [];
            }

            return $menu->items
                ->map(fn (MenuItem $item) => $this->mapItem($item))
                ->values()
                ->all();
        });
    }

    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapItem(MenuItem $item): array
    {
        return [
            'id' => $item->id,
            'title' => $item->title,
            'url' => $item->url,
            'route' => $item->route,
            'parameters' => $item->parameters,
            'target' => $item->target,
            'icon' => $item->icon_class,
            'color' => $item->color,
            'order' => $item->order,
            'children' => $item->children
                ->map(fn (MenuItem $child) => $this->mapItem($child))
                ->values()
                ->all(),
        ];
    }
}
