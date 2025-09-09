<?php
// database\seeders\DatabaseSeeder.php
namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            SuperUserSeeder::class,     // สร้าง Super Users และ Regular Users
            PlantTypeSeeder::class,     // สร้างข้อมูลประเภทพืช
            SprinklerSeeder::class,     // สร้างข้อมูลสปริงเกลอร์
            EquipmentSeeder::class,     // สร้างข้อมูลอุปกรณ์
        ]);
    }
}
