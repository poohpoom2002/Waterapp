<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Models\PlantType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;

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

    // Map Planning Operations
    public function planner()
    {
        return inertia('map-planner');
    }

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
                'exclusion_areas' => count($request->exclusion_areas ?? []),
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
            
            // Calculate plant locations
            $plantLocations = $this->calculatePlantLocations(
                $request->area,
                $plantType,
                $request->exclusion_areas ?? []
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

    public function generateTree(Request $request)
    {
        try {
            $data = $this->prepareGenerateTreeData($request);

            return Inertia::render('generate-tree', $data);
        } catch (Exception $e) {
            return redirect()->route('planner')
                ->with('error', 'Invalid data provided. Please try again.');
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

    private function prepareGenerateTreeData(Request $request): array
    {
        $areaData = json_decode($request->input('area'), true);
        $plantTypeData = json_decode($request->input('plantType'), true);
        $areaType = $request->input('areaType', '');
        $layersData = json_decode($request->input('layers'), true);

        if (!$this->validateAreaData($areaData)) {
            throw new Exception('Invalid area data');
        }

        $plantTypeData = $this->formatPlantTypeData($plantTypeData);
        PlantType::findOrFail($plantTypeData['id']);

        return [
            'areaType' => $areaType ?: '',
            'area' => $areaData,
            'plantType' => $plantTypeData,
            'layers' => $layersData
        ];
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

            // 1. Find the two leftmost points (lowest longitude)
            usort($area, fn($a, $b) => $a['lng'] <=> $b['lng']);
            $leftmost1 = $area[0];
            $leftmost2 = $area[1];
            $bottomLeft = $leftmost1['lat'] < $leftmost2['lat'] ? $leftmost1 : $leftmost2;
            $topLeft = $leftmost1['lat'] >= $leftmost2['lat'] ? $leftmost1 : $leftmost2;

            // 2. Find the two bottommost points (lowest latitude)
            usort($area, fn($a, $b) => $a['lat'] <=> $b['lat']);
            $bottom1 = $area[0];
            $bottom2 = $area[1];
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

            $left = $area[0];
            $right = $area[0];
            $bottom = $area[0];
            $top = $area[0];
            
            foreach ($area as $point) {
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

            // 6. Reorder polygon (optional for convex ordering)
            usort($area, fn($a, $b) => $a['lat'] <=> $b['lat']);
            $top = [$area[2], $area[3]];
            $bottom = [$area[0], $area[1]];
            usort($top, fn($a, $b) => $a['lng'] <=> $b['lng']);
            usort($bottom, fn($a, $b) => $a['lng'] <=> $b['lng']);
            $area = [$bottom[0], $bottom[1], $top[1], $top[0], $bottom[0]];

            // 7. Generate grid into 2D array
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

                    // Check if point is inside the main area
                    if ($this->isPointInPolygon($point['lat'], $point['lng'], $area)) {
                        // Check if point is in any exclusion area
                        $inExclusion = false;
                        foreach ($exclusionAreas as $exclusion) {
                            if ($this->isPointInPolygon($point['lat'], $point['lng'], $exclusion)) {
                                $inExclusion = true;
                                break;
                            }
                        }

                        // Only add point if it's not in an exclusion area and is far enough from edges
                        if (!$inExclusion) {
                            $minDist = $this->minDistanceToPolygonEdge($point['lat'], $point['lng'], $area);
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

            // 5. Get field size and calculate steps
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

                if ($pipeDirection === 'horizontal') {
                    // Generate horizontal grid lines
                    for ($i = 0; $i <= $maxRowSteps; $i++) {
                        $rowStart = [
                            'lat' => $bottomLeft['lat'] + $rowDir['lat'] * $i * ($plantType->row_spacing / 111000),
                            'lng' => $bottomLeft['lng'] + $rowDir['lng'] * $i * ($plantType->row_spacing / (111000 * cos(deg2rad($bottomLeft['lat'])))),
                        ];

                        $rowEnd = [
                            'lat' => $rowStart['lat'] + $plantDir['lat'] * $maxPlantSteps * ($plantType->plant_spacing / 111000),
                            'lng' => $rowStart['lng'] + $plantDir['lng'] * $maxPlantSteps * ($plantType->plant_spacing / (111000 * cos(deg2rad($rowStart['lat'])))),
                        ];

                        // Check if any points in this zone are near this grid line
                        $pointsOnLine = array_filter($points, function($point) use ($rowStart, $rowEnd) {
                            $distance = $this->pointToLineDistance(
                                $point['lat'], $point['lng'],
                                $rowStart['lat'], $rowStart['lng'],
                                $rowEnd['lat'], $rowEnd['lng']
                            );
                            return $distance < 0.0001; // About 10 meters tolerance
                        });

                        if (count($pointsOnLine) >= 1) {
                            // Sort points by longitude (left to right)
                            usort($pointsOnLine, fn($a, $b) => $a['lng'] <=> $b['lng']);
                            
                            // Use first and last points as pipe endpoints
                            $pipeLayout[] = [
                                'type' => 'horizontal',
                                'start' => $pointsOnLine[0],
                                'end' => end($pointsOnLine),
                                'zone_id' => $zone['id'] ?? null,
                                'length' => $this->haversine($pointsOnLine[0], end($pointsOnLine))
                            ];
                        }
                    }
                } else {
                    // Generate vertical grid lines
                    for ($j = 0; $j <= $maxPlantSteps; $j++) {
                        $colStart = [
                            'lat' => $bottomLeft['lat'] + $plantDir['lat'] * $j * ($plantType->plant_spacing / 111000),
                            'lng' => $bottomLeft['lng'] + $plantDir['lng'] * $j * ($plantType->plant_spacing / (111000 * cos(deg2rad($bottomLeft['lat'])))),
                        ];

                        $colEnd = [
                            'lat' => $colStart['lat'] + $rowDir['lat'] * $maxRowSteps * ($plantType->row_spacing / 111000),
                            'lng' => $colStart['lng'] + $rowDir['lng'] * $maxRowSteps * ($plantType->row_spacing / (111000 * cos(deg2rad($colStart['lat'])))),
                        ];

                        // Check if any points in this zone are near this grid line
                        $pointsOnLine = array_filter($points, function($point) use ($colStart, $colEnd) {
                            $distance = $this->pointToLineDistance(
                                $point['lat'], $point['lng'],
                                $colStart['lat'], $colStart['lng'],
                                $colEnd['lat'], $colEnd['lng']
                            );
                            return $distance < 0.0001; // About 10 meters tolerance
                        });

                        if (count($pointsOnLine) >= 1) {
                            // Sort points by latitude (bottom to top)
                            usort($pointsOnLine, fn($a, $b) => $a['lat'] <=> $b['lat']);
                            
                            // Use first and last points as pipe endpoints
                            $pipeLayout[] = [
                                'type' => 'vertical',
                                'start' => $pointsOnLine[0],
                                'end' => end($pointsOnLine),
                                'zone_id' => $zone['id'] ?? null,
                                'length' => $this->haversine($pointsOnLine[0], end($pointsOnLine))
                            ];
                        }
                    }
                }
            }

            \Log::info('Generated pipe layout:', [
                'total_pipes' => count($pipeLayout),
                'horizontal_pipes' => count(array_filter($pipeLayout, fn($p) => $p['type'] === 'horizontal')),
                'vertical_pipes' => count(array_filter($pipeLayout, fn($p) => $p['type'] === 'vertical'))
            ]);

            return response()->json([
                'pipe_layout' => $pipeLayout,
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

    // Helper function to calculate distance from point to line segment
    private function pointToLineDistance($px, $py, $x1, $y1, $x2, $y2) {
        $A = $px - $x1;
        $B = $py - $y1;
        $C = $x2 - $x1;
        $D = $y2 - $y1;

        $dot = $A * $C + $B * $D;
        $len_sq = $C * $C + $D * $D;
        $param = -1;

        if ($len_sq != 0) {
            $param = $dot / $len_sq;
        }

        $xx = 0;
        $yy = 0;

        if ($param < 0) {
            $xx = $x1;
            $yy = $y1;
        } else if ($param > 1) {
            $xx = $x2;
            $yy = $y2;
        } else {
            $xx = $x1 + $param * $C;
            $yy = $y1 + $param * $D;
        }

        $dx = $px - $xx;
        $dy = $py - $yy;

        return sqrt($dx * $dx + $dy * $dy);
    }
}
