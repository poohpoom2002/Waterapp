<?php
// app/Http/Controllers/Api/PumpAccessoryController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PumpAccessory;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PumpAccessoryController extends Controller
{
    /**
     * Display a listing of pump accessories
     */
    public function index(Request $request)
    {
        try {
            $query = PumpAccessory::with(['pump']);
            
            // Filter by pump ID
            if ($request->has('pump_id')) {
                $query->where('pump_id', $request->pump_id);
            }
            
            // Filter by accessory type
            if ($request->has('accessory_type')) {
                $query->where('accessory_type', $request->accessory_type);
            }
            
            // Search
            if ($request->has('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('size', 'like', "%{$searchTerm}%");
                });
            }
            
            // Order
            $query->orderBy('pump_id')->orderBy('sort_order');
            
            $accessories = $query->get();
            
            return response()->json($accessories);
        } catch (\Exception $e) {
            Log::error('Error getting pump accessories: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get pump accessories'], 500);
        }
    }

    /**
     * Store a newly created pump accessory
     */
    public function store(Request $request)
{
    $validated = $request->validate([
        'pump_id' => 'required|exists:equipments,id',
        'accessory_type' => 'required|in:foot_valve,check_valve,ball_valve,pressure_gauge,other',
        'name' => 'required|string|max:255',
        'image' => 'nullable|string',  // เพิ่มฟิลด์ image
        'size' => 'nullable|string|max:50',
        'specifications' => 'nullable|array',
        'price' => 'required|numeric|min:0',
        'is_included' => 'boolean',
        'sort_order' => 'nullable|integer',
    ]);

    try {
        // Check if pump exists and is a pump category
        $pump = Equipment::with('category')->find($validated['pump_id']);
        if (!$pump || $pump->category->name !== 'pump') {
            return response()->json(['error' => 'Equipment is not a pump'], 422);
        }

        // Set default sort order if not provided
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

    /**
     * Display the specified pump accessory
     */
    public function show(PumpAccessory $pumpAccessory)
    {
        try {
            $pumpAccessory->load('pump');
            return response()->json($pumpAccessory);
        } catch (\Exception $e) {
            Log::error('Error showing pump accessory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to show pump accessory'], 500);
        }
    }

    /**
     * Update the specified pump accessory
     */
    public function update(Request $request, PumpAccessory $pumpAccessory)
{
    $validated = $request->validate([
        'pump_id' => 'required|exists:equipments,id',
        'accessory_type' => 'required|in:foot_valve,check_valve,ball_valve,pressure_gauge,other',
        'name' => 'required|string|max:255',
        'image' => 'nullable|string',  // เพิ่มฟิลด์ image
        'size' => 'nullable|string|max:50',
        'specifications' => 'nullable|array',
        'price' => 'required|numeric|min:0',
        'is_included' => 'boolean',
        'sort_order' => 'nullable|integer',
    ]);

    try {
        // Check if pump exists and is a pump category
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

    /**
     * Remove the specified pump accessory
     */
    public function destroy(PumpAccessory $pumpAccessory)
    {
        try {
            $pumpAccessory->delete();
            
            return response()->json(['message' => 'Pump accessory deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting pump accessory: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete pump accessory: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get accessories by pump ID
     */
    public function getByPump($pumpId)
    {
        try {
            // Check if pump exists
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

    /**
     * Bulk update sort order
     */
    public function updateSortOrder(Request $request)
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

    /**
     * Bulk delete accessories
     */
    public function bulkDelete(Request $request)
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

    /**
     * Get accessory types
     */
    public function getTypes()
    {
        $types = [
            'foot_valve' => 'Foot Valve',
            'check_valve' => 'Check Valve', 
            'ball_valve' => 'Ball Valve',
            'pressure_gauge' => 'Pressure Gauge',
            'other' => 'อื่นๆ'
        ];

        return response()->json($types);
    }

    /**
     * Get statistics
     */
    public function getStats()
    {
        try {
            $stats = [
                'total_accessories' => PumpAccessory::count(),
                'by_type' => PumpAccessory::selectRaw('accessory_type, COUNT(*) as count')
                    ->groupBy('accessory_type')
                    ->get(),
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
}