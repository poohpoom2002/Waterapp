<?php
// app\Models\PlantType.php
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
        'description',
    ];
} 