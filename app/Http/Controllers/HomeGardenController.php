<?php
// app\Http\Controllers\HomeGardenController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\HomeGardenService;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

// **[ตรวจสอบ Step 2]** - ชื่อคลาสต้องเป็น 'HomeGardenController'
class HomeGardenController extends Controller
{
    protected $homeGardenService;

    public function __construct(HomeGardenService $homeGardenService)
    {
        $this->homeGardenService = $homeGardenService;
    }

    /**
     * Display the planner page.
     */
    public function planner()
    {
        return Inertia::render('home-garden-planner');
    }

    /**
     * Receive data from planner and render the sprinkler generation page.
     * Handles both GET and POST requests.
     */
    public function generateSprinkler(Request $request)
    {
        // If the request is GET, redirect back to the planner
        // because data is missing. This prevents the "Method Not Allowed" error on refresh.
        if ($request->isMethod('get')) {
            return redirect()->route('home-garden.planner')->with('warning', 'กรุณาวาดพื้นที่และกำหนดค่าเพื่อคำนวณ');
        }

        // If the request is POST, proceed with validation and rendering.
        try {
            $validated = $request->validate([
                'area' => 'required|array|min:3',
                'area.*.lat' => 'required|numeric',
                'area.*.lng' => 'required|numeric',
                'sprinkler_radius' => 'required|numeric|min:0.5|max:20',
            ]);
    
            return Inertia::render('generate-sprinkler', [
                'area' => $validated['area'],
                'sprinkler_radius' => (float)$validated['sprinkler_radius'],
            ]);

        } catch (ValidationException $e) {
            Log::error('Validation failed for generateSprinkler', ['errors' => $e->errors()]);
            return redirect()->back()->withErrors($e->errors())->withInput();
        }
    }

    /**
     * API endpoint to generate sprinkler layout.
     */
    public function generateSprinklerLayout(Request $request)
    {
        try {
            $validated = $request->validate([
                'area' => 'required|array|min:3',
                'area.*.lat' => 'required|numeric',
                'area.*.lng' => 'required|numeric',
                'sprinkler_radius' => 'required|numeric|min:0.5',
            ]);

            $sprinklerPositions = $this->homeGardenService->calculateSprinklerPositions(
                $validated['area'],
                $validated['sprinkler_radius']
            );

            return response()->json([
                'sprinkler_positions' => $sprinklerPositions
            ]);

        } catch (\Exception $e) {
            Log::error('Error in generateSprinklerLayout API: ' . $e->getMessage());
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการคำนวณตำแหน่งสปริงเกอร์: ' . $e->getMessage()], 500);
        }
    }

    /**
     * API endpoint to generate pipe layout.
     */
    public function generatePipeLayout(Request $request)
    {
        try {
            $validated = $request->validate([
                'sprinkler_positions' => 'required|array|min:1',
                'sprinkler_positions.*.lat' => 'required|numeric',
                'sprinkler_positions.*.lng' => 'required|numeric',
                'water_source' => 'required|array',
                'water_source.lat' => 'required|numeric',
                'water_source.lng' => 'required|numeric',
            ]);

            $pipeLayout = $this->homeGardenService->calculatePipeLayout(
                $validated['sprinkler_positions'],
                $validated['water_source']
            );

            return response()->json([
                'pipe_layout' => $pipeLayout
            ]);

        } catch (\Exception $e) {
            Log::error('Error in generatePipeLayout API: ' . $e->getMessage());
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการคำนวณเส้นทางท่อ: ' . $e->getMessage()], 500);
        }
    }
}
