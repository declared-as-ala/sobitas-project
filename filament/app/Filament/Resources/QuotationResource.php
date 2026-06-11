<?php

namespace App\Filament\Resources;

use App\Filament\Resources\QuotationResource\Pages;
use App\Filament\Resources\QuotationResource\RelationManagers;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\Quotation;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\Repeater;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;

class QuotationResource extends Resource
{
    protected static ?string $model = Quotation::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-clipboard-document-check';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?string $navigationLabel = 'Devis';

    protected static ?string $modelLabel = 'Devis';

    protected static ?string $pluralModelLabel = 'Devis';

    protected static ?int $navigationSort = 4;

    protected static ?string $recordTitleAttribute = 'numero';

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

    public static function updateTotals($get, $set, bool $isItem = false): void
    {
        $details = $isItem ? ($get('../../details') ?? []) : ($get('details') ?? []);
        $remise = (float) ($isItem ? ($get('../../remise') ?? 0) : ($get('remise') ?? 0));
        $timbre = (float) ($isItem ? ($get('../../timbre') ?? 0) : ($get('timbre') ?? 0));
        
        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);
        
        $prefix = $isItem ? '../../' : '';
        
        $set($prefix . 'prix_ht', $calcTotals['total_ht_brut']);
        $set($prefix . 'pourcentage_remise', $calcTotals['pourcentage_remise']);
        $set($prefix . 'prix_ht_apres_remise', $calcTotals['prix_ht_apres_remise']);
        $set($prefix . 'tva', $calcTotals['tva']);
        $set($prefix . 'prix_ttc', $calcTotals['prix_ttc']);
        $set($prefix . 'net_a_payer', $calcTotals['net_a_payer']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\ViewField::make('dv_pos_view')
                ->hiddenLabel()
                ->columnSpanFull()
                ->view('filament.pages.create-devis'),

            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('client_id'),
            Forms\Components\Hidden::make('client_adresse')->dehydrated(false),
            Forms\Components\Hidden::make('client_phone')->dehydrated(false),
            Forms\Components\Hidden::make('client_email')->dehydrated(false),
            Forms\Components\Hidden::make('details'),
            Forms\Components\Hidden::make('prix_ht'),
            Forms\Components\Hidden::make('remise')->default(0),
            Forms\Components\Hidden::make('pourcentage_remise'),
            Forms\Components\Hidden::make('prix_ht_apres_remise'),
            Forms\Components\Hidden::make('tva'),
            Forms\Components\Hidden::make('prix_ttc'),
            Forms\Components\Hidden::make('timbre')->default(1.000),
            Forms\Components\Hidden::make('net_a_payer'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // PERF: Select only needed columns + eager load client
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->select(['quotations.id', 'quotations.numero', 'quotations.client_id', 'quotations.prix_ttc', 'quotations.created_at'])
                ->with('client:id,name')
            )
            ->striped()
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Net à payer')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50])
            ->filters([
                Tables\Filters\SelectFilter::make('statut')
                    ->label('Statut')
                    ->options([
                        'brouillon' => 'Brouillon',
                        'en_attente' => 'En attente',
                        'valide' => 'Validé',
                        'refuse' => 'Refusé',
                    ])
                    ->placeholder('Tous les statuts'),
                Tables\Filters\Filter::make('date')
                    ->form([
                        Forms\Components\DatePicker::make('from')->label('Du'),
                        Forms\Components\DatePicker::make('until')->label('Au'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['from'], fn ($q) => $q->whereDate('created_at', '>=', $data['from']))
                            ->when($data['until'], fn ($q) => $q->whereDate('created_at', '<=', $data['until']));
                    }),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\ActionGroup::make([
                    Actions\Action::make('convertToTicket')
                        ->label('en Ticket')
                        ->icon('heroicon-o-ticket')
                        ->requiresConfirmation()
                        ->modalHeading('Transformer en Ticket')
                        ->modalDescription('Vérifiez les informations avant de confirmer la conversion.')
                        ->modalContent(fn (Quotation $record): View => static::buildConversionModalContent($record, 'Ticket de caisse', 'blue'))
                        ->modalSubmitActionLabel('Confirmer la conversion')
                        ->modalCancelActionLabel('Annuler')
                        ->action(function (Quotation $record) {
                            $ticket = app(\App\Services\DocumentConversion\QuotationConversionService::class)->convertToTicket($record);
                            \Filament\Notifications\Notification::make()
                                ->title('Conversion réussie — ouverture de l’impression pour le Ticket #' . $ticket->numero)
                                ->success()
                                ->send();
                            return redirect(route('tickets.print', ['ticket' => $ticket->id]));
                        }),
                    Actions\Action::make('convertToFactureTva')
                        ->label('en Facture TVA')
                        ->icon('heroicon-o-document-duplicate')
                        ->requiresConfirmation()
                        ->modalHeading('Transformer en Facture TVA')
                        ->modalDescription('Vérifiez les informations avant de confirmer la conversion.')
                        ->modalContent(fn (Quotation $record): View => static::buildConversionModalContent($record, 'Facture TVA', 'emerald'))
                        ->modalSubmitActionLabel('Confirmer la conversion')
                        ->modalCancelActionLabel('Annuler')
                        ->action(function (Quotation $record) {
                            $invoice = app(\App\Services\DocumentConversion\QuotationConversionService::class)->convertToFactureTva($record);
                            \Filament\Notifications\Notification::make()
                                ->title('Conversion réussie — ouverture de l’impression pour la Facture TVA #' . $invoice->numero)
                                ->success()
                                ->send();
                            return redirect(route('facture-tvas.print', ['factureTva' => $invoice->id]));
                        }),
                    Actions\Action::make('convertToBl')
                        ->label('en Bon de livraison')
                        ->icon('heroicon-o-document-text')
                        ->requiresConfirmation()
                        ->modalHeading('Transformer en Bon de Livraison')
                        ->modalDescription('Vérifiez les informations avant de confirmer la conversion.')
                        ->modalContent(fn (Quotation $record): View => static::buildConversionModalContent($record, 'Bon de Livraison', 'amber'))
                        ->modalSubmitActionLabel('Confirmer la conversion')
                        ->modalCancelActionLabel('Annuler')
                        ->action(function (Quotation $record) {
                            $bl = app(\App\Services\DocumentConversion\QuotationConversionService::class)->convertToBl($record);
                            \Filament\Notifications\Notification::make()
                                ->title('Conversion réussie — ouverture de l’impression pour le BL #' . $bl->numero)
                                ->success()
                                ->send();
                            return redirect(route('factures.print', ['facture' => $bl->id]));
                        }),
                ])
                    ->label('Transformer')
                    ->icon('heroicon-o-arrow-path')
                    ->color('success')
                    ->dropdownPlacement('bottom-start'),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (Quotation $record) => route('quotations.print', ['quotation' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function buildConversionModalContent(Quotation $record, string $targetLabel, string $targetColor): View
    {
        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        $details = $record->details->map(fn ($d) => [
            'qte' => $d->qte ?? $d->quantite ?? 1,
            'prix_unitaire' => $d->prix_unitaire ?? 0,
            'tva_pct' => $d->tva ?? $defaultTva,
        ])->toArray();

        $calc = \App\Services\InvoiceCalculator::calculate(
            $details,
            (float) ($record->remise ?? 0),
            (float) ($record->timbre ?? 0),
            $defaultTva
        );

        $fmt = fn ($v) => number_format((float) $v, 3, ',', ' ') . ' DT';

        return view('filament.components.convert-wizard-summary', [
            'sourceType'   => 'Devis',
            'sourceNumber' => $record->numero,
            'client'       => $record->client?->name ?? '—',
            'date'         => $record->created_at?->format('d/m/Y') ?? '—',
            'itemsCount'   => $record->details->count(),
            'totalHt'      => $fmt($calc['total_ht_brut']),
            'remise'       => $calc['remise'] > 0 ? $fmt($calc['remise']) : 0,
            'tva'          => $targetColor === 'emerald' ? $fmt($calc['tva']) : null,
            'totalTtc'     => $fmt($calc['net_a_payer']),
            'targetLabel'  => $targetLabel,
            'targetColor'  => $targetColor,
        ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListQuotations::route('/'),
            'create' => Pages\CreateQuotation::route('/create'),
            'edit'   => Pages\EditQuotation::route('/{record}/edit'),
        ];
    }
}
