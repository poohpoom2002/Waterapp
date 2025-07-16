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
        if (!$this->image) {
            return null;
        }

        // ถ้าเป็น URL เต็มแล้ว
        if (filter_var($this->image, FILTER_VALIDATE_URL)) {
            return $this->image;
        }

        // ถ้าเริ่มด้วย /storage/ แล้ว
        if (str_starts_with($this->image, '/storage/')) {
            return $this->image;
        }

        // ถ้าเริ่มด้วย storage/ (ไม่มี /)
        if (str_starts_with($this->image, 'storage/')) {
            return '/' . $this->image;
        }

        // ถ้าเป็น path ที่เริ่มด้วย images/
        if (str_starts_with($this->image, 'images/')) {
            return \Storage::url($this->image);
        }

        // ถ้าไม่มี path prefix ให้เพิ่ม
        return \Storage::url('images/' . basename($this->image));
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