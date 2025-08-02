<?php
// app/Http/Controllers/Api/EquipmentController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\EquipmentAttribute;
use App\Models\EquipmentAttributeValue;
use App\Models\EquipmentCategory;
use App\Models\PumpAccessory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class EquipmentController extends Controller
{
    // ==================================================
    // 🔧 EQUIPMENT METHODS
    // ==================================================

    public function getByCategoryId($id)
    {
        try {
            $equipments = Equipment::where('category_id', $id)
                ->with(['category', 'attributeValues.attribute', 'pumpAccessories'])
                ->where('is_active', 1)
                ->get();

            $formattedEquipments = $equipments->map(function ($equipment) {
                return $equipment->toCalculationFormat();
            });

            return response()->json($formattedEquipments);
        } catch (\Exception $e) {
            Log::error('Error in getByCategoryId: ' . $e->getMessage());
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

            if ($request->has('is_active')) {
                $isActive = $request->boolean('is_active');
                $query->where('is_active', $isActive ? 1 : 0);
            }

            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('product_code', 'like', "%{$searchTerm}%")
                      ->orWhere('brand', 'like', "%{$searchTerm}%")
                      ->orWhere('description', 'like', "%{$searchTerm}%");
                });
            }

            if ($request->has('per_page')) {
                $perPage = min($request->per_page, 100);
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
            Log::error('Error in index: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch equipments'], 500);
        }
    }

    public function store(Request $request)
    {
        $category = EquipmentCategory::with('attributes')->find($request->category_id);
        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        $rules = [
            'category_id' => 'required|exists:equipment_categories,id',
            'product_code' => 'nullable|string|max:100',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'image' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'attributes' => 'nullable|array',
        ];

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
                case 'json':
                    break;
                default:
                    break;
            }

            if (!empty($attributeRule)) {
                $rules["attributes.{$attribute->attribute_name}"] = implode('|', $attributeRule);
            }
        }

        if ($category->name === 'pump') {
            $rules['pump_accessories.*.equipment_id'] = 'nullable|exists:equipments,id';
            $rules['pump_accessories.*.product_code'] = 'nullable|string|max:100';
            $rules['pump_accessories.*.name'] = 'nullable|string|max:255';
            $rules['pump_accessories.*.image'] = 'nullable|string';
            $rules['pump_accessories.*.size'] = 'nullable|string|max:50';
            $rules['pump_accessories.*.price'] = 'nullable|numeric|min:0';
            $rules['pump_accessories.*.stock'] = 'nullable|integer|min:0';
            $rules['pump_accessories.*.quantity'] = 'nullable|integer|min:1';
            $rules['pump_accessories.*.is_included'] = 'nullable|boolean';
            $rules['pump_accessories.*.sort_order'] = 'nullable|integer';
            $rules['pump_accessories.*.description'] = 'nullable|string';
        }

        try {
            $validated = $request->validate($rules);
            
            $productCode = $validated['product_code'] ?? '';
            if (empty($productCode)) {
                $productCode = '-';
            }
            
            if ($productCode !== '-' && !Equipment::validateUniqueProductCode($productCode)) {
                return response()->json([
                    'error' => 'Validation failed',
                    'errors' => ['product_code' => ['รหัสสินค้านี้ถูกใช้แล้ว']]
                ], 422);
            }
            
            if ($category->name === 'pump' && isset($validated['pump_accessories'])) {
                $accessoryErrors = [];
                
                foreach ($validated['pump_accessories'] as $index => $accessoryData) {
                    if (!empty($accessoryData['equipment_id'])) {
                        continue;
                    }
                    
                    $hasName = !empty($accessoryData['name']);
                    $hasPrice = isset($accessoryData['price']) && $accessoryData['price'] >= 0;
                    
                    $isEmpty = empty($accessoryData['equipment_id']) && 
                               empty($accessoryData['name']) && 
                               empty($accessoryData['product_code']) &&
                               (!isset($accessoryData['price']) || $accessoryData['price'] == 0);
                    
                    if ($isEmpty) {
                        continue;
                    }
                    
                    if (!$hasName) {
                        $accessoryErrors["pump_accessories.{$index}.name"] = ['กรุณากรอกชื่ออุปกรณ์หรือเลือกจากรายการ'];
                    }
                    
                    if (!$hasPrice) {
                        $accessoryErrors["pump_accessories.{$index}.price"] = ['กรุณากรอกราคาที่ถูกต้อง'];
                    }
                }
                
                if (!empty($accessoryErrors)) {
                    return response()->json([
                        'error' => 'Validation failed',
                        'errors' => $accessoryErrors,
                        'debug' => [
                            'accessories_count' => count($validated['pump_accessories']),
                            'accessories_data' => $validated['pump_accessories']
                        ]
                    ], 422);
                }
            }
            
            $validated['product_code'] = $productCode;
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed: ' . json_encode($e->errors()));
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
                'input' => $request->all()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $equipment = Equipment::create([
                'category_id' => $validated['category_id'],
                'product_code' => $validated['product_code'],
                'name' => $validated['name'],
                'brand' => $validated['brand'] ?? null,
                'image' => $validated['image'] ?? null,
                'price' => $validated['price'],
                'stock' => $validated['stock'] ?? null,
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

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

            if ($category->name === 'pump' && isset($validated['pump_accessories'])) {
                foreach ($validated['pump_accessories'] as $index => $accessoryData) {
                    $isEmpty = empty($accessoryData['equipment_id']) && 
                               empty($accessoryData['name']) && 
                               empty($accessoryData['product_code']) &&
                               (!isset($accessoryData['price']) || $accessoryData['price'] == 0);
                    
                    if ($isEmpty) {
                        continue;
                    }
                    
                    $equipmentId = null;
                    $selectedEquipment = null;
                    
                    if (isset($accessoryData['equipment_id']) && $accessoryData['equipment_id']) {
                        $equipmentId = $accessoryData['equipment_id'];
                        $selectedEquipment = Equipment::find($equipmentId);
                    } elseif (isset($accessoryData['product_code']) && $accessoryData['product_code']) {
                        $selectedEquipment = Equipment::where('product_code', $accessoryData['product_code'])->first();
                        $equipmentId = $selectedEquipment ? $selectedEquipment->id : null;
                    }
                    
                    $accessoryToCreate = [
                        'pump_id' => $equipment->id,
                        'equipment_id' => $equipmentId,
                        'product_code' => $accessoryData['product_code'] ?? ($selectedEquipment ? $selectedEquipment->product_code : null),
                        'name' => $accessoryData['name'] ?? ($selectedEquipment ? $selectedEquipment->name : ''),
                        'image' => $accessoryData['image'] ?? ($selectedEquipment ? $selectedEquipment->image_url : null),
                        'size' => $accessoryData['size'] ?? null,
                        'price' => isset($accessoryData['price']) ? (float)$accessoryData['price'] : ($selectedEquipment ? $selectedEquipment->price : 0),
                        'stock' => isset($accessoryData['stock']) ? (int)$accessoryData['stock'] : ($selectedEquipment ? $selectedEquipment->stock : null),
                        'quantity' => isset($accessoryData['quantity']) ? (int)$accessoryData['quantity'] : 1,
                        'is_included' => isset($accessoryData['is_included']) ? (bool)$accessoryData['is_included'] : true,
                        'sort_order' => isset($accessoryData['sort_order']) ? (int)$accessoryData['sort_order'] : $index,
                        'description' => $accessoryData['description'] ?? ($selectedEquipment ? $selectedEquipment->description : null),
                    ];
                    
                    if (empty($accessoryToCreate['name'])) {
                        continue;
                    }
                    
                    PumpAccessory::create($accessoryToCreate);
                }
            }

            DB::commit();

            $equipment->load(['category', 'attributeValues.attribute', 'pumpAccessories']);
            return response()->json($equipment->toCalculationFormat(), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating equipment: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
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
            Log::error('Error showing equipment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to show equipment'], 500);
        }
    }

    public function update(Request $request, Equipment $equipment)
    {
        $category = EquipmentCategory::with('attributes')->find($request->category_id);
        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        $rules = [
            'category_id' => 'required|exists:equipment_categories,id',
            'product_code' => 'nullable|string|max:100',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'image' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'attributes' => 'nullable|array',
        ];

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
                case 'json':
                    break;
                default:
                    break;
            }

            if (!empty($attributeRule)) {
                $rules["attributes.{$attribute->attribute_name}"] = implode('|', $attributeRule);
            }
        }

        if ($category->name === 'pump') {
            $rules['pump_accessories'] = 'nullable|array';
            $rules['pump_accessories.*.equipment_id'] = 'nullable|exists:equipments,id';
            $rules['pump_accessories.*.product_code'] = 'nullable|string|max:100';
            $rules['pump_accessories.*.name'] = 'required|string|max:255';
            $rules['pump_accessories.*.image'] = 'nullable|string';
            $rules['pump_accessories.*.size'] = 'nullable|string|max:50';
            $rules['pump_accessories.*.price'] = 'required|numeric|min:0';
            $rules['pump_accessories.*.stock'] = 'nullable|integer|min:0';
            $rules['pump_accessories.*.quantity'] = 'required|integer|min:1';
            $rules['pump_accessories.*.is_included'] = 'nullable|boolean';
            $rules['pump_accessories.*.sort_order'] = 'nullable|integer';
            $rules['pump_accessories.*.description'] = 'nullable|string';
        }

        try {
            $validated = $request->validate($rules);
            
            $productCode = $validated['product_code'] ?? '';
            if (empty($productCode)) {
                $productCode = '-';
            }
            
            if ($productCode !== '-' && !Equipment::validateUniqueProductCode($productCode, $equipment->id)) {
                return response()->json([
                    'error' => 'Validation failed',
                    'errors' => ['product_code' => ['รหัสสินค้านี้ถูกใช้แล้ว']]
                ], 422);
            }
            
            $validated['product_code'] = $productCode;
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed: ' . json_encode($e->errors()));
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
                'input' => $request->all()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $equipment->update([
                'category_id' => $validated['category_id'],
                'product_code' => $validated['product_code'],
                'name' => $validated['name'],
                'brand' => $validated['brand'] ?? null,
                'image' => $validated['image'] ?? null,
                'price' => $validated['price'],
                'stock' => $validated['stock'] ?? null,
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $equipment->attributeValues()->delete();

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

            if ($category->name === 'pump') {
                $equipment->pumpAccessories()->delete();
                
                if (isset($validated['pump_accessories'])) {
                    foreach ($validated['pump_accessories'] as $index => $accessoryData) {
                        $equipmentId = null;
                        $selectedEquipment = null;
                        
                        if (isset($accessoryData['equipment_id']) && $accessoryData['equipment_id']) {
                            $equipmentId = $accessoryData['equipment_id'];
                            $selectedEquipment = Equipment::find($equipmentId);
                        } elseif (isset($accessoryData['product_code']) && $accessoryData['product_code']) {
                            $selectedEquipment = Equipment::where('product_code', $accessoryData['product_code'])->first();
                            $equipmentId = $selectedEquipment ? $selectedEquipment->id : null;
                        }
                        
                        PumpAccessory::create([
                            'pump_id' => $equipment->id,
                            'equipment_id' => $equipmentId,
                            'product_code' => $accessoryData['product_code'] ?? ($selectedEquipment ? $selectedEquipment->product_code : null),
                            'name' => $accessoryData['name'],
                            'image' => $accessoryData['image'] ?? ($selectedEquipment ? $selectedEquipment->image_url : null),
                            'size' => $accessoryData['size'] ?? null,
                            'price' => $accessoryData['price'] ?? ($selectedEquipment ? $selectedEquipment->price : 0),
                            'stock' => $accessoryData['stock'] ?? ($selectedEquipment ? $selectedEquipment->stock : null),
                            'quantity' => $accessoryData['quantity'] ?? 1,
                            'is_included' => isset($accessoryData['is_included']) ? (bool)$accessoryData['is_included'] : true,
                            'sort_order' => isset($accessoryData['sort_order']) ? (int)$accessoryData['sort_order'] : $index,
                            'description' => $accessoryData['description'] ?? ($selectedEquipment ? $selectedEquipment->description : null),
                        ]);
                    }
                }
            }

            DB::commit();

            $equipment->load(['category', 'attributeValues.attribute', 'pumpAccessories']);
            return response()->json($equipment->toCalculationFormat());

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating equipment: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
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

            $equipment->attributeValues()->delete();
            $equipment->pumpAccessories()->delete();

            if ($equipment->image) {
                $imagePath = str_replace('/storage/', '', $equipment->image);
                if (Storage::disk('public')->exists($imagePath)) {
                    Storage::disk('public')->delete($imagePath);
                }
            }

            $equipment->delete();

            DB::commit();

            return response()->json(['message' => 'Equipment deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting equipment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete equipment: ' . $e->getMessage()], 500);
        }
    }

    // ==================================================
    // 🔍 SEARCH & UTILITY METHODS
    // ==================================================

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
            Log::error('Error in getByCategory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch equipments by category'], 500);
        }
    }

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

            if ($request->filled('query')) {
                $searchTerm = $request->query;
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('product_code', 'like', "%{$searchTerm}%")
                      ->orWhere('brand', 'like', "%{$searchTerm}%")
                      ->orWhere('description', 'like', "%{$searchTerm}%");
                });
            }

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('min_price')) {
                $query->where('price', '>=', $request->min_price);
            }
            if ($request->filled('max_price')) {
                $query->where('price', '<=', $request->max_price);
            }

            if ($request->filled('brand')) {
                $query->where('brand', 'like', "%{$request->brand}%");
            }

            if ($request->has('is_active')) {
                $isActive = $request->boolean('is_active');
                $query->where('is_active', $isActive ? 1 : 0);
            }

            $perPage = $request->per_page ?? 20;
            $equipments = $query->paginate($perPage);

            $equipments->getCollection()->transform(function ($equipment) {
                return $equipment->toCalculationFormat();
            });

            return response()->json($equipments);
        } catch (\Exception $e) {
            Log::error('Error in search: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to search equipments'], 500);
        }
    }

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
            Log::error('Error getting stats: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get stats'], 500);
        }
    }

    public function validateProductCode(Request $request)
    {
        $request->validate([
            'product_code' => 'required|string',
            'exclude_id' => 'nullable|integer',
        ]);

        $productCode = $request->product_code;
        $excludeId = $request->exclude_id;

        if (empty($productCode) || $productCode === '-') {
            return response()->json(['is_valid' => true]);
        }

        $isValid = Equipment::validateUniqueProductCode($productCode, $excludeId);

        return response()->json(['is_valid' => $isValid]);
    }

    public function getPumpEquipments()
    {
        try {
            $pumpEquipmentCategory = EquipmentCategory::where('name', 'pump_equipment')->first();

            if (!$pumpEquipmentCategory) {
                return response()->json([]);
            }

            $equipments = Equipment::where('category_id', $pumpEquipmentCategory->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(function ($equipment) {
                    return [
                        'id' => $equipment->id,
                        'product_code' => $equipment->product_code,
                        'name' => $equipment->name,
                        'brand' => $equipment->brand,
                        'image' => $equipment->image_url,
                        'price' => $equipment->price,
                        'stock' => $equipment->stock,
                    ];
                });

            return response()->json($equipments);
        } catch (\Exception $e) {
            Log::error('Error getting pump equipments: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get pump equipments'], 500);
        }
    }

    // ==================================================
    // 🔄 BULK OPERATIONS
    // ==================================================

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
            Log::error('Error in bulk update: ' . $e->getMessage());
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

            EquipmentAttributeValue::whereIn('equipment_id', $request->ids)->delete();
            PumpAccessory::whereIn('pump_id', $request->ids)->delete();

            $deleted = Equipment::whereIn('id', $request->ids)->delete();

            DB::commit();

            return response()->json([
                'message' => "Deleted {$deleted} equipment(s) successfully"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in bulk delete: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to bulk delete: ' . $e->getMessage()], 500);
        }
    }

    // ==================================================
    // 🔧 PUMP ACCESSORIES METHODS (รวมจาก PumpAccessoryController)
    // ==================================================

    public function getPumpAccessories(Request $request)
    {
        try {
            $query = PumpAccessory::with(['pump']);
            
            if ($request->has('pump_id')) {
                $query->where('pump_id', $request->pump_id);
            }
            
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('size', 'like', "%{$searchTerm}%");
                });
            }
            
            $query->orderBy('pump_id')->orderBy('sort_order');
            
            $accessories = $query->get();
            
            return response()->json($accessories);
        } catch (\Exception $e) {
            Log::error('Error getting pump accessories: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get pump accessories'], 500);
        }
    }

    public function storePumpAccessory(Request $request)
    {
        $validated = $request->validate([
            'pump_id' => 'required|exists:equipments,id',
            'name' => 'required|string|max:255',
            'image' => 'nullable|string',
            'size' => 'nullable|string|max:50',
            'price' => 'required|numeric|min:0',
            'is_included' => 'boolean',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        try {
            $pump = Equipment::with('category')->find($validated['pump_id']);
            if (!$pump || $pump->category->name !== 'pump') {
                return response()->json(['error' => 'Equipment is not a pump'], 422);
            }

            if (!isset($validated['sort_order'])) {
                $maxSortOrder = PumpAccessory::where('pump_id', $validated['pump_id'])->max('sort_order');
                $validated['sort_order'] = ($maxSortOrder ?? -1) + 1;
            }

            $accessory = PumpAccessory::create($validated);
            
            $accessory->load('pump');
            
            return response()->json($accessory, 201);
        } catch (\Exception $e) {
            Log::error('Error creating pump accessory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create pump accessory: ' . $e->getMessage()], 500);
        }
    }

    public function showPumpAccessory(PumpAccessory $pumpAccessory)
    {
        try {
            $pumpAccessory->load('pump');
            return response()->json($pumpAccessory);
        } catch (\Exception $e) {
            Log::error('Error showing pump accessory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to show pump accessory'], 500);
        }
    }

    public function updatePumpAccessory(Request $request, PumpAccessory $pumpAccessory)
    {
        $validated = $request->validate([
            'pump_id' => 'required|exists:equipments,id',
            'name' => 'required|string|max:255',
            'image' => 'nullable|string',
            'size' => 'nullable|string|max:50',
            'price' => 'required|numeric|min:0',
            'is_included' => 'boolean',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        try {
            $pump = Equipment::with('category')->find($validated['pump_id']);
            if (!$pump || $pump->category->name !== 'pump') {
                return response()->json(['error' => 'Equipment is not a pump'], 422);
            }

            $pumpAccessory->update($validated);
            
            $pumpAccessory->load('pump');
            
            return response()->json($pumpAccessory);
        } catch (\Exception $e) {
            Log::error('Error updating pump accessory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update pump accessory: ' . $e->getMessage()], 500);
        }
    }

    public function destroyPumpAccessory(PumpAccessory $pumpAccessory)
    {
        try {
            $pumpAccessory->delete();
            
            return response()->json(['message' => 'Pump accessory deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting pump accessory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete pump accessory: ' . $e->getMessage()], 500);
        }
    }

    public function getAccessoriesByPump($pumpId)
    {
        try {
            $pump = Equipment::with('category')->find($pumpId);
            if (!$pump) {
                return response()->json(['error' => 'Pump not found'], 404);
            }
            
            if ($pump->category->name !== 'pump') {
                return response()->json(['error' => 'Equipment is not a pump'], 422);
            }

            $accessories = PumpAccessory::where('pump_id', $pumpId)
                ->orderBy('sort_order')
                ->get();
            
            return response()->json($accessories);
        } catch (\Exception $e) {
            Log::error('Error getting accessories by pump: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get accessories'], 500);
        }
    }

    public function updateAccessoriesSortOrder(Request $request)
    {
        $validated = $request->validate([
            'accessories' => 'required|array',
            'accessories.*.id' => 'required|exists:pump_accessories,id',
            'accessories.*.sort_order' => 'required|integer',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['accessories'] as $accessoryData) {
                PumpAccessory::where('id', $accessoryData['id'])
                    ->update(['sort_order' => $accessoryData['sort_order']]);
            }

            DB::commit();

            return response()->json(['message' => 'Sort order updated successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating sort order: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update sort order: ' . $e->getMessage()], 500);
        }
    }

    public function bulkDeleteAccessories(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:pump_accessories,id',
        ]);

        try {
            DB::beginTransaction();

            $deleted = PumpAccessory::whereIn('id', $validated['ids'])->delete();

            DB::commit();

            return response()->json([
                'message' => "Deleted {$deleted} accessory(ies) successfully"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error bulk deleting accessories: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to bulk delete accessories: ' . $e->getMessage()], 500);
        }
    }

    public function getAccessoryStats()
    {
        try {
            $stats = [
                'total_accessories' => PumpAccessory::count(),
                'total_value' => PumpAccessory::sum('price'),
                'included_count' => PumpAccessory::where('is_included', 1)->count(),
                'separate_count' => PumpAccessory::where('is_included', 0)->count(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Error getting accessory stats: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get stats'], 500);
        }
    }

    // ==================================================
    // 🖼️ IMAGE UPLOAD METHODS (รวมจาก ImageUploadController)
    // ==================================================

    public function uploadImage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            Log::error('Image validation failed', $validator->errors()->toArray());
            return response()->json([
                'error' => 'Invalid image file',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('image');
            
            $imagesPath = storage_path('app/public/images');
            if (!file_exists($imagesPath)) {
                mkdir($imagesPath, 0755, true);
            }
            
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            
            $path = $file->storeAs('images', $filename, 'public');
            
            $fullPath = storage_path('app/public/' . $path);
            if (!file_exists($fullPath)) {
                throw new \Exception('File was not created successfully');
            }
            
            chmod($fullPath, 0644);
            
            $url = Storage::url($path);
            
            Log::info('Image uploaded successfully', [
                'filename' => $filename,
                'path' => $path,
                'url' => $url,
                'file_exists' => file_exists($fullPath),
                'file_size' => file_exists($fullPath) ? filesize($fullPath) : 0
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Image uploaded successfully',
                'url' => $url,
                'path' => $path,
                'filename' => $filename,
                'full_path' => $fullPath,
                'file_exists' => file_exists($fullPath)
            ]);
            
        } catch (\Exception $e) {
            Log::error('Image upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to upload image: ' . $e->getMessage()
            ], 500);
        }
    }

    public function uploadMultipleImages(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'images' => 'required|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid image files',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $uploadedImages = [];
            
            $imagesPath = storage_path('app/public/images');
            if (!file_exists($imagesPath)) {
                mkdir($imagesPath, 0755, true);
            }
            
            foreach ($request->file('images') as $file) {
                $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('images', $filename, 'public');
                
                $fullPath = storage_path('app/public/' . $path);
                if (file_exists($fullPath)) {
                    chmod($fullPath, 0644);
                }
                
                $url = Storage::url($path);
                
                $uploadedImages[] = [
                    'url' => $url,
                    'path' => $path,
                    'filename' => $filename,
                    'original_name' => $file->getClientOriginalName(),
                    'size' => $file->getSize()
                ];
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Images uploaded successfully',
                'images' => $uploadedImages,
                'count' => count($uploadedImages)
            ]);
            
        } catch (\Exception $e) {
            Log::error('Multiple images upload failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to upload images: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteImage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Path is required',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $path = $request->path;
            
            $path = str_replace('/storage/', '', $path);
            
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
                
                Log::info('Image deleted successfully', ['path' => $path]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Image deleted successfully'
                ]);
            } else {
                return response()->json([
                    'error' => 'Image not found'
                ], 404);
            }
            
        } catch (\Exception $e) {
            Log::error('Image deletion failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to delete image: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getImageInfo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'path' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Path is required',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $path = $request->path;
            
            $path = str_replace('/storage/', '', $path);
            
            if (Storage::disk('public')->exists($path)) {
                $url = Storage::url($path);
                $size = Storage::disk('public')->size($path);
                $lastModified = Storage::disk('public')->lastModified($path);
                
                return response()->json([
                    'success' => true,
                    'image' => [
                        'url' => $url,
                        'path' => $path,
                        'size' => $size,
                        'last_modified' => date('Y-m-d H:i:s', $lastModified),
                        'exists' => true
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'image' => [
                        'path' => $path,
                        'exists' => false
                    ]
                ], 404);
            }
            
        } catch (\Exception $e) {
            Log::error('Get image info failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to get image info: ' . $e->getMessage()
            ], 500);
        }
    }

    public function listImages(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $perPage = min($request->get('per_page', 20), 100);
            
            $files = Storage::disk('public')->files('images');
            
            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            $images = collect($files)->filter(function ($file) use ($imageExtensions) {
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                return in_array($extension, $imageExtensions);
            })->map(function ($file) {
                return [
                    'url' => Storage::url($file),
                    'path' => $file,
                    'filename' => basename($file),
                    'size' => Storage::disk('public')->size($file),
                    'last_modified' => date('Y-m-d H:i:s', Storage::disk('public')->lastModified($file))
                ];
            })->sortByDesc('last_modified')->values();

            $total = $images->count();
            $offset = ($page - 1) * $perPage;
            $paginatedImages = $images->slice($offset, $perPage)->values();

            return response()->json([
                'success' => true,
                'images' => $paginatedImages,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage),
                    'from' => $offset + 1,
                    'to' => min($offset + $perPage, $total)
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('List images failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to list images: ' . $e->getMessage()
            ], 500);
        }
    }

    public function checkStorageInfo()
    {
        try {
            $info = [
                'storage_path' => storage_path('app/public'),
                'public_path' => public_path('storage'),
                'symlink_exists' => is_link(public_path('storage')),
                'symlink_target' => is_link(public_path('storage')) ? readlink(public_path('storage')) : null,
                'images_directory_exists' => is_dir(storage_path('app/public/images')),
                'images_directory_writable' => is_writable(storage_path('app/public/images')),
                'images_directory_permissions' => is_dir(storage_path('app/public/images')) ? 
                    substr(sprintf('%o', fileperms(storage_path('app/public/images'))), -4) : null,
            ];
            
            return response()->json([
                'success' => true,
                'storage_info' => $info
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to check storage: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==================================================
    // 🔧 HELPER METHODS
    // ==================================================

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

                default:  // string
                    return (string) $value;
            }
        } catch (\Exception $e) {
            Log::error('Error processing attribute value: ' . $e->getMessage());
            return $value;
        }
    }
}