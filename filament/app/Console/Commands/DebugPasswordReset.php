<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Password;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class DebugPasswordReset extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'debug:password-reset {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Debugs the password reset flow for a specific email';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("1. Checking user existence for email: {$email}");
        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("User not found!");
            return;
        }
        $this->info("User found: ID {$user->id}, Name: {$user->name}");

        $this->info("\n2. Checking Password Broker configuration");
        $this->info("Default passwords provider: " . config('auth.defaults.passwords'));
        $this->info("Queue default: " . config('queue.default'));

        $this->info("\n3. Testing Password Broker sendResetLink()");
        try {
            $status = Password::broker()->sendResetLink(['email' => $email]);
            $this->info("Broker Status Returned: " . __($status));
            if ($status === Password::RESET_LINK_SENT) {
                $this->info("SUCCESS! The broker says it sent the link.");
            } else {
                $this->error("FAILURE! The broker returned an error: " . $status);
            }
        } catch (\Exception $e) {
            $this->error("Exception caught from broker: " . $e->getMessage());
            $this->error($e->getTraceAsString());
        }

        $this->info("\n4. Testing Direct Execution of sendPasswordResetNotification()");
        try {
            $token = 'dummy-debug-token-12345';
            $user->sendPasswordResetNotification($token);
            $this->info("SUCCESS! Direct execution finished without exceptions.");
        } catch (\Exception $e) {
            $this->error("Exception caught from direct execution: " . $e->getMessage());
            $this->error($e->getTraceAsString());
        }

        $this->info("\nDone.");
    }
}
