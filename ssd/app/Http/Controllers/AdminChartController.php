<?php

namespace App\Http\Controllers;

use Exception;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use TCG\Voyager\Database\Schema\SchemaManager;
use TCG\Voyager\Events\BreadDataAdded;
use TCG\Voyager\Events\BreadDataDeleted;
use TCG\Voyager\Events\BreadDataRestored;
use TCG\Voyager\Events\BreadDataUpdated;
use TCG\Voyager\Events\BreadImagesDeleted;
use TCG\Voyager\Facades\Voyager;
use TCG\Voyager\Http\Controllers\Traits\BreadRelationshipParser;
use App\Services\SmsService;
use App\Message;
use LaravelDaily\LaravelCharts\Classes\LaravelChart;


class AdminChartController extends Controller
{

        public function statistic(){
            $chart_options = [
            'chart_title' => 'Users by months',
            'report_type' => 'group_by_date',
            'model' => 'App\Models\User',
            'group_by_field' => 'created_at',
            'group_by_period' => 'month',
            'chart_type' => 'bar',
            ];
            $chart1 = new LaravelChart($chart_options);
            $chart_options = null;
            $chart1 = null;
            return view('admin.index', compact('chart1'));
    }
    public function chart(Request $request){
            $tab = explode("\\", $request->dropdown1);
            $chart_options = [
            'chart_title' => $tab[sizeof($tab)-1].' par mois',
            'report_type' => 'group_by_date',
            'model' => $request->dropdown1,
            'group_by_field' => 'created_at',
            'filter_field'=>'created_at',
            'range_date_start' => $request->date1,
            'range_date_end' => $request->date2,
            'group_by_period' => 'month',
            'chart_type' => $request->chart
            ];
            $chart1 = new LaravelChart($chart_options);
            return view('admin.index', compact('chart1'));
    }

}
