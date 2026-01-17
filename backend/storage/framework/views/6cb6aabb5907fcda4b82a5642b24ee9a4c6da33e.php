<?php $__env->startSection('page_title', __('voyager::generic.viewing') . ' ' . 'Historique'); ?>

<?php $__env->startSection('page_header'); ?>
    <div class="container-fluid row">
        <div class="col-md-5">
            <h1 class="page-title" style="height: 65px">
                <i class=""></i> Historique

            </h1>
            <?php if(@$user): ?>
                <h5 style="padding-left: 75px">Client : <?php echo e($user->name); ?> </h5>
                <?php if($user->email): ?>  <h5 style="padding-left: 75px">Email : <?php echo e($user->email); ?></h5>   <?php endif; ?>
                <?php if($user->adresse): ?>  <h5 style="padding-left: 75px">Adresse : <?php echo e($user->adresse); ?></h5>   <?php endif; ?>
            <?php endif; ?>
                <h5 style="padding-left: 75px">Numéro de téléphone : <?php echo e($tel); ?></h5>


        </div>
        <div class="col-md-7">
            <form method="POST" action="<?php echo e(route('voyager.historique')); ?>" class="card" style="padding: 20px ; margin-top : 10px">
                <?php echo csrf_field(); ?>
                <label style="color: #444"><b>Chercher l'historique de votre Client </b></label>
                <div class="row">
                    <div class="col-md-7">
                        <input type="number" min="20000001" max="99999999" class="form-control" name="tel" required placeholder="Numéro de téléphone" style="border-color: #444">

                    </div>
                    <div class="col-md-5">
                        <button class="btn btn-success form-control" style=" background-color : #ff5000 ; margin-top : 0"> <i class="voyager-search"></i> &nbsp; Chercher </button>

                    </div>
                </div>

            </form>
        </div>



    </div>
<?php $__env->stopSection(); ?>
<?php $__env->startSection('content'); ?>
<style>
    #dataTable2 a, #dataTable3 a , #dataTable4 a {
    font-weight: 500;
    text-decoration: none;
    font-size: 12px !important;
    padding: 5px 10px !important;
}
#dataTable2 .bread-actions .btn,  #dataTable3 .bread-actions .btn,  #dataTable4 .bread-actions .btn, {
    font-size: 12px !important;
    padding: 5px 10px !important;
}
</style>
    <div class="page-content browse container-fluid">
        <?php echo $__env->make('voyager::alerts', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
        <div class="row">
            <div class="col-md-12">
                <div class="panel panel-bordered">
                    <div class="panel-body">

                        <?php if(!@$user && $commandes->count()==0 && $tickets->count()==0 && $factures->count()==0 && $facture_tvas->count()==0): ?>

                            <h1  style="text-align: center ; color:black ; font-size : 16pt">
                                Aucune donnée disponible
                            </h1>
                        <?php else: ?>

                        <div class="table-responsive">
                            <h1 class="page-title">Liste des commandes </h1>
                            <table id="dataTable" class="table table-hover">

                                <thead>
                                    <tr>
                                        <th> Numéro </th>
                                        <th> Date </th>
                                        <th> Totale TTC </th>
                                        <th> Nom & prénom </th>
                                        <th> Ville </th>
                                        <th> Etat </th>

                                        <th class="actions text-right dt-not-orderable">
                                            <?php echo e(__('voyager::generic.actions')); ?></th>
                                    </tr>
                                </thead>
                                <tbody>

                                    <?php $__currentLoopData = $commandes; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $commande): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <tr>
                                            <td><?php echo e($commande->numero); ?></td>
                                            <td><?php echo e($commande->created_at->format('d-M-Y')); ?></td>
                                            <td><?php echo e($commande->prix_ttc); ?></td>
                                            <td><?php echo e($commande->nom); ?> <?php echo e($commande->prenom); ?></td>

                                            <td><?php echo e($commande->ville); ?></td>
                                            <td>
                                                <?php if(@$commande->etat == 'nouvelle_commande'): ?>
                                                    Nouvelle Commande
                                                <?php elseif(@$commande->etat == 'en_cours_de_preparation'): ?>
                                                    En cours de
                                                    préparations
                                                <?php elseif(@$commande->etat == 'prete'): ?>
                                                    Prête
                                                <?php elseif(@$commande->etat == 'en_cours_de_livraison'): ?>
                                                    En cours de livraison
                                                <?php elseif(@$commande->etat == 'expidee'): ?>
                                                    Expidée
                                                <?php elseif(@$commande->etat == 'annuler'): ?>
                                                    Annuler
                                                <?php endif; ?>
                                            </td>

                                            <td class="no-sort no-click bread-actions">

                                                <a href="<?php echo e(route('voyager.edit_commande', $commande->id)); ?>"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="<?php echo e(route('voyager.imprimer_commande', $commande->id)); ?>"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                </tbody>
                            </table>
                        </div>

                        <div class="table-responsive">
                            <h1 class="page-title">Liste des tickets</h1>
                            <table id="dataTable2" class="table table-hover">

                                <thead>
                                    <tr>
                                        <th> Numéro </th>
                                        <th> Date </th>
                                        <th> Totale TTC </th>
                                        <th> Nom & prénom </th>
                                        <th> Ville </th>

                                        <th class="actions text-right dt-not-orderable">
                                            <?php echo e(__('voyager::generic.actions')); ?></th>
                                    </tr>
                                </thead>
                                <tbody>

                                    <?php $__currentLoopData = $tickets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $ticket): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <tr>
                                            <td><?php echo e($ticket->numero); ?></td>
                                            <td><?php echo e($ticket->created_at->format('d-M-Y')); ?></td>
                                            <td><?php echo e($ticket->prix_ttc); ?></td>
                                            <td><?php echo e($ticket->client->name); ?></td>
                                            <td><?php echo e($ticket->client->adresse); ?></td>

                                            <td class="no-sort no-click bread-actions">

                                                <a href="<?php echo e(route('voyager.edit_ticket', $ticket->id)); ?>"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="<?php echo e(route('voyager.imprimer_ticket',  $ticket->id)); ?>"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                </tbody>
                            </table>
                        </div>

                        <div class="table-responsive">
                            <h1 class="page-title"> Liste des Factures</h1>
                            <table id="dataTable4" class="table table-hover">

                                <thead>
                                    <tr>
                                        <th> Numéro </th>
                                        <th> Date </th>
                                        <th> Totale TTC </th>
                                        <th> Nom & prénom </th>
                                        <th>Ville</th>

                                        <th class="actions text-right dt-not-orderable">
                                            <?php echo e(__('voyager::generic.actions')); ?></th>
                                    </tr>
                                </thead>
                                <tbody>

                                    <?php $__currentLoopData = $facture_tvas; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $facture): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <tr>
                                            <td><?php echo e($facture->numero); ?></td>
                                            <td><?php echo e($facture->created_at->format('d-M-Y')); ?></td>
                                            <td><?php echo e($facture->prix_ttc); ?></td>
                                            <td><?php echo e($facture->client->name); ?></td>
                                            <td><?php echo e($facture->client->adresse); ?></td>


                                            <td class="no-sort no-click bread-actions">

                                                <a href="<?php echo e(route('voyager.edit_facture_tva', ['id' => $facture->id])); ?>"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="<?php echo e(route('voyager.imprimer_facture_tva', ['id' => $facture->id])); ?>"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                </tbody>
                            </table>
                        </div>
                        <div class="table-responsive">
                            <h1 class="page-title"> Liste des Bon de livraisons</h1>
                            <table id="dataTable3" class="table table-hover">

                                <thead>
                                    <tr>
                                        <th> Numéro </th>
                                        <th> Date </th>
                                        <th> Totale TTC </th>
                                        <th> Nom & prénom </th>
                                        <th>Ville</th>


                                        <th class="actions text-right dt-not-orderable">
                                            <?php echo e(__('voyager::generic.actions')); ?></th>
                                    </tr>
                                </thead>
                                <tbody>

                                    <?php $__currentLoopData = $factures; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $facture): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <tr>
                                            <td><?php echo e($facture->numero); ?></td>
                                            <td><?php echo e($facture->created_at->format('d-M-Y')); ?></td>
                                            <td><?php echo e($facture->prix_ttc); ?></td>
                                            <td><?php echo e($facture->client->name); ?></td>
                                            <td><?php echo e($facture->client->adresse); ?></td>


                                            <td class="no-sort no-click bread-actions">

                                                <a href="<?php echo e(route('voyager.edit_facture', ['id' => $facture->id])); ?>"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="<?php echo e(route('voyager.imprimer_facture', ['id' => $facture->id])); ?>"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                </tbody>
                            </table>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>


<?php $__env->stopSection(); ?>

<?php $__env->startSection('css'); ?>
    <link rel="stylesheet" href="<?php echo e(voyager_asset('lib/css/responsive.dataTables.min.css')); ?>">
<?php $__env->stopSection(); ?>

<?php $__env->startSection('javascript'); ?>
    <!-- DataTables -->
    <script src="<?php echo e(voyager_asset('lib/js/dataTables.responsive.min.js')); ?>"></script>
    <script>
        $(document).ready(function() {

            var table = $('#dataTable').DataTable(<?php echo json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => __('voyager::datatable'),
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('voyager.dashboard.data_tables', []),
                ),
                true,
            ); ?>);

            var table2 = $('#dataTable2').DataTable(<?php echo json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => __('voyager::datatable'),
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('voyager.dashboard.data_tables', []),
                ),
                true,
            ); ?>);
            var table3 = $('#dataTable3').DataTable(<?php echo json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => __('voyager::datatable'),
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('voyager.dashboard.data_tables', []),
                ),
                true,
            ); ?>);

            var table4 = $('#dataTable4').DataTable(<?php echo json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => __('voyager::datatable'),
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('voyager.dashboard.data_tables', []),
                ),
                true,
            ); ?>);

        });
    </script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('voyager::master', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH C:\xampp\htdocs\SOBITAS-FULL-PROJECT\backend\resources\views/historique_client.blade.php ENDPATH**/ ?>