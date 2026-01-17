<?php if(isset($dataTypeContent->{$row->field})): ?>
    <?php if(json_decode($dataTypeContent->{$row->field}) !== null): ?>
        <?php $__currentLoopData = json_decode($dataTypeContent->{$row->field}); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $file): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
          <div data-field-name="<?php echo e($row->field); ?>">
            <a class="fileType" target="_blank"
              href="<?php echo e(Storage::disk(config('voyager.storage.disk'))->url($file->download_link) ?: ''); ?>"
              data-file-name="<?php echo e($file->original_name); ?>" data-id="<?php echo e($dataTypeContent->getKey()); ?>">
              <?php echo e($file->original_name ?: ''); ?>

            </a>
            <a href="#" class="voyager-x remove-multi-file"></a>
          </div>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    <?php else: ?>
      <div data-field-name="<?php echo e($row->field); ?>">
        <a class="fileType" target="_blank"
          href="<?php echo e(Storage::disk(config('voyager.storage.disk'))->url($dataTypeContent->{$row->field})); ?>"
          data-file-name="<?php echo e($dataTypeContent->{$row->field}); ?>" data-id="<?php echo e($dataTypeContent->getKey()); ?>">>
            <?php echo e(__('voyager::generic.download')); ?>

        </a>
        <a href="#" class="voyager-x remove-single-file"></a>
      </div>
    <?php endif; ?>
<?php endif; ?>
<input <?php if($row->required == 1 && !isset($dataTypeContent->{$row->field})): ?> required <?php endif; ?> type="file" name="<?php echo e($row->field); ?>[]" multiple="multiple">
<?php /**PATH C:\xampp\htdocs\SOBITAS-FULL-PROJECT\backend\vendor\tcg\voyager\src/../resources/views/formfields/file.blade.php ENDPATH**/ ?>