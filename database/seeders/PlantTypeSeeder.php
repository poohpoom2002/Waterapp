<?php

namespace Database\Seeders;

use App\Models\PlantType;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PlantTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plants = [
            [
                'name' => 'Tomato',
                'type' => 'Vegetable',
                'plant_spacing' => 0.45,
                'row_spacing' => 0.90,
                'water_needed' => 1.5,
                'description' => 'Popular garden vegetable that requires regular watering'
            ],
            [
                'name' => 'Cucumber',
                'type' => 'Vegetable',
                'plant_spacing' => 0.30,
                'row_spacing' => 1.20,
                'water_needed' => 2.0,
                'description' => 'Vining plant that needs consistent moisture'
            ],
            [
                'name' => 'Lettuce',
                'type' => 'Vegetable',
                'plant_spacing' => 0.25,
                'row_spacing' => 0.30,
                'water_needed' => 0.5,
                'description' => 'Fast-growing leafy vegetable that prefers cool weather'
            ],
            [
                'name' => 'Bell Pepper',
                'type' => 'Vegetable',
                'plant_spacing' => 0.45,
                'row_spacing' => 0.60,
                'water_needed' => 1.0,
                'description' => 'Sweet pepper variety that needs warm weather'
            ],
            [
                'name' => 'Strawberry',
                'type' => 'Fruit',
                'plant_spacing' => 0.30,
                'row_spacing' => 0.90,
                'water_needed' => 0.8,
                'description' => 'Perennial fruit plant that spreads through runners'
            ]
        ];

        foreach ($plants as $plant) {
            PlantType::create($plant);
        }
    }
}
