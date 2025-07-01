<?php
// app/Http/Controllers/Api/EquipmentController.php - สมบูรณ์ที่แก้ไขแล้ว

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\EquipmentAttribute;
use App\Models\EquipmentAttributeValue;
use App\Models\PumpAccessory;
use App\Models\EquipmentCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentController extends Controller
{
    // แก้ไขการ filter active เป็น boolean ที่ถูกต้อง
    public function getByCategoryId($id)
    {
        try {
            $equipments = Equipment::where('category_id', $id)
                ->with(['category', 'attributeValues.attribute', 'pumpAccessories'])
                ->where('is_active', 1) // แก้ไขเป็น 1 แทน true
                ->get();

            $formattedEquipments = $equipments->map(function ($equipment) {
                return $equipment->toCalculationFormat();
            });

            return response()->json($formattedEquipments);
        } catch (\Exception $e) {
            error_log('Error in getByCategoryId: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch equipments'], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $query = Equipment::with(['category', 'attributeValues.attribute', 'pumpAccessories']);
            
            if ($request->has('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            
            // แก้ไขการ handle is_active
            if ($request->has('is_active')) {
                $isActive = $request->boolean('is_active');
                $query->where('is_active', $isActive ? 1 : 0);
            }

            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('product_code', 'like', "%{$searchTerm}%")
                      ->orWhere('brand', 'like', "%{$searchTerm}%")
                      ->orWhere('description', 'like', "%{$searchTerm}%");
                });
            }

            // Pagination support
            if ($request->has('per_page')) {
                $perPage = min($request->per_page, 100); // จำกัดไม่เกิน 100 รายการต่อหน้า
                $equipments = $query->paginate($perPage);
                
                $equipments->getCollection()->transform(function ($equipment) {
                    return $equipment->toCalculationFormat();
                });
            } else {
                $equipments = $query->get();
                
                $equipments = $equipments->map(function ($equipment) {
                    return $equipment->toCalculationFormat();
                });
            }

            return response()->json($equipments);
        } catch (\Exception $e) {
            error_log('Error in index: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch equipments'], 500);
        }
    }

    public function store(Request $request)
{
    // ดึงข้อมูล category และ attributes
    $category = EquipmentCategory::with('attributes')->find($request->category_id);
    if (!$category) {
        return response()->json(['error' => 'Category not found'], 404);
    }

    // สร้าง validation rules แบบ dynamic
    $rules = [
        'category_id' => 'required|exists:equipment_categories,id',
        'product_code' => 'required|string|max:100|unique:equipments',
        'name' => 'required|string|max:255',
        'brand' => 'nullable|string|max:100',
        'image' => 'nullable|string',
        'price' => 'required|numeric|min:0',
        'description' => 'nullable|string',
        'is_active' => 'nullable|boolean',
        'attributes' => 'nullable|array',
    ];

    // เพิ่ม validation rules สำหรับ attributes
    foreach ($category->attributes as $attribute) {
        $attributeRule = [];
        
        if ($attribute->is_required) {
            $attributeRule[] = 'required';
        } else {
            $attributeRule[] = 'nullable';
        }

        switch ($attribute->data_type) {
            case 'number':
                $attributeRule[] = 'numeric';
                break;
            case 'boolean':
                $attributeRule[] = 'boolean';
                break;
            case 'array':
                break;
            case 'json':
                break;
            default:
                break;
        }

        if (!empty($attributeRule)) {
            $rules["attributes.{$attribute->attribute_name}"] = implode('|', $attributeRule);
        }
    }

    // Validation rules สำหรับ pump accessories - แก้ไขให้ยืดหยุ่น
    if ($category->name === 'pump') {
        $rules['pump_accessories'] = 'nullable|array';
        $rules['pump_accessories.*.accessory_type'] = 'required|in:foot_valve,check_valve,ball_valve,pressure_gauge,other';
        $rules['pump_accessories.*.name'] = 'required|string|max:255';
        $rules['pump_accessories.*.image'] = 'nullable|string';
        $rules['pump_accessories.*.size'] = 'nullable|string|max:50';
        $rules['pump_accessories.*.specifications'] = 'nullable';
        $rules['pump_accessories.*.price'] = 'nullable|numeric|min:0';
        $rules['pump_accessories.*.is_included'] = 'nullable|boolean';
        $rules['pump_accessories.*.sort_order'] = 'nullable|integer';
    }

    try {
        $validated = $request->validate($rules);
    } catch (\Illuminate\Validation\ValidationException $e) {
        error_log('Validation failed: ' . json_encode($e->errors()));
        return response()->json([
            'error' => 'Validation failed',
            'errors' => $e->errors(),
            'input' => $request->all() // เพิ่มข้อมูล input เพื่อ debug
        ], 422);
    }

    try {
        DB::beginTransaction();

        // สร้าง Equipment
        $equipment = Equipment::create([
            'category_id' => $validated['category_id'],
            'product_code' => $validated['product_code'],
            'name' => $validated['name'],
            'brand' => $validated['brand'] ?? null,
            'image' => $validated['image'] ?? null,
            'price' => $validated['price'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // สร้าง Attribute Values
        if (isset($validated['attributes'])) {
            foreach ($validated['attributes'] as $attributeName => $value) {
                $attribute = $category->attributes->where('attribute_name', $attributeName)->first();

                if ($attribute && $value !== null && $value !== '') {
                    $processedValue = $this->processAttributeValue($value, $attribute->data_type);

                    EquipmentAttributeValue::create([
                        'equipment_id' => $equipment->id,
                        'attribute_id' => $attribute->id,
                        'value' => is_array($processedValue) || is_object($processedValue) 
                            ? json_encode($processedValue) 
                            : $processedValue,
                    ]);
                }
            }
        }

        // สร้าง Pump Accessories (ถ้าเป็นปั๊ม) - แก้ไขการจัดการ default values
        if ($category->name === 'pump' && isset($validated['pump_accessories'])) {
            foreach ($validated['pump_accessories'] as $index => $accessoryData) {
                // จัดการ specifications
                $specifications = null;
                if (isset($accessoryData['specifications'])) {
                    if (is_array($accessoryData['specifications']) && count($accessoryData['specifications']) > 0) {
                        $specifications = json_encode($accessoryData['specifications']);
                    } elseif (is_string($accessoryData['specifications']) && !empty($accessoryData['specifications'])) {
                        $specifications = $accessoryData['specifications'];
                    } elseif (is_object($accessoryData['specifications'])) {
                        $specifications = json_encode($accessoryData['specifications']);
                    }
                    // ถ้าเป็น array ว่างหรือ null ให้เป็น null
                }

                // สร้าง accessory พร้อม default values
                PumpAccessory::create([
                    'pump_id' => $equipment->id,
                    'accessory_type' => $accessoryData['accessory_type'],
                    'name' => $accessoryData['name'],
                    'image' => $accessoryData['image'] ?? null,
                    'size' => $accessoryData['size'] ?? null,
                    'specifications' => $specifications,
                    'price' => isset($accessoryData['price']) ? (float)$accessoryData['price'] : 0,
                    'is_included' => isset($accessoryData['is_included']) ? (bool)$accessoryData['is_included'] : true,
                    'sort_order' => isset($accessoryData['sort_order']) ? (int)$accessoryData['sort_order'] : $index,
                ]);
            }
        }

        DB::commit();

        $equipment->load(['category', 'attributeValues.attribute', 'pumpAccessories']);
        return response()->json($equipment->toCalculationFormat(), 201);

    } catch (\Exception $e) {
        DB::rollBack();
        error_log('Error creating equipment: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'error' => 'Failed to create equipment',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500);
    }
}

    public function show(Equipment $equipment)
    {
        try {
            $equipment->load(['category', 'attributeValues.attribute', 'pumpAccessories']);
            return response()->json($equipment->toCalculationFormat());
        } catch (\Exception $e) {
            error_log('Error showing equipment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to show equipment'], 500);
        }
    }

    public function update(Request $request, Equipment $equipment)
{
    // ดึงข้อมูล category และ attributes
    $category = EquipmentCategory::with('attributes')->find($request->category_id);
    if (!$category) {
        return response()->json(['error' => 'Category not found'], 404);
    }

    // สร้าง validation rules แบบ dynamic
    $rules = [
        'category_id' => 'required|exists:equipment_categories,id',
        'product_code' => 'required|string|max:100|unique:equipments,product_code,' . $equipment->id,
        'name' => 'required|string|max:255',
        'brand' => 'nullable|string|max:100',
        'image' => 'nullable|string',
        'price' => 'required|numeric|min:0',
        'description' => 'nullable|string',
        'is_active' => 'nullable|boolean',
        'attributes' => 'nullable|array',
    ];

    // เพิ่ม validation rules สำหรับ attributes
    foreach ($category->attributes as $attribute) {
        $attributeRule = [];
        
        if ($attribute->is_required) {
            $attributeRule[] = 'required';
        } else {
            $attributeRule[] = 'nullable';
        }

        switch ($attribute->data_type) {
            case 'number':
                $attributeRule[] = 'numeric';
                break;
            case 'boolean':
                $attributeRule[] = 'boolean';
                break;
            case 'array':
                break;
            case 'json':
                break;
            default:
                break;
        }

        if (!empty($attributeRule)) {
            $rules["attributes.{$attribute->attribute_name}"] = implode('|', $attributeRule);
        }
    }

    // Validation rules สำหรับ pump accessories - แก้ไขให้ยืดหยุ่น
    if ($category->name === 'pump') {
        $rules['pump_accessories'] = 'nullable|array';
        $rules['pump_accessories.*.accessory_type'] = 'required|in:foot_valve,check_valve,ball_valve,pressure_gauge,other';
        $rules['pump_accessories.*.name'] = 'required|string|max:255';
        $rules['pump_accessories.*.image'] = 'nullable|string';
        $rules['pump_accessories.*.size'] = 'nullable|string|max:50';
        $rules['pump_accessories.*.specifications'] = 'nullable';
        $rules['pump_accessories.*.price'] = 'nullable|numeric|min:0';
        $rules['pump_accessories.*.is_included'] = 'nullable|boolean';
        $rules['pump_accessories.*.sort_order'] = 'nullable|integer';
    }

    try {
        $validated = $request->validate($rules);
    } catch (\Illuminate\Validation\ValidationException $e) {
        error_log('Validation failed: ' . json_encode($e->errors()));
        return response()->json([
            'error' => 'Validation failed',
            'errors' => $e->errors(),
            'input' => $request->all() // เพิ่มข้อมูล input เพื่อ debug
        ], 422);
    }

    try {
        DB::beginTransaction();

        // อัพเดท Equipment
        $equipment->update([
            'category_id' => $validated['category_id'],
            'product_code' => $validated['product_code'],
            'name' => $validated['name'],
            'brand' => $validated['brand'] ?? null,
            'image' => $validated['image'] ?? null,
            'price' => $validated['price'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // ลบ Attribute Values เดิม
        $equipment->attributeValues()->delete();

        // สร้าง Attribute Values ใหม่
        if (isset($validated['attributes'])) {
            foreach ($validated['attributes'] as $attributeName => $value) {
                $attribute = $category->attributes->where('attribute_name', $attributeName)->first();

                if ($attribute && $value !== null && $value !== '') {
                    $processedValue = $this->processAttributeValue($value, $attribute->data_type);

                    EquipmentAttributeValue::create([
                        'equipment_id' => $equipment->id,
                        'attribute_id' => $attribute->id,
                        'value' => is_array($processedValue) || is_object($processedValue) 
                            ? json_encode($processedValue) 
                            : $processedValue,
                    ]);
                }
            }
        }

        // อัพเดท Pump Accessories - แก้ไขการจัดการ default values
        if ($category->name === 'pump') {
            $equipment->pumpAccessories()->delete();
            
            if (isset($validated['pump_accessories'])) {
                foreach ($validated['pump_accessories'] as $index => $accessoryData) {
                    // จัดการ specifications
                    $specifications = null;
                    if (isset($accessoryData['specifications'])) {
                        if (is_array($accessoryData['specifications']) && count($accessoryData['specifications']) > 0) {
                            $specifications = json_encode($accessoryData['specifications']);
                        } elseif (is_string($accessoryData['specifications']) && !empty($accessoryData['specifications'])) {
                            $specifications = $accessoryData['specifications'];
                        } elseif (is_object($accessoryData['specifications'])) {
                            $specifications = json_encode($accessoryData['specifications']);
                        }
                        // ถ้าเป็น array ว่างหรือ null ให้เป็น null
                    }

                    // สร้าง accessory พร้อม default values
                    PumpAccessory::create([
                        'pump_id' => $equipment->id,
                        'accessory_type' => $accessoryData['accessory_type'],
                        'name' => $accessoryData['name'],
                        'image' => $accessoryData['image'] ?? null,
                        'size' => $accessoryData['size'] ?? null,
                        'specifications' => $specifications,
                        'price' => isset($accessoryData['price']) ? (float)$accessoryData['price'] : 0,
                        'is_included' => isset($accessoryData['is_included']) ? (bool)$accessoryData['is_included'] : true,
                        'sort_order' => isset($accessoryData['sort_order']) ? (int)$accessoryData['sort_order'] : $index,
                    ]);
                }
            }
        }

        DB::commit();

        $equipment->load(['category', 'attributeValues.attribute', 'pumpAccessories']);
        return response()->json($equipment->toCalculationFormat());

    } catch (\Exception $e) {
        DB::rollBack();
        error_log('Error updating equipment: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'error' => 'Failed to update equipment',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500);
    }
}

    public function destroy(Equipment $equipment)
    {
        try {
            DB::beginTransaction();

            // ลบ attribute values และ pump accessories ที่เกี่ยวข้อง
            $equipment->attributeValues()->delete();
            $equipment->pumpAccessories()->delete();
            
            // ลบรูปภาพ (ถ้ามี)
            if ($equipment->image) {
                $imagePath = str_replace('/storage/', '', $equipment->image);
                if (\Storage::disk('public')->exists($imagePath)) {
                    \Storage::disk('public')->delete($imagePath);
                }
            }

            $equipment->delete();

            DB::commit();

            return response()->json(['message' => 'Equipment deleted successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Error deleting equipment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete equipment: ' . $e->getMessage()], 500);
        }
    }

    // API สำหรับดึงข้อมูลตามประเภท (เพื่อใช้ใน calculation)
    public function getByCategory($categoryName)
    {
        try {
            $equipments = Equipment::whereHas('category', function ($query) use ($categoryName) {
                $query->where('name', $categoryName);
            })
            ->with(['category', 'attributeValues.attribute', 'pumpAccessories'])
            ->where('is_active', 1)
            ->get();

            $formattedEquipments = $equipments->map(function ($equipment) {
                return $equipment->toCalculationFormat();
            });

            return response()->json($formattedEquipments);
        } catch (\Exception $e) {
            error_log('Error in getByCategory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch equipments by category'], 500);
        }
    }

    // API สำหรับดึงสถิติ
    public function getStats()
    {
        try {
            $stats = [
                'total_equipments' => Equipment::count(),
                'active_equipments' => Equipment::where('is_active', 1)->count(),
                'inactive_equipments' => Equipment::where('is_active', 0)->count(),
                'categories_count' => EquipmentCategory::count(),
                'by_category' => Equipment::join('equipment_categories', 'equipments.category_id', '=', 'equipment_categories.id')
                    ->selectRaw('equipment_categories.display_name, COUNT(*) as count')
                    ->groupBy('equipment_categories.id', 'equipment_categories.display_name')
                    ->get(),
                'total_value' => Equipment::where('is_active', 1)->sum('price'),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            error_log('Error getting stats: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get stats'], 500);
        }
    }

    // API สำหรับการค้นหาแบบ advanced
    public function search(Request $request)
    {
        $request->validate([
            'query' => 'nullable|string|max:255',
            'category_id' => 'nullable|exists:equipment_categories,id',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'brand' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            $query = Equipment::with(['category', 'attributeValues.attribute', 'pumpAccessories']);

            // ค้นหาทั่วไป
            if ($request->filled('query')) {
                $searchTerm = $request->query;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('product_code', 'like', "%{$searchTerm}%")
                      ->orWhere('brand', 'like', "%{$searchTerm}%")
                      ->orWhere('description', 'like', "%{$searchTerm}%");
                });
            }

            // กรองตามหมวดหมู่
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            // กรองตามช่วงราคา
            if ($request->filled('min_price')) {
                $query->where('price', '>=', $request->min_price);
            }
            if ($request->filled('max_price')) {
                $query->where('price', '<=', $request->max_price);
            }

            // กรองตามแบรนด์
            if ($request->filled('brand')) {
                $query->where('brand', 'like', "%{$request->brand}%");
            }

            // กรองตามสถานะ
            if ($request->has('is_active')) {
                $isActive = $request->boolean('is_active');
                $query->where('is_active', $isActive ? 1 : 0);
            }

            // Pagination
            $perPage = $request->per_page ?? 20;
            $equipments = $query->paginate($perPage);

            // แปลงข้อมูลเป็น calculation format
            $equipments->getCollection()->transform(function ($equipment) {
                return $equipment->toCalculationFormat();
            });

            return response()->json($equipments);
        } catch (\Exception $e) {
            error_log('Error in search: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to search equipments'], 500);
        }
    }

    // Helper method สำหรับประมวลผล attribute value
    private function processAttributeValue($value, $dataType)
    {
        try {
            switch ($dataType) {
                case 'number':
                    return is_numeric($value) ? (float) $value : 0;
                    
                case 'boolean':
                    return (bool) $value;
                    
                case 'array':
                    if (is_array($value)) {
                        return $value;
                    } elseif (is_string($value)) {
                        // แปลง string เป็น array สำหรับ range values
                        if (strpos($value, ',') !== false) {
                            return array_map('trim', explode(',', $value));
                        } elseif (strpos($value, '-') !== false && !str_starts_with($value, '-')) {
                            $parts = explode('-', $value);
                            if (count($parts) === 2) {
                                return [trim($parts[0]), trim($parts[1])];
                            }
                        }
                        return [$value];
                    }
                    return $value;
                    
                case 'json':
                    if (is_array($value) || is_object($value)) {
                        return $value;
                    } elseif (is_string($value)) {
                        $decoded = json_decode($value, true);
                        return $decoded !== null ? $decoded : $value;
                    }
                    return $value;
                    
                default: // string
                    return (string) $value;
            }
        } catch (\Exception $e) {
            error_log('Error processing attribute value: ' . $e->getMessage());
            return $value; // คืนค่าดิบถ้าไม่สามารถประมวลผลได้
        }
    }

    // API สำหรับ bulk operations
    public function bulkUpdate(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:equipments,id',
            'updates' => 'required|array',
            'updates.is_active' => 'nullable|boolean',
            'updates.price' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            $updates = $request->updates;
            
            // แปลง boolean เป็น integer สำหรับ database
            if (isset($updates['is_active'])) {
                $updates['is_active'] = $updates['is_active'] ? 1 : 0;
            }

            $updated = Equipment::whereIn('id', $request->ids)
                ->update(array_filter($updates));

            DB::commit();

            return response()->json([
                'message' => "Updated {$updated} equipment(s) successfully"
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Error in bulk update: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to bulk update: ' . $e->getMessage()], 500);
        }
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:equipments,id',
        ]);

        try {
            DB::beginTransaction();

            // ลบ related data ก่อน
            EquipmentAttributeValue::whereIn('equipment_id', $request->ids)->delete();
            PumpAccessory::whereIn('pump_id', $request->ids)->delete();

            // ลบ equipments
            $deleted = Equipment::whereIn('id', $request->ids)->delete();

            DB::commit();

            return response()->json([
                'message' => "Deleted {$deleted} equipment(s) successfully"
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Error in bulk delete: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to bulk delete: ' . $e->getMessage()], 500);
        }
    }
}