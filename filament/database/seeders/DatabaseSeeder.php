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
        if (! User::where('email', 'admin@sobitas.tn')->exists()) {
            User::create([
                'name' => 'Admin Sobitas',
                'email' => 'admin@sobitas.tn',
                'password' => Hash::make('password'),
            ]);

            $this->command->info('Admin user created: admin@sobitas.tn');
        } else {
            $this->command->info('Admin user already exists.');
        }
    }
}
