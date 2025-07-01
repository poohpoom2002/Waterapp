<?php
// app/Models/PumpAccessory.php - ตรวจสอบและแก้ไข

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PumpAccessory extends Model
{
    use HasFactory;

    protected $fillable = [
        'pump_id',
        'accessory_type',
        'name',
        'image',           // ✅ ต้องมี
        'size',
        'specifications',
        'price',
        'is_included',
        'sort_order',
    ];

    protected $casts = [
        'specifications' => 'array',  // แปลง JSON เป็น array อัตโนมัติ
        'price' => 'decimal:2',
        'is_included' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $attributes = [
        'is_included' => true,
        'sort_order' => 0,
        'price' => 0,
    ];

    // Relationship กับ Equipment (pump)
    public function pump()
    {
        return $this->belongsTo(Equipment::class, 'pump_id');
    }

    // Accessor สำหรับ image URL
    public function getImageUrlAttribute()
    {
        if ($this->image && !str_starts_with($this->image, 'http')) {
            return url($this->image);
        }
        return $this->image;
    }

    // Scope สำหรับเรียงลำดับ
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }

    // Scope สำหรับ accessories ที่รวมในชุด
    public function scopeIncluded($query)
    {
        return $query->where('is_included', true);
    }

    // Scope สำหรับ accessories ที่แยกขาย
    public function scopeOptional($query)
    {
        return $query->where('is_included', false);
    }
}