<?php

namespace App\Support\AdminMenu;

use App\Models\Permission;
use App\Filament\Resources\AromaResource;
use App\Filament\Resources\BrandResource;
use App\Filament\Resources\CategResource;
use App\Filament\Resources\ClientResource;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\PermissionResource;
use App\Filament\Resources\ProductPriceListResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\ProductResource;
use App\Filament\Resources\RoleResource;
use App\Filament\Resources\SousCategoryResource;
use App\Filament\Resources\TagResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Resources\UserResource;
use Filament\Facades\Filament;
use Filament\Navigation\NavigationBuilder;
use Filament\Navigation\NavigationGroup;
use Filament\Navigation\NavigationItem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

class FilamentNavigationBuilder
{
    private const PERMISSION_KEYS_CACHE = 'permission_keys_v1';

    /**
     * @return array<int, NavigationItem|NavigationGroup>
     */
    public function build(): array
    {
        $items = [];

        foreach (app(AdminMenuRepository::class)->getAdminMenuTree() as $menuItem) {
            $built = $this->buildItem($menuItem);

            if ($built) {
                $items[] = $built;
            }
        }

        return $items;
    }

    public function buildNavigationBuilder(): NavigationBuilder
    {
        $builder = new NavigationBuilder();

        foreach (app(AdminMenuRepository::class)->getAdminMenuTree() as $menuItem) {
            $children = $menuItem['children'] ?? [];
            $childItems = [];

            foreach ($children as $child) {
                $childItem = $this->buildNavigationItem($child);
                if ($childItem) {
                    $childItems[] = $childItem;
                }
            }

            $parentItem = $this->buildNavigationItem($menuItem);

            if (count($childItems) > 0) {
                if ($parentItem && ($menuItem['url'] ?? null || $menuItem['route'] ?? null)) {
                    array_unshift($childItems, $parentItem);
                }

                $builder->group(
                    NavigationGroup::make((string) ($menuItem['title'] ?? null))
                        ->items($childItems)
                );
            } elseif ($parentItem) {
                $builder->group(
                    NavigationGroup::make()
                        ->items([$parentItem])
                );
            }
        }

        return $builder;
    }

    /**
     * @param array<string, mixed> $menuItem
     * @return NavigationItem|NavigationGroup|null
     */
    private function buildItem(array $menuItem)
    {
        $children = [];
        foreach ($menuItem['children'] ?? [] as $child) {
            $childItem = $this->buildItem($child);
            if ($childItem) {
                $children[] = $childItem;
            }
        }

        $label = (string) ($menuItem['title'] ?? '');
        $sort = (int) ($menuItem['order'] ?? 0);
        $icon = $this->mapIcon($menuItem['icon'] ?? null) ?? 'heroicon-o-document-text';
        $url = $this->resolveUrl($menuItem);

        if (! $this->isVisible($menuItem)) {
            return null;
        }

        if (! $url && count($children) > 0) {
            return NavigationGroup::make($label)
                ->items($children)
                ->sort($sort);
        }

        $item = NavigationItem::make($label)
            ->sort($sort);

        $item->icon($icon);

        if ($url) {
            $item->url($url);
        }

        if (count($children) > 0) {
            $item->childItems($children);
        }

        return $item;
    }

    /**
     * @param array<string, mixed> $menuItem
     */
    private function buildNavigationItem(array $menuItem): ?NavigationItem
    {
        if (! $this->isVisible($menuItem)) {
            return null;
        }

        $label = (string) ($menuItem['title'] ?? '');
        $sort = (int) ($menuItem['order'] ?? 0);
        $icon = $this->mapIcon($menuItem['icon'] ?? null) ?? 'heroicon-o-document-text';
        $url = $this->resolveUrl($menuItem);

        if (! $url) {
            return null;
        }

        $item = NavigationItem::make($label)
            ->sort($sort)
            ->url($url);

        $item->icon($icon);

        return $item;
    }

    /**
     * @param array<string, mixed> $menuItem
     */
    private function resolveUrl(array $menuItem): ?string
    {
        $route = $menuItem['route'] ?? null;
        $parameters = $menuItem['parameters'] ?? [];

        $filamentUrl = $this->resolveFilamentResourceUrl($route);
        if ($filamentUrl) {
            return $filamentUrl;
        }

        if (is_string($route) && $route !== '' && Route::has($route)) {
            $parameters = is_array($parameters) ? $parameters : [];
            return route($route, $parameters);
        }

        $url = $menuItem['url'] ?? null;
        if (is_string($url) && $url !== '') {
            return url($url);
        }

        return null;
    }

    private function resolveFilamentResourceUrl(?string $route): ?string
    {
        if (! is_string($route) || ! class_exists(Filament::class)) {
            return null;
        }

        $map = [
            'voyager.users.index' => UserResource::class,
            'voyager.roles.index' => RoleResource::class,
            'voyager.permissions.index' => PermissionResource::class,
            'voyager.produits.index' => ProductResource::class,
            'voyager.categorie.index' => CategResource::class,
            'voyager.sous-categories.index' => SousCategoryResource::class,
            'voyager.brands.index' => BrandResource::class,
            'voyager.tags.index' => TagResource::class,
            'voyager.aromas.index' => AromaResource::class,
            'voyager.clients.index' => ClientResource::class,
            'voyager.commandes.index' => CommandeResource::class,
            'voyager.facture' => FactureResource::class,
            'voyager.facture_tva' => FactureTvaResource::class,
            'voyager.ticket' => TicketResource::class,
            'voyager.quotations' => QuotationResource::class,
        ];

        if (! array_key_exists($route, $map)) {
            return null;
        }

        $resource = $map[$route];

        if (! class_exists($resource)) {
            return null;
        }

        if (method_exists($resource, 'getUrl')) {
            return $resource::getUrl();
        }

        return null;
    }

    /**
     * @param array<string, mixed> $menuItem
     */
    private function isVisible(array $menuItem): bool
    {
        $permissionKey = $this->permissionKeyFromMenuItem($menuItem);

        if (! $permissionKey) {
            return true;
        }

        if (! $this->permissionExists($permissionKey)) {
            return true;
        }

        $user = auth()->user();

        return $user ? $user->can($permissionKey) : false;
    }

    /**
     * @param array<string, mixed> $menuItem
     */
    private function permissionKeyFromMenuItem(array $menuItem): ?string
    {
        $route = $menuItem['route'] ?? null;

        if (! is_string($route)) {
            return null;
        }

        if (Str::startsWith($route, 'voyager.') && Str::endsWith($route, '.index')) {
            $slug = Str::between($route, 'voyager.', '.index');
            return 'browse_' . Str::snake($slug);
        }

        if (Str::startsWith($route, 'voyager.')) {
            $slug = Str::after($route, 'voyager.');
            $slug = Str::snake($slug);
            return 'browse_' . $slug;
        }

        return null;
    }

    private function permissionExists(string $key): bool
    {
        $keys = Cache::remember(self::PERMISSION_KEYS_CACHE, 600, function () {
            return Permission::query()->pluck('key')->all();
        });

        return in_array($key, $keys, true);
    }

    private function mapIcon(?string $voyagerIcon): ?string
    {
        if (! $voyagerIcon) {
            return null;
        }

        $map = [
            'voyager-play' => 'heroicon-o-play',
            'voyager-images' => 'heroicon-o-photograph',
            'voyager-person' => 'heroicon-o-user',
            'voyager-lock' => 'heroicon-o-lock-closed',
            'voyager-tools' => 'heroicon-o-cog',
            'voyager-list' => 'heroicon-o-view-list',
            'voyager-data' => 'heroicon-o-database',
            'voyager-compass' => 'heroicon-o-compass',
            'voyager-bread' => 'heroicon-o-template',
            'voyager-settings' => 'heroicon-o-cog',
            'voyager-news' => 'heroicon-o-newspaper',
            'voyager-file-text' => 'heroicon-o-document-text',
            'voyager-shop' => 'heroicon-o-shopping-bag',
            'voyager-receipt' => 'heroicon-o-receipt-tax',
            'voyager-basket' => 'heroicon-o-shopping-cart',
            'voyager-tag' => 'heroicon-o-tag',
            'voyager-group' => 'heroicon-o-user-group',
            'voyager-categories' => 'heroicon-o-view-grid',
            'voyager-plus' => 'heroicon-o-plus',
            'voyager-dollar' => 'heroicon-o-currency-dollar',
            'voyager-list-add' => 'heroicon-o-clipboard-list',
            'voyager-new' => 'heroicon-o-star',
            'voyager-wand' => 'heroicon-o-light-bulb',
            'voyager-world' => 'heroicon-o-globe',
            'voyager-mail' => 'heroicon-o-mail',
            'voyager-dashboard' => 'heroicon-o-chart-bar',
            'voyager-boat' => 'heroicon-o-collection',
        ];

        return $map[$voyagerIcon] ?? 'heroicon-o-collection';
    }
}
