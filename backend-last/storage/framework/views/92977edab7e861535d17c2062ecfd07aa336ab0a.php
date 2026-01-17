<textarea class="form-control richTextBox" name="<?php echo e($row->field); ?>" id="richtext<?php echo e($row->field); ?>">
    <?php echo e(old($row->field, $dataTypeContent->{$row->field} ?? '')); ?>

</textarea>

<?php $__env->startPush('javascript'); ?>
    <script>
        $(document).ready(function() {
            var additionalConfig = {
                selector: 'textarea.richTextBox[name="<?php echo e($row->field); ?>"]',
                toolbar:  'undo redo | styles | bold italic underline| forecolor backcolor | alignleft aligncenter alignright alignjustify | outdent indent | fontselect fontsizeselect  | code | table | hr | link image',
                extended_valid_elements : "script[language|type|src]"
            }

            $.extend(additionalConfig, <?php echo json_encode($options->tinymceOptions ?? (object)[]); ?>)

            tinymce.init(window.voyagerTinyMCE.getConfig(additionalConfig));
        });
    </script>
<?php $__env->stopPush(); ?>
<?php /**PATH /home/protein/www/admin/vendor/tcg/voyager/src/../resources/views/formfields/rich_text_box.blade.php ENDPATH**/ ?>