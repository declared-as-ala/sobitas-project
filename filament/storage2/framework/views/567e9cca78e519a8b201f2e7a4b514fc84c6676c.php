

<?php $__env->startSection('page_title', 'Produits'); ?>
<?php $__env->startSection('page_subtitle', 'Gérez votre catalogue et suivez votre stock'); ?>

<?php $__env->startSection('content'); ?>
<?php
    $isEdit = isset($product);
    $filters = $filters ?? [
        'search' => '',
        'brand_id' => null,
        'sous_categorie_id' => null,
        'status' => 'all',
        'stock' => 'all',
        'sort' => 'latest',
        'per_page' => 10,
    ];
    $stats = $stats ?? [
        'total' => 0,
        'in_stock' => 0,
        'rupture' => 0,
        'published' => 0,
    ];
    $formMode = old('form_mode', $isEdit ? 'edit' : 'create');
    $editId = old('product_id', $product->id ?? null);
?>

<div class="space-y-6">
    <?php if(session('message')): ?>
        <div class="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <?php echo e(session('message')); ?>

        </div>
    <?php endif; ?>

    <?php if($errors->any()): ?>
        <div class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p class="font-semibold">Veuillez corriger les erreurs suivantes :</p>
            <ul class="mt-2 list-disc pl-5 space-y-1">
                <?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <li><?php echo e($error); ?></li>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </ul>
        </div>
    <?php endif; ?>

    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
            <h2 class="text-xl font-semibold text-gray-900">Catalogue produits</h2>
            <p class="text-sm text-gray-500">Ajoutez, filtrez et mettez à jour votre inventaire en un clic.</p>
        </div>
        <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            data-modal-open
        >
            Nouveau produit
        </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Produits</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900"><?php echo e($stats['total']); ?></p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">En stock</p>
            <p class="mt-2 text-2xl font-semibold text-emerald-700"><?php echo e($stats['in_stock']); ?></p>
        </div>
        <div class="rounded-2xl border border-red-100 bg-red-50 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-red-600">Rupture</p>
            <p class="mt-2 text-2xl font-semibold text-red-700"><?php echo e($stats['rupture']); ?></p>
        </div>
        <div class="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-blue-600">Publiés</p>
            <p class="mt-2 text-2xl font-semibold text-blue-700"><?php echo e($stats['published']); ?></p>
        </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 px-6 py-4">
            <div>
                <h3 class="text-base font-semibold text-gray-900">Tous les produits</h3>
                <p class="text-sm text-gray-500">Modifiez rapidement ou supprimez un produit.</p>
            </div>
        </div>

        <form method="GET" action="<?php echo e(route('admin.products.index')); ?>" class="border-b border-gray-100 px-6 py-4">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div class="md:col-span-4">
                    <input
                        type="text"
                        name="search"
                        value="<?php echo e($filters['search']); ?>"
                        placeholder="Recherche par nom ou slug"
                        class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                    >
                </div>
                <div class="md:col-span-2">
                    <select name="brand_id" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <option value="">Toutes les marques</option>
                        <?php $__currentLoopData = $brands; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $brand): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                            <option value="<?php echo e($brand->id); ?>" <?php if($filters['brand_id'] == $brand->id): echo 'selected'; endif; ?>>
                                <?php echo e($brand->designation_fr); ?>

                            </option>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <select name="sous_categorie_id" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <option value="">Toutes les sous-catégories</option>
                        <?php $__currentLoopData = $sousCategories; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $sousCategory): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                            <option value="<?php echo e($sousCategory->id); ?>" <?php if($filters['sous_categorie_id'] == $sousCategory->id): echo 'selected'; endif; ?>>
                                <?php echo e($sousCategory->designation_fr); ?>

                            </option>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <select name="status" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <option value="all" <?php if($filters['status'] === 'all'): echo 'selected'; endif; ?>>Tous statuts</option>
                        <option value="published" <?php if($filters['status'] === 'published'): echo 'selected'; endif; ?>>Publié</option>
                        <option value="draft" <?php if($filters['status'] === 'draft'): echo 'selected'; endif; ?>>Brouillon</option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <select name="stock" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <option value="all" <?php if($filters['stock'] === 'all'): echo 'selected'; endif; ?>>Tous stocks</option>
                        <option value="in" <?php if($filters['stock'] === 'in'): echo 'selected'; endif; ?>>En stock</option>
                        <option value="out" <?php if($filters['stock'] === 'out'): echo 'selected'; endif; ?>>Rupture</option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <select name="sort" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <option value="latest" <?php if($filters['sort'] === 'latest'): echo 'selected'; endif; ?>>Plus récents</option>
                        <option value="price_asc" <?php if($filters['sort'] === 'price_asc'): echo 'selected'; endif; ?>>Prix croissant</option>
                        <option value="price_desc" <?php if($filters['sort'] === 'price_desc'): echo 'selected'; endif; ?>>Prix décroissant</option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <select name="per_page" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <option value="10" <?php if($filters['per_page'] == 10): echo 'selected'; endif; ?>>10 / page</option>
                        <option value="25" <?php if($filters['per_page'] == 25): echo 'selected'; endif; ?>>25 / page</option>
                        <option value="50" <?php if($filters['per_page'] == 50): echo 'selected'; endif; ?>>50 / page</option>
                    </select>
                </div>
                <div class="md:col-span-2 flex items-center gap-2">
                    <button
                        type="submit"
                        class="inline-flex flex-1 items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                        Appliquer
                    </button>
                    <a
                        href="<?php echo e(route('admin.products.index')); ?>"
                        class="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Réinitialiser
                    </a>
                </div>
            </div>
        </form>

        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                        <th class="px-6 py-3 text-left">Produit</th>
                        <th class="px-6 py-3 text-left">Catégorie</th>
                        <th class="px-6 py-3 text-left">Prix</th>
                        <th class="px-6 py-3 text-left">Stock</th>
                        <th class="px-6 py-3 text-left">Statut</th>
                        <th class="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <?php $__empty_1 = true; $__currentLoopData = $products; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                                        <?php if($item->cover): ?>
                                            <img src="<?php echo e(asset('storage/' . $item->cover)); ?>" alt="" class="h-full w-full object-cover">
                                        <?php else: ?>
                                            <span class="text-xs font-semibold text-gray-500">IMG</span>
                                        <?php endif; ?>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900"><?php echo e($item->designation_fr); ?></p>
                                        <p class="text-xs text-gray-500"><?php echo e($item->brand?->designation_fr ?? 'Sans marque'); ?></p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-gray-600">
                                <?php echo e($item->sousCategorie?->designation_fr ?? 'Non défini'); ?>

                            </td>
                            <td class="px-6 py-4 text-gray-900 font-semibold">
                                <?php echo e(number_format($item->prix ?? 0, 2)); ?> TND
                                <?php if($item->promo): ?>
                                    <p class="text-xs text-emerald-600">Promo <?php echo e(number_format($item->promo, 2)); ?> TND</p>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-4">
                                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold
                                    <?php echo e($item->qte > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'); ?>">
                                    <?php echo e($item->qte ?? 0); ?> unités
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex flex-wrap gap-2 text-xs">
                                    <span class="rounded-full px-2 py-1 font-semibold <?php echo e($item->publier ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'); ?>">
                                        <?php echo e($item->publier ? 'Publié' : 'Brouillon'); ?>

                                    </span>
                                    <?php if($item->new_product): ?>
                                        <span class="rounded-full bg-violet-50 px-2 py-1 font-semibold text-violet-700">Nouveau</span>
                                    <?php endif; ?>
                                    <?php if($item->best_seller): ?>
                                        <span class="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">Best</span>
                                    <?php endif; ?>
                                    <?php if($item->pack): ?>
                                        <span class="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">Pack</span>
                                    <?php endif; ?>
                                    <?php if($item->rupture): ?>
                                        <span class="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-700">Rupture</span>
                                    <?php endif; ?>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center justify-end gap-2">
                                    <a
                                        href="<?php echo e(route('admin.products.edit', $item->id)); ?>"
                                        class="hidden"
                                    >
                                        Modifier
                                    </a>
                                    <button
                                        type="button"
                                        class="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                        data-modal-edit
                                        data-id="<?php echo e($item->id); ?>"
                                        data-designation="<?php echo e($item->designation_fr); ?>"
                                        data-slug="<?php echo e($item->slug); ?>"
                                        data-description="<?php echo e($item->description); ?>"
                                        data-prix="<?php echo e($item->prix); ?>"
                                        data-promo="<?php echo e($item->promo); ?>"
                                        data-promo_expiration_date="<?php echo e(optional($item->promo_expiration_date)->format('Y-m-d')); ?>"
                                        data-qte="<?php echo e($item->qte); ?>"
                                        data-note="<?php echo e($item->note); ?>"
                                        data-brand_id="<?php echo e($item->brand_id); ?>"
                                        data-sous_categorie_id="<?php echo e($item->sous_categorie_id); ?>"
                                        data-meta_title="<?php echo e($item->meta_title); ?>"
                                        data-meta_description="<?php echo e($item->meta_description); ?>"
                                        data-alt_cover="<?php echo e($item->alt_cover); ?>"
                                        data-description_cover="<?php echo e($item->description_cover); ?>"
                                        data-publier="<?php echo e($item->publier ? 1 : 0); ?>"
                                        data-rupture="<?php echo e($item->rupture ? 1 : 0); ?>"
                                        data-new_product="<?php echo e($item->new_product ? 1 : 0); ?>"
                                        data-best_seller="<?php echo e($item->best_seller ? 1 : 0); ?>"
                                        data-pack="<?php echo e($item->pack ? 1 : 0); ?>"
                                        data-cover="<?php echo e($item->cover); ?>"
                                    >
                                        Modifier
                                    </button>
                                    <form method="POST" action="<?php echo e(route('admin.products.destroy', $item->id)); ?>" onsubmit="return confirm('Supprimer ce produit ?')">
                                        <?php echo csrf_field(); ?>
                                        <?php echo method_field('DELETE'); ?>
                                        <button
                                            type="submit"
                                            class="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                        >
                                            Supprimer
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                        <tr>
                            <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                                Aucun produit enregistré pour le moment.
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-gray-100 px-6 py-4 text-sm text-gray-500">
            <p>
                Affichage de
                <span class="font-semibold text-gray-900"><?php echo e($products->firstItem() ?? 0); ?></span>
                à
                <span class="font-semibold text-gray-900"><?php echo e($products->lastItem() ?? 0); ?></span>
                sur
                <span class="font-semibold text-gray-900"><?php echo e($products->total()); ?></span>
                produits
            </p>
            <div class="text-sm">
                <?php echo e($products->links()); ?>

            </div>
        </div>
    </div>
</div>

<div id="productModal" class="fixed inset-0 z-50 hidden">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" data-modal-close></div>
    <div class="relative mx-auto mt-10 w-[95%] max-w-4xl">
        <div class="rounded-2xl bg-white shadow-xl">
            <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900" id="modalTitle">Nouveau produit</h3>
                    <p class="text-sm text-gray-500">Ajoutez ou mettez à jour un produit rapidement.</p>
                </div>
                <button type="button" class="text-gray-400 hover:text-gray-600" data-modal-close>
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <form
                method="POST"
                enctype="multipart/form-data"
                action="<?php echo e(route('admin.products.store')); ?>"
                class="space-y-6 px-6 py-6"
                id="productForm"
                data-store-url="<?php echo e(route('admin.products.store')); ?>"
                data-update-url="<?php echo e(route('admin.products.update', '__ID__')); ?>"
            >
                <?php echo csrf_field(); ?>
                <input type="hidden" name="form_mode" value="<?php echo e($formMode); ?>" id="formMode">
                <input type="hidden" name="product_id" value="<?php echo e($editId); ?>" id="productId">
                <input type="hidden" name="_method" value="PUT" id="productFormMethod" <?php if($formMode !== 'edit'): echo 'disabled'; endif; ?>>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="text-sm font-medium text-gray-700">Désignation</label>
                        <input
                            type="text"
                            name="designation_fr"
                            value="<?php echo e(old('designation_fr', $product->designation_fr ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                            placeholder="Ex: Pack Sobitas 2026"
                            required
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Slug</label>
                        <input
                            type="text"
                            name="slug"
                            value="<?php echo e(old('slug', $product->slug ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                            placeholder="Se génère automatiquement si vide"
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Prix (TND)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="prix"
                            value="<?php echo e(old('prix', $product->prix ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                            required
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Quantité</label>
                        <input
                            type="number"
                            min="0"
                            name="qte"
                            value="<?php echo e(old('qte', $product->qte ?? 0)); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Promo (TND)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="promo"
                            value="<?php echo e(old('promo', $product->promo ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Expiration promo</label>
                        <input
                            type="date"
                            name="promo_expiration_date"
                            value="<?php echo e(old('promo_expiration_date', optional($product->promo_expiration_date ?? null)->format('Y-m-d'))); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                    </div>
                </div>

                <div>
                    <label class="text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        name="description"
                        rows="4"
                        class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        placeholder="Ajoutez une description détaillée du produit"
                    ><?php echo e(old('description', $product->description ?? '')); ?></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="text-sm font-medium text-gray-700">Marque</label>
                        <select
                            name="brand_id"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                            <option value="">Choisir une marque</option>
                            <?php $__currentLoopData = $brands; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $brand): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <option
                                    value="<?php echo e($brand->id); ?>"
                                    <?php if(old('brand_id', $product->brand_id ?? '') == $brand->id): echo 'selected'; endif; ?>
                                >
                                    <?php echo e($brand->designation_fr); ?>

                                </option>
                            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                        </select>
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Sous-catégorie</label>
                        <select
                            name="sous_categorie_id"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                            <option value="">Choisir une sous-catégorie</option>
                            <?php $__currentLoopData = $sousCategories; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $sousCategory): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <option
                                    value="<?php echo e($sousCategory->id); ?>"
                                    <?php if(old('sous_categorie_id', $product->sous_categorie_id ?? '') == $sousCategory->id): echo 'selected'; endif; ?>
                                >
                                    <?php echo e($sousCategory->designation_fr); ?>

                                </option>
                            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label class="text-sm font-medium text-gray-700">Note</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            name="note"
                            value="<?php echo e(old('note', $product->note ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                            placeholder="0 - 5"
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Meta title</label>
                        <input
                            type="text"
                            name="meta_title"
                            value="<?php echo e(old('meta_title', $product->meta_title ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Meta description</label>
                        <input
                            type="text"
                            name="meta_description"
                            value="<?php echo e(old('meta_description', $product->meta_description ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label class="text-sm font-medium text-gray-700">Image</label>
                        <input
                            type="file"
                            name="cover"
                            class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                        <p class="mt-2 text-xs text-gray-500" id="coverInfo">
                            <?php if($isEdit && $product->cover): ?>
                                Fichier actuel : <?php echo e($product->cover); ?>

                            <?php endif; ?>
                        </p>
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Texte alternatif</label>
                        <input
                            type="text"
                            name="alt_cover"
                            value="<?php echo e(old('alt_cover', $product->alt_cover ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                    </div>

                    <div>
                        <label class="text-sm font-medium text-gray-700">Description image</label>
                        <input
                            type="text"
                            name="description_cover"
                            value="<?php echo e(old('description_cover', $product->description_cover ?? '')); ?>"
                            class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-primary-100"
                        >
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input type="checkbox" name="publier" class="rounded border-gray-300 text-primary-600"
                            <?php if(old('publier', $product->publier ?? true)): echo 'checked'; endif; ?>>
                        Publier ce produit
                    </label>

                    <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input type="checkbox" name="rupture" class="rounded border-gray-300 text-primary-600"
                            <?php if(old('rupture', $product->rupture ?? false)): echo 'checked'; endif; ?>>
                        Rupture de stock
                    </label>

                    <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input type="checkbox" name="new_product" class="rounded border-gray-300 text-primary-600"
                            <?php if(old('new_product', $product->new_product ?? false)): echo 'checked'; endif; ?>>
                        Nouveau produit
                    </label>

                    <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input type="checkbox" name="best_seller" class="rounded border-gray-300 text-primary-600"
                            <?php if(old('best_seller', $product->best_seller ?? false)): echo 'checked'; endif; ?>>
                        Best seller
                    </label>

                    <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input type="checkbox" name="pack" class="rounded border-gray-300 text-primary-600"
                            <?php if(old('pack', $product->pack ?? false)): echo 'checked'; endif; ?>>
                        Pack
                    </label>
                </div>

                <div class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        data-modal-close
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                        id="modalSubmit"
                    >
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubmit = document.getElementById('modalSubmit');
    const productForm = document.getElementById('productForm');
    const formModeInput = document.getElementById('formMode');
    const productIdInput = document.getElementById('productId');
    const formMethodInput = document.getElementById('productFormMethod');
    const coverInfo = document.getElementById('coverInfo');
    const slugInput = productForm.querySelector('input[name="slug"]');
    const nameInput = productForm.querySelector('input[name="designation_fr"]');

    const openModal = () => {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    const resetForm = () => {
        productForm.reset();
        formMethodInput.value = '';
        formMethodInput.disabled = true;
        productForm.action = productForm.dataset.storeUrl;
        formModeInput.value = 'create';
        productIdInput.value = '';
        modalTitle.textContent = 'Nouveau produit';
        modalSubmit.textContent = 'Enregistrer';
        if (coverInfo) {
            coverInfo.textContent = '';
        }
    };

    const fillForm = (button) => {
        productForm.querySelector('input[name="designation_fr"]').value = button.dataset.designation || '';
        productForm.querySelector('input[name="slug"]').value = button.dataset.slug || '';
        productForm.querySelector('input[name="prix"]').value = button.dataset.prix || '';
        productForm.querySelector('input[name="qte"]').value = button.dataset.qte || 0;
        productForm.querySelector('input[name="promo"]').value = button.dataset.promo || '';
        productForm.querySelector('input[name="promo_expiration_date"]').value = button.dataset.promo_expiration_date || '';
        productForm.querySelector('textarea[name="description"]').value = button.dataset.description || '';
        productForm.querySelector('input[name="note"]').value = button.dataset.note || '';
        productForm.querySelector('input[name="meta_title"]').value = button.dataset.meta_title || '';
        productForm.querySelector('input[name="meta_description"]').value = button.dataset.meta_description || '';
        productForm.querySelector('input[name="alt_cover"]').value = button.dataset.alt_cover || '';
        productForm.querySelector('input[name="description_cover"]').value = button.dataset.description_cover || '';
        productForm.querySelector('select[name="brand_id"]').value = button.dataset.brand_id || '';
        productForm.querySelector('select[name="sous_categorie_id"]').value = button.dataset.sous_categorie_id || '';
        productForm.querySelector('input[name="publier"]').checked = button.dataset.publier === '1';
        productForm.querySelector('input[name="rupture"]').checked = button.dataset.rupture === '1';
        productForm.querySelector('input[name="new_product"]').checked = button.dataset.new_product === '1';
        productForm.querySelector('input[name="best_seller"]').checked = button.dataset.best_seller === '1';
        productForm.querySelector('input[name="pack"]').checked = button.dataset.pack === '1';

        if (coverInfo) {
            coverInfo.textContent = button.dataset.cover ? `Fichier actuel : ${button.dataset.cover}` : '';
        }
    };

    document.querySelectorAll('[data-modal-open]').forEach((button) => {
        button.addEventListener('click', () => {
            resetForm();
            openModal();
        });
    });

    document.querySelectorAll('[data-modal-edit]').forEach((button) => {
        button.addEventListener('click', () => {
            resetForm();
            fillForm(button);
            const productId = button.dataset.id;
            const updateUrl = productForm.dataset.updateUrl.replace('__ID__', productId);
            productForm.action = updateUrl;
            formMethodInput.value = 'PUT';
            formMethodInput.disabled = false;
            formModeInput.value = 'edit';
            productIdInput.value = productId;
            modalTitle.textContent = 'Modifier le produit';
            modalSubmit.textContent = 'Mettre à jour';
            openModal();
        });
    });

    document.querySelectorAll('[data-modal-close]').forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    if (slugInput && nameInput && !slugInput.value) {
        nameInput.addEventListener('input', () => {
            const slug = nameInput.value
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');

            slugInput.value = slug;
        });
    }

    if ("<?php echo e($errors->any() || $formMode === 'edit' ? 'open' : ''); ?>" === 'open') {
        openModal();
        if ("<?php echo e($formMode); ?>" === 'edit' && "<?php echo e($editId); ?>" && "<?php echo e($errors->any() ? 1 : 0); ?>" === '0') {
            const editButton = document.querySelector(`[data-modal-edit][data-id="<?php echo e($editId); ?>"]`);
            if (editButton) {
                fillForm(editButton);
                const updateUrl = productForm.dataset.updateUrl.replace('__ID__', editButton.dataset.id);
                productForm.action = updateUrl;
                formMethodInput.value = 'PUT';
                formMethodInput.disabled = false;
                formModeInput.value = 'edit';
                productIdInput.value = editButton.dataset.id;
                modalTitle.textContent = 'Modifier le produit';
                modalSubmit.textContent = 'Mettre à jour';
            }
        }
    }
</script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/html/resources/views/admin/products.blade.php ENDPATH**/ ?>