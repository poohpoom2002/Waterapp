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
                'name' => 'Mango',
                'type' => 'Horticultural',
                'plant_spacing' => 10,
                'row_spacing' => 10,
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