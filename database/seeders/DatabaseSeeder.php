<?php
// database\seeders\DatabaseSeeder.php
namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Admin Kanok',
            'email' => 'admin@kanok.com',
            'password' => Hash::make('kanok-2025'),
            'is_super_user' => 1,
        ]);

        $this->call([
            PlantTypeSeeder::class,
            SprinklerSeeder::class,
            EquipmentSeeder::class,
            
        ]);
    }
}
