<?php
// app\Models\Field.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Field extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'customer_name',
        'user_id',
        'folder_id',
        'category',
        'status',
        'is_completed',
        'area_coordinates',
        'plant_type_id',
        'total_plants',
        'total_area',
        'total_water_need',
        'area_type'
    ];

    protected $casts = [
        'area_coordinates' => 'array',
        'total_area' => 'float',
        'total_water_need' => 'float'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }

    public function plantType()
    {
        return $this->belongsTo(PlantType::class);
    }

    public function zones()
    {
        return $this->hasMany(FieldZone::class);
    }

    public function plantingPoints()
    {
        return $this->hasMany(PlantingPoint::class);
    }

    public function pipes()
    {
        return $this->hasMany(Pipe::class);
    }

    public function layers()
    {
        return $this->hasMany(FieldLayer::class);
    }
}
