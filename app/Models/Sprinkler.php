<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sprinkler extends Model
{
    protected $fillable = [
        'name',
        'water_flow',
        'min_radius',
        'max_radius',
        'description'
    ];

    protected $casts = [
        'water_flow' => 'float',
        'min_radius' => 'float',
        'max_radius' => 'float'
    ];
} 