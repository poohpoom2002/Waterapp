<?php
// app\Models\Pipe.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'field_id',
        'field_zone_id',
        'type',
        'direction',
        'start_latitude',
        'start_longitude',
        'end_latitude',
        'end_longitude',
        'length',
        'plants_served',
        'water_flow',
        'pipe_diameter',
        'row_index',
        'col_index'
    ];

    protected $casts = [
        'start_latitude' => 'decimal:8',
        'start_longitude' => 'decimal:8',
        'end_latitude' => 'decimal:8',
        'end_longitude' => 'decimal:8',
        'length' => 'decimal:2',
        'water_flow' => 'decimal:2'
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
