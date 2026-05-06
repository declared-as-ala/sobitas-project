<?php

namespace App\Models;

use App\Enums\LoyaltyCardStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LoyaltyCard extends Model
{
    private static ?array $allowedStatusValuesCache = null;

    protected $table = 'loyalty_cards';

    protected $fillable = [
        'batch_id',
        'client_id',
        'card_number',
        'qr_token',
        'status',
        'print_status',
        'printed_at',
        'exported_at',
        'delivered_to_store_at',
        'assigned_at',
        'lost_at',
        'retired_at',
        'replacement_for_card_id',
        'notes',
    ];

    protected $casts = [
        'printed_at'  => 'datetime',
        'exported_at' => 'datetime',
        'delivered_to_store_at' => 'datetime',
        'assigned_at' => 'datetime',
        'lost_at'     => 'datetime',
        'retired_at'  => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (LoyaltyCard $card) {
            if (empty($card->qr_token)) {
                $card->qr_token = (string) Str::uuid();
            }
        });
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LoyaltyCardBatch::class, 'batch_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LoyaltyPointTransaction::class, 'loyalty_card_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'loyalty_card_id');
    }

    public function replacementFor(): BelongsTo
    {
        return $this->belongsTo(LoyaltyCard::class, 'replacement_for_card_id');
    }

    public function replacedBy(): HasOne
    {
        return $this->hasOne(LoyaltyCard::class, 'replacement_for_card_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', self::preferredAvailableStatusValue());
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::preferredStatusValue('active'));
    }

    public function getStatusAttribute($value): LoyaltyCardStatus
    {
        if ($value instanceof LoyaltyCardStatus) {
            return $value;
        }

        $normalized = is_string($value) ? trim($value) : '';

        return LoyaltyCardStatus::tryFrom($normalized) ?? LoyaltyCardStatus::Available;
    }

    public function setStatusAttribute($value): void
    {
        $raw = $value instanceof LoyaltyCardStatus
            ? $value->value
            : (is_string($value) ? trim($value) : '');

        $this->attributes['status'] = self::mapToAllowedStatus($raw);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function isAssignable(): bool
    {
        return $this->status === LoyaltyCardStatus::Available;
    }

    public function isUsable(): bool
    {
        return $this->status === LoyaltyCardStatus::Active;
    }

    public static function getStatusSelectOptions(): array
    {
        $allowed = self::allowedStatusValues();
        if ($allowed === []) {
            return collect(LoyaltyCardStatus::cases())->mapWithKeys(
                fn (LoyaltyCardStatus $case): array => [$case->value => $case->label()]
            )->all();
        }

        return collect($allowed)->mapWithKeys(function (string $value): array {
            $enum = LoyaltyCardStatus::tryFrom($value);
            if ($enum) {
                return [$value => $enum->label()];
            }

            return [$value => Str::ucfirst(str_replace(['_', '-'], ' ', $value))];
        })->all();
    }

    public static function preferredAvailableStatusValue(): string
    {
        return self::preferredStatusValue('available');
    }

    public static function preferredStatusValue(string $kind): string
    {
        $allowed = self::allowedStatusValues();
        if ($allowed === []) {
            return $kind === 'available' ? LoyaltyCardStatus::Available->value : $kind;
        }

        $aliases = match ($kind) {
            'available' => ['available', 'disponible'],
            'active' => ['active', 'actif'],
            'lost' => ['lost', 'perdue'],
            'retired' => ['retired', 'archivee', 'archived'],
            default => [$kind],
        };

        foreach ($aliases as $candidate) {
            if (in_array($candidate, $allowed, true)) {
                return $candidate;
            }
        }

        return $allowed[0];
    }

    public static function allowedStatusValuesForWrite(): array
    {
        return self::allowedStatusValues();
    }

    public static function printStatusOptions(): array
    {
        return [
            'not_printed' => 'Non imprimée',
            'exported' => 'Exportée',
            'printed' => 'Imprimée',
            'delivered_to_store' => 'Livrée magasin',
        ];
    }

    private static function mapToAllowedStatus(string $raw): string
    {
        $normalized = trim(strtolower($raw));
        if ($normalized === '') {
            return self::preferredAvailableStatusValue();
        }

        $allowed = self::allowedStatusValues();
        if ($allowed === []) {
            return LoyaltyCardStatus::tryFrom($normalized)?->value ?? LoyaltyCardStatus::Available->value;
        }

        if (in_array($normalized, $allowed, true)) {
            return $normalized;
        }

        $kind = match ($normalized) {
            'available', 'disponible' => 'available',
            'active', 'actif' => 'active',
            'lost', 'perdue' => 'lost',
            'retired', 'archivee', 'archived' => 'retired',
            default => 'available',
        };

        return self::preferredStatusValue($kind);
    }

    private static function allowedStatusValues(): array
    {
        if (self::$allowedStatusValuesCache !== null) {
            return self::$allowedStatusValuesCache;
        }

        try {
            $columnType = DB::table('information_schema.COLUMNS')
                ->where('TABLE_SCHEMA', DB::getDatabaseName())
                ->where('TABLE_NAME', 'loyalty_cards')
                ->where('COLUMN_NAME', 'status')
                ->value('COLUMN_TYPE');
        } catch (\Throwable) {
            $columnType = null;
        }

        if (! is_string($columnType)) {
            try {
                $table = DB::getTablePrefix() . 'loyalty_cards';
                $column = DB::selectOne("SHOW COLUMNS FROM `{$table}` LIKE 'status'");
                $columnType = is_object($column) ? ($column->Type ?? null) : null;
            } catch (\Throwable) {
                return self::$allowedStatusValuesCache = [];
            }
        }

        if (! is_string($columnType) || preg_match("/^enum\((.*)\)$/i", $columnType, $matches) !== 1) {
            return self::$allowedStatusValuesCache = [];
        }

        $values = array_values(array_filter(array_map(
            static fn (string $value): string => trim($value, " '\""),
            explode(',', $matches[1])
        )));

        return self::$allowedStatusValuesCache = $values;
    }
}
