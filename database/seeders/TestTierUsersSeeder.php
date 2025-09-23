<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class TestTierUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Pro user
        $proUser = User::create([
            'name' => 'Pro Test User',
            'email' => 'pro@test.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'is_super_user' => false,
            'tier' => 'pro',
            'tier_expires_at' => Carbon::now()->addMonths(1), // Expires in 1 month
            'monthly_tokens' => 500,
            'tokens' => 450, // Give them some used tokens
            'total_tokens_used' => 50,
        ]);

        // Create Advanced user
        $advancedUser = User::create([
            'name' => 'Advanced Test User',
            'email' => 'advanced@test.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'is_super_user' => false,
            'tier' => 'advanced',
            'tier_expires_at' => Carbon::now()->addMonths(3), // Expires in 3 months
            'monthly_tokens' => 1000,
            'tokens' => 800, // Give them some used tokens
            'total_tokens_used' => 200,
        ]);

        $this->command->info('Test tier users created successfully!');
        $this->command->info('Pro User: pro@test.com / password');
        $this->command->info('Advanced User: advanced@test.com / password');
    }
}
