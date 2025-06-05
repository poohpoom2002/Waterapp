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
                'name' => 'Mango Tree',
                'type' => 'Fruit Tree',
                'plant_spacing' => 8.0,
                'row_spacing' => 10.0,
                'water_needed' => 20.0,
                'description' => 'Large tropical fruit tree that can grow up to 30 meters tall. Requires well-draining soil and regular watering during dry periods.',
            ],
            [
                'name' => 'Durian Tree',
                'type' => 'Fruit Tree',
                'plant_spacing' => 10.0,
                'row_spacing' => 12.0,
                'water_needed' => 25.0,
                'description' => 'Known as the "King of Fruits". Large tree requiring significant space and regular watering. Can grow up to 40 meters tall.',
            ],
            [
                'name' => 'Coconut Palm',
                'type' => 'Palm Tree',
                'plant_spacing' => 7.0,
                'row_spacing' => 9.0,
                'water_needed' => 15.0,
                'description' => 'Tropical palm tree that can reach heights of 30 meters. Requires full sun and regular watering, especially in sandy soils.',
            ],
            [
                'name' => 'Papaya Tree',
                'type' => 'Fruit Tree',
                'plant_spacing' => 3.0,
                'row_spacing' => 4.0,
                'water_needed' => 10.0,
                'description' => 'Fast-growing tropical tree that can reach 10 meters. Requires regular watering and well-draining soil.',
            ],
            [
                'name' => 'Banana Plant',
                'type' => 'Fruit Tree',
                'plant_spacing' => 3.0,
                'row_spacing' => 4.0,
                'water_needed' => 12.0,
                'description' => 'Large herbaceous plant that can grow up to 7 meters. Requires regular watering and protection from strong winds.',
            ],
            // Keep some vegetables for variety
            [
                'name' => 'Tomato',
                'type' => 'Vegetable',
                'plant_spacing' => 0.45,
                'row_spacing' => 0.90,
                'water_needed' => 1.5,
                'description' => '',
            ],
            [
                'name' => 'Durian',
                'type' => 'Horticultural',
                'plant_spacing' => 12,
                'row_spacing' => 12,
                'water_needed' => 2.0,
                'description' => '',
            ],
            [
                'name' => 'Pineapple',
                'type' => 'Horticultural',
                'plant_spacing' => 11,
                'row_spacing' => 11,
                'water_needed' => 0.5,
                'description' => '',
            ],
            [
                'name' => 'Mangosteen',
                'type' => 'Horticultural',
                'plant_spacing' => 12,
                'row_spacing' => 12,
                'water_needed' => 1.0,
                'description' => '',
            ],
            [
                'name' => 'Longkong',
                'type' => 'Horticultural',
                'plant_spacing' => 10,
                'row_spacing' => 10,
                'water_needed' => 0.3,
                'description' => '',
            ],
        ];

        foreach ($plants as $plant) {
            PlantType::create($plant);
        }
    }
} 