<?php

namespace Database\Seeders;

use App\Models\Sprinkler;
use Illuminate\Database\Seeder;

class SprinklerSeeder extends Seeder
{
    public function run()
    {
        $sprinklers = [
            [
                'name' => 'Standard Rotor',
                'water_flow' => 20,
                'min_radius' => 5,
                'max_radius' => 15,
                'description' => 'Standard rotating sprinkler head, suitable for medium to large areas. Provides uniform water distribution.'
            ],
            [
                'name' => 'Micro Sprinkler',
                'water_flow' => 8,
                'min_radius' => 2,
                'max_radius' => 4,
                'description' => 'Low-flow sprinkler ideal for small areas and delicate plants. Provides gentle, targeted watering.'
            ],
            [
                'name' => 'Impact Sprinkler',
                'water_flow' => 30,
                'min_radius' => 8,
                'max_radius' => 20,
                'description' => 'High-flow sprinkler with adjustable radius. Best for large open areas and heavy watering needs.'
            ],
            [
                'name' => 'Drip Sprinkler',
                'water_flow' => 4,
                'min_radius' => 1,
                'max_radius' => 2,
                'description' => 'Ultra-low flow sprinkler for precise watering. Ideal for row crops and water-sensitive plants.'
            ]
        ];

        foreach ($sprinklers as $sprinkler) {
            Sprinkler::create($sprinkler);
        }
    }
} 