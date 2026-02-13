<?php

declare(strict_types=1);

namespace App\Imports;

use App\Models\Client;
use Maatwebsite\Excel\Concerns\ToModel;

class ClientsImport implements ToModel
{
    /**
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        $name = trim(($row[0] ?? '') . ' ' . ($row[1] ?? ''));
        $phone = $this->reformatPhone($row[2] ?? '');

        if ($name === '' || $name === ' ') {
            $name = 'Ahmed';
        }

        if ($phone === false) {
            return null;
        }

        $exists = Client::where('phone_1', $phone)->exists();

        if ($exists) {
            return null;
        }

        return new Client([
            'name' => $name,
            'phone_1' => $phone,
        ]);
    }

    /**
     * Normalize phone number to +216XXXXXXXX format.
     */
    private function reformatPhone(string $tel): string|false
    {
        $tel = str_replace(' ', '', $tel);

        if (strlen($tel) === 12 && str_starts_with($tel, '+216')) {
            return $tel;
        }

        if (strlen($tel) === 11 && str_starts_with($tel, '216')) {
            return '+' . $tel;
        }

        if (strlen($tel) === 8) {
            return '+216' . $tel;
        }

        return false;
    }
}
