<?php

namespace App\Filament\Resources\LoyaltyCardResource\Pages;

use App\Filament\Resources\LoyaltyCardResource;
use App\Models\LoyaltyCard;
use Filament\Resources\Pages\EditRecord;

class EditLoyaltyCard extends EditRecord
{
    protected static string $resource = LoyaltyCardResource::class;

    protected function mutateFormDataBeforeSave(array $data): array
    {
        $allowed = LoyaltyCard::allowedStatusValuesForWrite();

        // If we cannot detect enum values on this deployment, avoid writing status
        // to prevent SQL truncation on unknown legacy enums.
        if ($allowed === []) {
            unset($data['status']);

            return $data;
        }

        $status = isset($data['status']) ? trim((string) $data['status']) : '';
        if ($status === '' || ! in_array($status, $allowed, true)) {
            $data['status'] = LoyaltyCard::preferredAvailableStatusValue();
        }

        return $data;
    }
}
