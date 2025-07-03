<?php
// app/Models/Equipment.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Equipment extends Model
{
    use HasFactory;

    protected $table = 'equipments';

    protected $fillable = [
        'category_id',
        'product_code',
        'name',
        'brand',
        'image',
        'price',
        'description',
        'is_active'
    ];

    protected $casts = [
        'category_id' => 'integer',
        'price' => 'decimal:2',
        'is_active' => 'boolean'
    ];

    protected $appends = ['image_url'];

    public function category()
    {
        return $this->belongsTo(EquipmentCategory::class, 'category_id');
    }

    public function attributeValues()
    {
        return $this->hasMany(EquipmentAttributeValue::class, 'equipment_id');
    }

    public function pumpAccessories()
    {
        return $this->hasMany(PumpAccessory::class, 'pump_id');
    }

    // ปรับปรุง method สำหรับ attributes ให้แสดงผลได้ถูกต้อง
    public function getAttributesArray()
    {
        $result = [];
        foreach ($this->attributeValues as $value) {
            try {
                $attributeValue = json_decode($value->value, true);
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $attributeValue = $value->value;
                }
                
                // แปลงข้อมูลให้เหมาะสมกับการคำนวณ
                if (is_array($attributeValue)) {
                    if (count($attributeValue) === 2 && is_numeric($attributeValue[0]) && is_numeric($attributeValue[1])) {
                        $result[$value->attribute->attribute_name] = [(float)$attributeValue[0], (float)$attributeValue[1]];
                    } else {
                        $result[$value->attribute->attribute_name] = $attributeValue;
                    }
                } elseif (is_numeric($attributeValue)) {
                    $result[$value->attribute->attribute_name] = (float)$attributeValue;
                } else {
                    $result[$value->attribute->attribute_name] = $attributeValue;
                }
            } catch (\Exception $e) {
                $result[$value->attribute->attribute_name] = $value->value;
            }
        }
        return $result;
    }

    // เพิ่มฟังก์ชันสำหรับ format attributes ให้แสดงผลสวย
    public function getFormattedAttributes()
    {
        $formatted = [];
        foreach ($this->attributeValues as $value) {
            $attribute = $value->attribute;
            try {
                $attributeValue = json_decode($value->value, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $attributeValue = $value->value;
                }

                $formatted[] = [
                    'attribute_name' => $attribute->attribute_name,
                    'display_name' => $attribute->display_name,
                    'data_type' => $attribute->data_type,
                    'unit' => $attribute->unit,
                    'value' => $attributeValue,
                    'formatted_value' => $this->formatAttributeValue($attributeValue, $attribute),
                    'is_required' => $attribute->is_required,
                    'sort_order' => $attribute->sort_order
                ];
            } catch (\Exception $e) {
                $formatted[] = [
                    'attribute_name' => $attribute->attribute_name,
                    'display_name' => $attribute->display_name,
                    'data_type' => $attribute->data_type,
                    'unit' => $attribute->unit,
                    'value' => $value->value,
                    'formatted_value' => $value->value,
                    'is_required' => $attribute->is_required,
                    'sort_order' => $attribute->sort_order
                ];
            }
        }

        // Sort by sort_order
        usort($formatted, function($a, $b) {
            return $a['sort_order'] <=> $b['sort_order'];
        });

        return $formatted;
    }

    // ฟังก์ชันสำหรับ format ค่า attribute ให้แสดงผลสวย
    private function formatAttributeValue($value, $attribute)
    {
        if ($value === null || $value === '') {
            return '-';
        }

        switch ($attribute->data_type) {
            case 'array':
                if (is_array($value)) {
                    if (count($value) === 2 && is_numeric($value[0]) && is_numeric($value[1])) {
                        // Range values
                        $formatted = number_format($value[0], 2) . ' - ' . number_format($value[1], 2);
                        return $attribute->unit ? $formatted . ' ' . $attribute->unit : $formatted;
                    } else {
                        // Multiple values
                        $formatted = implode(', ', $value);
                        return $attribute->unit ? $formatted . ' ' . $attribute->unit : $formatted;
                    }
                }
                return $value;

            case 'number':
                $formatted = is_numeric($value) ? number_format((float)$value, 2) : $value;
                return $attribute->unit ? $formatted . ' ' . $attribute->unit : $formatted;

            case 'boolean':
                return $value ? 'ใช่' : 'ไม่ใช่';

            case 'json':
                if (is_array($value) || is_object($value)) {
                    return json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                }
                return $value;

            default:
                return $attribute->unit ? $value . ' ' . $attribute->unit : $value;
        }
    }

    // ปรับปรุง toCalculationFormat เพื่อให้สอดคล้องกับ static files
    public function toCalculationFormat()
{
    $attributes = $this->getAttributesArray();
    
    $baseData = [
        'id' => $this->id,
        'productCode' => $this->product_code,
        'product_code' => $this->product_code,
        'name' => $this->name,
        'brand' => $this->brand,
        'image' => $this->image_url,
        'price' => (float)$this->price,
        'is_active' => $this->is_active,
        'category_id' => $this->category_id,
        'categoryId' => $this->category_id, // เพื่อ backward compatibility
        'description' => $this->description,
        'created_at' => $this->created_at,
        'updated_at' => $this->updated_at,
    ];

    // รวม attributes เข้ากับข้อมูลพื้นฐาน
    $result = array_merge($baseData, $attributes);

    // เพิ่ม pump accessories ถ้าเป็นปั๊ม
    if ($this->category && $this->category->name === 'pump') {
        $result['pumpAccessories'] = $this->pumpAccessories->map(function($accessory) {
            return [
                'id' => $accessory->id,
                'accessory_type' => $accessory->accessory_type,
                'name' => $accessory->name,
                'image' => $accessory->image_url,  // เพิ่มฟิลด์ image_url
                'size' => $accessory->size,
                'specifications' => $accessory->specifications,
                'price' => (float)$accessory->price,
                'is_included' => $accessory->is_included,
                'sort_order' => $accessory->sort_order,
            ];
        })->toArray();

        // เพิ่ม legacy pumpAccessory field สำหรับ backward compatibility
        $result['pumpAccessory'] = $result['pumpAccessories'];
    }

    return $result;
}

    // ปรับปรุง toDetailedFormat สำหรับ CRUD
    public function toDetailedFormat()
{
    try {
        $result = [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'categoryId' => $this->category_id,
            'product_code' => $this->product_code,
            'productCode' => $this->product_code,
            'name' => $this->name,
            'brand' => $this->brand,
            'image' => $this->image_url,
            'price' => (float)$this->price,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'category' => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'display_name' => $this->category->display_name,
                'icon' => $this->category->icon,
                'attributes' => $this->category->attributes->map(function($attr) {
                    return [
                        'id' => $attr->id,
                        'attribute_name' => $attr->attribute_name,
                        'display_name' => $attr->display_name,
                        'data_type' => $attr->data_type,
                        'unit' => $attr->unit,
                        'is_required' => $attr->is_required,
                        'sort_order' => $attr->sort_order,
                    ];
                })->toArray()
            ] : null,
            'attributes' => $this->getStructuredAttributes(),
            'formatted_attributes' => $this->getFormattedAttributes(),
            'attributes_raw' => $this->getAttributesArray(),
            'pumpAccessories' => $this->category && $this->category->name === 'pump' 
                ? $this->pumpAccessories->map(function($accessory) {
                    return [
                        'id' => $accessory->id,
                        'accessory_type' => $accessory->accessory_type,
                        'name' => $accessory->name,
                        'image' => $accessory->image_url,  // เพิ่มฟิลด์ image_url
                        'size' => $accessory->size,
                        'specifications' => $accessory->specifications,
                        'price' => (float)$accessory->price,
                        'is_included' => $accessory->is_included,
                        'sort_order' => $accessory->sort_order,
                    ];
                })->sortBy('sort_order')->values()->toArray()
                : [],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        // Debug log for first few records
        if ($this->id <= 3) {
            \Log::info("Equipment toDetailedFormat for ID {$this->id}:", [
                'basic_data' => [
                    'id' => $this->id,
                    'name' => $this->name,
                    'product_code' => $this->product_code,
                    'category_id' => $this->category_id,
                    'is_active' => $this->is_active
                ],
                'relationships_loaded' => [
                    'category' => $this->relationLoaded('category'),
                    'attributeValues' => $this->relationLoaded('attributeValues'),
                    'pumpAccessories' => $this->relationLoaded('pumpAccessories')
                ]
            ]);
        }

        return $result;
    } catch (\Exception $e) {
        \Log::error("Error in toDetailedFormat for equipment ID {$this->id}: " . $e->getMessage());
        
        // Return minimal format in case of error
        return [
            'id' => $this->id,
            'name' => $this->name,
            'product_code' => $this->product_code,
            'price' => (float)$this->price,
            'error' => $e->getMessage()
        ];
    }
}

    // Helper method สำหรับ validation attributes
    public function validateAttributes()
    {
        $errors = [];
        $category = $this->category;
        
        if (!$category) return $errors;

        $requiredAttributes = $category->attributes()->where('is_required', true)->get();
        $currentAttributes = $this->getAttributesArray();

        foreach ($requiredAttributes as $attr) {
            if (!isset($currentAttributes[$attr->attribute_name]) || 
                $currentAttributes[$attr->attribute_name] === null || 
                $currentAttributes[$attr->attribute_name] === '') {
                $errors[] = "Required attribute '{$attr->display_name}' is missing";
            }
        }

        return $errors;
    }

    private function getStructuredAttributes()
    {
        $result = [];
        foreach ($this->attributeValues as $value) {
            try {
                $decodedValue = json_decode($value->value, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $decodedValue = $value->value;
                }
                
                $result[] = [
                    'attribute_id' => $value->attribute_id,
                    'attribute_name' => $value->attribute->attribute_name,
                    'display_name' => $value->attribute->display_name,
                    'data_type' => $value->attribute->data_type,
                    'unit' => $value->attribute->unit,
                    'value' => $decodedValue,
                    'formatted_value' => $this->formatAttributeValue($decodedValue, $value->attribute),
                    'is_required' => $value->attribute->is_required,
                    'sort_order' => $value->attribute->sort_order,
                ];
            } catch (\Exception $e) {
                continue;
            }
        }
        
        // Sort by sort_order
        usort($result, function($a, $b) {
            return $a['sort_order'] <=> $b['sort_order'];
        });
        
        return $result;
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

        if (str_starts_with($this->image, 'images/')) {
            return Storage::url($this->image);
        }

        return $this->image;
    }

    // เพิ่ม static methods สำหรับ bulk operations
    public static function bulkUpdateStatus($ids, $isActive)
    {
        return self::whereIn('id', $ids)->update(['is_active' => $isActive]);
    }

    public static function bulkDelete($ids)
    {
        // ลบ related data ก่อน
        EquipmentAttributeValue::whereIn('equipment_id', $ids)->delete();
        PumpAccessory::whereIn('pump_id', $ids)->delete();
        
        return self::whereIn('id', $ids)->delete();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', 1);
    }

    public function scopeByCategory($query, $categoryId)
    {
        return $query->where('category_id', $categoryId);
    }

    public function scopeByCategoryName($query, $categoryName)
    {
        return $query->whereHas('category', function($q) use ($categoryName) {
            $q->where('name', $categoryName);
        });
    }
}