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

            // 5. Get field size and calculate steps
            $fieldWidthMeters = $this->haversine($bottomLeft, $bottomRight);
            $fieldHeightMeters = $this->haversine($bottomLeft, $topLeft);

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

                for ($j = 0; $j <= $maxPlantSteps; $j++) {
                    $point = [
                        'lat' => $rowStart['lat'] + $plantDir['lat'] * $j * ($plantType->plant_spacing / 111000),
                        'lng' => $rowStart['lng'] + $plantDir['lng'] * $j * ($plantType->plant_spacing / (111000 * cos(deg2rad($rowStart['lat'])))),
                    ];

                    if ($this->isPointInPolygon($point['lat'], $point['lng'], $area)) {
                        $inExclusion = false;
                        foreach ($exclusionAreas as $exclusion) {
                            if ($this->isPointInPolygon($point['lat'], $point['lng'], $exclusion)) {
                                $inExclusion = true;
                                break;
                            }
                        }

                        if (!$inExclusion) {
                            $minDist = $this->minDistanceToPolygonEdge($point['lat'], $point['lng'], $area);
                            if ($minDist >= ($plantType->row_spacing / 2)) {
                                $points[$i][] = $point; // group by row index
                            }
                        }
                    }
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

    private function getAreaElevationData($bounds)
    {
        try {
            \Log::info('Fetching elevation data for bounds:', $bounds);
            
            $response = Http::get('https://portal.opentopography.org/API/globaldem', [
                'demtype' => 'SRTMGL1',
                'south' => $bounds['min']['lat'],
                'north' => $bounds['max']['lat'],
                'east' => $bounds['max']['lng'],
                'west' => $bounds['min']['lng'],
                'outputFormat' => 'AAIGrid',
                'API_Key' => '4cd21a1605439f9d3cc521cb698900b5'
            ]);

            if ($response->successful()) {
                \Log::info('Elevation API response received');
                $elevationData = $this->parseElevationData($response->body());
                \Log::info('Parsed elevation data:', ['count' => count($elevationData)]);
                return $elevationData;
            } else {
                \Log::error('Elevation API error:', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Error fetching area elevation data: ' . $e->getMessage());
        }
        return [];
    }

    private function parseElevationData($responseBody)
    {
        try {
            \Log::info('Starting elevation data parsing');
            
            if (empty($responseBody)) {
                \Log::error('Empty response body received');
                return [];
            }
            
            // Split the response into lines
            $lines = explode("\n", $responseBody);
            \Log::info('Response split into lines:', ['count' => count($lines)]);
            
            if (count($lines) < 7) {
                \Log::error('Invalid response format: too few lines', ['line_count' => count($lines)]);
                return [];
            }
            
            // Parse header information
            $header = [];
            $requiredHeaders = ['ncols', 'nrows', 'xllcorner', 'yllcorner', 'cellsize', 'NODATA_value'];
            $headerFound = 0;
            
            for ($i = 0; $i < 6; $i++) {
                if (isset($lines[$i])) {
                    $parts = preg_split('/\s+/', trim($lines[$i]));
                    if (count($parts) >= 2) {
                        $key = strtolower($parts[0]);
                        $value = floatval($parts[1]);
                        $header[$key] = $value;
                        if (in_array($key, $requiredHeaders)) {
                            $headerFound++;
                        }
                    }
                }
            }
            
            if ($headerFound < count($requiredHeaders)) {
                \Log::error('Missing required header information', [
                    'found_headers' => array_keys($header),
                    'required_headers' => $requiredHeaders
                ]);
                return [];
            }
            
            // Extract grid parameters
            $ncols = intval($header['ncols']);
            $nrows = intval($header['nrows']);
            $xllcorner = floatval($header['xllcorner']);
            $yllcorner = floatval($header['yllcorner']);
            $cellsize = floatval($header['cellsize']);
            $NODATA_value = floatval($header['NODATA_value']);
            
            \Log::info('Grid parameters:', [
                'ncols' => $ncols,
                'nrows' => $nrows,
                'xllcorner' => $xllcorner,
                'yllcorner' => $yllcorner,
                'cellsize' => $cellsize,
                'NODATA_value' => $NODATA_value
            ]);
            
            if ($ncols <= 0 || $nrows <= 0 || $cellsize <= 0) {
                \Log::error('Invalid grid parameters', [
                    'ncols' => $ncols,
                    'nrows' => $nrows,
                    'cellsize' => $cellsize
                ]);
                return [];
            }
            
            $elevations = [];
            $dataStart = 6; // Skip header lines
            $validPoints = 0;
            $invalidPoints = 0;
            
            for ($i = $dataStart; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;
                
                $rowIndex = $i - $dataStart;
                if ($rowIndex >= $nrows) break; // Stop if we've processed all rows
                
                $values = preg_split('/\s+/', $line);
                if (count($values) !== $ncols) {
                    \Log::warning('Invalid number of columns in row', [
                        'row' => $rowIndex,
                        'expected' => $ncols,
                        'found' => count($values)
                    ]);
                    continue;
                }
                
                foreach ($values as $colIndex => $value) {
                    if (is_numeric($value)) {
                        $elevation = floatval($value);
                        if ($elevation > $NODATA_value) {
                            // Calculate lat/lng for this grid cell
                            // Note: AAIGrid uses bottom-left corner, so we need to adjust
                            $lat = $yllcorner + ($nrows - $rowIndex - 0.5) * $cellsize;
                            $lng = $xllcorner + ($colIndex + 0.5) * $cellsize;
                            
                            $elevations[] = [
                                'lat' => $lat,
                                'lng' => $lng,
                                'elevation' => $elevation
                            ];
                            $validPoints++;
                        } else {
                            $invalidPoints++;
                        }
                    }
                }
            }
            
            \Log::info('Parsed elevations:', [
                'total_points' => count($elevations),
                'valid_points' => $validPoints,
                'invalid_points' => $invalidPoints,
                'min' => count($elevations) > 0 ? min(array_column($elevations, 'elevation')) : null,
                'max' => count($elevations) > 0 ? max(array_column($elevations, 'elevation')) : null,
                'sample' => array_slice($elevations, 0, 5)
            ]);
            
            if (count($elevations) === 0) {
                \Log::error('No valid elevation points found in the data');
                return [];
            }
            
            return $elevations;
        } catch (\Exception $e) {
            \Log::error('Error parsing elevation data: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return [];
        }
    }

    private function getPointElevation($lat, $lng, $elevationData)
    {
        if (empty($elevationData)) {
            \Log::warning('No elevation data available for point', ['lat' => $lat, 'lng' => $lng]);
            return 0;
        }

        \Log::info('Getting elevation for point:', [
            'lat' => $lat,
            'lng' => $lng,
            'elevation_data_count' => count($elevationData)
        ]);

        // Find the closest elevation point
        $closestElevation = null;
        $minDistance = PHP_FLOAT_MAX;
        $closestPoint = null;

        foreach ($elevationData as $point) {
            if (isset($point['lat']) && isset($point['lng']) && isset($point['elevation'])) {
                $distance = $this->calculateDistance($lat, $lng, $point['lat'], $point['lng']);
                if ($distance < $minDistance) {
                    $minDistance = $distance;
                    $closestElevation = $point['elevation'];
                    $closestPoint = $point;
                }
            }
        }

        \Log::info('Found closest elevation point:', [
            'closest_point' => $closestPoint,
            'distance' => $minDistance,
            'elevation' => $closestElevation
        ]);

        return $closestElevation ?? 0;
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

    public function getElevation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'coordinates' => 'required|array',
            'coordinates.*.lat' => 'required|numeric',
            'coordinates.*.lng' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $coordinates = $request->coordinates;
        $coordinatesWithElevation = [];
        $retryCount = 0;
        $maxRetries = 3;

        foreach ($coordinates as $coord) {
            try {
                // Calculate a bounding box that's at least 250 meters on each side
                // 0.0025 degrees is approximately 250 meters at the equator
                $latOffset = 0.0025;
                $lngOffset = 0.0025 / cos(deg2rad($coord['lat'])); // Adjust for latitude

                $elevation = null;
                $retryCount = 0;

                while ($elevation === null && $retryCount < $maxRetries) {
                    try {
                        \Log::info('Attempting to fetch elevation data', [
                            'attempt' => $retryCount + 1,
                            'lat' => $coord['lat'],
                            'lng' => $coord['lng']
                        ]);

                        // Call OpenTopography API to get elevation data
                        $response = Http::timeout(30)->get('https://portal.opentopography.org/API/globaldem', [
                            'demtype' => 'SRTMGL1',
                            'south' => $coord['lat'] - $latOffset,
                            'north' => $coord['lat'] + $latOffset,
                            'east' => $coord['lng'] + $lngOffset,
                            'west' => $coord['lng'] - $lngOffset,
                            'outputFormat' => 'AAIGrid',
                            'API_Key' => '4cd21a1605439f9d3cc521cb698900b5'
                        ]);

                        \Log::info('OpenTopography API response', [
                            'status' => $response->status(),
                            'headers' => $response->headers(),
                            'body_length' => strlen($response->body())
                        ]);

                        \Log::info('OpenTopography raw response body', [
                            'lat' => $coord['lat'],
                            'lng' => $coord['lng'],
                            'body' => $response->body()
                        ]);

                        if ($response->successful()) {
                            $elevationData = $this->parseElevationData($response->body());
                            
                            if (!empty($elevationData)) {
                                // Get the elevation at the center point
                                $elevation = $this->getPointElevation($coord['lat'], $coord['lng'], $elevationData);
                                
                                if ($elevation !== null && $elevation !== 0) {
                                    \Log::info('Successfully retrieved elevation', [
                                        'lat' => $coord['lat'],
                                        'lng' => $coord['lng'],
                                        'elevation' => $elevation
                                    ]);
                                    break; // Exit the retry loop on success
                                }
                                
                                \Log::warning('Invalid elevation value received', [
                                    'lat' => $coord['lat'],
                                    'lng' => $coord['lng'],
                                    'elevation' => $elevation,
                                    'elevation_data_count' => count($elevationData)
                                ]);
                            } else {
                                \Log::warning('No elevation data parsed from response', [
                                    'lat' => $coord['lat'],
                                    'lng' => $coord['lng'],
                                    'response_length' => strlen($response->body())
                                ]);
                            }
                        } else {
                            \Log::error('OpenTopography API error', [
                                'status' => $response->status(),
                                'body' => $response->body(),
                                'lat' => $coord['lat'],
                                'lng' => $coord['lng']
                            ]);
                        }
                        
                        $retryCount++;
                        if ($retryCount < $maxRetries) {
                            sleep(1); // Wait 1 second before retrying
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error during elevation fetch attempt', [
                            'attempt' => $retryCount + 1,
                            'error' => $e->getMessage(),
                            'lat' => $coord['lat'],
                            'lng' => $coord['lng']
                        ]);
                        $retryCount++;
                        if ($retryCount < $maxRetries) {
                            sleep(1); // Wait 1 second before retrying
                        }
                    }
                }

                // If we still don't have a valid elevation after all retries
                if ($elevation === null || $elevation === 0) {
                    \Log::error('Failed to get valid elevation after all retries', [
                        'lat' => $coord['lat'],
                        'lng' => $coord['lng']
                    ]);
                }

                $coordinatesWithElevation[] = [
                    'lat' => $coord['lat'],
                    'lng' => $coord['lng'],
                    'elevation' => $elevation ?? 0
                ];

            } catch (\Exception $e) {
                \Log::error('Error in elevation processing', [
                    'error' => $e->getMessage(),
                    'lat' => $coord['lat'],
                    'lng' => $coord['lng']
                ]);
                $coordinatesWithElevation[] = [
                    'lat' => $coord['lat'],
                    'lng' => $coord['lng'],
                    'elevation' => 0
                ];
            }
        }

        return response()->json(['coordinates' => $coordinatesWithElevation]);
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
            $validator = Validator::make($request->all(), [
                'plant_type_id' => 'required|integer|exists:plant_types,id',
                'area' => 'required|array|min:3',
                'area.*.lat' => 'required|numeric',
                'area.*.lng' => 'required|numeric',
                'exclusion_areas' => 'array'
            ]);

            if ($validator->fails()) {
                throw new \Exception('Invalid request data: ' . json_encode($validator->errors()));
            }

            $plantType = PlantType::findOrFail($request->plant_type_id);

            // Use calculatePlantLocations to generate the 2D grid
            $grid = $this->calculatePlantLocations(
                $request->area,
                $plantType,
                $request->exclusion_areas ?? []
            );

            // Generate pipe layout connecting plants in the same row
            $pipeLayout = [];

            foreach ($grid as $rowIndex => $row) {
                if (!is_array($row) || count($row) < 2) continue; // Skip invalid or too short rows

                // Sort row by longitude (left to right)
                usort($row, fn($a, $b) => $a['lng'] <=> $b['lng']);

                for ($i = 0; $i < count($row) - 1; $i++) {
                    if (isset($row[$i]['lat'], $row[$i]['lng'], $row[$i + 1]['lat'], $row[$i + 1]['lng'])) {
                        $pipeLayout[] = [
                            'type' => 'horizontal',
                            'start' => $row[$i],
                            'end' => $row[$i + 1],
                            'row_index' => $rowIndex
                        ];
                    } else {
                        \Log::warning('Invalid point skipped in pipe layout generation', [
                            'rowIndex' => $rowIndex,
                            'point1' => $row[$i] ?? null,
                            'point2' => $row[$i + 1] ?? null
                        ]);
                    }
                }
            }

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
}
