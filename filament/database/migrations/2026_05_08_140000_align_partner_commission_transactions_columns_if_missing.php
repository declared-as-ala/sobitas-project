<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Legacy DBs may have an early partner_commission_transactions table (120001 skipped create).
 * Prior patches added partner_code_id / ticket_id; remaining columns must match 2026_05_07_120001.
 */
return new class extends Migration
{
    private const TABLE = 'partner_commission_transactions';

    /** @var list<string> */
    private const ORDER = [
        'partner_id',
        'partner_code_id',
        'ticket_id',
        'type',
        'status',
        'commission_base',
        'commission_rate',
        'amount',
        'balance_after',
        'description',
        'metadata',
        'created_by',
    ];

    public function up(): void
    {
        if (! Schema::hasTable(self::TABLE)) {
            return;
        }

        $this->addStringIfMissing('type', 32, ['default' => 'commission']);
        $this->addStringIfMissing('status', 32, ['default' => 'pending']);

        $this->addDecimalIfMissing('commission_base', 14, 3, ['default' => 0]);
        $this->addDecimalIfMissing('commission_rate', 8, 2, ['default' => 0]);
        $this->addDecimalIfMissing('amount', 14, 3, ['default' => 0]);
        $this->addDecimalIfMissing('balance_after', 14, 3, ['nullable' => true]);

        $this->addTextIfMissing('description', ['nullable' => true]);
        $this->addJsonIfMissing('metadata', ['nullable' => true]);

        $this->addCreatedByIfMissing();
    }

    public function down(): void
    {
        // Non-destructive alignment migration: do not drop columns that may contain data.
    }

    private function resolveAfter(string $column): string
    {
        $pos = array_search($column, self::ORDER, true);
        if ($pos === false) {
            return 'id';
        }

        for ($i = $pos - 1; $i >= 0; $i--) {
            $before = self::ORDER[$i];
            if (Schema::hasColumn(self::TABLE, $before)) {
                return $before;
            }
        }

        return 'id';
    }

    private function addStringIfMissing(string $column, int $length, array $opts): void
    {
        if (Schema::hasColumn(self::TABLE, $column)) {
            return;
        }

        $after = $this->resolveAfter($column);
        Schema::table(self::TABLE, function (Blueprint $table) use ($column, $length, $after, $opts) {
            $b = $table->string($column, $length)->after($after);
            if (isset($opts['default'])) {
                $b->default($opts['default']);
            }
            if (! empty($opts['nullable'])) {
                $b->nullable();
            }
        });
    }

    private function addDecimalIfMissing(string $column, int $precision, int $scale, array $opts): void
    {
        if (Schema::hasColumn(self::TABLE, $column)) {
            return;
        }

        $after = $this->resolveAfter($column);
        Schema::table(self::TABLE, function (Blueprint $table) use ($column, $precision, $scale, $after, $opts) {
            $b = $table->decimal($column, $precision, $scale)->after($after);
            if (! empty($opts['nullable'])) {
                $b->nullable();
            } elseif (array_key_exists('default', $opts)) {
                $b->default($opts['default']);
            }
        });
    }

    private function addTextIfMissing(string $column, array $opts): void
    {
        if (Schema::hasColumn(self::TABLE, $column)) {
            return;
        }

        $after = $this->resolveAfter($column);
        Schema::table(self::TABLE, function (Blueprint $table) use ($column, $after, $opts) {
            $b = $table->text($column)->after($after);
            if (! empty($opts['nullable'])) {
                $b->nullable();
            }
        });
    }

    private function addJsonIfMissing(string $column, array $opts): void
    {
        if (Schema::hasColumn(self::TABLE, $column)) {
            return;
        }

        $after = $this->resolveAfter($column);
        Schema::table(self::TABLE, function (Blueprint $table) use ($column, $after, $opts) {
            $b = $table->json($column)->after($after);
            if (! empty($opts['nullable'])) {
                $b->nullable();
            }
        });
    }

    private function addCreatedByIfMissing(): void
    {
        if (Schema::hasColumn(self::TABLE, 'created_by')) {
            return;
        }

        $after = $this->resolveAfter('created_by');
        Schema::table(self::TABLE, function (Blueprint $table) use ($after) {
            $table->foreignId('created_by')
                ->nullable()
                ->after($after)
                ->constrained('users')
                ->nullOnDelete();
        });
    }
};
