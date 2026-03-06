<?php

function patchResource($filePath) {
    if (!file_exists($filePath)) {
        echo "File not found: $filePath\n";
        return;
    }
    
    $content = file_get_contents($filePath);
    
    $startToken = "    public static function form(Schema \$schema): Schema\n    {";
    $endToken = "    public static function table(Table \$table): Table\n    {";
    
    $startPos = strpos($content, $startToken);
    $endPos = strpos($content, $endToken);
    
    if ($startPos === false || $endPos === false) {
        echo "Tokens not found in: $filePath\n";
        return;
    }

    $formContent = <<<'FORM'
    public static function form(Schema $schema): Schema
    {
        $coordinate = \App\Models\Coordinate::getCached();
        
        return $schema->schema([
            \Filament\Forms\Components\Grid::make(['default' => 3])->schema([
                // Left Column (Main)
                \Filament\Forms\Components\Group::make()->schema([
                    \Filament\Forms\Components\Section::make('Informations société')
                        ->schema([
                            \Filament\Forms\Components\Placeholder::make('company_info')
                                ->hiddenLabel()
                                ->content(fn () => $coordinate ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render()) : '—'),
                        ]),
                        
                    \Filament\Forms\Components\Section::make('Client')
                        ->schema([
                            \Filament\Forms\Components\Select::make('client_id')
                                ->label('Client')
                                ->relationship('client', 'name')
                                ->getOptionLabelFromRecordUsing(fn ($record) => (string) ($record->name ?? 'Client #' . $record->id))
                                ->searchable()
                                ->preload()
                                ->placeholder('Sélectionner un client')
                                ->createOptionForm([
                                    \Filament\Forms\Components\TextInput::make('name')->required()->label('Nom'),
                                    \Filament\Forms\Components\TextInput::make('phone_1')->label('Téléphone'),
                                    \Filament\Forms\Components\TextInput::make('email')->email()->label('Email'),
                                    \Filament\Forms\Components\TextInput::make('adresse')->label('Adresse'),
                                    \Filament\Forms\Components\TextInput::make('matricule')->label('Matricule fiscal'),
                                ])
                                ->createOptionModalHeading('Nouveau Client')
                                ->required()
                                ->live()
                                ->afterStateUpdated(function ($state, $set) {
                                    if ($state) {
                                        $client = \App\Models\Client::find($state);
                                        $set('client_adresse', $client?->adresse ?? '');
                                        $set('client_phone', $client?->phone_1 ?? '');
                                        $set('client_email', $client?->email ?? '');
                                    } else {
                                        $set('client_adresse', '');
                                        $set('client_phone', '');
                                        $set('client_email', '');
                                    }
                                }),
                            \Filament\Forms\Components\TextInput::make('client_adresse')
                                ->label('Adresse')
                                ->disabled()
                                ->dehydrated(false)
                                ->columnSpanFull(),
                            \Filament\Forms\Components\TextInput::make('client_phone')
                                ->label('N° Tél')
                                ->disabled()
                                ->dehydrated(false),
                            \Filament\Forms\Components\TextInput::make('client_email')
                                ->label('Email')
                                ->disabled()
                                ->dehydrated(false),
                        ])
                        ->columns(2),

                    \Filament\Forms\Components\Section::make('Produits')
                        ->extraAttributes(['class' => 'overflow-visible', 'style' => 'overflow: visible !important;'])
                        ->schema([
                            \Filament\Forms\Components\Placeholder::make('barcode_scan')
                                ->hiddenLabel()
                                ->content(fn () => new \Illuminate\Support\HtmlString(view('filament.components.barcode-scan-compact')->render())),
                            \Filament\Forms\Components\Repeater::make('details')
                                ->hiddenLabel()
                                ->schema([
                                    \Filament\Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->searchable()
                                        ->getSearchResultsUsing(function (string $search): array {
                                            $query = \App\Models\Product::query()
                                                ->where('qte', '>', 0)
                                                ->orderBy('designation_fr');
                                            if (strlen($search) >= 1) {
                                                $query->where(function ($q) use ($search) {
                                                    $q->where('designation_fr', 'like', '%' . $search . '%')
                                                        ->orWhere('code_product', 'like', '%' . $search . '%');
                                                });
                                            }
                                            return $query->limit(30)->get()
                                                ->mapWithKeys(fn ($p) => [$p->id => ($p->designation_fr ?? '') . ' (' . (int) $p->qte . ')'])
                                                ->all();
                                        })
                                        ->getOptionLabelUsing(fn ($value): ?string => $value ? (function () use ($value) {
                                            $p = \App\Models\Product::find($value);
                                            return $p ? (($p->designation_fr ?? '') . ' (' . (int) $p->qte . ')') : null;
                                        })() : null)
                                        ->required()
                                        ->live()
                                        ->placeholder('Sélectionner un produit…')
                                        ->afterStateUpdated(function ($state, $set, $get) {
                                            if ($state && $product = \App\Models\Product::find($state)) {
                                                $set('prix_unitaire', (float) ($product->prix ?? 0));
                                            }
                                            self::updateTotals($get, $set, true);
                                        })
                                        ->columnSpan(['default' => 12]),
                                    
                                    \Filament\Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(1)
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->columnSpan(['default' => 4]),
                                        
                                    \Filament\Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('P.U')
                                        ->numeric()
                                        ->default(0)
                                        ->prefix('DT')
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->columnSpan(['default' => 4]),

                                    \Filament\Forms\Components\Placeholder::make('prix_total_display')
                                        ->label('P.T/HT')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="font-medium text-gray-700 dark:text-gray-200">' .
                                            number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, '.', '') .
                                            ' DT</span>'
                                        ))
                                        ->columnSpan(['default' => 4]),

                                    \Filament\Forms\Components\TextInput::make('tva_pct')
                                        ->label('TVA %')
                                        ->numeric()
                                        ->default($coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19)
                                        ->suffix('%')
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->columnSpan(['default' => 4]),
                                        
                                    \Filament\Forms\Components\Placeholder::make('tva_montant_display')
                                        ->label('TVA (DT)')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="inline-flex items-center px-3 py-1 rounded-md font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">' .
                                            number_format((float) $get('qte') * (float) $get('prix_unitaire') * ((float) $get('tva_pct') / 100), 3, '.', '') .
                                            ' DT</span>'
                                        ))
                                        ->columnSpan(['default' => 8]),
                                ])
                                ->columns(12)
                                ->defaultItems(1)
                                ->addActionLabel('Ajouter produit')
                                ->reorderable()
                                ->deleteAction(fn ($action) => $action
                                    ->requiresConfirmation()
                                    ->after(fn ($get, $set) => self::updateTotals($get, $set, false))
                                )
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Nouveau produit')
                                ->extraAttributes(['class' => 'overflow-visible', 'style' => 'overflow: visible !important;']),
                        ]),
                ])->columnSpan(['default' => 3, 'lg' => 2]),

                // Right Column (Sidebar)
                \Filament\Forms\Components\Group::make()->schema([
                    \Filament\Forms\Components\Section::make('Totaux')
                        ->schema([
                            \Filament\Forms\Components\TextInput::make('prix_ht')
                                ->label('Sous-total HT')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),
                                
                            \Filament\Forms\Components\TextInput::make('remise')
                                ->label('Remise')
                                ->prefix('DT')
                                ->default(0)
                                ->numeric()
                                ->live(debounce: 400)
                                ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
                                
                            \Filament\Forms\Components\TextInput::make('pourcentage_remise')
                                ->label('Remise %')
                                ->suffix('%')
                                ->default(0)
                                ->numeric()
                                ->live(debounce: 400)
                                ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
                                
                            \Filament\Forms\Components\TextInput::make('prix_ht_apres_remise')
                                ->label('HT après remise')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),
                                
                            \Filament\Forms\Components\TextInput::make('tva')
                                ->label('TVA')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),
                                
                            \Filament\Forms\Components\TextInput::make('timbre')
                                ->label('Timbre')
                                ->prefix('DT')
                                ->default(1.000)
                                ->numeric()
                                ->live(debounce: 400)
                                ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
                                
                            \Filament\Forms\Components\TextInput::make('prix_ttc')
                                ->label('Total TTC')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),

                            \Filament\Forms\Components\ViewField::make('net_a_payer_display')
                                ->hiddenLabel()
                                ->view('filament.forms.components.net-a-payer-card'),

                            \Filament\Forms\Components\TextInput::make('numero_fake')
                                ->label('N° Document')
                                ->disabled()
                                ->dehydrated(false)
                                ->formatStateUsing(fn ($record) => $record?->numero ?? 'Nouveau')
                        ])->columns(1),

                    \Filament\Forms\Components\Section::make('Résumé')
                        ->schema([
                            \Filament\Forms\Components\Placeholder::make('resume_articles')
                                ->label('Articles')
                                ->content(fn ($get) => count(array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id'])))),
                            \Filament\Forms\Components\Placeholder::make('resume_qte')
                                ->label('Quantité totale')
                                ->content(fn ($get) => array_sum(array_column(array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id'])), 'qte'))),
                            \Filament\Forms\Components\Placeholder::make('resume_date')
                                ->label('Date')
                                ->content(fn ($record) => $record?->created_at?->format('d/m/Y') ?? date('d/m/Y')),
                            \Filament\Forms\Components\Placeholder::make('resume_statut')
                                ->label('Statut')
                                ->content(fn () => 'Validée'),
                        ])->columns(1),
                ])->columnSpan(['default' => 3, 'lg' => 1]),
            ]),
            
            // Hidden fields
            \Filament\Forms\Components\Hidden::make('numero'),
            \Filament\Forms\Components\Hidden::make('prix_ht'),
            \Filament\Forms\Components\Hidden::make('pourcentage_remise'),
            \Filament\Forms\Components\Hidden::make('prix_ht_apres_remise'),
            \Filament\Forms\Components\Hidden::make('tva'),
            \Filament\Forms\Components\Hidden::make('prix_ttc'),
            \Filament\Forms\Components\Hidden::make('timbre')->default(1.000),
            \Filament\Forms\Components\Hidden::make('net_a_payer'),
        ]);
    }
FORM;

    $newContent = substr($content, 0, $startPos) . $formContent . "\n" . substr($content, $endPos);
    file_put_contents($filePath, $newContent);
    echo "Patched: $filePath\n";
}

patchResource('c:/Users/Ala/Desktop/sobitas-project/filament/app/Filament/Resources/QuotationResource.php');
patchResource('c:/Users/Ala/Desktop/sobitas-project/filament/app/Filament/Resources/FactureResource.php');

