<?php
// app\Models\FieldLayer.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FieldLayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'field_id',
        'type',
        'coordinates',
        'is_initial_map'
    ];

    protected $casts = [
        'coordinates' => 'array',
        'is_initial_map' => 'boolean'
    ];

    public function field()
    {
        return $this->belongsTo(Field::class);
    }
}
