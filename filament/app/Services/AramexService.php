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
     * Aramex Tunisia only accepts governorate-level city names. The shop stores
     * delegation-style values like "BIZERTE NORD (Bizerte)" which Aramex rejects.
     * Map any raw value to one of the 24 canonical governorates.
     */
    private function normalizeCity(?string $raw): string
    {
        $default = 'Sousse';
        if (! $raw) {
            return $default;
        }

        $ascii = strtoupper($this->stripAccents($raw));

        // Ordered: multi-word / more specific names first to avoid partial clashes.
        $governorates = [
            'Sidi Bouzid', 'Ben Arous', 'Ariana', 'Manouba', 'Nabeul', 'Zaghouan',
            'Bizerte', 'Jendouba', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
            'Kairouan', 'Kasserine', 'Tataouine', 'Medenine', 'Tozeur', 'Kebili',
            'Gabes', 'Gafsa', 'Sfax', 'Beja', 'Tunis', 'Kef',
        ];

        foreach ($governorates as $gov) {
            if (str_contains($ascii, strtoupper($this->stripAccents($gov)))) {
                return $gov;
            }
        }

        // Try the part inside parentheses, e.g. "... (Bizerte)".
        if (preg_match('/\(([^)]+)\)/', $raw, $m)) {
            $inner = trim($m[1]);
            if ($inner !== '' && strcasecmp($inner, $raw) !== 0) {
                return $this->normalizeCity($inner);
            }
        }

        return $default;
    }

    /**
     * Normalize a name/text field before sending to Aramex. PHP's trim() only
     * strips ASCII whitespace + NUL, so a field containing a non-breaking space
     * or other unicode whitespace/control char (common with copy-pasted form
     * input) looks "non-empty" to `=== ''` checks but reads as blank to Aramex,
     * which then rejects the shipment with "Consignee name is required" even
     * though our fallback logic thought a name was present.
     */
    private function cleanText(?string $raw): string
    {
        if (! $raw) {
            return '';
        }

        $clean = preg_replace('/[\p{Z}\p{Cc}]+/u', ' ', $raw) ?? $raw;

        return trim($clean);
    }

    private function stripAccents(string $s): string
    {
        return strtr($s, [
            'à' => 'a', 'á' => 'a', 'â' => 'a', 'ä' => 'a', 'ã' => 'a',
            'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o',
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c',
            'À' => 'A', 'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ç' => 'C',
        ]);
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

        // Aramex's COD validation requires a non-blank Company field on the
        // shipment (its API surfaces the failure as generic ERR48, worded
        // either "Consignee name is required" or the COD-combination error —
        // see createShipment() notes below). Only fill CompanyName for COD
        // shipments so non-COD labels stay free of the duplicated name/company line.
        $codAmount = (float) ($bl->net_a_payer ?? 0);

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
                'CompanyName'    => $codAmount > 0 ? ($company?->name ?? 'Proteine Tunisie') : '',
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
        $deliveryName = trim($this->cleanText($bl->livraison_nom) . ' ' . $this->cleanText($bl->livraison_prenom));
        if ($deliveryName === '') {
            $deliveryName = $this->cleanText($client?->name);
        }
        if ($deliveryName === '') {
            $deliveryName = 'Client';
        }
        $deliveryPhone = $bl->livraison_phone ?: $client?->phone_1 ?: $client?->phone_2 ?: '00000000';
        $deliveryPhone = preg_replace('/\s+/', '', $deliveryPhone);
        $deliveryCity  = $this->normalizeCity($bl->livraison_ville ?: $bl->ville ?: $client?->ville);
        // Aramex's Contact schema marks EmailAddress as mandatory alongside
        // PersonName/PhoneNumber1/CellPhone; when it's blank (common — many
        // clients only give a phone number) Aramex rejects the whole Contact
        // block with the misleading "Consignee name is required" (ERR48).
        $deliveryEmail = $bl->livraison_email ?: $bl->email ?: $client?->email ?: 'client@protein.tn';

        // Use the model's robust delivery-address accessor first (it already
        // combines livraison_*, billing and client address with fallbacks),
        // then fall back to raw fields so the label never shows "inconnue".
        $deliveryAddr = trim((string) ($bl->formatted_delivery_address ?? ''));
        if ($deliveryAddr === '') {
            $deliveryAddr = trim(
                (string) ($bl->livraison_adresse1 ?: $bl->adresse1 ?: $client?->adresse ?: '')
                . ' ' .
                (string) ($bl->livraison_adresse2 ?: $bl->adresse2 ?: '')
            );
        }
        if ($deliveryAddr === '') {
            // Last resort: at least give the city so Aramex can route it.
            $deliveryAddr = $deliveryCity;
        }

        $consignee = [
            'Reference1'    => '',
            'Reference2'    => '',
            'AccountNumber' => '',
            'PartyAddress'  => [
                'Line1'               => $deliveryAddr,
                'Line2'               => '',
                'Line3'               => '',
                'City'                => $deliveryCity,
                'StateOrProvinceCode' => '',
                'PostCode'            => $bl->livraison_code_postale ?: $bl->code_postale ?: '',
                'CountryCode'         => 'TN',
            ],
            'Contact' => [
                'Department'     => '',
                'PersonName'     => $deliveryName,
                'Title'          => '',
                'CompanyName'    => $codAmount > 0 ? $deliveryName : '',
                'PhoneNumber1'   => $deliveryPhone,
                'PhoneNumber1Ext' => '',
                'PhoneNumber2'   => $client?->phone_2 ? preg_replace('/\s+/', '', $client->phone_2) : '',
                'PhoneNumber2Ext' => '',
                'FaxNumber'      => '',
                'CellPhone'      => $deliveryPhone,
                'EmailAddress'   => $deliveryEmail,
                'Type'           => '',
            ],
        ];

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

        Log::channel('daily')->info('Aramex CreateShipments request', [
            'bl_id'     => $bl->id,
            'consignee' => $consignee,
        ]);

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
    /**
     * Every tracking event Aramex holds for a waybill, oldest first.
     *
     * ── WHY THIS REPLACED `GetLastTrackingUpdateOnly => true` ───────────────────────────────
     * It used to ask Aramex for the single most recent event and read `Value[0]`. On 21/08/2026
     * that returned `SH239 "Shipment charges paid"` for forty shipments and nothing else, which
     * was read here as "forty parcels whose latest news is a payment".
     *
     * It meant nothing of the sort. It meant the last LINE of forty histories was a payment —
     * and on a cash-on-delivery account the money is posted AFTER the courier hands the parcel
     * over, so the delivery event is the line above the one we were looking at. We were asking
     * the courier for the end of the story and then concluding the story had no middle.
     *
     * Delivery is a question about the whole history ("was this ever delivered?"), never about
     * the newest row. A parcel delivered on Tuesday whose COD was posted on Wednesday is
     * delivered, and any check that reads only the newest row says it is not.
     *
     * @return array{events:array<int, array{code:string, description:string, problem_code:?string, at:?\Illuminate\Support\Carbon, location:?string}>, error:?string}
     */
    public function trackShipmentHistory(string $hawb): array
    {
        $payload = [
            'ClientInfo' => $this->clientInfo(),
            // FALSE, deliberately and permanently. See the note above before changing it back.
            'GetLastTrackingUpdateOnly' => false,
            'Shipments'  => [$hawb],
            'Transaction' => [
                'Reference1' => '',
                'Reference2' => '',
                'Reference3' => '',
                'Reference4' => '',
                'Reference5' => '',
            ],
        ];

        try {
            $response = Http::timeout(25)
                ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
                ->post(
                    $this->baseUrl() . '/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments',
                    $payload
                );

            if (! $response->successful()) {
                return ['events' => [], 'error' => 'HTTP ' . $response->status()];
            }

            $body = $response->json();

            /*
             * `TrackingResults` is a list of {Key: waybill, Value: [updates]} pairs rather than a
             * map, and one request can carry several waybills. Only ours is wanted, but a single
             * -waybill request that returns one unkeyed result must still work, so an exact Key
             * match is preferred and a lone result is accepted as ours.
             */
            $results = $body['TrackingResults'] ?? [];
            $updates = null;

            foreach ($results as $pair) {
                if ((string) ($pair['Key'] ?? '') === $hawb) {
                    $updates = $pair['Value'] ?? [];
                    break;
                }
            }
            if ($updates === null && count($results) === 1) {
                $updates = $results[0]['Value'] ?? [];
            }

            if (empty($updates)) {
                // Not an error. A waybill created minutes ago genuinely has no events yet, and
                // Aramex also answers this way for one it has never heard of.
                return ['events' => [], 'error' => null];
            }

            $events = [];
            foreach ($updates as $u) {
                $code = strtoupper(trim((string) ($u['UpdateCode'] ?? '')));
                if ($code === '') {
                    continue;
                }
                $events[] = [
                    'code'         => $code,
                    'description'  => trim((string) ($u['UpdateDescription'] ?? '')),
                    'problem_code' => ($u['ProblemCode'] ?? null) ?: null,
                    'at'           => $this->parseAramexDate($u['UpdateDateTime'] ?? null),
                    'location'     => ($u['UpdateLocation'] ?? null) ?: null,
                ];
            }

            /*
             * Sorted here rather than trusted. Aramex does not document an ordering for this array
             * and has been observed returning newest-first; "which event is the latest" decides
             * what gets written to aramex_status, so it is answered from the timestamps. Events
             * with no parseable date sort to the front so they can never win the "latest" slot on
             * the strength of being unparseable.
             */
            usort($events, function (array $a, array $b) {
                $ta = $a['at']?->getTimestamp() ?? PHP_INT_MIN;
                $tb = $b['at']?->getTimestamp() ?? PHP_INT_MIN;

                return $ta <=> $tb;
            });

            return ['events' => $events, 'error' => null];

        } catch (\Throwable $e) {
            return ['events' => [], 'error' => $e->getMessage()];
        }
    }

    /**
     * Aramex timestamps arrive as .NET JSON dates — `/Date(1755734400000+0100)/` — and sometimes
     * as plain ISO strings depending on the endpoint. Both are accepted; anything else becomes
     * null rather than an exception, because a date this class cannot read must not be able to
     * take down a delivery sweep.
     */
    private function parseAramexDate(mixed $raw): ?\Illuminate\Support\Carbon
    {
        if (empty($raw) || ! is_string($raw)) {
            return null;
        }

        if (preg_match('#/Date\((-?\d+)([+-]\d{4})?\)/#', $raw, $m)) {
            try {
                // Milliseconds since the epoch, and intdiv rather than / so a huge value cannot
                // become a float and lose precision on the way to a timestamp.
                return \Illuminate\Support\Carbon::createFromTimestampMs((int) $m[1]);
            } catch (\Throwable) {
                return null;
            }
        }

        try {
            return \Illuminate\Support\Carbon::parse($raw);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * The most recent tracking event for a waybill.
     *
     * Kept at its original signature because the admin dashboard widget calls it, but it is now
     * derived from the full history rather than from a "last update only" request — so the code it
     * returns is the genuinely latest one by timestamp, not whichever row Aramex happened to put
     * first in the array.
     */
    public function trackShipment(string $hawb): array
    {
        $history = $this->trackShipmentHistory($hawb);

        if (! empty($history['error'])) {
            return ['update_code' => null, 'problem_code' => null, 'description' => null, 'error' => $history['error']];
        }

        $latest = ! empty($history['events']) ? $history['events'][count($history['events']) - 1] : null;

        if (! $latest) {
            return ['update_code' => null, 'problem_code' => null, 'description' => null, 'error' => null];
        }

        return [
            'update_code'  => $latest['code'],
            'problem_code' => $latest['problem_code'],
            'description'  => $latest['description'],
            'error'        => null,
        ];
    }

    /**
     * Cancel a shipment by HAWB.
     * Returns ['success', 'error'].
     *
     * @return array{success: bool, error: string|null}
     */
    public function cancelShipment(string $hawb): array
    {
        $payload = [
            'ClientInfo' => $this->clientInfo(),
            'Shipments'  => [$hawb],
            'Transaction' => [
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
                    $this->baseUrl() . '/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CancelShipments',
                    $payload
                );

            $body = $response->json();

            Log::channel('daily')->info('Aramex CancelShipments', ['hawb' => $hawb, 'response' => $body]);

            $notifications = $body['Notifications'] ?? [];
            if (! empty($notifications)) {
                $errors = collect($notifications)->pluck('Message')->filter()->implode(' | ');
                if ($errors) {
                    return ['success' => false, 'error' => $errors];
                }
            }

            $nonCancelled = $body['NonCancelledShipments'] ?? [];
            if (! empty($nonCancelled)) {
                return ['success' => false, 'error' => 'Non annulé: ' . implode(', ', $nonCancelled)];
            }

            return ['success' => true, 'error' => null];

        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Schedule a pickup from the shipper address.
     * $data keys: date (Y-m-d), ready_time (H:i), last_time (H:i), hawbs (string[]), weight (float), pieces (int)
     *
     * @return array{success: bool, guid: string|null, error: string|null}
     */
    public function schedulePickup(array $data): array
    {
        $company = Coordinate::getCached();

        $hawbs = $data['hawbs'] ?? [];
        $weight = (float) ($data['weight'] ?? max(1.0, count($hawbs) * 0.5));

        $pickupItems = array_map(fn ($hawb) => [
            'Reference1'         => $hawb,
            'Reference2'         => '',
            'Reference3'         => '',
            'Comments'           => '',
            'Weight'             => ['Unit' => 'KG', 'Value' => 0.5],
            'PackageType'        => 'Box',
            'Volume'             => ['Unit' => 'CC', 'Value' => 0.0],
            'NumberOfPieces'     => 1,
            'ShipmentDimensions' => null,
            'Barcode'            => $hawb,
        ], $hawbs);

        $payload = [
            'ClientInfo' => $this->clientInfo(),
            'Pickup' => [
                'PickupAddress' => [
                    'Line1'               => $company?->adresse ?? 'Rue Ribat',
                    'Line2'               => '',
                    'Line3'               => '',
                    'City'                => 'Sousse',
                    'StateOrProvinceCode' => '',
                    'PostCode'            => '',
                    'CountryCode'         => 'TN',
                ],
                'PickupContact' => [
                    'Department'      => '',
                    'PersonName'      => $company?->name ?? 'Proteine Tunisie',
                    'Title'           => '',
                    'CompanyName'     => $company?->name ?? 'Proteine Tunisie',
                    'PhoneNumber1'    => preg_replace('/\s+/', '', $company?->phone ?? '0000000'),
                    'PhoneNumber1Ext' => '',
                    'PhoneNumber2'    => '',
                    'PhoneNumber2Ext' => '',
                    'FaxNumber'       => '',
                    'CellPhone'       => preg_replace('/\s+/', '', $company?->phone ?? '0000000'),
                    'EmailAddress'    => $company?->email ?? 'contact@protein.tn',
                    'Type'            => '',
                ],
                'PickupLocation'     => 'Reception',
                'PickupDate'         => $this->msDate($data['date'] ?? now()->format('Y-m-d')),
                'ReadyTime'          => $data['ready_time'] ?? '09:00',
                'LastPickupTime'     => $data['last_time'] ?? '18:00',
                'ClosingTime'        => $data['last_time'] ?? '18:00',
                'Status'             => 'Ready',
                'Weight'             => ['Unit' => 'KG', 'Value' => $weight],
                'Volume'             => ['Unit' => 'CC', 'Value' => 0.0],
                'NumberOfShipments'  => count($hawbs) ?: 1,
                'NumberOfPieces'     => (int) ($data['pieces'] ?? count($hawbs) ?: 1),
                'CargoType'          => 'Parcel',
                'PickupItems'        => $pickupItems,
            ],
            'Transaction' => [
                'Reference1' => '',
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
                    $this->baseUrl() . '/ShippingAPI.V2/Pickup/Service_1_0.svc/json/SchedulePickup',
                    $payload
                );

            $body = $response->json();

            Log::channel('daily')->info('Aramex SchedulePickup', ['response' => $body]);

            $notifications = $body['Notifications'] ?? [];
            if (! empty($notifications)) {
                $errors = collect($notifications)->pluck('Message')->filter()->implode(' | ');
                if ($errors) {
                    return ['success' => false, 'guid' => null, 'error' => $errors];
                }
            }

            $guid = $body['ProcessedPickup']['ID'] ?? null;

            return ['success' => (bool) $guid, 'guid' => $guid, 'error' => null];

        } catch (\Throwable $e) {
            return ['success' => false, 'guid' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Fetch the label PDF bytes for a BL and return them for streaming.
     */
    public function fetchLabelPdf(string $labelUrl): ?string
    {
        try {
            $response = Http::timeout(15)->get($labelUrl);

            return $response->successful() ? $response->body() : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
