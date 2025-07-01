<?php
// app/Http/Controllers/Api/EquipmentCategoryController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipmentCategory;
use App\Models\EquipmentAttribute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentCategoryController extends Controller
{
    public function index()
    {
        try {
            $categories = EquipmentCategory::with(['attributes'])
                ->withCount('equipments')
                ->orderBy('name')
                ->get();
            
            return response()->json($categories);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to get categories: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:equipment_categories|regex:/^[a-z0-9_]+$/',
            'display_name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'attributes' => 'nullable|array',
            'attributes.*.attribute_name' => 'required_with:attributes|string|max:50',
            'attributes.*.display_name' => 'required_with:attributes|string|max:100',
            'attributes.*.data_type' => 'required_with:attributes|in:string,number,array,boolean,json',
            'attributes.*.unit' => 'nullable|string|max:20',
            'attributes.*.is_required' => 'nullable|boolean',
            'attributes.*.validation_rules' => 'nullable|array',
            'attributes.*.sort_order' => 'nullable|integer',
        ], [
            'name.regex' => 'ชื่อระบบต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และ underscore เท่านั้น',
            'name.unique' => 'ชื่อระบบนี้มีอยู่แล้ว',
        ]);

        try {
            DB::beginTransaction();

            $category = EquipmentCategory::create([
                'name' => $validated['name'],
                'display_name' => $validated['display_name'],
                'description' => $validated['description'] ?? null,
                'icon' => $validated['icon'] ?? null,
            ]);

            // สร้าง attributes ถ้ามี
            if (isset($validated['attributes'])) {
                foreach ($validated['attributes'] as $index => $attributeData) {
                    EquipmentAttribute::create([
                        'category_id' => $category->id,
                        'attribute_name' => $attributeData['attribute_name'],
                        'display_name' => $attributeData['display_name'],
                        'data_type' => $attributeData['data_type'],
                        'unit' => $attributeData['unit'] ?? null,
                        'is_required' => $attributeData['is_required'] ?? false,
                        'validation_rules' => $attributeData['validation_rules'] ?? null,
                        'sort_order' => $attributeData['sort_order'] ?? $index,
                    ]);
                }
            }

            DB::commit();

            $category->load(['attributes', 'equipments']);
            return response()->json($category, 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create category: ' . $e->getMessage()], 500);
        }
    }

    public function show(EquipmentCategory $equipmentCategory)
    {
        $equipmentCategory->load(['attributes' => function($query) {
            $query->orderBy('sort_order');
        }, 'equipments']);
        
        return response()->json($equipmentCategory);
    }

    public function update(Request $request, EquipmentCategory $equipmentCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|regex:/^[a-z0-9_]+$/|unique:equipment_categories,name,' . $equipmentCategory->id,
            'display_name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'attributes' => 'nullable|array',
            'attributes.*.id' => 'nullable|integer|exists:equipment_attributes,id',
            'attributes.*.attribute_name' => 'required_with:attributes|string|max:50',
            'attributes.*.display_name' => 'required_with:attributes|string|max:100',
            'attributes.*.data_type' => 'required_with:attributes|in:string,number,array,boolean,json',
            'attributes.*.unit' => 'nullable|string|max:20',
            'attributes.*.is_required' => 'nullable|boolean',
            'attributes.*.validation_rules' => 'nullable|array',
            'attributes.*.sort_order' => 'nullable|integer',
        ], [
            'name.regex' => 'ชื่อระบบต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และ underscore เท่านั้น',
            'name.unique' => 'ชื่อระบบนี้มีอยู่แล้ว',
        ]);

        try {
            DB::beginTransaction();

            $equipmentCategory->update([
                'name' => $validated['name'],
                'display_name' => $validated['display_name'],
                'description' => $validated['description'] ?? null,
                'icon' => $validated['icon'] ?? null,
            ]);

            // จัดการ attributes
            if (isset($validated['attributes'])) {
                $submittedAttributeIds = [];
                
                foreach ($validated['attributes'] as $index => $attributeData) {
                    if (isset($attributeData['id'])) {
                        // อัพเดท attribute ที่มีอยู่
                        $attribute = EquipmentAttribute::find($attributeData['id']);
                        if ($attribute && $attribute->category_id === $equipmentCategory->id) {
                            $attribute->update([
                                'attribute_name' => $attributeData['attribute_name'],
                                'display_name' => $attributeData['display_name'],
                                'data_type' => $attributeData['data_type'],
                                'unit' => $attributeData['unit'] ?? null,
                                'is_required' => $attributeData['is_required'] ?? false,
                                'validation_rules' => $attributeData['validation_rules'] ?? null,
                                'sort_order' => $attributeData['sort_order'] ?? $index,
                            ]);
                            $submittedAttributeIds[] = $attribute->id;
                        }
                    } else {
                        // สร้าง attribute ใหม่
                        $newAttribute = EquipmentAttribute::create([
                            'category_id' => $equipmentCategory->id,
                            'attribute_name' => $attributeData['attribute_name'],
                            'display_name' => $attributeData['display_name'],
                            'data_type' => $attributeData['data_type'],
                            'unit' => $attributeData['unit'] ?? null,
                            'is_required' => $attributeData['is_required'] ?? false,
                            'validation_rules' => $attributeData['validation_rules'] ?? null,
                            'sort_order' => $attributeData['sort_order'] ?? $index,
                        ]);
                        $submittedAttributeIds[] = $newAttribute->id;
                    }
                }

                // ลบ attributes ที่ไม่ได้ส่งมา
                EquipmentAttribute::where('category_id', $equipmentCategory->id)
                    ->whereNotIn('id', $submittedAttributeIds)
                    ->delete();
            } else {
                // ถ้าไม่มี attributes ให้ลบทั้งหมด
                EquipmentAttribute::where('category_id', $equipmentCategory->id)->delete();
            }

            DB::commit();

            $equipmentCategory->load(['attributes' => function($query) {
                $query->orderBy('sort_order');
            }, 'equipments']);
            
            return response()->json($equipmentCategory);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update category: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(EquipmentCategory $equipmentCategory)
    {
        try {
            // ตรวจสอบว่ามีอุปกรณ์ในหมวดหมู่นี้หรือไม่
            if ($equipmentCategory->equipments()->exists()) {
                return response()->json([
                    'error' => 'ไม่สามารถลบหมวดหมู่ที่มีอุปกรณ์อยู่ได้ กรุณาลบอุปกรณ์ในหมวดหมู่นี้ก่อน'
                ], 422);
            }

            $equipmentCategory->delete();
            return response()->json(['message' => 'Category deleted successfully']);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete category: ' . $e->getMessage()], 500);
        }
    }

    // API เพิ่มเติมสำหรับจัดการ attributes
    public function getAttributes(EquipmentCategory $equipmentCategory)
    {
        $attributes = $equipmentCategory->attributes()->orderBy('sort_order')->get();
        return response()->json($attributes);
    }

    public function addAttribute(Request $request, EquipmentCategory $equipmentCategory)
    {
        $validated = $request->validate([
            'attribute_name' => 'required|string|max:50|unique:equipment_attributes,attribute_name,NULL,id,category_id,' . $equipmentCategory->id,
            'display_name' => 'required|string|max:100',
            'data_type' => 'required|in:string,number,array,boolean,json',
            'unit' => 'nullable|string|max:20',
            'is_required' => 'nullable|boolean',
            'validation_rules' => 'nullable|array',
            'sort_order' => 'nullable|integer',
        ]);

        try {
            // หา sort_order ถัดไป ถ้าไม่ได้ระบุ
            if (!isset($validated['sort_order'])) {
                $maxSortOrder = $equipmentCategory->attributes()->max('sort_order');
                $validated['sort_order'] = ($maxSortOrder ?? -1) + 1;
            }

            $attribute = EquipmentAttribute::create([
                'category_id' => $equipmentCategory->id,
                'attribute_name' => $validated['attribute_name'],
                'display_name' => $validated['display_name'],
                'data_type' => $validated['data_type'],
                'unit' => $validated['unit'] ?? null,
                'is_required' => $validated['is_required'] ?? false,
                'validation_rules' => $validated['validation_rules'] ?? null,
                'sort_order' => $validated['sort_order'],
            ]);

            return response()->json($attribute, 201);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to add attribute: ' . $e->getMessage()], 500);
        }
    }

    public function updateAttribute(Request $request, EquipmentCategory $equipmentCategory, EquipmentAttribute $equipmentAttribute)
    {
        // ตรวจสอบว่า attribute นี้เป็นของ category นี้หรือไม่
        if ($equipmentAttribute->category_id !== $equipmentCategory->id) {
            return response()->json(['error' => 'Attribute not found in this category'], 404);
        }

        $validated = $request->validate([
            'attribute_name' => 'required|string|max:50|unique:equipment_attributes,attribute_name,' . $equipmentAttribute->id . ',id,category_id,' . $equipmentCategory->id,
            'display_name' => 'required|string|max:100',
            'data_type' => 'required|in:string,number,array,boolean,json',
            'unit' => 'nullable|string|max:20',
            'is_required' => 'nullable|boolean',
            'validation_rules' => 'nullable|array',
            'sort_order' => 'nullable|integer',
        ]);

        try {
            $equipmentAttribute->update($validated);
            return response()->json($equipmentAttribute);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update attribute: ' . $e->getMessage()], 500);
        }
    }

    public function deleteAttribute(EquipmentCategory $equipmentCategory, EquipmentAttribute $equipmentAttribute)
    {
        // ตรวจสอบว่า attribute นี้เป็นของ category นี้หรือไม่
        if ($equipmentAttribute->category_id !== $equipmentCategory->id) {
            return response()->json(['error' => 'Attribute not found in this category'], 404);
        }

        try {
            $equipmentAttribute->delete();
            return response()->json(['message' => 'Attribute deleted successfully']);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete attribute: ' . $e->getMessage()], 500);
        }
    }
}