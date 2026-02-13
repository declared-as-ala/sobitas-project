<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            [
                'email' => 'webmaster@gmail.com',
            ],
            [
                'name' => 'Admin Sobitas',
                'password' => Hash::make('sobitas2020'),
                'role' => 'admin', // remove if your table doesn’t have this column
                'email_verified_at' => now(),
            ]
        );
    }
}

