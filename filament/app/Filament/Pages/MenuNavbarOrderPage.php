<?php

namespace App\Filament\Pages;

use App\Models\Categ;
use App\Models\SousCategory;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class MenuNavbarOrderPage extends Page
{
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-queue-list';

    protected static string|\UnitEnum|null $navigationGroup = 'Paramètres du site';

    protected static ?string $navigationLabel = 'Ordre du Menu';

    protected static ?int $navigationSort = 4;

    protected static ?string $title = 'Ordre du menu navigation';

    protected string $view = 'filament.pages.menu-navbar-order';

    /** Currently expanded category ID (null = none). */
    public ?int $selectedCategId = null;

    // ─── Data helpers ──────────────────────────────────────────────────────────

    public function getCategories(): \Illuminate\Support\Collection
    {
        return Categ::query()
            ->select(['id', 'sort_order', 'designation_fr', 'slug'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    public function getSousCategories(): \Illuminate\Support\Collection
    {
        if (! $this->selectedCategId) {
            return collect();
        }

        return SousCategory::query()
            ->select(['id', 'sort_order', 'designation_fr', 'slug', 'categorie_id'])
            ->where('categorie_id', $this->selectedCategId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    // ─── Toggle category expand ───────────────────────────────────────────────

    public function selectCategory(int $id): void
    {
        $this->selectedCategId = ($this->selectedCategId === $id) ? null : $id;
    }

    // ─── Category reordering ──────────────────────────────────────────────────

    public function moveCategoryUp(int $id): void
    {
        $this->reorderCategories($id, -1);
    }

    public function moveCategoryDown(int $id): void
    {
        $this->reorderCategories($id, +1);
    }

    private function reorderCategories(int $movedId, int $direction): void
    {
        $items = Categ::orderBy('sort_order')->orderBy('id')->get();
        $index = $items->search(fn ($item) => $item->id === $movedId);

        if ($index === false) {
            return;
        }

        $newIndex = $index + $direction;
        if ($newIndex < 0 || $newIndex >= $items->count()) {
            return;
        }

        // Rebuild ordered array with the item swapped
        $arr = $items->values()->all();
        $moved = array_splice($arr, $index, 1);
        array_splice($arr, $newIndex, 0, $moved);

        // Persist sequential sort_orders (1, 2, 3 …)
        foreach ($arr as $i => $item) {
            Categ::where('id', $item->id)->update(['sort_order' => $i + 1]);
        }

        Notification::make()->title('Ordre mis à jour')->success()->send();
    }

    // ─── Subcategory reordering ───────────────────────────────────────────────

    public function moveSubUp(int $id): void
    {
        $this->reorderSubs($id, -1);
    }

    public function moveSubDown(int $id): void
    {
        $this->reorderSubs($id, +1);
    }

    private function reorderSubs(int $movedId, int $direction): void
    {
        if (! $this->selectedCategId) {
            return;
        }

        $items = SousCategory::where('categorie_id', $this->selectedCategId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $index = $items->search(fn ($item) => $item->id === $movedId);
        if ($index === false) {
            return;
        }

        $newIndex = $index + $direction;
        if ($newIndex < 0 || $newIndex >= $items->count()) {
            return;
        }

        $arr = $items->values()->all();
        $moved = array_splice($arr, $index, 1);
        array_splice($arr, $newIndex, 0, $moved);

        foreach ($arr as $i => $item) {
            SousCategory::where('id', $item->id)->update(['sort_order' => $i + 1]);
        }

        Notification::make()->title('Ordre mis à jour')->success()->send();
    }
}
