

<?php
    $patterns = isset($activePattern) ? explode(',', $activePattern) : [];
    $isActive = false;
    foreach ($patterns as $pattern) {
        if (request()->routeIs(trim($pattern))) {
            $isActive = true;
            break;
        }
    }
?>

<div class="sidebar-dropdown">
    
    <button
        type="button"
        onclick="toggleDropdown('<?php echo e($id); ?>')"
        class="group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 <?php echo e($isActive ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'); ?>"
        aria-expanded="false"
        aria-controls="dropdown-<?php echo e($id); ?>"
    >
        
        <span class="flex-shrink-0 w-5 h-5 <?php echo e($isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-400'); ?> transition-colors">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <?php echo $icon; ?>

            </svg>
        </span>

        
        <span class="flex-1 text-left truncate"><?php echo e($label); ?></span>

        
        <svg id="chevron-<?php echo e($id); ?>" class="dropdown-chevron w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
        </svg>

        
        <?php if($isActive): ?>
            <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-400 rounded-r-full"></span>
        <?php endif; ?>
    </button>

    
    <div
        id="dropdown-<?php echo e($id); ?>"
        class="sidebar-dropdown-content"
        data-default-open="<?php echo e(($defaultOpen ?? false) ? '1' : '0'); ?>"
    >
        <div class="ml-4 pl-4 border-l border-white/[0.06] mt-1 space-y-0.5">
            <?php $__currentLoopData = $items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php
                    $itemActive = isset($item['routeIs']) && request()->routeIs($item['routeIs']);
                ?>
                <a
                    href="<?php echo e($item['href']); ?>"
                    class="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-all duration-150 <?php echo e($itemActive ? 'text-primary-400 bg-primary-600/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'); ?>"
                    aria-current="<?php echo e($itemActive ? 'page' : 'false'); ?>"
                >
                    
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 <?php echo e($itemActive ? 'bg-primary-400' : 'bg-slate-600'); ?>"></span>
                    <span class="truncate"><?php echo e($item['label']); ?></span>
                </a>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
    </div>
</div>
<?php /**PATH /var/www/html/resources/views/layouts/partials/sidebar-dropdown.blade.php ENDPATH**/ ?>