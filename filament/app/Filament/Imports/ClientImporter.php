<?php

namespace App\Filament\Imports;

use App\Models\Client;
use Filament\Actions\Imports\ImportColumn;
use Filament\Actions\Imports\Importer;
use Filament\Actions\Imports\Models\Import;

class ClientImporter extends Importer
{
    protected static ?string $model = Client::class;

    public static function getColumns(): array
    {
        return [
            ImportColumn::make('prenom')
                ->label('Prénom')
                ->requiredMapping()
                ->rules(['nullable', 'string', 'max:255']),

            ImportColumn::make('nom')
                ->label('Nom')
                ->requiredMapping()
                ->rules(['nullable', 'string', 'max:255']),

            ImportColumn::make('phone_1')
                ->label('Téléphone')
                ->requiredMapping()
                ->rules(['required', 'string']),
        ];
    }

    /**
     * Replicates the backend ClientsImport logic:
     * - Concatenates Prénom + Nom into Client::name
     * - Normalises Tunisian phone numbers (+216 / 216 / 8-digit)
     * - Skips rows with invalid phones or duplicate phone_1
     */
    public function resolveRecord(): ?Client
    {
        $prenom = trim((string) ($this->data['prenom'] ?? ''));
        $nom    = trim((string) ($this->data['nom']    ?? ''));
        $name   = trim($prenom . ' ' . $nom);

        if ($name === '') {
            $name = 'Ahmed';
        }

        $phone = $this->reformPhone((string) ($this->data['phone_1'] ?? ''));

        if ($phone === false) {
            return null; // invalid format — skip row
        }

        if (Client::where('phone_1', $phone)->exists()) {
            return null; // duplicate — skip row
        }

        return new Client([
            'name'    => $name,
            'phone_1' => $phone,
        ]);
    }

    /**
     * Normalise a Tunisian phone number to +216XXXXXXXX format.
     * Returns false if the number cannot be recognised.
     */
    private function reformPhone(string $tel): string|false
    {
        $tel = str_replace(' ', '', $tel);

        if (strlen($tel) === 12 && str_starts_with($tel, '+216')) {
            return $tel;
        }

        if (strlen($tel) === 11 && str_starts_with($tel, '216')) {
            return '+' . $tel;
        }

        if (strlen($tel) === 8 && ctype_digit($tel)) {
            return '+216' . $tel;
        }

        return false;
    }

    public static function getCompletedNotificationBody(Import $import): string
    {
        $body = 'Import clients terminé : ' . number_format($import->successful_rows) . ' client(s) importé(s).';

        if ($failedRowsCount = $import->getFailedRowsCount()) {
            $body .= ' ' . number_format($failedRowsCount) . ' ligne(s) ignorée(s) (doublon ou format invalide).';
        }

        return $body;
    }
}
