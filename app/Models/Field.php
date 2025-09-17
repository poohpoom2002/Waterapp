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
        'area_type',
        'zone_inputs',
        'selected_pipes',
        'selected_pump',
        'zone_sprinklers',
        'zone_operation_mode',
        'zone_operation_groups',
        'project_data',
        'project_stats',
        'effective_equipment',
        'zone_calculation_data',
        'project_mode',
        'active_zone_id',
        'show_pump_option',
        'quotation_data',
        'quotation_data_customer',
        'garden_data',
        'garden_stats',
        'field_crop_data',
        'greenhouse_data',
        'last_saved',
        'project_image',
        'project_image_type'
    ];

    protected $casts = [
        'area_coordinates' => 'array',
        'zone_inputs' => 'array',
        'selected_pipes' => 'array',
        'selected_pump' => 'array',
        'zone_sprinklers' => 'array',
        'zone_operation_groups' => 'array',
        'project_data' => 'array',
        'project_stats' => 'array',
        'effective_equipment' => 'array',
        'zone_calculation_data' => 'array',
        'quotation_data' => 'array',
        'quotation_data_customer' => 'array',
        'garden_data' => 'array',
        'garden_stats' => 'array',
        'field_crop_data' => 'array',
        'greenhouse_data' => 'array',
        'total_area' => 'float',
        'total_water_need' => 'float',
        'show_pump_option' => 'boolean',
        'last_saved' => 'datetime'
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
