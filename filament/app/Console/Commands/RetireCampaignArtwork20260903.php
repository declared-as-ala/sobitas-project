<?php

namespace App\Console\Commands;

use App\Support\CampaignArtwork20260903;
use Illuminate\Console\Command;
use Throwable;

class RetireCampaignArtwork20260903 extends Command
{
    protected $signature = 'slides:retire-20260903 {--apply : Remove the six superseded public images after verifying the replacement and private backup}';

    protected $description = 'Retire only the six superseded September campaign images; dry run by default';

    public function handle(): int
    {
        try {
            $apply = (bool) $this->option('apply');
            $count = CampaignArtwork20260903::retire($apply);
            $this->info(($apply ? 'Retired ' : 'Ready to retire ').$count.' superseded public images. Verified private backups are retained.');

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }
}
