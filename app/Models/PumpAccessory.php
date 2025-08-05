<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PumpAccessory extends Model
{
    use HasFactory;

    protected $fillable = [
        'pump_id',
        'product_code',
        'name',
        'image',
        'size',
        'price',
        'stock',
        'quantity',
        'is_included',
        'sort_order',
        'equipment_id',
        'description',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'quantity' => 'integer',
        'is_included' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $attributes = [
        'is_included' => true,
        'sort_order' => 0,
        'quantity' => 1,
        'price' => 0,
    ];

    public function equipment()
{
    return $this->belongsTo(Equipment::class, 'equipment_id');
}

    public function pump()
    {
        return $this->belongsTo(Equipment::class, 'pump_id');
    }

    public function getImageUrlAttribute()
    {
        if (!$this->image) {
            return null;
        }

        if (filter_var($this->image, FILTER_VALIDATE_URL)) {
            return $this->image;
        }

        if (str_starts_with($this->image, '/storage/')) {
            return $this->image;
        }

        if (str_starts_with($this->image, 'storage/')) {
            return '/' . $this->image;
        }

        if (str_starts_with($this->image, 'images/')) {
            return \Storage::url($this->image);
        }

        return \Storage::url('images/' . basename($this->image));
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }

    public function scopeIncluded($query)
    {
        return $query->where('is_included', true);
    }

    public function scopeOptional($query)
    {
        return $query->where('is_included', false);
    }
}