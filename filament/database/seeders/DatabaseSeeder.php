<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user if it doesn't exist
        if (! User::where('email', 'admin@protein.tn')->exists()) {
            User::create([
                'name' => 'Admin Protein.tn',
                'email' => 'admin@protein.tn',
                'password' => Hash::make('password'),
            ]);

            $this->command->info('Admin user created: admin@protein.tn');
        } else {
            $this->command->info('Admin user already exists.');
        }

        $this->call(MarketingTemplatesSeeder::class);
    }
}
