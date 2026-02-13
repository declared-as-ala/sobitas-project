<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ClientsExport;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ClientExportController extends Controller
{
    /**
     * Export clients to Excel.
     */
    public function export(): BinaryFileResponse
    {
        return Excel::download(new ClientsExport(), 'clients.xlsx');
    }
}
