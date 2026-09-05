<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingLog extends Model
{
    protected $table = 'marketing_logs';

    protected $fillable = [
        'idempotency_key',
        'channel',
        'template_id',
        'recipient_type',
        'recipient_value',
        'client_id',
        'status',
        'provider_message_id',
        'error_message',
        'campaign_id',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(MarketingTemplate::class, 'template_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public static function statuses(): array
    {
        return ['queued', 'sent', 'failed', 'skipped'];
    }
}
