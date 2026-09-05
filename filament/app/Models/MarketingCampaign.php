<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketingCampaign extends Model
{
    protected $fillable = [
        'automation_key',
        'type',
        'template_key',
        'template_vars',
        'subject',
        'body_override',
        'recipients',
        'total',
        'sent',
        'failed',
        'skipped',
        'status',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'template_vars' => 'array',
        'recipients' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public const STATUS_QUEUED = 'queued';
    public const STATUS_SENDING = 'sending';
    public const STATUS_DONE = 'done';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public function getPercentAttribute(): int
    {
        if ($this->total <= 0) {
            return 0;
        }
        return (int) round(($this->sent + $this->failed + $this->skipped) / $this->total * 100);
    }

    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_QUEUED, self::STATUS_SENDING], true);
    }

    public function isFinished(): bool
    {
        return in_array($this->status, [self::STATUS_DONE, self::STATUS_FAILED, self::STATUS_CANCELLED], true);
    }

    public function markSending(): void
    {
        $this->update(['status' => self::STATUS_SENDING, 'started_at' => $this->started_at ?? now()]);
    }

    public function incrementSent(): void
    {
        $this->increment('sent');
        $this->checkFinished();
    }

    public function incrementFailed(): void
    {
        $this->increment('failed');
        $this->checkFinished();
    }

    public function incrementSkipped(): void
    {
        $this->increment('skipped');
        $this->checkFinished();
    }

    protected function checkFinished(): void
    {
        if (($this->sent + $this->failed + $this->skipped) >= $this->total) {
            $this->update([
                'status' => $this->failed > 0 ? self::STATUS_FAILED : self::STATUS_DONE,
                'finished_at' => now(),
            ]);
        }
    }

    public function cancel(): void
    {
        if ($this->isActive()) {
            $this->update(['status' => self::STATUS_CANCELLED, 'finished_at' => now()]);
        }
    }
}
