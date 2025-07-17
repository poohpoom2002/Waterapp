<?php
// app\Models\FieldZone.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FieldZone extends Model
{
    use HasFactory;

    protected $fillable = [
        'field_id',
        'name',
        'polygon_coordinates',
        'color',
        'pipe_direction'
    ];

    protected $casts = [
        'polygon_coordinates' => 'array'
    ];

    public function field()
    {
        return $this->belongsTo(Field::class);
    }

    public function plantingPoints()
    {
        return $this->hasMany(PlantingPoint::class);
    }

    public function pipes()
    {
        return $this->hasMany(Pipe::class);
    }
}
