<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SprinklerProductImage extends Model
{
    protected $table = 'sprinkler_product_images';

    protected $fillable = ['sprinkler_product_id', 'url', 'position'];

    public function product()
    {
        return $this->belongsTo(SprinklerProduct::class);
    }
}
