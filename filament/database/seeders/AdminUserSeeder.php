<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin@sobitas.com'],
            [
                'name' => 'Admin Sobitas',
                'password' => Hash::make('password'), // You can change this
                'email_verified_at' => now(),
            ]
        );

        $this->command->info("User created/updated: {$user->email}");
        $this->command->info("Password: password");
    }
}
