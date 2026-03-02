<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    protected $table = 'stock_movements';

    protected $fillable = [
        'product_id',
        'movement_type',
        'qty_before',
        'qty_change',
        'qty_after',
        'reason',
        'reference_type',
        'reference_id',
        'user_id',
        'note',
    ];

    protected $casts = [
        'qty_before' => 'integer',
        'qty_change' => 'integer',
        'qty_after' => 'integer',
        'reference_id' => 'integer',
    ];

    public const TYPE_ENTRY = 'entry';
    public const TYPE_EXIT = 'exit';
    public const TYPE_ADJUSTMENT = 'adjustment';
    public const TYPE_RESERVATION = 'reservation';
    public const TYPE_RELEASE = 'release';
    public const TYPE_SALE = 'sale';
    public const TYPE_CANCELLATION = 'cancellation';
    public const TYPE_RETURN = 'return';

    public const REASON_PURCHASE = 'purchase';
    public const REASON_MANUAL_CORRECTION = 'manual_correction';
    public const REASON_DAMAGED = 'damaged';
    public const REASON_EXPIRED = 'expired';
    public const REASON_INVENTORY_COUNT = 'inventory_count';
    public const REASON_ORDER_SHIPPED = 'order_shipped';
    public const REASON_ORDER_CANCELED = 'order_canceled';
    public const REASON_RETURN = 'return';

    public const REFERENCE_ADMIN_MANUAL = 'admin_manual';
    public const REFERENCE_INVENTORY_COUNT = 'inventory_count';
    public const REFERENCE_ORDER = 'order';

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function typeLabels(): array
    {
        return [
            self::TYPE_ENTRY => 'Entrée',
            self::TYPE_EXIT => 'Sortie',
            self::TYPE_ADJUSTMENT => 'Ajustement',
            self::TYPE_RESERVATION => 'Réservation',
            self::TYPE_RELEASE => 'Libération',
            self::TYPE_SALE => 'Vente',
            self::TYPE_CANCELLATION => 'Annulation',
            self::TYPE_RETURN => 'Retour',
        ];
    }

    public static function reasonLabels(): array
    {
        return [
            self::REASON_PURCHASE => 'Approvisionnement',
            self::REASON_MANUAL_CORRECTION => 'Correction manuelle',
            self::REASON_DAMAGED => 'Casse / endommagé',
            self::REASON_EXPIRED => 'Périmé',
            self::REASON_INVENTORY_COUNT => 'Inventaire / comptage',
            self::REASON_ORDER_SHIPPED => 'Commande expédiée',
            self::REASON_ORDER_CANCELED => 'Commande annulée',
            self::REASON_RETURN => 'Retour client',
        ];
    }
}
