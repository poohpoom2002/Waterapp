<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Super User
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@waterapp.com',
            'password' => Hash::make('admin123'),
            'is_super_user' => true,
            'email_verified_at' => now(),
        ]);

        // Create Regular Users
        $users = [
            [
                'name' => 'John Doe',
                'email' => 'john@waterapp.com',
                'password' => Hash::make('password123'),
                'is_super_user' => false,
            ],
            [
                'name' => 'Jane Smith',
                'email' => 'jane@waterapp.com',
                'password' => Hash::make('password123'),
                'is_super_user' => false,
            ],
            [
                'name' => 'Mike Johnson',
                'email' => 'mike@waterapp.com',
                'password' => Hash::make('password123'),
                'is_super_user' => false,
            ],
            [
                'name' => 'Sarah Wilson',
                'email' => 'sarah@waterapp.com',
                'password' => Hash::make('password123'),
                'is_super_user' => false,
            ],
            [
                'name' => 'David Brown',
                'email' => 'david@waterapp.com',
                'password' => Hash::make('password123'),
                'is_super_user' => false,
            ],
        ];

        foreach ($users as $userData) {
            User::create(array_merge($userData, [
                'email_verified_at' => now(),
            ]));
        }

        $this->command->info('Users seeded successfully!');
        $this->command->info('Super User: admin@waterapp.com / admin123');
        $this->command->info('Regular Users: john@waterapp.com, jane@waterapp.com, mike@waterapp.com, sarah@waterapp.com, david@waterapp.com / password123');
    }
} 