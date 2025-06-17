<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SprinklerProduct extends Model
{
    protected $table = 'sprinkler_product';

    protected $fillable = [
        'code', 'name', 'origin', 'brand', 'size',
        'special_features', 'spec', 'review', 'usage', 'maintenance', 'note'
    ];

    public function images()
    {
        return $this->hasMany(SprinklerProductImage::class);
    }
}
