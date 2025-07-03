<?php
// app/Models/EquipmentAttribute.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentAttribute extends Model
{
    use HasFactory;

    protected $table = 'equipment_attributes';

    protected $fillable = [
        'category_id',
        'attribute_name',
        'display_name',
        'data_type',
        'unit',
        'is_required',
        'validation_rules',
        'sort_order'
    ];

    protected $casts = [
        'validation_rules' => 'array',
        'is_required' => 'boolean'
    ];

    public function category()
    {
        return $this->belongsTo(EquipmentCategory::class, 'category_id');
    }

    public function values()
    {
        return $this->hasMany(EquipmentAttributeValue::class, 'attribute_id');
    }
}