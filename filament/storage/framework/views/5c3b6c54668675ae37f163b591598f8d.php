<!DOCTYPE html>
<html lang="<?php echo e(str_replace('_', '-', app()->getLocale())); ?>">
    <head>
        <meta charset="utf-8" />

        <meta name="application-name" content="<?php echo e(config('app.name')); ?>" />
        <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title><?php echo e(config('app.name')); ?></title>

        <style>
            [x-cloak] {
                display: none !important;
            }
        </style>

        <?php echo \Filament\Support\Facades\FilamentAsset::renderStyles() ?>
        <?php echo app('Illuminate\Foundation\Vite')('resources/css/app.css'); ?>
    </head>

    <body class="antialiased">
        <?php echo e($slot); ?>


        <?php
$__split = function ($name, $params = []) {
    return [$name, $params];
};
[$__name, $__params] = $__split('notifications');

$__html = app('livewire')->mount($__name, $__params, 'lw-1921158335-0', $__slots ?? [], get_defined_vars());

echo $__html;

unset($__html);
unset($__name);
unset($__params);
unset($__split);
if (isset($__slots)) unset($__slots);
?>

        <?php echo \Filament\Support\Facades\FilamentAsset::renderScripts() ?>
        <?php echo app('Illuminate\Foundation\Vite')('resources/js/app.js'); ?>
    </body>
</html>
<?php /**PATH /var/www/html/resources/views/components/layouts/app.blade.php ENDPATH**/ ?>