<?php

namespace App\Http\Controllers;
use App\Imports\ClientsImport;

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
class ImportExportController extends Controller
{
    // export excel function


 // importation Excel
    public function Import(Request $request , $slug){

        if($slug == 'clients')
            Excel::import(new ClientsImport, $request->file);


        return back();
    }

}
