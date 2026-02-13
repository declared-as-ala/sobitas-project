<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Imports\ClientsImport;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ImportExportController extends Controller
{
    /**
     * Import data from Excel file based on slug.
     */
    public function Import(Request $request, string $slug)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        if ($slug === 'clients') {
            Excel::import(new ClientsImport(), $request->file('file'));
        }

        return back()->with([
            'message' => 'Import terminé avec succès',
            'alert-type' => 'success',
        ]);
    }
}
