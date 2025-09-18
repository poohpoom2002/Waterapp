<?php
// app\Http\Controllers\FarmController.php
namespace App\Http\Controllers;

use App\Models\Farm;
use App\Models\Field;
use App\Models\FieldLayer;
use App\Models\FieldZone;
use App\Models\PlantType;
use App\Models\PlantingPoint;
use App\Models\Pipe;
use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;
use Exception; // เพิ่ม Exception
use Illuminate\Support\Facades\Log; // เพิ่ม Log
use Illuminate\Support\Facades\DB; // เพิ่ม DB

class FarmController extends Controller
{
    // Basic CRUD Operations
    public function index()
    {
        return inertia('farms/index');
    }

    public function create()
    {
        return inertia('farms/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'size' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $farm = Farm::create($validated);

        return redirect()->route('farms.show', $farm)
            ->with('success', 'Farm created successfully.');
    }

    public function show(Farm $farm)
    {
        return inertia('farms/show', [
            'farm' => $farm->load('plantTypes'),
        ]);
    }

    public function edit(Farm $farm)
    {
        return inertia('farms/edit', [
            'farm' => $farm,
        ]);
    }

    public function update(Request $request, Farm $farm)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'size' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $farm->update($validated);

        return redirect()->route('farms.show', $farm)
            ->with('success', 'Farm updated successfully.');
    }

    public function destroy(Farm $farm)
    {
        $farm->delete();

        return redirect()->route('farms.index')
            ->with('success', 'Farm deleted successfully.');
    }

    // Map Planning Operations - Removed old planner route

    public function getPlantTypes(): JsonResponse
    {
        return response()->json(PlantType::all());
    }

    public function generatePlantingPoints(Request $request): JsonResponse
    {
        try {
            \Log::info('Starting generatePlantingPoints with request data:', [
                'plant_type_id' => $request->plant_type_id,
                'area_points' => count($request->area ?? []),
                'layers' => count($request->layers ?? [])
            ]);

            // Basic validation
            if (empty($request->area) || count($request->area) < 3) {
                throw new \Exception('Invalid area: Must have at least 3 points');
            }

            if (empty($request->plant_type_id)) {
                throw new \Exception('Plant type is required');
            }

            // Get the plant type
            $plantType = PlantType::findOrFail($request->plant_type_id);
            
            // Extract exclusion areas from layers (exclude the initial map layer)
            $exclusionAreas = [];
            if (!empty($request->layers)) {
                foreach ($request->layers as $layer) {
                    // Skip the initial map layer and only include exclusion zones
                    if (!isset($layer['isInitialMap']) || !$layer['isInitialMap']) {
                        if (isset($layer['coordinates']) && count($layer['coordinates']) >= 3) {
                            $exclusionAreas[] = $layer['coordinates'];
                        }
                    }
                }
            }

            \Log::info('Extracted exclusion areas:', [
                'exclusion_areas_count' => count($exclusionAreas),
                'exclusion_areas' => $exclusionAreas
            ]);
            
            // Calculate plant locations
            $plantLocations = $this->calculatePlantLocations(
                $request->area,
                $plantType,
                $exclusionAreas
            );

            if (empty($plantLocations)) {
                throw new \Exception('No valid plant locations could be generated');
            }

            return response()->json([
                'plant_locations' => $plantLocations,
                'message' => 'Plant locations generated successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error generating plant locations:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }



    // Helper Methods
    private function validatePlantingPointsRequest(Request $request)
    {
        \Log::info('Validating planting points request');
        
        $validator = Validator::make($request->all(), [
            'area' => 'required|array|min:3',
            'area.*.lat' => 'required|numeric',
            'area.*.lng' => 'required|numeric',
            'plant_type_id' => 'required|exists:plant_types,id',
            'plant_spacing' => 'required|numeric|min:0',
            'row_spacing' => 'required|numeric|min:0',
            'exclusion_areas' => 'array', // optional
            'exclusion_areas.*' => 'array',
            'layers' => 'required|array',
            'layers.*.type' => 'required|string',
            'layers.*.coordinates' => 'required|array',
            'layers.*.coordinates.*.lat' => 'required|numeric',
            'layers.*.coordinates.*.lng' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            \Log::error('Validation failed:', ['errors' => $validator->errors()->toArray()]);
            throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
        }

        \Log::info('Request validation passed');
    }

    private function getConfiguredAreas(array $layers): array
    {
        return array_filter($layers, fn($layer) => $layer['type'] !== 'map');
    }



    private function validateAreaData($areaData): bool
    {
        if (!is_array($areaData) || count($areaData) < 3) {
            return false;
        }

        foreach ($areaData as $point) {
            if (!isset($point['lat']) || !isset($point['lng']) ||
                !is_numeric($point['lat']) || !is_numeric($point['lng'])) {
                return false;
            }
        }

        return true;
    }

    private function formatPlantTypeData(array $plantTypeData): array
    {
        return array_merge($plantTypeData, [
            'plant_spacing' => floatval($plantTypeData['plant_spacing']),
            'row_spacing' => floatval($plantTypeData['row_spacing']),
            'water_needed' => floatval($plantTypeData['water_needed'])
        ]);
    }

    private function haversine($p1, $p2)
    {
        $R = 6371000; // Earth radius in meters
        $lat1 = deg2rad($p1['lat']);
        $lat2 = deg2rad($p2['lat']);
        $dLat = $lat2 - $lat1;
        $dLng = deg2rad($p2['lng'] - $p1['lng']);

        $a = sin($dLat / 2) ** 2 +
            cos($lat1) * cos($lat2) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $R * $c;
    }


    private function calculatePlantLocations($area, $plantType, $exclusionAreas = [])
    {
        try {
            $points = [];

            \Log::info('Starting calculatePlantLocations:', [
                'main_area_points' => count($area),
                'exclusion_areas_count' => count($exclusionAreas),
                'plant_spacing' => $plantType->plant_spacing,
                'row_spacing' => $plantType->row_spacing
            ]);

            // Remove duplicate points between main area and exclusion areas
            $mainAreaPoints = $area;
            foreach ($exclusionAreas as $exclusion) {
                foreach ($exclusion as $exclusionPoint) {
                    $mainAreaPoints = array_filter($mainAreaPoints, function($point) use ($exclusionPoint) {
                        // Consider points as different if they're more than 0.000001 degrees apart
                        return abs($point['lat'] - $exclusionPoint['lat']) > 0.000001 || 
                               abs($point['lng'] - $exclusionPoint['lng']) > 0.000001;
                    });
                }
            }
            $mainAreaPoints = array_values($mainAreaPoints); // Reindex array

            \Log::info('After removing duplicates:', [
                'main_area_points_remaining' => count($mainAreaPoints)
            ]);

            // 1. Find the two leftmost points (lowest longitude)
            usort($mainAreaPoints, fn($a, $b) => $a['lng'] <=> $b['lng']);
            $leftmost1 = $mainAreaPoints[0];
            $leftmost2 = $mainAreaPoints[1];
            $bottomLeft = $leftmost1['lat'] < $leftmost2['lat'] ? $leftmost1 : $leftmost2;
            $topLeft = $leftmost1['lat'] >= $leftmost2['lat'] ? $leftmost1 : $leftmost2;

            // 2. Find the bottommost points (lowest latitude)
            usort($mainAreaPoints, fn($a, $b) => $a['lat'] <=> $b['lat']);
            $bottom1 = $mainAreaPoints[0];
            $bottom2 = $mainAreaPoints[1];
            
            // Check if bottom2 is one of the leftmost points
            if (($leftmost1 === $bottom1 && $leftmost2 === $bottom2) || ($leftmost1 === $bottom2 && $leftmost2 === $bottom1)) {
                // Use the third bottommost point instead
                $bottom2 = $mainAreaPoints[2];
            }
            
            $bottomRight = $bottom1['lng'] > $bottom2['lng'] ? $bottom1 : $bottom2;

            // 3. Define plantDir (along bottom edge)
            $plantDir = [
                'lat' => $bottomRight['lat'] - $bottomLeft['lat'],
                'lng' => $bottomRight['lng'] - $bottomLeft['lng'],
            ];
            $plantLength = sqrt($plantDir['lat'] ** 2 + $plantDir['lng'] ** 2);
            $plantDir = [
                'lat' => $plantDir['lat'] / $plantLength,
                'lng' => $plantDir['lng'] / $plantLength,
            ];

            // 4. Define rowDir (along left edge)
            $rowDir = [
                'lat' => $topLeft['lat'] - $bottomLeft['lat'],
                'lng' => $topLeft['lng'] - $bottomLeft['lng'],
            ];
            $rowLength = sqrt($rowDir['lat'] ** 2 + $rowDir['lng'] ** 2);
            $rowDir = [
                'lat' => $rowDir['lat'] / $rowLength,
                'lng' => $rowDir['lng'] / $rowLength,
            ];

            $left = $mainAreaPoints[0];
            $right = $mainAreaPoints[0];
            $bottom = $mainAreaPoints[0];
            $top = $mainAreaPoints[0];
            
            foreach ($mainAreaPoints as $point) {
                if ($point['lng'] < $left['lng']) {
                    $left = $point;
                }
                if ($point['lng'] > $right['lng']) {
                    $right = $point;
                }
                if ($point['lat'] < $bottom['lat']) {
                    $bottom = $point;
                }
                if ($point['lat'] > $top['lat']) {
                    $top = $point;
                }
            }

            // 5. Get field size and calculate steps
            $fieldWidthMeters = $this->haversine($left, $right);
            $fieldHeightMeters = $this->haversine($bottom, $top);

            $maxPlantSteps = (int) ($fieldWidthMeters / $plantType->plant_spacing);
            $maxRowSteps = (int) ($fieldHeightMeters / $plantType->row_spacing);

            \Log::info('Field calculations:', [
                'field_width_meters' => $fieldWidthMeters,
                'field_height_meters' => $fieldHeightMeters,
                'max_plant_steps' => $maxPlantSteps,
                'max_row_steps' => $maxRowSteps
            ]);

            // 6. Reorder polygon (optional for convex ordering)
            usort($mainAreaPoints, fn($a, $b) => $a['lat'] <=> $b['lat']);
            $top = [$mainAreaPoints[2], $mainAreaPoints[3]];
            $bottom = [$mainAreaPoints[0], $mainAreaPoints[1]];
            usort($top, fn($a, $b) => $a['lng'] <=> $b['lng']);
            usort($bottom, fn($a, $b) => $a['lng'] <=> $b['lng']);
            $mainAreaPoints = [$bottom[0], $bottom[1], $top[1], $top[0], $bottom[0]];

            // Generate grid lines and intersections
            $gridLines = [];
            $gridIntersections = [];

            // 7. Generate grid into 2D array
            $totalPointsGenerated = 0;
            $totalPointsExcluded = 0;
            $totalPointsExcludedByBuffer = 0;
            
            for ($i = 0; $i <= $maxRowSteps; $i++) {
                $rowStart = [
                    'lat' => $bottomLeft['lat'] + $rowDir['lat'] * $i * ($plantType->row_spacing / 111000),
                    'lng' => $bottomLeft['lng'] + $rowDir['lng'] * $i * ($plantType->row_spacing / (111000 * cos(deg2rad($bottomLeft['lat'])))),
                ];

                $rowPoints = [];
                for ($j = 0; $j <= $maxPlantSteps; $j++) {
                    $point = [
                        'lat' => $rowStart['lat'] + $plantDir['lat'] * $j * ($plantType->plant_spacing / 111000),
                        'lng' => $rowStart['lng'] + $plantDir['lng'] * $j * ($plantType->plant_spacing / (111000 * cos(deg2rad($rowStart['lat'])))),
                    ];

                    $totalPointsGenerated++;

                    // Check if point is inside the main area
                    if ($this->isPointInPolygon($point['lat'], $point['lng'], $mainAreaPoints)) {
                        // Check if point is in any exclusion area
                        $inExclusion = false;
                        $tooCloseToExclusion = false;
                        foreach ($exclusionAreas as $exclusion) {
                            if ($this->isPointInPolygon($point['lat'], $point['lng'], $exclusion)) {
                                $inExclusion = true;
                                $totalPointsExcluded++;
                                break;
                            }
                            
                            // Check if point is too close to exclusion zone edge (buffer)
                            $minDistToExclusion = $this->minDistanceToPolygonEdge($point['lat'], $point['lng'], $exclusion);
                            if ($minDistToExclusion < ($plantType->row_spacing / 2)) {
                                $tooCloseToExclusion = true;
                                $totalPointsExcludedByBuffer++;
                                break;
                            }
                        }

                        // Only add point if it's not in an exclusion area, not too close to exclusion edges, and is far enough from main area edges
                        if (!$inExclusion && !$tooCloseToExclusion) {
                            $minDist = $this->minDistanceToPolygonEdge($point['lat'], $point['lng'], $mainAreaPoints);
                            if ($minDist >= ($plantType->row_spacing / 2)) {
                                $rowPoints[] = $point;
                            }
                        }
                    }

                }

                // Only add the row if it has points
                if (!empty($rowPoints)) {
                    $points[] = $rowPoints;
                }
            }

            \Log::info('Generated plant locations:', [
                'total_rows' => count($points),
                'total_points' => array_sum(array_map('count', $points)),
                'exclusion_areas_processed' => count($exclusionAreas),
                'total_points_generated' => $totalPointsGenerated,
                'total_points_excluded' => $totalPointsExcluded,
                'total_points_excluded_by_buffer' => $totalPointsExcludedByBuffer,
                'buffer_distance' => $plantType->row_spacing / 2
            ]);

            return array_values($points);

        } catch (\Exception $e) {
            \Log::error('Error in calculatePlantLocations:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function calculateDistance($lat1, $lng1, $lat2, $lng2)
    {
        $R = 6371000; // Earth radius in meters
        $lat1 = deg2rad($lat1);
        $lat2 = deg2rad($lat2);
        $dlat = deg2rad($lat2 - $lat1);
        $dlng = deg2rad($lng2 - $lng1);

        $a = sin($dlat/2) * sin($dlat/2) +
             cos($lat1) * cos($lat2) *
             sin($dlng/2) * sin($dlng/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));

        return $R * $c;
    }

    private function getBounds(array $area): array
    {
        $minLat = PHP_FLOAT_MAX;
        $maxLat = -PHP_FLOAT_MAX;
        $minLng = PHP_FLOAT_MAX;
        $maxLng = -PHP_FLOAT_MAX;

        foreach ($area as $point) {
            $minLat = min($minLat, $point['lat']);
            $maxLat = max($maxLat, $point['lat']);
            $minLng = min($minLng, $point['lng']);
            $maxLng = max($maxLng, $point['lng']);
        }

        return [
            'min' => ['lat' => $minLat, 'lng' => $minLng],
            'max' => ['lat' => $maxLat, 'lng' => $maxLng],
            'center' => [
                'lat' => ($minLat + $maxLat) / 2,
                'lng' => ($minLng + $maxLng) / 2
            ]
        ];
    }

    private function isPointInPolygon($lat, $lng, $polygon)
    {
        $inside = false;
        $numPoints = count($polygon);
        $j = $numPoints - 1;

        for ($i = 0; $i < $numPoints; $i++) {
            $xi = $polygon[$i]['lng'];
            $yi = $polygon[$i]['lat'];
            $xj = $polygon[$j]['lng'];
            $yj = $polygon[$j]['lat'];

            $intersect = (($yi > $lat) !== ($yj > $lat)) &&
                        ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi + 1e-10) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }

            $j = $i;
        }

        return $inside;
    }

    // Helper: minimum distance from point to any edge of polygon (in meters)
    private function minDistanceToPolygonEdge($lat, $lng, $polygon)
    {
        $minDist = null;
        $n = count($polygon);
        for ($i = 0; $i < $n; $i++) {
            $a = $polygon[$i];
            $b = $polygon[($i+1)%$n];
            $dist = $this->pointToSegmentDistance($lat, $lng, $a['lat'], $a['lng'], $b['lat'], $b['lng']);
            if ($minDist === null || $dist < $minDist) {
                $minDist = $dist;
            }
        }
        return $minDist;
    }

    // Helper: distance from point (px,py) to segment (ax,ay)-(bx,by) in meters
    private function pointToSegmentDistance($px, $py, $ax, $ay, $bx, $by)
    {
        // Convert lat/lng to meters using equirectangular approximation
        $R = 6371000; // Earth radius in meters
        $lat1 = deg2rad($ax);
        $lat2 = deg2rad($bx);
        $latP = deg2rad($px);
        $lng1 = deg2rad($ay);
        $lng2 = deg2rad($by);
        $lngP = deg2rad($py);
        $x1 = $R * $lng1 * cos(($lat1+$lat2)/2);
        $y1 = $R * $lat1;
        $x2 = $R * $lng2 * cos(($lat1+$lat2)/2);
        $y2 = $R * $lat2;
        $xP = $R * $lngP * cos(($lat1+$lat2)/2);
        $yP = $R * $latP;
        $dx = $x2 - $x1;
        $dy = $y2 - $y1;
        if ($dx == 0 && $dy == 0) {
            // a==b
            return sqrt(pow($xP-$x1,2) + pow($yP-$y1,2));
        }
        $t = max(0, min(1, (($xP-$x1)*$dx + ($yP-$y1)*$dy) / ($dx*$dx + $dy*$dy)));
        $projX = $x1 + $t*$dx;
        $projY = $y1 + $t*$dy;
        return sqrt(pow($xP-$projX,2) + pow($yP-$projY,2));
    }

    public function addPlantPoint(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'lat' => 'required|numeric',
                'lng' => 'required|numeric',
                'plant_type_id' => 'required|exists:plant_types,id',
                'area' => 'required|array|min:3',
                'area.*.lat' => 'required|numeric',
                'area.*.lng' => 'required|numeric',
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
            }

            // Check if point is within the area
            if (!$this->isPointInPolygon($request->lat, $request->lng, $request->area)) {
                throw new \Exception('Point must be within the field area');
            }

            // Check if point is at least half row spacing from edges
            $plantType = PlantType::findOrFail($request->plant_type_id);
            $minDist = $this->minDistanceToPolygonEdge($request->lat, $request->lng, $request->area);
            if ($minDist < ($plantType->row_spacing / 2)) {
                throw new \Exception('Point must be at least half row spacing away from field edges');
            }

            return response()->json([
                'point' => [
                    'lat' => $request->lat,
                    'lng' => $request->lng
                ],
                'message' => 'Plant point added successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error adding plant point:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function deletePlantPoint(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'lat' => 'required|numeric',
                'lng' => 'required|numeric',
                'point_id' => 'required|string'
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
            }

            return response()->json([
                'point_id' => $request->point_id,
                'message' => 'Plant point deleted successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error deleting plant point:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function movePlantPoint(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'point_id' => 'required|string',
                'new_lat' => 'required|numeric',
                'new_lng' => 'required|numeric',
                'plant_type_id' => 'required|exists:plant_types,id',
                'area' => 'required|array|min:3',
                'area.*.lat' => 'required|numeric',
                'area.*.lng' => 'required|numeric',
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
            }

            // Check if new position is within the area
            if (!$this->isPointInPolygon($request->new_lat, $request->new_lng, $request->area)) {
                throw new \Exception('New position must be within the field area');
            }

            // Check if new position is at least half row spacing from edges
            $plantType = PlantType::findOrFail($request->plant_type_id);
            $minDist = $this->minDistanceToPolygonEdge($request->new_lat, $request->new_lng, $request->area);
            if ($minDist < ($plantType->row_spacing / 2)) {
                throw new \Exception('New position must be at least half row spacing away from field edges');
            }

            return response()->json([
                'point' => [
                    'id' => $request->point_id,
                    'lat' => $request->new_lat,
                    'lng' => $request->new_lng
                ],
                'message' => 'Plant point moved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error moving plant point:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generatePipeLayout(Request $request): JsonResponse
    {
        try {
            \Log::info('Starting pipe layout generation with request data:', [
                'plant_type_id' => $request->plant_type_id,
                'zones_count' => count($request->zones ?? []),
                'area_points' => count($request->area ?? [])
            ]);

            $validator = Validator::make($request->all(), [
                'plant_type_id' => 'required|integer|exists:plant_types,id',
                'zones' => 'array',
                'zones.*.points' => 'required|array',
                'zones.*.points.*.lat' => 'required|numeric',
                'zones.*.points.*.lng' => 'required|numeric',
                'zones.*.pipeDirection' => 'required|in:horizontal,vertical',
                'area' => 'required|array|min:3',
                'area.*.lat' => 'required|numeric',
                'area.*.lng' => 'required|numeric'
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
            }

            $plantType = PlantType::findOrFail($request->plant_type_id);
            $area = $request->area;
            $pipeLayout = [];
            $zoneStats = [];

            // Find the two leftmost points (lowest longitude)
            usort($area, fn($a, $b) => $a['lng'] <=> $b['lng']);
            $leftmost1 = $area[0];
            $leftmost2 = $area[1];
            $bottomLeft = $leftmost1['lat'] < $leftmost2['lat'] ? $leftmost1 : $leftmost2;
            $topLeft = $leftmost1['lat'] >= $leftmost2['lat'] ? $leftmost1 : $leftmost2;

            // Find the two bottommost points (lowest latitude)
            usort($area, fn($a, $b) => $a['lat'] <=> $b['lat']);
            $bottom1 = $area[0];
            $bottom2 = $area[1];
            $bottomRight = $bottom1['lng'] > $bottom2['lng'] ? $bottom1 : $bottom2;

            // Define plantDir (along bottom edge)
            $plantDir = [
                'lat' => $bottomRight['lat'] - $bottomLeft['lat'],
                'lng' => $bottomRight['lng'] - $bottomLeft['lng'],
            ];
            $plantLength = sqrt($plantDir['lat'] ** 2 + $plantDir['lng'] ** 2);
            $plantDir = [
                'lat' => $plantDir['lat'] / $plantLength,
                'lng' => $plantDir['lng'] / $plantLength,
            ];

            // Define rowDir (along left edge)
            $rowDir = [
                'lat' => $topLeft['lat'] - $bottomLeft['lat'],
                'lng' => $topLeft['lng'] - $bottomLeft['lng'],
            ];
            $rowLength = sqrt($rowDir['lat'] ** 2 + $rowDir['lng'] ** 2);
            $rowDir = [
                'lat' => $rowDir['lat'] / $rowLength,
                'lng' => $rowDir['lng'] / $rowLength,
            ];

            // Calculate field size and steps
            $leftmost = $area[0];
            $rightmost = $area[0];
            $bottommost = $area[0];
            $topmost = $area[0];
            
            foreach ($area as $point) {
                if ($point['lng'] < $leftmost['lng']) {
                    $leftmost = $point;
                }
                if ($point['lng'] > $rightmost['lng']) {
                    $rightmost = $point;
                }
                if ($point['lat'] < $bottommost['lat']) {
                    $bottommost = $point;
                }
                if ($point['lat'] > $topmost['lat']) {
                    $topmost = $point;
                }
            }

            // Get field size and calculate steps
            $fieldWidthMeters = $this->haversine($leftmost, $rightmost);
            $fieldHeightMeters = $this->haversine($bottommost, $topmost);

            $maxPlantSteps = (int) ($fieldWidthMeters / $plantType->plant_spacing);
            $maxRowSteps = (int) ($fieldHeightMeters / $plantType->row_spacing);

            foreach ($request->zones as $zone) {
                \Log::info('Processing zone:', [
                    'zone_id' => $zone['id'] ?? 'unknown',
                    'direction' => $zone['pipeDirection'],
                    'points_count' => count($zone['points'])
                ]);

                $points = $zone['points'];
                $pipeDirection = $zone['pipeDirection'];
                $zoneId = $zone['id'] ?? null;

                // Skip zones with no points
                if (empty($points)) {
                    \Log::warning('Skipping zone with no points:', ['zone_id' => $zoneId]);
                    continue;
                }

                // Snap points to grid lines
                $snappedPoints = [];
                foreach ($points as $point) {
                    $snappedPoint = $this->snapPointToGrid(
                        $point, 
                        $bottomLeft, 
                        $plantDir, 
                        $rowDir, 
                        $plantType, 
                        $maxPlantSteps, 
                        $maxRowSteps, 
                        $pipeDirection
                    );
                    if ($snappedPoint) {
                        $snappedPoints[] = $snappedPoint;
                    }
                }

                if (empty($snappedPoints)) {
                    \Log::warning('No valid snapped points for zone:', ['zone_id' => $zoneId]);
                    continue;
                }

                $zonePipes = [];
                $totalZoneLength = 0;
                $zoneWaterFlow = 0;

                if ($pipeDirection === 'horizontal') {
                    // Group snapped points by row index
                    $pointsByRow = [];
                    foreach ($snappedPoints as $point) {
                        $rowIndex = $point['rowIndex'];
                        if (!isset($pointsByRow[$rowIndex])) {
                            $pointsByRow[$rowIndex] = [];
                        }
                        $pointsByRow[$rowIndex][] = $point;
                    }

                    // Create horizontal pipes for each row that has points
                    foreach ($pointsByRow as $rowIndex => $rowPoints) {
                        if (count($rowPoints) < 2) {
                            continue; // Skip rows with less than 2 points
                        }

                        // Sort points by longitude (left to right)
                        usort($rowPoints, fn($a, $b) => $a['lng'] <=> $b['lng']);
                        
                        $pipeLength = $this->haversine(
                            ['lat' => $rowPoints[0]['lat'], 'lng' => $rowPoints[0]['lng']], 
                            ['lat' => end($rowPoints)['lat'], 'lng' => end($rowPoints)['lng']]
                        );

                        // Calculate water flow for this pipe (number of plants * water needed per plant)
                        $plantsInRow = count($rowPoints);
                        $waterFlow = $plantsInRow * $plantType->water_needed; // L/day

                        // Calculate pipe diameter based on water flow (simplified calculation)
                        $pipeDiameter = $this->calculatePipeDiameter($waterFlow, $pipeLength);

                        $zonePipes[] = [
                            'type' => 'horizontal',
                            'start' => [
                                'lat' => $rowPoints[0]['lat'],
                                'lng' => $rowPoints[0]['lng']
                            ],
                            'end' => [
                                'lat' => end($rowPoints)['lat'],
                                'lng' => end($rowPoints)['lng']
                            ],
                            'zone_id' => $zoneId,
                            'length' => $pipeLength,
                            'rowIndex' => $rowIndex,
                            'plants_served' => $plantsInRow,
                            'water_flow' => $waterFlow,
                            'pipe_diameter' => $pipeDiameter
                        ];

                        $totalZoneLength += $pipeLength;
                        $zoneWaterFlow += $waterFlow;
                    }
                } else {
                    // Group snapped points by column index
                    $pointsByCol = [];
                    foreach ($snappedPoints as $point) {
                        $colIndex = $point['colIndex'];
                        if (!isset($pointsByCol[$colIndex])) {
                            $pointsByCol[$colIndex] = [];
                        }
                        $pointsByCol[$colIndex][] = $point;
                    }

                    // Create vertical pipes for each column that has points
                    foreach ($pointsByCol as $colIndex => $colPoints) {
                        if (count($colPoints) < 2) {
                            continue; // Skip columns with less than 2 points
                        }

                        // Sort points by latitude (bottom to top)
                        usort($colPoints, fn($a, $b) => $a['lat'] <=> $b['lat']);
                        
                        $pipeLength = $this->haversine(
                            ['lat' => $colPoints[0]['lat'], 'lng' => $colPoints[0]['lng']], 
                            ['lat' => end($colPoints)['lat'], 'lng' => end($colPoints)['lng']]
                        );

                        // Calculate water flow for this pipe
                        $plantsInCol = count($colPoints);
                        $waterFlow = $plantsInCol * $plantType->water_needed; // L/day

                        // Calculate pipe diameter based on water flow
                        $pipeDiameter = $this->calculatePipeDiameter($waterFlow, $pipeLength);

                        $zonePipes[] = [
                            'type' => 'vertical',
                            'start' => [
                                'lat' => $colPoints[0]['lat'],
                                'lng' => $colPoints[0]['lng']
                            ],
                            'end' => [
                                'lat' => end($colPoints)['lat'],
                                'lng' => end($colPoints)['lng']
                            ],
                            'zone_id' => $zoneId,
                            'length' => $pipeLength,
                            'colIndex' => $colIndex,
                            'plants_served' => $plantsInCol,
                            'water_flow' => $waterFlow,
                            'pipe_diameter' => $pipeDiameter
                        ];

                        $totalZoneLength += $pipeLength;
                        $zoneWaterFlow += $waterFlow;
                    }
                }

                // Add zone statistics
                if (!empty($zonePipes)) {
                    $zoneStats[] = [
                        'zone_id' => $zoneId,
                        'pipe_direction' => $pipeDirection,
                        'total_pipes' => count($zonePipes),
                        'total_length' => $totalZoneLength,
                        'total_water_flow' => $zoneWaterFlow,
                        'plants_served' => array_sum(array_column($zonePipes, 'plants_served')),
                        'average_pipe_diameter' => array_sum(array_column($zonePipes, 'pipe_diameter')) / count($zonePipes)
                    ];
                }

                $pipeLayout = array_merge($pipeLayout, $zonePipes);
            }

            \Log::info('Generated pipe layout:', [
                'total_pipes' => count($pipeLayout),
                'horizontal_pipes' => count(array_filter($pipeLayout, fn($p) => $p['type'] === 'horizontal')),
                'vertical_pipes' => count(array_filter($pipeLayout, fn($p) => $p['type'] === 'vertical')),
                'zone_stats' => $zoneStats
            ]);

            return response()->json([
                'pipe_layout' => $pipeLayout,
                'zone_stats' => $zoneStats,
                'summary' => [
                    'total_pipes' => count($pipeLayout),
                    'total_length' => array_sum(array_column($pipeLayout, 'length')),
                    'total_water_flow' => array_sum(array_column($pipeLayout, 'water_flow')),
                    'total_plants_served' => array_sum(array_column($pipeLayout, 'plants_served')),
                    'average_pipe_diameter' => count($pipeLayout) > 0 ? array_sum(array_column($pipeLayout, 'pipe_diameter')) / count($pipeLayout) : 0
                ],
                'pipe_analysis' => $this->analyzePipeNetwork($pipeLayout, $zoneStats),
                'message' => 'Pipe layout generated successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error generating pipe layout:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getFields(): JsonResponse
    {
        try {
            $fields = Field::with(['plantType', 'user', 'zones', 'plantingPoints', 'pipes', 'layers'])
                ->where('user_id', auth()->id())
                ->orderBy('created_at', 'desc')
                ->get();

            $formattedFields = $fields->map(function ($field) {
                // แก้ไข: เพิ่มการตรวจสอบค่า null ก่อนเข้าถึง property
                $plantTypeData = $field->plantType ? [
                    'id' => $field->plantType->id,
                    'name' => $field->plantType->name,
                    'type' => $field->plantType->type,
                    'plant_spacing' => $field->plantType->plant_spacing,
                    'row_spacing' => $field->plantType->row_spacing,
                    'water_needed' => $field->plantType->water_needed
                ] : null; // ถ้าไม่มี plantType ให้เป็น null

                return [
                    'id' => $field->id,
                    'name' => $field->name,
                    'customerName' => $field->customer_name,
                    'userName' => $field->user ? $field->user->name : 'Unknown User', // แก้ไข: ตรวจสอบ user ก่อน
                    'category' => $field->category ?? 'horticulture',
                    'status' => $field->status,
                    'isCompleted' => $field->is_completed,
                    'folderId' => $field->folder_id,
                    'area' => $field->area_coordinates,
                    'plantType' => $plantTypeData, // แก้ไข: ใช้ข้อมูลที่ตรวจสอบแล้ว
                    'totalPlants' => $field->total_plants,
                    'totalArea' => (float) $field->total_area,
                    'total_water_need' => (float) $field->total_water_need,
                    'createdAt' => $field->created_at->toISOString(),
                    'layers' => $field->layers->map(function ($layer) {
                        return [
                            'type' => $layer->type,
                            'coordinates' => $layer->coordinates,
                            'isInitialMap' => $layer->is_initial_map
                        ];
                    })->toArray(),
                    // Additional data for different field types
                    'garden_data' => $field->garden_data,
                    'garden_stats' => $field->garden_stats,
                    'greenhouse_data' => $field->greenhouse_data,
                    'field_crop_data' => $field->field_crop_data,
                    'project_data' => $field->project_data,
                    'project_stats' => $field->project_stats
                ];
            });

            return response()->json([
                'fields' => $formattedFields
            ]);

        } catch (Exception $e) {
            Log::error('Error fetching fields:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'An error occurred while fetching fields: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getField($fieldId): JsonResponse
    {
        try {
            // Validate fieldId
            if (!is_numeric($fieldId) || (int) $fieldId <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid field ID provided'
                ], 400);
            }

            $field = Field::with(['plantType', 'user', 'zones', 'plantingPoints', 'pipes', 'layers'])->find((int) $fieldId);
            
            if (!$field) {
                return response()->json([
                    'success' => false,
                    'message' => 'Field not found'
                ], 404);
            }
            
            // Validate required data
            if (!$field->area_coordinates || !is_array($field->area_coordinates) || count($field->area_coordinates) < 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Field area data is invalid or incomplete'
                ], 422);
            }

            // แก้ไข: ตรวจสอบ plantType ก่อน
            if (!$field->plantType) {
                // ส่งค่า default หรือ null แทนที่จะทำให้เกิด error
                 $plantTypeData = null;
            } else {
                $plantTypeData = [
                    'id' => $field->plantType->id,
                    'name' => $field->plantType->name,
                    'type' => $field->plantType->type,
                    'plant_spacing' => $field->plantType->plant_spacing,
                    'row_spacing' => $field->plantType->row_spacing,
                    'water_needed' => $field->plantType->water_needed,
                ];
            }

            $formattedField = [
                'id' => $field->id,
                'field_name' => $field->name,
                'customer_name' => $field->customer_name,
                'user_name' => $field->user ? $field->user->name : 'Unknown User', // แก้ไข: ตรวจสอบ user
                'area_coordinates' => $field->area_coordinates,
                'plantType' => $plantTypeData, // แก้ไข: ใช้ข้อมูลที่ตรวจสอบแล้ว
                'total_plants' => $field->total_plants,
                'total_area' => $field->total_area,
                'total_water_need' => $field->total_water_need,
                'area_type' => $field->area_type,
                'layers' => $field->layers->map(function ($layer) {
                    return [
                        'type' => $layer->type,
                        'coordinates' => $layer->coordinates,
                        'is_initial_map' => $layer->is_initial_map
                    ];
                })->toArray(),
                'zones' => $field->zones->map(function ($zone) {
                    return [
                        'id' => $zone->id,
                        'name' => $zone->name,
                        'polygon_coordinates' => $zone->polygon_coordinates,
                        'color' => $zone->color,
                        'pipe_direction' => $zone->pipe_direction,
                    ];
                })->toArray(),
                'planting_points' => $field->plantingPoints->map(function ($point) {
                    return [
                        'point_id' => $point->point_id,
                        'lat' => $point->latitude, // แก้ไข: ใช้ latitude, longitude จาก model
                        'lng' => $point->longitude,
                        'zone_id' => $point->field_zone_id,
                    ];
                })->toArray(),
                'pipes' => $field->pipes->map(function ($pipe) {
                    return [
                        'id' => $pipe->id,
                        'type' => $pipe->type,
                        'direction' => $pipe->direction,
                        'start_lat' => $pipe->start_latitude,
                        'start_lng' => $pipe->start_longitude,
                        'end_lat' => $pipe->end_latitude,
                        'end_lng' => $pipe->end_longitude,
                        'length' => $pipe->length,
                        'plants_served' => $pipe->plants_served,
                        'water_flow' => $pipe->water_flow,
                        'pipe_diameter' => $pipe->pipe_diameter,
                        'zone_id' => $pipe->field_zone_id,
                        'row_index' => $pipe->row_index,
                        'col_index' => $pipe->col_index,
                    ];
                })->toArray(),
                
                // Complete product page data
                'project_mode' => $field->project_mode,
                'active_zone_id' => $field->active_zone_id,
                'show_pump_option' => $field->show_pump_option,
                'zone_inputs' => $field->zone_inputs,
                'selected_pipes' => $field->selected_pipes,
                'selected_pump' => $field->selected_pump,
                'zone_sprinklers' => $field->zone_sprinklers,
                'zone_operation_mode' => $field->zone_operation_mode,
                'zone_operation_groups' => $field->zone_operation_groups,
                'project_data' => $field->project_data,
                'project_stats' => $field->project_stats,
                'effective_equipment' => $field->effective_equipment,
                'zone_calculation_data' => $field->zone_calculation_data,
                'quotation_data' => $field->quotation_data,
                'quotation_data_customer' => $field->quotation_data_customer,
                'garden_data' => $field->garden_data,
                'garden_stats' => $field->garden_stats,
                'field_crop_data' => $field->field_crop_data,
                'greenhouse_data' => $field->greenhouse_data,
                'last_saved' => $field->last_saved ? $field->last_saved->toISOString() : null,
                
                'created_at' => $field->created_at->toISOString(),
                'updated_at' => $field->updated_at->toISOString(),
            ];
            
            return response()->json([
                'success' => true,
                'field' => $formattedField
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching field:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch field: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteField(Request $request, $fieldId): JsonResponse
    {
        try {
            $user = auth()->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $validator = Validator::make(['field_id' => $fieldId], [
                'field_id' => 'required|integer|exists:fields,id'
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid field ID provided');
            }

            // Find the field and ensure it belongs to the authenticated user
            $field = Field::where('user_id', $user->id)
                ->findOrFail((int) $fieldId);

            // Delete related data (this will cascade due to foreign key constraints)
            $field->delete();

            \Log::info('Field deleted successfully:', [
                'field_id' => $field->id,
                'field_name' => $field->name,
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Field deleted successfully'
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Error deleting field:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'field_id' => $fieldId,
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error deleting field: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateField(Request $request, $fieldId): JsonResponse
    {
        try {
            \Log::info('Starting field update with request data:', [
                'field_id' => $fieldId,
                'field_id_type' => gettype($fieldId),
                'field_name' => $request->field_name,
                'plant_type_id' => $request->plant_type_id,
                'zones_count' => count($request->zones ?? []),
                'planting_points_count' => count($request->planting_points ?? []),
                'pipes_count' => count($request->pipes ?? [])
            ]);

            $validator = Validator::make($request->all(), [
                'field_name' => 'required|string|max:255',
                'customer_name' => 'nullable|string|max:255',
                'category' => 'nullable|string|in:horticulture,home-garden,greenhouse,field-crop',
                'area_coordinates' => 'required|array|min:3',
                'area_coordinates.*.lat' => 'required|numeric',
                'area_coordinates.*.lng' => 'required|numeric',
                'plant_type_id' => 'required|integer|exists:plant_types,id',
                'total_plants' => 'required|integer|min:0',
                'total_area' => 'required|numeric|min:0',
                'total_water_need' => 'required|numeric|min:0',
                'area_type' => 'nullable|string',
                'layers' => 'array',
                'layers.*.type' => 'required|string',
                'layers.*.coordinates' => 'required|array',
                'layers.*.coordinates.*.lat' => 'required|numeric',
                'layers.*.coordinates.*.lng' => 'required|numeric',
                'layers.*.is_initial_map' => 'boolean',
                'zones' => 'array',
                'zones.*.name' => 'required|string',
                'zones.*.polygon_coordinates' => 'required|array',
                'zones.*.polygon_coordinates.*.lat' => 'required|numeric',
                'zones.*.polygon_coordinates.*.lng' => 'required|numeric',
                'zones.*.color' => 'required|string',
                'zones.*.pipe_direction' => 'required|in:horizontal,vertical',
                'planting_points' => 'array',
                'planting_points.*.lat' => 'required|numeric',
                'planting_points.*.lng' => 'required|numeric',
                'planting_points.*.point_id' => 'required|string',
                'planting_points.*.zone_id' => 'nullable|integer',
                'pipes' => 'array',
                'pipes.*.type' => 'required|in:main,submain,branch',
                'pipes.*.direction' => 'required|in:horizontal,vertical',
                'pipes.*.start_lat' => 'required|numeric',
                'pipes.*.start_lng' => 'required|numeric',
                'pipes.*.end_lat' => 'required|numeric',
                'pipes.*.end_lng' => 'required|numeric',
                'pipes.*.length' => 'required|numeric|min:0',
                'pipes.*.plants_served' => 'required|integer|min:0',
                'pipes.*.water_flow' => 'required|numeric|min:0',
                'pipes.*.pipe_diameter' => 'required|integer|min:0',
                'pipes.*.zone_id' => 'nullable|integer',
                'pipes.*.row_index' => 'nullable|integer',
                'pipes.*.col_index' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
            }

            // Start database transaction
            \DB::beginTransaction();

            try {
                            // Find the existing field
            \Log::info('Looking for field with ID:', ['field_id' => $fieldId, 'casted_id' => (int) $fieldId]);
            
            // Check if field exists first
            $field = Field::find((int) $fieldId);
            if (!$field) {
                \Log::error('Field not found:', ['field_id' => $fieldId, 'casted_id' => (int) $fieldId]);
                throw new \Exception("Field with ID {$fieldId} not found");
            }

                // Update the field
                $field->update([
                    'name' => $request->field_name,
                    'customer_name' => $request->customer_name,
                    'category' => $request->category,
                    'area_coordinates' => $request->area_coordinates,
                    'plant_type_id' => $request->plant_type_id,
                    'total_plants' => $request->total_plants,
                    'total_area' => $request->total_area,
                    'total_water_need' => $request->total_water_need,
                    'area_type' => $request->area_type
                ]);

                // Delete existing related data
                $field->layers()->delete();
                $field->zones()->delete();
                $field->plantingPoints()->delete();
                $field->pipes()->delete();

                // Save new layers
                if (!empty($request->layers)) {
                    foreach ($request->layers as $layer) {
                        FieldLayer::create([
                            'field_id' => $field->id,
                            'type' => $layer['type'],
                            'coordinates' => $layer['coordinates'],
                            'is_initial_map' => $layer['is_initial_map'] ?? false
                        ]);
                    }
                }

                // Save new zones
                $zoneMap = []; // Map to track zone IDs for planting points and pipes
                if (!empty($request->zones)) {
                    foreach ($request->zones as $zone) {
                        $fieldZone = FieldZone::create([
                            'field_id' => $field->id,
                            'name' => $zone['name'],
                            'polygon_coordinates' => $zone['polygon_coordinates'],
                            'color' => $zone['color'],
                            'pipe_direction' => $zone['pipe_direction']
                        ]);
                        $zoneMap[$zone['id']] = $fieldZone->id;
                    }
                }

                // Save new planting points
                if (!empty($request->planting_points)) {
                    foreach ($request->planting_points as $point) {
                        // Generate a unique point_id to avoid conflicts
                        $uniquePointId = 'plant-' . time() . '-' . uniqid();
                        
                        PlantingPoint::create([
                            'field_id' => $field->id,
                            'field_zone_id' => isset($zoneMap[$point['zone_id']]) ? $zoneMap[$point['zone_id']] : null,
                            'latitude' => $point['lat'],
                            'longitude' => $point['lng'],
                            'point_id' => $uniquePointId
                        ]);
                    }
                }

                // Save new pipes
                if (!empty($request->pipes)) {
                    foreach ($request->pipes as $pipe) {
                        Pipe::create([
                            'field_id' => $field->id,
                            'field_zone_id' => isset($zoneMap[$pipe['zone_id']]) ? $zoneMap[$pipe['zone_id']] : null,
                            'type' => $pipe['type'],
                            'direction' => $pipe['direction'],
                            'start_latitude' => $pipe['start_lat'],
                            'start_longitude' => $pipe['start_lng'],
                            'end_latitude' => $pipe['end_lat'],
                            'end_longitude' => $pipe['end_lng'],
                            'length' => $pipe['length'],
                            'plants_served' => $pipe['plants_served'],
                            'water_flow' => $pipe['water_flow'],
                            'pipe_diameter' => $pipe['pipe_diameter'],
                            'row_index' => $pipe['row_index'] ?? null,
                            'col_index' => $pipe['col_index'] ?? null
                        ]);
                    }
                }

                // Commit transaction
                \DB::commit();

                \Log::info('Field updated successfully:', [
                    'field_id' => $field->id,
                    'field_name' => $field->name,
                    'total_plants' => $field->total_plants,
                    'total_pipes' => count($request->pipes ?? [])
                ]);

                return response()->json([
                    'success' => true,
                    'field_id' => $field->id,
                    'message' => 'Field updated successfully'
                ]);

            } catch (\Exception $e) {
                // Rollback transaction on error
                \DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            \Log::error('Error updating field:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function saveField(Request $request): JsonResponse
    {
        try {
            \Log::info('Starting field save with request data:', [
                'user_id' => auth()->id(),
                'field_name' => $request->field_name,
                'plant_type_id' => $request->plant_type_id,
                'zones_count' => count($request->zones ?? []),
                'planting_points_count' => count($request->planting_points ?? []),
                'pipes_count' => count($request->pipes ?? [])
            ]);

            $validator = Validator::make($request->all(), [
                'field_name' => 'required|string|max:255',
                'customer_name' => 'nullable|string|max:255',
                'category' => 'nullable|string|in:horticulture,home-garden,greenhouse,field-crop',
                'area_coordinates' => 'required|array|min:3',
                'area_coordinates.*.lat' => 'required|numeric',
                'area_coordinates.*.lng' => 'required|numeric',
                'plant_type_id' => 'required|integer|exists:plant_types,id',
                'total_plants' => 'required|integer|min:0',
                'total_area' => 'required|numeric|min:0',
                'total_water_need' => 'required|numeric|min:0',
                'area_type' => 'nullable|string',
                'layers' => 'array',
                'layers.*.type' => 'required|string',
                'layers.*.coordinates' => 'required|array',
                'layers.*.coordinates.*.lat' => 'required|numeric',
                'layers.*.coordinates.*.lng' => 'required|numeric',
                'layers.*.is_initial_map' => 'boolean',
                'zones' => 'array',
                'zones.*.name' => 'required|string',
                'zones.*.polygon_coordinates' => 'required|array',
                'zones.*.polygon_coordinates.*.lat' => 'required|numeric',
                'zones.*.polygon_coordinates.*.lng' => 'required|numeric',
                'zones.*.color' => 'required|string',
                'zones.*.pipe_direction' => 'required|in:horizontal,vertical',
                'planting_points' => 'array',
                'planting_points.*.lat' => 'required|numeric',
                'planting_points.*.lng' => 'required|numeric',
                'planting_points.*.point_id' => 'required|string',
                'planting_points.*.zone_id' => 'nullable|integer',
                'pipes' => 'array',
                'pipes.*.type' => 'required|in:main,submain,branch',
                'pipes.*.direction' => 'required|in:horizontal,vertical',
                'pipes.*.start_lat' => 'required|numeric',
                'pipes.*.start_lng' => 'required|numeric',
                'pipes.*.end_lat' => 'required|numeric',
                'pipes.*.end_lng' => 'required|numeric',
                'pipes.*.length' => 'required|numeric|min:0',
                'pipes.*.plants_served' => 'required|integer|min:0',
                'pipes.*.water_flow' => 'required|numeric|min:0',
                'pipes.*.pipe_diameter' => 'required|integer|min:0',
                'pipes.*.zone_id' => 'nullable|integer',
                'pipes.*.row_index' => 'nullable|integer',
                'pipes.*.col_index' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
            }

            // Start database transaction
            \DB::beginTransaction();

            try {
                // Create the field
                $field = Field::create([
                    'name' => $request->field_name,
                    'customer_name' => $request->customer_name,
                    'category' => $request->category,
                    'user_id' => auth()->id(),
                    'area_coordinates' => $request->area_coordinates,
                    'plant_type_id' => $request->plant_type_id,
                    'total_plants' => $request->total_plants,
                    'total_area' => $request->total_area,
                    'total_water_need' => $request->total_water_need,
                    'area_type' => $request->area_type
                ]);

                // Save layers
                if (!empty($request->layers)) {
                    foreach ($request->layers as $layer) {
                        FieldLayer::create([
                            'field_id' => $field->id,
                            'type' => $layer['type'],
                            'coordinates' => $layer['coordinates'],
                            'is_initial_map' => $layer['is_initial_map'] ?? false
                        ]);
                    }
                }

                // Save zones
                $zoneMap = []; // Map to track zone IDs for planting points and pipes
                if (!empty($request->zones)) {
                    foreach ($request->zones as $zone) {
                        $fieldZone = FieldZone::create([
                            'field_id' => $field->id,
                            'name' => $zone['name'],
                            'polygon_coordinates' => $zone['polygon_coordinates'],
                            'color' => $zone['color'],
                            'pipe_direction' => $zone['pipe_direction']
                        ]);
                        $zoneMap[$zone['id']] = $fieldZone->id;
                    }
                }

                // Save planting points
                if (!empty($request->planting_points)) {
                    foreach ($request->planting_points as $point) {
                        \App\Models\PlantingPoint::create([
                            'field_id' => $field->id,
                            'field_zone_id' => isset($zoneMap[$point['zone_id']]) ? $zoneMap[$point['zone_id']] : null,
                            'latitude' => $point['lat'],
                            'longitude' => $point['lng'],
                            'point_id' => $point['point_id']
                        ]);
                    }
                }

                // Save pipes
                if (!empty($request->pipes)) {
                    foreach ($request->pipes as $pipe) {
                        Pipe::create([
                            'field_id' => $field->id,
                            'field_zone_id' => isset($zoneMap[$pipe['zone_id']]) ? $zoneMap[$pipe['zone_id']] : null,
                            'type' => $pipe['type'],
                            'direction' => $pipe['direction'],
                            'start_latitude' => $pipe['start_lat'],
                            'start_longitude' => $pipe['start_lng'],
                            'end_latitude' => $pipe['end_lat'],
                            'end_longitude' => $pipe['end_lng'],
                            'length' => $pipe['length'],
                            'plants_served' => $pipe['plants_served'],
                            'water_flow' => $pipe['water_flow'],
                            'pipe_diameter' => $pipe['pipe_diameter'],
                            'row_index' => $pipe['row_index'] ?? null,
                            'col_index' => $pipe['col_index'] ?? null
                        ]);
                    }
                }

                // Commit transaction
                \DB::commit();

                \Log::info('Field saved successfully:', [
                    'field_id' => $field->id,
                    'field_name' => $field->name,
                    'total_plants' => $field->total_plants,
                    'total_pipes' => count($request->pipes ?? [])
                ]);

                return response()->json([
                    'success' => true,
                    'field_id' => $field->id,
                    'message' => 'Field saved successfully'
                ]);

            } catch (\Exception $e) {
                // Rollback transaction on error
                \DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            \Log::error('Error saving field:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate pipe diameter based on water flow and pipe length
     * This is a simplified calculation - in practice, you'd use more complex hydraulic calculations
     */
    private function calculatePipeDiameter($waterFlow, $pipeLength)
    {
        // Convert water flow from L/day to m³/s
        $flowRate = $waterFlow / (24 * 3600 * 1000); // L/day to m³/s
        
        // Simplified pipe sizing (assuming velocity of 1.5 m/s)
        $velocity = 1.5; // m/s
        $area = $flowRate / $velocity;
        $diameter = sqrt(4 * $area / M_PI);
        
        // Convert to mm and round to nearest standard size
        $diameterMm = $diameter * 1000;
        
        // Standard pipe sizes (mm)
        $standardSizes = [16, 20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];
        
        foreach ($standardSizes as $size) {
            if ($diameterMm <= $size) {
                return $size;
            }
        }
        
        return 500; // Maximum size if calculated diameter is larger
    }

    /**
     * Snap a point to the nearest grid line
     */
    private function snapPointToGrid($point, $bottomLeft, $plantDir, $rowDir, $plantType, $maxPlantSteps, $maxRowSteps, $pipeDirection)
    {
        $bestDistance = PHP_FLOAT_MAX;
        $snappedPoint = null;

        if ($pipeDirection === 'horizontal') {
            // Snap to horizontal grid lines (rows)
            for ($i = 0; $i <= $maxRowSteps; $i++) {
                $rowStart = [
                    'lat' => $bottomLeft['lat'] + $rowDir['lat'] * $i * ($plantType->row_spacing / 111000),
                    'lng' => $bottomLeft['lng'] + $rowDir['lng'] * $i * ($plantType->row_spacing / (111000 * cos(deg2rad($bottomLeft['lat'])))),
                ];

                $rowEnd = [
                    'lat' => $rowStart['lat'] + $plantDir['lat'] * $maxPlantSteps * ($plantType->plant_spacing / 111000),
                    'lng' => $rowStart['lng'] + $plantDir['lng'] * $maxPlantSteps * ($plantType->plant_spacing / (111000 * cos(deg2rad($rowStart['lat'])))),
                ];

                $distance = $this->pointToLineDistance(
                    $point['lat'], $point['lng'],
                    $rowStart['lat'], $rowStart['lng'],
                    $rowEnd['lat'], $rowEnd['lng']
                );

                if ($distance < $bestDistance) {
                    $bestDistance = $distance;
                    // Project point onto the line
                    $projectedPoint = $this->projectPointOntoLine(
                        $point, $rowStart, $rowEnd
                    );
                    $snappedPoint = [
                        'lat' => $projectedPoint['lat'],
                        'lng' => $projectedPoint['lng'],
                        'rowIndex' => $i,
                        'originalPoint' => $point
                    ];
                }
            }
        } else {
            // Snap to vertical grid lines (columns)
            for ($j = 0; $j <= $maxPlantSteps; $j++) {
                $colStart = [
                    'lat' => $bottomLeft['lat'] + $plantDir['lat'] * $j * ($plantType->plant_spacing / 111000),
                    'lng' => $bottomLeft['lng'] + $plantDir['lng'] * $j * ($plantType->plant_spacing / (111000 * cos(deg2rad($bottomLeft['lat'])))),
                ];

                $colEnd = [
                    'lat' => $colStart['lat'] + $rowDir['lat'] * $maxRowSteps * ($plantType->row_spacing / 111000),
                    'lng' => $colStart['lng'] + $rowDir['lng'] * $maxRowSteps * ($plantType->row_spacing / (111000 * cos(deg2rad($colStart['lat'])))),
                ];

                $distance = $this->pointToLineDistance(
                    $point['lat'], $point['lng'],
                    $colStart['lat'], $colStart['lng'],
                    $colEnd['lat'], $colEnd['lng']
                );

                if ($distance < $bestDistance) {
                    $bestDistance = $distance;
                    // Project point onto the line
                    $projectedPoint = $this->projectPointOntoLine(
                        $point, $colStart, $colEnd
                    );
                    $snappedPoint = [
                        'lat' => $projectedPoint['lat'],
                        'lng' => $projectedPoint['lng'],
                        'colIndex' => $j,
                        'originalPoint' => $point
                    ];
                }
            }
        }

        return $snappedPoint;
    }

    /**
     * Project a point onto a line segment
     */
    private function projectPointOntoLine($point, $lineStart, $lineEnd)
    {
        $A = $point['lat'] - $lineStart['lat'];
        $B = $point['lng'] - $lineStart['lng'];
        $C = $lineEnd['lat'] - $lineStart['lat'];
        $D = $lineEnd['lng'] - $lineStart['lng'];

        $dot = $A * $C + $B * $D;
        $lenSq = $C * $C + $D * $D;
        
        if ($lenSq == 0) {
            // Line start and end are the same point
            return $lineStart;
        }
        
        $param = $dot / $lenSq;

        // Clamp to line segment
        $param = max(0, min(1, $param));

        return [
            'lat' => $lineStart['lat'] + $param * $C,
            'lng' => $lineStart['lng'] + $param * $D,
        ];
    }

    /**
     * Calculate distance from point to line segment
     */
    private function pointToLineDistance($px, $py, $ax, $ay, $bx, $by)
    {
        // Convert lat/lng to meters using equirectangular approximation
        $R = 6371000; // Earth radius in meters
        $lat1 = deg2rad($ax);
        $lat2 = deg2rad($bx);
        $latP = deg2rad($px);
        $lng1 = deg2rad($ay);
        $lng2 = deg2rad($by);
        $lngP = deg2rad($py);
        
        $x1 = $R * $lng1 * cos(($lat1+$lat2)/2);
        $y1 = $R * $lat1;
        $x2 = $R * $lng2 * cos(($lat1+$lat2)/2);
        $y2 = $R * $lat2;
        $xP = $R * $lngP * cos(($lat1+$lat2)/2);
        $yP = $R * $latP;
        
        $dx = $x2 - $x1;
        $dy = $y2 - $y1;
        
        if ($dx == 0 && $dy == 0) {
            // Line start and end are the same point
            return sqrt(pow($xP-$x1,2) + pow($yP-$y1,2));
        }
        
        $t = max(0, min(1, (($xP-$x1)*$dx + ($yP-$y1)*$dy) / ($dx*$dx + $dy*$dy)));
        $projX = $x1 + $t*$dx;
        $projY = $y1 + $t*$dy;
        
        return sqrt(pow($xP-$projX,2) + pow($yP-$projY,2));
    }

    private function analyzePipeNetwork($pipeLayout, $zoneStats)
    {
        $analysis = [];
        
        foreach ($zoneStats as $zoneStat) {
            $zoneId = $zoneStat['zone_id'];
            $zonePipes = array_filter($pipeLayout, fn($pipe) => $pipe['zone_id'] == $zoneId);
            
            if (empty($zonePipes)) {
                continue;
            }
            
            // Classify pipes based on length and position
            $mainPipes = [];
            $subMainPipes = [];
            $branchPipes = [];
            
            // Sort pipes by length to identify main, sub-main, and branch pipes
            usort($zonePipes, fn($a, $b) => $b['length'] <=> $a['length']);
            
            // The longest pipe is the main pipe
            if (!empty($zonePipes)) {
                $mainPipes[] = $zonePipes[0];
                
                // Next longest pipes are sub-main pipes (up to 3)
                $subMainCount = min(3, count($zonePipes) - 1);
                for ($i = 1; $i <= $subMainCount; $i++) {
                    if (isset($zonePipes[$i])) {
                        $subMainPipes[] = $zonePipes[$i];
                    }
                }
                
                // Remaining pipes are branch pipes
                for ($i = $subMainCount + 1; $i < count($zonePipes); $i++) {
                    if (isset($zonePipes[$i])) {
                        $branchPipes[] = $zonePipes[$i];
                    }
                }
            }
            
            // Find the longest pipe in each category
            $longestMain = !empty($mainPipes) ? max(array_column($mainPipes, 'length')) : 0;
            $longestSubMain = !empty($subMainPipes) ? max(array_column($subMainPipes, 'length')) : 0;
            $longestBranch = !empty($branchPipes) ? max(array_column($branchPipes, 'length')) : 0;
            
            // Count relationships
            $subMainsOnLongestMain = count($subMainPipes);
            $branchesOnLongestSubMain = !empty($subMainPipes) ? count($branchPipes) : 0;
            
            // Find plants served by longest branch pipe
            $longestBranchPlants = 0;
            if (!empty($branchPipes)) {
                $longestBranchPipe = null;
                $maxLength = 0;
                foreach ($branchPipes as $pipe) {
                    if ($pipe['length'] > $maxLength) {
                        $maxLength = $pipe['length'];
                        $longestBranchPipe = $pipe;
                    }
                }
                $longestBranchPlants = $longestBranchPipe ? $longestBranchPipe['plants_served'] : 0;
            }
            
            $analysis[] = [
                'zone_id' => $zoneId,
                'zone_name' => 'Zone ' . $zoneId,
                'pipe_direction' => $zoneStat['pipe_direction'],
                'longest_main_pipe' => $longestMain,
                'longest_submain_pipe' => $longestSubMain,
                'longest_branch_pipe' => $longestBranch,
                'submains_on_longest_main' => $subMainsOnLongestMain,
                'branches_on_longest_submain' => $branchesOnLongestSubMain,
                'plants_on_longest_branch' => $longestBranchPlants,
                'total_pipes' => count($zonePipes),
                'main_pipes' => count($mainPipes),
                'submain_pipes' => count($subMainPipes),
                'branch_pipes' => count($branchPipes),
                'pipe_details' => [
                    'main_pipes' => $mainPipes,
                    'submain_pipes' => $subMainPipes,
                    'branch_pipes' => $branchPipes
                ]
            ];
        }
        
        return $analysis;
    }

    // Folder Management Methods
    public function getFolders(): JsonResponse
    {
        try {
            // Check if user is authenticated
            $user = auth()->user();
            
            // For testing purposes, if no user is authenticated, create a default user or use a fallback
            if (!$user) {
                \Log::warning('No authenticated user found, using fallback for folders');
                
                // Create default system folders without user association for testing
                $systemFolders = [
                    [
                        'name' => 'Finished',
                        'type' => 'finished',
                        'color' => '#10b981',
                        'icon' => '✅',
                    ],
                    [
                        'name' => 'Unfinished',
                        'type' => 'unfinished',
                        'color' => '#f59e0b',
                        'icon' => '⏳',
                    ],
                ];

                $folders = collect();
                foreach ($systemFolders as $systemFolder) {
                    $folders->push([
                        'id' => 'temp-' . strtolower($systemFolder['name']),
                        'name' => $systemFolder['name'],
                        'type' => $systemFolder['type'],
                        'color' => $systemFolder['color'],
                        'icon' => $systemFolder['icon'],
                        'parent_id' => null,
                        'field_count' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'folders' => $folders
                ]);
            }

            Log::info('Fetching folders for user', [
                'user_id' => $user->id,
                'user_email' => $user->email
            ]);

            $folders = Folder::where('user_id', $user->id)
                ->withCount('fields') // แก้ไข: ใช้ withCount เพื่อประสิทธิภาพที่ดีกว่า
                ->orderBy('name')
                ->get();

            Log::info('Found existing folders', [
                'count' => $folders->count(),
                'folders' => $folders->pluck('name')->toArray()
            ]);

            // Create default system folders if they don't exist
            $systemFolders = [
                [
                    'name' => 'Finished',
                    'type' => 'finished',
                    'color' => '#10b981',
                    'icon' => '✅',
                ],
                [
                    'name' => 'Unfinished',
                    'type' => 'unfinished',
                    'color' => '#f59e0b',
                    'icon' => '⏳',
                ],
            ];

            $foldersCreated = 0;
            foreach ($systemFolders as $systemFolder) {
                // แก้ไข: ตรวจสอบด้วย type แทน name เพื่อความแม่นยำ
                $exists = $folders->where('type', $systemFolder['type'])->first();
                if (!$exists) {
                    try {
                        Folder::create(array_merge($systemFolder, [
                            'user_id' => $user->id,
                        ]));
                        $foldersCreated++;
                        Log::info('Created system folder', [
                            'folder_name' => $systemFolder['name'],
                            'user_id' => $user->id
                        ]);
                    } catch (Exception $e) {
                        Log::error('Failed to create system folder', [
                            'folder_name' => $systemFolder['name'],
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }

            // Refresh the folders list if we created any new folders
            if ($foldersCreated > 0) {
                $folders = Folder::where('user_id', $user->id)
                    ->withCount('fields')
                    ->orderBy('name')
                    ->get();
            }

            Log::info('Returning folders', [
                'final_count' => $folders->count(),
                'created_new' => $foldersCreated
            ]);

            return response()->json([
                'success' => true,
                'folders' => $folders->map(function ($folder) {
                    return [
                        'id' => $folder->id,
                        'name' => $folder->name,
                        'type' => $folder->type,
                        'color' => $folder->color ?? '#6366f1',
                        'icon' => $folder->icon ?? '📁',
                        'parent_id' => $folder->parent_id,
                        'field_count' => $folder->fields_count, // แก้ไข: ใช้ fields_count จาก withCount
                        'created_at' => $folder->created_at,
                        'updated_at' => $folder->updated_at,
                    ];
                })
            ]);

        } catch (Exception $e) {
            Log::error('Error fetching folders', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id() ?? 'not_authenticated'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error fetching folders: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createFolder(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'type' => 'required|in:finished,unfinished,custom,customer,category',
                'parent_id' => 'nullable|exists:folders,id',
                'color' => 'nullable|string|max:7',
                'icon' => 'nullable|string|max:10',
            ]);

            $user = auth()->user();
            
            // For testing purposes, if no user is authenticated, return a mock response
            if (!$user) {
                \Log::warning('No authenticated user found, returning mock folder creation response');
                
                return response()->json([
                    'success' => true,
                    'folder' => [
                        'id' => 'temp-' . time(),
                        'name' => $validated['name'],
                        'type' => $validated['type'],
                        'color' => $validated['color'] ?? '#6366f1',
                        'icon' => $validated['icon'] ?? '📁',
                        'parent_id' => $validated['parent_id'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                ]);
            }

            $folder = Folder::create(array_merge($validated, [
                'user_id' => $user->id,
            ]));

            return response()->json([
                'success' => true,
                'folder' => $folder
            ]);
        } catch (\Exception $e) {
            \Log::error('Error creating folder: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating folder: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateFolder(Request $request, $folderId): JsonResponse
    {
        try {
            $user = auth()->user();
            $folder = Folder::where('user_id', $user->id)
                ->findOrFail($folderId);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'color' => 'nullable|string|max:7',
                'icon' => 'nullable|string|max:10',
            ]);

            $folder->update($validated);

            return response()->json([
                'success' => true,
                'folder' => $folder
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating folder: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating folder'
            ], 500);
        }
    }

    public function deleteFolder($folderId): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check if folderId is numeric
            if (!is_numeric($folderId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid folder ID provided'
                ], 400);
            }
            
            $folder = Folder::where('user_id', $user->id)
                ->findOrFail($folderId);

            // Check if it's a system folder
            if ($folder && $folder->isSystemFolder()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete system folders'
                ], 400);
            }

            // Move fields to unfinished folder
            $unfinishedFolder = Folder::where('user_id', $user->id)
                ->where('name', 'Unfinished')
                ->first();

            if ($unfinishedFolder) {
                Field::where('folder_id', $folder->id)
                    ->update(['folder_id' => $unfinishedFolder->id]);
            } else {
                // Create unfinished folder if it doesn't exist
                $unfinishedFolder = Folder::create([
                    'name' => 'Unfinished',
                    'type' => 'unfinished',
                    'color' => '#f59e0b',
                    'icon' => '⏳',
                    'user_id' => $user->id,
                ]);

                Field::where('folder_id', $folder->id)
                    ->update(['folder_id' => $unfinishedFolder->id]);
            }

            // Delete all sub-folders first
            Folder::where('user_id', $user->id)
                ->where('parent_id', $folder->id)
                ->delete();

            // Delete the main folder
            $folder->delete();

            return response()->json([
                'success' => true,
                'message' => 'Folder deleted successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error deleting folder: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting folder: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateFieldStatus(Request $request, $fieldId): JsonResponse
    {
        try {
            $user = auth()->user();
            $field = Field::where('user_id', $user->id)
                ->findOrFail($fieldId);

            $validated = $request->validate([
                'status' => 'required|in:finished,unfinished',
                'is_completed' => 'required|boolean',
            ]);

            $field->update($validated);

            return response()->json([
                'success' => true,
                'field' => $field
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating field status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating field status'
            ], 500);
        }
    }

    public function updateFieldData(Request $request, $fieldId): JsonResponse
    {
        try {
            $user = auth()->user();
            $field = Field::where('user_id', $user->id)
                ->findOrFail($fieldId);

            $validated = $request->validate([
                'status' => 'required|in:finished,unfinished',
                'is_completed' => 'required|boolean',
                'zone_inputs' => 'nullable|array',
                'selected_pipes' => 'nullable|array',
                'selected_pump' => 'nullable|array',
                'zone_sprinklers' => 'nullable|array',
                'zone_operation_mode' => 'nullable|string',
                'zone_operation_groups' => 'nullable|array',
                'project_data' => 'nullable|array',
                'project_stats' => 'nullable|array',
                'effective_equipment' => 'nullable|array',
                'zone_calculation_data' => 'nullable|array',
                'project_mode' => 'nullable|string',
                'active_zone_id' => 'nullable|string',
                'show_pump_option' => 'nullable|boolean',
                'quotation_data' => 'nullable|array',
                'quotation_data_customer' => 'nullable|array',
                'garden_data' => 'nullable|array',
                'garden_stats' => 'nullable|array',
                'field_crop_data' => 'nullable|array',
                'greenhouse_data' => 'nullable|array',
                'last_saved' => 'nullable|string',
                'project_image' => 'nullable|string',
                'project_image_type' => 'nullable|string',
            ]);

            $field->update($validated);

            // If field is being marked as finished, move it to the Finished folder
            if ($validated['status'] === 'finished' && $validated['is_completed'] === true) {
                $finishedFolder = Folder::where('user_id', $user->id)
                    ->where('type', 'finished')
                    ->first();
                
                if ($finishedFolder) {
                    $field->update(['folder_id' => $finishedFolder->id]);
                    \Log::info('Field moved to Finished folder', [
                        'field_id' => $fieldId,
                        'folder_id' => $finishedFolder->id
                    ]);
                }
            }

            \Log::info('Field data updated successfully', [
                'field_id' => $fieldId,
                'user_id' => $user->id,
                'status' => $validated['status'],
                'data_fields_updated' => array_keys(array_filter($validated, function($value) {
                    return $value !== null;
                }))
            ]);

            return response()->json([
                'success' => true,
                'field' => $field,
                'message' => 'Field data saved successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating field data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating field data: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateFieldImage(Request $request, $fieldId): JsonResponse
    {
        try {
            $user = auth()->user();
            $field = Field::where('user_id', $user->id)
                ->findOrFail($fieldId);

            $validated = $request->validate([
                'project_image' => 'required|string',
                'project_image_type' => 'required|string|in:image/png,image/jpeg,image/jpg,image/gif',
            ]);

            // Store the image data
            $field->update([
                'project_image' => $validated['project_image'],
                'project_image_type' => $validated['project_image_type'],
            ]);

            \Log::info('Field image updated successfully', [
                'field_id' => $fieldId,
                'user_id' => $user->id,
                'image_type' => $validated['project_image_type'],
                'image_size' => strlen($validated['project_image'])
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Field image saved successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating field image: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating field image: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getFieldImage($fieldId): JsonResponse
    {
        try {
            $user = auth()->user();
            $field = Field::where('user_id', $user->id)
                ->findOrFail($fieldId);

            if (!$field->project_image) {
                return response()->json([
                    'success' => false,
                    'message' => 'No image found for this field'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'project_image' => $field->project_image,
                'project_image_type' => $field->project_image_type,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error getting field image: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error getting field image: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateFieldFolder(Request $request, $fieldId): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Check if this is a mock field (starts with 'mock-')
            if (str_starts_with($fieldId, 'mock-')) {
                \Log::info('Mock field folder update - skipping database update', [
                    'field_id' => $fieldId,
                    'folder_id' => $request->input('folder_id'),
                    'user_id' => $user->id
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Mock field updated successfully'
                ]);
            }
            
            $field = Field::where('user_id', $user->id)
                ->findOrFail($fieldId);

            \Log::info('Updating field folder', [
                'field_id' => $fieldId,
                'folder_id' => $request->input('folder_id'),
                'user_id' => $user->id
            ]);

            $validated = $request->validate([
                'folder_id' => 'required|integer',
            ]);

            $field->update($validated);

            return response()->json([
                'success' => true,
                'field' => $field
            ]);
        } catch (Exception $e) {
            \Log::error('Error updating field folder: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating field folder'
            ], 500);
        }
    }

    public function createField(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            
            \Log::info('Creating new field', [
                'user_id' => $user->id,
                'field_name' => $request->input('name'),
                'category' => $request->input('category')
            ]);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'customer_name' => 'nullable|string|max:255',
                'category' => 'required|string|in:horticulture,home-garden,greenhouse,field-crop',
                'area_coordinates' => 'required|array|min:3',
                'area_coordinates.*.lat' => 'required|numeric',
                'area_coordinates.*.lng' => 'required|numeric',
                'plant_type_id' => 'required|integer|exists:plant_types,id',
                'total_plants' => 'required|integer|min:0',
                'total_area' => 'required|numeric|min:0',
                'total_water_need' => 'required|numeric|min:0',
                'area_type' => 'nullable|string',
                'status' => 'nullable|string|in:finished,unfinished',
                'is_completed' => 'nullable|boolean',
                'zone_inputs' => 'nullable|array',
                'selected_pipes' => 'nullable|array',
                'selected_pump' => 'nullable|array',
                'zone_sprinklers' => 'nullable|array',
                'zone_operation_mode' => 'nullable|string',
                'zone_operation_groups' => 'nullable|array',
                'project_data' => 'nullable|array',
                'project_stats' => 'nullable|array',
                'effective_equipment' => 'nullable|array',
                'zone_calculation_data' => 'nullable|array',
                'project_mode' => 'nullable|string',
                'active_zone_id' => 'nullable|string',
                'show_pump_option' => 'nullable|boolean',
                'quotation_data' => 'nullable|array',
                'quotation_data_customer' => 'nullable|array',
                'garden_data' => 'nullable|array',
                'garden_stats' => 'nullable|array',
                'field_crop_data' => 'nullable|array',
                'greenhouse_data' => 'nullable|array',
                'last_saved' => 'nullable|string',
            ]);

            // Get the "Unfinished" folder for this user
            $unfinishedFolder = Folder::where('user_id', $user->id)
                ->where('type', 'unfinished')
                ->first();

            // Create the field
            $field = Field::create([
                'name' => $validated['name'],
                'customer_name' => $validated['customer_name'] ?? 'Customer',
                'user_id' => $user->id,
                'folder_id' => $unfinishedFolder ? $unfinishedFolder->id : null,
                'category' => $validated['category'],
                'status' => $validated['status'] ?? 'unfinished',
                'is_completed' => $validated['is_completed'] ?? false,
                'area_coordinates' => $validated['area_coordinates'],
                'plant_type_id' => $validated['plant_type_id'],
                'total_plants' => $validated['total_plants'],
                'total_area' => $validated['total_area'],
                'total_water_need' => $validated['total_water_need'],
                'area_type' => $validated['area_type'] ?? 'polygon',
                'zone_inputs' => $validated['zone_inputs'] ?? null,
                'selected_pipes' => $validated['selected_pipes'] ?? null,
                'selected_pump' => $validated['selected_pump'] ?? null,
                'zone_sprinklers' => $validated['zone_sprinklers'] ?? null,
                'zone_operation_mode' => $validated['zone_operation_mode'] ?? null,
                'zone_operation_groups' => $validated['zone_operation_groups'] ?? null,
                'project_data' => $validated['project_data'] ?? null,
                'project_stats' => $validated['project_stats'] ?? null,
                'effective_equipment' => $validated['effective_equipment'] ?? null,
                'zone_calculation_data' => $validated['zone_calculation_data'] ?? null,
                'project_mode' => $validated['project_mode'] ?? null,
                'active_zone_id' => $validated['active_zone_id'] ?? null,
                'show_pump_option' => $validated['show_pump_option'] ?? false,
                'quotation_data' => $validated['quotation_data'] ?? null,
                'quotation_data_customer' => $validated['quotation_data_customer'] ?? null,
                'garden_data' => $validated['garden_data'] ?? null,
                'garden_stats' => $validated['garden_stats'] ?? null,
                'field_crop_data' => $validated['field_crop_data'] ?? null,
                'greenhouse_data' => $validated['greenhouse_data'] ?? null,
                'last_saved' => $validated['last_saved'] ?? now()->toDateTimeString(),
            ]);

            // If the field is being created as finished, move it to the Finished folder
            if ($validated['status'] === 'finished' && $validated['is_completed'] === true) {
                $finishedFolder = Folder::where('user_id', $user->id)
                    ->where('type', 'finished')
                    ->first();
                
                if ($finishedFolder) {
                    $field->update(['folder_id' => $finishedFolder->id]);
                    \Log::info('New field created as finished and moved to Finished folder', [
                        'field_id' => $field->id,
                        'folder_id' => $finishedFolder->id
                    ]);
                }
            }

            \Log::info('New field created successfully', [
                'field_id' => $field->id,
                'user_id' => $user->id,
                'name' => $field->name,
                'status' => $field->status,
                'folder_id' => $field->folder_id
            ]);

            return response()->json([
                'success' => true,
                'field' => $field,
                'message' => 'Field created successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error creating field: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating field: ' . $e->getMessage()
            ], 500);
        }
    }
}


