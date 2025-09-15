<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipmentSet;
use App\Models\EquipmentSetGroup;
use App\Models\EquipmentSetItem;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class EquipmentSetController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = EquipmentSet::with(['groups.items.equipment.category']);

            // Filter by user if authenticated
            if ($request->user()) {
                $query->where('user_id', $request->user()->id);
            }

            // Filter by active status
            if ($request->has('active')) {
                $query->where('is_active', $request->boolean('active'));
            } else {
                $query->active(); // Default to active sets only
            }

            // Search by name
            if ($request->filled('search')) {
                $query->where('name', 'like', '%' . $request->search . '%');
            }

            // Order by created_at desc
            $query->orderBy('created_at', 'desc');

            $equipmentSets = $query->get();

            return response()->json($equipmentSets->map(function ($set) {
                return $set->toDetailedFormat();
            }));
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch equipment sets',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'groups' => 'required|array|min:1',
                'groups.*.items' => 'required|array|min:1',
                'groups.*.items.*.category_id' => 'required|integer|exists:equipment_categories,id',
                'groups.*.items.*.equipment_id' => 'required|integer|exists:equipments,id',
                'groups.*.items.*.quantity' => 'required|integer|min:1'
            ]);

            return DB::transaction(function () use ($validated, $request) {
                // Create the equipment set
                $equipmentSet = EquipmentSet::create([
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'user_id' => $request->user() ? $request->user()->id : null,
                    'total_price' => 0, // Will be calculated by items
                    'is_active' => true
                ]);

                // Create the groups and items
                foreach ($validated['groups'] as $groupIndex => $groupData) {
                    $group = EquipmentSetGroup::create([
                        'equipment_set_id' => $equipmentSet->id,
                        'sort_order' => $groupIndex
                    ]);

                    // Create items for this group
                    foreach ($groupData['items'] as $itemIndex => $itemData) {
                        $equipment = Equipment::findOrFail($itemData['equipment_id']);
                        
                        EquipmentSetItem::create([
                            'group_id' => $group->id,
                            'equipment_id' => $itemData['equipment_id'],
                            'quantity' => $itemData['quantity'],
                            'unit_price' => $equipment->price,
                            'sort_order' => $itemIndex
                        ]);
                    }
                }

                // Load relationships for response
                $equipmentSet->load(['groups.items.equipment.category']);

                return response()->json([
                    'message' => 'Equipment set created successfully',
                    'data' => $equipmentSet->toDetailedFormat()
                ], 201);
            });
        } catch (ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create equipment set',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(EquipmentSet $equipmentSet)
    {
        try {
            $equipmentSet->load(['groups.items.equipment.category']);
            
            return response()->json($equipmentSet->toDetailedFormat());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch equipment set',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, EquipmentSet $equipmentSet)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'groups' => 'required|array|min:1',
                'groups.*.items' => 'required|array|min:1',
                'groups.*.items.*.category_id' => 'required|integer|exists:equipment_categories,id',
                'groups.*.items.*.equipment_id' => 'required|integer|exists:equipments,id',
                'groups.*.items.*.quantity' => 'required|integer|min:1'
            ]);

            return DB::transaction(function () use ($validated, $equipmentSet) {
                // Update the equipment set
                $equipmentSet->update([
                    'name' => $validated['name']
                ]);

                // Delete existing groups and items (cascade will handle items)
                $equipmentSet->groups()->delete();

                // Create new groups and items
                foreach ($validated['groups'] as $groupIndex => $groupData) {
                    $group = EquipmentSetGroup::create([
                        'equipment_set_id' => $equipmentSet->id,
                        'sort_order' => $groupIndex
                    ]);

                    // Create items for this group
                    foreach ($groupData['items'] as $itemIndex => $itemData) {
                        $equipment = Equipment::findOrFail($itemData['equipment_id']);
                        
                        EquipmentSetItem::create([
                            'group_id' => $group->id,
                            'equipment_id' => $itemData['equipment_id'],
                            'quantity' => $itemData['quantity'],
                            'unit_price' => $equipment->price,
                            'sort_order' => $itemIndex
                        ]);
                    }
                }

                // Load relationships for response
                $equipmentSet->load(['groups.items.equipment.category']);

                return response()->json([
                    'message' => 'Equipment set updated successfully',
                    'data' => $equipmentSet->toDetailedFormat()
                ]);
            });
        } catch (ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update equipment set',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(EquipmentSet $equipmentSet)
    {
        try {
            return DB::transaction(function () use ($equipmentSet) {
                $name = $equipmentSet->name;
                
                // Delete groups and items (cascade will handle this)
                $equipmentSet->groups()->delete();
                
                // Delete the equipment set
                $equipmentSet->delete();

                return response()->json([
                    'message' => "Equipment set '{$name}' deleted successfully"
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete equipment set',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duplicate an equipment set
     */
    public function duplicate(EquipmentSet $equipmentSet)
    {
        try {
            return DB::transaction(function () use ($equipmentSet) {
                // Load the original with its groups and items
                $equipmentSet->load(['groups.items']);

                // Create new equipment set
                $newEquipmentSet = EquipmentSet::create([
                    'name' => $equipmentSet->name . ' (สำเนา)',
                    'user_id' => $equipmentSet->user_id,
                    'total_price' => 0, // Will be calculated by items
                    'is_active' => true
                ]);

                // Duplicate groups and items
                foreach ($equipmentSet->groups as $group) {
                    $newGroup = EquipmentSetGroup::create([
                        'equipment_set_id' => $newEquipmentSet->id,
                        'sort_order' => $group->sort_order
                    ]);

                    foreach ($group->items as $item) {
                        EquipmentSetItem::create([
                            'group_id' => $newGroup->id,
                            'equipment_id' => $item->equipment_id,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_price,
                            'sort_order' => $item->sort_order
                        ]);
                    }
                }

                // Load relationships for response
                $newEquipmentSet->load(['groups.items.equipment']);

                return response()->json([
                    'message' => 'Equipment set duplicated successfully',
                    'data' => $newEquipmentSet->toDetailedFormat()
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to duplicate equipment set',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle active status
     */
    public function toggleStatus(EquipmentSet $equipmentSet)
    {
        try {
            $equipmentSet->update([
                'is_active' => !$equipmentSet->is_active
            ]);

            return response()->json([
                'message' => 'Equipment set status updated successfully',
                'data' => [
                    'id' => $equipmentSet->id,
                    'is_active' => $equipmentSet->is_active
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update equipment set status',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get equipment sets by name (specifically for SprinklerSET)
     */
    public function getByName(Request $request, $name)
    {
        try {
            $query = EquipmentSet::with(['groups.items.equipment.category'])
                ->where('name', $name)
                ->active();

            $equipmentSets = $query->get();

            return response()->json($equipmentSets->map(function ($set) {
                return $set->toDetailedFormat();
            }));
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch equipment sets by name',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get equipment set statistics
     */
    public function stats(Request $request)
    {
        try {
            $query = EquipmentSet::query();
            
            if ($request->user()) {
                $query->where('user_id', $request->user()->id);
            }

            $totalSets = $query->count();
            $activeSets = $query->active()->count();
            $totalValue = $query->sum('total_price');
            
            $recentSets = $query->active()
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['id', 'name', 'total_price', 'created_at']);

            return response()->json([
                'total_sets' => $totalSets,
                'active_sets' => $activeSets,
                'inactive_sets' => $totalSets - $activeSets,
                'total_value' => $totalValue,
                'recent_sets' => $recentSets
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch statistics',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
