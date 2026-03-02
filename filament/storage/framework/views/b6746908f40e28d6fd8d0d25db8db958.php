<?php if($this instanceof \Filament\Actions\Contracts\HasActions && (! $this->hasActionsModalRendered)): ?>
    <div
        wire:partial="action-modals"
        x-data="filamentActionModals({
                    livewireId: <?php echo \Illuminate\Support\Js::from($this->getId())->toHtml() ?>,
                })"
        style="height: 0"
    >
        <?php $__currentLoopData = $this->getMountedActions(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $action): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <?php if((! $loop->last) || $this->mountedActionShouldOpenModal()): ?>
                <?php echo e($action->toModalHtmlable()); ?>

            <?php endif; ?>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </div>

    <?php
        $this->hasActionsModalRendered = true;
    ?>
<?php endif; ?>
<?php /**PATH /var/www/html/vendor/filament/actions/resources/views/components/modals.blade.php ENDPATH**/ ?>