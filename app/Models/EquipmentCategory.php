<?php
// app/Models/EquipmentCategory.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentCategory extends Model
{
    use HasFactory;

    protected $table = 'equipment_categories';

    protected $fillable = [
        'name',
        'display_name', 
        'description',
        'icon'
    ];

    public function attributes()
    {
        return $this->hasMany(EquipmentAttribute::class, 'category_id');
    }

    public function equipments()
    {
        return $this->hasMany(Equipment::class, 'category_id');
    }
}