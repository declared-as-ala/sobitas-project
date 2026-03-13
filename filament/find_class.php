<?php
require 'vendor/autoload.php';

$classes = [
    'Filament\Pages\Auth\EditProfile',
    'Filament\Pages\EditProfile',
    'Filament\Pages\Auth\Profile',
    'Filament\Pages\Profile',
];

foreach ($classes as $class) {
    if (class_exists($class)) {
        echo "FOUND: $class\n";
    } else {
        echo "NOT FOUND: $class\n";
    }
}
