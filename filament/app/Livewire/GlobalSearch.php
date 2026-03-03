<?php

namespace App\Livewire;

use Livewire\Component;
use Livewire\Attributes\Url;

class GlobalSearch extends Component
{
    public string $query = '';

    /** @var array<string, array<int, array{id: int, label: string, subtitle: string, url: string, icon: string}>> */
    public array $groups = [];

    public bool $open = false;

    public int $selectedIndex = 0;

    private const MIN_LENGTH = 2;
    private const DEBOUNCE_MS = 300;

    public function updatedQuery(): void
    {
        $this->performSearch();
    }

    public function performSearch(): void
    {
        $q = trim($this->query);
        if (strlen($q) < self::MIN_LENGTH) {
            $this->groups = [];
            $this->open = true;
            return;
        }

        $url = route('admin.global-search', ['q' => $q]);
        $cookieHeader = request()->header('Cookie');
        $response = \Illuminate\Support\Facades\Http::timeout(5)
            ->withHeaders($cookieHeader ? ['Cookie' => $cookieHeader] : [])
            ->get($url);

        if (!$response->successful()) {
            $this->groups = ['_error' => [['id' => 0, 'label' => 'Erreur de recherche', 'subtitle' => '', 'url' => '', 'icon' => 'heroicon-o-exclamation-triangle']]];
            $this->open = true;
            return;
        }

        $data = $response->json();
        $groupLabels = [
            'clients' => 'Clients',
            'users' => 'Utilisateurs',
            'products' => 'Produits',
            'commandes' => 'Commandes',
            'tickets' => 'Tickets',
            'factures' => 'Bons de livraison',
            'facture_tvas' => 'Factures TVA',
            'quotations' => 'Devis',
        ];
        $this->groups = [];
        foreach ($groupLabels as $key => $label) {
            $items = $data[$key] ?? [];
            if (!empty($items)) {
                $this->groups[$label] = $items;
            }
        }
        $this->selectedIndex = 0;
        $this->open = true;
    }

    public function getFlatResults(): array
    {
        $flat = [];
        foreach ($this->groups as $items) {
            foreach ($items as $item) {
                $flat[] = $item;
            }
        }
        return $flat;
    }

    public function selectResult(): void
    {
        $this->selectResultByIndex($this->selectedIndex);
    }

    public function selectResultByIndex(int $index): void
    {
        $flat = $this->getFlatResults();
        if (isset($flat[$index]) && !empty($flat[$index]['url'])) {
            $this->redirect($flat[$index]['url'], navigate: true);
        }
        $this->open = false;
        $this->query = '';
    }

    public function moveSelection(int $delta): void
    {
        $flat = $this->getFlatResults();
        $count = count($flat);
        if ($count === 0) {
            return;
        }
        $this->selectedIndex = ($this->selectedIndex + $delta + $count) % $count;
    }

    public function close(): void
    {
        $this->open = false;
    }

    public function render()
    {
        return view('livewire.global-search');
    }
}
