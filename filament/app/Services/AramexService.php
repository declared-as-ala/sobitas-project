<?php

namespace App\Services;

use App\Models\Coordinate;
use App\Models\Facture;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AramexService
{
    private function baseUrl(): string
    {
        return config('aramex.sandbox')
            ? config('aramex.url_sandbox')
            : config('aramex.url_production');
    }

    private function clientInfo(): array
    {
        return [
            'UserName'           => config('aramex.username'),
            'Password'           => config('aramex.password'),
            'Version'            => config('aramex.version'),
            'AccountNumber'      => config('aramex.account_number'),
            'AccountPin'         => config('aramex.account_pin'),
            'AccountEntity'      => config('aramex.account_entity'),
            'AccountCountryCode' => config('aramex.account_country'),
            'Source'             => 24,
        ];
    }

    private function msDate(?string $date = null): string
    {
        $ts = $date ? strtotime($date) : time();

        return '/Date(' . ($ts * 1000) . '-0500)/';
    }

    /**
     * Push a BL to Aramex CreateShipments.
     * Returns ['hawb', 'label_url', 'error'] — error is null on success.
     *
     * @return array{hawb: string|null, label_url: string|null, error: string|null}
     */
    public function createShipment(Facture $bl): array
    {
        $company = Coordinate::getCached();
        $client  = $bl->client;

        // ── Shipper (us) ────────────────────────────────────────────────
        $shipper = [
            'Reference1'    => '',
            'Reference2'    => '',
            'AccountNumber' => config('aramex.account_number'),
            'PartyAddress'  => [
                'Line1'               => $company?->adresse ?? 'Sousse, Tunisie',
                'Line2'               => '',
                'Line3'               => '',
                'City'                => 'Sousse',
                'StateOrProvinceCode' => '',
                'PostCode'            => '',
                'CountryCode'         => 'TN',
            ],
            'Contact' => [
                'Department'     => '',
                'PersonName'     => $company?->name ?? 'Proteine Tunisie',
                'Title'          => '',
                'CompanyName'    => $company?->name ?? 'Proteine Tunisie',
                'PhoneNumber1'   => preg_replace('/\s+/', '', $company?->phone ?? '0000000'),
                'PhoneNumber1Ext' => '',
                'PhoneNumber2'   => '',
                'PhoneNumber2Ext' => '',
                'FaxNumber'      => '',
                'CellPhone'      => preg_replace('/\s+/', '', $company?->phone ?? '0000000'),
                'EmailAddress'   => $company?->email ?? 'contact@protein.tn',
                'Type'           => '',
            ],
        ];

        // ── Consignee (client) ───────────────────────────────────────────
        $deliveryName  = trim(($bl->livraison_nom ?? '') . ' ' . ($bl->livraison_prenom ?? ''));
        if ($deliveryName === '') {
            $deliveryName = $client?->name ?? 'Client';
        }
        $deliveryPhone = $bl->livraison_phone ?? $client?->phone_1 ?? '00000000';
        $deliveryPhone = preg_replace('/\s+/', '', $deliveryPhone);
        $deliveryCity  = $bl->livraison_ville ?? $bl->ville ?? $client?->ville ?? 'Tunis';
        $deliveryAddr  = trim(
            ($bl->livraison_adresse1 ?? $bl->adresse1 ?? $client?->adresse ?? 'Adresse inconnue')
            . ' ' .
            ($bl->livraison_adresse2 ?? $bl->adresse2 ?? '')
        );

        $consignee = [
            'Reference1'    => '',
            'Reference2'    => '',
            'AccountNumber' => '',
            'PartyAddress'  => [
                'Line1'               => $deliveryAddr ?: 'Adresse inconnue',
                'Line2'               => '',
                'Line3'               => '',
                'City'                => $deliveryCity,
                'StateOrProvinceCode' => '',
                'PostCode'            => $bl->livraison_code_postale ?? $bl->code_postale ?? '',
                'CountryCode'         => 'TN',
            ],
            'Contact' => [
                'Department'     => '',
                'PersonName'     => $deliveryName,
                'Title'          => '',
                'CompanyName'    => $deliveryName,
                'PhoneNumber1'   => $deliveryPhone,
                'PhoneNumber1Ext' => '',
                'PhoneNumber2'   => $client?->phone_2 ? preg_replace('/\s+/', '', $client->phone_2) : '',
                'PhoneNumber2Ext' => '',
                'FaxNumber'      => '',
                'CellPhone'      => $deliveryPhone,
                'EmailAddress'   => $bl->livraison_email ?? $bl->email ?? $client?->email ?? '',
                'Type'           => '',
            ],
        ];

        // ── COD amount ───────────────────────────────────────────────────
        $codAmount = (float) ($bl->net_a_payer ?? 0);

        $payload = [
            'ClientInfo' => $this->clientInfo(),
            'LabelInfo'  => [
                'ReportID'   => config('aramex.label_report_id'),
                'ReportType' => config('aramex.label_report_type'),
            ],
            'Shipments' => [
                [
                    'Reference1'              => (string) ($bl->numero ?? $bl->id),
                    'Reference2'              => '',
                    'Reference3'              => '',
                    'Shipper'                 => $shipper,
                    'Consignee'               => $consignee,
                    'ShippingDateTime'        => $this->msDate(),
                    'DueDate'                 => $this->msDate(),
                    'Comments'                => 'BL ' . ($bl->numero ?? $bl->id),
                    'PickupLocation'          => 'Reception',
                    'OperationsInstructions'  => '',
                    'AccountingInstrcutions'  => '',
                    'ForeignHAWB'             => '',
                    'TransportType'           => 0,
                    'PickupGUID'              => '',
                    'Number'                  => null,
                    'Details' => [
                        'Dimensions'   => null,
                        'ActualWeight' => ['Unit' => 'KG', 'Value' => 0.5],
                        'ChargeableWeight' => null,
                        'DescriptionOfGoods'  => 'Compléments alimentaires',
                        'GoodsOriginCountry'  => 'TN',
                        'NumberOfPieces'      => 1,
                        'ProductGroup'        => config('aramex.product_group'),
                        'ProductType'         => config('aramex.product_type'),
                        'PaymentType'         => config('aramex.payment_type'),
                        'PaymentOptions'      => '',
                        'Services'            => $codAmount > 0 ? config('aramex.services') : '',
                        'CashOnDeliveryAmount' => [
                            'CurrencyCode' => 'TND',
                            'Value'        => $codAmount,
                        ],
                        'InsuranceAmount'              => null,
                        'CashAdditionalAmount'         => null,
                        'CashAdditionalAmountDescription' => '',
                        'CustomsValueAmount'           => null,
                        'CollectAmount'                => null,
                        'Items'                        => [],
                    ],
                    'Attachments'      => [],
                    'ScheduledDelivery' => null,
                ],
            ],
            'Transaction' => [
                'Reference1' => (string) ($bl->numero ?? $bl->id),
                'Reference2' => '',
                'Reference3' => '',
                'Reference4' => '',
                'Reference5' => '',
            ],
        ];

        try {
            $response = Http::timeout(30)
                ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
                ->post(
                    $this->baseUrl() . '/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreateShipments',
                    $payload
                );

            $body = $response->json();

            Log::channel('daily')->info('Aramex CreateShipments response', [
                'bl_id'    => $bl->id,
                'status'   => $response->status(),
                'response' => $body,
            ]);

            if (! $response->successful()) {
                return ['hawb' => null, 'label_url' => null, 'error' => 'HTTP ' . $response->status()];
            }

            // Check for API-level errors
            $notifications = $body['Notifications'] ?? [];
            if (! empty($notifications)) {
                $errors = collect($notifications)
                    ->pluck('Message')
                    ->filter()
                    ->implode(' | ');
                if ($errors) {
                    return ['hawb' => null, 'label_url' => null, 'error' => $errors];
                }
            }

            $processed = $body['Shipments'][0] ?? $body['ProcessedShipment'] ?? null;

            if (! $processed) {
                return ['hawb' => null, 'label_url' => null, 'error' => 'Réponse Aramex vide'];
            }

            // Check shipment-level errors
            if (! empty($processed['HasErrors'])) {
                $msgs = collect($processed['Notifications'] ?? [])
                    ->pluck('Message')
                    ->filter()
                    ->implode(' | ');

                return ['hawb' => null, 'label_url' => null, 'error' => $msgs ?: 'Erreur Aramex'];
            }

            $hawb     = (string) ($processed['ID'] ?? '');
            $labelUrl = $processed['ShipmentLabel']['LabelURL'] ?? null;

            return ['hawb' => $hawb ?: null, 'label_url' => $labelUrl, 'error' => null];

        } catch (\Throwable $e) {
            Log::channel('daily')->error('Aramex CreateShipments exception', [
                'bl_id' => $bl->id,
                'error' => $e->getMessage(),
            ]);

            return ['hawb' => null, 'label_url' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Track a shipment by HAWB number.
     * Returns ['update_code', 'problem_code', 'description', 'error'].
     *
     * @return array{update_code: string|null, problem_code: string|null, description: string|null, error: string|null}
     */
    public function trackShipment(string $hawb): array
    {
        $payload = [
            'ClientInfo'              => $this->clientInfo(),
            'GetLastTrackingUpdateOnly' => true,
            'Shipments'               => [$hawb],
            'Transaction'             => [
                'Reference1' => '',
                'Reference2' => '',
                'Reference3' => '',
                'Reference4' => '',
                'Reference5' => '',
            ],
        ];

        try {
            $response = Http::timeout(20)
                ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
                ->post(
                    $this->baseUrl() . '/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments',
                    $payload
                );

            if (! $response->successful()) {
                return ['update_code' => null, 'problem_code' => null, 'description' => null, 'error' => 'HTTP ' . $response->status()];
            }

            $body     = $response->json();
            $tracking = $body['TrackingResults'][0] ?? null;
            $updates  = $tracking['Value'][0] ?? null;

            if (! $updates) {
                return ['update_code' => null, 'problem_code' => null, 'description' => null, 'error' => null];
            }

            return [
                'update_code'  => $updates['UpdateCode'] ?? null,
                'problem_code' => $updates['ProblemCode'] ?? null,
                'description'  => $updates['UpdateDescription'] ?? null,
                'error'        => null,
            ];

        } catch (\Throwable $e) {
            return ['update_code' => null, 'problem_code' => null, 'description' => null, 'error' => $e->getMessage()];
        }
    }
}
