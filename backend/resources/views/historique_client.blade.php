@extends('layouts.admin')

@section('page_title', 'Historique')

@section('page_header')
    <div class="container-fluid row">
        <div class="col-md-5">
            <h1 class="page-title" style="height: 65px">
                <i class=""></i> Historique

            </h1>
            @if (@$user)
                <h5 style="padding-left: 75px">Client : {{ $user->name }} </h5>
                @if($user->email)  <h5 style="padding-left: 75px">Email : {{$user->email}}</h5>   @endif
                @if($user->adresse)  <h5 style="padding-left: 75px">Adresse : {{$user->adresse}}</h5>   @endif
            @endif
                <h5 style="padding-left: 75px">Numéro de téléphone : {{ $tel }}</h5>


        </div>
        <div class="col-md-7">
            <form method="POST" action="{{ route('admin.historique') }}" class="card" style="padding: 20px ; margin-top : 10px">
                @csrf
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
@stop
@section('content')
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
<div class="row">
            <div class="col-md-12">
                <div class="panel panel-bordered">
                    <div class="panel-body">

                        @if(!@$user && $commandes->count()==0 && $tickets->count()==0 && $factures->count()==0 && $facture_tvas->count()==0)

                            <h1  style="text-align: center ; color:black ; font-size : 16pt">
                                Aucune donnée disponible
                            </h1>
                        @else

                        <div class="table-responsive">
                            <h1 class="page-title">Liste des bons de livraison </h1>
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
                                            Actions</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    @foreach ($commandes as $commande)
                                        <tr>
                                            <td>{{ $commande->numero }}</td>
                                            <td>{{ $commande->created_at->format('d-M-Y') }}</td>
                                            <td>{{ $commande->prix_ttc }}</td>
                                            <td>{{ $commande->nom }} {{ $commande->prenom }}</td>

                                            <td>{{ $commande->ville }}</td>
                                            <td>
                                                @if (@$commande->etat == 'nouvelle_commande')
                                                    Nouvelle Commande
                                                @elseif (@$commande->etat == 'en_cours_de_preparation')
                                                    En cours de
                                                    préparations
                                                @elseif (@$commande->etat == 'prete')
                                                    Prête
                                                @elseif (@$commande->etat == 'en_cours_de_livraison')
                                                    En cours de livraison
                                                @elseif (@$commande->etat == 'expidee')
                                                    Expidée
                                                @elseif(@$commande->etat == 'annuler')
                                                    Annuler
                                                @endif
                                            </td>

                                            <td class="no-sort no-click bread-actions">

                                                <a href="{{ route('admin.edit_commande', $commande->id) }}"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="{{ route('admin.imprimer_commande', $commande->id) }}"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    @endforeach

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
                                            Actions</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    @foreach ($tickets as $ticket)
                                        <tr>
                                            <td>{{ $ticket->numero }}</td>
                                            <td>{{ $ticket->created_at->format('d-M-Y') }}</td>
                                            <td>{{ $ticket->prix_ttc }}</td>
                                            <td>{{ $ticket->client->name }}</td>
                                            <td>{{ $ticket->client->adresse }}</td>

                                            <td class="no-sort no-click bread-actions">

                                                <a href="{{ route('admin.edit_ticket', $ticket->id) }}"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="{{ route('admin.imprimer_ticket',  $ticket->id) }}"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    @endforeach

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
                                            Actions</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    @foreach ($facture_tvas as $facture)
                                        <tr>
                                            <td>{{ $facture->numero }}</td>
                                            <td>{{ $facture->created_at->format('d-M-Y') }}</td>
                                            <td>{{ $facture->prix_ttc }}</td>
                                            <td>{{ $facture->client->name }}</td>
                                            <td>{{ $facture->client->adresse }}</td>


                                            <td class="no-sort no-click bread-actions">

                                                <a href="{{ route('admin.edit_facture_tva', ['id' => $facture->id]) }}"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="{{ route('admin.imprimer_facture_tva', ['id' => $facture->id]) }}"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    @endforeach

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
                                            Actions</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    @foreach ($factures as $facture)
                                        <tr>
                                            <td>{{ $facture->numero }}</td>
                                            <td>{{ $facture->created_at->format('d-M-Y') }}</td>
                                            <td>{{ $facture->prix_ttc }}</td>
                                            <td>{{ $facture->client->name }}</td>
                                            <td>{{ $facture->client->adresse }}</td>


                                            <td class="no-sort no-click bread-actions">

                                                <a href="{{ route('admin.edit_facture', ['id' => $facture->id]) }}"
                                                    title="Editer" class="btn btn-warning" target="_blank">
                                                    <i class="voyager-edit"></i> <span
                                                        class="hidden-xs hidden-sm">Editer</span>
                                                </a>
                                                <a href="{{ route('admin.imprimer_facture', ['id' => $facture->id]) }}"
                                                    title="Editer" class="btn btn-primary" target="_blank">
                                                    <i class="voyager-receipt"></i> <span
                                                        class="hidden-xs hidden-sm">Afficher</span>
                                                </a>
                                            </td>
                                        </tr>
                                    @endforeach

                                </tbody>
                            </table>
                        </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>


@stop

@section('css')
    <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap5.min.css">
@stop

@section('javascript')
    <!-- DataTables -->
    <script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
    <script>
        $(document).ready(function() {

            var table = $('#dataTable').DataTable({!! json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => [],
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('admin.dashboard.data_tables', []),
                ),
                true,
            ) !!});

            var table2 = $('#dataTable2').DataTable({!! json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => [],
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('admin.dashboard.data_tables', []),
                ),
                true,
            ) !!});
            var table3 = $('#dataTable3').DataTable({!! json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => [],
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('admin.dashboard.data_tables', []),
                ),
                true,
            ) !!});

            var table4 = $('#dataTable4').DataTable({!! json_encode(
                array_merge(
                    [
                        'order' => true,
                        'language' => [],
                        'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                    ],
                    config('admin.dashboard.data_tables', []),
                ),
                true,
            ) !!});

        });
    </script>
@stop
