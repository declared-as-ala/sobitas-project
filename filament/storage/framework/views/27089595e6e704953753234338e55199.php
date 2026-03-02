<?php
    use Filament\Actions\Action;
    use Filament\Actions\ActionGroup;
    use Filament\Schemas\Components\Component;
    use Filament\Support\Enums\VerticalAlignment;

    $statePath = $getStatePath();

    $fromBreakpoint = $getFromBreakpoint();
    $verticalAlignment = $getVerticalAlignment();

    if (! $verticalAlignment instanceof VerticalAlignment) {
        $verticalAlignment = filled($verticalAlignment) ? (VerticalAlignment::tryFrom($verticalAlignment) ?? $verticalAlignment) : null;
    }
?>

<div
    <?php echo e($attributes
            ->merge($getExtraAttributes(), escape: false)
            ->class([
                'fi-sc-flex',
                'fi-dense' => $isDense(),
                'fi-from-' . ($fromBreakpoint ?? 'default'),
                ($verticalAlignment instanceof VerticalAlignment) ? "fi-vertical-align-{$verticalAlignment->value}" : $verticalAlignment,
            ])); ?>

>
    <?php $__currentLoopData = $getChildSchema()->getComponents(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $component): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php if(($component instanceof Action) || ($component instanceof ActionGroup)): ?>
            <div>
                <?php echo e($component); ?>

            </div>
        <?php else: ?>
            <?php
                $hiddenJs = $component->getHiddenJs();
                $visibleJs = $component->getVisibleJs();

                $componentStatePath = $component->getStatePath();
            ?>

            <div
                x-data="filamentSchemaComponent({
                            path: <?php echo \Illuminate\Support\Js::from($componentStatePath)->toHtml() ?>,
                            containerPath: <?php echo \Illuminate\Support\Js::from($statePath)->toHtml() ?>,
                            $wire,
                        })"
                <?php if($afterStateUpdatedJs = $schemaComponent->getAfterStateUpdatedJs()): ?>
                    x-init="<?php echo implode(';', array_map(
                        fn (string $js): string => '$wire.watch(' . Js::from($componentStatePath) . ', ($state, $old) => isStateChanged($state, $old) && eval(' . Js::from($js) . '))',
                        $afterStateUpdatedJs,
                    )); ?>"
                <?php endif; ?>
                <?php if(filled($visibilityJs = match ([filled($hiddenJs), filled($visibleJs)]) {
                         [true, true] => "(! ({$hiddenJs})) && ({$visibleJs})",
                         [true, false] => "! ({$hiddenJs})",
                         [false, true] => $visibleJs,
                         default => null,
                     })): ?>
                    x-bind:class="{ 'fi-hidden': ! (<?php echo $visibilityJs; ?>) }"
                    x-cloak
                <?php endif; ?>
                class="<?php echo \Illuminate\Support\Arr::toCssClasses([
                    'fi-growable' => ($component instanceof Component) && $component->canGrow(),
                ]); ?>"
            >
                <?php echo e($component); ?>

            </div>
        <?php endif; ?>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</div>
<?php /**PATH /var/www/html/vendor/filament/schemas/resources/views/components/flex.blade.php ENDPATH**/ ?>