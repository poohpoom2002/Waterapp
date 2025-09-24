<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class TokenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Give all existing users 100 tokens if they don't have any
        User::where('tokens', 0)->orWhereNull('tokens')->update([
            'tokens' => 100,
            'total_tokens_used' => 0,
        ]);

        $this->command->info('Token seeder completed. All users now have 100 tokens.');
    }
}