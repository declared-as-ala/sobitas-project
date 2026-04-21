

<?php
    $url = isset($route) ? route($route) : ($href ?? '#');
    $isActive = isset($route) ? request()->routeIs($route . '*') : false;
?>

<a
    href="<?php echo e($url); ?>"
    class="group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 <?php echo e($isActive ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'); ?>"
    aria-current="<?php echo e($isActive ? 'page' : 'false'); ?>"
>
    
    <span class="flex-shrink-0 w-5 h-5 <?php echo e($isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-400'); ?> transition-colors">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <?php echo $icon; ?>

        </svg>
    </span>

    
    <span class="flex-1 truncate"><?php echo e($label); ?></span>

    
    <?php if(!empty($badge)): ?>
        <span class="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white <?php echo e($badgeColor ?? 'bg-primary-500'); ?> badge-pulse">
            <?php echo e($badge); ?>

        </span>
    <?php endif; ?>

    
    <?php if($isActive): ?>
        <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-400 rounded-r-full"></span>
    <?php endif; ?>
</a>
<?php /**PATH /var/www/html/resources/views/layouts/partials/sidebar-item.blade.php ENDPATH**/ ?>