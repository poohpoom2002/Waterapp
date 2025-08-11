<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class SuperUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ตรวจสอบและสร้าง Super User หลัก
        $mainSuperUser = User::where('email', 'admin@kanok.com')->first();
        
        if (!$mainSuperUser) {
            $superUser = User::create([
                'name' => 'Admin Kanok',
                'email' => 'admin@kanok.com',
                'password' => Hash::make('kanok-2025'),
                'is_super_user' => true,
                'email_verified_at' => now(),
            ]);

            $this->command->info('Main super user created successfully!');
            $this->command->info('Email: ' . $superUser->email);
            $this->command->info('Password: kanok-2025');
        } else {
            $this->command->info('Main super user already exists: ' . $mainSuperUser->email);
        }

        // สร้าง Super User เพิ่มเติมถ้าต้องการ
        $additionalSuperUsers = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@chaiyo.com',
                'password' => Hash::make('chaiyo-admin-2025'),
                'is_super_user' => true,
                'email_verified_at' => now(),
            ],
        ];

        foreach ($additionalSuperUsers as $userData) {
            // ตรวจสอบว่า email ซ้ำหรือไม่
            $existingUser = User::where('email', $userData['email'])->first();
            if (!$existingUser) {
                $user = User::create($userData);
                $this->command->info('Additional super user created: ' . $user->email);
            } else {
                $this->command->info('User already exists: ' . $userData['email']);
            }
        }

        // สร้าง Regular User ตัวอย่างสำหรับทดสอบ
        $regularUsers = [
            [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => Hash::make('password123'),
                'is_super_user' => false,
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Demo User',
                'email' => 'demo@chaiyo.com',
                'password' => Hash::make('demo123'),
                'is_super_user' => false,
                'email_verified_at' => now(),
            ],
        ];

        foreach ($regularUsers as $userData) {
            // ตรวจสอบว่า email ซ้ำหรือไม่
            $existingUser = User::where('email', $userData['email'])->first();
            if (!$existingUser) {
                $user = User::create($userData);
                $this->command->info('Regular user created: ' . $user->email);
            } else {
                $this->command->info('User already exists: ' . $userData['email']);
            }
        }

        $this->command->info('SuperUserSeeder completed successfully!');
    }
}
