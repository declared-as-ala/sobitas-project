<?php

/**
 * Static regression guard for the product editor boot contract.
 *
 * This test deliberately has no Laravel/vendor dependency, so it can run before the Docker image
 * is built. The browser failure it protects against is client-side: Filament 4.2 passes an absent
 * create-state as `undefined` to TipTap, which then crashes before rendering a contenteditable
 * surface. The field must therefore always declare a string default and normalize legacy NULLs.
 */

$root = dirname(__DIR__);
$resourcePath = $root . '/app/Filament/Resources/ProductResource.php';
$createPagePath = $root . '/app/Filament/Resources/ProductResource/Pages/CreateProduct.php';
$editPagePath = $root . '/app/Filament/Resources/ProductResource/Pages/EditProduct.php';
$adminStylesPath = $root . '/resources/views/filament/components/custom-admin-styles.blade.php';

$resource = file_get_contents($resourcePath);
$createPage = file_get_contents($createPagePath);
$editPage = file_get_contents($editPagePath);
$adminStyles = file_get_contents($adminStylesPath);

if ($resource === false || $createPage === false || $editPage === false || $adminStyles === false) {
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
];

$failed = false;

foreach ($checks as $label => $passed) {
    fwrite($passed ? STDOUT : STDERR, sprintf("[%s] %s\n", $passed ? 'PASS' : 'FAIL', $label));
    $failed = $failed || ! $passed;
}

exit($failed ? 1 : 0);
