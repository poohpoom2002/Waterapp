<?php
// app/Models/EquipmentAttributeValue.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentAttributeValue extends Model
{
    use HasFactory;

    protected $table = 'equipment_attribute_values';

    protected $fillable = [
        'equipment_id',
        'attribute_id',
        'value'
    ];

    protected $casts = [
        'value' => 'array'
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function attribute()
    {
        return $this->belongsTo(EquipmentAttribute::class, 'attribute_id');
    }
}