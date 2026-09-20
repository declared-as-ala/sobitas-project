<?php

namespace App\Filament\Resources;

use App\Enums\AffilieStatus;
use App\Enums\AffilieType;
use App\Filament\Resources\AffilieResource\Pages;
use App\Filament\Resources\AffilieResource\RelationManagers\AffilieCodesRelationManager;
use App\Filament\Resources\AffilieResource\RelationManagers\AffilieTransactionsRelationManager;
use App\Models\Affilie;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\AffilieKycService;
use App\Services\AffilieTransactionService;
use Filament\Actions;
use Filament\Forms;
use Filament\Infolists\Components\TextEntry;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema as DbSchema;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;

/**
 * ── THE APPLICATION QUEUE HAD NO EXIT ────────────────────────────────────────────────────────
 * `AffilieStatus` has always defined `pending` and `rejected`, and `affilies.status` defaults to
 * `pending` — but this resource's status Select offered only Active and Suspended, and the only
 * row actions were suspend and activate. There was therefore NO WAY, anywhere in the admin panel,
 * to approve or refuse an application. Anything that reached `pending` stayed there forever.
 *
 * That was survivable only for as long as the public form was posting into a 404 and nothing ever
 * reached `pending` at all. Routing `/affilie-applications` turns a dormant gap into a queue that
 * fills up, so Approve and Reject land in the same change.
 *
 * ── WHAT APPROVING ACTUALLY HAS TO DO ────────────────────────────────────────────────────────
 * Setting `status = active` is not enough to give an affiliate their panel. `User::canAccessPanel`
 * requires BOTH an Active affiliate AND the linked user's `role_id` to equal
 * `Affilie::availableCommissionRoleId()`. Approve therefore also finds-or-creates that user and
 * sets the role — with one refusal built in: it will not touch a user whose role is in
 * `config('affilies.admin_role_ids')`, because approving an application submitted with a staff
 * member's address would silently DEMOTE that admin out of the back office.
 */
class AffilieResource extends Resource
{
    protected static ?string $model = Affilie::class;

    protected static ?AffilieType $restrictedType = null;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-user-group';

    protected static string | \UnitEnum | null $navigationGroup = 'Affiliés';

    protected static ?string $navigationLabel = 'Affiliés';

    protected static ?string $modelLabel = 'Affilié';

    protected static ?string $pluralModelLabel = 'Affiliés';

    protected static ?int $navigationSort = 1;

    public static function getEloquentQuery(): Builder
    {
        $q = parent::getEloquentQuery();

        if (static::$restrictedType !== null) {
            $q->where('type', static::$restrictedType);
        }

        return $q;
    }

    /** Pending applications, on the navigation item. A review queue nobody can see is a queue nobody empties. */
    public static function getNavigationBadge(): ?string
    {
        $pending = static::getEloquentQuery()->where('status', AffilieStatus::Pending->value)->count();

        return $pending > 0 ? (string) $pending : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Profil')
                ->schema([
                    ...(static::$restrictedType !== null
                        ? [
                            Forms\Components\Hidden::make('type')
                                ->default(static::$restrictedType->value),
                        ]
                        : [
                            Forms\Components\Select::make('type')
                                ->label('Type')
                                ->options(AffilieType::options())
                                ->default(AffilieType::Coach->value)
                                ->required(),
                        ]),
                    Forms\Components\TextInput::make('name')
                        ->label('Nom')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('email')
                        ->label('Email')
                        ->email()
                        ->nullable()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('phone')
                        ->label('Téléphone')
                        ->tel()
                        ->maxLength(64),
                    /*
                     * All four states, not two.
                     *
                     * Offering only Active/Suspended did not merely hide `pending` and `rejected` —
                     * it silently REWROTE them: opening a pending application and pressing save
                     * submitted the Select's default, flipping the row to Active. An admin could
                     * approve by accident and could not approve on purpose.
                     */
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options(AffilieStatus::options())
                        ->default(AffilieStatus::Active->value)
                        ->required()
                        ->helperText('Utilisez les actions « Approuver » / « Refuser » sur la liste : elles gèrent aussi le rôle, l’accès à l’espace affilié et la traçabilité.'),
                    /*
                     * ── THIS NUMBER IS A MARKUP, NOT A CUT OF THE ORDER ──────────────────────────
                     * The affilié is a reseller: the shop is owed `products.prix_affilie` and the
                     * affilié keeps everything they charge above it, so there is no order total left
                     * to take a percentage of. What this number now does is supply the DEFAULT MARKUP
                     * used to suggest a selling price for every product at once
                     * (Affilie::suggestedSellingPrice) — one setting, instead of pricing ~11 000
                     * products by hand. Any single line can still be overridden when selling.
                     *
                     * There is deliberately ONE input for it. The column is `commission_rate`:
                     * migration 2026_05_08_160000 renamed `default_commission_rate` into it, and the
                     * old name survives only as a fallback inside Affilie::effectiveCommissionRate()
                     * for a database restored from before that rename. A field labelled « marge »
                     * sitting next to a field labelled « commission » is how the wrong one gets used.
                     */
                    Forms\Components\TextInput::make('commission_rate')
                        ->label('Marge par défaut (%)')
                        ->numeric()
                        ->minValue(0)
                        ->default(10)
                        ->required()
                        ->helperText('Appliquée au-dessus du prix affilié du produit pour proposer un prix de vente. L’affilié garde la différence entre son prix de vente et le prix affilié.'),
                    /*
                     * ── LE SOUS-DOMAINE DÉDIÉ : ali.protein.tn ────────────────────────────────
                     *
                     * Owner: "for each affiliate something like x.protein.tn … he sends it, and we
                     * detect that this website is opened from an affiliate subdomain." Everything
                     * on that hostname is the normal storefront; the frontend middleware resolves
                     * this label against /api/affilie-subdomains and stamps an attribution cookie
                     * that reaches `commandes.affilie_id` when an order is placed.
                     *
                     * ── WHY THIS FIELD IS FUSSIER THAN IT LOOKS ──────────────────────────────
                     * The value becomes a HOSTNAME. A space, an accent, an underscore or a capital
                     * does not produce a warning — it produces a link that does not resolve, on a
                     * poster somebody has already printed. So the input normalises on blur (a
                     * pasted `https://Coach-Ali.protein.tn/` collapses to `coach-ali`), refuses
                     * anything outside the label grammar, refuses the infrastructure names in
                     * Affilie::RESERVED_SUBDOMAINS — mirrored in frontend/src/util/affiliateHost.ts,
                     * and an admin who could save `admin` or `www` here would be aiming a coach's
                     * traffic at the Laravel origin — and stores NULL rather than '' when cleared,
                     * because the unique index treats NULLs as distinct and empty strings as a
                     * value that two affiliates would collide on.
                     *
                     * Normalisation is also applied at dehydration, not only on blur, so a save
                     * that never fires a blur event still stores the canonical form.
                     */
                    Forms\Components\TextInput::make('subdomain')
                        ->label('Sous-domaine dédié')
                        ->placeholder('ali')
                        ->prefix('https://')
                        ->suffix('.protein.tn')
                        ->maxLength(32)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn ($set, ?string $state) => $set('subdomain', \App\Models\Affilie::normalizeSubdomain($state)))
                        ->dehydrateStateUsing(fn (?string $state) => \App\Models\Affilie::normalizeSubdomain($state))
                        ->unique(ignoreRecord: true)
                        ->rules([
                            /*
                             * `nullable` FIRST, and it is not decoration. Laravel skips every
                             * non-implicit rule for a null value only when it is present; without
                             * it, `regex` runs against the empty state of an affiliate who has no
                             * subdomain, fails, and the field becomes de-facto REQUIRED — which
                             * would block saving every affiliate in the shop, not just new ones.
                             * The blur handler above normalises an emptied field back to null, so
                             * "cleared by hand" reaches validation as null too.
                             */
                            'nullable',
                            'regex:'.\App\Models\Affilie::SUBDOMAIN_PATTERN,
                            \Illuminate\Validation\Rule::notIn(\App\Models\Affilie::RESERVED_SUBDOMAINS),
                        ])
                        ->validationMessages([
                            'regex' => 'Uniquement des minuscules, chiffres et tirets (1 à 32 caractères), sans tiret au début ni à la fin.',
                            'not_in' => 'Ce sous-domaine est réservé à l’infrastructure du site.',
                            'unique' => 'Ce sous-domaine est déjà attribué à un autre affilié.',
                        ])
                        ->helperText('Laisser vide si l’affilié n’en a pas. Toute visite ouverte sur ce sous-domaine lui est attribuée pendant 30 jours.'),
                    Forms\Components\Textarea::make('notes')
                        ->label('Notes')
                        ->columnSpanFull()
                        ->rows(2),
                ])->columns(2),

            /*
             * The candidature, as the applicant wrote it. Read-only on purpose: these fields are
             * the evidence a reviewer decides on, and an editable copy of someone's own words is a
             * copy that can be corrected into something they never said.
             */
            Section::make('Candidature')
                ->collapsed()
                ->visible(fn (?Affilie $record): bool => $record?->getAttribute('applied_at') !== null)
                ->schema([
                    TextEntry::make('reference_display')
                        ->label('Référence')
                        ->state(fn (?Affilie $record): string => (string) ($record?->getAttribute('reference') ?? '—')),
                    TextEntry::make('applied_at_display')
                        ->label('Déposée le')
                        ->state(fn (?Affilie $record): string => optional($record?->getAttribute('applied_at'))->format('d/m/Y H:i') ?? '—'),
                    TextEntry::make('city_display')
                        ->label('Ville')
                        ->state(fn (?Affilie $record): string => (string) ($record?->getAttribute('city') ?: '—')),
                    TextEntry::make('audience_size_display')
                        ->label('Audience déclarée')
                        ->state(fn (?Affilie $record): string => (string) ($record?->getAttribute('audience_size') ?: '—')),
                    TextEntry::make('referred_by_code_display')
                        ->label('Parrainé par le code')
                        ->state(fn (?Affilie $record): string => (string) ($record?->getAttribute('referred_by_code') ?: '—')),
                    TextEntry::make('application_message_display')
                        ->label('Message')
                        ->columnSpanFull()
                        ->state(fn (?Affilie $record): string => (string) ($record?->getAttribute('application_message') ?: '—')),
                    TextEntry::make('application_reject_reason_display')
                        ->label('Motif du refus')
                        ->columnSpanFull()
                        ->visible(fn (?Affilie $record): bool => filled($record?->getAttribute('application_reject_reason')))
                        ->state(fn (?Affilie $record): string => (string) $record?->getAttribute('application_reject_reason')),
                ])->columns(2),

            /*
             * KYC. The two document rows render a SHORT-LIVED SIGNED LINK, never a Storage::url():
             * the `affilie-kyc` disk is private by design and a permanent URL to a national identity
             * card is the exact failure config/filesystems.php's docblock exists to prevent.
             */
            Section::make('Pièce d’identité (KYC)')
                ->collapsed()
                ->schema([
                    TextEntry::make('kyc_status_display')
                        ->label('Statut KYC')
                        ->state(fn (?Affilie $record): string => static::kycLabel((string) ($record?->getAttribute('kyc_status') ?? Affilie::KYC_PENDING))),
                    Forms\Components\TextInput::make('kyc_cin')
                        ->label('Numéro de CIN')
                        // Read-only AND non-dehydrating. `kyc_cin` is deliberately absent from
                        // Affilie::$fillable (see its docblock) — leaving it dehydrated would push
                        // it into the save payload where mass assignment silently drops it, which
                        // reads to an admin as "the field does not save".
                        ->disabled()
                        ->dehydrated(false),
                    TextEntry::make('kyc_id_front_display')
                        ->label('CIN — recto')
                        ->html()
                        ->state(fn (?Affilie $record): HtmlString => static::documentLink($record, 'front')),
                    TextEntry::make('kyc_id_back_display')
                        ->label('CIN — verso')
                        ->html()
                        ->state(fn (?Affilie $record): HtmlString => static::documentLink($record, 'back')),
                    TextEntry::make('kyc_reject_reason_display')
                        ->label('Motif du refus KYC')
                        ->columnSpanFull()
                        ->visible(fn (?Affilie $record): bool => filled($record?->getAttribute('kyc_reject_reason')))
                        ->state(fn (?Affilie $record): string => (string) $record?->getAttribute('kyc_reject_reason')),
                    TextEntry::make('phone_verified_display')
                        ->label('Téléphone vérifié')
                        ->state(fn (?Affilie $record): string => optional($record?->getAttribute('phone_verified_at'))->format('d/m/Y H:i') ?? 'Non'),
                    TextEntry::make('email_verified_display')
                        ->label('E-mail vérifié')
                        ->state(fn (?Affilie $record): string => optional($record?->getAttribute('email_verified_at'))->format('d/m/Y H:i') ?? 'Non'),
                ])->columns(2),

            Section::make('Coordonnées avancées')
                ->collapsed()
                ->schema([
                    Forms\Components\TextInput::make('business_name')
                        ->label('Raison sociale')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('city')
                        ->label('Ville')
                        ->maxLength(120),
                    Forms\Components\Textarea::make('address')
                        ->label('Adresse')
                        ->rows(2)
                        ->columnSpanFull(),
                    /*
                     * Was a free TextInput. On a money field that means "cash", "Espèces" and
                     * "espece au magasin" all end up in the column and the monthly run cannot group
                     * by method — whoever prepares the payments has to read every row and guess.
                     */
                    Forms\Components\Select::make('payment_method')
                        ->label('Méthode de paiement')
                        ->options(\App\Enums\AffiliePayoutMethod::options())
                        ->native(false)
                        ->helperText('Paiements le 1er de chaque mois : retrait en espèces au magasin ou livraison Aramex à l’adresse de l’affilié. Par défaut : livraison Aramex.'),
                    Forms\Components\Placeholder::make('payment_method_requested_display')
                        ->label('Changement demandé par l’affilié')
                        ->visible(fn (?Affilie $record): bool => (bool) $record && filled($record->payment_method_requested))
                        ->content(fn (?Affilie $record): string => $record && filled($record->payment_method_requested)
                            ? (\App\Enums\AffiliePayoutMethod::tryFrom((string) $record->payment_method_requested)?->label() ?? (string) $record->payment_method_requested)
                                .($record->payment_method_requested_at ? ' — demandé le '.$record->payment_method_requested_at->format('d/m/Y H:i') : '')
                                .' · à approuver/refuser via le menu « Plus » de la liste.'
                            : 'Aucune demande en attente.'),
                    Forms\Components\Textarea::make('payout_notes')
                        ->label('Notes paiement')
                        ->columnSpanFull(),
                    Forms\Components\Textarea::make('admin_notes')
                        ->label('Notes admin (legacy)')
                        ->columnSpanFull(),
                ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nom')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('reference')
                    ->label('Réf.')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(function (mixed $state): string {
                        if ($state instanceof AffilieType) {
                            return $state->label();
                        }

                        return AffilieType::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('phone')->label('Téléphone')->searchable(),
                // Rendered as the full hostname because that is the string somebody will be asked
                // to read out or check against a poster; the column stores only the label.
                Tables\Columns\TextColumn::make('subdomain')
                    ->label('Sous-domaine')
                    ->formatStateUsing(fn (?string $state): string => filled($state) ? $state.'.protein.tn' : '—')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->copyable()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->color(function (mixed $state): string {
                        $status = $state instanceof AffilieStatus
                            ? $state
                            : AffilieStatus::tryFrom((string) $state);

                        return $status?->color() ?? 'gray';
                    })
                    ->formatStateUsing(function (mixed $state): string {
                        if ($state instanceof AffilieStatus) {
                            return $state->label();
                        }

                        return AffilieStatus::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('payment_method_requested')
                    ->label('Demande paiement')
                    ->badge()
                    ->color('warning')
                    ->icon('heroicon-o-clock')
                    ->formatStateUsing(fn (?string $state): string => \App\Enums\AffiliePayoutMethod::tryFrom((string) $state)?->label() ?? (string) $state)
                    ->placeholder('—')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('kyc_status')
                    ->label('KYC')
                    ->badge()
                    ->color(fn (mixed $state): string => match ((string) $state) {
                        Affilie::KYC_APPROVED => 'success',
                        Affilie::KYC_SUBMITTED => 'warning',
                        Affilie::KYC_REJECTED => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (mixed $state): string => static::kycLabel((string) $state)),
                Tables\Columns\TextColumn::make('applied_at')
                    ->label('Candidature')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('commission_rate')->label('Marge %')->alignEnd(),
                Tables\Columns\TextColumn::make('current_balance')->label('Solde')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('total_earned')->label('Total gagné')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('total_paid')->label('Total payé')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('user.email')->label('Compte')->placeholder('—'),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options(AffilieStatus::options()),
                Tables\Filters\SelectFilter::make('kyc_status')
                    ->label('KYC')
                    ->options([
                        Affilie::KYC_PENDING => 'À fournir',
                        Affilie::KYC_SUBMITTED => 'À vérifier',
                        Affilie::KYC_APPROVED => 'Validée',
                        Affilie::KYC_REJECTED => 'Refusée',
                    ]),
                Tables\Filters\SelectFilter::make('type')
                    ->label('Type')
                    ->options(AffilieType::options())
                    ->visible(static::$restrictedType === null),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                /*
                 * ── APPROVE ──────────────────────────────────────────────────────────────────
                 * The action that did not exist. It is the only place in the system that grants an
                 * affiliate anything, so everything it grants is explicit and confirmed.
                 */
                Actions\Action::make('approve')
                    ->label('Approuver')
                    ->icon('heroicon-o-check-badge')
                    ->color('success')
                    ->visible(fn (Affilie $record): bool => in_array($record->status, [AffilieStatus::Pending, AffilieStatus::Rejected], true))
                    ->requiresConfirmation()
                    ->modalHeading('Approuver cette candidature')
                    ->modalDescription('L’affilié devient actif, reçoit la marge par défaut choisie et obtient l’accès à son espace.')
                    ->form([
                        Forms\Components\TextInput::make('commission_rate')
                            ->label('Marge par défaut accordée (%)')
                            ->numeric()
                            ->minValue(0)
                            // No upper bound any more. A cap of 100 was right while this
                            // meant "percent of the order" — nobody may take more than the
                            // order is worth. As a MARKUP over `prix_affilie` it is simply a
                            // multiplier, and a coach reselling at three times the affiliate
                            // price (200 %) is an ordinary, legal arrangement. Leaving the
                            // cap would have refused it as an input error.
                            ->required()
                            ->default(fn (Affilie $record): float => ((float) ($record->getAttributes()['commission_rate'] ?? 0)) ?: 10.0)
                            // A public application is stored at 0 % precisely so this field cannot
                            // be skipped into a rate nobody agreed. See AffilieApplicationController.
                            // At 0 % the suggested selling price equals `prix_affilie` exactly, so the
                            // affilié would earn nothing on every line until someone corrects it.
                            ->helperText('Marge appliquée au-dessus du prix affilié pour proposer un prix de vente. Une candidature publique arrive à 0 % : la marge doit être décidée ici.'),
                        Forms\Components\Toggle::make('send_invitation')
                            ->label('Envoyer l’invitation par e-mail')
                            ->default(true)
                            ->helperText('Lien de création de mot de passe vers l’espace affilié.'),
                    ])
                    ->action(function (Affilie $record, array $data): void {
                        static::approve($record, (float) $data['commission_rate'], (bool) ($data['send_invitation'] ?? false));
                    }),

                /*
                 * ── REJECT ───────────────────────────────────────────────────────────────────
                 * The reason is REQUIRED. A refusal with no recorded reason is one that cannot be
                 * explained to the applicant who telephones about it, and cannot be reviewed later
                 * for a pattern nobody intended.
                 *
                 * No role change is needed to revoke access: canAccessPanel refuses on status
                 * alone, so `rejected` closes the panel whatever the linked user's role is.
                 */
                Actions\Action::make('reject')
                    ->label('Refuser')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Pending)
                    ->requiresConfirmation()
                    ->modalHeading('Refuser cette candidature')
                    ->form([
                        Forms\Components\Textarea::make('reason')
                            ->label('Motif du refus')
                            ->required()
                            ->maxLength(1000)
                            ->rows(3)
                            ->helperText('Écrit pour être lu par le candidat si nous lui répondons.'),
                    ])
                    ->action(function (Affilie $record, array $data): void {
                        $before = static::snapshot($record);

                        $record->forceFill([
                            'status' => AffilieStatus::Rejected->value,
                            'application_reject_reason' => trim((string) $data['reason']),
                            'reviewed_at' => now(),
                            'reviewed_by' => Auth::id(),
                        ])->save();

                        static::audit('affilie.application_rejected', $record, $before, [
                            'status' => AffilieStatus::Rejected->value,
                            'reason' => trim((string) $data['reason']),
                        ]);

                        Notification::make()->title('Candidature refusée.')->success()->send();
                    }),

                Actions\ActionGroup::make([
                    Actions\EditAction::make(),

                    Actions\Action::make('kyc_approve')
                        ->label('Valider la CIN')
                        ->icon('heroicon-o-identification')
                        ->color('success')
                        ->visible(fn (Affilie $record): bool => in_array((string) $record->getAttribute('kyc_status'), [Affilie::KYC_SUBMITTED, Affilie::KYC_REJECTED], true))
                        ->requiresConfirmation()
                        ->modalDescription('Confirmez que les deux faces de la pièce d’identité ont été ouvertes et lues.')
                        ->action(function (Affilie $record): void {
                            $before = static::snapshot($record);

                            $record->forceFill([
                                'kyc_status' => Affilie::KYC_APPROVED,
                                'kyc_reviewed_at' => now(),
                                'kyc_reviewed_by' => Auth::id(),
                                'kyc_reject_reason' => null,
                            ])->save();

                            static::audit('affilie.kyc_approved', $record, $before, ['kyc_status' => Affilie::KYC_APPROVED]);

                            Notification::make()->title('Pièce d’identité validée.')->success()->send();
                        }),

                    Actions\Action::make('kyc_reject')
                        ->label('Refuser la CIN')
                        ->icon('heroicon-o-identification')
                        ->color('danger')
                        ->visible(fn (Affilie $record): bool => in_array((string) $record->getAttribute('kyc_status'), [Affilie::KYC_SUBMITTED, Affilie::KYC_APPROVED], true))
                        ->requiresConfirmation()
                        ->form([
                            Forms\Components\Textarea::make('reason')
                                ->label('Motif')
                                ->required()
                                ->maxLength(500)
                                ->rows(2)
                                ->helperText('Ex. « Verso illisible » — le candidat doit savoir quoi renvoyer.'),
                        ])
                        ->action(function (Affilie $record, array $data): void {
                            $before = static::snapshot($record);

                            $record->forceFill([
                                'kyc_status' => Affilie::KYC_REJECTED,
                                'kyc_reviewed_at' => now(),
                                'kyc_reviewed_by' => Auth::id(),
                                'kyc_reject_reason' => trim((string) $data['reason']),
                            ])->save();

                            static::audit('affilie.kyc_rejected', $record, $before, [
                                'kyc_status' => Affilie::KYC_REJECTED,
                                'reason' => trim((string) $data['reason']),
                            ]);

                            Notification::make()->title('Pièce d’identité refusée.')->success()->send();
                        }),

                    Actions\Action::make('pay_affilie')
                        ->label('Payer')
                        ->icon('heroicon-o-banknotes')
                        ->color('success')
                        ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Active)
                        ->form([
                            Forms\Components\TextInput::make('amount')
                                ->label('Montant (DT)')
                                ->numeric()
                                ->required()
                                ->default(fn (Affilie $record): float => round(max(0.0, (float) ($record->current_balance ?? 0)), 3))
                                ->helperText(fn (Affilie $record): string => 'Solde disponible : ' . number_format((float) ($record->current_balance ?? 0), 3, '.', ' ') . ' DT'),
                            Forms\Components\TextInput::make('payment_reference')
                                ->label('Référence / note paiement')
                                ->maxLength(128),
                            Forms\Components\Textarea::make('admin_note')
                                ->label('Note interne')
                                ->rows(2),
                        ])
                        ->action(function (Affilie $record, array $data): void {
                            app(AffilieTransactionService::class)->recordAffiliePayment(
                                $record,
                                (float) $data['amount'],
                                $data['admin_note'] ?? null,
                                $data['payment_reference'] ?? null,
                            );
                            Notification::make()->title('Paiement enregistré et marqué payé.')->success()->send();
                        }),

                    Actions\Action::make('invite')
                        ->label('Invitation')
                        ->icon('heroicon-o-envelope')
                        ->requiresConfirmation()
                        ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Active && filled($record->email))
                        ->action(function (Affilie $record): void {
                            $user = static::linkPanelUser($record);

                            // null = no e-mail on file, false = refused (staff address). Neither
                            // has an account to invite; linkPanelUser has already explained false.
                            if (! $user instanceof User) {
                                return;
                            }

                            $user->sendAffilieInvitationResetNotification(Password::broker()->createToken($user));

                            Notification::make()->title('Invitation envoyée.')->success()->send();
                        }),

                    Actions\Action::make('suspend')
                        ->label('Suspendre')
                        ->icon('heroicon-o-pause-circle')
                        ->color('warning')
                        ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Active)
                        ->requiresConfirmation()
                        ->action(function (Affilie $record): void {
                            $before = static::snapshot($record);
                            $record->update(['status' => AffilieStatus::Suspended]);
                            static::audit('affilie.suspended', $record, $before, ['status' => AffilieStatus::Suspended->value]);
                        }),

                    Actions\Action::make('activate')
                        ->label('Activer')
                        ->icon('heroicon-o-play-circle')
                        ->color('success')
                        ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Suspended)
                        ->requiresConfirmation()
                        ->action(function (Affilie $record): void {
                            $before = static::snapshot($record);
                            $record->update(['status' => AffilieStatus::Active]);
                            static::audit('affilie.activated', $record, $before, ['status' => AffilieStatus::Active->value]);
                        }),

                    Actions\Action::make('approvePaymentMethod')
                        ->label('Approuver la méthode de paiement')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->visible(fn (Affilie $record): bool => filled($record->payment_method_requested))
                        ->requiresConfirmation()
                        ->modalHeading('Approuver le changement de méthode de paiement')
                        ->modalDescription(fn (Affilie $record): string => 'Nouvelle méthode : '
                            .(\App\Enums\AffiliePayoutMethod::tryFrom((string) $record->payment_method_requested)?->label() ?? '—'))
                        ->action(function (Affilie $record): void {
                            $requested = (string) $record->payment_method_requested;
                            if (\App\Enums\AffiliePayoutMethod::tryFrom($requested) === null) {
                                return;
                            }
                            $before = ['payment_method' => $record->payment_method];
                            $record->forceFill([
                                'payment_method'              => $requested,
                                'payment_method_requested'    => null,
                                'payment_method_requested_at' => null,
                            ])->save();
                            static::audit('affilie.payment_method_changed', $record, $before, ['payment_method' => $requested]);
                            static::notifyAffiliate(
                                $record,
                                'Méthode de paiement mise à jour',
                                'Votre méthode de paiement est désormais : '.(\App\Enums\AffiliePayoutMethod::tryFrom($requested)?->label() ?? $requested).'.',
                                true,
                            );
                            Notification::make()->title('Méthode de paiement mise à jour')->success()->send();
                        }),

                    Actions\Action::make('rejectPaymentMethod')
                        ->label('Refuser la méthode demandée')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->visible(fn (Affilie $record): bool => filled($record->payment_method_requested))
                        ->requiresConfirmation()
                        ->action(function (Affilie $record): void {
                            $before = ['payment_method_requested' => $record->payment_method_requested];
                            $record->forceFill([
                                'payment_method_requested'    => null,
                                'payment_method_requested_at' => null,
                            ])->save();
                            static::audit('affilie.payment_method_change_refused', $record, $before, ['payment_method_requested' => null]);
                            static::notifyAffiliate(
                                $record,
                                'Demande de changement refusée',
                                'Votre demande de changement de méthode de paiement n’a pas été acceptée. Contactez l’équipe pour en savoir plus.',
                                false,
                            );
                            Notification::make()->title('Demande refusée')->warning()->send();
                        }),
                ])->label('Plus'),
            ])
            ->bulkActions([]);
    }

    /**
     * Approve an application: activate, set the agreed rate, and grant panel access.
     *
     * Extracted from the action closure so the whole grant is readable in one place — it is the
     * single most consequential write in this resource.
     */
    protected static function approve(Affilie $record, float $commissionRate, bool $sendInvitation): void
    {
        $before = static::snapshot($record);

        $user = static::linkPanelUser($record);

        if ($user === false) {
            // linkPanelUser already explained the refusal. Nothing is written: an approval that
            // half-succeeded would leave an Active affiliate with no way into their panel and an
            // admin with no clue why.
            return;
        }

        $record->forceFill([
            'status' => AffilieStatus::Active->value,
            'commission_rate' => $commissionRate,
            'application_reject_reason' => null,
            'reviewed_at' => now(),
            'reviewed_by' => Auth::id(),
        ])->save();

        static::audit('affilie.application_approved', $record, $before, [
            'status' => AffilieStatus::Active->value,
            'commission_rate' => $commissionRate,
            'user_id' => $record->user_id,
            'panel_access_granted' => $user !== null,
        ]);

        if ($user !== null && $sendInvitation) {
            try {
                $user->sendAffilieInvitationResetNotification(Password::broker()->createToken($user));
            } catch (\Throwable $e) {
                // The approval itself has already committed and must not be undone by a mail
                // failure; the admin can re-send from the "Invitation" action.
                Notification::make()
                    ->title('Approuvé, mais l’invitation n’a pas pu être envoyée.')
                    ->body($e->getMessage())
                    ->warning()
                    ->persistent()
                    ->send();

                return;
            }
        }

        Notification::make()
            ->title('Candidature approuvée.')
            ->body($user === null
                ? 'Aucune adresse e-mail sur la fiche : l’affilié est actif mais n’a pas d’accès à son espace.'
                : null)
            ->success()
            ->send();
    }

    /**
     * Find or create the `users` row that backs the affiliate panel, and put it on the right role.
     *
     * Returns the user, `null` when the affiliate has no e-mail (activation is still valid, there
     * is simply no account to attach), or `false` when the operation was REFUSED and the caller
     * must abort.
     *
     * ── TWO TRAPS THIS CLOSES ────────────────────────────────────────────────────────────────
     * 1. `User::$guarded = ['role_id']`, so `User::firstOrCreate([...], ['role_id' => …])` silently
     *    DROPS the role — and `users.role_id` is NOT NULL with no default, so the insert throws a
     *    500. This is the same trap ClientController::register documents. forceFill on a fresh
     *    model is the only shape that works.
     * 2. Approving an application filed with a STAFF address would rewrite that admin's role to the
     *    affiliate role and lock them out of the back office (EnsureBackOfficeRole and
     *    User::canAccessPanel both read the same list). Refused outright rather than "fixed".
     *
     * @return User|null|false
     */
    protected static function linkPanelUser(Affilie $record): User|null|false
    {
        $email = mb_strtolower(trim((string) $record->email));

        if ($email === '') {
            return null;
        }

        $roleId = Affilie::availableCommissionRoleId();
        $adminRoleIds = array_map('intval', (array) config('affilies.admin_role_ids', [1, 3]));

        $user = User::query()->where('email', $email)->first();

        if ($user !== null && in_array((int) ($user->role_id ?? 0), $adminRoleIds, true)) {
            Notification::make()
                ->title('Opération refusée')
                ->body("Le compte {$email} appartient au personnel. Lui donner le rôle affilié lui retirerait l’accès à l’administration. Utilisez une autre adresse pour cet affilié.")
                ->danger()
                ->persistent()
                ->send();

            return false;
        }

        if ($user === null) {
            $user = new User;
            $user->forceFill([
                'name' => (string) $record->name,
                'email' => $email,
                // Never a known value: the affiliate sets their own through the invitation link.
                'password' => Hash::make(Str::random(40)),
                'role_id' => $roleId,
            ])->save();
        } elseif ((int) ($user->role_id ?? 0) !== $roleId) {
            $user->forceFill(['role_id' => $roleId])->save();
        }

        if ((int) ($record->user_id ?? 0) !== (int) $user->getKey()) {
            $record->forceFill(['user_id' => $user->getKey()])->save();
        }

        return $user;
    }

    /**
     * Audit row for an affiliate decision.
     *
     * Same guarded shape as the DocumentConversion services: absent table or class is a silent
     * no-op, because an audit trail that can 500 a deployment is an audit trail somebody removes.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    protected static function audit(string $action, Affilie $record, array $before = [], array $after = []): void
    {
        if (! class_exists(AuditLog::class) || ! DbSchema::hasTable('audit_logs')) {
            return;
        }

        AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'entity_type' => 'affilie',
            'entity_id' => $record->getKey(),
            'before' => $before ?: null,
            'after' => $after ?: null,
        ]);
    }

    /**
     * Best-effort in-app notification to the affiliate's panel user (bell). The affiliate panel has
     * databaseNotifications() enabled, so this reaches them; a failure must never break the admin action.
     */
    protected static function notifyAffiliate(Affilie $record, string $title, string $body, bool $success): void
    {
        try {
            $user = $record->user;
            if (! $user) {
                return;
            }

            $notification = Notification::make()->title($title)->body($body);
            $success ? $notification->success() : $notification->warning();
            $notification->sendToDatabase($user);
        } catch (\Throwable) {
            // no-op
        }
    }

    /**
     * The fields a decision can change, read straight from the attribute bag.
     *
     * `getAttributes()` rather than the accessors so enums come back as the raw strings that are
     * actually stored — an audit row holding "App\Enums\AffilieStatus::Pending" is not a record of
     * what was in the database.
     *
     * @return array<string, mixed>
     */
    protected static function snapshot(Affilie $record): array
    {
        $attributes = $record->getAttributes();

        return [
            'status' => $attributes['status'] ?? null,
            'commission_rate' => isset($attributes['commission_rate']) ? (float) $attributes['commission_rate'] : null,
            'kyc_status' => $attributes['kyc_status'] ?? null,
            'user_id' => $attributes['user_id'] ?? null,
        ];
    }

    protected static function kycLabel(string $status): string
    {
        return match ($status) {
            Affilie::KYC_SUBMITTED => 'À vérifier',
            Affilie::KYC_APPROVED => 'Validée',
            Affilie::KYC_REJECTED => 'Refusée',
            default => 'À fournir',
        };
    }

    /** A 5-minute signed link, or a dash. Never a Storage::url() — see AffilieKycService. */
    protected static function documentLink(?Affilie $record, string $side): HtmlString
    {
        if ($record === null) {
            return new HtmlString('—');
        }

        $url = app(AffilieKycService::class)->temporaryUrl($record, $side);

        if ($url === null) {
            return new HtmlString('<span class="text-gray-500">Non fournie</span>');
        }

        return new HtmlString(sprintf(
            '<a href="%s" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline">Ouvrir (lien valable 5 minutes)</a>',
            e($url),
        ));
    }

    public static function getRelations(): array
    {
        return [
            AffilieCodesRelationManager::class,
            AffilieTransactionsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAffilies::route('/'),
            'create' => Pages\CreateAffilie::route('/create'),
            'edit' => Pages\EditAffilie::route('/{record}/edit'),
        ];
    }
}
