<?php

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
        'stock',
        'description',
        'is_active'
    ];

    protected $casts = [
        'category_id' => 'integer',
        'price' => 'decimal:2',
        'stock' => 'integer',
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

    public static function validateUniqueProductCode($productCode, $excludeId = null)
    {
        if (empty($productCode) || $productCode === '-' || $productCode === null) {
            return true;
        }

        $query = self::where('product_code', $productCode)
                     ->where('product_code', '!=', '')
                     ->where('product_code', '!=', '-')
                     ->whereNotNull('product_code');
                     
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        $count = $query->count();
        
        // Log for debugging
        \Log::info('Product code validation', [
            'product_code' => $productCode,
            'exclude_id' => $excludeId,
            'count' => $count,
            'is_valid' => $count === 0
        ]);
        
        return $count === 0;
    }

    public function getAttributesArray()
    {
        $result = [];
        foreach ($this->attributeValues as $value) {
            try {
                $attributeValue = json_decode($value->value, true);
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $attributeValue = $value->value;
                }
                
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

        usort($formatted, function($a, $b) {
            return $a['sort_order'] <=> $b['sort_order'];
        });

        return $formatted;
    }

    private function formatAttributeValue($value, $attribute)
    {
        if ($value === null || $value === '') {
            return '-';
        }

        switch ($attribute->data_type) {
            case 'array':
                if (is_array($value)) {
                    if (count($value) === 2 && is_numeric($value[0]) && is_numeric($value[1])) {
                        $formatted = number_format($value[0], 2) . ' - ' . number_format($value[1], 2);
                        return $attribute->unit ? $formatted . ' ' . $attribute->unit : $formatted;
                    } else {
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
        'stock' => $this->stock,
        'is_active' => $this->is_active,
        'category_id' => $this->category_id,
        'categoryId' => $this->category_id,
        'description' => $this->description,
        'created_at' => $this->created_at,
        'updated_at' => $this->updated_at,
    ];

    $result = array_merge($baseData, $attributes);

    if ($this->category && $this->category->name === 'pump') {
        $result['pumpAccessories'] = $this->pumpAccessories->map(function($accessory) {
            return [
                'id' => $accessory->id,
                'product_code' => $accessory->product_code,
                'name' => $accessory->name,
                'image' => $accessory->image_url,
                'size' => $accessory->size,
                'price' => (float)$accessory->price,
                'stock' => $accessory->stock,
                'quantity' => $accessory->quantity,
                'is_included' => $accessory->is_included,
                'sort_order' => $accessory->sort_order,
                'description' => $accessory->description, // ⭐ เพิ่มบรรทัดนี้
                'equipment_id' => $accessory->equipment_id,
            ];
        })->toArray();

        $result['pumpAccessory'] = $result['pumpAccessories'];
    }

    return $result;
}

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
                'stock' => $this->stock,
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
                            'product_code' => $accessory->product_code,
                            'name' => $accessory->name,
                            'image' => $accessory->image_url,
                            'size' => $accessory->size,
                            'price' => (float)$accessory->price,
                            'stock' => $accessory->stock,
                            'quantity' => $accessory->quantity,
                            'is_included' => $accessory->is_included,
                            'sort_order' => $accessory->sort_order,
                            'description' => $accessory->description,
                            'equipment_id' => $accessory->equipment_id,
                        ];
                    })->sortBy('sort_order')->values()->toArray()
                    : [],
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
            ];

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
            
            return [
                'id' => $this->id,
                'name' => $this->name,
                'product_code' => $this->product_code,
                'price' => (float)$this->price,
                'error' => $e->getMessage()
            ];
        }
    }

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

        if (str_starts_with($this->image, 'storage/')) {
            return '/' . $this->image;
        }

        if (str_starts_with($this->image, 'images/')) {
            return Storage::url($this->image);
        }

        return Storage::url('images/' . basename($this->image));
    }

    public static function bulkUpdateStatus($ids, $isActive)
    {
        return self::whereIn('id', $ids)->update(['is_active' => $isActive]);
    }

    public static function bulkDelete($ids)
    {
        EquipmentAttributeValue::whereIn('equipment_id', $ids)->delete();
        PumpAccessory::whereIn('pump_id', $ids)->delete();
        
        return self::whereIn('id', $ids)->delete();
    }

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