<?php

namespace App\Exports;

use App\Client;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ClientsExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return Client::select(

            'name',
            'email',
            'adresse',
            'matricule',
            'phone_1',
            'phone_2',
            'created_at'
        )->get();
    }

    public function headings(): array
    {
        return [

            'Nom',
            'Email',
            'Adresse',
            'Matricule',
            'Téléphone 1',
            'Téléphone 2',
            'Date de création'
        ];
    }
}
