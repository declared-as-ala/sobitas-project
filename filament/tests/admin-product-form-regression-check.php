<?php

/**
 * Static regression guard for the product editor boot contract.
 *
 * This test deliberately has no Laravel/vendor dependency, so it can run before the Docker image
 * is built. It protects both halves of the editor boot contract: the field must expose valid HTML
 * state, and the shared nginx volume must receive the Filament assets published by the exact same
 * Composer image. A stale/newer rich-editor bundle crashes before rendering its contenteditable
 * surface even when the Livewire state is valid.
 */

$root = dirname(__DIR__);
$resourcePath = $root . '/app/Filament/Resources/ProductResource.php';
$createPagePath = $root . '/app/Filament/Resources/ProductResource/Pages/CreateProduct.php';
$editPagePath = $root . '/app/Filament/Resources/ProductResource/Pages/EditProduct.php';
$adminStylesPath = $root . '/resources/views/filament/components/custom-admin-styles.blade.php';
$filamentConfigPath = $root . '/config/filament.php';
$composePath = dirname($root) . '/docker-compose.yml';

$resource = file_get_contents($resourcePath);
$createPage = file_get_contents($createPagePath);
$editPage = file_get_contents($editPagePath);
$adminStyles = file_get_contents($adminStylesPath);
$filamentConfig = file_get_contents($filamentConfigPath);
$compose = file_get_contents($composePath);

if ($resource === false || $createPage === false || $editPage === false || $adminStyles === false || $filamentConfig === false || $compose === false) {
    fwrite(STDERR, "Unable to read the product form sources.\n");
    exit(1);
}

$checks = [
    'description is still a rich editor' => str_contains(
        $resource,
        "RichEditor::make('description_fr')",
    ),
    'description has a defined create-state' => preg_match(
        "/RichEditor::make\\('description_fr'\\)[\\s\\S]{0,900}?->default\\(''\\)/",
        $resource,
    ) === 1,
    'nullable legacy descriptions are normalized' => str_contains($resource, 'afterStateHydrated')
        && str_contains($resource, 'if (! is_string($state))')
        && str_contains($resource, '$component->state(\'\');'),
    'create page materializes the Livewire state key' => str_contains($createPage, 'protected function afterFill(): void')
        && str_contains($createPage, '$description = $this->data[\'description_fr\'] ?? null;')
        && str_contains($createPage, '$this->data[\'description_fr\'] = is_string($description) ? $description : \'\';'),
    'create page does not override Filament mount' => ! str_contains($createPage, 'function mount('),
    'edit page normalizes a legacy null value' => str_contains(
        $editPage,
        '$data[\'description_fr\'] = is_string($description) ? $description : \'\';',
    ),
    'sidebar observer waits for the body' => str_contains(
        $adminStyles,
        "document.addEventListener('DOMContentLoaded', observeSidebar, { once: true });",
    ),
    'Filament assets use a cache-busting release path' => str_contains(
        $filamentConfig,
        "'assets_path' => env('FILAMENT_ASSETS_PATH', 'filament-assets-v4-2')",
    ),
    'nginx receives assets published by the deployed Filament version' => preg_match(
        '/backend-v2-public-init:[\\s\\S]*?php artisan filament:assets[\\s\\S]*?cp -a \\/var\\/www\\/html\\/public\\/. \\/public\\//',
        $compose,
    ) === 1,
];

$failed = false;

foreach ($checks as $label => $passed) {
    fwrite($passed ? STDOUT : STDERR, sprintf("[%s] %s\n", $passed ? 'PASS' : 'FAIL', $label));
    $failed = $failed || ! $passed;
}

exit($failed ? 1 : 0);
