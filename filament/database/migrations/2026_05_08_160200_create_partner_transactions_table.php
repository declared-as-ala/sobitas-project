<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('partner_transactions')) {
            return;
        }

        $ticketIdColumnKind = $this->resolveTicketIdColumnKind();

        Schema::create('partner_transactions', function (Blueprint $table) use ($ticketIdColumnKind) {
            $table->id();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            if ($ticketIdColumnKind === 'unsignedInteger') {
                $table->unsignedInteger('ticket_id')->nullable();
            } else {
                $table->unsignedBigInteger('ticket_id')->nullable();
            }
            $table->foreignId('partner_code_id')->nullable()->constrained('partner_codes')->nullOnDelete();
            $table->string('type', 32);
            $table->decimal('amount', 14, 3);
            $table->decimal('balance_after', 14, 3)->nullable();
            $table->string('status', 32)->default('confirmed');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['partner_id', 'type', 'status']);
            $table->index(['partner_id', 'created_at']);
        });

        if (Schema::hasTable('tickets')) {
            DB::statement(
                'ALTER TABLE `partner_transactions` ADD CONSTRAINT `partner_transactions_ticket_id_foreign` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE SET NULL'
            );
        }

        if (! Schema::hasTable('partner_commission_transactions')) {
            $this->seedBalancesFromNothing();

            return;
        }

        $rows = DB::table('partner_commission_transactions')->orderBy('id')->get();

        foreach ($rows as $row) {
            $newType = match ((string) $row->type) {
                'payout' => 'payment',
                default => (string) $row->type,
            };

            $amount = (float) $row->amount;
            if ($row->type === 'payout') {
                $amount = -abs($amount);
            }
            if ($row->type === 'reversal') {
                $amount = -abs($amount);
            }

            $newStatus = match ((string) $row->type) {
                'payout' => (string) $row->status === 'paid' ? 'paid' : 'pending',
                default => (string) $row->status,
            };

            $codeId = null;
            if ($row->partner_code_id && Schema::hasTable('partner_codes')) {
                $codeId = DB::table('partner_codes')
                    ->where('legacy_coupon_id', $row->partner_code_id)
                    ->value('id');
            }

            $meta = $row->metadata ? json_decode((string) $row->metadata, true) : [];
            if (! is_array($meta)) {
                $meta = [];
            }
            if ($row->commission_base !== null || $row->commission_rate !== null) {
                $meta['legacy_commission_base'] = (float) $row->commission_base;
                $meta['legacy_commission_rate'] = (float) $row->commission_rate;
            }

            DB::table('partner_transactions')->insert([
                'partner_id' => $row->partner_id,
                'ticket_id' => $row->ticket_id,
                'partner_code_id' => $codeId,
                'type' => $newType,
                'amount' => round($amount, 3),
                'balance_after' => null,
                'status' => $newStatus,
                'description' => $row->description,
                'metadata' => json_encode($meta),
                'created_by' => $row->created_by,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        $this->recomputeBalanceAfterAndPartnerTotals();
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_transactions');
    }

    private function seedBalancesFromNothing(): void
    {
        if (Schema::hasTable('partners')) {
            DB::table('partners')->update([
                'current_balance' => 0,
                'total_earned' => 0,
                'total_paid' => 0,
            ]);
        }
    }

    private function recomputeBalanceAfterAndPartnerTotals(): void
    {
        if (! Schema::hasTable('partners') || ! Schema::hasTable('partner_transactions')) {
            return;
        }

        $partnerIds = DB::table('partner_transactions')->distinct()->pluck('partner_id');

        foreach ($partnerIds as $pid) {
            $running = 0.0;
            $totalEarned = 0.0;
            $totalPaid = 0.0;

            $txs = DB::table('partner_transactions')
                ->where('partner_id', $pid)
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();

            foreach ($txs as $tx) {
                $amt = (float) $tx->amount;
                $running += $amt;

                if ($tx->type === 'commission' && $tx->status === 'confirmed') {
                    $totalEarned += $amt;
                }
                if ($tx->type === 'reversal' && $tx->status === 'confirmed') {
                    $totalEarned += $amt;
                }
                if ($tx->type === 'adjustment' && $tx->status === 'confirmed' && $amt > 0) {
                    $totalEarned += $amt;
                }
                if ($tx->type === 'payment' && $tx->status === 'paid') {
                    $totalPaid += abs($amt);
                }

                DB::table('partner_transactions')->where('id', $tx->id)->update([
                    'balance_after' => round($running, 3),
                ]);
            }

            DB::table('partners')->where('id', $pid)->update([
                'current_balance' => round($running, 3),
                'total_earned' => round(max(0, $totalEarned), 3),
                'total_paid' => round($totalPaid, 3),
            ]);
        }

        if ($partnerIds->isEmpty()) {
            DB::table('partners')->update([
                'current_balance' => 0,
                'total_earned' => 0,
                'total_paid' => 0,
            ]);
        } else {
            DB::table('partners')->whereNotIn('id', $partnerIds)->update([
                'current_balance' => 0,
                'total_earned' => 0,
                'total_paid' => 0,
            ]);
        }
    }

    private function resolveTicketIdColumnKind(): string
    {
        if (! Schema::hasTable('tickets')) {
            return 'unsignedBigInteger';
        }

        $dbName = DB::getDatabaseName();
        if (! $dbName) {
            return 'unsignedBigInteger';
        }

        $columnType = DB::table('information_schema.COLUMNS')
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'tickets')
            ->where('COLUMN_NAME', 'id')
            ->value('COLUMN_TYPE');

        if (is_string($columnType) && str_contains(strtolower($columnType), 'int') && ! str_contains(strtolower($columnType), 'bigint')) {
            return 'unsignedInteger';
        }

        return 'unsignedBigInteger';
    }
};
