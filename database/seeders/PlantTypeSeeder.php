<?php

namespace Database\Seeders;

use App\Models\PlantType;
use Illuminate\Database\Seeder;

class PlantTypeSeeder extends Seeder
{
    public function run(): void
    {
        $plants = [
            [
                'name' => 'Tomato',
                'type' => 'Vegetable',
                'plant_spacing' => 0.45,
                'row_spacing' => 0.90,
                'water_needed' => 1.5,
                'description' => 'A popular garden vegetable that requires regular watering and full sun exposure.',
            ],
            [
                'name' => 'Cucumber',
                'type' => 'Vegetable',
                'plant_spacing' => 0.60,
                'row_spacing' => 1.20,
                'water_needed' => 2.0,
                'description' => 'A climbing vine that produces crisp, refreshing fruits. Needs consistent moisture.',
            ],
            [
                'name' => 'Lettuce',
                'type' => 'Leafy Green',
                'plant_spacing' => 0.30,
                'row_spacing' => 0.45,
                'water_needed' => 0.5,
                'description' => 'Fast-growing leafy vegetable that prefers cool weather and regular watering.',
            ],
            [
                'name' => 'Bell Pepper',
                'type' => 'Vegetable',
                'plant_spacing' => 0.45,
                'row_spacing' => 0.75,
                'water_needed' => 1.0,
                'description' => 'Sweet, crisp peppers that require warm temperatures and consistent moisture.',
            ],
            [
                'name' => 'Carrot',
                'type' => 'Root Vegetable',
                'plant_spacing' => 0.15,
                'row_spacing' => 0.30,
                'water_needed' => 0.3,
                'description' => 'Root vegetable that grows best in loose, well-draining soil with consistent moisture.',
            ],
        ];

        foreach ($plants as $plant) {
            PlantType::create($plant);
        }
    }
} 