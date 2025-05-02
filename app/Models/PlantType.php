<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlantType extends Model
{
    protected $fillable = [
        'name',
        'type',
        'plant_spacing',
        'row_spacing',
        'water_needed',
        'description'
    ];

    protected $casts = [
        'plant_spacing' => 'float',
        'row_spacing' => 'float',
        'water_needed' => 'float'
    ];

    public function farms()
    {
        return $this->hasMany(Farm::class);
    }
}
