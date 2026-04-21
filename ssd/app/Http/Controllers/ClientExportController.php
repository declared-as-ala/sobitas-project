<?php

namespace App\Http\Controllers;

use App\Exports\ClientsExport;
use Maatwebsite\Excel\Facades\Excel;

class ClientExportController extends Controller
{
    public function export()
    {
        return Excel::download(new ClientsExport, 'clients.xlsx');
    }
}
