<?php
// app\Models\PlantingPoint.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlantingPoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'field_id',
        'field_zone_id',
        'latitude',
        'longitude',
        'point_id'
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8'
    ];

    public function field()
    {
        return $this->belongsTo(Field::class);
    }

    public function zone()
    {
        return $this->belongsTo(FieldZone::class, 'field_zone_id');
    }
}
