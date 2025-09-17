<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class UserTierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Initialize all existing users with free tier
        User::query()->update([
            'tier' => 'free',
            'tier_expires_at' => null,
            'monthly_tokens' => 100,
        ]);

        $this->command->info('User tier seeder completed. All users now have free tier with 100 monthly tokens.');
    }
}
