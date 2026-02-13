@extends('layouts.admin')

@section('page_title', __('voyager::generic.viewing') . ' ' . $dataType->getTranslatedAttribute('display_name_plural'))

@section('page_header')
    <div class="container-fluid">
        <h1 class="page-title">
            <i class="{{ $dataType->icon }}"></i> {{ $dataType->getTranslatedAttribute('display_name_plural') }}
        </h1>
        @can('add', app($dataType->model_name))
            @if ($dataType->slug == 'factures')
                <a href="{{ route('admin.facture') }}" class="btn btn-success btn-add-new">
                    <i class="voyager-plus"></i> <span>{{ __('voyager::generic.add_new') }}</span>
                </a>
            @elseif ($dataType->slug == 'tickets')
                <a href="{{ route('admin.ticket') }}" class="btn btn-success btn-add-new">
                    <i class="voyager-plus"></i> <span>{{ __('voyager::generic.add_new') }}</span>
                </a>
            @elseif ($dataType->slug == 'facture-tvas')
                <a href="{{ route('admin.facture_tva') }}" class="btn btn-success btn-add-new">
                    <i class="voyager-plus"></i> <span>{{ __('voyager::generic.add_new') }}</span>
                </a>
                @elseif ($dataType->slug == 'commandes')
                <a href="{{ route('admin.commande') }}" class="btn btn-success btn-add-new">
                    <i class="voyager-plus"></i> <span>{{ __('voyager::generic.add_new') }}</span>
                </a>
            @else
                <a href="{{ route('admin.' . $dataType->slug . '.create') }}" class="btn btn-success btn-add-new">
                    <i class="voyager-plus"></i> <span>{{ __('voyager::generic.add_new') }}</span>
                </a>
            @endif

        @endcan
        @can('delete', app($dataType->model_name))
            @include('voyager::partials.bulk-delete')
        @endcan
        @can('edit', app($dataType->model_name))
            @if (!empty($dataType->order_column) && !empty($dataType->order_display_column))
                <a href="{{ route('admin.' . $dataType->slug . '.order') }}" class="btn btn-primary btn-add-new">
                    <i class="voyager-list"></i> <span>{{ __('voyager::bread.order') }}</span>
                </a>
            @endif
        @endcan
        @can('delete', app($dataType->model_name))
            @if ($usesSoftDeletes)
                <input type="checkbox" @if ($showSoftDeleted) checked @endif id="show_soft_deletes"
                    data-toggle="toggle" data-on="{{ __('voyager::bread.soft_deletes_off') }}"
                    data-off="{{ __('voyager::bread.soft_deletes_on') }}">
            @endif
        @endcan


        @foreach ($actions as $action)
            @if (method_exists($action, 'massAction'))
                @include('voyager::bread.partials.actions', ['action' => $action, 'data' => null])
            @endif
        @endforeach


        @include('voyager::multilingual.language-selector')

        @if ($dataType->slug == 'clients')
            {{-- start modal import Excel --}}
            <a href="#" data-toggle="modal" data-target="#modal_importation">
                <button class="btn btn-warning" style="background-color: #ffc107"><i class="bi bi-pen"></i>Importer</button>
            </a>
            <div id="modal_importation"
                class="woocommerce xs-modal xs-modal-quick-view xs-quick-view-modal-detail modal fade" tabindex="-1"
                role="dialog" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content" style="min-height: 210px; min-width: 665px;">
                        <div class="modal-header" style="background-color: #ffc107; color:#fff; border-radius: 4px;">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span
                                    aria-hidden="true">×</span></button>
                            <h4 class="modal-title">
                                <i class="voyager-window-list"></i> <span></span>
                            </h4>
                        </div>
                        <div class="container" style="direction: ltr;">
                            <div class="row" style="flex-wrap: nowrap; margin-top:22px;">
                                <div class="timeline-steps aos-init aos-animate" data-aos="fade-up"
                                    style="margin-top:23px; flex-direction:row-reverse;">
                                    <div style="margin: 4%">
                                        <form action=" {{ route('admin.import', ['slug' => $dataType->slug]) }} " method="POST"
                                            enctype="multipart/form-data">
                                            @csrf
                                            <div class="form-group">
                                                <label for="file">Choisir le fichier</label>
                                                <input type="file" name="file" class="form-control">
                                            </div>
                                            <button type="submit" class="btn btn-primary">Importer</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {{--  end modal import Excel --}}
            {{--  start modal sms --}}
            <a href="#" data-toggle="modal" data-target="#modal_sms">
                <button class="btn btn-warning" style="background-color: #FD5820"><i class="bi bi-pen"></i>Envoyer SMS</button>
            </a>
            <div id="modal_sms"
                class="woocommerce xs-modal xs-modal-quick-view xs-quick-view-modal-detail modal fade" tabindex="-1"
                role="dialog" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content" style="min-height: 210px; min-width: 665px;">
                        <div class="modal-header" style="background-color: #FD5820; color:#fff; border-radius: 4px;">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span
                                    aria-hidden="true">×</span></button>
                            <h4 class="modal-title">
                                <i class="voyager-window-list"></i> <span></span>
                            </h4>
                        </div>
                        <div class="container" style="direction: ltr;">
                            <div class="row" style="flex-wrap: nowrap; margin-top:22px;">
                                <div class="timeline-steps aos-init aos-animate" data-aos="fade-up"
                                    style="margin-top:23px; flex-direction:row-reverse;">
                                    <div style="margin: 4%">
                                        <form action=" {{ route('admin.send_sms') }} " method="POST"
                                            enctype="multipart/form-data">
                                            @csrf
                                            <div class="form-group">
                                                <label for="file">Ecriver  votre SMS ici </label>
                                                {{-- <input type="text" name="sms"> --}}
                                                <textarea required name="sms" id="" cols="30" rows="10" class="form-control"></textarea>
                                            </div>
                                            <button type="submit" class="btn btn-primary">Envoyer</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {{--  end modal sms --}}
              {{--  start modal specific sms --}}
              <a href="#" data-toggle="modal" data-target="#specific_sms">
                <button class="btn btn-warning" style="background-color: #004488"><i class="bi bi-pen"></i>Envoyer SMS (clients spécifiques)</button>
            </a>
            <div id="specific_sms"
                class="woocommerce xs-modal xs-modal-quick-view xs-quick-view-modal-detail modal fade" tabindex="-1"
                role="dialog" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content" style="min-height: 210px; min-width: 665px;">
                        <div class="modal-header" style="background-color: #004488; color:#fff; border-radius: 4px;">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span
                                    aria-hidden="true">×</span></button>
                            <h4 class="modal-title">
                                <i class="voyager-window-list"></i> <span></span>
                            </h4>
                        </div>
                        <div class="container" style="direction: ltr;">
                            <div class="row" style="flex-wrap: nowrap; margin-top:22px;">
                                <div class="timeline-steps aos-init aos-animate" data-aos="fade-up"
                                    style="margin-top:23px; flex-direction:row-reverse;">
                                    <div style="margin: 4%">
                                        <form action=" {{ route('admin.specific_sms') }} " method="POST"
                                            enctype="multipart/form-data">
                                            @csrf
                                            <div class="form-group">
                                                <label for="file">Clients</label>
                                                @php
                                                    $clients = App\Models\Client::all();
                                                @endphp
                                                <select name="clients[]"  class="form-control select2" required multiple>
                                                    @foreach ($clients as $client)
                                                        <option value="{{$client->id}}">{{$client->name}} ({{$client->phone_1}} )</option>
                                                    @endforeach
                                                </select>
                                            </div>
                                            <div class="form-group">
                                                <label for="file">Ecriver  votre SMS ici </label>
                                                {{-- <input type="text" name="sms"> --}}
                                                <textarea name="sms" id="" cols="30" rows="10" required class="form-control"></textarea>
                                            </div>
                                            <button type="submit" class="btn btn-primary">Envoyer</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {{--  end modal specific sms --}}

        @endif
    </div>
@stop

@section('content')
    <div class="page-content browse container-fluid">
<div class="row">
            <div class="col-md-12">
                <div class="panel panel-bordered">
                    <div class="panel-body">
                        @if ($isServerSide)
                            <form method="get" class="form-search">
                                <div id="search-input">
                                    <div class="col-2">
                                        <select id="search_key" name="key">
                                            @foreach ($searchNames as $key => $name)
                                                <option value="{{ $key }}"
                                                    @if ($search->key == $key || (empty($search->key) && $key == $defaultSearchKey)) selected @endif>{{ $name }}
                                                </option>
                                            @endforeach
                                        </select>
                                    </div>
                                    <div class="col-2">
                                        <select id="filter" name="filter">
                                            <option value="contains" @if ($search->filter == 'contains') selected @endif>
                                                {{ __('voyager::generic.contains') }}</option>
                                            <option value="equals" @if ($search->filter == 'equals') selected @endif>=
                                            </option>
                                        </select>
                                    </div>
                                    <div class="input-group col-md-12">
                                        <input type="text" class="form-control"
                                            placeholder="{{ __('voyager::generic.search') }}" name="s"
                                            value="{{ $search->value }}">
                                        <span class="input-group-btn">
                                            <button class="btn btn-info btn-lg" type="submit">
                                                <i class="voyager-search"></i>
                                            </button>
                                        </span>
                                    </div>
                                </div>
                                @if (Request::has('sort_order') && Request::has('order_by'))
                                    <input type="hidden" name="sort_order" value="{{ Request::get('sort_order') }}">
                                    <input type="hidden" name="order_by" value="{{ Request::get('order_by') }}">
                                @endif
                            </form>
                        @endif
                        <div class="table-responsive">
                            <table id="dataTable" class="table table-hover">
                                <thead>
                                    <tr>
                                        @if ($showCheckboxColumn)
                                            <th class="dt-not-orderable">
                                                <input type="checkbox" class="select_all">
                                            </th>
                                        @endif
                                        @foreach ($dataType->browseRows as $row)
                                            <th>
                                                @if ($isServerSide && in_array($row->field, $sortableColumns))
                                                    <a href="{{ $row->sortByUrl($orderBy, $sortOrder) }}">
                                                @endif
                                                {{ $row->getTranslatedAttribute('display_name') }}
                                                @if ($isServerSide)
                                                    @if ($row->isCurrentSortField($orderBy))
                                                        @if ($sortOrder == 'asc')
                                                            <i class="voyager-angle-up pull-right"></i>
                                                        @else
                                                            <i class="voyager-angle-down pull-right"></i>
                                                        @endif
                                                    @endif
                                                    </a>
                                                @endif
                                            </th>
                                        @endforeach
                                        <th class="actions text-right dt-not-orderable">
                                            {{ __('voyager::generic.actions') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($dataTypeContent as $data)
                                        <tr>
                                            @if ($showCheckboxColumn)
                                                <td>
                                                    <input type="checkbox" name="row_id"
                                                        id="checkbox_{{ $data->getKey() }}"
                                                        value="{{ $data->getKey() }}">
                                                </td>
                                            @endif
                                            @foreach ($dataType->browseRows as $row)
                                                @php
                                                    if ($data->{$row->field . '_browse'}) {
                                                        $data->{$row->field} = $data->{$row->field . '_browse'};
                                                    }
                                                @endphp
                                                <td>
                                                    @if (isset($row->details->view_browse))
                                                        @include($row->details->view_browse, [
                                                            'row' => $row,
                                                            'dataType' => $dataType,
                                                            'dataTypeContent' => $dataTypeContent,
                                                            'content' => $data->{$row->field},
                                                            'view' => 'browse',
                                                            'options' => $row->details,
                                                        ])
                                                    @elseif (isset($row->details->view))
                                                        @include($row->details->view, [
                                                            'row' => $row,
                                                            'dataType' => $dataType,
                                                            'dataTypeContent' => $dataTypeContent,
                                                            'content' => $data->{$row->field},
                                                            'action' => 'browse',
                                                            'view' => 'browse',
                                                            'options' => $row->details,
                                                        ])
                                                    @elseif($row->type == 'image')
                                                        <img src="@if (!filter_var($data->{$row->field}, FILTER_VALIDATE_URL)) {{ Voyager::image($data->{$row->field}) }}@else{{ $data->{$row->field} }} @endif"
                                                            style="width:100px">
                                                    @elseif($row->type == 'relationship')
                                                        @include('voyager::formfields.relationship', [
                                                            'view' => 'browse',
                                                            'options' => $row->details,
                                                        ])
                                                    @elseif($row->type == 'select_multiple')
                                                        @if (property_exists($row->details, 'relationship'))
                                                            @foreach ($data->{$row->field} as $item)
                                                                {{ $item->{$row->field} }}
                                                            @endforeach
                                                        @elseif(property_exists($row->details, 'options'))
                                                            @if (!empty(json_decode($data->{$row->field})))
                                                                @foreach (json_decode($data->{$row->field}) as $item)
                                                                    @if (@$row->details->options->{$item})
                                                                        {{ $row->details->options->{$item} . (!$loop->last ? ', ' : '') }}
                                                                    @endif
                                                                @endforeach
                                                            @else
                                                                {{ __('voyager::generic.none') }}
                                                            @endif
                                                        @endif
                                                    @elseif($row->type == 'multiple_checkbox' && property_exists($row->details, 'options'))
                                                        @if (@count(json_decode($data->{$row->field}, true)) > 0)
                                                            @foreach (json_decode($data->{$row->field}) as $item)
                                                                @if (@$row->details->options->{$item})
                                                                    {{ $row->details->options->{$item} . (!$loop->last ? ', ' : '') }}
                                                                @endif
                                                            @endforeach
                                                        @else
                                                            {{ __('voyager::generic.none') }}
                                                        @endif
                                                    @elseif(($row->type == 'select_dropdown' || $row->type == 'radio_btn') && property_exists($row->details, 'options'))
                                                        {!! $row->details->options->{$data->{$row->field}} ?? '' !!}
                                                    @elseif($row->type == 'date' || $row->type == 'timestamp')
                                                        @if (property_exists($row->details, 'format') && !is_null($data->{$row->field}))
                                                            {{ \Carbon\Carbon::parse($data->{$row->field})->formatLocalized($row->details->format) }}
                                                        @else
                                                            {{ $data->{$row->field} }}
                                                        @endif
                                                    @elseif($row->type == 'checkbox')
                                                        @if (property_exists($row->details, 'on') && property_exists($row->details, 'off'))
                                                            @if ($data->{$row->field})
                                                                <span
                                                                    class="label label-info">{{ $row->details->on }}</span>
                                                            @else
                                                                <span
                                                                    class="label label-primary">{{ $row->details->off }}</span>
                                                            @endif
                                                        @else
                                                            {{ $data->{$row->field} }}
                                                        @endif
                                                    @elseif($row->type == 'color')
                                                        <span class="badge badge-lg"
                                                            style="background-color: {{ $data->{$row->field} }}">{{ $data->{$row->field} }}</span>
                                                    @elseif($row->type == 'text')
                                                        @include('voyager::multilingual.input-hidden-bread-browse')
                                                        <div>
                                                            {{ mb_strlen($data->{$row->field}) > 200 ? mb_substr($data->{$row->field}, 0, 200) . ' ...' : $data->{$row->field} }}
                                                        </div>
                                                    @elseif($row->type == 'text_area')
                                                        @include('voyager::multilingual.input-hidden-bread-browse')
                                                        <div>
                                                            {{ mb_strlen($data->{$row->field}) > 200 ? mb_substr($data->{$row->field}, 0, 200) . ' ...' : $data->{$row->field} }}
                                                        </div>
                                                    @elseif($row->type == 'file' && !empty($data->{$row->field}))
                                                        @include('voyager::multilingual.input-hidden-bread-browse')
                                                        @if (json_decode($data->{$row->field}) !== null)
                                                            @foreach (json_decode($data->{$row->field}) as $file)
                                                                <a href="{{ Storage::disk(config('admin.storage.disk'))->url($file->download_link) ?: '' }}"
                                                                    target="_blank">
                                                                    {{ $file->original_name ?: '' }}
                                                                </a>
                                                                <br />
                                                            @endforeach
                                                        @else
                                                            <a href="{{ Storage::disk(config('admin.storage.disk'))->url($data->{$row->field}) }}"
                                                                target="_blank">
                                                                {{ __('voyager::generic.download') }}
                                                            </a>
                                                        @endif
                                                    @elseif($row->type == 'rich_text_box')
                                                        @include('voyager::multilingual.input-hidden-bread-browse')
                                                        <div>
                                                            {{ mb_strlen(strip_tags($data->{$row->field}, '<b><i><u>')) > 200 ? mb_substr(strip_tags($data->{$row->field}, '<b><i><u>'), 0, 200) . ' ...' : strip_tags($data->{$row->field}, '<b><i><u>') }}
                                                        </div>
                                                    @elseif($row->type == 'coordinates')
                                                        @include('voyager::partials.coordinates-static-image')
                                                    @elseif($row->type == 'multiple_images')
                                                        @php $images = json_decode($data->{$row->field}); @endphp
                                                        @if ($images)
                                                            @php $images = array_slice($images, 0, 3); @endphp
                                                            @foreach ($images as $image)
                                                                <img src="@if (!filter_var($image, FILTER_VALIDATE_URL)) {{ Voyager::image($image) }}@else{{ $image }} @endif"
                                                                    style="width:50px">
                                                            @endforeach
                                                        @endif
                                                    @elseif($row->type == 'media_picker')
                                                        @php
                                                            if (is_array($data->{$row->field})) {
                                                                $files = $data->{$row->field};
                                                            } else {
                                                                $files = json_decode($data->{$row->field});
                                                            }
                                                        @endphp
                                                        @if ($files)
                                                            @if (property_exists($row->details, 'show_as_images') && $row->details->show_as_images)
                                                                @foreach (array_slice($files, 0, 3) as $file)
                                                                    <img src="@if (!filter_var($file, FILTER_VALIDATE_URL)) {{ Voyager::image($file) }}@else{{ $file }} @endif"
                                                                        style="width:50px">
                                                                @endforeach
                                                            @else
                                                                <ul>
                                                                    @foreach (array_slice($files, 0, 3) as $file)
                                                                        <li>{{ $file }}</li>
                                                                    @endforeach
                                                                </ul>
                                                            @endif
                                                            @if (count($files) > 3)
                                                                {{ __('voyager::media.files_more', ['count' => count($files) - 3]) }}
                                                            @endif
                                                        @elseif (is_array($files) && count($files) == 0)
                                                            {{ trans_choice('voyager::media.files', 0) }}
                                                        @elseif ($data->{$row->field} != '')
                                                            @if (property_exists($row->details, 'show_as_images') && $row->details->show_as_images)
                                                                <img src="@if (!filter_var($data->{$row->field}, FILTER_VALIDATE_URL)) {{ Voyager::image($data->{$row->field}) }}@else{{ $data->{$row->field} }} @endif"
                                                                    style="width:50px">
                                                            @else
                                                                {{ $data->{$row->field} }}
                                                            @endif
                                                        @else
                                                            {{ trans_choice('voyager::media.files', 0) }}
                                                        @endif
                                                    @else
                                                        @include('voyager::multilingual.input-hidden-bread-browse')
                                                        <span>{{ $data->{$row->field} }}</span>
                                                    @endif
                                                </td>
                                            @endforeach

                                            <td class="no-sort no-click bread-actions">
                                                @if ($dataType->slug == 'factures')
                                                    <a href="{{ route('admin.edit_facture', $data->id) }}"
                                                        title="Editer" class="btn btn-warning">
                                                        <i class="voyager-edit"></i> <span
                                                            class="hidden-xs hidden-sm">Editer</span>
                                                    </a>
                                                    <a href="{{ route('admin.imprimer_facture', $data->id) }}"
                                                        title="Editer" class="btn btn-primary">
                                                        <i class="voyager-receipt"></i> <span
                                                            class="hidden-xs hidden-sm">Imprimer</span>
                                                    </a>
                                                @elseif ($dataType->slug == 'tickets')
                                                    <a href="{{ route('admin.edit_ticket', $data->id) }}"
                                                        title="Editer" class="btn btn-warning">
                                                        <i class="voyager-edit"></i> <span
                                                            class="hidden-xs hidden-sm">Editer</span>
                                                    </a>
                                                    <a href="{{ route('admin.imprimer_ticket', $data->id) }}"
                                                        title="Editer" class="btn btn-primary">
                                                        <i class="voyager-receipt"></i> <span
                                                            class="hidden-xs hidden-sm">Imprimer</span>
                                                    </a>
                                                @elseif ($dataType->slug == 'facture-tvas')
                                                    <a href="{{ route('admin.edit_facture_tva', $data->id) }}"
                                                        title="Editer" class="btn btn-warning">
                                                        <i class="voyager-edit"></i> <span
                                                            class="hidden-xs hidden-sm">Editer</span>
                                                    </a>
                                                    <a href="{{ route('admin.imprimer_facture_tva', $data->id) }}"
                                                        title="Editer" class="btn btn-primary">
                                                        <i class="voyager-receipt"></i> <span
                                                            class="hidden-xs hidden-sm">Imprimer</span>
                                                    </a>
                                                    @elseif ($dataType->slug == 'commandes')
                                                    <a href="{{ route('admin.edit_commande', $data->id) }}"
                                                        title="Editer" class="btn btn-warning">
                                                        <i class="voyager-edit"></i> <span
                                                            class="hidden-xs hidden-sm">Editer</span>
                                                    </a>
                                                    <a href="{{ route('admin.imprimer_commande', $data->id) }}"
                                                        title="Bon Livraison" class="btn btn-primary">
                                                        <i class="voyager-receipt"></i> <span
                                                            class="hidden-xs hidden-sm">Bon Livraison</span>
                                                    </a>
                                                @else
                                                    @foreach ($actions as $action)
                                                        @if (!method_exists($action, 'massAction'))
                                                            @include('voyager::bread.partials.actions', [
                                                                'action' => $action,
                                                            ])
                                                        @endif
                                                    @endforeach
                                                @endif
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                        @if ($isServerSide)
                            <div class="pull-left">
                                <div role="status" class="show-res" aria-live="polite">
                                    {{ trans_choice('voyager::generic.showing_entries', $dataTypeContent->total(), [
                                        'from' => $dataTypeContent->firstItem(),
                                        'to' => $dataTypeContent->lastItem(),
                                        'all' => $dataTypeContent->total(),
                                    ]) }}
                                </div>
                            </div>
                            <div class="pull-right">
                                {{ $dataTypeContent->appends([
                                        's' => $search->value,
                                        'filter' => $search->filter,
                                        'key' => $search->key,
                                        'order_by' => $orderBy,
                                        'sort_order' => $sortOrder,
                                        'showSoftDeleted' => $showSoftDeleted,
                                    ])->links() }}
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Single delete modal --}}
    <div class="modal modal-danger fade" tabindex="-1" id="delete_modal" role="dialog">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal"
                        aria-label="{{ __('voyager::generic.close') }}"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title"><i class="voyager-trash"></i> {{ __('voyager::generic.delete_question') }}
                        {{ strtolower($dataType->getTranslatedAttribute('display_name_singular')) }}?</h4>
                </div>
                <div class="modal-footer">
                    <form action="#" id="delete_form" method="POST">
                        {{ method_field('DELETE') }}
                        {{ csrf_field() }}
                        <input type="submit" class="btn btn-danger pull-right delete-confirm"
                            value="{{ __('voyager::generic.delete_confirm') }}">
                    </form>
                    <button type="button" class="btn btn-default pull-right"
                        data-dismiss="modal">{{ __('voyager::generic.cancel') }}</button>
                </div>
            </div><!-- /.modal-content -->
        </div><!-- /.modal-dialog -->
    </div><!-- /.modal -->
@stop

@section('css')
    @if (!$dataType->server_side && config('dashboard.data_tables.responsive'))
        <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap5.min.css">
    @endif
@stop

@section('javascript')
    <!-- DataTables -->
    @if (!$dataType->server_side && config('dashboard.data_tables.responsive'))
        <script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
    @endif
    <script>
        $(document).ready(function() {
            @if (!$dataType->server_side)
                var table = $('#dataTable').DataTable({!! json_encode(
                    array_merge(
                        [
                            'order' => $orderColumn,
                            'language' => __('voyager::datatable'),
                            'columnDefs' => [['targets' => 'dt-not-orderable', 'searchable' => false, 'orderable' => false]],
                        ],
                        config('admin.dashboard.data_tables', []),
                    ),
                    true,
                ) !!});
            @else
                $('#search-input select').select2({
                    minimumResultsForSearch: Infinity
                });
            @endif

            @if ($isModelTranslatable)
                $('.side-body').multilingual();
                //Reinitialise the multilingual features when they change tab
                $('#dataTable').on('draw.dt', function() {
                    $('.side-body').data('multilingual').init();
                })
            @endif
            $('.select_all').on('click', function(e) {
                $('input[name="row_id"]').prop('checked', $(this).prop('checked')).trigger('change');
            });
        });


        var deleteFormAction;
        $('td').on('click', '.delete', function(e) {
            $('#delete_form')[0].action = '{{ route('admin.' . $dataType->slug . '.destroy', '__id') }}'.replace(
                '__id', $(this).data('id'));
            $('#delete_modal').modal('show');
        });

        @if ($usesSoftDeletes)
            @php
                $params = [
                    's' => $search->value,
                    'filter' => $search->filter,
                    'key' => $search->key,
                    'order_by' => $orderBy,
                    'sort_order' => $sortOrder,
                ];
            @endphp
            $(function() {
                $('#show_soft_deletes').change(function() {
                    if ($(this).prop('checked')) {
                        $('#dataTable').before(
                            '<a id="redir" href="{{ route('admin.' . $dataType->slug . '.index', array_merge($params, ['showSoftDeleted' => 1]), true) }}"></a>'
                        );
                    } else {
                        $('#dataTable').before(
                            '<a id="redir" href="{{ route('admin.' . $dataType->slug . '.index', array_merge($params, ['showSoftDeleted' => 0]), true) }}"></a>'
                        );
                    }

                    $('#redir')[0].click();
                })
            })
        @endif
        $('input[name="row_id"]').on('change', function() {
            var ids = [];
            $('input[name="row_id"]').each(function() {
                if ($(this).is(':checked')) {
                    ids.push($(this).val());
                }
            });
            $('.selected_ids').val(ids);
        });
    </script>
@stop
